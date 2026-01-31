/**
 * ARCHON State Machine
 *
 * Unified state management for the autonomous meta-orchestrator.
 * Implements the DMoE (Dynamic Mixture of Experts) approach from arXiv:2601.09742.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ArchonState,
  ArchonPhase,
  ArchonConfig,
  Goal,
  GoalStatus,
  Decision,
  Subsystem,
  SubsystemType,
  SubsystemStatus,
  TokenBudget,
  Pattern,
  TelemetryData,
  DQScore,
} from './types';
import { generateId } from './utils';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_ARCHON_CONFIG: ArchonConfig = {
  // Autonomy settings (aggressive mode per user preference)
  maxRetries: 5,
  escalationThreshold: 5,
  dqTarget: 0.7,

  // Resource settings
  totalTokenBudget: 1_000_000, // 1M tokens per session
  subsystemBudgetRatios: new Map([
    ['ace', 0.3],        // ACE gets 30%
    ['cpb', 0.25],       // CPB gets 25%
    ['evolution', 0.15], // Evolution gets 15%
    ['dream', 0.1],      // Dream gets 10%
    ['kernel', 0.1],     // Kernel gets 10%
    ['voice', 0.05],     // Voice gets 5%
    ['dq', 0.05],        // DQ gets 5%
  ]),
  defaultModel: 'flagship',

  // Learning settings
  learningEnabled: true,
  patternMatchThreshold: 0.7,
  feedbackWeight: 0.3,

  // Persistence (SQLite via ResearchGravity)
  persistenceEnabled: true,
  dbPath: '~/.agent-core/storage/antigravity.db',
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const createInitialSubsystems = (): Map<SubsystemType, Subsystem> => {
  const subsystems = new Map<SubsystemType, Subsystem>();

  const definitions: Array<[SubsystemType, string, string[]]> = [
    ['ace', 'Adaptive Consensus Engine', ['multi-agent', 'consensus', 'voting', 'complex-reasoning']],
    ['dq', 'DQ Scoring', ['quality-assessment', 'validation', 'scoring']],
    ['dream', 'Dream Protocol', ['research', 'background-processing', 'insights']],
    ['evolution', 'Self-Evolution', ['code-generation', 'refactoring', 'improvement']],
    ['kernel', 'Agent Kernel', ['task-dispatch', 'scheduling', 'coordination']],
    ['voice', 'Voice Nexus', ['voice-input', 'natural-language', 'routing']],
    ['cpb', 'Cognitive Precision Bridge', ['reasoning-paths', 'compression', 'verification']],
  ];

  for (const [id, name, capabilities] of definitions) {
    subsystems.set(id, {
      id,
      name,
      status: 'idle',
      capabilities,
      currentLoad: 0,
      metrics: {
        invocations: 0,
        successRate: 1.0,
        avgDqScore: 0,
        avgLatencyMs: 0,
        tokenUsage: 0,
      },
    });
  }

  return subsystems;
};

const createInitialTokenBudget = (config: ArchonConfig): TokenBudget => ({
  total: config.totalTokenBudget,
  used: 0,
  remaining: config.totalTokenBudget,
  subsystemAllocations: new Map(
    Array.from(config.subsystemBudgetRatios.entries()).map(([subsystem, ratio]) => [
      subsystem,
      Math.floor(config.totalTokenBudget * ratio),
    ])
  ),
});

const createInitialTelemetry = (): TelemetryData => ({
  sessionStart: Date.now(),
  goalsProcessed: 0,
  decisionsMade: 0,
  escalations: 0,
  avgDqScore: 0,
  totalTokensUsed: 0,
  costEstimate: 0,
});

// =============================================================================
// STATE STORE
// =============================================================================

interface ArchonStore extends ArchonState {
  // Active model tracking
  activeModelId: string | null;
  setActiveModel: (modelId: string | null) => void;

  // Phase transitions
  setPhase: (phase: ArchonPhase) => void;

  // Goal management
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'children'>) => Goal;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  removeGoal: (goalId: string) => void;
  getGoal: (goalId: string) => Goal | undefined;
  getActiveGoals: () => Goal[];

  // Decision management
  addDecision: (decision: Omit<Decision, 'id' | 'createdAt'>) => Decision;
  getDecisionsForGoal: (goalId: string) => Decision[];

  // Subsystem management
  updateSubsystem: (id: SubsystemType, updates: Partial<Subsystem>) => void;
  setSubsystemStatus: (id: SubsystemType, status: SubsystemStatus) => void;
  recordSubsystemInvocation: (id: SubsystemType, dqScore: number, latencyMs: number, tokens: number) => void;

  // Resource management
  allocateTokens: (subsystem: SubsystemType, amount: number) => boolean;
  releaseTokens: (subsystem: SubsystemType, amount: number) => void;
  getTokenBudget: () => TokenBudget;

  // Pattern learning
  addPattern: (pattern: Omit<Pattern, 'id' | 'createdAt'>) => Pattern;
  findMatchingPatterns: (context: { goalType: string; complexity: number }) => Pattern[];

  // Telemetry
  updateTelemetry: (updates: Partial<TelemetryData>) => void;
  recordGoalCompletion: (dqScore: number, tokenCost: number) => void;
  recordEscalation: () => void;

  // Reset
  reset: () => void;
}

export const useArchonStore = create<ArchonStore>()(
  persist(
    (set, get) => ({
      // Initial state
      phase: 'idle',
      activeGoals: new Map(),
      pendingDecisions: [],
      subsystems: createInitialSubsystems(),
      resources: createInitialTokenBudget(DEFAULT_ARCHON_CONFIG),
      patterns: [],
      config: DEFAULT_ARCHON_CONFIG,
      telemetry: createInitialTelemetry(),
      activeModelId: null,

      // Active model tracking
      setActiveModel: (modelId) => set({ activeModelId: modelId }),

      // Phase transitions
      setPhase: (phase) => set({ phase }),

      // Goal management
      addGoal: (goalData) => {
        const goal: Goal = {
          ...goalData,
          id: generateId('goal'),
          createdAt: Date.now(),
          children: [],
        };
        set((state) => {
          const newGoals = new Map(state.activeGoals);
          newGoals.set(goal.id, goal);
          return { activeGoals: newGoals };
        });
        return goal;
      },

      updateGoal: (goalId, updates) => {
        set((state) => {
          const goal = state.activeGoals.get(goalId);
          if (!goal) return state;

          const newGoals = new Map(state.activeGoals);
          newGoals.set(goalId, { ...goal, ...updates });
          return { activeGoals: newGoals };
        });
      },

      removeGoal: (goalId) => {
        set((state) => {
          const newGoals = new Map(state.activeGoals);
          newGoals.delete(goalId);
          return { activeGoals: newGoals };
        });
      },

      getGoal: (goalId) => get().activeGoals.get(goalId),

      getActiveGoals: () => {
        const goals: Goal[] = [];
        get().activeGoals.forEach((goal) => {
          if (goal.status === 'active' || goal.status === 'pending') {
            goals.push(goal);
          }
        });
        return goals;
      },

      // Decision management
      addDecision: (decisionData) => {
        const decision: Decision = {
          ...decisionData,
          id: generateId('decision'),
          createdAt: Date.now(),
        };
        set((state) => ({
          pendingDecisions: [...state.pendingDecisions, decision],
          telemetry: {
            ...state.telemetry,
            decisionsMade: state.telemetry.decisionsMade + 1,
          },
        }));
        return decision;
      },

      getDecisionsForGoal: (goalId) =>
        get().pendingDecisions.filter((d) => d.goalId === goalId),

      // Subsystem management
      updateSubsystem: (id, updates) => {
        set((state) => {
          const subsystem = state.subsystems.get(id);
          if (!subsystem) return state;

          const newSubsystems = new Map(state.subsystems);
          newSubsystems.set(id, { ...subsystem, ...updates });
          return { subsystems: newSubsystems };
        });
      },

      setSubsystemStatus: (id, status) => {
        get().updateSubsystem(id, { status });
      },

      recordSubsystemInvocation: (id, dqScore, latencyMs, tokens) => {
        set((state) => {
          const subsystem = state.subsystems.get(id);
          if (!subsystem) return state;

          const metrics = subsystem.metrics;
          const newInvocations = metrics.invocations + 1;
          const newAvgDq = (metrics.avgDqScore * metrics.invocations + dqScore) / newInvocations;
          const newAvgLatency = (metrics.avgLatencyMs * metrics.invocations + latencyMs) / newInvocations;

          const newSubsystems = new Map(state.subsystems);
          newSubsystems.set(id, {
            ...subsystem,
            lastInvoked: Date.now(),
            metrics: {
              ...metrics,
              invocations: newInvocations,
              avgDqScore: newAvgDq,
              avgLatencyMs: newAvgLatency,
              tokenUsage: metrics.tokenUsage + tokens,
            },
          });

          return { subsystems: newSubsystems };
        });
      },

      // Resource management
      allocateTokens: (subsystem, amount) => {
        const state = get();
        const allocation = state.resources.subsystemAllocations.get(subsystem) || 0;

        if (state.resources.remaining < amount) {
          return false; // Insufficient budget
        }

        set((s) => ({
          resources: {
            ...s.resources,
            used: s.resources.used + amount,
            remaining: s.resources.remaining - amount,
          },
        }));

        return true;
      },

      releaseTokens: (subsystem, amount) => {
        set((state) => ({
          resources: {
            ...state.resources,
            used: Math.max(0, state.resources.used - amount),
            remaining: Math.min(state.resources.total, state.resources.remaining + amount),
          },
        }));
      },

      getTokenBudget: () => get().resources,

      // Pattern learning
      addPattern: (patternData) => {
        const pattern: Pattern = {
          ...patternData,
          id: generateId('pattern'),
          createdAt: Date.now(),
        };
        set((state) => ({
          patterns: [...state.patterns, pattern],
        }));
        return pattern;
      },

      findMatchingPatterns: ({ goalType, complexity }) => {
        const { patterns, config } = get();
        return patterns.filter((p) => {
          // Simple matching: same goal type and similar complexity
          const typeMatch = p.context.goalType === goalType;
          const complexityDiff = Math.abs(p.context.complexity - complexity);
          return typeMatch && complexityDiff < 0.2 && p.confidence >= config.patternMatchThreshold;
        });
      },

      // Telemetry
      updateTelemetry: (updates) => {
        set((state) => ({
          telemetry: { ...state.telemetry, ...updates },
        }));
      },

      recordGoalCompletion: (dqScore, tokenCost) => {
        set((state) => {
          const { telemetry } = state;
          const newGoalsProcessed = telemetry.goalsProcessed + 1;
          const newAvgDq = (telemetry.avgDqScore * telemetry.goalsProcessed + dqScore) / newGoalsProcessed;

          return {
            telemetry: {
              ...telemetry,
              goalsProcessed: newGoalsProcessed,
              avgDqScore: newAvgDq,
              totalTokensUsed: telemetry.totalTokensUsed + tokenCost,
              // Rough cost estimate: $0.003 per 1K tokens average
              costEstimate: telemetry.costEstimate + (tokenCost / 1000) * 0.003,
            },
          };
        });
      },

      recordEscalation: () => {
        set((state) => ({
          telemetry: {
            ...state.telemetry,
            escalations: state.telemetry.escalations + 1,
          },
        }));
      },

      // Reset
      reset: () => {
        set({
          phase: 'idle',
          activeGoals: new Map(),
          pendingDecisions: [],
          subsystems: createInitialSubsystems(),
          resources: createInitialTokenBudget(DEFAULT_ARCHON_CONFIG),
          patterns: [], // Preserve patterns for learning
          telemetry: createInitialTelemetry(),
          activeModelId: null,
        });
      },
    }),
    {
      name: 'archon-state',
      // Custom serialization for Maps
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;

            const data = JSON.parse(str);
            // Reconstruct Maps from arrays with defensive handling
            if (data.state) {
              // Handle activeGoals - ensure it's a valid Map
              if (data.state.activeGoals && Array.isArray(data.state.activeGoals)) {
                data.state.activeGoals = new Map(data.state.activeGoals);
              } else {
                data.state.activeGoals = new Map();
              }
              // Handle subsystems
              if (data.state.subsystems && Array.isArray(data.state.subsystems)) {
                data.state.subsystems = new Map(data.state.subsystems);
              } else {
                data.state.subsystems = createInitialSubsystems();
              }
              // Handle subsystemAllocations
              if (data.state.resources?.subsystemAllocations && Array.isArray(data.state.resources.subsystemAllocations)) {
                data.state.resources.subsystemAllocations = new Map(data.state.resources.subsystemAllocations);
              }
              // Handle subsystemBudgetRatios
              if (data.state.config?.subsystemBudgetRatios && Array.isArray(data.state.config.subsystemBudgetRatios)) {
                data.state.config.subsystemBudgetRatios = new Map(data.state.config.subsystemBudgetRatios);
              }
            }
            return data;
          } catch (e) {
            console.error('[ARCHON] Failed to parse persisted state, resetting:', e);
            localStorage.removeItem(name);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            // Serialize Maps to arrays
            const serializable = JSON.parse(JSON.stringify(value, (key, val) => {
              if (val instanceof Map) {
                return Array.from(val.entries());
              }
              return val;
            }));
            localStorage.setItem(name, JSON.stringify(serializable));
          } catch (e) {
            console.error('[ARCHON] Failed to persist state:', e);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectPhase = (state: ArchonStore) => state.phase;
export const selectActiveGoals = (state: ArchonStore) => state.getActiveGoals();
export const selectSubsystems = (state: ArchonStore) => state.subsystems;
export const selectTokenBudget = (state: ArchonStore) => state.resources;
export const selectTelemetry = (state: ArchonStore) => state.telemetry;
export const selectConfig = (state: ArchonStore) => state.config;

// =============================================================================
// UTILITY: Generate IDs
// =============================================================================

export { generateId } from './utils';
