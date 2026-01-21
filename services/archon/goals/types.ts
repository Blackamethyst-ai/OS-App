/**
 * ARCHON Goal System Types
 *
 * Extended types for goal decomposition and tracking.
 * Based on hierarchical planning from HALO (arXiv:2505.13516).
 */

import { GoalStatus, SubsystemType, Priority, DQScore } from '../types';

// =============================================================================
// FORWARD DECLARATIONS
// =============================================================================

// TaskGraph is defined in taskGraph.ts - we use a type alias here
// to avoid circular dependencies
import type { TaskGraph } from './taskGraph';

// =============================================================================
// EXECUTION PLAN
// =============================================================================

/**
 * Flattened representation for execution
 */
export interface ExecutionPlan {
  goalId: string;
  steps: ExecutionStep[];
  dependencies: Map<string, string[]>; // stepId -> dependsOn stepIds
  estimatedTokens: number;
  estimatedDuration: number;
}

export interface ExecutionStep {
  id: string;
  goalId: string;
  description: string;
  subsystem: SubsystemType;
  priority: Priority | 'critical' | 'normal';
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: StepResult;
}

export interface StepResult {
  success: boolean;
  output?: unknown;
  dqScore?: DQScore;
  error?: string;
  tokenUsage: number;
  latencyMs: number;
}

// =============================================================================
// DECOMPOSITION
// =============================================================================

/**
 * Configuration for goal decomposition
 */
export interface DecompositionConfig {
  maxDepth: number;           // Maximum tree depth (default: 4)
  maxSubtasks: number;        // Max subtasks per goal (default: 7)
  minComplexity: number;      // Minimum complexity to decompose (default: 0.3)
  atomicThreshold: number;    // Complexity below which task is atomic (default: 0.2)
  useCache: boolean;          // Use cached decompositions (default: true)
}

export const DEFAULT_DECOMPOSITION_CONFIG: DecompositionConfig = {
  maxDepth: 4,
  maxSubtasks: 7,
  minComplexity: 0.3,
  atomicThreshold: 0.2,
  useCache: true,
};

/**
 * Result of decomposing a goal
 */
export interface DecompositionResult {
  goalId: string;
  tree: TaskGraph;
  plan: ExecutionPlan;
  analysis: DecompositionAnalysis;
  cached: boolean;
}

export interface DecompositionAnalysis {
  totalSubtasks: number;
  maxDepth: number;
  estimatedComplexity: number;
  subsystemsRequired: SubsystemType[];
  estimatedTokenCost: number;
  parallelizable: number; // Percentage that can run in parallel
  criticalPath: string[]; // IDs of goals on critical path
}

/**
 * Prompt template for LLM decomposition
 */
export interface DecompositionPrompt {
  goal: string;
  context: string;
  constraints: string[];
  examples: DecompositionExample[];
}

export interface DecompositionExample {
  input: string;
  output: SubtaskDefinition[];
}

export interface SubtaskDefinition {
  description: string;
  type: 'atomic' | 'composite';
  subsystem: SubsystemType;
  dependencies: number[]; // Indices of dependent subtasks
  complexity: number;
}

// =============================================================================
// TRACKING
// =============================================================================

/**
 * Progress tracking for a goal
 */
export interface GoalProgress {
  goalId: string;
  status: GoalStatus;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  percentComplete: number;
  currentStep?: ExecutionStep;
  blockers: Blocker[];
  startedAt: number;
  lastUpdated: number;
  estimatedCompletion?: number;
}

export interface Blocker {
  id: string;
  stepId: string;
  type: 'dependency' | 'error' | 'resource' | 'human-input' | 'timeout';
  description: string;
  severity: 'critical' | 'major' | 'minor';
  createdAt: number;
  resolvedAt?: number;
}

/**
 * Event emitted on progress updates
 */
export interface ProgressEvent {
  goalId: string;
  type: 'step-started' | 'step-completed' | 'step-failed' | 'blocked' | 'unblocked' | 'completed';
  stepId?: string;
  progress: GoalProgress;
  timestamp: number;
}

/**
 * Summary report for a completed goal
 */
export interface GoalReport {
  goalId: string;
  goalText: string;
  status: 'completed' | 'failed' | 'escalated';
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  retries: number;
  totalTokens: number;
  totalLatencyMs: number;
  avgDqScore: number;
  subsystemsUsed: SubsystemType[];
  blockersSeen: number;
  humanInterventions: number;
  startedAt: number;
  completedAt: number;
}

// =============================================================================
// CACHING
// =============================================================================

/**
 * Cached decomposition for reuse
 */
export interface CachedDecomposition {
  goalHash: string;
  decomposition: DecompositionResult;
  hitCount: number;
  lastUsed: number;
  createdAt: number;
  avgDqScore: number;
  successRate: number;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation result for a goal
 */
export interface GoalValidation {
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'ambiguous' | 'too-broad' | 'missing-context' | 'impossible' | 'unsafe';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

// =============================================================================
// SELF-QUESTIONING (from arXiv:2511.10395 AgentEvolver)
// =============================================================================

/**
 * Self-generated question for task discovery
 */
export interface SelfQuestion {
  id: string;
  question: string;
  context: string;
  priority: number;
  generatedFrom: string; // Goal ID that spawned this
  timestamp: number;
}

/**
 * Result of answering a self-question
 */
export interface QuestionAnswer {
  questionId: string;
  answer: string;
  confidence: number;
  newGoalsGenerated: string[];
  timestamp: number;
}
