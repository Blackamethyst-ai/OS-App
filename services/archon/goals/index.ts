/**
 * ARCHON Goals Module
 *
 * Goal decomposition, task graphs, and progress tracking.
 *
 * @module archon/goals
 */

// Types
export * from './types';

// Task Graph
export { TaskGraph, createTask } from './taskGraph';
export type { Task, TaskStatus, TaskPriority, TaskResult } from './taskGraph';

// Goal Decomposer
export { GoalDecomposer, getGoalDecomposer, StubPatternStore, StubLLMProvider } from './decomposer';
export type {
  IPatternStore,
  ILLMProvider,
  IComplexityRouter,
  ComplexityAnalysis,
  DecompositionContext,
} from './decomposer';

// Goal Tracker
export { GoalTracker, getGoalTracker } from './tracker';
export type { TrackerStats } from './tracker';
