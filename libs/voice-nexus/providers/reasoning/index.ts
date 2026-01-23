/**
 * Voice Nexus Reasoning Providers
 *
 * Ready-to-use reasoning provider adapters for popular LLM services.
 *
 * @example
 * ```typescript
 * import {
 *     createClaudeReasoning,
 *     createGeminiReasoning
 * } from '@metaventionsai/voice-nexus/providers/reasoning';
 *
 * const nexus = createVoiceNexus({
 *     config: {
 *         mode: 'turn-based',
 *         providers: {
 *             reasoning: createGeminiReasoning()
 *         }
 *     }
 * });
 * ```
 */

// Claude (Anthropic)
export {
    createClaudeReasoning,
    CLAUDE_REASONING_MODELS,
    type ClaudeReasoningOptions,
} from './anthropic';

// Gemini (Google)
export {
    createGeminiReasoning,
    createGroundedGeminiReasoning,
    GEMINI_REASONING_MODELS,
    type GeminiReasoningOptions,
} from './google';

/**
 * Create a default reasoning provider based on available API keys
 */
export function createDefaultReasoning(): import('../../types').ReasoningProvider | undefined {
    const { createGeminiReasoning } = require('./google');
    const { createClaudeReasoning } = require('./anthropic');

    // Prefer Gemini for voice (faster response times)
    const gemini = createGeminiReasoning();
    if (gemini.isAvailable()) {
        return gemini;
    }

    // Fallback to Claude
    const claude = createClaudeReasoning();
    if (claude.isAvailable()) {
        return claude;
    }

    return undefined;
}
