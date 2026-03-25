/**
 * AdaptiveExpertMixture (Dynamic MoE) - US-007
 *
 * Implements dynamic expert selection and routing using a Mixture of Experts
 * architecture with softmax gating and load-aware scheduling.
 *
 * Key features:
 * - Dynamic expert registration with validators
 * - Suitability scoring based on task-expert alignment
 * - Softmax temperature for exploration vs exploitation trade-off
 * - Top-K expert selection with load-aware tie-breaking
 * - Outcome tracking for routing network learning
 *
 * Research basis:
 * - arXiv:2506.15672 (SwarmAgentic) - Stigmergic coordination
 * - arXiv:2512.23880 (CASCADE) - Adaptive skill routing
 * - arXiv:2601.09742 (Adaptive Orchestration) - Capability gap analysis
 */

import type {
  SubsystemType,
  DQScore,
  OrganismTask,
  OrganismResult,
} from '../../archon/types';

import { logger } from '../../logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Expert specification defining capabilities and state.
 */
export interface ExpertSpec {
  /** Unique expert identifier */
  id: string;

  /** Specialization domains (e.g., 'code-generation', 'reasoning', 'search') */
  specialization: string[];

  /** Maximum concurrent task capacity */
  capacity: number;

  /** Current task load (0 = idle, capacity = fully loaded) */
  currentLoad: number;

  /** Performance metrics for routing decisions */
  metrics: ExpertMetrics;
}

/**
 * Performance metrics tracked per expert.
 */
export interface ExpertMetrics {
  /** Success rate (0-1) */
  successRate: number;

  /** Average DQ score of completed tasks */
  avgDqScore: number;

  /** Average execution latency in milliseconds */
  avgLatency: number;

  /** Total invocations */
  invocations: number;

  /** Recent performance window (last N results) */
  recentScores: number[];
}

/**
 * Result from expert execution.
 */
export interface ExpertResult extends OrganismResult {
  /** Expert that handled the task */
  expertId: string;

  /** Routing metadata */
  routing: {
    /** Suitability scores for all considered experts */
    suitabilityScores: Map<string, number>;

    /** Selected experts (top-K) */
    selectedExperts: string[];

    /** Final expert chosen after load balancing */
    routedTo: string;

    /** Temperature used for softmax */
    temperature: number;
  };
}

/**
 * Outcome record for learning.
 */
export interface OutcomeRecord {
  expertId: string;
  taskId: string;
  taskIntent: string;
  specializations: string[];
  suitabilityScore: number;
  result: ExpertResult;
  timestamp: number;
}

/**
 * Validator function type for expert output.
 */
export type ExpertValidator = (output: unknown) => DQScore;

/**
 * Routing configuration.
 */
export interface MoEConfig {
  /** Softmax temperature (higher = more exploration, lower = more exploitation) */
  temperature: number;

  /** Number of experts to select (top-K) */
  topK: number;

  /** Minimum suitability threshold (0-1) */
  minSuitability: number;

  /** Weight for load balancing in final selection */
  loadBalanceWeight: number;

  /** Window size for recent performance tracking */
  recentWindowSize: number;

  /** Enable exploration bonus for underutilized experts */
  explorationBonus: boolean;
}

/**
 * Expert registration entry.
 */
interface ExpertEntry {
  spec: ExpertSpec;
  validator: ExpertValidator;
  executor?: (task: OrganismTask) => Promise<OrganismResult>;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: MoEConfig = {
  temperature: 1.0,
  topK: 3,
  minSuitability: 0.3,
  loadBalanceWeight: 0.2,
  recentWindowSize: 10,
  explorationBonus: true,
};

// =============================================================================
// ADAPTIVE EXPERT MIXTURE CLASS
// =============================================================================

/**
 * AdaptiveExpertMixture implements dynamic expert selection using
 * softmax gating with temperature control and load-aware scheduling.
 */
export class AdaptiveExpertMixture {
  private static instance: AdaptiveExpertMixture | null = null;

  private experts: Map<string, ExpertEntry> = new Map();
  private config: MoEConfig;
  private outcomeHistory: OutcomeRecord[] = [];
  private routingMetrics = {
    totalRoutings: 0,
    successfulRoutings: 0,
    avgSuitabilityScore: 0,
    avgDqScore: 0,
    expertDistribution: new Map<string, number>(),
  };

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<MoEConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<MoEConfig>): AdaptiveExpertMixture {
    if (!AdaptiveExpertMixture.instance) {
      AdaptiveExpertMixture.instance = new AdaptiveExpertMixture(config);
    }
    return AdaptiveExpertMixture.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    AdaptiveExpertMixture.instance = null;
  }

