// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetAI, mockRetryGeminiRequest } = vi.hoisted(() => ({
    mockGetAI: vi.fn(),
    mockRetryGeminiRequest: vi.fn(),
}));

vi.mock('../geminiService', () => ({
    getAI: mockGetAI,
    retryGeminiRequest: mockRetryGeminiRequest,
}));

vi.mock('../adaptiveConsensus', () => ({
    adaptiveConsensusEngine: vi.fn(),
    quickConsensus: vi.fn(),
}));

vi.mock('../convergenceMemory', () => ({
    convergenceMemory: {},
}));

vi.mock('../complexityEstimator', () => ({
    estimateComplexity: vi.fn(),
}));

vi.mock('../dqScoring', () => ({
    scoreDQHeuristic: vi.fn(),
    scoreDQWithLLM: vi.fn(),
    calculateDQ: vi.fn(),
}));

import {
    generateDecompositionMap,
    consensusEngine,
} from '../bicameralService';

describe('bicameralService', () => {
    const mockAI = {
        models: {
            generateContent: vi.fn(),
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAI.mockReturnValue(mockAI);
    });

    describe('generateDecompositionMap', () => {
        it('should call getAI and retryGeminiRequest', async () => {
            const mockTasks = [
                { id: 'x', description: 'task1', isolated_input: 'in', instruction: 'do it', weight: 1 },
            ];
            mockRetryGeminiRequest.mockResolvedValue({ text: JSON.stringify(mockTasks) });

            const result = await generateDecompositionMap('Build a website');
            expect(mockGetAI).toHaveBeenCalled();
            expect(mockRetryGeminiRequest).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should assign ATOM_ prefixed IDs to tasks', async () => {
            const mockTasks = [
                { id: 'old', description: 'task1', isolated_input: 'in', instruction: 'do', weight: 1 },
                { id: 'old2', description: 'task2', isolated_input: 'in2', instruction: 'do2', weight: 2 },
            ];
            mockRetryGeminiRequest.mockResolvedValue({ text: JSON.stringify(mockTasks) });

            const result = await generateDecompositionMap('test goal');
            expect(result[0].id).toMatch(/^ATOM_\d+_0$/);
            expect(result[1].id).toMatch(/^ATOM_\d+_1$/);
        });

        it('should handle empty response text', async () => {
            mockRetryGeminiRequest.mockResolvedValue({ text: '' });
            const result = await generateDecompositionMap('empty');
            expect(result).toEqual([]);
        });

        it('should handle null response text', async () => {
            mockRetryGeminiRequest.mockResolvedValue({ text: null });
            const result = await generateDecompositionMap('null');
            expect(result).toEqual([]);
        });

        it('should pass the goal in the prompt', async () => {
            mockRetryGeminiRequest.mockResolvedValue({ text: '[]' });
            await generateDecompositionMap('Analyze market trends');
            expect(mockRetryGeminiRequest).toHaveBeenCalledWith(expect.any(Function));
        });
    });

    describe('consensusEngine', () => {
        const mockTask = {
            id: 'ATOM_123_0',
            description: 'Test task',
            isolated_input: 'test input',
            instruction: 'do the thing',
            weight: 1,
        };
        const mockOnStatusUpdate = vi.fn();

        it('should reach consensus when gap target is met', async () => {
            mockRetryGeminiRequest.mockImplementation(async () => {
                return { text: JSON.stringify({ output: 'consistent answer', confidence: 0.9, reasoning: 'because' }) };
            });

            const result = await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(result.taskId).toBe('ATOM_123_0');
            expect(result.output).toBe('consistent answer');
            expect(result.confidence).toBeGreaterThanOrEqual(80);
            expect(result.voteLedger).toBeDefined();
        });

        it('should call onStatusUpdate during rounds', async () => {
            mockRetryGeminiRequest.mockResolvedValue({
                text: JSON.stringify({ output: 'answer', confidence: 0.9, reasoning: 'r' }),
            });

            await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(mockOnStatusUpdate).toHaveBeenCalled();
            const statusArg = mockOnStatusUpdate.mock.calls[0][0];
            expect(statusArg.taskId).toBe('ATOM_123_0');
            expect(statusArg.votes).toBeDefined();
        });

        it('should increment killedAgents on error', async () => {
            let callCount = 0;
            mockRetryGeminiRequest.mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) throw new Error('API error');
                return { text: JSON.stringify({ output: 'fallback', confidence: 0.5, reasoning: 'r' }) };
            });

            const result = await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(result.voteLedger.killedAgents).toBeGreaterThanOrEqual(2);
        });

        it('should timeout after MAX_ROUNDS with low confidence', async () => {
            let callCount = 0;
            mockRetryGeminiRequest.mockImplementation(async () => {
                callCount++;
                return { text: JSON.stringify({ output: `answer_${callCount}`, confidence: 0.5, reasoning: 'r' }) };
            });

            const result = await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(result.confidence).toBe(50);
            expect(result.agentId).toBe('TIMEOUT');
            expect(result.voteLedger.totalRounds).toBe(15);
        }, 30000);

        it('should clean code fence from output', async () => {
            mockRetryGeminiRequest.mockResolvedValue({
                text: JSON.stringify({ output: '```json\n{"key": "value"}\n```', confidence: 0.9, reasoning: 'r' }),
            });

            const result = await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(result.output).not.toContain('```');
        });

        it('should handle empty output by incrementing killedAgents', async () => {
            let callCount = 0;
            mockRetryGeminiRequest.mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) {
                    return { text: JSON.stringify({ output: '', confidence: 0.5, reasoning: 'r' }) };
                }
                return { text: JSON.stringify({ output: 'valid', confidence: 0.9, reasoning: 'r' }) };
            });

            const result = await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(result.voteLedger.killedAgents).toBeGreaterThanOrEqual(2);
        });

        it('should cap confidence at 99', async () => {
            mockRetryGeminiRequest.mockResolvedValue({
                text: JSON.stringify({ output: 'same', confidence: 0.99, reasoning: 'r' }),
            });

            const result = await consensusEngine(mockTask, mockOnStatusUpdate);
            expect(result.confidence).toBeLessThanOrEqual(99);
        });
    });

    describe('re-exports', () => {
        it('should re-export adaptiveConsensusEngine and quickConsensus', async () => {
            const mod = await import('../bicameralService');
            expect(mod).toHaveProperty('adaptiveConsensusEngine');
            expect(mod).toHaveProperty('quickConsensus');
        });

        it('should re-export convergenceMemory', async () => {
            const mod = await import('../bicameralService');
            expect(mod).toHaveProperty('convergenceMemory');
        });

        it('should re-export estimateComplexity', async () => {
            const mod = await import('../bicameralService');
            expect(mod).toHaveProperty('estimateComplexity');
        });

        it('should re-export DQ scoring functions', async () => {
            const mod = await import('../bicameralService');
            expect(mod).toHaveProperty('scoreDQHeuristic');
            expect(mod).toHaveProperty('scoreDQWithLLM');
            expect(mod).toHaveProperty('calculateDQ');
        });
    });
});
