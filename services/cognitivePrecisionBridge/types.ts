/**
 * Cognitive Precision Bridge (CPB) - Types
 *
 * Unifies RLM, ACE, and DQ scoring into a single precision-aware pipeline.
 *
 * The CPB pattern: COMPRESS → PRE-COMPUTE → PARALLEL EXPLORE → ACCUMULATE → RECONSTRUCT → VERIFY
 *
 * Based on:
 * - arXiv:2512.24601 (RLM) - Context externalization
 * - arXiv:2511.15755 (DQ) - Quality measurement
 * - arXiv:2508.17536 (Voting vs Debate) - Consensus strategies
 */

import type { AtomicTask, HiveAgent } from '../../types';
import type { DQScore, ComplexityProfile, ACEResult } from '../../types/domain/convergence';
import type { RLMResult, RLMStatus } from '../recursiveLanguageModel';

// ============================================================================
// EXECUTION PATH TYPES
// ============================================================================

/**
 * Available execution paths through the CPB
 */
export type CPBPath =
    | 'direct'     // Simple query, no CPB needed
    | 'rlm'        // Long context → RLM handles compression
    | 'ace'        // Multi-perspective → ACE consensus
    | 'hybrid'     // Complex → RLM for context, ACE for decision
    | 'cascade';   // Expert → Full pipeline with verification

/**
 * Characteristics that determine optimal path
 */
export interface PathSignals {
    contextLength: number;
    queryComplexity: number;
    requiresConsensus: boolean;
    requiresReasoning: boolean;
    hasGroundTruth: boolean;
    timeBudgetMs: number;
    qualityTarget: number; // 0-1 DQ threshold
}

// ============================================================================
// CPB CONFIGURATION
// ============================================================================

/**
 * CPB orchestrator configuration
 */
export interface CPBConfig {
    // Path selection
    autoRoute: boolean;
    defaultPath: CPBPath;

    // Thresholds
    contextThreshold: number;      // Chars above which RLM activates
    complexityThreshold: number;   // 0-1 score above which ACE activates
    dqThreshold: number;           // Minimum acceptable DQ score

    // Time budgets
    fastPathMs: number;            // Max time for direct path
    standardPathMs: number;        // Max time for single-engine path
    hybridPathMs: number;          // Max time for combined paths

    // Quality settings
    enableVerification: boolean;   // Run DQ verification pass
    enableLearning: boolean;       // Store patterns for learning
    retryOnLowDQ: boolean;         // Auto-retry if DQ below threshold

    // Engine configs
    rlmConfig: {
        maxIterations: number;
        rootModel: string;
        subModel: string;
    };
    aceConfig: {
        maxRounds: number;
        enableAuction: boolean;
        enableHopGrouping: boolean;
    };
}

/**
 * Default CPB configuration - ELITE TIER
 * Optimized for maximum reasoning quality with Opus-first routing
 */
export const DEFAULT_CPB_CONFIG: CPBConfig = {
    autoRoute: true,
    defaultPath: 'cascade',        // ELITE: Full pipeline by default

    contextThreshold: 100000,      // ELITE: Handle larger contexts (~25k tokens)
    complexityThreshold: 0.35,     // ELITE: Lower threshold → more consensus
    dqThreshold: 0.55,             // Lowered from 0.75 - real execution often scores 0.6-0.65

    fastPathMs: 8000,              // ELITE: More time for quality
    standardPathMs: 45000,         // ELITE: Extended for deep reasoning
    hybridPathMs: 90000,           // ELITE: Full pipeline allowance

    enableVerification: true,
    enableLearning: true,
    retryOnLowDQ: true,

    rlmConfig: {
        maxIterations: 25,         // ELITE: Deeper decomposition
        rootModel: 'gemini-2.0-flash',    // RLM uses Gemini API directly
        subModel: 'gemini-2.0-flash'     // RLM uses Gemini API directly
    },
    aceConfig: {
        maxRounds: 18,             // ELITE: More consensus rounds
        enableAuction: true,
        enableHopGrouping: true
    }
};

