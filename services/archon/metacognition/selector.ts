/**
 * ARCHON Model Selector
 *
 * DMoE-style (Dynamic Mixture of Experts) model selection.
 * Selects optimal models based on task requirements, cost, and performance history.
 *
 * Based on arXiv:2601.09742 (Adaptive Orchestration).
 */

import {
  ModelInfo,
  ModelCapability,
  ModelTier,
  CapabilityRequirement,
  GapAnalysis,
  ModelMatch,
  CapabilityGap,
  SelectionRecommendation,
  ExpertProfile,
  ExpertSelection,
  SelectedExpert,
  SelectionStrategy,
  TaskProfile,
  TASK_PROFILES,
} from './types';
import { ModelRegistry, getModelRegistry } from './modelRegistry';
import { archonLog } from '../utils';

// =============================================================================
// SELECTOR CONFIGURATION
// =============================================================================

export interface SelectorConfig {
  // Weighting for selection scoring
  weights: {
    capability: number;    // How much capability match matters
    cost: number;          // How much cost matters
    latency: number;       // How much latency matters
    successRate: number;   // How much historical success matters
  };

  // Selection thresholds
  minCapabilityScore: number;
  maxCostMultiplier: number;  // Max cost relative to cheapest option

  // Strategy preferences
  preferredStrategy: SelectionStrategy;
  enableEnsemble: boolean;
  ensembleMinModels: number;
}

const DEFAULT_SELECTOR_CONFIG: SelectorConfig = {
  weights: {
    capability: 0.4,
    cost: 0.2,
    latency: 0.2,
    successRate: 0.2,
  },
  minCapabilityScore: 0.6,
  maxCostMultiplier: 5,
  preferredStrategy: 'cascade',
  enableEnsemble: true,
  ensembleMinModels: 2,
};

// =============================================================================
// MODEL SELECTOR
// =============================================================================

export class ModelSelector {
  private registry: ModelRegistry;
  private config: SelectorConfig;
  private expertProfiles: Map<string, ExpertProfile> = new Map();

  constructor(registry?: ModelRegistry, config?: Partial<SelectorConfig>) {
    this.registry = registry ?? getModelRegistry();
    this.config = { ...DEFAULT_SELECTOR_CONFIG, ...config };
    this.initializeExpertProfiles();
  }

  /**
   * Select the best model(s) for a task
   */
  selectForTask(
    taskType: string,
    requirements: CapabilityRequirement[],
    context: {
      complexity: number;
      estimatedTokens: number;
      latencySensitive?: boolean;
      costSensitive?: boolean;
    }
  ): ExpertSelection {
    // Get task profile if available
    const profile = TASK_PROFILES[taskType];
    const mergedRequirements = this.mergeRequirements(requirements, profile);

    // Analyze capability gaps
    const analysis = this.analyzeCapabilities(mergedRequirements, context.estimatedTokens);

    // Determine selection strategy
    const strategy = this.determineStrategy(
      context.complexity,
      analysis,
      context.latencySensitive,
      context.costSensitive
    );

    // Select experts based on strategy
    const experts = this.selectExperts(analysis, strategy, context);

    archonLog('info', `Selected ${experts.length} experts for ${taskType}`, {
      strategy,
      primary: experts[0]?.modelId,
      totalModels: experts.length,
    });

    return {
      experts,
      strategy,
      reasoning: this.generateReasoning(experts, strategy, analysis),
    };
  }

  /**
   * Quick selection for simple tasks (skip full analysis)
   */
  quickSelect(tier: ModelTier): ModelInfo | undefined {
    return this.registry.getDefaultModel(tier);
  }

