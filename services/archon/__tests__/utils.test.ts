import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    generateId,
    hashString,
    estimateGoalComplexity,
    inferSubsystems,
    estimateTokenCost,
    calculateDQ,
    isActionable,
    formatDuration,
    relativeTime,
    backoffDelay,
    sleep,
    archonLog
} from '../utils';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
    randomUUID: () => 'test-uuid-1234-5678-9abc'
});

describe('Archon Utils', () => {
    describe('generateId', () => {
        it('should generate unique IDs with default prefix', () => {
            const id1 = generateId();
            const id2 = generateId();

            expect(id1).toContain('archon_');
            expect(id2).toContain('archon_');
            expect(id1).not.toBe(id2);
        });

        it('should use custom prefix', () => {
            const id = generateId('goal');
            expect(id).toContain('goal_');
        });

        it('should include timestamp and random component', () => {
            const id = generateId('test');
            const parts = id.split('_');
            expect(parts.length).toBe(4);
        });
    });

    describe('hashString', () => {
        it('should return consistent hash for same string', () => {
            const hash1 = hashString('test');
            const hash2 = hashString('test');
            expect(hash1).toBe(hash2);
        });

        it('should return different hashes for different strings', () => {
            const hash1 = hashString('test1');
            const hash2 = hashString('test2');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty string', () => {
            const hash = hashString('');
            expect(hash).toBe('0');
        });
    });

    describe('estimateGoalComplexity', () => {
        it('should return low complexity for simple goals', () => {
            const complexity = estimateGoalComplexity('Fix typo in README');
            expect(complexity).toBeLessThan(0.3);
        });

        it('should return higher complexity for complex goals', () => {
            const complexity = estimateGoalComplexity(
                'Architect and design a multi-service integration that coordinates several subsystems'
            );
            // Should be higher than simple goals but capped at 1
            expect(complexity).toBeGreaterThan(0.3);
        });

        it('should clamp to 0-1 range', () => {
            const lowComplexity = estimateGoalComplexity('simple quick fix');
            const highComplexity = estimateGoalComplexity(
                'architect design refactor optimize multi several multiple integrate coordinate orchestrate research analyze'
            );

            expect(lowComplexity).toBeGreaterThanOrEqual(0);
            expect(highComplexity).toBeLessThanOrEqual(1);
        });

        it('should detect research keywords', () => {
            const researchGoal = estimateGoalComplexity('Research and analyze the problem');
            const simpleGoal = estimateGoalComplexity('Update the file');
            expect(researchGoal).toBeGreaterThan(simpleGoal);
        });

        it('should reduce complexity for simplicity indicators', () => {
            // Base complexity with some indicators + simple terms
            const withSimple = estimateGoalComplexity('Research and analyze but this is a simple quick task');
            // Same base but without simple terms
            const withoutSimple = estimateGoalComplexity('Research and analyze with substantial scope');
            expect(withSimple).toBeLessThan(withoutSimple);
        });

        it('should increase complexity for medium-length goals (21-50 words)', () => {
            // Goal with 25+ words - no complexity or simplicity indicators
            // Avoid: one, single, just, simple, quick, small, minor, fix typo, rename, update comment
            const mediumLengthGoal = estimateGoalComplexity(
                'please update the user interface now to show the new dashboard widgets that display the current status of each module in the main section and make sure everything is properly aligned with the grid layout'
            );
            // 35 words > 20, so score = 0.1 (no indicators to add/subtract)
            expect(mediumLengthGoal).toBe(0.1);
        });

        it('should add extra complexity for very long goals (>50 words)', () => {
            // Goal with 60+ words - triggers wordCount > 50 branch
            const veryLongGoal = estimateGoalComplexity(
                'Please work on the complete system transformation project where we need to update every single component in the entire codebase and then make sure that all the modules are properly connected to each other and that the data flows correctly between all the different parts of the application while also ensuring that the user interface remains responsive and accessible to all users across different platforms and devices'
            );
            // >50 words should add 0.2 to score
            expect(veryLongGoal).toBeGreaterThanOrEqual(0.2);
        });
    });

    describe('inferSubsystems', () => {
        it('should always include dq and kernel', () => {
            const subsystems = inferSubsystems('do something');
            expect(subsystems).toContain('dq');
            expect(subsystems).toContain('kernel');
        });

        it('should include ace for design goals', () => {
            const subsystems = inferSubsystems('architect and design the system');
            expect(subsystems).toContain('ace');
        });

        it('should include evolution for code changes', () => {
            const subsystems = inferSubsystems('implement a new feature');
            expect(subsystems).toContain('evolution');
        });

        it('should include dream for research', () => {
            const subsystems = inferSubsystems('research and investigate the issue');
            expect(subsystems).toContain('dream');
        });

        it('should include voice for explanations', () => {
            const subsystems = inferSubsystems('explain how the system works');
            expect(subsystems).toContain('voice');
        });

        it('should include cpb for verification', () => {
            const subsystems = inferSubsystems('verify and validate the solution');
            expect(subsystems).toContain('cpb');
        });
    });

    describe('estimateTokenCost', () => {
        it('should return base tokens for minimal task', () => {
            const cost = estimateTokenCost(0, 0, false);
            expect(cost).toBe(1000);
        });

        it('should increase with complexity', () => {
            const lowCost = estimateTokenCost(0.2, 2, false);
            const highCost = estimateTokenCost(0.8, 2, false);
            expect(highCost).toBeGreaterThan(lowCost);
        });

        it('should increase with subsystem count', () => {
            const fewSubsystems = estimateTokenCost(0.5, 2, false);
            const manySubsystems = estimateTokenCost(0.5, 6, false);
            expect(manySubsystems).toBeGreaterThan(fewSubsystems);
        });

        it('should triple for consensus', () => {
            const withoutConsensus = estimateTokenCost(0.5, 2, false);
            const withConsensus = estimateTokenCost(0.5, 2, true);
            expect(withConsensus).toBe(withoutConsensus * 3);
        });
    });

    describe('calculateDQ', () => {
        it('should calculate weighted score', () => {
            const dq = calculateDQ(1.0, 1.0, 1.0);
            expect(dq).toBe(1.0);
        });

        it('should weight validity at 40%', () => {
            const dq = calculateDQ(1.0, 0, 0);
            expect(dq).toBeCloseTo(0.4);
        });

        it('should weight specificity at 30%', () => {
            const dq = calculateDQ(0, 1.0, 0);
            expect(dq).toBeCloseTo(0.3);
        });

        it('should weight correctness at 30%', () => {
            const dq = calculateDQ(0, 0, 1.0);
            expect(dq).toBeCloseTo(0.3);
        });
    });

    describe('isActionable', () => {
        it('should return true for scores >= threshold', () => {
            expect(isActionable(0.7)).toBe(true);
            expect(isActionable(0.8)).toBe(true);
            expect(isActionable(1.0)).toBe(true);
        });

        it('should return false for scores < threshold', () => {
            expect(isActionable(0.69)).toBe(false);
            expect(isActionable(0.5)).toBe(false);
        });

        it('should use custom threshold', () => {
            expect(isActionable(0.6, 0.5)).toBe(true);
            expect(isActionable(0.4, 0.5)).toBe(false);
        });
    });

    describe('formatDuration', () => {
        it('should format milliseconds', () => {
            expect(formatDuration(500)).toBe('500ms');
        });

        it('should format seconds', () => {
            expect(formatDuration(1500)).toBe('1.5s');
            expect(formatDuration(30000)).toBe('30.0s');
        });

        it('should format minutes', () => {
            expect(formatDuration(90000)).toBe('1.5m');
            expect(formatDuration(300000)).toBe('5.0m');
        });

        it('should format hours', () => {
            expect(formatDuration(3600000)).toBe('1.0h');
            expect(formatDuration(7200000)).toBe('2.0h');
        });
    });

    describe('relativeTime', () => {
        it('should return "just now" for recent timestamps', () => {
            const now = Date.now();
            expect(relativeTime(now - 30000)).toBe('just now');
        });

        it('should return minutes ago', () => {
            const now = Date.now();
            expect(relativeTime(now - 120000)).toBe('2m ago');
            expect(relativeTime(now - 600000)).toBe('10m ago');
        });

        it('should return hours ago', () => {
            const now = Date.now();
            expect(relativeTime(now - 7200000)).toBe('2h ago');
        });

        it('should return days ago', () => {
            const now = Date.now();
            expect(relativeTime(now - 172800000)).toBe('2d ago');
        });
    });

    describe('backoffDelay', () => {
        it('should increase exponentially', () => {
            const delay0 = backoffDelay(0);
            const delay1 = backoffDelay(1);
            const delay2 = backoffDelay(2);

            // With jitter, just check rough ordering
            expect(delay1).toBeGreaterThan(delay0 * 1.5);
            expect(delay2).toBeGreaterThan(delay1 * 1.5);
        });

        it('should respect max delay', () => {
            const delay = backoffDelay(10, 1000, 5000);
            // With jitter (0.9-1.1), max should be around 5000 * 1.1 = 5500
            expect(delay).toBeLessThanOrEqual(5500);
        });

        it('should use custom base', () => {
            const delay = backoffDelay(0, 2000);
            // Base * (0.9 to 1.1)
            expect(delay).toBeGreaterThanOrEqual(1800);
            expect(delay).toBeLessThanOrEqual(2200);
        });
    });

    describe('sleep', () => {
        it('should resolve after specified time', async () => {
            const start = Date.now();
            await sleep(50);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some timing slack
        });
    });

    describe('archonLog', () => {
        let consoleSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        it('should log with level prefix in DEV mode', () => {
            archonLog('info', 'Test message');
            // The function concatenates prefix + timestamp + message into one string
            expect(consoleSpy).toHaveBeenCalled();
            const callArg = consoleSpy.mock.calls[0][0];
            expect(callArg).toContain('[ARCHON:INFO]');
            expect(callArg).toContain('Test message');
        });

        it('should log data when provided', () => {
            archonLog('debug', 'Test with data', { key: 'value' });
            expect(consoleSpy).toHaveBeenCalled();
            const callArgs = consoleSpy.mock.calls[0];
            expect(callArgs[0]).toContain('[ARCHON:DEBUG]');
            expect(callArgs[1]).toEqual({ key: 'value' });
        });

        it('should log error level', () => {
            archonLog('error', 'Error occurred');
            expect(consoleSpy).toHaveBeenCalled();
            const callArg = consoleSpy.mock.calls[0][0];
            expect(callArg).toContain('[ARCHON:ERROR]');
        });

        it('should log warn level', () => {
            archonLog('warn', 'Warning message');
            expect(consoleSpy).toHaveBeenCalled();
            const callArg = consoleSpy.mock.calls[0][0];
            expect(callArg).toContain('[ARCHON:WARN]');
        });
    });
});
