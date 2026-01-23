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

// Reasoning providers
export {
    createClaudeReasoning,
    createGeminiReasoning,
    createGroundedGeminiReasoning,
    createDefaultReasoning,
    CLAUDE_REASONING_MODELS,
    GEMINI_REASONING_MODELS,
    type ClaudeReasoningOptions,
    type GeminiReasoningOptions,
} from './reasoning';

// TTS providers
export {
    createElevenLabsTTS,
    createBrowserTTS,
    createDefaultTTS,
    getElevenLabsVoices,
    getBrowserVoices,
    isBrowserTTSAvailable,
    ELEVENLABS_VOICE_IDS,
    type ElevenLabsOptions,
    type BrowserTTSOptions,
} from './tts';

// STT providers
export {
    createBrowserSTT,
    createDefaultSTT,
    isBrowserSTTAvailable,
    type BrowserSTTOptions,
} from './stt';

/**
 * Create default providers based on available API keys
 *
 * Returns an object with configured providers ready for use with createVoiceNexus.
 */
export function createDefaultProviders(): {
    stt?: import('../types').STTProvider;
    reasoning?: import('../types').ReasoningProvider;
    tts?: import('../types').TTSProvider;
} {
    const { createDefaultSTT } = require('./stt');
    const { createDefaultReasoning } = require('./reasoning');
    const { createDefaultTTS } = require('./tts');

    return {
        stt: createDefaultSTT(),
        reasoning: createDefaultReasoning(),
        tts: createDefaultTTS(),
    };
}
