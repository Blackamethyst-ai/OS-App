// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockGetState, mockLoggerInfo } = vi.hoisted(() => ({
    mockGetState: vi.fn(),
    mockLoggerInfo: vi.fn(),
}));

const mockSetCollabState = vi.fn();
const mockAddSwarmEvent = vi.fn();
const mockAddLog = vi.fn();

vi.mock('../../store', () => ({
    useAppStore: {
        getState: mockGetState,
    },
}));

vi.mock('../logger', () => ({
    logger: {
        info: mockLoggerInfo,
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

import { collabService } from '../collabService';

describe('CollaborationService', () => {
    const makeMockState = (peers: unknown[] = [
        { id: 'peer-0', name: 'AlphaNode', role: 'Architect', activeSector: 'DASHBOARD', status: 'ACTIVE', lastSeen: Date.now(), color: '#9d4edd' },
        { id: 'peer-1', name: 'BinaryArch', role: 'Sentinel', activeSector: 'VAULT', status: 'IDLE', lastSeen: Date.now(), color: '#22d3ee' },
    ]) => ({
        actions: {
            setCollabState: mockSetCollabState,
            addSwarmEvent: mockAddSwarmEvent,
            addLog: mockAddLog,
        },
        collaboration: { peers },
    });

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockGetState.mockReturnValue(makeMockState());
    });

    afterEach(() => {
        collabService.disconnect();
        vi.useRealTimers();
    });

    it('should export a collabService singleton', () => {
        expect(collabService).toBeDefined();
        expect(typeof collabService.init).toBe('function');
        expect(typeof collabService.disconnect).toBe('function');
    });

    it('init should log synchronization message', () => {
        collabService.init();
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'Synchronizing with Peer Mesh...',
            undefined,
            'CollabService'
        );
    });

    it('init should sync initial peers via setCollabState', () => {
        collabService.init();
        expect(mockSetCollabState).toHaveBeenCalled();
        const call = mockSetCollabState.mock.calls[0][0];
        expect(call).toHaveProperty('peers');
        expect(Array.isArray(call.peers)).toBe(true);
        expect(call.peers.length).toBeGreaterThanOrEqual(3);
        expect(call.peers.length).toBeLessThanOrEqual(6);
    });

    it('initial peers should have required properties', () => {
        collabService.init();
        const peers = mockSetCollabState.mock.calls[0][0].peers;
        for (const peer of peers) {
            expect(peer).toHaveProperty('id');
            expect(peer).toHaveProperty('name');
            expect(peer).toHaveProperty('role');
            expect(peer).toHaveProperty('activeSector');
            expect(peer).toHaveProperty('status');
            expect(peer).toHaveProperty('lastSeen');
            expect(peer).toHaveProperty('color');
        }
    });

    it('peer ids should follow peer-N pattern', () => {
        collabService.init();
        const peers = mockSetCollabState.mock.calls[0][0].peers;
        peers.forEach((peer: { id: string }, i: number) => {
            expect(peer.id).toBe(`peer-${i}`);
        });
    });

    it('peer status should be either ACTIVE or IDLE', () => {
        collabService.init();
        const peers = mockSetCollabState.mock.calls[0][0].peers;
        for (const peer of peers) {
            expect(['ACTIVE', 'IDLE']).toContain(peer.status);
        }
    });

    it('should start simulation interval on init', () => {
        collabService.init();
        vi.advanceTimersByTime(8000);
        // The simulation reads state via getState
        expect(mockGetState).toHaveBeenCalled();
    });

    it('disconnect should clear the interval', () => {
        collabService.init();
        collabService.disconnect();
        const callCountAfterDisconnect = mockGetState.mock.calls.length;
        vi.advanceTimersByTime(16000);
        expect(mockGetState.mock.calls.length).toBe(callCountAfterDisconnect);
    });

    it('simulation should handle peer sector migration', () => {
        const randomSpy = vi.spyOn(Math, 'random');
        randomSpy.mockReturnValue(0.8);

        collabService.init();
        mockSetCollabState.mockClear();
        mockAddSwarmEvent.mockClear();

        vi.advanceTimersByTime(8000);

        expect(mockSetCollabState).toHaveBeenCalled();
        expect(mockAddSwarmEvent).toHaveBeenCalled();
        const eventArg = mockAddSwarmEvent.mock.calls[0][0];
        expect(eventArg.action).toContain('Migrated to');

        randomSpy.mockRestore();
    });

    it('simulation should handle swarm action events', () => {
        const randomSpy = vi.spyOn(Math, 'random');
        randomSpy.mockReturnValue(0.2);

        collabService.init();
        mockAddSwarmEvent.mockClear();

        vi.advanceTimersByTime(8000);

        expect(mockAddSwarmEvent).toHaveBeenCalled();

        randomSpy.mockRestore();
    });

    it('should not crash when disconnect is called without init', () => {
        expect(() => collabService.disconnect()).not.toThrow();
    });

    it('simulation should handle empty peers array', () => {
        mockGetState.mockReturnValue(makeMockState([]));

        collabService.init();
        expect(() => vi.advanceTimersByTime(8000)).not.toThrow();
    });
});
