/**
 * ARCHON - Autonomous Meta-Orchestrator
 *
 * The control plane for AI agent swarms. Coordinates OS-App's subsystems
 * (ACE, DQ, Dream, Evolution, Kernel, Voice, CPB) to achieve user goals
 * with minimal human intervention.
 *
 * Based on cutting-edge research:
 * - arXiv:2601.09742 (Adaptive Orchestration, Meta-Cognition Engine)
 * - arXiv:2506.12508 (AgentOrchestra, TEA Protocol)
 * - arXiv:2511.15755 (DQ Scoring, 100% actionability)
 * - arXiv:2508.07407 (Self-Evolving Agents)
 *
 * Design Decisions (User Confirmed):
 * - Autonomy: Aggressive (5+ attempts before escalation)
 * - Optimization: Quality/Performance First (flagship models)
 * - Persistence: SQLite via ResearchGravity
 * - Multi-Modal: Claude, Gemini, GPT-4, Grok, local models
 *
 * @module archon
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

// Types
export * from './types';

// State management
export { useArchonStore, DEFAULT_ARCHON_CONFIG } from './state';

// Event system
export { eventBus, ArchonEventBus } from './eventBus';
export {
  emitGoalEvent,
  emitDecisionEvent,
  emitSubsystemEvent,
  emitEscalationEvent,
  emitPatternEvent,
  emitErrorEvent,
} from './eventBus';
export type {
  GoalReceivedPayload,
  GoalDecomposedPayload,
  GoalCompletedPayload,
  GoalBlockedPayload,
  DecisionMadePayload,
  SubsystemInvokedPayload,
  SubsystemCompletedPayload,
  EscalationRequestedPayload,
  EscalationResolvedPayload,
  PatternLearnedPayload,
  ErrorOccurredPayload,
} from './eventBus';

// Configuration
export {
  DEFAULT_CONFIG,
  MODEL_COSTS,
  COMPLEXITY_THRESHOLDS,
  SUBSYSTEM_CAPABILITIES,
  ESCALATION_CONFIG,
  PATTERN_CONFIG,
  TELEMETRY_CONFIG,
  getConfig,
  validateConfig,
} from './config';

// Utilities
export {
  generateId,
  hashString,
  estimateGoalComplexity,
  inferSubsystems,
  estimateTokenCost,
  calculateDQ,
  isActionable,
  formatDuration,
  relativeTime,
  backoffDelay,
  sleep,
  archonLog,
} from './utils';

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Goals module
export {
  GoalDecomposer,
  getGoalDecomposer,
  GoalTracker,
  getGoalTracker,
  TaskGraph,
  createTask,
} from './goals';
export type { Task, TaskStatus, TaskPriority } from './goals';

// Meta-Cognition module (multi-modal AI orchestration)
export {
  MetaCognitionEngine,
  getMetaCognitionEngine,
  useMetaCognition,
  ModelRegistry,
  getModelRegistry,
  BUILT_IN_MODELS,
  ModelSelector,
  getModelSelector,
  ContextPruner,
  getContextPruner,
  metacognition,
  // Types from metacognition (renamed to avoid conflicts)
  type ModelProvider,
  type ModelInfo,
  type ModelCapability,
  type ModelMetrics,
  type ModelRegistryConfig,
  type CapabilityRequirement,
  type ExpertProfile,
  type ExpertSelection,
  type SelectedExpert,
  type SelectionStrategy,
  type ContextWindow,
  type ContextSegment,
  type PruningResult,
  type PruningStrategy,
  type TaskProfile,
  type MetaCognitionState,
  type SessionStats,
} from './metacognition';

// Resources module (budget, routing, caching)
export {
  BudgetAllocator,
  getBudgetAllocator,
  CostAwareRouter,
  getCostAwareRouter,
  CacheManager,
  getCacheManager,
  createCacheContent,
  resources,
  DEFAULT_RESOURCE_CONFIG,
} from './resources';

// Escalation module
export {
  EscalationController,
  getEscalationController,
} from './escalation';

// Learning module
export {
  FeedbackLearner,
  getFeedbackLearner,
  PatternMemory,
  getPatternMemory,
  learning,
} from './learning';

// =============================================================================
// ARCHON CLASS - Main Orchestrator
// =============================================================================

import { useArchonStore } from './state';
import { eventBus, emitGoalEvent, emitErrorEvent, emitEscalationEvent, emitPatternEvent } from './eventBus';
import { getConfig, validateConfig } from './config';
import {
  Goal,
  GoalStatus,
  ArchonConfig,
  ArchonPhase,
  SubsystemType,
  Decision,
  EscalationRequest,
  HumanDecision,
  DQScore,
} from './types';
import {
  generateId,
  estimateGoalComplexity,
  inferSubsystems,
  archonLog,
  calculateDQ,
  isActionable,
  backoffDelay,
} from './utils';

// Module imports
import { getGoalDecomposer, getGoalTracker, TaskGraph } from './goals';
import { getMetaCognitionEngine } from './metacognition';
import { getBudgetAllocator, getCostAwareRouter, getCacheManager } from './resources';
import { getEscalationController } from './escalation';
import { getFeedbackLearner, getPatternMemory } from './learning';

/**
 * Main ARCHON controller class
 *
 * Provides high-level API for goal management and orchestration.
 * Integrates all modules: goals, meta-cognition, resources, escalation, learning.
 */
