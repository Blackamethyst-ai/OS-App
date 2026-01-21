/**
 * CPB Core - Router Tests
 */

import { describe, it, expect } from 'vitest';
import {
    extractPathSignals,
    selectPath,
    canUseDirectPath,
    needsRLMPath,
    wouldBenefitFromConsensus
} from '../router';
import { DEFAULT_CPB_CONFIG, STANDARD_CPB_CONFIG } from '../types';

describe('extractPathSignals', () => {
    it('should extract low complexity for simple queries', () => {
        const signals = extractPathSignals('What is TypeScript?');
        expect(signals.queryComplexity).toBeLessThan(0.4);
        expect(signals.requiresConsensus).toBe(false);
    });

    it('should extract high complexity for architecture queries', () => {
        const signals = extractPathSignals(
            'Design a distributed microservices architecture for a high-traffic e-commerce platform'
        );
        expect(signals.queryComplexity).toBeGreaterThan(0.5);
    });

    it('should detect consensus need for decision queries', () => {
        const signals = extractPathSignals(
            'What is the best approach for handling authentication? Should we use JWT or sessions?'
        );
        expect(signals.requiresConsensus).toBe(true);
    });

    it('should detect reasoning need for "why" queries', () => {
        const signals = extractPathSignals(
            'Why does React re-render components and how can we optimize it?'
        );
        expect(signals.requiresReasoning).toBe(true);
    });

    it('should account for context length', () => {
        const shortContext = 'Short context';
        const longContext = 'x'.repeat(150000);

        const shortSignals = extractPathSignals('Query', shortContext);
        const longSignals = extractPathSignals('Query', longContext);

        expect(longSignals.contextLength).toBeGreaterThan(shortSignals.contextLength);
    });

    it('should use default config when none provided', () => {
        const signals = extractPathSignals('Test query');
        expect(signals.timeBudgetMs).toBe(DEFAULT_CPB_CONFIG.standardPathMs);
        expect(signals.qualityTarget).toBe(DEFAULT_CPB_CONFIG.dqThreshold);
    });
});

describe('selectPath', () => {
    it('should select direct path for simple navigation queries', () => {
        const signals = extractPathSignals('Navigate to dashboard');
        const decision = selectPath(signals);
        expect(decision.path).toBe('direct');
        expect(decision.confidence).toBeGreaterThan(0.5);
    });

    it('should select rlm path for long context', () => {
        const longContext = 'x'.repeat(150000);
        const signals = extractPathSignals('Summarize this document', longContext);
        const decision = selectPath(signals);
        expect(['rlm', 'hybrid']).toContain(decision.path);
    });

    it('should select ace path for consensus-needing queries', () => {
        const signals = extractPathSignals(
            'What are the pros and cons of using GraphQL vs REST? Help me decide which to use.'
        );
        const decision = selectPath(signals);
        expect(['ace', 'hybrid', 'cascade']).toContain(decision.path);
    });

    it('should provide alternatives in decision', () => {
        const signals = extractPathSignals('Design a new API');
        const decision = selectPath(signals);
        expect(decision.alternatives.length).toBeGreaterThan(0);
        expect(decision.alternatives[0]).toHaveProperty('path');
        expect(decision.alternatives[0]).toHaveProperty('score');
    });

    it('should include reasoning in decision', () => {
        const signals = extractPathSignals('What is 2 + 2?');
        const decision = selectPath(signals);
        expect(decision.reasoning).toBeTruthy();
        expect(typeof decision.reasoning).toBe('string');
    });

    it('should respect time budget constraints', () => {
        const signals = extractPathSignals('Complex architecture question');
        signals.timeBudgetMs = 1000; // Very short time budget
        const decision = selectPath(signals);
        // Should favor faster paths
        expect(['direct', 'rlm']).toContain(decision.path);
    });
});

