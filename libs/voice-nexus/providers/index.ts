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
    createDeepgramSTT,
    createDefaultSTT,
    isBrowserSTTAvailable as isBrowserSTTAvailableFn,
    isDeepgramSTTAvailable,
} from './stt';
export type { BrowserSTTOptions, DeepgramSTTOptions } from './stt';
export { createBrowserSTT, createDeepgramSTT, createDefaultSTT, isDeepgramSTTAvailable };
export { isBrowserSTTAvailableFn as isBrowserSTTAvailable };

// Import and re-export VAD providers
import {
    createSileroVAD,
    createDefaultVAD,
    isSileroVADAvailable,
} from './vad';
export type { SileroVADOptions } from './vad';
export { createSileroVAD, createDefaultVAD, isSileroVADAvailable };

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
