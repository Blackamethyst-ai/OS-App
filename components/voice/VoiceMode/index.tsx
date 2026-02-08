/**
 * VOICE MODE
 *
 * Voice communication interface with AI agents.
 * Features frequency visualizations, agent personas, and transcript logging.
 */

import { apiKeyService } from '../../../services/apiKeyService';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../../../services/geminiService';
import { voiceNexus, getVoiceCore } from '../../../services/voiceNexus';
import { runPreflightCheck, type PreflightResult } from '../../../services/voiceNexus/preflightCheck';
// ... (imports)

// ...


import type { VoiceMode as VoiceModeType } from '../../../services/voiceNexus';
import {
    Mic, Activity, Power, Settings, Sliders, X, RotateCcw, Loader2,
    Radio, Target, Bot, ShieldCheck, ChevronDown, ChevronUp, Gauge,
    Terminal, AudioWaveform, AlertTriangle, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../../services/audioService';
import { cn } from '../../../utils/cn';
import CPBStatusOverlay from '../../CPBStatusOverlay';

// Extracted sub-components
import { NodePersona, ModeSelector } from './parts';

const VoiceMode: React.FC = () => {
    const { voice, voiceNexus: nexusState, user, actions } = useAppStore();
    const { setVoiceState, setVoiceNexusState, addLog } = actions;
    const [showTuning, setShowTuning] = useState(false);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
    const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
    const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
    const [preflight, setPreflight] = useState<PreflightResult | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Run preflight check on mount and when vault state changes
    useEffect(() => {
        setPreflight(runPreflightCheck());
    }, []);

    const currentAgentMetadata = useMemo(() =>
        Object.values(HIVE_AGENTS).find((a: any) => a.name === voice.voiceName) || HIVE_AGENTS['dr_ira'] || Object.values(HIVE_AGENTS)[0],
        [voice.voiceName]);
    const agentAvatar = voice.agentAvatars[voice.voiceName] || null;

    // Branded Theme derivation
    const agentColor = useMemo(() => {
        const colors: Record<string, string> = {
            'Dr. Ira': 'var(--plasma-green)',
            'Mike': 'var(--amethyst)',
            'Caleb': 'var(--cyan)',
            'Noah': '#f472b6',
            'Helen': '#fbbf24',
            'Perri': '#a78bfa',
            'Paramdeep': '#34d399',
            'Bilal': '#60a5fa',
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
                        if (!url) url = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==";
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

    const handleModeChange = (mode: VoiceModeType) => {
        voiceNexus.setMode(mode);
        setVoiceNexusState({ mode });
        addLog('SYSTEM', `VOICE_NEXUS: Mode switched to [${mode.toUpperCase()}]`);
    };

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [voice.transcripts, voice.partialTranscript]);

    const toggleSession = () => {
        if (voice.isActive || voice.isConnecting) {
            setVoiceState({ isActive: false, isConnecting: false });
            addLog('SYSTEM', 'COMMS: Link severed.');
            audio.playError();
        } else {
            // Re-check preflight before starting
            const check = runPreflightCheck();
            setPreflight(check);
            if (!check.canProceed) {
                addLog('ERROR', `VOICE_CORE: ${check.errors[0] || 'Voice system not ready'}`);
                audio.playError();
                return;
            }

            // Prime audio on user click to unlock AudioContext/TTS
            try {
                getVoiceCore().primeAudio();
            } catch (e) {
                console.warn('Failed to prime audio:', e);
            }

            setVoiceState({ isConnecting: true, isActive: true });
            addLog('SUCCESS', `COMMS: Unified uplink established with ${voice.voiceName}.`);
            audio.playSuccess();
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
                                        agent.name === 'Caleb' ? 'var(--cyan)' : '#888';
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
                        isThinking={false}
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
                                        : preflight && !preflight.canProceed
                                            ? "bg-black border-amber-500/30 text-amber-500/60 cursor-not-allowed"
                                            : "bg-black border-white/10 text-white hover:border-[var(--agent-theme)] hover:shadow-[var(--agent-theme)]/20"
                                )}
                                style={{ boxShadow: voice.isActive ? '0 0 40px rgba(239, 68, 68, 0.2)' : '0 0 40px rgba(0,0,0,0.5)' }}
                            >
                                {voice.isConnecting ? <Loader2 className="animate-spin" size={28} /> : voice.isActive ? <Power size={36} /> : preflight && !preflight.canProceed ? <KeyRound size={32} /> : <Mic size={36} className="group-hover/main:scale-110 transition-transform" />}
                            </button>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em] drop-shadow-lg">
                                {voice.isConnecting ? 'Syncing...' : voice.isActive ? 'Sever Link' : preflight && !preflight.canProceed ? 'Keys Required' : 'Initialize Hub'}
                            </span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className={cn("w-1 h-1 rounded-full", voice.isActive ? "bg-[var(--plasma-green)] animate-pulse" : "bg-gray-800")} style={{ animationDelay: `${i * 0.2}s` }} />)}
                            </div>
                        </div>

                        {/* Preflight Warning */}
                        {preflight && !preflight.canProceed && !voice.isActive && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -bottom-24 w-80 bg-black/80 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 z-50"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        {preflight.errors.map((err, i) => (
                                            <p key={i} className="text-[10px] font-mono text-amber-400/90 leading-relaxed">{err}</p>
                                        ))}
                                        {preflight.recommendations.map((rec, i) => (
                                            <p key={`r-${i}`} className="text-[9px] font-mono text-gray-500 leading-relaxed">{rec}</p>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
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
                                    DQ:{nexusState.lastComplexityScore.toFixed(2)} → {nexusState.currentProvider.reasoning} + {nexusState.currentProvider.tts === 'elevenlabs' ? '11Labs' : 'Browser'}
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
