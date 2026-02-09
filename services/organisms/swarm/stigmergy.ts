/**
 * StigmergicEnvironment - US-008
 *
 * Implements implicit agent coordination through shared environmental state,
 * inspired by stigmergic communication in biological swarms (ant pheromone trails).
 *
 * Three signal types for emergent coordination:
 * - Vote Ledger (pheromone trails): Agent votes with confidence and decay
 * - DQ Traces (quality signals): Context-DQ score mappings for routing priors
 * - Pattern Memory (learned behaviors): Successful patterns with frequency tracking
 *
 * Key features:
 * - Exponential signal decay: strength *= e^(-lambda * t)
 * - Convergence detection via signal strength thresholds
 * - Stigmergic priors for task routing decisions
 * - Consensus recording for reinforcement learning
 *
 * Research basis:
 * - arXiv:2506.15672 (SwarmAgentic) - Stigmergic coordination patterns
 * - arXiv:2511.15755 (DQ Scoring) - Quality-based routing signals
 * - arXiv:2512.23880 (CASCADE) - Pattern-based skill routing
 */

import type {
  OrganismTask,
  DQScore,
  SubsystemType,
} from '../../archon/types';

import { logger } from '../../logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Base signal type for all stigmergic signals.
 */
export type SignalType = 'vote' | 'dq_trace' | 'pattern';

/**
 * Base stigmergic signal interface.
 */
export interface StigmergicSignal {
  /** Unique signal identifier */
  id: string;

  /** Signal type discriminator */
  type: SignalType;

  /** Signal strength (0-1), decays over time */
  strength: number;

  /** Creation timestamp */
  timestamp: number;

  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Vote signal - records agent voting decisions (pheromone trails).
 *
 * Used for implicit coordination through voting patterns:
 * - Agents deposit votes for task-subsystem assignments
 * - Vote strength decays over time (relevance window)
 * - Convergence emerges when multiple agents vote similarly
 */
export interface VoteSignal extends StigmergicSignal {
  type: 'vote';

  /** Agent that deposited the vote */
  agentId: string;

  /** Task being voted on */
  taskId: string;

  /** The vote value (typically subsystem or action) */
  vote: string;

  /** Confidence in the vote (0-1) */
  confidence: number;

  /** Optional context hash for similarity matching */
  contextHash?: string;
}

/**
 * DQ Trace signal - records context-quality mappings.
 *
 * Provides routing priors based on historical outcomes:
 * - Maps context hashes to observed DQ scores
 * - Subsystem attribution for routing decisions
 * - Decays to allow adaptation to changing conditions
 */
export interface DQTraceSignal extends StigmergicSignal {
  type: 'dq_trace';

  /** Hash of the execution context */
  contextHash: string;

  /** Observed DQ score */
  dqScore: number;

  /** Full DQ score components */
  dqComponents?: {
    validity: number;
    specificity: number;
    correctness: number;
  };

  /** Subsystem that produced the result */
  subsystem: SubsystemType;

  /** Task intent for similarity matching */
  intentHash?: string;
}

/**
 * Pattern signal - records successful behavior patterns.
 *
 * Enables emergence of learned behaviors:
 * - Captures context-outcome pairs
 * - Frequency tracking for pattern confidence
 * - Supports pattern reinforcement and forgetting
 */
export interface PatternSignal extends StigmergicSignal {
  type: 'pattern';

  /** Unique pattern identifier */
  patternId: string;

  /** Pattern trigger context */
  context: PatternContext;

  /** Pattern outcome */
  outcome: PatternOutcome;

  /** Observation frequency (reinforces confidence) */
  frequency: number;

  /** Success rate for this pattern */
  successRate: number;
}

/**
 * Pattern context - conditions that trigger a pattern.
 */
export interface PatternContext {
  /** Intent keywords */
  intentKeywords: string[];

  /** Task priority level */
  priority?: string;

  /** Biometric context (stress, focus) */
  biometricRange?: {
    stressMin?: number;
    stressMax?: number;
    focusMin?: number;
    focusMax?: number;
  };

  /** Time-of-day pattern */
  timeRange?: {
    hourStart?: number;
    hourEnd?: number;
  };
}

/**
 * Pattern outcome - result of a pattern execution.
 */
export interface PatternOutcome {
  /** Recommended subsystem */
  subsystem: SubsystemType;

