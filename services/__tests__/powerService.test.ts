// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageStore = vi.hoisted(() => new Map<string, string>());
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { localStorageStore.delete(key); }),
  clear: vi.fn(() => { localStorageStore.clear(); }),
  get length() { return localStorageStore.size; },
  key: vi.fn((i: number) => Array.from(localStorageStore.keys())[i] ?? null),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock logger before importing the module
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const STORAGE_KEY = 'sovereign_power_config';

describe('PowerManagementService', () => {
  beforeEach(() => {
    localStorageStore.clear();
    vi.clearAllMocks();
    vi.resetModules();
    // Re-stub localStorage after resetModules clears it
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  async function getService() {
    const mod = await import('../powerService');
    return mod.powerService;
  }

  it('should return default BALANCED config when no stored config exists', async () => {
    const service = await getService();
    const config = service.getConfig();

    expect(config.mode).toBe('BALANCED');
    expect(config.features.memoryRAG).toBe(true);
    expect(config.features.proactiveInsights).toBe(true);
    expect(config.features.dreamProtocol).toBe(false);
    expect(config.features.multiAgentSwarm).toBe(false);
    expect(config.budget.dailyLimit).toBe(5.00);
    expect(config.budget.monthlyLimit).toBe(50.00);
  });

  it('should switch to ECO mode and disable all features', async () => {
    const service = await getService();
    service.setMode('ECO');
    const config = service.getConfig();

    expect(config.mode).toBe('ECO');
    expect(config.features.dreamProtocol).toBe(false);
    expect(config.features.multiAgentSwarm).toBe(false);
    expect(config.features.memoryRAG).toBe(false);
    expect(config.features.autoEvolution).toBe(false);
    expect(config.features.continuousMonitor).toBe(false);
    expect(config.features.proactiveInsights).toBe(false);
  });

  it('should switch to OVERDRIVE mode and enable all features', async () => {
    const service = await getService();
    service.setMode('OVERDRIVE');
    const config = service.getConfig();

    expect(config.mode).toBe('OVERDRIVE');
    expect(config.features.dreamProtocol).toBe(true);
    expect(config.features.multiAgentSwarm).toBe(true);
    expect(config.features.memoryRAG).toBe(true);
    expect(config.features.autoEvolution).toBe(true);
    expect(config.features.continuousMonitor).toBe(true);
    expect(config.features.proactiveInsights).toBe(true);
  });

  it('should switch to CUSTOM mode when toggling individual features', async () => {
    const service = await getService();
    service.toggleFeature('dreamProtocol', true);
    const config = service.getConfig();

    expect(config.mode).toBe('CUSTOM');
    expect(config.features.dreamProtocol).toBe(true);
  });

  it('should return false for isEnabled when budget is exceeded', async () => {
    const service = await getService();
    service.resetUsage();
    service.setMode('OVERDRIVE');
    service.setBudget(0.001, 50, 0.8);
    // dreamProtocol costs $0.05 per call, budget is $0.001
    service.recordUsage('dreamProtocol');

    expect(service.isBudgetExceeded()).toBe(true);
    expect(service.isEnabled('dreamProtocol')).toBe(false);
  });

  it('should detect approaching budget limit', async () => {
    const service = await getService();
    service.setBudget(1.00, 50, 0.5); // alert at 50%
    service.resetUsage();
    // memoryRAG costs $0.005 per call, need 100 calls to reach $0.50
    for (let i = 0; i < 100; i++) {
      service.recordUsage('memoryRAG');
    }
    expect(service.isApproachingLimit()).toBe(true);
  });

  it('should track daily usage percentage correctly', async () => {
    const service = await getService();
    service.setBudget(1.00, 50, 0.8);
    service.resetUsage();
    // memoryRAG = $0.005/call, 10 calls = $0.05 = 5% of $1.00
    for (let i = 0; i < 10; i++) {
      service.recordUsage('memoryRAG');
    }
    expect(service.getDailyUsagePercent()).toBeCloseTo(5, 0);
  });

  it('should cap daily usage percentage at 100', async () => {
    const service = await getService();
    service.setBudget(0.01, 50, 0.8);
    service.resetUsage();
    // dreamProtocol = $0.05, budget = $0.01 => way over 100%
    service.recordUsage('dreamProtocol');
    expect(service.getDailyUsagePercent()).toBe(100);
  });

  it('should format daily cost correctly', async () => {
    const service = await getService();
    service.resetUsage();
    expect(service.getFormattedDailyCost()).toBe('$0.00');
    service.recordUsage('memoryRAG'); // $0.005
    expect(service.getFormattedDailyCost()).toMatch(/^\$\d+\.\d{2}$/);
  });

  it('should format daily budget correctly', async () => {
    const service = await getService();
    service.setBudget(10.00, 100, 0.8);
    expect(service.getFormattedDailyBudget()).toBe('$10.00');
  });

  it('should persist config to localStorage', async () => {
    const service = await getService();
    service.setMode('OVERDRIVE');
    const stored = localStorageStore.get(STORAGE_KEY);
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(parsed.mode).toBe('OVERDRIVE');
  });

  it('should load persisted config from localStorage', async () => {
    const config = {
      mode: 'ECO',
      features: {
        dreamProtocol: false,
        multiAgentSwarm: false,
        memoryRAG: false,
        autoEvolution: false,
        continuousMonitor: false,
        proactiveInsights: false,
      },
      budget: { dailyLimit: 2.00, monthlyLimit: 20.00, alertThreshold: 0.9 },
      usage: {
        tokensUsedToday: 500,
        estimatedCostToday: 0.10,
        tokensUsedMonth: 5000,
        estimatedCostMonth: 1.00,
        lastReset: Date.now(),
      },
    };
    localStorageStore.set(STORAGE_KEY, JSON.stringify(config));

    const service = await getService();
    const loaded = service.getConfig();
    expect(loaded.mode).toBe('ECO');
    expect(loaded.budget.dailyLimit).toBe(2.00);
    expect(loaded.usage.tokensUsedToday).toBe(500);
  });

  it('should subscribe and unsubscribe to config changes', async () => {
    const service = await getService();
    const callback = vi.fn();
    const unsubscribe = service.subscribe(callback);

    service.setMode('ECO');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ECO' }));

    unsubscribe();
    service.setMode('OVERDRIVE');
    // Should not have been called again after unsubscribe
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should reset usage stats', async () => {
    const service = await getService();
    service.recordUsage('dreamProtocol', 5000);
    service.resetUsage();
    const config = service.getConfig();
    expect(config.usage.tokensUsedToday).toBe(0);
    expect(config.usage.estimatedCostToday).toBe(0);
    expect(config.usage.tokensUsedMonth).toBe(0);
    expect(config.usage.estimatedCostMonth).toBe(0);
  });

  it('should update budget settings', async () => {
    const service = await getService();
    service.setBudget(20, 200, 0.75);
    const config = service.getConfig();
    expect(config.budget.dailyLimit).toBe(20);
    expect(config.budget.monthlyLimit).toBe(200);
    expect(config.budget.alertThreshold).toBe(0.75);
  });

  it('should record usage and accumulate tokens and cost', async () => {
    const service = await getService();
    service.resetUsage();
    service.setBudget(100, 1000, 0.8); // high budget so no auto-throttle
    service.recordUsage('memoryRAG', 2000);
    service.recordUsage('memoryRAG', 3000);
    const config = service.getConfig();
    expect(config.usage.tokensUsedToday).toBe(5000);
    expect(config.usage.tokensUsedMonth).toBe(5000);
    // 2 calls * $0.005 = $0.01
    expect(config.usage.estimatedCostToday).toBeCloseTo(0.01);
  });
});
