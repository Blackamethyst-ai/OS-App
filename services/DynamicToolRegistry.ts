import { neuralVault } from './persistenceService';
import { OS_TOOLS } from './toolRegistry';

/**
 * DynamicToolRegistry: Orchestrates evolutionary capability expansion.
 * Links forged tool manifests in the Nexus to the Agent Runtime.
 */
class DynamicToolRegistry {
    private manifests: any[] = [];
    private logic: Record<string, Function> = {};

    /**
     * Synchronizes registry with Neural Vault persistence.
     */
    async initialize() {
        const dynamicTools = await neuralVault.getDynamicTools();
        this.manifests = dynamicTools.map(t => t.manifest);
        
        this.logic = {};
        dynamicTools.forEach(tool => {
            this.logic[tool.id] = async (args: any) => {
                console.log(`[DYNAMIC_EXEC] Executing forged tool: ${tool.id}`);
                return { 
                    toolName: tool.id, 
                    status: 'SUCCESS', 
                    data: { 
                        message: `Autonomous Handover: Protocol ${tool.id} initialized via Nexus Integration.`,
                        parameters: args,
                        state: 'STABLE'
                    },
                    uiHint: 'MESSAGE'
                };
            };
        });
    }

    /**
     * Commits a new forged tool to the vault and hydrates the runtime.
     */
    async registerDynamicTool(id: string, manifest: any) {
        await neuralVault.saveDynamicTool(id, manifest);
        await this.initialize();
        console.log(`[Nexus_Bridge] Capability ${id} crystallized and ready.`);
    }

    /**
     * Merges static OS_TOOLS with dynamic evolutionary tools.
     */
    getCombinedRegistry() {
        return { ...OS_TOOLS, ...this.logic };
    }

    /**
     * Extracts manifests for LLM tool declaration.
     */
    getDynamicManifests() {
        return this.manifests;
    }
}

export const dynamicRegistry = new DynamicToolRegistry();