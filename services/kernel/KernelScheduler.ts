/**
 * KERNEL SCHEDULER
 *
 * Priority-based task scheduling for the Agentic Kernel.
 * Manages task queue, concurrency, and execution ordering.
 */

import { KernelTask, TaskPriority } from './types';

type TaskExecutor = (task: KernelTask) => Promise<any>;

interface QueuedTask {
  task: KernelTask;
  executor: TaskExecutor;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  CRITICAL: 100,
  HIGH: 75,
  NORMAL: 50,
  LOW: 25,
  BACKGROUND: 10,
};

export class KernelScheduler {
  private queue: QueuedTask[] = [];
  private running: Map<string, KernelTask> = new Map();
  private maxConcurrent: number = 3;
  private isRunning: boolean = false;
  private processInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the scheduler loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processInterval = setInterval(() => this.processQueue(), 50);
    if (import.meta.env.DEV) console.log('⚙️ SCHEDULER: Started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    if (import.meta.env.DEV) console.log('⚙️ SCHEDULER: Stopped');
  }

  /**
   * Submit a task for execution
   */
  submit(task: KernelTask, executor: TaskExecutor): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedTask: QueuedTask = { task, executor, resolve, reject };

      // Insert in priority order
      const insertIndex = this.findInsertIndex(task.priority);
      this.queue.splice(insertIndex, 0, queuedTask);

      // Immediately try to process if not at capacity
      if (this.running.size < this.maxConcurrent) {
        this.processQueue();
      }
    });
  }

  /**
   * Drain all pending tasks (for shutdown)
   */
  async drain(): Promise<void> {
    // Wait for running tasks
    while (this.running.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Cancel queued tasks
    for (const queued of this.queue) {
      queued.reject(new Error('Scheduler draining'));
    }
    this.queue = [];
  }

  /**
   * Get current queue depth
   */
  getQueueDepth(): number {
    return this.queue.length + this.running.size;
  }

  /**
   * Get running task count
   */
  getRunningCount(): number {
    return this.running.size;
  }

  /**
   * Set max concurrent tasks
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
  }

  /**
   * Cancel a specific task
   */
  cancel(taskId: string): boolean {
    const index = this.queue.findIndex(q => q.task.id === taskId);
    if (index >= 0) {
      const [removed] = this.queue.splice(index, 1);
      removed.reject(new Error('Task cancelled'));
      return true;
    }
    return false;
  }

  /**
   * Boost priority of a task
   */
  boost(taskId: string, newPriority: TaskPriority): boolean {
    const index = this.queue.findIndex(q => q.task.id === taskId);
    if (index >= 0) {
      const [task] = this.queue.splice(index, 1);
      task.task.priority = newPriority;
      const newIndex = this.findInsertIndex(newPriority);
      this.queue.splice(newIndex, 0, task);
      return true;
    }
    return false;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private processQueue(): void {
    if (!this.isRunning) return;

    // Fill up to max concurrent
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const queued = this.queue.shift();
      if (!queued) break;

      this.executeTask(queued);
    }
  }

  private async executeTask(queued: QueuedTask): Promise<void> {
    const { task, executor, resolve, reject } = queued;

    this.running.set(task.id, task);

    try {
      const result = await executor(task);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running.delete(task.id);
    }
  }

  private findInsertIndex(priority: TaskPriority): number {
    const weight = PRIORITY_WEIGHTS[priority];

    for (let i = 0; i < this.queue.length; i++) {
      const existingWeight = PRIORITY_WEIGHTS[this.queue[i].task.priority];
      if (weight > existingWeight) {
        return i;
      }
    }

    return this.queue.length;
  }
}
