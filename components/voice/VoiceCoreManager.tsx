/**
 * VOICE CORE MANAGER COMPONENT
 *
 * React component that integrates the VoiceCore system with the OS-App UI.
 * Replaces VoiceManager.tsx with universal, codebase-aware voice control.
 *
 * Features:
 * - Browser STT (Web Speech API) - no Google dependency
 * - Codebase-aware navigation across all 16 modes
 * - Multi-provider LLM support (Claude, Gemini, Grok)
 * - ElevenLabs TTS integration
 * - Debug panel for development
 * - Full mode sync with operationalContext
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store';
import { useSystemMind } from '../../stores/useSystemMind';
import { useVoiceCore, type VoiceCoreState } from '../../services/voiceCoreIntegration';
import { codebaseAwareness } from '../../services/codebaseAwareness';
import { HIVE_AGENTS } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { AppMode } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface VoiceCoreManagerProps {
    /** Show debug panel (default: false in production) */
    showDebug?: boolean;
    /** Override STT provider selection */
    forceSTTProvider?: 'browser' | 'gemini' | 'auto';
    /** Override TTS provider selection */
    forceTTSProvider?: 'elevenlabs' | 'browser' | 'auto';
}

// =============================================================================
// Component
// =============================================================================

const VoiceCoreManager: React.FC<VoiceCoreManagerProps> = ({
    showDebug = false,
    forceSTTProvider = 'auto',
    forceTTSProvider = 'auto'
}) => {
    const {
        voice,
        voiceNexus: nexusState,
        actions,
        operationalContext
    } = useAppStore();

    const { setVoiceState, setVoiceNexusState, setMode, addLog } = actions;
    const { currentLocation } = useSystemMind();

    // Initialize VoiceCore with configuration
    const {
        state: voiceCoreState,
        core,
        startListening,
        stopListening,
        navigateTo,
        setCurrentMode,
        setOnNavigate,
        setOnAction,
        setOnTranscript,
        setOnResponse
    } = useVoiceCore({
        sttProvider: forceSTTProvider,
        ttsProvider: forceTTSProvider,
        enableCodebaseAwareness: true,
        enableKnowledgeInjection: true,
        debugMode: showDebug
    });

    // Track previous voice active state
    const wasActiveRef = useRef(false);

    // ==========================================================================
    // Navigation Handler
    // ==========================================================================

    const handleNavigation = useCallback((mode: AppMode, subtab?: string) => {
        // Route map for hash navigation
        const routeMap: Record<AppMode, string> = {
            [AppMode.DASHBOARD]: '/dashboard',
            [AppMode.METAVENTIONS_HUB]: '/metaventions-hub',
            [AppMode.BIBLIOMORPHIC]: '/bibliomorphic',
            [AppMode.PROCESS_MAP]: '/process',
            [AppMode.MEMORY_CORE]: '/memory',
            [AppMode.IMAGE_GEN]: '/assets',
            [AppMode.HARDWARE_ENGINEER]: '/hardware',
            [AppMode.CODE_STUDIO]: '/code',
            [AppMode.VOICE_MODE]: '/voice',
            [AppMode.SYNTHESIS_BRIDGE]: '/bridge',
            [AppMode.BICAMERAL]: '/bibliomorphic/bicameral',
            [AppMode.AGENT_CONTROL]: '/agents',
            [AppMode.AUTONOMOUS_FINANCE]: '/finance',
            [AppMode.AGENT_CORE_TEST]: '/agent-core-test',
            [AppMode.CPB_TEST]: '/cpb-test',
            [AppMode.ARCHON]: '/archon',
        };

        const route = routeMap[mode];
        if (route) {
            // Update app mode
            setMode(mode);

            // Navigate via hash
            let targetRoute = route;
            if (subtab) {
                targetRoute = `${route}/${subtab}`;
            }
            window.location.hash = targetRoute;

            // Log and play audio feedback
            addLog('SUCCESS', `VOICE_CORE: Navigation to [${mode}]${subtab ? ` > ${subtab}` : ''} complete.`);
            audio.playTransition();
        } else {
            addLog('ERROR', `VOICE_CORE: Unknown navigation target [${mode}]`);
        }
    }, [setMode, addLog]);

    // ==========================================================================
    // Action Handler
    // ==========================================================================

    const handleAction = useCallback((action: string, args: Record<string, unknown>) => {
        addLog('SYSTEM', `VOICE_CORE: Action triggered - ${action}`);

        switch (action) {
            case 'switch_agent': {
                const agentName = args.agentName as string;
                const agent = Object.values(HIVE_AGENTS).find((a: any) =>
                    a.name.toLowerCase() === agentName.toLowerCase() ||
                    a.id === agentName.toLowerCase()
                );

                if (agent) {
                    setVoiceState({ voiceName: agent.name });
                    audio.playClick();
                    addLog('SUCCESS', `VOICE_CORE: Agent switched to [${agent.name}]`);
                } else {
                    addLog('WARN', `VOICE_CORE: Agent [${agentName}] not found`);
                }
                break;
            }

            case 'recalibrate_dna': {
                setVoiceState(prev => ({
                    mentalState: {
                        skepticism: args.skepticism as number ?? prev.mentalState.skepticism,
                        excitement: args.excitement as number ?? prev.mentalState.excitement,
                        alignment: args.alignment as number ?? prev.mentalState.alignment
                    }
                }));
                audio.playSuccess();
                break;
            }

            default:
                addLog('WARN', `VOICE_CORE: Unknown action [${action}]`);
        }
    }, [addLog, setVoiceState]);

    // ==========================================================================
    // Setup Handlers
    // ==========================================================================

    useEffect(() => {
        setOnNavigate(handleNavigation);
        setOnAction(handleAction);

        // Handle finalized user speech
        setOnTranscript((text: string, isFinal: boolean) => {
            if (isFinal && text.trim()) {
                if (showDebug) console.log('[VoiceCoreManager] Finalizing User Transcript:', text);
                setVoiceState(prev => ({
                    transcripts: [...prev.transcripts, { role: 'user', text, timestamp: Date.now() }],
                    partialTranscript: null
                }));
            }
        });

        // Handle AI response
        setOnResponse((text: string) => {
            if (showDebug) console.log('[VoiceCoreManager] Received AI Response:', text);
            setVoiceState(prev => ({
                transcripts: [...prev.transcripts, { role: 'model', text, timestamp: Date.now() }],
                partialTranscript: null
            }));
        });
    }, [setOnNavigate, setOnAction, setOnTranscript, setOnResponse, setVoiceState, showDebug]);

    // ==========================================================================
    // Sync Voice State
    // ==========================================================================

    useEffect(() => {
        // Handle voice activation/deactivation
        const handleVoiceToggle = async () => {
            if (voice.isActive && !wasActiveRef.current) {
                // Voice just activated - start listening
                wasActiveRef.current = true;
                setVoiceState({ isConnecting: true });

                try {
                    await startListening();
                    setVoiceState({ isConnecting: false });
                    addLog('SUCCESS', 'VOICE_CORE: Neural handshake complete.');
                    audio.playSuccess();
                } catch (error) {
                    setVoiceState({ isActive: false, isConnecting: false });
                    addLog('ERROR', `VOICE_CORE: Failed to start - ${error}`);
                }
            } else if (!voice.isActive && wasActiveRef.current) {
                // Voice just deactivated - stop listening
                wasActiveRef.current = false;
                await stopListening();
                addLog('SYSTEM', 'VOICE_CORE: Session terminated.');
            }
        };

        handleVoiceToggle();
    }, [voice.isActive, startListening, stopListening, setVoiceState, addLog]);

    // ==========================================================================
    // Sync Mode Context
    // ==========================================================================

    useEffect(() => {
        // Keep VoiceCore aware of current mode
        if (operationalContext?.mode) {
            setCurrentMode(operationalContext.mode as AppMode);
        }
    }, [operationalContext?.mode, setCurrentMode]);

    // ==========================================================================
    // Sync VoiceCore State to Store
    // ==========================================================================

    useEffect(() => {
        if (!voiceCoreState) return;

        // Update voice nexus state in store
        setVoiceNexusState({
            isActive: voiceCoreState.isListening,
            isProcessing: voiceCoreState.isProcessing,
            lastComplexityScore: voiceCoreState.complexityScore,
            currentProvider: {
                stt: voiceCoreState.sttProvider as 'gemini' | 'whisper' | 'browser',
                reasoning: 'auto',
                tts: voiceCoreState.ttsProvider as 'elevenlabs' | 'gemini' | 'browser'
            },
            error: voiceCoreState.error
        });

        // Update partial transcript
        if (voiceCoreState.currentTranscript) {
            setVoiceState({
                partialTranscript: {
                    role: 'user',
                    text: voiceCoreState.currentTranscript
                }
            });
        }
    }, [voiceCoreState, setVoiceNexusState, setVoiceState]);

    // ==========================================================================
    // Debug Panel
    // ==========================================================================

    if (showDebug && voiceCoreState) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#00ff00',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                maxWidth: '300px',
                zIndex: 9999,
                border: '1px solid #333'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00ffff' }}>
                    🎙️ VoiceCore Debug
                </div>
                <div>STT: <span style={{ color: '#ffff00' }}>{voiceCoreState.sttProvider}</span></div>
                <div>TTS: <span style={{ color: '#ffff00' }}>{voiceCoreState.ttsProvider}</span></div>
                <div>Listening: <span style={{ color: voiceCoreState.isListening ? '#00ff00' : '#ff6666' }}>
                    {voiceCoreState.isListening ? 'YES' : 'NO'}
                </span></div>
                <div>Processing: <span style={{ color: voiceCoreState.isProcessing ? '#ffff00' : '#666' }}>
                    {voiceCoreState.isProcessing ? 'YES' : 'NO'}
                </span></div>
                <div>Complexity: <span style={{ color: '#ff00ff' }}>
                    {voiceCoreState.complexityScore.toFixed(2)}
                </span></div>
                <div>Mode: <span style={{ color: '#00ffff' }}>
                    {voiceCoreState.currentMode || 'N/A'}
                </span></div>
                {voiceCoreState.currentTranscript && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                        <div style={{ color: '#999', fontSize: '10px' }}>Transcript:</div>
                        <div style={{ color: '#fff', wordBreak: 'break-word' }}>
                            {voiceCoreState.currentTranscript.slice(-100)}
                        </div>
                    </div>
                )}
                {voiceCoreState.error && (
                    <div style={{ marginTop: '8px', color: '#ff4444' }}>
                        Error: {voiceCoreState.error}
                    </div>
                )}
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
                    Components: {codebaseAwareness.getStats().components}
                </div>
            </div>
        );
    }

    // Component renders nothing visible by default
    return null;
};

export default VoiceCoreManager;
