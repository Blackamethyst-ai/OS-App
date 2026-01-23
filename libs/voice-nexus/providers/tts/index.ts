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

import type { TTSProvider } from '../../types';

// Import and re-export ElevenLabs
import {
    createElevenLabsTTS,
    getElevenLabsVoices,
    ELEVENLABS_VOICE_IDS,
} from './elevenlabs';
export type { ElevenLabsOptions } from './elevenlabs';
export { createElevenLabsTTS, getElevenLabsVoices, ELEVENLABS_VOICE_IDS };

// Import and re-export Browser (Web Speech API)
import {
    createBrowserTTS,
    isBrowserTTSAvailable,
    getBrowserVoices,
} from './browser';
export type { BrowserTTSOptions } from './browser';
export { createBrowserTTS, isBrowserTTSAvailable, getBrowserVoices };

/**
 * Create a default TTS provider based on availability
 *
 * Prefers ElevenLabs if API key is configured, falls back to browser TTS.
 */
export function createDefaultTTS(): TTSProvider {
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
