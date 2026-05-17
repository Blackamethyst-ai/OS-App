/**
 * ARCHON Meta-Cognition Engine
 *
 * Central orchestration for multi-modal model selection, context management,
 * and capability gap analysis. Implements DMoE (Dynamic Mixture of Experts)
 * approach from arXiv:2601.09742.
 *
 * Supports Claude, Gemini, GPT-4, Grok, and local models.
 */

import {
  ModelInfo,
  ModelCapability,
  ModelTier,
  CapabilityRequirement,
  GapAnalysis,
  ExpertSelection,
  ContextWindow,
  PruningStrategy,
  MetaCognitionState,
  SessionStats,
  TASK_PROFILES,
} from './types';
import { ModelRegistry, getModelRegistry } from './modelRegistry';
import { ModelSelector, getModelSelector } from './selector';
import { ContextPruner, getContextPruner } from './pruner';
import { archonLog, generateId } from '../utils';

// =============================================================================
// ENGINE CONFIGURATION
// =============================================================================

export interface MetaCognitionConfig {
  // Context settings
  defaultContextWindow: number;
  contextUtilizationTarget: number;

  // Model selection
  preferMultiModel: boolean;
  maxModelsPerTask: number;
  costBudgetPerTask: number;

  // Routing strategy
  defaultTier: ModelTier;
  escalationEnabled: boolean;
  escalationPath: string[]; // Model IDs in escalation order

  // Task-specific routing overrides
  taskRoutes: Partial<Record<string, string>>; // taskType -> modelId

  // Learning
  trackPerformance: boolean;
  adaptiveRouting: boolean;
}

const DEFAULT_CONFIG: MetaCognitionConfig = {
  defaultContextWindow: 200000,
  contextUtilizationTarget: 0.8,
  preferMultiModel: true, // Use ensemble for complex tasks
  maxModelsPerTask: 3,
  costBudgetPerTask: 2.0, // Higher budget for quality
  defaultTier: 'flagship', // Start with the best
  escalationEnabled: true,
  escalationPath: [
    // Performance-first: Start with best, fall back to alternatives
    'claude-opus-4-7',              // Best overall reasoning + coding
    'gemini-2.5-pro',  // Deep reasoning, massive context
    'o1',                         // OpenAI reasoning model
    'gpt-4o',                     // Strong all-around
    'gemini-2.5-flash',             // 2M context fallback
    'claude-sonnet-4-6',            // Cost-effective quality
  ],
  taskRoutes: {
    // Route to best-in-class for each domain
    'code-generation': 'claude-opus-4-7',          // Best coding
    'code-review': 'claude-opus-4-7',              // Deep analysis
    'architecture': 'claude-opus-4-7',             // Complex reasoning
    'research': 'gemini-2.5-flash',                // 2M context for deep research
    'current-events': 'grok-3',                  // Real-time knowledge
    'image-analysis': 'gpt-4o',                  // Strong vision
    'math': 'gemini-2.5-pro',         // Math reasoning
    'creative': 'claude-opus-4-7',                 // Creative excellence
    'reasoning': 'o1',                           // Deep reasoning chains
    'analysis': 'claude-opus-4-7',                 // Analytical tasks
    'long-context': 'gemini-2.5-flash',            // 2M context window
    'fast-validation': 'claude-sonnet-4-6',        // Quick quality checks
  },
  trackPerformance: true,
  adaptiveRouting: true,
};

// =============================================================================
// META-COGNITION ENGINE
// =============================================================================

export class MetaCognitionEngine {
  private config: MetaCognitionConfig;
  private registry: ModelRegistry;
  private selector: ModelSelector;
  private pruner: ContextPruner;
  private state: MetaCognitionState;

  constructor(config?: Partial<MetaCognitionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = getModelRegistry();
    this.selector = getModelSelector();
    this.pruner = getContextPruner();
    this.state = this.initializeState();

    archonLog('info', 'MetaCognitionEngine initialized', {
      availableModels: this.state.availableModels.size,
      defaultTier: this.config.defaultTier,
    });
  }

  // ===========================================================================
  // MAIN API
  // ===========================================================================

