/**
 * CPB Service - Component Integration Layer
 *
 * Provides easy-to-use functions for components to leverage
 * @metaventionsai/cpb-core without managing complexity directly.
 *
 * Usage:
 * ```typescript
 * import { cpb } from '../services/cpbService';
 *
 * // Auto-routed query
 * const result = await cpb.query('Analyze this code...');
 *
 * // With context
 * const result = await cpb.query('Explain the bug', { context: codeSnippet });
 *
 * // Force specific path
 * const result = await cpb.consensus('Design a new API architecture');
 * const result = await cpb.deep('Complex multi-step reasoning task');
 *
 * // With status callback
 * const result = await cpb.query('Long task...', {
 *     onStatus: (s) => setProgress(s.progress)
 * });
 * ```
 */

import {
    createCPB,
    extractPathSignals,
    selectPath,
    canUseDirectPath,
    needsRLMPath,
    wouldBenefitFromConsensus
} from '@metaventionsai/cpb-core';

import type {
    CPBStatus,
    CPBResult,
    CPBPath,
    ImageInput,
    CPBStatusCallback
} from '@metaventionsai/cpb-core';

import { defaultProviders } from './cpbProviders';

// Create the CPB instance with our providers
const cpbInstance = createCPB(defaultProviders);

export interface CPBQueryOptions {
    context?: string;
    images?: ImageInput[];
    onStatus?: CPBStatusCallback;
    forcePath?: CPBPath;
    timeout?: number;
}

/**
 * Main CPB service object for component integration
 */
export const cpb = {
    /**
     * Auto-routed query - CPB decides the best path
     */
    async query(prompt: string, options: CPBQueryOptions = {}): Promise<CPBResult> {
        return cpbInstance.execute(
            {
                query: prompt,
                context: options.context,
                multimodal: options.images ? { images: options.images } : undefined,
                forcePath: options.forcePath,
                timeBudgetMs: options.timeout
            },
            options.onStatus
        );
    },

    /**
     * Fast path - direct LLM call, no orchestration
     * Use for: navigation, simple facts, quick responses
     */
    async fast(prompt: string, context?: string, onStatus?: CPBStatusCallback): Promise<CPBResult> {
        return cpbInstance.execute(
            { query: prompt, context, forcePath: 'direct' },
            onStatus
        );
    },

    /**
     * Deep path - RLM compression for long context
     * Use for: document analysis, large codebase queries
     */
    async deep(prompt: string, context?: string, onStatus?: CPBStatusCallback): Promise<CPBResult> {
        return cpbInstance.execute(
            { query: prompt, context, forcePath: 'rlm' },
            onStatus
        );
    },

    /**
     * Consensus path - ACE multi-agent agreement
     * Use for: architecture decisions, complex analysis, trade-off evaluation
     */
    async consensus(prompt: string, context?: string, onStatus?: CPBStatusCallback): Promise<CPBResult> {
        return cpbInstance.execute(
            { query: prompt, context, forcePath: 'ace' },
            onStatus
        );
    },

    /**
     * Hybrid path - RLM + ACE combined
     * Use for: large context that needs consensus
     */
    async hybrid(prompt: string, context?: string, onStatus?: CPBStatusCallback): Promise<CPBResult> {
        return cpbInstance.execute(
            { query: prompt, context, forcePath: 'hybrid' },
            onStatus
        );
    },

    /**
     * Cascade path - full verification pipeline
     * Use for: critical decisions, research synthesis, production code
     */
    async cascade(prompt: string, context?: string, onStatus?: CPBStatusCallback): Promise<CPBResult> {
        return cpbInstance.execute(
            { query: prompt, context, forcePath: 'cascade' },
            onStatus
        );
    },

    /**
     * Analyze a query to determine recommended path without executing
     */
    analyze(query: string, context?: string) {
        const signals = extractPathSignals(query, context || '');
        const decision = selectPath(signals);
        return {
            path: decision.path,
            reasoning: decision.reasoning,
            confidence: decision.confidence,
            alternatives: decision.alternatives,
            signals
        };
    },

    /**
     * Check if a query would benefit from CPB orchestration
     * Returns false for simple queries that should use direct LLM calls
     */
    shouldOrchestrate(query: string, context?: string): boolean {
        return !canUseDirectPath(query, context);
    },

    /**
     * Check if RLM path is needed for context compression
     */
    needsCompression(query: string, context?: string): boolean {
        return needsRLMPath(query, context);
    },

    /**
     * Check if ACE consensus would benefit this query
     */
    wouldBenefitFromConsensus(query: string, context?: string): boolean {
        return wouldBenefitFromConsensus(query, context);
    },

    /**
     * Get the underlying CPB instance for advanced usage
     */
    getInstance() {
        return cpbInstance;
    }
};

// Re-export types for convenience
export type { CPBStatus, CPBResult, CPBPath, ImageInput, CPBStatusCallback };

// Re-export router utilities
export { extractPathSignals, selectPath, canUseDirectPath, needsRLMPath, wouldBenefitFromConsensus };

// Default export
export default cpb;
