/**
 * Complexity Estimator Module
 *
 * Provides adaptive thresholds for consensus engine based on task complexity.
 * Simple tasks get fewer rounds, complex tasks get more.
 */

import { AtomicTask } from '../types';
import {
    ComplexityProfile,
    TaskComplexity,
    OptimalThresholds
} from '../types/domain/convergence';

// ============================================================================
// COMPLEXITY THRESHOLDS
// ============================================================================

const COMPLEXITY_THRESHOLDS: Record<TaskComplexity, {
    tokenMax: number;
    rounds: number;
    gap: number;
}> = {
    simple: { tokenMax: 100, rounds: 3, gap: 2 },
    moderate: { tokenMax: 500, rounds: 7, gap: 3 },
    complex: { tokenMax: 2000, rounds: 12, gap: 4 },
    expert: { tokenMax: Infinity, rounds: 15, gap: 5 }
};

// Domain keywords for classification
const DOMAIN_KEYWORDS: Record<string, string[]> = {
    code: ['function', 'class', 'import', 'export', 'const', 'let', 'var', 'return', 'async', 'await', 'typescript', 'javascript', 'python', 'react', 'component'],
    architecture: ['system', 'design', 'pattern', 'architecture', 'microservice', 'api', 'database', 'schema', 'infrastructure'],
    analysis: ['analyze', 'review', 'evaluate', 'assess', 'compare', 'benchmark', 'metrics', 'performance'],
    creative: ['generate', 'create', 'write', 'draft', 'compose', 'design', 'brainstorm', 'ideate'],
    research: ['research', 'investigate', 'explore', 'find', 'search', 'discover', 'study'],
    debug: ['fix', 'debug', 'error', 'bug', 'issue', 'problem', 'troubleshoot', 'diagnose'],
    refactor: ['refactor', 'optimize', 'improve', 'clean', 'simplify', 'restructure']
};

// ============================================================================
// CORE ESTIMATION FUNCTIONS
// ============================================================================

/**
 * Estimate task complexity and return appropriate thresholds
 */
export function estimateComplexity(task: AtomicTask): ComplexityProfile {
    const tokenEstimate = estimateTokens(task);
    const taskType = classifyComplexity(tokenEstimate, task);
    const domain = detectDomain(task);
    const thresholds = COMPLEXITY_THRESHOLDS[taskType];

    return {
        tokenEstimate,
        taskType,
        suggestedRounds: thresholds.rounds,
        suggestedGap: thresholds.gap,
        domain
    };
}

/**
 * Estimate token count for a task
 * Rough approximation: ~4 chars per token for English text
 */
export function estimateTokens(task: AtomicTask): number {
    const instructionTokens = Math.ceil(task.instruction.length / 4);
    const inputTokens = Math.ceil(task.isolated_input.length / 4);

    // Weight instruction more heavily (it's more important for complexity)
    return instructionTokens * 1.5 + inputTokens;
}

/**
 * Classify complexity based on tokens and content analysis
 */
export function classifyComplexity(tokens: number, task: AtomicTask): TaskComplexity {
    // Base classification on tokens
    let baseComplexity: TaskComplexity;

    if (tokens < COMPLEXITY_THRESHOLDS.simple.tokenMax) {
        baseComplexity = 'simple';
    } else if (tokens < COMPLEXITY_THRESHOLDS.moderate.tokenMax) {
        baseComplexity = 'moderate';
    } else if (tokens < COMPLEXITY_THRESHOLDS.complex.tokenMax) {
        baseComplexity = 'complex';
    } else {
        baseComplexity = 'expert';
    }

    // Adjust based on content signals
    const adjustedComplexity = adjustForContent(baseComplexity, task);

    return adjustedComplexity;
}

/**
 * Adjust complexity based on content signals
 */
