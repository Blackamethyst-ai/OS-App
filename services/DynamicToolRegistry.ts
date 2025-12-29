import { FunctionDeclaration, Type } from "@google/genai";
import { OS_TOOLS } from './toolRegistry';
import { neuralVault } from './persistenceService';
import { useAppStore } from '../store';

/**
 * DynamicToolRegistry: Orchestrates evolutionary capability expansion.
 * Bridges static OS features with dynamic autonomic logic.
 */
class DynamicToolRegistry {
    private dynamicManifests: FunctionDeclaration[] = [];
    private dynamicLogic: Record<string, Function> = {};

    /**
     * BOOT: Hydrate dynamic capabilities from the persistent vault.
     */
    async initialize() {
        const tools = await neuralVault.getDynamicTools();
        this.dynamicManifests = tools.map(t => t.manifest);
        
        this.dynamicLogic = {};
        tools.forEach(tool => {
            // Refined executor: Ensures no React hooks are mistakenly invoked in sandboxed logic
            this.dynamicLogic[tool.id] = async (args: any) => {
                try {
                    const state = useAppStore.getState();
                    // Pass store methods as a clean context object to avoid hook detection
                    const context = { 
                        log: state.addLog,
                        mode: state.mode,
                        vault: neuralVault
                    };
                    
                    const executor = new Function('args', 'os', `
                        return (async () => { 
                            ${tool.code} 
                        })();
                    `);
                    
                    const result = await executor(args, context);

                    return {
                        toolName: tool.id,
                        status: 'SUCCESS',
                        data: result,
                        uiHint: 'MESSAGE'
                    };
                } catch (e: any) {
                    console.error(`[DynamicToolRegistry] Fault in ${tool.id}:`, e);
                    return {
                        toolName: tool.id,
                        status: 'ERROR',
                        data: { error: e.message }
                    };
                }
            };
        });
        
        console.debug(`[DynamicToolRegistry] Hydrated ${this.dynamicManifests.length} evolved protocols.`);
    }

    /**
     * EXPOSE: Returns full toolset for Gemini API consumption.
     */
    getCombinedManifests(): FunctionDeclaration[] {
        // Map static OS_TOOLS to FunctionDeclarations
        const staticManifests: FunctionDeclaration[] = [
            {
                name: 'system_navigate',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        target: { type: Type.STRING, description: 'Target sector (e.g. DASHBOARD, CODE_STUDIO)' }
                    },
                    required: ['target']
                },
                description: 'Migrate OS focus to a specific functional sector.'
            },
            {
                name: 'search_intel',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        query: { type: Type.STRING, description: 'Grounding query.' }
                    },
                    required: ['query']
                },
                description: 'Search grounded technical or strategic intelligence.'
            },
            {
                name: 'architect_generate_process',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE'] }
                    },
                    required: ['description', 'type']
                },
                description: 'Generate high-fidelity topologies.'
            }
        ];

        return [...staticManifests, ...this.dynamicManifests];
    }

    /**
     * EXECUTE: Routes call to appropriate registry.
     */
    async execute(name: string, args: any) {
        if (this.dynamicLogic[name]) {
            return this.dynamicLogic[name](args);
        }
        if ((OS_TOOLS as any)[name]) {
            return (OS_TOOLS as any)[name](args);
        }
        throw new Error(`Protocol [${name}] unreachable.`);
    }

    /**
     * FORGE: Commits new capability to the vault.
     */
    async registerDynamicTool(id: string, manifest: any, code: string) {
        await neuralVault.saveDynamicTool(id, manifest, code);
        await this.initialize();
        useAppStore.getState().addLog('SUCCESS', `TOOL_FORGE: Capability [${id}] crystallized.`);
    }
}

export const dynamicRegistry = new DynamicToolRegistry();