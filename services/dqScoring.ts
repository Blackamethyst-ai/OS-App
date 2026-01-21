/**
 * Decision Quality (DQ) Scoring Module
 *
 * Based on MyAntFarm.ai research (arXiv:2511.15755)
 * Measures: Validity (40%) + Specificity (30%) + Correctness (30%)
 *
 * Key finding: Multi-agent with DQ scoring achieves 100% actionability vs 1.7% single-agent
 */

import { Schema, Type, GenerateContentResponse } from "@google/genai";
import { retryGeminiRequest, getAI } from './geminiService';
import { AtomicTask } from '../types';
import {
    DecisionQuality,
    DQScore,
    DEFAULT_ACE_CONFIG
} from '../types/domain/convergence';

// Re-export types for convenience
export type { DQScore, DecisionQuality };

// ============================================================================
// CORE SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate weighted DQ score from components
 */
export function calculateDQ(
    components: DecisionQuality,
    weights = DEFAULT_ACE_CONFIG.dqWeights
): number {
    return (
        components.validity * weights.validity +
        components.specificity * weights.specificity +
        components.correctness * weights.correctness
    );
}

/**
 * Check if a DQ score meets actionability threshold
 */
export function isActionable(score: number, threshold = 0.5): boolean {
    return score > threshold;
}

/**
 * Create a full DQScore object from components
 */
export function createDQScore(components: DecisionQuality): DQScore {
    const score = calculateDQ(components);
    return {
        score,
        components,
        isActionable: isActionable(score),
        timestamp: Date.now()
    };
}

// ============================================================================
// LLM-BASED SCORING
// ============================================================================

/**
 * Score an output using LLM evaluation
 * This provides nuanced scoring but adds latency
 */
export async function scoreDQWithLLM(
    output: string,
    task: AtomicTask,
    groundTruth?: string
): Promise<DQScore> {
    const ai = getAI();

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            validity: {
                type: Type.NUMBER,
                description: "Technical feasibility score 0-1. Does the output make logical sense and is technically sound?"
            },
            specificity: {
                type: Type.NUMBER,
                description: "Concreteness score 0-1. Contains specific identifiers, versions, commands, or actionable details?"
            },
            correctness: {
                type: Type.NUMBER,
                description: "Task alignment score 0-1. Does it actually solve the stated problem?"
            },
            reasoning: {
                type: Type.STRING,
                description: "Brief explanation of scores"
            }
        },
        required: ['validity', 'specificity', 'correctness']
    };

    const groundTruthContext = groundTruth
        ? `\n\nGROUND TRUTH (if available): ${groundTruth}`
        : '';

    try {
        const response: GenerateContentResponse = await retryGeminiRequest(() =>
            ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `You are a Decision Quality (DQ) scorer. Evaluate this output against the task.

TASK INSTRUCTION: ${task.instruction}
TASK INPUT: ${task.isolated_input}
${groundTruthContext}

OUTPUT TO EVALUATE:
${output}

Score each dimension 0-1:
- validity: Is it technically feasible and logically sound?
- specificity: Does it contain concrete details (versions, commands, identifiers)?
- correctness: Does it actually solve the stated task?

Return JSON with validity, specificity, correctness (all 0-1 floats).`,
                config: {
                    temperature: 0.1, // Low temp for consistent scoring
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            })
        );

        const result = JSON.parse(response.text || "{}");

        // Clamp values to 0-1 range
        const components: DecisionQuality = {
            validity: Math.max(0, Math.min(1, result.validity || 0)),
            specificity: Math.max(0, Math.min(1, result.specificity || 0)),
            correctness: Math.max(0, Math.min(1, result.correctness || 0))
        };

        return createDQScore(components);
    } catch (error) {
        console.error('[DQ] Scoring failed, using heuristic fallback:', error);
        return scoreDQHeuristic(output, task);
    }
}

// ============================================================================
// HEURISTIC SCORING (Fast, no LLM)
// ============================================================================

/**
 * Fast heuristic-based DQ scoring without LLM call
 * Use when latency matters more than precision
 */
export function scoreDQHeuristic(output: string, task: AtomicTask): DQScore {
    const components = {
        validity: scoreValidity(output),
        specificity: scoreSpecificity(output),
        correctness: scoreCorrectness(output, task)
    };
    return createDQScore(components);
}

