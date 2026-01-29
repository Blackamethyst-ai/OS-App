/**
 * VOICE SYSTEM - Unified Voice Stack
 *
 * Wraps all voice-related components into a single unit.
 * This simplifies App.tsx imports.
 *
 * Components:
 * - VoiceCoreOverlay: Voice session feedback UI (toggleable via store)
 * - VoiceManager: Gemini live session (Full Duplex)
 * - VoiceCoreManager: Modern browser STT + multi-LLM (disabled)
 * - UniversalVoiceProvider: UI scanning for voice control
 * - ConversationalVoiceOrb: Real-time conversational voice with VAD
 *
 * Voice Modes:
 * - 'gemini': Use Gemini Live for full-duplex streaming
 * - 'conversational': Use Deepgram STT + Claude + ElevenLabs TTS with VAD
 *
 * Environment Variables:
 * - VITE_DEEPGRAM_API_KEY: Deepgram API key for streaming STT
 * - VITE_ELEVENLABS_API_KEY: ElevenLabs API key for TTS
 * - VITE_VOICE_MODE: Voice mode ('gemini' | 'conversational', default: 'gemini')
 */

import React, { useMemo } from 'react';
import VoiceManager from './VoiceManager';
import UniversalVoiceProvider from '../UniversalVoiceProvider';
import VoiceCoreOverlay from './VoiceCoreOverlay';
import ConversationalVoiceOrb from './ConversationalVoiceOrb';
import { useAppStore } from '../../store';
import { supabase } from '../../services/supabaseService';

export type VoiceSystemMode = 'gemini' | 'conversational';

export interface VoiceSystemProps {
    /** Voice mode override (default: from env or 'gemini') */
    mode?: VoiceSystemMode;
    /** Custom response generator for conversational mode */
    onGenerateResponse?: (transcript: string) => Promise<string>;
    /** Show the conversational voice orb */
    showConversationalOrb?: boolean;
}

const VoiceSystem: React.FC<VoiceSystemProps> = ({
    mode: modeOverride,
    onGenerateResponse,
    showConversationalOrb = false,
}) => {
    // Get environment configuration
    const envMode = (import.meta.env.VITE_VOICE_MODE as VoiceSystemMode) || 'gemini';
    const mode = modeOverride || envMode;
    const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;

    // Default response generator (uses Claude via existing services)
    const defaultGenerateResponse = useMemo(() => {
        return async (transcript: string): Promise<string> => {
            // This should be overridden by parent component
            // For now, return a placeholder
            console.log('[VoiceSystem] Generate response for:', transcript);
            return `I heard: "${transcript}". To enable AI responses, provide an onGenerateResponse callback.`;
        };
    }, []);

    const generateResponse = onGenerateResponse || defaultGenerateResponse;

    // Check if conversational mode is properly configured
    // Supabase client provides secure Deepgram token fetching
    const isConversationalReady = Boolean(supabase || elevenLabsApiKey);

    return (
        <>
            <VoiceCoreOverlay />

            {/* Gemini Live - Primary Voice System (Full Duplex, Native TTS) */}
            {mode === 'gemini' && <VoiceManager />}

            {/* Conversational Voice Orb (Deepgram + Claude + ElevenLabs + VAD) */}
            {(mode === 'conversational' || showConversationalOrb) && isConversationalReady && (
                <ConversationalVoiceOrb
                    supabaseClient={supabase}
                    elevenLabsApiKey={elevenLabsApiKey}
                    voice="mike"
                    enableVAD={true}
                    enableBargeIn={true}
                    onGenerateResponse={generateResponse}
                    position="bottom-right"
                    size="md"
                    showTranscript={true}
                />
            )}

            {/* Universal Voice Provider - UI scanning for voice control */}
            <UniversalVoiceProvider />
        </>
    );
};

export default VoiceSystem;