  // ---------------------------------------------------------------------------
  // Expert Registration
  // ---------------------------------------------------------------------------

  /**
   * Register an expert with its specification and output validator.
   *
   * @param id - Unique expert identifier
   * @param spec - Expert specification
   * @param validator - Function to validate and score expert output
   * @param executor - Optional execution function for the expert
   */
  registerExpert(
    id: string,
    spec: ExpertSpec,
    validator: ExpertValidator,
    executor?: (task: OrganismTask) => Promise<OrganismResult>
  ): void {
    if (this.experts.has(id)) {
      logger.warn(`Expert ${id} already registered, updating...`, undefined, 'AdaptiveMoE');
    }

    // Initialize metrics if not provided
    const fullSpec: ExpertSpec = {
      ...spec,
      id,
      metrics: spec.metrics || {
        successRate: 0.8, // Optimistic prior
        avgDqScore: 0.7,
        avgLatency: 500,
        invocations: 0,
        recentScores: [],
      },
    };

    this.experts.set(id, {
      spec: fullSpec,
      validator,
      executor,
    });

    // Initialize routing distribution
    if (!this.routingMetrics.expertDistribution.has(id)) {
      this.routingMetrics.expertDistribution.set(id, 0);
    }

    logger.debug(`Expert registered: ${id}`, { specializations: spec.specialization }, 'AdaptiveMoE');
  }

  /**
   * Unregister an expert.
   */
  unregisterExpert(id: string): boolean {
    return this.experts.delete(id);
  }

  /**
   * Get expert by ID.
   */
  getExpert(id: string): ExpertSpec | undefined {
    return this.experts.get(id)?.spec;
  }

  /**
   * Get all registered experts.
   */
  getAllExperts(): ExpertSpec[] {
    return Array.from(this.experts.values()).map((e) => e.spec);
  }

  // ---------------------------------------------------------------------------
  // Suitability Computation
  // ---------------------------------------------------------------------------

  /**
   * Compute suitability score for a task-expert pair.
   *
   * Score components:
   * - Specialization match (40%)
   * - Historical performance (30%)
   * - Availability/load (20%)
   * - Exploration bonus (10%)
   *
   * @param task - The task to route
   * @param expertId - Expert to evaluate
   * @returns Suitability score (0-1)
   */
  computeSuitability(task: OrganismTask, expertId: string): number {
    const entry = this.experts.get(expertId);
    if (!entry) {
      return 0;
    }

    const { spec } = entry;

    // Extract task keywords from intent
    const taskKeywords = this.extractKeywords(task.intent);
    const taskDomain = this.inferDomain(task);

    // Component 1: Specialization match (40%)
    const specializationScore = this.computeSpecializationMatch(
      spec.specialization,
      taskKeywords,
      taskDomain
    );

    // Component 2: Historical performance (30%)
    const performanceScore = this.computePerformanceScore(spec.metrics);

    // Component 3: Availability (20%)
    const availabilityScore = this.computeAvailabilityScore(spec);

    // Component 4: Exploration bonus (10%)
    const explorationScore = this.config.explorationBonus
      ? this.computeExplorationBonus(spec.metrics)
      : 0;

    // Weighted combination
    const suitability =
      specializationScore * 0.4 +
      performanceScore * 0.3 +
      availabilityScore * 0.2 +
      explorationScore * 0.1;

    return Math.min(1, Math.max(0, suitability));
  }

