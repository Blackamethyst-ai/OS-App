/**
 * Adapter: FeedbackLearner ModelPerformanceRecord -> CPB LearnedRouting
 *
 * Bridges the ARCHON FeedbackLearner's model performance data into
 * the CPB router's learnedRouting parameter for data-driven path selection.
 */

import type { LearnedRouting, CPBPath } from './types';
import type { ModelPerformanceRecord } from '../../services/archon/learning/feedback';
import { getFeedbackLearner } from '../../services/archon/learning/feedback';

const MIN_RECORDS_FOR_ROUTING = 5;

const PATH_BY_TASK: Record<string, CPBPath> = {
  implementation: 'hybrid',
  bugfix: 'direct',
  refactor: 'rlm',
  research: 'ace',
  testing: 'direct',
  general: 'cascade',
};

/**
 * Convert ModelPerformanceRecord[] to LearnedRouting.
 * Returns undefined when insufficient data (< 5 records).
 */
export function adaptFeedbackToRouting(
  records: ModelPerformanceRecord[]
): LearnedRouting | undefined {
  if (records.length < MIN_RECORDS_FOR_ROUTING) return undefined;

  const totalInvocations = records.reduce((s, r) => s + r.totalInvocations, 0);
  const weightedDQ = records.reduce((s, r) => s + r.avgDqScore * r.totalInvocations, 0) / totalInvocations;
  const weightedLatency = records.reduce((s, r) => s + r.avgLatencyMs * r.totalInvocations, 0) / totalInvocations;

  // Determine dominant task type across all models
  const taskCounts = new Map<string, number>();
  for (const r of records) {
    for (const t of Array.from(r.taskTypes)) {
      taskCounts.set(t, (taskCounts.get(t) ?? 0) + r.totalInvocations);
    }
  }
  const dominantTask = Array.from(taskCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'general';

  const confidence = Math.min(0.95, 0.5 + (totalInvocations / 100));

  return {
    domain: dominantTask,
    preferredPath: PATH_BY_TASK[dominantTask] ?? 'cascade',
    avgDQ: weightedDQ,
    avgTime: weightedLatency,
    sampleCount: totalInvocations,
    confidence,
  };
}

/**
 * Get LearnedRouting from the singleton FeedbackLearner.
 * Returns undefined if insufficient data — caller uses default routing.
 */
export function getLearnedRoutingFromFeedback(): LearnedRouting | undefined {
  try {
    const learner = getFeedbackLearner();
    const records = learner.getAllModelPerformance();
    return adaptFeedbackToRouting(records);
  } catch {
    // Fail silently — FeedbackLearner may not be initialized
    return undefined;
  }
}
