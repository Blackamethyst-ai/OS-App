/**
 * VOICE NEXUS - Hybrid Mode Handler
 *
 * Uses Gemini Live for STT, then routes through complexity router
 * for reasoning (Claude/Gemini) and premium TTS (ElevenLabs).
 *
 * Balances speed and quality (~2-4s latency).
 */

import type { ModeHandler, ModeContext } from './types';
import type { LiveServerMessage } from '@google/genai';
import { liveSession } from '../../liveSession';
import { geminiLiveSTT } from '../providers/stt/geminiLive';
import { logger } from '../../logger';

class HybridModeHandler implements ModeHandler {
    readonly name = 'hybrid';

    /**
     * Check if hybrid mode is available (requires Gemini API key for STT)
     */
    isAvailable(): boolean {
        return geminiLiveSTT.isAvailable();
    }

    /**
     * Start hybrid mode
     * Uses Gemini Live for STT only, with complexity-routed reasoning
     */
    async start(context: ModeContext): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Hybrid mode requires Gemini API key for STT');
        }

        // Minimal system prompt for STT-only usage
        const systemPrompt = `You are a voice assistant. Your ONLY job is to listen and transcribe what the user says.
After transcription, another system will generate the response. Do not respond conversationally.
Simply acknowledge with "[TRANSCRIBED]" after capturing user speech.`;

        await liveSession.connect(context.config.agent.name, {
            systemInstruction: systemPrompt,
            tools: context.buildTools(),
            callbacks: {
                onopen: () => {
                    logger.info('Session connected', undefined, 'HybridMode');
                },
                onmessage: async (message: LiveServerMessage) => {
                    await this.handleMessage(message, context);
                },
                onerror: (error: Error) => {
                    context.setError(error.message);
                    context.events.onError?.(error);
                },
                onclose: () => {
                    context.setIsActive(false);
                },
            },
        });
    }

    /**
     * Stop hybrid mode
     */
    stop(context: ModeContext): void {
        liveSession.disconnect();
    }

    /**
     * Handle messages in hybrid mode
     * Captures user transcription and routes through complexity-based pipeline
     */
    async handleMessage(message: LiveServerMessage, context: ModeContext): Promise<void> {
        // In hybrid mode, we capture the user's transcribed speech
        // and route it through our complexity-based system
        const inputTranscript = (message as any).serverContent?.inputTranscription;

        if (inputTranscript && inputTranscript.length > 5) {
            // Create user transcript
            const userTranscript = context.createTranscript('user', inputTranscript);
            context.addTranscript(userTranscript);

            // Process through our complexity-routed pipeline
            try {
                await context.processText(inputTranscript);
            } catch (error) {
                logger.error('Error processing message', error, 'HybridMode');
                context.events.onError?.(
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        }
    }
}

export const hybridMode = new HybridModeHandler();
