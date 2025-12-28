import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ReactFlow, Background, Controls, MiniMap, 
    NodeProps, EdgeProps, BackgroundVariant, ReactFlowProvider,
    Handle, Position, getSmoothStepPath, useReactFlow,
    useNodesState, useEdgesState
} from '@xyflow/react';
import { 
    BrainCircuit, Activity, Zap, Workflow, Loader2, Sparkles, 
    CheckCircle, Clock, RefreshCw, DraftingCompass, 
    Layers, Grid3X3, ListChecks, Map, ShieldCheck, GitBranch,
    ChevronRight, Binary, HardDrive, Server, Target, Box
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { useProcessVisualizerLogic, THEME } from '../hooks/useProcessVisualizerLogic';
import { renderSafe } from '../utils/renderSafe';
import MermaidDiagram from './MermaidDiagram';
import { audio } from '../services/audioService';

const HolographicNode = ({ id, data: nodeData, selected, dragging }: NodeProps) => {
    const data = nodeData as any;
    const Icon = (Icons as any)[data.iconName as string] || Icons.Box;
    const accentColor = data.color || '#9d4edd';
    const isDone = data.status === 'DONE' || data.status === 'COMPLETED' || data.status === 'SYNTHESIZED';
    const drift = data.drift || 0;

    const handleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        const { updateNodeStatus } = (window as any).processLogic;
        if (updateNodeStatus) updateNodeStatus(id, 'COMPLETED');
    };

    return (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
                scale: selected ? 1.05 : 1, 
                opacity: 1,
                boxShadow: selected ? `0 0 50px ${accentColor}40` : '0 10px 30px rgba(0,0,0,0.3)',
                borderColor: selected ? accentColor : drift > 50 ? '#ef4444' : 'var(--border-main)'
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`relative rounded-3xl border transition-all duration-300 min-w-[320px] overflow-hidden group ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ backgroundColor: 'var(--bg-panel)', backdropFilter: 'blur(24px)' }}
        >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
            
            <Handle type="target" position={Position.Top} className="!bg-[var(--border-main)] !border-none !w-3 !h-3" />
            <Handle type="source" position={Position.Bottom} className="!bg-[var(--border-main)] !border-none !w-3 !h-3" />
            
            <div className="flex p-6 gap-5">
                <div className="relative shrink-0">
                    <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl border border-white/5 relative z-10"
                        style={{ backgroundColor: `${drift > 60 ? '#ef4444' : accentColor}20`, color: drift > 60 ? '#ef4444' : accentColor }}
                    >
                        <Icon size={28} className={isDone ? '' : 'animate-pulse'} />
                    </div>
                    <div className="absolute inset-[-15px] blur-2xl opacity-20 rounded-full z-0" style={{ backgroundColor: drift > 60 ? '#ef4444' : accentColor }} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em]">NODE_{id.substring(0, 6)}</span>
                        {isDone ? (
                            <div className="flex items-center gap-1.5 text-[#10b981]"><CheckCircle size={10} /><span className="text-[9px] font-black font-mono">LOCKED</span></div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[var(--text-muted)]"><Clock size={10} /><span className="text-[9px] font-black font-mono uppercase tracking-widest">{data.status || 'PENDING'}</span></div>
                        )}
                    </div>
                    <h3 className="text-base font-black font-mono uppercase tracking-widest text-[var(--text-primary)] truncate">{renderSafe(data.label as any)}</h3>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-1 tracking-tight">{renderSafe(data.subtext as any)}</p>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-main)] bg-black/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[7px] text-[var(--text-muted)] font-mono uppercase">Lattice Density</span>
                        <div className="w-20 h-1 bg-[var(--border-main)] rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${100 - drift}%` }} className="h-full bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!isDone && selected && (
                        <button onClick={handleComplete} className="p-2 bg-[var(--border-main)] hover:bg-[#10b981]/20 rounded-xl text-[var(--text-muted)] hover:text-[#10b981] transition-all">
                            <CheckCircle size={16} />
                        </button>
                    )}
                </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" style={{ '--accent': accentColor } as any} />
        </motion.div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    const coherence = useAppStore(s => s.process.coherenceScore);
    const speed = Math.max(1.5, 7 - (coherence / 15));

    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1.5} stroke="var(--border-main)" fill="none" markerEnd={markerEnd} />
            <motion.path
                d={edgePath}
                fill="none"
                strokeWidth={4}
                stroke={(edgeData?.color as string) || '#9d4edd'}
                strokeDasharray="20, 40"
                animate={{ strokeDashoffset: [-100, 0] }}
                transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
                style={{ filter: `blur(4px) drop-shadow(0 0 15px ${(edgeData?.color as string) || '#9d4edd'})`, opacity: 0.5 }}
            />
        </>
    );
};