class Archon {
  private config: ArchonConfig;
  private initialized = false;

  // Module instances (lazy-loaded)
  private decomposer = getGoalDecomposer();
  private tracker = getGoalTracker();
  private metacognition = getMetaCognitionEngine();
  private allocator = getBudgetAllocator();
  private router = getCostAwareRouter();
  private cache = getCacheManager();
  private escalation = getEscalationController();
  private learner = getFeedbackLearner();
  private patterns = getPatternMemory();

  constructor(config?: Partial<ArchonConfig>) {
    this.config = getConfig(config);

    // Validate configuration
    const { valid, errors } = validateConfig(this.config);
    if (!valid) {
      archonLog('error', 'Invalid configuration', errors);
      throw new Error(`Invalid ARCHON configuration: ${errors.join(', ')}`);
    }
  }

  /**
   * Initialize ARCHON
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      archonLog('warn', 'ARCHON already initialized');
      return;
    }

    archonLog('info', 'Initializing ARCHON...');

    // Set up event listeners
    this.setupEventListeners();

    // Initialize persistence if enabled
    if (this.config.persistenceEnabled) {
      await this.initializePersistence();
    }

    this.initialized = true;

    const modelStats = this.metacognition.getRegistryStats();
    archonLog('info', 'ARCHON initialized', {
      availableModels: modelStats.availableModels,
      providers: Object.keys(modelStats.byProvider),
      defaultTier: 'flagship', // Performance-first
    });
  }

  /**
   * Process a high-level goal
   */
  async processGoal(goalText: string): Promise<Goal> {
    if (!this.initialized) {
      await this.initialize();
    }

    const store = useArchonStore.getState();
    const startTime = Date.now();

    // Update phase
    store.setPhase('receiving_goal');

    // Check cache for similar goal
    const cached = this.cache.lookup(goalText);
    if (cached) {
      archonLog('info', 'Cache hit for goal', { goalText: goalText.slice(0, 50) });
    }

    // Analyze goal
    const complexity = estimateGoalComplexity(goalText);
    const estimatedSubsystems = inferSubsystems(goalText);

    // Get recommendation from learned patterns
    const recommendation = this.learner.getRecommendation(
      this.inferGoalType(goalText),
      complexity,
      estimatedSubsystems
    );

    // Create goal
    const goal = store.addGoal({
      text: goalText,
      status: 'pending',
      metadata: {
        complexity,
        estimatedSubsystems,
        priority: complexity > 0.7 ? 'high' : 'normal',
        source: 'user',
      },
    });

    archonLog('info', `Goal received: ${goal.id}`, {
      text: goalText.substring(0, 100),
      complexity,
      subsystems: estimatedSubsystems,
      patternConfidence: recommendation.confidence,
    });

    // Emit event
    await emitGoalEvent('received', {
      goalId: goal.id,
      goalText,
      complexity,
    });

    // Start processing (async)
    this.executeGoal(goal.id).catch((error) => {
      archonLog('error', `Error processing goal ${goal.id}`, error);
      emitErrorEvent({
        error,
        context: 'processGoal',
        goalId: goal.id,
      });
    });

    return goal;
  }

