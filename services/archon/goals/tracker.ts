/**
 * ARCHON Goal Tracker
 *
 * Monitors progress across goal execution, detects blockers,
 * and generates progress reports.
 */

import { SubsystemType, GoalStatus } from '../types';
import { eventBus, emitGoalEvent } from '../eventBus';
import { TaskGraph, Task, TaskStatus } from './taskGraph';
import { GoalProgress, Blocker, ProgressEvent, GoalReport } from './types';
import { generateId, formatDuration, archonLog } from '../utils';

// =============================================================================
// GOAL TRACKER
// =============================================================================

export class GoalTracker {
  private activeGoals: Map<string, TrackedGoal> = new Map();
  private completedGoals: GoalReport[] = [];
  private progressCallbacks: Map<string, ((event: ProgressEvent) => void)[]> = new Map();

  /**
   * Start tracking a goal
   */
  startTracking(graph: TaskGraph): GoalProgress {
    const progress: GoalProgress = {
      goalId: graph.id,
      status: 'active',
      totalSteps: graph.tasks.size,
      completedSteps: 0,
      failedSteps: 0,
      percentComplete: 0,
      blockers: [],
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };

    const tracked: TrackedGoal = {
      graph,
      progress,
      stepHistory: [],
    };

    this.activeGoals.set(graph.id, tracked);
    archonLog('info', `Started tracking goal: ${graph.id}`);

    return progress;
  }

  /**
   * Update task status and recalculate progress
   */
  async updateTaskStatus(
    goalId: string,
    taskId: string,
    status: TaskStatus,
    result?: { dqScore?: number; output?: unknown; error?: string }
  ): Promise<GoalProgress | null> {
    const tracked = this.activeGoals.get(goalId);
    if (!tracked) {
      archonLog('warn', `Goal not found for update: ${goalId}`);
      return null;
    }

    const task = tracked.graph.getTask(taskId);
    if (!task) {
      archonLog('warn', `Task not found: ${taskId}`);
      return null;
    }

    const previousStatus = task.status;
    task.status = status;

    // Update timestamps
    if (status === TaskStatus.RUNNING && !task.startedAt) {
      task.startedAt = Date.now();
    }
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.ESCALATED) {
      task.completedAt = Date.now();
    }

    // Apply result if provided
    if (result) {
      if (result.dqScore !== undefined) {
        task.result = {
          ...task.result,
          dqScore: result.dqScore,
          output: result.output,
          executionTimeMs: task.startedAt ? Date.now() - task.startedAt : 0,
          tokenUsage: 0,
          cost: 0,
        };
      }
      if (result.error) {
        task.failureReason = result.error;
      }
    }

    // Record in history
    tracked.stepHistory.push({
      taskId,
      previousStatus,
      newStatus: status,
      timestamp: Date.now(),
      dqScore: result?.dqScore,
    });

    // Recalculate progress
    this.recalculateProgress(tracked);

    // Emit event
    const eventType = this.getEventType(status);
    const event: ProgressEvent = {
      goalId,
      type: eventType,
      stepId: taskId,
      progress: tracked.progress,
      timestamp: Date.now(),
    };

    await this.emitProgressEvent(goalId, event);

    // Check for blockers
    await this.detectBlockers(tracked);

