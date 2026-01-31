/**
 * GoldilocksBuffer - US-012: Optimal Memory Replay Selection
 *
 * Implements the "Goldilocks Zone" for memory replay - selecting episodes
 * that are neither too easy (already learned) nor too hard (not yet learnable).
 *
 * Core concepts:
 * - Learning Speed: Rate of accuracy improvement per exposure
 * - Goldilocks Classification: Too Easy, Goldilocks Zone, Too Hard
 * - EWC (Elastic Weight Consolidation): Protect important learned patterns
 * - Synthetic Replay Generation: Create variations for robust learning
 *
 * Research basis:
 * - arXiv:2601.02553 (SimpleMem) - Goldilocks memory selection criteria
 * - arXiv:2504.07079 (SkillWeaver) - Skill consolidation during replay
 * - Kirkpatrick et al. (2017) - Elastic Weight Consolidation
 */

import type { Episode, ImportanceSignals } from './wakeSleep';
import type { DQScore } from '../../archon/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Classification of episode learning state.
 */
export type GoldilocksZone = 'too_easy' | 'goldilocks' | 'too_hard';

/**
 * Learning metrics for an episode.
 */
export interface LearningMetrics {
  /** Unique identifier for the episode */
  episodeId: string;

  /** Current accuracy on this episode type (0-1) */
  accuracy: number;

  /** Previous accuracy measurement (0-1) */
  previousAccuracy: number;

  /** Number of times this episode has been exposed */
  exposures: number;

  /** Computed learning speed (delta accuracy / delta exposures) */
  learningSpeed: number;

  /** Goldilocks classification */
  zone: GoldilocksZone;

  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Fisher Information for EWC.
 * Tracks importance of learned patterns.
 */
export interface FisherInformation {
  /** Parameter identifier (e.g., skill name, pattern hash) */
  parameterId: string;

  /** Fisher information value (importance) */
  importance: number;

  /** Optimal parameter value learned */
  optimalValue: number;

  /** Variance of the parameter */
  variance: number;

  /** Number of samples used to estimate */
  sampleCount: number;

  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * EWC penalty computation result.
 */
export interface EWCPenalty {
  /** Total penalty value */
  totalPenalty: number;

  /** Penalty breakdown by parameter */
  breakdown: Map<string, number>;

  /** Lambda (regularization strength) used */
  lambda: number;

  /** Number of parameters considered */
  parameterCount: number;
}

/**
 * Synthetic replay configuration.
 */
export interface SyntheticReplayConfig {
  /** Noise level for perturbation (0-1) */
  noiseLevel: number;

  /** Whether to apply intent variation */
  varyIntent: boolean;

  /** Whether to adjust importance signals */
  adjustImportance: boolean;

  /** Number of variations to generate */
  variationCount: number;
}

/**
 * Replay selection result.
 */
export interface ReplaySelectionResult {
  /** Selected episodes for replay */
  selected: Episode[];

  /** Episodes classified as too easy (skipped) */
  tooEasy: Episode[];

  /** Episodes classified as too hard (skipped) */
  tooHard: Episode[];

  /** Total episodes considered */
  totalConsidered: number;

  /** Budget utilized */
  budgetUsed: number;

  /** Selection statistics */
  stats: {
    avgLearningSpeed: number;
    goldilocksRatio: number;
    ewcPenaltyApplied: boolean;
  };
}

/**
 * Buffer configuration.
 */
export interface GoldilocksBufferConfig {
  /** Lower threshold for learning speed (below = too hard) */
  tooHardThreshold: number;

  /** Upper threshold for learning speed (above = too easy) */
  tooEasyThreshold: number;

  /** EWC regularization strength (lambda) */
  ewcLambda: number;

  /** Maximum episodes to track metrics for */
  maxTrackedEpisodes: number;

  /** Maximum Fisher information entries */
  maxFisherEntries: number;

  /** Decay rate for old metrics (per day) */
  metricsDecayRate: number;