  /**
   * Execute a goal with full orchestration
   */
  private async executeGoal(goalId: string): Promise<void> {
    const store = useArchonStore.getState();
    const goal = store.getGoal(goalId);

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Update status
    store.updateGoal(goalId, { status: 'active' });

    let attempts = 0;
    let lastDqScore: DQScore | null = null;

    // Main execution loop with retry
    while (attempts < this.config.maxRetries) {
      attempts++;
      const attemptStart = Date.now();

      try {
        // Phase 1: Decompose goal
        store.setPhase('decomposing');
        const decomposition = await this.decomposer.decompose(goal.text);
        const { analysis } = decomposition;

        await emitGoalEvent('decomposed', {
          goalId,
          subgoals: Array.from(decomposition.tree.tasks.values()).map((t) => t.id),
          complexity: analysis.estimatedComplexity,
        });

        // Phase 2: Route to optimal model
        store.setPhase('routing');
        const routing = this.router.route({
          taskType: this.inferGoalType(goal.text),
          complexity: analysis.estimatedComplexity,
          estimatedTokens: analysis.estimatedTokenCost,
          priority: goal.metadata.priority,
          previousAttempts: attempts - 1,
          lastDqScore: lastDqScore?.score,
        });

        archonLog('debug', `Routed to ${routing.modelId}`, {
          confidence: routing.confidence,
          tier: routing.modelTier,
        });

        // Phase 3: Allocate resources
        const budgetResponse = this.allocator.requestAllocation({
          taskId: goalId,
          subsystem: 'kernel', // Primary subsystem
          estimatedInputTokens: analysis.estimatedTokenCost,
          estimatedOutputTokens: Math.floor(analysis.estimatedTokenCost * 0.5),
          priority: goal.metadata.priority,
          preferredModel: routing.modelId,
        });

        if (!budgetResponse.approved) {
          archonLog('warn', 'Budget not approved', { reason: budgetResponse.reason });
          // Try with alternatives
          if (budgetResponse.alternatives && budgetResponse.alternatives.length > 0) {
            archonLog('info', 'Using alternative allocation');
          }
        }

        // Phase 4: Execute (placeholder - integrate with actual subsystems)
        store.setPhase('executing');

        // Simulate execution for now
        // TODO: Actually dispatch to ACE, Dream, Evolution, etc.
        const result = await this.simulateExecution(goal, {
          tasks: Array.from(decomposition.tree.tasks.values()),
          complexity: analysis.estimatedComplexity,
          estimatedTokens: analysis.estimatedTokenCost,
        }, routing);

        // Phase 5: Verify output quality
        store.setPhase('verifying');
        lastDqScore = {
          score: result.dqScore,
          components: {
            validity: result.dqScore * 0.4 / 0.4,
            specificity: result.dqScore * 0.3 / 0.3,
            correctness: result.dqScore * 0.3 / 0.3,
          },
          isActionable: result.dqScore >= this.config.dqTarget,
          timestamp: Date.now(),
        };

        // Check if output meets DQ threshold
        if (lastDqScore.score >= this.config.dqTarget) {
          // Success!
          const latencyMs = Date.now() - attemptStart;

          store.updateGoal(goalId, {
            status: 'completed',
            completedAt: Date.now(),
          });

          // Record success for learning
          this.recordSuccess(goal, routing.modelId, lastDqScore.score, latencyMs);

          await emitGoalEvent('completed', {
            goalId,
            dqScore: lastDqScore.score,
            latencyMs,
            tokenCost: analysis.estimatedTokenCost,
          });

          store.setPhase('idle');
          archonLog('info', `Goal completed: ${goalId}`, {
            dqScore: lastDqScore.score,
            attempts,
            latencyMs,
          });

          return;
        }

        // DQ below threshold - retry or escalate
        archonLog('info', `DQ below threshold (${lastDqScore.score}), attempt ${attempts}/${this.config.maxRetries}`);

        // Check if we should escalate
        const escalationCheck = this.escalation.shouldEscalate(
          attempts,
          [lastDqScore],
          {
            timeSinceStart: Date.now() - attemptStart,
            consecutiveFailures: attempts,
          }
        );

        if (escalationCheck.escalate) {
          await this.handleEscalation(goal, attempts, escalationCheck.reason ?? 'DQ threshold not met');
          return;
        }

        // Wait before retry with backoff
        await backoffDelay(attempts);

      } catch (error) {
        archonLog('error', `Execution error on attempt ${attempts}`, error);

        if (attempts >= this.config.maxRetries) {
          await this.handleEscalation(goal, attempts, `Error after ${attempts} attempts: ${error}`);
          return;
        }

        await backoffDelay(attempts);
      }
    }

    // Max retries reached
    await this.handleEscalation(goal, attempts, `Max retries (${this.config.maxRetries}) reached`);
  }

