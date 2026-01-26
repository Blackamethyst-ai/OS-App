import { describe, it, expect } from 'vitest';
import {
    extractPathSignals,
    selectPath,
    canUseDirectPath,
    needsRLMPath,
    wouldBenefitFromConsensus
} from '../router';
import type { PathSignals, LearnedRouting } from '../types';

describe('CPB Router', () => {
    describe('extractPathSignals', () => {
        it('should extract basic signals from simple query', () => {
            const signals = extractPathSignals('What is TypeScript?');

            expect(signals.contextLength).toBeGreaterThan(0);
            expect(signals.queryComplexity).toBeLessThan(0.5);
            expect(signals.requiresConsensus).toBe(false);
        });

        it('should detect high complexity for architectural queries', () => {
            const signals = extractPathSignals(
                'Design a distributed system architecture for multi-agent consensus'
            );

            expect(signals.queryComplexity).toBeGreaterThan(0.5);
        });

        it('should detect consensus need', () => {
            const signals = extractPathSignals(
                'What is the best approach for implementing authentication?'
            );

            expect(signals.requiresConsensus).toBe(true);
        });

        it('should detect reasoning need', () => {
            const signals = extractPathSignals(
                'Explain why this algorithm has O(n log n) complexity'
            );

            expect(signals.requiresReasoning).toBe(true);
        });

        it('should include context length', () => {
            const longContext = 'x'.repeat(10000);
            const signals = extractPathSignals('Query', longContext);

            expect(signals.contextLength).toBeGreaterThan(10000);
        });

        it('should use config overrides', () => {
            const signals = extractPathSignals('Query', undefined, {
                dqThreshold: 0.9,
                standardPathMs: 5000
            });

            expect(signals.qualityTarget).toBe(0.9);
            expect(signals.timeBudgetMs).toBe(5000);
        });
    });

    describe('selectPath', () => {
        it('should select direct path for simple queries', () => {
            const signals: PathSignals = {
                contextLength: 100,
                queryComplexity: 0.2,
                requiresConsensus: false,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 3000,
                qualityTarget: 0.6
            };

            const decision = selectPath(signals);

            expect(decision.path).toBe('direct');
            expect(decision.confidence).toBeGreaterThan(0);
        });

        it('should select rlm path for long context', () => {
            const signals: PathSignals = {
                contextLength: 100000,
                queryComplexity: 0.5,
                requiresConsensus: false,
                requiresReasoning: true,
                hasGroundTruth: false,
                timeBudgetMs: 10000,
                qualityTarget: 0.7
            };

            const decision = selectPath(signals);

            expect(['rlm', 'hybrid']).toContain(decision.path);
        });

        it('should boost rlm and penalize direct for very long context', () => {
            const signals: PathSignals = {
                contextLength: 150000, // Exceeds contextThreshold (100000)
                queryComplexity: 0.3,
                requiresConsensus: false,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 30000,
                qualityTarget: 0.6
            };

            const decision = selectPath(signals);

            // Long context should boost RLM and hybrid, penalize direct
            expect(['rlm', 'hybrid']).toContain(decision.path);
            expect(decision.reasoning).toContain('compression');
        });

        it('should select ace path for consensus needs', () => {
            const signals: PathSignals = {
                contextLength: 1000,
                queryComplexity: 0.7,
                requiresConsensus: true,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 15000,
                qualityTarget: 0.7
            };

            const decision = selectPath(signals);

            expect(['ace', 'hybrid']).toContain(decision.path);
        });

        it('should select cascade for high quality target', () => {
            const signals: PathSignals = {
                contextLength: 5000,
                queryComplexity: 0.8,
                requiresConsensus: true,
                requiresReasoning: true,
                hasGroundTruth: false,
                timeBudgetMs: 30000,
                qualityTarget: 0.9
            };

            const decision = selectPath(signals);

            expect(['cascade', 'ace', 'hybrid']).toContain(decision.path);
        });

        it('should apply learned routing preferences', () => {
            const signals: PathSignals = {
                contextLength: 1000,
                queryComplexity: 0.5,
                requiresConsensus: false,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 15000, // Above fastPathMs (8000) to avoid time constraint override
                qualityTarget: 0.7
            };

            const learnedRouting: LearnedRouting = {
                domain: 'test',
                preferredPath: 'ace',
                confidence: 0.9,
                avgDQ: 0.85,
                avgTime: 5000,
                sampleCount: 100
            };

            const decision = selectPath(signals, {}, learnedRouting);

            // Learned preference should boost ace
            expect(decision.reasoning).toContain('learned preference');
        });

        it('should not apply low confidence learned routing', () => {
            const signals: PathSignals = {
                contextLength: 100,
                queryComplexity: 0.2,
                requiresConsensus: false,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 3000,
                qualityTarget: 0.6
            };

            const learnedRouting: LearnedRouting = {
                domain: 'test',
                preferredPath: 'ace',
                confidence: 0.5, // Below 0.7 threshold
                avgDQ: 0.85,
                avgTime: 5000,
                sampleCount: 10
            };

            const decision = selectPath(signals, {}, learnedRouting);

            // Should still prefer direct for simple query
            expect(decision.path).toBe('direct');
        });

        it('should include alternatives in decision', () => {
            const signals: PathSignals = {
                contextLength: 1000,
                queryComplexity: 0.5,
                requiresConsensus: false,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 5000,
                qualityTarget: 0.7
            };

            const decision = selectPath(signals);

            expect(decision.alternatives).toBeDefined();
            expect(decision.alternatives.length).toBeGreaterThan(0);
        });

        it('should boost ace with ground truth', () => {
            const signalsWithoutGT: PathSignals = {
                contextLength: 1000,
                queryComplexity: 0.6,
                requiresConsensus: true,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 10000,
                qualityTarget: 0.7
            };

            const signalsWithGT: PathSignals = {
                ...signalsWithoutGT,
                hasGroundTruth: true
            };

            const decisionWithoutGT = selectPath(signalsWithoutGT);
            const decisionWithGT = selectPath(signalsWithGT);

            // Ground truth should influence reasoning
            if (decisionWithGT.path === 'ace') {
                expect(decisionWithGT.reasoning).toContain('ground truth');
            }
        });

        it('should process long time budget without error', () => {
            // This test ensures the timeBudgetMs > hybridPathMs branch is covered
            const signals: PathSignals = {
                contextLength: 5000,
                queryComplexity: 0.5,
                requiresConsensus: false,
                requiresReasoning: false,
                hasGroundTruth: false,
                timeBudgetMs: 100000, // Exceeds hybridPathMs (90000)
                qualityTarget: 0.7
            };

            const decision = selectPath(signals);

            // Should return a valid decision
            expect(decision).toBeDefined();
            expect(decision.path).toBeDefined();
            expect(decision.confidence).toBeGreaterThan(0);
        });

        it('should prefer direct for time-constrained queries', () => {
            const signals: PathSignals = {
                contextLength: 5000,
                queryComplexity: 0.4, // Below complexity threshold (0.35)
                requiresConsensus: false, // No consensus need - would otherwise boost ace
                requiresReasoning: false, // No reasoning need
                hasGroundTruth: false,
                timeBudgetMs: 500, // Very short time budget (below fastPathMs 8000)
                qualityTarget: 0.7
            };

            const decision = selectPath(signals);

            expect(decision.path).toBe('direct');
            expect(decision.reasoning).toContain('Time constraint');
        });
    });

    describe('canUseDirectPath', () => {
        it('should return true for simple what-is queries', () => {
            expect(canUseDirectPath('What is TypeScript?')).toBe(true);
        });

        it('should return true for navigation queries', () => {
            expect(canUseDirectPath('Navigate to settings')).toBe(true);
            expect(canUseDirectPath('Go to dashboard')).toBe(true);
        });

        it('should return true for list queries', () => {
            expect(canUseDirectPath('List all users')).toBe(true);
            expect(canUseDirectPath('Show active sessions')).toBe(true);
        });

        it('should return false for complex queries', () => {
            expect(canUseDirectPath('Architect a microservices system')).toBe(false);
        });

        it('should return false for long context', () => {
            const longContext = 'x'.repeat(100000);
            expect(canUseDirectPath('What is this?', longContext)).toBe(false);
        });
    });

    describe('needsRLMPath', () => {
        it('should return false for short context', () => {
            expect(needsRLMPath('Query', 'Short context')).toBe(false);
        });

        it('should return true for long context', () => {
            const longContext = 'x'.repeat(100000);
            expect(needsRLMPath('Query', longContext)).toBe(true);
        });

        it('should respect config threshold', () => {
            const mediumContext = 'x'.repeat(20000);
            expect(needsRLMPath('Query', mediumContext, { contextThreshold: 10000 })).toBe(true);
            expect(needsRLMPath('Query', mediumContext, { contextThreshold: 50000 })).toBe(false);
        });
    });

    describe('wouldBenefitFromConsensus', () => {
        it('should return true for decision queries', () => {
            expect(wouldBenefitFromConsensus('What is the best approach?')).toBe(true);
            expect(wouldBenefitFromConsensus('Should I use React or Vue?')).toBe(true);
        });

        it('should return true for trade-off queries', () => {
            expect(wouldBenefitFromConsensus('What are the pros and cons?')).toBe(true);
        });

        it('should return true for high complexity queries', () => {
            expect(wouldBenefitFromConsensus(
                'Design a distributed system architecture'
            )).toBe(true);
        });

        it('should return false for simple factual queries', () => {
            expect(wouldBenefitFromConsensus('What is the capital of France?')).toBe(false);
        });
    });
});