  /** Default synthetic replay configuration */
  syntheticConfig: SyntheticReplayConfig;
}

/**
 * Buffer metrics for monitoring.
 */
export interface GoldilocksMetrics {
  /** Total episodes tracked */
  trackedEpisodes: number;

  /** Episodes in each zone */
  zoneDistribution: {
    tooEasy: number;
    goldilocks: number;
    tooHard: number;
  };

  /** Average learning speed across all episodes */
  avgLearningSpeed: number;

  /** Fisher information entries */
  fisherEntries: number;

  /** Total EWC penalty */
  totalEwcPenalty: number;

  /** Synthetic episodes generated */
  syntheticGenerated: number;

  /** Selection efficiency (goldilocks / total) */
  selectionEfficiency: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: GoldilocksBufferConfig = {
  tooHardThreshold: 0.1,  // Learning speed < 0.1 = too hard
  tooEasyThreshold: 0.9,  // Learning speed > 0.9 = too easy
  ewcLambda: 0.4,         // EWC regularization strength
  maxTrackedEpisodes: 1000,
  maxFisherEntries: 500,
  metricsDecayRate: 0.1,  // 10% decay per day
  syntheticConfig: {
    noiseLevel: 0.15,
    varyIntent: true,
    adjustImportance: true,
    variationCount: 3,
  },
};

// =============================================================================
// GOLDILOCKS BUFFER
// =============================================================================

/**
 * GoldilocksBuffer implements optimal memory replay selection.
 *
 * The "Goldilocks Zone" principle: Focus learning on episodes that are
 * challenging but not impossible - the sweet spot where learning is most efficient.
 *
 * Key features:
 * 1. Learning speed computation for each episode
 * 2. Classification into too_easy, goldilocks, too_hard zones
 * 3. Budget-aware selection for replay
 * 4. Synthetic replay generation for robust learning
 * 5. EWC to prevent catastrophic forgetting
 */
export class GoldilocksBuffer {
  private static instance: GoldilocksBuffer | null = null;

  private config: GoldilocksBufferConfig;

  // Learning metrics by episode ID
  private learningMetrics: Map<string, LearningMetrics> = new Map();

  // Fisher information for EWC
  private fisherInfo: Map<string, FisherInformation> = new Map();

  // Statistics tracking
  private stats = {
    syntheticGenerated: 0,
    selectionsPerformed: 0,
    ewcApplications: 0,
  };

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<GoldilocksBufferConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<GoldilocksBufferConfig>): GoldilocksBuffer {
    if (!GoldilocksBuffer.instance) {
      GoldilocksBuffer.instance = new GoldilocksBuffer(config);
    }
    return GoldilocksBuffer.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    GoldilocksBuffer.instance = null;
  }

  // ---------------------------------------------------------------------------
  // CORE METHODS
  // ---------------------------------------------------------------------------

  /**
   * Compute learning speed for an episode.
   *
   * Learning Speed = (current_accuracy - previous_accuracy) / exposures
   *
   * Higher values indicate the episode is being learned quickly (too easy).
   * Lower values indicate the episode is difficult to learn (too hard).
   * Middle values are in the "Goldilocks Zone" for optimal learning.
   *
   * @param episode - The episode to compute learning speed for
   * @returns Learning speed value (0-1 normalized)
   */
  computeLearningSpeed(episode: Episode): number {
    const episodeId = episode.id;
    const metrics = this.learningMetrics.get(episodeId);

    if (!metrics) {
      // First exposure - estimate based on importance signals
      return this.estimateInitialLearningSpeed(episode);
    }

    // Compute delta accuracy / delta exposures
    const deltaAccuracy = metrics.accuracy - metrics.previousAccuracy;
    const deltaExposures = Math.max(1, metrics.exposures);

    // Raw learning speed
    let rawSpeed = deltaAccuracy / deltaExposures;

    // Apply decay based on time since last update
    const daysSinceUpdate = (Date.now() - metrics.lastUpdated) / (24 * 60 * 60 * 1000);
    const decayFactor = Math.exp(-this.config.metricsDecayRate * daysSinceUpdate);
    rawSpeed *= decayFactor;

    // Normalize to 0-1 range using sigmoid
    const normalizedSpeed = 1 / (1 + Math.exp(-5 * (rawSpeed - 0.5)));

    return Math.min(1, Math.max(0, normalizedSpeed));
  }

