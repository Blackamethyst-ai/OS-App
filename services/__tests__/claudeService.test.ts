// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Hoisted mocks ---
const mockGetKey = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('../apiKeyService', () => ({
  apiKeyService: {
    getKey: mockGetKey,
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

import { claudeService } from '../claudeService';

describe('ClaudeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      mockGetKey.mockReturnValue('sk-test-key');
      expect(claudeService.isConfigured()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      mockGetKey.mockReturnValue(null);
      expect(claudeService.isConfigured()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      mockGetKey.mockReturnValue('');
      expect(claudeService.isConfigured()).toBe(false);
    });
  });

  describe('generateContent', () => {
    it('should throw when API key is missing', async () => {
      mockGetKey.mockReturnValue(null);
      await expect(
        claudeService.generateContent([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Claude API key not found');
    });

    it('should return text from successful API response', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: 'Hello from Claude' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const result = await claudeService.generateContent([
        { role: 'user', content: 'Hello' },
      ]);
      expect(result).toBe('Hello from Claude');
    });

    it('should send correct headers and body', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: 'response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await claudeService.generateContent(
        [{ role: 'user', content: 'Hi' }],
        'You are helpful',
        'claude-sonnet-4-6'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-test-key',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerously-allow-browser': 'true',
          }),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('claude-sonnet-4-6');
      expect(body.system).toBe('You are helpful');
      expect(body.max_tokens).toBe(4096);
      expect(body.temperature).toBe(0.7);
    });

    it('should throw on non-ok response', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'unauthorized' }),
      });

      await expect(
        claudeService.generateContent([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Claude API Error: 401');
    });

    it('should return empty string when content array is empty', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [],
          usage: { input_tokens: 10, output_tokens: 0 },
        }),
      });

      const result = await claudeService.generateContent([
        { role: 'user', content: 'Hello' },
      ]);
      expect(result).toBe('');
    });

    it('should use default model when not specified', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: 'response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await claudeService.generateContent([{ role: 'user', content: 'Hi' }]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('claude-sonnet-4-6');
    });
  });

  describe('generateVision', () => {
    it('should throw when API key is missing', async () => {
      mockGetKey.mockReturnValue(null);
      await expect(
        claudeService.generateVision('Describe this', 'base64data')
      ).rejects.toThrow('Claude API key not found');
    });

    it('should return text from successful vision response', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: 'I see a cat' }],
          usage: { input_tokens: 100, output_tokens: 10 },
        }),
      });

      const result = await claudeService.generateVision('Describe this', 'base64data');
      expect(result).toBe('I see a cat');
    });

    it('should send image content block with correct media type', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: 'description' }],
          usage: { input_tokens: 100, output_tokens: 10 },
        }),
      });

      await claudeService.generateVision('Describe', 'imgdata', 'image/jpeg');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].content[0].type).toBe('image');
      expect(body.messages[0].content[0].source.media_type).toBe('image/jpeg');
      expect(body.messages[0].content[0].source.data).toBe('imgdata');
      expect(body.messages[0].content[1].type).toBe('text');
      expect(body.messages[0].content[1].text).toBe('Describe');
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(1024);
    });

    it('should throw on non-ok vision response', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'server error' }),
      });

      await expect(
        claudeService.generateVision('Describe', 'imgdata')
      ).rejects.toThrow('Claude Vision API Error: 500');
    });

    it('should return empty string when vision content is empty', async () => {
      mockGetKey.mockReturnValue('sk-test-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [],
          usage: { input_tokens: 100, output_tokens: 0 },
        }),
      });

      const result = await claudeService.generateVision('Describe', 'imgdata');
      expect(result).toBe('');
    });
  });
});
