import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../cognitive/wakeSleep', () => {
  const mockWakeSleep = {
    startWakePhase: vi.fn(),
    getCurrentPhase: vi.fn(() => 'wake'),
    triggerSleep: vi.fn(),
    processTask: vi.fn(),
    getEpisodicBuffer: vi.fn(() => []),
  };
  return {
    wakeSleepAgent: mockWakeSleep,
    WakeSleepAgent: vi.fn(),
    createWakeSleepAgent: vi.fn(),
  };
});

vi.mock('../cognitive/simpleMem', () => {
  const mockSimpleMem = {
    compress: vi.fn((raw: any) => ({ id: raw.id || 'compressed-1', ...raw })),
    retrieve: vi.fn(() => ({ results: [], totalMatches: 0 })),
    getMetrics: vi.fn(() => ({
      overall: { avgDqScore: 0.8 },
    })),
  };
  return {
    simpleMem: mockSimpleMem,
    SimpleMem: vi.fn(),
    createSimpleMem: vi.fn(),
  };
});

vi.mock('../cognitive/goldilocksBuffer', () => {
  const mockGoldilocks = {
    selectForReplay: vi.fn(() => ({
      selected: [],
      tooEasy: [],
      tooHard: [],
      totalConsidered: 0,
      budgetUsed: 0,
      stats: { avgLearningSpeed: 0, goldilocksRatio: 0, ewcPenaltyApplied: false },
    })),
    getMetrics: vi.fn(() => ({
      trackedEpisodes: 0,
      zoneDistribution: { tooEasy: 0, goldilocks: 0, tooHard: 0 },
      avgLearningSpeed: 0,
      fisherEntries: 0,
      totalEwcPenalty: 0,
      syntheticGenerated: 0,
      selectionEfficiency: 0,
    })),
  };
  return {
    goldilocksBuffer: mockGoldilocks,
    GoldilocksBuffer: vi.fn(),
    createGoldilocksBuffer: vi.fn(),
  };
});

