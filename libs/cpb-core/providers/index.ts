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

// Claude (Anthropic)
export {
    createClaudeProvider,
    getClaudeModel,
    CLAUDE_MODELS,
    type ClaudeProviderOptions,
} from './anthropic';

// Gemini (Google)
export {
    createGeminiProvider,
    createGroundedGeminiProvider,
    getGeminiModel,
    GEMINI_MODELS,
    type GeminiProviderOptions,
} from './google';

// Grok (xAI)
export {
    createGrokProvider,
    getGrokModel,
    GROK_MODELS,
    type GrokProviderOptions,
} from './grok';

/**
 * Create a default provider configuration using environment variables
 *
 * Detects available API keys and creates appropriate providers:
 * - ANTHROPIC_API_KEY -> Claude for deep
 * - GOOGLE_GENERATIVE_AI_API_KEY -> Gemini for fast/balanced
 * - XAI_API_KEY -> Grok as alternative balanced
 */
export function createDefaultProviders(): {
    fast?: ReturnType<typeof createGeminiProvider>;
    balanced?: ReturnType<typeof createGeminiProvider | typeof createGrokProvider>;
    deep?: ReturnType<typeof createClaudeProvider>;
} {
    const { createClaudeProvider: claude } = require('./anthropic');
    const { createGeminiProvider: gemini } = require('./google');
    const { createGrokProvider: grok } = require('./grok');

    const providers: {
        fast?: ReturnType<typeof createGeminiProvider>;
        balanced?: ReturnType<typeof createGeminiProvider | typeof createGrokProvider>;
        deep?: ReturnType<typeof createClaudeProvider>;
    } = {};

    // Check Gemini
    const geminiProvider = gemini();
    if (geminiProvider.isConfigured()) {
        providers.fast = geminiProvider;
        providers.balanced = geminiProvider;
    }

    // Check Grok as alternative balanced
    if (!providers.balanced) {
        const grokProvider = grok();
        if (grokProvider.isConfigured()) {
            providers.balanced = grokProvider;
            if (!providers.fast) {
                providers.fast = grokProvider;
            }
        }
    }

    // Check Claude
    const claudeProvider = claude();
    if (claudeProvider.isConfigured()) {
        providers.deep = claudeProvider;
        // Use Claude as fallback for all tiers if no other providers
        if (!providers.fast) providers.fast = claudeProvider;
        if (!providers.balanced) providers.balanced = claudeProvider;
    }

    return providers;
}
