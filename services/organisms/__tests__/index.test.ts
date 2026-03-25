import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock all three layer singletons
vi.mock('../GenomeLayer', () => {
  const mockLayer = {
    id: 'genome',
    name: 'Agent Genome',
    layerType: 'genome',
    capabilities: ['skill-registration'],
    status: 'idle',
    currentLoad: 0,
    initialized: false,
    metrics: { invocations: 5, successRate: 0.9, avgDqScore: 0.85, avgLatencyMs: 100, tokenUsage: 500 },
    initialize: vi.fn(async () => { mockLayer.initialized = true; }),
    shutdown: vi.fn(async () => { mockLayer.initialized = false; }),
    dispatch: vi.fn(),
    getLayerMetrics: vi.fn(() => ({ invocations: 5, successRate: 0.9, avgDqScore: 0.85, avgLatencyMs: 100, tokenUsage: 500 })),
    computeDQScore: vi.fn(),
    onBiometricChange: vi.fn(),
    onMCPContext: vi.fn(),
  };
  return { GenomeLayer: vi.fn(), genomeLayer: mockLayer };
});

vi.mock('../SwarmLayer', () => {
  const mockLayer = {
    id: 'swarm',
    name: 'Swarm Orchestration',
    layerType: 'swarm',
    capabilities: ['team-routing'],
    status: 'idle',
    currentLoad: 0,
    initialized: false,
    metrics: { invocations: 3, successRate: 0.95, avgDqScore: 0.88, avgLatencyMs: 80, tokenUsage: 300 },
    initialize: vi.fn(async () => { mockLayer.initialized = true; }),
    shutdown: vi.fn(async () => { mockLayer.initialized = false; }),
    dispatch: vi.fn(),
    getLayerMetrics: vi.fn(() => ({ invocations: 3, successRate: 0.95, avgDqScore: 0.88, avgLatencyMs: 80, tokenUsage: 300 })),
    computeDQScore: vi.fn(),
    onBiometricChange: vi.fn(),
    onMCPContext: vi.fn(),
  };
  return { SwarmLayer: vi.fn(), swarmLayer: mockLayer };
});

vi.mock('../CognitiveLayer', () => {
  const mockLayer = {
    id: 'cognitive',
    name: 'Cognitive Cycles',
    layerType: 'cognitive',
    capabilities: ['memory-storage'],
    status: 'idle',
    currentLoad: 0,
    initialized: false,
    metrics: { invocations: 7, successRate: 0.92, avgDqScore: 0.82, avgLatencyMs: 120, tokenUsage: 700 },
    initialize: vi.fn(async () => { mockLayer.initialized = true; }),
    shutdown: vi.fn(async () => { mockLayer.initialized = false; }),
    dispatch: vi.fn(),
    getLayerMetrics: vi.fn(() => ({ invocations: 7, successRate: 0.92, avgDqScore: 0.82, avgLatencyMs: 120, tokenUsage: 700 })),
    computeDQScore: vi.fn(),
    onBiometricChange: vi.fn(),
    onMCPContext: vi.fn(),
  };
  return { CognitiveLayer: vi.fn(), cognitiveLayer: mockLayer };
});