  /** Expected DQ score */
  expectedDqScore: number;

  /** Expected latency (ms) */
  expectedLatency: number;

  /** Action sequence */
  actions?: string[];
}

/**
 * Query for retrieving signals.
 */
export interface SignalQuery {
  /** Filter by signal type */
  type?: SignalType;

  /** Filter by minimum strength */
  minStrength?: number;

  /** Filter by maximum age (ms) */
  maxAge?: number;

  /** Filter by task ID (votes) */
  taskId?: string;

  /** Filter by agent ID (votes) */
  agentId?: string;

  /** Filter by context hash (traces) */
  contextHash?: string;

  /** Filter by subsystem (traces) */
  subsystem?: SubsystemType;

  /** Filter by pattern ID */
  patternId?: string;

  /** Maximum results to return */
  limit?: number;
}

/**
 * Stigmergic prior - derived routing guidance from signals.
 */
export interface StigmergicPrior {
  /** Recommended subsystem */
  subsystem: SubsystemType;

  /** Prior probability (0-1) */
  probability: number;

  /** Confidence in the prior (0-1) */
  confidence: number;

  /** Contributing signals */
  sources: {
    votes: number;
    traces: number;
    patterns: number;
  };

  /** Expected DQ score based on historical data */
  expectedDqScore?: number;

  /** Supporting evidence */
  evidence: string[];
}

/**
 * Consensus result from voting or execution.
 */
export interface ConsensusResult {
  /** Task ID */
  taskId: string;

  /** Winning vote */
  decision: string;

  /** Subsystem used */
  subsystem: SubsystemType;

  /** Vote distribution */
  votes: Map<string, number>;

  /** Achieved DQ score */
  dqScore: DQScore;

  /** Execution success */
  success: boolean;

  /** Execution latency (ms) */
  latencyMs: number;

  /** Contributing agent IDs */
  participants: string[];

  /** Timestamp */
  timestamp: number;
}

/**
 * Convergence detection result.
 */
export interface ConvergenceResult {
  /** Whether convergence was detected */
  converged: boolean;

  /** Dominant signal/vote if converged */
  dominant?: string;

  /** Strength of dominant signal */
  dominantStrength?: number;

  /** Distribution of signal strengths */
  distribution: Map<string, number>;

  /** Iterations/cycles until convergence */
  cycles: number;

  /** Convergence margin (dominant - second) */
  margin?: number;
}

/**
 * Configuration for stigmergic environment.
 */
export interface StigmergicConfig {
  /** Decay rate (lambda) for exponential decay */
  decayRate: number;

  /** Decay interval in milliseconds */
  decayIntervalMs: number;

  /** Convergence threshold (0-1) */
  convergenceThreshold: number;

  /** Minimum signal strength before removal */
  minSignalStrength: number;

  /** Maximum signals to store per type */
  maxSignalsPerType: number;

  /** Weight for vote signals in prior computation */
  voteWeight: number;

  /** Weight for DQ trace signals */
  traceWeight: number;

  /** Weight for pattern signals */
  patternWeight: number;

  /** Enable automatic decay cycle */
  autoDecay: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: StigmergicConfig = {
  decayRate: 0.001,           // lambda for e^(-lambda * t)
  decayIntervalMs: 60000,     // Run decay every minute
  convergenceThreshold: 0.7,  // 70% strength for convergence
  minSignalStrength: 0.01,    // Remove signals below 1%
  maxSignalsPerType: 1000,    // Limit per signal type
  voteWeight: 0.4,            // 40% weight for votes
  traceWeight: 0.35,          // 35% weight for DQ traces
  patternWeight: 0.25,        // 25% weight for patterns
  autoDecay: true,            // Enable automatic decay
};

// =============================================================================
// STIGMERGIC ENVIRONMENT CLASS
// =============================================================================

/**
 * StigmergicEnvironment provides implicit agent coordination through
 * shared environmental state with decay and convergence detection.
 */
export class StigmergicEnvironment {
  private static instance: StigmergicEnvironment | null = null;

