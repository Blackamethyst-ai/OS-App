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

import type { ReasoningProvider } from '../../types';

// Import and re-export Claude (Anthropic)
import {
    createClaudeReasoning,
    CLAUDE_REASONING_MODELS,
} from './anthropic';
export type { ClaudeReasoningOptions } from './anthropic';
export { createClaudeReasoning, CLAUDE_REASONING_MODELS };

// Import and re-export Gemini (Google)
import {
    createGeminiReasoning,
    createGroundedGeminiReasoning,
    GEMINI_REASONING_MODELS,
} from './google';
export type { GeminiReasoningOptions } from './google';
export { createGeminiReasoning, createGroundedGeminiReasoning, GEMINI_REASONING_MODELS };

/**
 * Create a default reasoning provider based on available API keys
 */
export function createDefaultReasoning(): ReasoningProvider | undefined {
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
