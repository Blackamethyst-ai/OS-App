/**
 * Silero VAD Provider for Voice Nexus
 *
 * Uses @ricky0123/vad-web (Silero VAD in WASM) for browser-based
 * Voice Activity Detection. Enables natural conversation flow
 * with automatic speech detection and barge-in support.
 *
 * @example
 * ```typescript
 * import { createSileroVAD } from '@metaventionsai/voice-nexus/providers/vad/silero';
 *
 * const vad = createSileroVAD({
 *     onSpeechStart: () => console.log('Speech started'),
 *     onSpeechEnd: (audio) => processAudio(audio),
 * });
 *
 * await vad.start();
 * // VAD now runs continuously, calling callbacks
 *
 * await vad.stop();
 * ```
 */

import type { VADProvider, VADOptions, VADState, VADEvents } from '../../types';
import { logger } from '../../../../services/logger';

// Re-export for consumers who want to configure
export type { VADOptions, VADState, VADEvents } from '../../types';

export interface SileroVADOptions extends VADEvents {
    /** Positive speech threshold (default: 0.5) */
    positiveSpeechThreshold?: number;
    /** Negative speech threshold (default: 0.35) */
    negativeSpeechThreshold?: number;
    /** Redemption frames - frames to wait before ending speech (default: 8) */
    redemptionFrames?: number;
    /** Minimum speech frames before triggering onSpeechStart (default: 3) */
    minSpeechFrames?: number;
    /** Pre-speech pad frames to include before speech (default: 1) */
    preSpeechPadFrames?: number;
    /** Whether to submit audio on VAD misfire (default: false) */
    submitUserSpeechOnPause?: boolean;
    /** Path to ONNX model (default: auto-detected from CDN) */
    modelURL?: string;
    /** Path to ONNX runtime WASM files (default: auto-detected from CDN) */
    workletURL?: string;
}

// Types from @ricky0123/vad-web
interface MicVAD {
    listening: boolean;
    start: () => Promise<void>;
    pause: () => void;
    destroy: () => void;
}

interface MicVADOptions {
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    redemptionFrames: number;
    minSpeechFrames: number;
    preSpeechPadFrames: number;
    submitUserSpeechOnPause: boolean;
    onSpeechStart?: () => void;
    onSpeechEnd?: (audio: Float32Array) => void;
    onVADMisfire?: () => void;
    onFrameProcessed?: (probs: { isSpeech: number; notSpeech: number }) => void;
    modelURL?: string;
    workletURL?: string;
}

// VAD module type (loaded dynamically)
type VADModule = { MicVAD: new (options: MicVADOptions) => MicVAD } | null;

// Dynamic import for @ricky0123/vad-web (browser-only)
let vadModule: VADModule = null;

async function loadVADModule(): Promise<VADModule> {
    if (vadModule) return vadModule;

    try {
        // Dynamic import - only loads in browser
        vadModule = await import('@ricky0123/vad-web' as any);
        return vadModule;
    } catch (error) {
        logger.error('[Silero VAD] Failed to load VAD module:', error);
        return null;
    }
}

/**
 * Create a Silero VAD provider for Voice Nexus
 *
 * Uses WASM-based Silero VAD for low-latency voice activity detection.
 * Runs entirely in the browser with no API calls.
 */
export function createSileroVAD(options: SileroVADOptions): VADProvider {
    const {
        positiveSpeechThreshold = 0.5,
        negativeSpeechThreshold = 0.35,
        redemptionFrames = 8,
        minSpeechFrames = 3,
        preSpeechPadFrames = 1,
        submitUserSpeechOnPause = false,
        modelURL,
        workletURL,
        onSpeechStart,
        onSpeechEnd,
        onVADMisfire,
        onFrameProcessed,
    } = options;

    let micVAD: MicVAD | null = null;
    let isActive = false;
    let state: VADState = 'idle';
    let lastSpeechProbability = 0;

    // State change callback
    const updateState = (newState: VADState) => {
        state = newState;
    };

    return {
        name: 'silero',

        isAvailable(): boolean {
            // Check for browser environment with required APIs
            return typeof window !== 'undefined' &&
                   typeof navigator !== 'undefined' &&
                   'mediaDevices' in navigator &&
                   'getUserMedia' in navigator.mediaDevices;
        },

        getState(): VADState {
            return state;
        },

        getSpeechProbability(): number {
            return lastSpeechProbability;
        },

        async start(): Promise<void> {
            if (isActive) {
                logger.warn('[Silero VAD] Already active');
                return;
            }

            const module = await loadVADModule();
            if (!module) {
                throw new Error('Failed to load Silero VAD module');
            }

            updateState('loading');

            try {
                micVAD = new module.MicVAD({
                    positiveSpeechThreshold,
                    negativeSpeechThreshold,
                    redemptionFrames,
                    minSpeechFrames,
                    preSpeechPadFrames,
                    submitUserSpeechOnPause,
                    modelURL,
                    workletURL,

                    onSpeechStart: () => {
                        updateState('speaking');
                        onSpeechStart?.();
                    },

                    onSpeechEnd: (audio: Float32Array) => {
                        updateState('listening');
                        onSpeechEnd?.(audio);
                    },

                    onVADMisfire: () => {
                        // VAD detected speech but too short - reset to listening
                        updateState('listening');
                        onVADMisfire?.();
                    },

                    onFrameProcessed: (probs) => {
                        lastSpeechProbability = probs.isSpeech;
                        onFrameProcessed?.(probs);
                    },
                });

                await micVAD.start();
                isActive = true;
                updateState('listening');
                logger.info('[Silero VAD] Started successfully');
            } catch (error) {
                updateState('idle');
                throw new Error(`Failed to start Silero VAD: ${error}`);
            }
        },

        pause(): void {
            if (micVAD && isActive) {
                micVAD.pause();
                updateState('paused');
                logger.info('[Silero VAD] Paused');
            }
        },

        async resume(): Promise<void> {
            if (micVAD && !micVAD.listening) {
                await micVAD.start();
                updateState('listening');
                logger.info('[Silero VAD] Resumed');
            }
        },

        stop(): void {
            if (micVAD) {
                micVAD.destroy();
                micVAD = null;
                isActive = false;
                updateState('idle');
                logger.info('[Silero VAD] Stopped');
            }
        },
    };
}

/**
 * Check if Silero VAD is available in the current environment
 */
export function isSileroVADAvailable(): boolean {
    return typeof window !== 'undefined' &&
           typeof navigator !== 'undefined' &&
           'mediaDevices' in navigator &&
           'getUserMedia' in navigator.mediaDevices;
}

// Default export for convenience
export default createSileroVAD;