  /**
   * Estimate initial learning speed for a new episode.
   */
  private estimateInitialLearningSpeed(episode: Episode): number {
    const { importance } = episode;

    // Use importance signals as proxy for initial learning speed
    // High DQ + low surprise = likely too easy
    // Low DQ + high surprise = likely too hard
    // Balanced = goldilocks zone

    const easeSignal = importance.dqScore * (1 - importance.surprise);
    const difficultySignal = importance.surprise * (1 - importance.dqScore);

    // Combine signals
    const rawSpeed = 0.5 + (easeSignal - difficultySignal) * 0.4;

    // Adjust for priority (higher priority episodes are often more complex)
    const priorityAdjustment = (1 - importance.priority) * 0.1;

    return Math.min(1, Math.max(0, rawSpeed - priorityAdjustment));
  }

  /**
   * Classify an episode into its Goldilocks zone.
   *
   * Thresholds (configurable):
   * - speed < 0.1: "Too Hard" - skip for now, revisit later
   * - speed > 0.9: "Too Easy" - already learned, low priority
   * - 0.1 - 0.9: "Goldilocks Zone" - prioritize for replay
   *
   * @param episode - The episode to classify
   * @returns The Goldilocks zone classification
   */
  classifyEpisode(episode: Episode): GoldilocksZone {
    const speed = this.computeLearningSpeed(episode);

    if (speed < this.config.tooHardThreshold) {
      return 'too_hard';
    } else if (speed > this.config.tooEasyThreshold) {
      return 'too_easy';
    } else {
      return 'goldilocks';
    }
  }

  /**
   * Select episodes for replay within a given budget.
   *
   * Selection strategy:
   * 1. Classify all episodes
   * 2. Prioritize Goldilocks zone episodes
   * 3. Include some "too hard" episodes for exposure
   * 4. Fill remaining budget with "too easy" for maintenance
   * 5. Apply EWC filtering to prevent forgetting
   *
   * @param episodes - Pool of episodes to select from
   * @param budget - Maximum number of episodes to select
   * @returns Selection result with classified episodes
   */
  selectForReplay(episodes: Episode[], budget: number): ReplaySelectionResult {
    this.stats.selectionsPerformed++;

    const classified = {
      tooEasy: [] as Episode[],
      goldilocks: [] as Episode[],
      tooHard: [] as Episode[],
    };

    // Step 1: Classify all episodes
    for (const episode of episodes) {
      const zone = this.classifyEpisode(episode);
      classified[zone].push(episode);
    }

    // Step 2: Sort each group by learning value
    const sortByLearningValue = (a: Episode, b: Episode) => {
      const speedA = this.computeLearningSpeed(a);
      const speedB = this.computeLearningSpeed(b);
      // Prefer episodes closer to the middle of the Goldilocks zone
      const distA = Math.abs(speedA - 0.5);
      const distB = Math.abs(speedB - 0.5);
      return distA - distB;
    };

    classified.goldilocks.sort(sortByLearningValue);
    classified.tooHard.sort(sortByLearningValue);
    classified.tooEasy.sort(sortByLearningValue);

    // Step 3: Allocate budget
    // - 70% for Goldilocks zone
    // - 20% for "too hard" (exposure for future learning)
    // - 10% for "too easy" (maintenance learning)
    const goldilocksAllocation = Math.floor(budget * 0.7);
    const tooHardAllocation = Math.floor(budget * 0.2);
    const tooEasyAllocation = budget - goldilocksAllocation - tooHardAllocation;

    const selected: Episode[] = [];

    // Select from Goldilocks zone (primary)
    for (let i = 0; i < Math.min(goldilocksAllocation, classified.goldilocks.length); i++) {
      selected.push(classified.goldilocks[i]);
    }

    // Select from "too hard" (exposure)
    for (let i = 0; i < Math.min(tooHardAllocation, classified.tooHard.length); i++) {
      selected.push(classified.tooHard[i]);
    }

    // Select from "too easy" (maintenance)
    for (let i = 0; i < Math.min(tooEasyAllocation, classified.tooEasy.length); i++) {
      selected.push(classified.tooEasy[i]);
    }

    // Fill any remaining budget with more Goldilocks episodes
    const remaining = budget - selected.length;
    if (remaining > 0 && classified.goldilocks.length > goldilocksAllocation) {
      const extraGoldilocks = classified.goldilocks.slice(
        goldilocksAllocation,
        goldilocksAllocation + remaining
      );
      selected.push(...extraGoldilocks);
    }

    // Step 4: Apply EWC filtering
    const ewcFiltered = this.applyEWCFiltering(selected);

    // Compute statistics
    const totalSpeed = ewcFiltered.reduce(
      (sum, ep) => sum + this.computeLearningSpeed(ep),
      0
    );
    const avgSpeed = ewcFiltered.length > 0 ? totalSpeed / ewcFiltered.length : 0;

    return {
      selected: ewcFiltered,
      tooEasy: classified.tooEasy,
      tooHard: classified.tooHard,
      totalConsidered: episodes.length,
      budgetUsed: ewcFiltered.length,
      stats: {
        avgLearningSpeed: avgSpeed,
        goldilocksRatio: classified.goldilocks.length / Math.max(1, episodes.length),
        ewcPenaltyApplied: this.fisherInfo.size > 0,
      },
    };
  }

