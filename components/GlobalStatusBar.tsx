import React, { useState, useEffect, useMemo, memo } from 'react';
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
    Bot, RefreshCw, ShieldAlert, CheckCircle2, Target, Radio,
    ShieldCheck, PanelRight, SearchCode
} from 'lucide-react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { useVisualCortex } from '../hooks/useVisualCortex';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

const ActionSquircle = memo(({ icon: Icon, color, onClick, isActive, glowColor }: any) => (
    <motion.button
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { audio.playClick(); onClick(); }}
        className="relative group flex items-center justify-center p-1.5"
    >
        <div className={cn(
            "w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-500 relative z-10 backdrop-blur-3xl",
            isActive ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-black/60 border-white/5 group-hover:border-white/20"
        )}>
            <Icon size={16} className="transition-colors duration-300" style={{ color: isActive ? '#fff' : color }} />
        </div>
        <div 
            className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-full" 
            style={{ backgroundColor: glowColor || color }} 
        />
    </motion.button>
));

const LayerControlMesh = memo(() => {
    const { knowledge, actions } = useAppStore();
    const { toggleKnowledgeLayer, addLog } = actions;
    const activeLayerIds = knowledge.activeLayers || [];
    const [dynamicLayers, setDynamicLayers] = useState<KnowledgeLayer[]>([]);
    
    // Fix: Move async fetch to useEffect to avoid suspension flicker
    useEffect(() => {
        let mounted = true;
        neuralVault.getKnowledgeLayers().then(layers => {
            if (mounted) setDynamicLayers(Array.isArray(layers) ? layers : []);
        });
        return () => { mounted = false; };
    }, []);
    
    // Fix: Explicitly type allLayers to Record<string, KnowledgeLayer> to ensure Object.values returns KnowledgeLayer[] and resolve unknown property errors.
    const allLayers = useMemo<Record<string, KnowledgeLayer>>(() => ({
        ...KNOWLEDGE_LAYERS,
        ...Object.fromEntries(dynamicLayers.map(l => [l.id, l]))
    }), [dynamicLayers]);

    return (
        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-2xl border border-white/10 shadow-inner h-10">
            {/* Fix: Explicitly cast the values array to KnowledgeLayer[] and the Icon to any to resolve JSX element type errors. */}
            {(Object.values(allLayers) as KnowledgeLayer[]).map((layer) => {
                const isActive = activeLayerIds.includes(layer.id);
                // Fix: Cast Icon to any to resolve "Icon cannot be used as a JSX component" in restricted environments.
                const Icon = (Icons as any)[layer.icon as keyof typeof Icons] || Icons.Layers;
                return (
                    <motion.button
                        key={layer.id}
                        onClick={() => {
                            toggleKnowledgeLayer(layer.id);
                            addLog('SYSTEM', `PROTOCOL_ENGAGED: ${layer.label.toUpperCase()}`);
                            audio.playClick();
                        }}
                        whileHover={{ scale: 1.1, y: -1 }}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-500",
                            isActive 
                                ? 'bg-white/10 border-[var(--layer-color)] text-white shadow-[0_0_10px_var(--layer-color)]' 
                                : 'bg-black/20 border-white/5 text-gray-600 hover:text-gray-300 hover:bg-white/5'
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
});

const GlobalStatusBar: React.FC = () => {
    const { 
        kernel, system, collaboration, actions,
        isScrubberOpen, isDiagnosticsOpen, isSidebarOpen
    } = useAppStore();
    const { 
        setScrubberOpen, setDiagnosticsOpen, setCollabState, 
        setSidebarOpen, addLog, toggleTerminal, hydrateAgents 
    } = actions;

    const { execute, state: agentState } = useAgentRuntime();
    const { probeScreen, isProbing } = useVisualCortex();
    const { fps, memory } = usePerformanceMonitor();
    
    const [input, setInput] = useState('');
    const [driveHealth, setDriveHealth] = useState(99.6);
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
        <div className="w-full max-w-[2400px] mx-auto px-8 pt-4 pb-2 pointer-events-auto z-[100] shrink-0 sticky top-[70px]">
            <div className="flex items-center justify-between px-8 py-2.5 bg-[#0a0a0c]/98 backdrop-blur-5xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group glass-refraction h-[72px]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.01)_50%,transparent_75%,transparent)] bg-[size:200%_200%] animate-[shimmer_10s_infinite_linear] pointer-events-none" />
                
                {/* TELEMETRY SECTION (Fixed Widths to prevent flicker jumps) */}
                <div className="flex items-center gap-10 shrink-0 relative z-10 max-w-[40%]">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <div className="flex items-center gap-1.5 text-[6px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none">
                                <Gauge size={8} className="text-[#18E6FF]" />
                                <span>Neural_Load</span>
                            </div>
                            <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div animate={{ width: `${neuralLoad}%` }} className={cn("h-full bg-[#18E6FF]")} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-[70px]">
                            <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none">Integrity</span>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-[#10b981]" />
                                </div>
                                <span className="text-[8px] font-black font-mono text-[#10b981] w-[30px] text-right">{driveHealth.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 border-r border-white/5 pr-6 h-8">
                            <div className="flex flex-col gap-0.5 min-w-[35px]">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none">Optical</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black font-mono text-[#22d3ee]">{fps}</span>
                                    <span className="text-[5px] text-gray-700 font-black uppercase">FPS</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-[45px]">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none">Lattice</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black font-mono text-[#f59e0b]">{memory?.used || 0}</span>
                                    <span className="text-[5px] text-gray-700 font-black uppercase">MB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTRAL COMMAND INPUT */}
                <div className="flex-1 flex items-center px-6 relative z-10 max-w-[30%]">
                    <form onSubmit={handleSubmit} className="w-full relative flex items-center gap-3 bg-black/60 rounded-xl px-4 py-2 border border-white/5 focus-within:border-[#9d4edd]/50 transition-all shadow-inner group/input">
                        <SearchCode size={14} className={cn("shrink-0 transition-all", agentState.isThinking ? 'text-[#9d4edd] animate-pulse' : 'text-gray-700')} />
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={agentState.isThinking}
                            placeholder={agentState.isThinking ? "SYNCING..." : "INITIALIZE..."}
                            className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em]"
                            autoComplete="off"
                        />
                    </form>
                    <div className="flex items-center gap-3 ml-4 shrink-0 min-w-[100px]">
                        <Radio size={12} className="text-[#10b981] animate-pulse" />
                        <span className="text-[7px] font-mono text-[#10b981] font-black tracking-[0.2em] uppercase">Live_Link</span>
                    </div>
                </div>

                {/* ACTION SUITE (Middle Right) */}
                <div className="flex items-center gap-1 px-6 border-x border-white/5 relative z-10 shrink-0">
                    <ActionSquircle 
                        icon={Terminal} 
                        color="#9d4edd" 
                        onClick={() => toggleTerminal()} 
                        isActive={system.isTerminalOpen} 
                        label="Terminal"
                    />
                    <ActionSquircle 
                        icon={Scan} 
                        color="#18E6FF" 
                        onClick={probeScreen} 
                        isActive={isProbing} 
                        label="Oculus Probe"
                    />
                    <ActionSquircle 
                        icon={Bot} 
                        color="#10b981" 
                        onClick={() => {
                            hydrateAgents();
                            addLog('SYSTEM', 'SWARM: Synchronizing active node presence.');
                        }} 
                        label="Refresh Swarm"
                    />
                    <ActionSquircle 
                        icon={RefreshCw} 
                        color="#f1c21b" 
                        onClick={() => {
                            setDriveHealth(99.6);
                            setNeuralLoad(12.4);
                            addLog('SYSTEM', 'LATTICE: Global recalibration sequence active.');
                        }} 
                        label="Sync Hub"
                    />
                    <ActionSquircle 
                        icon={ShieldAlert} 
                        color="#ef4444" 
                        onClick={() => setDiagnosticsOpen(!isDiagnosticsOpen)} 
                        isActive={isDiagnosticsOpen} 
                        label="Diagnostics"
                    />
                    <ActionSquircle 
                        icon={PanelRight} 
                        color="#9d4edd" 
                        onClick={() => setSidebarOpen(!isSidebarOpen)} 
                        isActive={isSidebarOpen} 
                        label="Ops Sidebar"
                    />
                </div>

                {/* IDENTITY & AUDIT (Far Right) */}
                <div className="flex items-center gap-6 pl-6 shrink-0 relative z-10">
                    <div className="flex flex-col items-center gap-0.5 border-r border-white/5 pr-6 min-w-[80px]">
                         <div className="flex items-center gap-1.5 text-[6px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none mb-1">
                            <Fingerprint size={10} className="text-[#9d4edd]" />
                            <span>Auth_Token</span>
                         </div>
                         <span className="text-[9px] font-mono text-gray-400 font-bold tracking-tighter uppercase leading-none">0xFD2..9A</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                setCollabState({ isOverlayOpen: !collaboration.isOverlayOpen });
                                audio.playClick();
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-xl border border-white/5 text-gray-500 hover:text-white transition-all shadow-inner h-10"
                        >
                            <Users size={12} />
                            <span className="text-[9px] font-black font-mono w-[10px]">{peerCount}</span>
                        </button>

                        <LayerControlMesh />

                        <button 
                            onClick={() => {
                                setScrubberOpen(!isScrubberOpen);
                                audio.playClick();
                            }} 
                            className={cn(
                                "p-2.5 rounded-xl border transition-all bg-black/40 border-white/5 text-gray-500 hover:text-white shadow-inner h-10 w-10 flex items-center justify-center", 
                                isScrubberOpen ? "bg-[#9d4edd]/20 border-[#9d4edd] text-white shadow-[0_0_15px_#9d4edd33]" : ""
                            )}
                        >
                            <History size={14} />
                        </button>
                    </div>

                    <div className="text-right pl-4 min-w-[80px]">
                        <div className="text-[6px] text-gray-600 font-mono uppercase tracking-[0.2em] font-black mb-1">Runtime</div>
                        <div className="text-[10px] font-mono font-black text-white tracking-tighter leading-none">{formatUptime(kernel.uptime)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalStatusBar;
