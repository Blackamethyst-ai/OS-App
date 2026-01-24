import { apiKeyService } from '../../services/apiKeyService';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../../services/geminiService';
import { voiceNexus, analyzeComplexity, formatComplexityResult } from '../../services/voiceNexus';
import type { VoiceMode as VoiceModeType } from '../../services/voiceNexus';
import {
    Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2,
    Sliders, X, RotateCcw, Send, Volume2, VolumeX, Terminal,
    ShieldAlert, Navigation, ChevronDown, ChevronUp, Cpu, Radio,
    Waves, Target, BrainCircuit, Globe, Fingerprint, Shield,
    CheckCircle, Binary, History, Layers, ShieldCheck, Database,
    Cpu as CpuIcon, Network, Share2, AudioWaveform, Gauge, Zap as ZapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { cn } from '../../utils/cn';
import CPBStatusOverlay from '../CPBStatusOverlay';

// --- SUB-COMPONENTS ---

const DataTag = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-3xl shadow-2xl group hover:border-white/10 transition-all"
    >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ color }} />
        <div className="flex flex-col">
            <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-[0.2em]">{label}</span>
            <span className="text-[10px] font-black font-mono text-white uppercase tracking-tighter" style={{ color }}>{value}</span>
        </div>
    </motion.div>
);

