import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    calculateDQ,
    isActionable,
    createDQScore,
    scoreDQHeuristic,
    scoreDQWithLLM,
    rankByDQ,
    getBestByDQ
} from '../dqScoring';
import { AtomicTask } from '../../types';
import { DecisionQuality, DEFAULT_ACE_CONFIG } from '../../types/domain/convergence';

// Mock functions for geminiService
const mockGenerateContent = vi.fn();
const mockRetryGeminiRequest = vi.fn(async (fn) => fn());

// Mock the geminiService to avoid actual API calls
vi.mock('../geminiService', () => ({
    getAI: vi.fn(() => ({
        models: {
            generateContent: mockGenerateContent
        }
    })),
    retryGeminiRequest: (fn: () => Promise<any>) => mockRetryGeminiRequest(fn)
}));

// Helper to create test tasks
function createTestTask(overrides: Partial<AtomicTask> = {}): AtomicTask {
    return {
        id: 'test-task-1',
        description: 'Test task description',
        isolated_input: 'Some input context for the task',
        instruction: 'Summarize the input context',
        weight: 1,
        status: 'PENDING',
        ...overrides
    };
}

describe('DQ Scoring Module', () => {
    describe('calculateDQ', () => {
        it('should calculate weighted score with default weights', () => {
            const components: DecisionQuality = {
                validity: 1.0,
                specificity: 1.0,
                correctness: 1.0
            };
            const score = calculateDQ(components);
            expect(score).toBe(1.0);
        });

        it('should calculate weighted score correctly', () => {
            const components: DecisionQuality = {
                validity: 0.8,
                specificity: 0.6,
                correctness: 0.4
            };
            // Default weights: validity: 0.4, specificity: 0.3, correctness: 0.3
            // Score = 0.8*0.4 + 0.6*0.3 + 0.4*0.3 = 0.32 + 0.18 + 0.12 = 0.62
            const score = calculateDQ(components);
            expect(score).toBeCloseTo(0.62);
        });

        it('should use custom weights when provided', () => {
            const components: DecisionQuality = {
                validity: 1.0,
                specificity: 0.5,
                correctness: 0.0
            };
            const customWeights = {
                validity: 0.5,
                specificity: 0.25,
                correctness: 0.25
            };
            // Score = 1.0*0.5 + 0.5*0.25 + 0.0*0.25 = 0.5 + 0.125 + 0 = 0.625
            const score = calculateDQ(components, customWeights);
            expect(score).toBeCloseTo(0.625);
        });

        it('should return 0 for all-zero components', () => {
            const components: DecisionQuality = {
                validity: 0,
                specificity: 0,
                correctness: 0
            };
            expect(calculateDQ(components)).toBe(0);
        });
    });

    describe('isActionable', () => {
        it('should return true for scores above threshold', () => {
            expect(isActionable(0.6)).toBe(true);
            expect(isActionable(0.51)).toBe(true);
            expect(isActionable(1.0)).toBe(true);
        });

        it('should return false for scores at or below threshold', () => {
            expect(isActionable(0.5)).toBe(false);
            expect(isActionable(0.4)).toBe(false);
            expect(isActionable(0)).toBe(false);
        });

        it('should use custom threshold when provided', () => {
            expect(isActionable(0.8, 0.7)).toBe(true);
            expect(isActionable(0.6, 0.7)).toBe(false);
        });
    });

    describe('createDQScore', () => {
        it('should create a complete DQScore object', () => {
            const components: DecisionQuality = {
                validity: 0.9,
                specificity: 0.8,
                correctness: 0.7
            };

            const score = createDQScore(components);

            expect(score.components).toEqual(components);
            expect(score.score).toBeCloseTo(0.81); // 0.9*0.4 + 0.8*0.3 + 0.7*0.3
            expect(score.isActionable).toBe(true);
            expect(score.timestamp).toBeGreaterThan(0);
        });

        it('should mark low scores as not actionable', () => {
            const components: DecisionQuality = {
                validity: 0.3,
                specificity: 0.2,
                correctness: 0.1
            };

            const score = createDQScore(components);
            expect(score.isActionable).toBe(false);
        });
    });

    describe('scoreDQHeuristic', () => {
        describe('validity scoring', () => {
            it('should give low score to empty output', () => {
                const task = createTestTask();
                const score = scoreDQHeuristic('', task);
                expect(score.components.validity).toBe(0);
            });

            it('should give low score to very short output', () => {
                const task = createTestTask();
                const score = scoreDQHeuristic('Hi', task);
                expect(score.components.validity).toBe(0);
            });

            it('should penalize error messages', () => {
                const task = createTestTask();
                const errorOutput = 'Error: Something went wrong with the process';
                const normalOutput = 'The process completed successfully with results';

                const errorScore = scoreDQHeuristic(errorOutput, task);
                const normalScore = scoreDQHeuristic(normalOutput, task);

                expect(errorScore.components.validity).toBeLessThan(normalScore.components.validity);
            });

            it('should penalize hedging language', () => {
                const task = createTestTask();
                const hedgedOutput = 'Maybe this could be the answer, perhaps it might work';
                const confidentOutput = 'This is the definitive answer based on the analysis';

                const hedgedScore = scoreDQHeuristic(hedgedOutput, task);
                const confidentScore = scoreDQHeuristic(confidentOutput, task);

                expect(hedgedScore.components.validity).toBeLessThan(confidentScore.components.validity);
            });
        });

        describe('specificity scoring', () => {
            it('should reward code blocks', () => {
                const task = createTestTask();
                const codeOutput = 'Here is the solution:\n```javascript\nconst x = 1;\n```';
                const plainOutput = 'Here is the solution: set x to 1';

                const codeScore = scoreDQHeuristic(codeOutput, task);
                const plainScore = scoreDQHeuristic(plainOutput, task);

                expect(codeScore.components.specificity).toBeGreaterThan(plainScore.components.specificity);
            });

            it('should reward version numbers', () => {
                const task = createTestTask();
                const versionedOutput = 'Install React v18.2.0 and TypeScript 5.0.0';
                const genericOutput = 'Install React and TypeScript';

                const versionedScore = scoreDQHeuristic(versionedOutput, task);
                const genericScore = scoreDQHeuristic(genericOutput, task);

                expect(versionedScore.components.specificity).toBeGreaterThan(genericScore.components.specificity);
            });

            it('should reward command patterns', () => {
                const task = createTestTask();
                const commandOutput = 'Run: npm install express && npm run build';
                const vagueOutput = 'Install the package and build the project';

                const commandScore = scoreDQHeuristic(commandOutput, task);
                const vagueScore = scoreDQHeuristic(vagueOutput, task);

                expect(commandScore.components.specificity).toBeGreaterThan(vagueScore.components.specificity);
            });

            it('should reward URLs', () => {
                const task = createTestTask();
                const urlOutput = 'Documentation at https://docs.example.com/api';
                const noUrlOutput = 'Check the documentation for the API';

                const urlScore = scoreDQHeuristic(urlOutput, task);
                const noUrlScore = scoreDQHeuristic(noUrlOutput, task);

                expect(urlScore.components.specificity).toBeGreaterThan(noUrlScore.components.specificity);
            });
        });

        describe('correctness scoring', () => {
            it('should reward keyword matches from instruction', () => {
                const task = createTestTask({
                    instruction: 'Implement a user authentication system'
                });

                const matchingOutput = 'The user authentication system is implemented with JWT tokens';
                const unrelatedOutput = 'The weather forecast shows rain tomorrow';

                const matchingScore = scoreDQHeuristic(matchingOutput, task);
                const unrelatedScore = scoreDQHeuristic(unrelatedOutput, task);

                expect(matchingScore.components.correctness).toBeGreaterThan(unrelatedScore.components.correctness);
            });

            it('should reward matches from input context', () => {
                const task = createTestTask({
                    instruction: 'Process the data',
                    isolated_input: 'Customer database with user profiles and purchase history'
                });

                const contextualOutput = 'Processed customer database with user profiles and purchase history records';
                const genericOutput = 'Done';

                const contextualScore = scoreDQHeuristic(contextualOutput, task);
                const genericScore = scoreDQHeuristic(genericOutput, task);

                // Contextual output should have higher correctness due to keyword overlap
                expect(contextualScore.components.correctness).toBeGreaterThanOrEqual(genericScore.components.correctness);
            });
        });

        describe('overall DQ score', () => {
            it('should return actionable score for high-quality output', () => {
                const task = createTestTask({
                    instruction: 'Install the package and run tests'
                });

                const highQualityOutput = `
                    To install the package and run tests, execute:
                    \`\`\`bash
                    npm install express@4.18.0
                    npm test
                    \`\`\`
                    This will install Express v4.18.0 and run the test suite.
                `;

                const score = scoreDQHeuristic(highQualityOutput, task);
                expect(score.isActionable).toBe(true);
                expect(score.score).toBeGreaterThan(0.5);
            });

            it('should return non-actionable score for low-quality output', () => {
                const task = createTestTask({
                    instruction: 'Implement database connection'
                });

                const lowQualityOutput = 'Maybe try connecting somehow?';

                const score = scoreDQHeuristic(lowQualityOutput, task);
                expect(score.isActionable).toBe(false);
            });
        });
    });

    describe('rankByDQ', () => {
        it('should rank outputs by DQ score descending', async () => {
            const task = createTestTask({
                instruction: 'Write a function to calculate sum'
            });

            const outputs = [
                'Just add them',
                'function sum(a, b) { return a + b; }',
                '```javascript\nfunction sum(a, b) { return a + b; }\n``` Version 1.0.0'
            ];

            const ranked = await rankByDQ(outputs, task, false);

            expect(ranked).toHaveLength(3);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);
            expect(ranked[2].rank).toBe(3);

            // Best output should have code block and version
            expect(ranked[0].output).toContain('```');

            // Scores should be in descending order
            expect(ranked[0].dq.score).toBeGreaterThanOrEqual(ranked[1].dq.score);
            expect(ranked[1].dq.score).toBeGreaterThanOrEqual(ranked[2].dq.score);
        });

        it('should use LLM scoring when useLLM is true', async () => {
            mockRetryGeminiRequest.mockImplementation(async (fn) => fn());
            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify({ validity: 0.9, specificity: 0.8, correctness: 0.85 })
            });

            const task = createTestTask({ instruction: 'Test instruction' });
            const outputs = ['Output 1', 'Output 2'];

            const ranked = await rankByDQ(outputs, task, true);

            expect(ranked).toHaveLength(2);
            expect(mockGenerateContent).toHaveBeenCalled();
        });
    });

    describe('getBestByDQ', () => {
        it('should return the best output by DQ score', async () => {
            const task = createTestTask({
                instruction: 'Create API endpoint'
            });

            const outputs = [
                'Make an endpoint',
                'Create endpoint with Express: `app.get("/api/users", handler)`'
            ];

            const best = await getBestByDQ(outputs, task, false);

            expect(best).not.toBeNull();
            expect(best!.output).toContain('Express');
        });

        it('should return null for empty outputs array', async () => {
            const task = createTestTask();
            const best = await getBestByDQ([], task, false);
            expect(best).toBeNull();
        });
    });

    describe('scoreDQWithLLM', () => {
        beforeEach(() => {
            mockGenerateContent.mockReset();
            mockRetryGeminiRequest.mockReset();
            mockRetryGeminiRequest.mockImplementation(async (fn) => fn());
        });

        it('should return DQ score from LLM response', async () => {
            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify({
                    validity: 0.9,
                    specificity: 0.8,
                    correctness: 0.7,
                    reasoning: 'Good output'
                })
            });

            const task = createTestTask();
            const score = await scoreDQWithLLM('Test output', task);

            expect(score.components.validity).toBeCloseTo(0.9);
            expect(score.components.specificity).toBeCloseTo(0.8);
            expect(score.components.correctness).toBeCloseTo(0.7);
            expect(score.isActionable).toBe(true);
        });

        it('should clamp values to 0-1 range', async () => {
            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify({
                    validity: 1.5,
                    specificity: -0.5,
                    correctness: 0.5
                })
            });

            const task = createTestTask();
            const score = await scoreDQWithLLM('Test output', task);

            expect(score.components.validity).toBe(1.0);
            expect(score.components.specificity).toBe(0);
            expect(score.components.correctness).toBe(0.5);
        });

        it('should include ground truth in prompt when provided', async () => {
            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify({
                    validity: 0.8,
                    specificity: 0.7,
                    correctness: 0.9
                })
            });

            const task = createTestTask();
            await scoreDQWithLLM('Test output', task, 'Expected output');

            // Check that generateContent was called
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        it('should fall back to heuristic scoring on error', async () => {
            mockGenerateContent.mockRejectedValue(new Error('API Error'));

            const task = createTestTask({
                instruction: 'Calculate the sum'
            });
            const output = '```javascript\nconst sum = a + b;\n``` version 1.0.0';

            const score = await scoreDQWithLLM(output, task);

            // Should return heuristic score, not fail
            expect(score).toBeDefined();
            expect(score.components.validity).toBeGreaterThan(0);
            expect(score.components.specificity).toBeGreaterThan(0);
        });

        it('should handle malformed JSON response', async () => {
            mockGenerateContent.mockResolvedValue({
                text: 'not valid json'
            });

            const task = createTestTask();
            const score = await scoreDQWithLLM('Test output', task);

            // Should fall back to heuristic
            expect(score).toBeDefined();
        });

        it('should handle missing fields with defaults', async () => {
            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify({
                    validity: 0.8
                    // specificity and correctness missing
                })
            });

            const task = createTestTask();
            const score = await scoreDQWithLLM('Test output', task);

            expect(score.components.validity).toBe(0.8);
            expect(score.components.specificity).toBe(0);
            expect(score.components.correctness).toBe(0);
        });

        it('should handle empty text response', async () => {
            mockGenerateContent.mockResolvedValue({
                text: ''
            });

            const task = createTestTask();
            const score = await scoreDQWithLLM('Test output', task);

            // Should fall back to heuristic
            expect(score).toBeDefined();
        });
    });
});
