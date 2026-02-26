import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { neuralVault } from '../services/persistenceService';
import { KnowledgeLayer, AppMode } from '../types';
import * as Icons from 'lucide-react';
import { Terminal, PanelRight, Gauge, Fingerprint, Users, SearchCode, Radio, Moon, Sun, History as HistoryIcon, Loader2, Save, Sparkles, Activity, Mic } from 'lucide-react';
import { dreamProtocol } from '../services/dreamProtocol';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { useVisualCortex } from '../hooks/useVisualCortex';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useServiceHealth } from '../hooks/useServiceHealth';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import ApiUsageIndicator from './ApiUsageIndicator';





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
        kernel, system, collaboration, voice, actions,
        isScrubberOpen, isDiagnosticsOpen, isSidebarOpen
    } = useAppStore();
    const {
        setScrubberOpen, setDiagnosticsOpen, setCollabState,
        setSidebarOpen, addLog, toggleTerminal, hydrateAgents, setVoiceState
    } = actions;

    const { execute, state: agentState } = useAgentRuntime();
    const { probeScreen, isProbing } = useVisualCortex();
    const { fps, memory } = usePerformanceMonitor();
    const serviceHealth = useServiceHealth();

    const [input, setInput] = useState('');
    const [dreamStatus, setDreamStatus] = useState(dreamProtocol.getStatus());
    const [isSaving, setIsSaving] = useState(false);
    const [latency, setLatency] = useState(12);
    const mode = useAppStore(s => s.mode);

    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(Math.floor(Math.random() * 8 + 12));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleManualSnapshot = async () => {
        setIsSaving(true);
        audio.playClick();
        addLog('SYSTEM', 'SNAPSHOT: Initializing high-priority state persistence...');

        try {
            const store = useAppStore.getState();
            let stateToSave = null;

            // Map current mode to store sector
            switch (mode) {
                case AppMode.PROCESS_MAP: stateToSave = store.process; break;
                case AppMode.CODE_STUDIO: stateToSave = store.codeStudio; break;
                case AppMode.HARDWARE_ENGINEER: stateToSave = store.hardware; break;
                case AppMode.IMAGE_GEN: stateToSave = store.imageGen; break;
                case AppMode.BIBLIOMORPHIC: stateToSave = store.bibliomorphic; break;
                case AppMode.DASHBOARD: stateToSave = store.dashboard; break;
                case AppMode.METAVENTIONS_HUB: stateToSave = store.metaventions; break;
                case AppMode.AUTONOMOUS_FINANCE: stateToSave = store.metaventions; break;
                case AppMode.AGENT_CONTROL: stateToSave = store.agents; break;
                case AppMode.SYNTHESIS_BRIDGE: stateToSave = store.metaventions; break;
                case AppMode.MEMORY_CORE: stateToSave = store.memory; break;
                case AppMode.VOICE_MODE: stateToSave = store.voice; break;
                case AppMode.BICAMERAL: stateToSave = store.bicameral; break;
                default: break;
            }

            if (stateToSave) {
                await neuralVault.createCheckpoint(mode, stateToSave, "Emergency Manual Sync");
                addLog('SUCCESS', 'SNAPSHOT: Local state crystallized to Neural Vault.');
                audio.playSuccess();
            }
        } catch (e) {
            addLog('ERROR', 'SNAPSHOT: Persistence failure.');
            audio.playError();
        } finally {
            setIsSaving(false);
        }
    };

    // Telemetry State
    const [driveHealth, setDriveHealth] = useState(99.6);
    const [neuralLoad, setNeuralLoad] = useState(12.4);

    useEffect(() => {
        const interval = setInterval(() => {
            setDriveHealth(prev => Math.max(98, Math.min(99.9, prev + (Math.random() * 0.1 - 0.05))));
            setNeuralLoad(prev => Math.max(5, Math.min(45, prev + (Math.random() * 4 - 2))));
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    // ---------------------------

    // Update dream status every second
    useEffect(() => {
        const dreamInterval = setInterval(() => {
            setDreamStatus(dreamProtocol.getStatus());
        }, 1000);
        return () => clearInterval(dreamInterval);
    }, []);

    const peerCount = collaboration.peers.length;

    useEffect(() => {
        // Simple interval for mock telemetry simulation if needed, or remove.
        // Keeping stripped down version for now or completely remove if unused.
        // Actually, remove setDriveHealth/NeuralLoad as we removed the state.
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
        <div className="w-full px-2 pt-4 pb-2 pointer-events-auto z-[100] shrink-0 sticky top-[70px]">
            <div className="flex items-center justify-between px-8 py-2.5 bg-[#0a0a0c]/98 backdrop-blur-5xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group glass-refraction h-[72px]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.01)_50%,transparent_75%,transparent)] bg-[size:200%_200%] animate-[shimmer_10s_infinite_linear] pointer-events-none" />

                {/* TELEMETRY SECTION (Fixed Widths to prevent flicker jumps) */}
                {/* TELEMETRY SECTION */}
                <div className="flex items-center gap-6 shrink-0 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1 min-w-[85px]">
                            <div className="flex items-center gap-1.5 text-[6px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none">
                                <Gauge size={8} className="text-[#18E6FF]" />
                                <span>Neural_Load</span>
                            </div>
                            <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div animate={{ width: `${neuralLoad}%` }} className={cn("h-full bg-[#18E6FF]")} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-[90px]">
                            <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none whitespace-nowrap">Integrity</span>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: `${driveHealth}%` }} className="h-full bg-[#10b981]" />
                                </div>
                                <span className="text-[8px] font-black font-mono text-[#10b981] w-[30px] text-right">{driveHealth.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-r border-white/5 pr-4 h-8">
                            <div className="flex flex-col gap-0.5 min-w-[50px]">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none whitespace-nowrap">Optical</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black font-mono text-[#22d3ee]">{fps}</span>
                                    <span className="text-[5px] text-gray-700 font-black uppercase">FPS</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-[55px]">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none whitespace-nowrap">Lattice</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black font-mono text-[#f59e0b]">{memory?.used || 0}</span>
                                    <span className="text-[5px] text-gray-700 font-black uppercase">MB</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-[70px] pl-4 border-l border-white/5">
                                <span className="text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none whitespace-nowrap">Sys_Latency</span>
                                <div className="flex items-center gap-1">
                                    <Activity size={8} className="text-[#22d3ee]" />
                                    <span className="text-[10px] font-black font-mono text-[#22d3ee]">{latency}ms</span>
                                </div>
                            </div>
                        </div>

                        {/* API Usage Indicator */}
                        <ApiUsageIndicator />
                    </div>
                </div>

                {/* CENTRAL COMMAND INPUT */}
                <div className="flex-1 flex items-center px-6 relative z-10 min-w-0">
                    <form onSubmit={handleSubmit} className="w-full relative flex items-center gap-3 bg-black/60 rounded-xl px-4 py-2 border border-white/5 focus-within:border-[#9d4edd]/50 transition-all shadow-inner group/input">
                        <SearchCode size={14} className={cn("shrink-0 transition-all", agentState.isThinking ? 'text-[#9d4edd] animate-pulse' : 'text-gray-700')} />
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={agentState.isThinking}
                            placeholder={agentState.isThinking ? "Processing..." : "Search or command..."}
                            className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em]"
                            autoComplete="off"
                        />
                    </form>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="flex items-center gap-1.5" title={`Agent Core: ${serviceHealth.agentCore}`}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", serviceHealth.agentCore === 'online' ? 'bg-[#10b981]' : serviceHealth.agentCore === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500/60')} />
                            <span className="text-[7px] font-mono text-gray-600 tracking-wider">MCP</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={`Ollama: ${serviceHealth.ollama}`}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", serviceHealth.ollama === 'online' ? 'bg-[#10b981]' : serviceHealth.ollama === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500/60')} />
                            <span className="text-[7px] font-mono text-gray-600 tracking-wider">LLM</span>
                        </div>
                    </div>
                </div>


                {/* ACTION SUITE (Middle Right) */}
                <div className="flex items-center gap-1 px-6 border-x border-white/5 relative z-10 shrink-0">



                    {/* Voice Overlay Toggle */}
                    <button
                        onClick={() => {
                            if (!voice.isActive) {
                                setVoiceState({ isActive: true, isOverlayVisible: true });
                                addLog('SYSTEM', 'VOICE_CORE: Initializing neural handshake...');
                            } else {
                                setVoiceState({ isOverlayVisible: !voice.isOverlayVisible });
                            }
                            audio.playClick();
                        }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all relative overflow-hidden group/voice mr-2",
                            voice.isActive
                                ? voice.isOverlayVisible
                                    ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd] shadow-[0_0_15px_rgba(157,78,221,0.3)]'
                                    : 'bg-[#9d4edd]/10 border-[#9d4edd]/50 text-[#9d4edd]/70'
                                : 'bg-black/40 border-white/10 text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]/50'
                        )}
                        title={voice.isOverlayVisible ? 'Hide voice overlay' : 'Show voice overlay'}
                    >
                        <Mic size={10} className={cn("transition-transform", voice.isActive && "animate-pulse")} />
                        <span className="text-[8px] font-black font-mono uppercase tracking-widest">
                            {voice.isActive ? 'LIVE' : 'VOICE'}
                        </span>
                    </button>

                    {/* Snapshot Button */}
                    <button
                        onClick={handleManualSnapshot}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all relative overflow-hidden group/snap mr-3",
                            isSaving
                                ? 'bg-[#10b981]/20 border-[#10b981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : 'bg-black/40 border-white/10 text-gray-500 hover:text-[#10b981] hover:border-[#10b981]/50'
                        )}
                    >
                        {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} className="group-hover/snap:scale-125 transition-transform" />}
                        <span className="text-[8px] font-black font-mono uppercase tracking-widest">Snapshot</span>
                        {isSaving && <Sparkles size={10} className="animate-pulse absolute right-2" />}
                    </button>

                    {/* Dream Status Pill */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        onClick={() => dreamProtocol.triggerDream()}
                        className={cn(
                            "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border cursor-pointer transition-all duration-500 ml-1",
                            dreamStatus.isDreaming
                                ? "bg-[#9d4edd]/20 border-[#9d4edd]/50 shadow-[0_0_15px_rgba(157,78,221,0.3)]"
                                : "bg-black/60 border-white/10 hover:border-white/20"
                        )}
                    >
                        <motion.div
                            animate={dreamStatus.isDreaming ? {
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0]
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={cn(
                                "p-1 rounded-lg",
                                dreamStatus.isDreaming
                                    ? "bg-[#9d4edd]/30 text-[#9d4edd]"
                                    : "bg-white/5 text-gray-500"
                            )}
                        >
                            {dreamStatus.isDreaming ? <Moon size={12} /> : <Sun size={12} />}
                        </motion.div>
                        <div className="flex flex-col">
                            <span className={cn(
                                "text-[8px] font-black font-mono uppercase tracking-widest leading-none",
                                dreamStatus.isDreaming ? "text-[#9d4edd]" : "text-gray-500"
                            )}>
                                {dreamStatus.isDreaming ? 'DREAMING' : 'AWAKE'}
                            </span>
                            <span className="text-[6px] font-mono text-gray-600 leading-none mt-0.5">
                                {dreamStatus.isDreaming
                                    ? `${dreamStatus.currentSession?.insights.length || 0} insights`
                                    : `Idle: ${Math.floor(dreamStatus.idleTime / 60000)}m ${Math.floor((dreamStatus.idleTime % 60000) / 1000)}s`
                                }
                            </span>
                        </div>
                        {dreamStatus.isDreaming && (
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex gap-0.5"
                            >
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                        className="w-1 h-1 rounded-full bg-[#9d4edd]"
                                    />
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
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
                            <HistoryIcon size={14} />
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
