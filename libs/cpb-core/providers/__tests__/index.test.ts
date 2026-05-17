import { describe, it, expect, vi } from 'vitest';

// Mock all three provider modules before importing
vi.mock('../anthropic', () => ({
  createClaudeProvider: vi.fn(() => ({
    name: 'claude',
    generate: vi.fn(async () => 'claude response'),
    isConfigured: vi.fn(() => false),
  })),
  getClaudeModel: vi.fn(() => 'claude-opus-4-7'),
  CLAUDE_MODELS: { deep: 'claude-opus-4-7' },
}));

vi.mock('../google', () => ({
  createGeminiProvider: vi.fn(() => ({
    name: 'gemini',
    generate: vi.fn(async () => 'gemini response'),
    isConfigured: vi.fn(() => false),
  })),
  createGroundedGeminiProvider: vi.fn(() => ({
    name: 'gemini-grounded',
    generate: vi.fn(async () => 'grounded response'),
    isConfigured: vi.fn(() => false),
  })),
  getGeminiModel: vi.fn(() => 'gemini-2.5-pro'),
  GEMINI_MODELS: { fast: 'gemini-2.5-flash' },
}));

vi.mock('../grok', () => ({
  createGrokProvider: vi.fn(() => ({
    name: 'grok',
    generate: vi.fn(async () => 'grok response'),
    isConfigured: vi.fn(() => false),
  })),
  getGrokModel: vi.fn(() => 'grok-3'),
  GROK_MODELS: { balanced: 'grok-3' },
}));

import {
  createClaudeProvider,
  getClaudeModel,
  CLAUDE_MODELS,
  createGeminiProvider,
  createGroundedGeminiProvider,
  getGeminiModel,
  GEMINI_MODELS,
  createGrokProvider,
  getGrokModel,
  GROK_MODELS,
  createDefaultProviders,
} from '../index';

describe('providers barrel exports', () => {
  it('exports Claude provider functions and models', () => {
    expect(typeof createClaudeProvider).toBe('function');
    expect(typeof getClaudeModel).toBe('function');
    expect(CLAUDE_MODELS).toBeDefined();
  });

  it('exports Gemini provider functions and models', () => {
    expect(typeof createGeminiProvider).toBe('function');
    expect(typeof createGroundedGeminiProvider).toBe('function');
    expect(typeof getGeminiModel).toBe('function');
    expect(GEMINI_MODELS).toBeDefined();
  });

  it('exports Grok provider functions and models', () => {
    expect(typeof createGrokProvider).toBe('function');
    expect(typeof getGrokModel).toBe('function');
    expect(GROK_MODELS).toBeDefined();
  });
});

describe('createDefaultProviders', () => {
  it('returns an object with optional fast/balanced/deep keys', () => {
    const providers = createDefaultProviders();
    expect(providers).toBeDefined();
    expect(typeof providers).toBe('object');
    // With all mocked providers returning isConfigured: false, all should be undefined
    expect(providers.fast).toBeUndefined();
    expect(providers.balanced).toBeUndefined();
    expect(providers.deep).toBeUndefined();
  });

  it('populates providers when isConfigured returns true', () => {
    // Make gemini configured
    (createGeminiProvider as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      name: 'gemini',
      generate: vi.fn(),
      isConfigured: () => true,
    });
    // Make grok not configured
    (createGrokProvider as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      name: 'grok',
      generate: vi.fn(),
      isConfigured: () => false,
    });
    // Make claude configured
    (createClaudeProvider as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      name: 'claude',
      generate: vi.fn(),
      isConfigured: () => true,
    });

    const providers = createDefaultProviders();
    expect(providers.fast?.name).toBe('gemini');
    expect(providers.balanced?.name).toBe('gemini');
    expect(providers.deep?.name).toBe('claude');
  });
});
