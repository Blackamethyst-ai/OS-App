import React, { useState, useEffect, use, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { neuralVault } from '../services/persistenceService';
import { KnowledgeLayer } from '../types';
import * as Icons from 'lucide-react';
import { 
    Activity, Clock, Cpu, Shield, Zap, Hammer, Coins, 
    Telescope, History, AlertOctagon, BrainCircuit, 
    ArrowRight, Loader2, Terminal, HardDrive, Globe, Users,
    Eye, Scan, Monitor, Save, Gauge, Database, Fingerprint
} from 'lucide-react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { useVisualCortex } from '../hooks/useVisualCortex';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

const LayerControlMesh = () => {
    const { knowledge, actions } = useAppStore();
    const { toggleKnowledgeLayer, addLog } = actions;
    const activeLayerIds = knowledge.activeLayers || [];
    
    const dynamicLayersRaw = use(neuralVault.getKnowledgeLayers());
    const dynamicLayers = Array.isArray(dynamicLayersRaw) ? dynamicLayersRaw : [];
    
    const allLayers: Record<string, KnowledgeLayer> = {
        ...KNOWLEDGE_LAYERS,
        ...Object.fromEntries(dynamicLayers.map(l => [l.id, l]))
    };

    return (
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 shadow-inner">
            {Object.values(allLayers).map((layer) => {
                const isActive = activeLayerIds.includes(layer.id);
                // @ts-ignore
                const Icon = Icons[layer.icon] || Icons.Layers;
                return (
                    <motion.button
                        key={layer.id}
                        onClick={() => {
                            toggleKnowledgeLayer(layer.id);
                            addLog('SYSTEM', `PROTOCOL_ENGAGED: ${layer.label.toUpperCase()}`);
                        }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-500",
                            isActive 
                                ? 'bg-white/10 border-[var(--layer-color)] text-white shadow-[0_0_15px_var(--layer-color)]' 
                                : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'
                        )}
                        style={{ '--layer-color': layer.color } as React.CSSProperties}
                        title={layer.label}
                    >
                        <Icon size={14} style={{ color: isActive ? layer.color : undefined }} />
                    </motion.button>
                );
            })}
        </div>
    );
};

