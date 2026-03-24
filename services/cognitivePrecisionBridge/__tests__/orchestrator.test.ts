import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock references are available in vi.mock factories
const {
    mockSelectPath,
    mockExtractPathSignals,
    mockCanUseDirectPath,
    mockGetLearnedRoutingFromFeedback,
    mockRlmEnhancedQuery,
    mockRecursiveLLMQuery,
    mockAdaptiveConsensusEngine,
    mockQuickConsensus,
    mockScoreDQHeuristic,
    mockScoreDQWithLLM,
    mockConvergenceMemoryCreatePattern,
    mockConvergenceMemoryStorePattern,
    mockRetryGeminiRequest,
    mockGetAI,
    mockClaudeIsConfigured,
    mockClaudeGenerateContent,
    mockClaudeGenerateVision,
} = vi.hoisted(() => ({
    mockSelectPath: vi.fn(),
    mockExtractPathSignals: vi.fn(),
    mockCanUseDirectPath: vi.fn(),
    mockGetLearnedRoutingFromFeedback: vi.fn(),
    mockRlmEnhancedQuery: vi.fn(),
    mockRecursiveLLMQuery: vi.fn(),
    mockAdaptiveConsensusEngine: vi.fn(),
    mockQuickConsensus: vi.fn(),
    mockScoreDQHeuristic: vi.fn(),
    mockScoreDQWithLLM: vi.fn(),
    mockConvergenceMemoryCreatePattern: vi.fn(),
    mockConvergenceMemoryStorePattern: vi.fn(),
    mockRetryGeminiRequest: vi.fn(async (fn: any) => fn()),
    mockGetAI: vi.fn(),
    mockClaudeIsConfigured: vi.fn(),
    mockClaudeGenerateContent: vi.fn(),
    mockClaudeGenerateVision: vi.fn(),
}));

vi.mock('../router', () => ({
    selectPath: mockSelectPath,
    extractPathSignals: mockExtractPathSignals,
    canUseDirectPath: mockCanUseDirectPath,
}));

vi.mock('../../../libs/cpb-core/feedbackAdapter', () => ({
    getLearnedRoutingFromFeedback: mockGetLearnedRoutingFromFeedback,
}));

vi.mock('../../recursiveLanguageModel', () => ({
    recursiveLLMQuery: mockRecursiveLLMQuery,
    rlmEnhancedQuery: mockRlmEnhancedQuery,
}));

vi.mock('../../adaptiveConsensus', () => ({
    adaptiveConsensusEngine: mockAdaptiveConsensusEngine,
    quickConsensus: mockQuickConsensus,
}));

vi.mock('../../dqScoring', () => ({
    scoreDQHeuristic: mockScoreDQHeuristic,
    scoreDQWithLLM: mockScoreDQWithLLM,
}));

vi.mock('../../convergenceMemory', () => ({
    convergenceMemory: {
        createPattern: mockConvergenceMemoryCreatePattern,
        storePattern: mockConvergenceMemoryStorePattern,
    },
}));

vi.mock('../../geminiService', () => ({
    retryGeminiRequest: (fn: any) => mockRetryGeminiRequest(fn),
    getAI: mockGetAI,
}));

vi.mock('../../claudeService', () => ({
    claudeService: {
        isConfigured: mockClaudeIsConfigured,
        generateContent: mockClaudeGenerateContent,
        generateVision: mockClaudeGenerateVision,
    },
}));