// ============================================================================
// CPB STATUS & RESULTS
// ============================================================================

/**
 * CPB execution phase
 */
export type CPBPhase =
    | 'idle'
    | 'analyzing'      // Determining optimal path
    | 'compressing'    // RLM context compression
    | 'exploring'      // Parallel exploration
    | 'converging'     // ACE consensus
    | 'verifying'      // DQ verification
    | 'reconstructing' // Final synthesis
    | 'complete'
    | 'error';

/**
 * Real-time status updates
 */
export interface CPBStatus {
    phase: CPBPhase;
    path: CPBPath;
    progress: number;           // 0-100%
    currentEngine: 'rlm' | 'ace' | 'dq' | null;
    engineStatus?: RLMStatus | {
        phase: string;
        votes: Record<string, number>;
        currentGap: number;
    };
    elapsedMs: number;
    estimatedRemainingMs: number;
    message?: string;
}

/**
 * Final CPB result
 */
export interface CPBResult {
    // Output
    output: string;
    confidence: number;         // 0-100

    // Execution metadata
    path: CPBPath;
    executionTimeMs: number;
    tokensUsed: number;

    // Quality metrics
    dqScore: DQScore;
    verified: boolean;
    retryCount: number;

    // Engine results
    rlmResult?: RLMResult;
    aceResult?: ACEResult;

    // Path analysis
    pathSignals: PathSignals;
    pathReasoning: string;

    // Learning
    patternStored: boolean;
}

// ============================================================================
// ROUTING DECISION
// ============================================================================

/**
 * Path selection decision with reasoning
 */
export interface RoutingDecision {
    selectedPath: CPBPath;
    signals: PathSignals;
    reasoning: string;
    confidence: number;
    alternatives: {
        path: CPBPath;
        score: number;
        tradeoff: string;
    }[];
}

// ============================================================================
// CPB REQUEST
// ============================================================================

/**
 * Multimodal content types
 */
export interface ImageInput {
    base64?: string;
    url?: string;
    mediaType?: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
    mimeType?: string;
    description?: string;
}

export interface MultimodalContent {
    text?: string;
    images?: ImageInput[];
    audio?: {
        base64: string;
        mimeType: string;
    };
}

/**
 * Model selection preferences
 */
export type ReasoningModel =
    | 'gemini-flash'      // Fast, good for simple tasks
    | 'gemini-2.0-flash'        // Balanced Gemini
    | 'claude-haiku'      // Fast Claude
    | 'claude-sonnet'     // Balanced Claude (default for balanced path)
    | 'claude-opus'       // Deep reasoning
    | 'auto';             // Let CPB decide

/**
 * Input request to CPB
 */
export interface CPBRequest {
    // Core request
    query: string;
    context?: string;

    // Multimodal inputs
    multimodal?: MultimodalContent;

    // Optional overrides
    forcePath?: CPBPath;
    forceModel?: ReasoningModel;
    agent?: HiveAgent;
    timeBudgetMs?: number;
    qualityTarget?: number;

    // Task metadata (for DQ scoring)
    task?: AtomicTask;
}

// ============================================================================
// CPB MEMORY
// ============================================================================

/**
 * Historical execution pattern
 */
export interface CPBPattern {
    id: string;
    queryHash: string;
    timestamp: number;

    // Request characteristics
    contextLength: number;
    queryComplexity: number;

    // Execution details
    path: CPBPath;
    executionTimeMs: number;
    tokensUsed: number;

    // Quality
    dqScore: number;
    verified: boolean;

    // Outcome
    success: boolean;
    retries: number;
}

/**
 * Learned routing preferences
 */
export interface LearnedRouting {
    domain: string;
    preferredPath: CPBPath;
    avgDQ: number;
    avgTime: number;
    sampleCount: number;
    confidence: number;
}
