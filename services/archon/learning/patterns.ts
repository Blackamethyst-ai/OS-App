/**
 * ARCHON Pattern Memory
 *
 * Cross-system pattern storage with persistence.
 * Stores learned patterns for future decision-making.
 */

import { Pattern, PatternType, PatternContext, PatternOutcome, SubsystemType } from '../types';
import { archonLog, generateId } from '../utils';

// =============================================================================
// PATTERN MEMORY CONFIGURATION
// =============================================================================

export interface PatternMemoryConfig {
  // Storage
  maxPatterns: number;
  persistenceEnabled: boolean;
  storageKey: string;

  // Decay
  decayEnabled: boolean;
  decayIntervalMs: number;
  decayRate: number;
  minConfidenceToKeep: number;

  // Clustering
  clusterSimilarPatterns: boolean;
  similarityThreshold: number;
}

const DEFAULT_PATTERN_CONFIG: PatternMemoryConfig = {
  maxPatterns: 1000,
  persistenceEnabled: true,
  storageKey: 'archon_patterns',

  decayEnabled: true,
  decayIntervalMs: 24 * 60 * 60 * 1000, // Daily
  decayRate: 0.05,
  minConfidenceToKeep: 0.3,

  clusterSimilarPatterns: true,
  similarityThreshold: 0.8,
};

// =============================================================================
// PATTERN INDEX
// =============================================================================

interface PatternIndex {
  byType: Map<PatternType, Set<string>>;
  byGoalType: Map<string, Set<string>>;
  bySubsystem: Map<SubsystemType, Set<string>>;
  byKeyword: Map<string, Set<string>>;
}

// =============================================================================
// PATTERN MEMORY
// =============================================================================

export class PatternMemory {
  private config: PatternMemoryConfig;
  private patterns: Map<string, Pattern> = new Map();
  private index: PatternIndex;
  private decayTimer?: NodeJS.Timeout;

  constructor(config?: Partial<PatternMemoryConfig>) {
    this.config = { ...DEFAULT_PATTERN_CONFIG, ...config };
    this.index = this.createEmptyIndex();

    // Load from persistence
    if (this.config.persistenceEnabled) {
      this.loadFromStorage();
    }

    // Start decay timer
    if (this.config.decayEnabled) {
      this.startDecayTimer();
    }

    archonLog('info', 'PatternMemory initialized', {
      loadedPatterns: this.patterns.size,
      persistenceEnabled: this.config.persistenceEnabled,
    });
  }

  // ===========================================================================
  // PATTERN STORAGE
  // ===========================================================================

  /**
   * Store a pattern
   */
  store(pattern: Pattern): void {
    // Check for similar existing pattern
    if (this.config.clusterSimilarPatterns) {
      const similar = this.findSimilar(pattern);
      if (similar) {
        this.mergePatterns(similar, pattern);
        return;
      }
    }

    // Evict if at capacity
    if (this.patterns.size >= this.config.maxPatterns) {
      this.evictLowestConfidence();
    }

    // Store and index
    this.patterns.set(pattern.id, pattern);
    this.indexPattern(pattern);

    // Persist
    if (this.config.persistenceEnabled) {
      this.persistToStorage();
    }

    archonLog('debug', 'Pattern stored', {
      patternId: pattern.id,
      type: pattern.type,
      confidence: pattern.confidence,
    });
  }

  /**
   * Retrieve a pattern by ID
   */
  get(patternId: string): Pattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Delete a pattern
   */
  delete(patternId: string): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;

    this.removeFromIndex(pattern);
    this.patterns.delete(patternId);

    if (this.config.persistenceEnabled) {
      this.persistToStorage();
    }

