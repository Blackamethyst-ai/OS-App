/**
 * Deepgram STT Provider for Voice Nexus
 *
 * Uses Deepgram Nova-3 for ultra-low-latency streaming speech-to-text.
 * Sub-300ms latency, excellent accuracy, $0.0077/min.
 *
 * @example
 * ```typescript
 * import { createDeepgramSTT } from '@metaventionsai/voice-nexus/providers/stt/deepgram';
 *
 * const stt = createDeepgramSTT({ apiKey: 'your-key' });
 *
 * // Start streaming transcription
 * await stt.startStreaming((text, isFinal) => {
 *     console.log(isFinal ? 'Final:' : 'Partial:', text);
 * });
 *
 * // Stop and get final transcription
 * const finalText = await stt.stopStreaming();
 * ```
 */

import type { STTProvider } from '../../types';
import { logger } from '../../../../services/logger';

export interface DeepgramSTTOptions {
    /** Deepgram API key - if not provided, will fetch from tokenEndpoint */
    apiKey?: string;
    /** Token endpoint URL to fetch API key securely (e.g., Supabase Edge Function) */
    tokenEndpoint?: string;
    /** Supabase client for fetching token via Edge Function */
    supabaseClient?: { functions: { invoke: (name: string) => Promise<{ data: { key: string } | null; error: Error | null }> } };
    /** Model to use (default: 'nova-3') */
    model?: string;
    /** Language for recognition (default: 'en-US') */
    language?: string;
    /** Enable interim results (default: true) */
    interimResults?: boolean;
    /** Enable smart formatting (default: true) */
    smartFormat?: boolean;
    /** Enable punctuation (default: true) */
    punctuate?: boolean;
    /** Enable diarization (default: false) */
    diarize?: boolean;
    /** Endpointing silence threshold in ms (default: 1200) */
    endpointing?: number;
    /** Sample rate for audio (default: 16000) */
    sampleRate?: number;
}

// Deepgram WebSocket message types
interface DeepgramTranscriptWord {
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word?: string;
}

interface DeepgramTranscriptAlternative {
    transcript: string;
    confidence: number;
    words: DeepgramTranscriptWord[];
}

interface DeepgramTranscriptChannel {
    alternatives: DeepgramTranscriptAlternative[];
}

interface DeepgramTranscriptMessage {
    type: 'Results';
    channel_index: number[];
    duration: number;
    start: number;
    is_final: boolean;
    speech_final: boolean;
    channel: DeepgramTranscriptChannel;
}

interface DeepgramMetadataMessage {
    type: 'Metadata';
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
}

type DeepgramMessage = DeepgramTranscriptMessage | DeepgramMetadataMessage | { type: string };

/**
 * Create a Deepgram STT provider for Voice Nexus
 *
 * Uses WebSocket streaming for ultra-low-latency transcription.
 * Supports secure token fetching via Supabase Edge Functions.
 */
