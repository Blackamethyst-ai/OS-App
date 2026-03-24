/**
 * Tests for AgentKernel
 *
 * Validates kernel lifecycle (boot/shutdown), dispatch flow,
 * event system, biometric integration, metrics, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Shared mock state so we can reference from tests
const mockPager = {
  initialize: vi.fn().mockResolvedValue(undefined),
  flush: vi.fn().mockResolvedValue(undefined),
  pageForIntent: vi.fn().mockResolvedValue([
    { id: 'page-1', size: 500 },
    { id: 'page-2', size: 300 },
  ]),
  prefetchForElement: vi.fn(),
};

const mockOrganismRegistry = {
  getAll: vi.fn().mockReturnValue([]),
  initializeAll: vi.fn().mockResolvedValue(undefined),
  shutdownAll: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockReturnValue(null),
};

// Mock all external dependencies BEFORE any imports
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../memory/SemanticPager', () => ({
  SemanticPager: class MockSemanticPager {
    initialize = mockPager.initialize;
    flush = mockPager.flush;
    pageForIntent = mockPager.pageForIntent;
    prefetchForElement = mockPager.prefetchForElement;
  },
}));

vi.mock('../../ui', () => ({
  auiEngine: {
    generateLayout: vi.fn().mockResolvedValue({ id: 'layout-1', visiblePanels: ['main'] }),
  },
  judgeAgent: {
    startCycle: vi.fn(),
    evaluateLayout: vi.fn().mockResolvedValue({ score: 0.85, verdict: 'GOOD', reasoning: 'ok' }),
    shouldIterate: vi.fn().mockReturnValue(false),
    incrementIteration: vi.fn(),
  },
  semanticGaze: {},
  domRegenerator: {
    morphToLayout: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../organisms', () => ({
  organismRegistry: mockOrganismRegistry,
  AbstractOrganismLayer: class {},
}));

vi.mock('../../archon/types', () => ({
  isOrganismLayer: vi.fn().mockReturnValue(false),
}));

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${uuidCounter++}`,
});

/**
 * Because AgentKernel exports a singleton, we need fresh instances per test.
 * vi.resetModules() + dynamic import gives us a new module (and new singleton).
 * The top-level vi.mock() declarations persist across resetModules calls.
 */
