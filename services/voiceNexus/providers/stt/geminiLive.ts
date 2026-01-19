/**
 * VOICE NEXUS - Gemini Live STT Provider
 *
 * Wraps the existing liveSession.ts for real-time speech-to-text.
 * Provides lowest latency (~200ms) bidirectional audio streaming.
 */

import type { STTProvider } from '../../types';
import { liveSession } from '../../../liveSession';
import { apiKeyService } from '../../../apiKeyService';

/**
 * Gemini Live STT Provider
 *
 * Uses Gemini 2.0 Flash for real-time streaming transcription.
 * Note: This provider integrates tightly with the Gemini Live API
 * which handles both STT and response generation in one stream.
 */
class GeminiLiveSTTProvider implements STTProvider {
    readonly name = 'gemini-live';
    readonly supportsStreaming = true;

    private partialCallback: ((text: string) => void) | null = null;
    private finalTranscript = '';
    private isStreaming = false;

    /**
     * Check if Gemini API key is configured
     */
    isAvailable(): boolean {
        return !!apiKeyService.getKey('gemini');
    }

    /**
     * Transcribe audio blob to text (batch mode)
     *
     * Note: Gemini Live is primarily designed for streaming.
     * For batch transcription, consider using the Whisper provider.
     */
    async transcribe(audio: Blob): Promise<string> {
        // For batch mode, we'd need to use a different Gemini API endpoint
        // The Live API is designed for real-time streaming
        // This is a placeholder - in practice, Gemini Live handles STT internally
        console.warn('GeminiLiveSTT: Batch transcription not optimal. Use streaming mode.');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    // In a real implementation, this would send to Gemini's
                    // batch transcription API (if available) or buffer for streaming
                    resolve('[Batch transcription via Gemini not implemented - use streaming]');
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read audio blob'));
            reader.readAsArrayBuffer(audio);
        });
    }

    /**
     * Start streaming transcription
     *
     * Note: The actual streaming is handled by liveSession.connect()
     * This method sets up callbacks for partial transcripts.
     */
    async startStreaming(onPartial: (text: string) => void): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Gemini API key not configured');
        }

        this.partialCallback = onPartial;
        this.finalTranscript = '';
        this.isStreaming = true;

        // The actual streaming connection is managed by VoiceNexusOrchestrator
        // which uses liveSession.connect() with appropriate callbacks
    }

    /**
     * Stop streaming and return final transcript
     */
    async stopStreaming(): Promise<string> {
        this.isStreaming = false;
        this.partialCallback = null;
        const result = this.finalTranscript;
        this.finalTranscript = '';
        return result;
    }

    /**
     * Called by orchestrator when partial transcript received from Gemini Live
     */
    handlePartialTranscript(text: string): void {
        if (this.partialCallback && this.isStreaming) {
            this.partialCallback(text);
        }
    }

    /**
     * Called by orchestrator when final transcript received
     */
    handleFinalTranscript(text: string): void {
        this.finalTranscript = text;
    }

    /**
     * Get the underlying liveSession for direct access
     */
    getLiveSession() {
        return liveSession;
    }

    /**
     * Check if currently streaming
     */
    isCurrentlyStreaming(): boolean {
        return this.isStreaming && liveSession.isConnected();
    }
}

// Singleton export
export const geminiLiveSTT = new GeminiLiveSTTProvider();
