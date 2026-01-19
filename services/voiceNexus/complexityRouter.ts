/**
 * VOICE NEXUS - Complexity Router
 *
 * Analyzes user queries to determine optimal provider routing.
 * Uses DQ-inspired scoring to balance speed vs quality.
 *
 * Complexity Tiers:
 *   - FAST (C < 0.3):     Navigation, simple facts → Gemini Flash
 *   - BALANCED (0.3-0.7): Code generation, analysis → Claude Sonnet
 *   - DEEP (C > 0.7):     Architecture, research → Claude Opus
 */

import type {
    ComplexitySignals,
    ComplexityResult,
    ReasoningTier,
    TTSProviderType,
    ProviderSelection,
} from './types';

// =============================================================================
// Pattern Definitions
// =============================================================================

const CODE_PATTERNS = /\b(implement|refactor|debug|function|class|api|code|typescript|javascript|python|rust|write a|create a function|fix the bug|generate code)\b/i;

const REASONING_PATTERNS = /\b(why|analyze|compare|trade-?off|design|architect|explain|evaluate|assess|consider|think about|what if|implications|consequences)\b/i;

const CREATIVE_PATTERNS = /\b(brainstorm|imagine|creative|novel|idea|invent|suggest|propose|alternative|what could|dream up)\b/i;

const NAVIGATION_PATTERNS = /\b(go to|navigate|open|show me|take me|switch to|display|view|see|look at|pull up)\b/i;

const QUESTION_PATTERNS = /\b(what is|who is|where is|when did|how do|can you|could you|would you|is there|are there)\b/i;

const DEEP_DOMAIN_PATTERNS = /\b(architecture|system design|multi-agent|consensus|orchestration|distributed|scalability|performance optimization|security audit|research synthesis|state machine)\b/i;

// =============================================================================
// Complexity Analysis
// =============================================================================

/**
 * Extract complexity signals from a query
 */
export function extractComplexitySignals(query: string): ComplexitySignals {
    const tokens = query.trim().split(/\s+/);

    return {
        tokenCount: tokens.length,
        hasCodeIndicators: CODE_PATTERNS.test(query),
        hasReasoningIndicators: REASONING_PATTERNS.test(query),
        hasCreativeIndicators: CREATIVE_PATTERNS.test(query),
        hasNavigationIndicators: NAVIGATION_PATTERNS.test(query),
        hasQuestionIndicators: QUESTION_PATTERNS.test(query),
        domainComplexity: DEEP_DOMAIN_PATTERNS.test(query) ? 0.3 : 0,
    };
}

/**
 * Calculate complexity score from signals
 * Returns a value between 0 (simple) and 1 (complex)
 */
export function calculateComplexityScore(signals: ComplexitySignals): number {
    let score = 0;

    // Token count factor (longer = more complex, up to 0.25)
    score += Math.min(signals.tokenCount / 100, 0.25);

    // Code indicators (moderately complex)
    if (signals.hasCodeIndicators) score += 0.25;

    // Reasoning indicators (complex)
    if (signals.hasReasoningIndicators) score += 0.2;

    // Creative indicators (moderately complex)
    if (signals.hasCreativeIndicators) score += 0.15;

    // Navigation indicators (reduce complexity - should be fast)
    if (signals.hasNavigationIndicators) score -= 0.3;

    // Simple questions (reduce complexity slightly)
    if (signals.hasQuestionIndicators && !signals.hasReasoningIndicators) {
        score -= 0.1;
    }

    // Domain complexity boost
    score += signals.domainComplexity;

    // Clamp to [0, 1]
    return Math.max(0, Math.min(score, 1.0));
}

/**
 * Determine complexity tier from score
 */
export function getComplexityTier(score: number): ReasoningTier {
    if (score < 0.3) return 'fast';
    if (score < 0.7) return 'balanced';
    return 'deep';
}

/**
 * Select optimal providers based on complexity
 */
export function selectProviders(score: number): ProviderSelection {
    const tier = getComplexityTier(score);

    switch (tier) {
        case 'fast':
            return {
                reasoning: 'gemini-flash',
                tts: 'gemini',
                reasoningTier: 'fast',
            };

        case 'balanced':
            return {
                reasoning: 'claude-sonnet',
                tts: 'elevenlabs',
                reasoningTier: 'balanced',
            };

        case 'deep':
            return {
                reasoning: 'claude-opus',
                tts: 'elevenlabs',
                reasoningTier: 'deep',
            };
    }
}

/**
 * Main entry point: Analyze query and return full complexity result
 */
export function analyzeComplexity(query: string): ComplexityResult {
    const signals = extractComplexitySignals(query);
    const score = calculateComplexityScore(signals);
    const tier = getComplexityTier(score);
    const providers = selectProviders(score);

    return {
        score,
        tier,
        signals,
        recommendedProvider: {
            reasoning: providers.reasoning,
            tts: providers.tts,
        },
    };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a query should bypass complexity routing (explicit overrides)
 */
export function hasExplicitOverride(query: string): { override: boolean; tier?: ReasoningTier } {
    // User can force deep thinking with phrases like "think carefully" or "deep analysis"
    if (/\b(think carefully|deep analysis|thorough|comprehensive)\b/i.test(query)) {
        return { override: true, tier: 'deep' };
    }

    // User can force fast response with "quick" or "briefly"
    if (/\b(quick|quickly|briefly|short answer|fast)\b/i.test(query)) {
        return { override: true, tier: 'fast' };
    }

    return { override: false };
}

/**
 * Format complexity result for logging/debugging
 */
export function formatComplexityResult(result: ComplexityResult): string {
    const signalFlags = [
        result.signals.hasCodeIndicators && 'CODE',
        result.signals.hasReasoningIndicators && 'REASONING',
        result.signals.hasCreativeIndicators && 'CREATIVE',
        result.signals.hasNavigationIndicators && 'NAV',
        result.signals.hasQuestionIndicators && 'QUESTION',
    ].filter(Boolean).join(', ');

    return `[DQ:${result.score.toFixed(2)} C:${result.tier.toUpperCase()}] → ${result.recommendedProvider.reasoning} | Signals: ${signalFlags || 'NONE'}`;
}

// =============================================================================
// Export convenience function matching plan API
// =============================================================================

export { selectProviders as selectProvider };
