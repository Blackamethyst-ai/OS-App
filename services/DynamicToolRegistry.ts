import { FunctionDeclaration, Type } from "@google/genai";
import { OS_TOOLS } from './toolRegistry';
import { neuralVault } from './persistenceService';
import { useAppStore } from '../store';
import { validateAndSanitize } from '../utils/validateToolCode';
import { logger } from './logger';
// Unified capability registry (replacing unifiedActionRegistry)
import {
    registerDynamicCapability,
    executeCapability,
    getCapability,
    getGeminiManifests,
    isInitialized as isCapabilityRegistryInitialized,
} from './capabilities';

/**
 * DynamicToolRegistry: Orchestrates evolutionary capability expansion.
 * Bridges static OS features with dynamic autonomic logic.
 *
 * NOTE: This registry now delegates to the unified CapabilityRegistry.
 * Direct usage of DynamicToolRegistry is supported for backward compatibility,
 * but prefer using services/capabilities for new code.
 *
 * SECURITY: All tool code is validated before execution to prevent injection.
 */
export class DynamicToolRegistry {
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
                        logger.error(`SECURITY_BLOCK: ${tool.id}`, validation.errors, 'DynamicToolRegistry');
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
                    logger.error(`Fault in ${tool.id}`, e, 'DynamicToolRegistry');
                    return {
                        toolName: tool.id,
                        status: 'ERROR',
                        data: { error: e.message }
                    };
                }
            };
        });

        logger.debug(`[DynamicToolRegistry] Hydrated ${this.dynamicManifests.length} evolved protocols.`);
    }

    /**
     * EXPOSE: Returns full toolset for Gemini API consumption.
     */
    /**
     * EXPOSE: Returns full toolset for Gemini API consumption.
     */
    getCombinedManifests(): FunctionDeclaration[] {
        // Use the Unified Registry as the source of truth for static OS tools
        const unifiedManifests = getGeminiManifests();

        // Merge with dynamic/evolved tools
        return [...unifiedManifests, ...this.dynamicManifests] as FunctionDeclaration[];
    }

    /**
     * EXECUTE: Routes call to appropriate registry.
     */
    async execute(name: string, args: any) {
        // 1. Check Dynamic (Evolved) Tools
        if (this.dynamicLogic[name]) {
            return this.dynamicLogic[name](args);
        }

        // 2. Check Capabilities Registry (The new Sovereign Standard)
        const capability = getCapability(name);
        if (capability) {
            const result = await executeCapability(name, args as Record<string, unknown>);
            return {
                toolName: name,
                status: result.success ? 'SUCCESS' : 'ERROR',
                data: result.result,
                uiHint: 'MESSAGE'
            };
        }

        // 3. Legacy Fallback (DEPRECATED - all tools should be in unified registry)
        if ((OS_TOOLS as any)[name]) {
            logger.warn(`DEPRECATED: Tool "${name}" using legacy OS_TOOLS fallback. Migrate to unified registry.`, undefined, 'DynamicToolRegistry');
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
            logger.error(`FORGE_BLOCKED: ${id}`, validation.errors, 'DynamicToolRegistry');
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