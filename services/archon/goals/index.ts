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
export {
  TaskGraph,
  Task,
  TaskStatus,
  TaskPriority,
  TaskResult,
  createTask,
} from './taskGraph';

// Goal Decomposer
export {
  GoalDecomposer,
  IPatternStore,
  ILLMProvider,
  IComplexityRouter,
  ComplexityAnalysis,
  DecompositionContext,
  StubPatternStore,
  StubLLMProvider,
} from './decomposer';

// Goal Tracker
export {
  GoalTracker,
  TrackerStats,
  getGoalTracker,
} from './tracker';
