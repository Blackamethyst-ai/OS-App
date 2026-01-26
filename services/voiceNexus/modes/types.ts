/**
 * VOICE NEXUS - Mode Handler Types
 *
 * Shared interfaces for all voice mode implementations.
 */

import type { VoiceNexusConfig, VoiceNexusEvents, Transcript, VoiceToolHandler } from '../types';
import type { LiveServerMessage } from '@google/genai';

/**
 * Mode handler context - shared dependencies
 */
export interface ModeContext {
    config: VoiceNexusConfig;
    events: VoiceNexusEvents;
    toolHandler: VoiceToolHandler | null;
    buildSystemPrompt: () => string;
    buildTools: () => any[];
    createTranscript: (
        role: 'user' | 'model' | 'system',
        text: string,
        complexity?: number,
        provider?: string
    ) => Transcript;
    addTranscript: (transcript: Transcript) => void;
    processText: (text: string) => Promise<string>;
    setIsActive: (active: boolean) => void;
    setError: (error: string | null) => void;
    setCurrentProvider: (provider: { stt?: string; reasoning?: string; tts?: string }) => void;
}

/**
 * Mode handler interface - all modes must implement this
 */
export interface ModeHandler {
    /** Mode name for identification */
    readonly name: string;

    /** Start the mode */
    start(context: ModeContext): Promise<void>;

    /** Stop the mode */
    stop(context: ModeContext): void;

    /** Handle incoming messages (if applicable) */
    handleMessage?(message: LiveServerMessage, context: ModeContext): Promise<void>;

    /** Check if mode is available */
    isAvailable(): boolean;
}

/**
 * Mode handler factory function type
 */
export type ModeHandlerFactory = () => ModeHandler;
