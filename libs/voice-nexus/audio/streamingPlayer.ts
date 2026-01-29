/**
 * Streaming Audio Player for Voice Nexus
 *
 * Handles audio chunk buffering, playback, crossfade on interruption,
 * and abort support for conversational voice.
 *
 * @example
 * ```typescript
 * import { createStreamingAudioPlayer } from '@metaventionsai/voice-nexus/audio';
 *
 * const player = createStreamingAudioPlayer({
 *     onPlaybackStart: () => console.log('Started playing'),
 *     onPlaybackEnd: () => console.log('Finished playing'),
 * });
 *
 * // Add audio chunks as they arrive
 * player.addChunk(audioBuffer1);
 * player.addChunk(audioBuffer2);
 *
 * // Interrupt with fade-out
 * await player.interrupt();
 *
 * // Or stop immediately
 * player.stop();
 * ```
 */

export interface StreamingAudioPlayerOptions {
    /** Fade duration in ms for interruption crossfade (default: 50) */
    fadeDuration?: number;
    /** Callback when playback starts */
    onPlaybackStart?: () => void;
    /** Callback when playback ends naturally */
    onPlaybackEnd?: () => void;
    /** Callback when playback is interrupted */
    onInterrupt?: () => void;
    /** Callback for playback errors */
    onError?: (error: Error) => void;
}

export interface StreamingAudioPlayer {
    /** Add an audio chunk to the playback queue */
    addChunk(chunk: ArrayBuffer): void;

    /** Check if currently playing */
    isPlaying(): boolean;

    /** Get current playback position in seconds */
    getCurrentTime(): number;

    /** Interrupt playback with fade-out */
    interrupt(): Promise<void>;

    /** Stop playback immediately */
    stop(): void;

    /** Clear the buffer queue */
    clearQueue(): void;

    /** Destroy the player and release resources */
    destroy(): void;
}

/**
 * Create a streaming audio player
 */
export function createStreamingAudioPlayer(
    options: StreamingAudioPlayerOptions = {}
): StreamingAudioPlayer {
    const {
        fadeDuration = 50,
        onPlaybackStart,
        onPlaybackEnd,
        onInterrupt,
        onError,
    } = options;

    let audioContext: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    let sourceNode: AudioBufferSourceNode | null = null;
    const chunkQueue: ArrayBuffer[] = [];
    let isCurrentlyPlaying = false;
    let isProcessingQueue = false;
    let playbackStartTime = 0;
    let abortController: AbortController | null = null;

    // Initialize audio context lazily (browser policy)
    function ensureAudioContext(): AudioContext {
        if (!audioContext) {
            audioContext = new AudioContext();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
        }

        // Resume if suspended (autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        return audioContext;
    }

    // Decode audio chunk to AudioBuffer
    async function decodeChunk(chunk: ArrayBuffer): Promise<AudioBuffer | null> {
        try {
            const ctx = ensureAudioContext();
            // Clone the buffer because decodeAudioData detaches it
            const clonedBuffer = chunk.slice(0);
            return await ctx.decodeAudioData(clonedBuffer);
        } catch (error) {
            console.error('[StreamingAudioPlayer] Failed to decode chunk:', error);
            return null;
        }
    }

    // Play the next chunk in queue
    async function processQueue(): Promise<void> {
        if (isProcessingQueue) return;
        isProcessingQueue = true;

        while (chunkQueue.length > 0) {
            if (abortController?.signal.aborted) {
                break;
            }

            const chunk = chunkQueue.shift();
            if (!chunk) continue;

            const buffer = await decodeChunk(chunk);
            if (!buffer) continue;

            if (abortController?.signal.aborted) {
                break;
            }

            await playBuffer(buffer);
        }

        isProcessingQueue = false;

        if (!abortController?.signal.aborted && !isCurrentlyPlaying) {
            onPlaybackEnd?.();
        }
    }

    // Play a single AudioBuffer
    function playBuffer(buffer: AudioBuffer): Promise<void> {
        return new Promise((resolve) => {
            const ctx = ensureAudioContext();
            if (!gainNode) return resolve();

            // Clean up previous source
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch {
                    // Ignore errors from already stopped sources
                }
            }

            sourceNode = ctx.createBufferSource();
            sourceNode.buffer = buffer;
            sourceNode.connect(gainNode);

            if (!isCurrentlyPlaying) {
                isCurrentlyPlaying = true;
                playbackStartTime = ctx.currentTime;
                gainNode.gain.setValueAtTime(1, ctx.currentTime);
                onPlaybackStart?.();
            }

            sourceNode.onended = () => {
                resolve();
            };

            sourceNode.start();
        });
    }

    // Fade out and stop
    async function fadeOut(): Promise<void> {
        if (!audioContext || !gainNode) return;

        const currentTime = audioContext.currentTime;
        const fadeEndTime = currentTime + fadeDuration / 1000;

        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, fadeEndTime);

        // Wait for fade to complete
        await new Promise(resolve => setTimeout(resolve, fadeDuration));
    }

    return {
        addChunk(chunk: ArrayBuffer): void {
            chunkQueue.push(chunk);

            // Start processing if not already
            if (!isProcessingQueue && !abortController?.signal.aborted) {
                abortController = new AbortController();
                processQueue().catch(onError);
            }
        },

        isPlaying(): boolean {
            return isCurrentlyPlaying;
        },

        getCurrentTime(): number {
            if (!audioContext || !isCurrentlyPlaying) return 0;
            return audioContext.currentTime - playbackStartTime;
        },

        async interrupt(): Promise<void> {
            // Signal abort
            abortController?.abort();
            abortController = null;

            // Fade out if playing
            if (isCurrentlyPlaying) {
                await fadeOut();
            }

            // Stop the source
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch {
                    // Ignore
                }
                sourceNode = null;
            }

            // Clear queue and reset state
            chunkQueue.length = 0;
            isCurrentlyPlaying = false;
            isProcessingQueue = false;

            // Reset gain for next playback
            if (gainNode && audioContext) {
                gainNode.gain.setValueAtTime(1, audioContext.currentTime);
            }

            onInterrupt?.();
        },

        stop(): void {
            abortController?.abort();
            abortController = null;

            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch {
                    // Ignore
                }
                sourceNode = null;
            }

            chunkQueue.length = 0;
            isCurrentlyPlaying = false;
            isProcessingQueue = false;

            if (gainNode && audioContext) {
                gainNode.gain.setValueAtTime(1, audioContext.currentTime);
            }
        },

        clearQueue(): void {
            chunkQueue.length = 0;
        },

        destroy(): void {
            this.stop();

            if (gainNode) {
                gainNode.disconnect();
                gainNode = null;
            }

            if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
        },
    };
}

