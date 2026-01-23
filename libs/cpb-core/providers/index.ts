/**
 * CPB Provider Implementations
 *
 * Ready-to-use provider adapters for popular LLM services.
 *
 * @example
 * ```typescript
 * import { createCPB } from '@metaventionsai/cpb-core';
 * import {
 *     createClaudeProvider,
 *     createGeminiProvider,
 *     createGrokProvider
 * } from '@metaventionsai/cpb-core/providers';
 *
 * const cpb = createCPB({
 *     fast: createGeminiProvider(),
 *     balanced: createGrokProvider(),
 *     deep: createClaudeProvider()
 * });
 * ```
 */

import type { CPBProvider } from '../types';

// Import and re-export Claude (Anthropic)
import {
    createClaudeProvider,
    getClaudeModel,
    CLAUDE_MODELS,
} from './anthropic';
export type { ClaudeProviderOptions } from './anthropic';
export { createClaudeProvider, getClaudeModel, CLAUDE_MODELS };

// Import and re-export Gemini (Google)
import {
    createGeminiProvider,
    createGroundedGeminiProvider,
    getGeminiModel,
    GEMINI_MODELS,
} from './google';
export type { GeminiProviderOptions } from './google';
export { createGeminiProvider, createGroundedGeminiProvider, getGeminiModel, GEMINI_MODELS };

// Import and re-export Grok (xAI)
import {
    createGrokProvider,
    getGrokModel,
    GROK_MODELS,
} from './grok';
export type { GrokProviderOptions } from './grok';
export { createGrokProvider, getGrokModel, GROK_MODELS };

/**
 * Create a default provider configuration using environment variables
 *
 * Detects available API keys and creates appropriate providers:
 * - ANTHROPIC_API_KEY -> Claude for deep
 * - GOOGLE_GENERATIVE_AI_API_KEY -> Gemini for fast/balanced
 * - XAI_API_KEY -> Grok as alternative balanced
 */
export function createDefaultProviders(): {
    fast?: CPBProvider;
    balanced?: CPBProvider;
    deep?: CPBProvider;
} {
    const providers: {
        fast?: CPBProvider;
        balanced?: CPBProvider;
        deep?: CPBProvider;
    } = {};

    // Check Gemini
    const geminiProvider = createGeminiProvider();
    if (geminiProvider.isConfigured()) {
        providers.fast = geminiProvider;
        providers.balanced = geminiProvider;
    }

    // Check Grok as alternative balanced
    if (!providers.balanced) {
        const grokProvider = createGrokProvider();
        if (grokProvider.isConfigured()) {
            providers.balanced = grokProvider;
            if (!providers.fast) {
                providers.fast = grokProvider;
            }
        }
    }

    // Check Claude
    const claudeProvider = createClaudeProvider();
    if (claudeProvider.isConfigured()) {
        providers.deep = claudeProvider;
        // Use Claude as fallback for all tiers if no other providers
        if (!providers.fast) providers.fast = claudeProvider;
        if (!providers.balanced) providers.balanced = claudeProvider;
    }

    return providers;
}
