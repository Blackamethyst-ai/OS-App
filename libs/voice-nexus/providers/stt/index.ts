/**
 * Voice Nexus STT Providers
 *
 * Ready-to-use STT (Speech-to-Text) provider adapters.
 *
 * @example
 * ```typescript
 * import { createBrowserSTT } from '@metaventionsai/voice-nexus/providers/stt';
 *
 * const stt = createBrowserSTT();
 *
 * // Start listening
 * await stt.startStreaming((text) => {
 *     console.log('Partial:', text);
 * });
 *
 * // Stop and get final text
 * const final = await stt.stopStreaming();
 * ```
 */

// Browser (Web Speech API)
export {
    createBrowserSTT,
    isBrowserSTTAvailable,
    type BrowserSTTOptions,
} from './browser';

/**
 * Create a default STT provider based on availability
 */
export function createDefaultSTT(): import('../../types').STTProvider | undefined {
    const { createBrowserSTT, isBrowserSTTAvailable } = require('./browser');

    if (isBrowserSTTAvailable()) {
        return createBrowserSTT();
    }

    return undefined;
}