  /**
   * Analyze capability requirements against available models
   */
  analyzeCapabilities(
    requirements: CapabilityRequirement[],
    estimatedTokens: number
  ): GapAnalysis {
    const availableModels = this.registry.getAvailableModels();
    const matches: ModelMatch[] = [];
    const gaps: CapabilityGap[] = [];

    for (const model of availableModels) {
      const match = this.scoreModel(model, requirements, estimatedTokens);
      matches.push(match);
    }

    // Sort by overall score
    matches.sort((a, b) => b.overallScore - a.overallScore);

    // Identify capability gaps
    for (const req of requirements) {
      if (req.importance === 'required') {
        const bestScore = Math.max(
          ...matches.map((m) => m.capabilityScores.get(req.capability) ?? 0)
        );
        if (bestScore < req.minimumScore) {
          gaps.push({
            capability: req.capability,
            required: req.minimumScore,
            bestAvailable: bestScore,
            severity: bestScore < 0.3 ? 'critical' : bestScore < 0.6 ? 'significant' : 'minor',
            workaround: this.suggestWorkaround(req.capability, bestScore),
          });
        }
      }
    }

    const recommendation = this.generateRecommendation(matches, gaps, requirements);

    return {
      taskId: '', // Set by caller
      requirements,
      availableModels: matches,
      gaps,
      recommendation,
    };
  }

  /**
   * Score a model against requirements
   */
  private scoreModel(
    model: ModelInfo,
    requirements: CapabilityRequirement[],
    estimatedTokens: number
  ): ModelMatch {
    const capabilityScores = new Map<string, number>();
    let totalCapabilityScore = 0;
    let totalWeight = 0;

    for (const req of requirements) {
      const hasCapability = model.capabilities.includes(req.capability as ModelCapability);
      const historicalScore = model.metrics.capabilityScores.get(req.capability as ModelCapability) ?? 0.5;

      // Base score from having capability + historical performance
      const score = hasCapability ? Math.max(0.7, historicalScore) : historicalScore * 0.3;
      capabilityScores.set(req.capability, score);

      const weight = req.importance === 'required' ? 1.0 : req.importance === 'preferred' ? 0.5 : 0.2;
      totalCapabilityScore += score * weight;
      totalWeight += weight;
    }

    const avgCapabilityScore = totalWeight > 0 ? totalCapabilityScore / totalWeight : 0.5;

    // Cost score (inverse - cheaper is better)
    const estimatedCost = this.registry.estimateCost(model.id, estimatedTokens, estimatedTokens * 0.5);
    const costScore = Math.max(0, 1 - estimatedCost / 0.5); // Normalize to $0.50 being "expensive"

    // Latency score
    const latencyScore = model.metrics.avgLatencyMs > 0
      ? Math.max(0, 1 - model.metrics.avgLatencyMs / 10000)
      : model.tier === 'fast' ? 0.9 : model.tier === 'standard' ? 0.6 : 0.4;

    // Success rate
    const successScore = model.metrics.successRate;

    // Weighted overall score
    const overallScore =
      avgCapabilityScore * this.config.weights.capability +
      costScore * this.config.weights.cost +
      latencyScore * this.config.weights.latency +
      successScore * this.config.weights.successRate;

    return {
      modelId: model.id,
      overallScore,
      capabilityScores,
      estimatedCost,
      estimatedLatency: model.metrics.avgLatencyMs || this.estimateLatency(model),
    };
  }

  /**
   * Determine the best selection strategy
   */
  private determineStrategy(
    complexity: number,
    analysis: GapAnalysis,
    latencySensitive?: boolean,
    costSensitive?: boolean
  ): SelectionStrategy {
    // Critical gaps? Need specialist or escalate
    const hasCriticalGaps = analysis.gaps.some((g) => g.severity === 'critical');
    if (hasCriticalGaps) {
      return 'ensemble-vote'; // Multiple models to compensate
    }

    // Very complex task? Use ensemble
    if (complexity > 0.8 && this.config.enableEnsemble) {
      return 'ensemble-vote';
    }

    // Latency sensitive? Cascade (fast first, escalate if needed)
    if (latencySensitive) {
      return 'cascade';
    }

    // Cost sensitive? Single best
    if (costSensitive) {
      return 'single-best';
    }

    // Moderate complexity? Specialist routing
    if (complexity > 0.5) {
      return 'specialist-route';
    }

    // Default
    return this.config.preferredStrategy;
  }

