import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    recursiveLLMQuery,
    rlmEnhancedQuery,
    DEFAULT_RLM_CONFIG,
    RLMConfig,
    RLMStatus,
    RLMResult
} from '../recursiveLanguageModel';

// Mock dependencies
vi.mock('../geminiService', () => ({
    getAI: vi.fn(() => ({
        models: {
            generateContent: vi.fn()
        }
    })),
    retryGeminiRequest: vi.fn()
}));

vi.mock('../dqScoring', () => ({
    scoreDQHeuristic: vi.fn(() => ({
        score: 0.8,
        components: { validity: 0.8, specificity: 0.7, correctness: 0.9 },
        isActionable: true,
        timestamp: Date.now()
    })),
    scoreDQWithLLM: vi.fn()
}));

import { retryGeminiRequest, getAI } from '../geminiService';

describe('Recursive Language Model Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('DEFAULT_RLM_CONFIG', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_RLM_CONFIG.maxIterations).toBe(20);
            expect(DEFAULT_RLM_CONFIG.maxOutputLength).toBe(500000);
            expect(DEFAULT_RLM_CONFIG.rootModel).toBe('gemini-2.0-flash');
            expect(DEFAULT_RLM_CONFIG.enableDQScoring).toBe(true);
        });
    });

    describe('recursiveLLMQuery', () => {
        it('should complete when FINAL is called in code', async () => {
            const mockResponse = {
                text: JSON.stringify({
                    thinking: 'I will return the answer directly',
                    code: 'FINAL("The answer is 42")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(mockResponse);

            const statusUpdates: RLMStatus[] = [];
            const onStatusUpdate = (status: RLMStatus) => statusUpdates.push(status);

            const result = await recursiveLLMQuery(
                'What is the meaning of life?',
                'Answer the philosophical question',
                onStatusUpdate,
                { maxIterations: 5, enableDQScoring: false }
            );

            expect(result.answer).toBe('The answer is 42');
            expect(result.iterations).toBe(1);
            expect(result.trajectory).toHaveLength(1);
        });

        it('should track status updates through phases', async () => {
            const mockResponse = {
                text: JSON.stringify({
                    thinking: 'Quick answer',
                    code: 'FINAL("done")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(mockResponse);

            const statusUpdates: RLMStatus[] = [];
            const result = await recursiveLLMQuery(
                'test context',
                'test query',
                (status) => statusUpdates.push({ ...status }),
                { enableDQScoring: false }
            );

            // Should have initializing, executing, and complete phases
            const phases = statusUpdates.map(s => s.phase);
            expect(phases).toContain('initializing');
            expect(phases).toContain('executing');
            expect(phases).toContain('complete');
        });

        it('should handle FINAL_VAR to return stored variable', async () => {
            // First call stores the variable
            const storeResponse = {
                text: JSON.stringify({
                    thinking: 'Store the result first',
                    code: 'store("result", "stored value")'
                })
            };

            // Second call returns the variable
            const finalResponse = {
                text: JSON.stringify({
                    thinking: 'Return the stored variable',
                    code: 'FINAL_VAR("result")'
                })
            };

            vi.mocked(retryGeminiRequest)
                .mockResolvedValueOnce(storeResponse)
                .mockResolvedValueOnce(finalResponse);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.answer).toBe('stored value');
            expect(result.iterations).toBe(2);
        });

        it('should respect maxIterations limit', async () => {
            // Always return code that doesn't call FINAL
            const nonFinalResponse = {
                text: JSON.stringify({
                    thinking: 'Keep processing',
                    code: 'print("still working")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(nonFinalResponse);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { maxIterations: 3, enableDQScoring: false }
            );

            expect(result.iterations).toBe(3);
            expect(result.trajectory).toHaveLength(3);
        });

        it('should extract code from markdown blocks', async () => {
            const markdownResponse = {
                text: JSON.stringify({
                    thinking: 'Wrapped in markdown',
                    code: '```python\nFINAL("extracted from markdown")\n```'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(markdownResponse);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.answer).toBe('extracted from markdown');
        });

        it('should track sub-call count', async () => {
            // Note: This tests the tracking, but actual sub-calls are mocked
            const response = {
                text: JSON.stringify({
                    thinking: 'Direct answer',
                    code: 'FINAL("no sub-calls")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.subCalls).toBe(0);
        });

        it('should handle errors gracefully', async () => {
            vi.mocked(retryGeminiRequest)
                .mockRejectedValueOnce(new Error('API Error'))
                .mockResolvedValueOnce({
                    text: JSON.stringify({
                        thinking: 'Recovered',
                        code: 'FINAL("recovered")'
                    })
                });

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            // Should have recovered and completed
            expect(result.answer).toBe('recovered');
            // Trajectory should include the error
            expect(result.trajectory.some(t => t.code === 'ERROR')).toBe(true);
        });

        it('should calculate execution time', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Quick',
                    code: 'FINAL("done")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            // Execution time should be defined (can be 0 for very fast runs)
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });

        it('should estimate costs', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Answer',
                    code: 'FINAL("done")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.cost).toBeDefined();
            expect(result.cost!.rootTokens).toBeGreaterThan(0);
            expect(result.cost!.estimatedCost).toBeGreaterThan(0);
        });
    });

    describe('rlmEnhancedQuery', () => {
        it('should use direct query for short contexts', async () => {
            const shortContext = 'Short context under 100k chars';
            const mockResponse = { text: 'Direct answer' };

            vi.mocked(retryGeminiRequest).mockResolvedValue(mockResponse);

            const result = await rlmEnhancedQuery(
                shortContext,
                'What is this?',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.iterations).toBe(1);
            expect(result.subCalls).toBe(0);
            expect(result.trajectory).toHaveLength(0);
        });

        it('should use full RLM for long contexts', async () => {
            // Create context > 100k chars
            const longContext = 'x'.repeat(150000);

            const mockResponse = {
                text: JSON.stringify({
                    thinking: 'Processing large context',
                    code: 'FINAL("processed large context")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(mockResponse);

            const result = await rlmEnhancedQuery(
                longContext,
                'Summarize',
                undefined,
                { enableDQScoring: false }
            );

            // Should have used full RLM (has trajectory)
            expect(result.trajectory.length).toBeGreaterThan(0);
        });

        it('should pass config to underlying query', async () => {
            const context = 'Test context';
            const mockResponse = { text: 'Answer' };

            vi.mocked(retryGeminiRequest).mockResolvedValue(mockResponse);

            const customConfig: Partial<RLMConfig> = {
                rootModel: 'gemini-2.5-pro',
                enableDQScoring: false
            };

            await rlmEnhancedQuery(context, 'Query', undefined, customConfig);

            // Verify the model was used
            expect(retryGeminiRequest).toHaveBeenCalled();
        });
    });

    describe('REPL Engine Parsing (via integration)', () => {
        it('should handle variable assignment', async () => {
            const responses = [
                {
                    text: JSON.stringify({
                        thinking: 'Store a value',
                        code: 'x = 42'
                    })
                },
                {
                    text: JSON.stringify({
                        thinking: 'Return stored value',
                        code: 'FINAL(x)'
                    })
                }
            ];

            vi.mocked(retryGeminiRequest)
                .mockResolvedValueOnce(responses[0])
                .mockResolvedValueOnce(responses[1]);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.answer).toBe('42');
        });

        it('should handle slicing syntax', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Slice the context',
                    code: 'chunk = context[:10]\nFINAL(chunk)'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'This is a test context with some content',
                'Get first 10 chars',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.answer).toBe('This is a ');
        });

        it('should handle print statements', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Print something',
                    code: 'print("Hello World")\nFINAL("done")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            // Check trajectory captured the print output
            expect(result.trajectory[0].output).toContain('Hello World');
        });

        it('should handle store and retrieve', async () => {
            const responses = [
                {
                    text: JSON.stringify({
                        thinking: 'Store value',
                        code: 'store("key", "value123")'
                    })
                },
                {
                    text: JSON.stringify({
                        thinking: 'Retrieve and return',
                        code: 'val = retrieve("key")\nFINAL(val)'
                    })
                }
            ];

            vi.mocked(retryGeminiRequest)
                .mockResolvedValueOnce(responses[0])
                .mockResolvedValueOnce(responses[1]);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.answer).toBe('value123');
        });

        it('should handle len function', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Get context length',
                    code: 'length = len(context)\nFINAL(length)'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const testContext = 'Hello World'; // 11 chars
            const result = await recursiveLLMQuery(
                testContext,
                'Get length',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.answer).toBe('11');
        });
    });

    describe('DQ Scoring Integration', () => {
        it('should include DQ score when enabled', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Answer',
                    code: 'FINAL("scored answer")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: true }
            );

            expect(result.dqScore).toBeDefined();
            expect(result.dqScore!.score).toBe(0.8); // From mock
        });

        it('should skip DQ score when disabled', async () => {
            const response = {
                text: JSON.stringify({
                    thinking: 'Answer',
                    code: 'FINAL("unscored answer")'
                })
            };

            vi.mocked(retryGeminiRequest).mockResolvedValue(response);

            const result = await recursiveLLMQuery(
                'context',
                'query',
                undefined,
                { enableDQScoring: false }
            );

            expect(result.dqScore).toBeUndefined();
        });
    });
});