  /**
   * Apply EWC filtering to protect important learned patterns.
   */
  private applyEWCFiltering(episodes: Episode[]): Episode[] {
    if (this.fisherInfo.size === 0) {
      return episodes;
    }

    // Score episodes by their potential for catastrophic forgetting
    const scored = episodes.map((episode) => {
      const ewcPenalty = this.computeEWCPenalty(episode);
      return { episode, penalty: ewcPenalty.totalPenalty };
    });

    // Sort by penalty (lower penalty = safer to replay)
    scored.sort((a, b) => a.penalty - b.penalty);

    // Keep episodes with acceptable penalty
    const maxPenalty = this.config.ewcLambda * 2; // Threshold for acceptable penalty
    return scored
      .filter((s) => s.penalty < maxPenalty)
      .map((s) => s.episode);
  }

  /**
   * Generate a synthetic replay variation of an episode.
   *
   * Synthetic replays help with:
   * - Robust learning through variation
   * - Counterfactual exploration
   * - Data augmentation for rare patterns
   *
   * @param episode - The source episode
   * @param config - Optional custom configuration
   * @returns A synthetic variation of the episode
   */
  generateSyntheticReplay(
    episode: Episode,
    config?: Partial<SyntheticReplayConfig>
  ): Episode {
    const cfg = { ...this.config.syntheticConfig, ...config };
    this.stats.syntheticGenerated++;

    const now = Date.now();
    const syntheticId = `syn-${now}-${Math.random().toString(36).substr(2, 9)}`;

    // Create perturbed importance signals
    const perturbedImportance: ImportanceSignals = {
      ...episode.importance,
    };

    if (cfg.adjustImportance) {
      // Add controlled noise to importance signals
      perturbedImportance.dqScore = this.perturbValue(
        episode.importance.dqScore,
        cfg.noiseLevel
      );
      perturbedImportance.surprise = this.perturbValue(
        episode.importance.surprise,
        cfg.noiseLevel
      );
      perturbedImportance.emotionalSalience = this.perturbValue(
        episode.importance.emotionalSalience,
        cfg.noiseLevel
      );
    }

    // Vary intent if configured
    let intent = episode.intent;
    if (cfg.varyIntent) {
      intent = this.varyIntent(episode.intent);
    }

    // Create synthetic episode
    const synthetic: Episode = {
      id: syntheticId,
      taskId: `synthetic-${episode.taskId}`,
      intent,
      content: {
        original: episode.content,
        synthetic: true,
        sourceEpisodeId: episode.id,
        variationType: 'perturbation',
      },
      result: episode.result,
      importance: perturbedImportance,
      metadata: {
        ...episode.metadata,
        tags: [...episode.metadata.tags, 'synthetic'],
        linkedEpisodes: [episode.id, ...episode.metadata.linkedEpisodes],
      },
      createdAt: now,
      consolidated: false,
    };

    return synthetic;
  }

