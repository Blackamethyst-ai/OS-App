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
    SYSTEM_COMMANDER_INSTRUCTION
} from '../services/geminiService';
import { AppMode, ArtifactNode, AspectRatio, ImageSize, HardwareTier, AppTheme } from '../types';
import { Radio, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration, Type } from '@google/genai';

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

const VoiceManager: React.FC = () => {
    const { 
        voice, setVoiceState, mode, setMode, addLog, 
        setProcessState, setCodeStudioState, setImageGenState, 
        setHardwareState, setBicameralState, setBibliomorphicState,
        operationalContext, setTheme
    } = useAppStore();
    const { getSnapshot, navigationMap, executeAction, actionRegistry, currentLocation } = useSystemMind();
    const [isHudVisible, setIsHudVisible] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    
    const connectionAttemptRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        const manageConnection = async () => {
            if (voice.isActive && !liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                if (!voice.isConnecting) setVoiceState({ isConnecting: true });

                try {
                    const agentName = voice.voiceName || 'Puck';
                    const agentEntry = Object.entries(HIVE_AGENTS).find(([id, a]) => (a as HiveAgent).name === agentName);
                    const agentId = agentEntry ? agentEntry[0] : 'Puck';
                    
                    const sharedContext = `
                    OS STATUS:
                    - Sector: ${currentLocation}
                    - Context Level: ${operationalContext}
                    - Navigation Topology: ${navigationMap.map(n => n.id).join(', ')}
                    
                    DIRECTIVE:
                    You are a standard Gemini Voice Core agent. Address the user as "Architect".
                    Keep logic precise and aligned with OS capabilities.
                    `;

                    const fullSystemInstruction = constructHiveContext(agentId, sharedContext);

                    await liveSession.connect(agentName, {
                        systemInstruction: fullSystemInstruction,
                        tools: [{ functionDeclarations: [logActivityTool] }]
                    });
                    
                    if (mounted) {
                        setVoiceState({ isConnecting: false });
                        addLog('SUCCESS', `VOICE_CORE: Uplink Established [${agentName}]`);
                    }

                } catch (err: any) {
                    console.error("[VoiceManager] Handshake Failed:", err);
                    if (mounted) {
                        setVoiceState({ isActive: false, isConnecting: false, error: err.message });
                        addLog('ERROR', `VOICE_REJECTED: ${err.message}`);
                    }
                    connectionAttemptRef.current = false;
                }
            } 
            else if (!voice.isActive && liveSession.isConnected()) {
                liveSession.disconnect();
                connectionAttemptRef.current = false;
            }
        };

        manageConnection();
        return () => { mounted = false; };
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog, currentLocation, navigationMap, operationalContext]); 

    return null;
};

export default VoiceManager;
