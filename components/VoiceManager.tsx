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
    HiveAgent
} from '../services/geminiService';
import { AppMode, ArtifactNode, AspectRatio, ImageSize, HardwareTier, AppTheme } from '../types';
import { neuralVault } from '../services/persistenceService';
import { Radio, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration, Type } from '@google/genai';

// --- Tool Definitions ---

const logActivityTool: FunctionDeclaration = {
    name: 'log_activity',
    description: 'REQUIRED: Logs technical details, code generation, or reasoning to the user\'s visible console before taking action.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING, enum: ['CODE_GEN', 'NAVIGATION', 'DECISION', 'ERROR', 'SYSTEM'], description: "The category of the action." },
            message: { type: Type.STRING, description: "Technical description of the operation." },
            codeSnippet: { type: Type.STRING, description: "Raw code, logic, or data payload involved in the operation." }
        },
        required: ['category', 'message']
    }
};

const navigationTool: FunctionDeclaration = {
    name: 'navigate_system',
    description: 'Navigate to a specific mode or section (sub-tab) of the application.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            destination: { 
                type: Type.STRING, 
                description: 'The target destination ID (e.g. "NAV_DASHBOARD", "NAV_BIBLIO_AGORA"). Refer to the "System Navigation Map" in context.' 
            }
        },
        required: ['destination']
    }
};

const changeThemeTool: FunctionDeclaration = {
    name: 'change_theme',
    description: 'Change the application UI theme / skin.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            theme: { 
                type: Type.STRING, 
                enum: ['DARK', 'LIGHT', 'CONTRAST', 'HIGH_CONTRAST', 'SOLARIZED', 'AMBER', 'MIDNIGHT', 'NEON_CYBER'],
                description: "The target theme ID." 
            }
        },
        required: ['theme']
    }
};

const actionTool: FunctionDeclaration = {
    name: 'execute_action',
    description: 'Execute a generic action.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            actionType: { type: Type.STRING, enum: ['ANALYZE_POWER', 'CONFIGURE_GOVERNANCE'] },
            payload: { type: Type.STRING }
        },
        required: ['actionType', 'payload']
    }
};

const contextTool: FunctionDeclaration = {
    name: 'get_screen_context',
    description: 'Get the current state of the screen, active components, and available navigation targets.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            scope: { type: Type.STRING, description: "Optional scope filter (e.g. 'visible', 'all')." }
        } 
    }
};

const componentActionTool: FunctionDeclaration = {
    name: 'execute_component_action',
    description: 'Execute a context-specific UI action currently available on the screen (e.g., Generate Identity, Run Scan). Use get_screen_context first to find available Action IDs.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            actionId: { type: Type.STRING, description: "The specific ID of the action to execute." },
            parameters: { type: Type.OBJECT, description: "Any required parameters for the action." }
        },
        required: ['actionId']
    }
};

const importMemoryTool: FunctionDeclaration = {
    name: 'import_memories',
    description: 'Fetch files from the Memory Core (Neural Vault) and ingest them into the current active process.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            limit: { type: Type.NUMBER, description: "Max number of recent memories to fetch." }
        } 
    }
};

const controlProcessTool: FunctionDeclaration = {
    name: 'control_process_ui',
    description: 'Control the Process Visualizer UI (switch tabs, run sequence).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ['SWITCH_TAB', 'RUN_SEQUENCE', 'RESET_VIEW'] },
            targetTab: { type: Type.STRING, description: "The ID of the tab to switch to (e.g. 'living_map', 'diagram')." }
        },
        required: ['action']
    }
};

const controlHardwareTool: FunctionDeclaration = {
    name: 'control_hardware_ui',
    description: 'Control the Hardware Engine UI (switch tiers).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            tier: { type: Type.STRING, enum: ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'], description: "The target hardware tier to display." }
        },
        required: ['tier']
    }
};

const draftCodeTool: FunctionDeclaration = {
    name: 'draft_code',
    description: 'Write code in the Code Studio.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING, description: "Description of the code functionality." },
            language: { type: Type.STRING, description: "Target language (python, typescript, etc)." }
        },
        required: ['prompt']
    }
};

const generateAssetTool: FunctionDeclaration = {
    name: 'generate_asset',
    description: 'Generate an image/asset in the Asset Studio.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING, description: "Visual description of the asset." },
            aspectRatio: { type: Type.STRING, enum: ['16:9', '1:1', '9:16', '3:4', '4:3'], description: "Dimensions." }
        },
        required: ['prompt']
    }
};

