// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockExecute,
  mockExtractPathSignals,
  mockSelectPath,
  mockCanUseDirectPath,
  mockNeedsRLMPath,
  mockWouldBenefitFromConsensus,
  mockCreateCPB,
} = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return {
    mockExecute,
    mockExtractPathSignals: vi.fn(),
    mockSelectPath: vi.fn(),
    mockCanUseDirectPath: vi.fn(),
    mockNeedsRLMPath: vi.fn(),
    mockWouldBenefitFromConsensus: vi.fn(),
    mockCreateCPB: vi.fn(() => ({ execute: mockExecute })),
  };
});

vi.mock('@metaventionsai/cpb-core', () => ({
  createCPB: mockCreateCPB,
  extractPathSignals: mockExtractPathSignals,
  selectPath: mockSelectPath,
  canUseDirectPath: mockCanUseDirectPath,
  needsRLMPath: mockNeedsRLMPath,
  wouldBenefitFromConsensus: mockWouldBenefitFromConsensus,
}));

vi.mock('../cpbProviders', () => ({
  defaultProviders: { gemini: 'mock-provider' },
}));

import { cpb } from '../cpbService';

describe('cpbService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query', () => {
    it('should execute with auto-routing when no options provided', async () => {
      const mockResult = { answer: 'test', path: 'direct' };
      mockExecute.mockResolvedValue(mockResult);

      const result = await cpb.query('Hello world');

      expect(mockExecute).toHaveBeenCalledWith(
        {
          query: 'Hello world',
          context: undefined,
          multimodal: undefined,
          forcePath: undefined,
          timeBudgetMs: undefined,
        },
        undefined
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass context and forcePath options', async () => {
      mockExecute.mockResolvedValue({});

      await cpb.query('Analyze this', {
        context: 'some code',
        forcePath: 'ace' as any,
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Analyze this',
          context: 'some code',
          forcePath: 'ace',
        }),
        undefined
      );
    });

    it('should pass images as multimodal input', async () => {
      mockExecute.mockResolvedValue({});
      const images = [{ data: 'base64data', mimeType: 'image/png' }] as any;

      await cpb.query('Describe image', { images });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          multimodal: { images },
        }),
        undefined
      );
    });

    it('should pass onStatus callback and timeout', async () => {
      mockExecute.mockResolvedValue({});
      const onStatus = vi.fn();

      await cpb.query('Long task', { onStatus, timeout: 30000 });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          timeBudgetMs: 30000,
        }),
        onStatus
      );
    });
  });

  describe('fast', () => {
    it('should force direct path', async () => {
      mockExecute.mockResolvedValue({ answer: 'quick' });

      await cpb.fast('What time is it?', 'context');

      expect(mockExecute).toHaveBeenCalledWith(
        { query: 'What time is it?', context: 'context', forcePath: 'direct' },
        undefined
      );
    });

    it('should pass onStatus callback', async () => {
      mockExecute.mockResolvedValue({});
      const cb = vi.fn();

      await cpb.fast('Quick question', undefined, cb);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ forcePath: 'direct' }),
        cb
      );
    });
  });

  describe('deep', () => {
    it('should force rlm path for long context', async () => {
      mockExecute.mockResolvedValue({});

      await cpb.deep('Analyze document', 'very long context...');

      expect(mockExecute).toHaveBeenCalledWith(
        { query: 'Analyze document', context: 'very long context...', forcePath: 'rlm' },
        undefined
      );
    });
  });

  describe('consensus', () => {
    it('should force ace path for consensus', async () => {
      mockExecute.mockResolvedValue({});

      await cpb.consensus('Architecture decision');

      expect(mockExecute).toHaveBeenCalledWith(
        { query: 'Architecture decision', context: undefined, forcePath: 'ace' },
        undefined
      );
    });
  });

  describe('hybrid', () => {
    it('should force hybrid path', async () => {
      mockExecute.mockResolvedValue({});

      await cpb.hybrid('Complex task', 'large context');

      expect(mockExecute).toHaveBeenCalledWith(
        { query: 'Complex task', context: 'large context', forcePath: 'hybrid' },
        undefined
      );
    });
  });

  describe('cascade', () => {
    it('should force cascade path for critical decisions', async () => {
      mockExecute.mockResolvedValue({});

      await cpb.cascade('Production deploy decision');

      expect(mockExecute).toHaveBeenCalledWith(
        { query: 'Production deploy decision', context: undefined, forcePath: 'cascade' },
        undefined
      );
    });
  });

  describe('analyze', () => {
    it('should extract signals and select path without executing', () => {
      const signals = { complexity: 'high', tokenCount: 5000 };
      const decision = {
        path: 'ace',
        reasoning: 'Complex analysis needed',
        confidence: 0.85,
        alternatives: ['hybrid'],
      };
      mockExtractPathSignals.mockReturnValue(signals);
      mockSelectPath.mockReturnValue(decision);

      const result = cpb.analyze('Complex query', 'some context');

      expect(mockExtractPathSignals).toHaveBeenCalledWith('Complex query', 'some context');
      expect(mockSelectPath).toHaveBeenCalledWith(signals);
      expect(result).toEqual({
        path: 'ace',
        reasoning: 'Complex analysis needed',
        confidence: 0.85,
        alternatives: ['hybrid'],
        signals,
      });
    });

    it('should use empty string for missing context', () => {
      mockExtractPathSignals.mockReturnValue({});
      mockSelectPath.mockReturnValue({ path: 'direct', reasoning: '', confidence: 1, alternatives: [] });

      cpb.analyze('Simple query');

      expect(mockExtractPathSignals).toHaveBeenCalledWith('Simple query', '');
    });
  });

  describe('shouldOrchestrate', () => {
    it('should return true when direct path is not suitable', () => {
      mockCanUseDirectPath.mockReturnValue(false);

      expect(cpb.shouldOrchestrate('Complex analysis')).toBe(true);
      expect(mockCanUseDirectPath).toHaveBeenCalledWith('Complex analysis', undefined);
    });

    it('should return false when direct path is sufficient', () => {
      mockCanUseDirectPath.mockReturnValue(true);

      expect(cpb.shouldOrchestrate('Navigate home')).toBe(false);
    });
  });

  describe('needsCompression', () => {
    it('should delegate to needsRLMPath', () => {
      mockNeedsRLMPath.mockReturnValue(true);

      expect(cpb.needsCompression('query', 'very long context')).toBe(true);
      expect(mockNeedsRLMPath).toHaveBeenCalledWith('query', 'very long context');
    });
  });

  describe('wouldBenefitFromConsensus', () => {
    it('should delegate to wouldBenefitFromConsensus from cpb-core', () => {
      mockWouldBenefitFromConsensus.mockReturnValue(true);

      expect(cpb.wouldBenefitFromConsensus('Architecture review')).toBe(true);
      expect(mockWouldBenefitFromConsensus).toHaveBeenCalledWith('Architecture review', undefined);
    });
  });

  describe('getInstance', () => {
    it('should return the underlying CPB instance', () => {
      const instance = cpb.getInstance();

      expect(instance).toHaveProperty('execute');
      expect(instance.execute).toBe(mockExecute);
    });
  });
});
