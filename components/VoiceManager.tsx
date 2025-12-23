import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { 
    liveSession, 
    HIVE_AGENTS,
    constructHiveContext
} from '../services/geminiService';
import { OS_TOOLS } from '../services/toolRegistry';
import { AppMode } from '../types';
import { FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';
import { audio } from '../services/audioService';

const navigateTool: FunctionDeclaration = {
    name: 'navigate_to_sector',
    description: 'Instantly moves the user interface and the Architect to a different OS sector. Use this whenever the user expresses intent to change their current view or switch focus.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            target_sector: { 
                type: Type.STRING, 
                enum: Object.values(AppMode),
                description: 'The machine-readable ID of the sector to navigate to.'
            }
        },
        required: ['target_sector']
    }
};

const synthesizeTopologyTool: FunctionDeclaration = {
    name: 'synthesize_topology',
    description: 'Generates a structured PARA drive taxonomy or System Architecture blueprint based on user requirements.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'The user requirements for the topology.' },
            type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE'], description: 'The domain of the topology synthesis.' }
        },
        required: ['description', 'type']
    }
};

const recalibrateDnaTool: FunctionDeclaration = {
    name: 'recalibrate_dna',
    description: 'Adjusts the mental state weights (skepticism, excitement, alignment) for an agent to change its reasoning bias.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            agentId: { type: Type.STRING, description: 'The ID of the agent to recalibrate.' },
            skepticism: { type: Type.NUMBER, description: 'New skepticism level (0-100).' },
            excitement: { type: Type.NUMBER, description: 'New excitement level (0-100).' },
            alignment: { type: Type.NUMBER, description: 'New alignment level (0-100).' }
        },
        required: ['agentId']
    }
};

const VoiceManager: React.FC = () => {
    const { 
        voice, setVoiceState, setMode, addLog,
        operationalContext
    } = useAppStore();
    const { currentLocation } = useSystemMind();
    const connectionAttemptRef = useRef(false);
    const partialTranscriptRef = useRef<string>("");

    useEffect(() => {
        liveSession.onToolCall = async (name, args) => {
            if (name === 'navigate_to_sector') {
                const target = (args.target_sector as string).toUpperCase() as AppMode;
                
                // Route mapping validation
                const routeMap: Record<AppMode, string> = {
                    [AppMode.DASHBOARD]: '/dashboard',
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
                };

                if (routeMap[target]) {
                    setMode(target);
                    window.location.hash = routeMap[target];
                    addLog('SUCCESS', `VOICE_SYNC: Navigation to ${target} initiated.`);
                    audio.playTransition();
                    return { status: "OK", transition_vector: "SYNAPTIC_JUMP", destination: target };
                } else {
                    addLog('ERROR', `VOICE_SYNC: Destination sector [${target}] not found in logic map.`);
                    return { error: "Destination not found", available_sectors: Object.values(AppMode) };
                }
            }
            
            if (name === 'synthesize_topology') {
                addLog('SYSTEM', `VOICE_ARCHITECT: Initializing ${args.type} logic loop...`);
                const result = await (OS_TOOLS.architect_generate_process as any)(args);
                return result.data;
            }
            
            if (name === 'recalibrate_dna') {
                const result = await (OS_TOOLS.adjust_agent_dna as any)({
                    agentId: args.agentId,
                    weights: { skepticism: args.skepticism, excitement: args.excitement, alignment: args.alignment }
                });
                return result.data;
            }
            
            return { error: "Protocol mismatch in execution layer." };
        };
    }, [addLog, setMode]);

    useEffect(() => {
        let mounted = true;
        const manageConnection = async () => {
            if (voice.isActive && !liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                try {
                    const agentName = voice.voiceName || 'Puck';
                    const agentId = Object.keys(HIVE_AGENTS).find(k => HIVE_AGENTS[k].name === agentName) || 'Puck';
                    
                    const sharedContext = `
                    OS_STATUS: Currently monitoring sector: ${currentLocation || 'HUB'}.
                    OPERATIONAL_CONTEXT: ${operationalContext || 'GENERAL_PURPOSE'}.
                    SYSTEM_ACCESS: Full UI Control enabled. 
                    DIRECTIVE: You must act as a synchronous assistant. If the user asks for information you don't see, navigate to the relevant sector (e.g., Code Studio for code, Asset Studio for images).
                    Sectors mapped: ${Object.values(AppMode).join(', ')}.
                    `;

                    await liveSession.primeAudio();
                    await liveSession.connect(agentName, {
                        systemInstruction: constructHiveContext(agentId, sharedContext),
                        tools: [{ functionDeclarations: [navigateTool, synthesizeTopologyTool, recalibrateDnaTool] }],
                        outputAudioTranscription: {},
                        inputAudioTranscription: {},
                        callbacks: {
                            onmessage: async (message: LiveServerMessage) => {
                                if (message.serverContent?.outputAudioTranscription) {
                                    partialTranscriptRef.current += message.serverContent.outputAudioTranscription.text;
                                    setVoiceState({ partialTranscript: { role: 'model', text: partialTranscriptRef.current } });
                                } else if (message.serverContent?.inputAudioTranscription) {
                                    partialTranscriptRef.current += message.serverContent.inputAudioTranscription.text;
                                    setVoiceState({ partialTranscript: { role: 'user', text: partialTranscriptRef.current } });
                                }

                                if (message.serverContent?.turnComplete) {
                                    const finalText = partialTranscriptRef.current;
                                    if (finalText) {
                                        setVoiceState(prev => ({
                                            transcripts: [...prev.transcripts, { role: prev.partialTranscript?.role || 'user', text: finalText, timestamp: Date.now() }],
                                            partialTranscript: null
                                        }));
                                    }
                                    partialTranscriptRef.current = "";
                                }
                            },
                            onopen: () => { if (mounted) { setVoiceState({ isConnecting: false }); addLog('SUCCESS', `VOICE_CORE: Neural handshake synchronized.`); } },
                            onerror: (err: any) => { 
                                console.error("Voice Core Error:", err);
                                connectionAttemptRef.current = false; 
                                setVoiceState({ isActive: false, isConnecting: false }); 
                            },
                            onclose: () => { if (mounted) { connectionAttemptRef.current = false; setVoiceState({ isActive: false, isConnecting: false }); } }
                        }
                    });
                } catch (err) { 
                    connectionAttemptRef.current = false; 
                    setVoiceState({ isActive: false, isConnecting: false });
                }
            } else if (!voice.isActive && liveSession.isConnected()) {
                liveSession.disconnect();
                connectionAttemptRef.current = false;
                setVoiceState({ partialTranscript: null, isConnecting: false });
            }
        };

        manageConnection();
        return () => { mounted = false; };
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog, currentLocation, operationalContext]); 

    return null;
};

export default VoiceManager;
