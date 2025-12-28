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
    ChevronRight, Binary, HardDrive, Server, Target, Box,
    Network, Search, Cpu, Database, Brain
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
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ 
                scale: selected ? 1.05 : 1, 
                opacity: 1,
                boxShadow: selected ? `0 0 40px ${accentColor}30` : '0 10px 30px rgba(0,0,0,0.3)',
                borderColor: selected ? accentColor : drift > 50 ? '#ef4444' : 'var(--border-main)'
            }}
            transition={{ type: 'spring', damping: 18, stiffness: 250 }}
            className={`relative rounded-[2rem] border transition-all duration-500 min-w-[280px] overflow-hidden group ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ backgroundColor: 'var(--bg-panel)', backdropFilter: 'blur(32px)' }}
        >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30" />
            
            <Handle type="target" position={Position.Top} className="!bg-[var(--cyan)] !border-none !w-3 !h-3 !shadow-[0_0_10px_var(--cyan)]" />
            <Handle type="source" position={Position.Bottom} className="!bg-[var(--amethyst)] !border-none !w-3 !h-3 !shadow-[0_0_10px_var(--amethyst)]" />
            
            <div className="flex p-6 gap-4">
                <div className="relative shrink-0">
                    <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-1000 shadow-2xl border border-white/10 relative z-10"
                        style={{ backgroundColor: `${drift > 60 ? '#ef4444' : accentColor}15`, color: drift > 60 ? '#ef4444' : accentColor }}
                    >
                        <Icon size={28} className={isDone ? '' : 'animate-pulse'} />
                    </div>
                    <div className="absolute inset-[-15px] blur-2xl opacity-20 rounded-full z-0" style={{ backgroundColor: drift > 60 ? '#ef4444' : accentColor }} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em]">NODE_{id.substring(0, 6)}</span>
                        {isDone ? (
                            <div className="flex items-center gap-1.5 text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/30"><CheckCircle size={10} /><span className="text-[8px] font-black font-mono">LOCKED</span></div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full border border-white/10"><Clock size={10} /><span className="text-[8px] font-black font-mono uppercase tracking-widest">{data.status || 'PENDING'}</span></div>
                        )}
                    </div>
                    <h3 className="text-sm font-black font-mono uppercase tracking-widest text-[var(--text-primary)] truncate drop-shadow-md">{renderSafe(data.label as any)}</h3>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-1 tracking-tight italic opacity-60">"{renderSafe(data.subtext as any)}"</p>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-main)] bg-black/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[7px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Lattice Density</span>
                        <div className="w-16 h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div animate={{ width: `${100 - drift}%` }} className="h-full bg-gradient-to-r from-[var(--amethyst)] to-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!isDone && selected && (
                        <button onClick={handleComplete} className="p-2 bg-[var(--cyan)]/10 hover:bg-[#10b981]/20 border border-[var(--cyan)]/30 rounded-lg text-[var(--cyan)] hover:text-[#10b981] transition-all shadow-xl">
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
    const speed = Math.max(1.2, 8 - (coherence / 12));

    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1.5} stroke="rgba(24, 230, 255, 0.1)" fill="none" markerEnd={markerEnd} />
            <motion.path
                d={edgePath}
                fill="none"
                strokeWidth={3}
                stroke={(edgeData?.color as string) || 'var(--cyan)'}
                strokeDasharray="20, 40"
                animate={{ strokeDashoffset: [-100, 0] }}
                transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
                style={{ filter: `blur(3px) drop-shadow(0 0 12px ${(edgeData?.color as string) || 'var(--cyan)'})`, opacity: 0.5 }}
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
            <div className="h-20 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-[60] flex items-center justify-between px-10 shrink-0 relative transition-colors duration-500">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan)] to-transparent opacity-20" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-xl shadow-[0_0_30px_rgba(123,44,255,0.15)]">
                            <Workflow className="w-6 h-6 text-[var(--amethyst)]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono uppercase tracking-[0.4em] text-[var(--text-primary)] leading-none">Process Logic</h1>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-[0.4em] mt-2 block">Lattice Synthesis // ZENITH_v9.5</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-black/10 p-1 rounded-xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'living_map', icon: Map, label: 'Lattice' },
                            { id: 'architect', icon: DraftingCompass, label: 'Forge' },
                            { id: 'workflow', icon: ListChecks, label: 'Protocols' },
                            { id: 'diagram', icon: Grid3X3, label: 'Graph' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all
                                    ${activeTab === tab.id ? 'bg-[var(--amethyst)] text-white shadow-xl scale-105' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10'}
                                `}
                            >
                                <tab.icon size={14} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={handleAutoOrganize} className="p-3 bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-[var(--cyan)] rounded-xl text-[var(--text-muted)] hover:text-[var(--cyan)] transition-all shadow-xl active:scale-90 group">
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-1000" />
                    </button>
                    <button onClick={handleRunGlobalSequence} className="px-8 py-3 bg-[var(--amethyst)] hover:bg-[#8d3ee0] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-[0_20px_50px_rgba(123,44,255,0.3)] flex items-center gap-4 active:scale-95 group">
                        <Zap size={18} className="fill-current group-hover:scale-125 transition-transform"/> Synthesize Protocol
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-transparent">
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="rgba(24, 230, 255, 0.05)" gap={60} size={1} variant={BackgroundVariant.Lines} className="opacity-40" />
                                <Controls className="bg-[var(--bg-panel)] border border-[var(--border-main)] !rounded-lg overflow-hidden shadow-2xl" />
                                <MiniMap nodeColor={n => (n.data as any).color || '#9d4edd'} className="bg-[var(--bg-panel)] border border-[var(--border-main)] !rounded-xl shadow-3xl" maskColor="rgba(0,0,0,0.4)" />
                            </ReactFlow>
                            
                            {/* Floating Stats Badge */}
                            <div className="absolute top-8 right-8 z-50 flex flex-col gap-4 pointer-events-none">
                                <div className="glass-card px-4 py-3 rounded-xl border border-white/5 shadow-2xl flex items-center gap-4">
                                    <Activity size={14} className="text-[var(--cyan)] animate-pulse" />
                                    <div>
                                        <div className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Coherence index</div>
                                        <div className="text-sm font-black font-mono text-white tracking-tighter">{processData.coherenceScore}%</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col items-center justify-center p-12 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.04)_0%,transparent_85%)] pointer-events-none" />
                            
                            <div className="w-full max-w-4xl space-y-10 relative z-10">
                                <div className="glass-card rounded-[3rem] p-12 shadow-[0_80px_200px_rgba(0,0,0,1)] space-y-10 border border-white/10 brand-inner-glow bg-black/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl border border-[var(--cyan)]/40 text-[var(--cyan)] shadow-[0_0_30px_rgba(24,230,255,0.15)]">
                                                <DraftingCompass size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black font-mono text-[var(--stellar-white)] uppercase tracking-[0.3em] drop-shadow-2xl">Protocol Architect</h2>
                                                <p className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-[0.5em] mt-2">Forge specialized high-fidelity logic topologies</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 p-1 bg-black/30 rounded-xl border border-[var(--border-main)] shadow-inner">
                                            {[
                                                { id: 'DRIVE_ORGANIZATION', icon: HardDrive, label: 'PARA Drive' },
                                                { id: 'SYSTEM_ARCHITECTURE', icon: Server, label: 'System Blueprints' }
                                            ].map(mode => (
                                                <button 
                                                    key={mode.id}
                                                    onClick={() => { setProcessState({ workflowType: mode.id as any }); audio.playClick(); }}
                                                    className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3
                                                        ${processData.workflowType === mode.id ? 'bg-[var(--cyan)] text-black shadow-xl scale-105' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}
                                                    `}
                                                >
                                                    <mode.icon size={14} /> {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="relative group">
                                        <textarea 
                                            value={architecturePrompt} 
                                            onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                            placeholder={`Describe your ${processData.workflowType === 'DRIVE_ORGANIZATION' ? 'High-Fidelity PARA Taxonomy' : 'Scalable Multi-Agent System Architecture'}...`}
                                            className="w-full h-56 bg-black/30 border border-[var(--border-main)] rounded-[2rem] p-8 text-base font-mono text-[var(--stellar-white)] outline-none focus:border-[var(--cyan)]/50 resize-none transition-all placeholder:text-gray-800 shadow-inner group-hover:bg-black/40" 
                                        />
                                        <div className="absolute bottom-6 right-8 flex gap-4 opacity-20 group-focus-within:opacity-80 transition-opacity">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-black rounded-lg border border-white/10 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                                <Binary size={10} /> Model: 0xV_PRO
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleGenerateGraph} 
                                        disabled={isGeneratingGraph || !architecturePrompt.trim()} 
                                        className="w-full bg-[var(--amethyst)] text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.7em] flex items-center justify-center gap-6 shadow-[0_30px_60px_rgba(123,44,255,0.4)] hover:bg-[#8d3ee0] transition-all disabled:opacity-30 active:scale-95 group/forge"
                                    >
                                        {isGeneratingGraph ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} className="group-hover:scale-110 transition-transform" />} 
                                        Forging Structural Manifest
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'workflow' && (
                        <motion.div key="workflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar p-10 flex gap-10">
                            <div className="flex-1 space-y-8">
                                <div className="glass-card rounded-[3rem] p-10 shadow-[0_50px_150px_rgba(0,0,0,1)] transition-colors duration-1000 border border-white/5 brand-inner-glow bg-black/40">
                                    <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-8">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl text-[var(--cyan)] shadow-[0_0_30px_rgba(24, 230, 255, 0.15)]">
                                                <ShieldCheck size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black font-mono text-[var(--stellar-white)] uppercase tracking-[0.5em]">Protocol Execution sequence</h3>
                                                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase mt-1.5 tracking-[0.3em]">High-Fidelity Lattice Authorization</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <Binary size={36} className="text-[var(--text-muted)] opacity-10" />
                                            <div className="text-[9px] font-black text-[#10b981] mt-1 tracking-widest uppercase">Verified Stable</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        {processData.generatedWorkflow?.protocols?.map((p: any, i: number) => (
                                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                                className="p-8 bg-black/20 border border-[var(--border-main)] rounded-[2.5rem] flex items-center justify-between group hover:border-[var(--amethyst)]/50 transition-all hover:bg-black/40 hover:scale-[1.01] shadow-xl"
                                            >
                                                <div className="flex items-center gap-10">
                                                    <div className="w-16 h-16 rounded-2xl bg-black/40 border border-[var(--border-main)] flex items-center justify-center font-mono font-black text-xl text-[var(--amethyst)] group-hover:bg-[var(--amethyst)] group-hover:text-white transition-all shadow-inner group-hover:shadow-[0_0_20px_rgba(123,44,255,0.3)]">
                                                        {String(i + 1).padStart(2, '0')}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-sm font-black text-[var(--stellar-white)] uppercase tracking-widest group-hover:text-[var(--cyan)] transition-colors">{p.instruction}</div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <Target size={12} className="text-[var(--cyan)]" />
                                                                <span className="text-[9px] font-black font-mono text-[var(--cyan)] uppercase tracking-widest">{p.role}</span>
                                                            </div>
                                                            <div className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-30" />
                                                            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase italic tracking-tighter opacity-50">LATTICE_LINK_{p.modelConstraintRef}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleExecuteStep(i)} className="p-4 bg-black/60 hover:bg-[var(--amethyst)]/20 border border-white/5 rounded-2xl text-gray-600 hover:text-[var(--amethyst)] transition-all shadow-2xl active:scale-90 group-hover:border-[var(--amethyst)]/30">
                                                    <ChevronRight size={24} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Analytics */}
                            <div className="w-[360px] flex flex-col gap-10 shrink-0">
                                <div className="glass-card rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group border border-white/5 brand-inner-glow bg-black/40">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity duration-1000 rotate-12"><Brain size={80} className="text-[var(--cyan)]" /></div>
                                    <div className="flex items-center gap-4 mb-8 relative z-10">
                                        <div className="p-2.5 bg-[var(--cyan)]/10 rounded-xl border border-[var(--cyan)]/30 text-[var(--cyan)]">
                                            <BrainCircuit size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-[var(--stellar-white)] uppercase tracking-[0.4em]">Cognitive Buffer</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] font-mono leading-relaxed italic border-l-4 border-[var(--cyan)] pl-6 group-hover:text-[var(--stellar-white)] transition-colors duration-700 relative z-10">
                                        "{processData.generatedWorkflow?.internalPlanningMonologue || 'Lattice ready for high-fidelity protocol execution.'}"
                                    </p>
                                </div>

                                <div className="glass-card rounded-[3rem] p-8 shadow-2xl flex flex-col justify-between h-[300px] border border-white/5 brand-inner-glow bg-black/40 group/status">
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em] flex items-center justify-between group-hover/status:text-[var(--amethyst)] transition-colors">
                                            <span>Lattice Stability</span>
                                            <GitBranch size={18} className="text-[var(--amethyst)] animate-pulse" />
                                        </div>
                                        <div className="text-7xl font-black font-mono text-[var(--stellar-white)] tracking-tighter drop-shadow-3xl selection:bg-[var(--amethyst)]/40">
                                            {processData.coherenceScore || '--'}<span className="text-2xl text-[var(--amethyst)] ml-1 opacity-50">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${processData.coherenceScore || 0}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className="h-full bg-gradient-to-r from-[var(--amethyst)] to-[var(--cyan)] shadow-[0_0_20px_var(--cyan)]" />
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black font-mono text-gray-800 uppercase tracking-widest">Protocol Zenith Active</span>
                                            <div className="flex gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse" />
                                                <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse delay-75" />
                                                <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse delay-150" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'diagram' && (
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-10 bg-transparent">
                            <div className="w-full h-full glass-card rounded-[4rem] overflow-hidden shadow-[0_80px_250px_rgba(0,0,0,1)] border border-white/10 brand-inner-glow bg-black/60 relative">
                                <div className="absolute top-8 left-12 z-20 flex items-center gap-5 pointer-events-none">
                                    <Grid3X3 className="text-[var(--amethyst)]" size={28} />
                                    <span className="text-sm font-black font-mono text-white uppercase tracking-[0.7em]">Spectral Topology Visualizer</span>
                                </div>
                                <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[OS_CORE] --> B[LATTICE_NODE]'} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom HUD */}
            <div className="h-14 bg-black/70 border-t border-[var(--border-main)] px-10 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase shrink-0 backdrop-blur-3xl">
                <div className="flex gap-16 items-center">
                    <span className="flex items-center gap-3 text-[var(--cyan)] font-black tracking-widest group cursor-help">
                        <Activity size={18} className="animate-pulse" /> 
                        <span className="group-hover:text-white transition-colors">SYS_SYNC: NOMINAL_ZENITH</span>
                    </span>
                    <span className="flex items-center gap-3 font-black tracking-widest text-[var(--amethyst)] group cursor-help">
                        <GitBranch size={18} /> 
                        <span className="group-hover:text-white transition-colors">LATTICE: 0xV_ZENITH_ALPHA</span>
                    </span>
                    <span className="flex items-center gap-3 font-black tracking-widest text-[var(--stellar-white)] group cursor-help">
                        <Box size={18} /> 
                        <span className="opacity-50 group-hover:opacity-100 transition-opacity">DOMAIN_SCOPE: {processData.workflowType}</span>
                    </span>
                </div>
                <div className="flex items-center gap-8">
                    <div className="h-4 w-px bg-white/10" />
                    <span className="opacity-30 font-black tracking-[0.4em]">LATTICE_ENGINE v9.5_BUILD_ZENITH</span>
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;