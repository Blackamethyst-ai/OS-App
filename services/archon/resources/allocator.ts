/**
 * ARCHON Budget Allocator
 *
 * Token budget allocation across subsystems with priority-based distribution.
 * Implements cost tracking from arXiv:2511.02755.
 */

import {
  TokenBudget,
  SubsystemBudget,
  BudgetAllocation,
  BudgetRequest,
  BudgetResponse,
  AlternativeAllocation,
  CostRecord,
  CostSummary,
  CostLimits,
  ResourceConfig,
  DEFAULT_RESOURCE_CONFIG,
} from './types';
import { SubsystemType, Priority, ModelTier } from '../types';
import { getModelRegistry } from '../metacognition/modelRegistry';
import { archonLog, generateId } from '../utils';

// =============================================================================
// PRIORITY MULTIPLIERS
// =============================================================================

const PRIORITY_MULTIPLIERS: Record<Priority, number> = {
  critical: 2.0,
  high: 1.5,
  normal: 1.0,
  low: 0.7,
  background: 0.3,
};

const TIER_COSTS: Record<ModelTier, number> = {
  flagship: 1.0,
  standard: 0.3,
  fast: 0.1,
  local: 0.0,
};

// =============================================================================
// BUDGET ALLOCATOR
// =============================================================================

export class BudgetAllocator {
  private config: ResourceConfig;
  private activeBudgets: Map<string, TokenBudget> = new Map();
  private costHistory: CostRecord[] = [];
  private sessionStart: number = Date.now();
  private sessionCost: number = 0;
  private sessionTokens: number = 0;

  constructor(config?: Partial<ResourceConfig>) {
    this.config = { ...DEFAULT_RESOURCE_CONFIG, ...config };
    archonLog('info', 'BudgetAllocator initialized', {
      sessionBudget: this.config.sessionBudget,
      preferQuality: this.config.preferQualityOverCost,
    });
  }

  // ===========================================================================
  // BUDGET CREATION & ALLOCATION
  // ===========================================================================

  /**
   * Create a new budget for a task
   */
  createBudget(
    taskId: string,
    totalTokens?: number,
    expirationMs?: number
  ): TokenBudget {
    const budget: TokenBudget = {
      id: generateId('budget'),
      taskId,
      total: totalTokens ?? this.config.defaultBudgetPerTask,
      used: 0,
      remaining: totalTokens ?? this.config.defaultBudgetPerTask,
      subsystemAllocations: new Map(),
      startedAt: Date.now(),
      expiresAt: Date.now() + (expirationMs ?? this.config.budgetExpirationMs),
      lastUpdated: Date.now(),
    };

    // Pre-allocate based on subsystem priorities
    this.initializeSubsystemAllocations(budget);

    this.activeBudgets.set(budget.id, budget);
    archonLog('debug', `Budget created: ${budget.id}`, {
      taskId,
      total: budget.total,
    });

    return budget;
  }

  /**
   * Request budget allocation for a specific operation
   */
  requestAllocation(request: BudgetRequest): BudgetResponse {
    const {
      taskId,
      subsystem,
      estimatedInputTokens,
      estimatedOutputTokens,
      priority = 'normal',
      preferredModel,
    } = request;

    const totalNeeded = estimatedInputTokens + estimatedOutputTokens;

    // Find or create budget for task
    let budget = this.findBudgetForTask(taskId);
    if (!budget) {
      budget = this.createBudget(taskId);
    }

    // Check if budget is expired
    if (Date.now() > budget.expiresAt) {
      return {
        approved: false,
        reason: 'Budget expired',
        alternatives: this.suggestAlternatives(totalNeeded, priority),
      };
    }

    // Check subsystem allocation
    const subsystemBudget = budget.subsystemAllocations.get(subsystem);
    if (!subsystemBudget || subsystemBudget.remaining < totalNeeded) {
      // Try to reallocate from lower-priority subsystems
      const reallocated = this.tryReallocate(budget, subsystem, totalNeeded);
      if (!reallocated) {
        return {
          approved: false,
          reason: `Insufficient budget for ${subsystem}`,
          alternatives: this.suggestAlternatives(totalNeeded, priority),
        };
      }
    }

    // Check cost limits
    const registry = getModelRegistry();
    const modelId = preferredModel ?? this.selectModelForBudget(totalNeeded, priority);
    const estimatedCost = registry.estimateCost(modelId, estimatedInputTokens, estimatedOutputTokens);

    if (!this.checkCostLimits(estimatedCost)) {
      return {
        approved: false,
        reason: 'Cost limit exceeded',
        alternatives: this.suggestCheaperAlternatives(totalNeeded),
      };
    }

    // Approve allocation
    const allocation: BudgetAllocation = {
      taskId,
      subsystem,
      requestedTokens: totalNeeded,
      allocatedTokens: totalNeeded,
      priority,
      modelTier: this.getModelTier(modelId),
      estimatedCost,
      expiresAt: budget.expiresAt,
    };

    // Update budget
    this.consumeFromSubsystem(budget, subsystem, totalNeeded);

    archonLog('debug', `Allocation approved: ${subsystem}`, {
      tokens: totalNeeded,
      cost: estimatedCost,
      model: modelId,
    });

    return { approved: true, allocation };
  }