    return true;
  }

  /**
   * Update pattern confidence and frequency
   */
  reinforce(patternId: string, success: boolean): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.frequency++;
    pattern.lastSeen = Date.now();

    // Adjust confidence
    if (success) {
      pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
    } else {
      pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);
    }

    if (this.config.persistenceEnabled) {
      this.persistToStorage();
    }
  }

  // ===========================================================================
  // PATTERN QUERIES
  // ===========================================================================

  /**
   * Find patterns by type
   */
  findByType(type: PatternType): Pattern[] {
    const ids = this.index.byType.get(type);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.patterns.get(id)!).filter(Boolean);
  }

  /**
   * Find patterns by goal type
   */
  findByGoalType(goalType: string): Pattern[] {
    const ids = this.index.byGoalType.get(goalType);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.patterns.get(id)!).filter(Boolean);
  }

  /**
   * Find patterns by subsystem
   */
  findBySubsystem(subsystem: SubsystemType): Pattern[] {
    const ids = this.index.bySubsystem.get(subsystem);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.patterns.get(id)!).filter(Boolean);
  }

  /**
   * Find patterns by keywords
   */
  findByKeywords(keywords: string[]): Pattern[] {
    const matchedIds = new Set<string>();

    for (const keyword of keywords) {
      const ids = this.index.byKeyword.get(keyword.toLowerCase());
      if (ids) {
        for (const id of Array.from(ids)) {
          matchedIds.add(id);
        }
      }
    }

    return Array.from(matchedIds)
      .map((id) => this.patterns.get(id)!)
      .filter(Boolean);
  }

  /**
   * Find similar patterns for a context
   */
  findMatching(
    goalType: string,
    complexity: number,
    subsystems: SubsystemType[],
    keywords: string[]
  ): Pattern[] {
    const candidates = new Map<string, number>();

    // Score patterns from multiple indices
    const goalPatterns = this.findByGoalType(goalType);
    for (const p of goalPatterns) {
      candidates.set(p.id, (candidates.get(p.id) ?? 0) + 0.4);
    }

    for (const subsystem of subsystems) {
      const subPatterns = this.findBySubsystem(subsystem);
      for (const p of subPatterns) {
        candidates.set(p.id, (candidates.get(p.id) ?? 0) + 0.2);
      }
    }

    const keywordPatterns = this.findByKeywords(keywords);
    for (const p of keywordPatterns) {
      candidates.set(p.id, (candidates.get(p.id) ?? 0) + 0.15);
    }

    // Add complexity similarity bonus
    for (const [id, score] of Array.from(candidates.entries())) {
      const pattern = this.patterns.get(id);
      if (pattern) {
        const complexityDiff = Math.abs(pattern.context.complexity - complexity);
        candidates.set(id, score + (1 - complexityDiff) * 0.25);
      }
    }

    // Return sorted by score * confidence
    return Array.from(candidates.entries())
      .map(([id, score]) => ({ pattern: this.patterns.get(id)!, score }))
      .filter((x) => x.pattern)
      .sort((a, b) => (b.score * b.pattern.confidence) - (a.score * a.pattern.confidence))
      .map((x) => x.pattern);
  }

  /**
   * Get high-confidence success patterns
   */
  getSuccessPatterns(minConfidence: number = 0.7): Pattern[] {
    return this.findByType('success')
      .filter((p) => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get failure patterns to avoid
   */
  getFailurePatterns(minConfidence: number = 0.6): Pattern[] {
    return this.findByType('failure')
      .filter((p) => p.confidence >= minConfidence)
      .sort((a, b) => b.frequency - a.frequency);
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get memory statistics
   */
  getStats(): {
    totalPatterns: number;
    byType: Record<PatternType, number>;
    avgConfidence: number;
    avgFrequency: number;
    oldestPattern: number;
    newestPattern: number;
  } {
    const byType: Record<PatternType, number> = {
      success: 0,
      failure: 0,
      escalation: 0,
      optimization: 0,
    };

    let totalConfidence = 0;
    let totalFrequency = 0;
    let oldest = Date.now();
    let newest = 0;

    for (const pattern of Array.from(this.patterns.values())) {
      byType[pattern.type]++;
      totalConfidence += pattern.confidence;
      totalFrequency += pattern.frequency;
      if (pattern.createdAt < oldest) oldest = pattern.createdAt;
      if (pattern.createdAt > newest) newest = pattern.createdAt;
    }

    const count = this.patterns.size;
    return {
      totalPatterns: count,
      byType,
      avgConfidence: count > 0 ? totalConfidence / count : 0,
      avgFrequency: count > 0 ? totalFrequency / count : 0,
      oldestPattern: oldest,
      newestPattern: newest,
    };
  }

  /**
   * Get all patterns (for debugging/export)
   */
  getAll(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  // ===========================================================================
  // MAINTENANCE
  // ===========================================================================

  /**
   * Apply decay to all patterns
   */
  applyDecay(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, pattern] of Array.from(this.patterns.entries())) {
      // Apply time-based decay
      const ageMs = now - pattern.lastSeen;
      const decayPeriods = ageMs / this.config.decayIntervalMs;
      pattern.confidence *= Math.pow(1 - this.config.decayRate, decayPeriods);

      // Mark for removal if below threshold
      if (pattern.confidence < this.config.minConfidenceToKeep) {
        toRemove.push(id);
      }
    }

    // Remove decayed patterns
    for (const id of toRemove) {
      const pattern = this.patterns.get(id);
      if (pattern) {
        this.removeFromIndex(pattern);
        this.patterns.delete(id);
      }
    }

    if (toRemove.length > 0) {
      archonLog('debug', `Decayed ${toRemove.length} patterns`);
      if (this.config.persistenceEnabled) {
        this.persistToStorage();
      }
    }
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
    this.index = this.createEmptyIndex();

    if (this.config.persistenceEnabled) {
      this.persistToStorage();
    }

    archonLog('info', 'Pattern memory cleared');
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
    }
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private createEmptyIndex(): PatternIndex {
    return {
      byType: new Map(),
      byGoalType: new Map(),
      bySubsystem: new Map(),
      byKeyword: new Map(),
    };
  }

  private indexPattern(pattern: Pattern): void {
    // Index by type
    if (!this.index.byType.has(pattern.type)) {
      this.index.byType.set(pattern.type, new Set());
    }
    this.index.byType.get(pattern.type)!.add(pattern.id);

    // Index by goal type
    const goalType = pattern.context.goalType;
    if (!this.index.byGoalType.has(goalType)) {
      this.index.byGoalType.set(goalType, new Set());
    }
    this.index.byGoalType.get(goalType)!.add(pattern.id);

    // Index by subsystems
    for (const subsystem of pattern.context.subsystemsInvolved) {
      if (!this.index.bySubsystem.has(subsystem)) {
        this.index.bySubsystem.set(subsystem, new Set());
      }
      this.index.bySubsystem.get(subsystem)!.add(pattern.id);
    }

    // Index by keywords
    for (const keyword of pattern.context.keywords) {
      const key = keyword.toLowerCase();
      if (!this.index.byKeyword.has(key)) {
        this.index.byKeyword.set(key, new Set());
      }
      this.index.byKeyword.get(key)!.add(pattern.id);
    }
  }

  private removeFromIndex(pattern: Pattern): void {
    this.index.byType.get(pattern.type)?.delete(pattern.id);
    this.index.byGoalType.get(pattern.context.goalType)?.delete(pattern.id);

    for (const subsystem of pattern.context.subsystemsInvolved) {
      this.index.bySubsystem.get(subsystem)?.delete(pattern.id);
    }

    for (const keyword of pattern.context.keywords) {
      this.index.byKeyword.get(keyword.toLowerCase())?.delete(pattern.id);
    }
  }

  private findSimilar(pattern: Pattern): Pattern | undefined {
    const candidates = this.findMatching(
      pattern.context.goalType,
      pattern.context.complexity,
      pattern.context.subsystemsInvolved,
      pattern.context.keywords
    );

    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(pattern, candidate);
      if (similarity >= this.config.similarityThreshold) {
        return candidate;
      }
    }

    return undefined;
  }

  private calculateSimilarity(a: Pattern, b: Pattern): number {
    let score = 0;

    // Same type
    if (a.type === b.type) score += 0.3;

    // Same goal type
    if (a.context.goalType === b.context.goalType) score += 0.25;

    // Complexity similarity
    const complexityDiff = Math.abs(a.context.complexity - b.context.complexity);
    score += (1 - complexityDiff) * 0.2;

    // Subsystem overlap
    const aSubsystems = new Set(a.context.subsystemsInvolved);
    const bSubsystems = new Set(b.context.subsystemsInvolved);
    const overlap = Array.from(aSubsystems).filter((s) => bSubsystems.has(s)).length;
    const maxLen = Math.max(aSubsystems.size, bSubsystems.size);
    if (maxLen > 0) {
      score += (overlap / maxLen) * 0.25;
    }

    return score;
  }

  private mergePatterns(existing: Pattern, incoming: Pattern): void {
    // Update with weighted average
    const totalFreq = existing.frequency + incoming.frequency;
    const existingWeight = existing.frequency / totalFreq;
    const incomingWeight = incoming.frequency / totalFreq;

    existing.outcome.dqScore = existing.outcome.dqScore * existingWeight + incoming.outcome.dqScore * incomingWeight;
    existing.outcome.latencyMs = existing.outcome.latencyMs * existingWeight + incoming.outcome.latencyMs * incomingWeight;
    existing.confidence = Math.min(0.95, existing.confidence + 0.02);
    existing.frequency++;
    existing.lastSeen = Date.now();

    // Merge keywords
    const allKeywords = new Set([...existing.context.keywords, ...incoming.context.keywords]);
    existing.context.keywords = Array.from(allKeywords).slice(0, 15);

    archonLog('debug', 'Patterns merged', { patternId: existing.id });
  }

  private evictLowestConfidence(): void {
    let lowest: Pattern | undefined;
    let lowestScore = Infinity;

    for (const pattern of Array.from(this.patterns.values())) {
      // Score = confidence * recency factor
      const recencyFactor = 1 / (1 + (Date.now() - pattern.lastSeen) / (7 * 24 * 60 * 60 * 1000));
      const score = pattern.confidence * recencyFactor;
      if (score < lowestScore) {
        lowestScore = score;
        lowest = pattern;
      }
    }

    if (lowest) {
      this.removeFromIndex(lowest);
      this.patterns.delete(lowest.id);
    }
  }

  private startDecayTimer(): void {
    this.decayTimer = setInterval(() => {
      this.applyDecay();
    }, this.config.decayIntervalMs);
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;

      const data = localStorage.getItem(this.config.storageKey);
      if (!data) return;

      const parsed = JSON.parse(data);
      for (const pattern of parsed.patterns ?? []) {
        this.patterns.set(pattern.id, pattern);
        this.indexPattern(pattern);
      }

      archonLog('debug', `Loaded ${this.patterns.size} patterns from storage`);
    } catch (error) {
      archonLog('warn', 'Failed to load patterns from storage', { error });
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;

      const data = {
        version: 1,
        timestamp: Date.now(),
        patterns: Array.from(this.patterns.values()),
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      archonLog('warn', 'Failed to persist patterns to storage', { error });
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let memoryInstance: PatternMemory | null = null;

export function getPatternMemory(config?: Partial<PatternMemoryConfig>): PatternMemory {
  if (!memoryInstance) {
    memoryInstance = new PatternMemory(config);
  }
  return memoryInstance;
}
