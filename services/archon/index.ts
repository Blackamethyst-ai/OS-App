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

// =============================================================================
// REAL SUBSYSTEM IMPORTS
// =============================================================================
import { adaptiveConsensusEngine, quickConsensus } from '../adaptiveConsensus';
import { cpbExecute, cpbExecutePath } from '../cognitivePrecisionBridge';
import { scoreDQWithLLM, scoreDQHeuristic, createDQScore } from '../dqScoring';
import { dreamProtocol } from '../dreamProtocol';
import { selfEvolution } from '../selfEvolution';
import { agentKernel } from '../kernel';
import type { AtomicTask } from '../../types';
import type { ACEStatus } from '../../types/domain/convergence';

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

        // Phase 4: Execute via real subsystems
        store.setPhase('executing');

        // Dispatch to real subsystems (ACE, CPB, Dream, Evolution, Kernel)
        const result = await this.executeWithSubsystems(
          goal,
          {
            tasks: Array.from(decomposition.tree.tasks.values()),
            complexity: analysis.estimatedComplexity,
            estimatedTokens: analysis.estimatedTokenCost,
          },
          routing,
          (phase, progress) => {
            archonLog('debug', `Subsystem progress: ${phase} (${progress}%)`);
          }
        );

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
   * Execute goal with real subsystems
   *
   * Routes to appropriate subsystem based on goal type and complexity:
   * - CPB (auto-routes internally to RLM, ACE, etc.)
   * - ACE for multi-agent consensus
   * - Dream Protocol for background research
   * - Self-Evolution for code generation
   * - Agent Kernel for intent dispatch
   */
  private async executeWithSubsystems(
    goal: Goal,
    decomposition: { tasks: any[]; complexity: number; estimatedTokens: number },
    routing: { modelId: string; modelTier: string },
    onStatus?: (phase: string, progress: number) => void
  ): Promise<{ dqScore: number; output: string; subsystemUsed: string; tokensUsed: number }> {
    const goalType = this.inferGoalType(goal.text);
    const store = useArchonStore.getState();

    archonLog('info', `Executing goal via real subsystems`, {
      goalType,
      complexity: decomposition.complexity,
      taskCount: decomposition.tasks.length,
    });

    // Create an AtomicTask for subsystems that need it
    const atomicTask: AtomicTask = {
      id: `archon-${goal.id}`,
      description: goal.text,
      instruction: goal.text,
      isolated_input: goal.metadata?.context || '',
      weight: 1,
      status: 'PENDING',
    };

    try {
      // Route based on goal type and complexity
      if (goalType === 'research' && decomposition.complexity < 0.5) {
        // Queue for Dream Protocol (background processing)
        dreamProtocol.queueQuery(goal.text);
        store.recordSubsystemInvocation('dream', 0.7, 100, 0);

        return {
          dqScore: 0.7, // Pending score - will be updated when dream completes
          output: `Queued for background research: ${goal.text}`,
          subsystemUsed: 'dream',
          tokensUsed: 0,
        };
      }

      if (goalType === 'code-generation' || goalType === 'refactor') {
        // Record friction for Self-Evolution to observe
        selfEvolution.recordFriction('REPEATED_ACTION', goal.text, 'ARCHON');

        // Use CPB with cascade path for high-quality code
        const result = await cpbExecutePath(
          decomposition.complexity > 0.7 ? 'cascade' : 'ace',
          goal.text,
          goal.metadata?.context || '',
          (status) => {
            onStatus?.(status.phase, status.progress);
            archonLog('debug', `CPB status: ${status.phase} (${status.progress}%)`);
          }
        );

        store.recordSubsystemInvocation('evolution', result.dqScore.score, result.executionTimeMs, result.tokensUsed);

        return {
          dqScore: result.dqScore.score,
          output: result.output,
          subsystemUsed: `cpb:${result.path}`,
          tokensUsed: result.tokensUsed,
        };
      }

      if (decomposition.complexity > 0.7 || goalType === 'consensus') {
        // High complexity - use ACE for multi-agent consensus
        const result = await adaptiveConsensusEngine(
          atomicTask,
          (status: ACEStatus) => {
            // Calculate progress from consensus gap or use consensusProgress
            const progress = status.consensusProgress ??
              (status.targetGap > 0 ? Math.min(100, (1 - status.currentGap / status.targetGap) * 100) : 0);
            onStatus?.(status.phase, progress);
            archonLog('debug', `ACE status: ${status.phase} (${progress.toFixed(0)}%)`);
          },
          {
            enableAuction: true,
            enableDQScoring: true,
            enableLearning: true,
          }
        );

        store.recordSubsystemInvocation('ace', result.dqScore?.score || 0.8, result.executionTime, decomposition.estimatedTokens);

        return {
          dqScore: result.dqScore?.score || 0.8,
          output: result.output,
          subsystemUsed: 'ace',
          tokensUsed: decomposition.estimatedTokens,
        };
      }

      if (goalType === 'dispatch' || goalType === 'navigation') {
        // Use Agent Kernel for intent dispatch
        const result = await agentKernel.dispatch(goal.text, {
          priority: goal.metadata.priority === 'high' ? 'HIGH' : 'NORMAL',
          currentMode: 'ARCHON',
        });

        // Score the output
        const dqResult = scoreDQHeuristic(
          typeof result.result === 'string' ? result.result : JSON.stringify(result.result || ''),
          atomicTask
        );

        store.recordSubsystemInvocation('kernel', dqResult.score, result.latencyMs || 1000, 500);

        return {
          dqScore: dqResult.score,
          output: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
          subsystemUsed: 'kernel',
          tokensUsed: 500,
        };
      }

      // Default: Use CPB auto-routing (handles most cases well)
      const cpbResult = await cpbExecute(
        goal.text,
        goal.metadata?.context || '',
        (status) => {
          onStatus?.(status.phase, status.progress);
          archonLog('debug', `CPB status: ${status.phase} (${status.progress}%)`);
        }
      );

      store.recordSubsystemInvocation('cpb', cpbResult.dqScore.score, cpbResult.executionTimeMs, cpbResult.tokensUsed);

      return {
        dqScore: cpbResult.dqScore.score,
        output: cpbResult.output,
        subsystemUsed: `cpb:${cpbResult.path}`,
        tokensUsed: cpbResult.tokensUsed,
      };

    } catch (error) {
      archonLog('error', `Subsystem execution failed`, { error, goalType });

      // Fallback: Try quick consensus
      try {
        const fallbackResult = await quickConsensus(atomicTask, (status: ACEStatus) => {
          const progress = status.consensusProgress ??
            (status.targetGap > 0 ? Math.min(100, (1 - status.currentGap / status.targetGap) * 100) : 0);
          onStatus?.(status.phase, progress);
        });

        return {
          dqScore: fallbackResult.dqScore?.score || 0.6,
          output: fallbackResult.output,
          subsystemUsed: 'ace:fallback',
          tokensUsed: decomposition.estimatedTokens,
        };
      } catch (fallbackError) {
        // Final fallback - return error state
        return {
          dqScore: 0.3,
          output: `Execution failed: ${error}`,
          subsystemUsed: 'none',
          tokensUsed: 0,
        };
      }
    }
  }

  /**
   * Infer goal type from text
   *
   * Maps to subsystem routing:
   * - code-generation, refactor → CPB cascade/ace path + Self-Evolution
   * - research → Dream Protocol (background)
   * - consensus → ACE multi-agent
   * - dispatch, navigation → Agent Kernel
   * - general, debugging, testing, code-review → CPB auto-route
   */
  private inferGoalType(goalText: string): string {
    const text = goalText.toLowerCase();

    // Code generation patterns
    if (text.includes('implement') || text.includes('add') || text.includes('create') ||
        text.includes('build') || text.includes('write') || text.includes('generate')) {
      return 'code-generation';
    }

    // Debugging patterns
    if (text.includes('fix') || text.includes('bug') || text.includes('error') ||
        text.includes('debug') || text.includes('issue')) {
      return 'debugging';
    }

    // Refactoring patterns
    if (text.includes('refactor') || text.includes('improve') || text.includes('optimize') ||
        text.includes('clean up') || text.includes('restructure')) {
      return 'refactor';
    }

    // Testing patterns
    if (text.includes('test') || text.includes('verify') || text.includes('validate')) {
      return 'testing';
    }

    // Research patterns → Dream Protocol
    if (text.includes('research') || text.includes('investigate') || text.includes('explore') ||
        text.includes('find out') || text.includes('learn about')) {
      return 'research';
    }

    // Analysis patterns
    if (text.includes('analyze') || text.includes('analyse') || text.includes('review') ||
        text.includes('audit') || text.includes('examine')) {
      return 'code-review';
    }

    // Consensus patterns → ACE
    if (text.includes('consensus') || text.includes('decide') || text.includes('compare') ||
        text.includes('evaluate options') || text.includes('which is better')) {
      return 'consensus';
    }

    // Navigation patterns → Kernel
    if (text.includes('navigate') || text.includes('go to') || text.includes('open') ||
        text.includes('show me') || text.includes('switch to')) {
      return 'navigation';
    }

    // Dispatch patterns → Kernel
    if (text.includes('run') || text.includes('execute') || text.includes('start') ||
        text.includes('launch') || text.includes('trigger')) {
      return 'dispatch';
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

import { useEffect, useState, useCallback, useMemo } from 'react';

/**
 * React hook for using ARCHON
 *
 * Properly subscribes to store state changes to ensure UI updates
 * when goals are added or modified.
 */
export function useArchon() {
  // Subscribe to specific state slices for proper reactivity
  const phase = useArchonStore((state) => state.phase);
  const activeGoalsMap = useArchonStore((state) => state.activeGoals);
  const telemetry = useArchonStore((state) => state.telemetry);

  const [archon, setArchon] = useState<Archon | null>(null);

  useEffect(() => {
    const instance = getArchon();
    instance.initialize().then(() => {
      setArchon(instance);
    });
  }, []);

  // Convert Map to array reactively
  const activeGoals = useMemo(() => {
    const goals: Goal[] = [];
    activeGoalsMap.forEach((goal) => {
      if (goal.status === 'active' || goal.status === 'pending') {
        goals.push(goal);
      }
    });
    return goals;
  }, [activeGoalsMap]);

  // Get all goals (including completed/escalated) for display
  const allGoals = useMemo(() => {
    const goals: Goal[] = [];
    activeGoalsMap.forEach((goal) => goals.push(goal));
    return goals.sort((a, b) => b.createdAt - a.createdAt);
  }, [activeGoalsMap]);

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
    phase,
    activeGoals,
    allGoals, // New: includes completed goals for UI display
    telemetry,
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
