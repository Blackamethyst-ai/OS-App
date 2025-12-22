
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { 
    liveSession, 
    generateCode, 
    generateArchitectureImage, 
    analyzeSchematic,
    HIVE_AGENTS,
    constructHiveContext,
    HiveAgent,
    SYSTEM_COMMANDER_INSTRUCTION,
    chatWithGemini,
    fastAIResponse,
    transcribeAudio,
    simulateExperiment
} from '../services/geminiService';
import { AppMode, ArtifactNode, AspectRatio, ImageSize, HardwareTier, AppTheme, ScienceHypothesis } from '../types';
import { Radio, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';

const logActivityTool: FunctionDeclaration = {
    name: 'log_activity',
    description: 'Logs architectural directives or system events to the terminal.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING, enum: ['CORE_LOGIC', 'NAVIGATION', 'SYSTEM_EVENT'], description: "The category of the directive." },
            message: { type: Type.STRING, description: "A technical description of the event." }
        },
        required: ['category', 'message']
    }
};

const simulateExperimentTool: FunctionDeclaration = {
    name: 'simulate_experiment',
    description: 'Triggers a high-fidelity scientific simulation for a provided hypothesis.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            hypothesis_statement: { type: Type.STRING, description: "The scientific hypothesis statement to simulate." },
            confidence: { type: Type.NUMBER, description: "Initial confidence value 0-100." }
        },
        required: ['hypothesis_statement']
    }
};

const deepReasoningTool: FunctionDeclaration = {
    name: 'deep_reasoning',
    description: 'Activates the gemini-3-pro-preview model for complex system reasoning or long-form strategy.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "The complex question or directive requiring deep reasoning." }
        },
        required: ['query']
    }
};

const quickCheckTool: FunctionDeclaration = {
    name: 'quick_check',
    description: 'Activates gemini-2.5-flash-lite for ultra-fast, low-latency parsing of simple commands.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            command: { type: Type.STRING, description: "The simple command to parse quickly." }
        },
        required: ['command']
    }
};

const highFidelityTranscriptionTool: FunctionDeclaration = {
    name: 'high_fidelity_transcription',
    description: 'Uses gemini-3-flash-preview to perform dedicated high-accuracy transcription of a spectral capture.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            signal_id: { type: Type.STRING, description: "The ID of the signal in the buffer." }
        },
        required: ['signal_id']
    }
};

