import { Event, LongTermMemory, ExternalArtifactStore, WorkingContext, CurrentScope } from './interfaces';
import { FactChunk } from '../../types';

/**
 * The formal contract for a Context Processor.
 */
export interface ContextProcessor {
  name: string; // Used for debugging and configuration
  
  process(
    session: Event[],
    memoryStore: LongTermMemory,
    artifactStore: ExternalArtifactStore,
    scope: CurrentScope
  ): Promise<WorkingContext[]>;
}

// --- 1. Recency Processor (Short-Term Memory) ---
export class RecencyProcessor implements ContextProcessor {
  name = 'RecencyProcessor';
  private maxRecencyCount: number;

  constructor(maxRecencyCount: number = 10) {
    this.maxRecencyCount = maxRecencyCount;
  }

  async process(
    session: Event[], 
    memoryStore: LongTermMemory, 
    artifactStore: ExternalArtifactStore, 
    scope: CurrentScope
  ): Promise<WorkingContext[]> {
    
    if (session.length === 0) {
        return [];
    }

    const recentEvents = session.slice(-this.maxRecencyCount);
    
    return recentEvents.map(event => {
        let role: WorkingContext['role'];

        switch (event.type) {
            case 'user_message':
                role = 'user';
                break;
            case 'model_response':
                role = 'model';
                break;
            case 'tool_call':
            case 'tool_result':
                role = 'function'; 
                break;
            case 'system_note':
                role = 'user'; 
                break;
            case 'error':
                role = 'user';
                break;
            default:
                role = 'model';
        }
        
        return {
            role: role,
            content: event.content
        };
    });
  }
}

// --- 2. Relevance Processor (Long-Term Memory / RAG) ---
export class RelevanceProcessor implements ContextProcessor {
  name = 'RelevanceProcessor';

  async process(
    session: Event[], 
    memoryStore: LongTermMemory, 
    artifactStore: ExternalArtifactStore, 
    scope: CurrentScope
  ): Promise<WorkingContext[]> {
    
    const relevantMemories = await memoryStore.query(scope.currentMessage, 3);
    
    if (relevantMemories.length === 0) return [];

    const memoryBlock = relevantMemories.map((mem, i) => `[MEMORY_${i}]: ${mem}`).join('\n');
    
    return [{
      role: 'user', 
      content: `RELEVANT KNOWLEDGE RETRIEVED:\n${memoryBlock}`
    }];
  }
}

// --- 3. Artifact Processor (Active Files/Context) ---
export class ArtifactProcessor implements ContextProcessor {
    name = 'ArtifactProcessor';

    async process(
        session: Event[],
        memoryStore: LongTermMemory,
        artifactStore: ExternalArtifactStore,
        scope: CurrentScope
    ): Promise<WorkingContext[]> {
        const artifacts = await artifactStore.getActiveArtifacts();
        
        if (artifacts.length === 0) return [];

        const artifactContext = artifacts.map(art => {
            const data = art.inlineData?.data || '';
            const content = data ? atob(data).substring(0, 5000) : '(No Data)';
            return `--- START FILE: ${art.name} ---\n${content}...\n--- END FILE ---`;
        }).join('\n\n');

        return [{
            role: 'user',
            content: `ACTIVE WORKSPACE FILES:\n${artifactContext}`
        }];
    }
}

// --- 4. Tool Schema Processor (Capability Injection) ---
export class ToolSchemaProcessor implements ContextProcessor {
  name = 'ToolSchemaProcessor';

  async process(
    session: Event[],
    memoryStore: LongTermMemory,
    artifactStore: ExternalArtifactStore,
    scope: CurrentScope
  ): Promise<WorkingContext[]> {
    const contextMessages: WorkingContext[] = [];
    
    // Iterate over the tools identified as 'active' for this turn (Scope(t))
    for (const toolName of scope.activeTools) {
      try {
        // 1. Retrieve the schema from the Artifact Store
        const schema = await artifactStore.getSchema(toolName);
        
        // 2. Format the schema into a special system or tool message
        const schemaString = JSON.stringify(schema, null, 2);
        
        // Injected as 'system' role, handled by the Compiler mapping
        contextMessages.push({
          role: 'system',
          content: `Available Tool Definition for ${toolName}:\n${schemaString}`
        });

        console.log(`[ToolSchemaProcessor] Injected schema for: ${toolName}`);

      } catch (error) {
        console.warn(`Could not inject schema for ${toolName}: ${error}`);
      }
    }

    return contextMessages;
  }
}

// --- 5. System Instruction Processor ---
export class SystemInstructionProcessor implements ContextProcessor {
    name = 'SystemInstructionProcessor';
    private instruction: string;

    constructor(instruction: string) {
        this.instruction = instruction;
    }

    async process(): Promise<WorkingContext[]> {
        return []; 
    }
    
    getInstruction(): string {
        return this.instruction;
    }
}

// --- 6. Fact Processor (Research Compilation) ---
export class FactProcessor implements ContextProcessor {
    name = 'FactProcessor';
    
    async process(
        session: Event[], 
        memoryStore: LongTermMemory,
        artifactStore: ExternalArtifactStore,
        scope: CurrentScope & { facts?: FactChunk[] } 
    ): Promise<WorkingContext[]> {
        
        const facts = scope.facts || [];
        if (facts.length === 0) return [];

        // 1. Filter and Sort: Take top 10 facts by confidence/recency
        const highConfidenceFacts = facts
            .filter(f => f.confidence > 0.6) 
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10); // Limit context size

        // 2. Compile: Create a single, structured block for the LLM
        const compiledContext = highConfidenceFacts.map(f => 
            `[FACT ID: ${f.id.slice(-4)}] CONF: ${f.confidence.toFixed(2)} | SRC: ${f.source.split('//')[0]} | FACT: ${f.fact}`
        ).join('\n---\n');

        return [{
            role: 'system', // Inject as system context
            content: `HIGH-CONFIDENCE RESEARCH COMPILATION (TOP ${highConfidenceFacts.length} VERIFIABLE FACTS):\n${compiledContext}`
        }];
    }
}