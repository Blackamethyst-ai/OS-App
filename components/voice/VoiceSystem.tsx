/**
 * VOICE SYSTEM - Unified Voice Stack
 *
 * Wraps all voice-related components into a single unit.
 * This simplifies App.tsx imports.
 *
 * Components:
 * - VoiceCoreOverlay: Voice session feedback UI (toggleable via store)
 * - VoiceManager: Legacy Gemini live session
 * - VoiceCoreManager: Modern browser STT + multi-LLM
 * - UniversalVoiceProvider: UI scanning for voice control
 */

import React from 'react';
import VoiceManager from './VoiceManager';
import VoiceCoreManager from './VoiceCoreManager';
import UniversalVoiceProvider from '../UniversalVoiceProvider';
import VoiceCoreOverlay from './VoiceCoreOverlay';

const VoiceSystem: React.FC = () => {
    return (
        <>
            <VoiceCoreOverlay />
            {/* Gemini Live - Primary Voice System (Full Duplex, Native TTS) */}
            <VoiceManager />
            {/* VoiceCoreManager disabled - was causing echo loops and random navigation */}
            {/* <VoiceCoreManager /> */}
            <UniversalVoiceProvider />
        </>
    );
};

export default VoiceSystem;
