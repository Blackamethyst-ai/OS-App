/**
 * VOICE NEXUS - Realtime Mode Handler
 *
 * Handles Gemini Live end-to-end bidirectional streaming.
 * Fastest mode (~500ms latency) with real-time audio I/O.
 */

import type { ModeHandler, ModeContext } from './types';
import type { LiveServerMessage } from '@google/genai';
import { liveSession } from '../../liveSession';
import { geminiLiveSTT } from '../providers/stt/geminiLive';

class RealtimeModeHandler implements ModeHandler {
    readonly name = 'realtime';

    /**
     * Check if realtime mode is available (requires Gemini API key)
     */
    isAvailable(): boolean {
        return geminiLiveSTT.isAvailable();
    }

    /**
     * Start realtime mode with Gemini Live
     */
    async start(context: ModeContext): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Realtime mode requires Gemini API key');
        }

        const systemPrompt = context.buildSystemPrompt();

        await liveSession.connect(context.config.agent.name, {
            systemInstruction: systemPrompt,
            tools: context.buildTools(),
            callbacks: {
                onopen: () => {
                    if (import.meta.env.DEV) {
                        console.log('VoiceNexus [Realtime]: Session connected');
                    }
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

        // Set up agent switch handler
        liveSession.onAgentSwitch = (agentName: string) => {
            if (import.meta.env.DEV) {
                console.log(`VoiceNexus [Realtime]: Switching to agent ${agentName}`);
            }
        };
    }

    /**
     * Stop realtime mode
     */
    stop(context: ModeContext): void {
        liveSession.disconnect();
    }

    /**
     * Handle messages from Gemini Live in realtime mode
     */
    async handleMessage(message: LiveServerMessage, context: ModeContext): Promise<void> {
        // Handle tool calls
        if (message.toolCall && context.toolHandler) {
            for (const fc of message.toolCall.functionCalls) {
                await context.toolHandler(fc.name, fc.args);
            }
        }

        // Handle model transcripts (AI responses)
        const parts = message.serverContent?.modelTurn?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.text) {
                    const transcript = context.createTranscript('model', part.text);
                    context.addTranscript(transcript);
                }
            }
        }

        // Handle input transcription (user speech)
        const inputTranscript = (message as any).serverContent?.inputTranscription;
        if (inputTranscript) {
            const transcript = context.createTranscript('user', inputTranscript);
            context.addTranscript(transcript);
        }
    }
}

export const realtimeMode = new RealtimeModeHandler();