const FrequencyRing = ({ freqs, color, size, active }: { freqs: Uint8Array | null, color: string, size: number, active: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resolve CSS variables to actual color values for Canvas API
        let resolvedColor = color;
        if (color.startsWith('var(')) {
            const varName = color.slice(4, -1); // Extract --var-name from var(--var-name)
            resolvedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#18E6FF';
        }

        let frameId: number;
        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, size, size);

            const cx = size / 2;
            const cy = size / 2;
            const time = performance.now() / 1000;

            // Base Aura
            const gradient = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.5);
            gradient.addColorStop(0, `${resolvedColor}${active ? '33' : '11'}`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            if (freqs && active) {
                const barCount = 64;
                const step = (Math.PI * 2) / barCount;
                const innerRadius = size * 0.32;
                const outerRadius = size * 0.45;

                for (let i = 0; i < barCount; i++) {
                    const val = freqs[i % freqs.length] / 255;
                    const angle = i * step + time * 0.1;
                    const h = val * (size * 0.1);

                    const x1 = cx + Math.cos(angle) * innerRadius;
                    const y1 = cy + Math.sin(angle) * innerRadius;
                    const x2 = cx + Math.cos(angle) * (innerRadius + h);
                    const y2 = cy + Math.sin(angle) * (innerRadius + h);

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = resolvedColor;
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.globalAlpha = 0.4 + val * 0.6;
                    ctx.stroke();

                    // Tiny particle at tip
                    if (val > 0.6) {
                        ctx.beginPath();
                        ctx.arc(x2, y2, 1, 0, Math.PI * 2);
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                    }
                }
            } else {
                // Idle pulse ring
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
                ctx.strokeStyle = `${resolvedColor}44`;
                ctx.lineWidth = 0.5;
                ctx.setLineDash([2, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color, size, active]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} className="absolute pointer-events-none z-0" />;
};

const NodePersona = ({ image, freqs, color, label, isAgent, isThinking }: any) => {
    const isActive = !!freqs && freqs.some((v: number) => v > 40);

    return (
        <div className="relative flex flex-col items-center gap-8 group">
            <div className="relative w-64 h-64 flex items-center justify-center">
                <FrequencyRing freqs={freqs} color={color} size={256} active={isActive || isThinking} />

                <motion.div
                    animate={isActive || isThinking ? {
                        scale: [1, 1.02, 1],
                        borderColor: [`${color}44`, color, `${color}44`]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                        "relative z-10 w-36 h-36 rounded-full border-2 overflow-hidden bg-black shadow-2xl transition-all duration-700 p-1.5",
                        isThinking ? "border-[#f1c21b]" : "border-white/10"
                    )}
                >
                    <div className="w-full h-full rounded-full overflow-hidden border border-white/5 relative">
                        {image ? (
                            <img src={image} className="w-full h-full object-cover grayscale-[20%] group-hover/persona:grayscale-0 transition-all duration-1000" alt={label} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#050505] text-gray-800">
                                {isAgent ? <BrainCircuit size={40} /> : <User size={40} />}
                            </div>
                        )}
                        <AnimatePresence>
                            {isThinking && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                                >
                                    <Loader2 className="w-8 h-8 text-[#f1c21b] animate-spin" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Satellite Tags */}
                <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 z-20">
                    <DataTag label="Protocol" value={isAgent ? "Node_AI" : "Operator"} color={color} />
                </div>
                <div className="absolute bottom-4 left-0 -translate-x-6 z-20">
                    <DataTag label="Signal" value={isActive ? "Streaming" : "Standby"} color={isActive ? color : "#666"} />
                </div>
            </div>

            <div className="text-center space-y-1">
                <div className="flex items-center gap-3 justify-center">
                    {isAgent ? <Bot size={14} style={{ color }} /> : <Fingerprint size={14} style={{ color }} />}
                    <h3 className="text-sm font-black font-mono text-white uppercase tracking-[0.3em]">{label}</h3>
                </div>
                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none">
                    {isAgent ? 'Autonomous Intelligence Node' : 'Sovereign Controller'}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

// Voice Mode Selector Component
const ModeSelector = ({ currentMode, onChange, disabled }: { currentMode: VoiceModeType, onChange: (mode: VoiceModeType) => void, disabled: boolean }) => {
    const modes: { value: VoiceModeType; label: string; desc: string; icon: React.ReactNode }[] = [
        { value: 'realtime', label: 'Realtime', desc: 'Gemini end-to-end', icon: <ZapIcon size={10} /> },
        { value: 'hybrid', label: 'Hybrid', desc: 'Auto-routes', icon: <Gauge size={10} /> },
        { value: 'turn-based', label: 'Quality', desc: 'Claude + ElevenLabs', icon: <BrainCircuit size={10} /> },
    ];

    return (
        <div className="flex gap-1 p-1 bg-black/40 border border-white/5 rounded-xl">
            {modes.map(mode => (
                <button
                    key={mode.value}
                    onClick={() => { onChange(mode.value); audio.playClick(); }}
                    disabled={disabled}
                    className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[7px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-1.5",
                        currentMode === mode.value
                            ? "bg-white text-black shadow-lg"
                            : "text-gray-600 hover:text-white disabled:opacity-30"
                    )}
                    title={mode.desc}
                >
                    {mode.icon}
                    {mode.label}
                </button>
            ))}
        </div>
    );
};

const VoiceMode: React.FC = () => {
    const { voice, voiceNexus: nexusState, user, actions } = useAppStore();
    const { setVoiceState, setVoiceNexusState, addLog } = actions;
    const [showTuning, setShowTuning] = useState(false);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
    const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
    const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const currentAgentMetadata = useMemo(() =>
        Object.values(HIVE_AGENTS).find((a: any) => a.name === voice.voiceName) || HIVE_AGENTS['dr_ira'] || Object.values(HIVE_AGENTS)[0],
        [voice.voiceName]);
    const agentAvatar = voice.agentAvatars[voice.voiceName] || null;

    // Branded Theme derivation
    const agentColor = useMemo(() => {
        // Map Agent IDs/Names to Colors
        const colors: Record<string, string> = {
            'Dr. Ira': 'var(--plasma-green)',
            'Mike': 'var(--amethyst)',
            'Caleb': 'var(--cyan)',
            'Noah': '#f472b6', // Pink
            'Helen': '#fbbf24', // Amber
            'Perri': '#a78bfa', // Violet
            'Paramdeep': '#34d399', // Emerald
            'Bilal': '#60a5fa', // Blue
            'Puck': 'var(--amethyst)',
            'Charon': 'var(--plasma-green)',
            'Fenrir': 'var(--cyan)',
            'Zephyr': '#3b82f6'
        };
        return colors[voice.voiceName] || colors[currentAgentMetadata?.name] || 'var(--amethyst)';
    }, [voice.voiceName, currentAgentMetadata]);

    useEffect(() => {
        if (!agentAvatar && !isGeneratingAvatar) {
            const fetchAvatar = async () => {
                setIsGeneratingAvatar(true);
                try {
                    const hasKey = apiKeyService.hasGeminiKey();
                    if (hasKey) {
                        let url = await generateAvatar(currentAgentMetadata.id.toUpperCase(), currentAgentMetadata.name, currentAgentMetadata.gender);
                        // If generation fails (Rate Limit), use a fallback to prevent infinite loop
                        if (!url) url = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg=="; // Transparent 1x1
                        setVoiceState(prev => ({ agentAvatars: { ...prev.agentAvatars, [voice.voiceName]: url } }));
                    }
                } catch (e) { console.warn(e); } finally { setIsGeneratingAvatar(false); }
            };
            fetchAvatar();
        }
    }, [voice.voiceName, agentAvatar, currentAgentMetadata, isGeneratingAvatar, setVoiceState]);

    useEffect(() => {
        let rafId: number;
        const loop = () => {
            if (voice.isActive) {
                // Use voiceNexus for frequency data when available
                const freqData = voiceNexus.getFrequencyData();
                setUserFreqs(freqData.input || liveSession.getInputFrequencies());
                setAgentFreqs(freqData.output || liveSession.getOutputFrequencies());
            } else {
                setUserFreqs(null);
                setAgentFreqs(null);
            }
            rafId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(rafId);
    }, [voice.isActive]);

    // Sync voiceNexus mode changes
    const handleModeChange = (mode: VoiceModeType) => {
        voiceNexus.setMode(mode);
        setVoiceNexusState({ mode });
        addLog('SYSTEM', `VOICE_NEXUS: Mode switched to [${mode.toUpperCase()}]`);
    };

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [voice.transcripts, voice.partialTranscript]);

    const toggleSession = async () => {
        if (voice.isActive || voice.isConnecting) {
            liveSession.disconnect();
            setVoiceState({ isActive: false, isConnecting: false });
            addLog('SYSTEM', 'COMMS: Link severed.');
            audio.playError();
        } else {
            await liveSession.primeAudio();
            setVoiceState({ isConnecting: true });
            try {
                if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); setVoiceState({ isConnecting: false }); return; }
                setVoiceState({ isActive: true });
                addLog('SUCCESS', `COMMS: Unified uplink established with ${voice.voiceName}.`);
                audio.playSuccess();
            } catch (err: any) { setVoiceState({ isConnecting: false }); }
        }
    };

    return (
        <div
            className="h-full w-full bg-[var(--bg-app)] flex flex-col relative overflow-hidden font-sans border border-[var(--border-main)] rounded-[2.5rem] shadow-2xl transition-all duration-1000"
            style={{ '--agent-theme': agentColor } as any}
        >
            {/* Branded Ambient Glow */}
            <div
                className="absolute inset-0 opacity-[0.03] transition-colors duration-1000 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${agentColor} 0%, transparent 70%)` }}
            />

            {/* Technical Scanline Grid */}
            <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

            {/* Optimized Header HUD */}
            <div className="h-16 flex justify-between items-center px-10 bg-black/40 backdrop-blur-3xl border-b border-white/5 z-30 shrink-0 relative">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl border border-white/10 transition-all shadow-xl" style={{ backgroundColor: `${agentColor}11`, color: agentColor }}>
                            <Radio size={20} className={voice.isActive ? 'animate-pulse' : 'opacity-40'} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-xs font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Voice Core</h1>
                                <div className={cn("w-1.5 h-1.5 rounded-full transition-all shadow-[0_0_10px_currentColor]", voice.isActive ? "bg-[var(--plasma-green)] animate-pulse" : "bg-gray-800")} />
                            </div>
                            <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none uppercase">
                                {voice.isConnecting ? 'Initializing Neural Tunnel...' : voice.isActive ? 'Handshake Finalized' : 'V1.0 - THE D-Ecosystem'}
                            </div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Mode</span>
                        <ModeSelector
                            currentMode={nexusState.mode}
                            onChange={handleModeChange}
                            disabled={voice.isActive}
                        />
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Agent</span>
                        <div className="flex gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl overflow-x-auto max-w-[400px] custom-scrollbar">
                            {Object.values(HIVE_AGENTS).map((agent: any) => {
                                const color = agent.name === 'Dr. Ira' ? 'var(--plasma-green)' :
                                    agent.name === 'Mike' ? 'var(--amethyst)' :
                                        agent.name === 'Caleb' ? 'var(--cyan)' :
                                            '#888'; // Fallback
                                return (
                                    <button
                                        key={agent.id}
                                        onClick={() => { setVoiceState({ voiceName: agent.name }); audio.playClick(); }}
                                        disabled={voice.isActive}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                            voice.voiceName === agent.name
                                                ? "bg-white text-black shadow-lg"
                                                : "text-gray-600 hover:text-white disabled:opacity-30"
                                        )}
                                    >
                                        <div
                                            className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                                            style={{ backgroundColor: voice.voiceName === agent.name ? 'black' : color, color }}
                                        />
                                        {agent.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setShowTuning(!showTuning); audio.playClick(); }}
                        className={cn(
                            "p-2.5 rounded-xl border transition-all glass-action",
                            showTuning ? "border-[var(--agent-theme)] text-white shadow-xl" : "border-white/5 text-gray-500 hover:text-white"
                        )}
                    >
                        <Sliders size={16} />
                    </button>
                    <button className="p-2.5 rounded-xl border border-white/5 text-gray-500 hover:text-white transition-all glass-action">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Interaction Stage */}
            <div className="flex-1 flex flex-col items-center justify-center p-10 relative overflow-hidden">
                {/* CPB Status Overlay - shows when thinking */}
                <CPBStatusOverlay />
                <AnimatePresence>
                    {showTuning && (
                        <motion.div
                            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
                            className="absolute right-10 top-10 w-72 bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] z-[60] space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                        >
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Bias Tuning</span>
                                <button onClick={() => setShowTuning(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
                            </div>
                            {['skepticism', 'excitement', 'alignment'].map(key => (
                                <div key={key} className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{key} bias</span>
                                        <span className="text-[10px] font-black font-mono text-white">{(voice.mentalState as any)[key]}%</span>
                                    </div>
                                    <div className="relative h-1 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden shadow-inner">
                                        <motion.div className="h-full" style={{ backgroundColor: agentColor }} animate={{ width: `${(voice.mentalState as any)[key]}%` }} />
                                        <input type="range" min="0" max="100" value={(voice.mentalState as any)[key]} onChange={e => setVoiceState({ mentalState: { ...voice.mentalState, [key]: parseInt(e.target.value, 10) } })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2">
                                <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                    <RotateCcw size={12} /> Reset to Node Defaults
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="w-full max-w-6xl flex items-center justify-around gap-20 relative">
                    <NodePersona
                        label={user.displayName || "Operator"}
                        image={user.avatar}
                        freqs={userFreqs}
                        color="var(--cyan)"
                        isAgent={false}
                    />

                    <div className="flex flex-col items-center gap-10 relative">
                        <div className="relative">
                            <motion.div
                                animate={voice.isActive ? { scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] } : {}}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-[-40px] border border-[var(--agent-theme)] rounded-full blur-2xl z-0"
                            />
                            <button
                                onClick={toggleSession}
                                disabled={voice.isConnecting}
                                className={cn(
                                    "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 border shadow-2xl active:scale-95 group/main",
                                    voice.isActive
                                        ? "bg-red-500/10 border-red-500 text-red-500 shadow-red-500/20"
                                        : "bg-black border-white/10 text-white hover:border-[var(--agent-theme)] hover:shadow-[var(--agent-theme)]/20"
                                )}
                                style={{ boxShadow: voice.isActive ? '0 0 40px rgba(239, 68, 68, 0.2)' : '0 0 40px rgba(0,0,0,0.5)' }}
                            >
                                {voice.isConnecting ? <Loader2 className="animate-spin" size={28} /> : voice.isActive ? <Power size={36} /> : <Mic size={36} className="group-hover/main:scale-110 transition-transform" />}
                            </button>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em] drop-shadow-lg">
                                {voice.isConnecting ? 'Syncing...' : voice.isActive ? 'Sever Link' : 'Initialize Hub'}
                            </span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className={cn("w-1 h-1 rounded-full", voice.isActive ? "bg-[var(--plasma-green)] animate-pulse" : "bg-gray-800")} style={{ animationDelay: `${i * 0.2}s` }} />)}
                            </div>
                        </div>
                    </div>

                    <NodePersona
                        label={voice.voiceName}
                        image={agentAvatar}
                        freqs={agentFreqs}
                        color={agentColor}
                        isAgent={true}
                        isThinking={voice.isActive && !!voice.partialTranscript}
                    />
                </div>
            </div>

            {/* Transcript Log HUD */}
            <motion.div
                animate={{ height: isTranscriptExpanded ? '50%' : 192 }}
                transition={{ duration: 0.3 }}
                className="bg-black/60 border-t border-white/5 p-8 relative flex flex-col overflow-hidden backdrop-blur-4xl shadow-[0_-20px_50px_rgba(0,0,0,0.4)]"
            >
                <div className="flex items-center justify-between mb-6 px-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-1.5 bg-white/5 rounded-lg"><Terminal size={14} className="text-gray-500" /></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Secure Communication Buffer</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={12} className="text-[var(--plasma-green)]" />
                            <span className="text-[8px] font-mono text-gray-600 uppercase">Handshake_L0_Valid</span>
                        </div>
                        {nexusState.lastComplexityScore > 0 && (
                            <div className="flex items-center gap-2">
                                <Gauge size={12} className="text-[var(--amethyst)]" />
                                <span className="text-[8px] font-mono text-gray-600 uppercase">
                                    DQ:{nexusState.lastComplexityScore.toFixed(2)} → {nexusState.currentProvider.reasoning}
                                </span>
                            </div>
                        )}
                        <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">{voice.transcripts.length} packets synchronized</span>
                        <button
                            onClick={() => { setVoiceState({ transcripts: [], partialTranscript: null }); audio.playClick(); }}
                            disabled={voice.transcripts.length === 0}
                            className="p-1.5 bg-white/5 rounded-lg text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30"
                            title="Clear History"
                        >
                            <RotateCcw size={12} />
                        </button>
                        <button
                            onClick={() => { setIsTranscriptExpanded(!isTranscriptExpanded); audio.playClick(); }}
                            className="p-1.5 bg-white/5 rounded-lg text-gray-600 hover:text-white transition-colors"
                            title={isTranscriptExpanded ? "Collapse" : "Expand"}
                        >
                            {isTranscriptExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[12px] leading-relaxed pr-8" ref={scrollRef}>
                    {voice.transcripts.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "mb-5 flex gap-6 p-5 rounded-2xl border transition-all",
                                t.role === 'user'
                                    ? "bg-[var(--cyan)]/5 border-[var(--cyan)]/20 text-[var(--cyan)] flex-row-reverse"
                                    : "bg-[var(--agent-theme)]/5 border-[var(--agent-theme)]/20 text-white"
                            )}
                        >
                            <div className="shrink-0 flex flex-col items-center gap-1 opacity-40">
                                {t.role === 'user' ? <Target size={14} /> : <Bot size={14} />}
                                <span className="text-[7px] font-black uppercase tracking-tighter">{t.role === 'user' ? 'OP' : 'AI'}</span>
                            </div>
                            <div className="flex-1 italic tracking-tight leading-relaxed select-text">"{(t.text || '').toString()}"</div>
                        </motion.div>
                    ))}

                    <AnimatePresence>
                        {voice.partialTranscript && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={cn(
                                    "mb-5 flex gap-6 p-5 rounded-2xl border border-dashed animate-pulse",
                                    voice.partialTranscript.role === 'user'
                                        ? "border-[var(--cyan)]/40 text-[var(--cyan)]/60 flex-row-reverse"
                                        : "border-[var(--agent-theme)]/40 text-white/60"
                                )}
                            >
                                <div className="shrink-0 flex flex-col items-center gap-1 opacity-20">
                                    <Activity size={14} />
                                </div>
                                <div className="flex-1 italic tracking-tight">"{(voice.partialTranscript.text || '').toString()}"</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {voice.transcripts.length === 0 && !voice.partialTranscript && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4 py-10 grayscale scale-110">
                            <AudioWaveform size={48} className="animate-pulse" />
                            <span className="text-[10px] uppercase tracking-[0.6em] uppercase">V1.0 - THE D-Ecosystem</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default VoiceMode;