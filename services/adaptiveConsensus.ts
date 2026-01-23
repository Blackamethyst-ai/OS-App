/**
 * Adaptive Convergence Engine (ACE)
 *
 * Enhanced consensus engine with:
 * - Adaptive thresholds based on task complexity
 * - Agent auction for relevant participant selection
 * - DQ scoring for quality measurement
 * - Pattern learning for threshold optimization
 *
 * Based on research from:
 * - arXiv:2511.15755 (MyAntFarm.ai DQ scoring)
 * - arXiv:2511.13193 (DALA auction-based coordination)
 * - arXiv:2508.17536 (Voting vs Debate)
 */

import { Schema, Type, GenerateContentResponse } from "@google/genai";
import { AtomicTask, SwarmResult, HiveAgent } from '../types';
import {
    ACEConfig,
    ACEStatus,
    ACEResult,
    DQScore,
    ComplexityProfile,
    AuctionResult,
    DEFAULT_ACE_CONFIG,
    VoteLedgerExtended,
    HopGroupingResult
} from '../types/domain/convergence';
import { performHopGrouping } from './hopGrouping';
import { retryGeminiRequest, getAI, constructHiveContext } from './geminiService';
import { HIVE_AGENTS } from './agents';
import { estimateComplexity, getAdaptiveThresholds } from './complexityEstimator';
import { runAuction } from './agentAuction';
import { scoreDQHeuristic, scoreDQWithLLM } from './dqScoring';
import { convergenceMemory } from './convergenceMemory';

// ============================================================================
// ADAPTIVE CONSENSUS ENGINE
// ============================================================================

/**
 * Enhanced consensus engine with adaptive thresholds and agent selection
 */
