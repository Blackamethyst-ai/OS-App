// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Hoisted mocks ---
const mockGetKey = vi.hoisted(() => vi.fn());
const mockGenerateText = vi.hoisted(() => vi.fn());
const mockGeminiGenerateWithVision = vi.hoisted(() => vi.fn());
const mockClaudeGenerateContent = vi.hoisted(() => vi.fn());
const mockClaudeIsConfigured = vi.hoisted(() => vi.fn());

vi.mock('../apiKeyService', () => ({
  apiKeyService: {
    getKey: mockGetKey,
  },
}));

vi.mock('../geminiService', () => ({
  generateText: mockGenerateText,
  generateWithVision: mockGeminiGenerateWithVision,
}));

vi.mock('../claudeService', () => ({
  claudeService: {
    generateContent: mockClaudeGenerateContent,
    isConfigured: mockClaudeIsConfigured,
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

import {
  geminiProvider,
  claudeProvider,
  getProviderForTier,
  defaultProviders,
} from '../cpbProviders';

describe('cpbProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('geminiProvider', () => {
    it('should have name "gemini"', () => {
      expect(geminiProvider.name).toBe('gemini');
    });

    it('should return true from isConfigured when key exists', () => {
      mockGetKey.mockReturnValue('gemini-key');
      expect(geminiProvider.isConfigured()).toBe(true);
    });

    it('should return false from isConfigured when key is missing', () => {
      mockGetKey.mockReturnValue(null);
      expect(geminiProvider.isConfigured()).toBe(false);
    });

    it('should call generateText with default model', async () => {
      mockGenerateText.mockResolvedValue('gemini response');
      const result = await geminiProvider.generate('hello');
      expect(mockGenerateText).toHaveBeenCalledWith('hello', 'gemini-2.0-flash');
      expect(result).toBe('gemini response');
    });

    it('should prepend system prompt when provided', async () => {
      mockGenerateText.mockResolvedValue('response');
      await geminiProvider.generate('hello', {
        systemPrompt: 'Be helpful',
      });
      expect(mockGenerateText).toHaveBeenCalledWith(
        'Be helpful\n\nhello',
        'gemini-2.0-flash'
      );
    });

    it('should use custom model when specified', async () => {
      mockGenerateText.mockResolvedValue('response');
      await geminiProvider.generate('hello', { model: 'gemini-2.0-pro' });
      expect(mockGenerateText).toHaveBeenCalledWith('hello', 'gemini-2.0-pro');
    });

    it('should call generateWithVision with image data', async () => {
      mockGeminiGenerateWithVision.mockResolvedValue('vision result');
      const images = [
        { base64: 'imgdata', mimeType: 'image/png' },
      ];
      const result = await geminiProvider.generateWithVision!('describe', images as any);
      expect(mockGeminiGenerateWithVision).toHaveBeenCalledWith(
        'describe',
        [{ data: 'imgdata', mimeType: 'image/png' }],
        'gemini-2.0-flash'
      );
      expect(result).toBe('vision result');
    });
  });

  describe('claudeProvider', () => {
    it('should have name "claude"', () => {
      expect(claudeProvider.name).toBe('claude');
    });

    it('should return true from isConfigured when key exists', () => {
      mockGetKey.mockReturnValue('claude-key');
      expect(claudeProvider.isConfigured()).toBe(true);
    });

    it('should call claudeService.generateContent with correct args', async () => {
      mockClaudeGenerateContent.mockResolvedValue('claude response');
      const result = await claudeProvider.generate('hello', {
        systemPrompt: 'Be concise',
        model: 'claude-opus-4-6',
      });
      expect(mockClaudeGenerateContent).toHaveBeenCalledWith(
        [{ role: 'user', content: 'hello' }],
        'Be concise',
        'claude-opus-4-6'
      );
      expect(result).toBe('claude response');
    });

    it('should use default model when not specified', async () => {
      mockClaudeGenerateContent.mockResolvedValue('response');
      await claudeProvider.generate('hi');
      expect(mockClaudeGenerateContent).toHaveBeenCalledWith(
        [{ role: 'user', content: 'hi' }],
        undefined,
        'claude-sonnet-4-6'
      );
    });

    it('should build multimodal content for generateWithVision', async () => {
      mockClaudeGenerateContent.mockResolvedValue('I see a cat');
      const images = [
        { base64: 'catdata', mediaType: 'image/jpeg' },
      ];
      const result = await claudeProvider.generateWithVision!('describe', images as any, {
        systemPrompt: 'Be detailed',
      });

      expect(mockClaudeGenerateContent).toHaveBeenCalledWith(
        [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: 'catdata',
                },
              },
              {
                type: 'text',
                text: 'describe',
              },
            ],
          },
        ],
        'Be detailed',
        'claude-sonnet-4-6'
      );
      expect(result).toBe('I see a cat');
    });
  });

  describe('getProviderForTier', () => {
    it('should return claudeProvider for "deep" when claude is configured', () => {
      mockGetKey.mockReturnValue('claude-key');
      const provider = getProviderForTier('deep');
      expect(provider.name).toBe('claude');
    });

    it('should return geminiProvider for "fast" when gemini is configured', () => {
      // gemini configured, claude not
      mockGetKey.mockImplementation((key: string) =>
        key === 'gemini' ? 'gemini-key' : null
      );
      const provider = getProviderForTier('fast');
      expect(provider.name).toBe('gemini');
    });

    it('should return geminiProvider for "balanced" when gemini is configured', () => {
      mockGetKey.mockImplementation((key: string) =>
        key === 'gemini' ? 'gemini-key' : null
      );
      const provider = getProviderForTier('balanced');
      expect(provider.name).toBe('gemini');
    });

    it('should fallback to claudeProvider when gemini is not configured', () => {
      // Only claude configured
      mockGetKey.mockImplementation((key: string) =>
        key === 'claude' ? 'claude-key' : null
      );
      const provider = getProviderForTier('fast');
      expect(provider.name).toBe('claude');
    });

    it('should return geminiProvider as last resort when nothing is configured', () => {
      mockGetKey.mockReturnValue(null);
      const provider = getProviderForTier('fast');
      expect(provider.name).toBe('gemini');
    });
  });

  describe('defaultProviders', () => {
    it('should map fast to geminiProvider', () => {
      expect(defaultProviders.fast).toBe(geminiProvider);
    });

    it('should map balanced to geminiProvider', () => {
      expect(defaultProviders.balanced).toBe(geminiProvider);
    });

    it('should map deep to claudeProvider', () => {
      expect(defaultProviders.deep).toBe(claudeProvider);
    });
  });
});
