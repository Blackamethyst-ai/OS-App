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
    Eye, Scan, Monitor, Save, Gauge, Database, Fingerprint,
    Bot, RefreshCw, ShieldAlert, CheckCircle2, Target
} from 'lucide-react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { useVisualCortex } from '../hooks/useVisualCortex';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

const ActionButton = ({ icon: Icon, label, onClick, color, isActive }: any) => (
    <motion.button
        whileHover={{ 
            scale: 1.1, 
            y: -5,
            filter: `drop-shadow(0 0 15px ${color}66)`
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { audio.playClick(); onClick(); }}
        className="flex flex-col items-center group relative transition-all duration-300 px-1"
    >
        <div className={cn(
            "w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-500 shadow-2xl backdrop-blur-3xl relative overflow-hidden",
            isActive ? "bg-white/10 border-white/40" : "bg-black/60 border-white/5 group-hover:border-white/20"
        )}>
            <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity" style={{ color }} />
            <Icon size={18} style={{ color: isActive ? '#fff' : color }} />
        </div>
        <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {label}
        </span>
    </motion.button>
);

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
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
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
                            "flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-500",
                            isActive 
                                ? 'bg-white/10 border-[var(--layer-color)] text-white shadow-[0_0_10px_var(--layer-color)]' 
                                : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'
                        )}
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
        kernel, system, collaboration, actions,
        isScrubberOpen, isDiagnosticsOpen
    } = useAppStore();
    const { setScrubberOpen, setDiagnosticsOpen, setCollabState, addLog, toggleTerminal } = actions;

    const { execute, state: agentState } = useAgentRuntime();
    const { probeScreen, isProbing } = useVisualCortex();
    const { fps, memory } = usePerformanceMonitor();
    
    const [input, setInput] = useState('');
    const [driveHealth, setDriveHealth] = useState(99.4);
    const [neuralLoad, setNeuralLoad] = useState(12.4);
    
    const peerCount = collaboration.peers.length;

    useEffect(() => {
        const interval = setInterval(() => {
            setDriveHealth(prev => Math.max(98, Math.min(99.9, prev + (Math.random() * 0.1 - 0.05))));
            setNeuralLoad(prev => Math.max(5, Math.min(45, prev + (Math.random() * 4 - 2))));
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
        <div className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none flex flex-col justify-end pb-6 z-[500]">
            <motion.div 
                className="mx-8 pointer-events-auto"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            >
                <div className="flex items-center justify-between px-8 py-3.5 bg-[#0a0a0c]/98 backdrop-blur-5xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.9)] relative overflow-hidden group glass-refraction max-w-[2400px] mx-auto">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.01)_50%,transparent_75%)] bg-[size:200%_200%] animate-[shimmer_10s_infinite_linear] pointer-events-none" />
                    
                    {/* SECTOR 1: TELEMETRY & HEALTH */}
                    <div className="flex items-center gap-10 pr-10 border-r border-white/5 shrink-0 relative z-10">
                        {/* New Neural Load Gauge */}
                        <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                             <div className="flex items-center gap-2 text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none">
                                <Gauge size={11} className="text-[#18E6FF]" />
                                <span>Neural_Load</span>
                             </div>
                             <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div 
                                    animate={{ width: `${neuralLoad}%` }}
                                    className={cn("h-full transition-colors duration-1000", neuralLoad > 30 ? "bg-[#ef4444]" : "bg-[#18E6FF]")} 
                                />
                             </div>
                        </div>

                        {/* Original Integrity/FPS/MB */}
                        <div className="flex flex-col gap-1 min-w-[70px]">
                            <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-[0.4em] leading-none mb-1">Integrity</span>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-[#10b981]" />
                                </div>
                                <span className="text-[10px] font-black font-mono text-[#10b981]">{driveHealth.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-[0.4em] leading-none mb-1">Optical</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-black font-mono text-[#22d3ee]">{fps}</span>
                                    <span className="text-[5px] text-gray-700 font-black uppercase tracking-tighter">FPS</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-[0.4em] leading-none mb-1">Lattice</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-black font-mono text-[#f59e0b]">{memory?.used || 0}</span>
                                    <span className="text-[5px] text-gray-700 font-black uppercase tracking-tighter">MB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTOR 2: DIRECTIVE INPUT */}
                    <div className="flex-1 flex items-center px-10 relative z-10">
                        <form onSubmit={handleSubmit} className="w-full relative flex items-center gap-4 bg-black/40 rounded-2xl px-6 py-2 border border-white/5 focus-within:border-[#9d4edd]/50 transition-all shadow-inner group/input">
                            <div className={cn("shrink-0 transition-all duration-500", agentState.isThinking ? 'text-[#9d4edd] scale-125' : 'text-gray-700 group-focus-within/input:text-[#9d4edd]')}>
                                {agentState.isThinking ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                            </div>
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={agentState.isThinking}
                                placeholder={agentState.isThinking ? "PROCESSING DIRECTIVE..." : "INITIALIZE..."}
                                className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em] py-1"
                                autoComplete="off"
                            />
                            {input && <button type="submit" className="text-[#9d4edd] hover:text-white transition-colors"><ArrowRight size={14} /></button>}
                        </form>
                    </div>

                    {/* SECTOR 3: AUTONOMIC ACTION MESH (The 5 icons from screenshot) */}
                    <div className="flex items-center gap-2 px-8 border-x border-white/5 relative z-10 shrink-0">
                        <ActionButton 
                            icon={Terminal} 
                            label="SHELL" 
                            color="#7B2CFF" 
                            onClick={() => toggleTerminal()} 
                            isActive={system.isTerminalOpen}
                        />
                        <ActionButton 
                            icon={Scan} 
                            label="PROBE" 
                            color="#18E6FF" 
                            onClick={probeScreen}
                            isActive={isProbing}
                        />
                        <ActionButton 
                            icon={Bot} 
                            label="NODES" 
                            color="#10b981" 
                            onClick={() => addLog('INFO', 'SWARM: Refreshing active node presence.')} 
                        />
                        <ActionButton 
                            icon={RefreshCw} 
                            label="SYNC" 
                            color="#f1c21b" 
                            onClick={() => addLog('SYSTEM', 'HUB: Calibrating neural resonance.')} 
                        />
                        <ActionButton 
                            icon={ShieldAlert} 
                            label="DIAGS" 
                            color="#ef4444" 
                            onClick={() => setDiagnosticsOpen(true)}
                            isActive={isDiagnosticsOpen}
                        />
                    </div>

                    {/* SECTOR 4: IDENTITY & AUDIT */}
                    <div className="flex items-center gap-8 pl-10 shrink-0 relative z-10">
                        {/* New Auth Token Node */}
                        <div className="flex flex-col items-center gap-1 px-6 border-r border-white/5 min-w-[100px]">
                             <div className="flex items-center gap-2 text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none">
                                <Fingerprint size={11} className="text-[#9d4edd]" />
                                <span>Auth_Token</span>
                             </div>
                             <span className="text-[11px] font-mono text-gray-300 font-bold tracking-tighter uppercase leading-none mt-1">0xFD2..9A</span>
                        </div>

                        {/* Peer Mesh & Context Harmonics */}
                        <div className="flex items-center gap-4">
                            <Suspense fallback={<div className="w-20 h-8 bg-white/5 animate-pulse rounded-xl" />}>
                                <LayerControlMesh />
                            </Suspense>

                            <button 
                                onClick={() => setCollabState({ isOverlayOpen: !collaboration.isOverlayOpen })}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all relative overflow-hidden group/peers",
                                    collaboration.isOverlayOpen ? "bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]" : "bg-white/5 border-white/5 text-gray-600 hover:text-white"
                                )}
                            >
                                <Users size={16} />
                                <span className="text-[10px] font-black font-mono">{peerCount}</span>
                            </button>

                            <button onClick={() => setScrubberOpen(!isScrubberOpen)} className={cn("p-2.5 rounded-xl border transition-all", isScrubberOpen ? "bg-[#9d4edd] text-black border-[#9d4edd] shadow-lg" : "bg-white/5 border-white/5 text-gray-600 hover:text-white")}>
                                <History size={18} />
                            </button>
                        </div>

                        {/* Runtime Ticker */}
                        <div className="text-right pl-6 min-w-[100px]">
                            <div className="text-[7px] text-gray-600 font-mono uppercase tracking-[0.3em] font-black mb-1">Runtime</div>
                            <div className="text-[12px] font-mono font-black text-white tracking-tighter leading-none">{formatUptime(kernel.uptime)}</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default GlobalStatusBar;