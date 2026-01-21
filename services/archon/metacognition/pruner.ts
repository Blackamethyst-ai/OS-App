/**
 * ARCHON Context Pruner
 *
 * Surgical history management for context windows.
 * Implements intelligent pruning strategies from arXiv:2601.09742.
 */

import {
  ContextWindow,
  ContextSegment,
  PruningResult,
  PruningStrategy,
} from './types';
import { generateId, archonLog } from '../utils';

// =============================================================================
// PRUNER CONFIGURATION
// =============================================================================

export interface PrunerConfig {
  // Target utilization (0-1)
  targetUtilization: number;

  // Minimum relevance score to keep
  minRelevanceScore: number;

  // Segments that should never be pruned
  protectedTypes: ContextSegment['type'][];

  // Age threshold for LRU (ms)
  lruThresholdMs: number;

  // Summary compression ratio
  summaryRatio: number;
}

const DEFAULT_PRUNER_CONFIG: PrunerConfig = {
  targetUtilization: 0.8,
  minRelevanceScore: 0.3,
  protectedTypes: ['system', 'goal'],
  lruThresholdMs: 5 * 60 * 1000, // 5 minutes
  summaryRatio: 0.25, // Compress to 25% of original
};

// =============================================================================
// CONTEXT PRUNER
// =============================================================================

export class ContextPruner {
  private config: PrunerConfig;

  constructor(config?: Partial<PrunerConfig>) {
    this.config = { ...DEFAULT_PRUNER_CONFIG, ...config };
  }

  /**
   * Create a new context window
   */
  createWindow(totalTokens: number): ContextWindow {
    return {
      totalTokens,
      usedTokens: 0,
      remainingTokens: totalTokens,
      segments: [],
    };
  }

  /**
   * Add a segment to the context window
   */
  addSegment(
    window: ContextWindow,
    type: ContextSegment['type'],
    content: string,
    options?: {
      relevanceScore?: number;
      canPrune?: boolean;
    }
  ): ContextSegment {
    const tokens = this.estimateTokens(content);
    const segment: ContextSegment = {
      id: generateId('seg'),
      type,
      content,
      tokens,
      relevanceScore: options?.relevanceScore ?? 0.5,
      timestamp: Date.now(),
      canPrune: options?.canPrune ?? !this.config.protectedTypes.includes(type),
    };

    window.segments.push(segment);
    window.usedTokens += tokens;
    window.remainingTokens = window.totalTokens - window.usedTokens;

    return segment;
  }

  /**
   * Check if pruning is needed
   */
  needsPruning(window: ContextWindow): boolean {
    const utilization = window.usedTokens / window.totalTokens;
    return utilization > this.config.targetUtilization;
  }

  /**
   * Prune context to fit within budget
   */
  prune(
    window: ContextWindow,
    strategy: PruningStrategy = 'surgical',
    targetTokens?: number
  ): PruningResult {
    const target = targetTokens ?? Math.floor(window.totalTokens * this.config.targetUtilization);
    const originalTokens = window.usedTokens;

    if (window.usedTokens <= target) {
      return {
        originalTokens,
        prunedTokens: window.usedTokens,
        removedSegments: [],
        strategy,
      };
    }

    const removedSegments: string[] = [];

    switch (strategy) {
      case 'lru':
        this.pruneLRU(window, target, removedSegments);
        break;
      case 'relevance':
        this.pruneByRelevance(window, target, removedSegments);
        break;
      case 'surgical':
        this.pruneSurgical(window, target, removedSegments);
        break;
      case 'summarize':
        this.pruneWithSummary(window, target, removedSegments);
        break;
    }

    archonLog('info', `Pruned context: ${originalTokens} → ${window.usedTokens} tokens`, {
      strategy,
      removed: removedSegments.length,
    });

    return {
      originalTokens,
      prunedTokens: window.usedTokens,
      removedSegments,
      strategy,
    };
  }

  /**
   * LRU pruning - remove oldest segments first
   */
  private pruneLRU(
    window: ContextWindow,
    target: number,
    removedSegments: string[]
  ): void {
    // Sort by timestamp (oldest first)
    const pruneable = window.segments
      .filter((s) => s.canPrune)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const segment of pruneable) {
      if (window.usedTokens <= target) break;

      window.usedTokens -= segment.tokens;
      removedSegments.push(segment.id);
    }

