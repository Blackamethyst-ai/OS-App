import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dqScoring before importing hopGrouping
const mockScoreDQHeuristic = vi.hoisted(() => vi.fn());

vi.mock('../dqScoring', () => ({
    scoreDQHeuristic: mockScoreDQHeuristic,
}));

import {
    levenshteinSimilarity,
    groupAnswersByHop,
    performHopGrouping,
} from '../hopGrouping';
import type { AtomicTask } from '../../types';
import type { DQScore } from '../../types/domain/convergence';

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

describe('levenshteinSimilarity', () => {
    it('should return 1 for identical strings', () => {
        expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
    });

    it('should return 0 when one string is empty', () => {
        expect(levenshteinSimilarity('', 'hello')).toBe(0);
        expect(levenshteinSimilarity('hello', '')).toBe(0);
    });

    it('should return 1 for strings differing only in case', () => {
        expect(levenshteinSimilarity('Hello World', 'hello world')).toBe(1);
    });

    it('should return 1 for strings differing only in whitespace', () => {
        expect(levenshteinSimilarity('hello   world', 'hello world')).toBe(1);
    });

    it('should return high similarity for similar strings', () => {
        const sim = levenshteinSimilarity('hello world', 'hello worlx');
        expect(sim).toBeGreaterThan(0.8);
    });

    it('should return low similarity for very different strings', () => {
        const sim = levenshteinSimilarity('abcdef', 'zyxwvu');
        expect(sim).toBeLessThan(0.3);
    });

    it('should handle both empty strings (identical)', () => {
        expect(levenshteinSimilarity('', '')).toBe(1);
    });
});

describe('groupAnswersByHop', () => {
    it('should create individual clusters when below maxGroups', () => {
        const votes = { a1: 3, a2: 2 };
        const answerMap = { a1: 'Answer one', a2: 'Answer two completely different' };
        const agentContributions = { a1: ['agent-1'], a2: ['agent-2'] };

        const result = groupAnswersByHop(votes, answerMap, agentContributions, {
            maxGroups: 5,
            similarityThreshold: 0.6,
        });

        // 2 answers, maxGroups=5, so no merging needed
        expect(result).toHaveLength(2);
    });

    it('should merge similar clusters when exceeding maxGroups', () => {
        const votes = { a1: 2, a2: 2, a3: 1 };
        const answerMap = {
            a1: 'The answer is 42',
            a2: 'The answer is 43',  // very similar to a1
            a3: 'Something completely different about bananas',
        };
        const agentContributions = {
            a1: ['agent-1'],
            a2: ['agent-2'],
            a3: ['agent-3'],
        };

        const result = groupAnswersByHop(votes, answerMap, agentContributions, {
            maxGroups: 2,
            similarityThreshold: 0.5,
        });

        // Should merge the two similar answers into one group
        expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should not merge clusters below similarity threshold', () => {
        const votes = { a1: 2, a2: 2, a3: 1 };
        const answerMap = {
            a1: 'Alpha bravo charlie',
            a2: 'Delta echo foxtrot',
            a3: 'Golf hotel india',
        };
        const agentContributions = {
            a1: ['agent-1'],
            a2: ['agent-2'],
            a3: ['agent-3'],
        };

        // maxGroups=1 forces merging, but threshold=0.99 prevents it
        const result = groupAnswersByHop(votes, answerMap, agentContributions, {
            maxGroups: 1,
            similarityThreshold: 0.99,
        });

        // Cannot merge because similarity is below 0.99
        expect(result.length).toBe(3);
    });

    it('should aggregate votes when merging clusters', () => {
        const votes = { a1: 3, a2: 2 };
        const answerMap = {
            a1: 'The answer is exactly 42',
            a2: 'The answer is exactly 42!',  // nearly identical
        };
        const agentContributions = {
            a1: ['agent-1'],
            a2: ['agent-2'],
        };

        const result = groupAnswersByHop(votes, answerMap, agentContributions, {
            maxGroups: 1,
            similarityThreshold: 0.5,
        });

        expect(result).toHaveLength(1);
        expect(result[0].voteCount).toBe(5); // 3 + 2
    });

    it('should deduplicate agents when merging clusters', () => {
        const votes = { a1: 2, a2: 1 };
        const answerMap = { a1: 'Same answer', a2: 'Same answer!' };
        const agentContributions = {
            a1: ['agent-1', 'agent-2'],
            a2: ['agent-2', 'agent-3'],
        };

        const result = groupAnswersByHop(votes, answerMap, agentContributions, {
            maxGroups: 1,
            similarityThreshold: 0.5,
        });

        expect(result).toHaveLength(1);
        // agent-2 appears in both but should be deduplicated
        expect(result[0].agents).toContain('agent-1');
        expect(result[0].agents).toContain('agent-2');
        expect(result[0].agents).toContain('agent-3');
        expect(result[0].agents).toHaveLength(3);
    });
});

