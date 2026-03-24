// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGenerateContent = vi.fn();

vi.mock('../modelRouter', () => ({
  modelRouter: {
    generateContent: (...args: any[]) => mockGenerateContent(...args),
  },
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../store', () => ({
  useAppStore: { getState: vi.fn() },
}));

vi.mock('../../types', () => ({
  InterventionProtocol: {},
}));

import { metaventionService } from '../metaventionService';

describe('MetaventionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeLayer', () => {
    it('should parse valid JSON response for a known layer', async () => {
      const mockResult = JSON.stringify({
        integrity: 92,
        threats: ['latency spike'],
        opportunities: ['edge caching'],
      });
      mockGenerateContent.mockResolvedValue(mockResult);

      const result = await metaventionService.analyzeLayer('LAYER_DEPIN');

      expect(result.integrity).toBe(92);
      expect(result.threats).toContain('latency spike');
      expect(result.opportunities).toContain('edge caching');
    });

    it('should call modelRouter with powerful tier', async () => {
      mockGenerateContent.mockResolvedValue('{"integrity":50,"threats":[],"opportunities":[]}');

      await metaventionService.analyzeLayer('LAYER_AI');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('strategic intelligence'),
        { tier: 'powerful' }
      );
    });

    it('should use fallback prompt for unknown layer', async () => {
      mockGenerateContent.mockResolvedValue('{"integrity":50,"threats":[],"opportunities":[]}');

      await metaventionService.analyzeLayer('UNKNOWN_LAYER');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('system entropy'),
        { tier: 'powerful' }
      );
    });

    it('should strip markdown code blocks from response', async () => {
      mockGenerateContent.mockResolvedValue(
        '```json\n{"integrity":75,"threats":["a"],"opportunities":["b"]}\n```'
      );

      const result = await metaventionService.analyzeLayer('LAYER_FINANCE');

      expect(result.integrity).toBe(75);
    });

    it('should return fallback result on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API timeout'));

      const result = await metaventionService.analyzeLayer('LAYER_DEPIN');

      expect(result.integrity).toBe(85.0);
      expect(result.threats).toContain('Analysis link unstable');
      expect(result.opportunities).toContain('Retry connection');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should return fallback result on invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue('not valid json');

      const result = await metaventionService.analyzeLayer('LAYER_AI');

      expect(result.integrity).toBe(85.0);
    });

    it('should use LAYER_FINANCE prompt for finance layer', async () => {
      mockGenerateContent.mockResolvedValue('{"integrity":60,"threats":[],"opportunities":[]}');

      await metaventionService.analyzeLayer('LAYER_FINANCE');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('economic capital flow'),
        expect.any(Object)
      );
    });
  });

  describe('generateStrategy', () => {
    it('should return protocol with generated id', async () => {
      const mockProtocol = JSON.stringify({
        id: 'will-be-replaced',
        title: 'Optimize DePIN',
        context: 'High latency detected',
        logic: 'Redistribute nodes',
        steps: ['Step 1', 'Step 2'],
        physicalImpact: 'Reduced latency by 40%',
        timestamp: 123,
      });
      mockGenerateContent.mockResolvedValue(mockProtocol);

      const result = await metaventionService.generateStrategy('LAYER_DEPIN', 'high latency');

      expect(result.id).toMatch(/^proto-\d+$/);
      expect(result.title).toBe('Optimize DePIN');
      expect(result.steps).toHaveLength(2);
    });

    it('should call modelRouter with creative tier', async () => {
      mockGenerateContent.mockResolvedValue(
        '{"id":"x","title":"T","context":"C","logic":"L","steps":[],"physicalImpact":"P","timestamp":0}'
      );

      await metaventionService.generateStrategy('LAYER_AI', 'context');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('LAYER_AI'),
        { tier: 'creative' }
      );
    });

    it('should strip markdown code blocks from strategy response', async () => {
      mockGenerateContent.mockResolvedValue(
        '```json\n{"id":"x","title":"T","context":"C","logic":"L","steps":["a"],"physicalImpact":"P","timestamp":0}\n```'
      );

      const result = await metaventionService.generateStrategy('LAYER_DEPIN', 'ctx');

      expect(result.title).toBe('T');
    });

    it('should throw on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('network fail'));

      await expect(metaventionService.generateStrategy('LAYER_AI', 'ctx')).rejects.toThrow(
        'Failed to synthesize protocol.'
      );
    });

    it('should throw on invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue('invalid json here');

      await expect(metaventionService.generateStrategy('LAYER_AI', 'ctx')).rejects.toThrow(
        'Failed to synthesize protocol.'
      );
    });

    it('should include context in prompt', async () => {
      mockGenerateContent.mockResolvedValue(
        '{"id":"x","title":"T","context":"C","logic":"L","steps":[],"physicalImpact":"P","timestamp":0}'
      );

      await metaventionService.generateStrategy('LAYER_FINANCE', 'yield dropping');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('yield dropping'),
        expect.any(Object)
      );
    });
  });
});
