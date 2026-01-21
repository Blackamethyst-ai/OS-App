/**
 * ARCHON Cache Manager
 *
 * Agentic plan caching for reduced latency and cost.
 * Based on arXiv:2508.02694 - 46% cost reduction while retaining 97% accuracy.
 */

import {
  CachedPlan,
  CachedPlanContent,
  CachedPlanMetadata,
  CachedStep,
  CacheStats,
  ResourceConfig,
  DEFAULT_RESOURCE_CONFIG,
} from './types';
import { SubsystemType } from '../types';
import { archonLog, generateId } from '../utils';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

interface CacheConfig {
  enabled: boolean;
  maxEntries: number;
  expirationMs: number;
  minHitRateToCache: number;
  similarityThreshold: number;
  prefetchEnabled: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  maxEntries: 1000,
  expirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minHitRateToCache: 0.3,
  similarityThreshold: 0.85, // How similar goals need to be for cache hit
  prefetchEnabled: true,
};

// =============================================================================
// CACHE MANAGER
// =============================================================================

export class CacheManager {
  private config: CacheConfig;
  private cache: Map<string, CachedPlan> = new Map();
  private accessLog: Array<{ hash: string; timestamp: number; hit: boolean }> = [];

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    archonLog('info', 'CacheManager initialized', {
      maxEntries: this.config.maxEntries,
      expirationMs: this.config.expirationMs,
    });
  }

  // ===========================================================================
  // MAIN API
  // ===========================================================================

  /**
   * Look up a cached plan for a goal
   */
  lookup(goal: string): CachedPlan | undefined {
    if (!this.config.enabled) return undefined;

    const hash = this.hashGoal(goal);

    // Exact match
    let cached = this.cache.get(hash);
    if (cached && !this.isExpired(cached)) {
      this.recordAccess(hash, true);
      this.updateMetadata(cached);
      archonLog('debug', 'Cache hit (exact)', { goal: goal.slice(0, 50) });
      return cached;
    }

    // Fuzzy match - find similar goals
    const similar = this.findSimilar(goal);
    if (similar) {
      this.recordAccess(this.hashGoal(similar.goal), true);
      this.updateMetadata(similar);
      archonLog('debug', 'Cache hit (similar)', {
        goal: goal.slice(0, 50),
        matchedGoal: similar.goal.slice(0, 50),
      });
      return similar;
    }

    this.recordAccess(hash, false);
    return undefined;
  }

  /**
   * Store a plan in the cache
   */
  store(
    goal: string,
    plan: CachedPlanContent,
    initialDqScore?: number
  ): CachedPlan {
    if (!this.config.enabled) {
      return this.createPlan(goal, plan, initialDqScore);
    }

    // Check if we should cache based on hit rate
    const hitRate = this.getHitRate();
    if (hitRate < this.config.minHitRateToCache && this.cache.size > 100) {
      archonLog('debug', 'Skipping cache store - low hit rate', { hitRate });
      return this.createPlan(goal, plan, initialDqScore);
    }

    // Evict if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const hash = this.hashGoal(goal);
    const cachedPlan = this.createPlan(goal, plan, initialDqScore);
    this.cache.set(hash, cachedPlan);

    archonLog('debug', 'Plan cached', {
      goal: goal.slice(0, 50),
      steps: plan.steps.length,
    });

    return cachedPlan;
  }

  /**
   * Update plan metadata after execution
   */
  recordExecution(
    planId: string,
    dqScore: number,
    latencyMs: number,
    success: boolean
  ): void {
    for (const plan of Array.from(this.cache.values())) {
      if (plan.id === planId) {
        const meta = plan.metadata;
        const n = meta.useCount;

        meta.avgDqScore = (meta.avgDqScore * n + dqScore) / (n + 1);
        meta.avgLatencyMs = (meta.avgLatencyMs * n + latencyMs) / (n + 1);
        meta.successRate = (meta.successRate * n + (success ? 1 : 0)) / (n + 1);
        meta.useCount = n + 1;
        meta.lastUsed = Date.now();

        archonLog('debug', 'Plan execution recorded', {
          planId,
          dqScore,
          avgDqScore: meta.avgDqScore,
          useCount: meta.useCount,
        });
        return;
      }
    }
  }

  /**
   * Invalidate a cached plan
   */
  invalidate(goal: string): boolean {
    const hash = this.hashGoal(goal);
    const deleted = this.cache.delete(hash);
    if (deleted) {
      archonLog('debug', 'Plan invalidated', { goal: goal.slice(0, 50) });
    }
    return deleted;
  }

  /**
   * Clear all cached plans
   */
  clear(): void {
    this.cache.clear();
    this.accessLog = [];
    archonLog('info', 'Cache cleared');
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    // Calculate hit rate from recent accesses
    const hitRate = this.getHitRate();

    // Calculate average age
    const avgAge = entries.length > 0
      ? entries.reduce((sum, p) => sum + (now - p.metadata.createdAt), 0) / entries.length
      : 0;

    // Estimate size (rough)
    const sizeBytes = entries.reduce((sum, p) => {
      return sum + JSON.stringify(p).length * 2; // Unicode chars ~2 bytes
    }, 0);

    // Top patterns by use count
    const topPatterns = entries
      .sort((a, b) => b.metadata.useCount - a.metadata.useCount)
      .slice(0, 10)
      .map((p) => ({
        goalPattern: this.extractPattern(p.goal),
        useCount: p.metadata.useCount,
      }));

    return {
      totalEntries: this.cache.size,
      hitRate,
      avgAge,
      sizeBytes,
      topPatterns,
    };
  }

  /**
   * Get hit rate from recent accesses
   */
  getHitRate(): number {
    const recentAccesses = this.accessLog.slice(-100);
    if (recentAccesses.length === 0) return 0;

    const hits = recentAccesses.filter((a) => a.hit).length;
    return hits / recentAccesses.length;
  }

  /**
   * List all cached plans
   */
  listPlans(): Array<{ id: string; goal: string; useCount: number; avgDqScore: number }> {
    return Array.from(this.cache.values()).map((p) => ({
      id: p.id,
      goal: p.goal,
      useCount: p.metadata.useCount,
      avgDqScore: p.metadata.avgDqScore,
    }));
  }

  // ===========================================================================
  // PREFETCHING
  // ===========================================================================

  /**
   * Prefetch likely next plans based on patterns
   */
  getPrefetchSuggestions(currentGoal: string): string[] {
    if (!this.config.prefetchEnabled) return [];

    const pattern = this.extractPattern(currentGoal);
    const suggestions: string[] = [];

    // Find plans with similar patterns that often follow
    for (const plan of Array.from(this.cache.values())) {
      const planPattern = this.extractPattern(plan.goal);
      if (this.patternsRelated(pattern, planPattern)) {
        suggestions.push(plan.goal);
      }
      if (suggestions.length >= 3) break;
    }

    return suggestions;
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private createPlan(
    goal: string,
    plan: CachedPlanContent,
    initialDqScore?: number
  ): CachedPlan {
    return {
      id: generateId('plan'),
      goalHash: this.hashGoal(goal),
      goal,
      plan,
      metadata: {
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 1,
        avgDqScore: initialDqScore ?? 0.7,
        avgLatencyMs: 0,
        successRate: 1.0,
      },
    };
  }

  private hashGoal(goal: string): string {
    // Simple hash for goal lookup
    const normalized = goal.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `goal_${Math.abs(hash).toString(16)}`;
  }

  private findSimilar(goal: string): CachedPlan | undefined {
    const normalizedGoal = goal.toLowerCase().trim();
    const goalWords = new Set(normalizedGoal.split(/\s+/));

    let bestMatch: CachedPlan | undefined;
    let bestScore = 0;

    for (const plan of Array.from(this.cache.values())) {
      if (this.isExpired(plan)) continue;

      const similarity = this.calculateSimilarity(normalizedGoal, goalWords, plan.goal);
      if (similarity > bestScore && similarity >= this.config.similarityThreshold) {
        bestScore = similarity;
        bestMatch = plan;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(
    goal1: string,
    goal1Words: Set<string>,
    goal2: string
  ): number {
    const goal2Normalized = goal2.toLowerCase().trim();
    const goal2Words = new Set(goal2Normalized.split(/\s+/));

    // Jaccard similarity
    const intersection = Array.from(goal1Words).filter((w) => goal2Words.has(w)).length;
    const union = new Set([...Array.from(goal1Words), ...Array.from(goal2Words)]).size;

    if (union === 0) return 0;
    return intersection / union;
  }

  private isExpired(plan: CachedPlan): boolean {
    return Date.now() - plan.metadata.createdAt > this.config.expirationMs;
  }

  private updateMetadata(plan: CachedPlan): void {
    plan.metadata.lastUsed = Date.now();
    plan.metadata.useCount++;
  }

  private recordAccess(hash: string, hit: boolean): void {
    this.accessLog.push({
      hash,
      timestamp: Date.now(),
      hit,
    });

    // Keep access log bounded
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }
  }

  private evictLRU(): void {
    let oldest: CachedPlan | undefined;
    let oldestTime = Date.now();

    for (const plan of Array.from(this.cache.values())) {
      if (plan.metadata.lastUsed < oldestTime) {
        oldestTime = plan.metadata.lastUsed;
        oldest = plan;
      }
    }

    if (oldest) {
      this.cache.delete(oldest.goalHash);
      archonLog('debug', 'LRU eviction', { goal: oldest.goal.slice(0, 50) });
    }
  }

  private extractPattern(goal: string): string {
    // Extract key action words for pattern matching
    const actionWords = ['add', 'create', 'build', 'fix', 'update', 'remove', 'delete', 'implement', 'refactor'];
    const words = goal.toLowerCase().split(/\s+/);
    const actions = words.filter((w) => actionWords.includes(w));
    const nouns = words.filter((w) => w.length > 4 && !actionWords.includes(w));

    return [...actions, ...nouns.slice(0, 3)].join(' ');
  }

  private patternsRelated(pattern1: string, pattern2: string): boolean {
    const words1 = new Set(pattern1.split(' '));
    const words2 = new Set(pattern2.split(' '));
    const overlap = Array.from(words1).filter((w) => words2.has(w)).length;
    return overlap >= 2;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let cacheInstance: CacheManager | null = null;

export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(config);
  }
  return cacheInstance;
}

// =============================================================================
// HELPER: Create cache content from decomposition
// =============================================================================

export function createCacheContent(
  steps: Array<{ description: string; subsystem?: SubsystemType; dependencies?: string[] }>,
  estimatedTokens: number,
  estimatedCost: number
): CachedPlanContent {
  return {
    steps: steps.map((s, i) => ({
      id: `step_${i}`,
      description: s.description,
      subsystem: s.subsystem,
      dependencies: s.dependencies ?? [],
    })),
    subsystems: Array.from(new Set(steps.map((s) => s.subsystem).filter(Boolean))) as SubsystemType[],
    estimatedTokens,
    estimatedCost,
  };
}
