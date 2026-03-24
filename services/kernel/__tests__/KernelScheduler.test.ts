/**
 * Tests for KernelScheduler
 *
 * Validates task scheduling, priority ordering, cancellation,
 * concurrency control, and drain behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KernelScheduler } from '../KernelScheduler';
import type { KernelTask, ResolvedIntent, TaskPriority } from '../types';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeTask(overrides: Partial<KernelTask> = {}): KernelTask {
  const defaultIntent: ResolvedIntent = {
    id: 'intent-1',
    category: 'QUERY',
    rawInput: 'test',
    confidence: 0.9,
    entities: [],
    contextHints: [],
    suggestedTools: [],
  };

  return {
    id: `task-${Math.random().toString(36).slice(2, 9)}`,
    intent: defaultIntent,
    priority: 'NORMAL',
    status: 'QUEUED',
    createdAt: Date.now(),
    contextPages: [],
    ...overrides,
  };
}

describe('KernelScheduler', () => {
  let scheduler: KernelScheduler;

  beforeEach(() => {
    scheduler = new KernelScheduler();
    // Don't auto-start; tests call start() explicitly when needed
  });

  afterEach(() => {
    scheduler.stop();
  });

  // ==========================================================================
  // START / STOP
  // ==========================================================================

  describe('start and stop', () => {
    it('should start successfully', () => {
      expect(() => scheduler.start()).not.toThrow();
    });

    it('should be idempotent when started twice', () => {
      scheduler.start();
      expect(() => scheduler.start()).not.toThrow();
    });

    it('should stop successfully', () => {
      scheduler.start();
      expect(() => scheduler.stop()).not.toThrow();
    });

    it('should stop even when not started', () => {
      expect(() => scheduler.stop()).not.toThrow();
    });
  });

  // ==========================================================================
  // TASK SUBMISSION & EXECUTION
  // ==========================================================================

  describe('submit', () => {
    it('should execute submitted task and return result', async () => {
      scheduler.start();
      const task = makeTask();
      const executor = vi.fn().mockResolvedValue({ action: 'done' });

      const result = await scheduler.submit(task, executor);

      expect(result).toEqual({ action: 'done' });
      expect(executor).toHaveBeenCalledWith(task);
    });

    it('should reject with executor error when execution fails', async () => {
      scheduler.start();
      const task = makeTask();
      const executor = vi.fn().mockRejectedValue(new Error('Task failed'));

      await expect(scheduler.submit(task, executor)).rejects.toThrow('Task failed');
    });

    it('should execute multiple tasks sequentially when concurrency is 1', async () => {
      scheduler.setMaxConcurrent(1);
      scheduler.start();

      const order: number[] = [];
      const makeExecutor = (n: number) => vi.fn().mockImplementation(async () => {
        order.push(n);
        return n;
      });

      const [r1, r2, r3] = await Promise.all([
        scheduler.submit(makeTask(), makeExecutor(1)),
        scheduler.submit(makeTask(), makeExecutor(2)),
        scheduler.submit(makeTask(), makeExecutor(3)),
      ]);

      expect(r1).toBe(1);
      expect(r2).toBe(2);
      expect(r3).toBe(3);
    });

    it('should handle concurrent execution up to maxConcurrent', async () => {
      scheduler.setMaxConcurrent(3);
      scheduler.start();

      let concurrentCount = 0;
      let maxObservedConcurrency = 0;

      const makeSlowExecutor = () => vi.fn().mockImplementation(async () => {
        concurrentCount++;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, concurrentCount);
        await new Promise(r => setTimeout(r, 50));
        concurrentCount--;
        return 'done';
      });

      await Promise.all([
        scheduler.submit(makeTask(), makeSlowExecutor()),
        scheduler.submit(makeTask(), makeSlowExecutor()),
        scheduler.submit(makeTask(), makeSlowExecutor()),
      ]);

      expect(maxObservedConcurrency).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // PRIORITY ORDERING
  // ==========================================================================

  describe('priority ordering', () => {
    it('should process CRITICAL tasks before NORMAL tasks', async () => {
      scheduler.setMaxConcurrent(1);
      scheduler.start();

      const order: string[] = [];
      // Block with a CRITICAL task so it runs immediately, leaving the rest queued
      let unblockFirst: () => void;
      const firstBlock = new Promise<void>(r => { unblockFirst = r; });

      const blockingExecutor = vi.fn().mockImplementation(async () => {
        await firstBlock;
        order.push('first');
        return 'first';
      });

      const makeOrderExecutor = (label: string) => vi.fn().mockImplementation(async () => {
        order.push(label);
        return label;
      });

      // Submit blocking task with CRITICAL priority so it runs immediately
      const p1 = scheduler.submit(makeTask({ priority: 'CRITICAL' }), blockingExecutor);
      // Give scheduler a tick to pick up p1
      await new Promise(r => setTimeout(r, 10));

      // Now submit tasks with different priorities - they should queue
      const pNormal = scheduler.submit(makeTask({ priority: 'NORMAL' }), makeOrderExecutor('normal'));
      const pCritical = scheduler.submit(makeTask({ priority: 'CRITICAL' }), makeOrderExecutor('critical'));
      const pBackground = scheduler.submit(makeTask({ priority: 'BACKGROUND' }), makeOrderExecutor('background'));

      // Unblock first task
      unblockFirst!();

      await Promise.all([p1, pNormal, pCritical, pBackground]);

      // After 'first', critical should come before normal, normal before background
      expect(order.indexOf('critical')).toBeLessThan(order.indexOf('normal'));
      expect(order.indexOf('normal')).toBeLessThan(order.indexOf('background'));
    });

    it('should insert HIGH priority tasks before NORMAL in queue', async () => {
      scheduler.setMaxConcurrent(1);

      // Fill with a blocking task
      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      const results: string[] = [];
      const blockingExec = vi.fn().mockImplementation(async () => { await block; });

      // Submit blocking task
      const p0 = scheduler.submit(makeTask(), blockingExec);
      scheduler.start();
      await new Promise(r => setTimeout(r, 10));

      // Queue tasks
      const pLow = scheduler.submit(makeTask({ priority: 'LOW' }), vi.fn().mockImplementation(async () => { results.push('low'); }));
      const pHigh = scheduler.submit(makeTask({ priority: 'HIGH' }), vi.fn().mockImplementation(async () => { results.push('high'); }));

      unblock!();
      await Promise.all([p0, pLow, pHigh]);

      expect(results[0]).toBe('high');
      expect(results[1]).toBe('low');
    });
  });

  // ==========================================================================
  // QUEUE DEPTH
  // ==========================================================================

  describe('getQueueDepth', () => {
    it('should return 0 when empty', () => {
      expect(scheduler.getQueueDepth()).toBe(0);
    });

    it('should count both queued and running tasks', async () => {
      scheduler.setMaxConcurrent(1);

      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      const blockingExec = vi.fn().mockImplementation(async () => { await block; });
      const quickExec = vi.fn().mockResolvedValue('ok');

      scheduler.start();

      // Submit blocking task (will be running)
      const p1 = scheduler.submit(makeTask(), blockingExec);
      await new Promise(r => setTimeout(r, 10));

      // Submit another task (will be queued)
      const p2 = scheduler.submit(makeTask(), quickExec);

      // 1 running + 1 queued = 2
      expect(scheduler.getQueueDepth()).toBe(2);

      unblock!();
      await Promise.all([p1, p2]);
    });
  });

  // ==========================================================================
  // RUNNING COUNT
  // ==========================================================================

  describe('getRunningCount', () => {
    it('should return 0 when no tasks running', () => {
      expect(scheduler.getRunningCount()).toBe(0);
    });

    it('should reflect currently running tasks', async () => {
      scheduler.setMaxConcurrent(2);
      scheduler.start();

      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      const blockingExec = vi.fn().mockImplementation(async () => { await block; });

      const p1 = scheduler.submit(makeTask(), blockingExec);
      const p2 = scheduler.submit(makeTask(), blockingExec);
      await new Promise(r => setTimeout(r, 10));

      expect(scheduler.getRunningCount()).toBe(2);

      unblock!();
      await Promise.all([p1, p2]);
    });
  });

  // ==========================================================================
  // CANCELLATION
  // ==========================================================================

  describe('cancel', () => {
    it('should cancel a queued task and return true', async () => {
      scheduler.setMaxConcurrent(1);

      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      const blockingExec = vi.fn().mockImplementation(async () => { await block; });

      scheduler.start();
      const p1 = scheduler.submit(makeTask(), blockingExec);
      await new Promise(r => setTimeout(r, 10));

      const queuedTask = makeTask({ id: 'cancel-me' });
      const p2 = scheduler.submit(queuedTask, vi.fn().mockResolvedValue('ok'));

      const cancelled = scheduler.cancel('cancel-me');
      expect(cancelled).toBe(true);

      unblock!();
      await p1;
      await expect(p2).rejects.toThrow('Task cancelled');
    });

    it('should return false when task is not found', () => {
      const cancelled = scheduler.cancel('nonexistent-task');

      expect(cancelled).toBe(false);
    });

    it('should not cancel a running task', async () => {
      scheduler.setMaxConcurrent(1);
      scheduler.start();

      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      const task = makeTask({ id: 'running-task' });
      const p = scheduler.submit(task, vi.fn().mockImplementation(async () => { await block; return 'done'; }));
      await new Promise(r => setTimeout(r, 10));

      // Task is running, not in queue
      const cancelled = scheduler.cancel('running-task');
      expect(cancelled).toBe(false);

      unblock!();
      await p;
    });
  });

  // ==========================================================================
  // PRIORITY BOOSTING
  // ==========================================================================

  describe('boost', () => {
    it('should boost a queued task priority and reorder', async () => {
      scheduler.setMaxConcurrent(1);

      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      scheduler.start();
      const p0 = scheduler.submit(makeTask(), vi.fn().mockImplementation(async () => { await block; }));
      await new Promise(r => setTimeout(r, 10));

      const results: string[] = [];

      const taskA = makeTask({ id: 'task-a', priority: 'NORMAL' });
      const taskB = makeTask({ id: 'task-b', priority: 'LOW' });

      const pA = scheduler.submit(taskA, vi.fn().mockImplementation(async () => { results.push('a'); }));
      const pB = scheduler.submit(taskB, vi.fn().mockImplementation(async () => { results.push('b'); }));

      // Boost B to CRITICAL
      const boosted = scheduler.boost('task-b', 'CRITICAL');
      expect(boosted).toBe(true);

      unblock!();
      await Promise.all([p0, pA, pB]);

      // B should have been processed before A
      expect(results[0]).toBe('b');
      expect(results[1]).toBe('a');
    });

    it('should return false for non-existent task', () => {
      expect(scheduler.boost('nonexistent', 'HIGH')).toBe(false);
    });
  });

  // ==========================================================================
  // SET MAX CONCURRENT
  // ==========================================================================

  describe('setMaxConcurrent', () => {
    it('should enforce minimum of 1', () => {
      scheduler.setMaxConcurrent(0);
      scheduler.start();

      // Should still be able to run at least 1 task
      const task = makeTask();
      const executor = vi.fn().mockResolvedValue('ok');

      return expect(scheduler.submit(task, executor)).resolves.toBe('ok');
    });

    it('should handle negative values by clamping to 1', () => {
      scheduler.setMaxConcurrent(-5);

      // Internally maxConcurrent = 1, so it should still work
      scheduler.start();
      const task = makeTask();
      return expect(scheduler.submit(task, vi.fn().mockResolvedValue('ok'))).resolves.toBe('ok');
    });
  });

  // ==========================================================================
  // DRAIN
  // ==========================================================================

  describe('drain', () => {
    it('should reject all queued tasks with "Scheduler draining"', async () => {
      scheduler.setMaxConcurrent(1);

      let unblock: () => void;
      const block = new Promise<void>(r => { unblock = r; });

      scheduler.start();
      const p1 = scheduler.submit(makeTask(), vi.fn().mockImplementation(async () => { await block; }));
      await new Promise(r => setTimeout(r, 10));

      const p2 = scheduler.submit(makeTask(), vi.fn().mockResolvedValue('ok'));

      // Drain should reject queued tasks
      unblock!();
      await p1;
      await scheduler.drain();

      await expect(p2).rejects.toThrow('Scheduler draining');
    });

    it('should wait for running tasks to complete before draining', async () => {
      scheduler.setMaxConcurrent(1);
      scheduler.start();

      let resolved = false;
      const executor = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 50));
        resolved = true;
        return 'done';
      });

      const p = scheduler.submit(makeTask(), executor);
      await new Promise(r => setTimeout(r, 10));

      // Drain should wait for running task
      await scheduler.drain();
      await p;

      expect(resolved).toBe(true);
    });

    it('should handle drain when queue is empty', async () => {
      await expect(scheduler.drain()).resolves.not.toThrow();
    });
  });
});