  /**
   * Perturb a value with controlled noise.
   */
  private perturbValue(value: number, noiseLevel: number): number {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel;
    return Math.min(1, Math.max(0, value + noise));
  }

  /**
   * Generate a variation of the intent string.
   */
  private varyIntent(intent: string): string {
    const variations = [
      (s: string) => `Variant: ${s}`,
      (s: string) => `Alternative approach: ${s}`,
      (s: string) => `Replay: ${s}`,
      (s: string) => s.split(' ').reverse().join(' '), // Reverse words
      (s: string) => s.replace(/\b(\w+)\b/g, (m) => Math.random() > 0.8 ? m.toUpperCase() : m),
    ];

    const variation = variations[Math.floor(Math.random() * variations.length)];
    return variation(intent);
  }

  /**
   * Apply Elastic Weight Consolidation to an episode.
   *
   * EWC Penalty Formula:
   * Loss += lambda * SUM_i( F_i * (theta_i - theta*_i)^2 )
   *
   * Where:
   * - F_i = Fisher information (importance of parameter i)
   * - theta_i = current parameter value
   * - theta*_i = optimal learned value
   * - lambda = regularization strength
   *
   * @param episode - The episode to evaluate
   * @param fisherInfo - Fisher information to use (optional, uses stored if not provided)
   */
  applyEWC(
    episode: Episode,
    fisherInfo?: FisherInformation[]
  ): void {
    this.stats.ewcApplications++;

    const fisher = fisherInfo || Array.from(this.fisherInfo.values());

    // Update Fisher information based on episode
    this.updateFisherInformation(episode, fisher);
  }

  /**
   * Compute EWC penalty for an episode.
   */
  private computeEWCPenalty(episode: Episode): EWCPenalty {
    const breakdown = new Map<string, number>();
    let totalPenalty = 0;

    // Extract parameters from episode (tags, domain, patterns)
    const episodeParams = new Map<string, number>();

    for (const tag of episode.metadata.tags) {
      episodeParams.set(`tag:${tag}`, episode.importance.dqScore);
    }

    if (episode.metadata.domain) {
      episodeParams.set(`domain:${episode.metadata.domain}`, episode.importance.priority);
    }

    // Compute penalty for each parameter
    for (const [paramId, currentValue] of episodeParams) {
      const fisher = this.fisherInfo.get(paramId);

      if (fisher) {
        // EWC penalty: F_i * (theta_i - theta*_i)^2
        const deviation = currentValue - fisher.optimalValue;
        const penalty = fisher.importance * deviation * deviation;
        breakdown.set(paramId, penalty);
        totalPenalty += penalty;
      }
    }

    // Apply lambda
    totalPenalty *= this.config.ewcLambda;

    return {
      totalPenalty,
      breakdown,
      lambda: this.config.ewcLambda,
      parameterCount: breakdown.size,
    };
  }