/**
 * Split text into sentences for progressive TTS
 *
 * Handles common sentence boundaries including:
 * - Period, question mark, exclamation
 * - Handles abbreviations (Dr., Mr., Mrs., etc.)
 * - Handles numbers with decimals
 */
export function splitIntoSentences(text: string): string[] {
    // Common abbreviations that shouldn't end sentences
    const abbreviations = new Set([
        'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd',
        'st', 'ave', 'blvd', 'rd', 'no', 'vol', 'rev', 'gen', 'gov', 'sen',
        'rep', 'col', 'capt', 'lt', 'sgt', 'cpl', 'pvt', 'phd', 'md', 'ba',
        'bs', 'ma', 'mba', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug',
        'sep', 'oct', 'nov', 'dec', 'fig', 'eq', 'sec', 'ch', 'pt', 'ex',
    ]);

    const sentences: string[] = [];
    let current = '';

    // Split on sentence boundaries
    const parts = text.split(/([.!?]+["']?\s+)/);

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (!part) continue;

        // Check if this is a sentence-ending delimiter
        if (/^[.!?]+["']?\s*$/.test(part)) {
            current += part;

            // Check if the previous word was an abbreviation
            const words = current.trim().split(/\s+/);
            const lastWord = words[words.length - 1]?.replace(/[.!?]+["']?$/, '').toLowerCase();

            if (lastWord && abbreviations.has(lastWord)) {
                // Don't end sentence on abbreviation
                continue;
            }

            // Check if this looks like a decimal number (e.g., "3.14")
            const beforeDelim = current.slice(0, current.lastIndexOf(part[0]));
            if (/\d$/.test(beforeDelim) && /^\.\d/.test(parts[i + 1] || '')) {
                continue;
            }

            // End the sentence
            if (current.trim()) {
                sentences.push(current.trim());
            }
            current = '';
        } else {
            current += part;
        }
    }

    // Add remaining text
    if (current.trim()) {
        sentences.push(current.trim());
    }

    return sentences;
}

/**
 * Stream TTS synthesis sentence-by-sentence
 *
 * Processes text progressively for lower latency.
 */
export async function streamSentenceBysentence(
    text: string,
    synthesizeFn: (sentence: string) => Promise<ArrayBuffer>,
    onChunk: (chunk: ArrayBuffer, sentenceIndex: number, totalSentences: number) => void,
    signal?: AbortSignal
): Promise<void> {
    const sentences = splitIntoSentences(text);

    for (let i = 0; i < sentences.length; i++) {
        if (signal?.aborted) {
            break;
        }

        const sentence = sentences[i];
        if (!sentence.trim()) continue;

        try {
            const audio = await synthesizeFn(sentence);
            if (!signal?.aborted) {
                onChunk(audio, i, sentences.length);
            }
        } catch (error) {
            console.error(`[StreamTTS] Error synthesizing sentence ${i}:`, error);
            throw error;
        }
    }
}

// Default export
export default createStreamingAudioPlayer;
