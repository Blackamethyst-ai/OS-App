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
            target_sector: { 
                type: Type.STRING, 
                enum: Object.values(AppMode), 
                description: "Destination sector code." 
            }
        },
        required: ['target_sector']
    }
};

const synthesizeTopologyTool: FunctionDeclaration = {
    name: 'synthesize_topology',
    description: 'Triggers the Protocol Architect to generate a structured PARA drive taxonomy or System Architecture.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "Detailed goal for the organization or system." },
            type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE'], description: "Domain of synthesis." }
        },
        required: ['description', 'type']
    }
};

const createTaskTool: FunctionDeclaration = {
    name: 'create_system_task',
    description: 'Adds a new tactical task to the OS Task Board.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: Object.values(TaskPriority) }
        },
        required: ['title', 'description']
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
                addLog('SYSTEM', `VOICE_NAV: Redirecting to ${target} sector.`);
                return { status: "NAVIGATION_SUCCESSFUL", sector: target };
            }
            if (name === 'synthesize_topology') {
                addLog('SYSTEM', `VOICE_ARCHITECT: Initializing ${args.type} synthesis loop...`);
                // Trigger actual tool logic from registry
                const result = await (OS_TOOLS.architect_generate_process as any)(args);
                return result.data;
            }
            if (name === 'create_system_task') {
                addTask({
                    title: args.title,
                    description: args.description,
                    priority: (args.priority as TaskPriority) || TaskPriority.MEDIUM,
                    status: TaskStatus.TODO,
                    tags: ['VOICE_INJECT'],
                    subtasks: []
                });
                addLog('SUCCESS', `VOICE_TASK: Tactical unit "${args.title}" created.`);
                return { status: "TASK_CREATED" };
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
                    const agentEntry = Object.entries(HIVE_AGENTS).find(([id, a]) => (a as HiveAgent).name === agentName);
                    const agentId = agentEntry ? agentEntry[0] : 'Puck';
                    
                    const sharedContext = `
                    OS_STATUS: Sector: ${currentLocation}, Context Level: ${operationalContext}
                    CAPABILITIES: Navigate, Create Tasks, and Synthesize Topologies (PARA Drive Org or System Architecture).
                    ADDRESS USER AS: Architect.
                    `;

                    await liveSession.connect(agentName, {
                        systemInstruction: constructHiveContext(agentId, sharedContext),
                        tools: [{ functionDeclarations: [
                            navigateTool,
                            synthesizeTopologyTool,
                            createTaskTool
                        ] }],
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
                                    addLog('SUCCESS', `VOICE_CORE: [${agentName}] uplink stable.`);
                                }
                            },
                            onerror: () => {
                                connectionAttemptRef.current = false;
                                setVoiceState({ isActive: false, isConnecting: false });
                            },
                            onclose: () => {
                                if (mounted) {
                                    connectionAttemptRef.current = false;
                                    setVoiceState({ isActive: false, isConnecting: false });
                                }
                            }
                        }
                    });
                } catch (err) {
                    connectionAttemptRef.current = false;
                }
            } 
            else if (!voice.isActive && liveSession.isConnected()) {
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
