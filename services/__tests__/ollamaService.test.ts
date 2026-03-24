// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { ollamaService } from '../ollamaService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('OllamaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when ollama is reachable', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await ollamaService.isAvailable();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tags'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return false when ollama returns non-ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await ollamaService.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false when fetch throws (network error)', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await ollamaService.isAvailable();

      expect(result).toBe(false);
    });

    it('should use abort signal for timeout', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await ollamaService.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  describe('generateChatCompletion', () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];

    it('should return content from successful response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'llama3',
            created_at: '2024-01-01',
            message: { role: 'assistant', content: 'Hi there!' },
            done: true,
          }),
      });

      const result = await ollamaService.generateChatCompletion(messages);

      expect(result).toBe('Hi there!');
    });

    it('should use default model llama3', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'llama3',
            message: { role: 'assistant', content: 'ok' },
            done: true,
          }),
      });

      await ollamaService.generateChatCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          body: expect.stringContaining('"model":"llama3"'),
        })
      );
    });

    it('should use custom model when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'mistral',
            message: { role: 'assistant', content: 'ok' },
            done: true,
          }),
      });

      await ollamaService.generateChatCompletion(messages, 'mistral');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"model":"mistral"'),
        })
      );
    });

    it('should send stream: false in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'llama3',
            message: { role: 'assistant', content: 'ok' },
            done: true,
          }),
      });

      await ollamaService.generateChatCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"stream":false'),
        })
      );
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('model not found'),
      });

      await expect(ollamaService.generateChatCompletion(messages)).rejects.toThrow(
        'Ollama Error: model not found'
      );
    });

    it('should throw and log on network failure', async () => {
      const error = new Error('Network failure');
      mockFetch.mockRejectedValue(error);

      await expect(ollamaService.generateChatCompletion(messages)).rejects.toThrow('Network failure');
    });

    it('should send messages in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'llama3',
            message: { role: 'assistant', content: 'response' },
            done: true,
          }),
      });

      const multiMessages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hi' },
      ];

      await ollamaService.generateChatCompletion(multiMessages);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(2);
      expect(callBody.messages[0].role).toBe('system');
    });

    it('should use POST method with correct headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'llama3',
            message: { role: 'assistant', content: 'ok' },
            done: true,
          }),
      });

      await ollamaService.generateChatCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
