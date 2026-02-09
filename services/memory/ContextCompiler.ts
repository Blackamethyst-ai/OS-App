import { ContextProcessor, SystemInstructionProcessor } from './Processor';
import { Event, LongTermMemory, ExternalArtifactStore, WorkingContext, CurrentScope } from './interfaces';
import { logger } from '../logger';

export class ContextCompilerService {
  private pipeline: ContextProcessor[];

  constructor(processors: ContextProcessor[]) {
    // Dependency Injection: Inject the ordered pipeline of processors
    this.pipeline = processors;
  }

  /**
   * C_work(t) = Compile({Session,Memory,Artifacts}; Processors, Scope(t))
   */
  public async compile(
    session: Event[],
    memoryStore: LongTermMemory,
    artifactStore: ExternalArtifactStore,
    scope: CurrentScope
  ): Promise<{ history: WorkingContext[], systemInstruction?: string }> {
    const finalContext: WorkingContext[] = [];
    let systemInstruction = "";

    // Execute the processors sequentially
    for (const processor of this.pipeline) {
      // Special handling for System Instruction to extract it for the specific API field
      if (processor instanceof SystemInstructionProcessor) {
          systemInstruction += (processor as SystemInstructionProcessor).getInstruction() + "\n";
          continue;
      }

      logger.debug(`Executing: ${processor.name}`, undefined, 'ContextCompiler');
      try {
          const contextParts = await processor.process(session, memoryStore, artifactStore, scope);
          finalContext.push(...contextParts);
      } catch (e) {
          logger.error(`Processor ${processor.name} failed`, e, 'ContextCompiler');
      }
    }
    
    // Note: We do NOT add the current message here. 
    // The current message is passed as the 'prompt' to the generateContent call,
    // while this result forms the 'history' or 'context'.

    return { history: finalContext, systemInstruction };
  }
}