const GlobalStatusBar: React.FC = () => {
    const { 
        kernel, system, collaboration, actions,
        isScrubberOpen, isDiagnosticsOpen
    } = useAppStore();
    const { setScrubberOpen, setDiagnosticsOpen, setCollabState, addLog } = actions;

    const { execute, state: agentState } = useAgentRuntime();
    const { probeScreen, isProbing } = useVisualCortex();
    const { fps, memory } = usePerformanceMonitor();
    const [input, setInput] = useState('');
    const [driveHealth, setDriveHealth] = useState(99.4);
    const [isRevealed, setIsRevealed] = useState(false);
    
    const errorCount = system.logs.filter((l: any) => l.level === 'ERROR').length;
    const peerCount = collaboration.peers.length;

    useEffect(() => {
        const interval = setInterval(() => {
            setDriveHealth(prev => Math.max(98, Math.min(99.9, prev + (Math.random() * 0.1 - 0.05))));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || agentState.isThinking) return;
        const prompt = input;
        setInput('');
        await execute(prompt);
    };

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 z-[500] h-20 pointer-events-none flex flex-col justify-end pb-4"
            onMouseEnter={() => setIsRevealed(true)}
            onMouseLeave={() => setIsRevealed(false)}
        >
            <motion.div 
                className="mx-10 pointer-events-auto"
                initial={false}
                animate={{ 
                    y: isRevealed || agentState.isThinking || isProbing ? 0 : 60,
                    opacity: isRevealed || agentState.isThinking || isProbing ? 1 : 0.4
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            >
                <div className="flex items-center justify-between px-8 py-2.5 bg-[#0a0a0c]/95 backdrop-blur-4xl border border-white/5 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.8)] select-none overflow-hidden relative max-w-[1600px] mx-auto transition-all duration-700 glass-refraction">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.01)_50%,transparent_75%)] bg-[size:200%_200%] animate-[shimmer_10s_infinite_linear] pointer-events-none" />
                    
                    <div className="flex items-center gap-10 pr-10 border-r border-white/5 shrink-0 relative z-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-[0.4em] leading-none mb-0.5">Integrity</span>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-gradient-to-r from-[#10b981] to-[#22d3ee]" />
                                </div>
                                <span className="text-[10px] font-black font-mono text-[#10b981] tracking-tighter">{driveHealth.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-[0.4em] leading-none">Optical</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black font-mono text-[#22d3ee] tracking-tighter leading-none">{fps}</span>
                                    <span className="text-[6px] text-gray-700 font-black uppercase tracking-tighter">FPS</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-[0.4em] leading-none">Lattice</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black font-mono text-[#f59e0b] tracking-tighter leading-none">{memory?.used || 0}</span>
                                    <span className="text-[6px] text-gray-700 font-black uppercase tracking-tighter">MB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center px-10 relative z-10">
                        <form onSubmit={handleSubmit} className="w-full max-w-[500px] relative flex items-center gap-4 bg-black/40 rounded-xl px-5 py-1.5 border border-white/5 focus-within:border-[#9d4edd]/50 focus-within:bg-black/60 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] group/input">
                            <div className={cn("shrink-0 transition-all duration-500", agentState.isThinking ? 'text-[#9d4edd] scale-110' : 'text-gray-600 group-focus-within/input:text-white')}>
                                {agentState.isThinking ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                            </div>
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={agentState.isThinking}
                                placeholder={agentState.isThinking ? "PROCESSING..." : "INITIALIZE..."}
                                className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em] py-1.5"
                                autoComplete="off"
                            />
                            {input && !agentState.isThinking && (
                                <button type="submit" className="text-[#9d4edd] hover:scale-125 transition-transform"><ArrowRight size={16} /></button>
                            )}
                        </form>
                    </div>

                    <div className="flex items-center gap-5 pl-10 border-l border-white/5 shrink-0 relative z-10">
                        <button 
                            onClick={probeScreen}
                            className={cn(
                                "p-2.5 rounded-xl transition-all border relative overflow-hidden group/probe",
                                isProbing ? "bg-[#9d4edd] text-black border-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.3)]" : "bg-white/5 border-white/5 text-gray-600 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <Scan size={16} />
                        </button>

                        <button 
                            onClick={() => setCollabState({ isOverlayOpen: !collaboration.isOverlayOpen })}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all relative overflow-hidden group/peers",
                                collaboration.isOverlayOpen ? "bg-[#22d3ee] text-black border-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.2)]" : "bg-white/5 border-white/5 text-gray-600 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <Users size={14} />
                            <span className="text-[10px] font-black font-mono uppercase tracking-widest">{peerCount}</span>
                        </button>

                        <Suspense fallback={<div className="w-24 h-8 bg-white/5 animate-pulse rounded-xl" />}>
                            <LayerControlMesh />
                        </Suspense>

                        <div className="flex items-center gap-2.5">
                            <button onClick={() => setScrubberOpen(!isScrubberOpen)} className={cn("p-2.5 rounded-xl border transition-all", isScrubberOpen ? "bg-[#9d4edd] text-black border-[#9d4edd]" : "bg-white/5 border-white/5 text-gray-600 hover:text-white")}>
                                <History size={16} />
                            </button>
                            <button onClick={() => setDiagnosticsOpen(!isDiagnosticsOpen)} className={cn("p-2.5 rounded-xl border transition-all relative", isDiagnosticsOpen ? "bg-[#22d3ee] text-black border-[#22d3ee]" : errorCount > 0 ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" : "bg-white/5 border-white/5 text-gray-600 hover:text-white")}>
                                <Activity size={16} />
                            </button>
                        </div>

                        <div className="text-right pl-6 border-l border-white/5 min-w-[90px]">
                            <div className="text-[7px] text-gray-600 font-mono uppercase tracking-[0.2em] font-black mb-0.5">Runtime</div>
                            <div className="text-[12px] font-mono font-black text-white tracking-tighter leading-none">{formatUptime(kernel.uptime)}</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default GlobalStatusBar;