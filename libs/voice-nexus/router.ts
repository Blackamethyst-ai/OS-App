/**
 * VOICE NEXUS - Complexity Router
 *
 * Analyzes voice input complexity to route to optimal providers.
 * Determines reasoning tier (fast/balanced/deep) based on query characteristics.
 */

import type {
    ComplexitySignals,
    ComplexityResult,
    ReasoningTier,
    ProviderSelection
} from './types';

// =============================================================================
// Signal Extraction
// =============================================================================

/**
 * Extract complexity signals from a query
 */
export function extractComplexitySignals(query: string): ComplexitySignals {
    const tokens = query.split(/\s+/);

    return {
        tokenCount: tokens.length,
        hasCodeIndicators: detectCodeIndicators(query),
        hasReasoningIndicators: detectReasoningIndicators(query),
        hasCreativeIndicators: detectCreativeIndicators(query),
        hasNavigationIndicators: detectNavigationIndicators(query),
        hasQuestionIndicators: detectQuestionIndicators(query),
        domainComplexity: estimateDomainComplexity(query)
    };
}

/**
 * Detect code-related keywords
 */
function detectCodeIndicators(query: string): boolean {
    const patterns = [
        /implement|debug|function|class|api|refactor/i,
        /code|programming|develop|build|create/i,
        /error|bug|fix|issue|problem/i,
        /typescript|javascript|python|react|node/i
    ];
    return patterns.some(p => p.test(query));
}

/**
 * Detect reasoning-required keywords
 */
function detectReasoningIndicators(query: string): boolean {
    const patterns = [
        /why|analyze|compare|trade-?off|design|architect/i,
        /explain|understand|reason|think|consider/i,
        /evaluate|assess|critique|review/i,
        /implications?|consequences?|effects?/i
    ];
    return patterns.some(p => p.test(query));
}

/**
 * Detect creative task keywords
 */
function detectCreativeIndicators(query: string): boolean {
    const patterns = [
        /brainstorm|imagine|creative|novel|idea/i,
        /story|poem|write|compose|generate/i,
        /innovative|unique|original/i
    ];
    return patterns.some(p => p.test(query));
}

/**
 * Detect navigation/simple commands
 */
function detectNavigationIndicators(query: string): boolean {
    const patterns = [
        /go to|navigate|open|show me|take me/i,
        /switch|change|move|display/i,
        /^(what|where|when|who) (is|are)/i
    ];
    return patterns.some(p => p.test(query));
}

/**
 * Detect question patterns
 */
function detectQuestionIndicators(query: string): boolean {
    return /\?$|^(what|who|where|when|why|how|can|could|would|should|is|are|do|does)/i.test(query);
}

/**
 * Estimate domain complexity from keywords
 */
function estimateDomainComplexity(query: string): number {
    let complexity = 0.5;

    // High complexity domains
    const highComplexity = [
        /architecture|infrastructure|distributed/i,
        /security|vulnerability|encryption/i,
        /machine learning|neural|ai system/i,
        /database|optimization|performance/i
    ];

    // Low complexity domains
    const lowComplexity = [
        /hello|hi|hey|thanks|thank you/i,
        /yes|no|okay|sure|fine/i,
        /what time|weather|date/i
    ];

    for (const pattern of highComplexity) {
        if (pattern.test(query)) complexity += 0.15;
    }

    for (const pattern of lowComplexity) {
        if (pattern.test(query)) complexity -= 0.2;
    }

    return Math.max(0, Math.min(1, complexity));
}

// =============================================================================
// Complexity Scoring
// =============================================================================

/**
 * Calculate overall complexity score (0-1)
 */
export function calculateComplexityScore(signals: ComplexitySignals): number {
    let score = 0;

    // Token count contribution (longer = more complex)
    score += Math.min(signals.tokenCount / 100, 0.3);

    // Code indicators
    if (signals.hasCodeIndicators) score += 0.25;

    // Reasoning indicators
    if (signals.hasReasoningIndicators) score += 0.2;

    // Creative indicators
    if (signals.hasCreativeIndicators) score += 0.15;

    // Navigation indicators (reduces complexity)
    if (signals.hasNavigationIndicators) score -= 0.3;

    // Domain complexity
    score += (signals.domainComplexity - 0.5) * 0.4;

    return Math.max(0, Math.min(1, score));
}