  // Signal storage
  private voteSignals: Map<string, VoteSignal> = new Map();
  private dqTraces: Map<string, DQTraceSignal> = new Map();
  private patternSignals: Map<string, PatternSignal> = new Map();

  // Configuration
  private config: StigmergicConfig;

  // Decay timer
  private decayTimer: ReturnType<typeof setInterval> | null = null;

  // Metrics
  private metrics = {
    signalsDeposited: 0,
    signalsDecayed: 0,
    signalsRemoved: 0,
    convergenceDetections: 0,
    consensusRecorded: 0,
    priorQueries: 0,
    lastDecayCycle: 0,
  };

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<StigmergicConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoDecay) {
      this.startDecayCycle();
    }
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<StigmergicConfig>): StigmergicEnvironment {
    if (!StigmergicEnvironment.instance) {
      StigmergicEnvironment.instance = new StigmergicEnvironment(config);
    }
    return StigmergicEnvironment.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    if (StigmergicEnvironment.instance) {
      StigmergicEnvironment.instance.shutdown();
    }
    StigmergicEnvironment.instance = null;
  }

  // ---------------------------------------------------------------------------
  // Signal Deposit
  // ---------------------------------------------------------------------------

  /**
   * Deposit a stigmergic signal into the environment.
   *
   * @param signal - The signal to deposit
   */
  depositSignal(signal: StigmergicSignal): void {
    const now = Date.now();

    // Ensure signal has proper timestamps
    const enrichedSignal = {
      ...signal,
      timestamp: signal.timestamp || now,
      lastUpdated: now,
      strength: Math.min(1, Math.max(0, signal.strength)),
    };

    switch (signal.type) {
      case 'vote':
        this.depositVoteSignal(enrichedSignal as VoteSignal);
        break;
      case 'dq_trace':
        this.depositDQTraceSignal(enrichedSignal as DQTraceSignal);
        break;
      case 'pattern':
        this.depositPatternSignal(enrichedSignal as PatternSignal);
        break;
      default:
        logger.warn(`Unknown signal type: ${(signal as StigmergicSignal).type}`, undefined, 'Stigmergy');
        return;
    }

    this.metrics.signalsDeposited++;
  }

  private depositVoteSignal(signal: VoteSignal): void {
    // Check for existing vote from same agent for same task
    const existingKey = `${signal.agentId}:${signal.taskId}:${signal.vote}`;
    const existing = this.voteSignals.get(existingKey);

    if (existing) {
      // Reinforce existing vote
      existing.strength = Math.min(1, existing.strength + signal.strength * 0.5);
      existing.confidence = Math.max(existing.confidence, signal.confidence);
      existing.lastUpdated = signal.lastUpdated;
    } else {
      // Store new vote
      this.voteSignals.set(signal.id || existingKey, signal);
      this.enforceLimit(this.voteSignals);
    }
  }

  private depositDQTraceSignal(signal: DQTraceSignal): void {
    // Key by context hash and subsystem
    const key = `${signal.contextHash}:${signal.subsystem}`;
    const existing = this.dqTraces.get(key);

    if (existing) {
      // Update with exponential moving average
      const alpha = 0.3; // Learning rate
      existing.dqScore = existing.dqScore * (1 - alpha) + signal.dqScore * alpha;
      existing.strength = Math.min(1, existing.strength + 0.1);
      existing.lastUpdated = signal.lastUpdated;

      if (signal.dqComponents && existing.dqComponents) {
        existing.dqComponents.validity =
          existing.dqComponents.validity * (1 - alpha) + signal.dqComponents.validity * alpha;
        existing.dqComponents.specificity =
          existing.dqComponents.specificity * (1 - alpha) + signal.dqComponents.specificity * alpha;
        existing.dqComponents.correctness =
          existing.dqComponents.correctness * (1 - alpha) + signal.dqComponents.correctness * alpha;
      }
    } else {
      this.dqTraces.set(signal.id || key, signal);
      this.enforceLimit(this.dqTraces);
    }
  }