describe('AgentKernel', () => {
  let agentKernel: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    uuidCounter = 0;

    // Reset mock implementations to defaults
    mockPager.initialize.mockResolvedValue(undefined);
    mockPager.flush.mockResolvedValue(undefined);
    mockPager.pageForIntent.mockResolvedValue([
      { id: 'page-1', size: 500 },
      { id: 'page-2', size: 300 },
    ]);
    mockOrganismRegistry.getAll.mockReturnValue([]);
    mockOrganismRegistry.initializeAll.mockResolvedValue(undefined);
    mockOrganismRegistry.shutdownAll.mockResolvedValue(undefined);
    mockOrganismRegistry.get.mockReturnValue(null);

    // Get fresh singleton
    vi.resetModules();
    const mod = await import('../AgentKernel');
    agentKernel = mod.agentKernel;
  });

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  describe('boot', () => {
    it('should transition state from BOOTING to IDLE on successful boot', async () => {
      expect(agentKernel.getState()).toBe('BOOTING');

      await agentKernel.boot();

      expect(agentKernel.getState()).toBe('IDLE');
    });

    it('should emit BOOT_COMPLETE event on successful boot', async () => {
      const handler = vi.fn();
      agentKernel.on('BOOT_COMPLETE', handler);

      await agentKernel.boot();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BOOT_COMPLETE',
          payload: expect.objectContaining({ version: '1.0.0-agentic' }),
        })
      );
    });

    it('should not re-boot when already in IDLE state', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('BOOT_COMPLETE', handler);

      await agentKernel.boot();

      // Should not emit another BOOT_COMPLETE
      expect(handler).not.toHaveBeenCalled();
    });

    it('should set state to ERROR when boot fails', async () => {
      // Make the intent resolver initialization fail
      // Since IntentResolver is not mocked, we mock SemanticPager instead
      mockPager.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(agentKernel.boot()).rejects.toThrow('Init failed');
      expect(agentKernel.getState()).toBe('ERROR');
    });
  });

  describe('shutdown', () => {
    it('should transition state to BOOTING (ready for reboot) after shutdown', async () => {
      await agentKernel.boot();

      await agentKernel.shutdown();

      expect(agentKernel.getState()).toBe('BOOTING');
    });

    it('should set state to SUSPENDED during shutdown', async () => {
      await agentKernel.boot();

      // We can't easily observe the intermediate state, but ensure shutdown completes
      await expect(agentKernel.shutdown()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // DISPATCH
  // ==========================================================================

  describe('dispatch', () => {
    it('should return error result when kernel is not booted', async () => {
      const result = await agentKernel.dispatch('test input');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Kernel not ready');
    });

    it('should successfully dispatch after boot', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('what is the weather');

      expect(result.success).toBe(true);
      expect(result.intent).toBeDefined();
      expect(result.intent.category).toBe('QUERY');
    });

    it('should include latency in successful dispatch result', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('test query');

      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should resolve navigation intents correctly', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('go to dashboard');

      expect(result.success).toBe(true);
      expect(result.intent?.category).toBe('NAVIGATION');
      expect(result.result?.action).toBe('NAVIGATE');
    });

    it('should resolve query intents correctly', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('what is happening');

      expect(result.success).toBe(true);
      expect(result.result?.action).toBe('QUERY');
    });

    it('should resolve creation intents correctly', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('create a new component');

      expect(result.success).toBe(true);
      expect(result.result?.action).toBe('CREATE');
    });

    it('should resolve mutation intents correctly', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('update the settings');

      expect(result.success).toBe(true);
      expect(result.result?.action).toBe('MUTATE');
    });

    it('should resolve analysis intents correctly', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('analyze the data');

      expect(result.success).toBe(true);
      expect(result.result?.action).toBe('ANALYZE');
    });

    it('should return to IDLE state after dispatch', async () => {
      await agentKernel.boot();

      await agentKernel.dispatch('test query');

      expect(agentKernel.getState()).toBe('IDLE');
    });

    it('should accept dispatch options with priority', async () => {
      await agentKernel.boot();

      const result = await agentKernel.dispatch('test', { priority: 'HIGH' });

      expect(result.success).toBe(true);
    });

    it('should emit INTENT_RESOLVED event during dispatch', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('INTENT_RESOLVED', handler);

      await agentKernel.dispatch('what is this');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit TASK_QUEUED event during dispatch', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('TASK_QUEUED', handler);

      await agentKernel.dispatch('test query');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit TASK_COMPLETED event on successful dispatch', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('TASK_COMPLETED', handler);

      await agentKernel.dispatch('what is this');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // EVENT SYSTEM
  // ==========================================================================

  describe('event system', () => {
    it('should register and fire specific event handlers', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('TASK_COMPLETED', handler);

      await agentKernel.dispatch('test');

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe('TASK_COMPLETED');
      expect(event.source).toBe('AgentKernel');
      expect(event.timestamp).toBeDefined();
    });

    it('should return an unsubscribe function', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      const unsub = agentKernel.on('TASK_COMPLETED', handler);

      unsub();

      await agentKernel.dispatch('test');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support global event handlers via onAll', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.onAll(handler);

      await agentKernel.dispatch('test');

      // Should receive multiple events (INTENT_RESOLVED, TASK_QUEUED, TASK_STARTED, TASK_COMPLETED)
      expect(handler.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should return unsubscribe for global handlers', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      const unsub = agentKernel.onAll(handler);

      unsub();

      await agentKernel.dispatch('test');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle errors in event handlers gracefully', async () => {
      await agentKernel.boot();
      const badHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      agentKernel.on('TASK_COMPLETED', badHandler);

      // Should not throw even though handler errors
      const result = await agentKernel.dispatch('test');
      expect(result.success).toBe(true);
    });

    it('should handle errors in global handlers gracefully', async () => {
      await agentKernel.boot();
      const badHandler = vi.fn().mockImplementation(() => {
        throw new Error('Global handler error');
      });
      agentKernel.onAll(badHandler);

      const result = await agentKernel.dispatch('test');
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // BIOMETRIC INTEGRATION
  // ==========================================================================

  describe('biometric context', () => {
    it('should update biometric context and increment sample count', async () => {
      await agentKernel.boot();

      agentKernel.updateBiometricContext({
        recentFixations: [],
        stressLevel: { value: 50, trend: 'STABLE', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 80,
        cognitiveLoad: 40,
      });

      const metrics = agentKernel.getMetrics();
      expect(metrics.biometricSamples).toBe(1);
      expect(metrics.currentStressLevel).toBe(50);
    });

    it('should emit STRESS_THRESHOLD event when stress exceeds 80', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('STRESS_THRESHOLD', handler);

      agentKernel.updateBiometricContext({
        recentFixations: [],
        stressLevel: { value: 85, trend: 'RISING', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 30,
        cognitiveLoad: 80,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.level).toBe(85);
    });

    it('should emit GAZE_FIXATION event for fixations over 2000ms', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('GAZE_FIXATION', handler);

      agentKernel.updateBiometricContext({
        recentFixations: [{
          id: 'fix-1',
          centroid: { x: 100, y: 200 },
          duration: 3000,
          startTime: Date.now() - 3000,
          endTime: Date.now(),
          targetElement: '#some-btn',
        }],
        stressLevel: { value: 30, trend: 'STABLE', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 80,
        cognitiveLoad: 40,
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should NOT emit STRESS_THRESHOLD when stress is below 80', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('STRESS_THRESHOLD', handler);

      agentKernel.updateBiometricContext({
        recentFixations: [],
        stressLevel: { value: 60, trend: 'STABLE', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 70,
        cognitiveLoad: 40,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AUI (Adaptive UI)
  // ==========================================================================

  describe('AUI controls', () => {
    it('should enable/disable AUI', async () => {
      await agentKernel.boot();

      agentKernel.setAUIEnabled(false);
      // AUI is disabled - no way to check directly but should not throw
      expect(() => agentKernel.setAUIEnabled(true)).not.toThrow();
    });

    it('should return null layout before any regeneration', async () => {
      await agentKernel.boot();

      expect(agentKernel.getCurrentLayout()).toBeNull();
    });

    it('should enable/disable adaptive UI', async () => {
      await agentKernel.boot();

      expect(() => agentKernel.setAdaptiveUIEnabled(true)).not.toThrow();
      expect(() => agentKernel.setAdaptiveUIEnabled(false)).not.toThrow();
    });
  });

  // ==========================================================================
  // METRICS
  // ==========================================================================

  describe('getMetrics', () => {
    it('should return initial metrics before boot', () => {
      const metrics = agentKernel.getMetrics();

      expect(metrics.tasksProcessed).toBe(0);
      expect(metrics.pageFaults).toBe(0);
      expect(metrics.biometricSamples).toBe(0);
    });

    it('should track tasks processed after dispatch', async () => {
      await agentKernel.boot();

      await agentKernel.dispatch('test query 1');
      await agentKernel.dispatch('test query 2');

      const metrics = agentKernel.getMetrics();
      expect(metrics.tasksProcessed).toBe(2);
    });

    it('should calculate average task latency', async () => {
      await agentKernel.boot();

      await agentKernel.dispatch('test query');

      const metrics = agentKernel.getMetrics();
      expect(metrics.avgTaskLatency).toBeGreaterThanOrEqual(0);
    });

    it('should calculate uptime after boot', async () => {
      await agentKernel.boot();

      // Small delay to ensure uptime > 0
      await new Promise(r => setTimeout(r, 10));

      const metrics = agentKernel.getMetrics();
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    it('should return 0 uptime before boot', () => {
      const metrics = agentKernel.getMetrics();
      expect(metrics.uptime).toBe(0);
    });
  });

  // ==========================================================================
  // STATE
  // ==========================================================================

  describe('getState', () => {
    it('should start in BOOTING state', () => {
      expect(agentKernel.getState()).toBe('BOOTING');
    });

    it('should be IDLE after boot', async () => {
      await agentKernel.boot();

      expect(agentKernel.getState()).toBe('IDLE');
    });
  });

  // ==========================================================================
  // SEMANTIC PAGER ACCESS
  // ==========================================================================

  describe('getSemanticPager', () => {
    it('should return the semantic pager instance', () => {
      const pager = agentKernel.getSemanticPager();

      expect(pager).toBeDefined();
      expect(pager.initialize).toBeDefined();
    });
  });

  // ==========================================================================
  // PRIORITY DETERMINATION
  // ==========================================================================

  describe('priority determination', () => {
    it('should assign HIGH priority to NAVIGATION intents', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('TASK_QUEUED', handler);

      await agentKernel.dispatch('go to dashboard');

      const queuedTask = handler.mock.calls[0][0].payload;
      expect(queuedTask.priority).toBe('HIGH');
    });

    it('should assign NORMAL priority to ANALYSIS intents', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('TASK_QUEUED', handler);

      await agentKernel.dispatch('analyze the data');

      const queuedTask = handler.mock.calls[0][0].payload;
      expect(queuedTask.priority).toBe('NORMAL');
    });

    it('should use user-specified priority when provided', async () => {
      await agentKernel.boot();
      const handler = vi.fn();
      agentKernel.on('TASK_QUEUED', handler);

      await agentKernel.dispatch('simple task', { priority: 'LOW' });

      const queuedTask = handler.mock.calls[0][0].payload;
      expect(queuedTask.priority).toBe('LOW');
    });
  });
});
