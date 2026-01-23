/**
 * Voice Nexus Provider Implementations
 *
 * Ready-to-use provider adapters for STT, reasoning, and TTS services.
 *
 * @example
 * ```typescript
 * import { createVoiceNexus } from '@metaventionsai/voice-nexus';
 * import {
 *     createGeminiReasoning,
 *     createElevenLabsTTS,
 *     createBrowserSTT
 * } from '@metaventionsai/voice-nexus/providers';
 *
 * const nexus = createVoiceNexus({
 *     config: {
 *         mode: 'turn-based',
 *         knowledgeInjection: false,
 *         providers: {
 *             stt: createBrowserSTT(),
 *             reasoning: createGeminiReasoning(),
 *             tts: createElevenLabsTTS()
 *         }
 *     }
 * });
 * ```
 */

import type { STTProvider, ReasoningProvider, TTSProvider } from '../types';

// Import and re-export reasoning providers
import {
    createClaudeReasoning,
    createGeminiReasoning,
    createGroundedGeminiReasoning,
    createDefaultReasoning,
    CLAUDE_REASONING_MODELS,
    GEMINI_REASONING_MODELS,
} from './reasoning';
export type { ClaudeReasoningOptions, GeminiReasoningOptions } from './reasoning';
export {
    createClaudeReasoning,
    createGeminiReasoning,
    createGroundedGeminiReasoning,
    createDefaultReasoning,
    CLAUDE_REASONING_MODELS,
    GEMINI_REASONING_MODELS,
};

// Import and re-export TTS providers
import {
    createElevenLabsTTS,
    createBrowserTTS,
    createDefaultTTS,
    getElevenLabsVoices,
    getBrowserVoices,
    isBrowserTTSAvailable,
    ELEVENLABS_VOICE_IDS,
} from './tts';
export type { ElevenLabsOptions, BrowserTTSOptions } from './tts';
export {
    createElevenLabsTTS,
    createBrowserTTS,
    createDefaultTTS,
    getElevenLabsVoices,
    getBrowserVoices,
    isBrowserTTSAvailable,
    ELEVENLABS_VOICE_IDS,
};

// Import and re-export STT providers
import {
    createBrowserSTT,
    createDefaultSTT,
    isBrowserSTTAvailable as isBrowserSTTAvailableFn,
} from './stt';
export type { BrowserSTTOptions } from './stt';
export { createBrowserSTT, createDefaultSTT };
export { isBrowserSTTAvailableFn as isBrowserSTTAvailable };

/**
 * Create default providers based on available API keys
 *
 * Returns an object with configured providers ready for use with createVoiceNexus.
 */
export function createDefaultProviders(): {
    stt?: STTProvider;
    reasoning?: ReasoningProvider;
    tts?: TTSProvider;
} {
    return {
        stt: createDefaultSTT(),
        reasoning: createDefaultReasoning(),
        tts: createDefaultTTS(),
    };
}
