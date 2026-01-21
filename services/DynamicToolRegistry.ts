import { FunctionDeclaration, Type } from "@google/genai";
import { OS_TOOLS } from './toolRegistry';
import { neuralVault } from './persistenceService';
import { useAppStore } from '../store';
import { validateAndSanitize } from '../utils/validateToolCode';

/**
 * DynamicToolRegistry: Orchestrates evolutionary capability expansion.
 * Bridges static OS features with dynamic autonomic logic.
 * 
 * SECURITY: All tool code is validated before execution to prevent injection.
 */
class DynamicToolRegistry {
    private dynamicManifests: FunctionDeclaration[] = [];
    private dynamicLogic: Record<string, (...args: unknown[]) => unknown> = {};

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
                    // SECURITY: Validate code before execution
                    const validation = validateAndSanitize(tool.code);
                    if (!validation.valid) {
                        console.error(`[DynamicToolRegistry] SECURITY_BLOCK: ${tool.id}`, validation.errors);
                        return {
                            toolName: tool.id,
                            status: 'ERROR',
                            data: {
                                error: 'SECURITY_VIOLATION: Tool code contains forbidden patterns.',
                                details: validation.errors
                            }
                        };
                    }

                    const state = useAppStore.getState();
                    // Pass store methods as a clean context object to avoid hook detection
                    const context = {
                        log: state.actions.addLog,
                        mode: state.mode,
                        setMode: state.actions.setMode,
                        vault: neuralVault,
                        kernel: state.kernel,
                        propose: state.actions.addSwarmProposal,
                        identity: state.user
                    };

                    const executor = new Function('args', 'os', `
                        return (async () => { 
                            ${validation.sanitizedCode} 
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
            },
            {
                name: 'propose_structural_change',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        agentId: { type: Type.STRING },
                        agentName: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['OPTIMIZATION', 'EXPANSION', 'SECURITY'] },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        impact: { type: Type.STRING },
                        manifest_summary: { type: Type.STRING }
                    },
                    required: ['agentId', 'agentName', 'type', 'title', 'description', 'impact', 'manifest_summary']
                },
                description: 'Issue a formal structural change proposal to the user via the Neural Queue.'
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
     * SECURITY: Validates code before saving to prevent storage of malicious tools.
     */
    async registerDynamicTool(id: string, manifest: any, code: string): Promise<{ success: boolean; errors?: string[] }> {
        // SECURITY: Validate before saving
        const validation = validateAndSanitize(code);
        if (!validation.valid) {
            console.error(`[DynamicToolRegistry] FORGE_BLOCKED: ${id}`, validation.errors);
            useAppStore.getState().actions.addLog('ERROR', `TOOL_FORGE_BLOCKED: [${id}] contains forbidden patterns.`);
            return { success: false, errors: validation.errors };
        }

        await neuralVault.saveDynamicTool(id, manifest, validation.sanitizedCode);
        await this.initialize();
        useAppStore.getState().actions.addLog('SUCCESS', `TOOL_FORGE: Capability [${id}] crystallized.`);
        return { success: true };
    }
}

export const dynamicRegistry = new DynamicToolRegistry();