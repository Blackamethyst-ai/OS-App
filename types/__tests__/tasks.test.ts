import { describe, it, expect } from 'vitest';
import { TaskStatus, TaskPriority } from '../domain/tasks';

describe('TaskStatus enum', () => {
    it('has expected string values', () => {
        expect(TaskStatus.TODO).toBe('TODO');
        expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
        expect(TaskStatus.DONE).toBe('DONE');
        expect(TaskStatus.COMPLETED).toBe('COMPLETED');
        expect(TaskStatus.FAILED).toBe('FAILED');
        expect(TaskStatus.CANCELLED).toBe('CANCELLED');
    });

    it('covers all 6 statuses', () => {
        const values = Object.values(TaskStatus);
        expect(values).toHaveLength(6);
    });
});

describe('TaskPriority enum', () => {
    it('has expected string values', () => {
        expect(TaskPriority.LOW).toBe('LOW');
        expect(TaskPriority.MEDIUM).toBe('MEDIUM');
        expect(TaskPriority.HIGH).toBe('HIGH');
        expect(TaskPriority.CRITICAL).toBe('CRITICAL');
    });

    it('covers all 4 priorities', () => {
        const values = Object.values(TaskPriority);
        expect(values).toHaveLength(4);
    });
});
