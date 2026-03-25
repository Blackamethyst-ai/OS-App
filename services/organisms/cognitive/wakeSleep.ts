/**
 * WakeSleepAgent - US-011: Biological Sleep Cycle Simulation
 *
 * Implements wake/sleep cycles for memory consolidation and skill synthesis.
 * Based on neuroscience-inspired learning where:
 * - Wake phase: Process tasks, store raw episodes to episodic buffer
 * - NREM phase: Consolidate important memories via replay and pruning
 * - REM phase: Generate synthetic episodes (dreaming) for novel pattern discovery
 *
 * Research basis:
 * - arXiv:2601.02553 (SimpleMem) - Goldilocks criteria for memory selection
 * - arXiv:2504.07079 (SkillWeaver) - Skill synthesis during consolidation
 * - Neuroscience: Complementary Learning Systems Theory (CLS)
 * - EWC (Elastic Weight Consolidation) for catastrophic forgetting prevention
 */

import type {
  OrganismTask,
  OrganismResult,
  BiometricContext,
  DQScore,
  SubsystemType,
} from '../../archon/types';
import { logger } from '../../logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Episode represents a single experiential record.
 */
export interface Episode {
  /** Unique episode identifier */
  id: string;

  /** Task that generated this episode */
  taskId: string;

  /** Intent/action description */
  intent: string;

  /** Episode content/data */
  content: unknown;

  /** Result of the task execution */
  result: OrganismResult | null;

  /** Importance signals for consolidation selection */
  importance: ImportanceSignals;

  /** Metadata for replay and analysis */
  metadata: EpisodeMetadata;

  /** Timestamp of creation */
  createdAt: number;

  /** Whether this episode has been consolidated */
  consolidated: boolean;

  /** Consolidation timestamp (if consolidated) */
  consolidatedAt?: number;
}

/**
 * Importance signals used for Goldilocks selection criteria.
 */
export interface ImportanceSignals {
  /** DQ score of the episode (0-1) */
  dqScore: number;

  /** Surprise/novelty (how unexpected was this?) */
  surprise: number;

  /** Emotional salience (biometric stress correlation) */
  emotionalSalience: number;

  /** Temporal recency bonus */
  recency: number;

  /** Access/replay count (episodes accessed often are important) */
  accessCount: number;

  /** Task priority level */
  priority: number;

  /** Explicit user feedback (if any) */
  userFeedback?: number;
}

/**
 * Episode metadata for tracking and analysis.
 */
export interface EpisodeMetadata {
  /** Layer that processed this episode */
  layerId: SubsystemType;

  /** Latency of original task */
  latencyMs: number;

  /** Tokens used */
  tokensUsed: number;

  /** Context pages involved */
  contextPages: string[];

  /** Tags for categorization */
  tags: string[];

  /** Domain classification */
  domain?: string;

  /** Linked episodes (related memories) */
  linkedEpisodes: string[];
}

/**
 * Sleep phase types.
 */
export type SleepPhase = 'wake' | 'nrem' | 'rem';

/**
 * Sleep trigger reasons.
 */
export type SleepTrigger =
  | 'time-based'      // Scheduled sleep cycle
  | 'capacity-based'  // Episodic buffer full
  | 'biometric-based' // User stress/fatigue detected
  | 'quality-based'   // DQ scores degrading
  | 'manual';         // Explicitly triggered

/**
 * Result of NREM consolidation phase.
 */
export interface ConsolidationResult {
  /** Episodes selected for consolidation */
  episodesSelected: number;

  /** Episodes successfully consolidated */
  episodesConsolidated: number;

  /** Episodes pruned (forgotten) */
  episodesPruned: number;

  /** Average importance of consolidated episodes */
  avgImportance: number;

  /** EWC regularization applied */
  ewcApplied: boolean;

  /** Patterns identified during replay */
  patternsIdentified: string[];

  /** Duration of NREM phase (ms) */
  durationMs: number;
}

/**
 * Result of REM dreaming phase.
 */
export interface DreamResult {
  /** Synthetic episodes generated */
  syntheticEpisodes: number;

  /** Counterfactuals explored */
  counterfactualsExplored: number;

  /** Cross-domain patterns discovered */
  crossDomainPatterns: string[];

  /** Novel skill synthesis attempts */
  skillSynthesisAttempts: number;

  /** Successful synthesis */
  skillsSynthesized: string[];

  /** Dream narratives (compressed summaries) */
  dreamNarratives: string[];

  /** Duration of REM phase (ms) */
  durationMs: number;
}

/**
 * Cycle metrics for monitoring.
 */
export interface CycleMetrics {
  /** Current phase */
  currentPhase: SleepPhase;

  /** Time spent in current phase (ms) */
  phaseTimeMs: number;

  /** Total wake time in session (ms) */
  totalWakeTimeMs: number;

  /** Total sleep time in session (ms) */
  totalSleepTimeMs: number;

  /** Episodes in buffer */
  episodeBufferSize: number;

