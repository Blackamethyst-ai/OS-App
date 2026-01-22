/**
 * VOICE NEXUS - Browser STT Provider
 *
 * Uses native Web Speech API for speech-to-text transcription.
 * Works universally in modern browsers without external API dependencies.
 *
 * Features:
 * - Continuous recognition with interim results
 * - No API key required
 * - Cross-browser support (Chrome, Edge, Safari)
 * - Fallback when Gemini Live unavailable
 */

import type { STTProvider } from '../../types';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
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

interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

/**
 * Browser STT Provider
 *
 * Uses Web Speech API for speech-to-text without external dependencies.
 * Provides continuous streaming transcription with interim results.
 */
class BrowserSTTProvider implements STTProvider {
    readonly name = 'browser-stt';
    readonly supportsStreaming = true;

    private recognition: SpeechRecognition | null = null;
    private partialCallback: ((text: string) => void) | null = null;
    private finalTranscript = '';
    private interimTranscript = '';
    private isStreaming = false;
    private restartOnEnd = false;
    private resolveStop: ((value: string) => void) | null = null;

    /**
     * Check if Web Speech API is available
     */
    isAvailable(): boolean {
        return typeof window !== 'undefined' &&
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    }

    /**
     * Create a new SpeechRecognition instance
     */
    private createRecognition(): SpeechRecognition | null {
        if (!this.isAvailable()) return null;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        return new SpeechRecognitionAPI();
    }

    /**
     * Transcribe audio blob to text (batch mode)
     *
     * Note: Web Speech API doesn't support batch transcription of audio blobs.
     * This is a placeholder that returns an error message.
     * For batch transcription, use Whisper or another provider.
     */
    async transcribe(audio: Blob): Promise<string> {
        console.warn('BrowserSTT: Batch transcription not supported. Use streaming mode.');
        return '[Browser STT does not support batch transcription - use streaming mode]';
    }

    /**
     * Start streaming transcription
     *
     * Begins continuous speech recognition with interim results.
     * Calls onPartial callback for each interim or final result.
     */
    async startStreaming(onPartial: (text: string) => void): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Web Speech API not available in this browser');
        }

        if (this.isStreaming) {
            console.warn('BrowserSTT: Already streaming');
            return;
        }

        this.recognition = this.createRecognition();
        if (!this.recognition) {
            throw new Error('Failed to create SpeechRecognition instance');
        }

        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Set up callbacks
        this.partialCallback = onPartial;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.isStreaming = true;
        this.restartOnEnd = true;

        // Handle results
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            // Update transcripts
            if (final) {
                this.finalTranscript += final;
                this.interimTranscript = '';
            } else {
                this.interimTranscript = interim;
            }

            // Send combined transcript to callback
            const combined = this.finalTranscript + this.interimTranscript;
            if (combined && this.partialCallback) {
                this.partialCallback(combined);
            }
        };

        // Handle end - restart if still streaming (browser stops after silence)
        this.recognition.onend = () => {
            if (this.restartOnEnd && this.isStreaming) {
                // Browser stopped due to silence, restart
                try {
                    this.recognition?.start();
                } catch (e) {
                    console.warn('BrowserSTT: Failed to restart after end:', e);
                    this.cleanup();
                }
            } else {
                // Intentional stop
                if (this.resolveStop) {
                    this.resolveStop(this.finalTranscript);
                    this.resolveStop = null;
                }
                this.cleanup();
            }
        };

        // Handle errors
        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('BrowserSTT: Error:', event.error, event.message);

            // Handle recoverable errors
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // These are normal, try to continue
                return;
            }

            // Network errors might be recoverable
            if (event.error === 'network') {
                console.warn('BrowserSTT: Network error, will retry on next start');
                return;
            }

            // Non-recoverable errors
            if (event.error === 'not-allowed') {
                console.error('BrowserSTT: Microphone permission denied');
            }

            this.restartOnEnd = false;
            this.cleanup();
        };

        // Handle start
        this.recognition.onstart = () => {
            console.log('BrowserSTT: Recognition started');
        };

        // Handle speech end (user stopped talking)
        this.recognition.onspeechend = () => {
            // Don't do anything special - onend will handle restart if needed
        };

        // Start recognition
        try {
            this.recognition.start();
        } catch (e) {
            this.cleanup();
            throw new Error(`Failed to start speech recognition: ${e}`);
        }
    }

    /**
     * Stop streaming and return final transcript
     */
    async stopStreaming(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.isStreaming || !this.recognition) {
                resolve(this.finalTranscript);
                return;
            }

            this.restartOnEnd = false;
            this.isStreaming = false;
            this.resolveStop = resolve;

            try {
                this.recognition.stop();
            } catch (e) {
                console.warn('BrowserSTT: Error stopping recognition:', e);
                resolve(this.finalTranscript);
                this.cleanup();
            }
        });
    }

    /**
     * Abort streaming immediately (discard results)
     */
    abort(): void {
        this.restartOnEnd = false;
        this.isStreaming = false;

        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (e) {
                // Ignore abort errors
            }
        }

        this.cleanup();
    }

    /**
     * Check if currently streaming
     */
    isCurrentlyStreaming(): boolean {
        return this.isStreaming;
    }

    /**
     * Get the current interim transcript
     */
    getInterimTranscript(): string {
        return this.interimTranscript;
    }

    /**
     * Get the current final transcript
     */
    getFinalTranscript(): string {
        return this.finalTranscript;
    }

    /**
     * Cleanup internal state
     */
    private cleanup(): void {
        this.recognition = null;
        this.partialCallback = null;
        this.interimTranscript = '';
        this.isStreaming = false;
        this.restartOnEnd = false;
    }
}

// Singleton export
export const browserSTT = new BrowserSTTProvider();
