import { describe, it, expect, beforeEach } from 'vitest';
import {
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    selectProviders,
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

describe('Complexity Router', () => {
    // Reset config before each test
    beforeEach(() => {
        resetToEliteConfig();
    });

    describe('extractComplexitySignals', () => {
        it('should detect code indicators', () => {
            const signals = extractComplexitySignals('implement a function to calculate sum');
            expect(signals.hasCodeIndicators).toBe(true);
        });

        it('should detect reasoning indicators', () => {
            const signals = extractComplexitySignals('why does this pattern work better?');
            expect(signals.hasReasoningIndicators).toBe(true);
        });

        it('should detect creative indicators', () => {
            const signals = extractComplexitySignals('brainstorm ideas for the new feature');
            expect(signals.hasCreativeIndicators).toBe(true);
        });

        it('should detect navigation indicators', () => {
            const signals = extractComplexitySignals('go to the dashboard');
            expect(signals.hasNavigationIndicators).toBe(true);
        });

        it('should detect question indicators', () => {
            const signals = extractComplexitySignals('what is the capital of France?');
            expect(signals.hasQuestionIndicators).toBe(true);
        });

        it('should detect domain complexity', () => {
            const signals = extractComplexitySignals('design the multi-agent orchestration system');
            expect(signals.domainComplexity).toBeGreaterThan(0);
        });

        it('should count tokens correctly', () => {
            const signals = extractComplexitySignals('one two three four five');
            expect(signals.tokenCount).toBe(5);
        });
    });

    describe('calculateComplexityScore', () => {
        it('should return low score for simple navigation', () => {
            const signals = extractComplexitySignals('go to settings');
            const score = calculateComplexityScore(signals);
            expect(score).toBeLessThan(0.2);
        });

        it('should return high score for complex architecture queries', () => {
            const signals = extractComplexitySignals(
                'design the multi-agent orchestration architecture with consensus mechanisms'
            );
            const score = calculateComplexityScore(signals);
            expect(score).toBeGreaterThan(0.5);
        });

        it('should return medium score for code tasks', () => {
            const signals = extractComplexitySignals('implement a login function');
            const score = calculateComplexityScore(signals);
            expect(score).toBeGreaterThanOrEqual(0.2);
            expect(score).toBeLessThanOrEqual(0.6);
        });

        it('should clamp score to [0, 1]', () => {
            // Very complex query
            const signals = extractComplexitySignals(
                'analyze and compare the architectural trade-offs of implementing a distributed multi-agent consensus system with security considerations'
            );
            const score = calculateComplexityScore(signals);
            expect(score).toBeLessThanOrEqual(1.0);
            expect(score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getComplexityTier', () => {
        it('should return fast for low scores (< 0.2 in ELITE mode)', () => {
            expect(getComplexityTier(0.1)).toBe('fast');
            expect(getComplexityTier(0.15)).toBe('fast');
        });

        it('should return balanced for medium scores', () => {
            expect(getComplexityTier(0.3)).toBe('balanced');
            expect(getComplexityTier(0.4)).toBe('balanced');
        });

        it('should return deep for high scores (>= 0.5 in ELITE mode)', () => {
            expect(getComplexityTier(0.5)).toBe('deep');
            expect(getComplexityTier(0.8)).toBe('deep');
        });
    });

    describe('selectProviders', () => {
        it('should select correct providers for fast tier in ELITE mode', () => {
            const providers = selectProviders(0.1);
            expect(providers.reasoningTier).toBe('fast');
            expect(providers.reasoning).toBe('claude-sonnet'); // ELITE mode upgrades to Sonnet
            expect(providers.tts).toBe('elevenlabs');
        });

        it('should select correct providers for balanced tier in ELITE mode', () => {
            const providers = selectProviders(0.3);
            expect(providers.reasoningTier).toBe('balanced');
            expect(providers.reasoning).toBe('claude-opus'); // ELITE mode uses Opus
            expect(providers.tts).toBe('elevenlabs');
        });

        it('should select correct providers for deep tier', () => {
            const providers = selectProviders(0.7);
            expect(providers.reasoningTier).toBe('deep');
            expect(providers.reasoning).toBe('claude-opus');
            expect(providers.tts).toBe('elevenlabs');
        });
    });

    describe('analyzeComplexity', () => {
        it('should return complete complexity result', () => {
            const result = analyzeComplexity('implement authentication system');

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('tier');
            expect(result).toHaveProperty('signals');
            expect(result).toHaveProperty('recommendedProvider');

            expect(typeof result.score).toBe('number');
            expect(['fast', 'balanced', 'deep']).toContain(result.tier);
        });

        it('should match score with tier correctly', () => {
            const fastResult = analyzeComplexity('go to home');
            expect(fastResult.tier).toBe('fast');

            const deepResult = analyzeComplexity('design the distributed consensus architecture');
            expect(deepResult.tier).toBe('deep');
        });
    });

    describe('hasExplicitOverride', () => {
        it('should detect deep thinking override', () => {
            const result = hasExplicitOverride('think carefully about this problem');
            expect(result.override).toBe(true);
            expect(result.tier).toBe('deep');
        });

        it('should detect fast response override', () => {
            const result = hasExplicitOverride('quick, what time is it?');
            expect(result.override).toBe(true);
            expect(result.tier).toBe('fast');
        });

        it('should return no override for normal queries', () => {
            const result = hasExplicitOverride('what is the weather like?');
            expect(result.override).toBe(false);
        });
    });

    describe('formatComplexityResult', () => {
        it('should format result as readable string', () => {
            const result = analyzeComplexity('implement a feature');
            const formatted = formatComplexityResult(result);

            expect(formatted).toContain('DQ:');
            expect(formatted).toContain('C:');
            expect(formatted).toContain('→');
        });
    });

    describe('Configuration API', () => {
        describe('getRouterConfig', () => {
            it('should return current configuration', () => {
                const config = getRouterConfig();
                expect(config).toHaveProperty('fastThreshold');
                expect(config).toHaveProperty('deepThreshold');
                expect(config).toHaveProperty('weights');
                expect(config).toHaveProperty('tierModels');
                expect(config).toHaveProperty('tierTTS');
                expect(config).toHaveProperty('eliteMode');
            });

            it('should return ELITE defaults initially', () => {
                const config = getRouterConfig();
                expect(config.eliteMode).toBe(true);
                expect(config.fastThreshold).toBe(0.2);
                expect(config.deepThreshold).toBe(0.5);
            });
        });

        describe('updateRouterConfig', () => {
            it('should update specific config values', () => {
                updateRouterConfig({ fastThreshold: 0.15 });
                const config = getRouterConfig();
                expect(config.fastThreshold).toBe(0.15);
            });

            it('should merge weights correctly', () => {
                updateRouterConfig({
                    weights: { codeIndicator: 0.3 },
                });
                const config = getRouterConfig();
                expect(config.weights.codeIndicator).toBe(0.3);
                // Other weights should remain unchanged
                expect(config.weights.reasoningIndicator).toBe(0.2);
            });

            it('should affect complexity scoring', () => {
                const query = 'implement a function';

                // Get score with default config
                const scoreBefore = analyzeComplexity(query).score;

                // Increase code indicator weight
                updateRouterConfig({
                    weights: { codeIndicator: 0.5 },
                });

                const scoreAfter = analyzeComplexity(query).score;
                expect(scoreAfter).toBeGreaterThan(scoreBefore);
            });
        });

        describe('switchToStandardConfig', () => {
            it('should switch to cost-conscious thresholds', () => {
                switchToStandardConfig();
                const config = getRouterConfig();

                expect(config.eliteMode).toBe(false);
                expect(config.fastThreshold).toBe(0.3);
                expect(config.deepThreshold).toBe(0.7);
            });

            it('should use Haiku for fast tier', () => {
                switchToStandardConfig();
                const config = getRouterConfig();
                expect(config.tierModels.fast).toBe('claude-haiku');
            });
        });

        describe('setThresholds', () => {
            it('should set custom thresholds', () => {
                setThresholds(0.25, 0.6);
                const thresholds = getThresholds();
                expect(thresholds.fast).toBe(0.25);
                expect(thresholds.deep).toBe(0.6);
            });

            it('should throw error if fast >= deep', () => {
                expect(() => setThresholds(0.5, 0.3)).toThrow();
                expect(() => setThresholds(0.5, 0.5)).toThrow();
            });

            it('should clamp values to [0, 1]', () => {
                setThresholds(-0.5, 1.5);
                const thresholds = getThresholds();
                expect(thresholds.fast).toBe(0);
                expect(thresholds.deep).toBe(1);
            });

            it('should affect tier routing', () => {
                // With default ELITE config (0.2, 0.5)
                expect(getComplexityTier(0.3)).toBe('balanced');

                // With new thresholds (0.4, 0.8)
                setThresholds(0.4, 0.8);
                expect(getComplexityTier(0.3)).toBe('fast'); // Now in fast range
            });
        });

        describe('resetToEliteConfig', () => {
            it('should restore ELITE defaults', () => {
                // Make changes
                switchToStandardConfig();
                setThresholds(0.1, 0.9);

                // Reset
                resetToEliteConfig();
                const config = getRouterConfig();

                expect(config.eliteMode).toBe(true);
                expect(config.fastThreshold).toBe(0.2);
                expect(config.deepThreshold).toBe(0.5);
            });
        });
    });

    describe('Real-world Query Classification', () => {
        const testCases = [
            { query: 'go to dashboard', expectedTier: 'fast' },
            { query: 'show me the settings', expectedTier: 'fast' },
            { query: 'navigate to agents page', expectedTier: 'fast' },
            { query: 'what time is it', expectedTier: 'fast' },
            { query: 'implement a login function', expectedTier: 'balanced' },
            { query: 'write code to parse JSON', expectedTier: 'balanced' },
            { query: 'fix the bug in the authentication', expectedTier: 'balanced' },
            // Deep queries need domain complexity + reasoning indicators to reach score >= 0.5
            { query: 'analyze and compare the architecture trade-offs for distributed system design', expectedTier: 'deep' },
            { query: 'design the multi-agent orchestration architecture with consensus mechanisms', expectedTier: 'deep' },
            { query: 'evaluate the security implications of the state machine architecture design', expectedTier: 'deep' },
        ];

        testCases.forEach(({ query, expectedTier }) => {
            it(`should classify "${query.substring(0, 40)}..." as ${expectedTier}`, () => {
                const result = analyzeComplexity(query);
                expect(result.tier).toBe(expectedTier);
            });
        });
    });
});
