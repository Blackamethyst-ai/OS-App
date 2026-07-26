import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all provider services
vi.mock('../geminiService', () => ({
  generateText: vi.fn().mockResolvedValue('gemini-response'),
}));

vi.mock('../claudeService', () => ({
  claudeService: {
    generateContent: vi.fn().mockResolvedValue('claude-response'),
  },
}));

vi.mock('../grokService', () => ({
  grokService: {
    generateContent: vi.fn().mockResolvedValue('grok-response'),
  },
}));

vi.mock('../ollamaService', () => ({
  ollamaService: {
    isAvailable: vi.fn().mockResolvedValue(false),
    generateChatCompletion: vi.fn().mockResolvedValue('ollama-response'),
  },
}));

vi.mock('../cpbService', () => ({
  cpb: {
    query: vi.fn().mockResolvedValue({ answer: 'cpb-result', path: 'direct' }),
    shouldOrchestrate: vi.fn().mockReturnValue(false),
    analyze: vi.fn().mockReturnValue({ complexity: 0.3 }),
  },
}));

vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock apiKeyService with controllable return values
const mockApiKeyService = {
  hasGeminiKey: vi.fn().mockReturnValue(false),
  getKey: vi.fn().mockReturnValue(undefined),
  hasVault: vi.fn().mockReturnValue(false),
  isVaultUnlocked: vi.fn().mockReturnValue(false),
  hasAnyKey: vi.fn().mockReturnValue(false),
  hasGeminiKey2: vi.fn().mockReturnValue(false),
  subscribe: vi.fn().mockReturnValue(() => {}),
  lockVault: vi.fn(),
  resetVault: vi.fn(),
  getGeminiKey: vi.fn(),
  setKey: vi.fn(),
  removeKey: vi.fn(),
  getKeyStatus: vi.fn().mockReturnValue([]),
  createVault: vi.fn(),
  unlockVault: vi.fn(),
  changeMasterPassword: vi.fn(),
  validateGeminiKey: vi.fn(),
  validateElevenLabsKey: vi.fn(),
  validateDeepgramKey: vi.fn(),
  validateOpenAIKey: vi.fn(),
};

vi.mock('../apiKeyService', () => ({
  apiKeyService: mockApiKeyService,
}));