  /**
   * Record actual token usage after completion
   */
  recordUsage(
    budgetId: string,
    subsystem: SubsystemType,
    actualInputTokens: number,
    actualOutputTokens: number,
    modelId: string
  ): void {
    const budget = this.activeBudgets.get(budgetId);
    if (!budget) return;

    const totalUsed = actualInputTokens + actualOutputTokens;
    const registry = getModelRegistry();
    const actualCost = registry.estimateCost(modelId, actualInputTokens, actualOutputTokens);

    // Update budget
    budget.used += totalUsed;
    budget.remaining = budget.total - budget.used;
    budget.lastUpdated = Date.now();

    const subsystemBudget = budget.subsystemAllocations.get(subsystem);
    if (subsystemBudget) {
      subsystemBudget.used += totalUsed;
      subsystemBudget.remaining = subsystemBudget.allocated - subsystemBudget.used;
    }

    // Record cost
    const record: CostRecord = {
      id: generateId('cost'),
      taskId: budget.taskId ?? 'unknown',
      modelId,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      cost: actualCost,
      timestamp: Date.now(),
    };
    this.costHistory.push(record);
    this.sessionCost += actualCost;
    this.sessionTokens += totalUsed;

    archonLog('debug', `Usage recorded: ${modelId}`, {
      tokens: totalUsed,
      cost: actualCost,
      sessionTotal: this.sessionCost,
    });
  }

  /**
   * Release a budget (task completed or cancelled)
   */
  releaseBudget(budgetId: string): void {
    this.activeBudgets.delete(budgetId);
    archonLog('debug', `Budget released: ${budgetId}`);
  }

  // ===========================================================================
  // COST TRACKING
  // ===========================================================================

  /**
   * Get cost summary for the session
   */
  getCostSummary(): CostSummary {
    const byModel = new Map<string, number>();
    const bySubsystem = new Map<SubsystemType, number>();
    const byTaskType = new Map<string, number>();

    for (const record of this.costHistory) {
      // By model
      const modelCost = byModel.get(record.modelId) ?? 0;
      byModel.set(record.modelId, modelCost + record.cost);
    }

    return {
      totalCost: this.sessionCost,
      byModel,
      bySubsystem,
      byTaskType,
      period: {
        start: this.sessionStart,
        end: Date.now(),
      },
    };
  }

  /**
   * Check if we're within cost limits
   */
  checkCostLimits(additionalCost: number): boolean {
    const limits = this.config.costLimits;

    if (limits.perTask && additionalCost > limits.perTask) {
      return false;
    }

    if (limits.perSession && this.sessionCost + additionalCost > limits.perSession) {
      return false;
    }

    return true;
  }