// Mock the registry to prevent side effects from other layer imports
vi.mock('../OrganismLayer', () => {
  class MockAbstractOrganismLayer {
    status = 'idle';
    currentLoad = 0;
    metrics = {
      invocations: 0,
      successRate: 1.0,
      avgDqScore: 0.85,
      avgLatencyMs: 0,
      tokenUsage: 0,
    };
    initialized = false;

    async initialize() {
      if (this.initialized) return;
      await (this as any).onInitialize();
      this.initialized = true;
      this.status = 'idle';
    }

    async shutdown() {
      if (!this.initialized) return;
      await (this as any).onShutdown();
      this.initialized = false;
      this.status = 'disabled';
    }

    async executeWithMetrics(task: any, handler: () => Promise<any>) {
      this.status = 'busy';
      this.metrics.invocations++;
      try {
        const result = await handler();
        this.status = 'idle';
        return result;
      } catch (error) {
        this.status = 'idle';
        return {
          success: false,
          output: null,
          dqScore: { score: 0, components: { validity: 0, specificity: 0, correctness: 0 }, isActionable: false, timestamp: Date.now() },
          metadata: { layerId: 'cognitive', latencyMs: 0, tokensUsed: 0 },
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    computeDQScore() {
      return {
        score: this.metrics.avgDqScore,
        components: { validity: this.metrics.successRate, specificity: 0.8, correctness: this.metrics.avgDqScore },
        isActionable: this.metrics.avgDqScore >= 0.8,
        timestamp: Date.now(),
      };
    }

    getBaseMetrics() {
      return { ...this.metrics };
    }
  }

  const mockRegistry = {
    register: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(() => []),
  };

  return {
    AbstractOrganismLayer: MockAbstractOrganismLayer,
    organismRegistry: mockRegistry,
  };
});

import type { OrganismTask } from '../../archon/types';

// Import after mocks
const { CognitiveLayer } = await import('../CognitiveLayer');
const { wakeSleepAgent } = await import('../cognitive/wakeSleep');
const { simpleMem } = await import('../cognitive/simpleMem');
const { goldilocksBuffer } = await import('../cognitive/goldilocksBuffer');

function makeTask(intent: string, contextPages: string[] = []): OrganismTask {
  return {
    id: 'test-task-1',
    intent,
    contextPages,
    createdAt: Date.now(),
  };
}

describe('CognitiveLayer', () => {
  let layer: InstanceType<typeof CognitiveLayer>;

  beforeEach(() => {
    vi.clearAllMocks();
    layer = new CognitiveLayer();
  });

  it('should have correct identity properties', () => {
    expect(layer.id).toBe('cognitive');
    expect(layer.name).toBe('Cognitive Cycles');
    expect(layer.layerType).toBe('cognitive');
    expect(layer.capabilities).toContain('memory-storage');
    expect(layer.capabilities).toContain('goldilocks-replay');
  });

  it('should initialize and start wake phase', async () => {
    await layer.initialize();
    expect(wakeSleepAgent.startWakePhase).toHaveBeenCalled();
  });

  it('should trigger sleep on shutdown if in wake phase', async () => {
    (wakeSleepAgent.getCurrentPhase as any).mockReturnValue('wake');
    await layer.initialize();
    await layer.shutdown();
    expect(wakeSleepAgent.triggerSleep).toHaveBeenCalledWith('manual');
  });

  it('should dispatch store operation', async () => {
    const rawEpisode = { id: 'ep-1', content: 'test content' };
    const task = makeTask('store:memory', [JSON.stringify(rawEpisode)]);
    const result = await layer.dispatch(task);

    expect(result.success).toBe(true);
    expect(simpleMem.compress).toHaveBeenCalledWith(rawEpisode);
    expect(wakeSleepAgent.processTask).toHaveBeenCalledWith(task);
    expect((result.metadata as any).operation).toBe('store');
  });

  it('should return error when store has no episode data', async () => {
    const task = makeTask('store:memory', []);
    const result = await layer.dispatch(task);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No episode data provided');
  });

  it('should dispatch retrieve operation', async () => {
    const query = { text: 'test query' };
    const intent = { type: 'search', priority: 0.5 };
    const task = makeTask('retrieve:memory', [JSON.stringify(query), JSON.stringify(intent)]);
    const result = await layer.dispatch(task);

    expect(result.success).toBe(true);
    expect(simpleMem.retrieve).toHaveBeenCalledWith(query, intent);
    expect((result.metadata as any).operation).toBe('retrieve');
  });

  it('should dispatch consolidate operation', async () => {
    const task = makeTask('consolidate');
    const result = await layer.dispatch(task);

    expect(result.success).toBe(true);
    expect(wakeSleepAgent.triggerSleep).toHaveBeenCalledWith('manual');
    expect((result.output as any).consolidated).toBe(true);
  });

  it('should dispatch replay operation with budget', async () => {
    const task = makeTask('replay', [JSON.stringify({ budget: 5 })]);
    const result = await layer.dispatch(task);

    expect(result.success).toBe(true);
    expect(goldilocksBuffer.selectForReplay).toHaveBeenCalled();
    expect((result.metadata as any).operation).toBe('replay');
  });

  it('should dispatch phase query', async () => {
    (wakeSleepAgent.getCurrentPhase as any).mockReturnValue('sleep');
    const task = makeTask('phase');
    const result = await layer.dispatch(task);

    expect(result.success).toBe(true);
    expect((result.output as any).phase).toBe('sleep');
  });

  it('should dispatch status operation', async () => {
    const task = makeTask('status');
    const result = await layer.dispatch(task);

    expect(result.success).toBe(true);
    const output = result.output as any;
    expect(output).toHaveProperty('currentPhase');
    expect(output).toHaveProperty('episodicBufferSize');
    expect(output).toHaveProperty('memoryStats');
    expect(output).toHaveProperty('goldilocksMetrics');
  });

  it('should return error for unknown operations', async () => {
    const task = makeTask('unknown_op');
    const result = await layer.dispatch(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown cognitive operation');
  });

  it('should return layer metrics with cognitive-specific fields', () => {
    const metrics = layer.getLayerMetrics();
    expect(metrics).toHaveProperty('episodesStored');
    expect(metrics).toHaveProperty('consolidationCycles');
    expect(metrics).toHaveProperty('forgettingRate');
    expect(metrics.invocations).toBe(0);
  });
});
