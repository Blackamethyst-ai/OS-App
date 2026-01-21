/**
 * ARCHON Task Graph
 *
 * DAG representation of goals decomposed into executable tasks.
 * Ported from Python reference with TypeScript enhancements.
 *
 * The TaskGraph captures:
 * - Task dependencies (what must complete before what)
 * - Parallelization opportunities (independent tasks)
 * - Resource requirements (which subsystems needed)
 * - Quality thresholds (per-task DQ requirements)
 */

import { SubsystemType, Priority, DQScore } from '../types';
import { generateId } from '../utils';

// =============================================================================
// ENUMS
// =============================================================================

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',     // Waiting on dependencies
  ESCALATED = 'escalated',
  SKIPPED = 'skipped',
}

export enum TaskPriority {
  CRITICAL = 1,  // Must succeed for goal to complete
  HIGH = 2,      // Important but has fallbacks
  MEDIUM = 3,    // Nice to have
  LOW = 4,       // Optional enhancement
}

// =============================================================================
// TASK
// =============================================================================

export interface TaskResult {
  output: unknown;
  dqScore: number;
  agentId?: string;
  executionTimeMs: number;
  tokenUsage: number;
  cost: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;

  // Dependencies
  dependsOn: string[];  // Task IDs

  // Execution requirements
  requiredCapabilities: string[];
  requiredSubsystems: SubsystemType[];
  estimatedComplexity: number;  // 0-1 scale
  maxRetries: number;
  timeoutMs: number;

  // Quality requirements
  minDqScore: number;

  // State
  status: TaskStatus;
  priority: TaskPriority;

  // Results (populated after execution)
  result?: TaskResult;
  retryCount: number;
  failureReason?: string;

  // Timestamps
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export function createTask(partial: Partial<Task> & { name: string; description: string }): Task {
  return {
    id: generateId('task'),
    name: partial.name,
    description: partial.description,
    dependsOn: partial.dependsOn ?? [],
    requiredCapabilities: partial.requiredCapabilities ?? [],
    requiredSubsystems: partial.requiredSubsystems ?? [],
    estimatedComplexity: partial.estimatedComplexity ?? 0.5,
    maxRetries: partial.maxRetries ?? 3,
    timeoutMs: partial.timeoutMs ?? 300000,
    minDqScore: partial.minDqScore ?? 0.7,
    status: partial.status ?? TaskStatus.PENDING,
    priority: partial.priority ?? TaskPriority.MEDIUM,
    retryCount: 0,
    createdAt: Date.now(),
  };
}

// =============================================================================
// TASK GRAPH
// =============================================================================

export class TaskGraph {
  id: string;
  goal: string;
  tasks: Map<string, Task>;
  complexityRating: number;
  createdAt: number;
  estimatedTotalTimeMs?: number;

  constructor(goal: string) {
    this.id = generateId('graph');
    this.goal = goal;
    this.tasks = new Map();
    this.complexityRating = 0.5;
    this.createdAt = Date.now();
  }

  /**
   * Add a task to the graph
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get tasks whose dependencies are all completed
   */
  getReadyTasks(): Task[] {
    const ready: Task[] = [];

    for (const task of Array.from(this.tasks.values())) {
      if (task.status !== TaskStatus.PENDING) {
        continue;
      }

      // Check if all dependencies are completed
      const depsSatisfied = task.dependsOn.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === TaskStatus.COMPLETED;
      });

      if (depsSatisfied) {
        ready.push(task);
      }
    }

    // Sort by priority (lower number = higher priority)
    return ready.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the critical path (longest dependency chain)
   */
  getCriticalPath(): Task[] {
    const memo = new Map<string, number>();

    const getPathLength = (taskId: string): number => {
      if (memo.has(taskId)) {
        return memo.get(taskId)!;
      }

      const task = this.tasks.get(taskId);
      if (!task || task.dependsOn.length === 0) {
        memo.set(taskId, 1);
        return 1;
      }

      const maxDepLength = Math.max(
        ...task.dependsOn
          .filter((depId) => this.tasks.has(depId))
          .map((depId) => getPathLength(depId))
      );

      const length = maxDepLength + 1;
      memo.set(taskId, length);
      return length;
    };

    // Calculate path lengths for all tasks
    for (const taskId of Array.from(this.tasks.keys())) {
      getPathLength(taskId);
    }

    if (memo.size === 0) {
      return [];
    }

    // Find task with longest path
    let endTaskId = '';
    let maxLength = 0;
    for (const [taskId, length] of Array.from(memo.entries())) {
      if (length > maxLength) {
        maxLength = length;
        endTaskId = taskId;
      }
    }

    // Reconstruct path
    const path: Task[] = [];
    let currentId: string | null = endTaskId;

    while (currentId) {
      const task = this.tasks.get(currentId);
      if (!task) break;

      path.push(task);

      if (task.dependsOn.length === 0) {
        currentId = null;
      } else {
        // Pick the dependency with the longest path
        currentId = task.dependsOn
          .filter((d) => this.tasks.has(d))
          .reduce((longest, depId) => {
            const longestLen = memo.get(longest) ?? 0;
            const depLen = memo.get(depId) ?? 0;
            return depLen > longestLen ? depId : longest;
          }, task.dependsOn[0]);
      }
    }

    return path.reverse();
  }