/**
 * Heuristic validity scoring
 * Checks for coherent structure and no obvious errors
 */
function scoreValidity(output: string): number {
    if (!output || output.length < 10) return 0;

    let score = 0.5; // Base score for non-empty output

    // Positive signals
    if (output.length > 50) score += 0.1;
    if (output.includes('\n') || output.includes('.')) score += 0.1; // Has structure
    if (/\d/.test(output)) score += 0.1; // Contains numbers (often specific)

    // Negative signals
    if (output.toLowerCase().includes('error')) score -= 0.1;
    if (output.toLowerCase().includes('cannot')) score -= 0.1;
    if (output.toLowerCase().includes('unable')) score -= 0.1;
    if (output.toLowerCase().includes('failed')) score -= 0.2;

    // Check for hedging language (less confident)
    const hedges = ['maybe', 'perhaps', 'might', 'could be', 'not sure'];
    if (hedges.some(h => output.toLowerCase().includes(h))) score -= 0.1;

    return Math.max(0, Math.min(1, score));
}

/**
 * Heuristic specificity scoring
 * Checks for concrete identifiers and actionable details
 */
function scoreSpecificity(output: string): number {
    let score = 0.3; // Base score

    // Code patterns (highly specific)
    if (/```[\s\S]*```/.test(output)) score += 0.3;
    if (/`[^`]+`/.test(output)) score += 0.1;

    // Version numbers
    if (/v?\d+\.\d+(\.\d+)?/.test(output)) score += 0.15;

    // File paths
    if (/[/\\][\w\-.]+[/\\]/.test(output)) score += 0.1;

    // URLs
    if (/https?:\/\//.test(output)) score += 0.1;

    // Commands
    if (/\$\s*\w+|npm |yarn |pip |git |docker /.test(output)) score += 0.15;

    // Specific identifiers (camelCase, snake_case, CONSTANTS)
    if (/[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*/.test(output)) score += 0.1; // camelCase
    if (/[a-z]+_[a-z]+/.test(output)) score += 0.05; // snake_case

    return Math.max(0, Math.min(1, score));
}

/**
 * Heuristic correctness scoring
 * Checks alignment between output and task
 */
function scoreCorrectness(output: string, task: AtomicTask): number {
    if (!output || !task.instruction) return 0.3;

    let score = 0.4; // Base score

    // Extract keywords from instruction
    const instructionWords = task.instruction
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3);

    // Check how many instruction keywords appear in output
    const outputLower = output.toLowerCase();
    let matchCount = 0;
    for (const word of instructionWords) {
        if (outputLower.includes(word)) matchCount++;
    }

    const matchRatio = instructionWords.length > 0
        ? matchCount / instructionWords.length
        : 0;
    score += matchRatio * 0.4;

    // Check if output addresses input context
    if (task.isolated_input) {
        const inputWords = task.isolated_input
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 10); // Sample first 10 words

        let inputMatchCount = 0;
        for (const word of inputWords) {
            if (outputLower.includes(word)) inputMatchCount++;
        }
        const inputMatchRatio = inputWords.length > 0
            ? inputMatchCount / inputWords.length
            : 0;
        score += inputMatchRatio * 0.2;
    }

    return Math.max(0, Math.min(1, score));
}

// ============================================================================
// BATCH SCORING
// ============================================================================

/**
 * Score multiple outputs and rank by DQ
 */
export async function rankByDQ(
    outputs: string[],
    task: AtomicTask,
    useLLM = false
): Promise<Array<{ output: string; dq: DQScore; rank: number }>> {
    const scored = await Promise.all(
        outputs.map(async (output) => ({
            output,
            dq: useLLM
                ? await scoreDQWithLLM(output, task)
                : scoreDQHeuristic(output, task)
        }))
    );

    return scored
        .sort((a, b) => b.dq.score - a.dq.score)
        .map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Get best output by DQ score
 */
export async function getBestByDQ(
    outputs: string[],
    task: AtomicTask,
    useLLM = false
): Promise<{ output: string; dq: DQScore } | null> {
    if (outputs.length === 0) return null;

    const ranked = await rankByDQ(outputs, task, useLLM);
    return ranked[0] || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    calculateDQ,
    isActionable,
    createDQScore,
    scoreDQWithLLM,
    scoreDQHeuristic,
    rankByDQ,
    getBestByDQ
};
