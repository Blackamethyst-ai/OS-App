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
 * - Optimization: Quality First (DQ over cost)
 * - Persistence: SQLite via ResearchGravity
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
export type { } from './state'; // Re-export any additional types

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
// ARCHON CLASS
// =============================================================================

import { useArchonStore } from './state';
import { eventBus, emitGoalEvent, emitErrorEvent } from './eventBus';
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
} from './types';
import {
  generateId,
  estimateGoalComplexity,
  inferSubsystems,
  archonLog,
} from './utils';

/**
 * Main ARCHON controller class
 *
 * Provides high-level API for goal management and orchestration.
 */
class Archon {
  private config: ArchonConfig;
  private initialized = false;

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
    archonLog('info', 'ARCHON initialized successfully');
  }

  /**
   * Process a high-level goal
   */
  async processGoal(goalText: string): Promise<Goal> {
    if (!this.initialized) {
      await this.initialize();
    }

    const store = useArchonStore.getState();

    // Update phase
    store.setPhase('receiving_goal');

    // Analyze goal
    const complexity = estimateGoalComplexity(goalText);
    const estimatedSubsystems = inferSubsystems(goalText);

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
   * Execute a goal (internal)
   */
  private async executeGoal(goalId: string): Promise<void> {
    const store = useArchonStore.getState();
    const goal = store.getGoal(goalId);

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Update status
    store.updateGoal(goalId, { status: 'active' });
    store.setPhase('decomposing');

    archonLog('info', `Executing goal: ${goalId}`);

    // TODO: Phase 2 - Implement goal decomposition
    // TODO: Phase 3 - Implement meta-cognition and routing
    // TODO: Phase 4 - Implement resource management
    // TODO: Phase 5 - Implement escalation and learning
    // TODO: Phase 6 - Integrate with subsystems

    // Placeholder: Mark as completed for now
    store.updateGoal(goalId, {
      status: 'completed',
      completedAt: Date.now(),
    });

    await emitGoalEvent('completed', {
      goalId,
      dqScore: 0.8,
      latencyMs: 1000,
      tokenCost: 5000,
    });

    store.setPhase('idle');
  }

  /**
   * Handle human escalation decision
   */
  async handleEscalationDecision(decision: HumanDecision): Promise<void> {
    archonLog('info', `Escalation resolved: ${decision.escalationId}`, {
      selectedOption: decision.selectedOptionId,
    });

    // TODO: Implement escalation handling in Phase 5

    // Learn from decision
    if (this.config.learningEnabled) {
      // TODO: Add pattern learning
    }
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
   * Reset ARCHON state
   */
  reset(): void {
    useArchonStore.getState().reset();
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

import { useEffect, useState } from 'react';

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

  return {
    archon,
    isReady: archon !== null,
    phase: store.phase,
    activeGoals: store.getActiveGoals(),
    telemetry: store.telemetry,
    processGoal: archon?.processGoal.bind(archon),
    handleEscalation: archon?.handleEscalationDecision.bind(archon),
    reset: archon?.reset.bind(archon),
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export { Archon };
export default getArchon;