  /**
   * Get remaining budget for session
   */
  getRemainingSessionBudget(): { tokens: number; cost: number } {
    const limits = this.config.costLimits;
    return {
      tokens: this.config.sessionBudget - this.sessionTokens,
      cost: (limits.perSession ?? 20) - this.sessionCost,
    };
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get allocator statistics
   */
  getStats(): {
    activeBudgets: number;
    sessionTokensUsed: number;
    sessionCost: number;
    costRecords: number;
    averageCostPerTask: number;
  } {
    const avgCost = this.costHistory.length > 0
      ? this.sessionCost / this.costHistory.length
      : 0;

    return {
      activeBudgets: this.activeBudgets.size,
      sessionTokensUsed: this.sessionTokens,
      sessionCost: this.sessionCost,
      costRecords: this.costHistory.length,
      averageCostPerTask: avgCost,
    };
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private initializeSubsystemAllocations(budget: TokenBudget): void {
    const subsystems: SubsystemType[] = ['ace', 'dq', 'dream', 'evolution', 'kernel', 'voice', 'cpb'];
    const priorities = this.config.subsystemPriorities;

    // Calculate total weight
    let totalWeight = 0;
    for (const subsystem of subsystems) {
      const priority = priorities[subsystem] ?? 'normal';
      totalWeight += PRIORITY_MULTIPLIERS[priority];
    }

    // Allocate proportionally
    for (const subsystem of subsystems) {
      const priority = priorities[subsystem] ?? 'normal';
      const weight = PRIORITY_MULTIPLIERS[priority];
      const allocation = Math.floor(budget.total * (weight / totalWeight));

      budget.subsystemAllocations.set(subsystem, {
        allocated: allocation,
        used: 0,
        remaining: allocation,
        priority,
      });
    }
  }

  private findBudgetForTask(taskId: string): TokenBudget | undefined {
    for (const budget of Array.from(this.activeBudgets.values())) {
      if (budget.taskId === taskId && Date.now() < budget.expiresAt) {
        return budget;
      }
    }
    return undefined;
  }

  private tryReallocate(
    budget: TokenBudget,
    targetSubsystem: SubsystemType,
    needed: number
  ): boolean {
    const targetBudget = budget.subsystemAllocations.get(targetSubsystem);
    if (!targetBudget) return false;

    const deficit = needed - targetBudget.remaining;
    if (deficit <= 0) return true;

    // Try to take from lower-priority subsystems
    const targetPriority = targetBudget.priority;
    const sortedSubsystems = Array.from(budget.subsystemAllocations.entries())
      .filter(([name]) => name !== targetSubsystem)
      .sort((a, b) => PRIORITY_MULTIPLIERS[a[1].priority] - PRIORITY_MULTIPLIERS[b[1].priority]);

    let collected = 0;
    for (const [subsystemName, subsystemBudget] of sortedSubsystems) {
      if (PRIORITY_MULTIPLIERS[subsystemBudget.priority] >= PRIORITY_MULTIPLIERS[targetPriority]) {
        continue; // Don't take from equal or higher priority
      }

      const available = subsystemBudget.remaining;
      const toTake = Math.min(available, deficit - collected);
      if (toTake > 0) {
        subsystemBudget.remaining -= toTake;
        subsystemBudget.allocated -= toTake;
        targetBudget.remaining += toTake;
        targetBudget.allocated += toTake;
        collected += toTake;

        if (collected >= deficit) break;
      }
    }

    return collected >= deficit;
  }

  private consumeFromSubsystem(
    budget: TokenBudget,
    subsystem: SubsystemType,
    tokens: number
  ): void {
    const subsystemBudget = budget.subsystemAllocations.get(subsystem);
    if (subsystemBudget) {
      subsystemBudget.used += tokens;
      subsystemBudget.remaining -= tokens;
    }
    budget.used += tokens;
    budget.remaining -= tokens;
    budget.lastUpdated = Date.now();
  }

  private selectModelForBudget(tokens: number, priority: Priority): string {
    // Performance-first: prefer flagship unless constrained
    if (this.config.preferQualityOverCost) {
      if (priority === 'critical' || priority === 'high') {
        return 'claude-opus-4-7';
      }
      return 'claude-sonnet-4-6';
    }

    // Cost-aware selection
    if (tokens < 1000) return 'claude-haiku-4-5-20251001';
    if (tokens < 10000) return 'claude-sonnet-4-6';
    return 'claude-opus-4-7';
  }

  private getModelTier(modelId: string): ModelTier {
    const registry = getModelRegistry();
    const model = registry.getModel(modelId);
    return model?.tier ?? 'standard';
  }

  private suggestAlternatives(tokens: number, priority: Priority): AlternativeAllocation[] {
    const alternatives: AlternativeAllocation[] = [];

    // Suggest smaller model
    alternatives.push({
      modelTier: 'fast',
      availableTokens: tokens,
      estimatedCost: tokens * 0.000004, // Haiku pricing
      tradeoffs: ['Lower quality', 'Faster response'],
    });

    // Suggest splitting task
    alternatives.push({
      modelTier: 'standard',
      availableTokens: Math.floor(tokens / 2),
      estimatedCost: (tokens / 2) * 0.000015, // Sonnet pricing
      tradeoffs: ['Requires task decomposition', 'Multiple rounds'],
    });

    return alternatives;
  }

  private suggestCheaperAlternatives(tokens: number): AlternativeAllocation[] {
    return [
      {
        modelTier: 'fast',
        availableTokens: tokens,
        estimatedCost: tokens * 0.000004,
        tradeoffs: ['Lower quality', 'May need verification'],
      },
      {
        modelTier: 'local',
        availableTokens: tokens,
        estimatedCost: 0,
        tradeoffs: ['Requires local setup', 'Variable quality'],
      },
    ];
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let allocatorInstance: BudgetAllocator | null = null;

export function getBudgetAllocator(config?: Partial<ResourceConfig>): BudgetAllocator {
  if (!allocatorInstance) {
    allocatorInstance = new BudgetAllocator(config);
  }
  return allocatorInstance;
}