  /**
   * Select optimal model(s) for a task
   */
  selectForTask(
    taskType: string,
    requirements: CapabilityRequirement[] = [],
    context: {
      complexity?: number;
      estimatedTokens?: number;
      latencySensitive?: boolean;
      costSensitive?: boolean;
      previousAttempts?: number;
    } = {}
  ): ExpertSelection {
    const {
      complexity = 0.5,
      estimatedTokens = 1000,
      latencySensitive = false,
      costSensitive = true,
      previousAttempts = 0,
    } = context;

    // Check for task-specific route override
    const overrideModelId = this.config.taskRoutes[taskType];
    if (overrideModelId && previousAttempts === 0) {
      const model = this.registry.getModel(overrideModelId);
      if (model?.available) {
        archonLog('debug', `Task route override: ${taskType} → ${overrideModelId}`);
        return {
          experts: [{ modelId: overrideModelId, role: 'primary', weight: 1.0 }],
          strategy: 'single-best',
          reasoning: `Task-specific routing: ${taskType} routes to ${model.name}`,
        };
      }
    }

    // Escalation path if previous attempts failed
    if (previousAttempts > 0 && this.config.escalationEnabled) {
      const escalatedModel = this.getEscalatedModel(previousAttempts);
      if (escalatedModel) {
        return {
          experts: [{ modelId: escalatedModel.id, role: 'primary', weight: 1.0 }],
          strategy: 'cascade',
          reasoning: `Escalated after ${previousAttempts} attempts to ${escalatedModel.name}`,
        };
      }
    }

    // Use full selector for complex selection
    return this.selector.selectForTask(taskType, requirements, {
      complexity,
      estimatedTokens,
      latencySensitive,
      costSensitive,
    });
  }

  /**
   * Quick model selection by tier
   */
  quickSelect(tier?: ModelTier): ModelInfo | undefined {
    return this.registry.getDefaultModel(tier ?? this.config.defaultTier);
  }

  /**
   * Get model for a specific capability
   */
  selectForCapability(capability: ModelCapability): ModelInfo | undefined {
    const models = this.registry.getModelsWithCapability(capability);
    if (models.length === 0) return undefined;

    // Sort by cost efficiency (capability score / cost)
    return models.sort((a, b) => {
      const aScore = a.metrics.capabilityScores.get(capability) ?? 0.5;
      const bScore = b.metrics.capabilityScores.get(capability) ?? 0.5;
      const aCost = a.outputCostPer1M || 1;
      const bCost = b.outputCostPer1M || 1;
      return (bScore / bCost) - (aScore / aCost);
    })[0];
  }

  /**
   * Analyze capability gaps for a task
   */
  analyzeGaps(
    requirements: CapabilityRequirement[],
    estimatedTokens: number = 1000
  ): GapAnalysis {
    return this.selector.analyzeCapabilities(requirements, estimatedTokens);
  }

  // ===========================================================================
  // CONTEXT MANAGEMENT
  // ===========================================================================

  /**
   * Create a new context window for a task
   */
  createContext(modelId?: string): ContextWindow {
    const model = modelId
      ? this.registry.getModel(modelId)
      : this.quickSelect();

    const totalTokens = model?.contextWindow ?? this.config.defaultContextWindow;
    return this.pruner.createWindow(totalTokens);
  }

  /**
   * Add content to context window
   */
  addToContext(
    window: ContextWindow,
    type: 'system' | 'goal' | 'history' | 'result' | 'tool' | 'user',
    content: string,
    options?: { relevanceScore?: number; canPrune?: boolean }
  ): void {
    this.pruner.addSegment(window, type, content, options);

    // Auto-prune if needed
    if (this.pruner.needsPruning(window)) {
      this.pruneContext(window);
    }
  }

  /**
   * Prune context to fit within budget
   */
  pruneContext(
    window: ContextWindow,
    strategy: PruningStrategy = 'surgical'
  ): void {
    this.pruner.prune(window, strategy);
  }

  /**
   * Update relevance scores based on current goal
   */
  updateContextRelevance(window: ContextWindow, currentGoal: string): void {
    this.pruner.updateRelevance(window, currentGoal);
  }

  // ===========================================================================
  // ESCALATION
  // ===========================================================================

  /**
   * Get the next model in escalation path
   */
  getEscalatedModel(attemptNumber: number): ModelInfo | undefined {
    const path = this.config.escalationPath;
    const index = Math.min(attemptNumber, path.length - 1);

    for (let i = index; i < path.length; i++) {
      const model = this.registry.getModel(path[i]);
      if (model?.available) return model;
    }

    // Fallback to any available flagship
    const flagships = this.registry.getModelsByTier('flagship');
    return flagships[0];
  }

  /**
   * Check if we should escalate
   */
  shouldEscalate(
    attempts: number,
    lastDqScore: number,
    threshold: number = 0.7
  ): boolean {
    if (lastDqScore >= threshold) return false;
    if (attempts >= this.config.escalationPath.length) return false;
    return true;
  }