function adjustForContent(base: TaskComplexity, task: AtomicTask): TaskComplexity {
    const text = (task.instruction + ' ' + task.isolated_input).toLowerCase();

    const complexityLevels: TaskComplexity[] = ['simple', 'moderate', 'complex', 'expert'];
    let currentIndex = complexityLevels.indexOf(base);

    // Signals that increase complexity
    const complexSignals = [
        /multi-?step/i,
        /comprehensive/i,
        /thorough/i,
        /all\s+(aspects|cases|scenarios)/i,
        /edge\s*cases/i,
        /architecture/i,
        /security/i,
        /production/i,
        /enterprise/i
    ];

    for (const signal of complexSignals) {
        if (signal.test(text)) {
            currentIndex = Math.min(currentIndex + 1, complexityLevels.length - 1);
            break; // Only bump once
        }
    }

    // Signals that decrease complexity
    const simpleSignals = [
        /simple/i,
        /quick/i,
        /just/i,
        /only/i,
        /basic/i,
        /straightforward/i
    ];

    for (const signal of simpleSignals) {
        if (signal.test(text)) {
            currentIndex = Math.max(currentIndex - 1, 0);
            break; // Only drop once
        }
    }

    return complexityLevels[currentIndex];
}

/**
 * Detect primary domain of task
 */
export function detectDomain(task: AtomicTask): string {
    const text = (task.instruction + ' ' + task.isolated_input).toLowerCase();

    let bestDomain = 'general';
    let bestScore = 0;

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                score++;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestDomain = domain;
        }
    }

    return bestDomain;
}

// ============================================================================
// ADAPTIVE THRESHOLD FUNCTIONS
// ============================================================================

/**
 * Get thresholds adapted by historical patterns
 * Falls back to estimation if no history
 */
export function getAdaptiveThresholds(
    task: AtomicTask,
    historicalThresholds?: OptimalThresholds
): { gap: number; rounds: number } {
    const estimation = estimateComplexity(task);

    if (historicalThresholds && historicalThresholds.confidence > 0.7) {
        // Blend historical with estimation (60% historical, 40% estimation)
        return {
            gap: Math.round(
                historicalThresholds.gap * 0.6 +
                estimation.suggestedGap * 0.4
            ),
            rounds: Math.round(
                historicalThresholds.rounds * 0.6 +
                estimation.suggestedRounds * 0.4
            )
        };
    }

    // No reliable history, use estimation
    return {
        gap: estimation.suggestedGap,
        rounds: estimation.suggestedRounds
    };
}

/**
 * Check if task should skip voting entirely (trivially simple)
 */
export function shouldSkipVoting(task: AtomicTask): boolean {
    const tokens = estimateTokens(task);
    const text = task.instruction.toLowerCase();

    // Very short AND contains simplicity signals
    if (tokens < 50 && /^(what|how|why|when|where|who)\s/.test(text)) {
        return true;
    }

    // Single word/phrase answers expected
    if (/^(name|list|identify|which|what is)\s/i.test(text) && tokens < 30) {
        return true;
    }

    return false;
}

/**
 * Estimate time to converge (rough, for UI feedback)
 */
export function estimateConvergenceTime(complexity: ComplexityProfile): {
    minMs: number;
    maxMs: number;
    avgMs: number;
} {
    // Base: ~200ms per round + 500ms LLM latency
    const roundTimeMs = 700;

    // Simple might converge in 1-2 rounds, expert might take all rounds
    const roundMultiplier: Record<TaskComplexity, { min: number; avg: number }> = {
        simple: { min: 1, avg: 1.5 },
        moderate: { min: 2, avg: 4 },
        complex: { min: 4, avg: 8 },
        expert: { min: 6, avg: 12 }
    };

    const multiplier = roundMultiplier[complexity.taskType];

    return {
        minMs: multiplier.min * roundTimeMs,
        maxMs: complexity.suggestedRounds * roundTimeMs,
        avgMs: multiplier.avg * roundTimeMs
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    estimateComplexity,
    estimateTokens,
    classifyComplexity,
    detectDomain,
    getAdaptiveThresholds,
    shouldSkipVoting,
    estimateConvergenceTime
};
