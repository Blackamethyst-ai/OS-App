/**
 * Cognitive Precision Bridge - Router
 *
 * Intelligent path selection based on query characteristics.
 * Determines whether to use RLM, ACE, Hybrid, or Direct path.
 *
 * Routing Logic:
 * - Direct: Simple queries, short context, high time pressure
 * - RLM: Long context requiring compression and exploration
 * - ACE: Multi-perspective decision requiring consensus
 * - Hybrid: Complex queries needing both compression and consensus
 * - Cascade: Expert tasks requiring full pipeline verification
 */

import type {
    CPBPath,
    PathSignals,
    RoutingDecision,
    CPBRequest,
    CPBConfig,
    LearnedRouting
} from './types';
import { DEFAULT_CPB_CONFIG } from './types';
import { estimateComplexity } from '../complexityEstimator';

// ============================================================================
// SIGNAL EXTRACTION
// ============================================================================

/**
 * Extract path-determining signals from request
 */
export function extractPathSignals(
    request: CPBRequest,
    config: CPBConfig = DEFAULT_CPB_CONFIG
): PathSignals {
    const contextLength = (request.context?.length || 0) + request.query.length;

    // Estimate complexity using existing infrastructure
    const task = request.task || {
        id: `cpb-${Date.now()}`,
        instruction: request.query,
        isolated_input: request.context || '',
        expected_type: 'text',
        status: 'pending' as const
    };
    const complexityProfile = estimateComplexity(task);

    // Map complexity to 0-1 score
    const queryComplexity = mapComplexityToScore(complexityProfile.taskType, request.query);

    // Detect if consensus is beneficial
    const requiresConsensus = detectConsensusNeed(request.query);

    // Detect if deep reasoning is needed
    const requiresReasoning = detectReasoningNeed(request.query);

    // Check for ground truth availability
    const hasGroundTruth = !!request.task?.expected_type && request.task.expected_type !== 'text';

    return {
        contextLength,
        queryComplexity,
        requiresConsensus,
        requiresReasoning,
        hasGroundTruth,
        timeBudgetMs: request.timeBudgetMs || config.standardPathMs,
        qualityTarget: request.qualityTarget || config.dqThreshold
    };
}

/**
 * Map complexity type to numeric score
 */
function mapComplexityToScore(taskType: string, query: string): number {
    const baseScores: Record<string, number> = {
        simple: 0.2,
        medium: 0.5,
        expert: 0.8
    };

    let score = baseScores[taskType] || 0.5;

    // Adjust based on query patterns
    const complexityIndicators = [
        { pattern: /architect|design|system/i, boost: 0.15 },
        { pattern: /compare|trade-?off|versus/i, boost: 0.12 },
        { pattern: /implement|refactor|optimize/i, boost: 0.1 },
        { pattern: /analyze|evaluate|assess/i, boost: 0.1 },
        { pattern: /why|how does|explain/i, boost: 0.08 },
        { pattern: /research|investigate|explore/i, boost: 0.1 }
    ];

    const simplicityIndicators = [
        { pattern: /^(what is|where|when|who|list)/i, reduction: 0.15 },
        { pattern: /navigate|go to|open|show/i, reduction: 0.2 },
        { pattern: /^(yes|no|true|false)/i, reduction: 0.25 },
        { pattern: /status|check|current/i, reduction: 0.1 }
    ];

    for (const { pattern, boost } of complexityIndicators) {
        if (pattern.test(query)) score += boost;
    }

    for (const { pattern, reduction } of simplicityIndicators) {
        if (pattern.test(query)) score -= reduction;
    }

    return Math.max(0, Math.min(1, score));
}

/**
 * Detect if multi-agent consensus would be beneficial
 */
function detectConsensusNeed(query: string): boolean {
    const consensusIndicators = [
        /best approach|recommended|should (i|we)/i,
        /opinion|perspective|viewpoint/i,
        /debate|discuss|consider/i,
        /trade-?off|pros? and cons?/i,
        /multiple ways|alternatives?/i,
        /controversial|uncertain|unclear/i,
        /decision|choose|select/i
    ];

    return consensusIndicators.some(pattern => pattern.test(query));
}

/**
 * Detect if deep reasoning/exploration is needed
 */
function detectReasoningNeed(query: string): boolean {
    const reasoningIndicators = [
        /why|how|explain|because/i,
        /analyze|evaluate|assess|critique/i,
        /proof|derive|demonstrate/i,
        /step by step|walkthrough/i,
        /root cause|underlying|fundamental/i,
        /implications?|consequences?|effects?/i,
        /pattern|trend|insight/i
    ];

    return reasoningIndicators.some(pattern => pattern.test(query));
}

// ============================================================================
// PATH SELECTION
// ============================================================================

/**
 * Score each path based on signals
 */
