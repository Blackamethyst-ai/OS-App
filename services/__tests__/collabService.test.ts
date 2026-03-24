// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockSetCollabState = vi.hoisted(() => vi.fn());
const mockAddSwarmEvent = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockGetState = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: {
    getState: mockGetState,
  },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { collabService } from '../collabService';

describe('CollabService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGetState.mockReturnValue({
      actions: {
        setCollabState: mockSetCollabState,
        addSwarmEvent: mockAddSwarmEvent,
        addLog: mockAddLog,
      },
      collaboration: {
        peers: [
          { id: 'peer-0', name: 'AlphaNode', role: 'Architect', activeSector: 'DASHBOARD', status: 'ACTIVE', lastSeen: Date.now(), color: '#9d4edd' },
          { id: 'peer-1', name: 'BinaryArch', role: 'Sentinel', activeSector: 'CODE_STUDIO', status: 'IDLE', lastSeen: Date.now(), color: '#22d3ee' },
        ],
      },
    });
  });

  afterEach(() => {
    collabService.disconnect();
    vi.useRealTimers();
  });

  it('should export a collabService instance', () => {
    expect(collabService).toBeDefined();
    expect(typeof collabService.init).toBe('function');
    expect(typeof collabService.disconnect).toBe('function');
  });

  it('should call setCollabState with initial peers on init', () => {
    collabService.init();

    expect(mockSetCollabState).toHaveBeenCalledTimes(1);
    const call = mockSetCollabState.mock.calls[0][0];
    expect(call).toHaveProperty('peers');
    expect(Array.isArray(call.peers)).toBe(true);
    expect(call.peers.length).toBeGreaterThanOrEqual(3);
  });

  it('should generate peers with valid structure', () => {
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

  it('should generate between 3 and 6 peers', () => {
    // Run init multiple times to increase coverage
    collabService.init();
    const peers = mockSetCollabState.mock.calls[0][0].peers;
    expect(peers.length).toBeGreaterThanOrEqual(3);
    expect(peers.length).toBeLessThanOrEqual(6);
  });

  it('should start interval on init', () => {
    collabService.init();

    // Should be set up with 8000ms interval
    // Advance by 8 seconds and check that network activity runs
    vi.advanceTimersByTime(8000);

    // getState should be called for the interval tick (plus the initial syncPeers call)
    expect(mockGetState.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should stop interval on disconnect', () => {
    collabService.init();
    collabService.disconnect();

    const callCountAfterDisconnect = mockGetState.mock.calls.length;
    vi.advanceTimersByTime(16000);

    // No additional getState calls after disconnect
    expect(mockGetState.mock.calls.length).toBe(callCountAfterDisconnect);
  });

  it('should simulate peer sector migration when rand > 0.7', () => {
    // Override Math.random to return a value that triggers migration
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValue(0.8); // > 0.7, triggers migration

    collabService.init();
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      actions: {
        setCollabState: mockSetCollabState,
        addSwarmEvent: mockAddSwarmEvent,
        addLog: mockAddLog,
      },
      collaboration: {
        peers: [
          { id: 'peer-0', name: 'AlphaNode', role: 'Architect', activeSector: 'DASHBOARD', status: 'ACTIVE', lastSeen: Date.now(), color: '#9d4edd' },
        ],
      },
    });
    randomSpy.mockReturnValue(0.8);

    vi.advanceTimersByTime(8000);

    // Should have called setCollabState (migration) and addSwarmEvent
    expect(mockSetCollabState).toHaveBeenCalled();
    expect(mockAddSwarmEvent).toHaveBeenCalled();

    randomSpy.mockRestore();
  });

  it('should simulate swarm action when rand < 0.3', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValue(0.1); // < 0.3, triggers swarm action

    collabService.init();
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      actions: {
        setCollabState: mockSetCollabState,
        addSwarmEvent: mockAddSwarmEvent,
        addLog: mockAddLog,
      },
      collaboration: {
        peers: [
          { id: 'peer-0', name: 'TestNode', role: 'Operator', activeSector: 'DASHBOARD', status: 'ACTIVE', lastSeen: Date.now(), color: '#22d3ee' },
        ],
      },
    });
    randomSpy.mockReturnValue(0.1);

    vi.advanceTimersByTime(8000);

    expect(mockAddSwarmEvent).toHaveBeenCalled();
    const eventArg = mockAddSwarmEvent.mock.calls[0][0];
    expect(eventArg).toHaveProperty('userId');
    expect(eventArg).toHaveProperty('userName');
    expect(eventArg).toHaveProperty('action');

    randomSpy.mockRestore();
  });

  it('should trigger peer resync when rand > 0.95', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValue(0.96); // > 0.95, triggers resync

    collabService.init();
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      actions: {
        setCollabState: mockSetCollabState,
        addSwarmEvent: mockAddSwarmEvent,
        addLog: mockAddLog,
      },
      collaboration: {
        peers: [
          { id: 'peer-0', name: 'Node', role: 'Architect', activeSector: 'DASHBOARD', status: 'ACTIVE', lastSeen: Date.now(), color: '#9d4edd' },
        ],
      },
    });
    randomSpy.mockReturnValue(0.96);

    vi.advanceTimersByTime(8000);

    // Resync should call setCollabState with new peers plus migration (0.96 > 0.7)
    expect(mockSetCollabState).toHaveBeenCalled();

    randomSpy.mockRestore();
  });

  it('should handle disconnect when no interval is set', () => {
    // Should not throw when disconnecting without init
    expect(() => collabService.disconnect()).not.toThrow();
  });

  it('should assign peer status as ACTIVE or IDLE', () => {
    collabService.init();

    const peers = mockSetCollabState.mock.calls[0][0].peers;
    for (const peer of peers) {
      expect(['ACTIVE', 'IDLE']).toContain(peer.status);
    }
  });

  it('should assign unique peer IDs', () => {
    collabService.init();

    const peers = mockSetCollabState.mock.calls[0][0].peers;
    const ids = peers.map((p: any) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
