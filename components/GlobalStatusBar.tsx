
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

/**
 * LayerControlMesh: React 19 Suspense Component
 */
const LayerControlMesh = () => {
    const { toggleKnowledgeLayer, knowledge, addLog } = useAppStore();
    const activeLayerIds = knowledge.activeLayers || [];
    
    const dynamicLayers = use(neuralVault.getKnowledgeLayers());
    
    const allLayers: Record<string, KnowledgeLayer> = {
        ...KNOWLEDGE_LAYERS,
        ...Object.fromEntries(dynamicLayers.map(l => [l.id, l]))
    };

    return (
        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
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
                                ? 'bg-white/5 border-[var(--layer-color)] text-white' 
                                : 'bg-transparent border-transparent text-gray-700 hover:text-gray-400'}
                        `}
                        style={{ 
                            '--layer-color': layer.color,
                        } as React.CSSProperties}
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
        kernel, knowledge, toggleKnowledgeLayer, system,
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
        <>
            <div 
                className="fixed bottom-0 left-0 right-0 h-4 z-[149] pointer-events-auto"
                onMouseEnter={() => setIsRevealed(true)}
            />

            <motion.div 
                className="fixed bottom-0 left-2 right-2 z-[150] pointer-events-none"
                initial={false}
                animate={{ 
                    y: isRevealed || agentState.isThinking ? -6 : 40,
                    opacity: isRevealed || agentState.isThinking ? 1 : 0
                }}
                transition={{ 
                    type: 'spring', 
                    damping: 25, 
                    stiffness: 200
                }}
                onMouseEnter={() => setIsRevealed(true)}
                onMouseLeave={() => setIsRevealed(false)}
            >
                <div className="flex items-center justify-between px-4 py-1.5 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto select-none overflow-hidden relative max-w-[1400px] mx-auto">
                    
                    {/* LEFT: COMPACT KERNEL HUD */}
                    <div className="flex items-center gap-4 pr-4 border-r border-white/5 shrink-0 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest leading-none mb-1">Health</span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-8 h-0.5 bg-[#111] rounded-full overflow-hidden">
                                    <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-[#10b981]" />
                                </div>
                                <span className="text-[9px] font-mono font-black text-[#10b981]">{Math.round(driveHealth)}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest mb-1">Int</span>
                            <span className="text-[9px] font-mono font-black text-[#9d4edd] leading-none">{Math.round(kernel.integrity)}%</span>
                        </div>
                    </div>

                    {/* CENTER: COMPACT INTENT */}
                    <div className="flex-1 flex justify-center px-6 relative z-10">
                        <form onSubmit={handleSubmit} className="w-full max-w-[400px] relative flex items-center gap-2 bg-black/40 rounded-lg px-3 py-1 border border-white/5 focus-within:border-white/20 transition-all">
                            <div className={`shrink-0 ${agentState.isThinking ? 'text-[#9d4edd] animate-spin' : 'text-gray-600'}`}>
                                <BrainCircuit size={12} />
                            </div>
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={agentState.isThinking}
                                placeholder={agentState.isThinking ? "PROCESSING..." : "INPUT INTENT..."}
                                className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-white placeholder:text-gray-800 uppercase tracking-widest"
                            />
                            {input && !agentState.isThinking && (
                                <button type="submit" className="text-[#9d4edd]"><ArrowRight size={14} /></button>
                            )}
                        </form>
                    </div>

                    {/* RIGHT: NAVIGATION & TEMPORAL */}
                    <div className="flex items-center gap-3 pl-4 border-l border-white/5 shrink-0 relative z-10">
                        <button 
                            onClick={() => setCollabState({ isOverlayOpen: !collaboration.isOverlayOpen })}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-all ${collaboration.isOverlayOpen ? 'bg-[#22d3ee] text-black border-[#22d3ee]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                        >
                            <Users size={12} />
                            <span className="text-[8px] font-black font-mono uppercase tracking-widest">{peerCount}P</span>
                        </button>

                        <Suspense fallback={<div className="w-12 h-6 bg-white/5 animate-pulse rounded" />}>
                            <LayerControlMesh />
                        </Suspense>

                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setScrubberOpen(!isScrubberOpen)} className={`p-1.5 rounded-lg transition-all ${isScrubberOpen ? 'bg-[#9d4edd] text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                                <History size={14} />
                            </button>
                            <button onClick={() => setDiagnosticsOpen(!isDiagnosticsOpen)} className={`p-1.5 rounded-lg transition-all ${isDiagnosticsOpen ? 'bg-[#22d3ee] text-black' : errorCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                                <Activity size={14} />
                            </button>
                        </div>

                        <div className="text-right pl-3 border-l border-white/5">
                            <div className="text-[6px] text-gray-700 font-mono uppercase tracking-widest">Uptime</div>
                            <div className="text-[9px] font-mono font-bold text-gray-500">{formatUptime(kernel.uptime)}</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default GlobalStatusBar;