function scorePathsOnSignals(
    signals: PathSignals,
    config: CPBConfig
): Record<CPBPath, { score: number; reasoning: string }> {
    const scores: Record<CPBPath, { score: number; reasoning: string }> = {
        direct: { score: 0.5, reasoning: 'Base path for simple queries' },
        rlm: { score: 0.3, reasoning: 'For long context processing' },
        ace: { score: 0.3, reasoning: 'For multi-perspective consensus' },
        hybrid: { score: 0.3, reasoning: 'Combined compression + consensus' },
        cascade: { score: 0.2, reasoning: 'Full pipeline with verification' }
    };

    // Context length scoring
    if (signals.contextLength > config.contextThreshold) {
        scores.rlm.score += 0.4;
        scores.rlm.reasoning = 'Long context requires compression';
        scores.hybrid.score += 0.3;
        scores.direct.score -= 0.3;
    } else if (signals.contextLength < 5000) {
        scores.direct.score += 0.2;
        scores.rlm.score -= 0.2;
    }

    // Complexity scoring
    if (signals.queryComplexity > config.complexityThreshold) {
        scores.ace.score += 0.3;
        scores.ace.reasoning = 'High complexity benefits from consensus';
        scores.hybrid.score += 0.2;
        scores.cascade.score += 0.15;
        scores.direct.score -= 0.25;
    } else if (signals.queryComplexity < 0.3) {
        scores.direct.score += 0.3;
        scores.direct.reasoning = 'Simple query - direct path optimal';
        scores.ace.score -= 0.2;
        scores.cascade.score -= 0.2;
    }

    // Consensus need
    if (signals.requiresConsensus) {
        scores.ace.score += 0.35;
        scores.ace.reasoning = 'Query explicitly benefits from multiple perspectives';
        scores.hybrid.score += 0.2;
        scores.direct.score -= 0.2;
    }

    // Reasoning need
    if (signals.requiresReasoning) {
        scores.rlm.score += 0.2;
        scores.hybrid.score += 0.15;
        scores.cascade.score += 0.1;
    }

    // Time budget constraints
    if (signals.timeBudgetMs < config.fastPathMs) {
        scores.direct.score += 0.4;
        scores.direct.reasoning = 'Time constraint forces fast path';
        scores.cascade.score -= 0.3;
        scores.hybrid.score -= 0.2;
    } else if (signals.timeBudgetMs > config.hybridPathMs) {
        scores.cascade.score += 0.15;
        scores.cascade.reasoning = 'Time budget allows full verification';
    }

    // Quality target
    if (signals.qualityTarget > 0.8) {
        scores.cascade.score += 0.25;
        scores.cascade.reasoning = 'High quality target requires full pipeline';
        scores.ace.score += 0.1;
        scores.direct.score -= 0.15;
    }

    // Ground truth availability
    if (signals.hasGroundTruth) {
        scores.ace.score += 0.15;
        scores.ace.reasoning += ' (ground truth enables better verification)';
    }

    return scores;
}

/**
 * Select optimal path based on signals
 */
export function selectPath(
    request: CPBRequest,
    config: CPBConfig = DEFAULT_CPB_CONFIG,
    learnedRouting?: LearnedRouting
): RoutingDecision {
    // Honor forced path
    if (request.forcePath) {
        return {
            selectedPath: request.forcePath,
            signals: extractPathSignals(request, config),
            reasoning: `Forced path: ${request.forcePath}`,
            confidence: 1.0,
            alternatives: []
        };
    }

    const signals = extractPathSignals(request, config);
    const pathScores = scorePathsOnSignals(signals, config);

    // Apply learned preferences if available
    if (learnedRouting && learnedRouting.confidence > 0.7) {
        const preferredPath = learnedRouting.preferredPath;
        pathScores[preferredPath].score += 0.15 * learnedRouting.confidence;
        pathScores[preferredPath].reasoning += ` (learned preference: ${Math.round(learnedRouting.avgDQ * 100)}% avg DQ)`;
    }

    // Sort paths by score
    const sorted = Object.entries(pathScores)
        .sort((a, b) => b[1].score - a[1].score)
        .map(([path, { score, reasoning }]) => ({
            path: path as CPBPath,
            score,
            reasoning
        }));

    const selected = sorted[0];
    const alternatives = sorted.slice(1).map(alt => ({
        path: alt.path,
        score: alt.score,
        tradeoff: alt.reasoning
    }));

    return {
        selectedPath: selected.path,
        signals,
        reasoning: selected.reasoning,
        confidence: calculateRoutingConfidence(sorted),
        alternatives
    };
}

/**
 * Calculate confidence in routing decision
 */
function calculateRoutingConfidence(
    sortedPaths: { path: CPBPath; score: number; reasoning: string }[]
): number {
    if (sortedPaths.length < 2) return 1.0;

    const topScore = sortedPaths[0].score;
    const runnerUpScore = sortedPaths[1].score;
    const gap = topScore - runnerUpScore;

    // Higher gap = higher confidence
    // Gap of 0.3+ = very confident (0.9+)
    // Gap of 0.1 = moderate confidence (0.7)
    // Gap of 0 = low confidence (0.5)
    return Math.min(0.95, 0.5 + gap * 1.5);
}

// ============================================================================
// QUICK PATH CHECKS
// ============================================================================

/**
 * Quick check if direct path is sufficient
 */
export function canUseDirectPath(
    request: CPBRequest,
    config: CPBConfig = DEFAULT_CPB_CONFIG
): boolean {
    const contextLength = (request.context?.length || 0) + request.query.length;

    // Too long for direct
    if (contextLength > config.contextThreshold) return false;

    // Time-constrained - force direct
    if (request.timeBudgetMs && request.timeBudgetMs < config.fastPathMs) return true;

    // Check for simplicity indicators
    const simplePatterns = [
        /^(what is|define|who is|when|where)/i,
        /^(list|show|display|get)/i,
        /navigate|go to|open/i
    ];

    return simplePatterns.some(p => p.test(request.query));
}

/**
 * Check if RLM path is needed
 */
export function needsRLMPath(
    request: CPBRequest,
    config: CPBConfig = DEFAULT_CPB_CONFIG
): boolean {
    const contextLength = (request.context?.length || 0) + request.query.length;
    return contextLength > config.contextThreshold;
}

/**
 * Check if ACE consensus would help
 */
export function wouldBenefitFromConsensus(request: CPBRequest): boolean {
    const signals = extractPathSignals(request);
    return signals.requiresConsensus || signals.queryComplexity > 0.6;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    extractPathSignals,
    selectPath,
    canUseDirectPath,
    needsRLMPath,
    wouldBenefitFromConsensus
};
