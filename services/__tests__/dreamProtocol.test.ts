// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const mockAddLog = vi.hoisted(() => vi.fn());
const mockGetState = vi.hoisted(() => vi.fn(() => ({
  mode: 'CODE_STUDIO',
  system: { logs: [{ message: 'test log', level: 'INFO' }] },
  research: { tasks: [] },
  actions: { addLog: mockAddLog }
})));
const mockSubscribe = vi.hoisted(() => vi.fn(() => () => {}));
const mockGenerateText = vi.hoisted(() => vi.fn().mockResolvedValue('analysis result'));
const mockPerformGlobalSearch = vi.hoisted(() => vi.fn().mockResolvedValue([{ title: 'Result 1' }]));
const mockGenerateEmbedding = vi.hoisted(() => vi.fn().mockResolvedValue([0.1, 0.2]));
const mockIsEnabled = vi.hoisted(() => vi.fn(() => true));
const mockRecordUsage = vi.hoisted(() => vi.fn());
const mockNeuralVaultGet = vi.hoisted(() => vi.fn());
const mockNeuralVaultSet = vi.hoisted(() => vi.fn());
const mockLoggerDebug = vi.hoisted(() => vi.fn());
const mockLoggerInfo = vi.hoisted(() => vi.fn());
const mockLoggerWarn = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());

// Mock localStorage
const localStorageStore = vi.hoisted(() => new Map<string, string>());
const mockLocalStorage = vi.hoisted(() => ({
  getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { localStorageStore.delete(key); }),
  clear: vi.fn(() => { localStorageStore.clear(); }),
  get length() { return localStorageStore.size; },
  key: vi.fn((i: number) => Array.from(localStorageStore.keys())[i] ?? null),
}));

vi.stubGlobal('localStorage', mockLocalStorage);

vi.mock('../../store', () => ({
  useAppStore: Object.assign(mockGetState, {
    getState: mockGetState,
    subscribe: mockSubscribe,
    setState: vi.fn(),
    destroy: vi.fn(),
  })
}));

vi.mock('../geminiService', () => ({
  generateText: mockGenerateText,
  performGlobalSearch: mockPerformGlobalSearch,
  generateEmbedding: mockGenerateEmbedding
}));

vi.mock('../powerService', () => ({
  powerService: {
    isEnabled: mockIsEnabled,
    recordUsage: mockRecordUsage
  }
}));

vi.mock('../persistenceService', () => ({
  neuralVault: {
    get: mockNeuralVaultGet,
    set: mockNeuralVaultSet
  }
}));

vi.mock('../logger', () => ({
  logger: {
    debug: mockLoggerDebug,
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError
  }
}));

// Import after mocks
import { dreamProtocol } from '../dreamProtocol';
import type { DreamInsight, DreamSession } from '../dreamProtocol';