  /** Episodes in long-term memory */
  longTermMemorySize: number;

  /** Consolidation cycles completed */
  consolidationCycles: number;

  /** Dream cycles completed */
  dreamCycles: number;

  /** Average DQ score in wake phase */
  avgWakeDqScore: number;

  /** Forgetting rate (episodes pruned / total) */
  forgettingRate: number;

  /** Last sleep trigger */
  lastSleepTrigger?: SleepTrigger;

  /** Next scheduled sleep */
  nextScheduledSleep?: number;
}

/**
 * Configuration for WakeSleepAgent.
 */
export interface WakeSleepConfig {
  /** Default wake duration (ms) - default: 1 hour */
  wakeDurationMs: number;

  /** NREM proportion of sleep (0-1) - default: 0.75 */
  nremProportion: number;

  /** REM proportion of sleep (0-1) - default: 0.25 */
  remProportion: number;

  /** Episodic buffer capacity before triggering sleep */
  bufferCapacity: number;

  /** Goldilocks selection threshold (importance score 0-1) */
  goldilocksThreshold: number;

  /** EWC regularization strength (lambda) */
  ewcLambda: number;

  /** Minimum episodes for consolidation */
  minEpisodesForConsolidation: number;

  /** Maximum synthetic episodes per dream cycle */
  maxSyntheticEpisodes: number;

  /** Enable automatic sleep scheduling */
  autoScheduleSleep: boolean;

  /** Stress threshold for biometric sleep trigger (0-1) */
  stressSleepThreshold: number;

  /** DQ degradation threshold for quality-based sleep trigger */
  dqDegradationThreshold: number;
}

/**
 * Working memory entry for current wake phase.
 */
export interface WorkingMemoryEntry {
  id: string;
  content: unknown;
  relevance: number;
  lastAccessed: number;
}

/**
 * EWC Fisher information for protecting important weights.
 */
interface FisherInformation {
  parameterId: string;
  importance: number;
  optimalValue: unknown;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: WakeSleepConfig = {
  wakeDurationMs: 60 * 60 * 1000, // 1 hour
  nremProportion: 0.75,
  remProportion: 0.25,
  bufferCapacity: 100,
  goldilocksThreshold: 0.5,
  ewcLambda: 0.4,
  minEpisodesForConsolidation: 5,
  maxSyntheticEpisodes: 10,
  autoScheduleSleep: true,
  stressSleepThreshold: 0.85,
  dqDegradationThreshold: 0.3,
};

// =============================================================================
// WAKE SLEEP AGENT
// =============================================================================

/**
 * WakeSleepAgent implements biological sleep cycle simulation for
 * memory consolidation and skill synthesis.
 */
export class WakeSleepAgent {
  private static instance: WakeSleepAgent | null = null;

  private config: WakeSleepConfig;

  // Phase state
  private currentPhase: SleepPhase = 'wake';
  private phaseStartTime: number = Date.now();

  // Memory systems
  private episodicBuffer: Episode[] = [];
  private longTermMemory: Episode[] = [];
  private workingMemory: Map<string, WorkingMemoryEntry> = new Map();

  // EWC state
  private fisherInformation: FisherInformation[] = [];

  // Metrics tracking
  private metrics: CycleMetrics;
  private recentDqScores: number[] = [];

  // Biometric context
  private biometricContext?: BiometricContext;

  // Timers
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;

  // Event callbacks
  private onPhaseChange?: (phase: SleepPhase) => void;
  private onConsolidationComplete?: (result: ConsolidationResult) => void;
  private onDreamComplete?: (result: DreamResult) => void;

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<WakeSleepConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startWakePhase();
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<WakeSleepConfig>): WakeSleepAgent {
    if (!WakeSleepAgent.instance) {
      WakeSleepAgent.instance = new WakeSleepAgent(config);
    }
    return WakeSleepAgent.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    if (WakeSleepAgent.instance) {
      WakeSleepAgent.instance.cleanup();
    }
    WakeSleepAgent.instance = null;
  }

