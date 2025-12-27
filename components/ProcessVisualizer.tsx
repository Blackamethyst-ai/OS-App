
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ReactFlow, Background, Controls, MiniMap, 
    NodeProps, EdgeProps, BackgroundVariant, ReactFlowProvider,
    Handle, Position, getSmoothStepPath, useReactFlow
} from '@xyflow/react';
import { 
    BrainCircuit, X, Activity, Database, Zap, Wrench, 
    Grid3X3, Map, Play, CheckCircle, RefreshCw,
    DraftingCompass, Server, Layers, Workflow, Loader2, Code,
    ShieldCheck, Sparkles, FileText, Upload, Eye, FileUp, Info,
    Boxes, Package, Scan, Trash2, Globe, Cpu, ChevronRight, Terminal, RotateCcw, Box,
    FolderTree, Folder, HardDrive, Share2, Target, GitBranch, GitCommit, Layout, Hammer, Network, Shield,
    Merge, FolderOpen, List, ChevronDown, Binary, Radio, FileJson, Clock, Lock, Download,
    SearchCode, BarChart4, Cloud, Image as ImageIcon, CheckCircle2, FileTerminal, FileCode,
    ArrowUpRight, AlertTriangle, Fingerprint, Search, FileSignature, Sigma, Table as TableIcon
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { useProcessVisualizerLogic, THEME } from '../hooks/useProcessVisualizerLogic';
import { renderSafe } from '../utils/renderSafe';
import MermaidDiagram from './MermaidDiagram';
import NexusAPIExplorer from './NexusAPIExplorer';
import { audio } from '../services/audioService';
import { promptSelectKey, generateDriveShellScript } from '../services/geminiService';
import { AppMode } from '../types';

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
            initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
            animate={{ 
                scale: selected ? 1.08 : 1, 
                opacity: 1,
                filter: 'blur(0px)',
                boxShadow: selected ? `0 0 50px ${accentColor}50` : '0 10px 30px rgba(0,0,0,0.5)',
                borderColor: selected ? accentColor : drift > 50 ? '#ef4444' : 'rgba(255,255,255,0.05)'
            }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className={`relative px-6 py-5 rounded-[2rem] border transition-all duration-300 min-w-[280px] backdrop-blur-3xl group ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${drift > 70 ? 'animate-pulse border-red-500' : ''}`} 
            style={{ backgroundColor: 'rgba(5,5,5,0.95)' }}
        >
            {drift > 40 && (
                <div className="absolute -inset-1 rounded-[2rem] bg-red-500/5 blur-md pointer-events-none opacity-40" />
            )}
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            
            <Handle type="target" position={Position.Top} className="!bg-[#333] !border-none !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-[#333] !border-none !w-2 !h-2" />
            
            <div className="flex justify-between items-start mb-5">
                <div className="p-3 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl group-hover:scale-110 group-hover:rotate-6" style={{ backgroundColor: `${drift > 60 ? '#ef4444' : accentColor}15`, border: `1px solid ${drift > 60 ? '#ef4444' : accentColor}40`, color: drift > 60 ? '#ef4444' : accentColor }}>
                    <Icon size={22} />
                </div>
                <div className="flex gap-2.5">
                    {isDone ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle className="text-emerald-400 w-5 h-5 shadow-[0_0_15px_#10b981]" /></motion.div>
                    ) : (
                        selected && (
                            <button onClick={handleComplete} className="p-1.5 hover:bg-[#10b981]/20 rounded-lg transition-colors text-gray-600 hover:text-[#10b981]">
                                <CheckCircle size={16} />
                            </button>
                        )
                    )}
                </div>
            </div>
            
            <div className="mb-5 px-1">
                <div className="text-[14px] font-black font-mono uppercase tracking-[0.2em] text-white truncate leading-none mb-2">{renderSafe(data.label as any)}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 h-4 truncate">{renderSafe(data.subtext as any)}</div>
            </div>
        </motion.div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    const coherence = useAppStore(s => s.process.coherenceScore);
    const speed = Math.max(0.5, 4 - (coherence / 30));

    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1} stroke="#1f1f1f" markerEnd={markerEnd} />
            <motion.path
                d={edgePath}
                fill="none"
                strokeWidth={2.5}
                stroke={(edgeData?.color as string) || '#9d4edd'}
                strokeDasharray="15, 25"
                animate={{ strokeDashoffset: [-80, 0] }}
                transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
                style={{ filter: `drop-shadow(0 0 8px ${(edgeData?.color as string) || '#9d4edd'})`, opacity: 0.8 }}
            />
        </>
    );
};

