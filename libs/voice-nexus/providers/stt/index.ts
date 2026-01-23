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

import type { STTProvider } from '../../types';

// Import and re-export Browser (Web Speech API)
import {
    createBrowserSTT,
    isBrowserSTTAvailable,
} from './browser';
export type { BrowserSTTOptions } from './browser';
export { createBrowserSTT, isBrowserSTTAvailable };

/**
 * Create a default STT provider based on availability
 */
export function createDefaultSTT(): STTProvider | undefined {
    if (isBrowserSTTAvailable()) {
        return createBrowserSTT();
    }

    return undefined;
}