describe('canUseDirectPath', () => {
    it('should return true for simple "what is" queries', () => {
        expect(canUseDirectPath('What is JavaScript?')).toBe(true);
    });

    it('should return true for navigation queries', () => {
        expect(canUseDirectPath('Navigate to settings')).toBe(true);
        expect(canUseDirectPath('Go to the dashboard')).toBe(true);
        expect(canUseDirectPath('Open the file manager')).toBe(true);
    });

    it('should return true for list queries', () => {
        expect(canUseDirectPath('List all users')).toBe(true);
        expect(canUseDirectPath('Show me the files')).toBe(true);
    });

    it('should return false for complex queries', () => {
        expect(canUseDirectPath('Design a scalable architecture for our platform')).toBe(false);
        expect(canUseDirectPath('Analyze the trade-offs between these approaches')).toBe(false);
    });

    it('should return false for long context', () => {
        const longContext = 'x'.repeat(150000);
        expect(canUseDirectPath('Summarize this', longContext)).toBe(false);
    });
});

describe('needsRLMPath', () => {
    it('should return false for short context', () => {
        expect(needsRLMPath('Query', 'Short context')).toBe(false);
    });

    it('should return true for context exceeding threshold', () => {
        const longContext = 'x'.repeat(150000);
        expect(needsRLMPath('Query', longContext)).toBe(true);
    });

    it('should respect custom config threshold', () => {
        const mediumContext = 'x'.repeat(60000);

        // Should need RLM with standard config (50k threshold)
        expect(needsRLMPath('Query', mediumContext, STANDARD_CPB_CONFIG)).toBe(true);

        // Should NOT need RLM with elite config (100k threshold)
        expect(needsRLMPath('Query', mediumContext, DEFAULT_CPB_CONFIG)).toBe(false);
    });
});

describe('wouldBenefitFromConsensus', () => {
    it('should return true for decision queries', () => {
        expect(wouldBenefitFromConsensus('Should we use React or Vue?')).toBe(true);
        expect(wouldBenefitFromConsensus('Help me choose between these options')).toBe(true);
    });

    it('should return true for trade-off queries', () => {
        expect(wouldBenefitFromConsensus('What are the trade-offs of microservices?')).toBe(true);
        expect(wouldBenefitFromConsensus('Pros and cons of serverless')).toBe(true);
    });

    it('should return true for opinion queries', () => {
        expect(wouldBenefitFromConsensus('What is your opinion on this architecture?')).toBe(true);
    });

    it('should return false for factual queries', () => {
        expect(wouldBenefitFromConsensus('What is the capital of France?')).toBe(false);
    });

    it('should return true for high complexity regardless of consensus keywords', () => {
        expect(wouldBenefitFromConsensus(
            'Design a comprehensive distributed system architecture for real-time data processing'
        )).toBe(true);
    });
});

describe('Config Defaults', () => {
    it('should have correct ELITE tier defaults', () => {
        expect(DEFAULT_CPB_CONFIG.defaultPath).toBe('cascade');
        expect(DEFAULT_CPB_CONFIG.contextThreshold).toBe(100000);
        expect(DEFAULT_CPB_CONFIG.complexityThreshold).toBe(0.35);
        expect(DEFAULT_CPB_CONFIG.dqThreshold).toBe(0.75);
        expect(DEFAULT_CPB_CONFIG.aceConfig.agentCount).toBe(5);
    });

    it('should have correct STANDARD tier defaults', () => {
        expect(STANDARD_CPB_CONFIG.defaultPath).toBe('hybrid');
        expect(STANDARD_CPB_CONFIG.contextThreshold).toBe(50000);
        expect(STANDARD_CPB_CONFIG.complexityThreshold).toBe(0.5);
        expect(STANDARD_CPB_CONFIG.dqThreshold).toBe(0.6);
        expect(STANDARD_CPB_CONFIG.aceConfig.agentCount).toBe(3);
    });

    it('should have ELITE tier with longer time budgets', () => {
        expect(DEFAULT_CPB_CONFIG.fastPathMs).toBeGreaterThan(STANDARD_CPB_CONFIG.fastPathMs);
        expect(DEFAULT_CPB_CONFIG.standardPathMs).toBeGreaterThan(STANDARD_CPB_CONFIG.standardPathMs);
        expect(DEFAULT_CPB_CONFIG.hybridPathMs).toBeGreaterThan(STANDARD_CPB_CONFIG.hybridPathMs);
    });
});
