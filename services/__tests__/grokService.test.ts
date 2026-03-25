// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetKey, mockLoggerError } = vi.hoisted(() => ({
    mockGetKey: vi.fn(),
    mockLoggerError: vi.fn(),
}));

vi.mock('../apiKeyService', () => ({
    apiKeyService: {
        getKey: mockGetKey,
    },
}));

vi.mock('../logger', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: mockLoggerError,
    },
}));

import { grokService, type GrokMessage } from '../grokService';

describe('GrokService', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.fetch = mockFetch;
    });

    it('should export a grokService singleton', () => {
        expect(grokService).toBeDefined();
        expect(typeof grokService.generateContent).toBe('function');
    });

    it('should export GrokMessage type with valid roles', () => {
        const msg: GrokMessage = { role: 'user', content: 'hello' };
        expect(msg.role).toBe('user');
    });

    it('should throw when no API key is configured', async () => {
        mockGetKey.mockReturnValue(null);
        const messages: GrokMessage[] = [{ role: 'user', content: 'test' }];

        await expect(grokService.generateContent(messages)).rejects.toThrow(
            'Grok API key not found'
        );
    });

    it('should call fetch with correct URL and headers', async () => {
        mockGetKey.mockReturnValue('test-api-key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'response' } }] }),
        });

        const messages: GrokMessage[] = [{ role: 'user', content: 'hello' }];
        await grokService.generateContent(messages);

        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.x.ai/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer test-api-key',
                    'Content-Type': 'application/json',
                },
            })
        );
    });

    it('should send messages in request body with default model', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
        });

        const messages: GrokMessage[] = [{ role: 'user', content: 'test' }];
        await grokService.generateContent(messages);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.model).toBe('grok-beta');
        expect(body.stream).toBe(false);
        expect(body.temperature).toBe(0.7);
        expect(body.messages).toEqual(messages);
    });

    it('should prepend system prompt when provided', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
        });

        const messages: GrokMessage[] = [{ role: 'user', content: 'question' }];
        await grokService.generateContent(messages, 'You are helpful');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.messages[0]).toEqual({ role: 'system', content: 'You are helpful' });
        expect(body.messages[1]).toEqual({ role: 'user', content: 'question' });
    });

    it('should not prepend system prompt when undefined', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
        });

        const messages: GrokMessage[] = [{ role: 'user', content: 'question' }];
        await grokService.generateContent(messages);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.messages).toEqual(messages);
    });

    it('should use custom model when specified', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
        });

        await grokService.generateContent(
            [{ role: 'user', content: 'test' }],
            undefined,
            'grok-2'
        );

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.model).toBe('grok-2');
    });

    it('should return content from response choices', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Generated text here' } }],
            }),
        });

        const result = await grokService.generateContent([
            { role: 'user', content: 'hello' },
        ]);
        expect(result).toBe('Generated text here');
    });

    it('should return empty string when choices are empty', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [] }),
        });

        const result = await grokService.generateContent([
            { role: 'user', content: 'hello' },
        ]);
        expect(result).toBe('');
    });

    it('should throw on non-ok response', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: false,
            status: 429,
            text: async () => 'Rate limited',
        });

        await expect(
            grokService.generateContent([{ role: 'user', content: 'test' }])
        ).rejects.toThrow('Grok API Error (429): Rate limited');
    });

    it('should log error on fetch failure', async () => {
        mockGetKey.mockReturnValue('key');
        const networkError = new Error('Network error');
        mockFetch.mockRejectedValue(networkError);

        await expect(
            grokService.generateContent([{ role: 'user', content: 'test' }])
        ).rejects.toThrow('Network error');

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Grok API request failed',
            networkError,
            'GrokService'
        );
    });

    it('should handle response with no message content gracefully', async () => {
        mockGetKey.mockReturnValue('key');
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: {} }] }),
        });

        const result = await grokService.generateContent([
            { role: 'user', content: 'hello' },
        ]);
        expect(result).toBe('');
    });
});
