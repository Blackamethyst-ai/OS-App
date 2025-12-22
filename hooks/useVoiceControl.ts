import { useEffect } from 'react';
import { useAppStore } from '../store';
import { liveSession } from '../services/geminiService';

/**
 * useVoiceControl is now a passive hook as VoiceManager.tsx handles 
 * the active Live API session and tool routing.
 */
export const useVoiceControl = () => {
    // No-op. Session logic moved to VoiceManager.tsx for high-fidelity tool integration.
    return null;
};