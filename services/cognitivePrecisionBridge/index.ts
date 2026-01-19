/**
 * Cognitive Precision Bridge (CPB)
 *
 * Unified orchestration layer for precision-aware AI processing.
 * Routes queries through RLM, ACE, and DQ scoring based on complexity.
 *
 * Usage:
 * ```typescript
 * import { cpbExecute, cognitivePrecisionBridge } from './services/cognitivePrecisionBridge';
 *
 * // Simple execution
 * const result = await cpbExecute('Analyze this code...', codeContext);
 *
 * // With status updates
 * const result = await cpbExecute('Complex query...', context, (status) => {
 *     console.log(`${status.phase}: ${status.progress}%`);
 * });
 *
 * // Force specific path
 * import { cpbExecutePath } from './services/cognitivePrecisionBridge';
 * const result = await cpbExecutePath('cascade', 'High-quality analysis needed...', context);
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
    PathSignals,
    RoutingDecision,
    CPBPattern,
    LearnedRouting,
    ImageInput,
    MultimodalContent,
    ReasoningModel
} from './types';

export { DEFAULT_CPB_CONFIG } from './types';

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
    cognitivePrecisionBridge,
    cpbExecute,
    cpbExecutePath
} from './orchestrator';

// Default export
export { default } from './orchestrator';
