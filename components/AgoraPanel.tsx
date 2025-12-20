
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SyntheticPersona, DebateTurn, SimulationReport, FileData, AppMode, MentalState } from '../types';
import { generatePersonas, runDebateTurn, synthesizeReport } from '../services/agoraService';
import { liveSession, promptSelectKey, generateSpeech } from '../services/geminiService';
import { useAppStore } from '../store';
import { Users, Loader2, MessageSquare, AlertCircle, CheckCircle, Mic, Zap, Activity, GitCommit, Save, Layers, ArrowUpRight, Radio, Volume2, VolumeX } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { FunctionDeclaration, Type } from '@google/genai';

interface AgoraPanelProps {
    artifact: FileData;
}

const AgoraPanel: React.FC<AgoraPanelProps> = ({ artifact }) => {
    const [status, setStatus] = useState<'IDLE' | 'GEN_PERSONAS' | 'DEBATING' | 'SYNTHESIZING' | 'COMPLETE'>('IDLE');
    const [personas, setPersonas] = useState<SyntheticPersona[]>([]);
    const [history, setHistory] = useState<DebateTurn[]>([]);
    const [report, setReport] = useState<SimulationReport | null>(null);
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // NEW: Living Senate States
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isNarrationMuted, setIsNarrationMuted] = useState(false);
    const [conflictHealth, setConflictHealth] = useState<{time: number, tension: number}[]>([]);
    const [lastIntervention, setLastIntervention] = useState<{target: string, msg: string} | null>(null);
    const { setProcessState, setMode, addLog } = useAppStore();
    
    // Store whispers: key = personaId, value = instruction
    const pendingWhispers = useRef<Record<string, string>>({});
    
    // Audio Context Ref
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history]);

    // Handle Voice Disconnect cleanup
    useEffect(() => {
        return () => {
            // Always check liveSession directly to avoid stale closures
            if (liveSession.isConnected()) {
                liveSession.disconnect();
            }
            
            const ctx = audioCtxRef.current;
            audioCtxRef.current = null; // Nullify ref immediately
            if (ctx && ctx.state !== 'closed') {
                ctx.close().catch(() => {});
            }
        };
    }, []);

    // Initialize Audio Context on user interaction (start simulation)
    const initAudio = async () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } 
        if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }
    };

    const playAudioBlob = async (base64Audio: string): Promise<void> => {
        if (!audioCtxRef.current || isNarrationMuted || audioCtxRef.current.state === 'closed') return;
        
        try {
            await initAudio(); // Ensure active

            // 1. Decode Base64 string to byte array
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // 2. Align to 16-bit boundary (Drop last byte if odd length)
            const alignLen = len % 2 === 0 ? len : len - 1;
            const pcm16 = new Int16Array(bytes.buffer, 0, alignLen / 2);

            // 3. Create AudioBuffer (Gemini TTS is 24kHz)
            const ctx = audioCtxRef.current;
            if (!ctx || ctx.state === 'closed') return;
            const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            
            // Normalize 16-bit integer to float range [-1.0, 1.0]
            for (let i = 0; i < pcm16.length; i++) {
                channelData[i] = pcm16[i] / 32768.0;
            }
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            return new Promise((resolve) => {
                source.onended = () => resolve();
                source.start();
            });
        } catch (e) {
            console.error("Audio Playback Error", e);
            // Fallback: Resolve immediately so simulation continues even if audio fails
            return Promise.resolve();
        }
    };

    const startSimulation = async () => {
        await initAudio(); // Ensure audio context is ready immediately
        setStatus('GEN_PERSONAS');
        setConflictHealth([]); // Reset monitor
        
        try {
            // 1. Create Agents
            const agents = await generatePersonas(artifact);
            
            if (!agents || agents.length === 0) {
                addLog('WARN', 'AGORA: Agent generation returned empty set. Aborting.');
                setStatus('IDLE');
                return;
            }

            setPersonas(agents);
            
            // 2. Start Loop
            setStatus('DEBATING');
            let currentHistory: DebateTurn[] = [];
            let currentPersonas = [...agents]; 
            
            // Run 9 turns (3 rounds for 3 agents)
            for (let i = 0; i < 9; i++) {
                const speakerIndex = i % currentPersonas.length;
                const speaker = currentPersonas[speakerIndex];
                
                if (!speaker) continue;

                // Visual "Thinking" State
                setActiveSpeakerId(null); 
                
                // Check for whispers
                const whisper = pendingWhispers.current[speaker.id] || pendingWhispers.current['ALL'];
                if (pendingWhispers.current[speaker.id]) delete pendingWhispers.current[speaker.id];
                if (pendingWhispers.current['ALL']) delete pendingWhispers.current['ALL'];

                // GENERATE TEXT
                const turn = await runDebateTurn(speaker, currentHistory, artifact, whisper);
                
                // Update history
                currentHistory = [...currentHistory, turn];
                setHistory(prev => [...prev, turn]);

                // Update Mental State
                if (turn.newMindset) {
                    currentPersonas[speakerIndex] = {
                        ...speaker,
                        currentMindset: turn.newMindset
                    };
                    setPersonas([...currentPersonas]); 
                    
                    const tension = calculateTension(currentPersonas);
                    setConflictHealth(prev => [...prev, { time: i, tension }]);
                }

                // GENERATE & PLAY AUDIO (Sequential)
                try {
                    // Activate Visual Indicator
                    setActiveSpeakerId(speaker.id);
                    
                    if (!isNarrationMuted) {
                        const audioData = await generateSpeech(turn.text, speaker.voiceName);
                        await playAudioBlob(audioData); // Wait for playback to finish
                    } else {
                        // Artificial reading delay if muted
                        await new Promise(r => setTimeout(r, 1500 + turn.text.length * 20));
                    }
                    
                } catch (err) {
                    console.error("TTS Failed for turn", err);
                    await new Promise(r => setTimeout(r, 1500)); // Fallback delay
                } finally {
                    setActiveSpeakerId(null);
                }
            }
            
            // 3. Synthesis
            setStatus('SYNTHESIZING');
            const finalReport = await synthesizeReport(currentHistory);
            setReport(finalReport);
            setStatus('COMPLETE');

        } catch (e) {
            console.error(e);
            setStatus('IDLE'); // Reset on fail
        }
    };

    const calculateTension = (currentPersonas: SyntheticPersona[]) => {
        // Simple heuristic: Standard deviation of Alignment scores
        const alignments = currentPersonas.map(p => p.currentMindset.alignment);
        const mean = alignments.reduce((a, b) => a + b, 0) / alignments.length;
        const variance = alignments.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / alignments.length;
        return Math.sqrt(variance);
    };

    const handleWhisper = (personaId: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (status !== 'DEBATING') return;
        
        const instruction = prompt("GOD MODE // WHISPER PROTOCOL:\nInject a secret override directive for this agent:");
        if (instruction) {
            pendingWhispers.current[personaId] = instruction;
        }
    };

    const toggleVoice = async () => {
        await initAudio(); // Ensure context is ready for live session too

        if (isVoiceActive) {
            liveSession.disconnect();
            setIsVoiceActive(false);
            return;
        }

        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) await promptSelectKey();

            setIsVoiceActive(true);

            // Define Tool for Intervention
            const interveneTool: FunctionDeclaration = {
                name: 'inject_intervention',
                description: 'Inject a directive or message into the simulation for a specific agent or the whole group.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        target_agent: { type: Type.STRING, description: "Name of the agent (e.g. 'Skeptic', 'Visionary', 'Pragmatist') or 'ALL'" },
                        message: { type: Type.STRING, description: "The content of the message/directive." }
                    },
                    required: ['target_agent', 'message']
                }
            };

            await liveSession.connect('Puck', {
                systemInstruction: "You are the Voice of the Chair (Moderator). The user is the Chair. Listen to their commands. If they want to interrupt, direct an agent, or change the topic, use the 'inject_intervention' tool to send a directive. Confirm the action briefly (e.g. 'Directive sent to Skeptic').",
                tools: [interveneTool]
            });

            // Override Tool Handler
            liveSession.onToolCall = async (name, args) => {
                if (name === 'inject_intervention') {
                    const targetName = (args['target_agent'] as string).toUpperCase();
                    const msg = args['message'] as string;
                    
                    let targetId = 'ALL';
                    // Find persona ID by role/name fuzzy match
                    if (targetName !== 'ALL') {
                        const match = personas.find(p => 
                            p.name.toUpperCase().includes(targetName) || 
                            p.role.includes(targetName)
                        );
                        if (match) targetId = match.id;
                    }

                    pendingWhispers.current[targetId] = msg;
                    setLastIntervention({ target: targetName, msg });
                    setTimeout(() => setLastIntervention(null), 4000); // Clear toast

                    addLog('SYSTEM', `VOICE_INTERVENTION: "${msg}" -> ${targetName}`);
                    return { result: "Intervention Injected Successfully" };
                }
                return { error: "Unknown Tool" };
            };

        } catch (e) {
            console.error("Voice Connect Failed", e);
            setIsVoiceActive(false);
        }
    };

    // NEURAL BRIDGE: Export to Process Map
    const exportToProcessMap = () => {
        if (!report) return;
        
        const newNodes = report.majorFrictionPoints.map((point, i) => ({
            id: `issue-${Date.now()}-${i}`,
            file: { name: `RISK: ${point.substring(0, 20)}...` } as File,
            status: 'rejected',
            data: null,
            analysis: { summary: point, classification: 'RISK_VECTOR', ambiguityScore: 90, entities: [] }
        }));

        setProcessState(prev => ({
            artifacts: [...prev.artifacts, ...newNodes as any]
        }));
        
        addLog('SYSTEM', `AGORA_BRIDGE: ${newNodes.length} Risk Vectors injected into Process Logic.`);
        setMode(AppMode.PROCESS_MAP);
    };

    // Prepare Radar Data
    const radarData = [
        { subject: 'Skepticism', fullMark: 100 },
        { subject: 'Excitement', fullMark: 100 },
        { subject: 'Alignment', fullMark: 100 },
    ];
    
    // Inject persona values into data
    personas.forEach(p => {
        if (!p) return;
        (radarData[0] as any)[p.id] = p.currentMindset.skepticism;
        (radarData[1] as any)[p.id] = p.currentMindset.excitement;
        (radarData[2] as any)[p.id] = p.currentMindset.alignment;
    });

    return (
        <div className="flex h-full bg-[#050505] relative overflow-hidden">
            
            {/* Intervention Toast */}
            <AnimatePresence>
                {lastIntervention && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#9d4edd]/90 backdrop-blur text-black px-6 py-2 rounded-full font-bold font-mono text-xs shadow-[0_0_20px_rgba(157,78,221,0.5)] flex items-center gap-3 pointer-events-none"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>CHAIR INTERVENTION: {lastIntervention.target}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LEFT: VISUALIZER (The Table) */}
            <div className="w-1/2 flex flex-col relative border-r border-[#1f1f1f] p-0 overflow-hidden">
                
                {/* HUD Header */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[#9d4edd] font-mono uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Debate Protocol
                            </span>
                            <span className="text-xl font-bold text-white font-mono">
                                {status === 'DEBATING' ? 'SESSION_ACTIVE' : 'SESSION_IDLE'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Voice Controls */}
                    <div className="flex gap-2 pointer-events-auto">
                        <button 
                            onClick={() => setIsNarrationMuted(!isNarrationMuted)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all text-[10px] font-mono uppercase tracking-wider ${!isNarrationMuted ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 text-[#9d4edd]' : 'bg-[#111] border border-[#333] text-gray-500 hover:text-white'}`}
                            title={isNarrationMuted ? "Enable Narration" : "Mute Narration"}
                        >
                            {isNarrationMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                        
                        <button 
                            onClick={toggleVoice}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all text-[10px] font-mono uppercase tracking-wider ${isVoiceActive ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd] shadow-[0_0_15px_rgba(157,78,221,0.2)]' : 'bg-[#111] border border-[#333] text-gray-500 hover:text-white'}`}
                        >
                            {isVoiceActive ? <Radio className="w-3 h-3 animate-pulse" /> : <Mic className="w-3 h-3" />}
                            {isVoiceActive ? 'MODERATOR LINK ACTIVE' : 'MODERATOR MUTED'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative flex items-center justify-center">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.05)_0%,transparent_70%)] pointer-events-none"></div>

                    {status === 'IDLE' ? (
                        <div className="text-center z-10">
                            <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333] shadow-[0_0_40px_rgba(157,78,221,0.2)]">
                                <Users className="w-8 h-8 text-[#9d4edd]" />
                            </div>
                            <h2 className="text-xl font-mono text-white mb-2 uppercase tracking-widest">Neural Senate</h2>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-8 font-mono leading-relaxed">
                                Initialize autonomous consensus simulation. Agents possess dynamic mental states that evolve through debate.
                            </p>
                            <button 
                                onClick={startSimulation}
                                className="px-8 py-3 bg-[#9d4edd] text-black font-bold font-mono uppercase tracking-widest hover:bg-[#b06bf7] transition-all shadow-lg"
                            >
                                Summon Agents
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* Central Consensus Radar */}
                            <div className="w-64 h-64 rounded-full border border-[#333]/50 flex items-center justify-center relative bg-[#0a0a0a]/80 backdrop-blur z-0">
                                {personas.length > 0 && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#333" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontFamily: 'Fira Code' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            {personas.map((p) => (
                                                <RechartRadar
                                                    key={p.id}
                                                    name={p.name}
                                                    dataKey={p.id}
                                                    stroke={p.avatar_color}
                                                    strokeWidth={2}
                                                    fill={p.avatar_color}
                                                    fillOpacity={0.1}
                                                    isAnimationActive={false} // Performance
                                                />
                                            ))}
                                        </RadarChart>
                                    </ResponsiveContainer>
                                )}
                                
                                {status === 'GEN_PERSONAS' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                        <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Agents Orbiting */}
                            {personas.map((p, i) => {
                                if (!p) return null;
                                const angle = (i / personas.length) * 2 * Math.PI - Math.PI / 2; // Start top
                                const radius = 180;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                const isActive = activeSpeakerId === p.id;

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ 
                                            scale: isActive ? 1.1 : 1, 
                                            opacity: 1,
                                            x, y
                                        }}
                                        className="absolute w-32 flex flex-col items-center justify-center z-10 cursor-pointer group"
                                        onContextMenu={(e) => handleWhisper(p.id, e)}
                                    >
                                        <div className="relative">
                                            <div 
                                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center bg-[#111] transition-all duration-300 relative overflow-hidden
                                                    ${isActive ? 'shadow-[0_0_30px_var(--glow)] border-[var(--glow)]' : 'border-gray-700'}
                                                `}
                                                style={{ 
                                                    '--glow': p.avatar_color
                                                } as any}
                                            >
                                                <span className="text-lg font-bold" style={{ color: p.avatar_color }}>
                                                    {p.name.charAt(0)}
                                                </span>
                                                
                                                {/* Speaking Ripple (Sonic Layer) */}
                                                {isActive && (
                                                    <div className="absolute inset-0 bg-white/10 animate-ping rounded-full"></div>
                                                )}
                                                
                                                {/* Audio Visualization bars overlay (Stylized) */}
                                                {isActive && !isNarrationMuted && (
                                                    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end gap-0.5 h-6 opacity-60">
                                                        {[1,2,3,4,3,2,1].map((n, idx) => (
                                                            <motion.div 
                                                                key={idx}
                                                                animate={{ height: [4, 12, 4] }}
                                                                transition={{ duration: 0.5, repeat: Infinity, delay: idx * 0.1 }}
                                                                className="w-1 bg-white"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Whisper Indicator */}
                                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/20 rounded-full p-1">
                                                <Mic className="w-3 h-3 text-white" />
                                            </div>
                                        </div>

                                        {/* Name & Role */}
                                        <div className="mt-2 text-center">
                                            <div className="text-[10px] font-bold text-gray-300 bg-black/50 px-2 rounded backdrop-blur">
                                                {p.name}
                                            </div>
                                            <div className="text-[8px] font-mono text-gray-500 uppercase mt-0.5">
                                                {p.role}
                                            </div>
                                        </div>

                                        {/* Alignment Bar */}
                                        <div className="mt-1 w-16 h-1 bg-[#222] rounded-full overflow-hidden" title="Consensus Alignment">
                                            <motion.div 
                                                className="h-full transition-all duration-700 ease-out" 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${p.currentMindset.alignment}%` }}
                                                style={{ backgroundColor: p.avatar_color }}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                            
                            {/* Tension Monitor (Bottom) */}
                            {status === 'DEBATING' && (
                                <div className="absolute bottom-8 left-8 right-8 h-24 bg-[#0a0a0a]/80 backdrop-blur border border-[#333] rounded-lg p-3 flex flex-col justify-end pointer-events-none">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[9px] font-mono text-gray-500 uppercase flex items-center gap-2">
                                            <Activity className="w-3 h-3" /> Constructive Tension
                                        </span>
                                        <span className="text-[9px] font-mono text-[#42be65]">OPTIMAL RANGE</span>
                                    </div>
                                    <div className="h-12 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={conflictHealth}>
                                                <Line type="monotone" dataKey="tension" stroke="#9d4edd" strokeWidth={2} dot={false} isAnimationActive={false} />
                                                <YAxis domain={[0, 100]} hide />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: TRANSCRIPT & REPORT */}
            <div className="w-1/2 flex flex-col bg-[#080808]">
                {/* Header */}
                <div className="h-12 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
                    <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-xs font-mono uppercase text-gray-400">Senate Transcript</span>
                    </div>
                    {status === 'DEBATING' && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-[#1f1f1f] rounded border border-[#333]">
                            {isNarrationMuted ? <VolumeX className="w-3 h-3 text-gray-500" /> : <Volume2 className="w-3 h-3 text-[#f59e0b] animate-pulse" />}
                            <span className="text-[9px] text-gray-500 font-mono">{isNarrationMuted ? 'Audio Muted' : 'Live Narration'}</span>
                        </div>
                    )}
                </div>

                {/* Chat Log */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" ref={scrollRef}>
                    {history.map((turn) => {
                        const persona = personas.find(p => p.id === turn.personaId);
                        const isSpeaking = activeSpeakerId === turn.personaId;
                        return (
                            <motion.div 
                                key={turn.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`text-xs font-mono flex flex-col gap-1 transition-opacity ${isSpeaking ? 'opacity-100' : 'opacity-70'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold" style={{ color: persona?.avatar_color }}>
                                        {persona?.name || 'Unknown'}
                                    </span>
                                    <span className="text-[9px] text-gray-600 bg-[#111] px-1 rounded border border-[#222]">
                                        {persona?.role || 'AGENT'}
                                    </span>
                                    {isSpeaking && <div className="w-2 h-2 rounded-full bg-[#9d4edd] animate-pulse" />}
                                </div>
                                <div className={`bg-[#111] border p-3 rounded-tr-lg rounded-b-lg text-gray-300 leading-relaxed relative ${isSpeaking ? 'border-[#9d4edd]' : 'border-[#222]'}`}>
                                    {turn.newMindset && (
                                        <div className="absolute right-2 top-2 flex gap-1">
                                            {turn.newMindset.alignment > 60 && <div className="w-1.5 h-1.5 rounded-full bg-[#42be65]" title="Aligned"></div>}
                                            {turn.newMindset.skepticism > 60 && <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" title="Skeptical"></div>}
                                        </div>
                                    )}
                                    {turn.text}
                                </div>
                            </motion.div>
                        );
                    })}
                    {status === 'DEBATING' && !activeSpeakerId && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse mt-4 pl-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="font-mono">Processing response...</span>
                        </div>
                    )}
                </div>

                {/* Report Card (Appears at end) */}
                {report && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="h-1/2 border-t border-[#1f1f1f] bg-[#0c0c0c] p-6 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest">Action Learning</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase">Viability</span>
                                <div className={`text-xl font-bold font-mono ${report.viabilityScore > 70 ? 'text-[#42be65]' : 'text-[#f59e0b]'}`}>
                                    {report.viabilityScore}%
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-[#111] p-3 rounded border border-[#222]">
                                <div className="text-[9px] text-gray-500 font-mono uppercase mb-1">Consensus</div>
                                <p className="text-[10px] leading-relaxed text-gray-300 line-clamp-3">{report.consensus}</p>
                            </div>
                            <div className="bg-[#111] p-3 rounded border border-[#9d4edd]/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[#9d4edd]/5"></div>
                                <div className="text-[9px] text-[#9d4edd] font-mono uppercase mb-1">Projected Upside</div>
                                <div className="text-2xl font-bold text-[#9d4edd] flex items-center gap-2">
                                    +{report.projectedUpside || 0}%
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                                <div className="text-[9px] text-gray-500 mt-1">If fixes applied</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
                            <div className="grid grid-cols-1 gap-2">
                                {report.actionableFixes.map((pt, i) => (
                                    <div key={i} className="bg-[#051a05] border border-green-900/30 p-2 rounded text-[10px] flex gap-2">
                                        <CheckCircle className="w-3 h-3 text-[#42be65] shrink-0" />
                                        <span className="text-gray-300">{pt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 mt-auto">
                            <button className="flex-1 py-2 bg-[#1f1f1f] border border-[#333] hover:border-white text-xs font-mono text-gray-300 uppercase rounded flex items-center justify-center gap-2 transition-all">
                                <Save className="w-3 h-3" /> Archive Sim
                            </button>
                            <button 
                                onClick={exportToProcessMap}
                                className="flex-1 py-2 bg-[#9d4edd] text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 hover:bg-[#b06bf7] transition-all shadow-[0_0_15px_rgba(157,78,221,0.3)]"
                            >
                                <GitCommit className="w-3 h-3" /> Inject to Process
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AgoraPanel;