const ProcessVisualizerContent = () => {
    const { process: processData, setProcessState } = useAppStore();
    const logic = useProcessVisualizerLogic();
    const {
        activeTab, onNodesChange, onEdgesChange, onConnect, 
        nodes, edges, setState, handleAutoOrganize,
        architecturePrompt, setArchitecturePrompt,
        handleGenerateGraph, isGeneratingGraph, handleRunGlobalSequence,
        updateNodeStatus, handleExecuteStep
    } = logic;

    const nodeTypes = useMemo(() => ({ holographic: HolographicNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);

    useEffect(() => {
        (window as any).processLogic = { updateNodeStatus };
        return () => { delete (window as any).processLogic; };
    }, [updateNodeStatus]);

    return (
        <div className="h-full w-full bg-[var(--bg-app)] flex flex-col relative overflow-hidden font-sans border border-[var(--border-main)] rounded-[3rem] shadow-2xl transition-colors duration-500 brand-inner-glow">
            
            {/* Sector Header */}
            <div className="h-24 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-[60] flex items-center justify-between px-12 shrink-0 relative transition-colors duration-500">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan)] to-transparent opacity-20" />
                
                <div className="flex items-center gap-14">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/30 rounded-2xl shadow-[0_0_40px_rgba(123,44,255,0.2)]">
                            <Workflow className="w-7 h-7 text-[var(--amethyst)]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black font-mono uppercase tracking-[0.5em] text-[var(--text-primary)] leading-none">Process Logic</h1>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-[0.4em] mt-2 block">Lattice Synthesis // ZENITH_v9</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-black/10 p-1.5 rounded-2xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'living_map', icon: Map, label: 'Lattice' },
                            { id: 'architect', icon: DraftingCompass, label: 'Forge' },
                            { id: 'workflow', icon: ListChecks, label: 'Protocols' },
                            { id: 'diagram', icon: Grid3X3, label: 'Graph' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all
                                    ${activeTab === tab.id ? 'bg-[var(--amethyst)] text-white shadow-2xl scale-105' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'}
                                `}
                            >
                                <tab.icon size={16} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={handleAutoOrganize} className="p-3.5 bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-[var(--cyan)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--cyan)] transition-all shadow-xl active:scale-90">
                        <RefreshCw size={22} />
                    </button>
                    <button onClick={handleRunGlobalSequence} className="px-10 py-4 bg-[var(--amethyst)] hover:bg-[#8d3ee0] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] transition-all shadow-[0_20px_50px_rgba(123,44,255,0.3)] flex items-center gap-4 active:scale-95 group">
                        <Zap size={20} className="fill-current group-hover:scale-125 transition-transform"/> Synthesize Protocol
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-transparent">
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="var(--border-main)" gap={50} size={1.5} variant={BackgroundVariant.Dots} className="opacity-30" />
                                <Controls className="bg-[var(--bg-panel)] border-[var(--border-main)] fill-[var(--text-primary)]" />
                                <MiniMap nodeColor={n => (n.data as any).color || '#9d4edd'} className="bg-[var(--bg-panel)] border-[var(--border-main)]" maskColor="rgba(0,0,0,0.2)" />
                            </ReactFlow>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col items-center justify-center p-20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                            
                            <div className="w-full max-w-4xl space-y-12 relative z-10">
                                <div className="glass-card rounded-[4rem] p-16 shadow-[0_80px_200px_rgba(0,0,0,1)] space-y-10 border border-white/5 brand-inner-glow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl border border-[var(--cyan)]/40 text-[var(--cyan)]">
                                                <DraftingCompass size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black font-mono text-[var(--stellar-white)] uppercase tracking-widest">Protocol Architect</h2>
                                                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-[0.5em] mt-2">Forge specialized logic topologies</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 p-1.5 bg-black/20 rounded-2xl border border-[var(--border-main)]">
                                            {[
                                                { id: 'DRIVE_ORGANIZATION', icon: HardDrive, label: 'Drive' },
                                                { id: 'SYSTEM_ARCHITECTURE', icon: Server, label: 'Arch' }
                                            ].map(mode => (
                                                <button 
                                                    key={mode.id}
                                                    onClick={() => { setProcessState({ workflowType: mode.id as any }); audio.playClick(); }}
                                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5
                                                        ${processData.workflowType === mode.id ? 'bg-[var(--cyan)] text-black' : 'text-[var(--text-muted)] hover:text-white'}
                                                    `}
                                                >
                                                    <mode.icon size={14} /> {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <textarea 
                                        value={architecturePrompt} 
                                        onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                        placeholder={`Describe your ${processData.workflowType === 'DRIVE_ORGANIZATION' ? 'Drive Taxonomy' : 'System Blueprint'}...`}
                                        className="w-full h-56 bg-black/20 border border-[var(--border-main)] rounded-[2.5rem] p-10 text-base font-mono text-[var(--stellar-white)] outline-none focus:border-[var(--cyan)]/60 resize-none transition-all placeholder:text-[var(--text-muted)] shadow-inner" 
                                    />
                                    
                                    <button 
                                        onClick={handleGenerateGraph} 
                                        disabled={isGeneratingGraph || !architecturePrompt.trim()} 
                                        className="w-full bg-[var(--amethyst)] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.6em] flex items-center justify-center gap-6 shadow-[0_30px_70px_rgba(123,44,255,0.4)] hover:bg-[#8d3ee0] transition-all disabled:opacity-30 active:scale-95"
                                    >
                                        {isGeneratingGraph ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />} 
                                        Forging Structural Manifest
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'workflow' && (
                        <motion.div key="workflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar p-12 flex gap-10">
                            <div className="flex-1 space-y-10">
                                <div className="glass-card rounded-[3.5rem] p-12 shadow-2xl transition-colors duration-500 border-white/5 brand-inner-glow">
                                    <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl text-[var(--cyan)]">
                                                <ShieldCheck size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black font-mono text-[var(--stellar-white)] uppercase tracking-[0.5em]">Protocol Execution sequence</h3>
                                                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase mt-1 tracking-widest">Coherence index: {processData.coherenceScore}%</p>
                                            </div>
                                        </div>
                                        <Binary size={32} className="text-[var(--text-muted)] opacity-20" />
                                    </div>
                                    
                                    <div className="space-y-6">
                                        {processData.generatedWorkflow?.protocols?.map((p: any, i: number) => (
                                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                                className="p-8 bg-black/10 border border-[var(--border-main)] rounded-3xl flex items-center justify-between group hover:border-[var(--amethyst)]/40 transition-all hover:bg-black/20"
                                            >
                                                <div className="flex items-center gap-8">
                                                    <div className="w-14 h-14 rounded-2xl bg-black/20 border border-[var(--border-main)] flex items-center justify-center font-mono font-black text-xl text-[var(--amethyst)] group-hover:bg-[var(--amethyst)] group-hover:text-white transition-all shadow-inner">
                                                        {String(i + 1).padStart(2, '0')}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-[var(--stellar-white)] uppercase tracking-widest">{p.instruction}</div>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <span className="text-[10px] font-black font-mono text-[var(--cyan)] uppercase tracking-widest">{p.role}</span>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                                                            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase italic">LATTICE_LINK_{p.modelConstraintRef}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleExecuteStep(i)} className="p-4 bg-black/40 hover:bg-[var(--amethyst)]/20 rounded-2xl text-[var(--text-muted)] hover:text-[var(--amethyst)] transition-all shadow-xl active:scale-90 border border-white/5">
                                                    <ChevronRight size={24} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Analytics */}
                            <div className="w-[380px] flex flex-col gap-8 shrink-0">
                                <div className="glass-card rounded-[3rem] p-10 shadow-xl relative overflow-hidden group border-white/5 brand-inner-glow">
                                    <div className="flex items-center gap-4 mb-8">
                                        <BrainCircuit size={24} className="text-[var(--cyan)]" />
                                        <span className="text-[11px] font-black text-[var(--stellar-white)] uppercase tracking-[0.5em]">Cognitive Buffer</span>
                                    </div>
                                    <p className="text-[13px] text-[var(--text-muted)] font-mono leading-relaxed italic border-l-4 border-[var(--cyan)] pl-6 group-hover:text-[var(--stellar-white)] transition-colors">
                                        "{processData.generatedWorkflow?.internalPlanningMonologue || 'Lattice ready for high-fidelity protocol execution.'}"
                                    </p>
                                </div>

                                <div className="glass-card rounded-[3rem] p-10 shadow-xl flex flex-col justify-between h-64 border-white/5 brand-inner-glow">
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center justify-between">
                                            <span>Lattice Stability</span>
                                            <Target size={14} className="text-[var(--amethyst)]" />
                                        </div>
                                        <div className="text-6xl font-black font-mono text-[var(--stellar-white)] tracking-tighter shadow-sm">
                                            {processData.coherenceScore || '--'}<span className="text-2xl text-[var(--amethyst)]">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden border border-white/5">
                                            <motion.div animate={{ width: `${processData.coherenceScore || 0}%` }} className="h-full bg-gradient-to-r from-[var(--amethyst)] to-[var(--cyan)] shadow-[0_0_20px_var(--cyan)]" />
                                        </div>
                                        <div className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-widest">Protocol Zenith Active</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'diagram' && (
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-12 bg-transparent">
                            <div className="w-full h-full glass-card rounded-[4rem] overflow-hidden shadow-[0_80px_200px_rgba(0,0,0,1)] border-white/5 brand-inner-glow">
                                <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[OS_CORE] --> B[LATTICE_NODE]'} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom HUD */}
            <div className="h-12 bg-black/40 border-t border-[var(--border-main)] px-12 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase shrink-0">
                <div className="flex gap-14 items-center">
                    <span className="flex items-center gap-3 text-[var(--cyan)] font-black">
                        <Activity size={16} /> SYS_SYNC: NOMINAL
                    </span>
                    <span className="flex items-center gap-3 font-black">
                        <GitBranch size={16} className="text-[var(--amethyst)]" /> BRANCH: zenith_alpha
                    </span>
                    <span className="flex items-center gap-3 font-black">
                        <Box size={16} className="text-[var(--stellar-white)]" /> DOMAIN: {processData.workflowType}
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="opacity-40">LATTICE_ENGINE v9.5-ZENITH</span>
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;