  private extractKeywords(intent: string): string[] {
    // Extract meaningful keywords from task intent
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'this', 'that', 'these', 'those', 'it', 'its'
    ]);

    return intent
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private inferDomain(task: OrganismTask): string {
    const intent = task.intent.toLowerCase();

    // Domain inference from intent patterns
    const domainPatterns: [RegExp, string][] = [
      [/code|program|implement|function|class|method/i, 'code-generation'],
      [/analyze|understand|explain|reason/i, 'reasoning'],
      [/search|find|lookup|retrieve|query/i, 'search'],
      [/write|compose|draft|create.*text/i, 'text-generation'],
      [/test|verify|validate|check/i, 'validation'],
      [/plan|schedule|organize|coordinate/i, 'planning'],
      [/summarize|extract|condense/i, 'summarization'],
      [/translate|convert|transform/i, 'transformation'],
    ];

    for (const [pattern, domain] of domainPatterns) {
      if (pattern.test(intent)) {
        return domain;
      }
    }

    return 'general';
  }

  private computeSpecializationMatch(
    specializations: string[],
    keywords: string[],
    domain: string
  ): number {
    // Direct domain match
    const domainMatch = specializations.some(
      (s) => s.toLowerCase() === domain.toLowerCase()
    );
    if (domainMatch) {
      return 0.9 + Math.random() * 0.1; // High score with slight variation
    }

    // Keyword overlap
    const specKeywords = specializations.flatMap((s) =>
      s.toLowerCase().split(/[-_\s]+/)
    );
    const overlap = keywords.filter((k) =>
      specKeywords.some((sk) => sk.includes(k) || k.includes(sk))
    );

    return Math.min(1, overlap.length / Math.max(1, keywords.length) + 0.3);
  }

  private computePerformanceScore(metrics: ExpertMetrics): number {
    // Use recent performance if available, else lifetime metrics
    const recentAvg =
      metrics.recentScores.length > 0
        ? metrics.recentScores.reduce((a, b) => a + b, 0) /
          metrics.recentScores.length
        : metrics.avgDqScore;

    // Combine success rate and DQ score
    const qualityScore = recentAvg * 0.6 + metrics.successRate * 0.4;

    // Penalize high latency
    const latencyPenalty = Math.min(1, metrics.avgLatency / 5000);
    const latencyScore = 1 - latencyPenalty * 0.3;

    return qualityScore * latencyScore;
  }

  private computeAvailabilityScore(spec: ExpertSpec): number {
    if (spec.capacity === 0) {
      return 0;
    }

    const loadRatio = spec.currentLoad / spec.capacity;

    // Full availability when load < 50%, decreasing after
    if (loadRatio < 0.5) {
      return 1;
    }

    // Linear decrease from 1 to 0 as load goes from 50% to 100%
    return Math.max(0, 1 - (loadRatio - 0.5) * 2);
  }

  private computeExplorationBonus(metrics: ExpertMetrics): number {
    // Higher bonus for less-invoked experts (encourages exploration)
    if (metrics.invocations === 0) {
      return 1; // Maximum exploration bonus for new experts
    }

    // Decay bonus as invocations increase
    return Math.max(0, 1 - Math.log10(metrics.invocations + 1) / 3);
  }

  // ---------------------------------------------------------------------------
  // Routing and Execution
  // ---------------------------------------------------------------------------

  /**
   * Route a task to the most suitable expert(s) and execute.
   *
   * Algorithm:
   * 1. Compute suitability scores for all available experts
   * 2. Apply softmax with temperature (exploration vs exploitation)
   * 3. Select top-K experts based on weighted score
   * 4. Choose final expert preferring lower load on ties
   * 5. Execute task and record outcome
   *
   * @param task - Task to execute
   * @param experts - Optional subset of experts to consider
   * @returns Result from expert execution
   */
  async routeAndExecute(
    task: OrganismTask,
    experts?: string[]
  ): Promise<ExpertResult> {
    const startTime = Date.now();

    // Get candidate experts
    const candidateIds = experts
      ? experts.filter((id) => this.experts.has(id))
      : Array.from(this.experts.keys());

    if (candidateIds.length === 0) {
      throw new Error('No experts available for routing');
    }

    // Step 1: Compute suitability scores
    const suitabilityScores = new Map<string, number>();
    for (const id of candidateIds) {
      const score = this.computeSuitability(task, id);
      suitabilityScores.set(id, score);
    }

    // Step 2: Apply softmax
    const softmaxScores = this.applySoftmax(suitabilityScores);

    // Step 3: Select top-K experts
    const topK = this.selectTopK(softmaxScores, this.config.topK);

    // Step 4: Apply minimum threshold filter
    const qualifiedExperts = topK.filter(
      ({ score }) => score >= this.config.minSuitability
    );

    if (qualifiedExperts.length === 0) {
      // Fall back to best available even if below threshold
      qualifiedExperts.push(topK[0]);
    }

    // Step 5: Final selection with load balancing
    const selectedExpert = this.selectWithLoadBalance(qualifiedExperts);

    // Step 6: Execute
    const entry = this.experts.get(selectedExpert.id)!;
    let result: OrganismResult;

    try {
      // Update load
      entry.spec.currentLoad++;

      if (entry.executor) {
        result = await entry.executor(task);
      } else {
        // Default execution - simulate for now
        result = await this.defaultExecutor(task, entry);
      }

      // Validate output
      const validationScore = entry.validator(result.output);
      result.dqScore = validationScore;
    } catch (error) {
      result = this.createErrorResult(task, entry.spec, error, startTime);
    } finally {
      // Release load
      entry.spec.currentLoad = Math.max(0, entry.spec.currentLoad - 1);
    }

    // Build expert result
    const expertResult: ExpertResult = {
      ...result,
      expertId: selectedExpert.id,
      routing: {
        suitabilityScores,
        selectedExperts: qualifiedExperts.map((e) => e.id),
        routedTo: selectedExpert.id,
        temperature: this.config.temperature,
      },
    };

    // Record outcome for learning
    this.recordOutcome(selectedExpert.id, task, expertResult);

    // Update routing metrics
    this.updateRoutingMetrics(expertResult, selectedExpert.score);

    return expertResult;
  }

  private applySoftmax(scores: Map<string, number>): Map<string, number> {
    const temperature = this.config.temperature;
    const entries = Array.from(scores.entries());

    // Compute exp(score / temperature) for each
    const expScores = entries.map(([id, score]) => ({
      id,
      exp: Math.exp(score / temperature),
    }));

    // Sum for normalization
    const expSum = expScores.reduce((sum, { exp }) => sum + exp, 0);

    // Normalize
    const result = new Map<string, number>();
    for (const { id, exp } of expScores) {
      result.set(id, exp / expSum);
    }

    return result;
  }

  private selectTopK(
    scores: Map<string, number>,
    k: number
  ): Array<{ id: string; score: number }> {
    return Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  private selectWithLoadBalance(
    candidates: Array<{ id: string; score: number }>
  ): { id: string; score: number } {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Weight score and availability
    const weight = this.config.loadBalanceWeight;
    const weighted = candidates.map(({ id, score }) => {
      const entry = this.experts.get(id)!;
      const loadRatio = entry.spec.currentLoad / entry.spec.capacity;
      const availabilityBonus = (1 - loadRatio) * weight;
      return {
        id,
        score: score * (1 - weight) + availabilityBonus,
        originalScore: score,
      };
    });

    // Sort by weighted score
    weighted.sort((a, b) => b.score - a.score);

    return { id: weighted[0].id, score: weighted[0].originalScore };
  }

  private async defaultExecutor(
    task: OrganismTask,
    entry: ExpertEntry
  ): Promise<OrganismResult> {
    // Simulate execution with latency
    const simulatedLatency = entry.spec.metrics.avgLatency * (0.8 + Math.random() * 0.4);
    await new Promise((resolve) => setTimeout(resolve, Math.min(simulatedLatency, 100)));

    return {
      success: true,
      output: {
        expertId: entry.spec.id,
        taskId: task.id,
        message: `Task "${task.intent}" processed by expert ${entry.spec.id}`,
      },
      dqScore: {
        score: entry.spec.metrics.avgDqScore * (0.9 + Math.random() * 0.2),
        components: {
          validity: 0.8 + Math.random() * 0.2,
          specificity: 0.7 + Math.random() * 0.3,
          correctness: 0.75 + Math.random() * 0.25,
        },
        isActionable: true,
        timestamp: Date.now(),
      },
      metadata: {
        layerId: 'swarm' as SubsystemType,
        latencyMs: simulatedLatency,
        tokensUsed: Math.floor(100 + Math.random() * 200),
      },
    };
  }

  private createErrorResult(
    task: OrganismTask,
    spec: ExpertSpec,
    error: unknown,
    startTime: number
  ): OrganismResult {
    return {
      success: false,
      output: null,
      dqScore: {
        score: 0,
        components: { validity: 0, specificity: 0, correctness: 0 },
        isActionable: false,
        timestamp: Date.now(),
      },
      metadata: {
        layerId: 'swarm' as SubsystemType,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // ---------------------------------------------------------------------------
  // Outcome Recording & Learning
  // ---------------------------------------------------------------------------

  /**
   * Record execution outcome for routing network learning.
   *
   * @param expertId - Expert that executed the task
   * @param task - The executed task
   * @param result - Execution result
   */
  recordOutcome(expertId: string, task: OrganismTask, result: ExpertResult): void {
    const entry = this.experts.get(expertId);
    if (!entry) {
      return;
    }

    const { spec } = entry;
    const { metrics } = spec;

    // Update invocation count
    metrics.invocations++;

    // Update success rate (exponential moving average)
    const successValue = result.success ? 1 : 0;
    metrics.successRate = metrics.successRate * 0.9 + successValue * 0.1;

    // Update average DQ score
    if (result.dqScore.score > 0) {
      metrics.avgDqScore = metrics.avgDqScore * 0.9 + result.dqScore.score * 0.1;
    }

    // Update average latency
    metrics.avgLatency =
      metrics.avgLatency * 0.9 + result.metadata.latencyMs * 0.1;

    // Update recent scores window
    metrics.recentScores.push(result.dqScore.score);
    if (metrics.recentScores.length > this.config.recentWindowSize) {
      metrics.recentScores.shift();
    }

    // Store outcome record
    const record: OutcomeRecord = {
      expertId,
      taskId: task.id ?? '',
      taskIntent: task.intent,
      specializations: [...spec.specialization],
      suitabilityScore: result.routing.suitabilityScores.get(expertId) || 0,
      result,
      timestamp: Date.now(),
    };

    this.outcomeHistory.push(record);

    // Limit history size
    if (this.outcomeHistory.length > 1000) {
      this.outcomeHistory = this.outcomeHistory.slice(-500);
    }
  }

  private updateRoutingMetrics(result: ExpertResult, suitabilityScore: number): void {
    this.routingMetrics.totalRoutings++;

    if (result.success) {
      this.routingMetrics.successfulRoutings++;
    }

    // Update averages
    const n = this.routingMetrics.totalRoutings;
    this.routingMetrics.avgSuitabilityScore =
      (this.routingMetrics.avgSuitabilityScore * (n - 1) + suitabilityScore) / n;
    this.routingMetrics.avgDqScore =
      (this.routingMetrics.avgDqScore * (n - 1) + result.dqScore.score) / n;

    // Update distribution
    const currentCount =
      this.routingMetrics.expertDistribution.get(result.expertId) || 0;
    this.routingMetrics.expertDistribution.set(result.expertId, currentCount + 1);
  }

  // ---------------------------------------------------------------------------
  // Configuration & Metrics
  // ---------------------------------------------------------------------------

  /**
   * Update MoE configuration.
   */
  setConfig(config: Partial<MoEConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): MoEConfig {
    return { ...this.config };
  }

  /**
   * Get routing metrics.
   */
  getRoutingMetrics(): typeof this.routingMetrics {
    return {
      ...this.routingMetrics,
      expertDistribution: new Map(this.routingMetrics.expertDistribution),
    };
  }

  /**
   * Get outcome history.
   */
  getOutcomeHistory(limit?: number): OutcomeRecord[] {
    return limit
      ? this.outcomeHistory.slice(-limit)
      : [...this.outcomeHistory];
  }

  /**
   * Clear outcome history.
   */
  clearOutcomeHistory(): void {
    this.outcomeHistory = [];
  }

  /**
   * Get expert performance summary.
   */
  getExpertPerformanceSummary(): Map<string, {
    id: string;
    specialization: string[];
    metrics: ExpertMetrics;
    routingShare: number;
  }> {
    const summary = new Map<string, {
      id: string;
      specialization: string[];
      metrics: ExpertMetrics;
      routingShare: number;
    }>();
    const totalRoutings = this.routingMetrics.totalRoutings || 1;

    this.experts.forEach((entry, id) => {
      const routingCount = this.routingMetrics.expertDistribution.get(id) || 0;
      summary.set(id, {
        id,
        specialization: [...entry.spec.specialization],
        metrics: { ...entry.spec.metrics },
        routingShare: routingCount / totalRoutings,
      });
    });

    return summary;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of AdaptiveExpertMixture.
 */
export const adaptiveMoE = AdaptiveExpertMixture.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createAdaptiveMoE(config?: Partial<MoEConfig>): AdaptiveExpertMixture {
  AdaptiveExpertMixture.resetInstance();
  return AdaptiveExpertMixture.getInstance(config);
}
