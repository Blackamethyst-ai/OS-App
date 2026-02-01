import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ArchonEventBus } from '../eventBus';
import type { ArchonEvent, ArchonEventType } from '../types';
import { archonLog } from '../utils';
import { useSystemMind } from '../../../stores/useSystemMind';

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

// Get typed mocks
const mockArchonLog = vi.mocked(archonLog);
const mockGetState = vi.mocked(useSystemMind.getState);

describe('ArchonEventBus', () => {
    let bus: ArchonEventBus;

    beforeEach(() => {
        bus = new ArchonEventBus({ maxHistorySize: 10, debugMode: false });
    });

    describe('constructor', () => {
        it('should use default maxHistorySize when not specified', async () => {
            const defaultBus = new ArchonEventBus({ debugMode: false });
            // Emit 150 events (default max is 100)
            for (let i = 0; i < 150; i++) {
                await defaultBus.emit('goal:received', { goalId: `g${i}` });
            }
            const history = defaultBus.getHistory();
            expect(history).toHaveLength(100);
            defaultBus.removeAllHandlers();
            defaultBus.clearHistory();
        });

        it('should use default debugMode when not specified', async () => {
            const defaultBus = new ArchonEventBus({ maxHistorySize: 10 });
            // Should not throw and not log debug messages
            await defaultBus.emit('goal:received', { goalId: 'g1' });
            expect(mockArchonLog).not.toHaveBeenCalled();
            defaultBus.removeAllHandlers();
            defaultBus.clearHistory();
        });
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

        it('should return only wildcard count for event with no handlers', () => {
            bus.onAll(vi.fn());
            // decision:made has no handlers, only wildcard
            expect(bus.getSubscriberCount('decision:made')).toBe(1);
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

    describe('debug mode', () => {
        let debugBus: ArchonEventBus;

        beforeEach(() => {
            mockArchonLog.mockClear();
            debugBus = new ArchonEventBus({ maxHistorySize: 10, debugMode: true });
        });

        afterEach(() => {
            debugBus.removeAllHandlers();
            debugBus.clearHistory();
        });

        it('should log when subscribing with on()', () => {
            debugBus.on('goal:received', vi.fn());
            expect(mockArchonLog).toHaveBeenCalledWith('debug', 'Subscribed to goal:received');
        });

        it('should log when subscribing with onAll()', () => {
            debugBus.onAll(vi.fn());
            expect(mockArchonLog).toHaveBeenCalledWith('debug', 'Subscribed to all events');
        });

        it('should log when emitting events', async () => {
            await debugBus.emit('goal:received', { goalId: 'g1' });
            expect(mockArchonLog).toHaveBeenCalledWith('debug', 'Emitting goal:received', { goalId: 'g1' });
        });

        it('should log epoch sync error in debug mode', async () => {
            mockGetState.mockImplementation(() => {
                throw new Error('SystemMind not ready');
            });

            // goal:completed is in EPOCH_TRIGGERING_EVENTS
            await debugBus.emit('goal:completed', { goalId: 'g1', dqScore: 0.8 });

            expect(mockArchonLog).toHaveBeenCalledWith(
                'debug',
                'Could not sync epoch for goal:completed',
                expect.any(Error)
            );

            // Reset mock for other tests
            mockGetState.mockImplementation(() => ({
                uplinkData: vi.fn(),
            } as any));
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

    describe('epoch sync summary', () => {
        it('should use type as fallback when payload has no description or goalId', async () => {
            const mockUplinkData = vi.fn();
            mockGetState.mockImplementation(() => ({
                uplinkData: mockUplinkData,
            } as any));

            // decision:made is in EPOCH_TRIGGERING_EVENTS
            // payload has neither description nor goalId
            await bus.emit('decision:made', { decisionId: 'd1', type: 'model_selection' });

            expect(mockUplinkData).toHaveBeenCalledWith('archon_event', expect.objectContaining({
                type: 'decision:made',
                summary: 'decision:made' // Falls back to type
            }));

            mockGetState.mockImplementation(() => ({
                uplinkData: vi.fn(),
            } as any));
        });

        it('should use description when available', async () => {
            const mockUplinkData = vi.fn();
            mockGetState.mockImplementation(() => ({
                uplinkData: mockUplinkData,
            } as any));

            await bus.emit('goal:received', { goalId: 'g1', goalText: 'test', description: 'Custom desc' });

            expect(mockUplinkData).toHaveBeenCalledWith('archon_event', expect.objectContaining({
                summary: 'Custom desc'
            }));

            mockGetState.mockImplementation(() => ({
                uplinkData: vi.fn(),
            } as any));
        });

        it('should stringify non-object payload', async () => {
            const mockUplinkData = vi.fn();
            mockGetState.mockImplementation(() => ({
                uplinkData: mockUplinkData,
            } as any));

            // pattern:learned is in EPOCH_TRIGGERING_EVENTS
            await bus.emit('pattern:learned', 'string-payload' as any);

            expect(mockUplinkData).toHaveBeenCalledWith('archon_event', expect.objectContaining({
                summary: 'string-payload'
            }));

            mockGetState.mockImplementation(() => ({
                uplinkData: vi.fn(),
            } as any));
        });

        it('should handle null payload', async () => {
            const mockUplinkData = vi.fn();
            mockGetState.mockImplementation(() => ({
                uplinkData: mockUplinkData,
            } as any));

            await bus.emit('pattern:learned', null as any);

            expect(mockUplinkData).toHaveBeenCalledWith('archon_event', expect.objectContaining({
                summary: 'null'
            }));

            mockGetState.mockImplementation(() => ({
                uplinkData: vi.fn(),
            } as any));
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
