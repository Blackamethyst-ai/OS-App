/**
 * ARCHON Type Definitions
 *
 * Core types for the autonomous meta-orchestrator system.
 * Based on research from:
 * - arXiv:2601.09742 (Adaptive Orchestration)
 * - arXiv:2506.12508 (AgentOrchestra TEA Protocol)
 * - arXiv:2511.15755 (DQ Scoring)
 */

// =============================================================================
// GOALS
// =============================================================================

export type GoalStatus = 'pending' | 'active' | 'completed' | 'blocked' | 'failed' | 'escalated';

export interface Goal {
  id: string;
  text: string;
  status: GoalStatus;
  parentId?: string;
  children: Goal[];
  createdAt: number;
  completedAt?: number;
  metadata: GoalMetadata;
}

export interface GoalMetadata {
  complexity: number;        // 0-1 estimated complexity
  estimatedSubsystems: SubsystemType[];
  priority: Priority;
  source: 'user' | 'decomposition' | 'self-questioning';
}

export interface GoalTree {
  root: Goal;
  nodes: Map<string, Goal>;
  depth: number;
}

export interface ProgressReport {
  goalId: string;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  percentComplete: number;
  estimatedRemaining: number;
  blockers: string[];
}

// =============================================================================
// SUBSYSTEMS
// =============================================================================

export type SubsystemType =
  | 'ace'           // Adaptive Consensus Engine
  | 'dq'            // DQ Scoring
  | 'dream'         // Dream Protocol
  | 'evolution'     // Self-Evolution
  | 'kernel'        // Agent Kernel
  | 'voice'         // Voice Nexus
  | 'cpb';          // Cognitive Precision Bridge

export interface Subsystem {
  id: SubsystemType;
  name: string;
  status: SubsystemStatus;
  capabilities: string[];
  currentLoad: number;       // 0-1
  lastInvoked?: number;
  metrics: SubsystemMetrics;
}

export type SubsystemStatus = 'idle' | 'busy' | 'error' | 'disabled';

export interface SubsystemMetrics {
  invocations: number;
  successRate: number;
  avgDqScore: number;
  avgLatencyMs: number;
  tokenUsage: number;
}

// =============================================================================
// DECISIONS
// =============================================================================

export type DecisionType =
  | 'route'         // Route task to subsystem
  | 'retry'         // Retry with different approach
  | 'escalate'      // Escalate to human
  | 'complete'      // Mark as complete
  | 'abort';        // Abort task

export interface Decision {
  id: string;
  goalId: string;
  type: DecisionType;
  subsystem?: SubsystemType;
  reasoning: string;
  dqScore?: number;
  confidence: number;
  createdAt: number;
  metadata: DecisionMetadata;
}

export interface DecisionMetadata {
  attemptNumber: number;
  previousAttempts: Decision[];
  contextHash: string;
  modelUsed: string;
}

// =============================================================================
// RESOURCES
// =============================================================================

export type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export interface TokenBudget {
  total: number;
  used: number;
  remaining: number;
  subsystemAllocations: Map<SubsystemType, number>;
}

export interface ResourceAllocation {
  taskId: string;
  budget: TokenBudget;
  model: ModelTier;
  priority: Priority;
  expiresAt: number;
}

export type ModelTier = 'flagship' | 'standard' | 'fast' | 'local';

// =============================================================================
// ESCALATION
// =============================================================================

export interface EscalationOption {
  id: string;
  label: string;
  description: string;
  confidence: number;
  tradeoffs: string[];
  estimatedCost: number;
}

export interface EscalationRequest {
  goalId: string;
  context: string;
  attempts: number;
  failureReasons: string[];
  options: EscalationOption[];
  createdAt: number;
}

export interface HumanDecision {
  escalationId: string;
  selectedOptionId: string;
  customInput?: string;
  timestamp: number;
  feedbackNotes?: string;
}

// =============================================================================
// LEARNING
// =============================================================================

export type PatternType = 'success' | 'failure' | 'escalation' | 'optimization';

export interface Pattern {
  id: string;
  type: PatternType;
  context: PatternContext;
  outcome: PatternOutcome;
  confidence: number;
  frequency: number;
  lastSeen: number;
  createdAt: number;
}

export interface PatternContext {
  goalType: string;
  complexity: number;
  subsystemsInvolved: SubsystemType[];
  keywords: string[];
  contextHash: string;
}

export interface PatternOutcome {
  success: boolean;
  dqScore: number;
  latencyMs: number;
  tokenCost: number;
  humanIntervention: boolean;
}

// =============================================================================
// STATE
// =============================================================================

export type ArchonPhase =
  | 'idle'
  | 'receiving_goal'
  | 'decomposing'
  | 'routing'
  | 'executing'
  | 'verifying'
  | 'escalating'
  | 'learning';

export interface ArchonState {
  phase: ArchonPhase;
  activeGoals: Map<string, Goal>;
  pendingDecisions: Decision[];
  subsystems: Map<SubsystemType, Subsystem>;
  resources: TokenBudget;
  patterns: Pattern[];
  config: ArchonConfig;
  telemetry: TelemetryData;
}

export interface ArchonConfig {
  // Autonomy settings
  maxRetries: number;              // Default: 5 (aggressive)
  escalationThreshold: number;     // Default: 5 attempts
  dqTarget: number;                // Default: 0.7

  // Resource settings
  totalTokenBudget: number;
  subsystemBudgetRatios: Map<SubsystemType, number>;
  defaultModel: ModelTier;

  // Learning settings
  learningEnabled: boolean;
  patternMatchThreshold: number;
  feedbackWeight: number;

  // Persistence
  persistenceEnabled: boolean;
  dbPath: string;
}

export interface TelemetryData {
  sessionStart: number;
  goalsProcessed: number;
  decisionsMade: number;
  escalations: number;
  avgDqScore: number;
  totalTokensUsed: number;
  costEstimate: number;
}

// =============================================================================
// EVENTS
// =============================================================================

export type ArchonEventType =
  | 'goal:received'
  | 'goal:decomposed'
  | 'goal:completed'
  | 'goal:blocked'
  | 'decision:made'
  | 'subsystem:invoked'
  | 'subsystem:completed'
  | 'escalation:requested'
  | 'escalation:resolved'
  | 'pattern:learned'
  | 'error:occurred';

export interface ArchonEvent<T = unknown> {
  type: ArchonEventType;
  payload: T;
  timestamp: number;
  source: string;
}

export type EventHandler<T = unknown> = (event: ArchonEvent<T>) => void | Promise<void>;

// =============================================================================
// DQ SCORING (from existing implementation)
// =============================================================================

export interface DQScore {
  score: number;
  components: {
    validity: number;      // 40% weight
    specificity: number;   // 30% weight
    correctness: number;   // 30% weight
  };
  isActionable: boolean;
  timestamp: number;
}

// =============================================================================
// CAPABILITY GAP ANALYSIS (from arXiv:2601.09742)
// =============================================================================

export interface GapAnalysis {
  taskId: string;
  requiredCapabilities: string[];
  availableCapabilities: Map<SubsystemType, string[]>;
  gaps: CapabilityGap[];
  recommendations: GapRecommendation[];
}

export interface CapabilityGap {
  capability: string;
  severity: 'critical' | 'significant' | 'minor';
  workaround?: string;
}

export interface GapRecommendation {
  action: 'use_subsystem' | 'combine_subsystems' | 'escalate' | 'simplify';
  subsystems?: SubsystemType[];
  reasoning: string;
  confidence: number;
}
