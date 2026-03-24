// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetKey = vi.fn();

vi.mock('../apiKeyService', () => ({
  apiKeyService: {
    getKey: (...args: any[]) => mockGetKey(...args),
  },
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { grokService } from '../grokService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('GrokService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKey.mockReturnValue('test-grok-key');
  });

  describe('generateContent', () => {
    const messages = [{ role: 'user' as const, content: 'Hello Grok' }];

    it('should throw if no API key is configured', async () => {
      mockGetKey.mockReturnValue(null);

      await expect(grokService.generateContent(messages)).rejects.toThrow(
        'Grok API key not found'
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return content from successful response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello from Grok!' } }],
          }),
      });

      const result = await grokService.generateContent(messages);

      expect(result).toBe('Hello from Grok!');
    });

    it('should send authorization header with bearer token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-grok-key',
          }),
        })
      );
    });

    it('should use default model grok-beta', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('grok-beta');
    });

    it('should use custom model when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages, undefined, 'grok-2');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('grok-2');
    });

    it('should prepend system prompt when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages, 'You are a helpful AI');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a helpful AI' });
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello Grok' });
    });

    it('should not prepend system message when no system prompt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('should throw on non-ok response with status and error text', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      await expect(grokService.generateContent(messages)).rejects.toThrow(
        'Grok API Error (429): Rate limit exceeded'
      );
    });

    it('should return empty string when choices are empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      const result = await grokService.generateContent(messages);

      expect(result).toBe('');
    });

    it('should return empty string when response has no choices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await grokService.generateContent(messages);

      expect(result).toBe('');
    });

    it('should set stream to false and temperature to 0.7', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.stream).toBe(false);
      expect(body.temperature).toBe(0.7);
    });

    it('should re-throw network errors', async () => {
      mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

      await expect(grokService.generateContent(messages)).rejects.toThrow(
        'DNS resolution failed'
      );
    });

    it('should call apiKeyService.getKey with grok', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });

      await grokService.generateContent(messages);

      expect(mockGetKey).toHaveBeenCalledWith('grok');
    });
  });
});
