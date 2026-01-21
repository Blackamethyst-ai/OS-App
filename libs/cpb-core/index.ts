/**
 * Cognitive Precision Bridge (CPB)
 *
 * Unified orchestration layer for precision-aware AI processing.
 * Routes queries through optimal paths based on complexity analysis.
 *
 * @example
 * ```typescript
 * import { createCPB, type CPBProvider } from '@antigravity/cpb-core';
 *
 * // Define your provider
 * const myProvider: CPBProvider = {
 *     name: 'openai',
 *     isConfigured: () => true,
 *     generate: async (prompt) => {
 *         // Your LLM call here
 *         return response;
 *     }
 * };
 *
 * // Create CPB instance
 * const cpb = createCPB({
 *     fast: myProvider,
 *     balanced: myProvider,
 *     deep: myProvider
 * });
 *
 * // Execute with auto-routing
 * const result = await cpb.execute({
 *     query: 'Analyze the trade-offs of microservices vs monolith',
 *     context: systemDesignDoc
 * }, (status) => {
 *     console.log(`${status.phase}: ${status.progress}%`);
 * });
 *
 * console.log(result.output);
 * console.log(`Path: ${result.path}, DQ: ${result.dqScore.overall}%`);
 * ```
 */

// Types
export type {
    CPBPath,
    CPBPhase,
    CPBConfig,
    CPBRequest,
    CPBResult,
    CPBStatus,
    CPBProvider,
    GenerateOptions,
    PathSignals,
    RoutingDecision,
    DQScore,
    RLMStatus,
    RLMResult,
    ACEResult,
    ImageInput,
    MultimodalContent,
    ModelTier,
    CPBPattern,
    LearnedRouting,
    CPBStatusCallback
} from './types';

export { DEFAULT_CPB_CONFIG, STANDARD_CPB_CONFIG } from './types';

// Router
export {
    extractPathSignals,
    selectPath,
    canUseDirectPath,
    needsRLMPath,
    wouldBenefitFromConsensus
} from './router';

// Orchestrator
export {
    CognitivePrecisionBridge,
    createCPB,
    cpbExecute
} from './orchestrator';

// Default export
export { default } from './orchestrator';