  /**
   * Check if all tasks are completed
   */
  isComplete(): boolean {
    for (const task of Array.from(this.tasks.values())) {
      if (task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.SKIPPED) {
        return false;
      }
    }
    return this.tasks.size > 0;
  }

  /**
   * Check if any tasks have failed (not escalated)
   */
  hasFailures(): boolean {
    for (const task of Array.from(this.tasks.values())) {
      if (task.status === TaskStatus.FAILED) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if any tasks are escalated
   */
  hasEscalations(): boolean {
    for (const task of Array.from(this.tasks.values())) {
      if (task.status === TaskStatus.ESCALATED) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get completion percentage (0-1)
   */
  getProgress(): number {
    if (this.tasks.size === 0) return 0;

    let completed = 0;
    for (const task of Array.from(this.tasks.values())) {
      if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.SKIPPED) {
        completed++;
      }
    }
    return completed / this.tasks.size;
  }

  /**
   * Get average DQ score of completed tasks
   */
  getAverageDQ(): number | null {
    const scores: number[] = [];
    for (const task of Array.from(this.tasks.values())) {
      if (task.result?.dqScore !== undefined) {
        scores.push(task.result.dqScore);
      }
    }
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Get total token usage
   */
  getTotalTokens(): number {
    let total = 0;
    for (const task of Array.from(this.tasks.values())) {
      if (task.result?.tokenUsage) {
        total += task.result.tokenUsage;
      }
    }
    return total;
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    let total = 0;
    for (const task of Array.from(this.tasks.values())) {
      if (task.result?.cost) {
        total += task.result.cost;
      }
    }
    return total;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  /**
   * Validate the graph is a valid DAG (no cycles)
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const task = this.tasks.get(taskId);
      if (task) {
        for (const depId of task.dependsOn) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recStack.has(depId)) {
            return true;
          }
        }
      }

      recStack.delete(taskId);
      return false;
    };

    for (const taskId of Array.from(this.tasks.keys())) {
      if (!visited.has(taskId)) {
        if (hasCycle(taskId)) {
          errors.push(`Cycle detected involving task ${taskId}`);
        }
      }
    }

    // Check for orphan dependencies
    const allIds = new Set(Array.from(this.tasks.keys()));
    for (const task of Array.from(this.tasks.values())) {
      for (const depId of task.dependsOn) {
        if (!allIds.has(depId)) {
          errors.push(`Task ${task.name} depends on unknown task ${depId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Serialize for storage/transmission
   */
  toJSON(): object {
    return {
      id: this.id,
      goal: this.goal,
      complexityRating: this.complexityRating,
      createdAt: this.createdAt,
      tasks: Array.from(this.tasks.entries()).map(([id, task]) => ({
        id,
        name: task.name,
        description: task.description,
        dependsOn: task.dependsOn,
        status: task.status,
        priority: task.priority,
        dqScore: task.result?.dqScore,
        output: task.result?.output,
      })),
      progress: this.getProgress(),
      averageDQ: this.getAverageDQ(),
    };
  }

  /**
   * Create from serialized data
   */
  static fromJSON(data: {
    id: string;
    goal: string;
    complexityRating: number;
    createdAt: number;
    tasks: Array<Partial<Task> & { id?: string; name: string; description: string }>;
  }): TaskGraph {
    const graph = new TaskGraph(data.goal);
    graph.id = data.id;
    graph.complexityRating = data.complexityRating;
    graph.createdAt = data.createdAt;

    for (const taskData of data.tasks) {
      const task = createTask(taskData);
      task.id = taskData.id ?? task.id;
      graph.addTask(task);
    }

    return graph;
  }
}
