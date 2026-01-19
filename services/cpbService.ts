/**
 * CPB Service - Simple Component Integration Layer
 *
 * Provides easy-to-use functions for components to leverage
 * Cognitive Precision Bridge without managing complexity directly.
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

import { cpbExecute, cpbExecutePath, extractPathSignals, selectPath } from './cognitivePrecisionBridge';
import type { CPBStatus, CPBResult, CPBPath, ImageInput } from './cognitivePrecisionBridge';

export interface CPBQueryOptions {
    context?: string;
    images?: ImageInput[];
    onStatus?: (status: CPBStatus) => void;
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
        if (options.forcePath) {
            return cpbExecutePath(options.forcePath, prompt, options.context, options.onStatus);
        }
        return cpbExecute(prompt, options.context, options.onStatus);
    },

    /**
     * Fast path - direct LLM call, no orchestration
     * Use for: navigation, simple facts, quick responses
     */
    async fast(prompt: string, context?: string, onStatus?: (s: CPBStatus) => void): Promise<CPBResult> {
        return cpbExecutePath('direct', prompt, context, onStatus);
    },

    /**
     * Deep path - RLM compression for long context
     * Use for: document analysis, large codebase queries
     */
    async deep(prompt: string, context?: string, onStatus?: (s: CPBStatus) => void): Promise<CPBResult> {
        return cpbExecutePath('rlm', prompt, context, onStatus);
    },

    /**
     * Consensus path - ACE multi-agent agreement
     * Use for: architecture decisions, complex analysis, trade-off evaluation
     */
    async consensus(prompt: string, context?: string, onStatus?: (s: CPBStatus) => void): Promise<CPBResult> {
        return cpbExecutePath('ace', prompt, context, onStatus);
    },

    /**
     * Hybrid path - RLM + ACE combined
     * Use for: large context that needs consensus
     */
    async hybrid(prompt: string, context?: string, onStatus?: (s: CPBStatus) => void): Promise<CPBResult> {
        return cpbExecutePath('hybrid', prompt, context, onStatus);
    },

    /**
     * Cascade path - full verification pipeline
     * Use for: critical decisions, research synthesis, production code
     */
    async cascade(prompt: string, context?: string, onStatus?: (s: CPBStatus) => void): Promise<CPBResult> {
        return cpbExecutePath('cascade', prompt, context, onStatus);
    },

    /**
     * Analyze a query to determine recommended path without executing
     */
    analyze(query: string, context?: string): { path: CPBPath; reasoning: string; signals: ReturnType<typeof extractPathSignals> } {
        const signals = extractPathSignals(query, context || '');
        const decision = selectPath(signals);
        return {
            path: decision.path,
            reasoning: decision.reasoning,
            signals
        };
    },

    /**
     * Check if a query would benefit from CPB orchestration
     * Returns false for simple queries that should use direct LLM calls
     */
    shouldOrchestrate(query: string, context?: string): boolean {
        const signals = extractPathSignals(query, context || '');
        // If direct path scores highest, no orchestration needed
        const decision = selectPath(signals);
        return decision.path !== 'direct';
    }
};

// Re-export types for convenience
export type { CPBStatus, CPBResult, CPBPath, ImageInput };

// Default export
export default cpb;
