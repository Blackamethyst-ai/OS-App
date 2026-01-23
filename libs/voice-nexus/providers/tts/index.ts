/**
 * Voice Nexus TTS Providers
 *
 * Ready-to-use TTS provider adapters.
 *
 * @example
 * ```typescript
 * import {
 *     createElevenLabsTTS,
 *     createBrowserTTS
 * } from '@metaventionsai/voice-nexus/providers/tts';
 *
 * // Use ElevenLabs for high-quality voice
 * const elevenLabs = createElevenLabsTTS();
 *
 * // Or use browser TTS as free fallback
 * const browser = createBrowserTTS();
 * ```
 */

// ElevenLabs
export {
    createElevenLabsTTS,
    getElevenLabsVoices,
    ELEVENLABS_VOICE_IDS,
    type ElevenLabsOptions,
} from './elevenlabs';

// Browser (Web Speech API)
export {
    createBrowserTTS,
    isBrowserTTSAvailable,
    getBrowserVoices,
    type BrowserTTSOptions,
} from './browser';

/**
 * Create a default TTS provider based on availability
 *
 * Prefers ElevenLabs if API key is configured, falls back to browser TTS.
 */
export function createDefaultTTS(): import('../../types').TTSProvider {
    const { createElevenLabsTTS } = require('./elevenlabs');
    const { createBrowserTTS, isBrowserTTSAvailable } = require('./browser');

    // Try ElevenLabs first
    const elevenLabs = createElevenLabsTTS();
    if (elevenLabs.isAvailable()) {
        return elevenLabs;
    }

    // Fall back to browser TTS
    if (isBrowserTTSAvailable()) {
        return createBrowserTTS();
    }

    // Return ElevenLabs anyway (will error when used)
    return elevenLabs;
}