  private cleanup(): void {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private initializeMetrics(): CycleMetrics {
    return {
      currentPhase: 'wake',
      phaseTimeMs: 0,
      totalWakeTimeMs: 0,
      totalSleepTimeMs: 0,
      episodeBufferSize: 0,
      longTermMemorySize: 0,
      consolidationCycles: 0,
      dreamCycles: 0,
      avgWakeDqScore: 0.8,
      forgettingRate: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // WAKE PHASE
  // ---------------------------------------------------------------------------

  /**
   * Start the wake phase.
   * During wake: process tasks, store episodes, maintain working memory.
   */
  startWakePhase(): void {
    this.currentPhase = 'wake';
    this.phaseStartTime = Date.now();
    this.metrics.currentPhase = 'wake';

    logger.info('Wake phase started', undefined, 'WakeSleep');
    this.onPhaseChange?.('wake');

    // Schedule automatic sleep if enabled
    if (this.config.autoScheduleSleep) {
      this.scheduleSleep();
    }
  }

  /**
   * Process an incoming task during wake phase.
   * Stores the episode to episodic buffer with importance signals.
   */
  async processTask(task: OrganismTask): Promise<void> {
    if (this.currentPhase !== 'wake') {
      logger.warn('Cannot process task during sleep phase', undefined, 'WakeSleepAgent');
      return;
    }

    // Create episode from task
    const episode = this.createEpisode(task);

    // Add to episodic buffer
    this.episodicBuffer.push(episode);
    this.metrics.episodeBufferSize = this.episodicBuffer.length;

    // Update working memory
    this.updateWorkingMemory(episode);

    // Track DQ scores for degradation detection
    if (episode.importance.dqScore > 0) {
      this.recentDqScores.push(episode.importance.dqScore);
      if (this.recentDqScores.length > 20) {
        this.recentDqScores.shift();
      }
      this.updateAvgDqScore();
    }

    // Check if we should trigger sleep
    this.checkSleepTriggers();
  }

  private createEpisode(task: OrganismTask): Episode {
    const now = Date.now();
    const id = `ep-${now}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate importance signals
    const importance: ImportanceSignals = {
      dqScore: 0.7, // Default, will be updated when result arrives
      surprise: this.calculateSurprise(task),
      emotionalSalience: this.biometricContext?.stressLevel ?? 0.3,
      recency: 1.0, // Maximum recency for new episodes
      accessCount: 0,
      priority: this.priorityToNumber(task.priority ?? 'medium'),
    };

    return {
      id,
      taskId: task.id ?? '',
      intent: task.intent,
      content: {
        contextPages: task.contextPages,
        biometricContext: task.biometricContext,
        mcpPacks: task.mcpPacks,
      },
      result: null,
      importance,
      metadata: {
        layerId: 'cognitive',
        latencyMs: 0,
        tokensUsed: 0,
        contextPages: task.contextPages,
        tags: this.extractTags(task.intent),
        linkedEpisodes: [],
      },
      createdAt: now,
      consolidated: false,
    };
  }

  private calculateSurprise(task: OrganismTask): number {
    // Calculate surprise based on how different this task is from recent episodes
    if (this.episodicBuffer.length === 0) {
      return 0.8; // First episode is moderately surprising
    }

    const recentIntents = this.episodicBuffer
      .slice(-10)
      .map((e) => e.intent.toLowerCase());

    const taskWords = new Set(
      task.intent.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );

    let totalOverlap = 0;
    for (const intent of recentIntents) {
      const intentWords = new Set(
        intent.split(/\s+/).filter((w) => w.length > 3)
      );
      const overlap = [...taskWords].filter((w) => intentWords.has(w)).length;
      totalOverlap += overlap / Math.max(taskWords.size, 1);
    }

    const avgOverlap = totalOverlap / recentIntents.length;
    return Math.max(0, 1 - avgOverlap); // Higher surprise = less overlap
  }

  private priorityToNumber(priority: string): number {
    const priorityMap: Record<string, number> = {
      critical: 1.0,
      high: 0.8,
      normal: 0.5,
      low: 0.3,
      background: 0.1,
    };
    return priorityMap[priority] ?? 0.5;
  }

  private extractTags(intent: string): string[] {
    const tagPatterns: [RegExp, string][] = [
      [/code|implement|function|class/i, 'coding'],
      [/analyze|reason|understand/i, 'analysis'],
      [/search|find|query/i, 'search'],
      [/write|compose|draft/i, 'writing'],
      [/test|verify|validate/i, 'testing'],
      [/plan|schedule|organize/i, 'planning'],
    ];

    const tags: string[] = [];
    for (const [pattern, tag] of tagPatterns) {
      if (pattern.test(intent)) {
        tags.push(tag);
      }
    }

    return tags.length > 0 ? tags : ['general'];
  }

  private updateWorkingMemory(episode: Episode): void {
    // Add to working memory with relevance score
    const entry: WorkingMemoryEntry = {
      id: episode.id,
      content: {
        intent: episode.intent,
        tags: episode.metadata.tags,
      },
      relevance: episode.importance.dqScore * 0.5 + episode.importance.priority * 0.5,
      lastAccessed: Date.now(),
    };

    this.workingMemory.set(episode.id, entry);

    // Prune working memory if too large (keep top 20)
    if (this.workingMemory.size > 20) {
      const sorted = Array.from(this.workingMemory.entries())
        .sort((a, b) => b[1].relevance - a[1].relevance);

      this.workingMemory.clear();
      sorted.slice(0, 20).forEach(([id, e]) => this.workingMemory.set(id, e));
    }
  }

  private updateAvgDqScore(): void {
    if (this.recentDqScores.length > 0) {
      this.metrics.avgWakeDqScore =
        this.recentDqScores.reduce((a, b) => a + b, 0) / this.recentDqScores.length;
    }
  }

  /**
   * Update episode with execution result.
   */
  updateEpisodeResult(taskId: string, result: OrganismResult): void {
    const episode = this.episodicBuffer.find((e) => e.taskId === taskId);
    if (episode) {
      episode.result = result;
      episode.importance.dqScore = result.dqScore.score;
      episode.metadata.latencyMs = result.metadata.latencyMs;
      episode.metadata.tokensUsed = result.metadata.tokensUsed;
    }
  }

  // ---------------------------------------------------------------------------
  // SLEEP TRIGGERS
  // ---------------------------------------------------------------------------

  private scheduleSleep(): void {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
    }

    this.sleepTimer = setTimeout(() => {
      this.triggerSleep('time-based');
    }, this.config.wakeDurationMs);

    this.metrics.nextScheduledSleep = Date.now() + this.config.wakeDurationMs;
  }

  private checkSleepTriggers(): void {
    // Capacity-based trigger
    if (this.episodicBuffer.length >= this.config.bufferCapacity) {
      this.triggerSleep('capacity-based');
      return;
    }

    // Biometric-based trigger
    if (
      this.biometricContext &&
      this.biometricContext.stressLevel >= this.config.stressSleepThreshold
    ) {
      this.triggerSleep('biometric-based');
      return;
    }

    // Quality-based trigger (DQ degradation)
    if (this.recentDqScores.length >= 10) {
      const recent5 = this.recentDqScores.slice(-5);
      const older5 = this.recentDqScores.slice(-10, -5);
      const recentAvg = recent5.reduce((a, b) => a + b, 0) / 5;
      const olderAvg = older5.reduce((a, b) => a + b, 0) / 5;

      if (olderAvg - recentAvg > this.config.dqDegradationThreshold) {
        this.triggerSleep('quality-based');
      }
    }
  }

  /**
   * Trigger sleep cycle with specified reason.
   */
  async triggerSleep(reason: SleepTrigger): Promise<void> {
    if (this.currentPhase !== 'wake') {
      logger.warn('Already in sleep phase', undefined, 'WakeSleepAgent');
      return;
    }

    // Update wake metrics
    const wakeTime = Date.now() - this.phaseStartTime;
    this.metrics.totalWakeTimeMs += wakeTime;
    this.metrics.lastSleepTrigger = reason;

    logger.info(`Sleep triggered: ${reason}`, undefined, 'WakeSleep');

    // Clear scheduled sleep
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }

    // Run NREM phase (75% of sleep)
    const nremResult = await this.runNREMPhase();

    // Run REM phase (25% of sleep)
    const remResult = await this.runREMPhase();

    // Return to wake phase
    this.startWakePhase();
  }

  // ---------------------------------------------------------------------------
  // NREM PHASE (Consolidation)
  // ---------------------------------------------------------------------------

  /**
   * Run NREM phase: consolidate important memories.
   *
   * Steps:
   * 1. Select episodes using Goldilocks criteria
   * 2. Replay selected episodes
   * 3. Apply EWC to protect important patterns
   * 4. Prune low-importance episodes
   */
  async runNREMPhase(): Promise<ConsolidationResult> {
    const startTime = Date.now();
    this.currentPhase = 'nrem';
    this.phaseStartTime = startTime;
    this.metrics.currentPhase = 'nrem';

    logger.info('NREM phase started (consolidation)', undefined, 'WakeSleep');
    this.onPhaseChange?.('nrem');

    const result: ConsolidationResult = {
      episodesSelected: 0,
      episodesConsolidated: 0,
      episodesPruned: 0,
      avgImportance: 0,
      ewcApplied: false,
      patternsIdentified: [],
      durationMs: 0,
    };

    // Skip if not enough episodes
    if (this.episodicBuffer.length < this.config.minEpisodesForConsolidation) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Step 1: Select episodes using Goldilocks criteria
    const selectedEpisodes = this.selectEpisodesGoldilocks();
    result.episodesSelected = selectedEpisodes.length;

    // Step 2: Replay and consolidate
    for (const episode of selectedEpisodes) {
      const consolidated = await this.consolidateEpisode(episode);
      if (consolidated) {
        result.episodesConsolidated++;
      }
    }

    // Calculate average importance
    if (selectedEpisodes.length > 0) {
      result.avgImportance =
        selectedEpisodes.reduce((sum, e) => sum + this.computeImportanceScore(e), 0) /
        selectedEpisodes.length;
    }

    // Step 3: Apply EWC
    if (result.episodesConsolidated > 0) {
      this.applyEWC(selectedEpisodes);
      result.ewcApplied = true;
    }

    // Step 4: Identify patterns
    result.patternsIdentified = this.identifyPatterns(selectedEpisodes);

    // Step 5: Prune low-importance episodes
    const pruned = this.pruneEpisodes();
    result.episodesPruned = pruned;
    this.metrics.forgettingRate = pruned / Math.max(1, this.episodicBuffer.length + pruned);

    // Update metrics
    result.durationMs = Date.now() - startTime;
    this.metrics.totalSleepTimeMs += result.durationMs;
    this.metrics.consolidationCycles++;
    this.metrics.longTermMemorySize = this.longTermMemory.length;

    this.onConsolidationComplete?.(result);

    return result;
  }

  /**
   * Select episodes using Goldilocks criteria.
   * Not too important (already learned), not too trivial (not worth learning).
   */
  private selectEpisodesGoldilocks(): Episode[] {
    // Compute importance score for each episode
    const scored = this.episodicBuffer
      .filter((e) => !e.consolidated)
      .map((episode) => ({
        episode,
        score: this.computeImportanceScore(episode),
      }));

    // Sort by importance
    scored.sort((a, b) => b.score - a.score);

    // Apply Goldilocks: select middle range (not top 10%, not bottom 40%)
    const total = scored.length;
    const startIdx = Math.floor(total * 0.1); // Skip top 10%
    const endIdx = Math.floor(total * 0.6); // Take up to 60th percentile

    // Ensure we select at least some episodes
    const selection = scored.slice(startIdx, endIdx);

    // Also include very high importance episodes (above threshold)
    const highImportance = scored
      .slice(0, startIdx)
      .filter((s) => s.score >= this.config.goldilocksThreshold);

    return [...highImportance, ...selection].map((s) => s.episode);
  }

  /**
   * Compute composite importance score for an episode.
   */
  private computeImportanceScore(episode: Episode): number {
    const { importance } = episode;

    // Weighted combination of signals
    const score =
      importance.dqScore * 0.25 +
      importance.surprise * 0.2 +
      importance.emotionalSalience * 0.15 +
      importance.recency * 0.15 +
      importance.priority * 0.15 +
      Math.min(importance.accessCount / 10, 1) * 0.1;

    // User feedback override
    if (importance.userFeedback !== undefined) {
      return score * 0.5 + importance.userFeedback * 0.5;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Consolidate a single episode to long-term memory.
   */
  private async consolidateEpisode(episode: Episode): Promise<boolean> {
    try {
      // Mark as consolidated
      episode.consolidated = true;
      episode.consolidatedAt = Date.now();

      // Move to long-term memory
      this.longTermMemory.push({ ...episode });

      // Link related episodes
      this.linkRelatedEpisodes(episode);

      return true;
    } catch (error) {
      logger.error('Consolidation error', error, 'WakeSleepAgent');
      return false;
    }
  }

  private linkRelatedEpisodes(episode: Episode): void {
    // Find similar episodes by tags
    const linkedIds: string[] = [];

    for (const ltmEpisode of this.longTermMemory.slice(-50)) {
      if (ltmEpisode.id === episode.id) continue;

      const tagOverlap = episode.metadata.tags.filter((t) =>
        ltmEpisode.metadata.tags.includes(t)
      );

      if (tagOverlap.length > 0) {
        linkedIds.push(ltmEpisode.id);
        ltmEpisode.metadata.linkedEpisodes.push(episode.id);
      }
    }

    episode.metadata.linkedEpisodes = linkedIds;
  }

  /**
   * Apply Elastic Weight Consolidation to protect important patterns.
   */
  private applyEWC(episodes: Episode[]): void {
    // Compute Fisher information for important patterns
    const patterns = new Map<string, number>();

    for (const episode of episodes) {
      const importance = this.computeImportanceScore(episode);

      // Track tag importance
      for (const tag of episode.metadata.tags) {
        const current = patterns.get(tag) || 0;
        patterns.set(tag, current + importance);
      }

      // Track domain importance
      if (episode.metadata.domain) {
        const domainKey = `domain:${episode.metadata.domain}`;
        const current = patterns.get(domainKey) || 0;
        patterns.set(domainKey, current + importance);
      }
    }

    // Update Fisher information
    for (const [pattern, importance] of patterns) {
      const existing = this.fisherInformation.find(
        (f) => f.parameterId === pattern
      );

      if (existing) {
        // Exponential moving average
        existing.importance = existing.importance * 0.8 + importance * 0.2;
      } else {
        this.fisherInformation.push({
          parameterId: pattern,
          importance: importance * this.config.ewcLambda,
          optimalValue: null,
        });
      }
    }

    // Prune low-importance Fisher entries
    this.fisherInformation = this.fisherInformation
      .filter((f) => f.importance > 0.1)
      .slice(-100); // Keep top 100
  }

  /**
   * Identify patterns across consolidated episodes.
   */
  private identifyPatterns(episodes: Episode[]): string[] {
    const patterns: string[] = [];

    // Temporal patterns
    const timeSlots = new Map<number, number>();
    for (const episode of episodes) {
      const hour = new Date(episode.createdAt).getHours();
      timeSlots.set(hour, (timeSlots.get(hour) || 0) + 1);
    }

    const peakHour = [...timeSlots.entries()].sort((a, b) => b[1] - a[1])[0];
    if (peakHour && peakHour[1] > 3) {
      patterns.push(`peak_activity_hour:${peakHour[0]}`);
    }

    // Tag co-occurrence patterns
    const tagPairs = new Map<string, number>();
    for (const episode of episodes) {
      const tags = episode.metadata.tags;
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const pair = [tags[i], tags[j]].sort().join('+');
          tagPairs.set(pair, (tagPairs.get(pair) || 0) + 1);
        }
      }
    }

    for (const [pair, count] of tagPairs) {
      if (count >= 3) {
        patterns.push(`tag_cooccurrence:${pair}`);
      }
    }

    // Success patterns
    const successfulTags = new Map<string, number>();
    const totalTagCounts = new Map<string, number>();

    for (const episode of episodes) {
      const isSuccess = episode.result?.success ?? false;
      for (const tag of episode.metadata.tags) {
        totalTagCounts.set(tag, (totalTagCounts.get(tag) || 0) + 1);
        if (isSuccess) {
          successfulTags.set(tag, (successfulTags.get(tag) || 0) + 1);
        }
      }
    }

    for (const [tag, count] of totalTagCounts) {
      const successCount = successfulTags.get(tag) || 0;
      const successRate = successCount / count;
      if (successRate >= 0.8 && count >= 3) {
        patterns.push(`high_success_tag:${tag}`);
      }
    }

    return patterns;
  }

  /**
   * Prune low-importance episodes from buffer.
   */
  private pruneEpisodes(): number {
    const initialCount = this.episodicBuffer.length;

    // Keep episodes above forgetting threshold or not yet consolidated
    const retainThreshold = this.config.goldilocksThreshold * 0.3;

    this.episodicBuffer = this.episodicBuffer.filter((episode) => {
      // Always keep unconsolidated episodes
      if (!episode.consolidated) return true;

      // Compute importance with recency decay
      const age = (Date.now() - episode.createdAt) / (24 * 60 * 60 * 1000); // Days
      const decayedImportance =
        this.computeImportanceScore(episode) * Math.exp(-age * 0.1);

      return decayedImportance >= retainThreshold;
    });

    this.metrics.episodeBufferSize = this.episodicBuffer.length;

    return initialCount - this.episodicBuffer.length;
  }

  // ---------------------------------------------------------------------------
  // REM PHASE (Dreaming)
  // ---------------------------------------------------------------------------

  /**
   * Run REM phase: generate synthetic episodes and explore counterfactuals.
   *
   * Steps:
   * 1. Generate synthetic episodes (dreaming)
   * 2. Explore counterfactuals (what if scenarios)
   * 3. Cross-domain pattern discovery
   * 4. Attempt novel skill synthesis
   */
  async runREMPhase(): Promise<DreamResult> {
    const startTime = Date.now();
    this.currentPhase = 'rem';
    this.phaseStartTime = startTime;
    this.metrics.currentPhase = 'rem';

    logger.info('REM phase started (dreaming)', undefined, 'WakeSleep');
    this.onPhaseChange?.('rem');

    const result: DreamResult = {
      syntheticEpisodes: 0,
      counterfactualsExplored: 0,
      crossDomainPatterns: [],
      skillSynthesisAttempts: 0,
      skillsSynthesized: [],
      dreamNarratives: [],
      durationMs: 0,
    };

    // Step 1: Generate synthetic episodes
    const synthetic = await this.generateSyntheticEpisodes();
    result.syntheticEpisodes = synthetic.length;

    // Step 2: Explore counterfactuals
    const counterfactuals = await this.exploreCounterfactuals();
    result.counterfactualsExplored = counterfactuals;

    // Step 3: Cross-domain pattern discovery
    result.crossDomainPatterns = this.discoverCrossDomainPatterns();

    // Step 4: Attempt skill synthesis
    const synthesis = await this.attemptSkillSynthesis();
    result.skillSynthesisAttempts = synthesis.attempts;
    result.skillsSynthesized = synthesis.successful;

    // Generate dream narratives
    result.dreamNarratives = this.generateDreamNarratives(
      synthetic,
      result.crossDomainPatterns
    );

    // Update metrics
    result.durationMs = Date.now() - startTime;
    this.metrics.totalSleepTimeMs += result.durationMs;
    this.metrics.dreamCycles++;

    this.onDreamComplete?.(result);

    return result;
  }

  /**
   * Generate synthetic episodes by recombining existing memories.
   */
  private async generateSyntheticEpisodes(): Promise<Episode[]> {
    const synthetic: Episode[] = [];
    const maxEpisodes = this.config.maxSyntheticEpisodes;

    // Get recent consolidated episodes as source material
    const sourceEpisodes = this.longTermMemory.slice(-20);
    if (sourceEpisodes.length < 2) {
      return synthetic;
    }

    // Generate combinations
    for (let i = 0; i < maxEpisodes && i < sourceEpisodes.length - 1; i++) {
      const source1 = sourceEpisodes[i];
      const source2 = sourceEpisodes[i + 1];

      // Combine elements
      const syntheticEpisode = this.combineEpisodes(source1, source2);
      if (syntheticEpisode) {
        synthetic.push(syntheticEpisode);
      }
    }

    // Add to long-term memory with synthetic flag
    for (const episode of synthetic) {
      this.longTermMemory.push(episode);
    }

    return synthetic;
  }

  private combineEpisodes(ep1: Episode, ep2: Episode): Episode | null {
    // Only combine if tags partially overlap
    const tagOverlap = ep1.metadata.tags.filter((t) =>
      ep2.metadata.tags.includes(t)
    );

    if (tagOverlap.length === 0) {
      return null;
    }

    const now = Date.now();
    const id = `syn-${now}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      taskId: `synthetic-${id}`,
      intent: `Combined: ${ep1.intent.slice(0, 30)} + ${ep2.intent.slice(0, 30)}`,
      content: {
        source1: ep1.id,
        source2: ep2.id,
        synthetic: true,
      },
      result: null,
      importance: {
        dqScore: (ep1.importance.dqScore + ep2.importance.dqScore) / 2,
        surprise: 0.8, // Synthetic episodes are surprising by nature
        emotionalSalience: Math.max(
          ep1.importance.emotionalSalience,
          ep2.importance.emotionalSalience
        ),
        recency: 1.0,
        accessCount: 0,
        priority: (ep1.importance.priority + ep2.importance.priority) / 2,
      },
      metadata: {
        layerId: 'cognitive',
        latencyMs: 0,
        tokensUsed: 0,
        contextPages: [
          ...ep1.metadata.contextPages,
          ...ep2.metadata.contextPages,
        ],
        tags: [...new Set([...ep1.metadata.tags, ...ep2.metadata.tags])],
        domain: ep1.metadata.domain || ep2.metadata.domain,
        linkedEpisodes: [ep1.id, ep2.id],
      },
      createdAt: now,
      consolidated: true,
      consolidatedAt: now,
    };
  }

  /**
   * Explore counterfactual scenarios.
   */
  private async exploreCounterfactuals(): Promise<number> {
    let explored = 0;

    // Find failed episodes
    const failedEpisodes = this.longTermMemory.filter(
      (e) => e.result && !e.result.success
    );

    for (const episode of failedEpisodes.slice(-5)) {
      // Generate "what if" variant
      const counterfactual = this.generateCounterfactual(episode);
      if (counterfactual) {
        this.longTermMemory.push(counterfactual);
        explored++;
      }
    }

    return explored;
  }

  private generateCounterfactual(episode: Episode): Episode | null {
    const now = Date.now();
    const id = `cf-${now}-${Math.random().toString(36).substr(2, 9)}`;

    // Modify intent to explore alternative approach
    const modifiedIntent = `Alternative: ${episode.intent} [counterfactual]`;

    return {
      id,
      taskId: `counterfactual-${episode.taskId}`,
      intent: modifiedIntent,
      content: {
        original: episode.id,
        counterfactual: true,
        modifiedAspect: 'approach',
      },
      result: null,
      importance: {
        dqScore: episode.importance.dqScore * 1.2, // Boost importance for learning
        surprise: 0.9,
        emotionalSalience: episode.importance.emotionalSalience,
        recency: 1.0,
        accessCount: 0,
        priority: episode.importance.priority,
      },
      metadata: {
        layerId: 'cognitive',
        latencyMs: 0,
        tokensUsed: 0,
        contextPages: episode.metadata.contextPages,
        tags: [...episode.metadata.tags, 'counterfactual'],
        domain: episode.metadata.domain,
        linkedEpisodes: [episode.id],
      },
      createdAt: now,
      consolidated: true,
      consolidatedAt: now,
    };
  }

  /**
   * Discover patterns across different domains.
   */
  private discoverCrossDomainPatterns(): string[] {
    const patterns: string[] = [];

    // Group episodes by domain
    const domainEpisodes = new Map<string, Episode[]>();
    for (const episode of this.longTermMemory) {
      const domain = episode.metadata.domain || 'general';
      if (!domainEpisodes.has(domain)) {
        domainEpisodes.set(domain, []);
      }
      domainEpisodes.get(domain)!.push(episode);
    }

    // Find common patterns across domains
    const domains = Array.from(domainEpisodes.keys());
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const domain1Episodes = domainEpisodes.get(domains[i])!;
        const domain2Episodes = domainEpisodes.get(domains[j])!;

        // Find shared tags
        const tags1 = new Set(domain1Episodes.flatMap((e) => e.metadata.tags));
        const tags2 = new Set(domain2Episodes.flatMap((e) => e.metadata.tags));
        const shared = [...tags1].filter((t) => tags2.has(t));

        if (shared.length > 0) {
          patterns.push(
            `cross_domain:${domains[i]}+${domains[j]}:${shared.join(',')}`
          );
        }
      }
    }

    return patterns;
  }

