/**
 * Tests for OrganismLayer (AbstractOrganismLayer + OrganismLayerRegistry)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  OrganismTask,
  OrganismResult,
  OrganismMetrics,
  SubsystemType,
  BiometricContext,
  ContextPack,
} from '../../archon/types';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { AbstractOrganismLayer, organismRegistry } from '../OrganismLayer';

// Concrete implementation for testing
class TestOrganismLayer extends AbstractOrganismLayer {
  id: SubsystemType = 'genome';
  name = 'Test Layer';
  capabilities = ['test-cap'];
  layerType: 'genome' | 'swarm' | 'cognitive' = 'genome';

  // Track calls for testing
  onInitializeCalled = false;
  onShutdownCalled = false;
  onHighStressCalled = false;
  onLowActivityCalled = false;

  async dispatch(task: OrganismTask): Promise<OrganismResult> {
    return this.executeWithMetrics(task, async () => ({
      success: true,
      output: { echo: task.intent },
      dqScore: {
        score: 0.9,
        components: { validity: 0.9, specificity: 0.8, correctness: 0.9 },
        isActionable: true,
        timestamp: Date.now(),
      },
      metadata: {
        layerId: this.id,
        latencyMs: 0,
        tokensUsed: 10,
      },
    }));
  }

  getLayerMetrics(): OrganismMetrics {
    return this.getBaseMetrics();
  }

  protected async onInitialize(): Promise<void> {
    this.onInitializeCalled = true;
  }

  protected async onShutdown(): Promise<void> {
    this.onShutdownCalled = true;
  }

  protected onHighStress(_context: BiometricContext): void {
    this.onHighStressCalled = true;
  }

  protected onLowActivity(_context: BiometricContext): void {
    this.onLowActivityCalled = true;
  }

  // Expose protected for testing
  public getBiometricContext() {
    return this.biometricContext;
  }

  public getMcpPacks() {
    return this.mcpPacks;
  }

  public getInitialized() {
    return this.initialized;
  }
}

describe('AbstractOrganismLayer', () => {
  let layer: TestOrganismLayer;

  beforeEach(() => {
    layer = new TestOrganismLayer();
  });

  describe('constructor and defaults', () => {
    it('should initialize with default values', () => {
      expect(layer.status).toBe('idle');
      expect(layer.currentLoad).toBe(0);
      expect(layer.lastInvoked).toBeUndefined();
      expect(layer.metrics.invocations).toBe(0);
      expect(layer.metrics.successRate).toBe(1.0);
      expect(layer.metrics.avgDqScore).toBe(0.85);
      expect(layer.metrics.avgLatencyMs).toBe(0);
      expect(layer.metrics.tokenUsage).toBe(0);
    });

    it('should have correct abstract properties', () => {
      expect(layer.id).toBe('genome');
      expect(layer.name).toBe('Test Layer');
      expect(layer.capabilities).toEqual(['test-cap']);
      expect(layer.layerType).toBe('genome');
    });
  });

  describe('initialize()', () => {
    it('should call onInitialize and set initialized flag', async () => {
      await layer.initialize();
      expect(layer.onInitializeCalled).toBe(true);
      expect(layer.getInitialized()).toBe(true);
      expect(layer.status).toBe('idle');
    });

    it('should skip if already initialized', async () => {
      await layer.initialize();
      layer.onInitializeCalled = false;
      await layer.initialize();
      expect(layer.onInitializeCalled).toBe(false);
    });
  });

  describe('shutdown()', () => {
    it('should call onShutdown and set status to disabled', async () => {
      await layer.initialize();
      await layer.shutdown();
      expect(layer.onShutdownCalled).toBe(true);
      expect(layer.getInitialized()).toBe(false);
      expect(layer.status).toBe('disabled');
    });

    it('should skip if not initialized', async () => {
      await layer.shutdown();
      expect(layer.onShutdownCalled).toBe(false);
    });
  });

  describe('dispatch() / executeWithMetrics()', () => {
    it('should execute a task and update metrics', async () => {
      const task: OrganismTask = {
        intent: 'test:hello',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ echo: 'test:hello' });
      expect(layer.metrics.invocations).toBe(1);
      expect(layer.metrics.tokenUsage).toBe(10);
      expect(layer.status).toBe('idle');
    });

    it('should handle errors gracefully', async () => {
      // Create a layer that throws on dispatch
      class ErrorLayer extends TestOrganismLayer {
        async dispatch(task: OrganismTask): Promise<OrganismResult> {
          return this.executeWithMetrics(task, async () => {
            throw new Error('test error');
          });
        }
      }

      const errorLayer = new ErrorLayer();
      const task: OrganismTask = { intent: 'fail', contextPages: [] };
      const result = await errorLayer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toBe('test error');
      expect(result.dqScore.score).toBe(0);
      expect(errorLayer.status).toBe('idle');
    });

    it('should track currentLoad during execution', async () => {
      const task: OrganismTask = { intent: 'test', contextPages: [] };
      // After dispatch completes, load returns to 0
      await layer.dispatch(task);
      expect(layer.currentLoad).toBe(0);
    });

    it('should update success rate on successful results', async () => {
      const task: OrganismTask = { intent: 'test', contextPages: [] };
      await layer.dispatch(task);
      await layer.dispatch(task);
      // Both succeed, so successRate should be high
      expect(layer.metrics.successRate).toBeGreaterThan(0);
    });
  });

  describe('onBiometricChange()', () => {
    it('should store biometric context', () => {
      const ctx: BiometricContext = {
        stressLevel: 0.5,
        activityLevel: 0.5,
        focusScore: 0.5,
        timestamp: Date.now(),
      };
      layer.onBiometricChange(ctx);
      expect(layer.getBiometricContext()).toBe(ctx);
    });

    it('should trigger onHighStress for stressLevel > 0.8', () => {
      const ctx: BiometricContext = {
        stressLevel: 0.9,
        activityLevel: 0.5,
        focusScore: 0.5,
        timestamp: Date.now(),
      };
      layer.onBiometricChange(ctx);
      expect(layer.onHighStressCalled).toBe(true);
    });

    it('should trigger onLowActivity for low stress and low activity', () => {
      const ctx: BiometricContext = {
        stressLevel: 0.1,
        activityLevel: 0.2,
        focusScore: 0.5,
        timestamp: Date.now(),
      };
      layer.onBiometricChange(ctx);
      expect(layer.onLowActivityCalled).toBe(true);
    });

    it('should not trigger hooks for moderate stress/activity', () => {
      const ctx: BiometricContext = {
        stressLevel: 0.5,
        activityLevel: 0.5,
        focusScore: 0.5,
        timestamp: Date.now(),
      };
      layer.onBiometricChange(ctx);
      expect(layer.onHighStressCalled).toBe(false);
      expect(layer.onLowActivityCalled).toBe(false);
    });
  });

  describe('onMCPContext()', () => {
    it('should store MCP packs', () => {
      const packs: ContextPack[] = [
        { id: 'p1', name: 'Pack 1', content: 'data', relevanceScore: 0.9, tokenCount: 100, source: 'research' },
      ];
      layer.onMCPContext(packs);
      expect(layer.getMcpPacks()).toBe(packs);
    });
  });

  describe('computeDQScore()', () => {
    it('should return DQ score based on metrics', () => {
      const dq = layer.computeDQScore();
      expect(dq.score).toBe(0.85); // default avgDqScore
      expect(dq.components.validity).toBe(1.0); // default successRate
      expect(dq.components.specificity).toBe(0.8); // hardcoded default
      expect(dq.isActionable).toBe(true);
      expect(dq.timestamp).toBeGreaterThan(0);
    });

    it('should reflect updated metrics after dispatch', async () => {
      const task: OrganismTask = { intent: 'test', contextPages: [] };
      await layer.dispatch(task);
      const dq = layer.computeDQScore();
      expect(dq.score).toBeGreaterThan(0);
    });
  });

  describe('getLayerMetrics()', () => {
    it('should return a copy of base metrics', () => {
      const metrics = layer.getLayerMetrics();
      expect(metrics.invocations).toBe(0);
      expect(metrics.successRate).toBe(1.0);
      // Verify it is a copy
      metrics.invocations = 999;
      expect(layer.metrics.invocations).toBe(0);
    });
  });
});

describe('OrganismLayerRegistry', () => {
  // We test via the exported singleton organismRegistry.
  // Note: since organismRegistry is a singleton, other modules may have registered layers.
  // We test the API shape and basic operations.

  it('should register and retrieve a layer', () => {
    const layer = new TestOrganismLayer();
    layer.id = 'cognitive'; // use a unique ID to avoid collisions
    layer.name = 'Registry Test Layer';

    organismRegistry.register(layer);
    const retrieved = organismRegistry.get('cognitive');
    expect(retrieved).toBe(layer);
  });

  it('should return undefined for unregistered layer', () => {
    const result = organismRegistry.get('voice' as SubsystemType);
    expect(result).toBeUndefined();
  });

  it('should return all registered layers', () => {
    const all = organismRegistry.getAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('should initialize all registered layers', async () => {
    // This will initialize all layers in the registry
    await organismRegistry.initializeAll();
    const all = organismRegistry.getAll();
    // All should be initialized (status idle after init)
    for (const l of all) {
      expect(l.status).toBe('idle');
    }
  });

  it('should shutdown all registered layers', async () => {
    await organismRegistry.initializeAll();
    await organismRegistry.shutdownAll();
    const all = organismRegistry.getAll();
    for (const l of all) {
      expect(l.status).toBe('disabled');
    }
  });
});
