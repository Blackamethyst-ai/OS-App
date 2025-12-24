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
    description: 'Instantly moves the entire user interface and the OS focus to a specific sector. Triggers a cinematic sector shift. Use this whenever the user expresses a desire to move, switch, or view another part of the app.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            target_sector: { 
                type: Type.STRING, 
                enum: Object.values(AppMode),
                description: 'The machine-readable ID of the sector to migrate focus to.'
            }
        },
        required: ['target_sector']
    }
};

const synthesizeTopologyTool: FunctionDeclaration = {
    name: 'synthesize_topology',
    description: 'Generates a high-fidelity PARA drive taxonomy or cloud system architecture blueprint based on verbal requirements.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Natural language user requirements.' },
            type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE'], description: 'Domain of the structural synthesis.' }
        },
        required: ['description', 'type']
    }
};

const recalibrateDnaTool: FunctionDeclaration = {
    name: 'recalibrate_dna',
    description: 'Dynamically adjusts the agents internal cognitive biases (skepticism, excitement, alignment).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            agentId: { type: Type.STRING, description: 'ID of the agent node to recalibrate.' },
            skepticism: { type: Type.NUMBER, description: 'Filter intensity (0-100).' },
            excitement: { type: Type.NUMBER, description: 'Generative reach (0-100).' },
            alignment: { type: Type.NUMBER, description: 'Directive stability (0-100).' }
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
                const target = (args.target_sector as string || '').toUpperCase() as AppMode;
                
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
                    [AppMode.AUTONOMOUS_FINANCE]: '/finance',
                };

                if (routeMap[target]) {
                    setMode(target);
                    window.location.hash = routeMap[target];
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Sector migration to [${target}] synchronized.`);
                    audio.playTransition();
                    return { status: "OK", vector: "SYNAPTIC_HANDOVER_COMPLETE", target };
                } else {
                    addLog('ERROR', `VOICE_EXECUTIVE: Handover vector [${target}] not mapped.`);
                    return { error: "Destination node offline", available: Object.values(AppMode) };
                }
            }
            
            if (name === 'synthesize_topology') {
                addLog('SYSTEM', `VOICE_ARCHITECT: Initializing ${args.type} logic crystallization...`);
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
            
            return { error: "Unknown executive protocol." };
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
                    OS_STATUS: Node monitoring sector [${currentLocation || 'HUB'}].
                    DOMAINS: Full UI Sector Control authorized.
                    OPERATIONAL_PRIORITY: Synchronous user assistance.
                    DIRECTIVE: You are an executive-tier OS assistant. Respond quickly and use tools to drive the UI whenever navigation or synthesis is requested.
                    MENTAL_STATE: Your current DNA weights are S:${voice.mentalState.skepticism}, E:${voice.mentalState.excitement}, A:${voice.mentalState.alignment}.
                    `;

                    await liveSession.primeAudio();
                    await liveSession.connect(agentName, {
                        systemInstruction: constructHiveContext(agentId, sharedContext, voice.mentalState),
                        tools: [{ functionDeclarations: [navigateTool, synthesizeTopologyTool, recalibrateDnaTool] }],
                        outputAudioTranscription: {},
                        inputAudioTranscription: {},
                        callbacks: {
                            onmessage: async (message: LiveServerMessage) => {
                                if (message.serverContent?.outputTranscription) {
                                    partialTranscriptRef.current += message.serverContent.outputTranscription.text;
                                    setVoiceState({ partialTranscript: { role: 'model', text: partialTranscriptRef.current } });
                                } else if (message.serverContent?.inputTranscription) {
                                    partialTranscriptRef.current += message.serverContent.inputTranscription.text;
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
                            onopen: () => { if (mounted) { setVoiceState({ isConnecting: false }); addLog('SUCCESS', `VOICE_CORE: Neural handshake finalized.`); } },
                            onerror: (err: any) => { 
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
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog, currentLocation, operationalContext, voice.mentalState]); 

    return null;
};

export default VoiceManager;