/**
 * Agent Auction Module (DALA-inspired)
 *
 * Based on Dynamic Auction-based Language Agent (arXiv:2511.13193)
 * Agents bid to participate based on expertise match.
 * Reduces token costs by selecting only relevant agents.
 */

import { HiveAgent, AtomicTask } from '../types';
import { AgentBid, AuctionResult, ComplexityProfile } from '../types/domain/convergence';
import { HIVE_AGENTS } from './agents';

// ============================================================================
// DOMAIN-EXPERTISE MAPPING
// ============================================================================

/**
 * Map domains to agent expertise keywords
 */
const DOMAIN_EXPERTISE_MAP: Record<string, string[]> = {
    code: ['System Architecture', 'Rapid Prototyping', 'Technical Vision', 'Process Engineering'],
    architecture: ['System Architecture', 'Architecture Patterns', 'Strategic Planning', 'Systems Thinking'],
    analysis: ['Risk Analysis', 'Security Auditing', 'Due Diligence', 'Systems Thinking'],
    creative: ['Innovation Strategy', 'Creative Direction', 'Visual Storytelling', 'Narrative Design'],
    research: ['Systems Thinking', 'Strategic Planning', 'Long-term Vision'],
    debug: ['Risk Analysis', 'Process Engineering', 'Due Diligence'],
    refactor: ['System Architecture', 'Process Engineering', 'Resource Optimization'],
    ux: ['UX Research', 'Customer Empathy', 'Community Building', 'Visual Systems'],
    communication: ['Communication Strategy', 'Brand Voice', 'Narrative Design'],
    general: [] // All agents equally weighted
};

// ============================================================================
// BIDDING FUNCTIONS
// ============================================================================

/**
 * Calculate expertise match score between agent and task domain
 */
function calculateExpertiseMatch(agent: HiveAgent, domain: string): number {
    const domainKeywords = DOMAIN_EXPERTISE_MAP[domain] || [];

    if (domainKeywords.length === 0) {
        // General domain: use balanced scoring
        return 0.5;
    }

    const agentExpertise = agent.expertise || [];
    let matchCount = 0;

    for (const keyword of domainKeywords) {
        if (agentExpertise.some(e => e.toLowerCase().includes(keyword.toLowerCase()))) {
            matchCount++;
        }
    }

    // Normalize to 0-1
    return domainKeywords.length > 0
        ? matchCount / domainKeywords.length
        : 0.5;
}

/**
 * Calculate cognitive weight match based on task type
 */
function calculateCognitiveMatch(agent: HiveAgent, complexity: ComplexityProfile): number {
    if (!agent.weights) return 0.5;

    const { taskType, domain } = complexity;

    // Different cognitive profiles suit different tasks
    switch (taskType) {
        case 'simple':
            // Simple tasks: prefer execution-focused agents
            return agent.weights.logic * 0.5 + (1 - agent.weights.skepticism) * 0.5;

        case 'moderate':
            // Moderate: balanced approach
            return (agent.weights.logic + agent.weights.creativity) / 2;

        case 'complex':
            // Complex: value both creativity and logic
            return agent.weights.creativity * 0.4 + agent.weights.logic * 0.4 + agent.weights.empathy * 0.2;

        case 'expert':
            // Expert: high skepticism valuable for validation
            return agent.weights.skepticism * 0.3 + agent.weights.logic * 0.4 + agent.weights.creativity * 0.3;

        default:
            return 0.5;
    }
}

/**
 * Generate a bid for an agent
 */
function generateBid(
    agent: HiveAgent,
    task: AtomicTask,
    complexity: ComplexityProfile
): AgentBid {
    const expertiseMatch = calculateExpertiseMatch(agent, complexity.domain || 'general');
    const cognitiveMatch = calculateCognitiveMatch(agent, complexity);

    // Combined confidence: 60% expertise, 40% cognitive fit
    const confidence = expertiseMatch * 0.6 + cognitiveMatch * 0.4;

    // Token budget: higher confidence = willing to spend more
    const baseTokens = 500;
    const tokenBudget = Math.round(baseTokens * (1 + confidence));

    return {
        agentId: agent.id,
        confidence,
        expertiseMatch,
        tokenBudget,
        rationale: `${agent.name} (${agent.archetype}): expertise=${Math.round(expertiseMatch * 100)}%, cognitive fit=${Math.round(cognitiveMatch * 100)}%`
    };
}

