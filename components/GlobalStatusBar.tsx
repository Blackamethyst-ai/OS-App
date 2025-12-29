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
    ArrowRight, Loader2, Terminal, HardDrive, Globe, Users
} from 'lucide-react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';

const LayerControlMesh = () => {
    const { toggleKnowledgeLayer, knowledge, addLog } = useAppStore();
    const activeLayerIds = knowledge.activeLayers || [];
    
    const dynamicLayers = use(neuralVault.getKnowledgeLayers());
    
    const allLayers: Record<string, KnowledgeLayer> = {
        ...KNOWLEDGE_LAYERS,
        ...Object.fromEntries(dynamicLayers.map(l => [l.id, l]))
    };

    return (
        <div className="flex items-center gap-1 bg-black/5 p-0.5 rounded-lg border border-[var(--border-main)]">
            {Object.values(allLayers).map((layer) => {
                const isActive = activeLayerIds.includes(layer.id);
                // @ts-ignore
                const Icon = Icons[layer.icon] || Icons.Layers;
                return (
                    <motion.button
                        key={layer.id}
                        onClick={() => {
                            toggleKnowledgeLayer(layer.id);
                            addLog('SYSTEM', `LAYER: ${layer.label}`);
                        }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                            flex items-center justify-center w-7 h-7 rounded-md border transition-all duration-300
                            ${isActive 
                                ? 'bg-white/10 border-[var(--layer-color)] text-white shadow-sm' 
                                : 'bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}
                        `}
                        style={{ '--layer-color': layer.color } as React.CSSProperties}
                        title={layer.label}
                    >
                        <Icon size={12} style={{ color: isActive ? layer.color : undefined }} />
                    </motion.button>
                );
            })}
        </div>
    );
};

const GlobalStatusBar: React.FC = () => {
    const { 
        kernel, knowledge, system,
        isScrubberOpen, setScrubberOpen,
        isDiagnosticsOpen, setDiagnosticsOpen,
        collaboration, setCollabState,
        addLog
    } = useAppStore();
    const { execute, state: agentState } = useAgentRuntime();
    const [input, setInput] = useState('');
    const [driveHealth, setDriveHealth] = useState(99);
    const [isRevealed, setIsRevealed] = useState(false);
    
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || agentState.isThinking) return;
        const prompt = input;
        setInput('');
        await execute(prompt);
    };

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 z-[150] h-20 pointer-events-none flex flex-col justify-end pb-4"
            onMouseEnter={() => setIsRevealed(true)}
            onMouseLeave={() => setIsRevealed(false)}
        >
            {/* The actual visible UI component */}
            <motion.div 
                className="mx-6 pointer-events-auto"
                initial={false}
                animate={{ 
                    y: isRevealed || agentState.isThinking ? 0 : 60,
                    opacity: isRevealed || agentState.isThinking ? 1 : 0.4
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            >
                <div className="flex items-center justify-between px-6 py-2.5 bg-[var(--bg-panel)] backdrop-blur-3xl border border-[var(--border-main)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] select-none overflow-hidden relative max-w-[1400px] mx-auto transition-colors duration-500">
                    <div className="flex items-center gap-6 pr-6 border-r border-[var(--border-main)] shrink-0 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Health</span>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-1 bg-[var(--border-main)] rounded-full overflow-hidden">
                                    <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-[#10b981]" />
                                </div>
                                <span className="text-[10px] font-mono font-black text-[#10b981]">{Math.round(driveHealth)}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Int</span>
                            <span className="text-[10px] font-mono font-black text-[#9d4edd] leading-none">{Math.round(kernel.integrity)}%</span>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center px-8 relative z-10">
                        <form onSubmit={handleSubmit} className="w-full max-w-[500px] relative flex items-center gap-3 bg-black/10 rounded-xl px-4 py-1.5 border border-[var(--border-main)] focus-within:border-[#9d4edd]/40 transition-all shadow-inner">
                            <div className={`shrink-0 ${agentState.isThinking ? 'text-[#9d4edd] animate-spin' : 'text-[var(--text-muted)]'}`}>
                                <BrainCircuit size={14} />
                            </div>
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={agentState.isThinking}
                                placeholder={agentState.isThinking ? "CRYSTALLIZING INTENT..." : "COMMAND CORE..."}
                                className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-[var(--text-primary)] placeholder:text-gray-700 uppercase tracking-widest"
                            />
                            {input && !agentState.isThinking && (
                                <button type="submit" className="text-[#9d4edd] hover:scale-110 transition-transform"><ArrowRight size={16} /></button>
                            )}
                        </form>
                    </div>

                    <div className="flex items-center gap-5 pl-6 border-l border-[var(--border-main)] shrink-0 relative z-10">
                        <button 
                            onClick={() => setCollabState({ isOverlayOpen: !collaboration.isOverlayOpen })}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all ${collaboration.isOverlayOpen ? 'bg-[#22d3ee] text-black border-[#22d3ee]' : 'bg-black/10 border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}
                        >
                            <Users size={14} />
                            <span className="text-[10px] font-black font-mono uppercase tracking-widest">{peerCount}P</span>
                        </button>

                        <Suspense fallback={<div className="w-20 h-8 bg-black/5 animate-pulse rounded-lg" />}>
                            <LayerControlMesh />
                        </Suspense>

                        <div className="flex items-center gap-2">
                            <button onClick={() => setScrubberOpen(!isScrubberOpen)} className={`p-2 rounded-lg transition-all ${isScrubberOpen ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/20' : 'bg-black/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent hover:border-[#333]'}`}>
                                <History size={16} />
                            </button>
                            <button onClick={() => setDiagnosticsOpen(!isDiagnosticsOpen)} className={`p-2 rounded-lg transition-all ${isDiagnosticsOpen ? 'bg-[#22d3ee] text-black shadow-lg shadow-[#22d3ee]/20' : errorCount > 0 ? 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse' : 'bg-black/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent hover:border-[#333]'}`}>
                                <Activity size={16} />
                            </button>
                        </div>

                        <div className="text-right pl-4 border-l border-[var(--border-main)] min-w-[80px]">
                            <div className="text-[7px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Uptime</div>
                            <div className="text-[11px] font-mono font-bold text-[var(--text-primary)] tracking-tight">{formatUptime(kernel.uptime)}</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default GlobalStatusBar;