/**
 * Hop Grouping Service (HRPO - Hop-grouped Response Processing)
 *
 * Clusters similar answers using Levenshtein-based similarity.
 * No API calls, zero latency overhead.
 *
 * Triggered only for expert-level tasks with sufficient votes.
 */

import { HopGroup, HopGroupingResult, DQScore } from '../types/domain/convergence';
import { AtomicTask } from '../types';
import { scoreDQHeuristic } from './dqScoring';

// ============================================================================
// LEVENSHTEIN SIMILARITY
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance normalized by max length
 */
export function levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Normalize strings for comparison
    const normA = a.toLowerCase().replace(/\s+/g, ' ').trim();
    const normB = b.toLowerCase().replace(/\s+/g, ' ').trim();

    if (normA === normB) return 1;

    // For very long strings, use a sampling approach
    const maxLen = Math.max(normA.length, normB.length);
    if (maxLen > 1000) {
        // Sample beginning, middle, and end
        const sampleLen = 300;
        const aSample = normA.substring(0, sampleLen) +
            normA.substring(Math.floor(normA.length / 2) - sampleLen / 2, Math.floor(normA.length / 2) + sampleLen / 2) +
            normA.substring(normA.length - sampleLen);
        const bSample = normB.substring(0, sampleLen) +
            normB.substring(Math.floor(normB.length / 2) - sampleLen / 2, Math.floor(normB.length / 2) + sampleLen / 2) +
            normB.substring(normB.length - sampleLen);

        const distance = levenshteinDistance(aSample, bSample);
        return 1 - (distance / Math.max(aSample.length, bSample.length));
    }

    const distance = levenshteinDistance(normA, normB);
    return 1 - (distance / maxLen);
}

// ============================================================================
// AGGLOMERATIVE CLUSTERING
// ============================================================================

interface ClusterNode {
    id: string;
    answers: string[];
    answerKeys: string[];
    agents: string[];
    voteCount: number;
}

/**
 * Find the two most similar clusters
 */
function findClosestClusters(
    clusters: ClusterNode[],
    answerMap: Record<string, string>
): { i: number; j: number; similarity: number } | null {
    if (clusters.length < 2) return null;

    let maxSimilarity = -1;
    let bestI = -1;
    let bestJ = -1;

    for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
            // Use representative answers (first in each cluster)
            const answerA = answerMap[clusters[i].answerKeys[0]] || clusters[i].answerKeys[0];
            const answerB = answerMap[clusters[j].answerKeys[0]] || clusters[j].answerKeys[0];

            const similarity = levenshteinSimilarity(answerA, answerB);

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestI = i;
                bestJ = j;
            }
        }
    }

    if (bestI === -1) return null;
    return { i: bestI, j: bestJ, similarity: maxSimilarity };
}

/**
 * Merge two clusters into one
 */
function mergeClusters(a: ClusterNode, b: ClusterNode): ClusterNode {
    return {
        id: `${a.id}_${b.id}`,
        answers: [...a.answers, ...b.answers],
        answerKeys: [...a.answerKeys, ...b.answerKeys],
        agents: [...new Set([...a.agents, ...b.agents])],
        voteCount: a.voteCount + b.voteCount
    };
}

/**
 * Calculate cohesion of a cluster (average pairwise similarity)
 */
function calculateCohesion(answers: string[]): number {
    if (answers.length <= 1) return 1;

    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < answers.length; i++) {
        for (let j = i + 1; j < answers.length; j++) {
            totalSimilarity += levenshteinSimilarity(answers[i], answers[j]);
            pairs++;
        }
    }

    return pairs > 0 ? totalSimilarity / pairs : 1;
}

/**
 * Perform agglomerative clustering on answers
 */
export function groupAnswersByHop(
    votes: Record<string, number>,
    answerMap: Record<string, string>,
    agentContributions: Record<string, string[]>,
    options: {
        maxGroups: number;
        similarityThreshold: number;
    }
): ClusterNode[] {
    // Initialize: each answer is its own cluster
    let clusters: ClusterNode[] = Object.entries(votes).map(([key, count], idx) => ({
        id: `g${idx}`,
        answers: [answerMap[key] || key],
        answerKeys: [key],
        agents: agentContributions[key] || [],
        voteCount: count
    }));

    // Agglomerative clustering
    while (clusters.length > options.maxGroups) {
        const closest = findClosestClusters(clusters, answerMap);

        if (!closest || closest.similarity < options.similarityThreshold) {
            break; // No more similar clusters to merge
        }

        // Merge the two closest clusters
        const merged = mergeClusters(clusters[closest.i], clusters[closest.j]);

        // Remove old clusters and add merged
        clusters = clusters.filter((_, idx) => idx !== closest.i && idx !== closest.j);
        clusters.push(merged);
    }

    return clusters;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export interface HopGroupingOptions {
    maxGroups: number;
    similarityThreshold: number;
    scoreDQ: boolean;
}

/**
 * Perform hop grouping on votes
 * Returns clustered groups with winning group determined by voting strength
 */
export function performHopGrouping(
    votes: Record<string, number>,
    answerMap: Record<string, string>,
    agentContributions: Record<string, string[]>,
    task: AtomicTask,
    options: HopGroupingOptions
): HopGroupingResult {
    const startTime = Date.now();

    // Perform clustering
    const clusterNodes = groupAnswersByHop(votes, answerMap, agentContributions, {
        maxGroups: options.maxGroups,
        similarityThreshold: options.similarityThreshold
    });

    // Convert clusters to HopGroups
    const groups: HopGroup[] = clusterNodes.map(node => {
        const representativeAnswer = node.answers[0]; // First answer is representative
        const cohesion = calculateCohesion(node.answers);

        // Optionally score DQ for representative
        let dqScore: DQScore | undefined;
        if (options.scoreDQ) {
            dqScore = scoreDQHeuristic(representativeAnswer, task);
        }

        return {
            id: node.id,
            representativeAnswer,
            memberAnswers: node.answers,
            agentContributors: node.agents,
            votingStrength: node.voteCount,
            dqScore,
            cohesion
        };
    });

    // Sort by voting strength, then by DQ score
    groups.sort((a, b) => {
        if (b.votingStrength !== a.votingStrength) {
            return b.votingStrength - a.votingStrength;
        }
        // Tie-breaker: DQ score
        const aDQ = a.dqScore?.score || 0;
        const bDQ = b.dqScore?.score || 0;
        return bDQ - aDQ;
    });

    const winningGroup = groups[0];
    const groupingDuration = Date.now() - startTime;

    return {
        groups,
        winningGroup,
        method: 'levenshtein',
        groupingDuration
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    levenshteinSimilarity,
    groupAnswersByHop,
    performHopGrouping
};