describe('DreamProtocolService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore.clear();
  });

  describe('queueQuery', () => {
    it('should add a query to the pending queue', () => {
      const uniqueQuery = `test-query-${Date.now()}-${Math.random()}`;
      const before = dreamProtocol.getStatus().pendingQueries;
      dreamProtocol.queueQuery(uniqueQuery);
      const after = dreamProtocol.getStatus().pendingQueries;
      expect(after).toBe(before + 1);
    });

    it('should not add duplicate queries', () => {
      const uniqueQuery = `dedup-query-${Date.now()}-${Math.random()}`;
      dreamProtocol.queueQuery(uniqueQuery);
      const after1 = dreamProtocol.getStatus().pendingQueries;
      dreamProtocol.queueQuery(uniqueQuery);
      const after2 = dreamProtocol.getStatus().pendingQueries;
      expect(after2).toBe(after1);
    });

    it('should log debug message when queuing', () => {
      const uniqueQuery = `logged-query-${Date.now()}`;
      dreamProtocol.queueQuery(uniqueQuery);
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('Queued'),
        undefined,
        'DreamProtocol'
      );
    });
  });

  describe('getStatus', () => {
    it('should return status object with expected properties', () => {
      const status = dreamProtocol.getStatus();
      expect(status).toHaveProperty('isDreaming');
      expect(status).toHaveProperty('currentSession');
      expect(status).toHaveProperty('pendingQueries');
      expect(status).toHaveProperty('lastActivity');
      expect(status).toHaveProperty('idleTime');
      expect(typeof status.isDreaming).toBe('boolean');
      expect(typeof status.pendingQueries).toBe('number');
      expect(typeof status.idleTime).toBe('number');
    });

    it('should report idle time as non-negative', () => {
      const status = dreamProtocol.getStatus();
      expect(status.idleTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPastSessions', () => {
    it('should return empty array when no sessions stored', () => {
      localStorageStore.clear();
      const sessions = dreamProtocol.getPastSessions();
      expect(sessions).toEqual([]);
    });

    it('should return stored sessions from localStorage', () => {
      const session: DreamSession = {
        id: 'dream-123',
        startTime: Date.now() - 60000,
        endTime: Date.now(),
        insights: [],
        patternsAnalyzed: 5,
        queriesProcessed: 2,
        status: 'COMPLETE'
      };
      localStorageStore.set('dream_sessions', JSON.stringify([session]));

      const sessions = dreamProtocol.getPastSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('dream-123');
      expect(sessions[0].status).toBe('COMPLETE');
    });

    it('should return empty array on JSON parse error', () => {
      localStorageStore.set('dream_sessions', 'not valid json');
      const sessions = dreamProtocol.getPastSessions();
      expect(sessions).toEqual([]);
    });

    it('should handle sessions with insights', () => {
      const insight: DreamInsight = {
        id: 'insight-1',
        type: 'RESEARCH',
        title: 'Test Insight',
        content: 'Some content',
        confidence: 0.85,
        timestamp: Date.now(),
        relatedQueries: ['test'],
        actionable: true,
        suggestedAction: 'Do something'
      };

      const session: DreamSession = {
        id: 'dream-456',
        startTime: Date.now() - 120000,
        endTime: Date.now(),
        insights: [insight],
        patternsAnalyzed: 3,
        queriesProcessed: 1,
        status: 'COMPLETE'
      };

      localStorageStore.set('dream_sessions', JSON.stringify([session]));
      const sessions = dreamProtocol.getPastSessions();
      expect(sessions[0].insights).toHaveLength(1);
      expect(sessions[0].insights[0].type).toBe('RESEARCH');
      expect(sessions[0].insights[0].actionable).toBe(true);
    });
  });

  describe('triggerDream', () => {
    it('should not enter dream mode when power service disables it', () => {
      // Must run before any test that enables dreaming on this singleton
      mockIsEnabled.mockReturnValue(false);
      dreamProtocol.triggerDream();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('Disabled'),
        undefined,
        'DreamProtocol'
      );
    });

    it('should set lastActivity to past idle threshold', () => {
      mockIsEnabled.mockReturnValue(true);
      dreamProtocol.triggerDream();
      const status = dreamProtocol.getStatus();
      expect(status.idleTime).toBeGreaterThanOrEqual(5 * 60 * 1000);
    });
  });

  describe('DreamInsight type', () => {
    it('should support all insight types', () => {
      const types: DreamInsight['type'][] = ['PATTERN', 'RESEARCH', 'OPTIMIZATION', 'PREDICTION', 'DISCOVERY'];
      types.forEach(type => {
        const insight: DreamInsight = {
          id: `test-${type}`,
          type,
          title: `Test ${type}`,
          content: 'content',
          confidence: 0.5,
          timestamp: Date.now(),
          relatedQueries: [],
          actionable: false
        };
        expect(insight.type).toBe(type);
      });
    });
  });

  describe('DreamSession type', () => {
    it('should support all session statuses', () => {
      const statuses: DreamSession['status'][] = ['DREAMING', 'COMPLETE', 'INTERRUPTED'];
      statuses.forEach(status => {
        const session: DreamSession = {
          id: `session-${status}`,
          startTime: Date.now(),
          endTime: null,
          insights: [],
          patternsAnalyzed: 0,
          queriesProcessed: 0,
          status
        };
        expect(session.status).toBe(status);
      });
    });
  });
});