export async function adaptiveConsensusEngine(
    task: AtomicTask,
    onStatusUpdate: (status: ACEStatus) => void,
    config: Partial<ACEConfig> = {}
): Promise<ACEResult> {
    const fullConfig: ACEConfig = { ...DEFAULT_ACE_CONFIG, ...config };
    const ai = getAI();
    const startTime = Date.now();

    // ========================================================================
    // PHASE 1: Complexity Estimation
    // ========================================================================
    onStatusUpdate({
        phase: 'estimating',
        taskId: task.id,
        votes: {},
        killedAgents: 0,
        currentGap: 0,
        targetGap: 3,
        totalAttempts: 0
    });

    const complexity = estimateComplexity(task);

    // Get historical thresholds if learning is enabled
    let historicalThresholds = null;
    if (fullConfig.enableLearning) {
        historicalThresholds = await convergenceMemory.getOptimalThresholds(
            complexity.domain || 'general',
            complexity.taskType
        );
    }

    // Determine adaptive thresholds
    const thresholds = fullConfig.adaptiveThresholds
        ? getAdaptiveThresholds(task, historicalThresholds || undefined)
        : { gap: 3, rounds: 15 };

    const TARGET_GAP = thresholds.gap;
    const MAX_ROUNDS = thresholds.rounds;

    // ========================================================================
    // PHASE 2: Agent Auction (if enabled)
    // ========================================================================
    let auctionResult: AuctionResult | undefined;
    let participatingAgentIds: string[];

    if (fullConfig.enableAuction) {
        onStatusUpdate({
            phase: 'auctioning',
            taskId: task.id,
            votes: {},
            killedAgents: 0,
            currentGap: 0,
            targetGap: TARGET_GAP,
            totalAttempts: 0,
            complexity
        });

        auctionResult = await runAuction(task, complexity, HIVE_AGENTS, {
            minAgents: fullConfig.minAgents,
            maxAgents: fullConfig.maxAgents
        });
        participatingAgentIds = auctionResult.selectedAgents;
    } else {
        // All agents participate
        participatingAgentIds = Object.keys(HIVE_AGENTS);
    }

    // ========================================================================
    // PHASE 3: Voting Loop
    // ========================================================================
    const votes: Record<string, number> = {};
    const answerMap: Record<string, string> = {};
    let killedAgents = 0;
    let rounds = 0;
    const agentContributions: Record<string, string[]> = {}; // Track which agents contributed to which answers

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            output: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
        },
        required: ['output', 'confidence', 'reasoning']
    };

    onStatusUpdate({
        phase: 'voting',
        taskId: task.id,
        votes,
        killedAgents,
        currentGap: 0,
        targetGap: TARGET_GAP,
        totalAttempts: 0,
        complexity,
        auctionResult,
        participatingAgents: participatingAgentIds,
        estimatedRoundsRemaining: MAX_ROUNDS
    });

    while (rounds < MAX_ROUNDS) {
        rounds++;

        // Cycle through participating agents
        const agentIndex = (rounds - 1) % participatingAgentIds.length;
        const currentAgentId = participatingAgentIds[agentIndex];
        const currentAgent = HIVE_AGENTS[currentAgentId];

        try {
            // Build agent-specific context
            const agentContext = currentAgent
                ? constructHiveContext(currentAgentId, `Task: ${task.instruction}`, {
                    skepticism: (currentAgent.weights?.skepticism || 0.5) * 100,
                    excitement: (currentAgent.weights?.creativity || 0.5) * 100,
                    alignment: (currentAgent.weights?.logic || 0.5) * 100
                })
                : undefined;

            const response: GenerateContentResponse = await retryGeminiRequest(() =>
                ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: `Task: ${task.instruction}. Input: ${task.isolated_input}.`,
                    config: {
                        temperature: 0.7 + (rounds * 0.03), // Slower drift for agent diversity
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        systemInstruction: agentContext
                    }
                })
            );

            const result = JSON.parse(response.text || "{}");
            let rawOutput = result.output?.trim() || "";
            rawOutput = rawOutput.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();

            if (!rawOutput) throw new Error("Empty output");

            // Normalize for deduplication
            const key = rawOutput.toLowerCase().replace(/\s+/g, ' ').substring(0, 200);
            if (!answerMap[key]) {
                answerMap[key] = rawOutput;
                agentContributions[key] = [];
            }

            // Track which agent contributed to this answer
            if (!agentContributions[key].includes(currentAgentId)) {
                agentContributions[key].push(currentAgentId);
            }

            votes[key] = (votes[key] || 0) + 1;

            // Calculate gap
            const sortedCandidates = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            const leaderCount = sortedCandidates[0][1];
            const runnerUpCount = sortedCandidates.length > 1 ? sortedCandidates[1][1] : 0;
            const currentGap = leaderCount - runnerUpCount;

            onStatusUpdate({
                phase: 'voting',
                taskId: task.id,
                votes,
                killedAgents,
                currentGap,
                targetGap: TARGET_GAP,
                totalAttempts: rounds,
                complexity,
                auctionResult,
                participatingAgents: participatingAgentIds,
                estimatedRoundsRemaining: MAX_ROUNDS - rounds,
                activeDNA: currentAgentId
            });

            // Check for convergence
            if (currentGap >= TARGET_GAP) {
                const winnerKey = sortedCandidates[0][0];
                let winnerOutput = answerMap[winnerKey];
                let winningAgents = agentContributions[winnerKey] || [];

                // ================================================================
                // PHASE 3.5: Hop Grouping (expert tasks only)
                // ================================================================
                let hopGroupingResult: HopGroupingResult | undefined;

                if (fullConfig.enableHopGrouping &&
                    complexity.taskType === 'expert' &&
                    Object.keys(votes).length >= fullConfig.hopMinVotes) {

                    hopGroupingResult = performHopGrouping(
                        votes, answerMap, agentContributions, task,
                        {
                            maxGroups: fullConfig.hopMaxGroups,
                            similarityThreshold: fullConfig.hopSimilarityThreshold,
                            scoreDQ: fullConfig.enableDQScoring
                        }
                    );

                    // Override winner with hop group representative
                    if (hopGroupingResult.winningGroup) {
                        winnerOutput = hopGroupingResult.winningGroup.representativeAnswer;
                        winningAgents = hopGroupingResult.winningGroup.agentContributors;
                        if (import.meta.env.DEV) console.log(`[ACE] HRPO: ${hopGroupingResult.groups.length} groups formed, winning group has ${hopGroupingResult.winningGroup.votingStrength} votes`);
                    }
                }

                // Score the winning output
                let dqScore: DQScore | undefined;
                if (fullConfig.enableDQScoring) {
                    onStatusUpdate({
                        phase: 'scoring',
                        taskId: task.id,
                        votes,
                        killedAgents,
                        currentGap,
                        targetGap: TARGET_GAP,
                        totalAttempts: rounds,
                        complexity,
                        auctionResult,
                        participatingAgents: participatingAgentIds
                    });

                    // Use heuristic for speed, LLM for accuracy
                    dqScore = complexity.taskType === 'expert'
                        ? await scoreDQWithLLM(winnerOutput, task)
                        : scoreDQHeuristic(winnerOutput, task);
                }

                // Store pattern for learning
                let patternStored = false;
                if (fullConfig.enableLearning && dqScore) {
                    try {
                        const pattern = convergenceMemory.createPattern(
                            task,
                            complexity.taskType,
                            complexity.domain || 'general',
                            rounds,
                            currentGap,
                            dqScore.score,
                            winningAgents,
                            complexity.tokenEstimate * rounds // Rough token estimate
                        );
                        await convergenceMemory.storePattern(pattern);
                        patternStored = true;
                    } catch (e) {
                        console.warn('[ACE] Failed to store convergence pattern:', e);
                    }
                }

                const voteLedger: VoteLedgerExtended = {
                    winner: winnerKey,
                    count: leaderCount,
                    runnerUp: sortedCandidates[1]?.[0] || "",
                    runnerUpCount,
                    totalRounds: rounds,
                    killedAgents,
                    participatingAgents: participatingAgentIds,
                    adaptiveThresholds: fullConfig.adaptiveThresholds,
                    suggestedRounds: MAX_ROUNDS
                };

                onStatusUpdate({
                    phase: 'complete',
                    taskId: task.id,
                    votes,
                    killedAgents,
                    currentGap,
                    targetGap: TARGET_GAP,
                    totalAttempts: rounds,
                    complexity,
                    auctionResult,
                    currentDQ: dqScore
                });

                return {
                    taskId: task.id,
                    output: winnerOutput,
                    confidence: Math.min(99, 80 + (currentGap * 5)),
                    agentId: `ACE_${winningAgents.join('+')}`,
                    executionTime: Date.now() - startTime,
                    voteLedger,
                    dqScore,
                    complexity,
                    auctionResult,
                    patternStored,
                    hopGroupingResult
                };
            }
        } catch (e) {
            killedAgents++;
            console.warn(`[ACE] Round ${rounds} failed for agent ${currentAgentId}:`, e);
        }

        await new Promise(r => setTimeout(r, 150)); // Slightly faster inter-round delay
    }

    // ========================================================================
    // TIMEOUT: Return best available answer
    // ========================================================================
    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const bestKey = sorted[0]?.[0] || "";
    const bestOutput = answerMap[bestKey] || "Consensus failed after max rounds";
    const bestAgents = agentContributions[bestKey] || [];

    // Score even on timeout
    let dqScore: DQScore | undefined;
    if (fullConfig.enableDQScoring) {
        dqScore = scoreDQHeuristic(bestOutput, task);
    }

    const voteLedger: VoteLedgerExtended = {
        winner: bestKey,
        count: votes[bestKey] || 0,
        runnerUp: sorted[1]?.[0] || "",
        runnerUpCount: sorted[1]?.[1] || 0,
        totalRounds: rounds,
        killedAgents,
        participatingAgents: participatingAgentIds,
        adaptiveThresholds: fullConfig.adaptiveThresholds,
        suggestedRounds: MAX_ROUNDS
    };

    onStatusUpdate({
        phase: 'complete',
        taskId: task.id,
        votes,
        killedAgents,
        currentGap: (sorted[0]?.[1] || 0) - (sorted[1]?.[1] || 0),
        targetGap: TARGET_GAP,
        totalAttempts: rounds,
        complexity,
        auctionResult,
        currentDQ: dqScore
    });

    return {
        taskId: task.id,
        output: bestOutput,
        confidence: 50, // Lower confidence for timeout
        agentId: `ACE_TIMEOUT_${bestAgents.join('+')}`,
        executionTime: Date.now() - startTime,
        voteLedger,
        dqScore,
        complexity,
        auctionResult,
        patternStored: false
    };
}

// ============================================================================
// QUICK CONSENSUS (for simple tasks)
// ============================================================================

/**
 * Fast-path consensus for simple tasks
 * Skips auction, uses minimal rounds
 */
export async function quickConsensus(
    task: AtomicTask,
    onStatusUpdate?: (status: ACEStatus) => void
): Promise<ACEResult> {
    return adaptiveConsensusEngine(task, onStatusUpdate || (() => { }), {
        adaptiveThresholds: true,
        enableAuction: false, // Skip auction for speed
        enableDQScoring: false, // Skip DQ for speed
        enableLearning: false,
        minAgents: 1,
        maxAgents: 2
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    adaptiveConsensusEngine,
    quickConsensus
};