/**
 * Map complexity score to tier
 * ELITE TIER: Lower thresholds for more Opus usage
 */
export function getComplexityTier(
    score: number,
    thresholds: { balanced: number; deep: number } = { balanced: 0.25, deep: 0.55 } // ELITE defaults
): ReasoningTier {
    if (score >= thresholds.deep) return 'deep';
    if (score >= thresholds.balanced) return 'balanced';
    return 'fast';
}

/**
 * Standard tier thresholds (for cost-conscious usage)
 */
export const STANDARD_THRESHOLDS = { balanced: 0.4, deep: 0.75 };

/**
 * Elite tier thresholds (maximum quality)
 */
export const ELITE_THRESHOLDS = { balanced: 0.25, deep: 0.55 };

// =============================================================================
// Provider Selection
// =============================================================================

/**
 * Select optimal providers based on complexity
 * ELITE TIER: Prefers Claude Opus and ElevenLabs
 */
export function selectProviders(
    tier: ReasoningTier,
    availableReasoning: string[] = ['claude-opus', 'claude-sonnet', 'gemini-flash'], // ELITE: Opus first
    availableTTS: string[] = ['elevenlabs', 'gemini', 'browser'] // ELITE: ElevenLabs first
): ProviderSelection {
    // ELITE: Map tier to reasoning provider (Opus-preferred)
    let reasoning: string;
    if (tier === 'deep') {
        reasoning = availableReasoning.find(r => r.includes('opus')) || availableReasoning[0];
    } else if (tier === 'balanced') {
        reasoning = availableReasoning.find(r => r.includes('sonnet')) ||
                   availableReasoning.find(r => r.includes('opus')) ||
                   availableReasoning[0];
    } else {
        // Even fast tier uses Sonnet in Elite mode if available
        reasoning = availableReasoning.find(r => r.includes('sonnet')) ||
                   availableReasoning.find(r => r.includes('flash')) ||
                   availableReasoning[0];
    }

    // ELITE: Always prefer ElevenLabs for voice quality
    const tts = availableTTS.find(t => t === 'elevenlabs') || availableTTS[0];

    return {
        reasoning,
        tts,
        reasoningTier: tier
    };
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze query complexity and return full result
 */
export function analyzeComplexity(
    query: string,
    thresholds?: { balanced: number; deep: number }
): ComplexityResult {
    const signals = extractComplexitySignals(query);
    const score = calculateComplexityScore(signals);
    const tier = getComplexityTier(score, thresholds);
    const providers = selectProviders(tier);

    return {
        score,
        tier,
        signals,
        recommendedProvider: {
            reasoning: providers.reasoning,
            tts: providers.tts
        }
    };
}

/**
 * Check if user explicitly requested a specific mode
 */
export function hasExplicitOverride(query: string): { hasOverride: boolean; tier?: ReasoningTier } {
    if (/use (claude|opus)|deep (thinking|analysis)/i.test(query)) {
        return { hasOverride: true, tier: 'deep' };
    }
    if (/quick|fast|brief/i.test(query)) {
        return { hasOverride: true, tier: 'fast' };
    }
    return { hasOverride: false };
}

/**
 * Format complexity result for logging/display
 */
export function formatComplexityResult(result: ComplexityResult): string {
    const signals = [];
    if (result.signals.hasCodeIndicators) signals.push('CODE');
    if (result.signals.hasReasoningIndicators) signals.push('REASONING');
    if (result.signals.hasCreativeIndicators) signals.push('CREATIVE');
    if (result.signals.hasNavigationIndicators) signals.push('NAV');

    return `[C:${result.score.toFixed(2)} T:${result.tier.toUpperCase()}] ${signals.join('+')} → ${result.recommendedProvider.reasoning}`;
}

export default {
    analyzeComplexity,
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    selectProviders,
    hasExplicitOverride,
    formatComplexityResult
};