// Mock OrganismLayer
vi.mock('../OrganismLayer', () => {
  class MockAbstractOrganismLayer {}
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

// Mock submodule re-exports to prevent deep imports from failing
vi.mock('../genome/types', () => ({}));
vi.mock('../genome/codec', () => ({
  SkillGenomeCodec: vi.fn(),
  skillGenomeCodec: {},
  serializeSkill: vi.fn(),
  deserializeSkill: vi.fn(),
  validateSkill: vi.fn(),
  computeSkillChecksum: vi.fn(),
}));
vi.mock('../genome/mcpServer', () => ({
  MCPSkillServer: vi.fn(),
  mcpSkillServer: {},
  registerSkill: vi.fn(),
  listSkills: vi.fn(),
  readSkill: vi.fn(),
  exposeAsTool: vi.fn(),
}));
vi.mock('../genome/portableTransfer', () => ({
  PortableSkillTransfer: vi.fn(),
  portableSkillTransfer: {},
  decomposeSkill: vi.fn(),
  exportSkill: vi.fn(),
  importSkill: vi.fn(),
  verifySkillCompatibility: vi.fn(),
  calculateSkillSimilarity: vi.fn(),
}));
vi.mock('../genome/skillWeaver', () => ({
  SkillWeaver: vi.fn(),
  InMemorySkillRegistry: vi.fn(),
  createSkillWeaver: vi.fn(),
}));
vi.mock('../genome/supabaseSkillRegistry', () => ({
  SupabaseSkillRegistry: vi.fn(),
}));
vi.mock('../swarm/adaptiveMoE', () => ({
  AdaptiveExpertMixture: vi.fn(),
  adaptiveMoE: {},
  createAdaptiveMoE: vi.fn(),
}));
vi.mock('../swarm/stigmergy', () => ({
  StigmergicEnvironment: vi.fn(),
  stigmergicEnvironment: {},
  createStigmergicEnvironment: vi.fn(),
}));
vi.mock('../swarm/aceIntegration', () => ({
  ACEIntegration: vi.fn(),
  aceIntegration: {},
  createACEIntegration: vi.fn(),
  connectToACE: vi.fn(),
  enrichAuctionWithStigmergy: vi.fn(),
  recordACEConsensus: vi.fn(),
  getSwarmPriors: vi.fn(),
}));
vi.mock('../cognitive/wakeSleep', () => ({
  WakeSleepAgent: vi.fn(),
  wakeSleepAgent: {},
  createWakeSleepAgent: vi.fn(),
}));
vi.mock('../cognitive/simpleMem', () => ({
  SimpleMem: vi.fn(),
  simpleMem: {},
  createSimpleMem: vi.fn(),
}));
vi.mock('../cognitive/goldilocksBuffer', () => ({
  GoldilocksBuffer: vi.fn(),
  goldilocksBuffer: {},
  createGoldilocksBuffer: vi.fn(),
}));
vi.mock('../cognitive/storageIntegration', () => ({
  CognitiveStorageIntegration: vi.fn(),
  cognitiveStorage: {},
  createCognitiveStorage: vi.fn(),
  SQL_SCHEMA: '',
}));
vi.mock('../integration/biometricHooks', () => ({
  BiometricHooks: vi.fn(),
  biometricHooks: {},
  createBiometricHooks: vi.fn(),
  registerOrganismLayers: vi.fn(),
  onBiometricUpdate: vi.fn(),
  adjustSwarmBehavior: vi.fn(),
  triggerConsolidation: vi.fn(),
}));
vi.mock('../../archon/types', () => ({
  isOrganismLayer: vi.fn(),
  ORGANISM_LAYERS: ['genome', 'swarm', 'cognitive'],
  ORGANISM_BUDGET_RATIOS: {},
}));

const { createLayerFactory, layerFactory } = await import('../index');

describe('createLayerFactory', () => {
  it('should create a factory with three layers', () => {
    const factory = createLayerFactory();
    expect(factory.layers.size).toBe(3);
    expect(factory.layers.has('genome')).toBe(true);
    expect(factory.layers.has('swarm')).toBe(true);
    expect(factory.layers.has('cognitive')).toBe(true);
  });

  it('should return layers by type via getLayer', () => {
    const factory = createLayerFactory();
    const genome = factory.getLayer('genome');
    expect(genome).toBeDefined();
    expect((genome as any).id).toBe('genome');

    const swarm = factory.getLayer('swarm');
    expect(swarm).toBeDefined();
    expect((swarm as any).id).toBe('swarm');

    const cognitive = factory.getLayer('cognitive');
    expect(cognitive).toBeDefined();
    expect((cognitive as any).id).toBe('cognitive');
  });

  it('should initialize all layers', async () => {
    const factory = createLayerFactory();
    await factory.initialize();

    const genome = factory.getLayer('genome') as any;
    const swarm = factory.getLayer('swarm') as any;
    const cognitive = factory.getLayer('cognitive') as any;

    expect(genome.initialize).toHaveBeenCalled();
    expect(swarm.initialize).toHaveBeenCalled();
    expect(cognitive.initialize).toHaveBeenCalled();
  });

  it('should shutdown all layers', async () => {
    const factory = createLayerFactory();
    await factory.shutdown();

    const genome = factory.getLayer('genome') as any;
    const swarm = factory.getLayer('swarm') as any;
    const cognitive = factory.getLayer('cognitive') as any;

    expect(genome.shutdown).toHaveBeenCalled();
    expect(swarm.shutdown).toHaveBeenCalled();
    expect(cognitive.shutdown).toHaveBeenCalled();
  });

  it('should aggregate metrics from all layers', () => {
    const factory = createLayerFactory();
    const metrics = factory.getAggregateMetrics();

    expect(metrics).toHaveProperty('genome');
    expect(metrics).toHaveProperty('swarm');
    expect(metrics).toHaveProperty('cognitive');
    expect(metrics.genome.invocations).toBe(5);
    expect(metrics.swarm.invocations).toBe(3);
    expect(metrics.cognitive.invocations).toBe(7);
  });

  it('should handle initialization errors gracefully', async () => {
    const factory = createLayerFactory();
    const genome = factory.getLayer('genome') as any;
    genome.initialize.mockRejectedValueOnce(new Error('init failed'));

    // Should not throw
    await expect(factory.initialize()).resolves.toBeUndefined();
  });
});

describe('layerFactory (default instance)', () => {
  it('should be a valid factory instance', () => {
    expect(layerFactory).toBeDefined();
    expect(layerFactory.layers.size).toBe(3);
    expect(typeof layerFactory.initialize).toBe('function');
    expect(typeof layerFactory.shutdown).toBe('function');
    expect(typeof layerFactory.getLayer).toBe('function');
    expect(typeof layerFactory.getAggregateMetrics).toBe('function');
  });
});
