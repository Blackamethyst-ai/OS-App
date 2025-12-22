
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
    Merge
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
                    <span className="text-[7px] font-mono text-gray-600 mt-0.5">#{id?.substring(0,4) || 'CORE'}</span>
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

// --- RESTORED SUB-COMPONENTS ---

const VaultDriveOrg = ({ workflow }: any) => {
    const [optimizedNodes, setOptimizedNodes] = useState<Set<string>>(new Set());

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

    if (!workflow || !workflow.taxonomy) return (
        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6">
            <FolderTree size={80} />
            <div>
                <p className="text-sm font-mono uppercase tracking-[0.4em]">Drive Organization Sector Offline</p>
                <p className="text-[10px] text-gray-600 font-mono mt-2 uppercase">Use Architect or Nexus to synthesize a PARA structure.</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-12 bg-[#030303] overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-end mb-12 border-b border-[#1f1f1f] pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-1.5 bg-[#42be65]/20 rounded border border-[#42be65]/40"><HardDrive size={14} className="text-[#42be65]" /></div>
                            <span className="text-[10px] font-black font-mono text-[#42be65] uppercase tracking-[0.4em]">Drive State Matrix</span>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter font-mono">PARA / Vault Hierarchy</h2>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block">Structural Density</span>
                            <span className="text-xl font-black font-mono text-white">94.2%</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block">Sector Nodes</span>
                            <span className="text-xl font-black font-mono text-[#9d4edd]">{workflow.taxonomy?.root?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {workflow.taxonomy?.root?.map((group: any, idx: number) => {
                        const isOptimized = optimizedNodes.has(group.folder);
                        return (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-6 bg-[#0a0a0a] border rounded-3xl group relative overflow-hidden transition-all duration-500
                                    ${isOptimized ? 'border-[#42be65] shadow-[0_0_30px_rgba(66,190,101,0.1)] bg-[#051a05]/20' : 'border-[#1f1f1f] hover:border-[#333]'}
                                `}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Folder size={48} />
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-2xl border transition-all ${isOptimized ? 'bg-[#42be65] text-black border-[#42be65]' : 'bg-[#111] text-gray-500 border-[#222]'}`}>
                                        {isOptimized ? <ShieldCheck size={20} /> : <Folder size={20} />}
                                    </div>
                                    <button 
                                        onClick={() => toggleOptimize(group.folder)}
                                        className={`p-1.5 rounded transition-all ${isOptimized ? 'text-[#42be65]' : 'text-gray-700 hover:text-white'}`}
                                    >
                                        <CheckCircle size={18} className={isOptimized ? 'shadow-[0_0_10px_currentColor]' : ''} />
                                    </button>
                                </div>

                                <h3 className="text-sm font-black text-white uppercase font-mono tracking-widest mb-1">{group.folder}</h3>
                                <p className="text-[9px] text-gray-500 font-mono mb-4 uppercase tracking-tighter h-8 leading-tight">Automated PARA sector for {group.folder.toLowerCase()} assets.</p>

                                <div className="space-y-1.5">
                                    {group.items?.slice(0, 5).map((item: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                                            <ChevronRight size={10} className="text-gray-700" />
                                            <span className="truncate">{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[8px] font-mono text-gray-700 uppercase">Integrity</span>
                                    <span className={`text-[10px] font-black font-mono ${isOptimized ? 'text-[#42be65]' : 'text-gray-600'}`}>{isOptimized ? 'STABLE' : 'DRAFT'}</span>
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
            <Workflow size={64} />
            <p className="text-xs font-mono uppercase tracking-widest">No synthesized workflow found.<br/>Execute global sequence to generate.</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-8 bg-[#030303] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8">
                <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-6">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter font-mono">{workflow.title}</h2>
                        <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-widest">Neural Protocol Sequence // v1.2</p>
                    </div>
                    <button onClick={onReset} className="p-2 text-gray-500 hover:text-red-500 bg-[#111] border border-[#222] rounded-lg transition-all"><RefreshCw size={16} /></button>
                </div>

                <div className="p-6 bg-[#0a0a0a] border border-[#222] rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#9d4edd]" />
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.3em] block mb-2">Architect's Monologue</span>
                    <p className="text-xs text-gray-300 font-mono italic leading-relaxed">"{workflow.internalMonologue}"</p>
                </div>

                <div className="space-y-4">
                    {workflow.protocols?.map((step: any, i: number) => {
                        const result = results[i];
                        const isActive = activeIndex === i;
                        const isDone = !!result;

                        return (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`p-6 bg-[#0a0a0a] border rounded-2xl transition-all relative group overflow-hidden
                                    ${isDone ? 'border-emerald-500/30 bg-emerald-500/5' : isActive ? 'border-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.15)]' : 'border-[#1f1f1f]'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-xs border
                                            ${isDone ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-[#111] text-gray-500 border-[#222]'}
                                        `}>
                                            {isDone ? <CheckCircle size={20} /> : String(i + 1).padStart(2, '0')}
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{step.role}</span>
                                            <h4 className="text-sm font-bold text-white uppercase font-mono">{step.instruction.substring(0, 50)}...</h4>
                                        </div>
                                    </div>
                                    {!isDone && (
                                        <button 
                                            onClick={() => onExecute(i)} 
                                            disabled={isSimulating}
                                            className="px-4 py-2 bg-[#9d4edd] text-black text-[9px] font-black uppercase rounded-lg hover:bg-[#b06bf7] transition-all disabled:opacity-30"
                                        >
                                            {isSimulating && isActive ? <Loader2 size={12} className="animate-spin" /> : 'Run Cycle'}
                                        </button>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {isDone && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 border-t border-white/5 space-y-4">
                                            <div className="p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-[11px] leading-relaxed text-emerald-100/80">
                                                {result.output}
                                            </div>
                                            <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500 italic">
                                                <BrainCircuit size={12} className="text-[#9d4edd]" />
                                                <span>Agent Thought: {result.agentThought}</span>
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
        <div className="h-full flex flex-col items-center justify-center p-12 bg-[#030303]">
            <div className="max-w-2xl w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Server size={128} /></div>
                <div className="mb-10 text-center space-y-3">
                    <div className="w-16 h-16 bg-[#22d3ee]/10 border border-[#22d3ee] rounded-2xl flex items-center justify-center mx-auto text-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <Cpu size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Infrastructure Forge</h2>
                    <p className="text-xs text-gray-500 font-mono">Convert logical topology into deployment-ready manifests.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {[
                        { id: 'TERRAFORM', label: 'Terraform (HCL)', icon: Box, color: '#9d4edd', desc: 'Synthesize multi-cloud infrastructure definitions.' },
                        { id: 'DOCKER', label: 'Docker Compose', icon: Package, color: '#22d3ee', desc: 'Vectorize container orchestration manifests.' },
                        { id: 'KUBERNETES', label: 'Kubernetes YAML', icon: Layers, color: '#42be65', desc: 'Forge resilient cluster orchestration logic.' }
                    ].map(opt => (
                        <button 
                            key={opt.id}
                            onClick={() => onGenerate(opt.id)}
                            className="p-6 bg-[#111] border border-[#222] hover:border-[var(--color)] rounded-2xl flex items-center justify-between group transition-all"
                            style={{ '--color': opt.color } as any}
                        >
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-black rounded-xl border border-white/5 text-gray-600 group-hover:text-[var(--color)] group-hover:border-[var(--color)]/30 transition-all">
                                    <opt.icon size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-white uppercase mb-1">{opt.label}</div>
                                    <p className="text-[10px] text-gray-500 font-mono">{opt.desc}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-800 group-hover:text-white transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SourceGrounding = ({ sources, onUpload, onRemove, onPreview }: any) => {
    return (
        <div className="h-full flex flex-col bg-[#030303] p-10 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-end mb-10 border-b border-[#1f1f1f] pb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Topology Grounding</h2>
                        <p className="text-xs text-gray-500 font-mono mt-2 uppercase tracking-widest">Primary Context Buffers for Logic Synthesis</p>
                    </div>
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-[#22d3ee] text-black text-[10px] font-black uppercase rounded-xl cursor-pointer hover:bg-[#67e8f9] transition-all shadow-lg">
                        <FileUp size={16} /> Ingest Sources
                        <input type="file" multiple className="hidden" onChange={onUpload} />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map((s: any, i: number) => (
                        <div key={s.id} className="bg-[#0a0a0a] border border-[#1f1f1f] p-5 rounded-2xl flex flex-col gap-4 relative group hover:border-[#22d3ee]/50 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#111] rounded-lg text-gray-400"><FileText size={18} /></div>
                                    <span className="text-[11px] font-bold text-white truncate max-w-[200px] uppercase font-mono">{s.name}</span>
                                </div>
                                <button onClick={() => onRemove(i)} className="text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            </div>
                            
                            {s.analysis ? (
                                <div className="space-y-3">
                                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed line-clamp-2 italic">"{s.analysis.summary}"</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[8px] px-2 py-0.5 rounded bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/20 uppercase font-black tracking-widest">{s.analysis.classification}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono animate-pulse uppercase"><Loader2 size={12} className="animate-spin" /> De-scrambling signal...</div>
                            )}

                            <button onClick={() => onPreview(s)} className="mt-2 w-full py-2 bg-[#111] border border-[#222] hover:border-white text-gray-400 hover:text-white text-[9px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2">
                                <Eye size={12} /> Inspect Buffer
                            </button>
                        </div>
                    ))}
                    {sources.length === 0 && (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-[#1f1f1f] rounded-3xl opacity-10 space-y-4">
                            <Database size={64} className="mx-auto" />
                            <p className="font-mono text-sm uppercase tracking-[0.4em]">Primary Buffer Empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PROCESS VISUALIZER ---

const ProcessVisualizerContent = () => {
    const { addLog, setMode, process: processData } = useAppStore();
    const logic = useProcessVisualizerLogic();
    const {
        activeTab, onNodesChange, onEdgesChange, onConnect, 
        nodes, edges, setState, handleAutoOrganize,
        architecturePrompt, setArchitecturePrompt,
        handleGenerateGraph, isGeneratingGraph, handleRunGlobalSequence,
        updateNodeStatus, handleExecuteStep, handleResetSimulation,
        handleGenerateIaC, handleSourceUpload, removeSource, viewSourceAnalysis
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
            prompt: 'Forge a comprehensive PARA drive organization structure for a decentralized engineering firm. Include naming conventions (e.g., ISO dates) and depth rules.' 
        },
        { 
            id: 'file_mgmt_flow', 
            label: 'File Management Protocol', 
            icon: Workflow, 
            type: 'DRIVE_ORGANIZATION',
            prompt: 'Synthesize a formal file management workflow for digital asset production. Include ingestion, review, and archival stages with strict metadata requirements.' 
        },
        { 
            id: 'arch_ha', 
            label: 'High-Availability Stack', 
            icon: Server, 
            type: 'SYSTEM_ARCHITECTURE',
            prompt: 'Design a multi-region scalable cloud architecture with zero-trust security layers and edge-compute synchronization.' 
        },
        { 
            id: 'arch_event', 
            label: 'Event-Driven Logic', 
            icon: Activity, 
            type: 'SYSTEM_ARCHITECTURE',
            prompt: 'Synthesize an event-driven system architecture utilizing message queues, serverless workers, and reactive data streams.' 
        },
        { 
            id: 'arch_security', 
            label: 'Secure Enclave Mesh', 
            icon: Shield, 
            type: 'SYSTEM_ARCHITECTURE',
            prompt: 'Design a hardened network topology for sensitive data processing using isolated security zones, mTLS, and real-time intrusion monitoring.' 
        },
        { 
            id: 'conv_strat', 
            label: 'Convergent Synthesis', 
            icon: Merge, 
            type: 'CONVERGENT_SYNTHESIS',
            prompt: 'Identify intersections between existing digital strategies and physical resource availability. Bridge disparate lattices into a unified deployment directive.' 
        }
    ];

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-xl shadow-2xl">
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded shadow-[0_0_15px_rgba(157,78,221,0.3)]"><BrainCircuit className="w-4 h-4 text-[#9d4edd]" /></div>
                        <div><h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Process Logic</h1><p className="text-[9px] text-gray-500 font-mono">Autonomous Orchestration</p></div>
                    </div>
                    <div className="flex bg-[#111] p-1 rounded border border-white/5 ml-4 overflow-x-auto no-scrollbar max-w-[500px]">
                        {[
                            { id: 'living_map', icon: Map, label: 'Map' },
                            { id: 'architect', icon: DraftingCompass, label: 'Blueprint' },
                            { id: 'nexus', icon: Globe, label: 'Nexus' },
                            { id: 'vault', icon: FolderTree, label: 'Vault' },
                            { id: 'context', icon: Database, label: 'Context' },
                            { id: 'workflow', icon: Workflow, label: 'Loom' },
                            { id: 'iac', icon: Server, label: 'Infra' },
                            { id: 'diagram', icon: Grid3X3, label: 'Mermaid' }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setState({ activeTab: tab.id })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}>
                                <tab.icon className="w-3.5 h-3.5" /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Lattice Coherence</span>
                        <div className="flex items-center gap-2">
                             <div className="w-20 h-1 bg-[#111] rounded-full overflow-hidden border border-white/5">
                                 <motion.div animate={{ width: `${processData.coherenceScore}%` }} className="h-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                             </div>
                             <span className="text-[10px] font-mono font-black text-[#10b981]">{processData.coherenceScore}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleAutoOrganize} className="p-2 bg-[#111] border border-[#333] hover:border-[#22d3ee] rounded text-gray-500 hover:text-[#22d3ee] transition-all" title="Auto-Organize Lattice"><Boxes size={16}/></button>
                        <button onClick={() => handleRunGlobalSequence()} className="px-4 py-2 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#b06bf7] shadow-lg flex items-center gap-2">
                            <Zap size={14} className="fill-current"/> Sequence Execution
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#050505]">
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="#111" gap={40} size={1} variant={BackgroundVariant.Dots} style={{ opacity: 0.5 }} />
                                <Controls className="bg-[#111] border border-white/5 text-gray-600" />
                                <MiniMap nodeStrokeColor="#333" nodeColor="#111" maskColor="rgba(0,0,0,0.85)" className="border border-white/5 bg-[#050505] rounded-xl" />
                            </ReactFlow>
                        </motion.div>
                    )}
                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-start p-12 bg-black overflow-y-auto custom-scrollbar">
                            <div className="w-full max-w-4xl space-y-10">
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 bg-[#9d4edd]/10 rounded-2xl flex items-center justify-center mx-auto text-[#9d4edd] border border-[#9d4edd]/30 shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                                        <Hammer size={32} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">Protocol Architect</h2>
                                    <p className="text-xs text-gray-500 font-mono max-w-lg mx-auto">Synthesize high-fidelity structural logic for drives, systems, and agentic swarms.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {TEMPLATES.map(template => (
                                        <button 
                                            key={template.id}
                                            onClick={() => {
                                                setArchitecturePrompt(template.prompt);
                                                setState({ workflowType: template.type as any });
                                                audio.playClick();
                                            }}
                                            className="p-5 bg-[#0a0a0a] border border-[#222] hover:border-[#9d4edd] rounded-2xl text-left transition-all group flex flex-col gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[#111] rounded-xl text-gray-600 group-hover:text-[#9d4edd] transition-colors">
                                                    <template.icon size={24} />
                                                </div>
                                                <div className="text-xs font-black text-white uppercase mb-1">{template.label}</div>
                                            </div>
                                            <p className="text-[9px] text-gray-500 font-mono line-clamp-2">{template.prompt}</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-10 shadow-2xl flex flex-col gap-8 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                                    
                                    <div className="flex flex-col gap-6 relative z-10">
                                        <div className="flex gap-4">
                                            {[
                                                { id: 'DRIVE_ORGANIZATION', label: 'Drive Org', icon: FolderTree },
                                                { id: 'SYSTEM_ARCHITECTURE', label: 'System Arch', icon: Network },
                                                { id: 'CONVERGENT_SYNTHESIS', label: 'Convergence', icon: Merge }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setState({ workflowType: type.id as any })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all
                                                        ${processData.workflowType === type.id ? 'bg-[#9d4edd] border-[#9d4edd] text-black shadow-lg' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white'}
                                                    `}
                                                >
                                                    <type.icon size={14} />
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-1">Infrastructure Directive</label>
                                            <textarea 
                                                value={architecturePrompt} 
                                                onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                                placeholder="Describe system topology or organization goals..." 
                                                className="w-full h-40 bg-[#050505] border border-white/10 rounded-2xl p-5 text-sm font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800" 
                                            />
                                        </div>
                                    </div>

                                    <button onClick={() => handleGenerateGraph()} disabled={isGeneratingGraph || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 relative z-10 shadow-2xl hover:bg-[#b06bf7] transition-all disabled:opacity-30">
                                        {isGeneratingGraph ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Construct Blueprint
                                    </button>
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
                                onRemove={handleResetSimulation} 
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
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-8 bg-black">
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