  /**
   * Update Fisher information based on episode learning.
   */
  private updateFisherInformation(
    episode: Episode,
    existingFisher: FisherInformation[]
  ): void {
    const now = Date.now();

    // Extract parameters from episode
    const params: Array<{ id: string; value: number }> = [];

    for (const tag of episode.metadata.tags) {
      params.push({ id: `tag:${tag}`, value: episode.importance.dqScore });
    }

    if (episode.metadata.domain) {
      params.push({ id: `domain:${episode.metadata.domain}`, value: episode.importance.priority });
    }

    // Update or create Fisher information entries
    for (const param of params) {
      const existing = this.fisherInfo.get(param.id);

      if (existing) {
        // Update with exponential moving average
        const alpha = 0.1; // Learning rate
        existing.optimalValue = existing.optimalValue * (1 - alpha) + param.value * alpha;
        existing.importance = existing.importance * 0.9 + episode.importance.dqScore * 0.1;
        existing.variance = this.updateVariance(existing.variance, param.value, existing.optimalValue);
        existing.sampleCount++;
        existing.lastUpdated = now;
      } else {
        // Create new entry
        const newFisher: FisherInformation = {
          parameterId: param.id,
          importance: episode.importance.dqScore,
          optimalValue: param.value,
          variance: 0.1, // Initial variance estimate
          sampleCount: 1,
          lastUpdated: now,
        };
        this.fisherInfo.set(param.id, newFisher);
      }
    }

    // Prune old entries if exceeding limit
    this.pruneFisherInfo();
  }

  /**
   * Update variance using Welford's online algorithm.
   */
  private updateVariance(
    oldVariance: number,
    newValue: number,
    mean: number
  ): number {
    const deviation = newValue - mean;
    return oldVariance * 0.9 + deviation * deviation * 0.1;
  }

