// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const mockAddLog = vi.hoisted(() => vi.fn());
const mockGetState = vi.hoisted(() => vi.fn(() => ({
  mode: 'CODE_STUDIO',
  system: { logs: [] },
  actions: { addLog: mockAddLog }
})));
const mockSubscribe = vi.hoisted(() => vi.fn(() => () => {}));
const mockGenerateText = vi.hoisted(() => vi.fn());
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
  generateText: mockGenerateText
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

// Must import after mocks are set up
import { selfEvolution } from '../selfEvolution';

describe('SelfEvolutionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore.clear();
  });

  describe('recordFriction', () => {
    it('should record a new friction signal', () => {
      const uniqueCtx = `err-${Date.now()}-${Math.random()}`;
      selfEvolution.recordFriction('ERROR', uniqueCtx, 'CODE_STUDIO');
      const map = selfEvolution.getFrictionMap();
      const signal = map.find(s => s.context === uniqueCtx);
      expect(signal).toBeDefined();
      expect(signal!.count).toBe(1);
      expect(signal!.type).toBe('ERROR');
      expect(signal!.mode).toBe('CODE_STUDIO');
    });

    it('should increment count for duplicate friction signals', () => {
      const uniqueCtx = `dup-${Date.now()}-${Math.random()}`;
      selfEvolution.recordFriction('ERROR', uniqueCtx, 'CODE_STUDIO');
      selfEvolution.recordFriction('ERROR', uniqueCtx, 'CODE_STUDIO');
      selfEvolution.recordFriction('ERROR', uniqueCtx, 'CODE_STUDIO');

      const map = selfEvolution.getFrictionMap();
      const signal = map.find(s => s.context === uniqueCtx);
      expect(signal).toBeDefined();
      expect(signal!.count).toBe(3);
    });

    it('should log debug message when friction is recorded', () => {
      selfEvolution.recordFriction('REPEATED_ACTION', 'Click spam test', 'DASHBOARD');
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('Friction recorded'),
        undefined,
        'SelfEvolution'
      );
    });
  });

  describe('getFrictionMap', () => {
    it('should return all friction signals as an array', () => {
      const id = Date.now();
      selfEvolution.recordFriction('ERROR', `Error A ${id}`, 'CODE_STUDIO');
      selfEvolution.recordFriction('REPEATED_ACTION', `Action B ${id}`, 'DASHBOARD');
      const map = selfEvolution.getFrictionMap();
      expect(Array.isArray(map)).toBe(true);
      expect(map.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getPendingEvolutions', () => {
    it('should return only PROPOSED hypotheses', () => {
      const pending = selfEvolution.getPendingEvolutions();
      expect(Array.isArray(pending)).toBe(true);
      pending.forEach(h => {
        expect(h.status).toBe('PROPOSED');
      });
    });
  });

  describe('getAllEvolutions', () => {
    it('should return all hypotheses regardless of status', () => {
      const all = selfEvolution.getAllEvolutions();
      expect(Array.isArray(all)).toBe(true);
    });
  });

  describe('getCycles', () => {
    it('should return evolution cycles array', () => {
      const cycles = selfEvolution.getCycles();
      expect(Array.isArray(cycles)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return statistics object with expected keys', () => {
      const stats = selfEvolution.getStats();
      expect(stats).toHaveProperty('totalFrictionSignals');
      expect(stats).toHaveProperty('totalHypotheses');
      expect(stats).toHaveProperty('pendingEvolutions');
      expect(stats).toHaveProperty('approvedEvolutions');
      expect(stats).toHaveProperty('deployedEvolutions');
      expect(stats).toHaveProperty('pendingDeployments');
      expect(stats).toHaveProperty('totalCycles');
      expect(stats).toHaveProperty('isEvolving');
      expect(typeof stats.isEvolving).toBe('boolean');
    });

    it('should count friction signals correctly', () => {
      const id = Date.now();
      selfEvolution.recordFriction('ERROR', `stats-test-${id}`, 'CODE_STUDIO');
      const stats = selfEvolution.getStats();
      expect(stats.totalFrictionSignals).toBeGreaterThanOrEqual(1);
    });
  });

  describe('rejectEvolution', () => {
    it('should do nothing when id not found', () => {
      selfEvolution.rejectEvolution('nonexistent-id');
      expect(mockAddLog).not.toHaveBeenCalled();
    });
  });

  describe('getPendingDeploymentsSync', () => {
    it('should return empty array when localStorage has no key', () => {
      localStorageStore.clear();
      const pending = selfEvolution.getPendingDeploymentsSync();
      expect(pending).toEqual([]);
    });

    it('should return parsed deployments from localStorage', () => {
      const deployments = [{ id: 'test-1', fileName: 'Test.tsx', fileType: 'component', code: '...', hypothesis: 'test', approvedAt: Date.now() }];
      localStorageStore.set('evolution_pending_deployments', JSON.stringify(deployments));
      const pending = selfEvolution.getPendingDeploymentsSync();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('test-1');
    });

    it('should return empty array on parse error', () => {
      localStorageStore.set('evolution_pending_deployments', 'invalid json');
      const pending = selfEvolution.getPendingDeploymentsSync();
      expect(pending).toEqual([]);
    });
  });

  describe('getPendingDeployments (async)', () => {
    it('should return data from neuralVault', async () => {
      const deployments = [{ id: 'nv-1', fileName: 'NV.tsx', fileType: 'component', code: '...', hypothesis: 'nv test', approvedAt: Date.now() }];
      mockNeuralVaultGet.mockResolvedValueOnce(deployments);
      const pending = await selfEvolution.getPendingDeployments();
      expect(pending).toEqual(deployments);
    });

    it('should fallback to sync when neuralVault fails', async () => {
      mockNeuralVaultGet.mockRejectedValueOnce(new Error('vault error'));
      const localData = [{ id: 'local-1', fileName: 'Local.tsx', fileType: 'component', code: '...', hypothesis: 'local', approvedAt: Date.now() }];
      localStorageStore.set('evolution_pending_deployments', JSON.stringify(localData));
      const pending = await selfEvolution.getPendingDeployments();
      expect(pending).toEqual(localData);
    });

    it('should return empty array when neuralVault returns null', async () => {
      mockNeuralVaultGet.mockResolvedValueOnce(null);
      const pending = await selfEvolution.getPendingDeployments();
      expect(pending).toEqual([]);
    });
  });

  describe('clearPendingDeployments', () => {
    it('should clear via neuralVault', async () => {
      mockNeuralVaultSet.mockResolvedValueOnce(undefined);
      await selfEvolution.clearPendingDeployments();
      expect(mockNeuralVaultSet).toHaveBeenCalledWith('evolution_pending_deployments', []);
    });

    it('should fallback to localStorage when neuralVault fails', async () => {
      mockNeuralVaultSet.mockRejectedValueOnce(new Error('vault error'));
      await selfEvolution.clearPendingDeployments();
      expect(localStorageStore.get('evolution_pending_deployments')).toBe('[]');
    });
  });

  describe('assessImpact', () => {
    it('should return HIGH when scanner throws', async () => {
      const result = await selfEvolution.assessImpact('nonexistent-file.ts');
      expect(result).toBe('HIGH');
    });
  });

  describe('proposeMigration', () => {
    it('should return error plan when scanner throws', async () => {
      const plan = await selfEvolution.proposeMigration('some-file.ts', 'change stuff');
      expect(plan.risk).toBe('HIGH');
      expect(plan.status).toBe('MANUAL_APPROVAL_REQUIRED');
      expect(plan.reasoning).toContain('Error during proposal');
    });
  });
});