// ============================================================================
// AUCTION EXECUTION
// ============================================================================

/**
 * Run an auction to select participating agents
 */
export async function runAuction(
    task: AtomicTask,
    complexity: ComplexityProfile,
    agents: Record<string, HiveAgent> = HIVE_AGENTS,
    options: {
        minAgents?: number;
        maxAgents?: number;
        fastTrackThreshold?: number;
    } = {}
): Promise<AuctionResult> {
    const startTime = Date.now();
    const {
        minAgents = 2,
        maxAgents = 5,
        fastTrackThreshold = 0.85
    } = options;

    // Convert agents record to array
    const agentList = Object.values(agents);

    // Fast-track: if task is simple, skip full auction
    if (complexity.taskType === 'simple') {
        // Just pick top 2 agents quickly
        const quickBids = agentList.map(agent => generateBid(agent, task, complexity));
        const topTwo = quickBids
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, minAgents);

        return {
            selectedAgents: topTwo.map(b => b.agentId),
            allBids: quickBids,
            auctionDuration: Date.now() - startTime,
            fastTracked: true
        };
    }

    // Full auction: all agents bid
    const allBids = agentList.map(agent => generateBid(agent, task, complexity));

    // Sort by confidence (descending)
    const sortedBids = [...allBids].sort((a, b) => b.confidence - a.confidence);

    // Select agents: take top N, but ensure diversity
    const selectedAgents: string[] = [];
    const selectedArchetypes = new Set<string>();

    for (const bid of sortedBids) {
        if (selectedAgents.length >= maxAgents) break;

        const agent = agents[bid.agentId];
        const archetype = agent?.archetype || 'unknown';

        // Prefer diversity: if we already have this archetype, require higher confidence
        if (selectedArchetypes.has(archetype) && bid.confidence < fastTrackThreshold) {
            continue;
        }

        selectedAgents.push(bid.agentId);
        selectedArchetypes.add(archetype);
    }

    // Ensure minimum agents
    while (selectedAgents.length < minAgents && selectedAgents.length < agentList.length) {
        const nextAgent = sortedBids.find(b => !selectedAgents.includes(b.agentId));
        if (nextAgent) {
            selectedAgents.push(nextAgent.agentId);
        } else {
            break;
        }
    }

    return {
        selectedAgents,
        allBids,
        auctionDuration: Date.now() - startTime,
        fastTracked: false
    };
}

/**
 * Get best single agent for a task (when no consensus needed)
 */
export function getBestAgent(
    task: AtomicTask,
    complexity: ComplexityProfile,
    agents: Record<string, HiveAgent> = HIVE_AGENTS
): AgentBid {
    const agentList = Object.values(agents);
    const bids = agentList.map(agent => generateBid(agent, task, complexity));
    return bids.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
    );
}

/**
 * Get agents by archetype (for diverse selection)
 */
export function getAgentsByArchetype(
    archetype: string,
    agents: Record<string, HiveAgent> = HIVE_AGENTS
): HiveAgent[] {
    return Object.values(agents).filter(a => a.archetype === archetype);
}

/**
 * Get recommended agents for specific task types
 */
export function getRecommendedAgents(
    taskType: 'review' | 'create' | 'analyze' | 'execute' | 'debate'
): string[] {
    switch (taskType) {
        case 'review':
            return ['dr_ira', 'caleb']; // Skeptic + Executor
        case 'create':
            return ['mike', 'helen']; // Builder + Weaver
        case 'analyze':
            return ['paramdeep', 'dr_ira']; // Strategist + Sentinel
        case 'execute':
            return ['caleb', 'mike']; // Executor + Builder
        case 'debate':
            return ['dr_ira', 'mike', 'paramdeep']; // Skeptic + Builder + Strategist
        default:
            return ['mike', 'caleb', 'dr_ira'];
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    runAuction,
    getBestAgent,
    getAgentsByArchetype,
    getRecommendedAgents,
    generateBid,
    calculateExpertiseMatch,
    calculateCognitiveMatch
};
