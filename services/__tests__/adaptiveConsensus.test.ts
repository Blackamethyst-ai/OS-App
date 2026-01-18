import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    adaptiveConsensusEngine,
    quickConsensus
} from '../adaptiveConsensus';
import { AtomicTask } from '../../types';
import { ACEStatus, ACEConfig, DEFAULT_ACE_CONFIG } from '../../types/domain/convergence';

// Mock all dependencies
vi.mock('../geminiService', () => ({
    getAI: vi.fn(() => ({
        models: {
            generateContent: vi.fn()
        }
    })),
    retryGeminiRequest: vi.fn(),
    constructHiveContext: vi.fn(() => 'mock context')
}));

vi.mock('../agents', () => ({
    HIVE_AGENTS: {
        'agent-1': {
            id: 'agent-1',
            name: 'Test Agent 1',
            weights: { skepticism: 0.5, creativity: 0.5, logic: 0.5 }
        },
        'agent-2': {
            id: 'agent-2',
            name: 'Test Agent 2',
            weights: { skepticism: 0.7, creativity: 0.3, logic: 0.8 }
        },
        'agent-3': {
            id: 'agent-3',
            name: 'Test Agent 3',
            weights: { skepticism: 0.3, creativity: 0.8, logic: 0.4 }
        }
    }
}));

vi.mock('../complexityEstimator', () => ({
    estimateComplexity: vi.fn(() => ({
        tokenEstimate: 100,
        taskType: 'moderate',
        suggestedRounds: 10,
        suggestedGap: 3,
        domain: 'general'
    })),
    getAdaptiveThresholds: vi.fn(() => ({
        gap: 3,
        rounds: 15
    }))
}));

vi.mock('../agentAuction', () => ({
    runAuction: vi.fn(() => ({
        selectedAgents: ['agent-1', 'agent-2'],
        allBids: [],
        auctionDuration: 50,
        fastTracked: false
    }))
}));

vi.mock('../dqScoring', () => ({
    scoreDQHeuristic: vi.fn(() => ({
        score: 0.75,
        components: { validity: 0.8, specificity: 0.7, correctness: 0.75 },
        isActionable: true,
        timestamp: Date.now()
    })),
    scoreDQWithLLM: vi.fn(() => Promise.resolve({
        score: 0.85,
        components: { validity: 0.9, specificity: 0.8, correctness: 0.85 },
        isActionable: true,
        timestamp: Date.now()
    }))
}));

vi.mock('../convergenceMemory', () => ({
    convergenceMemory: {
        getOptimalThresholds: vi.fn(() => Promise.resolve(null)),
        createPattern: vi.fn(() => ({})),
        storePattern: vi.fn(() => Promise.resolve())
    }
}));

vi.mock('../hopGrouping', () => ({
    performHopGrouping: vi.fn(() => ({
        groups: [],
        winningGroup: null,
        method: 'levenshtein',
        groupingDuration: 10
    }))
}));

import { retryGeminiRequest } from '../geminiService';
import { runAuction } from '../agentAuction';
import { estimateComplexity } from '../complexityEstimator';

// Helper to create test tasks
function createTestTask(overrides: Partial<AtomicTask> = {}): AtomicTask {
    return {
        id: 'test-task-1',
        description: 'Test task',
        isolated_input: 'Test input',
        instruction: 'Complete this task',
        weight: 1,
        status: 'PENDING',
        ...overrides
    };
}