  /**
   * Select experts based on strategy
   */
  private selectExperts(
    analysis: GapAnalysis,
    strategy: SelectionStrategy,
    context: { complexity: number; estimatedTokens: number }
  ): SelectedExpert[] {
    const models = analysis.availableModels;
    if (models.length === 0) return [];

    switch (strategy) {
      case 'single-best':
        return [{
          modelId: models[0].modelId,
          role: 'primary',
          weight: 1.0,
        }];

      case 'cascade': {
        // Fast model first, then flagship as fallback
        const fastModels = models.filter((m) => {
          const model = this.registry.getModel(m.modelId);
          return model?.tier === 'fast';
        });
        const flagshipModels = models.filter((m) => {
          const model = this.registry.getModel(m.modelId);
          return model?.tier === 'flagship';
        });

        const primary = fastModels[0] || models[0];
        const fallback = flagshipModels[0] || models[1];

        const result: SelectedExpert[] = [{
          modelId: primary.modelId,
          role: 'primary',
          weight: 1.0,
        }];

        if (fallback && fallback.modelId !== primary.modelId) {
          result.push({
            modelId: fallback.modelId,
            role: 'specialist',
            weight: 0.5,
          });
        }

        return result;
      }

      case 'specialist-route': {
        // Route based on dominant capability
        const requirements = analysis.requirements;
        const primaryReq = requirements.find((r) => r.importance === 'required') || requirements[0];

        if (primaryReq) {
          const specialist = models.reduce((best, current) => {
            const bestScore = best.capabilityScores.get(primaryReq.capability) ?? 0;
            const currentScore = current.capabilityScores.get(primaryReq.capability) ?? 0;
            return currentScore > bestScore ? current : best;
          }, models[0]);

          return [{
            modelId: specialist.modelId,
            role: 'specialist',
            weight: 1.0,
            taskAssignment: primaryReq.capability,
          }];
        }

        return [{ modelId: models[0].modelId, role: 'primary', weight: 1.0 }];
      }

      case 'ensemble-vote': {
        // Select top N models for voting
        const numExperts = Math.min(3, models.length);
        const totalScore = models.slice(0, numExperts).reduce((s, m) => s + m.overallScore, 0);

        return models.slice(0, numExperts).map((m, i) => ({
          modelId: m.modelId,
          role: i === 0 ? 'primary' : 'verifier',
          weight: m.overallScore / totalScore,
        }));
      }

      case 'parallel-race': {
        // Race top 2 models
        return models.slice(0, 2).map((m, i) => ({
          modelId: m.modelId,
          role: i === 0 ? 'primary' : 'verifier',
          weight: 0.5,
        }));
      }

      default:
        return [{ modelId: models[0].modelId, role: 'primary', weight: 1.0 }];
    }
  }

  /**
   * Generate recommendation from analysis
   */
  private generateRecommendation(
    matches: ModelMatch[],
    gaps: CapabilityGap[],
    requirements: CapabilityRequirement[]
  ): SelectionRecommendation {
    if (matches.length === 0) {
      return {
        primaryModel: '',
        reasoning: 'No models available',
        confidence: 0,
        estimatedCost: 0,
        warnings: ['No models available. Check API keys and provider configuration.'],
      };
    }

    const primary = matches[0];
    const fallback = matches[1];
    const warnings: string[] = [];

    // Add warnings for gaps
    for (const gap of gaps) {
      if (gap.severity === 'critical') {
        warnings.push(`Critical gap: ${gap.capability} (best: ${(gap.bestAvailable * 100).toFixed(0)}%, needed: ${(gap.required * 100).toFixed(0)}%)`);
      }
    }

    // Add warning if primary is expensive
    if (primary.estimatedCost > 0.1) {
      warnings.push(`Estimated cost: $${primary.estimatedCost.toFixed(3)}`);
    }

    return {
      primaryModel: primary.modelId,
      fallbackModel: fallback?.modelId,
      reasoning: this.generateReasoningText(primary, requirements, gaps),
      confidence: primary.overallScore,
      estimatedCost: primary.estimatedCost,
      warnings,
    };
  }

