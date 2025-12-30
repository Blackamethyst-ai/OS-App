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

const ExecutiveNode = ({ id, data: nodeData, selected, dragging }: NodeProps) => {
    const data = nodeData as any;
    const Icon = (Icons as any)[data.iconName as string] || Icons.Box;
    const accentColor = data.color || '#9d4edd';
    const isDone = data.status === 'DONE' || data.status === 'COMPLETED';
    const drift = data.drift || 0;

    const handleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        const { updateNodeStatus } = (window as any).processLogic;
        if (updateNodeStatus) updateNodeStatus(id, 'COMPLETED');
    };

    return (
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
                scale: selected ? 1.05 : 1, 
                opacity: 1,
                boxShadow: selected ? `0 0 40px ${accentColor}20` : '0 15px 35px rgba(0,0,0,0.5)',
                borderColor: selected ? 'rgba(255,255,255,0.4)' : drift > 60 ? '#ef4444' : 'rgba(255,255,255,0.1)'
            }}
            className={`relative rounded-3xl border crystalline overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ minWidth: '280px' }}
        >
            <Handle type="target" position={Position.Top} className="!bg-[var(--cyan)] !border-none !w-2.5 !h-2.5 !opacity-40" />
            <Handle type="source" position={Position.Bottom} className="!bg-[var(--amethyst)] !border-none !w-2.5 !h-2.5 !opacity-40" />
            
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

            <div className="flex p-6 gap-5 relative z-10">
                <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 glass-action shadow-xl" style={{ color: drift > 60 ? '#ef4444' : accentColor }}>
                        <Icon size={28} className={isDone ? '' : 'animate-pulse'} />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest font-black">NODE_REF_{id.substring(0, 4)}</span>
                        {isDone ? (
                            <div className="flex items-center gap-1 bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/30">
                                <span className="text-[7px] font-black font-mono text-[#10b981] uppercase">Verified</span>
                            </div>
                        ) : (
                            <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest">{data.status || 'STAGING'}</span>
                        )}
                    </div>
                    <h3 className="text-[13px] font-black font-mono uppercase tracking-tight text-white truncate">{renderSafe(data.label as any)}</h3>
                    <p className="text-[10px] text-gray-400 font-mono truncate mt-1 leading-tight italic opacity-60">"{renderSafe(data.subtext as any)}"</p>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between relative z-10">
                <div className="flex flex-col gap-1.5 flex-1 pr-6">
                    <div className="flex justify-between text-[6px] text-gray-600 uppercase font-black tracking-widest">
                        <span>Lattice Integrity</span>
                        <span>{100 - drift}%</span>
                    </div>
                    <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                            animate={{ width: `${100 - drift}%` }} 
                            className="h-full bg-gradient-to-r from-[var(--amethyst)] to-[var(--cyan)]" 
                        />
                    </div>
                </div>
                {selected && !isDone && (
                    <button onClick={handleComplete} className="p-2 glass-action rounded-xl text-[var(--cyan)] hover:text-[#10b981] transition-all active:scale-90">
                        <CheckCircle size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1.5} stroke="rgba(24, 230, 255, 0.08)" fill="none" markerEnd={markerEnd} />
            <motion.path
                d={edgePath}
                fill="none"
                strokeWidth={2}
                stroke={(edgeData?.color as string) || 'var(--cyan)'}
                strokeDasharray="15, 30"
                animate={{ strokeDashoffset: [-100, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{ opacity: 0.3 }}
            />
        </>
    );
};

const ProcessVisualizerContent = () => {
    const { process: processData, actions } = useAppStore();
    const { setProcessState } = actions;
    const logic = useProcessVisualizerLogic();
    const {
        activeTab, onNodesChange, onEdgesChange, onConnect, 
        nodes, edges, setState, handleAutoOrganize,
        architecturePrompt, setArchitecturePrompt,
        handleGenerateGraph, isGeneratingGraph, handleRunGlobalSequence,
        updateNodeStatus, handleExecuteStep
    } = logic;

    const nodeTypes = useMemo(() => ({ holographic: ExecutiveNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);

    useEffect(() => {
        (window as any).processLogic = { updateNodeStatus };
        return () => { delete (window as any).processLogic; };
    }, [updateNodeStatus]);

    return (
        <div className="h-full w-full bg-transparent flex flex-col relative overflow-hidden font-sans border border-[var(--border-main)] rounded-[2.5rem] shadow-2xl transition-colors duration-500">
            <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-[60] flex items-center justify-between px-10 shrink-0 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan)]/40 to-transparent" />
                
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-[var(--amethyst)]/10 border border-[var(--border-main)] rounded-xl">
                            <Workflow className="w-5 h-5 text-[var(--amethyst)]" />
                        </div>
                        <div>
                            <h1 className="text-[13px] font-black font-mono uppercase tracking-[0.3em] text-white leading-none">Process Mapper</h1>
                            <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1 block uppercase">V9.5 - THE D-Ecosystem</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'living_map', icon: Map, label: 'Topology' },
                            { id: 'architect', icon: DraftingCompass, label: 'Logic Lab' },
                            { id: 'workflow', icon: ListChecks, label: 'Implementation' },
                            { id: 'diagram', icon: Grid3X3, label: 'Visual Log' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all
                                    ${activeTab === tab.id ? 'bg-[var(--amethyst)] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-white'}
                                `}
                            >
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleAutoOrganize} className="p-2 bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-[var(--cyan)] rounded-xl text-gray-500 hover:text-[var(--cyan)] transition-all active:scale-90 group">
                        <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                    <button onClick={handleRunGlobalSequence} className="px-6 py-2 bg-[#f1c21b] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 active:scale-95 group">
                        <Zap size={14} className="fill-current"/> Initialize Protocol
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-transparent">
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="rgba(24, 230, 255, 0.04)" gap={40} size={1} variant={BackgroundVariant.Lines} />
                                <Controls className="bg-[var(--bg-panel)] border border-[var(--border-main)] !rounded-lg overflow-hidden shadow-2xl" />
                                <MiniMap nodeColor={n => (n.data as any).color || '#9d4edd'} className="bg-[var(--bg-panel)] border border-[var(--border-main)] !rounded-xl" maskColor="rgba(0,0,0,0.5)" />
                            </ReactFlow>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="h-full flex flex-col items-center justify-center p-12">
                            <div className="w-full max-w-3xl bg-transparent crystalline rounded-[3rem] p-12 border border-white/10 shadow-2xl space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><DraftingCompass size={140} /></div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl border border-[var(--cyan)]/30 text-[var(--cyan)]">
                                        <DraftingCompass size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black font-mono text-white uppercase tracking-[0.2em]">Logic Architect Lab</h2>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-1">Configure high-fidelity system topologies</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5 w-fit relative z-10 shadow-inner">
                                    {[
                                        { id: 'DRIVE_ORGANIZATION', icon: HardDrive, label: 'D-System PARA' },
                                        { id: 'SYSTEM_ARCHITECTURE', icon: Server, label: 'Infrastructure' }
                                    ].map(mode => (
                                        <button 
                                            key={mode.id}
                                            onClick={() => { setProcessState({ workflowType: mode.id as any }); audio.playClick(); }}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                                ${processData.workflowType === mode.id ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'}
                                            `}
                                        >
                                            <mode.icon size={12} /> {mode.label}
                                        </button>
                                    ))}
                                </div>

                                <textarea 
                                    value={architecturePrompt} 
                                    onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                    placeholder={`Define operational parameters for ${processData.workflowType === 'DRIVE_ORGANIZATION' ? 'PARA Data Taxonomy' : 'Production Systems Blueprint'}...`}
                                    className="w-full h-48 bg-black/40 border border-white/10 rounded-[2rem] p-8 text-sm font-mono text-white outline-none focus:border-[var(--cyan)] transition-all placeholder:text-gray-800 shadow-inner relative z-10" 
                                />
                                
                                <button 
                                    onClick={handleGenerateGraph} 
                                    disabled={isGeneratingGraph || !architecturePrompt.trim()} 
                                    className="w-full bg-[#f1c21b] text-black py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.5em] flex items-center justify-center gap-5 shadow-xl hover:bg-yellow-400 transition-all disabled:opacity-30 active:scale-95 relative z-10"
                                >
                                    {isGeneratingGraph ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} 
                                    Synthesize System Manifest
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'workflow' && (
                        <motion.div key="workflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar p-10 flex gap-10">
                            <div className="flex-1 space-y-6">
                                <div className="bg-transparent crystalline rounded-[3rem] p-10 border border-white/10 shadow-xl relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-8">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3 bg-[var(--cyan)]/10 rounded-2xl text-[var(--cyan)] shadow-xl">
                                                <ShieldCheck size={26} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black font-mono text-white uppercase tracking-widest leading-none">Active Protocols</h3>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-3">Verified Sequence // System Auth L0</p>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-[#10b981] px-4 py-1.5 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 uppercase tracking-widest shadow-xl">Stable Release</div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {processData.generatedWorkflow?.protocols?.map((p: any, i: number) => (
                                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                                className="p-6 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-[var(--cyan)]/40 transition-all shadow-md"
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-mono font-black text-sm text-[var(--amethyst)] group-hover:bg-[var(--amethyst)] group-hover:text-black transition-all">
                                                        {String(i + 1).padStart(2, '0')}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[13px] font-black text-white uppercase tracking-tight group-hover:text-[var(--cyan)] transition-colors">{p.instruction}</div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-600 uppercase tracking-widest font-black">
                                                                <Target size={12} className="text-[var(--cyan)]" /> {p.role}
                                                            </div>
                                                            <span className="text-[9px] font-mono text-gray-700 uppercase italic opacity-40">Ref: NODE_{p.modelConstraintRef}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleExecuteStep(i)} className="p-4 glass-action rounded-2xl text-gray-500 hover:text-white transition-all shadow-xl active:scale-90">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="w-[340px] flex flex-col gap-6 shrink-0">
                                <div className="bg-transparent crystalline rounded-[2rem] p-8 border border-white/5 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity rotate-12"><Brain size={80} /></div>
                                    <div className="flex items-center gap-4 mb-8 relative z-10">
                                        <div className="p-2.5 bg-[var(--cyan)]/10 rounded-xl text-[var(--cyan)]">
                                            <BrainCircuit size={20} />
                                        </div>
                                        <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Cognitive Model</span>
                                    </div>
                                    <p className="text-[12px] text-gray-500 font-mono leading-relaxed italic border-l-2 border-[var(--cyan)] pl-6 group-hover:text-gray-300 transition-colors duration-500 relative z-10">
                                        "{processData.generatedWorkflow?.internalPlanningMonologue || 'System awaiting high-fidelity protocol input.'}"
                                    </p>
                                </div>

                                <div className="bg-transparent crystalline rounded-[2.5rem] p-8 border border-white/5 shadow-xl h-64 flex flex-col justify-between group">
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] flex items-center justify-between group-hover:text-[var(--amethyst)] transition-colors">
                                            <span>Consensus Coherence</span>
                                            <GitBranch size={16} className="animate-pulse" />
                                        </div>
                                        <div className="text-6xl font-black font-mono text-white tracking-tighter drop-shadow-2xl">
                                            {processData.coherenceScore || '--'}<span className="text-2xl text-[var(--amethyst)] opacity-50">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5 shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${processData.coherenceScore || 0}%` }} transition={{ duration: 1.5 }} className="h-full rounded-full bg-gradient-to-r from-[var(--amethyst)] to-[var(--cyan)]" />
                                        </div>
                                        <div className="flex justify-between items-center text-[8px] font-black font-mono text-gray-700 uppercase tracking-[0.4em]">
                                            <span>Production Grade Protocol</span>
                                            <div className="flex gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse delay-75" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'diagram' && (
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-10">
                            <div className="w-full h-full bg-black/20 crystalline border border-white/10 rounded-[4rem] overflow-hidden shadow-2xl relative">
                                <div className="absolute top-10 left-12 z-20 flex items-center gap-5 pointer-events-none">
                                    <Grid3X3 className="text-[var(--amethyst)]" size={28} />
                                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.6em]">System Topology Visualizer</span>
                                </div>
                                <MermaidDiagram code={processData.generatedCode || 'graph TD\nCORE[D-System Core] --> NODE[Infrastructure Node]'} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="h-12 bg-black/80 border-t border-[var(--border-main)] px-10 flex items-center justify-between text-[9px] font-mono text-gray-600 uppercase shrink-0 relative z-[60]">
                <div className="flex gap-12 items-center">
                    <span className="flex items-center gap-3 text-[var(--cyan)] font-black tracking-widest">
                        <Activity size={14} className="animate-pulse shadow-[0_0_10px_#18E6FF]" /> SYS_ACK_STABLE
                    </span>
                    <span className="flex items-center gap-3 font-black tracking-widest uppercase">
                        <Binary size={14} className="text-[var(--amethyst)]" /> V9.5 - THE D-Ecosystem
                    </span>
                </div>
                <div className="flex items-center gap-8 shrink-0">
                    <span className="opacity-40 font-black tracking-widest uppercase">V9.5 - THE D-Ecosystem</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-[var(--text-muted)]">THE D-ECOSYSTEM PRODUCTION CORE</span>
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;