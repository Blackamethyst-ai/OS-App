import { describe, it, expect } from 'vitest';
import {
    estimateComplexity,
    estimateTokens,
    classifyComplexity,
    detectDomain,
    getAdaptiveThresholds,
    shouldSkipVoting,
    estimateConvergenceTime,
} from '../complexityEstimator';

const makeTask = (instruction: string, input = '') => ({
    id: 'test-1',
    description: 'test task',
    instruction,
    isolated_input: input,
    weight: 1,
});

describe('complexityEstimator', () => {
    describe('estimateTokens', () => {
        it('should estimate tokens based on text length', () => {
            const task = makeTask('hello world', '');
            const tokens = estimateTokens(task);
            // "hello world" = 11 chars -> ceil(11/4) * 1.5 = 3 * 1.5 = 4.5
            expect(tokens).toBeGreaterThan(0);
        });

        it('should weight instruction more than input', () => {
            const taskA = makeTask('long instruction text here', '');
            const taskB = makeTask('', 'long instruction text here');
            expect(estimateTokens(taskA)).toBeGreaterThan(estimateTokens(taskB));
        });
    });

    describe('classifyComplexity', () => {
        it('should classify low token counts as simple', () => {
            const task = makeTask('what is 2+2');
            const result = classifyComplexity(20, task);
            expect(result).toBe('simple');
        });

        it('should classify high token counts as complex or expert', () => {
            const task = makeTask('analyze this comprehensive enterprise architecture');
            const result = classifyComplexity(1500, task);
            expect(['complex', 'expert']).toContain(result);
        });

        it('should bump complexity for architecture signals', () => {
            const task = makeTask('review the architecture of this production system');
            const result = classifyComplexity(50, task);
            // "architecture" and "production" are complex signals — should bump from simple
            expect(result).not.toBe('simple');
        });

        it('should reduce complexity for simplicity signals', () => {
            const task = makeTask('just a simple quick question');
            const result = classifyComplexity(200, task);
            // Should be reduced from moderate
            expect(result).toBe('simple');
        });
    });

    describe('detectDomain', () => {
        it('should detect code domain', () => {
            const task = makeTask('write a function that exports a class with async methods');
            expect(detectDomain(task)).toBe('code');
        });

        it('should detect research domain', () => {
            const task = makeTask('research and investigate the latest findings');
            expect(detectDomain(task)).toBe('research');
        });

        it('should detect debug domain', () => {
            const task = makeTask('fix this bug and debug the error');
            expect(detectDomain(task)).toBe('debug');
        });

        it('should return general for unmatched text', () => {
            const task = makeTask('hello');
            expect(detectDomain(task)).toBe('general');
        });
    });

    describe('estimateComplexity', () => {
        it('should return a complete complexity profile', () => {
            const task = makeTask('analyze this system architecture');
            const profile = estimateComplexity(task);
            expect(profile).toHaveProperty('tokenEstimate');
            expect(profile).toHaveProperty('taskType');
            expect(profile).toHaveProperty('suggestedRounds');
            expect(profile).toHaveProperty('suggestedGap');
            expect(profile).toHaveProperty('domain');
        });
    });

    describe('getAdaptiveThresholds', () => {
        it('should use estimation when no history', () => {
            const task = makeTask('simple task');
            const thresholds = getAdaptiveThresholds(task);
            expect(thresholds).toHaveProperty('gap');
            expect(thresholds).toHaveProperty('rounds');
        });

        it('should blend historical when confidence is high', () => {
            const task = makeTask('simple task');
            const historical = { gap: 10, rounds: 20, confidence: 0.9, sampleCount: 5 };
            const thresholds = getAdaptiveThresholds(task, historical);
            // Should be weighted toward historical (60%)
            expect(thresholds.gap).toBeGreaterThan(5);
            expect(thresholds.rounds).toBeGreaterThan(10);
        });

        it('should ignore historical when confidence is low', () => {
            const task = makeTask('simple task');
            const historical = { gap: 100, rounds: 100, confidence: 0.3, sampleCount: 2 };
            const thresholds = getAdaptiveThresholds(task, historical);
            // Should use estimation only
            expect(thresholds.rounds).toBeLessThan(20);
        });
    });

    describe('shouldSkipVoting', () => {
        it('should skip for trivial questions', () => {
            const task = makeTask('what is 2+2');
            expect(shouldSkipVoting(task)).toBe(true);
        });

        it('should not skip for complex tasks', () => {
            const task = makeTask('analyze the comprehensive architecture of this multi-service enterprise system with all edge cases and security considerations');
            expect(shouldSkipVoting(task)).toBe(false);
        });
    });

    describe('estimateConvergenceTime', () => {
        it('should return min, max, avg times', () => {
            const profile = estimateComplexity(makeTask('test'));
            const time = estimateConvergenceTime(profile);
            expect(time.minMs).toBeLessThanOrEqual(time.avgMs);
            expect(time.avgMs).toBeLessThanOrEqual(time.maxMs);
        });
    });
});
