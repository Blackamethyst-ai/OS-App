// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to mock the 'idb' module since IndexedDB is not available in test env.
// Use vi.hoisted so the mock references are available inside vi.mock factory.
const mockPut = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockGetAll = vi.hoisted(() => vi.fn());
const mockGetAllFromIndex = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockClear = vi.hoisted(() => vi.fn());

const mockDB = vi.hoisted(() => ({
    put: mockPut,
    get: mockGet,
    getAll: mockGetAll,
    getAllFromIndex: mockGetAllFromIndex,
    delete: mockDelete,
    clear: mockClear,
    objectStoreNames: { contains: vi.fn(() => false) },
    createObjectStore: vi.fn(() => ({ createIndex: vi.fn() })),
}));

vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(mockDB)),
}));

// Must import after mocks are set up
// We can't import the singleton directly because the constructor runs openDB immediately.
// Instead, we import the module and use the default export.
import convergenceMemory from '../convergenceMemory';
import type { ConvergencePattern, TaskComplexity } from '../../types/domain/convergence';
import type { AtomicTask } from '../../types';

function createTestTask(overrides: Partial<AtomicTask> = {}): AtomicTask {
    return {
        id: 'test-task-1',
        description: 'Test task',
        isolated_input: 'some input',
        instruction: 'Summarize the input',
        weight: 1,
        status: 'PENDING',
        ...overrides,
    };
}

function createTestPattern(overrides: Partial<ConvergencePattern> = {}): ConvergencePattern {
    return {
        taskHash: 'task_abc123',
        taskType: 'moderate',
        domain: 'coding',
        roundsUsed: 3,
        gapAchieved: 2,
        dqScore: 0.85,
        winningAgents: ['agent-1', 'agent-2'],
        tokensUsed: 1500,
        timestamp: Date.now(),
        ...overrides,
    };
}

