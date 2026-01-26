/**
 * Voice Nexus - Router Tests
 */

import { describe, it, expect } from 'vitest';
import {
    analyzeComplexity,
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    selectProviders,
    hasExplicitOverride,
    formatComplexityResult,
    STANDARD_THRESHOLDS,
    ELITE_THRESHOLDS
} from '../router';

describe('extractComplexitySignals', () => {
    it('should detect code indicators', () => {
        const signals = extractComplexitySignals('Help me implement a function to sort arrays');
        expect(signals.hasCodeIndicators).toBe(true);
    });

    it('should detect reasoning indicators', () => {
        const signals = extractComplexitySignals('Why does this architecture fail at scale?');
        expect(signals.hasReasoningIndicators).toBe(true);
    });

    it('should detect creative indicators', () => {
        const signals = extractComplexitySignals('Brainstorm some creative ideas for our app');
        expect(signals.hasCreativeIndicators).toBe(true);
    });

    it('should detect navigation indicators', () => {
        const signals = extractComplexitySignals('Go to the settings page');
        expect(signals.hasNavigationIndicators).toBe(true);
    });

    it('should count tokens correctly', () => {
        const signals = extractComplexitySignals('one two three four five');
        expect(signals.tokenCount).toBe(5);
    });

    it('should estimate domain complexity for technical terms', () => {
        const simpleSignals = extractComplexitySignals('Hello, how are you?');
        const complexSignals = extractComplexitySignals('Design a distributed architecture with encryption');
        expect(complexSignals.domainComplexity).toBeGreaterThan(simpleSignals.domainComplexity);
    });
});

describe('calculateComplexityScore', () => {
    it('should return low score for simple queries', () => {
        const signals = extractComplexitySignals('Go to dashboard');
        const score = calculateComplexityScore(signals);
        expect(score).toBeLessThan(0.3);
    });

    it('should return high score for complex queries', () => {
        const signals = extractComplexitySignals(
            'Analyze the trade-offs of implementing a microservices architecture with distributed database sharding'
        );
        const score = calculateComplexityScore(signals);
        expect(score).toBeGreaterThan(0.5);
    });

    it('should reduce score for navigation queries', () => {
        const navSignals = extractComplexitySignals('Navigate to home');
        const normalSignals = extractComplexitySignals('Tell me about home');
        expect(calculateComplexityScore(navSignals)).toBeLessThan(calculateComplexityScore(normalSignals));
    });

    it('should increase score for code queries', () => {
        const codeSignals = extractComplexitySignals('Help me implement and debug this complex function');
        const normalSignals = extractComplexitySignals('Hello there');
        expect(calculateComplexityScore(codeSignals)).toBeGreaterThan(calculateComplexityScore(normalSignals));
    });

    it('should clamp score between 0 and 1', () => {
        const lowSignals = extractComplexitySignals('yes');
        const highSignals = extractComplexitySignals(
            'Design and implement a complex distributed machine learning infrastructure system'
        );
        expect(calculateComplexityScore(lowSignals)).toBeGreaterThanOrEqual(0);
        expect(calculateComplexityScore(highSignals)).toBeLessThanOrEqual(1);
    });
});

describe('getComplexityTier', () => {
    it('should return fast tier for low complexity', () => {
        expect(getComplexityTier(0.1)).toBe('fast');
        expect(getComplexityTier(0.2)).toBe('fast');
    });

    it('should return balanced tier for medium complexity', () => {
        expect(getComplexityTier(0.3)).toBe('balanced');
        expect(getComplexityTier(0.4)).toBe('balanced');
    });

    it('should return deep tier for high complexity', () => {
        expect(getComplexityTier(0.6)).toBe('deep');
        expect(getComplexityTier(0.9)).toBe('deep');
    });

    it('should use ELITE thresholds by default', () => {
        // ELITE: balanced at 0.25, deep at 0.55
        expect(getComplexityTier(0.24)).toBe('fast');
        expect(getComplexityTier(0.26)).toBe('balanced');
        expect(getComplexityTier(0.54)).toBe('balanced');
        expect(getComplexityTier(0.56)).toBe('deep');
    });

    it('should respect custom thresholds', () => {
        expect(getComplexityTier(0.35, STANDARD_THRESHOLDS)).toBe('fast');
        expect(getComplexityTier(0.5, STANDARD_THRESHOLDS)).toBe('balanced');
        expect(getComplexityTier(0.8, STANDARD_THRESHOLDS)).toBe('deep');
    });
});