const VoiceManager: React.FC = () => {
    const { 
        voice, setVoiceState, mode, setMode, addLog, 
        setProcessState, setCodeStudioState, setImageGenState, 
        setHardwareState, setBicameralState, setBibliomorphicState,
        operationalContext, setTheme
    } = useAppStore();
    const { getSnapshot, navigationMap, executeAction, actionRegistry, currentLocation } = useSystemMind();
    
    const connectionAttemptRef = useRef(false);
    const partialTranscriptRef = useRef<string>("");

    // Setup global tool handlers immediately to avoid race conditions
    useEffect(() => {
        liveSession.onToolCall = async (name, args) => {
            if (name === 'simulate_experiment') {
                addLog('SYSTEM', `ARIS_LAB: Scientific simulation initialized for hypothesis.`);
                const hyp: ScienceHypothesis = {
                    id: `hyp-${Date.now()}`,
                    statement: args.hypothesis_statement,
                    confidence: args.confidence || 50,
                    status: 'TESTING'
                };
                const result = await simulateExperiment(hyp);
                return { status: "SIMULATION_COMPLETE", outcome: result };
            }
            if (name === 'deep_reasoning') {
                addLog('SYSTEM', `PRO_CORE: Deep Reasoning engaged for "${args.query}"`);
                const response = await chatWithGemini(args.query);
                return { status: "REASONING_COMPLETE", output: response };
            }
            if (name === 'quick_check') {
                addLog('SYSTEM', `LITE_CORE: Quick check executed.`);
                const response = await fastAIResponse(args.command);
                return { status: "CHECK_COMPLETE", output: response };
            }
            if (name === 'high_fidelity_transcription') {
                addLog('SYSTEM', `FLASH_CORE: Dedicated transcription activated.`);
                return { status: "TRANSCRIPTION_READY" };
            }
            if (name === 'log_activity') {
                addLog(args.category === 'CORE_LOGIC' ? 'SUCCESS' : 'INFO', `VOICE_CORE: ${args.message}`);
                return { status: "LOGGED" };
            }
            return { error: "Unknown protocol" };
        };
    }, [addLog]);

    useEffect(() => {
        let mounted = true;

        const manageConnection = async () => {
            if (voice.isActive && !liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                
                try {
                    const agentName = voice.voiceName || 'Puck';
                    const agentEntry = Object.entries(HIVE_AGENTS).find(([id, a]) => (a as HiveAgent).name === agentName);
                    const agentId = agentEntry ? agentEntry[0] : 'Puck';
                    
                    const sharedContext = `
                    OS STATUS:
                    - Sector: ${currentLocation}
                    - Context Level: ${operationalContext}
                    - Navigation Topology: ${navigationMap.map(n => n.id).join(', ')}
                    
                    NEURAL CAPABILITIES:
                    - You are using Gemini 2.5 Flash Native Audio for ultra-low latency response.
                    - Access Pro Logic (gemini-3-pro-preview) via 'deep_reasoning'.
                    - Access Speed-Mode (gemini-2.5-flash-lite) via 'quick_check'.
                    - Access High-Fidelity Transcription (gemini-3-flash-preview) via 'high_fidelity_transcription'.
                    - Access Scientific Simulation via 'simulate_experiment'.

                    DIRECTIVE:
                    You are the Metaventions Voice Core. You are welcoming, precise, and highly integrated.
                    Always address the user as "Architect".
                    
                    INITIALIZATION GREETING:
                    As soon as you are initialized, say: "Voice Core Online. All neural sectors synchronized. How shall we proceed, Architect?"
                    `;

                    const fullSystemInstruction = constructHiveContext(agentId, sharedContext);

                    await liveSession.connect(agentName, {
                        systemInstruction: fullSystemInstruction,
                        tools: [{ functionDeclarations: [
                            logActivityTool, 
                            deepReasoningTool, 
                            quickCheckTool, 
                            highFidelityTranscriptionTool,
                            simulateExperimentTool
                        ] }],
                        outputAudioTranscription: {},
                        inputAudioTranscription: {},
                        callbacks: {
                            onmessage: async (message: LiveServerMessage) => {
                                // Handle Transcription
                                if (message.serverContent?.outputAudioTranscription) {
                                    const text = message.serverContent.outputAudioTranscription.text;
                                    partialTranscriptRef.current += text;
                                    setVoiceState({ partialTranscript: { role: 'model', text: partialTranscriptRef.current } });
                                } else if (message.serverContent?.inputAudioTranscription) {
                                    const text = message.serverContent.inputAudioTranscription.text;
                                    partialTranscriptRef.current += text;
                                    setVoiceState({ partialTranscript: { role: 'user', text: partialTranscriptRef.current } });
                                }

                                if (message.serverContent?.turnComplete) {
                                    const finalText = partialTranscriptRef.current;
                                    if (finalText) {
                                        setVoiceState(prev => ({
                                            transcripts: [...prev.transcripts, { 
                                                role: prev.partialTranscript?.role || 'user', 
                                                text: finalText, 
                                                timestamp: Date.now() 
                                            }],
                                            partialTranscript: null
                                        }));
                                    }
                                    partialTranscriptRef.current = "";
                                }
                            },
                            onopen: () => {
                                if (mounted) {
                                    setVoiceState({ isConnecting: false });
                                    addLog('SUCCESS', `VOICE_CORE: Neural sectors initialized [${agentName}]. Welcome, Architect.`);
                                }
                            },
                            onerror: (e: any) => {
                                connectionAttemptRef.current = false;
                                const errMsg = e?.message || "Handshake failure";
                                addLog('ERROR', `VOICE_CORE_FAILURE: ${errMsg}`);
                                setVoiceState({ isActive: false, isConnecting: false, error: errMsg });
                            },
                            onclose: (e: any) => {
                                if (mounted) {
                                    connectionAttemptRef.current = false;
                                    setVoiceState({ isActive: false, isConnecting: false });
                                }
                            }
                        }
                    });

                } catch (err: any) {
                    const message = err?.message || "Protocol handoff rejected";
                    if (mounted) {
                        setVoiceState({ isActive: false, isConnecting: false, error: message });
                        addLog('ERROR', `CRITICAL_FAILURE: ${message}`);
                    }
                    connectionAttemptRef.current = false;
                }
            } 
            else if (!voice.isActive && liveSession.isConnected()) {
                liveSession.disconnect();
                connectionAttemptRef.current = false;
                setVoiceState({ partialTranscript: null, isConnecting: false });
                partialTranscriptRef.current = "";
            }
        };

        manageConnection();
        return () => { mounted = false; };
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog, currentLocation, navigationMap, operationalContext]); 

    return null;
};

export default VoiceManager;
