/**
 * Cognitive Precision Bridge (CPB) - Types
 *
 * Unifies LLM orchestration into a single precision-aware pipeline.
 *
 * The CPB pattern: COMPRESS → PRE-COMPUTE → PARALLEL EXPLORE → ACCUMULATE → RECONSTRUCT → VERIFY
 *
 * Based on:
 * - arXiv:2512.24601 (RLM) - Context externalization
 * - arXiv:2511.15755 (DQ) - Quality measurement
 * - arXiv:2508.17536 (Voting vs Debate) - Consensus strategies
 */

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
// PROVIDER ABSTRACTION
// ============================================================================

/**
 * Abstract provider interface - implement for your LLM provider
 */
export interface CPBProvider {
    name: string;
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    generateWithVision?(prompt: string, images: ImageInput[], options?: GenerateOptions): Promise<string>;
    isConfigured(): boolean;
}

export interface GenerateOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

// ============================================================================
// CPB CONFIGURATION
// ============================================================================

/**
 * CPB orchestrator configuration
 */
export interface CPBConfig {
    // Providers
    providers: {
        fast?: CPBProvider;      // For direct path
        balanced?: CPBProvider;  // For RLM/ACE paths
        deep?: CPBProvider;      // For cascade path
    };

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
        agentCount: number;
        enableAuction: boolean;
        enableHopGrouping: boolean;
    };
}

/**
 * Default CPB configuration - ELITE TIER
 * Optimized for maximum reasoning quality with Opus-first routing
 */
export const DEFAULT_CPB_CONFIG: Omit<CPBConfig, 'providers'> = {
    autoRoute: true,
    defaultPath: 'cascade',  // ELITE: Full pipeline by default

    contextThreshold: 100000,      // ELITE: Handle larger contexts (~25k tokens)
    complexityThreshold: 0.35,     // ELITE: Lower threshold → more consensus
    dqThreshold: 0.75,             // ELITE: Higher quality bar

    fastPathMs: 8000,              // ELITE: More time for quality
    standardPathMs: 45000,         // ELITE: Extended for deep reasoning
    hybridPathMs: 90000,           // ELITE: Full pipeline allowance

    enableVerification: true,
    enableLearning: true,
    retryOnLowDQ: true,

    rlmConfig: {
        maxIterations: 25,         // ELITE: Deeper decomposition
        rootModel: 'deep',         // ELITE: Opus for root synthesis
        subModel: 'balanced'       // ELITE: Sonnet for sub-tasks
    },
    aceConfig: {
        maxRounds: 18,             // ELITE: More consensus rounds
        agentCount: 5,             // ELITE: 5-agent ensemble
        enableAuction: true,
        enableHopGrouping: true
    }
};

/**
 * Standard tier configuration (for cost-conscious usage)
 */
export const STANDARD_CPB_CONFIG: Omit<CPBConfig, 'providers'> = {
    autoRoute: true,
    defaultPath: 'hybrid',
    contextThreshold: 50000,
    complexityThreshold: 0.5,
    dqThreshold: 0.6,
    fastPathMs: 5000,
    standardPathMs: 30000,
    hybridPathMs: 60000,
    enableVerification: true,
    enableLearning: true,
    retryOnLowDQ: true,
    rlmConfig: { maxIterations: 15, rootModel: 'fast', subModel: 'fast' },
    aceConfig: { maxRounds: 12, agentCount: 3, enableAuction: true, enableHopGrouping: true }
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
 * DQ (Decisional Quality) Score
 */
export interface DQScore {
    overall: number;      // 0-100
    validity: number;     // 40% weight - Is it logically sound?
    specificity: number;  // 30% weight - Is it actionable?
    correctness: number;  // 30% weight - Is it accurate?
    breakdown?: {
        reasoning?: string;
        gaps?: string[];
        strengths?: string[];
    };
}

/**
 * RLM (Recursive Language Model) Status
 */
export interface RLMStatus {
    phase: 'decomposing' | 'processing' | 'synthesizing';
    currentIteration: number;
    totalIterations: number;
    nodesProcessed: number;
    compressionRatio: number;
}

/**
 * RLM Result
 */
export interface RLMResult {
    output: string;
    compressionRatio: number;
    iterations: number;
    tokensProcessed: number;
    executionTimeMs: number;
}

/**
 * ACE (Adaptive Consensus Engine) Result
 */
export interface ACEResult {
    consensus: string;
    confidence: number;
    agreementLevel: number;
    rounds: number;
    agentVotes: Record<string, number>;
    dissent?: string[];
}

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
    path: CPBPath;
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
    base64: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
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
 * Model tier selection
 */
export type ModelTier = 'fast' | 'balanced' | 'deep' | 'auto';

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
    forceTier?: ModelTier;
    timeBudgetMs?: number;
    qualityTarget?: number;

    // Agent context (optional)
    agent?: {
        id: string;
        name: string;
        expertise?: string[];
    };
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

// ============================================================================
// STATUS CALLBACK
// ============================================================================

export type CPBStatusCallback = (status: CPBStatus) => void;