  /**
   * Attempt to synthesize novel skills from patterns.
   */
  private async attemptSkillSynthesis(): Promise<{
    attempts: number;
    successful: string[];
  }> {
    const result = { attempts: 0, successful: [] as string[] };

    // Find high-importance patterns from Fisher information
    const importantPatterns = this.fisherInformation
      .filter((f) => f.importance > 0.5)
      .slice(0, 5);

    for (const pattern of importantPatterns) {
      result.attempts++;

      // Check if pattern represents a learnable skill
      if (pattern.parameterId.startsWith('high_success_tag:')) {
        const tag = pattern.parameterId.replace('high_success_tag:', '');
        result.successful.push(`skill:${tag}`);
      } else if (pattern.parameterId.startsWith('tag_cooccurrence:')) {
        const combo = pattern.parameterId.replace('tag_cooccurrence:', '');
        result.successful.push(`combo_skill:${combo}`);
      }
    }

    return result;
  }

  /**
   * Generate compressed dream narratives.
   */
  private generateDreamNarratives(
    syntheticEpisodes: Episode[],
    patterns: string[]
  ): string[] {
    const narratives: string[] = [];

    // Narrative from synthetic episodes
    if (syntheticEpisodes.length > 0) {
      const intents = syntheticEpisodes.map((e) => e.intent).join(' -> ');
      narratives.push(`Dream sequence: ${intents}`);
    }

    // Narrative from patterns
    if (patterns.length > 0) {
      narratives.push(`Pattern discoveries: ${patterns.join(', ')}`);
    }

    // Summary narrative
    narratives.push(
      `Cycle summary: ${syntheticEpisodes.length} synthetic memories, ${patterns.length} patterns`
    );

    return narratives;
  }