  /**
   * Prune Fisher information entries to stay within limit.
   */
  private pruneFisherInfo(): void {
    if (this.fisherInfo.size <= this.config.maxFisherEntries) {
      return;
    }

    // Sort by importance * recency
    const entries = Array.from(this.fisherInfo.entries()).map(([id, info]) => {
      const recencyScore = Math.exp(
        -(Date.now() - info.lastUpdated) / (7 * 24 * 60 * 60 * 1000)
      ); // Week decay
      const score = info.importance * recencyScore;
      return { id, score };
    });

    entries.sort((a, b) => b.score - a.score);

    // Keep top entries
    const toKeep = new Set(
      entries.slice(0, this.config.maxFisherEntries).map((e) => e.id)
    );

    for (const [id] of this.fisherInfo) {
      if (!toKeep.has(id)) {
        this.fisherInfo.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LEARNING METRICS MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Record a learning outcome for an episode.
   *
   * @param episodeId - Episode identifier
   * @param accuracy - Current accuracy on this episode type
   */
  recordLearningOutcome(episodeId: string, accuracy: number): void {
    const existing = this.learningMetrics.get(episodeId);
    const now = Date.now();

    if (existing) {
      existing.previousAccuracy = existing.accuracy;
      existing.accuracy = accuracy;
      existing.exposures++;
      existing.learningSpeed = this.computeLearningSpeedFromMetrics(existing);
      existing.zone = this.classifyFromSpeed(existing.learningSpeed);
      existing.lastUpdated = now;
    } else {
      const metrics: LearningMetrics = {
        episodeId,
        accuracy,
        previousAccuracy: 0.5, // Initial guess
        exposures: 1,
        learningSpeed: accuracy * 0.5, // Initial estimate
        zone: 'goldilocks', // Assume middle until more data
        lastUpdated: now,
      };
      metrics.zone = this.classifyFromSpeed(metrics.learningSpeed);
      this.learningMetrics.set(episodeId, metrics);
    }

    // Prune old metrics
    this.pruneMetrics();
  }

  /**
   * Compute learning speed from metrics.
   */
  private computeLearningSpeedFromMetrics(metrics: LearningMetrics): number {
    const deltaAccuracy = metrics.accuracy - metrics.previousAccuracy;
    const speed = deltaAccuracy / Math.max(1, metrics.exposures);
    return 1 / (1 + Math.exp(-5 * (speed + 0.5)));
  }

  /**
   * Classify zone from learning speed.
   */
  private classifyFromSpeed(speed: number): GoldilocksZone {
    if (speed < this.config.tooHardThreshold) return 'too_hard';
    if (speed > this.config.tooEasyThreshold) return 'too_easy';
    return 'goldilocks';
  }

  /**
   * Prune old learning metrics.
   */
  private pruneMetrics(): void {
    if (this.learningMetrics.size <= this.config.maxTrackedEpisodes) {
      return;
    }

    // Sort by recency and zone (prioritize Goldilocks zone)
    const entries = Array.from(this.learningMetrics.entries()).map(([id, m]) => {
      const recencyScore = m.lastUpdated;
      const zoneScore = m.zone === 'goldilocks' ? 2 : 1;
      return { id, score: recencyScore * zoneScore };
    });

    entries.sort((a, b) => b.score - a.score);

    // Keep top entries
    const toKeep = new Set(
      entries.slice(0, this.config.maxTrackedEpisodes).map((e) => e.id)
    );

    for (const [id] of this.learningMetrics) {
      if (!toKeep.has(id)) {
        this.learningMetrics.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // API & METRICS
  // ---------------------------------------------------------------------------

  /**
   * Get buffer metrics.
   */
  getMetrics(): GoldilocksMetrics {
    let totalSpeed = 0;
    const zoneDistribution = { tooEasy: 0, goldilocks: 0, tooHard: 0 };

    for (const metrics of this.learningMetrics.values()) {
      totalSpeed += metrics.learningSpeed;
      zoneDistribution[metrics.zone]++;
    }

    const total = this.learningMetrics.size;
    const avgSpeed = total > 0 ? totalSpeed / total : 0;

    let totalEwcPenalty = 0;
    for (const fisher of this.fisherInfo.values()) {
      totalEwcPenalty += fisher.importance;
    }

    return {
      trackedEpisodes: total,
      zoneDistribution,
      avgLearningSpeed: avgSpeed,
      fisherEntries: this.fisherInfo.size,
      totalEwcPenalty: totalEwcPenalty * this.config.ewcLambda,
      syntheticGenerated: this.stats.syntheticGenerated,
      selectionEfficiency: total > 0 ? zoneDistribution.goldilocks / total : 0,
    };
  }

  /**
   * Get learning metrics for an episode.
   */
  getLearningMetrics(episodeId: string): LearningMetrics | undefined {
    return this.learningMetrics.get(episodeId);
  }

  /**
   * Get Fisher information for a parameter.
   */
  getFisherInfo(parameterId: string): FisherInformation | undefined {
    return this.fisherInfo.get(parameterId);
  }

  /**
   * Get all Fisher information entries.
   */
  getAllFisherInfo(): FisherInformation[] {
    return Array.from(this.fisherInfo.values());
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<GoldilocksBufferConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): GoldilocksBufferConfig {
    return { ...this.config };
  }

  /**
   * Clear all tracked data.
   */
  clear(): void {
    this.learningMetrics.clear();
    this.fisherInfo.clear();
    this.stats = {
      syntheticGenerated: 0,
      selectionsPerformed: 0,
      ewcApplications: 0,
    };
  }

  /**
   * Export state for persistence.
   */
  exportState(): {
    metrics: Array<[string, LearningMetrics]>;
    fisher: Array<[string, FisherInformation]>;
    stats: typeof this.stats;
  } {
    return {
      metrics: Array.from(this.learningMetrics.entries()),
      fisher: Array.from(this.fisherInfo.entries()),
      stats: { ...this.stats },
    };
  }

  /**
   * Import state from persistence.
   */
  importState(state: {
    metrics: Array<[string, LearningMetrics]>;
    fisher: Array<[string, FisherInformation]>;
    stats: { syntheticGenerated: number; selectionsPerformed: number; ewcApplications: number };
  }): void {
    this.learningMetrics = new Map(state.metrics);
    this.fisherInfo = new Map(state.fisher);
    this.stats = { ...state.stats };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of GoldilocksBuffer.
 */
export const goldilocksBuffer = GoldilocksBuffer.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createGoldilocksBuffer(
  config?: Partial<GoldilocksBufferConfig>
): GoldilocksBuffer {
  GoldilocksBuffer.resetInstance();
  return GoldilocksBuffer.getInstance(config);
}
