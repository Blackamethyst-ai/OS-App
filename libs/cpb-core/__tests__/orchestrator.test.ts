import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CognitivePrecisionBridge, createCPB, cpbExecute } from '../orchestrator';
import type { CPBProvider, CPBConfig, CPBStatus } from '../types';

// Mock router
vi.mock('../router', () => ({
  extractPathSignals: vi.fn(() => ({
    contextLength: 100,
    queryComplexity: 0.3,
    requiresConsensus: false,
    requiresReasoning: false,
    hasGroundTruth: false,
    timeBudgetMs: 45000,
    qualityTarget: 0.75,
  })),
  selectPath: vi.fn(() => ({
    path: 'direct',
    signals: {
      contextLength: 100,
      queryComplexity: 0.3,
      requiresConsensus: false,
      requiresReasoning: false,
      hasGroundTruth: false,
      timeBudgetMs: 45000,
      qualityTarget: 0.75,
    },
    reasoning: 'Simple query',
    confidence: 0.85,
    alternatives: [],
  })),
}));

// Mock feedbackAdapter
vi.mock('../feedbackAdapter', () => ({
  getLearnedRoutingFromFeedback: vi.fn(() => undefined),
}));

function createMockProvider(name = 'mock'): CPBProvider {
  return {
    name,
    generate: vi.fn(async () => 'mock response'),
    generateWithVision: vi.fn(async () => 'mock vision response'),
    isConfigured: vi.fn(() => true),
  };
}

describe('CognitivePrecisionBridge', () => {
  let mockProvider: CPBProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  it('constructs with providers', () => {
    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
    });
    expect(cpb).toBeInstanceOf(CognitivePrecisionBridge);
  });

  it('executes direct path and returns CPBResult', async () => {
    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
      enableVerification: false,
    });

    const result = await cpb.execute({ query: 'Hello world' });

    expect(result.output).toBe('mock response');
    expect(result.path).toBe('direct');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.dqScore).toBeDefined();
    expect(result.dqScore.overall).toBeGreaterThanOrEqual(0);
    expect(result.verified).toBe(false);
    expect(result.retryCount).toBe(0);
    expect(result.patternStored).toBe(false);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('calls onStatusUpdate callback during execution', async () => {
    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
      enableVerification: false,
    });

    const statuses: CPBStatus[] = [];
    await cpb.execute({ query: 'test' }, (s) => statuses.push({ ...s }));

    expect(statuses.length).toBeGreaterThanOrEqual(2);
    // First status should be analyzing
    expect(statuses[0].phase).toBe('analyzing');
    // Last status should be complete
    expect(statuses[statuses.length - 1].phase).toBe('complete');
  });

  it('respects forcePath override', async () => {
    const { selectPath } = await import('../router');
    // selectPath returns 'direct' but we force 'cascade'
    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
      enableVerification: false,
    });

    const result = await cpb.execute({ query: 'test', forcePath: 'cascade' });
    expect(result.path).toBe('cascade');
  });

  it('runs verification when enableVerification is true', async () => {
    (mockProvider.generate as ReturnType<typeof vi.fn>).mockResolvedValue(
      'VALIDITY:80 SPECIFICITY:70 CORRECTNESS:75'
    );

    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
      enableVerification: true,
    });

    const result = await cpb.execute({ query: 'test' });
    expect(result.verified).toBe(true);
    expect(result.dqScore.validity).toBe(80);
    expect(result.dqScore.specificity).toBe(70);
    expect(result.dqScore.correctness).toBe(75);
  });

  it('throws and reports error phase on provider failure', async () => {
    (mockProvider.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('API error')
    );

    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
      enableVerification: false,
    });

    const statuses: CPBStatus[] = [];
    await expect(
      cpb.execute({ query: 'fail' }, (s) => statuses.push({ ...s }))
    ).rejects.toThrow('API error');

    const errorStatus = statuses.find((s) => s.phase === 'error');
    expect(errorStatus).toBeDefined();
    expect(errorStatus?.message).toBe('API error');
  });

  it('throws when no provider is available for tier', () => {
    const cpb = new CognitivePrecisionBridge({
      providers: {},
    });

    expect(cpb.execute({ query: 'test' })).rejects.toThrow('No provider configured');
  });

  it('uses generateWithVision for multimodal requests', async () => {
    const cpb = new CognitivePrecisionBridge({
      providers: { fast: mockProvider, balanced: mockProvider, deep: mockProvider },
      enableVerification: false,
    });

    const result = await cpb.execute({
      query: 'describe this image',
      multimodal: {
        images: [{ base64: 'abc', mediaType: 'image/png' }],
      },
    });

    expect(mockProvider.generateWithVision).toHaveBeenCalled();
    expect(result.output).toBe('mock vision response');
  });
});

describe('createCPB', () => {
  it('returns a CognitivePrecisionBridge instance', () => {
    const provider = createMockProvider();
    const cpb = createCPB({ fast: provider });
    expect(cpb).toBeInstanceOf(CognitivePrecisionBridge);
  });
});

describe('cpbExecute', () => {
  it('creates CPB and executes in one call', async () => {
    const provider = createMockProvider();
    const result = await cpbExecute(
      { fast: provider, balanced: provider, deep: provider },
      'quick query'
    );
    expect(result.output).toBe('mock response');
    expect(result.path).toBe('direct');
  });
});