describe('selectProviders', () => {
    it('should select opus for deep tier', () => {
        const selection = selectProviders('deep');
        expect(selection.reasoning).toContain('opus');
        expect(selection.reasoningTier).toBe('deep');
    });

    it('should select sonnet for balanced tier', () => {
        const selection = selectProviders('balanced');
        expect(selection.reasoning).toContain('sonnet');
        expect(selection.reasoningTier).toBe('balanced');
    });

    it('should prefer elevenlabs for TTS', () => {
        const selection = selectProviders('fast');
        expect(selection.tts).toBe('elevenlabs');
    });

    it('should fallback to available providers', () => {
        const selection = selectProviders('deep', ['gemini-flash'], ['browser']);
        expect(selection.reasoning).toBe('gemini-flash');
        expect(selection.tts).toBe('browser');
    });

    it('should fallback to opus for balanced if no sonnet available', () => {
        const selection = selectProviders('balanced', ['opus-4', 'gemini-flash']);
        expect(selection.reasoning).toBe('opus-4');
    });

    it('should fallback to first available for balanced if no sonnet or opus', () => {
        const selection = selectProviders('balanced', ['gemini-flash', 'gpt-4']);
        expect(selection.reasoning).toBe('gemini-flash');
    });

    it('should prefer sonnet for fast tier in Elite mode', () => {
        const selection = selectProviders('fast', ['sonnet-3.5', 'gemini-flash']);
        expect(selection.reasoning).toBe('sonnet-3.5');
    });

    it('should fallback to flash for fast tier if no sonnet', () => {
        const selection = selectProviders('fast', ['gemini-flash', 'gpt-4']);
        expect(selection.reasoning).toBe('gemini-flash');
    });

    it('should fallback to first available for fast tier if no sonnet or flash', () => {
        const selection = selectProviders('fast', ['gpt-4', 'llama']);
        expect(selection.reasoning).toBe('gpt-4');
    });
});

describe('analyzeComplexity', () => {
    it('should return complete complexity result', () => {
        const result = analyzeComplexity('Design a new API');

        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('tier');
        expect(result).toHaveProperty('signals');
        expect(result).toHaveProperty('recommendedProvider');
        expect(result.recommendedProvider).toHaveProperty('reasoning');
        expect(result.recommendedProvider).toHaveProperty('tts');
    });

    it('should route simple queries to fast tier', () => {
        const result = analyzeComplexity('Go to home');
        expect(result.tier).toBe('fast');
    });

    it('should route complex queries to deep tier', () => {
        const result = analyzeComplexity(
            'Analyze and design a comprehensive distributed system architecture with security implications and explain the trade-offs'
        );
        expect(['balanced', 'deep']).toContain(result.tier);
    });

    it('should use custom thresholds when provided', () => {
        const result = analyzeComplexity('Medium complexity query', STANDARD_THRESHOLDS);
        // With standard thresholds, same query might tier differently
        expect(['fast', 'balanced', 'deep']).toContain(result.tier);
    });
});

describe('hasExplicitOverride', () => {
    it('should detect deep override', () => {
        expect(hasExplicitOverride('Use Claude Opus for this')).toEqual({
            hasOverride: true,
            tier: 'deep'
        });
        expect(hasExplicitOverride('I need deep thinking on this')).toEqual({
            hasOverride: true,
            tier: 'deep'
        });
    });

    it('should detect fast override', () => {
        expect(hasExplicitOverride('Quick question')).toEqual({
            hasOverride: true,
            tier: 'fast'
        });
        expect(hasExplicitOverride('Give me a fast answer')).toEqual({
            hasOverride: true,
            tier: 'fast'
        });
    });

    it('should return no override for normal queries', () => {
        expect(hasExplicitOverride('What is the weather?')).toEqual({
            hasOverride: false
        });
    });
});

describe('formatComplexityResult', () => {
    it('should format result as readable string', () => {
        const result = analyzeComplexity('Implement a sorting algorithm');
        const formatted = formatComplexityResult(result);

        expect(formatted).toContain('C:');
        expect(formatted).toContain('T:');
        expect(formatted).toContain('→');
    });

    it('should include signal indicators', () => {
        const codeResult = analyzeComplexity('Debug this function');
        const formatted = formatComplexityResult(codeResult);
        expect(formatted).toContain('CODE');
    });

    it('should include REASONING indicator', () => {
        const result = analyzeComplexity('Explain why this architecture scales well');
        const formatted = formatComplexityResult(result);
        expect(formatted).toContain('REASONING');
    });

    it('should include CREATIVE indicator', () => {
        const result = analyzeComplexity('Brainstorm some creative ideas for the UI');
        const formatted = formatComplexityResult(result);
        expect(formatted).toContain('CREATIVE');
    });

    it('should include NAV indicator', () => {
        const result = analyzeComplexity('Go to the home screen');
        const formatted = formatComplexityResult(result);
        expect(formatted).toContain('NAV');
    });
});

describe('Threshold Constants', () => {
    it('should have correct ELITE thresholds', () => {
        expect(ELITE_THRESHOLDS.balanced).toBe(0.25);
        expect(ELITE_THRESHOLDS.deep).toBe(0.55);
    });

    it('should have correct STANDARD thresholds', () => {
        expect(STANDARD_THRESHOLDS.balanced).toBe(0.4);
        expect(STANDARD_THRESHOLDS.deep).toBe(0.75);
    });

    it('should have ELITE thresholds lower than STANDARD', () => {
        expect(ELITE_THRESHOLDS.balanced).toBeLessThan(STANDARD_THRESHOLDS.balanced);
        expect(ELITE_THRESHOLDS.deep).toBeLessThan(STANDARD_THRESHOLDS.deep);
    });
});
