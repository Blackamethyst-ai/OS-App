// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mocks ---
const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGetGeminiKey = vi.hoisted(() => vi.fn());
const mockHasGeminiKey = vi.hoisted(() => vi.fn());
const mockPromptForApiKey = vi.hoisted(() => vi.fn());
const mockRecordCall = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => {
  const MockGoogleGenAI = function(this: any) {
    this.models = { generateContent: mockGenerateContent };
  };
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {},
    Modality: {},
  };
});

vi.mock('../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock('../apiKeyService', () => ({
  apiKeyService: {
    getGeminiKey: mockGetGeminiKey,
    hasGeminiKey: mockHasGeminiKey,
  },
  promptForApiKey: mockPromptForApiKey,
}));

vi.mock('../apiUsageService', () => ({
  apiUsageService: {
    recordCall: mockRecordCall,
  },
}));

vi.mock('../agents', () => ({
  HIVE_AGENTS: [],
  AGENT_DNA_BUILDER: {},
  getAgent: vi.fn(),
  getAgentNames: vi.fn(() => []),
}));

vi.mock('../liveSession', () => ({
  liveSession: null,
}));

vi.mock('../../store', () => ({
  useAppStore: { getState: vi.fn(() => ({})) },
}));

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGeminiKey.mockReturnValue('test-api-key');
    mockHasGeminiKey.mockReturnValue(true);
  });

  describe('getAI', () => {
    it('should return a GoogleGenAI instance when API key is available', async () => {
      const { getAI } = await import('../geminiService');
      const ai = getAI();
      expect(ai).toBeDefined();
      expect(ai.models).toBeDefined();
    });

    it('should throw when no API key is configured', async () => {
      mockGetGeminiKey.mockReturnValue(null);
      // resetModules to clear the _missingKeyWarned flag
      vi.resetModules();
      const { getAI } = await import('../geminiService');
      expect(() => getAI()).toThrow('NO_API_KEY');
    });
  });

  describe('promptSelectKey', () => {
    it('should return true when key already exists', async () => {
      const { promptSelectKey } = await import('../geminiService');
      const result = await promptSelectKey();
      expect(result).toBe(true);
      expect(mockPromptForApiKey).not.toHaveBeenCalled();
    });

    it('should call promptForApiKey when no key exists', async () => {
      mockHasGeminiKey.mockReturnValue(false);
      mockPromptForApiKey.mockResolvedValue(true);
      const { promptSelectKey } = await import('../geminiService');
      const result = await promptSelectKey();
      expect(result).toBe(true);
      expect(mockPromptForApiKey).toHaveBeenCalled();
    });
  });

  describe('safeParseJson', () => {
    it('should parse valid JSON object string', async () => {
      const { safeParseJson } = await import('../geminiService');
      const result = safeParseJson<{ name: string }>('{"name": "test"}');
      expect(result).toEqual({ name: 'test' });
    });

    it('should parse JSON array string', async () => {
      const { safeParseJson } = await import('../geminiService');
      const result = safeParseJson<number[]>('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should extract JSON from surrounding text (markdown code blocks)', async () => {
      const { safeParseJson } = await import('../geminiService');
      const text = '```json\n{"action": "NAVIGATE", "target": "home"}\n```';
      const result = safeParseJson<{ action: string; target: string }>(text);
      expect(result).toEqual({ action: 'NAVIGATE', target: 'home' });
    });

    it('should throw on empty/undefined input', async () => {
      const { safeParseJson } = await import('../geminiService');
      expect(() => safeParseJson(undefined)).toThrow('EMPTY_SIGNAL');
      expect(() => safeParseJson('')).toThrow('EMPTY_SIGNAL');
    });

    it('should throw on invalid JSON', async () => {
      const { safeParseJson } = await import('../geminiService');
      expect(() => safeParseJson('not json at all')).toThrow('PARSER_CRITICAL');
    });

    it('should parse nested objects', async () => {
      const { safeParseJson } = await import('../geminiService');
      const result = safeParseJson<{ a: { b: number } }>('{"a": {"b": 42}}');
      expect(result).toEqual({ a: { b: 42 } });
    });

    it('should prefer object over array when object appears first', async () => {
      const { safeParseJson } = await import('../geminiService');
      const text = 'Here is the result: {"items": [1,2,3]}';
      const result = safeParseJson<{ items: number[] }>(text);
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('retryGeminiRequest', () => {
    it('should return result on successful first call', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn().mockResolvedValue({ text: 'success' });
      const result = await retryGeminiRequest(fn, 3, 10);
      expect(result).toEqual({ text: 'success' });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockRecordCall).toHaveBeenCalledWith('gemini-2.5-flash', true);
    });

    it('should retry on 429 rate limit errors', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValue({ text: 'ok' });
      const result = await retryGeminiRequest(fn, 3, 10);
      expect(result).toEqual({ text: 'ok' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server errors', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('500 Internal Server Error'))
        .mockResolvedValue({ text: 'recovered' });
      const result = await retryGeminiRequest(fn, 3, 10);
      expect(result).toEqual({ text: 'recovered' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 404 errors', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn().mockRejectedValue(new Error('404 Not Found'));
      await expect(retryGeminiRequest(fn, 3, 10)).rejects.toThrow('404');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 400/403 auth errors', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn().mockRejectedValue(new Error('403 Forbidden'));
      await expect(retryGeminiRequest(fn, 3, 10)).rejects.toThrow('403');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting all retries', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn().mockRejectedValue(new Error('429 Rate limited'));
      await expect(retryGeminiRequest(fn, 2, 10)).rejects.toThrow('429');
      // Initial call + 2 retries = 3 total
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should record failed API calls', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn().mockRejectedValue(new Error('404 Not Found'));
      await expect(retryGeminiRequest(fn, 3, 10)).rejects.toThrow();
      expect(mockRecordCall).toHaveBeenCalledWith('gemini-2.5-flash', false);
    });

    it('should retry on fetch failed errors', async () => {
      const { retryGeminiRequest } = await import('../geminiService');
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValue({ text: 'ok' });
      const result = await retryGeminiRequest(fn, 3, 10);
      expect(result).toEqual({ text: 'ok' });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateText', () => {
    it('should generate text and return the response', async () => {
      vi.resetModules();
      mockGetGeminiKey.mockReturnValue('test-api-key');
      mockGenerateContent.mockResolvedValue({ text: 'Hello, Sir.' });
      const { generateText } = await import('../geminiService');
      const result = await generateText('Hello', 'gemini-2.5-flash');
      expect(result).toBe('Hello, Sir.');
    });

    it('should return cached response on second identical call', async () => {
      vi.resetModules();
      mockGetGeminiKey.mockReturnValue('test-api-key');
      mockGenerateContent.mockResolvedValue({ text: 'Cached response' });
      const { generateText } = await import('../geminiService');
      await generateText('test prompt', 'gemini-2.5-flash');
      mockGenerateContent.mockClear();
      const result = await generateText('test prompt', 'gemini-2.5-flash');
      expect(result).toBe('Cached response');
      // Should not have called the API again
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  describe('SOVEREIGN_SYSTEM_INSTRUCTION', () => {
    it('should be a non-empty string', async () => {
      const { SOVEREIGN_SYSTEM_INSTRUCTION } = await import('../geminiService');
      expect(typeof SOVEREIGN_SYSTEM_INSTRUCTION).toBe('string');
      expect(SOVEREIGN_SYSTEM_INSTRUCTION.length).toBeGreaterThan(100);
      expect(SOVEREIGN_SYSTEM_INSTRUCTION).toContain('SOVEREIGN OS');
    });
  });
});