  /**
   * Handle escalation to human
   */
  private async handleEscalation(goal: Goal, attempts: number, reason: string): Promise<void> {
    const store = useArchonStore.getState();
    store.setPhase('escalating');
    store.updateGoal(goal.id, { status: 'escalated' });

    const escalationRequest = this.escalation.createEscalation(goal, {
      attempts,
      failureReasons: [reason],
    });

    await emitEscalationEvent('requested', {
      goalId: goal.id,
      escalationId: escalationRequest.goalId,
      options: escalationRequest.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        confidence: opt.confidence,
      })),
    });

    archonLog('info', `Escalated goal: ${goal.id}`, {
      reason,
      attempts,
      optionCount: escalationRequest.options.length,
    });
  }

  /**
   * Handle human escalation decision
   */
  async handleEscalationDecision(decision: HumanDecision): Promise<void> {
    const result = this.escalation.resolveEscalation(decision.escalationId, decision);

    if (!result.success) {
      archonLog('error', 'Failed to resolve escalation', { error: result.error });
      return;
    }

    await emitEscalationEvent('resolved', {
      goalId: decision.escalationId, // Escalation ID is the goal ID
      escalationId: decision.escalationId,
      selectedOption: decision.selectedOptionId,
    });

    // Learn from decision
    if (this.config.learningEnabled) {
      this.learner.processHumanFeedback({
        escalationId: decision.escalationId,
        selectedOption: decision.selectedOptionId,
        customInput: decision.customInput,
      });
    }

    archonLog('info', `Escalation resolved`, {
      escalationId: decision.escalationId,
      nextAction: result.nextAction,
    });

    // Continue processing based on decision
    if (decision.selectedOptionId === 'retry') {
      // Re-queue the goal
      const store = useArchonStore.getState();
      // Find the goal for this escalation and restart
      // TODO: Implement retry logic
    }
  }

  /**
   * Record success for learning
   */
  private recordSuccess(
    goal: Goal,
    modelId: string,
    dqScore: number,
    latencyMs: number
  ): void {
    // Update meta-cognition
    this.metacognition.recordTaskCompletion(modelId, dqScore, latencyMs);

    // Update router
    this.router.recordOutcome(modelId, dqScore, latencyMs);

    // Update learner
    this.learner.processTaskFeedback({
      taskId: goal.id,
      goalText: goal.text,
      success: true,
      dqScore,
      latencyMs,
      tokenCost: 0, // TODO: Track actual tokens
      modelUsed: modelId,
      subsystemsUsed: goal.metadata.estimatedSubsystems,
      humanIntervention: false,
    });
  }

  /**
   * Simulate execution (placeholder)
   * TODO: Replace with actual subsystem dispatch
   */
  private async simulateExecution(
    goal: Goal,
    decomposition: { tasks: any[]; complexity: number; estimatedTokens: number },
    routing: { modelId: string; modelTier: string }
  ): Promise<{ dqScore: number; output: string }> {
    // Simulate based on model tier
    const baseScore = routing.modelTier === 'flagship' ? 0.85 :
                      routing.modelTier === 'standard' ? 0.75 : 0.65;

    // Add some variance
    const variance = (Math.random() - 0.5) * 0.2;
    const dqScore = Math.max(0.3, Math.min(0.95, baseScore + variance));

    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    return {
      dqScore,
      output: `Simulated output for: ${goal.text}`,
    };
  }

  /**
   * Infer goal type from text
   */
  private inferGoalType(goalText: string): string {
    const text = goalText.toLowerCase();

    if (text.includes('implement') || text.includes('add') || text.includes('create')) {
      return 'code-generation';
    }
    if (text.includes('fix') || text.includes('bug') || text.includes('error')) {
      return 'debugging';
    }
    if (text.includes('refactor') || text.includes('improve') || text.includes('optimize')) {
      return 'refactor';
    }
    if (text.includes('test') || text.includes('verify')) {
      return 'testing';
    }
    if (text.includes('research') || text.includes('analyze') || text.includes('investigate')) {
      return 'research';
    }
    if (text.includes('review') || text.includes('audit')) {
      return 'code-review';
    }

    return 'general';
  }

  /**
   * Get current ARCHON state
   */
  getState() {
    return useArchonStore.getState();
  }

  /**
   * Get telemetry data
   */
  getTelemetry() {
    return useArchonStore.getState().telemetry;
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      state: this.getState(),
      metacognition: this.metacognition.getSessionStats(),
      resources: {
        allocator: this.allocator.getStats(),
        router: this.router.getStats(),
        cache: this.cache.getStats(),
      },
      learning: {
        feedback: this.learner.getStats(),
        patterns: this.patterns.getStats(),
      },
      escalation: this.escalation.getStatistics(),
    };
  }

  /**
   * List available models
   */
  listModels() {
    return this.metacognition.listModels();
  }

  /**
   * Reset ARCHON state
   */
  reset(): void {
    useArchonStore.getState().reset();
    this.cache.clear();
    this.patterns.clear();
    archonLog('info', 'ARCHON state reset');
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private setupEventListeners(): void {
    // Listen for subsystem completions
    eventBus.on('subsystem:completed', (event) => {
      archonLog('debug', 'Subsystem completed', event.payload);
    });

    // Listen for errors
    eventBus.on('error:occurred', (event) => {
      archonLog('error', 'Error in ARCHON', event.payload);
    });

    // Listen for pattern learning
    eventBus.on('pattern:learned', (event) => {
      archonLog('debug', 'Pattern learned', event.payload);
    });
  }

  private async initializePersistence(): Promise<void> {
    // TODO: Initialize SQLite connection via ResearchGravity
    archonLog('info', 'Persistence initialized (stub)');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let archonInstance: Archon | null = null;

/**
 * Get or create the ARCHON singleton
 */
export function getArchon(config?: Partial<ArchonConfig>): Archon {
  if (!archonInstance) {
    archonInstance = new Archon(config);
  }
  return archonInstance;
}

/**
 * Reset the ARCHON singleton (for testing)
 */
export function resetArchon(): void {
  if (archonInstance) {
    archonInstance.reset();
  }
  archonInstance = null;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useEffect, useState, useCallback } from 'react';

/**
 * React hook for using ARCHON
 */
export function useArchon() {
  const store = useArchonStore();
  const [archon, setArchon] = useState<Archon | null>(null);

  useEffect(() => {
    const instance = getArchon();
    instance.initialize().then(() => {
      setArchon(instance);
    });
  }, []);

  const processGoal = useCallback(async (goalText: string) => {
    if (!archon) throw new Error('ARCHON not initialized');
    return archon.processGoal(goalText);
  }, [archon]);

  const handleEscalation = useCallback(async (decision: HumanDecision) => {
    if (!archon) throw new Error('ARCHON not initialized');
    return archon.handleEscalationDecision(decision);
  }, [archon]);

  return {
    archon,
    isReady: archon !== null,
    phase: store.phase,
    activeGoals: store.getActiveGoals(),
    telemetry: store.telemetry,
    models: archon?.listModels() ?? [],
    stats: archon?.getStats(),
    processGoal,
    handleEscalation,
    reset: archon?.reset.bind(archon),
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export { Archon };
export default getArchon;