  // ---------------------------------------------------------------------------
  // BIOMETRIC INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Handle biometric context changes.
   */
  onBiometricChange(context: BiometricContext): void {
    this.biometricContext = context;

    // Update emotional salience for recent episodes
    for (const episode of this.episodicBuffer.slice(-5)) {
      episode.importance.emotionalSalience = Math.max(
        episode.importance.emotionalSalience,
        context.stressLevel
      );
    }

    // Check for sleep trigger
    if (this.currentPhase === 'wake') {
      this.checkSleepTriggers();
    }
  }

  // ---------------------------------------------------------------------------
  // METRICS & API
  // ---------------------------------------------------------------------------

  /**
   * Get current cycle metrics.
   */
  getCycleMetrics(): CycleMetrics {
    // Update phase time
    this.metrics.phaseTimeMs = Date.now() - this.phaseStartTime;

    return { ...this.metrics };
  }

  /**
   * Get current phase.
   */
  getCurrentPhase(): SleepPhase {
    return this.currentPhase;
  }

  /**
   * Get episodic buffer (read-only).
   */
  getEpisodicBuffer(): readonly Episode[] {
    return this.episodicBuffer;
  }

  /**
   * Get long-term memory (read-only).
   */
  getLongTermMemory(): readonly Episode[] {
    return this.longTermMemory;
  }

