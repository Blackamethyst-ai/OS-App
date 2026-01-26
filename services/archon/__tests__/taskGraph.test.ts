import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskGraph, TaskStatus, TaskPriority, createTask, Task } from '../goals/taskGraph';

// Mock generateId to return predictable IDs
vi.mock('../utils', () => ({
    generateId: vi.fn((prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`),
    archonLog: vi.fn(),
}));

describe('TaskGraph', () => {
    describe('createTask', () => {
        it('should create task with required fields', () => {
            const task = createTask({
                name: 'Test Task',
                description: 'A test task'
            });

            expect(task.name).toBe('Test Task');
            expect(task.description).toBe('A test task');
            expect(task.id).toContain('task-');
            expect(task.status).toBe(TaskStatus.PENDING);
            expect(task.priority).toBe(TaskPriority.MEDIUM);
            expect(task.dependsOn).toEqual([]);
            expect(task.retryCount).toBe(0);
        });

        it('should allow overriding defaults', () => {
            const task = createTask({
                name: 'High Priority Task',
                description: 'Important',
                priority: TaskPriority.CRITICAL,
                maxRetries: 5,
                minDqScore: 0.9,
                dependsOn: ['task-1', 'task-2']
            });

            expect(task.priority).toBe(TaskPriority.CRITICAL);
            expect(task.maxRetries).toBe(5);
            expect(task.minDqScore).toBe(0.9);
            expect(task.dependsOn).toEqual(['task-1', 'task-2']);
        });
    });

    describe('TaskGraph class', () => {
        let graph: TaskGraph;

        beforeEach(() => {
            graph = new TaskGraph('Build a feature');
        });

        it('should initialize with goal', () => {
            expect(graph.goal).toBe('Build a feature');
            expect(graph.tasks.size).toBe(0);
            expect(graph.id).toContain('graph-');
        });

        describe('addTask / getTask', () => {
            it('should add and retrieve tasks', () => {
                const task = createTask({ name: 'Task 1', description: 'First task' });
                graph.addTask(task);

                expect(graph.tasks.size).toBe(1);
                expect(graph.getTask(task.id)).toBe(task);
            });

            it('should return undefined for non-existent task', () => {
                expect(graph.getTask('non-existent')).toBeUndefined();
            });
        });

        describe('getReadyTasks', () => {
            it('should return tasks with no dependencies', () => {
                const task1 = createTask({ name: 'Task 1', description: 'No deps' });
                const task2 = createTask({ name: 'Task 2', description: 'No deps' });
                graph.addTask(task1);
                graph.addTask(task2);

                const ready = graph.getReadyTasks();
                expect(ready).toHaveLength(2);
            });

            it('should not return tasks with incomplete dependencies', () => {
                const task1 = createTask({ name: 'Task 1', description: 'Base' });
                const task2 = createTask({
                    name: 'Task 2',
                    description: 'Depends on task1',
                    dependsOn: [task1.id]
                });
                graph.addTask(task1);
                graph.addTask(task2);

                const ready = graph.getReadyTasks();
                expect(ready).toHaveLength(1);
                expect(ready[0].id).toBe(task1.id);
            });

            it('should return dependent tasks after dependencies complete', () => {
                const task1 = createTask({ name: 'Task 1', description: 'Base' });
                const task2 = createTask({
                    name: 'Task 2',
                    description: 'Depends on task1',
                    dependsOn: [task1.id]
                });
                graph.addTask(task1);
                graph.addTask(task2);

                // Complete task1
                task1.status = TaskStatus.COMPLETED;

                const ready = graph.getReadyTasks();
                expect(ready).toHaveLength(1);
                expect(ready[0].id).toBe(task2.id);
            });

            it('should sort by priority', () => {
                const lowTask = createTask({
                    name: 'Low',
                    description: 'Low priority',
                    priority: TaskPriority.LOW
                });
                const highTask = createTask({
                    name: 'High',
                    description: 'High priority',
                    priority: TaskPriority.HIGH
                });
                graph.addTask(lowTask);
                graph.addTask(highTask);

                const ready = graph.getReadyTasks();
                expect(ready[0].priority).toBe(TaskPriority.HIGH);
                expect(ready[1].priority).toBe(TaskPriority.LOW);
            });
        });

        describe('getCriticalPath', () => {
            it('should return empty array for empty graph', () => {
                expect(graph.getCriticalPath()).toEqual([]);
            });

            it('should return single task for graph with one task', () => {
                const task = createTask({ name: 'Single', description: 'Only task' });
                graph.addTask(task);

                const path = graph.getCriticalPath();
                expect(path).toHaveLength(1);
                expect(path[0].id).toBe(task.id);
            });

            it('should return longest dependency chain', () => {
                const task1 = createTask({ name: 'T1', description: 'First' });
                const task2 = createTask({
                    name: 'T2',
                    description: 'Second',
                    dependsOn: [task1.id]
                });
                const task3 = createTask({
                    name: 'T3',
                    description: 'Third',
                    dependsOn: [task2.id]
                });
                const taskParallel = createTask({ name: 'Parallel', description: 'No deps' });

                graph.addTask(task1);
                graph.addTask(task2);
                graph.addTask(task3);
                graph.addTask(taskParallel);

                const path = graph.getCriticalPath();
                expect(path).toHaveLength(3);
                expect(path[0].id).toBe(task1.id);
                expect(path[1].id).toBe(task2.id);
                expect(path[2].id).toBe(task3.id);
            });
        });

        describe('isComplete', () => {
            it('should return false for empty graph', () => {
                expect(graph.isComplete()).toBe(false);
            });

            it('should return false when tasks are pending', () => {
                graph.addTask(createTask({ name: 'T1', description: 'Pending' }));
                expect(graph.isComplete()).toBe(false);
            });

            it('should return true when all tasks completed', () => {
                const task = createTask({ name: 'T1', description: 'Done' });
                task.status = TaskStatus.COMPLETED;
                graph.addTask(task);
                expect(graph.isComplete()).toBe(true);
            });

            it('should treat skipped as complete', () => {
                const task = createTask({ name: 'T1', description: 'Skipped' });
                task.status = TaskStatus.SKIPPED;
                graph.addTask(task);
                expect(graph.isComplete()).toBe(true);
            });
        });

        describe('hasFailures', () => {
            it('should return false when no failures', () => {
                const task = createTask({ name: 'T1', description: 'OK' });
                task.status = TaskStatus.COMPLETED;
                graph.addTask(task);
                expect(graph.hasFailures()).toBe(false);
            });

            it('should return true when task failed', () => {
                const task = createTask({ name: 'T1', description: 'Failed' });
                task.status = TaskStatus.FAILED;
                graph.addTask(task);
                expect(graph.hasFailures()).toBe(true);
            });
        });

        describe('hasEscalations', () => {
            it('should return false when no escalations', () => {
                graph.addTask(createTask({ name: 'T1', description: 'OK' }));
                expect(graph.hasEscalations()).toBe(false);
            });

            it('should return true when task escalated', () => {
                const task = createTask({ name: 'T1', description: 'Escalated' });
                task.status = TaskStatus.ESCALATED;
                graph.addTask(task);
                expect(graph.hasEscalations()).toBe(true);
            });
        });

        describe('getProgress', () => {
            it('should return 0 for empty graph', () => {
                expect(graph.getProgress()).toBe(0);
            });

            it('should return correct percentage', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                t1.status = TaskStatus.COMPLETED;
                graph.addTask(t1);
                graph.addTask(t2);

                expect(graph.getProgress()).toBe(0.5);
            });
        });

        describe('getAverageDQ', () => {
            it('should return null when no results', () => {
                graph.addTask(createTask({ name: 'T1', description: '1' }));
                expect(graph.getAverageDQ()).toBeNull();
            });

            it('should calculate average DQ score', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                t1.result = { output: '', dqScore: 0.8, executionTimeMs: 100, tokenUsage: 100, cost: 0.01 };
                t2.result = { output: '', dqScore: 0.6, executionTimeMs: 100, tokenUsage: 100, cost: 0.01 };
                graph.addTask(t1);
                graph.addTask(t2);

                expect(graph.getAverageDQ()).toBe(0.7);
            });
        });

        describe('getTotalTokens', () => {
            it('should sum token usage', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                t1.result = { output: '', dqScore: 0.8, executionTimeMs: 100, tokenUsage: 500, cost: 0.01 };
                t2.result = { output: '', dqScore: 0.6, executionTimeMs: 100, tokenUsage: 300, cost: 0.01 };
                graph.addTask(t1);
                graph.addTask(t2);

                expect(graph.getTotalTokens()).toBe(800);
            });

            it('should skip tasks without results or tokenUsage', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                const t3 = createTask({ name: 'T3', description: '3' });
                t1.result = { output: '', dqScore: 0.8, executionTimeMs: 100, tokenUsage: 500, cost: 0.01 };
                // t2 has no result
                t3.result = { output: '', dqScore: 0.6, executionTimeMs: 100 } as any; // result without tokenUsage
                graph.addTask(t1);
                graph.addTask(t2);
                graph.addTask(t3);

                expect(graph.getTotalTokens()).toBe(500);
            });
        });

        describe('getTotalCost', () => {
            it('should sum costs', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                t1.result = { output: '', dqScore: 0.8, executionTimeMs: 100, tokenUsage: 500, cost: 0.05 };
                t2.result = { output: '', dqScore: 0.6, executionTimeMs: 100, tokenUsage: 300, cost: 0.03 };
                graph.addTask(t1);
                graph.addTask(t2);

                expect(graph.getTotalCost()).toBeCloseTo(0.08);
            });

            it('should skip tasks without results or cost', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                const t3 = createTask({ name: 'T3', description: '3' });
                t1.result = { output: '', dqScore: 0.8, executionTimeMs: 100, tokenUsage: 500, cost: 0.05 };
                // t2 has no result
                t3.result = { output: '', dqScore: 0.6, executionTimeMs: 100, tokenUsage: 300 } as any; // result without cost
                graph.addTask(t1);
                graph.addTask(t2);
                graph.addTask(t3);

                expect(graph.getTotalCost()).toBeCloseTo(0.05);
            });
        });

        describe('getTasksByStatus', () => {
            it('should filter by status', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                const t3 = createTask({ name: 'T3', description: '3' });
                t1.status = TaskStatus.COMPLETED;
                t2.status = TaskStatus.COMPLETED;
                t3.status = TaskStatus.PENDING;
                graph.addTask(t1);
                graph.addTask(t2);
                graph.addTask(t3);

                expect(graph.getTasksByStatus(TaskStatus.COMPLETED)).toHaveLength(2);
                expect(graph.getTasksByStatus(TaskStatus.PENDING)).toHaveLength(1);
            });
        });

        describe('validate', () => {
            it('should pass for valid DAG', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2', dependsOn: [t1.id] });
                graph.addTask(t1);
                graph.addTask(t2);

                const result = graph.validate();
                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should detect cycles', () => {
                const t1 = createTask({ name: 'T1', description: '1' });
                const t2 = createTask({ name: 'T2', description: '2' });
                // Create cycle: t1 -> t2 -> t1
                t1.dependsOn = [t2.id];
                t2.dependsOn = [t1.id];
                graph.addTask(t1);
                graph.addTask(t2);

                const result = graph.validate();
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('Cycle'))).toBe(true);
            });

            it('should detect orphan dependencies', () => {
                const t1 = createTask({
                    name: 'T1',
                    description: '1',
                    dependsOn: ['non-existent-task']
                });
                graph.addTask(t1);

                const result = graph.validate();
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('unknown task'))).toBe(true);
            });
        });

        describe('toJSON / fromJSON', () => {
            it('should serialize and deserialize', () => {
                const t1 = createTask({ name: 'T1', description: 'First' });
                const t2 = createTask({ name: 'T2', description: 'Second', dependsOn: [t1.id] });
                t1.status = TaskStatus.COMPLETED;
                t1.result = { output: 'done', dqScore: 0.85, executionTimeMs: 100, tokenUsage: 200, cost: 0.02 };
                graph.addTask(t1);
                graph.addTask(t2);

                const json = graph.toJSON() as any;
                expect(json.goal).toBe('Build a feature');
                expect(json.tasks).toHaveLength(2);
                expect(json.progress).toBe(0.5);

                const restored = TaskGraph.fromJSON({
                    id: json.id,
                    goal: json.goal,
                    complexityRating: json.complexityRating,
                    createdAt: json.createdAt,
                    tasks: json.tasks
                });

                expect(restored.goal).toBe(graph.goal);
                expect(restored.tasks.size).toBe(2);
            });

            it('should handle tasks without id in fromJSON', () => {
                const json = {
                    id: 'graph-test',
                    goal: 'Test goal',
                    complexityRating: 0.5,
                    createdAt: Date.now(),
                    tasks: [
                        { name: 'T1', description: 'No id provided' }, // No id field
                        { id: 'custom-id', name: 'T2', description: 'Has id' }
                    ]
                };

                const restored = TaskGraph.fromJSON(json);
                expect(restored.tasks.size).toBe(2);

                // First task should have generated id
                const tasks = Array.from(restored.tasks.values());
                expect(tasks[0].id).toContain('task-');
                // Second task should keep its custom id
                expect(tasks[1].id).toBe('custom-id');
            });
        });
    });
});