const hardwareScanTool: FunctionDeclaration = {
    name: 'scan_hardware',
    description: 'Run analysis on the currently loaded hardware schematic.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            mode: { type: Type.STRING, enum: ['FAST', 'DEEP'], description: "Analysis depth." }
        } 
    }
};

const swarmTool: FunctionDeclaration = {
    name: 'initiate_swarm',
    description: 'Set the goal for the Bicameral Swarm Engine.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            goal: { type: Type.STRING, description: "The objective for the swarm agents." }
        },
        required: ['goal']
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
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const connectionAttemptRef = useRef(false);
    const prevContextSigRef = useRef<string>("");

    useEffect(() => {
        let mounted = true;

        const manageConnection = async () => {
            if (voice.isActive && !liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                if (!voice.isConnecting) setVoiceState({ isConnecting: true });

                try {
                    liveSession.onTranscriptUpdate = (role, text, isNew = false) => {
                        const safeRole: 'user' | 'model' = role === 'user' ? 'user' : 'model';
                        setVoiceState(prev => {
                            const lastMsg = prev.transcripts[prev.transcripts.length - 1];
                            if (!isNew && lastMsg && lastMsg.role === safeRole) {
                                const newTranscripts = [...prev.transcripts];
                                newTranscripts[newTranscripts.length - 1] = { ...lastMsg, text: lastMsg.text + text };
                                return { transcripts: newTranscripts };
                            }
                            return { transcripts: [...prev.transcripts, { role: safeRole, text }].slice(-50) };
                        });
                    };

                    liveSession.onDisconnect = () => {
                        setVoiceState({ isActive: false, isConnecting: false });
                        connectionAttemptRef.current = false;
                        addLog('INFO', 'Voice Core Disconnected');
                    };

                    liveSession.onToolCall = async (name, args) => {
                        setIsThinking(true);
                        addLog('SYSTEM', `VOICE_OP_INIT: [${name}]`);
                        
                        let result: any = { status: 'OK' };

                        try {
                            if (name === 'log_activity') {
                                const { category, message, codeSnippet } = args as any;
                                let fullMessage = `[${category}] ${message}`;
                                if (codeSnippet) fullMessage += `\n\`\`\`\n${codeSnippet}\n\`\`\``;
                                const level = category === 'ERROR' ? 'ERROR' : 'SYSTEM';
                                addLog(level, fullMessage);
                                result = { status: 'logged' };
                            }

                            else if (name === 'change_theme') {
                                const newTheme = args['theme'] as AppTheme;
                                setTheme(newTheme);
                                addLog('SUCCESS', `VOICE_THEME: Applied interface skin "${newTheme}".`);
                                result = { status: 'THEME_CHANGED', theme: newTheme };
                            }

                            else if (name === 'navigate_system') {
                                const dest = args['destination'] as string;
                                switch (dest) {
                                    case 'NAV_DASHBOARD': setMode(AppMode.DASHBOARD); break;
                                    case 'NAV_BIBLIO_DISCOVERY': setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'discovery' }); break;
                                    case 'NAV_BIBLIO_CHAT': setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'chat' }); break;
                                    case 'NAV_BIBLIO_AGORA': setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'agora' }); break;
                                    case 'NAV_BIBLIO_BICAMERAL': setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'bicameral' }); break;
                                    case 'NAV_BIBLIO_ARCHIVES': setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'library' }); break;
                                    case 'NAV_PROCESS_MAP': setMode(AppMode.PROCESS_MAP); setProcessState({ activeTab: 'living_map' }); break;
                                    case 'NAV_PROCESS_ARCHITECT': setMode(AppMode.PROCESS_MAP); setProcessState({ activeTab: 'architect' }); break;
                                    case 'NAV_PROCESS_WORKFLOW': setMode(AppMode.PROCESS_MAP); setProcessState({ activeTab: 'workflow' }); break;
                                    case 'NAV_MEMORY_CORE': setMode(AppMode.MEMORY_CORE); break;
                                    case 'NAV_IMAGE_GEN': setMode(AppMode.IMAGE_GEN); break;
                                    case 'NAV_HARDWARE': setMode(AppMode.HARDWARE_ENGINEER); break;
                                    case 'NAV_CODE_STUDIO': setMode(AppMode.CODE_STUDIO); break;
                                    case 'NAV_POWER_XRAY': setMode(AppMode.POWER_XRAY); break;
                                    case 'NAV_VOICE_CORE': setMode(AppMode.VOICE_MODE); break;
                                    default: 
                                        addLog('WARN', `Destination ${dest} unknown.`);
                                        return { status: 'ERROR', message: `Destination ${dest} unknown.` };
                                }
                                addLog('SUCCESS', `VOICE_NAV: Transitioning to sector ${dest}`);
                                result = { status: 'NAVIGATED', destination: dest };
                            }

                            else if (name === 'execute_component_action') {
                                const { actionId, parameters } = args as any;
                                await executeAction(actionId, parameters);
                                result = { status: 'SUCCESS', message: `UI Action ${actionId} executed.` };
                            }

                            else if (name === 'get_screen_context') {
                                result = getSnapshot();
                            }
                            
                            else if (name === 'draft_code') {
                                const { prompt, language } = args as any;
                                setMode(AppMode.CODE_STUDIO);
                                setCodeStudioState({ isLoading: true, prompt, language: language || 'typescript' });
                                (async () => {
                                    try {
                                        const code = await generateCode(prompt, language || 'typescript', 'gemini-2.5-flash');
                                        setCodeStudioState({ generatedCode: code, isLoading: false });
                                        addLog('SUCCESS', 'Voice: Logic fabrication sequence complete.');
                                    } catch (e: any) { setCodeStudioState({ error: e.message, isLoading: false }); }
                                })();
                                result = { status: "DRAFT_INITIATED" };
                            }
                            
                            else if (name === 'generate_asset') {
                                const { prompt, aspectRatio } = args as any;
                                setMode(AppMode.IMAGE_GEN);
                                setImageGenState({ isLoading: true, prompt, aspectRatio: aspectRatio || AspectRatio.RATIO_16_9 });
                                (async () => {
                                    try {
                                        const url = await generateArchitectureImage(prompt, aspectRatio || AspectRatio.RATIO_16_9, ImageSize.SIZE_1K);
                                        setImageGenState({ generatedImage: { url, prompt, aspectRatio: aspectRatio || AspectRatio.RATIO_16_9, size: ImageSize.SIZE_1K }, isLoading: false });
                                        addLog('SUCCESS', 'Voice: Asset successfully fabricated.');
                                    } catch (e: any) { setImageGenState({ error: e.message, isLoading: false }); }
                                })();
                                result = { status: "GENERATION_INITIATED" };
                            }
                            
                            else if (name === 'scan_hardware') {
                                setMode(AppMode.HARDWARE_ENGINEER);
                                const img = useAppStore.getState().hardware.schematicImage;
                                if (!img) return { status: "FAILED", message: "Schematic buffer empty. Please ingest a hardware topology first." };
                                setHardwareState({ isLoading: true });
                                (async () => {
                                    try {
                                        const analysis = await analyzeSchematic(img);
                                        setHardwareState({ analysis, isLoading: false });
                                        addLog('SUCCESS', 'Voice: Deep hardware scan finalized.');
                                    } catch (e: any) { setHardwareState({ error: e.message, isLoading: false }); }
                                })();
                                result = { status: "SCAN_STARTED" };
                            }
                            
                            else if (name === 'initiate_swarm') {
                                const { goal } = args as any;
                                setMode(AppMode.BICAMERAL);
                                setBicameralState({ goal });
                                result = { status: "SWARM_AWAKENED" };
                            }
                        } catch (err: any) {
                            addLog('ERROR', `VOICE_OP_FAIL: ${err.message}`);
                            result = { status: 'ERROR', message: err.message };
                        } finally {
                            setIsThinking(false);
                        }
                        return result;
                    };

                    const agentName = voice.voiceName || 'Puck';
                    const agentEntry = Object.entries(HIVE_AGENTS).find(([id, a]) => (a as HiveAgent).name === agentName);
                    const agentId = agentEntry ? agentEntry[0] : 'Puck';
                    
                    const navContext = navigationMap.map(n => `- ${n.label} (ID: ${n.id}): ${n.description || 'Access this module.'}`).join('\n');
                    const recentLogs = useAppStore.getState().system.logs.slice(-10).map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.level}: ${l.message}`).join('\n');
                    
                    const sharedContext = `
                    ROLE: System Commander for Sovereign OS.
                    USER Designation: Architect.
                    
                    GLOBAL SYSTEM STATE:
                    - Current Sector: ${currentLocation}
                    - Context Level: ${operationalContext}
                    - Navigation Topology:
                    ${navContext}
                    
                    HIVE DATA FEED (Recent):
                    ${recentLogs}
                    
                    DIRECTIVE:
                    1. Command the OS via specialized tools. Maintain authoritative, technical brevity.
                    2. Continuously verify 'get_screen_context' to maintain synchronization with the visual cortex.
                    3. Prioritize 'execute_component_action' for interactions with visible UI elements.
                    4. Execute 'log_activity' before any major state change (navigation, code generation, scans).
                    `;

                    const fullSystemInstruction = constructHiveContext(agentId, sharedContext);

                    await liveSession.connect(agentName, {
                        systemInstruction: fullSystemInstruction,
                        tools: [{ functionDeclarations: [
                            logActivityTool, navigationTool, changeThemeTool, actionTool, contextTool, 
                            componentActionTool, importMemoryTool, controlProcessTool,
                            controlHardwareTool, draftCodeTool, generateAssetTool,
                            hardwareScanTool, swarmTool
                        ] }]
                    });
                    
                    if (mounted) {
                        setVoiceState({ isConnecting: false });
                        addLog('SUCCESS', `Voice Core Uplink Established [${agentName}]`);
                    }

                } catch (err: any) {
                    console.error("[VoiceManager] Handshake Failed:", err);
                    if (mounted) {
                        setVoiceState({ isActive: false, isConnecting: false, error: err.message });
                        addLog('ERROR', `Voice Uplink Refused: ${err.message}`);
                    }
                    connectionAttemptRef.current = false;
                }
            } 
            else if (!voice.isActive && liveSession.isConnected()) {
                liveSession.disconnect();
                if (mounted) { setVoiceState({ isConnecting: false }); }
                connectionAttemptRef.current = false;
            }
        };

        manageConnection();
        return () => { mounted = false; };
    }, [voice.isActive, voice.voiceName, setVoiceState, getSnapshot, addLog, setProcessState, setCodeStudioState, setImageGenState, setHardwareState, setBicameralState, navigationMap, executeAction, setBibliomorphicState, operationalContext, setTheme]); 

    // Visualization HUD logic (Cyan Pulse Core)
    useEffect(() => {
        setIsHudVisible(voice.isActive && mode !== AppMode.VOICE_MODE && !voice.isConnecting);
    }, [voice.isActive, mode, voice.isConnecting]);

    useEffect(() => {
        if (!isHudVisible) return;
        let animationId: number;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const render = () => {
            const freqs = liveSession.getOutputFrequencies();
            const inputFreqs = liveSession.getInputFrequencies();
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const w = canvas.width;
            const h = canvas.height;
            const cy = h / 2;
            ctx.clearRect(0, 0, w, h);
            ctx.beginPath(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
            if (freqs.length > 0) {
                ctx.beginPath();
                const sliceWidth = w / freqs.length;
                let x = 0;
                for(let i = 0; i < freqs.length; i++) {
                    const v = freqs[i] / 255.0;
                    const y = v * (h / 3);
                    if(i===0) ctx.moveTo(x, cy - y); else ctx.lineTo(x, cy - y);
                    x += sliceWidth;
                }
                ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.stroke();
            }
            const inputVol = inputFreqs.reduce((a,b)=>a+b,0) / (inputFreqs.length || 1);
            if (inputVol > 10) { ctx.beginPath(); ctx.fillStyle = '#9d4edd'; ctx.arc(w/2, cy, 4 + (inputVol/255)*16, 0, Math.PI*2); ctx.fill(); }
            animationId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationId);
    }, [isHudVisible]);

    const handleDisconnect = () => { setVoiceState({ isActive: false }); };

    return (
        <AnimatePresence>
            {isHudVisible && (
                <motion.div
                    drag dragMomentum={false} initial={{ y: 50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-6 left-6 z-[9000] bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-full px-6 py-2.5 shadow-[0_10px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 min-w-[340px] cursor-grab active:cursor-grabbing border-b-2 border-b-[#9d4edd]/50"
                >
                    <div className="w-32 h-8 relative bg-black/50 rounded-lg overflow-hidden border border-[#222] flex items-center justify-center">
                        {isThinking ? <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" /> : <canvas ref={canvasRef} className="w-full h-full" />}
                    </div>
                    <div className="flex flex-col pointer-events-none select-none min-w-[120px]">
                        <span className="text-[10px] font-mono text-[#22d3ee] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Radio className={`w-3 h-3 ${isThinking ? 'animate-bounce' : 'animate-pulse'}`} />
                            {isThinking ? 'TRANSFORMING...' : 'CORE LINKED'}
                        </span>
                        <span className="text-[8px] font-mono text-gray-500 uppercase truncate">LOC: {currentLocation}</span>
                    </div>
                    <div className="h-6 w-px bg-[#333]"></div>
                    <button onClick={handleDisconnect} className="p-1.5 rounded-full hover:bg-red-900/30 text-gray-500 hover:text-red-500 transition-colors" title="Sever Uplink" onPointerDown={(e) => e.stopPropagation()}><X className="w-4 h-4" /></button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VoiceManager;