describe('Adaptive Consensus Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('adaptiveConsensusEngine', () => {
        it('should converge when gap threshold is met', async () => {
            // Mock responses that will converge
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                // First 3 calls return same answer, creating gap of 3
                if (callCount <= 3) {
                    return {
                        text: JSON.stringify({
                            output: 'The winning answer',
                            confidence: 0.9,
                            reasoning: 'This is correct'
                        })
                    };
                }
                return {
                    text: JSON.stringify({
                        output: 'Different answer',
                        confidence: 0.7,
                        reasoning: 'Alternative'
                    })
                };
            });

            const task = createTestTask();
            const statusUpdates: ACEStatus[] = [];

            const result = await adaptiveConsensusEngine(
                task,
                (status) => statusUpdates.push({ ...status }),
                { enableAuction: false, enableDQScoring: false }
            );

            expect(result.output).toBe('The winning answer');
            expect(result.voteLedger.count).toBeGreaterThanOrEqual(3);
            expect(statusUpdates.some(s => s.phase === 'complete')).toBe(true);
        });

        it('should track voting progress through status updates', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                return {
                    text: JSON.stringify({
                        output: callCount <= 3 ? 'Winner' : 'Other',
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();
            const statusUpdates: ACEStatus[] = [];

            await adaptiveConsensusEngine(
                task,
                (status) => statusUpdates.push({ ...status }),
                { enableAuction: false, enableDQScoring: false }
            );

            // Should have estimating and voting phases
            const phases = [...new Set(statusUpdates.map(s => s.phase))];
            expect(phases).toContain('estimating');
            expect(phases).toContain('voting');
            expect(phases).toContain('complete');

            // Votes should accumulate
            const votingStatuses = statusUpdates.filter(s => s.phase === 'voting');
            expect(votingStatuses.length).toBeGreaterThan(0);
        });

        it('should cycle through participating agents', async () => {
            const agentsSeen: string[] = [];
            let callCount = 0;

            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                // Force convergence after 6 rounds
                return {
                    text: JSON.stringify({
                        output: callCount <= 6 ? 'Converged' : 'Other',
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            await adaptiveConsensusEngine(
                task,
                (status) => {
                    if (status.activeDNA) {
                        agentsSeen.push(status.activeDNA);
                    }
                },
                { enableAuction: false, enableDQScoring: false }
            );

            // Should have cycled through multiple agents
            expect(agentsSeen.length).toBeGreaterThan(0);
        });

        it('should run auction when enabled', async () => {
            vi.mocked(retryGeminiRequest).mockResolvedValue({
                text: JSON.stringify({
                    output: 'Quick answer',
                    confidence: 0.9,
                    reasoning: 'Test'
                })
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: true, enableDQScoring: false }
            );

            expect(runAuction).toHaveBeenCalled();
            expect(result.auctionResult).toBeDefined();
        });

        it('should skip auction when disabled', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                return {
                    text: JSON.stringify({
                        output: callCount <= 3 ? 'Winner' : 'Other',
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false }
            );

            expect(runAuction).not.toHaveBeenCalled();
        });

        it('should include DQ score when enabled', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                return {
                    text: JSON.stringify({
                        output: callCount <= 3 ? 'Winner' : 'Other',
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: true }
            );

            expect(result.dqScore).toBeDefined();
            expect(result.dqScore!.score).toBeGreaterThan(0);
        });

        it('should estimate complexity', async () => {
            vi.mocked(retryGeminiRequest).mockResolvedValue({
                text: JSON.stringify({
                    output: 'Answer',
                    confidence: 0.9,
                    reasoning: 'Test'
                })
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: false }
            );

            expect(estimateComplexity).toHaveBeenCalledWith(task);
            expect(result.complexity).toBeDefined();
        });

        it('should handle failed rounds gracefully', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                // Fail first round, succeed after
                if (callCount === 1) {
                    throw new Error('API Error');
                }
                return {
                    text: JSON.stringify({
                        output: callCount <= 4 ? 'Winner' : 'Other',
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: false }
            );

            expect(result.voteLedger.killedAgents).toBeGreaterThan(0);
            expect(result.output).toBe('Winner');
        });

        it('should timeout and return best available answer', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                // Alternate answers so gap never reaches threshold
                return {
                    text: JSON.stringify({
                        output: `Answer ${callCount % 2}`,
                        confidence: 0.6,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                {
                    enableAuction: false,
                    enableDQScoring: false,
                    adaptiveThresholds: false // Use fixed thresholds
                }
            );

            // Should have hit max rounds
            expect(result.voteLedger.totalRounds).toBeGreaterThan(0);
            expect(result.confidence).toBe(50); // Lower confidence for timeout
        });

        it('should normalize and deduplicate similar answers', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                // Return same answer with slight whitespace differences
                const answer = callCount <= 3 ? '  The Answer  ' : 'Different';
                return {
                    text: JSON.stringify({
                        output: answer,
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: false }
            );

            // Should have converged on the normalized answer
            expect(result.output.trim()).toBe('The Answer');
        });

        it('should track execution time', async () => {
            vi.mocked(retryGeminiRequest).mockResolvedValue({
                text: JSON.stringify({
                    output: 'Quick',
                    confidence: 0.9,
                    reasoning: 'Test'
                })
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: false }
            );

            expect(result.executionTime).toBeGreaterThan(0);
        });

        it('should include agent contributions in result', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                return {
                    text: JSON.stringify({
                        output: callCount <= 3 ? 'Winner' : 'Other',
                        confidence: 0.8,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: false }
            );

            expect(result.agentId).toContain('ACE_');
        });
    });

    describe('quickConsensus', () => {
        it('should use minimal configuration for speed', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                return {
                    text: JSON.stringify({
                        output: 'Fast answer',
                        confidence: 0.9,
                        reasoning: 'Quick'
                    })
                };
            });

            const task = createTestTask();
            const result = await quickConsensus(task);

            // Should skip auction
            expect(runAuction).not.toHaveBeenCalled();

            // Should have a result
            expect(result.output).toBeDefined();
        });

        it('should work without status callback', async () => {
            vi.mocked(retryGeminiRequest).mockResolvedValue({
                text: JSON.stringify({
                    output: 'Answer',
                    confidence: 0.9,
                    reasoning: 'Test'
                })
            });

            const task = createTestTask();

            // Should not throw without callback
            const result = await quickConsensus(task);
            expect(result.output).toBe('Answer');
        });
    });

    describe('Vote Ledger', () => {
        it('should track winner and runner up', async () => {
            let callCount = 0;
            vi.mocked(retryGeminiRequest).mockImplementation(async () => {
                callCount++;
                // 3 votes for winner, 1 for runner up
                if (callCount <= 3) {
                    return {
                        text: JSON.stringify({
                            output: 'Winner',
                            confidence: 0.9,
                            reasoning: 'Test'
                        })
                    };
                } else if (callCount === 4) {
                    return {
                        text: JSON.stringify({
                            output: 'Runner Up',
                            confidence: 0.7,
                            reasoning: 'Test'
                        })
                    };
                }
                return {
                    text: JSON.stringify({
                        output: 'Winner',
                        confidence: 0.9,
                        reasoning: 'Test'
                    })
                };
            });

            const task = createTestTask();

            const result = await adaptiveConsensusEngine(
                task,
                () => {},
                { enableAuction: false, enableDQScoring: false }
            );

            expect(result.voteLedger.winner).toBeDefined();
            expect(result.voteLedger.count).toBeGreaterThanOrEqual(3);
            expect(result.voteLedger.totalRounds).toBeGreaterThan(0);
        });
    });

    describe('DEFAULT_ACE_CONFIG', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_ACE_CONFIG.adaptiveThresholds).toBe(true);
            expect(DEFAULT_ACE_CONFIG.enableAuction).toBe(true);
            expect(DEFAULT_ACE_CONFIG.enableDQScoring).toBe(true);
            expect(DEFAULT_ACE_CONFIG.minAgents).toBe(2);
            expect(DEFAULT_ACE_CONFIG.maxAgents).toBe(5);
            expect(DEFAULT_ACE_CONFIG.dqWeights.validity).toBe(0.4);
            expect(DEFAULT_ACE_CONFIG.dqWeights.specificity).toBe(0.3);
            expect(DEFAULT_ACE_CONFIG.dqWeights.correctness).toBe(0.3);
        });
    });
});