export function createDeepgramSTT(options: DeepgramSTTOptions): STTProvider {
    const {
        apiKey: initialApiKey,
        tokenEndpoint,
        supabaseClient,
        model = 'nova-3',
        language = 'en-US',
        interimResults = true,
        smartFormat = true,
        punctuate = true,
        diarize = false,
        endpointing = 1200,
        sampleRate = 16000,
    } = options;

    let apiKey = initialApiKey;
    let websocket: WebSocket | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    let mediaStream: MediaStream | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;
    let isListening = false;
    let currentTranscript = '';
    let onPartialCallback: ((text: string, isFinal?: boolean) => void) | null = null;
    let resolveStop: ((text: string) => void) | null = null;
    let rejectStop: ((error: Error) => void) | null = null;

    // Fetch API key from secure endpoint
    async function fetchApiKey(): Promise<string> {
        // If we have a direct API key, use it
        if (apiKey) return apiKey;

        // Try Supabase Edge Function first
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.functions.invoke('deepgram-token');
                if (error) throw error;
                if (data?.key) {
                    apiKey = data.key;
                    return apiKey;
                }
            } catch (err) {
                logger.error('[Deepgram] Failed to fetch token from Supabase:', err);
            }
        }

        // Try custom token endpoint
        if (tokenEndpoint) {
            try {
                const response = await fetch(tokenEndpoint);
                if (response.ok) {
                    const data = await response.json();
                    if (data.key) {
                        apiKey = data.key;
                        return apiKey;
                    }
                }
            } catch (err) {
                logger.error('[Deepgram] Failed to fetch token from endpoint:', err);
            }
        }

        throw new Error('No Deepgram API key available. Provide apiKey, supabaseClient, or tokenEndpoint.');
    }

    // Build WebSocket URL with query parameters
    function buildWebSocketUrl(): string {
        const params = new URLSearchParams({
            model,
            language,
            smart_format: smartFormat.toString(),
            punctuate: punctuate.toString(),
            diarize: diarize.toString(),
            interim_results: interimResults.toString(),
            endpointing: endpointing.toString(),
            sample_rate: sampleRate.toString(),
            encoding: 'linear16',
            channels: '1',
        });

        return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    }

    // Convert Float32Array to Int16Array for Deepgram
    function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
        const buffer = new ArrayBuffer(input.length * 2);
        const output = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return buffer;
    }

    // Handle incoming Deepgram messages
    function handleMessage(event: MessageEvent): void {
        try {
            const data: DeepgramMessage = JSON.parse(event.data);

            if (data.type === 'Results') {
                const result = data as DeepgramTranscriptMessage;
                const transcript = result.channel?.alternatives?.[0]?.transcript || '';

                if (transcript) {
                    if (result.is_final) {
                        // Final result - append to current transcript
                        if (currentTranscript && !currentTranscript.endsWith(' ')) {
                            currentTranscript += ' ';
                        }
                        currentTranscript += transcript;
                    }

                    // Notify callback with current state
                    if (onPartialCallback) {
                        const displayText = result.is_final
                            ? currentTranscript
                            : currentTranscript + (currentTranscript ? ' ' : '') + transcript;
                        onPartialCallback(displayText, result.is_final);
                    }

                    // Check for speech_final (user stopped speaking)
                    if (result.speech_final && onPartialCallback) {
                        onPartialCallback(currentTranscript, true);
                    }
                }
            } else if (data.type === 'Metadata') {
                // Metadata received - connection established
                logger.info('[Deepgram] Connection established, ready for audio');
            }
        } catch (error) {
            logger.error('[Deepgram] Error parsing message:', error);
        }
    }

    // Start capturing audio from microphone
    async function startAudioCapture(): Promise<void> {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            audioContext = new AudioContext({ sampleRate });
            const source = audioContext.createMediaStreamSource(mediaStream);

            // Use ScriptProcessorNode for raw audio access
            // Note: AudioWorklet would be more performant but requires more setup
            scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
                if (websocket?.readyState === WebSocket.OPEN) {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const pcmData = floatTo16BitPCM(inputData);
                    websocket.send(pcmData);
                }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
        } catch (error) {
            throw new Error(`Failed to capture audio: ${error}`);
        }
    }

    // Stop audio capture and cleanup
    function stopAudioCapture(): void {
        if (scriptProcessor) {
            scriptProcessor.disconnect();
            scriptProcessor = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        if (mediaRecorder) {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            mediaRecorder = null;
        }
    }

    return {
        name: 'deepgram',
        supportsStreaming: true,

        isAvailable(): boolean {
            // Available if we have any way to get a key
            return !!(apiKey || supabaseClient || tokenEndpoint) && typeof WebSocket !== 'undefined';
        },

        async transcribe(audio: Blob): Promise<string> {
            // Fetch API key securely
            const key = await fetchApiKey();
            if (!key) {
                throw new Error('Deepgram API key not configured');
            }

            const response = await fetch(
                `https://api.deepgram.com/v1/listen?model=${model}&language=${language}&smart_format=${smartFormat}&punctuate=${punctuate}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Token ${key}`,
                        'Content-Type': audio.type || 'audio/webm',
                    },
                    body: audio,
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        },

        async startStreaming(onPartial: (text: string, isFinal?: boolean) => void): Promise<void> {
            if (isListening) {
                throw new Error('Already listening');
            }

            // Fetch API key securely
            const key = await fetchApiKey();
            if (!key) {
                throw new Error('Deepgram API key not configured');
            }

            currentTranscript = '';
            onPartialCallback = onPartial;
            isListening = true;

            return new Promise((resolve, reject) => {
                try {
                    // Create WebSocket connection
                    websocket = new WebSocket(buildWebSocketUrl(), ['token', key]);

                    websocket.onopen = async () => {
                        logger.info('[Deepgram] WebSocket connected');
                        try {
                            await startAudioCapture();
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };

                    websocket.onmessage = handleMessage;

                    websocket.onerror = (event) => {
                        logger.error('[Deepgram] WebSocket error:', event);
                        if (rejectStop) {
                            rejectStop(new Error('WebSocket error'));
                            rejectStop = null;
                            resolveStop = null;
                        }
                    };

                    websocket.onclose = (event) => {
                        logger.info('[Deepgram] WebSocket closed:', event.code, event.reason);
                        isListening = false;
                        stopAudioCapture();

                        if (resolveStop) {
                            resolveStop(currentTranscript);
                            resolveStop = null;
                            rejectStop = null;
                        }
                    };
                } catch (error) {
                    isListening = false;
                    reject(error);
                }
            });
        },

        async stopStreaming(): Promise<string> {
            if (!websocket || !isListening) {
                return currentTranscript;
            }

            return new Promise((resolve, reject) => {
                resolveStop = resolve;
                rejectStop = reject;

                // Stop audio capture first
                stopAudioCapture();

                // Send close frame to Deepgram
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                    // Send empty buffer to signal end of audio
                    websocket.send(new ArrayBuffer(0));
                    // Close the connection
                    setTimeout(() => {
                        websocket?.close(1000, 'Transcription complete');
                    }, 100);
                } else {
                    resolve(currentTranscript);
                }
            });
        },
    };
}

/**
 * Check if Deepgram STT is available
 * Returns true if we have any way to get a key (direct, supabase, or endpoint)
 */
export function isDeepgramSTTAvailable(options?: { apiKey?: string; supabaseClient?: unknown; tokenEndpoint?: string }): boolean {
    if (options) {
        return !!(options.apiKey || options.supabaseClient || options.tokenEndpoint) && typeof WebSocket !== 'undefined';
    }
    // Check for environment variable as fallback
    const envKey = typeof process !== 'undefined' ? process.env?.DEEPGRAM_API_KEY : undefined;
    return !!envKey && typeof WebSocket !== 'undefined';
}

// Default export for convenience
export default createDeepgramSTT;
