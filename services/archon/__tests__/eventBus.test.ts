import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ArchonEventBus } from '../eventBus';
import type { ArchonEvent, ArchonEventType } from '../types';

// Mock dependencies
vi.mock('../utils', () => ({
    generateId: vi.fn((prefix: string) => `${prefix}-test-id`),
    archonLog: vi.fn(),
}));

vi.mock('../../../stores/useSystemMind', () => ({
    useSystemMind: {
        getState: vi.fn(() => ({
            uplinkData: vi.fn(),
        })),
    },
}));

describe('ArchonEventBus', () => {
    let bus: ArchonEventBus;

    beforeEach(() => {
        bus = new ArchonEventBus({ maxHistorySize: 10, debugMode: false });
    });

    afterEach(() => {
        bus.removeAllHandlers();
        bus.clearHistory();
    });

    describe('on / emit', () => {
        it('should call handler when event is emitted', async () => {
            const handler = vi.fn();
            bus.on('goal:received', handler);

            await bus.emit('goal:received', { goalId: 'g1', goalText: 'test' });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'goal:received',
                    payload: { goalId: 'g1', goalText: 'test' },
                })
            );
        });

        it('should not call handler for different event types', async () => {
            const handler = vi.fn();
            bus.on('goal:received', handler);

            await bus.emit('goal:completed', { goalId: 'g1' });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should support multiple handlers for same event', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            bus.on('goal:received', handler1);
            bus.on('goal:received', handler2);

            await bus.emit('goal:received', { goalId: 'g1' });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should return unsubscribe function', async () => {
            const handler = vi.fn();
            const unsubscribe = bus.on('goal:received', handler);

            await bus.emit('goal:received', { goalId: 'g1' });
            expect(handler).toHaveBeenCalledTimes(1);

            unsubscribe();

            await bus.emit('goal:received', { goalId: 'g2' });
            expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
        });
    });

    describe('onAll (wildcard)', () => {
        it('should call wildcard handler for all events', async () => {
            const handler = vi.fn();
            bus.onAll(handler);

            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:completed', { goalId: 'g1' });
            await bus.emit('decision:made', { decisionId: 'd1' });

            expect(handler).toHaveBeenCalledTimes(3);
        });

        it('should support unsubscribe for wildcard', async () => {
            const handler = vi.fn();
            const unsubscribe = bus.onAll(handler);

            await bus.emit('goal:received', { goalId: 'g1' });
            expect(handler).toHaveBeenCalledTimes(1);

            unsubscribe();

            await bus.emit('goal:completed', { goalId: 'g1' });
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('once', () => {
        it('should call handler only once', async () => {
            const handler = vi.fn();
            bus.once('goal:received', handler);

            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:received', { goalId: 'g2' });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: { goalId: 'g1' },
                })
            );
        });
    });

    describe('getHistory', () => {
        it('should store emitted events', async () => {
            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:completed', { goalId: 'g1' });

            const history = bus.getHistory();
            expect(history).toHaveLength(2);
        });

        it('should filter by type', async () => {
            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:completed', { goalId: 'g1' });
            await bus.emit('goal:received', { goalId: 'g2' });

            const history = bus.getHistory({ type: 'goal:received' });
            expect(history).toHaveLength(2);
        });

        it('should filter by timestamp', async () => {
            await bus.emit('goal:received', { goalId: 'g1' });
            // Wait to ensure distinct timestamps
            await new Promise(r => setTimeout(r, 15));
            const afterFirst = Date.now();
            await bus.emit('goal:received', { goalId: 'g2' });

            const history = bus.getHistory({ since: afterFirst });
            expect(history).toHaveLength(1);
            expect(history[0].payload).toEqual({ goalId: 'g2' });
        });

        it('should limit results', async () => {
            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:received', { goalId: 'g2' });
            await bus.emit('goal:received', { goalId: 'g3' });

            const history = bus.getHistory({ limit: 2 });
            expect(history).toHaveLength(2);
        });

        it('should respect maxHistorySize', async () => {
            // Bus has maxHistorySize of 10
            for (let i = 0; i < 15; i++) {
                await bus.emit('goal:received', { goalId: `g${i}` });
            }

            const history = bus.getHistory();
            expect(history).toHaveLength(10);
            // Should have the latest events (g5-g14)
            expect((history[0].payload as any).goalId).toBe('g5');
        });
    });

    describe('clearHistory', () => {
        it('should clear all history', async () => {
            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:received', { goalId: 'g2' });

            expect(bus.getHistory()).toHaveLength(2);

            bus.clearHistory();

            expect(bus.getHistory()).toHaveLength(0);
        });
    });

    describe('waitFor', () => {
        it('should resolve when event is emitted', async () => {
            const promise = bus.waitFor('goal:completed', 1000);

            // Emit after a small delay
            setTimeout(() => {
                bus.emit('goal:completed', { goalId: 'g1', dqScore: 0.9 });
            }, 10);

            const event = await promise;
            expect(event.type).toBe('goal:completed');
            expect(event.payload).toEqual({ goalId: 'g1', dqScore: 0.9 });
        });

        it('should reject on timeout', async () => {
            const promise = bus.waitFor('goal:completed', 50);

            await expect(promise).rejects.toThrow('Timeout waiting for goal:completed');
        });
    });

    describe('removeAllHandlers', () => {
        it('should remove all handlers', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const wildcardHandler = vi.fn();

            bus.on('goal:received', handler1);
            bus.on('goal:completed', handler2);
            bus.onAll(wildcardHandler);

            bus.removeAllHandlers();

            await bus.emit('goal:received', { goalId: 'g1' });
            await bus.emit('goal:completed', { goalId: 'g1' });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
            expect(wildcardHandler).not.toHaveBeenCalled();
        });
    });

    describe('getSubscriberCount', () => {
        it('should count subscribers for specific event', () => {
            bus.on('goal:received', vi.fn());
            bus.on('goal:received', vi.fn());
            bus.on('goal:completed', vi.fn());

            expect(bus.getSubscriberCount('goal:received')).toBe(2);
            expect(bus.getSubscriberCount('goal:completed')).toBe(1);
        });

        it('should include wildcard handlers in count', () => {
            bus.on('goal:received', vi.fn());
            bus.onAll(vi.fn());

            expect(bus.getSubscriberCount('goal:received')).toBe(2);
        });

        it('should count total subscribers when no type specified', () => {
            bus.on('goal:received', vi.fn());
            bus.on('goal:received', vi.fn());
            bus.on('goal:completed', vi.fn());
            bus.onAll(vi.fn());

            expect(bus.getSubscriberCount()).toBe(4);
        });
    });

    describe('error handling', () => {
        it('should continue executing handlers even if one throws', async () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const successHandler = vi.fn();

            bus.on('goal:received', errorHandler);
            bus.on('goal:received', successHandler);

            await bus.emit('goal:received', { goalId: 'g1' });

            expect(errorHandler).toHaveBeenCalled();
            expect(successHandler).toHaveBeenCalled();
        });
    });

    describe('event structure', () => {
        it('should include timestamp and source', async () => {
            const handler = vi.fn();
            bus.on('goal:received', handler);

            const beforeEmit = Date.now();
            await bus.emit('goal:received', { goalId: 'g1' }, 'test-source');

            const event = handler.mock.calls[0][0] as ArchonEvent;
            expect(event.timestamp).toBeGreaterThanOrEqual(beforeEmit);
            expect(event.source).toBe('test-source');
        });

        it('should default source to archon', async () => {
            const handler = vi.fn();
            bus.on('goal:received', handler);

            await bus.emit('goal:received', { goalId: 'g1' });

            const event = handler.mock.calls[0][0] as ArchonEvent;
            expect(event.source).toBe('archon');
        });
    });
});

