/**
 * Adaptive Convergence Engine (ACE) Types
 * Based on research from arXiv:2511.15755 (MyAntFarm.ai), arXiv:2511.13193 (DALA)
 */

// ============================================================================
// DECISION QUALITY (DQ) SCORING
// ============================================================================

export interface DecisionQuality {
    /** Technical feasibility (0-1) - Does the output make sense? */
    validity: number;
    /** Concrete identifiers present (0-1) - Versions, commands, specific values? */
    specificity: number;
    /** Alignment with task requirements (0-1) - Does it solve the problem? */
    correctness: number;
}

export interface DQScore {
    /** Weighted composite score (0-1) */
    score: number;
    /** Component breakdown */
    components: DecisionQuality;
    /** Whether score exceeds actionability threshold (>0.5) */
    isActionable: boolean;
    /** Timestamp of scoring */
    timestamp: number;
}

// ============================================================================
// COMPLEXITY ESTIMATION
// ============================================================================

export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'expert';

export interface ComplexityProfile {
    /** Estimated token count */
    tokenEstimate: number;
    /** Classified complexity level */
    taskType: TaskComplexity;
    /** Recommended max voting rounds */
    suggestedRounds: number;
    /** Recommended convergence gap threshold */
    suggestedGap: number;
    /** Domain classification for agent matching */
    domain?: string;
}

// ============================================================================
// AGENT AUCTION (DALA-inspired)
// ============================================================================

export interface AgentBid {
    /** Agent identifier */
    agentId: string;
    /** Agent's self-assessed relevance to task (0-1) */
    confidence: number;
    /** Domain expertise alignment score (0-1) */
    expertiseMatch: number;
    /** Token budget willing to spend */
    tokenBudget: number;
    /** Reasoning for participation */
    rationale?: string;
}

export interface AuctionResult {
    /** Selected agent IDs in priority order */
    selectedAgents: string[];
    /** All bids received */
    allBids: AgentBid[];
    /** Auction duration in ms */
    auctionDuration: number;
    /** Whether fast-track was used (skip auction for simple tasks) */
    fastTracked: boolean;
}

// ============================================================================
// CONVERGENCE MEMORY (Learning from History)
// ============================================================================

export interface ConvergencePattern {
    /** Hash of task instruction for deduplication */
    taskHash: string;
    /** Complexity classification */
    taskType: TaskComplexity;
    /** Domain/category of task */
    domain: string;
    /** Actual rounds used to converge */
    roundsUsed: number;
    /** Final gap achieved */
    gapAchieved: number;
    /** Final DQ score */
    dqScore: number;
    /** Agents that contributed to winning answer */
    winningAgents: string[];
    /** Token count consumed */
    tokensUsed: number;
    /** Convergence timestamp */
    timestamp: number;
    /** Number of hop groups formed (HRPO) */
    hopGroupCount?: number;
    /** Cohesion of winning hop group (HRPO) */
    winningGroupCohesion?: number;
}

// ============================================================================
// HOP GROUPING (HRPO - Hop-grouped Response Processing)
// ============================================================================

export interface HopGroup {
    /** Unique identifier for this group */
    id: string;
    /** Canonical answer representing this group */
    representativeAnswer: string;
    /** All answers clustered into this group */
    memberAnswers: string[];
    /** Agents that contributed to this group */
    agentContributors: string[];
    /** Combined voting strength (sum of member votes) */
    votingStrength: number;
    /** DQ score for the representative answer */
    dqScore?: DQScore;
    /** Internal cohesion (0-1): how similar the members are */
    cohesion: number;
}

export interface HopGroupingResult {
    /** All groups formed by clustering */
    groups: HopGroup[];
    /** The group with highest voting strength */
    winningGroup: HopGroup;
    /** Clustering method used */
    method: 'levenshtein' | 'embedding' | 'llm';
    /** Time spent on grouping in ms */
    groupingDuration: number;
}

export interface OptimalThresholds {
    /** Recommended gap threshold based on history */
    gap: number;
    /** Recommended max rounds based on history */
    rounds: number;
    /** Confidence in recommendation (0-1) */
    confidence: number;
    /** Number of historical samples used */
    sampleCount: number;
}

// ============================================================================
// ADAPTIVE CONSENSUS ENGINE (ACE)
// ============================================================================

export interface ACEConfig {
    /** Enable adaptive thresholds (vs fixed) */
    adaptiveThresholds: boolean;
    /** Enable agent auction (vs all agents) */
    enableAuction: boolean;
    /** Enable DQ scoring */
    enableDQScoring: boolean;
    /** Enable pattern learning */
    enableLearning: boolean;
    /** Minimum agents to participate (even if auction selects fewer) */
    minAgents: number;
    /** Maximum agents to participate */
    maxAgents: number;
    /** DQ weights */
    dqWeights: {
        validity: number;
        specificity: number;
        correctness: number;
    };
    /** Enable hop grouping for expert tasks (HRPO) */
    enableHopGrouping: boolean;
    /** Minimum votes before hop grouping activates */
    hopMinVotes: number;
    /** Maximum number of hop groups to form */
    hopMaxGroups: number;
    /** Similarity threshold for grouping (0-1) */
    hopSimilarityThreshold: number;
}

export interface ACEStatus extends SwarmStatusExtended {
    /** Current phase of ACE */
    phase: 'estimating' | 'auctioning' | 'voting' | 'scoring' | 'complete';
    /** Complexity profile */
    complexity?: ComplexityProfile;
    /** Auction result (if enabled) */
    auctionResult?: AuctionResult;
    /** Current DQ score (if enabled) */
    currentDQ?: DQScore;
}

export interface SwarmStatusExtended {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
    consensusProgress?: number;
    activeDNA?: string;
    /** Participating agent IDs */
    participatingAgents?: string[];
    /** Estimated rounds remaining */
    estimatedRoundsRemaining?: number;
}

export interface ACEResult {
    /** Base swarm result */
    taskId: string;
    output: string;
    confidence: number;
    agentId: string;
    executionTime: number;
    voteLedger: VoteLedgerExtended;
    /** DQ score (if enabled) */
    dqScore?: DQScore;
    /** Complexity used */
    complexity?: ComplexityProfile;
    /** Auction result (if enabled) */
    auctionResult?: AuctionResult;
    /** Whether pattern was stored */
    patternStored?: boolean;
    /** Hop grouping result (HRPO, expert tasks only) */
    hopGroupingResult?: HopGroupingResult;
}

export interface VoteLedgerExtended {
    winner: string;
    count: number;
    runnerUp: string;
    runnerUpCount: number;
    totalRounds: number;
    killedAgents: number;
    /** Agents that participated */
    participatingAgents?: string[];
    /** Whether adaptive thresholds were used */
    adaptiveThresholds?: boolean;
    /** Original suggested rounds (before adaptation) */
    suggestedRounds?: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_ACE_CONFIG: ACEConfig = {
    adaptiveThresholds: true,
    enableAuction: true,
    enableDQScoring: true,
    enableLearning: true,
    minAgents: 2,
    maxAgents: 5,
    dqWeights: {
        validity: 0.4,
        specificity: 0.3,
        correctness: 0.3
    },
    enableHopGrouping: true,
    hopMinVotes: 4,
    hopMaxGroups: 5,
    hopSimilarityThreshold: 0.6
};
