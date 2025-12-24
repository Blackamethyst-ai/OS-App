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
    FolderTree, Folder, HardDrive, Share2, Target, GitBranch, Layout, Hammer, Network, Shield,
    Merge, FolderOpen, List, ChevronDown, Binary, Radio
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { useProcessVisualizerLogic, THEME } from '../hooks/useProcessVisualizerLogic';
import { renderSafe } from '../utils/renderSafe';
import MermaidDiagram from './MermaidDiagram';
import NexusAPIExplorer from './NexusAPIExplorer';
import { audio } from '../services/audioService';

const HolographicNode = ({ id, data: nodeData, selected, dragging }: NodeProps) => {
    const data = nodeData as any;
    const Icon = (Icons as any)[data.iconName as string] || Icons.Box;
    const accentColor = data.color || '#9d4edd';
    const isDone = data.status === 'DONE' || data.status === 'COMPLETED' || data.status === 'SYNTHESIZED';

    const handleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        const { updateNodeStatus } = (window as any).processLogic;
        if (updateNodeStatus) updateNodeStatus(id, 'COMPLETED');
    };

    return (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
            animate={{ 
                scale: selected ? 1.08 : 1, 
                opacity: 1,
                filter: 'blur(0px)',
                boxShadow: selected ? `0 0 50px ${accentColor}50` : 'none',
                borderColor: selected ? accentColor : 'rgba(255,255,255,0.05)'
            }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className={`relative px-5 py-4 rounded-2xl border transition-all duration-300 min-w-[280px] backdrop-blur-2xl group 
                ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ backgroundColor: 'rgba(10,10,10,0.9)' }}
        >
            {isDone && (
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-2xl bg-emerald-500/20 pointer-events-none"
                />
            )}

            <Handle type="target" position={Position.Top} className="!bg-[#333] !border-none !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-[#333] !border-none !w-2 !h-2" />
            
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl flex items-center justify-center transition-all duration-500 shadow-lg group-hover:scale-110" style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}40`, color: accentColor }}>
                    <Icon size={20} />
                </div>
                <div className="flex gap-2">
                    {isDone ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle className="text-emerald-400 w-4 h-4 shadow-[0_0_10px_#10b981]" /></motion.div>
                    ) : (
                        selected && (
                            <button onClick={handleComplete} className="p-1 hover:bg-[#10b981]/20 rounded transition-colors text-gray-500 hover:text-[#10b981]">
                                <CheckCircle size={14} />
                            </button>
                        )
                    )}
                    <span className="text-[7px] font-mono text-gray-600 mt-0.5">#{(id || '').substring(0,4) || 'CORE'}</span>
                </div>
            </div>
            
            <div className="mb-4">
                <div className="text-[13px] font-black font-mono uppercase tracking-[0.15em] text-white truncate">{renderSafe(data.label as any)}</div>
                <div className="text-[9px] font-mono uppercase tracking-tighter text-gray-500 mt-1 h-3">{renderSafe(data.subtext as any)}</div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Topology Unit</span>
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-[#9d4edd] animate-pulse'}`}></div>
                    <span className="text-[8px] font-black font-mono text-white/80 uppercase">{data.status || 'NOMINAL'}</span>
                </div>
            </div>
        </motion.div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    return (
        <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1.5} stroke={(edgeData?.color as string) || style?.stroke || '#333'} markerEnd={markerEnd} style={{ ...style, strokeOpacity: 0.6 }} />
    );
};