describe('ConvergenceMemoryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPattern', () => {
        it('should create a pattern with correct fields from task and params', () => {
            const task = createTestTask({ instruction: 'Write unit tests' });
            const pattern = convergenceMemory.createPattern(
                task,
                'complex',
                'testing',
                4,
                1.5,
                0.92,
                ['agent-a', 'agent-b'],
                2000
            );

            expect(pattern.taskType).toBe('complex');
            expect(pattern.domain).toBe('testing');
            expect(pattern.roundsUsed).toBe(4);
            expect(pattern.gapAchieved).toBe(1.5);
            expect(pattern.dqScore).toBe(0.92);
            expect(pattern.winningAgents).toEqual(['agent-a', 'agent-b']);
            expect(pattern.tokensUsed).toBe(2000);
            expect(pattern.timestamp).toBeGreaterThan(0);
        });

        it('should generate a deterministic taskHash from instruction', () => {
            const task = createTestTask({ instruction: 'Hello world' });
            const p1 = convergenceMemory.createPattern(task, 'simple', 'general', 1, 0, 0.5, [], 100);
            const p2 = convergenceMemory.createPattern(task, 'simple', 'general', 1, 0, 0.5, [], 100);

            expect(p1.taskHash).toBe(p2.taskHash);
            expect(p1.taskHash).toMatch(/^task_[0-9a-f]+$/);
        });

        it('should produce different hashes for different instructions', () => {
            const task1 = createTestTask({ instruction: 'First task' });
            const task2 = createTestTask({ instruction: 'Second task' });

            const p1 = convergenceMemory.createPattern(task1, 'simple', 'general', 1, 0, 0.5, [], 100);
            const p2 = convergenceMemory.createPattern(task2, 'simple', 'general', 1, 0, 0.5, [], 100);

            expect(p1.taskHash).not.toBe(p2.taskHash);
        });

        it('should be case-insensitive for hashing', () => {
            const task1 = createTestTask({ instruction: 'Hello World' });
            const task2 = createTestTask({ instruction: 'hello world' });

            const p1 = convergenceMemory.createPattern(task1, 'simple', 'general', 1, 0, 0.5, [], 100);
            const p2 = convergenceMemory.createPattern(task2, 'simple', 'general', 1, 0, 0.5, [], 100);

            expect(p1.taskHash).toBe(p2.taskHash);
        });
    });

    describe('storePattern', () => {
        it('should put the pattern into the patterns store', async () => {
            const pattern = createTestPattern();
            // Mock getPatternsByDomainAndType to return empty for updateThresholds
            mockGetAllFromIndex.mockResolvedValue([]);

            await convergenceMemory.storePattern(pattern);

            expect(mockPut).toHaveBeenCalledWith('patterns', pattern);
        });

        it('should update thresholds after storing a pattern', async () => {
            const pattern = createTestPattern({
                domain: 'coding',
                taskType: 'moderate',
                roundsUsed: 3,
                gapAchieved: 2,
                dqScore: 0.85,
            });

            // Return the stored pattern when getPatternsByDomainAndType queries
            mockGetAllFromIndex.mockResolvedValue([pattern]);

            await convergenceMemory.storePattern(pattern);

            // Should have called put for 'patterns' and 'thresholds'
            expect(mockPut).toHaveBeenCalledTimes(2);
            expect(mockPut).toHaveBeenCalledWith('thresholds', expect.objectContaining({
                id: 'coding:moderate',
                domain: 'coding',
                taskType: 'moderate',
                sampleCount: 1,
            }));
        });
    });

    describe('getPattern', () => {
        it('should retrieve a pattern by taskHash', async () => {
            const pattern = createTestPattern({ taskHash: 'task_xyz' });
            mockGet.mockResolvedValue(pattern);

            const result = await convergenceMemory.getPattern('task_xyz');

            expect(mockGet).toHaveBeenCalledWith('patterns', 'task_xyz');
            expect(result).toEqual(pattern);
        });

        it('should return undefined for missing pattern', async () => {
            mockGet.mockResolvedValue(undefined);

            const result = await convergenceMemory.getPattern('nonexistent');

            expect(result).toBeUndefined();
        });
    });

    describe('getPatternsByDomain', () => {
        it('should query by-domain index and return results', async () => {
            const patterns = [
                createTestPattern({ domain: 'coding', taskHash: 'a' }),
                createTestPattern({ domain: 'coding', taskHash: 'b' }),
            ];
            mockGetAllFromIndex.mockResolvedValue(patterns);

            const result = await convergenceMemory.getPatternsByDomain('coding');

            expect(mockGetAllFromIndex).toHaveBeenCalledWith('patterns', 'by-domain', 'coding');
            expect(result).toHaveLength(2);
        });

        it('should respect the limit parameter by slicing from the end', async () => {
            const patterns = Array.from({ length: 10 }, (_, i) =>
                createTestPattern({ taskHash: `task_${i}` })
            );
            mockGetAllFromIndex.mockResolvedValue(patterns);

            const result = await convergenceMemory.getPatternsByDomain('coding', 3);

            expect(result).toHaveLength(3);
            // Should be the last 3 items
            expect(result[0].taskHash).toBe('task_7');
        });
    });

    describe('getPatternsByType', () => {
        it('should query by-type index', async () => {
            const patterns = [createTestPattern({ taskType: 'expert' })];
            mockGetAllFromIndex.mockResolvedValue(patterns);

            const result = await convergenceMemory.getPatternsByType('expert');

            expect(mockGetAllFromIndex).toHaveBeenCalledWith('patterns', 'by-type', 'expert');
            expect(result).toHaveLength(1);
        });
    });

    describe('getOptimalThresholds', () => {
        it('should return null when not enough samples', async () => {
            // Primary lookup returns record with sampleCount < 3
            mockGet.mockResolvedValueOnce({ sampleCount: 2 });
            // General fallback also not enough
            mockGet.mockResolvedValueOnce(undefined);

            const result = await convergenceMemory.getOptimalThresholds('coding', 'moderate');

            expect(result).toBeNull();
        });

        it('should return thresholds when enough samples exist', async () => {
            mockGet.mockResolvedValue({
                id: 'coding:moderate',
                domain: 'coding',
                taskType: 'moderate',
                avgGap: 2.3,
                avgRounds: 3.7,
                avgDQ: 0.88,
                sampleCount: 10,
                lastUpdated: Date.now(),
            });

            const result = await convergenceMemory.getOptimalThresholds('coding', 'moderate');

            expect(result).not.toBeNull();
            expect(result!.gap).toBe(2); // Math.round(2.3)
            expect(result!.rounds).toBe(4); // Math.round(3.7)
            expect(result!.confidence).toBe(0.5); // Math.min(0.95, 10/20)
            expect(result!.sampleCount).toBe(10);
        });

        it('should fall back to general domain when primary has too few samples', async () => {
            // Primary: too few samples
            mockGet.mockResolvedValueOnce({ sampleCount: 1 });
            // General fallback: enough samples
            mockGet.mockResolvedValueOnce({
                id: 'general:moderate',
                domain: 'general',
                taskType: 'moderate',
                avgGap: 3.0,
                avgRounds: 4.0,
                avgDQ: 0.75,
                sampleCount: 5,
                lastUpdated: Date.now(),
            });

            const result = await convergenceMemory.getOptimalThresholds('niche', 'moderate');

            expect(result).not.toBeNull();
            expect(result!.confidence).toBe(0.25); // Math.min(0.7, 5/20)
            expect(result!.sampleCount).toBe(5);
        });

        it('should cap confidence at 0.95 for primary', async () => {
            mockGet.mockResolvedValue({
                sampleCount: 100,
                avgGap: 1,
                avgRounds: 2,
                avgDQ: 0.95,
            });

            const result = await convergenceMemory.getOptimalThresholds('coding', 'simple');

            expect(result!.confidence).toBe(0.95);
        });
    });

    describe('getStats', () => {
        it('should return zeroed stats when no patterns exist', async () => {
            mockGetAll.mockResolvedValue([]);

            const stats = await convergenceMemory.getStats();

            expect(stats.totalPatterns).toBe(0);
            expect(stats.avgDQScore).toBe(0);
            expect(stats.avgRoundsToConverge).toBe(0);
            expect(stats.topDomains).toEqual([]);
            expect(stats.topAgents).toEqual([]);
        });

        it('should calculate correct averages and counts', async () => {
            const patterns = [
                createTestPattern({ domain: 'coding', dqScore: 0.8, roundsUsed: 3, winningAgents: ['a1'] }),
                createTestPattern({ domain: 'coding', dqScore: 0.9, roundsUsed: 5, winningAgents: ['a1', 'a2'] }),
                createTestPattern({ domain: 'design', dqScore: 0.7, roundsUsed: 2, winningAgents: ['a2'] }),
            ];
            mockGetAll.mockResolvedValue(patterns);

            const stats = await convergenceMemory.getStats();

            expect(stats.totalPatterns).toBe(3);
            expect(stats.avgDQScore).toBe(0.8); // (0.8+0.9+0.7)/3 = 0.8
            expect(stats.avgRoundsToConverge).toBe(3.3); // (3+5+2)/3 = 3.333 rounded
            expect(stats.topDomains).toEqual([
                { domain: 'coding', count: 2 },
                { domain: 'design', count: 1 },
            ]);
            expect(stats.topAgents[0]).toEqual({ agentId: 'a1', winCount: 2 });
            expect(stats.topAgents[1]).toEqual({ agentId: 'a2', winCount: 2 });
        });
    });

    describe('pruneOldPatterns', () => {
        it('should delete patterns older than the cutoff', async () => {
            const oldTimestamp = Date.now() - (60 * 24 * 60 * 60 * 1000); // 60 days ago
            const recentTimestamp = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days ago

            mockGetAll.mockResolvedValue([
                createTestPattern({ taskHash: 'old1', timestamp: oldTimestamp }),
                createTestPattern({ taskHash: 'old2', timestamp: oldTimestamp }),
                createTestPattern({ taskHash: 'recent', timestamp: recentTimestamp }),
            ]);

            const pruned = await convergenceMemory.pruneOldPatterns(30);

            expect(pruned).toBe(2);
            expect(mockDelete).toHaveBeenCalledWith('patterns', 'old1');
            expect(mockDelete).toHaveBeenCalledWith('patterns', 'old2');
            expect(mockDelete).not.toHaveBeenCalledWith('patterns', 'recent');
        });

        it('should return 0 when no patterns are old enough', async () => {
            mockGetAll.mockResolvedValue([
                createTestPattern({ timestamp: Date.now() }),
            ]);

            const pruned = await convergenceMemory.pruneOldPatterns(30);

            expect(pruned).toBe(0);
        });
    });

    describe('clear', () => {
        it('should clear both patterns and thresholds stores', async () => {
            await convergenceMemory.clear();

            expect(mockClear).toHaveBeenCalledWith('patterns');
            expect(mockClear).toHaveBeenCalledWith('thresholds');
        });
    });
});