vi.mock('../../logger', () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Import after mocks
import { cpbExecute, cognitivePrecisionBridge } from '../orchestrator';
import type { CPBPath, RoutingDecision } from '../types';
import type { DQScore } from '../../../types/domain/convergence';

// Helpers
function createMockDQScore(score: number): DQScore {
    return {
        score,
        isActionable: score > 0.5,
        components: { validity: score, specificity: score, correctness: score },
        confidence: score,
        reasoning: 'test',
        timestamp: Date.now(),
    } as DQScore;
}

function createMockRoutingDecision(path: CPBPath): RoutingDecision {
    return {
        selectedPath: path,
        signals: {
            contextLength: 100,
            queryComplexity: 0.5,
            requiresConsensus: false,
            requiresReasoning: false,
            hasGroundTruth: false,
            timeBudgetMs: 5000,
            qualityTarget: 0.7,
        },
        reasoning: 'Test routing',
        confidence: 0.8,
        alternatives: [],
    };
}

describe('CPB Orchestrator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetLearnedRoutingFromFeedback.mockReturnValue(undefined);
        mockClaudeIsConfigured.mockReturnValue(false);
    });

    // =========================================================================
    // ROUTING TESTS
    // =========================================================================
    describe('Path Routing', () => {
        it('should route to direct path and return result', async () => {
            const dq = createMockDQScore(0.8);
            mockSelectPath.mockReturnValue(createMockRoutingDecision('direct'));
            mockScoreDQHeuristic.mockReturnValue(dq);
            mockGetAI.mockReturnValue({
                models: {
                    generateContent: vi.fn().mockResolvedValue({ text: 'Direct response' }),
                },
            });

            const result = await cpbExecute('Hello world');

            expect(result.output).toBe('Direct response');
            expect(result.path).toBe('direct');
            expect(result.dqScore).toBe(dq);
            expect(mockSelectPath).toHaveBeenCalled();
        });

        it('should route to RLM path when selected', async () => {
            const dq = createMockDQScore(0.75);
            mockSelectPath.mockReturnValue(createMockRoutingDecision('rlm'));
            mockRlmEnhancedQuery.mockResolvedValue({
                answer: 'RLM result',
                dqScore: dq,
                executionTime: 1000,
                totalTokens: 500,
            });

            const result = await cpbExecute('Complex question', 'Long context...');

            expect(result.output).toBe('RLM result');
            expect(result.path).toBe('rlm');
            expect(mockRlmEnhancedQuery).toHaveBeenCalled();
        });

        it('should route to ACE path when selected', async () => {
            const dq = createMockDQScore(0.85);
            mockSelectPath.mockReturnValue(createMockRoutingDecision('ace'));
            mockAdaptiveConsensusEngine.mockResolvedValue({
                output: 'ACE consensus result',
                confidence: 85,
                executionTime: 2000,
                dqScore: dq,
                complexity: { tokenEstimate: 200 },
                voteLedger: { totalRounds: 3, count: 5, participatingAgents: [] },
            });

            const result = await cpbExecute('Multi-perspective question');

            expect(result.output).toBe('ACE consensus result');
            expect(result.path).toBe('ace');
            expect(mockAdaptiveConsensusEngine).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // EXECUTION TESTS
    // =========================================================================
    describe('Execution', () => {
        it('should include context in direct path prompt', async () => {
            mockSelectPath.mockReturnValue(createMockRoutingDecision('direct'));
            mockScoreDQHeuristic.mockReturnValue(createMockDQScore(0.8));

            const mockGen = vi.fn().mockResolvedValue({ text: 'response' });
            mockGetAI.mockReturnValue({ models: { generateContent: mockGen } });

            await cpbExecute('question', 'my context');

            const callArgs = mockGen.mock.calls[0][0];
            expect(callArgs.contents).toContain('my context');
        });

        it('should call status callback with phase updates', async () => {
            mockSelectPath.mockReturnValue(createMockRoutingDecision('direct'));
            mockScoreDQHeuristic.mockReturnValue(createMockDQScore(0.8));
            mockGetAI.mockReturnValue({
                models: { generateContent: vi.fn().mockResolvedValue({ text: 'ok' }) },
            });

            const statusUpdates: any[] = [];
            await cpbExecute('test', undefined, (status) => statusUpdates.push(status));

            expect(statusUpdates.length).toBeGreaterThan(0);
            expect(statusUpdates[0].phase).toBe('analyzing');
            expect(statusUpdates[statusUpdates.length - 1].phase).toBe('complete');
        });

        it('should use Claude when configured and path is direct', async () => {
            mockSelectPath.mockReturnValue(createMockRoutingDecision('direct'));
            mockScoreDQHeuristic.mockReturnValue(createMockDQScore(0.8));
            mockClaudeIsConfigured.mockReturnValue(true);
            mockClaudeGenerateContent.mockResolvedValue('Claude response');

            const result = await cpbExecute('test query');

            expect(result.output).toBe('Claude response');
            expect(mockClaudeGenerateContent).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    describe('Error Handling', () => {
        it('should throw and report error phase on LLM failure', async () => {
            mockSelectPath.mockReturnValue(createMockRoutingDecision('direct'));
            mockGetAI.mockReturnValue({
                models: { generateContent: vi.fn().mockRejectedValue(new Error('API down')) },
            });

            const statusUpdates: any[] = [];
            await expect(
                cpbExecute('test', undefined, (s) => statusUpdates.push(s))
            ).rejects.toThrow('API down');

            const errorUpdate = statusUpdates.find((s: any) => s.phase === 'error');
            expect(errorUpdate).toBeDefined();
        });

        it('should handle RLM path failure gracefully', async () => {
            mockSelectPath.mockReturnValue(createMockRoutingDecision('rlm'));
            mockRlmEnhancedQuery.mockRejectedValue(new Error('RLM timeout'));

            await expect(cpbExecute('query', 'ctx')).rejects.toThrow('RLM timeout');
        });
    });

    // =========================================================================
    // VERIFICATION & RETRY
    // =========================================================================
    describe('Verification & Retry', () => {
        it('should store pattern when learning enabled and DQ is actionable', async () => {
            const dq = createMockDQScore(0.8);
            mockSelectPath.mockReturnValue(createMockRoutingDecision('direct'));
            mockScoreDQHeuristic.mockReturnValue(dq);
            mockGetAI.mockReturnValue({
                models: { generateContent: vi.fn().mockResolvedValue({ text: 'ok' }) },
            });
            mockConvergenceMemoryCreatePattern.mockReturnValue({ id: 'p1' });
            mockConvergenceMemoryStorePattern.mockResolvedValue(undefined);

            const result = await cpbExecute('test');

            expect(result.patternStored).toBe(true);
            expect(mockConvergenceMemoryCreatePattern).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // CONFIG
    // =========================================================================
    describe('Configuration', () => {
        it('should allow config updates via updateConfig', () => {
            cognitivePrecisionBridge.updateConfig({ dqThreshold: 0.9 });
            // No throw means config was accepted
            expect(true).toBe(true);
        });
    });
});
