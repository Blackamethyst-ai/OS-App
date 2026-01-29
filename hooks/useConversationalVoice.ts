/**
 * useConversationalVoice Hook
 *
 * A state machine hook for natural conversational voice interactions.
 * Combines VAD, STT, and streaming TTS for seamless turn-taking.
 *
 * Features:
 * - Natural turn-taking without button presses
 * - Voice Activity Detection for barge-in/interruption
 * - Streaming STT for real-time transcription
 * - Streaming TTS for low-latency responses
 * - Auto-restart after AI finishes speaking
 *
 * State Machine:
 * ```
 * IDLE ──────▶ LISTENING ──────▶ PROCESSING ──────▶ SPEAKING
 *   ▲              │                                    │
 *   │              │ (silence/VAD)           (complete) │
 *   │              ▼                                    │
 *   └────────────────────────── AUTO_RESTART ◀─────────┘
 *              ▲
 *              │ (barge-in from SPEAKING)
 * ```
 *
 * @example
 * ```tsx
 * function VoiceChat() {
 *     const {
 *         state,
 *         transcript,
 *         start,
 *         stop,
 *         isActive,
 *     } = useConversationalVoice({
 *         onTranscriptComplete: async (text) => {
 *             const response = await generateResponse(text);
 *             return response;
 *         },
 *         onResponse: (text) => console.log('AI:', text),
 *     });
 *
 *     return (
 *         <button onClick={() => isActive ? stop() : start()}>
 *             {state === 'LISTENING' ? 'Listening...' :
 *              state === 'PROCESSING' ? 'Processing...' :
 *              state === 'SPEAKING' ? 'Speaking...' : 'Start'}
 *         </button>
 *     );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types
export type ConversationalVoiceState =
    | 'IDLE'
    | 'LISTENING'
    | 'PROCESSING'
    | 'SPEAKING'
    | 'ERROR';

export interface ConversationalVoiceConfig {
    /** Deepgram API key for streaming STT (optional - falls back to browser) */
    deepgramApiKey?: string;
    /** Supabase client for secure token fetching */
    supabaseClient?: { functions: { invoke: (name: string) => Promise<{ data: { key: string } | null; error: Error | null }> } };
    /** ElevenLabs API key for TTS */
    elevenLabsApiKey?: string;
    /** Voice ID or name for TTS (default: 'mike') */
    voice?: string;
    /** Enable VAD for automatic speech detection (default: true) */
    enableVAD?: boolean;
    /** Enable barge-in/interruption (default: true) */
    enableBargeIn?: boolean;
    /** Auto-restart listening after AI finishes speaking (default: true) */
    autoRestart?: boolean;
    /** VAD speech threshold (default: 0.5) */
    vadThreshold?: number;
    /** Silence timeout in ms before processing (default: 1200) */
    silenceTimeout?: number;
    /** TTS model (default: 'eleven_turbo_v2_5') */
    ttsModel?: string;
}

export interface ConversationalVoiceCallbacks {
    /** Called when user transcript is complete - return AI response text */
    onTranscriptComplete: (transcript: string) => Promise<string>;
    /** Called with partial transcripts during listening */
    onPartialTranscript?: (text: string, isFinal: boolean) => void;
    /** Called when AI response is received */
    onResponse?: (text: string) => void;
    /** Called on state changes */
    onStateChange?: (state: ConversationalVoiceState) => void;
    /** Called on error */
    onError?: (error: Error) => void;
    /** Called when barge-in occurs */
    onBargeIn?: () => void;
}

export interface UseConversationalVoiceReturn {
    /** Current state machine state */
    state: ConversationalVoiceState;
    /** Current transcript (user's speech) */
    transcript: string;
    /** Current AI response being spoken */
    response: string;
    /** Whether the voice system is active */
    isActive: boolean;
    /** Start the conversational voice session */
    start: () => Promise<void>;
    /** Stop the session */
    stop: () => void;
    /** Toggle start/stop */
    toggle: () => void;
    /** Manually trigger processing (skip waiting for silence) */
    submitNow: () => void;
    /** Speech probability from VAD (0-1) */
    speechProbability: number;
    /** Error message if in ERROR state */
    error: string | null;
}

// Provider types (dynamic imports)
type STTProvider = {
    startStreaming: (onPartial: (text: string, isFinal?: boolean) => void) => Promise<void>;
    stopStreaming: () => Promise<string>;
    isAvailable: () => boolean;
};

type VADProvider = {
    start: () => Promise<void>;
    pause: () => void;
    resume: () => Promise<void>;
    stop: () => void;
    getState: () => string;
    getSpeechProbability: () => number;
    isAvailable: () => boolean;
};

type TTSProvider = {
    synthesize: (text: string, voice: string) => Promise<ArrayBuffer>;
    isAvailable: () => boolean;
};

type AudioPlayer = {
    addChunk: (chunk: ArrayBuffer) => void;
    interrupt: () => Promise<void>;
    stop: () => void;
    isPlaying: () => boolean;
    destroy: () => void;
};

