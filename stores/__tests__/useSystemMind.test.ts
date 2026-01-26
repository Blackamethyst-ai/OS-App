import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSystemMind } from '../useSystemMind';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
    randomUUID: () => `test-uuid-${Date.now()}`
});

describe('useSystemMind', () => {
    beforeEach(() => {
        // Reset store to initial state
        useSystemMind.setState({
            voiceActive: false,
            currentLocation: 'UNKNOWN_SECTOR',
            epoch: 0,
            lastEpochChange: Date.now(),
            lastEpochReason: null,
            navigationMap: [],
            activeTelemetry: {},
            actionRegistry: {},
            notifications: [],
        });
    });

    describe('voiceActive', () => {
        it('should toggle voice state', () => {
            const store = useSystemMind.getState();
            expect(store.voiceActive).toBe(false);

            store.toggleVoice();
            expect(useSystemMind.getState().voiceActive).toBe(true);

            store.toggleVoice();
            expect(useSystemMind.getState().voiceActive).toBe(false);
        });
    });

    describe('setSector', () => {
        it('should update current location', () => {
            const store = useSystemMind.getState();
            store.setSector('DASHBOARD');

            expect(useSystemMind.getState().currentLocation).toBe('DASHBOARD');
        });

        it('should increment epoch on sector change', () => {
            const store = useSystemMind.getState();
            const initialEpoch = store.epoch;

            store.setSector('ARCHON');

            expect(useSystemMind.getState().epoch).toBe(initialEpoch + 1);
            expect(useSystemMind.getState().lastEpochReason).toBe('sector_changed');
        });

        it('should not increment epoch if sector unchanged', () => {
            const store = useSystemMind.getState();
            store.setSector('DASHBOARD');
            const epochAfterFirst = useSystemMind.getState().epoch;

            store.setSector('DASHBOARD'); // Same sector

            expect(useSystemMind.getState().epoch).toBe(epochAfterFirst);
        });
    });

    describe('registerNavigation', () => {
        it('should update navigation map', () => {
            const store = useSystemMind.getState();
            const nodes = [
                { id: 'home', label: 'Home' },
                { id: 'settings', label: 'Settings' }
            ];

            store.registerNavigation(nodes);

            expect(useSystemMind.getState().navigationMap).toEqual(nodes);
        });
    });

    describe('telemetry', () => {
        it('should uplink data', () => {
            const store = useSystemMind.getState();
            store.uplinkData('metrics', { cpu: 50 });

            expect(useSystemMind.getState().activeTelemetry.metrics).toEqual({ cpu: 50 });
        });

        it('should increment epoch for significant telemetry', () => {
            const store = useSystemMind.getState();
            const initialEpoch = store.epoch;

            store.uplinkData('ui_state', { visible: true });

            expect(useSystemMind.getState().epoch).toBe(initialEpoch + 1);
            expect(useSystemMind.getState().lastEpochReason).toBe('telemetry_update');
        });

        it('should not increment epoch for regular telemetry', () => {
            const store = useSystemMind.getState();
            const initialEpoch = store.epoch;

            store.uplinkData('random_metric', { value: 42 });

            expect(useSystemMind.getState().epoch).toBe(initialEpoch);
        });

        it('should sever uplink', () => {
            const store = useSystemMind.getState();
            store.uplinkData('metrics', { cpu: 50 });
            expect(useSystemMind.getState().activeTelemetry.metrics).toBeDefined();

            store.severUplink('metrics');
            expect(useSystemMind.getState().activeTelemetry.metrics).toBeUndefined();
        });
    });

    describe('action registration', () => {
        it('should register single action', () => {
            const store = useSystemMind.getState();
            const callback = vi.fn();

            store.registerAction('test_action', 'Test action', callback);

            const registry = useSystemMind.getState().actionRegistry;
            expect(registry.test_action).toBeDefined();
            expect(registry.test_action.description).toBe('Test action');
        });

        it('should register action with options', () => {
            const store = useSystemMind.getState();
            const callback = vi.fn();

            store.registerAction('test_action', 'Test', callback, {
                sectors: ['DASHBOARD', 'ARCHON'],
                priority: 80
            });

            const action = useSystemMind.getState().actionRegistry.test_action;
            expect(action.sectors).toEqual(['DASHBOARD', 'ARCHON']);
            expect(action.priority).toBe(80);
        });

        it('should increment epoch on register', () => {
            const store = useSystemMind.getState();
            const initialEpoch = store.epoch;

            store.registerAction('test', 'Test', vi.fn());

            expect(useSystemMind.getState().epoch).toBe(initialEpoch + 1);
            expect(useSystemMind.getState().lastEpochReason).toBe('action_registered');
        });

        it('should bulk register actions', () => {
            const store = useSystemMind.getState();
            const initialEpoch = store.epoch;

            store.registerActions([
                { id: 'action1', description: 'Action 1', callback: vi.fn() },
                { id: 'action2', description: 'Action 2', callback: vi.fn() },
                { id: 'action3', description: 'Action 3', callback: vi.fn() }
            ]);

            const registry = useSystemMind.getState().actionRegistry;
            expect(Object.keys(registry)).toHaveLength(3);
            // Only one epoch increment for bulk
            expect(useSystemMind.getState().epoch).toBe(initialEpoch + 1);
            expect(useSystemMind.getState().lastEpochReason).toBe('bulk_update');
        });

        it('should unregister action', () => {
            const store = useSystemMind.getState();
            store.registerAction('test', 'Test', vi.fn());
            expect(useSystemMind.getState().actionRegistry.test).toBeDefined();

            store.unregisterAction('test');
            expect(useSystemMind.getState().actionRegistry.test).toBeUndefined();
        });

        it('should increment epoch on unregister only if action existed', () => {
            const store = useSystemMind.getState();
            store.registerAction('test', 'Test', vi.fn());
            const epochAfterRegister = useSystemMind.getState().epoch;

            store.unregisterAction('test');
            expect(useSystemMind.getState().epoch).toBe(epochAfterRegister + 1);

            // Unregistering non-existent action should not increment
            const epochAfterUnregister = useSystemMind.getState().epoch;
            store.unregisterAction('non_existent');
            expect(useSystemMind.getState().epoch).toBe(epochAfterUnregister);
        });
    });

    describe('executeAction', () => {
        it('should execute registered action', async () => {
            const store = useSystemMind.getState();
            const callback = vi.fn();
            store.registerAction('test', 'Test', callback);

            const result = await store.executeAction('test', { foo: 'bar' });

            expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
            expect(result).toEqual({ success: true, actionId: 'test' });
        });

        it('should throw for unknown action', async () => {
            const store = useSystemMind.getState();

            await expect(store.executeAction('unknown')).rejects.toThrow(
                'Action unknown not found in registry'
            );
        });
    });

    describe('getActionsForSector', () => {
        beforeEach(() => {
            const store = useSystemMind.getState();
            store.registerActions([
                { id: 'global_action', description: 'Global', callback: vi.fn(), priority: 50 },
                { id: 'dashboard_action', description: 'Dashboard only', callback: vi.fn(), sectors: ['DASHBOARD'], priority: 60 },
                { id: 'archon_action', description: 'Archon only', callback: vi.fn(), sectors: ['ARCHON'], priority: 70 }
            ]);
        });

        it('should return actions sorted by relevance', () => {
            const store = useSystemMind.getState();
            store.setSector('DASHBOARD');

            const actions = store.getActionsForSector();

            // Dashboard action should be boosted (+30), Archon reduced (-20)
            expect(actions[0].id).toBe('dashboard_action'); // 60 + 30 = 90
            expect(actions[1].id).toBe('global_action');    // 50 + 5 = 55
            expect(actions[2].id).toBe('archon_action');    // 70 - 20 = 50
        });

        it('should accept explicit sector parameter', () => {
            const store = useSystemMind.getState();
            store.setSector('DASHBOARD');

            const actions = store.getActionsForSector('ARCHON');

            expect(actions[0].id).toBe('archon_action'); // 70 + 30 = 100
        });
    });

    describe('epoch methods', () => {
        it('should get current epoch', () => {
            const store = useSystemMind.getState();
            expect(store.getEpoch()).toBe(0);

            store.setSector('NEW');
            expect(store.getEpoch()).toBe(1);
        });

        it('should check if epoch changed', () => {
            const store = useSystemMind.getState();
            const initialEpoch = store.getEpoch();

            expect(store.hasEpochChanged(initialEpoch)).toBe(false);

            store.setSector('NEW');
            expect(store.hasEpochChanged(initialEpoch)).toBe(true);
        });

        it('should subscribe to epoch changes', () => {
            const store = useSystemMind.getState();
            const listener = vi.fn();

            const unsubscribe = store.subscribeToEpoch(listener);
            store.setSector('NEW');

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    epoch: 1,
                    reason: 'sector_changed'
                })
            );

            unsubscribe();
            store.setSector('ANOTHER');
            expect(listener).toHaveBeenCalledTimes(1); // Not called again after unsubscribe
        });
    });

    describe('getSnapshot', () => {
        it('should return current state snapshot', () => {
            const store = useSystemMind.getState();
            store.setSector('DASHBOARD');
            store.registerNavigation([{ id: 'home', label: 'Home' }]);
            store.registerAction('test', 'Test', vi.fn());

            const snapshot = store.getSnapshot();

            expect(snapshot.current_location).toBe('DASHBOARD');
            expect(snapshot.available_navigation_targets).toContain('home');
            expect(snapshot.available_actions.some((a: any) => a.id === 'test')).toBe(true);
            expect(snapshot.epoch).toBeGreaterThan(0);
        });
    });

    describe('getContextDigest', () => {
        it('should return digest string', () => {
            const store = useSystemMind.getState();
            store.setSector('DASHBOARD');
            store.registerAction('test', 'Test', vi.fn());

            const digest = store.getContextDigest();

            expect(digest).toMatch(/^e\d+:DASHBOARD:\d+$/);
        });

        it('should change when context changes', () => {
            const store = useSystemMind.getState();
            const digest1 = store.getContextDigest();

            store.setSector('ARCHON');
            const digest2 = store.getContextDigest();

            expect(digest1).not.toBe(digest2);
        });
    });

    describe('notifications', () => {
        it('should push notification', () => {
            const store = useSystemMind.getState();
            store.pushNotification('SUCCESS', 'Test', 'Test message');

            const notifications = useSystemMind.getState().notifications;
            expect(notifications).toHaveLength(1);
            expect(notifications[0].type).toBe('SUCCESS');
            expect(notifications[0].title).toBe('Test');
        });

        it('should limit to 5 notifications', () => {
            const store = useSystemMind.getState();
            for (let i = 0; i < 7; i++) {
                store.pushNotification('INFO', `Notif ${i}`, 'Message');
            }

            const notifications = useSystemMind.getState().notifications;
            expect(notifications).toHaveLength(5);
            // Should have the latest ones (2-6)
            expect(notifications[0].title).toBe('Notif 2');
        });

        it('should dismiss notification', () => {
            const store = useSystemMind.getState();
            store.pushNotification('INFO', 'Test', 'Message');
            const notifId = useSystemMind.getState().notifications[0].id;

            store.dismissNotification(notifId);
            expect(useSystemMind.getState().notifications).toHaveLength(0);
        });
    });
});
