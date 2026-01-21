/**
 * ARCHON Resource Management Types
 *
 * Types for token budget allocation, cost-aware routing,
 * and agentic plan caching.
 */

import { SubsystemType, Priority, ModelTier } from '../types';

// =============================================================================
// TOKEN BUDGETS
// =============================================================================

export interface TokenBudget {
  id: string;
  taskId?: string;

  // Allocations
  total: number;
  used: number;
  remaining: number;

  // Per-subsystem breakdown
  subsystemAllocations: Map<SubsystemType, SubsystemBudget>;

  // Tracking
  startedAt: number;
  expiresAt: number;
  lastUpdated: number;
}

export interface SubsystemBudget {
  allocated: number;
  used: number;
  remaining: number;
  priority: Priority;
}

export interface BudgetAllocation {
  taskId: string;
  subsystem: SubsystemType;
  requestedTokens: number;
  allocatedTokens: number;
  priority: Priority;
  modelTier: ModelTier;
  estimatedCost: number;
  expiresAt: number;
}

export interface BudgetRequest {
  taskId: string;
  subsystem: SubsystemType;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  priority?: Priority;
  preferredModel?: string;
}

export interface BudgetResponse {
  approved: boolean;
  allocation?: BudgetAllocation;
  reason?: string;
  alternatives?: AlternativeAllocation[];
}

export interface AlternativeAllocation {
  modelTier: ModelTier;
  availableTokens: number;
  estimatedCost: number;
  tradeoffs: string[];
}

// =============================================================================
// COST TRACKING
// =============================================================================

export interface CostRecord {
  id: string;
  taskId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
}

export interface CostSummary {
  totalCost: number;
  byModel: Map<string, number>;
  bySubsystem: Map<SubsystemType, number>;
  byTaskType: Map<string, number>;
  period: {
    start: number;
    end: number;
  };
}

export interface CostLimits {
  perTask: number;
  perSession: number;
  perDay: number;
  perModel: Map<string, number>;
}

// =============================================================================
// ROUTING
// =============================================================================

export interface RoutingDecision {
  modelId: string;
  modelTier: ModelTier;
  reason: string;
  confidence: number;
  estimatedCost: number;
  estimatedLatencyMs: number;
  alternatives: RoutingAlternative[];
}

export interface RoutingAlternative {
  modelId: string;
  modelTier: ModelTier;
  reason: string;
  costDelta: number; // Relative to chosen model
  latencyDelta: number;
}

export interface RoutingContext {
  taskType: string;
  complexity: number;
  estimatedTokens: number;
  priority: Priority;
  previousAttempts: number;
  lastDqScore?: number;
  constraints?: RoutingConstraints;
}

export interface RoutingConstraints {
  maxCost?: number;
  maxLatencyMs?: number;
  requiredCapabilities?: string[];
  excludeModels?: string[];
  preferProvider?: string;
}

// =============================================================================
// CACHING
// =============================================================================

export interface CachedPlan {
  id: string;
  goalHash: string;
  goal: string;
  plan: CachedPlanContent;
  metadata: CachedPlanMetadata;
}

export interface CachedPlanContent {
  steps: CachedStep[];
  subsystems: SubsystemType[];
  estimatedTokens: number;
  estimatedCost: number;
}

export interface CachedStep {
  id: string;
  description: string;
  subsystem?: SubsystemType;
  dependencies: string[];
}

export interface CachedPlanMetadata {
  createdAt: number;
  lastUsed: number;
  useCount: number;
  avgDqScore: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  avgAge: number;
  sizeBytes: number;
  topPatterns: Array<{ goalPattern: string; useCount: number }>;
}

// =============================================================================
// RESOURCE MANAGER STATE
// =============================================================================

export interface ResourceManagerState {
  // Active budgets
  activeBudgets: Map<string, TokenBudget>;

  // Cost tracking
  costHistory: CostRecord[];
  costLimits: CostLimits;

  // Cache
  planCache: Map<string, CachedPlan>;
  cacheStats: CacheStats;

  // Session totals
  sessionTokensUsed: number;
  sessionCost: number;
  sessionStart: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface ResourceConfig {
  // Budget settings
  defaultBudgetPerTask: number;
  sessionBudget: number;
  budgetExpirationMs: number;

  // Subsystem priorities (affects budget allocation)
  subsystemPriorities: Partial<Record<SubsystemType, Priority>>;

  // Cost limits
  costLimits: Partial<CostLimits>;

  // Caching
  cacheEnabled: boolean;
  maxCacheEntries: number;
  cacheExpirationMs: number;
  minCacheHitRate: number;

  // Routing
  preferQualityOverCost: boolean;
  escalationEnabled: boolean;
}

export const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
  defaultBudgetPerTask: 50000,
  sessionBudget: 500000,
  budgetExpirationMs: 30 * 60 * 1000, // 30 minutes

  subsystemPriorities: {
    ace: 'high',
    dq: 'normal',
    dream: 'low',
    evolution: 'normal',
    kernel: 'high',
    voice: 'normal',
    cpb: 'normal',
  },

  costLimits: {
    perTask: 2.0,       // $2 max per task (quality-first)
    perSession: 20.0,   // $20 per session
    perDay: 100.0,      // $100 per day
  },

  cacheEnabled: true,
  maxCacheEntries: 1000,
  cacheExpirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCacheHitRate: 0.3,

  preferQualityOverCost: true, // Performance-first
  escalationEnabled: true,
};