/**
 * Hook for conversational voice interactions
 */
export function useConversationalVoice(
    config: ConversationalVoiceConfig,
    callbacks: ConversationalVoiceCallbacks
): UseConversationalVoiceReturn {
    const {
        deepgramApiKey,
        supabaseClient,
        elevenLabsApiKey,
        voice = 'mike',
        enableVAD = true,
        enableBargeIn = true,
        autoRestart = true,
        vadThreshold = 0.5,
        silenceTimeout = 1200,
    } = config;

    const {
        onTranscriptComplete,
        onPartialTranscript,
        onResponse,
        onStateChange,
        onError,
        onBargeIn,
    } = callbacks;

    // State
    const [state, setState] = useState<ConversationalVoiceState>('IDLE');
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [speechProbability, setSpeechProbability] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Refs for providers (avoid re-renders)
    const sttRef = useRef<STTProvider | null>(null);
    const vadRef = useRef<VADProvider | null>(null);
    const ttsRef = useRef<TTSProvider | null>(null);
    const audioPlayerRef = useRef<AudioPlayer | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Update state with callback
    const updateState = useCallback((newState: ConversationalVoiceState) => {
        setState(newState);
        onStateChange?.(newState);
    }, [onStateChange]);

    // Clear silence timer
    const clearSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    // Start silence timer
    const startSilenceTimer = useCallback(() => {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
            // Silence detected - process transcript
            if (state === 'LISTENING' && transcript.trim()) {
                processTranscript();
            }
        }, silenceTimeout);
    }, [clearSilenceTimer, silenceTimeout, state, transcript]);

    // Process the transcript
    const processTranscript = useCallback(async () => {
        if (state !== 'LISTENING' || !transcript.trim()) return;

        updateState('PROCESSING');
        clearSilenceTimer();

        // Stop STT
        if (sttRef.current) {
            try {
                await sttRef.current.stopStreaming();
            } catch (err) {
                console.error('[ConversationalVoice] Error stopping STT:', err);
            }
        }

        // Pause VAD during processing/speaking
        if (vadRef.current) {
            vadRef.current.pause();
        }

        try {
            // Get AI response
            const responseText = await onTranscriptComplete(transcript);
            setResponse(responseText);
            onResponse?.(responseText);

            // Start speaking
            updateState('SPEAKING');
            await speakResponse(responseText);

            // After speaking, auto-restart if enabled
            if (autoRestart && isActive) {
                setTranscript('');
                setResponse('');
                await startListening();
            } else {
                updateState('IDLE');
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error.message);
            updateState('ERROR');
            onError?.(error);
        }
    }, [state, transcript, onTranscriptComplete, onResponse, autoRestart, isActive, updateState, clearSilenceTimer]);

    // Speak the response
    const speakResponse = useCallback(async (text: string) => {
        if (!ttsRef.current || !audioPlayerRef.current) {
            console.warn('[ConversationalVoice] TTS not available, skipping speech');
            return;
        }

        // Enable VAD for barge-in detection during speaking
        if (enableBargeIn && vadRef.current) {
            await vadRef.current.resume();
        }

        try {
            // Split into sentences for progressive playback
            const sentences = splitIntoSentences(text);

            for (const sentence of sentences) {
                if (abortControllerRef.current?.signal.aborted) break;
                if (!sentence.trim()) continue;

                const audio = await ttsRef.current!.synthesize(sentence, voice);
                if (!abortControllerRef.current?.signal.aborted) {
                    audioPlayerRef.current!.addChunk(audio);
                }
            }

            // Wait for playback to complete
            while (audioPlayerRef.current?.isPlaying() && !abortControllerRef.current?.signal.aborted) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (err) {
            console.error('[ConversationalVoice] TTS error:', err);
            throw err;
        }
    }, [voice, enableBargeIn]);

    // Handle barge-in (user interrupting AI)
    const handleBargeIn = useCallback(async () => {
        if (state !== 'SPEAKING' || !enableBargeIn) return;

        console.log('[ConversationalVoice] Barge-in detected');
        onBargeIn?.();

        // Abort current response
        abortControllerRef.current?.abort();

        // Stop audio playback with fade
        if (audioPlayerRef.current) {
            await audioPlayerRef.current.interrupt();
        }

        // Clear response and restart listening
        setResponse('');
        setTranscript('');
        await startListening();
    }, [state, enableBargeIn, onBargeIn]);

    // Start listening
    const startListening = useCallback(async () => {
        abortControllerRef.current = new AbortController();
        updateState('LISTENING');

        // Start VAD
        if (enableVAD && vadRef.current) {
            await vadRef.current.start();
        }

        // Start STT
        if (sttRef.current) {
            await sttRef.current.startStreaming((text, isFinal) => {
                setTranscript(text);
                onPartialTranscript?.(text, !!isFinal);

                if (isFinal) {
                    // Reset silence timer on final transcript
                    startSilenceTimer();
                }
            });
        }
    }, [enableVAD, updateState, onPartialTranscript, startSilenceTimer]);

    // Initialize providers
    const initializeProviders = useCallback(async () => {
        try {
            // Dynamically import providers
            const [sttModule, vadModule, ttsModule, audioModule] = await Promise.all([
                import('@metaventionsai/voice-nexus/providers/stt'),
                import('@metaventionsai/voice-nexus/providers/vad'),
                import('@metaventionsai/voice-nexus/providers/tts'),
                import('@metaventionsai/voice-nexus/audio'),
            ]);

            // Initialize STT (prefer Deepgram with Supabase, fallback to browser)
            if (supabaseClient || deepgramApiKey) {
                const deepgramOpts: { apiKey?: string; supabaseClient?: typeof supabaseClient } = {};
                if (deepgramApiKey) deepgramOpts.apiKey = deepgramApiKey;
                if (supabaseClient) deepgramOpts.supabaseClient = supabaseClient;

                if (sttModule.isDeepgramSTTAvailable(deepgramOpts)) {
                    sttRef.current = sttModule.createDeepgramSTT(deepgramOpts);
                }
            }

            // Fallback to browser STT
            if (!sttRef.current && sttModule.isBrowserSTTAvailable()) {
                sttRef.current = sttModule.createBrowserSTT();
            }

            // Initialize VAD
            if (enableVAD && vadModule.isSileroVADAvailable()) {
                vadRef.current = vadModule.createSileroVAD({
                    positiveSpeechThreshold: vadThreshold,
                    onSpeechStart: () => {
                        if (state === 'SPEAKING' && enableBargeIn) {
                            handleBargeIn();
                        } else if (state === 'LISTENING') {
                            clearSilenceTimer();
                        }
                    },
                    onSpeechEnd: () => {
                        if (state === 'LISTENING') {
                            startSilenceTimer();
                        }
                    },
                    onFrameProcessed: (probs) => {
                        setSpeechProbability(probs.isSpeech);
                    },
                });
            }

            // Initialize TTS
            if (elevenLabsApiKey && ttsModule.createElevenLabsTTS) {
                ttsRef.current = ttsModule.createElevenLabsTTS({ apiKey: elevenLabsApiKey });
            }

            // Initialize audio player
            audioPlayerRef.current = audioModule.createStreamingAudioPlayer({
                onPlaybackEnd: () => {
                    // Playback complete
                },
                onInterrupt: () => {
                    console.log('[ConversationalVoice] Audio interrupted');
                },
            });

            return true;
        } catch (err) {
            console.error('[ConversationalVoice] Failed to initialize providers:', err);
            return false;
        }
    }, [deepgramApiKey, supabaseClient, elevenLabsApiKey, enableVAD, vadThreshold, enableBargeIn, state, handleBargeIn, clearSilenceTimer, startSilenceTimer]);

    // Start the voice session
    const start = useCallback(async () => {
        if (isActive) return;

        setIsActive(true);
        setError(null);
        setTranscript('');
        setResponse('');

        const initialized = await initializeProviders();
        if (!initialized) {
            setError('Failed to initialize voice providers');
            updateState('ERROR');
            setIsActive(false);
            return;
        }

        await startListening();
    }, [isActive, initializeProviders, startListening, updateState]);

    // Stop the voice session
    const stop = useCallback(() => {
        setIsActive(false);
        clearSilenceTimer();
        abortControllerRef.current?.abort();

        if (sttRef.current) {
            sttRef.current.stopStreaming().catch(() => {});
        }

        if (vadRef.current) {
            vadRef.current.stop();
        }

        if (audioPlayerRef.current) {
            audioPlayerRef.current.stop();
        }

        updateState('IDLE');
    }, [clearSilenceTimer, updateState]);

    // Toggle start/stop
    const toggle = useCallback(() => {
        if (isActive) {
            stop();
        } else {
            start();
        }
    }, [isActive, start, stop]);

    // Submit transcript immediately
    const submitNow = useCallback(() => {
        if (state === 'LISTENING' && transcript.trim()) {
            processTranscript();
        }
    }, [state, transcript, processTranscript]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
            audioPlayerRef.current?.destroy();
        };
    }, [stop]);

    return {
        state,
        transcript,
        response,
        isActive,
        start,
        stop,
        toggle,
        submitNow,
        speechProbability,
        error,
    };
}

// Helper: Split text into sentences
function splitIntoSentences(text: string): string[] {
    const sentences: string[] = [];
    const parts = text.split(/([.!?]+\s+)/);
    let current = '';

    for (const part of parts) {
        if (/^[.!?]+\s*$/.test(part)) {
            current += part;
            if (current.trim()) {
                sentences.push(current.trim());
            }
            current = '';
        } else {
            current += part;
        }
    }

    if (current.trim()) {
        sentences.push(current.trim());
    }

    return sentences;
}

export default useConversationalVoice;