  private depositPatternSignal(signal: PatternSignal): void {
    const key = signal.patternId;
    const existing = this.patternSignals.get(key);

    if (existing) {
      // Reinforce pattern
      existing.frequency++;
      existing.strength = Math.min(1, existing.strength + 0.15);

      // Update success rate with running average
      const totalObs = existing.frequency;
      existing.successRate =
        (existing.successRate * (totalObs - 1) + signal.successRate) / totalObs;

      existing.lastUpdated = signal.lastUpdated;
    } else {
      this.patternSignals.set(signal.id || key, signal);
      this.enforceLimit(this.patternSignals);
    }
  }

  private enforceLimit<T extends StigmergicSignal>(storage: Map<string, T>): void {
    if (storage.size > this.config.maxSignalsPerType) {
      // Remove weakest signals
      const entries = Array.from(storage.entries())
        .sort((a, b) => a[1].strength - b[1].strength);

      const toRemove = entries.slice(0, storage.size - this.config.maxSignalsPerType + 100);
      for (const [key] of toRemove) {
        storage.delete(key);
        this.metrics.signalsRemoved++;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Signal Reading
  // ---------------------------------------------------------------------------

  /**
   * Read signals matching a query.
   *
   * @param query - Query parameters
   * @returns Matching signals
   */
  readSignals(query: SignalQuery): StigmergicSignal[] {
    const results: StigmergicSignal[] = [];
    const now = Date.now();

    // Helper to check common filters
    const matchesCommonFilters = (signal: StigmergicSignal): boolean => {
      if (query.minStrength !== undefined && signal.strength < query.minStrength) {
        return false;
      }
      if (query.maxAge !== undefined && (now - signal.timestamp) > query.maxAge) {
        return false;
      }
      return true;
    };

    // Collect votes
    if (!query.type || query.type === 'vote') {
      for (const signal of this.voteSignals.values()) {
        if (!matchesCommonFilters(signal)) continue;
        if (query.taskId && signal.taskId !== query.taskId) continue;
        if (query.agentId && signal.agentId !== query.agentId) continue;
        results.push(signal);
      }
    }

    // Collect DQ traces
    if (!query.type || query.type === 'dq_trace') {
      for (const signal of this.dqTraces.values()) {
        if (!matchesCommonFilters(signal)) continue;
        if (query.contextHash && signal.contextHash !== query.contextHash) continue;
        if (query.subsystem && signal.subsystem !== query.subsystem) continue;
        results.push(signal);
      }
    }

    // Collect patterns
    if (!query.type || query.type === 'pattern') {
      for (const signal of this.patternSignals.values()) {
        if (!matchesCommonFilters(signal)) continue;
        if (query.patternId && signal.patternId !== query.patternId) continue;
        results.push(signal);
      }
    }

    // Sort by strength (descending) and apply limit
    results.sort((a, b) => b.strength - a.strength);

    if (query.limit && results.length > query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Stigmergic Priors
  // ---------------------------------------------------------------------------

  /**
   * Get relevant stigmergic traces for a task to inform routing decisions.
   *
   * Computes priors by:
   * 1. Matching task context to stored signals
   * 2. Weighting by signal type (votes, traces, patterns)
   * 3. Aggregating into subsystem recommendations
   *
   * @param task - The task to get priors for
   * @returns Array of stigmergic priors sorted by probability
   */
  getRelevantTraces(task: OrganismTask): StigmergicPrior[] {
    this.metrics.priorQueries++;

    const contextHash = this.computeContextHash(task);
    const intentKeywords = this.extractKeywords(task.intent);

    // Aggregate scores per subsystem
    const subsystemScores = new Map<SubsystemType, {
      score: number;
      confidence: number;
      voteSources: number;
      traceSources: number;
      patternSources: number;
      evidence: string[];
      expectedDq: number[];
    }>();

    const initSubsystem = (subsystem: SubsystemType) => {
      if (!subsystemScores.has(subsystem)) {
        subsystemScores.set(subsystem, {
          score: 0,
          confidence: 0,
          voteSources: 0,
          traceSources: 0,
          patternSources: 0,
          evidence: [],
          expectedDq: [],
        });
      }
      return subsystemScores.get(subsystem)!;
    };

    // Process votes (look for task-specific or similar context votes)
    for (const vote of this.voteSignals.values()) {
      if (vote.strength < this.config.minSignalStrength) continue;

      // Check relevance
      const isRelevant = vote.taskId === task.id ||
        (vote.contextHash && this.contextSimilarity(vote.contextHash, contextHash) > 0.5);

      if (isRelevant) {
        // Parse vote as subsystem if applicable
        const subsystem = this.parseSubsystem(vote.vote);
        if (subsystem) {
          const entry = initSubsystem(subsystem);
          const contribution = vote.strength * vote.confidence * this.config.voteWeight;
          entry.score += contribution;
          entry.confidence = Math.max(entry.confidence, vote.confidence);
          entry.voteSources++;
          entry.evidence.push(`Vote from ${vote.agentId}: ${vote.vote} (${(vote.confidence * 100).toFixed(0)}%)`);
        }
      }
    }

    // Process DQ traces (context similarity matching)
    for (const trace of this.dqTraces.values()) {
      if (trace.strength < this.config.minSignalStrength) continue;

      const similarity = this.contextSimilarity(trace.contextHash, contextHash);
      if (similarity > 0.3) {
        const entry = initSubsystem(trace.subsystem);
        const contribution = trace.strength * similarity * trace.dqScore * this.config.traceWeight;
        entry.score += contribution;
        entry.traceSources++;
        entry.expectedDq.push(trace.dqScore);
        entry.evidence.push(`DQ trace: ${trace.subsystem} scored ${(trace.dqScore * 100).toFixed(0)}% (${(similarity * 100).toFixed(0)}% similar)`);
      }
    }

    // Process patterns (context matching)
    for (const pattern of this.patternSignals.values()) {
      if (pattern.strength < this.config.minSignalStrength) continue;

      const matchScore = this.matchPatternContext(pattern.context, task, intentKeywords);
      if (matchScore > 0.4) {
        const entry = initSubsystem(pattern.outcome.subsystem);
        const contribution = pattern.strength * matchScore * pattern.successRate * this.config.patternWeight;
        entry.score += contribution;
        entry.confidence = Math.max(entry.confidence, pattern.successRate);
        entry.patternSources++;
        entry.expectedDq.push(pattern.outcome.expectedDqScore);
        entry.evidence.push(`Pattern ${pattern.patternId}: ${(pattern.successRate * 100).toFixed(0)}% success rate`);
      }
    }

    // Convert to priors
    const priors: StigmergicPrior[] = [];
    const totalScore = Array.from(subsystemScores.values())
      .reduce((sum, s) => sum + s.score, 0) || 1;

    for (const [subsystem, data] of subsystemScores.entries()) {
      if (data.score === 0) continue;

      priors.push({
        subsystem,
        probability: data.score / totalScore,
        confidence: data.confidence,
        sources: {
          votes: data.voteSources,
          traces: data.traceSources,
          patterns: data.patternSources,
        },
        expectedDqScore: data.expectedDq.length > 0
          ? data.expectedDq.reduce((a, b) => a + b, 0) / data.expectedDq.length
          : undefined,
        evidence: data.evidence,
      });
    }

    // Sort by probability (descending)
    priors.sort((a, b) => b.probability - a.probability);

    return priors;
  }

  private computeContextHash(task: OrganismTask): string {
    // Simple hash combining intent keywords and priority
    const keywords = this.extractKeywords(task.intent).sort().join('|');
    const priority = task.priority || 'normal';
    const contextPages = task.contextPages?.slice(0, 3).join('|') || '';

    // Simple string hash
    const str = `${keywords}:${priority}:${contextPages}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `ctx_${Math.abs(hash).toString(16)}`;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'this', 'that', 'these', 'those', 'it', 'its', 'and', 'or'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private contextSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;

    // Simple character-based similarity for hashes
    const chars1 = new Set(hash1);
    const chars2 = new Set(hash2);
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);

    return intersection.size / union.size;
  }

  private parseSubsystem(vote: string): SubsystemType | null {
    const subsystems: SubsystemType[] = [
      'ace', 'dq', 'dream', 'evolution', 'kernel', 'voice', 'cpb',
      'genome', 'swarm', 'cognitive'
    ];

    const lower = vote.toLowerCase();
    return subsystems.find(s => lower.includes(s)) || null;
  }

  private matchPatternContext(
    context: PatternContext,
    task: OrganismTask,
    intentKeywords: string[]
  ): number {
    let matchScore = 0;
    let factors = 0;

    // Keyword match
    if (context.intentKeywords?.length > 0) {
      factors++;
      const contextKeywords = new Set(context.intentKeywords.map(k => k.toLowerCase()));
      const matches = intentKeywords.filter(k => contextKeywords.has(k)).length;
      matchScore += matches / Math.max(context.intentKeywords.length, intentKeywords.length);
    }

    // Priority match
    if (context.priority) {
      factors++;
      if (task.priority === context.priority) {
        matchScore += 1;
      }
    }

    // Biometric match
    if (context.biometricRange && task.biometricContext) {
      factors++;
      const bio = task.biometricContext;
      let bioMatch = 1;

      if (context.biometricRange.stressMin !== undefined &&
          bio.stressLevel < context.biometricRange.stressMin) {
        bioMatch = 0;
      }
      if (context.biometricRange.stressMax !== undefined &&
          bio.stressLevel > context.biometricRange.stressMax) {
        bioMatch = 0;
      }
      if (context.biometricRange.focusMin !== undefined &&
          bio.focusScore < context.biometricRange.focusMin) {
        bioMatch = 0;
      }
      if (context.biometricRange.focusMax !== undefined &&
          bio.focusScore > context.biometricRange.focusMax) {
        bioMatch = 0;
      }

      matchScore += bioMatch;
    }

    // Time-of-day match
    if (context.timeRange) {
      factors++;
      const hour = new Date().getHours();
      const inRange =
        (context.timeRange.hourStart === undefined || hour >= context.timeRange.hourStart) &&
        (context.timeRange.hourEnd === undefined || hour <= context.timeRange.hourEnd);
      matchScore += inRange ? 1 : 0;
    }

    return factors > 0 ? matchScore / factors : 0;
  }

  // ---------------------------------------------------------------------------
  // Consensus Recording
  // ---------------------------------------------------------------------------

  /**
   * Record a consensus result to reinforce stigmergic signals.
   *
   * Updates:
   * - Reinforces vote signals for successful decisions
   * - Deposits DQ trace for the context-subsystem mapping
   * - Updates pattern signals based on outcome
   *
   * @param result - The consensus result to record
   */
  recordConsensus(result: ConsensusResult): void {
    this.metrics.consensusRecorded++;
    const now = Date.now();

    // Deposit DQ trace
    const contextHash = `task_${result.taskId}`;
    this.depositSignal({
      id: `trace_${result.taskId}_${now}`,
      type: 'dq_trace',
      strength: result.success ? 0.8 : 0.3,
      timestamp: now,
      lastUpdated: now,
      contextHash,
      dqScore: result.dqScore.score,
      dqComponents: result.dqScore.components,
      subsystem: result.subsystem,
    } as DQTraceSignal);

    // Reinforce or weaken vote signals
    for (const [agentId, voteWeight] of result.votes.entries()) {
      // Find existing votes from this agent for this task
      for (const [key, vote] of this.voteSignals.entries()) {
        if (vote.agentId === agentId && vote.taskId === result.taskId) {
          if (vote.vote === result.decision && result.success) {
            // Reinforce correct vote
            vote.strength = Math.min(1, vote.strength + 0.2);
          } else if (!result.success) {
            // Weaken on failure
            vote.strength *= 0.7;
          }
          vote.lastUpdated = now;
        }
      }
    }

    // Create or reinforce pattern
    if (result.success && result.dqScore.score > 0.6) {
      const patternId = `pattern_${result.subsystem}_${contextHash}`;
      this.depositSignal({
        id: patternId,
        type: 'pattern',
        strength: 0.7,
        timestamp: now,
        lastUpdated: now,
        patternId,
        context: {
          intentKeywords: [], // Would be populated from task
          priority: undefined,
        },
        outcome: {
          subsystem: result.subsystem,
          expectedDqScore: result.dqScore.score,
          expectedLatency: result.latencyMs,
        },
        frequency: 1,
        successRate: result.success ? 1 : 0,
      } as PatternSignal);
    }
  }

  // ---------------------------------------------------------------------------
  // Stigmergic Cycle (Convergence Detection)
  // ---------------------------------------------------------------------------

  /**
   * Run a stigmergic cycle to detect convergence.
   *
   * Analyzes current signal distribution to determine if a dominant
   * signal has emerged (strength > threshold).
   *
   * @returns Convergence result with dominant signal if converged
   */
  runStigmergicCycle(): ConvergenceResult {
    // Aggregate vote signals by vote value
    const voteDistribution = new Map<string, number>();
    let totalVoteStrength = 0;

    for (const vote of this.voteSignals.values()) {
      if (vote.strength < this.config.minSignalStrength) continue;

      const current = voteDistribution.get(vote.vote) || 0;
      voteDistribution.set(vote.vote, current + vote.strength * vote.confidence);
      totalVoteStrength += vote.strength * vote.confidence;
    }

    // Normalize distribution
    const normalizedDistribution = new Map<string, number>();
    for (const [vote, strength] of voteDistribution.entries()) {
      normalizedDistribution.set(vote, totalVoteStrength > 0 ? strength / totalVoteStrength : 0);
    }

    // Find dominant signal
    let dominant: string | undefined;
    let dominantStrength = 0;
    let secondStrength = 0;

    for (const [vote, strength] of normalizedDistribution.entries()) {
      if (strength > dominantStrength) {
        secondStrength = dominantStrength;
        dominantStrength = strength;
        dominant = vote;
      } else if (strength > secondStrength) {
        secondStrength = strength;
      }
    }

    // Check convergence
    const converged = dominantStrength >= this.config.convergenceThreshold;

    if (converged) {
      this.metrics.convergenceDetections++;
    }

    return {
      converged,
      dominant: converged ? dominant : undefined,
      dominantStrength: converged ? dominantStrength : undefined,
      distribution: normalizedDistribution,
      cycles: 1, // Single cycle for now
      margin: converged ? dominantStrength - secondStrength : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Decay Management
  // ---------------------------------------------------------------------------

  /**
   * Apply exponential decay to all signals.
   *
   * strength *= e^(-lambda * deltaT)
   */
  private applyDecay(): void {
    const now = Date.now();

    const decaySignal = <T extends StigmergicSignal>(signal: T): number => {
      const deltaT = (now - signal.lastUpdated) / 1000; // Convert to seconds
      const decayFactor = Math.exp(-this.config.decayRate * deltaT);
      signal.strength *= decayFactor;
      signal.lastUpdated = now;
      return signal.strength;
    };

    // Decay votes
    for (const [key, signal] of this.voteSignals.entries()) {
      const newStrength = decaySignal(signal);
      if (newStrength < this.config.minSignalStrength) {
        this.voteSignals.delete(key);
        this.metrics.signalsRemoved++;
      }
      this.metrics.signalsDecayed++;
    }

    // Decay traces
    for (const [key, signal] of this.dqTraces.entries()) {
      const newStrength = decaySignal(signal);
      if (newStrength < this.config.minSignalStrength) {
        this.dqTraces.delete(key);
        this.metrics.signalsRemoved++;
      }
      this.metrics.signalsDecayed++;
    }

    // Decay patterns (slower decay for learned behaviors)
    for (const [key, signal] of this.patternSignals.entries()) {
      const deltaT = (now - signal.lastUpdated) / 1000;
      const patternDecayRate = this.config.decayRate * 0.5; // Patterns decay slower
      const decayFactor = Math.exp(-patternDecayRate * deltaT);
      signal.strength *= decayFactor;
      signal.lastUpdated = now;

      if (signal.strength < this.config.minSignalStrength) {
        this.patternSignals.delete(key);
        this.metrics.signalsRemoved++;
      }
      this.metrics.signalsDecayed++;
    }

    this.metrics.lastDecayCycle = now;
  }

  private startDecayCycle(): void {
    if (this.decayTimer) return;

    this.decayTimer = setInterval(() => {
      this.applyDecay();
    }, this.config.decayIntervalMs);
  }

  private stopDecayCycle(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration & Metrics
  // ---------------------------------------------------------------------------

  /**
   * Update configuration.
   */
  setConfig(config: Partial<StigmergicConfig>): void {
    const wasAutoDecay = this.config.autoDecay;
    this.config = { ...this.config, ...config };

    // Handle auto-decay toggle
    if (config.autoDecay !== undefined) {
      if (config.autoDecay && !wasAutoDecay) {
        this.startDecayCycle();
      } else if (!config.autoDecay && wasAutoDecay) {
        this.stopDecayCycle();
      }
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): StigmergicConfig {
    return { ...this.config };
  }

  /**
   * Get environment metrics.
   */
  getMetrics(): typeof this.metrics & {
    voteSignalCount: number;
    dqTraceCount: number;
    patternCount: number;
  } {
    return {
      ...this.metrics,
      voteSignalCount: this.voteSignals.size,
      dqTraceCount: this.dqTraces.size,
      patternCount: this.patternSignals.size,
    };
  }

  /**
   * Get signal counts by type.
   */
  getSignalCounts(): Record<SignalType, number> {
    return {
      vote: this.voteSignals.size,
      dq_trace: this.dqTraces.size,
      pattern: this.patternSignals.size,
    };
  }

  /**
   * Clear all signals (for testing/reset).
   */
  clearAllSignals(): void {
    this.voteSignals.clear();
    this.dqTraces.clear();
    this.patternSignals.clear();
  }

  /**
   * Shutdown the environment.
   */
  shutdown(): void {
    this.stopDecayCycle();
    this.clearAllSignals();
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Deposit a vote signal (convenience method).
   */
  depositVote(
    agentId: string,
    taskId: string,
    vote: string,
    confidence: number,
    contextHash?: string
  ): void {
    const now = Date.now();
    this.depositSignal({
      id: `vote_${agentId}_${taskId}_${now}`,
      type: 'vote',
      strength: confidence,
      timestamp: now,
      lastUpdated: now,
      agentId,
      taskId,
      vote,
      confidence,
      contextHash,
    } as VoteSignal);
  }

  /**
   * Deposit a DQ trace (convenience method).
   */
  depositDQTrace(
    contextHash: string,
    dqScore: number,
    subsystem: SubsystemType,
    dqComponents?: { validity: number; specificity: number; correctness: number }
  ): void {
    const now = Date.now();
    this.depositSignal({
      id: `trace_${contextHash}_${subsystem}_${now}`,
      type: 'dq_trace',
      strength: dqScore,
      timestamp: now,
      lastUpdated: now,
      contextHash,
      dqScore,
      dqComponents,
      subsystem,
    } as DQTraceSignal);
  }

  /**
   * Deposit a pattern signal (convenience method).
   */
  depositPattern(
    patternId: string,
    context: PatternContext,
    outcome: PatternOutcome,
    successRate: number = 1.0
  ): void {
    const now = Date.now();
    this.depositSignal({
      id: patternId,
      type: 'pattern',
      strength: successRate,
      timestamp: now,
      lastUpdated: now,
      patternId,
      context,
      outcome,
      frequency: 1,
      successRate,
    } as PatternSignal);
  }

  /**
   * Force decay cycle (for testing).
   */
  forceDecay(): void {
    this.applyDecay();
  }

  /**
   * Get all votes for a task.
   */
  getTaskVotes(taskId: string): VoteSignal[] {
    return Array.from(this.voteSignals.values())
      .filter(v => v.taskId === taskId && v.strength >= this.config.minSignalStrength)
      .sort((a, b) => b.strength * b.confidence - a.strength * a.confidence);
  }

  /**
   * Get DQ traces for a subsystem.
   */
  getSubsystemTraces(subsystem: SubsystemType): DQTraceSignal[] {
    return Array.from(this.dqTraces.values())
      .filter(t => t.subsystem === subsystem && t.strength >= this.config.minSignalStrength)
      .sort((a, b) => b.dqScore - a.dqScore);
  }

  /**
   * Get top patterns by success rate.
   */
  getTopPatterns(limit: number = 10): PatternSignal[] {
    return Array.from(this.patternSignals.values())
      .filter(p => p.strength >= this.config.minSignalStrength)
      .sort((a, b) => b.successRate * b.strength - a.successRate * a.strength)
      .slice(0, limit);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of StigmergicEnvironment.
 */
export const stigmergicEnvironment = StigmergicEnvironment.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createStigmergicEnvironment(
  config?: Partial<StigmergicConfig>
): StigmergicEnvironment {
  StigmergicEnvironment.resetInstance();
  return StigmergicEnvironment.getInstance(config);
}
