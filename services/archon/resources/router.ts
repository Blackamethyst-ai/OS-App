/**
 * ARCHON Cost-Aware Router
 *
 * Intelligent model routing based on task complexity, budget constraints,
 * and performance history. Integrates with MetaCognition for optimal selection.
 */

import {
  RoutingDecision,
  RoutingAlternative,
  RoutingContext,
  RoutingConstraints,
  ResourceConfig,
  DEFAULT_RESOURCE_CONFIG,
} from './types';
import { MODEL_REGISTRY } from '../../modelRegistry';
import { Priority, ModelTier } from '../types';
import {
  getMetaCognitionEngine,
  ModelInfo,
  CapabilityRequirement,
} from '../metacognition';
import { archonLog } from '../utils';

// =============================================================================
// ROUTING CONFIGURATION
// =============================================================================

interface RouterConfig {
  // Strategy
  preferQualityOverCost: boolean;

  // Complexity thresholds
  complexityThresholds: {
    simple: number;   // Below this → fast tier
    moderate: number; // Below this → standard tier
    complex: number;  // Above this → flagship tier
  };

  // Model preferences by task type
  taskModelPreferences: Record<string, string[]>;

  // Fallback chain
  fallbackChain: string[];
}

const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  preferQualityOverCost: true, // Performance-first (always flagship)

  // Set all to 0 to always use flagship models (user preference: best quality)
  complexityThresholds: {
    simple: 0,    // Never use fast tier
    moderate: 0,  // Never use standard tier
    complex: 0,   // Always use flagship tier
  },

  taskModelPreferences: {
    // Code tasks → Claude excels
    'code-generation': ['claude-opus-4-7', 'claude-sonnet-4-6', 'gpt-4o'],
    'code-review': ['claude-opus-4-7', 'o1', 'gpt-4o'],
    'debugging': ['claude-opus-4-7', 'claude-sonnet-4-6'],

    // Reasoning → OpenAI o-series and Claude
    'reasoning': ['o1', 'claude-opus-4-7', MODEL_REGISTRY.gemini.fast],
    'math': [MODEL_REGISTRY.gemini.fast, 'o1', 'o3-mini'],
    'analysis': ['claude-opus-4-7', MODEL_REGISTRY.gemini.fast, 'gpt-4o'],

    // Research → Long context models
    'research': [MODEL_REGISTRY.gemini.fast, 'claude-opus-4-7', 'claude-sonnet-4-6'],
    'summarization': [MODEL_REGISTRY.gemini.fast, 'claude-sonnet-4-6'],

    // Real-time → Grok
    'current-events': ['grok-3'],
    'real-time': ['grok-3', 'gpt-4o'],

    // Vision → Best vision models
    'image-analysis': ['gpt-4o', 'claude-opus-4-7', MODEL_REGISTRY.gemini.fast],
    'vision': ['gpt-4o', 'grok-3', 'claude-opus-4-7'],

    // Creative → Claude
    'creative': ['claude-opus-4-7', 'gpt-4o'],
    'writing': ['claude-opus-4-7', 'claude-sonnet-4-6'],

    // Quick tasks → Fast models
    'classification': ['claude-haiku-4-5-20251001', 'gpt-4o-mini', MODEL_REGISTRY.gemini.fast],
    'extraction': ['claude-haiku-4-5-20251001', MODEL_REGISTRY.gemini.fast],
    'validation': ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },

  fallbackChain: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'gpt-4o',
    MODEL_REGISTRY.gemini.fast,
    'claude-haiku-4-5-20251001',
  ],
};

// =============================================================================
// COST-AWARE ROUTER
// =============================================================================

export class CostAwareRouter {
  private config: RouterConfig;
  private resourceConfig: ResourceConfig;
  private routingHistory: Array<{
    context: RoutingContext;
    decision: RoutingDecision;
    outcome?: { dqScore: number; latencyMs: number };
  }> = [];

