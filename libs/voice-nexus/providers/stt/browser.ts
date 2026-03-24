/**
 * Browser STT Provider for Voice Nexus
 *
 * Uses the Web Speech API for speech-to-text.
 * Free, works offline in most browsers.
 *
 * @example
 * ```typescript
 * import { createBrowserSTT } from '@metaventionsai/voice-nexus/providers/stt/browser';
 *
 * const stt = createBrowserSTT();
 *
 * // Start streaming transcription
 * await stt.startStreaming((text) => {
 *     console.log('Partial:', text);
 * });
 *
 * // Stop and get final transcription
 * const finalText = await stt.stopStreaming();
 * ```
 */

import type { STTProvider } from '../../types';
import { logger } from '../../../../services/logger';

export interface BrowserSTTOptions {
    /** Language for recognition (default: 'en-US') */
    language?: string;
    /** Enable continuous recognition (default: true) */
    continuous?: boolean;
    /** Return interim results (default: true) */
    interimResults?: boolean;
    /** Maximum number of alternative transcriptions (default: 1) */
    maxAlternatives?: number;
}

// Type for SpeechRecognition (not available in all TypeScript configurations)
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event & { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
    }
}

/**
 * Create a Browser STT provider for Voice Nexus
 *
 * Uses the native Web Speech API - no additional dependencies required.
 * Only works in browser environments (Chrome has best support).
 */
export function createBrowserSTT(options?: BrowserSTTOptions): STTProvider {
    const language = options?.language ?? 'en-US';
    const continuous = options?.continuous ?? true;
    const interimResults = options?.interimResults ?? true;
    const maxAlternatives = options?.maxAlternatives ?? 1;

    let recognition: SpeechRecognition | null = null;
    let currentTranscript = '';
    let isListening = false;
    let onPartialCallback: ((text: string) => void) | null = null;
    let resolveStop: ((text: string) => void) | null = null;
    let rejectStop: ((error: Error) => void) | null = null;

    // Get SpeechRecognition constructor
    function getSpeechRecognition(): (new () => SpeechRecognition) | undefined {
        if (typeof window === 'undefined') return undefined;
        return window.SpeechRecognition || window.webkitSpeechRecognition;
    }

    // Initialize recognition instance
    function initRecognition(): SpeechRecognition | null {
        const SpeechRecognitionCtor = getSpeechRecognition();
        if (!SpeechRecognitionCtor) return null;

        const rec = new SpeechRecognitionCtor();
        rec.continuous = continuous;
        rec.interimResults = interimResults;
        rec.lang = language;
        rec.maxAlternatives = maxAlternatives;

        rec.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                currentTranscript += final;
            }

            // Call partial callback with current state
            if (onPartialCallback) {
                onPartialCallback(currentTranscript + interim);
            }
        };

        rec.onerror = (event: Event & { error: string }) => {
            logger.error('Speech recognition error:', event.error);
            if (rejectStop) {
                rejectStop(new Error(`Speech recognition error: ${event.error}`));
                rejectStop = null;
                resolveStop = null;
            }
        };

        rec.onend = () => {
            isListening = false;
            if (resolveStop) {
                resolveStop(currentTranscript);
                resolveStop = null;
                rejectStop = null;
            }
        };

        return rec;
    }

    return {
        name: 'browser',
        supportsStreaming: true,

        isAvailable(): boolean {
            return getSpeechRecognition() !== undefined;
        },

        async transcribe(audio: Blob): Promise<string> {
            // Browser SpeechRecognition doesn't support transcribing audio blobs directly
            // It only works with live microphone input
            throw new Error(
                'Browser SpeechRecognition does not support transcribing audio files. ' +
                'Use startStreaming() for live microphone input, or use a cloud STT provider.'
            );
        },

        async startStreaming(onPartial: (text: string) => void): Promise<void> {
            if (isListening) {
                throw new Error('Already listening');
            }

            recognition = initRecognition();
            if (!recognition) {
                throw new Error('SpeechRecognition not available in this browser');
            }

            currentTranscript = '';
            onPartialCallback = onPartial;
            isListening = true;

            return new Promise((resolve, reject) => {
                try {
                    recognition!.start();
                    // Resolve immediately - recognition has started
                    resolve();
                } catch (error) {
                    isListening = false;
                    reject(error);
                }
            });
        },

        async stopStreaming(): Promise<string> {
            if (!recognition || !isListening) {
                return currentTranscript;
            }

            return new Promise((resolve, reject) => {
                resolveStop = resolve;
                rejectStop = reject;
                recognition!.stop();
            });
        },
    };
}

/**
 * Check if Web Speech API (SpeechRecognition) is available
 */
export function isBrowserSTTAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Default export for convenience
export default createBrowserSTT;
