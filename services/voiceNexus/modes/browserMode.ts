/**
 * VOICE NEXUS - Browser Mode Handler
 *
 * Uses Web Speech API for STT (no external API required).
 * Routes through complexity router for reasoning + TTS.
 *
 * Fallback mode when Gemini Live is unavailable.
 */

import type { ModeHandler, ModeContext } from './types';
import { browserSTT } from '../providers/stt/browserSTT';
import { logger } from '../../logger';

class BrowserModeHandler implements ModeHandler {
    readonly name = 'browser';
    private processingTimeout: NodeJS.Timeout | null = null;
    private lastProcessedTranscript = '';
    private isRunning = false;

    /**
     * Check if browser mode is available (Web Speech API)
     */
    isAvailable(): boolean {
        return browserSTT.isAvailable();
    }

    /**
     * Start browser mode with Web Speech API STT
     */
    async start(context: ModeContext): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Browser STT (Web Speech API) is not available in this browser');
        }

        logger.info('Starting browser STT mode', undefined, 'BrowserMode');

        this.isRunning = true;
        this.lastProcessedTranscript = '';

        context.setCurrentProvider({ stt: 'browser' });
        context.events.onProviderSwitch?.({ stt: 'browser' });

        await browserSTT.startStreaming((transcript) => {
            this.handleTranscriptUpdate(transcript, context);
        });
    }

    /**
     * Stop browser mode
     */
    stop(context: ModeContext): void {
        this.isRunning = false;

        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
        }

        if (browserSTT.isCurrentlyStreaming()) {
            browserSTT.stopStreaming().catch(err => logger.error('Failed to stop streaming', err, 'BrowserMode'));
        }
    }

    /**
     * Handle transcript updates from browser STT
     * Debounces processing to wait for natural pause in speech
     */
    private handleTranscriptUpdate(transcript: string, context: ModeContext): void {
        if (!this.isRunning) return;

        // Emit partial transcript for UI feedback
        context.events.onPartialTranscript?.({ role: 'user', text: transcript });

        // Clear previous processing timeout
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
        }

        // Wait for pause in speech before processing (debounce)
        this.processingTimeout = setTimeout(async () => {
            if (!this.isRunning) return;

            // Only process if transcript changed significantly
            if (transcript.length > this.lastProcessedTranscript.length + 5) {
                const newText = transcript.slice(this.lastProcessedTranscript.length).trim();

                if (newText.length > 3) {
                    // Create user transcript
                    const userTranscript = context.createTranscript('user', newText);
                    context.addTranscript(userTranscript);

                    // Process through reasoning pipeline
                    try {
                        await context.processText(newText);
                        this.lastProcessedTranscript = transcript;
                    } catch (error) {
                        logger.error('Error processing transcript', error, 'BrowserMode');
                        context.events.onError?.(
                            error instanceof Error ? error : new Error(String(error))
                        );
                    }
                }
            }
        }, 1500); // 1.5 second pause triggers processing
    }

    /**
     * Reset transcript tracking (useful for new conversations)
     */
    resetTranscript(): void {
        this.lastProcessedTranscript = '';
    }
}

export const browserMode = new BrowserModeHandler();
