/**
 * Voice Nexus STT Providers
 *
 * Ready-to-use STT (Speech-to-Text) provider adapters.
 *
 * @example
 * ```typescript
 * import { createBrowserSTT, createDeepgramSTT } from '@metaventionsai/voice-nexus/providers/stt';
 *
 * // Use Deepgram for ultra-low-latency streaming (recommended)
 * const deepgram = createDeepgramSTT({ apiKey: 'your-key' });
 *
 * // Or use browser STT as free fallback
 * const browser = createBrowserSTT();
 *
 * // Start listening
 * await deepgram.startStreaming((text, isFinal) => {
 *     console.log(isFinal ? 'Final:' : 'Partial:', text);
 * });
 *
 * // Stop and get final text
 * const final = await deepgram.stopStreaming();
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

// Import and re-export Deepgram (Nova-3 streaming)
import {
    createDeepgramSTT,
    isDeepgramSTTAvailable,
} from './deepgram';
export type { DeepgramSTTOptions } from './deepgram';
export { createDeepgramSTT, isDeepgramSTTAvailable };

/**
 * Create a default STT provider based on availability
 *
 * Prefers Deepgram if configured, falls back to browser STT.
 */
export function createDefaultSTT(options?: { apiKey?: string; supabaseClient?: unknown; tokenEndpoint?: string }): STTProvider | undefined {
    // Try Deepgram first (better latency and accuracy)
    if (options && isDeepgramSTTAvailable(options)) {
        return createDeepgramSTT(options as { apiKey?: string; supabaseClient?: { functions: { invoke: (name: string) => Promise<{ data: { key: string } | null; error: Error | null }> } }; tokenEndpoint?: string });
    }

    // Fall back to browser STT
    if (isBrowserSTTAvailable()) {
        return createBrowserSTT();
    }

    return undefined;
}