    return tracked.progress;
  }

  /**
   * Mark a task as started
   */
  async startTask(goalId: string, taskId: string): Promise<GoalProgress | null> {
    const tracked = this.activeGoals.get(goalId);
    if (!tracked) return null;

    const task = tracked.graph.getTask(taskId);
    if (task) {
      tracked.progress.currentStep = {
        id: task.id,
        goalId,
        description: task.description,
        subsystem: task.requiredSubsystems[0] || 'kernel',
        priority: 'normal',
        dependencies: task.dependsOn,
        status: 'running',
      };
    }

    return this.updateTaskStatus(goalId, taskId, TaskStatus.RUNNING);
  }

  /**
   * Mark a task as completed
   */
  async completeTask(
    goalId: string,
    taskId: string,
    dqScore: number,
    output?: unknown
  ): Promise<GoalProgress | null> {
    return this.updateTaskStatus(goalId, taskId, TaskStatus.COMPLETED, { dqScore, output });
  }

  /**
   * Mark a task as failed
   */
  async failTask(goalId: string, taskId: string, error: string): Promise<GoalProgress | null> {
    return this.updateTaskStatus(goalId, taskId, TaskStatus.FAILED, { error });
  }

  /**
   * Add a blocker
   */
  addBlocker(
    goalId: string,
    taskId: string,
    type: Blocker['type'],
    description: string,
    severity: Blocker['severity'] = 'major'
  ): Blocker | null {
    const tracked = this.activeGoals.get(goalId);
    if (!tracked) return null;

    const blocker: Blocker = {
      id: generateId('blocker'),
      stepId: taskId,
      type,
      description,
      severity,
      createdAt: Date.now(),
    };

    tracked.progress.blockers.push(blocker);

    // Update task status
    const task = tracked.graph.getTask(taskId);
    if (task) {
      task.status = TaskStatus.BLOCKED;
    }

    this.emitProgressEvent(goalId, {
      goalId,
      type: 'blocked',
      stepId: taskId,
      progress: tracked.progress,
      timestamp: Date.now(),
    });

    archonLog('warn', `Blocker added: ${description}`, { goalId, taskId, type });

    return blocker;
  }

  /**
   * Resolve a blocker
   */
  resolveBlocker(goalId: string, blockerId: string): boolean {
    const tracked = this.activeGoals.get(goalId);
    if (!tracked) return false;

    const blocker = tracked.progress.blockers.find((b) => b.id === blockerId);
    if (!blocker) return false;

    blocker.resolvedAt = Date.now();

    // Unblock the task
    const task = tracked.graph.getTask(blocker.stepId);
    if (task && task.status === TaskStatus.BLOCKED) {
      task.status = TaskStatus.PENDING;
    }

    this.emitProgressEvent(goalId, {
      goalId,
      type: 'unblocked',
      stepId: blocker.stepId,
      progress: tracked.progress,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get current progress for a goal
   */
  getProgress(goalId: string): GoalProgress | null {
    const tracked = this.activeGoals.get(goalId);
    return tracked?.progress ?? null;
  }

  /**
   * Complete goal tracking and generate report
   */
  async completeGoal(goalId: string): Promise<GoalReport | null> {
    const tracked = this.activeGoals.get(goalId);
    if (!tracked) return null;

    const graph = tracked.graph;
    const tasks = Array.from(graph.tasks.values());

    const status = graph.isComplete()
      ? 'completed'
      : graph.hasEscalations()
      ? 'escalated'
      : 'failed';

    const report: GoalReport = {
      goalId: graph.id,
      goalText: graph.goal,
      status,
      totalSteps: tasks.length,
      successfulSteps: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      failedSteps: tasks.filter((t) => t.status === TaskStatus.FAILED).length,
      retries: tasks.reduce((sum, t) => sum + t.retryCount, 0),
      totalTokens: graph.getTotalTokens(),
      totalLatencyMs: tasks.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (t.completedAt - t.startedAt);
        }
        return sum;
      }, 0),
      avgDqScore: graph.getAverageDQ() ?? 0,
      subsystemsUsed: this.collectSubsystems(tasks),
      blockersSeen: tracked.progress.blockers.length,
      humanInterventions: tracked.progress.blockers.filter((b) => b.type === 'human-input').length,
      startedAt: tracked.progress.startedAt,
      completedAt: Date.now(),
    };

    // Update progress status
    tracked.progress.status = status;

    // Emit completion event
    await emitGoalEvent('completed', {
      goalId,
      dqScore: report.avgDqScore,
      latencyMs: report.totalLatencyMs,
      tokenCost: report.totalTokens,
    });

    // Move to completed
    this.completedGoals.push(report);
    this.activeGoals.delete(goalId);

    archonLog('info', `Goal completed: ${goalId}`, {
      status: report.status,
      dqScore: report.avgDqScore,
      duration: formatDuration(report.totalLatencyMs),
    });

    return report;
  }

  /**
   * Subscribe to progress updates for a goal
   */
  onProgress(goalId: string, callback: (event: ProgressEvent) => void): () => void {
    if (!this.progressCallbacks.has(goalId)) {
      this.progressCallbacks.set(goalId, []);
    }
    this.progressCallbacks.get(goalId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.progressCallbacks.get(goalId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get all completed goal reports
   */
  getCompletedReports(): GoalReport[] {
    return [...this.completedGoals];
  }

  /**
   * Get statistics across all goals
   */
  getStats(): TrackerStats {
    const all = [...this.completedGoals];
    const completed = all.filter((r) => r.status === 'completed');
    const escalated = all.filter((r) => r.status === 'escalated');

    return {
      totalGoals: all.length,
      completedGoals: completed.length,
      escalatedGoals: escalated.length,
      failedGoals: all.filter((r) => r.status === 'failed').length,
      activeGoals: this.activeGoals.size,
      completionRate: all.length > 0 ? completed.length / all.length : 0,
      avgDqScore: completed.length > 0
        ? completed.reduce((sum, r) => sum + r.avgDqScore, 0) / completed.length
        : 0,
      avgLatencyMs: all.length > 0
        ? all.reduce((sum, r) => sum + r.totalLatencyMs, 0) / all.length
        : 0,
      totalTokens: all.reduce((sum, r) => sum + r.totalTokens, 0),
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private recalculateProgress(tracked: TrackedGoal): void {
    const tasks = Array.from(tracked.graph.tasks.values());

    const completed = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.SKIPPED
    ).length;
    const failed = tasks.filter((t) => t.status === TaskStatus.FAILED).length;

    tracked.progress.completedSteps = completed;
    tracked.progress.failedSteps = failed;
    tracked.progress.percentComplete = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
    tracked.progress.lastUpdated = Date.now();

    // Update status based on graph state
    if (tracked.graph.isComplete()) {
      tracked.progress.status = 'completed';
    } else if (tracked.graph.hasFailures()) {
      tracked.progress.status = 'blocked';
    }
  }

  private async detectBlockers(tracked: TrackedGoal): Promise<void> {
    const readyTasks = tracked.graph.getReadyTasks();
    const runningTasks = tracked.graph.getTasksByStatus(TaskStatus.RUNNING);

    // If no tasks are ready and none are running, we might be stuck
    if (readyTasks.length === 0 && runningTasks.length === 0 && !tracked.graph.isComplete()) {
      const pendingTasks = tracked.graph.getTasksByStatus(TaskStatus.PENDING);

      for (const task of pendingTasks) {
        // Check for unmet dependencies
        const unmetDeps = task.dependsOn.filter((depId) => {
          const dep = tracked.graph.getTask(depId);
          return dep && dep.status !== TaskStatus.COMPLETED;
        });

        if (unmetDeps.length > 0) {
          const existingBlocker = tracked.progress.blockers.find(
            (b) => b.stepId === task.id && b.type === 'dependency' && !b.resolvedAt
          );

          if (!existingBlocker) {
            this.addBlocker(
              tracked.graph.id,
              task.id,
              'dependency',
              `Waiting on: ${unmetDeps.join(', ')}`
            );
          }
        }
      }
    }
  }

  private getEventType(status: TaskStatus): ProgressEvent['type'] {
    switch (status) {
      case TaskStatus.RUNNING:
        return 'step-started';
      case TaskStatus.COMPLETED:
        return 'step-completed';
      case TaskStatus.FAILED:
      case TaskStatus.ESCALATED:
        return 'step-failed';
      case TaskStatus.BLOCKED:
        return 'blocked';
      default:
        return 'step-started';
    }
  }

  private async emitProgressEvent(goalId: string, event: ProgressEvent): Promise<void> {
    // Notify local callbacks
    const callbacks = this.progressCallbacks.get(goalId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          archonLog('error', 'Error in progress callback', error);
        }
      }
    }

    // Emit to event bus (use goal:completed as closest match)
    // Note: goal:progress is not a standard event type, but we emit for custom listeners
  }

  private collectSubsystems(tasks: Task[]): SubsystemType[] {
    const subsystems = new Set<SubsystemType>();
    for (const task of tasks) {
      for (const sub of task.requiredSubsystems) {
        subsystems.add(sub);
      }
    }
    return Array.from(subsystems);
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface TrackedGoal {
  graph: TaskGraph;
  progress: GoalProgress;
  stepHistory: StepHistoryEntry[];
}

interface StepHistoryEntry {
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: number;
  dqScore?: number;
}

export interface TrackerStats {
  totalGoals: number;
  completedGoals: number;
  escalatedGoals: number;
  failedGoals: number;
  activeGoals: number;
  completionRate: number;
  avgDqScore: number;
  avgLatencyMs: number;
  totalTokens: number;
}

// =============================================================================
// SINGLETON
// =============================================================================

let trackerInstance: GoalTracker | null = null;

export function getGoalTracker(): GoalTracker {
  if (!trackerInstance) {
    trackerInstance = new GoalTracker();
  }
  return trackerInstance;
}