  // ===========================================================================
  // PERFORMANCE TRACKING
  // ===========================================================================

  /**
   * Record task completion for learning
   */
  recordTaskCompletion(
    modelId: string,
    dqScore: number,
    latencyMs: number,
    capability?: ModelCapability
  ): void {
    if (!this.config.trackPerformance) return;

    // Update registry metrics
    this.registry.updateMetrics(modelId, {
      latencyMs,
      dqScore,
      success: dqScore >= 0.7,
      capability,
    });

    // Update selector expert profiles
    this.selector.updateExpertProfile(modelId, dqScore);

    // Update session stats
    const stats = this.state.sessionStats;
    const currentCount = stats.modelsUsed.get(modelId) ?? 0;
    stats.modelsUsed.set(modelId, currentCount + 1);
    stats.totalTasks++;

    // Running average of DQ score
    stats.avgDqScore =
      (stats.avgDqScore * (stats.totalTasks - 1) + dqScore) / stats.totalTasks;
    stats.avgLatencyMs =
      (stats.avgLatencyMs * (stats.totalTasks - 1) + latencyMs) / stats.totalTasks;

    // Track first-choice success
    if (currentCount === 0) {
      const successCount = stats.selectionAccuracy * (stats.totalTasks - 1);
      stats.selectionAccuracy =
        (successCount + (dqScore >= 0.7 ? 1 : 0)) / stats.totalTasks;
    }

    archonLog('debug', `Task completed: ${modelId}`, {
      dqScore,
      latencyMs,
      sessionAvgDq: stats.avgDqScore,
    });
  }

  /**
   * Estimate cost for a task
   */
  estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    return this.registry.estimateCost(modelId, inputTokens, outputTokens);
  }

  // ===========================================================================
  // STATE & STATISTICS
  // ===========================================================================

  /**
   * Get current engine state
   */
  getState(): MetaCognitionState {
    return this.state;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): SessionStats {
    return this.state.sessionStats;
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): ReturnType<ModelRegistry['getStats']> {
    return this.registry.getStats();
  }

  /**
   * Get context statistics
   */
  getContextStats(window: ContextWindow): ReturnType<ContextPruner['getStats']> {
    return this.pruner.getStats(window);
  }

  /**
   * List all models (both available and unavailable for UI display)
   */
  listModels(): ModelInfo[] {
    return this.registry.getAllModels();
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelInfo | undefined {
    return this.registry.getModel(modelId);
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private initializeState(): MetaCognitionState {
    const availableModels = new Map<string, ModelInfo>();
    for (const model of this.registry.getAvailableModels()) {
      availableModels.set(model.id, model);
    }

    return {
      availableModels,
      expertProfiles: new Map(),
      contextWindow: this.pruner.createWindow(this.config.defaultContextWindow),
      sessionStats: {
        totalTasks: 0,
        modelsUsed: new Map(),
        totalCost: 0,
        avgDqScore: 0,
        avgLatencyMs: 0,
        selectionAccuracy: 1.0, // Assume perfect until proven otherwise
      },
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let engineInstance: MetaCognitionEngine | null = null;

export function getMetaCognitionEngine(
  config?: Partial<MetaCognitionConfig>
): MetaCognitionEngine {
  if (!engineInstance) {
    engineInstance = new MetaCognitionEngine(config);
  }
  return engineInstance;
}

// =============================================================================
// REACT HOOK (for OS-App integration)
// =============================================================================

export function useMetaCognition() {
  const engine = getMetaCognitionEngine();

  return {
    // Selection
    selectForTask: engine.selectForTask.bind(engine),
    quickSelect: engine.quickSelect.bind(engine),
    selectForCapability: engine.selectForCapability.bind(engine),
    analyzeGaps: engine.analyzeGaps.bind(engine),

    // Context
    createContext: engine.createContext.bind(engine),
    addToContext: engine.addToContext.bind(engine),
    pruneContext: engine.pruneContext.bind(engine),

    // Escalation
    shouldEscalate: engine.shouldEscalate.bind(engine),
    getEscalatedModel: engine.getEscalatedModel.bind(engine),

    // Stats
    getSessionStats: engine.getSessionStats.bind(engine),
    listModels: engine.listModels.bind(engine),
    getModel: engine.getModel.bind(engine),

    // Tracking
    recordTaskCompletion: engine.recordTaskCompletion.bind(engine),
    estimateCost: engine.estimateCost.bind(engine),
  };
}