    // Remove pruned segments
    window.segments = window.segments.filter((s) => !removedSegments.includes(s.id));
    window.remainingTokens = window.totalTokens - window.usedTokens;
  }

  /**
   * Relevance pruning - remove lowest relevance first
   */
  private pruneByRelevance(
    window: ContextWindow,
    target: number,
    removedSegments: string[]
  ): void {
    // Sort by relevance (lowest first)
    const pruneable = window.segments
      .filter((s) => s.canPrune)
      .sort((a, b) => a.relevanceScore - b.relevanceScore);

    for (const segment of pruneable) {
      if (window.usedTokens <= target) break;
      if (segment.relevanceScore >= this.config.minRelevanceScore) break;

      window.usedTokens -= segment.tokens;
      removedSegments.push(segment.id);
    }

    window.segments = window.segments.filter((s) => !removedSegments.includes(s.id));
    window.remainingTokens = window.totalTokens - window.usedTokens;
  }

  /**
   * Surgical pruning - smart selective removal
   *
   * Strategy:
   * 1. First remove old, low-relevance segments
   * 2. Then remove duplicate/similar content
   * 3. Then compress verbose segments
   * 4. Finally remove by age if still over budget
   */
  private pruneSurgical(
    window: ContextWindow,
    target: number,
    removedSegments: string[]
  ): void {
    const now = Date.now();

    // Phase 1: Remove old AND low relevance segments
    const oldAndLowRelevance = window.segments.filter(
      (s) =>
        s.canPrune &&
        s.relevanceScore < 0.4 &&
        now - s.timestamp > this.config.lruThresholdMs
    );

    for (const segment of oldAndLowRelevance) {
      if (window.usedTokens <= target) break;
      window.usedTokens -= segment.tokens;
      removedSegments.push(segment.id);
    }

    if (window.usedTokens <= target) {
      window.segments = window.segments.filter((s) => !removedSegments.includes(s.id));
      window.remainingTokens = window.totalTokens - window.usedTokens;
      return;
    }

    // Phase 2: Remove tool results if we have the summary
    const toolResults = window.segments.filter(
      (s) => s.canPrune && s.type === 'tool'
    );

    for (const segment of toolResults) {
      if (window.usedTokens <= target) break;
      // Keep if recent or high relevance
      if (now - segment.timestamp < 60000 || segment.relevanceScore > 0.7) continue;

      window.usedTokens -= segment.tokens;
      removedSegments.push(segment.id);
    }

    if (window.usedTokens <= target) {
      window.segments = window.segments.filter((s) => !removedSegments.includes(s.id));
      window.remainingTokens = window.totalTokens - window.usedTokens;
      return;
    }

    // Phase 3: Remove history entries (keep recent ones)
    const historyEntries = window.segments
      .filter((s) => s.canPrune && s.type === 'history')
      .sort((a, b) => a.timestamp - b.timestamp);

    // Keep last 5 history entries
    const toRemove = historyEntries.slice(0, -5);
    for (const segment of toRemove) {
      if (window.usedTokens <= target) break;
      window.usedTokens -= segment.tokens;
      removedSegments.push(segment.id);
    }

    // Final cleanup
    window.segments = window.segments.filter((s) => !removedSegments.includes(s.id));
    window.remainingTokens = window.totalTokens - window.usedTokens;
  }

  /**
   * Summary pruning - compress segments to summaries
   */
  private pruneWithSummary(
    window: ContextWindow,
    target: number,
    removedSegments: string[]
  ): void {
    // Find large, old segments to summarize
    const candidates = window.segments
      .filter(
        (s) =>
          s.canPrune &&
          s.tokens > 500 &&
          Date.now() - s.timestamp > this.config.lruThresholdMs
      )
      .sort((a, b) => b.tokens - a.tokens);

    for (const segment of candidates) {
      if (window.usedTokens <= target) break;

      // Create a compressed summary (placeholder - would use LLM in real impl)
      const summary = this.createSummary(segment.content);
      const summaryTokens = this.estimateTokens(summary);

      // Replace segment with summary
      segment.content = summary;
      window.usedTokens -= segment.tokens - summaryTokens;
      segment.tokens = summaryTokens;
    }

    window.remainingTokens = window.totalTokens - window.usedTokens;
  }

  /**
   * Update relevance scores based on current goal
   */
  updateRelevance(window: ContextWindow, currentGoal: string): void {
    const goalTerms = currentGoal.toLowerCase().split(/\s+/);

    for (const segment of window.segments) {
      const contentTerms = segment.content.toLowerCase().split(/\s+/);
      const overlap = goalTerms.filter((term) =>
        contentTerms.some((ct) => ct.includes(term) || term.includes(ct))
      ).length;

      // Base relevance on term overlap + recency
      const termRelevance = overlap / Math.max(1, goalTerms.length);
      const recency = Math.max(0, 1 - (Date.now() - segment.timestamp) / (10 * 60 * 1000));

      segment.relevanceScore = termRelevance * 0.7 + recency * 0.3;
    }
  }

  /**
   * Get context statistics
   */
  getStats(window: ContextWindow): {
    totalTokens: number;
    usedTokens: number;
    utilization: number;
    segmentCount: number;
    byType: Record<string, number>;
    avgRelevance: number;
  } {
    const byType: Record<string, number> = {};
    let totalRelevance = 0;

    for (const segment of window.segments) {
      byType[segment.type] = (byType[segment.type] ?? 0) + segment.tokens;
      totalRelevance += segment.relevanceScore;
    }

    return {
      totalTokens: window.totalTokens,
      usedTokens: window.usedTokens,
      utilization: window.usedTokens / window.totalTokens,
      segmentCount: window.segments.length,
      byType,
      avgRelevance: window.segments.length > 0
        ? totalRelevance / window.segments.length
        : 0,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Estimate tokens for content (simple approximation)
   */
  private estimateTokens(content: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Create a summary of content (placeholder)
   */
  private createSummary(content: string): string {
    // In production, this would use an LLM to summarize
    // For now, just truncate with indicator
    const targetLength = Math.floor(content.length * this.config.summaryRatio);
    if (content.length <= targetLength) return content;

    return content.substring(0, targetLength) + '... [summarized]';
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let prunerInstance: ContextPruner | null = null;

export function getContextPruner(config?: Partial<PrunerConfig>): ContextPruner {
  if (!prunerInstance) {
    prunerInstance = new ContextPruner(config);
  }
  return prunerInstance;
}
