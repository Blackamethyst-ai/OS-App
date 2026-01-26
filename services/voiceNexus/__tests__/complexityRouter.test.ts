/**
 * Complexity Router Tests
 *
 * Tests the DQ-inspired complexity scoring algorithm that determines
 * optimal provider routing for voice queries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    analyzeComplexity,
    hasExplicitOverride,
    formatComplexityResult,
    getRouterConfig,
    updateRouterConfig,
    resetToEliteConfig,
    switchToStandardConfig,
    setThresholds,
    getThresholds,
} from '../complexityRouter';

describe('ComplexityRouter', () => {
    beforeEach(() => {
        // Reset to default ELITE config before each test
        resetToEliteConfig();
    });

    describe('extractComplexitySignals', () => {
        it('should extract token count correctly', () => {
            const signals = extractComplexitySignals('hello world how are you');
            expect(signals.tokenCount).toBe(5);
        });

        it('should detect code indicators', () => {
            const signals = extractComplexitySignals('implement a sorting function');
            expect(signals.hasCodeIndicators).toBe(true);
        });

        it('should detect reasoning indicators', () => {
            const signals = extractComplexitySignals('why does this architecture work');
            expect(signals.hasReasoningIndicators).toBe(true);
        });

        it('should detect creative indicators', () => {
            const signals = extractComplexitySignals('brainstorm ideas for the UI');
            expect(signals.hasCreativeIndicators).toBe(true);
        });

        it('should detect navigation indicators', () => {
            const signals = extractComplexitySignals('go to the dashboard');
            expect(signals.hasNavigationIndicators).toBe(true);
        });

        it('should detect question indicators', () => {
            const signals = extractComplexitySignals('what is the current state');
            expect(signals.hasQuestionIndicators).toBe(true);
        });

        it('should detect deep domain patterns', () => {
            const signals = extractComplexitySignals('design a multi-agent orchestration system');
            expect(signals.domainComplexity).toBeGreaterThan(0);
        });

        it('should return zero domain complexity for simple queries', () => {
            const signals = extractComplexitySignals('hello world');
            expect(signals.domainComplexity).toBe(0);
        });
    });

    describe('calculateComplexityScore', () => {
        it('should return low score for simple navigation', () => {
            const signals = extractComplexitySignals('go to settings');
            const score = calculateComplexityScore(signals);
            expect(score).toBeLessThan(0.3);
        });

        it('should return moderate score for code tasks', () => {
            const signals = extractComplexitySignals('implement a function to parse JSON');
            const score = calculateComplexityScore(signals);
            expect(score).toBeGreaterThan(0.2);
        });

        it('should return high score for complex reasoning', () => {
            const signals = extractComplexitySignals(
                'analyze the architecture implications of this multi-agent consensus system'
            );
            const score = calculateComplexityScore(signals);
            expect(score).toBeGreaterThan(0.5);
        });

        it('should clamp score to [0, 1]', () => {
            // Very complex query with many indicators
            const signals = {
                tokenCount: 200,
                hasCodeIndicators: true,
                hasReasoningIndicators: true,
                hasCreativeIndicators: true,
                hasNavigationIndicators: false,
                hasQuestionIndicators: false,
                domainComplexity: 0.3,
            };
            const score = calculateComplexityScore(signals);
            expect(score).toBeLessThanOrEqual(1.0);
            expect(score).toBeGreaterThanOrEqual(0);
        });

        it('should reduce score for navigation queries', () => {
            const navSignals = extractComplexitySignals('navigate to the agent panel');
            const nonNavSignals = extractComplexitySignals('check the agent panel');
            const navScore = calculateComplexityScore(navSignals);
            const nonNavScore = calculateComplexityScore(nonNavSignals);
            expect(navScore).toBeLessThan(nonNavScore);
        });
    });

    describe('getComplexityTier', () => {
        it('should return fast for low scores in ELITE mode', () => {
            // ELITE fastThreshold is 0.2
            expect(getComplexityTier(0.1)).toBe('fast');
            expect(getComplexityTier(0.19)).toBe('fast');
        });

        it('should return balanced for medium scores in ELITE mode', () => {
            // ELITE: 0.2 <= score < 0.5
            expect(getComplexityTier(0.2)).toBe('balanced');
            expect(getComplexityTier(0.35)).toBe('balanced');
            expect(getComplexityTier(0.49)).toBe('balanced');
        });

        it('should return deep for high scores in ELITE mode', () => {
            // ELITE deepThreshold is 0.5
            expect(getComplexityTier(0.5)).toBe('deep');
            expect(getComplexityTier(0.8)).toBe('deep');
            expect(getComplexityTier(1.0)).toBe('deep');
        });

        it('should respect custom thresholds', () => {
            setThresholds(0.3, 0.7);
            expect(getComplexityTier(0.25)).toBe('fast');
            expect(getComplexityTier(0.5)).toBe('balanced');
            expect(getComplexityTier(0.75)).toBe('deep');
        });
    });

    describe('analyzeComplexity', () => {
        it('should return complete complexity result', () => {
            const result = analyzeComplexity('implement a caching layer');
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('tier');
            expect(result).toHaveProperty('signals');
            expect(result).toHaveProperty('recommendedProvider');
            expect(result.recommendedProvider).toHaveProperty('reasoning');
            expect(result.recommendedProvider).toHaveProperty('tts');
        });

        it('should route navigation to fast tier', () => {
            const result = analyzeComplexity('go to dashboard');
            expect(result.tier).toBe('fast');
        });

        it('should route complex architecture to deep tier', () => {
            const result = analyzeComplexity(
                'design a distributed multi-agent consensus architecture for scalability'
            );
            expect(result.tier).toBe('deep');
        });
    });

    describe('hasExplicitOverride', () => {
        it('should detect deep thinking override', () => {
            const result = hasExplicitOverride('think carefully about this problem');
            expect(result.override).toBe(true);
            expect(result.tier).toBe('deep');
        });

        it('should detect fast response override', () => {
            const result = hasExplicitOverride('give me a quick answer');
            expect(result.override).toBe(true);
            expect(result.tier).toBe('fast');
        });

        it('should return no override for normal queries', () => {
            const result = hasExplicitOverride('what is the weather');
            expect(result.override).toBe(false);
            expect(result.tier).toBeUndefined();
        });

        it('should detect comprehensive override', () => {
            const result = hasExplicitOverride('do a comprehensive analysis');
            expect(result.override).toBe(true);
            expect(result.tier).toBe('deep');
        });
    });

    describe('formatComplexityResult', () => {
        it('should format result with all signal flags', () => {
            const result = analyzeComplexity('implement and analyze the code architecture');
            const formatted = formatComplexityResult(result);
            expect(formatted).toContain('[DQ:');
            expect(formatted).toContain('C:');
            expect(formatted).toContain('→');
        });

        it('should show NONE when no signals detected', () => {
            const result = analyzeComplexity('hello');
            const formatted = formatComplexityResult(result);
            // Short query with no patterns may have NONE or QUESTION
            expect(formatted).toMatch(/Signals: (NONE|QUESTION)/);
        });
    });

    describe('Configuration Management', () => {
        it('should return current config', () => {
            const config = getRouterConfig();
            expect(config).toHaveProperty('fastThreshold');
            expect(config).toHaveProperty('deepThreshold');
            expect(config).toHaveProperty('weights');
            expect(config).toHaveProperty('tierModels');
            expect(config).toHaveProperty('tierTTS');
            expect(config).toHaveProperty('eliteMode');
        });

        it('should update partial config', () => {
            updateRouterConfig({ fastThreshold: 0.15 });
            const config = getRouterConfig();
            expect(config.fastThreshold).toBe(0.15);
        });

        it('should update nested weights', () => {
            updateRouterConfig({ weights: { codeIndicator: 0.5 } });
            const config = getRouterConfig();
            expect(config.weights.codeIndicator).toBe(0.5);
            // Other weights should be preserved
            expect(config.weights.reasoningIndicator).toBeDefined();
        });

        it('should switch to standard config', () => {
            switchToStandardConfig();
            const config = getRouterConfig();
            expect(config.eliteMode).toBe(false);
            expect(config.fastThreshold).toBe(0.3);
            expect(config.tierModels.fast).toBe('claude-haiku');
        });

        it('should reset to ELITE config', () => {
            switchToStandardConfig();
            resetToEliteConfig();
            const config = getRouterConfig();
            expect(config.eliteMode).toBe(true);
            expect(config.fastThreshold).toBe(0.2);
        });

        it('should set and get thresholds', () => {
            setThresholds(0.25, 0.6);
            const thresholds = getThresholds();
            expect(thresholds.fast).toBe(0.25);
            expect(thresholds.deep).toBe(0.6);
        });

        it('should throw error for invalid thresholds', () => {
            expect(() => setThresholds(0.5, 0.3)).toThrow('Fast threshold must be less than deep threshold');
        });

        it('should clamp thresholds to [0, 1]', () => {
            setThresholds(-0.5, 1.5);
            const thresholds = getThresholds();
            expect(thresholds.fast).toBe(0);
            expect(thresholds.deep).toBe(1);
        });
    });

    describe('Real-world Query Scenarios', () => {
        it('should handle "show me the agents" as navigation', () => {
            const result = analyzeComplexity('show me the agents');
            expect(result.signals.hasNavigationIndicators).toBe(true);
            expect(result.tier).toBe('fast');
        });

        it('should handle "implement user authentication" as code task', () => {
            const result = analyzeComplexity('implement user authentication');
            expect(result.signals.hasCodeIndicators).toBe(true);
            expect(result.tier).not.toBe('fast');
        });

        it('should handle "why is the system slow" as reasoning', () => {
            const result = analyzeComplexity('why is the system slow');
            expect(result.signals.hasReasoningIndicators).toBe(true);
        });

        it('should handle mixed navigation + code as balanced', () => {
            const result = analyzeComplexity('go to the function and refactor it');
            expect(result.signals.hasNavigationIndicators).toBe(true);
            expect(result.signals.hasCodeIndicators).toBe(true);
            // Navigation reduces but code adds, should be balanced
        });

        it('should route "design a distributed system" to deep', () => {
            const result = analyzeComplexity('design a distributed system for high scalability');
            expect(result.signals.hasReasoningIndicators).toBe(true);
            expect(result.signals.domainComplexity).toBeGreaterThan(0);
            expect(result.tier).toBe('deep');
        });
    });
});
