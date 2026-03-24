import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HiveAgent, AtomicTask } from '../../types';
import { ComplexityProfile } from '../../types/domain/convergence';

// Mock the agents import so we don't depend on real agent data
vi.mock('../agents', () => ({
    HIVE_AGENTS: {}
}));

import {
    runAuction,
    getBestAgent,
    getAgentsByArchetype,
    getRecommendedAgents
} from '../agentAuction';
import agentAuctionDefault from '../agentAuction';

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeAgent(overrides: Partial<HiveAgent> & { id: string }): HiveAgent {
    return {
        name: overrides.id,
        gender: 'male',
        voice: 'default',
        systemPrompt: 'test',
        expertise: [],
        archetype: 'Builder',
        weights: { skepticism: 0.5, logic: 0.5, creativity: 0.5, empathy: 0.5 },
        ...overrides,
    };
}

function makeTask(overrides: Partial<AtomicTask> = {}): AtomicTask {
    return {
        id: 'task-1',
        description: 'Test task',
        isolated_input: 'input',
        instruction: 'do something',
        weight: 1,
        ...overrides,
    };
}

function makeComplexity(overrides: Partial<ComplexityProfile> = {}): ComplexityProfile {
    return {
        tokenEstimate: 500,
        taskType: 'moderate',
        suggestedRounds: 3,
        suggestedGap: 0.1,
        domain: 'general',
        ...overrides,
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe('agentAuction', () => {
    const agents: Record<string, HiveAgent> = {
        mike: makeAgent({
            id: 'mike',
            name: 'Mike',
            archetype: 'Builder',
            expertise: ['System Architecture', 'Rapid Prototyping'],
            weights: { skepticism: 0.3, logic: 0.8, creativity: 0.7, empathy: 0.4 },
        }),
        dr_ira: makeAgent({
            id: 'dr_ira',
            name: 'Dr. Ira',
            archetype: 'Sentinel',
            expertise: ['Risk Analysis', 'Security Auditing', 'Due Diligence'],
            weights: { skepticism: 0.9, logic: 0.7, creativity: 0.3, empathy: 0.2 },
        }),
        caleb: makeAgent({
            id: 'caleb',
            name: 'Caleb',
            archetype: 'Executor',
            expertise: ['Process Engineering', 'Resource Optimization'],
            weights: { skepticism: 0.2, logic: 0.9, creativity: 0.2, empathy: 0.3 },
        }),
        helen: makeAgent({
            id: 'helen',
            name: 'Helen',
            archetype: 'Weaver',
            expertise: ['Communication Strategy', 'Brand Voice', 'Narrative Design'],
            weights: { skepticism: 0.3, logic: 0.4, creativity: 0.9, empathy: 0.8 },
        }),
        paramdeep: makeAgent({
            id: 'paramdeep',
            name: 'Paramdeep',
            archetype: 'Strategist',
            expertise: ['Systems Thinking', 'Strategic Planning', 'Long-term Vision'],
            weights: { skepticism: 0.5, logic: 0.7, creativity: 0.6, empathy: 0.5 },
        }),
    };

    describe('runAuction', () => {
        it('fast-tracks simple tasks and selects minAgents', async () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'simple', domain: 'code' });

            const result = await runAuction(task, complexity, agents);

            expect(result.fastTracked).toBe(true);
            expect(result.selectedAgents).toHaveLength(2);
            expect(result.allBids.length).toBe(Object.keys(agents).length);
            expect(result.auctionDuration).toBeGreaterThanOrEqual(0);
        });

        it('runs full auction for complex tasks', async () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'complex', domain: 'code' });

            const result = await runAuction(task, complexity, agents);

            expect(result.fastTracked).toBe(false);
            expect(result.selectedAgents.length).toBeGreaterThanOrEqual(2);
            expect(result.allBids.length).toBe(Object.keys(agents).length);
        });

        it('respects maxAgents option', async () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'complex', domain: 'general' });

            const result = await runAuction(task, complexity, agents, { maxAgents: 3 });

            expect(result.selectedAgents.length).toBeLessThanOrEqual(3);
        });

        it('ensures minimum agents are selected', async () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'expert', domain: 'code' });

            const result = await runAuction(task, complexity, agents, { minAgents: 3 });

            expect(result.selectedAgents.length).toBeGreaterThanOrEqual(3);
        });

        it('promotes archetype diversity in full auction', async () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'complex', domain: 'analysis' });

            const result = await runAuction(task, complexity, agents, { maxAgents: 5 });

            // All agents have different archetypes, so all should be selectable
            const selectedArchetypes = result.selectedAgents.map(id => agents[id].archetype);
            const uniqueArchetypes = new Set(selectedArchetypes);
            expect(uniqueArchetypes.size).toBe(selectedArchetypes.length);
        });

        it('selects domain-relevant agents with higher confidence', async () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'moderate', domain: 'analysis' });

            const result = await runAuction(task, complexity, agents);

            // dr_ira has Risk Analysis, Security Auditing, Due Diligence — strong analysis match
            const drIraBid = result.allBids.find(b => b.agentId === 'dr_ira')!;
            const helenBid = result.allBids.find(b => b.agentId === 'helen')!;

            expect(drIraBid.expertiseMatch).toBeGreaterThan(helenBid.expertiseMatch);
        });
    });

    describe('getBestAgent', () => {
        it('returns the agent with highest confidence', () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'moderate', domain: 'code' });

            const best = getBestAgent(task, complexity, agents);

            expect(best.agentId).toBeDefined();
            expect(best.confidence).toBeGreaterThan(0);
            // mike has System Architecture expertise, should score well for code domain
            expect(best.agentId).toBe('mike');
        });

        it('returns bid with all required fields', () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'expert', domain: 'debug' });

            const best = getBestAgent(task, complexity, agents);

            expect(best).toHaveProperty('agentId');
            expect(best).toHaveProperty('confidence');
            expect(best).toHaveProperty('expertiseMatch');
            expect(best).toHaveProperty('tokenBudget');
            expect(best).toHaveProperty('rationale');
            expect(best.tokenBudget).toBeGreaterThan(0);
        });

        it('returns 0.5 expertise for general domain', () => {
            const task = makeTask();
            const complexity = makeComplexity({ taskType: 'moderate', domain: 'general' });

            const best = getBestAgent(task, complexity, agents);

            // All agents should have 0.5 expertise for general domain
            expect(best.expertiseMatch).toBe(0.5);
        });
    });

    describe('getAgentsByArchetype', () => {
        it('returns agents matching the given archetype', () => {
            const builders = getAgentsByArchetype('Builder', agents);

            expect(builders).toHaveLength(1);
            expect(builders[0].id).toBe('mike');
        });

        it('returns empty array for non-existent archetype', () => {
            const result = getAgentsByArchetype('NonExistent', agents);
            expect(result).toHaveLength(0);
        });
    });

    describe('getRecommendedAgents', () => {
        it('returns skeptic and executor for review tasks', () => {
            expect(getRecommendedAgents('review')).toEqual(['dr_ira', 'caleb']);
        });

        it('returns builder and weaver for create tasks', () => {
            expect(getRecommendedAgents('create')).toEqual(['mike', 'helen']);
        });

        it('returns strategist and sentinel for analyze tasks', () => {
            expect(getRecommendedAgents('analyze')).toEqual(['paramdeep', 'dr_ira']);
        });

        it('returns executor and builder for execute tasks', () => {
            expect(getRecommendedAgents('execute')).toEqual(['caleb', 'mike']);
        });

        it('returns three agents for debate tasks', () => {
            expect(getRecommendedAgents('debate')).toEqual(['dr_ira', 'mike', 'paramdeep']);
        });
    });

    describe('default export', () => {
        it('exports all functions', () => {
            expect(agentAuctionDefault.runAuction).toBe(runAuction);
            expect(agentAuctionDefault.getBestAgent).toBe(getBestAgent);
            expect(agentAuctionDefault.getAgentsByArchetype).toBe(getAgentsByArchetype);
            expect(agentAuctionDefault.getRecommendedAgents).toBe(getRecommendedAgents);
            expect(typeof agentAuctionDefault.generateBid).toBe('function');
            expect(typeof agentAuctionDefault.calculateExpertiseMatch).toBe('function');
            expect(typeof agentAuctionDefault.calculateCognitiveMatch).toBe('function');
        });
    });
});
