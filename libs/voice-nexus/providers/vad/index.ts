/**
 * Voice Nexus VAD Providers
 *
 * Ready-to-use VAD (Voice Activity Detection) provider adapters.
 *
 * @example
 * ```typescript
 * import { createSileroVAD } from '@metaventionsai/voice-nexus/providers/vad';
 *
 * const vad = createSileroVAD({
 *     onSpeechStart: () => console.log('User started speaking'),
 *     onSpeechEnd: (audio) => processUserSpeech(audio),
 * });
 *
 * await vad.start();
 * ```
 */

import type { VADProvider } from '../../types';

// Import and re-export Silero VAD
import {
    createSileroVAD,
    isSileroVADAvailable,
} from './silero';
export type { SileroVADOptions } from './silero';
export { createSileroVAD, isSileroVADAvailable };

/**
 * Create a default VAD provider based on availability
 */
export function createDefaultVAD(options: {
    onSpeechStart?: () => void;
    onSpeechEnd?: (audio: Float32Array) => void;
    onVADMisfire?: () => void;
    onFrameProcessed?: (probs: { isSpeech: number; notSpeech: number }) => void;
}): VADProvider | undefined {
    if (isSileroVADAvailable()) {
        return createSileroVAD(options);
    }

    return undefined;
}