  constructor(
    routerConfig?: Partial<RouterConfig>,
    resourceConfig?: Partial<ResourceConfig>
  ) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...routerConfig };
    this.resourceConfig = { ...DEFAULT_RESOURCE_CONFIG, ...resourceConfig };
  }

  // ===========================================================================
  // MAIN ROUTING API
  // ===========================================================================

  /**
   * Route a task to the optimal model
   */
  route(context: RoutingContext): RoutingDecision {
    const {
      taskType,
      complexity,
      estimatedTokens,
      priority,
      previousAttempts,
      lastDqScore,
      constraints,
    } = context;

    // If previous attempt failed, escalate
    if (previousAttempts > 0 && this.resourceConfig.escalationEnabled) {
      return this.routeWithEscalation(context, previousAttempts);
    }

    // Get candidate models
    const candidates = this.getCandidates(taskType, complexity, constraints);
    if (candidates.length === 0) {
      return this.createFallbackDecision(context);
    }

    // Score and rank candidates
    const scoredCandidates = candidates.map((model) => ({
      model,
      score: this.scoreCandidate(model, context),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);

    const selected = scoredCandidates[0].model;
    const alternatives = scoredCandidates.slice(1, 4).map((c) =>
      this.createAlternative(c.model, selected, estimatedTokens)
    );

    const engine = getMetaCognitionEngine();
    const estimatedCost = engine.estimateCost(selected.id, estimatedTokens, estimatedTokens * 0.5);
    const estimatedLatency = selected.metrics.avgLatencyMs || this.estimateLatency(selected);

    const decision: RoutingDecision = {
      modelId: selected.id,
      modelTier: selected.tier,
      reason: this.generateReason(selected, context),
      confidence: scoredCandidates[0].score,
      estimatedCost,
      estimatedLatencyMs: estimatedLatency,
      alternatives,
    };

    // Record for learning
    this.routingHistory.push({ context, decision });

    archonLog('debug', `Routed ${taskType} to ${selected.id}`, {
      complexity,
      confidence: decision.confidence,
      cost: estimatedCost,
    });

    return decision;
  }

  /**
   * Quick route based on complexity only
   */
  quickRoute(complexity: number): RoutingDecision {
    const engine = getMetaCognitionEngine();
    let tier: ModelTier;

    if (complexity < this.config.complexityThresholds.simple) {
      tier = 'fast';
    } else if (complexity < this.config.complexityThresholds.moderate) {
      tier = 'standard';
    } else {
      tier = 'flagship';
    }

    const model = engine.quickSelect(tier);
    if (!model) {
      return this.createFallbackDecision({
        taskType: 'unknown',
        complexity,
        estimatedTokens: 1000,
        priority: 'normal',
        previousAttempts: 0,
      });
    }

    return {
      modelId: model.id,
      modelTier: model.tier,
      reason: `Quick route: complexity ${(complexity * 100).toFixed(0)}% → ${tier} tier`,
      confidence: 0.8,
      estimatedCost: 0,
      estimatedLatencyMs: this.estimateLatency(model),
      alternatives: [],
    };
  }

  /**
   * Route with capability requirements
   */
  routeWithCapabilities(
    requirements: CapabilityRequirement[],
    context: Partial<RoutingContext> = {}
  ): RoutingDecision {
    const engine = getMetaCognitionEngine();
    const selection = engine.selectForTask(
      context.taskType ?? 'general',
      requirements,
      {
        complexity: context.complexity ?? 0.5,
        estimatedTokens: context.estimatedTokens ?? 1000,
        latencySensitive: context.priority === 'critical',
        costSensitive: !this.config.preferQualityOverCost,
      }
    );

    const primary = selection.experts[0];
    if (!primary) {
      return this.createFallbackDecision({
        taskType: 'general',
        complexity: 0.5,
        estimatedTokens: 1000,
        priority: 'normal',
        previousAttempts: 0,
        ...context,
      });
    }

    const model = engine.getModel(primary.modelId);
    return {
      modelId: primary.modelId,
      modelTier: model?.tier ?? 'standard',
      reason: selection.reasoning,
      confidence: primary.weight,
      estimatedCost: 0,
      estimatedLatencyMs: model?.metrics.avgLatencyMs ?? 2000,
      alternatives: selection.experts.slice(1).map((e) => ({
        modelId: e.modelId,
        modelTier: engine.getModel(e.modelId)?.tier ?? 'standard',
        reason: e.taskAssignment ?? 'Alternative',
        costDelta: 0,
        latencyDelta: 0,
      })),
    };
  }

  // ===========================================================================
  // ESCALATION
  // ===========================================================================

  /**
   * Route with escalation after failed attempts
   */
  private routeWithEscalation(
    context: RoutingContext,
    attemptNumber: number
  ): RoutingDecision {
    const engine = getMetaCognitionEngine();
    const escalatedModel = engine.getEscalatedModel(attemptNumber);

    if (!escalatedModel) {
      return this.createFallbackDecision(context);
    }

    const estimatedCost = engine.estimateCost(
      escalatedModel.id,
      context.estimatedTokens,
      context.estimatedTokens * 0.5
    );

    return {
      modelId: escalatedModel.id,
      modelTier: escalatedModel.tier,
      reason: `Escalated after ${attemptNumber} attempt(s) to ${escalatedModel.name}`,
      confidence: 0.9, // High confidence in escalation
      estimatedCost,
      estimatedLatencyMs: this.estimateLatency(escalatedModel),
      alternatives: [],
    };
  }

  // ===========================================================================
  // CANDIDATE SCORING
  // ===========================================================================

  private getCandidates(
    taskType: string,
    complexity: number,
    constraints?: RoutingConstraints
  ): ModelInfo[] {
    const engine = getMetaCognitionEngine();
    let candidates = engine.listModels();

    // Filter by constraints
    if (constraints?.excludeModels) {
      candidates = candidates.filter((m) => !constraints.excludeModels?.includes(m.id));
    }

    if (constraints?.preferProvider) {
      const preferred = candidates.filter((m) => m.provider === constraints.preferProvider);
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    if (constraints?.requiredCapabilities) {
      candidates = candidates.filter((m) =>
        constraints.requiredCapabilities?.every((cap) =>
          m.capabilities.includes(cap as any)
        )
      );
    }

    // Prefer task-specific models
    const taskPreferences = this.config.taskModelPreferences[taskType];
    if (taskPreferences) {
      candidates.sort((a, b) => {
        const aIdx = taskPreferences.indexOf(a.id);
        const bIdx = taskPreferences.indexOf(b.id);
        const aScore = aIdx === -1 ? 100 : aIdx;
        const bScore = bIdx === -1 ? 100 : bIdx;
        return aScore - bScore;
      });
    }

    return candidates;
  }

  private scoreCandidate(model: ModelInfo, context: RoutingContext): number {
    let score = 0.5; // Base score

    // Performance preference (quality first)
    if (this.config.preferQualityOverCost) {
      // Flagship models get bonus
      if (model.tier === 'flagship') score += 0.3;
      else if (model.tier === 'standard') score += 0.15;

      // Historical performance
      score += model.metrics.avgDqScore * 0.2;
      score += model.metrics.successRate * 0.1;
    } else {
      // Cost efficiency
      const costPer1K = (model.inputCostPer1M + model.outputCostPer1M) / 2000;
      score += (1 - Math.min(costPer1K / 0.01, 1)) * 0.3;
    }

    // Task-type match
    const taskPreferences = this.config.taskModelPreferences[context.taskType];
    if (taskPreferences) {
      const idx = taskPreferences.indexOf(model.id);
      if (idx !== -1) {
        score += (taskPreferences.length - idx) / taskPreferences.length * 0.2;
      }
    }

    // Complexity match
    if (context.complexity > this.config.complexityThresholds.complex && model.tier === 'flagship') {
      score += 0.1;
    } else if (context.complexity < this.config.complexityThresholds.simple && model.tier === 'fast') {
      score += 0.1;
    }

    // Priority boost for critical tasks
    if (context.priority === 'critical' && model.tier === 'flagship') {
      score += 0.15;
    }

    // Check constraints
    if (context.constraints?.maxCost) {
      const engine = getMetaCognitionEngine();
      const cost = engine.estimateCost(model.id, context.estimatedTokens, context.estimatedTokens * 0.5);
      if (cost > context.constraints.maxCost) {
        score -= 0.5;
      }
    }

    if (context.constraints?.maxLatencyMs) {
      const latency = model.metrics.avgLatencyMs || this.estimateLatency(model);
      if (latency > context.constraints.maxLatencyMs) {
        score -= 0.3;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private createAlternative(
    model: ModelInfo,
    selected: ModelInfo,
    estimatedTokens: number
  ): RoutingAlternative {
    const engine = getMetaCognitionEngine();
    const selectedCost = engine.estimateCost(selected.id, estimatedTokens, estimatedTokens * 0.5);
    const altCost = engine.estimateCost(model.id, estimatedTokens, estimatedTokens * 0.5);
    const selectedLatency = selected.metrics.avgLatencyMs || this.estimateLatency(selected);
    const altLatency = model.metrics.avgLatencyMs || this.estimateLatency(model);

    return {
      modelId: model.id,
      modelTier: model.tier,
      reason: `Alternative: ${model.name}`,
      costDelta: altCost - selectedCost,
      latencyDelta: altLatency - selectedLatency,
    };
  }

  private createFallbackDecision(context: RoutingContext): RoutingDecision {
    const fallback = this.config.fallbackChain[0] ?? 'claude-sonnet-4-6';

    return {
      modelId: fallback,
      modelTier: 'standard',
      reason: 'Fallback: No suitable model found',
      confidence: 0.5,
      estimatedCost: 0,
      estimatedLatencyMs: 2000,
      alternatives: [],
    };
  }

  private generateReason(model: ModelInfo, context: RoutingContext): string {
    const reasons: string[] = [];

    if (context.taskType && this.config.taskModelPreferences[context.taskType]?.[0] === model.id) {
      reasons.push(`Best for ${context.taskType}`);
    }

    if (model.tier === 'flagship') {
      reasons.push('High capability');
    }

    if (this.config.preferQualityOverCost) {
      reasons.push('Quality-optimized');
    }

    if (context.complexity > 0.7) {
      reasons.push(`Complex task (${(context.complexity * 100).toFixed(0)}%)`);
    }

    return reasons.length > 0 ? reasons.join(', ') : `Selected ${model.name}`;
  }

  private estimateLatency(model: ModelInfo): number {
    switch (model.tier) {
      case 'fast': return 500;
      case 'standard': return 2000;
      case 'flagship': return 5000;
      case 'local': return 10000;
      default: return 3000;
    }
  }

  /**
   * Record outcome for learning
   */
  recordOutcome(modelId: string, dqScore: number, latencyMs: number): void {
    const recent = this.routingHistory.slice(-10);
    const match = recent.find((r) => r.decision.modelId === modelId && !r.outcome);
    if (match) {
      match.outcome = { dqScore, latencyMs };
    }
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    totalRoutes: number;
    avgConfidence: number;
    outcomeAvgDq: number;
  } {
    const outcomes = this.routingHistory.filter((r) => r.outcome);
    const avgConfidence = this.routingHistory.length > 0
      ? this.routingHistory.reduce((s, r) => s + r.decision.confidence, 0) / this.routingHistory.length
      : 0;
    const avgDq = outcomes.length > 0
      ? outcomes.reduce((s, r) => s + (r.outcome?.dqScore ?? 0), 0) / outcomes.length
      : 0;

    return {
      totalRoutes: this.routingHistory.length,
      avgConfidence,
      outcomeAvgDq: avgDq,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let routerInstance: CostAwareRouter | null = null;

export function getCostAwareRouter(
  routerConfig?: Partial<RouterConfig>,
  resourceConfig?: Partial<ResourceConfig>
): CostAwareRouter {
  if (!routerInstance) {
    routerInstance = new CostAwareRouter(routerConfig, resourceConfig);
  }
  return routerInstance;
}
