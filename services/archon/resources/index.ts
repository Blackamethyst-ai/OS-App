/**
 * ARCHON Resource Management Module
 *
 * Budget allocation, cost-aware routing, and plan caching.
 *
 * @example
 * ```typescript
 * import { getBudgetAllocator, getCostAwareRouter, getCacheManager } from '@/services/archon/resources';
 *
 * // Budget allocation
 * const allocator = getBudgetAllocator();
 * const budget = allocator.createBudget('task-123');
 * const response = allocator.requestAllocation({
 *   taskId: 'task-123',
 *   subsystem: 'ace',
 *   estimatedInputTokens: 5000,
 *   estimatedOutputTokens: 2000,
 *   priority: 'high',
 * });
 *
 * // Cost-aware routing
 * const router = getCostAwareRouter();
 * const decision = router.route({
 *   taskType: 'code-generation',
 *   complexity: 0.7,
 *   estimatedTokens: 5000,
 *   priority: 'high',
 *   previousAttempts: 0,
 * });
 *
 * // Plan caching
 * const cache = getCacheManager();
 * const cached = cache.lookup('Add dark mode toggle');
 * ```
 */

// Types
export type {
  TokenBudget,
  SubsystemBudget,
  BudgetAllocation,
  BudgetRequest,
  BudgetResponse,
  AlternativeAllocation,
  CostRecord,
  CostSummary,
  CostLimits,
  RoutingDecision,
  RoutingAlternative,
  RoutingContext,
  RoutingConstraints,
  CachedPlan,
  CachedPlanContent,
  CachedPlanMetadata,
  CachedStep,
  CacheStats,
  ResourceManagerState,
  ResourceConfig,
} from './types';

export { DEFAULT_RESOURCE_CONFIG } from './types';

// Budget Allocator
export { BudgetAllocator, getBudgetAllocator } from './allocator';

// Cost-Aware Router
export { CostAwareRouter, getCostAwareRouter } from './router';

// Cache Manager
export { CacheManager, getCacheManager, createCacheContent } from './cache';

// =============================================================================
// CONVENIENCE INTERFACE
// =============================================================================

import { getBudgetAllocator } from './allocator';
import { getCostAwareRouter } from './router';
import { getCacheManager } from './cache';

/**
 * Unified resource management interface
 */
export const resources = {
  /**
   * Get the budget allocator
   */
  get allocator() {
    return getBudgetAllocator();
  },

  /**
   * Get the cost-aware router
   */
  get router() {
    return getCostAwareRouter();
  },

  /**
   * Get the cache manager
   */
  get cache() {
    return getCacheManager();
  },

  /**
   * Create a budget for a task
   */
  createBudget(taskId: string, totalTokens?: number) {
    return getBudgetAllocator().createBudget(taskId, totalTokens);
  },

  /**
   * Route a task to optimal model
   */
  route(taskType: string, complexity: number, priority: 'critical' | 'high' | 'normal' | 'low' | 'background' = 'normal') {
    return getCostAwareRouter().route({
      taskType,
      complexity,
      estimatedTokens: 5000,
      priority,
      previousAttempts: 0,
    });
  },

  /**
   * Look up cached plan
   */
  lookupPlan(goal: string) {
    return getCacheManager().lookup(goal);
  },

  /**
   * Get combined statistics
   */
  getStats() {
    return {
      budget: getBudgetAllocator().getStats(),
      router: getCostAwareRouter().getStats(),
      cache: getCacheManager().getStats(),
    };
  },
};