const VaultDriveOrg = ({ workflow }: any) => {
    const [optimizedNodes, setOptimizedNodes] = useState<Set<string>>(new Set());
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleOptimize = (id: string) => {
        setOptimizedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else {
                next.add(id);
                audio.playSuccess();
            }
            return next;
        });
    };

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        audio.playClick();
    };

    if (!workflow || !workflow.taxonomy) return (
        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6">
            <FolderTree size={80} className="text-gray-600" />
            <div>
                <p className="text-sm font-mono uppercase tracking-[0.4em]">Drive Organization Sector Offline</p>
                <p className="text-[10px] text-gray-600 font-mono mt-2 uppercase">Use Blueprint Architect to synthesize a PARA structure.</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-12 bg-[#030303] overflow-y-auto custom-scrollbar relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.02)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="max-w-6xl mx-auto w-full relative z-10">
                <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#10b981]/10 rounded-xl border border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                <HardDrive size={18} className="text-[#10b981]" />
                            </div>
                            <span className="text-[10px] font-black font-mono text-[#10b981] uppercase tracking-[0.4em]">Structure_Head // v3.1</span>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter font-mono leading-none">PARA Logic Matrix</h2>
                    </div>
                    <div className="flex gap-10">
                        <div className="text-right">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Structural Density</span>
                            <span className="text-2xl font-black font-mono text-white">94.2%</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Sector Nodes</span>
                            <span className="text-2xl font-black font-mono text-[#9d4edd]">{workflow.taxonomy?.root?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {workflow.taxonomy?.root?.map((group: any, idx: number) => {
                        const isOptimized = optimizedNodes.has(group.folder);
                        const isExpanded = expandedFolders.has(group.folder);
                        
                        return (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`p-8 bg-[#0a0a0a]/80 backdrop-blur border rounded-[2rem] group relative overflow-hidden transition-all duration-700
                                    ${isOptimized ? 'border-[#10b981]/40 bg-[#051a05]/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]' : 'border-white/5 hover:border-white/10 shadow-2xl'}
                                `}
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                    <FolderTree size={128} />
                                </div>

                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl border transition-all duration-500 ${isOptimized ? 'bg-[#10b981] text-black border-[#10b981]' : 'bg-[#111] text-gray-500 border-white/10 group-hover:text-[#9d4edd] group-hover:border-[#9d4edd]/30'}`}>
                                            {isOptimized ? <ShieldCheck size={28} /> : <FolderOpen size={28} />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase font-mono tracking-widest leading-none">{group.folder}</h3>
                                            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-2 block">Depth Index: L1</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => toggleOptimize(group.folder)}
                                            className={`p-2 rounded-xl transition-all ${isOptimized ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button 
                                            onClick={() => toggleFolder(group.folder)}
                                            className="p-2 bg-white/5 text-gray-500 hover:text-white rounded-xl transition-all"
                                        >
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-3 overflow-hidden border-t border-white/5 pt-6 mt-2"
                                        >
                                            {group.items?.map((item: string, i: number) => (
                                                <div key={i} className="flex items-center gap-3 text-xs text-gray-400 font-mono p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-default">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                                                    <span className="truncate">{item}</span>
                                                </div>
                                            ))}
                                            {(!group.items || group.items.length === 0) && (
                                                <div className="text-[10px] font-mono text-gray-700 italic px-4">Sector empty. Awaiting allocation...</div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isExpanded && (
                                    <p className="text-[11px] text-gray-500 font-mono line-clamp-2 leading-relaxed opacity-60">
                                        Automated PARA sector for {(group.folder || '').toLowerCase()} assets. Strictly maintained depth of 3.
                                    </p>
                                )}

                                <div className="mt-8 pt-5 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className={isOptimized ? 'text-[#10b981]' : ''} />
                                        <span>Integrity: {isOptimized ? 'LOCKED' : 'SYNCHRONIZING'}</span>
                                    </div>
                                    <span>{group.items?.length || 0} SUB_OBJECTS</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const ProtocolLoom = ({ workflow, results, isSimulating, activeIndex, onExecute, onReset }: any) => {
    if (!workflow) return (
        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
            <Workflow size={64} className="text-gray-600" />
            <p className="text-xs font-mono uppercase tracking-widest">No synthesized workflow found.<br/>Execute global sequence to generate.</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-12 bg-[#030303] overflow-y-auto custom-scrollbar relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.03)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="max-w-4xl mx-auto w-full space-y-12 relative z-10">
                <div className="flex justify-between items-center border-b border-white/5 pb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-1.5 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-lg text-[#22d3ee]">
                                <Workflow size={14} />
                            </div>
                            <span className="text-[9px] font-black font-mono text-[#22d3ee] uppercase tracking-[0.4em]">Protocol Execution Head</span>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter font-mono">{workflow.title}</h2>
                    </div>
                    <button onClick={onReset} className="p-3 text-gray-500 hover:text-red-500 bg-white/5 border border-white/10 rounded-2xl transition-all shadow-xl active:scale-95"><RefreshCw size={20} /></button>
                </div>

                <div className="p-8 bg-[#0a0a0a]/80 backdrop-blur border border-white/10 rounded-[2rem] relative overflow-hidden shadow-2xl group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#9d4edd]/60 group-hover:bg-[#9d4edd] transition-colors" />
                    <div className="flex items-center gap-3 mb-4">
                        <Terminal size={14} className="text-[#9d4edd]" />
                        <span className="text-[10px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.3em]">Architect's Synthesis Core</span>
                    </div>
                    <p className="text-sm text-gray-300 font-mono italic leading-relaxed pl-4 border-l border-white/5">"{workflow.internalMonologue}"</p>
                </div>

                <div className="space-y-6">
                    {workflow.protocols?.map((step: any, i: number) => {
                        const result = results[i];
                        const isActive = activeIndex === i;
                        const isDone = !!result;

                        return (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className={`p-8 bg-[#0a0a0a] border rounded-3xl transition-all duration-500 relative group overflow-hidden
                                    ${isDone ? 'border-[#10b981]/30 bg-[#10b981]/5' : isActive ? 'border-[#9d4edd] shadow-[0_0_50px_rgba(157,78,221,0.2)]' : 'border-white/5 hover:border-white/10'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-lg border transition-all duration-500
                                            ${isDone ? 'bg-[#10b981] text-black border-[#10b981] shadow-[0_0_20px_#10b981]' : isActive ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] text-gray-500 border-white/10'}
                                        `}>
                                            {isDone ? <CheckCircle size={28} /> : String(i + 1).padStart(2, '0')}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded border ${isDone ? 'text-[#10b981] border-[#10b981]/30' : 'text-[#9d4edd] border-[#9d4edd]/30'}`}>{step.role}</span>
                                                <div className="h-px w-8 bg-white/10" />
                                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Protocol Sector {(i+1).toString().padStart(2, '0')}</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-white uppercase font-mono tracking-tight">{step.instruction}</h4>
                                        </div>
                                    </div>
                                    {!isDone && (
                                        <button 
                                            onClick={() => onExecute(i)} 
                                            disabled={isSimulating}
                                            className="px-6 py-3 bg-[#9d4edd] hover:bg-[#b06bf7] text-black text-[11px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 shadow-2xl active:scale-95 flex items-center gap-3"
                                        >
                                            {isSimulating && isActive ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-current" />}
                                            Run Node Cycle
                                        </button>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {isDone && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-6 border-t border-white/5 space-y-6">
                                            <div className="p-6 bg-black/60 border border-white/10 rounded-2xl font-mono text-[13px] leading-relaxed text-emerald-100/90 shadow-inner">
                                                <div className="text-[8px] text-gray-600 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Execution Buffer Output</div>
                                                {result.output}
                                            </div>
                                            <div className="flex items-start gap-4 p-4 bg-[#9d4edd]/5 border border-[#9d4edd]/10 rounded-xl group/thought transition-all hover:bg-[#9d4edd]/10">
                                                <BrainCircuit size={18} className="text-[#9d4edd] shrink-0 mt-1" />
                                                <div>
                                                    <span className="text-[8px] font-black text-[#9d4edd] uppercase tracking-widest block mb-1">Agent Neural Trace</span>
                                                    <p className="text-[11px] font-mono text-gray-400 italic leading-relaxed">"{result.agentThought}"</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const InfrastructureForge = ({ nodes, onGenerate }: any) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-[#030303] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="max-w-2xl w-full bg-[#0a0a0a]/90 backdrop-blur border border-white/5 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group/forge">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover/forge:opacity-[0.06] transition-opacity rotate-12"><Server size={180} /></div>
                
                <div className="mb-14 text-center space-y-4 relative z-10">
                    <div className="w-24 h-24 bg-[#10b981]/10 border border-[#10b981]/30 rounded-[2rem] flex items-center justify-center mx-auto text-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.2)] group-hover/forge:scale-110 transition-transform duration-700">
                        <Cpu size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Infrastructure Forge</h2>
                        <p className="text-xs text-gray-500 font-mono mt-2 uppercase tracking-widest">Topology Vectorization Engine v4.0</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 relative z-10">
                    {[
                        { id: 'TERRAFORM', label: 'Terraform (HCL)', icon: Box, color: '#9d4edd', desc: 'Synthesize multi-cloud infrastructure definitions.' },
                        { id: 'DOCKER', label: 'Docker Compose', icon: Package, color: '#22d3ee', desc: 'Vectorize container orchestration manifests.' },
                        { id: 'KUBERNETES', label: 'Kubernetes YAML', icon: Layers, color: '#10b981', desc: 'Forge resilient cluster orchestration logic.' }
                    ].map(opt => (
                        <button 
                            key={opt.id}
                            onClick={() => onGenerate(opt.id)}
                            className="p-8 bg-[#111]/80 hover:bg-[#1a1a1a] border border-white/5 hover:border-[var(--color)] rounded-[2rem] flex items-center justify-between group transition-all duration-500 shadow-xl"
                            style={{ '--color': opt.color } as any}
                        >
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-black rounded-2xl border border-white/5 text-gray-600 group-hover:text-[var(--color)] group-hover:border-[var(--color)]/30 transition-all group-hover:scale-110">
                                    <opt.icon size={32} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-black text-white uppercase mb-1">{opt.label}</div>
                                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed">{opt.desc}</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-700 group-hover:text-white group-hover:bg-[var(--color)] transition-all">
                                <ChevronRight size={24} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SourceGrounding = ({ sources, onUpload, onRemove, onPreview }: any) => {
    return (
        <div className="h-full flex flex-col bg-[#030303] p-12 overflow-y-auto custom-scrollbar relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.03)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="max-w-5xl mx-auto w-full relative z-10">
                <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-lg text-[#22d3ee]">
                                <Database size={16} />
                            </div>
                            <span className="text-[9px] font-black font-mono text-[#22d3ee] uppercase tracking-[0.4em]">Context Buffer Management</span>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Topology Grounding</h2>
                    </div>
                    <label className="flex items-center gap-3 px-8 py-4 bg-[#22d3ee] text-black text-[11px] font-black uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-[#67e8f9] transition-all shadow-[0_20px_50px_rgba(34,211,238,0.3)] active:scale-95">
                        <FileUp size={20} /> Ingest Buffers
                        <input type="file" multiple className="hidden" onChange={onUpload} />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sources.map((s: any, i: number) => (
                        <motion.div 
                            key={s.id} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-[#0a0a0a]/80 backdrop-blur border border-white/5 p-6 rounded-[2rem] flex flex-col gap-5 relative group hover:border-[#22d3ee]/40 transition-all duration-500 shadow-2xl"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#111] rounded-2xl text-gray-500 group-hover:text-[#22d3ee] transition-colors"><FileText size={22} /></div>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-black text-white truncate max-w-[150px] uppercase font-mono">{s.name}</div>
                                        <div className="text-[8px] text-gray-600 font-mono uppercase mt-1">Uplink: STABLE</div>
                                    </div>
                                </div>
                                <button onClick={() => onRemove(i)} className="p-2 text-gray-800 hover:text-red-500 transition-colors bg-white/5 rounded-xl"><Trash2 size={14} /></button>
                            </div>
                            
                            {s.analysis ? (
                                <div className="space-y-4">
                                    <p className="text-[11px] text-gray-500 font-mono leading-relaxed line-clamp-3 italic bg-black/40 p-4 rounded-xl border border-white/5">"{s.analysis.summary}"</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[8px] px-2.5 py-1 rounded-lg bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/20 uppercase font-black tracking-widest shadow-sm">{s.analysis.classification}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono animate-pulse uppercase py-6 px-4 bg-black/20 rounded-xl"><Loader2 size={14} className="animate-spin" /> De-scrambling signal...</div>
                            )}

                            <button onClick={() => onPreview(s)} className="mt-2 w-full py-3.5 bg-white/5 border border-white/10 hover:border-white/30 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg">
                                <Eye size={16} /> Inspect Buffer Layer
                            </button>
                        </motion.div>
                    ))}
                    {sources.length === 0 && (
                        <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20 space-y-6 group/empty hover:opacity-30 transition-opacity">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center mx-auto group-hover/empty:scale-110 transition-transform duration-700">
                                <Database size={48} className="text-gray-500" />
                            </div>
                            <div className="space-y-2">
                                <p className="font-mono text-lg uppercase tracking-[0.4em]">Primary Buffer Empty</p>
                                <p className="text-[10px] font-mono text-gray-600 uppercase">Input strategic knowledge vectors to initialize synthesis</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
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

    useEffect(() => {
        if (nodes.length > 0 && activeTab === 'living_map') {
            const timer = setTimeout(handleAutoOrganize, 500);
            return () => clearTimeout(timer);
        }
    }, [nodes.length, activeTab]);

    const TEMPLATES = [
        { 
            id: 'drive_para', 
            label: 'PARA Drive Taxonomy', 
            icon: FolderTree, 
            type: 'DRIVE_ORGANIZATION',
            color: '#10b981',
            prompt: 'Forge a comprehensive PARA drive organization structure for a decentralized engineering firm. Include naming conventions (e.g., ISO dates) and depth rules.' 
        },
        { 
            id: 'file_mgmt_flow', 
            label: 'Asset Flow Protocol', 
            icon: Workflow, 
            type: 'DRIVE_ORGANIZATION',
            color: '#22d3ee',
            prompt: 'Synthesize a formal file management workflow for digital asset production. Include ingestion, review, and archival stages with strict metadata requirements.' 
        },
        { 
            id: 'arch_ha', 
            label: 'High-Avail Stack', 
            icon: Server, 
            type: 'SYSTEM_ARCHITECTURE',
            color: '#9d4edd',
            prompt: 'Design a multi-region scalable cloud architecture with zero-trust security layers and edge-compute synchronization.' 
        },
        { 
            id: 'arch_event', 
            label: 'Event-Driven Logic', 
            icon: Activity, 
            type: 'SYSTEM_ARCHITECTURE',
            color: '#f59e0b',
            prompt: 'Synthesize an event-driven system architecture utilizing message queues, serverless workers, and reactive data streams.' 
        },
        { 
            id: 'arch_security', 
            label: 'Enclave Mesh', 
            icon: Shield, 
            type: 'SYSTEM_ARCHITECTURE',
            color: '#ef4444',
            prompt: 'Design a hardened network topology for sensitive data processing using isolated security zones, mTLS, and real-time intrusion monitoring.' 
        },
        { 
            id: 'conv_strat', 
            label: 'Convergent Synth', 
            icon: Merge, 
            type: 'CONVERGENT_SYNTHESIS',
            color: '#ffffff',
            prompt: 'Identify intersections between existing digital strategies and physical resource availability. Bridge disparate lattices into a unified deployment directive.' 
        }
    ];

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-2xl shadow-2xl group/pv">
            
            {/* Sector Nav Header */}
            <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-2xl z-[60] flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/40 to-transparent" />
                
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                            <BrainCircuit className="w-5 h-5 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Process Logic</h1>
                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Autonomous Orchestration // v5.1-LATTICE</span>
                        </div>
                    </div>
                    
                    <div className="h-8 w-px bg-white/5" />
                    
                    <div className="flex items-center gap-1 bg-[#050505] p-1.5 rounded-2xl border border-white/5">
                        {[
                            { id: 'living_map', icon: Map, label: 'Lattice' },
                            { id: 'architect', icon: DraftingCompass, label: 'Architect' },
                            { id: 'vault', icon: FolderTree, label: 'Vault' },
                            { id: 'workflow', icon: Workflow, label: 'Loom' },
                            { id: 'iac', icon: Server, label: 'Infra' },
                            { id: 'nexus', icon: Globe, label: 'Nexus' },
                            { id: 'context', icon: Database, label: 'Ground' },
                            { id: 'diagram', icon: Grid3X3, label: 'Topology' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap
                                    ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/30' : 'text-gray-500 hover:text-gray-300'}
                                `}
                            >
                                <tab.icon size={14} className={activeTab === tab.id ? 'fill-current' : ''} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Coherence index</span>
                        <div className="flex items-center gap-3">
                             <div className="w-24 h-1.5 bg-[#111] rounded-full overflow-hidden border border-white/5">
                                 <motion.div animate={{ width: `${processData.coherenceScore}%` }} className="h-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                             </div>
                             <span className="text-[11px] font-mono font-black text-[#10b981] tracking-tighter">{processData.coherenceScore}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                        <button onClick={handleAutoOrganize} className="p-3 bg-white/5 border border-white/10 hover:border-[#22d3ee] rounded-2xl text-gray-500 hover:text-[#22d3ee] transition-all shadow-xl group/org" title="Auto-Organize Lattice">
                            <Boxes size={18} className="group-hover/org:scale-110 transition-transform" />
                        </button>
                        <button 
                            onClick={() => { handleRunGlobalSequence(); audio.playClick(); }} 
                            className="px-6 py-3 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_15px_35px_rgba(157,78,221,0.3)] flex items-center gap-3 active:scale-95 group/seq"
                        >
                            <Zap size={16} className="fill-current group-hover/seq:animate-pulse"/> Forge Sequence
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Sector Viewport */}
            <div className="flex-1 relative overflow-hidden bg-[#050505] z-10">
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-50 bg-[length:100%_4px] opacity-20" />
                
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="#111" gap={50} size={1} variant={BackgroundVariant.Dots} style={{ opacity: 0.4 }} />
                                <Controls className="!bg-[#0a0a0a] !border-white/10 !rounded-xl !shadow-2xl overflow-hidden" />
                                <MiniMap 
                                    nodeStrokeColor="#333" 
                                    nodeColor="#111" 
                                    maskColor="rgba(0,0,0,0.9)" 
                                    className="border border-white/10 !bg-[#050505] rounded-[2rem] shadow-2xl" 
                                />
                            </ReactFlow>
                            
                            {/* Visual Signal Tags */}
                            <div className="absolute top-8 left-8 flex flex-col gap-3 pointer-events-none">
                                <div className="px-3 py-1 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-full text-[9px] font-black font-mono text-[#9d4edd] flex items-center gap-2">
                                    <Radio size={10} className="animate-pulse" /> SIGNAL_CHAIN_ACTIVE
                                </div>
                                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black font-mono text-gray-500 flex items-center gap-2">
                                    <Target size={10} /> {nodes.length} NODES_CAPTURED
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full flex flex-col items-center justify-start p-16 bg-black overflow-y-auto custom-scrollbar relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(157,78,221,0.05)_0%,transparent_70%)] pointer-events-none" />
                            
                            <div className="w-full max-w-6xl space-y-16 relative z-10">
                                <div className="text-center space-y-5">
                                    <div className="w-24 h-24 bg-[#9d4edd]/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-[#9d4edd] border border-[#9d4edd]/30 shadow-[0_0_50px_rgba(157,78,221,0.2)] hover:scale-105 transition-transform duration-700">
                                        <Hammer size={48} />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Blueprint Architect</h2>
                                        <p className="text-[11px] text-gray-500 font-mono mt-4 max-w-2xl mx-auto uppercase tracking-widest leading-relaxed">Synthesize high-fidelity structural logic for PARA drive hierarchies, cloud system clusters, and autonomous agentic swarms.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {TEMPLATES.map((template, idx) => (
                                        <motion.button 
                                            key={template.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => {
                                                setArchitecturePrompt(template.prompt);
                                                setState({ workflowType: template.type as any });
                                                audio.playClick();
                                            }}
                                            className="p-8 bg-[#0a0a0a] border border-white/5 hover:border-[#9d4edd] rounded-[2.5rem] text-left transition-all duration-500 group flex flex-col gap-6 relative overflow-hidden shadow-2xl hover:shadow-[#9d4edd]/5"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity rotate-6 scale-125">
                                                <template.icon size={120} />
                                            </div>
                                            
                                            <div className="flex items-center gap-5 relative z-10">
                                                <div className="p-4 bg-[#111] rounded-2xl text-gray-500 group-hover:text-white group-hover:bg-[#9d4edd] transition-all duration-500 border border-white/5">
                                                    <template.icon size={28} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white uppercase tracking-widest">{template.label}</div>
                                                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-1 block">Vector Protocol</span>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-gray-500 font-mono line-clamp-3 leading-relaxed relative z-10 group-hover:text-gray-400 transition-colors">"{template.prompt}"</p>
                                            
                                            <div className="mt-auto flex items-center gap-2 pt-6 border-t border-white/5 relative z-10">
                                                <div className="w-1 h-1 rounded-full bg-[#9d4edd] group-hover:animate-ping" />
                                                <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest group-hover:text-[#9d4edd] transition-colors">Select configuration</span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col gap-10 relative overflow-hidden group/input-sect">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.08)_0%,transparent_70%)] pointer-events-none" />
                                    
                                    <div className="flex flex-col gap-8 relative z-10">
                                        <div className="flex gap-4 p-1.5 bg-black/40 border border-white/5 rounded-[1.5rem]">
                                            {[
                                                { id: 'DRIVE_ORGANIZATION', label: 'Drive_Org', icon: FolderTree },
                                                { id: 'SYSTEM_ARCHITECTURE', label: 'System_Arch', icon: Network },
                                                { id: 'CONVERGENT_SYNTHESIS', label: 'Convergence', icon: Merge }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => { setState({ workflowType: type.id as any }); audio.playClick(); }}
                                                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all duration-500
                                                        ${processData.workflowType === type.id ? 'bg-[#9d4edd] border-[#9d4edd] text-black shadow-2xl' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}
                                                    `}
                                                >
                                                    <type.icon size={16} />
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-4">
                                                <label className="text-[10px] font-black text-[#9d4edd] uppercase tracking-[0.4em] flex items-center gap-3">
                                                    <Binary size={14} /> Structural Directive Lattice
                                                </label>
                                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Input: STRAT_INTENT_v4</span>
                                            </div>
                                            <textarea 
                                                value={architecturePrompt} 
                                                onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                                placeholder="Describe system topology or organization goals..." 
                                                className="w-full h-56 bg-black border border-white/10 rounded-[2rem] p-8 text-sm font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800 shadow-inner group-hover/input-sect:border-white/20" 
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 relative z-10">
                                        <button 
                                            onClick={() => { handleGenerateGraph(); audio.playClick(); }} 
                                            disabled={isGeneratingGraph || isSynthesizingVault || !architecturePrompt.trim()} 
                                            className="flex-1 bg-[#9d4edd] text-black py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-5 shadow-[0_20px_60px_rgba(157,78,221,0.4)] hover:bg-[#b06bf7] hover:scale-[1.02] transition-all disabled:opacity-30 active:scale-95 group/gen-btn"
                                        >
                                            {isGeneratingGraph ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="group-hover/gen-btn:scale-125 transition-transform" />} 
                                            {isGeneratingGraph ? 'FORGING TOPOLOGY...' : 'Construct Blueprint'}
                                        </button>
                                        <button 
                                            onClick={() => { handleSynthesizeFromVault(); audio.playClick(); }} 
                                            disabled={isGeneratingGraph || isSynthesizingVault || !architecturePrompt.trim()} 
                                            className="px-10 bg-[#111] border border-white/10 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:border-[#22d3ee] transition-all disabled:opacity-30 active:scale-95 group/vault-btn"
                                        >
                                            {isSynthesizingVault ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} className="group-hover/vault-btn:text-[#22d3ee] transition-colors" />} 
                                            Synthesize from Vault
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'nexus' && (
                        <motion.div key="nexus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                            <NexusAPIExplorer />
                        </motion.div>
                    )}
                    {activeTab === 'vault' && (
                        <motion.div key="vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                            <VaultDriveOrg workflow={processData.generatedWorkflow} />
                        </motion.div>
                    )}
                    {activeTab === 'context' && (
                        <motion.div key="context" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                            <SourceGrounding 
                                sources={processData.livingMapContext.sources || []} 
                                onUpload={handleSourceUpload} 
                                onRemove={removeSource} 
                                onPreview={viewSourceAnalysis} 
                            />
                        </motion.div>
                    )}
                    {activeTab === 'workflow' && (
                        <motion.div key="workflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                            <ProtocolLoom 
                                workflow={processData.generatedWorkflow} 
                                results={processData.runtimeResults} 
                                isSimulating={processData.isSimulating} 
                                activeIndex={processData.activeStepIndex} 
                                onExecute={handleExecuteStep} 
                                onReset={handleResetSimulation} 
                            />
                        </motion.div>
                    )}
                    {activeTab === 'iac' && (
                        <motion.div key="iac" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                            <InfrastructureForge 
                                nodes={nodes} 
                                onGenerate={handleGenerateIaC} 
                            />
                        </motion.div>
                    )}
                    {activeTab === 'diagram' && (
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-12 bg-black">
                            <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[Core] --> B[Lattice]'} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sector HUD Footer */}
            <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[9px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-8 items-center">
                    <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest">
                        <CheckCircle size={12} /> Sync_Stable
                    </div>
                    <div className="flex items-center gap-2 uppercase tracking-widest">
                        <GitBranch size={12} className="text-[#9d4edd]" /> Lattice_Nodes: {nodes.length}
                    </div>
                    <div className="flex items-center gap-2 uppercase tracking-widest">
                        <Activity size={12} className="text-[#22d3ee]" /> Focus: {activeTab}
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <span className="uppercase tracking-[0.4em] opacity-40">Process Logic Synthesis Engine v5.1</span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className="font-black text-gray-500 uppercase tracking-widest">Sovereign_OS</span>
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;