  /**
   * Get working memory.
   */
  getWorkingMemory(): Map<string, WorkingMemoryEntry> {
    return new Map(this.workingMemory);
  }

  /**
   * Set event callbacks.
   */
  setCallbacks(callbacks: {
    onPhaseChange?: (phase: SleepPhase) => void;
    onConsolidationComplete?: (result: ConsolidationResult) => void;
    onDreamComplete?: (result: DreamResult) => void;
  }): void {
    this.onPhaseChange = callbacks.onPhaseChange;
    this.onConsolidationComplete = callbacks.onConsolidationComplete;
    this.onDreamComplete = callbacks.onDreamComplete;
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<WakeSleepConfig>): void {
    this.config = { ...this.config, ...config };

    // Reschedule sleep if auto-scheduling is enabled
    if (this.config.autoScheduleSleep && this.currentPhase === 'wake') {
      this.scheduleSleep();
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): WakeSleepConfig {
    return { ...this.config };
  }

  /**
   * Access an episode (increases access count).
   */
  accessEpisode(episodeId: string): Episode | undefined {
    const episode =
      this.episodicBuffer.find((e) => e.id === episodeId) ||
      this.longTermMemory.find((e) => e.id === episodeId);

    if (episode) {
      episode.importance.accessCount++;
    }

    return episode;
  }

  /**
   * Provide user feedback on an episode.
   */
  provideFeedback(episodeId: string, feedback: number): void {
    const episode =
      this.episodicBuffer.find((e) => e.id === episodeId) ||
      this.longTermMemory.find((e) => e.id === episodeId);

    if (episode) {
      episode.importance.userFeedback = Math.min(1, Math.max(0, feedback));
    }
  }

  /**
   * Force manual sleep trigger.
   */
  forceSleep(): Promise<void> {
    return this.triggerSleep('manual');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of WakeSleepAgent.
 */
export const wakeSleepAgent = WakeSleepAgent.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createWakeSleepAgent(
  config?: Partial<WakeSleepConfig>
): WakeSleepAgent {
  WakeSleepAgent.resetInstance();
  return WakeSleepAgent.getInstance(config);
}
