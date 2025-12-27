
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
    ArrowUpRight, AlertTriangle, Fingerprint, Search, FileSignature, Sigma, Table as TableIcon,
    // Fix: Added missing icon imports for MoreVertical and ListChecks
    MoreVertical, ListChecks
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
                scale: selected ? 1.05 : 1, 
                opacity: 1,
                boxShadow: selected ? `0 0 40px ${accentColor}30` : '0 10px 30px rgba(0,0,0,0.2)',
                borderColor: selected ? accentColor : drift > 50 ? '#ef4444' : 'var(--border-main)'
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`relative rounded-3xl border transition-all duration-300 min-w-[300px] overflow-hidden group ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ backgroundColor: 'var(--bg-panel)', backdropFilter: 'blur(20px)' }}
        >
            {/* Glossy Header Highlight */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
            
            <Handle type="target" position={Position.Top} className="!bg-[var(--border-main)] !border-none !w-3 !h-3" />
            <Handle type="source" position={Position.Bottom} className="!bg-[var(--border-main)] !border-none !w-3 !h-3" />
            
            <div className="flex p-5 gap-4">
                {/* Icon Container with Reactive Glow */}
                <div className="relative shrink-0">
                    <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-xl border border-white/5 relative z-10"
                        style={{ backgroundColor: `${drift > 60 ? '#ef4444' : accentColor}15`, color: drift > 60 ? '#ef4444' : accentColor }}
                    >
                        <Icon size={24} className={isDone ? '' : 'animate-pulse'} />
                    </div>
                    <div 
                        className="absolute inset-[-10px] blur-xl opacity-20 rounded-full z-0"
                        style={{ backgroundColor: drift > 60 ? '#ef4444' : accentColor }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-[0.3em]">
                            Node_ID: {id.substring(0, 8)}
                        </span>
                        {isDone ? (
                            <div className="flex items-center gap-1.5 text-[#10b981]">
                                <CheckCircle size={10} />
                                <span className="text-[8px] font-black font-mono">RESOLVED</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                <Clock size={10} />
                                <span className="text-[8px] font-black font-mono uppercase tracking-widest">{data.status || 'PENDING'}</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-sm font-black font-mono uppercase tracking-widest text-[var(--text-primary)] truncate">
                        {renderSafe(data.label as any)}
                    </h3>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5 tracking-tight">
                        {renderSafe(data.subtext as any)}
                    </p>
                </div>
            </div>

            {/* Technical Detail Strip */}
            <div className="px-5 py-3 border-t border-[var(--border-main)] bg-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[6px] text-[var(--text-muted)] font-mono uppercase">Entropy</span>
                        <div className="w-16 h-1 bg-[var(--border-main)] rounded-full overflow-hidden">
                            <motion.div 
                                animate={{ width: `${drift}%` }} 
                                className={`h-full ${drift > 70 ? 'bg-red-500' : 'bg-[#9d4edd]'}`} 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[6px] text-[var(--text-muted)] font-mono uppercase">Stability</span>
                        <span className="text-[9px] font-black font-mono text-[#10b981] leading-none">
                            {100 - drift}%
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!isDone && selected && (
                        <button 
                            onClick={handleComplete} 
                            className="p-1.5 bg-[var(--border-main)] hover:bg-[#10b981]/20 rounded-lg text-[var(--text-muted)] hover:text-[#10b981] transition-all"
                        >
                            <CheckCircle size={14} />
                        </button>
                    )}
                    <button className="p-1.5 bg-[var(--border-main)] hover:bg-white/5 rounded-lg text-[var(--text-muted)] transition-all">
                        <MoreVertical size={14} />
                    </button>
                </div>
            </div>

            {/* Activity Scanline */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30" style={{ '--accent': accentColor } as any} />
        </motion.div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    const coherence = useAppStore(s => s.process.coherenceScore);
    const speed = Math.max(1, 6 - (coherence / 20));

    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1.5} stroke="var(--border-main)" fill="none" markerEnd={markerEnd} />
            <motion.path
                d={edgePath}
                fill="none"
                strokeWidth={3}
                stroke={(edgeData?.color as string) || '#9d4edd'}
                strokeDasharray="20, 30"
                animate={{ strokeDashoffset: [-100, 0] }}
                transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
                style={{ 
                    filter: `drop-shadow(0 0 12px ${(edgeData?.color as string) || '#9d4edd'})`, 
                    opacity: 0.6 
                }}
            />
        </>
    );
};

const ProcessVisualizerContent = () => {
    const { process: processData } = useAppStore();
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
        <div className="h-full w-full bg-[var(--bg-app)] flex flex-col relative overflow-hidden font-sans border border-[var(--border-main)] rounded-[3rem] shadow-2xl transition-colors duration-500">
            
            {/* Header / Command Center */}
            <div className="h-24 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-[60] flex items-center justify-between px-10 shrink-0 relative transition-colors duration-500">
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-2xl shadow-[0_0_30px_rgba(157,78,221,0.2)]">
                            <Workflow className="w-6 h-6 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black font-mono uppercase tracking-[0.4em] text-[var(--text-primary)] leading-none">Process Logic</h1>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-1.5 block">Lattice Synthesis Core // ALPHA</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/5 p-1.5 rounded-2xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'living_map', icon: Map, label: 'Lattice' },
                            { id: 'architect', icon: DraftingCompass, label: 'Forge' },
                            { id: 'workflow', icon: ListChecks, label: 'Protocols' },
                            { id: 'diagram', icon: Grid3X3, label: 'Graph' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all
                                    ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'}
                                `}
                            >
                                <tab.icon size={14} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <button 
                        onClick={handleAutoOrganize} 
                        className="p-3 bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-[#10b981] rounded-2xl text-[var(--text-muted)] hover:text-[#10b981] transition-all shadow-xl active:scale-90"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={handleRunGlobalSequence} 
                        className="px-8 py-3.5 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_15px_40px_rgba(157,78,221,0.3)] flex items-center gap-3 active:scale-95"
                    >
                        <Zap size={18} className="fill-current"/> Synthesize Plan
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-transparent">
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <ReactFlow 
                                nodes={nodes} 
                                edges={edges} 
                                onNodesChange={onNodesChange} 
                                onEdgesChange={onEdgesChange} 
                                onConnect={onConnect} 
                                nodeTypes={nodeTypes} 
                                edgeTypes={edgeTypes} 
                                fitView
                            >
                                <Background 
                                    color="var(--border-main)" 
                                    gap={50} 
                                    size={1.5} 
                                    variant={BackgroundVariant.Dots} 
                                    className="opacity-20"
                                />
                                <Controls className="bg-[var(--bg-panel)] border-[var(--border-main)] fill-[var(--text-primary)]" />
                                <MiniMap 
                                    nodeColor={n => (n.data as any).nodeColor || (n.data as any).color || '#9d4edd'} 
                                    className="bg-[var(--bg-panel)] border-[var(--border-main)]"
                                    maskColor="rgba(0,0,0,0.1)"
                                />
                            </ReactFlow>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div 
                            key="architect" 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -20 }} 
                            className="h-full flex flex-col items-center justify-center p-20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.05)_0%,transparent_70%)] pointer-events-none" />
                            
                            <div className="w-full max-w-3xl space-y-10 relative z-10">
                                <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-[3rem] p-12 shadow-2xl space-y-8 backdrop-blur-3xl transition-colors duration-500">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-2.5 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd]">
                                            <DraftingCompass size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Architect Manifest</h2>
                                            <p className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-[0.4em] mt-1">Specify Structural Requirements</p>
                                        </div>
                                    </div>
                                    
                                    <textarea 
                                        value={architecturePrompt} 
                                        onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                        placeholder="e.g. 'Synthesize a high-fidelity PARA drive taxonomy with multi-modal parsing stages' or 'Forge a cloud architecture blueprint with dedicated data ingestion layers'." 
                                        className="w-full h-48 bg-black/5 border border-[var(--border-main)] rounded-2xl p-8 text-sm font-mono text-[var(--text-primary)] outline-none focus:border-[#9d4edd]/60 resize-none transition-all placeholder:text-[var(--text-muted)] shadow-inner" 
                                    />
                                    
                                    <button 
                                        onClick={handleGenerateGraph} 
                                        disabled={isGeneratingGraph || !architecturePrompt.trim()} 
                                        className="w-full bg-[#9d4edd] text-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-2xl hover:bg-[#b06bf7] transition-all disabled:opacity-30 active:scale-95"
                                    >
                                        {isGeneratingGraph ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} 
                                        Synthesize Topology
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'workflow' && (
                        <motion.div 
                            key="workflow" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="h-full overflow-y-auto custom-scrollbar p-10 flex gap-8"
                        >
                            <div className="flex-1 space-y-8">
                                <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-[2.5rem] p-10 shadow-xl transition-colors duration-500">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 bg-[#10b981]/10 rounded-xl text-[#10b981]">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <span className="text-xs font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.4em]">Protocol Execution sequence</span>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {processData.generatedWorkflow?.protocols?.map((p: any, i: number) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ opacity: 0, x: -15 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="p-6 bg-black/5 border border-[var(--border-main)] rounded-2xl flex items-center justify-between group hover:border-[#9d4edd]/30 transition-all"
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="w-10 h-10 rounded-xl bg-black/10 border border-[var(--border-main)] flex items-center justify-center font-mono font-black text-[#9d4edd] group-hover:bg-[#9d4edd] group-hover:text-black transition-all">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">{p.instruction}</div>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{p.role}</span>
                                                            <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                                                            <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase italic">Ref: {p.modelConstraintRef}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleExecuteStep(i)} className="p-3 hover:bg-[#9d4edd]/20 rounded-xl text-[var(--text-muted)] hover:text-[#9d4edd] transition-all">
                                                    <Play size={16} fill="currentColor" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Info Sidepanel */}
                            <div className="w-80 flex flex-col gap-6 shrink-0">
                                <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                                    <div className="flex items-center gap-3 mb-6">
                                        <BrainCircuit size={18} className="text-[#22d3ee]" />
                                        <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em]">Reasoning Cache</span>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed italic border-l-2 border-[#22d3ee] pl-4">
                                        "{processData.generatedWorkflow?.internalPlanningMonologue || 'Lattice ready for protocol execution. Model first reasoning active.'}"
                                    </p>
                                </div>

                                <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-[2rem] p-8 shadow-xl flex flex-col justify-between h-48">
                                    <div>
                                        <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Coherence Score</div>
                                        <div className="text-4xl font-black font-mono text-[#9d4edd] tracking-tighter">
                                            {processData.coherenceScore || '--'}%
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                                        <motion.div 
                                            animate={{ width: `${processData.coherenceScore || 0}%` }} 
                                            className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee]" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'diagram' && (
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-10 bg-transparent">
                            <div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-[3rem] overflow-hidden shadow-2xl transition-colors duration-500">
                                <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[Core] --> B[Lattice]'} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom HUD Metadata */}
            <div className="h-10 bg-black/20 border-t border-[var(--border-main)] px-10 flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] uppercase shrink-0">
                <div className="flex gap-10">
                    <span className="flex items-center gap-2">
                        <Activity size={12} className="text-[#10b981]" /> OS_PROTOCOL: SECURE
                    </span>
                    <span className="flex items-center gap-2">
                        <GitBranch size={12} className="text-[#9d4edd]" /> BRANCH: main_lattice
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span>LATTICE_SYTHESIS v4.2.1-ZENITH</span>
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;