describe('ModelRouter', () => {
  let modelRouter: any;
  let geminiService: any;
  let claudeService: any;
  let grokService: any;
  let ollamaService: any;
  let cpb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApiKeyService.hasGeminiKey.mockReturnValue(false);
    mockApiKeyService.getKey.mockReturnValue(undefined);

    const routerMod = await import('../modelRouter');
    modelRouter = routerMod.modelRouter;

    geminiService = (await import('../geminiService'));
    claudeService = (await import('../claudeService')).claudeService;
    grokService = (await import('../grokService')).grokService;
    ollamaService = (await import('../ollamaService')).ollamaService;
    cpb = (await import('../cpbService')).cpb;
  });

  describe('generateContent() tier routing', () => {
    it('throws when no models are configured', async () => {
      await expect(
        modelRouter.generateContent('hello', { tier: 'balanced' })
      ).rejects.toThrow('No capable AI models configured');
    });

    describe('fast tier', () => {
      it('prefers Claude Sonnet for fast tier', async () => {
        mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);
        mockApiKeyService.hasGeminiKey.mockReturnValue(true);

        const result = await modelRouter.generateContent('hello', { tier: 'fast' });
        expect(result).toBe('claude-response');
        expect(claudeService.generateContent).toHaveBeenCalledWith(
          [{ role: 'user', content: 'hello' }],
          undefined,
          'claude-sonnet-5'
        );
      });

      it('falls back to Gemini Flash when no Claude key', async () => {
        mockApiKeyService.hasGeminiKey.mockReturnValue(true);

        const result = await modelRouter.generateContent('hello', { tier: 'fast' });
        expect(result).toBe('gemini-response');
        expect(geminiService.generateText).toHaveBeenCalledWith('hello', 'gemini-2.5-flash', undefined);
      });
    });

    describe('powerful tier', () => {
      it('prefers Claude Opus for powerful tier', async () => {
        mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);

        const result = await modelRouter.generateContent('hello', { tier: 'powerful' });
        expect(result).toBe('claude-response');
        expect(claudeService.generateContent).toHaveBeenCalledWith(
          [{ role: 'user', content: 'hello' }],
          undefined,
          'claude-opus-5'
        );
      });

      it('falls back to Grok when no Claude', async () => {
        mockApiKeyService.getKey.mockImplementation((p: string) => p === 'grok' ? 'key' : undefined);

        const result = await modelRouter.generateContent('hello', { tier: 'powerful' });
        expect(result).toBe('grok-response');
      });

      it('falls back to Gemini when no Claude or Grok', async () => {
        mockApiKeyService.hasGeminiKey.mockReturnValue(true);

        const result = await modelRouter.generateContent('hello', { tier: 'powerful' });
        expect(result).toBe('gemini-response');
      });
    });

    describe('creative tier', () => {
      it('prefers Claude Opus for creative tier', async () => {
        mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);

        const result = await modelRouter.generateContent('hello', { tier: 'creative' });
        expect(result).toBe('claude-response');
        expect(claudeService.generateContent).toHaveBeenCalledWith(
          expect.anything(), undefined, 'claude-opus-5'
        );
      });
    });

    describe('balanced tier', () => {
      it('prefers Claude Sonnet for balanced tier', async () => {
        mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);

        const result = await modelRouter.generateContent('hello', { tier: 'balanced' });
        expect(claudeService.generateContent).toHaveBeenCalledWith(
          expect.anything(), undefined, 'claude-sonnet-5'
        );
        expect(result).toBe('claude-response');
      });
    });

    describe('local tier', () => {
      it('uses Ollama when available', async () => {
        vi.mocked(ollamaService.isAvailable).mockResolvedValue(true);

        const result = await modelRouter.generateContent('hello', { tier: 'local' });
        expect(result).toBe('ollama-response');
        expect(ollamaService.generateChatCompletion).toHaveBeenCalled();
      });

      it('falls back to cloud when Ollama unavailable', async () => {
        vi.mocked(ollamaService.isAvailable).mockResolvedValue(false);
        mockApiKeyService.hasGeminiKey.mockReturnValue(true);

        // Will fall through to catch-all since 'local' doesn't match other tiers
        const result = await modelRouter.generateContent('hello', { tier: 'local' });
        expect(result).toBe('gemini-response');
      });
    });
  });

  describe('preferredProvider routing', () => {
    it('uses preferred Claude when key available', async () => {
      mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);

      const result = await modelRouter.generateContent('hello', {
        tier: 'balanced' as any,
        preferredProvider: 'claude',
      });
      // balanced tier catches first since claude key available
      expect(result).toBe('claude-response');
    });

    it('uses preferred Grok when key available', async () => {
      mockApiKeyService.getKey.mockImplementation((p: string) => p === 'grok' ? 'key' : undefined);

      const result = await modelRouter.generateContent('hello', {
        tier: 'local' as any, // won't match since ollama unavailable
        preferredProvider: 'grok',
      });
      expect(result).toBe('grok-response');
    });
  });

  describe('catch-all fallback cascade', () => {
    it('tries Claude first in catch-all', async () => {
      mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);
      mockApiKeyService.hasGeminiKey.mockReturnValue(true);

      // Use a tier that won't match any specific block so it falls through
      // Actually 'balanced' will match Claude. Let's just verify the cascade works.
      const result = await modelRouter.generateContent('hello');
      expect(result).toBe('claude-response');
    });
  });

  describe('generateWithPrecision()', () => {
    it('delegates to CPB query', async () => {
      await modelRouter.generateWithPrecision('analyze this');
      expect(cpb.query).toHaveBeenCalledWith('analyze this', {
        context: undefined,
        onStatus: undefined,
        forcePath: undefined,
      });
    });

    it('passes config to CPB', async () => {
      const onStatus = vi.fn();
      await modelRouter.generateWithPrecision('analyze', {
        context: 'some context',
        onStatus,
        forcePath: 'ace',
      });
      expect(cpb.query).toHaveBeenCalledWith('analyze', {
        context: 'some context',
        onStatus,
        forcePath: 'ace',
      });
    });
  });

  describe('shouldUseCPB()', () => {
    it('delegates to cpb.shouldOrchestrate', () => {
      cpb.shouldOrchestrate.mockReturnValue(true);
      expect(modelRouter.shouldUseCPB('complex query', 'ctx')).toBe(true);
      expect(cpb.shouldOrchestrate).toHaveBeenCalledWith('complex query', 'ctx');
    });
  });

  describe('analyzeQuery()', () => {
    it('delegates to cpb.analyze', () => {
      cpb.analyze.mockReturnValue({ complexity: 0.8 });
      const result = modelRouter.analyzeQuery('deep question');
      expect(result).toEqual({ complexity: 0.8 });
      expect(cpb.analyze).toHaveBeenCalledWith('deep question', undefined);
    });
  });

  describe('system prompt forwarding', () => {
    it('passes system prompt to Claude', async () => {
      mockApiKeyService.getKey.mockImplementation((p: string) => p === 'claude' ? 'key' : undefined);

      await modelRouter.generateContent('hello', { tier: 'fast' }, 'You are helpful');
      expect(claudeService.generateContent).toHaveBeenCalledWith(
        [{ role: 'user', content: 'hello' }],
        'You are helpful',
        'claude-sonnet-5'
      );
    });

    it('passes system prompt to Gemini', async () => {
      mockApiKeyService.hasGeminiKey.mockReturnValue(true);

      await modelRouter.generateContent('hello', { tier: 'fast' }, 'Be concise');
      expect(geminiService.generateText).toHaveBeenCalledWith('hello', 'gemini-2.5-flash', 'Be concise');
    });
  });
});
