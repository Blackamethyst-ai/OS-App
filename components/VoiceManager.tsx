import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { 
    liveSession, 
    HIVE_AGENTS,
    constructHiveContext,
    chatWithGemini,
    simulateExperiment
} from '../services/geminiService';
import { OS_TOOLS } from '../services/toolRegistry';
import { AppMode, ScienceHypothesis, TaskStatus, TaskPriority, HiveAgent } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';

const navigateTool: FunctionDeclaration = {
    name: 'navigate_to_sector',
    description: 'Physically moves the Architect to a different UI sector.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            target_sector: { type: Type.STRING, enum: Object.values(AppMode) }
        },
        required: ['target_sector']
    }
};

const synthesizeTopologyTool: FunctionDeclaration = {
    name: 'synthesize_topology',
    description: 'Generates a structured PARA drive taxonomy or System Architecture blueprint.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE'] }
        },
        required: ['description', 'type']
    }
};

const recalibrateDnaTool: FunctionDeclaration = {
    name: 'recalibrate_dna',
    description: 'Adjusts the mental state weights (skepticism, excitement, alignment) for an agent.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            agentId: { type: Type.STRING },
            skepticism: { type: Type.NUMBER },
            excitement: { type: Type.NUMBER },
            alignment: { type: Type.NUMBER }
        },
        required: ['agentId']
    }
};

const VoiceManager: React.FC = () => {
    const { 
        voice, setVoiceState, setMode, addLog, addTask,
        operationalContext
    } = useAppStore();
    const { currentLocation } = useSystemMind();
    const connectionAttemptRef = useRef(false);
    const partialTranscriptRef = useRef<string>("");

    useEffect(() => {
        liveSession.onToolCall = async (name, args) => {
            if (name === 'navigate_to_sector') {
                const target = args.target_sector as AppMode;
                setMode(target);
                addLog('SYSTEM', `VOICE_NAV: Sector Shift -> ${target}`);
                return { status: "NAVIGATION_SUCCESS" };
            }
            if (name === 'synthesize_topology') {
                addLog('SYSTEM', `VOICE_ARCHITECT: Initializing ${args.type} loop...`);
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
            return { error: "Unknown protocol" };
        };
    }, [addLog, setMode, addTask]);

    useEffect(() => {
        let mounted = true;
        const manageConnection = async () => {
            if (voice.isActive && !liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                try {
                    const agentName = voice.voiceName || 'Puck';
                    const agentId = Object.keys(HIVE_AGENTS).find(k => HIVE_AGENTS[k].name === agentName) || 'Puck';
                    
                    const sharedContext = `
                    OS_STATUS: Sector: ${currentLocation}, Context Level: ${operationalContext}
                    CAPABILITIES: Navigate, Recalibrate DNA (agent mental states), and Synthesize Topologies.
                    ADDRESS USER AS: Architect.
                    `;

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
                            onopen: () => { if (mounted) { setVoiceState({ isConnecting: false }); addLog('SUCCESS', `VOICE_CORE: Uplink synchronized.`); } },
                            onerror: () => { connectionAttemptRef.current = false; setVoiceState({ isActive: false, isConnecting: false }); },
                            onclose: () => { if (mounted) { connectionAttemptRef.current = false; setVoiceState({ isActive: false, isConnecting: false }); } }
                        }
                    });
                } catch (err) { connectionAttemptRef.current = false; }
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