  private generateReasoningText(
    match: ModelMatch,
    requirements: CapabilityRequirement[],
    gaps: CapabilityGap[]
  ): string {
    const model = this.registry.getModel(match.modelId);
    if (!model) return 'Selected based on availability';

    const strengths: string[] = [];
    for (const req of requirements) {
      const score = match.capabilityScores.get(req.capability) ?? 0;
      if (score >= 0.8) {
        strengths.push(req.capability);
      }
    }

    let reasoning = `${model.name} selected (score: ${(match.overallScore * 100).toFixed(0)}%)`;
    if (strengths.length > 0) {
      reasoning += `. Strong in: ${strengths.join(', ')}`;
    }
    if (gaps.length > 0) {
      reasoning += `. Gaps in: ${gaps.map((g) => g.capability).join(', ')}`;
    }

    return reasoning;
  }

  private generateReasoning(
    experts: SelectedExpert[],
    strategy: SelectionStrategy,
    analysis: GapAnalysis
  ): string {
    const primary = experts[0];
    if (!primary) return 'No experts selected';

    const model = this.registry.getModel(primary.modelId);
    const strategyName = {
      'single-best': 'single model',
      'cascade': 'cascade (fast→powerful)',
      'specialist-route': 'specialist routing',
      'ensemble-vote': 'ensemble voting',
      'parallel-race': 'parallel race',
    }[strategy];

    return `Using ${strategyName} with ${model?.name || primary.modelId} as primary. ${
      experts.length > 1 ? `${experts.length - 1} backup(s) available.` : ''
    }`;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private mergeRequirements(
    explicit: CapabilityRequirement[],
    profile?: Partial<TaskProfile>
  ): CapabilityRequirement[] {
    const merged = [...explicit];

    if (profile?.requiredCapabilities) {
      for (const req of profile.requiredCapabilities) {
        if (!merged.some((m) => m.capability === req.capability)) {
          merged.push(req);
        }
      }
    }

    return merged;
  }

  private suggestWorkaround(capability: string, bestScore: number): string {
    if (bestScore > 0.5) {
      return 'Consider using ensemble voting for better results';
    }
    if (capability === 'vision') {
      return 'Convert to text description if possible';
    }
    if (capability === 'long-context') {
      return 'Use context pruning to fit within available window';
    }
    return 'Consider breaking task into smaller parts';
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

  private initializeExpertProfiles(): void {
    for (const model of this.registry.getAvailableModels()) {
      this.expertProfiles.set(model.id, {
        modelId: model.id,
        specializations: model.capabilities,
        strengthScore: 0.5,
        costEfficiency: model.outputCostPer1M > 0 ? 0.5 / model.outputCostPer1M : 1.0,
        recentPerformance: [],
      });
    }
  }

  /**
   * Update expert profile after task completion
   */
  updateExpertProfile(modelId: string, dqScore: number): void {
    const profile = this.expertProfiles.get(modelId);
    if (profile) {
      profile.recentPerformance.push(dqScore);
      if (profile.recentPerformance.length > 10) {
        profile.recentPerformance.shift();
      }
      profile.strengthScore =
        profile.recentPerformance.reduce((a, b) => a + b, 0) / profile.recentPerformance.length;
    }

    // Also update registry metrics
    this.registry.updateMetrics(modelId, {
      latencyMs: 0, // Would come from actual invocation
      dqScore,
      success: dqScore >= 0.7,
    });
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let selectorInstance: ModelSelector | null = null;

export function getModelSelector(config?: Partial<SelectorConfig>): ModelSelector {
  if (!selectorInstance) {
    selectorInstance = new ModelSelector(undefined, config);
  }
  return selectorInstance;
}