const FormalModelViewer = ({ model }: { model: any }) => {
    if (!model) return null;
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-10 bg-[#0a0a0a] border border-[#9d4edd]/30 rounded-[3rem] space-y-10 shadow-2xl relative overflow-hidden group/mfr">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover/mfr:opacity-[0.08] transition-all rotate-12"><Shield size={120} /></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/30">
                        <ShieldCheck size={20} className="text-[#9d4edd]" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black font-mono text-white uppercase tracking-[0.4em]">Explicit Problem Model (MFR)</h3>
                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1">Sovereign Reasoning Layer // L0</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[#10b981] text-[8px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={10} /> Model_Verified
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <Radio size={12} className="text-[#9d4edd]" /> Initial State
                    </div>
                    <div className="p-6 bg-black border border-white/5 rounded-2xl text-[11px] font-mono text-gray-400 italic leading-relaxed h-32 overflow-y-auto custom-scrollbar">
                        "{model.worldState || model.startingState || "Implicit environment initialized."}"
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <Layers size={12} className="text-[#22d3ee]" /> Logic Entities
                    </div>
                    <div className="flex flex-wrap gap-2 h-32 content-start overflow-y-auto custom-scrollbar">
                        {(model.entities || []).map((e: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-[#22d3ee]/5 border border-[#22d3ee]/20 rounded-lg text-[9px] font-mono text-[#22d3ee] uppercase tracking-tighter shadow-sm hover:border-[#22d3ee]/40 transition-all">{e}</span>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <AlertTriangle size={12} className="text-[#ef4444]" /> Constraints
                    </div>
                    <div className="space-y-2 h-32 overflow-y-auto custom-scrollbar">
                        {(model.constraints || []).map((c: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-2 bg-red-950/10 border border-red-500/20 rounded-xl text-[10px] font-mono text-red-300/80 leading-snug">
                                <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                                <span className="uppercase tracking-tighter">{c}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {model.actions && (
                <div className="pt-6 border-t border-white/5">
                    <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <GitBranch size={12}/> Transition Schema (Actions)
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        {model.actions.slice(0, 4).map((a: any, i: number) => (
                            <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/act hover:bg-white/[0.04] transition-all">
                                <div className="text-[10px] font-black text-white uppercase mb-2 truncate">{a.name}</div>
                                <div className="text-[8px] font-mono text-gray-500 leading-relaxed line-clamp-2 italic">Pre: {a.precondition}</div>
                                <div className="text-[8px] font-mono text-emerald-500/70 mt-1 leading-relaxed line-clamp-1 italic">Eff: {a.effect}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const ProcessVisualizerContent = () => {
    const { addLog, setMode, process: processData } = useAppStore();
    const logic = useProcessVisualizerLogic();
    const {
        activeTab, onNodesChange, onEdgesChange, onConnect, 
        nodes, edges, setState, handleAutoOrganize,
        architecturePrompt, setArchitecturePrompt,
        handleGenerateGraph, isGeneratingGraph, handleRunGlobalSequence,
        updateNodeStatus, handleExecuteStep, handleResetSimulation,
        handleGenerateIaC, handleSourceUpload, removeSource, viewSourceAnalysis,
        handleSynthesizeFromVault, isSynthesizingVault
    } = logic;

    const nodeTypes = useMemo(() => ({ holographic: HolographicNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);

    useEffect(() => {
        (window as any).processLogic = { updateNodeStatus };
        return () => { delete (window as any).processLogic; };
    }, [updateNodeStatus]);

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-[3.5rem] shadow-[0_0_150px_rgba(0,0,0,1)] group/pv">
            
            {/* Extended Sector Header */}
            <div className="h-24 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-3xl z-[60] flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-[0_0_25px_rgba(157,78,221,0.2)]">
                            <BrainCircuit className="w-6 h-6 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black font-mono uppercase tracking-[0.5em] text-white leading-none mb-2">Process Logic</h1>
                            <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest block">MFR Formal Synthesis // v9.1-ALPHA</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/60 p-2 rounded-2xl border border-white/5 shadow-inner">
                        {[
                            { id: 'living_map', icon: Map, label: 'Lattice' },
                            { id: 'architect', icon: DraftingCompass, label: 'Architect' },
                            { id: 'workflow', icon: Workflow, label: 'Loom' },
                            { id: 'diagram', icon: Grid3X3, label: 'Topology' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all whitespace-nowrap
                                    ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/30' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}
                                `}
                            >
                                <tab.icon size={16} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={handleAutoOrganize} className="p-3.5 bg-white/5 border border-white/10 hover:border-[#10b981] rounded-2xl text-gray-600 transition-all active:scale-90" title="Autopoietic Organization">
                        <RefreshCw size={22} />
                    </button>
                    <button onClick={handleRunGlobalSequence} className="px-8 py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(157,78,221,0.4)] flex items-center gap-4 active:scale-95">
                        <Zap size={20} className="fill-current"/> Forge Plan
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#020202] z-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="#111" gap={60} size={1.5} variant={BackgroundVariant.Dots} style={{ opacity: 0.3 }} />
                                <Controls />
                                <MiniMap />
                            </ReactFlow>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full flex flex-col items-center justify-start p-20 bg-black overflow-y-auto custom-scrollbar relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(157,78,221,0.08)_0%,transparent_70%)] pointer-events-none" />
                            <div className="w-full max-w-[1400px] space-y-16 relative z-10">
                                <div className="bg-[#080808]/95 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-16 shadow-[0_100px_200px_rgba(0,0,0,1)] flex flex-col gap-12">
                                    <div className="flex flex-col gap-6">
                                        <label className="text-[12px] font-black text-[#9d4edd] uppercase tracking-[0.6em] flex items-center gap-4">
                                            <Binary size={18} /> Formal Directive Input
                                        </label>
                                        <textarea 
                                            value={architecturePrompt} 
                                            onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                            placeholder="Specify drive organization or system architecture requirements. MFR Engine will construct an explicit model before planning." 
                                            className="w-full h-40 bg-black border border-white/5 rounded-[2rem] p-10 text-lg font-mono text-gray-300 outline-none focus:border-[#9d4edd]/60 resize-none transition-all placeholder:text-gray-800 shadow-inner" 
                                        />
                                    </div>
                                    <button onClick={handleGenerateGraph} disabled={isGeneratingGraph || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-8 rounded-[3rem] font-black text-sm uppercase tracking-[0.5em] flex items-center justify-center gap-6 shadow-2xl hover:bg-[#b06bf7] transition-all disabled:opacity-30 active:scale-95">
                                        {isGeneratingGraph ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />} 
                                        Execute MFR Synthesis
                                    </button>
                                </div>

                                {processData.generatedWorkflow?.formalModel && (
                                    <FormalModelViewer model={processData.generatedWorkflow.formalModel} />
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'workflow' && (
                        <motion.div key="workflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar p-16 flex gap-12">
                            <div className="flex-1 space-y-12">
                                {processData.generatedWorkflow?.formalModel && (
                                    <div className="bg-[#0a1a0a] border border-[#10b981]/30 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
                                        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-6 transition-transform"><CheckCircle2 size={100} className="text-[#10b981]" /></div>
                                        <div className="flex items-center gap-4 mb-6 relative z-10">
                                            <div className="p-2 bg-[#10b981]/20 rounded-xl">
                                                <ShieldCheck size={24} className="text-[#10b981]" />
                                            </div>
                                            <span className="text-[12px] font-black font-mono text-[#10b981] uppercase tracking-[0.4em]">Reasoning Overlay // Constraints Verified</span>
                                        </div>
                                        <p className="text-sm font-mono text-gray-300 italic leading-relaxed border-l-4 border-[#10b981] pl-8 relative z-10">
                                            "{processData.generatedWorkflow.internalPlanningMonologue}"
                                        </p>
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <div className="flex items-center gap-3">
                                            <GitCommit size={14} className="text-[#9d4edd]" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operational Sequence Protocols</span>
                                        </div>
                                        {processData.coherenceScore && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Coherence Index</span>
                                                <span className="text-xs font-black font-mono text-[#9d4edd]">{processData.coherenceScore}%</span>
                                            </div>
                                        )}
                                    </div>
                                    {processData.generatedWorkflow?.protocols?.map((p: any, i: number) => (
                                        <motion.div 
                                            key={i} 
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl flex items-center justify-between group hover:border-[#9d4edd]/30 hover:bg-[#0d0d0d] transition-all shadow-xl"
                                        >
                                            <div className="flex items-center gap-8">
                                                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center font-mono font-black text-2xl text-[#9d4edd] group-hover:bg-[#9d4edd]/10 transition-colors">{i+1}</div>
                                                <div>
                                                    <div className="text-sm font-bold text-white uppercase font-mono tracking-tight group-hover:text-[#9d4edd] transition-colors">{p.instruction}</div>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <div className="px-3 py-1 rounded-full bg-black border border-white/10 text-[9px] font-mono text-gray-500 uppercase font-black tracking-widest">{p.role}</div>
                                                        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-700 uppercase">
                                                            <Target size={10} /> {p.modelConstraintRef}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleExecuteStep(i)} className="p-4 bg-white/5 hover:bg-[#9d4edd] text-gray-500 hover:text-black rounded-2xl transition-all shadow-xl active:scale-90">
                                                <Play size={20} className="fill-current"/>
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Sidepanel: Retrieved Information Stack (RAG-Anything Style) */}
                            <div className="w-80 flex flex-col gap-6 shrink-0">
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                        <Boxes size={18} className="text-[#22d3ee] animate-pulse" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Retrieved Info</span>
                                    </div>
                                    <div className="flex flex-col-reverse gap-2 max-h-[400px] overflow-y-auto custom-scrollbar px-2 pb-2">
                                        {[...Array(6)].map((_, i) => (
                                            <motion.div 
                                                key={i}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 - (i * 0.1) }}
                                                transition={{ delay: i * 0.1 }}
                                                className="h-10 bg-[#111] border border-white/5 rounded-lg flex items-center px-4 gap-3 group/box hover:bg-[#22d3ee]/10 hover:border-[#22d3ee]/30 transition-all cursor-pointer"
                                            >
                                                <div className="w-2 h-2 rounded-sm bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] group-hover/box:scale-110 transition-transform" />
                                                <div className="text-[8px] font-mono text-gray-500 group-hover/box:text-white uppercase tracking-tighter truncate">
                                                    FRAG_L0_NODE_{42 - i} // PARSED
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                                        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest leading-relaxed">
                                            Grounding data stacked via Hybrid Retrieval Bridge.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between h-64 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12"><Activity size={100} /></div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4">Lattice Status</div>
                                        <div className="text-3xl font-black font-mono text-[#10b981] tracking-tighter">SECURED</div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div animate={{ width: '92%' }} className="h-full bg-[#10b981]" />
                                        </div>
                                        <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                            <span>mTLS Bridge</span>
                                            <span>92%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'diagram' && (
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-20 bg-[#020202]">
                            <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[Core] --> B[Lattice]'} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;
