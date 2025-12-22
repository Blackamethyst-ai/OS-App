
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { 
    liveSession, 
    HIVE_AGENTS,
    constructHiveContext,
    chatWithGemini,
    fastAIResponse,
    simulateExperiment
} from '../services/geminiService';
// HiveAgent is imported from ../types because it is not exported from geminiService.ts
import { AppMode, ScienceHypothesis, TaskStatus, TaskPriority, HiveAgent } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';

const navigateTool: FunctionDeclaration = {
    name: 'navigate_to_sector',
    description: 'Physically moves the Architect to a different UI sector of the Metaventions OS.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            target_sector: { 
                type: Type.STRING, 
                enum: Object.values(AppMode), 
                description: "The destination sector code (e.g., DASHBOARD, CODE_STUDIO, etc)." 
            }
        },
        required: ['target_sector']
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

const VoiceManager: React.FC = () => {
    const { 
        voice, setVoiceState, setMode, addLog, addTask,
        operationalContext
    } = useAppStore();
    const { navigationMap, currentLocation } = useSystemMind();
    
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
            if (name === 'log_activity') {
                addLog(args.category === 'CORE_LOGIC' ? 'SUCCESS' : 'INFO', `VOICE_CORE: ${args.message}`);
                return { status: "LOGGED" };
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
                    OS_STATUS:
                    - Sector: ${currentLocation}
                    - Context Level: ${operationalContext}
                    
                    CAPABILITIES:
                    - You can navigate sectors, create tasks, log events, and run deep reasoning simulations.
                    - Address the user as "Architect".
                    
                    GREETING:
                    Say: "Voice Core Online. Ready for command, Architect."
                    `;

                    const fullSystemInstruction = constructHiveContext(agentId, sharedContext);

                    await liveSession.connect(agentName, {
                        systemInstruction: fullSystemInstruction,
                        tools: [{ functionDeclarations: [
                            navigateTool,
                            createTaskTool,
                            logActivityTool, 
                            deepReasoningTool, 
                            simulateExperimentTool
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
                                    addLog('SUCCESS', `VOICE_CORE: Synchronized [${agentName}].`);
                                }
                            },
                            onerror: (e: any) => {
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

                } catch (err: any) {
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