describe('performHopGrouping', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return groups sorted by voting strength (descending)', () => {
        const votes = { a1: 1, a2: 5, a3: 3 };
        const answerMap = {
            a1: 'Answer alpha',
            a2: 'Answer beta',
            a3: 'Answer gamma',
        };
        const agentContributions = {
            a1: ['agent-1'],
            a2: ['agent-2'],
            a3: ['agent-3'],
        };
        const task = createTestTask();

        const result = performHopGrouping(votes, answerMap, agentContributions, task, {
            maxGroups: 5,
            similarityThreshold: 0.6,
            scoreDQ: false,
        });

        expect(result.groups[0].votingStrength).toBe(5);
        expect(result.groups[1].votingStrength).toBe(3);
        expect(result.groups[2].votingStrength).toBe(1);
    });

    it('should set winningGroup to the group with highest voting strength', () => {
        const votes = { a1: 1, a2: 10 };
        const answerMap = { a1: 'Weak answer', a2: 'Strong answer' };
        const agentContributions = { a1: ['agent-1'], a2: ['agent-2'] };
        const task = createTestTask();

        const result = performHopGrouping(votes, answerMap, agentContributions, task, {
            maxGroups: 5,
            similarityThreshold: 0.6,
            scoreDQ: false,
        });

        expect(result.winningGroup.votingStrength).toBe(10);
        expect(result.winningGroup.representativeAnswer).toBe('Strong answer');
    });

    it('should use levenshtein as the method', () => {
        const result = performHopGrouping(
            { a1: 1 },
            { a1: 'Answer' },
            { a1: ['agent-1'] },
            createTestTask(),
            { maxGroups: 5, similarityThreshold: 0.6, scoreDQ: false }
        );

        expect(result.method).toBe('levenshtein');
    });

    it('should measure grouping duration', () => {
        const result = performHopGrouping(
            { a1: 1 },
            { a1: 'Answer' },
            { a1: ['agent-1'] },
            createTestTask(),
            { maxGroups: 5, similarityThreshold: 0.6, scoreDQ: false }
        );

        expect(result.groupingDuration).toBeGreaterThanOrEqual(0);
        expect(typeof result.groupingDuration).toBe('number');
    });

    it('should call scoreDQHeuristic when scoreDQ is true', () => {
        const mockDQScore: DQScore = {
            score: 0.85,
            components: { validity: 0.9, specificity: 0.8, correctness: 0.85 },
            isActionable: true,
            timestamp: Date.now(),
        };
        mockScoreDQHeuristic.mockReturnValue(mockDQScore);

        const task = createTestTask();
        const result = performHopGrouping(
            { a1: 3 },
            { a1: 'A detailed answer with specifics' },
            { a1: ['agent-1'] },
            task,
            { maxGroups: 5, similarityThreshold: 0.6, scoreDQ: true }
        );

        expect(mockScoreDQHeuristic).toHaveBeenCalledWith('A detailed answer with specifics', task);
        expect(result.groups[0].dqScore).toEqual(mockDQScore);
    });

    it('should not call scoreDQHeuristic when scoreDQ is false', () => {
        const result = performHopGrouping(
            { a1: 3 },
            { a1: 'Answer' },
            { a1: ['agent-1'] },
            createTestTask(),
            { maxGroups: 5, similarityThreshold: 0.6, scoreDQ: false }
        );

        expect(mockScoreDQHeuristic).not.toHaveBeenCalled();
        expect(result.groups[0].dqScore).toBeUndefined();
    });

    it('should break ties by DQ score when voting strength is equal', () => {
        const lowDQ: DQScore = {
            score: 0.3,
            components: { validity: 0.3, specificity: 0.3, correctness: 0.3 },
            isActionable: false,
            timestamp: Date.now(),
        };
        const highDQ: DQScore = {
            score: 0.9,
            components: { validity: 0.9, specificity: 0.9, correctness: 0.9 },
            isActionable: true,
            timestamp: Date.now(),
        };

        // Return different DQ scores for different answers
        mockScoreDQHeuristic.mockImplementation((answer: string) => {
            return answer.includes('high') ? highDQ : lowDQ;
        });

        const votes = { a1: 5, a2: 5 };
        const answerMap = { a1: 'low quality answer', a2: 'high quality answer' };
        const agentContributions = { a1: ['agent-1'], a2: ['agent-2'] };

        const result = performHopGrouping(votes, answerMap, agentContributions, createTestTask(), {
            maxGroups: 5,
            similarityThreshold: 0.6,
            scoreDQ: true,
        });

        // Both have votingStrength 5, so higher DQ should win
        expect(result.winningGroup.dqScore!.score).toBe(0.9);
    });

    it('should compute cohesion for each group', () => {
        const result = performHopGrouping(
            { a1: 3 },
            { a1: 'Single answer' },
            { a1: ['agent-1'] },
            createTestTask(),
            { maxGroups: 5, similarityThreshold: 0.6, scoreDQ: false }
        );

        // Single-member group should have cohesion of 1
        expect(result.groups[0].cohesion).toBe(1);
    });
});
