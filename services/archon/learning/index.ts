/**
 * ARCHON Learning Module
 *
 * Feedback learning and pattern memory.
 *
 * @example
 * ```typescript
 * import { getFeedbackLearner, getPatternMemory } from '@/services/archon/learning';
 *
 * // Process task feedback
 * const learner = getFeedbackLearner();
 * learner.processTaskFeedback({
 *   taskId: 'task-123',
 *   goalText: 'Add dark mode toggle',
 *   success: true,
 *   dqScore: 0.85,
 *   latencyMs: 5000,
 *   tokenCost: 15000,
 *   modelUsed: 'claude-opus-5',
 *   subsystemsUsed: ['ace', 'kernel'],
 *   humanIntervention: false,
 * });
 *
 * // Get recommendation from learned patterns
 * const recommendation = learner.getRecommendation('implementation', 0.7, ['ace']);
 *
 * // Query pattern memory
 * const memory = getPatternMemory();
 * const patterns = memory.findByGoalType('implementation');
 * ```
 */

// Feedback Learner
export {
  FeedbackLearner,
  getFeedbackLearner,
  type LearnerConfig,
  type TaskFeedback,
  type HumanFeedback,
  type ModelFeedback,
} from './feedback';

// Pattern Memory
export {
  PatternMemory,
  getPatternMemory,
  type PatternMemoryConfig,
} from './patterns';

// =============================================================================
// CONVENIENCE INTERFACE
// =============================================================================

import { getFeedbackLearner } from './feedback';
import { getPatternMemory } from './patterns';

/**
 * Unified learning interface
 */
export const learning = {
  /**
   * Get the feedback learner
   */
  get learner() {
    return getFeedbackLearner();
  },

  /**
   * Get the pattern memory
   */
  get patterns() {
    return getPatternMemory();
  },

  /**
   * Get recommendation for a task
   */
  recommend(goalType: string, complexity: number, subsystems: ('ace' | 'dq' | 'dream' | 'evolution' | 'kernel' | 'voice' | 'cpb')[] = []) {
    return getFeedbackLearner().getRecommendation(goalType, complexity, subsystems);
  },

  /**
   * Get combined statistics
   */
  getStats() {
    return {
      learner: getFeedbackLearner().getStats(),
      patterns: getPatternMemory().getStats(),
    };
  },
};
