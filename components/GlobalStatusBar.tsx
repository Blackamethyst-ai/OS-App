
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import * as Icons from 'lucide-react';
import { 
    Activity, Clock, Cpu, Shield, Zap, Hammer, Coins, 
    Telescope, History, AlertOctagon, BrainCircuit, 
    ArrowRight, Loader2, Terminal, HardDrive, Globe, Users
} from 'lucide-react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';

const GlobalStatusBar: React.FC = () => {
    const { 
        kernel, knowledge, toggleKnowledgeLayer, system,
        isScrubberOpen, setScrubberOpen,
        isDiagnosticsOpen, setDiagnosticsOpen,
        collaboration, setCollabState
    } = useAppStore();
    const { execute, state: agentState } = useAgentRuntime();
    const [input, setInput] = useState('');
    const [driveHealth, setDriveHealth] = useState(99);
    
    const activeLayers = knowledge.activeLayers || [];
    const errorCount = system.logs.filter((l: any) => l.level === 'ERROR').length;
    const peerCount = collaboration.peers.length;

    useEffect(() => {
        const interval = setInterval(() => {
            setDriveHealth(prev => Math.max(90, Math.min(100, prev + (Math.random() * 0.2 - 0.1))));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || agentState.isThinking) return;
        const prompt = input;
        setInput('');
        await execute(prompt);
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[150] flex items-center pointer-events-none">
            <div className="flex-1 flex items-center justify-between px-6 py-2.5 bg-black/85 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] pointer-events-auto select-none overflow-hidden relative">
                
                {/* Global Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(255,0,0,0.08),rgba(0,255,0,0.03),rgba(0,0,255,0.08))] z-0 bg-[length:100%_2px,2px_100%]" />

                {/* LEFT: KERNEL HUD */}
                <div className="flex items-center gap-6 pr-6 border-r border-white/5 shrink-0 relative z-10">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none mb-1.5">Sector Health</span>
                        <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-[#111] rounded-full overflow-hidden border border-white/5">
                                <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                            </div>
                            <span className="text-[10px] font-mono font-black text-[#10b981] leading-none">{Math.round(driveHealth)}%</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-1">Entropy</span>
                        <span className="text-[11px] font-mono font-black text-[#22d3ee] leading-none">{Math.round(kernel.entropy)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-1">Integrity</span>
                        <span className="text-[11px] font-mono font-black text-[#9d4edd] leading-none">{Math.round(kernel.integrity)}%</span>
                    </div>
                </div>

                {/* CENTER: INTENT SPACEBAR */}
                <div className="flex-1 flex justify-center px-10 relative z-10">
                    <div className="w-full max-w-[500px] relative group">
                        {/* Circulating Loop Border Animation (Animated Border) */}
                        <div className="absolute -inset-[1px] rounded-xl overflow-hidden pointer-events-none">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_60%,#9d4edd_80%,#22d3ee_90%,transparent_100%)] opacity-20 group-focus-within:opacity-80 transition-opacity"
                            />
                        </div>

                        <form onSubmit={handleSubmit} className="relative flex items-center gap-3 bg-black/60 backdrop-blur-xl rounded-xl px-5 py-2.5 border border-white/5 group-focus-within:border-white/10 transition-all">
                            <div className={`
                                w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 shrink-0
                                ${agentState.isThinking ? 'bg-[#9d4edd] text-black shadow-[0_0_15px_#9d4edd]' : 'bg-[#111] text-gray-600 group-focus-within:text-[#9d4edd]'}
                            `}>
                                {agentState.isThinking ? <Loader2 size={15} className="animate-spin" /> : <BrainCircuit size={15} />}
                            </div>
                            <div className="flex-1 relative">
                                <input 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    disabled={agentState.isThinking}
                                    placeholder={agentState.isThinking ? "NEGOTIATING..." : "ENTER INTENT SEQUENCE..."}
                                    className="w-full bg-transparent border-none outline-none text-[11px] font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em]"
                                />
                                {agentState.isThinking && (
                                    <motion.div 
                                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        className="absolute -bottom-1.5 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent origin-center"
                                    />
                                )}
                            </div>
                            <button type="submit" disabled={!input || agentState.isThinking} className={`p-1.5 transition-all ${!input || agentState.isThinking ? 'opacity-0' : 'opacity-100 text-[#9d4edd]'}`}>
                                <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT: NAVIGATION & TEMPORAL */}
                <div className="flex items-center gap-4 pl-6 border-l border-white/5 shrink-0 relative z-10">
                    {/* Peer Swarm Indicator */}
                    <button 
                        onClick={() => setCollabState({ isOverlayOpen: !collaboration.isOverlayOpen })}
                        className={`group flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all ${collaboration.isOverlayOpen ? 'bg-[#22d3ee] text-black border-[#22d3ee]' : 'bg-white/5 border-white/10 hover:border-[#22d3ee]/40'}`}
                    >
                        <div className="relative">
                            <Users size={14} className={collaboration.isOverlayOpen ? 'text-black' : 'text-gray-400 group-hover:text-[#22d3ee]'} />
                            {peerCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10b981] border-2 border-black" />}
                        </div>
                        <span className={`text-[10px] font-black font-mono uppercase tracking-widest ${collaboration.isOverlayOpen ? 'text-black' : 'text-gray-500'}`}>
                            {peerCount} Swarm
                        </span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                            const isActive = activeLayers.includes(layer.id);
                            // @ts-ignore
                            const Icon = Icons[layer.icon] || Icons.Layers;
                            return (
                                <motion.button
                                    key={layer.id}
                                    onClick={() => toggleKnowledgeLayer(layer.id)}
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`
                                        flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300
                                        ${isActive 
                                            ? 'bg-white/5 border-[var(--layer-color)] text-white shadow-[0_0_10px_rgba(var(--layer-rgb),0.3)]' 
                                            : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400'}
                                    `}
                                    style={{ 
                                        '--layer-color': layer.color,
                                        '--layer-rgb': layer.color === '#f97316' ? '249,115,22' : layer.color === '#eab308' ? '234,179,8' : '168,85,247'
                                    } as React.CSSProperties}
                                    title={layer.label}
                                >
                                    <Icon size={14} style={{ color: isActive ? layer.color : undefined }} />
                                </motion.button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setScrubberOpen(!isScrubberOpen)}
                            className={`p-2.5 rounded-xl transition-all ${isScrubberOpen ? 'bg-[#9d4edd] text-black shadow-[0_0_15px_#9d4edd]' : 'bg-[#111] text-gray-500 hover:text-white'}`}
                            title="Temporal Navigation"
                        >
                            <History size={16} />
                        </button>
                        <button 
                            onClick={() => setDiagnosticsOpen(!isDiagnosticsOpen)}
                            className={`p-2.5 rounded-xl transition-all relative ${isDiagnosticsOpen ? 'bg-[#22d3ee] text-black shadow-[0_0_15px_#22d3ee]' : errorCount > 0 ? 'bg-red-950/30 text-red-500 animate-pulse border border-red-500/30' : 'bg-[#111] text-gray-500 hover:text-white'}`}
                            title="System Diagnostics"
                        >
                            <Activity size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 pl-4 border-l border-white/5 text-right">
                        <div>
                            <div className="text-[7px] text-gray-600 font-mono uppercase mb-0.5 tracking-widest">Uptime</div>
                            <div className="text-[10px] font-mono font-bold text-gray-300 tracking-tighter">{formatUptime(kernel.uptime)}</div>
                        </div>
                        <div>
                            <div className="text-[7px] text-gray-600 font-mono uppercase mb-0.5 tracking-widest">Clock</div>
                            <div className="text-[10px] font-mono font-bold text-gray-300 tracking-tighter">{formatTime()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalStatusBar;