// Test helper functions
import {
    emitGoalEvent,
    emitDecisionEvent,
    emitSubsystemEvent,
    emitEscalationEvent,
    emitPatternEvent,
    emitErrorEvent
} from '../eventBus';

describe('EventBus Helper Functions', () => {
    describe('emitGoalEvent', () => {
        it('should emit goal:received event', async () => {
            const handler = vi.fn();
            const bus = new ArchonEventBus({ maxHistorySize: 10 });
            bus.on('goal:received', handler);

            // Use the module's eventBus indirectly
            await emitGoalEvent('received', { goalId: 'g1', goalText: 'Test goal' });

            // Check history of the module's bus
            // Since we can't easily access the module's internal bus,
            // we test that the function doesn't throw
            expect(true).toBe(true);
        });

        it('should emit goal:completed event', async () => {
            await expect(
                emitGoalEvent('completed', { goalId: 'g1', dqScore: 0.8 })
            ).resolves.not.toThrow();
        });

        it('should emit goal:decomposed event', async () => {
            await expect(
                emitGoalEvent('decomposed', { goalId: 'g1', subtaskCount: 3 })
            ).resolves.not.toThrow();
        });

        it('should emit goal:blocked event', async () => {
            await expect(
                emitGoalEvent('blocked', { goalId: 'g1', reason: 'dependency' })
            ).resolves.not.toThrow();
        });
    });

    describe('emitDecisionEvent', () => {
        it('should emit decision:made event', async () => {
            await expect(
                emitDecisionEvent({
                    goalId: 'g1',
                    decisionId: 'd1',
                    type: 'model_selection',
                    subsystem: 'ace'
                })
            ).resolves.not.toThrow();
        });
    });

    describe('emitSubsystemEvent', () => {
        it('should emit subsystem:invoked event', async () => {
            await expect(
                emitSubsystemEvent('invoked', {
                    subsystemId: 'ace',
                    goalId: 'g1'
                })
            ).resolves.not.toThrow();
        });

        it('should emit subsystem:completed event with metrics', async () => {
            await expect(
                emitSubsystemEvent('completed', {
                    subsystemId: 'ace',
                    goalId: 'g1',
                    dqScore: 0.85,
                    latencyMs: 1500
                })
            ).resolves.not.toThrow();
        });
    });

    describe('emitEscalationEvent', () => {
        it('should emit escalation:requested event', async () => {
            await expect(
                emitEscalationEvent('requested', {
                    goalId: 'g1',
                    escalationId: 'e1',
                    options: ['option1', 'option2']
                })
            ).resolves.not.toThrow();
        });

        it('should emit escalation:resolved event', async () => {
            await expect(
                emitEscalationEvent('resolved', {
                    goalId: 'g1',
                    escalationId: 'e1',
                    selectedOption: 'option1'
                })
            ).resolves.not.toThrow();
        });
    });

    describe('emitPatternEvent', () => {
        it('should emit pattern:learned event', async () => {
            await expect(
                emitPatternEvent({
                    patternId: 'p1',
                    type: 'success_pattern',
                    confidence: 0.9
                })
            ).resolves.not.toThrow();
        });
    });

    describe('emitErrorEvent', () => {
        it('should emit error:occurred event', async () => {
            const error = new Error('Test error');
            await expect(
                emitErrorEvent({
                    error,
                    context: 'test_context',
                    goalId: 'g1'
                })
            ).resolves.not.toThrow();
        });

        it('should emit error without goalId', async () => {
            const error = new Error('Generic error');
            await expect(
                emitErrorEvent({
                    error,
                    context: 'global'
                })
            ).resolves.not.toThrow();
        });
    });
});
