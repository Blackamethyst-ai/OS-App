/**
 * ARCHON Test Suite
 *
 * Tests for the autonomous meta-orchestrator.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Core imports
import {
  generateId,
  hashString,
  estimateGoalComplexity,
  inferSubsystems,
  estimateTokenCost,
  calculateDQ,
  isActionable,
  formatDuration,
  relativeTime,
  backoffDelay,
} from './utils';

import { DEFAULT_CONFIG, getConfig, validateConfig, MODEL_COSTS } from './config';

import { TaskGraph, createTask, TaskStatus } from './goals/taskGraph';

import { eventBus, emitGoalEvent } from './eventBus';

// =============================================================================
// UTILS TESTS
// =============================================================================

describe('ARCHON Utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('goal');
      const id2 = generateId('goal');

      expect(id1).toMatch(/^goal_/);
      expect(id2).toMatch(/^goal_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with default prefix', () => {
      const id = generateId();
      expect(id).toMatch(/^archon_/);
    });
  });

  describe('hashString', () => {
    it('should produce consistent hashes', () => {
      const hash1 = hashString('test string');
      const hash2 = hashString('test string');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashString('string1');
      const hash2 = hashString('string2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('estimateGoalComplexity', () => {
    it('should return low complexity for simple goals', () => {
      const complexity = estimateGoalComplexity('Fix the typo in README');
      expect(complexity).toBeLessThan(0.5);
    });

    it('should return higher complexity for longer goals', () => {
      const simple = estimateGoalComplexity('Fix typo');
      const complex = estimateGoalComplexity(
        'Refactor the authentication system to use OAuth2 with JWT tokens, ' +
        'implement rate limiting, add comprehensive test coverage'
      );
      expect(complex).toBeGreaterThan(simple);
    });
  });

  describe('inferSubsystems', () => {
    it('should infer ACE for consensus-related tasks', () => {
      const subsystems = inferSubsystems('Need consensus on the architecture decision');
      expect(subsystems).toContain('ace');
    });

    it('should infer dream for research tasks', () => {
      const subsystems = inferSubsystems('Research the latest papers on multi-agent systems');
      expect(subsystems).toContain('dream');
    });

    it('should infer evolution for refactoring tasks', () => {
      const subsystems = inferSubsystems('Refactor the legacy codebase');
      expect(subsystems).toContain('evolution');
    });

    it('should always include kernel', () => {
      const subsystems = inferSubsystems('Any random task');
      expect(subsystems).toContain('kernel');
    });
  });

  describe('estimateTokenCost', () => {
    it('should return higher costs for more complex tasks', () => {
      const simple = estimateTokenCost(0.2, 1, false);
      const complex = estimateTokenCost(0.8, 3, true);

      expect(complex).toBeGreaterThan(simple);
    });

    it('should add more tokens for consensus tasks', () => {
      const withoutConsensus = estimateTokenCost(0.5, 2, false);
      const withConsensus = estimateTokenCost(0.5, 2, true);

      expect(withConsensus).toBeGreaterThan(withoutConsensus);
    });
  });

  describe('calculateDQ', () => {
    it('should calculate DQ score from components', () => {
      const score = calculateDQ(0.9, 0.8, 0.85);

      // DQ = validity(40%) + specificity(30%) + correctness(30%)
      const expected = 0.9 * 0.4 + 0.8 * 0.3 + 0.85 * 0.3;
      expect(score).toBeCloseTo(expected, 2);
    });

    it('should return 1.0 for perfect scores', () => {
      const score = calculateDQ(1.0, 1.0, 1.0);
      expect(score).toBe(1.0);
    });
  });

  describe('isActionable', () => {
    it('should return true for scores >= 0.7', () => {
      expect(isActionable(0.7)).toBe(true);
      expect(isActionable(0.85)).toBe(true);
      expect(isActionable(1.0)).toBe(true);
    });

    it('should return false for scores < 0.7', () => {
      expect(isActionable(0.69)).toBe(false);
      expect(isActionable(0.5)).toBe(false);
      expect(isActionable(0)).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(isActionable(0.5, 0.5)).toBe(true);
      expect(isActionable(0.5, 0.6)).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(65000)).toBe('1.1m');
      expect(formatDuration(3665000)).toBe('1.0h');
    });
  });

  describe('relativeTime', () => {
    it('should format recent times', () => {
      const now = Date.now();
      expect(relativeTime(now - 5000)).toBe('just now');
      expect(relativeTime(now - 120000)).toBe('2m ago');
      expect(relativeTime(now - 3600000)).toBe('1h ago');
    });
  });

  describe('backoffDelay', () => {
    it('should return exponential delays', () => {
      const delay1 = backoffDelay(1);
      const delay2 = backoffDelay(2);
      const delay3 = backoffDelay(3);

      // Each delay should be roughly double the previous (with jitter)
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should respect max delay', () => {
      const delay = backoffDelay(100, 1000, 5000);
      // Should be capped at 5000ms + jitter (max ~5500)
      expect(delay).toBeLessThan(6000);
    });
  });
});

// =============================================================================
// CONFIG TESTS
// =============================================================================

describe('ARCHON Config', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have valid default values', () => {
      expect(DEFAULT_CONFIG.maxRetries).toBe(5);
      expect(DEFAULT_CONFIG.dqTarget).toBe(0.7);
      expect(DEFAULT_CONFIG.totalTokenBudget).toBe(1_000_000);
      expect(DEFAULT_CONFIG.defaultModel).toBe('flagship');
    });

    it('should have budget ratios that sum to 1', () => {
      let sum = 0;
      DEFAULT_CONFIG.subsystemBudgetRatios.forEach((ratio) => {
        sum += ratio;
      });
      expect(sum).toBeCloseTo(1, 2);
    });
  });

  describe('getConfig', () => {
    it('should return default config without overrides', () => {
      const config = getConfig();
      expect(config.maxRetries).toBe(DEFAULT_CONFIG.maxRetries);
    });

    it('should apply overrides', () => {
      const config = getConfig({ maxRetries: 10 });
      expect(config.maxRetries).toBe(10);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const result = validateConfig(DEFAULT_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid maxRetries', () => {
      const config = { ...DEFAULT_CONFIG, maxRetries: 100 };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxRetries must be between 1 and 10');
    });

    it('should reject invalid dqTarget', () => {
      const config = { ...DEFAULT_CONFIG, dqTarget: 1.5 };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('MODEL_COSTS', () => {
    it('should have costs for all tiers', () => {
      expect(MODEL_COSTS.flagship).toBeDefined();
      expect(MODEL_COSTS.standard).toBeDefined();
      expect(MODEL_COSTS.fast).toBeDefined();
      expect(MODEL_COSTS.local).toBeDefined();
    });

    it('should have local models at zero cost', () => {
      expect(MODEL_COSTS.local.input).toBe(0);
      expect(MODEL_COSTS.local.output).toBe(0);
    });

    it('should have flagship as most expensive', () => {
      expect(MODEL_COSTS.flagship.input).toBeGreaterThan(MODEL_COSTS.standard.input);
      expect(MODEL_COSTS.standard.input).toBeGreaterThan(MODEL_COSTS.fast.input);
    });
  });
});

// =============================================================================
// TASK GRAPH TESTS
// =============================================================================

describe('TaskGraph', () => {
  let graph: TaskGraph;

  beforeEach(() => {
    graph = new TaskGraph('Test Goal');
  });

  describe('constructor', () => {
    it('should create a graph with correct properties', () => {
      expect(graph.id).toMatch(/^graph_/);
      expect(graph.goal).toBe('Test Goal');
      expect(graph.tasks.size).toBe(0);
    });
  });

  describe('createTask', () => {
    it('should create a task with correct properties', () => {
      const task = createTask({
        name: 'Test Task',
        description: 'A test task',
        estimatedTokens: 1000,
      });

      expect(task.id).toMatch(/^task_/);
      expect(task.name).toBe('Test Task');
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(3); // Default is MEDIUM (3)
    });

    it('should respect provided priority', () => {
      const task = createTask({
        name: 'High Priority Task',
        priority: 0, // High priority
      });

      expect(task.priority).toBe(0);
    });
  });

  describe('addTask', () => {
    it('should add tasks to the graph', () => {
      const task = createTask({ name: 'Task 1' });
      graph.addTask(task);

      expect(graph.tasks.size).toBe(1);
      expect(graph.getTask(task.id)).toBe(task);
    });

    it('should add multiple tasks', () => {
      const task1 = createTask({ name: 'Task 1' });
      const task2 = createTask({ name: 'Task 2' });

      graph.addTask(task1);
      graph.addTask(task2);

      expect(graph.tasks.size).toBe(2);
    });
  });

  describe('dependencies via dependsOn', () => {
    it('should create tasks with dependencies', () => {
      const task1 = createTask({ name: 'Task 1' });
      const task2 = createTask({
        name: 'Task 2',
        dependsOn: [task1.id],
      });

      graph.addTask(task1);
      graph.addTask(task2);

      expect(task2.dependsOn).toContain(task1.id);
    });
  });

  describe('getReadyTasks', () => {
    it('should return tasks with no pending dependencies', () => {
      const task1 = createTask({ name: 'Task 1' });
      const task2 = createTask({ name: 'Task 2' });
      const task3 = createTask({
        name: 'Task 3',
        dependsOn: [task1.id, task2.id],
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addTask(task3);

      const ready = graph.getReadyTasks();

      // Task1 and Task2 should be ready, Task3 should not
      expect(ready.map((t) => t.name)).toContain('Task 1');
      expect(ready.map((t) => t.name)).toContain('Task 2');
      expect(ready.map((t) => t.name)).not.toContain('Task 3');
    });

    it('should not return completed tasks', () => {
      const task = createTask({ name: 'Task 1' });
      task.status = TaskStatus.COMPLETED;
      graph.addTask(task);

      const ready = graph.getReadyTasks();
      expect(ready).toHaveLength(0);
    });
  });

  describe('task completion flow', () => {
    it('should unlock dependent tasks when dependency is completed', () => {
      const task1 = createTask({ name: 'Task 1' });
      const task2 = createTask({
        name: 'Task 2',
        dependsOn: [task1.id],
      });

      graph.addTask(task1);
      graph.addTask(task2);

      // Task2 should not be ready initially
      expect(graph.getReadyTasks().map((t) => t.id)).not.toContain(task2.id);

      // Complete task1
      task1.status = TaskStatus.COMPLETED;

      // Now task2 should be ready
      expect(graph.getReadyTasks().map((t) => t.id)).toContain(task2.id);
    });
  });

  describe('getProgress', () => {
    it('should return 0 for empty graph', () => {
      expect(graph.getProgress()).toBe(0);
    });

    it('should calculate progress correctly', () => {
      const task1 = createTask({ name: 'Task 1' });
      const task2 = createTask({ name: 'Task 2' });

      graph.addTask(task1);
      graph.addTask(task2);

      expect(graph.getProgress()).toBe(0);

      task1.status = TaskStatus.COMPLETED;
      expect(graph.getProgress()).toBe(0.5);

      task2.status = TaskStatus.COMPLETED;
      expect(graph.getProgress()).toBe(1);
    });
  });

  describe('isComplete', () => {
    it('should return false for empty graph', () => {
      expect(graph.isComplete()).toBe(false);
    });

    it('should return true when all tasks completed', () => {
      const task = createTask({ name: 'Task 1' });
      graph.addTask(task);

      expect(graph.isComplete()).toBe(false);

      task.status = TaskStatus.COMPLETED;
      expect(graph.isComplete()).toBe(true);
    });
  });
});

// =============================================================================
// EVENT BUS TESTS
// =============================================================================

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.removeAllHandlers();
  });

  describe('emit and on', () => {
    it('should emit and receive events', async () => {
      const handler = vi.fn();
      eventBus.on('goal:received', handler);

      await emitGoalEvent('received', {
        goalId: 'test-123',
        goalText: 'Test goal',
        complexity: 0.5,
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload.goalId).toBe('test-123');
    });

    it('should support multiple listeners', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('goal:completed', handler1);
      eventBus.on('goal:completed', handler2);

      await emitGoalEvent('completed', {
        goalId: 'test-123',
        dqScore: 0.85,
        latencyMs: 1000,
        tokenCost: 500,
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should remove listeners via returned unsubscribe function', async () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('goal:received', handler);
      unsubscribe(); // Call returned function to unsubscribe

      await emitGoalEvent('received', {
        goalId: 'test-123',
        goalText: 'Test goal',
        complexity: 0.5,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire once', async () => {
      const handler = vi.fn();
      eventBus.once('goal:received', handler);

      await emitGoalEvent('received', {
        goalId: 'test-1',
        goalText: 'Test 1',
        complexity: 0.5,
      });

      await emitGoalEvent('received', {
        goalId: 'test-2',
        goalText: 'Test 2',
        complexity: 0.5,
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('event history', () => {
    it('should track event history', async () => {
      await emitGoalEvent('received', {
        goalId: 'test-1',
        goalText: 'Test 1',
        complexity: 0.5,
      });

      const history = eventBus.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe('goal:received');
    });
  });
});
