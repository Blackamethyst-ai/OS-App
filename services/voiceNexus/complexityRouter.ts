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
// Configurable Thresholds
// =============================================================================

/**
 * Complexity routing configuration
 */
export interface ComplexityRouterConfig {
    /** Threshold below which queries are routed to 'fast' tier */
    fastThreshold: number;
    /** Threshold above which queries are routed to 'deep' tier */
    deepThreshold: number;
    /** Signal weights for scoring */
    weights: {
        tokenCountMax: number;
        codeIndicator: number;
        reasoningIndicator: number;
        creativeIndicator: number;
        navigationIndicator: number;
        questionIndicator: number;
        domainComplexity: number;
    };
    /** Model mappings per tier */
    tierModels: {
        fast: string;
        balanced: string;
        deep: string;
    };
    /** TTS provider per tier */
    tierTTS: {
        fast: TTSProviderType;
        balanced: TTSProviderType;
        deep: TTSProviderType;
    };
    /** Enable ELITE mode (more aggressive Opus routing) */
    eliteMode: boolean;
}

/**
 * Default configuration - ELITE mode enabled
 */
const DEFAULT_CONFIG: ComplexityRouterConfig = {
    // ELITE thresholds - more aggressive routing to higher tiers
    fastThreshold: 0.2,
    deepThreshold: 0.5,
    weights: {
        tokenCountMax: 0.25,
        codeIndicator: 0.25,
        reasoningIndicator: 0.20,
        creativeIndicator: 0.15,
        navigationIndicator: -0.30,
        questionIndicator: -0.10,
        domainComplexity: 0.30,
    },
    tierModels: {
        fast: 'claude-sonnet',      // ELITE: Fast tier still uses Sonnet
        balanced: 'claude-opus',    // ELITE: Balanced uses Opus
        deep: 'claude-opus',        // ELITE: Deep uses Opus
    },
    tierTTS: {
        fast: 'elevenlabs',         // ELITE: Always premium TTS
        balanced: 'elevenlabs',
        deep: 'elevenlabs',
    },
    eliteMode: true,
};

/**
 * Standard configuration (cost-conscious)
 */
const STANDARD_CONFIG: Partial<ComplexityRouterConfig> = {
    fastThreshold: 0.3,
    deepThreshold: 0.7,
    tierModels: {
        fast: 'claude-haiku',
        balanced: 'claude-sonnet',
        deep: 'claude-opus',
    },
    tierTTS: {
        fast: 'browser',
        balanced: 'elevenlabs',
        deep: 'elevenlabs',
    },
    eliteMode: false,
};

// Active configuration (can be modified at runtime)
let activeConfig: ComplexityRouterConfig = { ...DEFAULT_CONFIG };

/**
 * Get current configuration
 */
export function getRouterConfig(): ComplexityRouterConfig {
    return { ...activeConfig };
}

/**
 * Deep partial type for nested configuration
 */
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Update router configuration
 */
export function updateRouterConfig(config: DeepPartial<ComplexityRouterConfig>): void {
    activeConfig = {
        ...activeConfig,
        ...config,
        weights: { ...activeConfig.weights, ...config.weights },
        tierModels: { ...activeConfig.tierModels, ...config.tierModels },
        tierTTS: { ...activeConfig.tierTTS, ...config.tierTTS },
    };
}

/**
 * Reset to default ELITE configuration
 */
export function resetToEliteConfig(): void {
    activeConfig = { ...DEFAULT_CONFIG };
}

/**
 * Switch to standard (cost-conscious) configuration
 */
export function switchToStandardConfig(): void {
    activeConfig = { ...DEFAULT_CONFIG, ...STANDARD_CONFIG };
}

/**
 * Set custom thresholds
 */
export function setThresholds(fast: number, deep: number): void {
    if (fast >= deep) {
        throw new Error('Fast threshold must be less than deep threshold');
    }
    activeConfig.fastThreshold = Math.max(0, Math.min(1, fast));
    activeConfig.deepThreshold = Math.max(0, Math.min(1, deep));
}

/**
 * Get current thresholds
 */
export function getThresholds(): { fast: number; deep: number } {
    return {
        fast: activeConfig.fastThreshold,
        deep: activeConfig.deepThreshold,
    };
}

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
 * Uses configurable weights from activeConfig
 */
export function calculateComplexityScore(signals: ComplexitySignals): number {
    const weights = activeConfig.weights;
    let score = 0;

    // Token count factor (longer = more complex)
    score += Math.min(signals.tokenCount / 100, weights.tokenCountMax);

    // Code indicators (moderately complex)
    if (signals.hasCodeIndicators) score += weights.codeIndicator;

    // Reasoning indicators (complex)
    if (signals.hasReasoningIndicators) score += weights.reasoningIndicator;

    // Creative indicators (moderately complex)
    if (signals.hasCreativeIndicators) score += weights.creativeIndicator;

    // Navigation indicators (reduce complexity - should be fast)
    if (signals.hasNavigationIndicators) score += weights.navigationIndicator;

    // Simple questions (reduce complexity slightly)
    if (signals.hasQuestionIndicators && !signals.hasReasoningIndicators) {
        score += weights.questionIndicator;
    }

    // Domain complexity boost
    score += signals.domainComplexity * (weights.domainComplexity / 0.3);

    // Clamp to [0, 1]
    return Math.max(0, Math.min(score, 1.0));
}

/**
 * Determine complexity tier from score
 * Uses configurable thresholds from activeConfig
 */
export function getComplexityTier(score: number): ReasoningTier {
    if (score < activeConfig.fastThreshold) return 'fast';
    if (score < activeConfig.deepThreshold) return 'balanced';
    return 'deep';
}

/**
 * Select optimal providers based on complexity
 * Uses configurable tier models and TTS from activeConfig
 */
export function selectProviders(score: number): ProviderSelection {
    const tier = getComplexityTier(score);

    return {
        reasoning: activeConfig.tierModels[tier],
        tts: activeConfig.tierTTS[tier],
        reasoningTier: tier,
    };
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
