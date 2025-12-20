
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ReactFlow, Background, Controls, MiniMap, 
    NodeProps, EdgeProps, BackgroundVariant, ReactFlowProvider,
    Handle, Position, getSmoothStepPath, useReactFlow
} from '@xyflow/react';
import { 
    BrainCircuit, X, Activity, Database, Zap, Wrench, 
    Atom, ChevronDown, ChevronRight, Grid3X3, 
    Map, Box, Play, Download, AlertCircle, CheckCircle, RefreshCw,
    DraftingCompass, Server, Layers, Workflow, Volume1,
    HardDriveDownload, Network as NetworkIcon,
    Save, VolumeX, Lightbulb, Search, Loader2, Code, Cloud,
    ShieldCheck, Sparkles, FileText, Upload, Eye, FileUp, Info,
    FolderTree, Terminal, Settings2, User, Copy, ExternalLink, Globe, ArrowRight, PieChart, ShieldAlert, Thermometer, Bell, FolderSync, Plus, Maximize, Stethoscope, FileJson, Trash2, GitBranch, BookOpen, LayoutGrid, Bot, Filter, GitMerge, Cpu, Brain, PlayCircle, RotateCcw
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { AppTheme, AppMode, AgenticNodeData } from '../types';
import MermaidDiagram from './MermaidDiagram';
import NexusAPIExplorer from './NexusAPIExplorer';
import { useProcessVisualizerLogic, THEME } from '../hooks/useProcessVisualizerLogic';
import { renderSafe } from '../utils/renderSafe';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const ProtocolLoom: React.FC<{ protocols: any[], type?: string, activeIndex: number | null, onStep: (idx: number) => void, results: Record<number, any>, onReset: () => void, isSimulating: boolean }> = ({ protocols, type, activeIndex, onStep, results, onReset, isSimulating }) => {
    if (!protocols || protocols.length === 0) return null;

    const accentColor = type === 'DRIVE_ORGANIZATION' ? '#22d3ee' : type === 'SYSTEM_ARCHITECTURE' ? '#f59e0b' : type === 'AGENTIC_ORCHESTRATION' ? '#10b981' : '#9d4edd';

    return (
        <div className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-8 overflow-x-auto custom-scrollbar relative">
            <div className="flex items-center justify-between mb-6 border-b border-[#1f1f1f] pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: accentColor }} />
                    <h3 className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-[0.2em]">Protocol Loom // {type === 'AGENTIC_ORCHESTRATION' ? 'Cognitive Thread' : 'Sequence Visualization'}</h3>
                </div>
                <div className="flex gap-2">
                    <button onClick={onReset} className="flex items-center gap-2 px-3 py-1 bg-[#111] border border-[#333] hover:border-white text-[9px] font-mono text-gray-500 hover:text-white uppercase transition-all rounded">
                        <RotateCcw size={10} /> Reset
                    </button>
                    {activeIndex === null ? (
                        <button onClick={() => onStep(0)} className="flex items-center gap-2 px-3 py-1 bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-[9px] font-mono uppercase transition-all rounded hover:bg-[#10b981] hover:text-black">
                            <Play size={10} /> Initialize Runtime
                        </button>
                    ) : (
                        <div className="text-[9px] font-mono text-gray-500 uppercase flex items-center gap-2">
                             Runtime Active <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-0 pb-4 min-w-max">
                {protocols.map((p, i) => {
                    const isActive = activeIndex === i;
                    const isDone = !!results[i];

                    return (
                        <React.Fragment key={i}>
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`
                                    relative w-72 bg-black border p-4 rounded-xl shrink-0 group transition-all cursor-pointer
                                    ${isActive ? 'border-[#10b981] shadow-[0_0_25px_rgba(16,185,129,0.1)] scale-105 z-10' : isDone ? 'border-[#42be65]/40 opacity-60' : 'border-[#222] hover:border-[#9d4edd]'}
                                `}
                                onClick={() => !isSimulating && onStep(i)}
                            >
                                {isActive && isSimulating && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-xl">
                                        <Loader2 size={24} className="text-[#10b981] animate-spin mb-2" />
                                        <span className="text-[8px] font-mono text-[#10b981] animate-pulse">REASONING...</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[9px] font-black font-mono px-1.5 rounded" style={{ color: isActive ? '#10b981' : accentColor, backgroundColor: isActive ? '#10b98115' : `${accentColor}15` }}>STEP_{String(p.step || i+1).padStart(2, '0')}</span>
                                    {isDone && <CheckCircle size={10} className="text-[#42be65]" />}
                                    {!isDone && isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />}
                                </div>
                                <h4 className="text-[11px] font-bold text-white font-mono mb-2 truncate group-hover:text-[#22d3ee] transition-colors">{p.action}</h4>
                                
                                <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
                                    {p.perception_gate && (
                                        <div className="flex items-center gap-2 text-[8px] font-mono text-cyan-500/70 uppercase">
                                            <Filter size={10} /> {p.perception_gate}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-[8px] font-mono text-gray-600 uppercase">
                                        <User className="w-2.5 h-2.5" /> {p.role}
                                    </div>
                                    {results[i] && (
                                        <div className="mt-2 p-2 bg-[#111] rounded text-[8px] font-mono text-gray-400 line-clamp-2 border border-white/5">
                                            ↳ {results[i].output}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-[#333]" />
                            </motion.div>
                            
                            {i < protocols.length - 1 && (
                                <div className={`w-12 h-px shrink-0 self-center mx-1 flex items-center justify-center transition-all ${isDone ? 'bg-[#42be65]' : 'bg-[#333]'}`}>
                                    <ArrowRight className={`w-3 h-3 ${isDone ? 'text-[#42be65]' : 'text-gray-700'}`} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const DirectoryTaxonomy: React.FC<{ taxonomy: any, type?: string }> = ({ taxonomy, type }) => {
    if (!taxonomy || !taxonomy.root) return null;
    const accentColor = type === 'AGENTIC_ORCHESTRATION' ? '#10b981' : '#22d3ee';
    const Icon = type === 'AGENTIC_ORCHESTRATION' ? BrainCircuit : FolderTree;
    const title = type === 'AGENTIC_ORCHESTRATION' ? 'Cognitive Hierarchy // State Map' : 'Logical Directory Topology';
    
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1f1f1f] pb-4">
                <Icon className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">{title}</h3>
            </div>
            <div className="space-y-4">
                {taxonomy.root.map((folder: any, i: number) => (
                    <div key={i} className="pl-4 border-l-2 border-[#222] hover:border-[#10b981] transition-colors" style={{ borderLeftColor: i % 2 === 0 ? accentColor : undefined }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Icons.Folder className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span className="text-[11px] font-bold font-mono text-white uppercase tracking-widest">{folder.folder}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-6">
                            {folder.subfolders?.map((sub: string, j: number) => (
                                <div key={j} className="flex items-center gap-2 py-1 group/sub">
                                    <div className="w-1 h-1 rounded-full bg-gray-700 group-hover/sub:bg-[#10b981]" />
                                    <span className="text-[9px] font-mono text-gray-500 group-hover/sub:text-gray-300 transition-colors truncate">/{sub}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HolographicNode = ({ data: nodeData, selected }: NodeProps) => {
    const data = nodeData as any;
    const Icon = (Icons as any)[data.iconName as string] || Icons.Box;
    const accentColor = data.color || '#9d4edd';
    const [proceduralState, setProceduralState] = useState('IDLE');

    useEffect(() => {
        if (data.status === 'ACTIVE' || data.status === 'INITIALIZED') {
            const states = ['PERCEIVING', 'REASONING', 'REFINING', 'HANDING_OFF', 'IDLE'];
            const interval = setInterval(() => {
                setProceduralState(states[Math.floor(Math.random() * states.length)]);
            }, 3000 + Math.random() * 2000);
            return () => clearInterval(interval);
        }
    }, [data.status]);

    return (
        <div 
            className={`
                relative px-5 py-4 rounded-xl border transition-all duration-300 min-w-[280px] backdrop-blur-xl group
                ${selected ? 'border-[#9d4edd] shadow-[0_0_40px_rgba(157,78,221,0.2)]' : 'border-white/5 hover:border-white/20'}
            `} 
            style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}
        >
            <Handle type="target" position={Position.Top} className="!bg-[#333] !border-none !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-[#333] !border-none !w-2 !h-2" />
            <Handle type="target" position={Position.Left} className="!bg-[#333] !border-none !w-2 !h-2" />
            <Handle type="source" position={Position.Right} className="!bg-[#333] !border-none !w-2 !h-2" />
            
            <div className="flex justify-between items-start mb-4">
                <div 
                    className="p-2.5 rounded-lg flex items-center justify-center transition-all duration-500 shadow-lg group-hover:scale-110" 
                    style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}40`, color: accentColor }}
                >
                    <Icon size={20} className="drop-shadow-[0_0_8px_currentColor]" />
                </div>
                <div className="flex flex-col items-end gap-1">
                    {data.status && (
                        <div className="px-2 py-0.5 rounded-sm text-[8px] font-black bg-white/5 border border-white/10 text-gray-500 uppercase tracking-widest">
                            {data.status}
                        </div>
                    )}
                    {(data.status === 'ACTIVE' || data.status === 'INITIALIZED') && (
                        <div className="text-[7px] font-mono text-emerald-500 flex items-center gap-1 animate-pulse uppercase">
                            <Activity size={8} /> {proceduralState}
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <div className="text-[13px] font-black font-mono uppercase tracking-[0.15em] text-white truncate group-hover:text-[#22d3ee] transition-colors">{renderSafe(data.label as any)}</div>
                <div className="text-[9px] font-mono uppercase tracking-tighter text-gray-500 mt-1">{renderSafe(data.subtext as any)}</div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                <div className="flex justify-between items-center gap-1.5">
                    <div className="flex-1 flex gap-1">
                        {[1, 2, 3, 4].map(seg => (
                            <div 
                                key={seg} 
                                className={`h-1 flex-1 rounded-full transition-all duration-1000 ${seg <= (data.progress || 1) ? '' : 'opacity-20'}`} 
                                style={{ backgroundColor: accentColor, boxShadow: seg <= (data.progress || 1) ? `0 0 5px ${accentColor}` : 'none' }} 
                            />
                        ))}
                    </div>
                    <div className="text-[8px] font-black font-mono text-gray-600 uppercase tracking-widest shrink-0 ml-2">
                        {data.footerRight || 'COGNITIVE_CORE'}
                    </div>
                </div>
                <div className="text-[8px] font-black font-mono text-gray-400 uppercase tracking-widest flex justify-between">
                    <span>{data.footerLeft || 'STATE_L0'}</span>
                    <span className="text-gray-700">MEM: 2.4KB</span>
                </div>
            </div>
        </div>
    );
};

const AgenticNode = ({ data: nodeData, selected }: NodeProps) => {
    const data = nodeData as AgenticNodeData;
    const Icon = (Icons as any)[data.iconName as string] || Icons.Bot;
    const accentColor = data.color || '#10b981';

    return (
        <div 
            className={`
                relative px-6 py-5 rounded-2xl border transition-all duration-500 min-w-[320px] backdrop-blur-3xl group
                ${selected ? 'border-[#10b981] shadow-[0_0_50px_rgba(16,185,129,0.25)]' : 'border-white/10 hover:border-white/30'}
            `} 
            style={{ backgroundColor: 'rgba(5, 10, 5, 0.95)' }}
        >
            <Handle type="target" position={Position.Top} className="!bg-[#222] !w-3 !h-3" />
            <Handle type="source" position={Position.Bottom} className="!bg-[#222] !w-3 !h-3" />
            
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div 
                        className={`p-3 rounded-xl flex items-center justify-center transition-all duration-700 shadow-xl group-hover:rotate-12`} 
                        style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}50`, color: accentColor }}
                    >
                        {data.modelType === 'LRM' ? <Brain size={24} className="animate-pulse" /> : <Cpu size={24} />}
                    </div>
                    <div>
                        <div className="text-[14px] font-black font-mono uppercase tracking-[0.2em] text-white">{data.label}</div>
                        <div className="text-[9px] font-bold font-mono text-emerald-500 uppercase tracking-widest mt-0.5">{data.role}</div>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full text-[8px] font-black bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] uppercase tracking-widest">
                    {data.modelType} ENGINE
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {data.tools?.map((tool, i) => (
                        <span key={i} className="text-[7px] font-black font-mono px-2 py-0.5 bg-[#111] border border-white/5 rounded text-gray-500 uppercase">
                            TOOL::{tool}
                        </span>
                    ))}
                </div>
                
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-mono text-gray-600 uppercase">Memory Latency</span>
                        <span className="text-[8px] font-mono text-emerald-500">SYNC_OK</span>
                    </div>
                    <div className="h-1 w-full bg-[#111] rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-emerald-500"
                            animate={{ width: ['20%', '80%', '40%'] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[9px] font-mono font-bold text-gray-400">STATE::{data.activeState || 'THINKING'}</span>
                </div>
                {data.thinkingBudget && (
                    <span className="text-[8px] font-mono text-gray-600 uppercase">Budget: {data.thinkingBudget}t</span>
                )}
            </div>
        </div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    const isHandingOff = edgeData?.variant === 'handoff' || edgeData?.handoffCondition;

    return (
        <>
            <path 
                id={id} 
                className="react-flow__edge-path" 
                d={edgePath} 
                strokeWidth={isHandingOff ? 2 : 1.5} 
                stroke={(edgeData?.color as string) || style?.stroke || '#333'} 
                markerEnd={markerEnd} 
                style={{ ...style, strokeOpacity: isHandingOff ? 0.6 : 0.2 }} 
            />
            {edgeData?.handoffCondition && (
                <text className="pointer-events-none fill-emerald-500 font-mono text-[8px] uppercase font-black tracking-widest shadow-xl">
                    <textPath href={`#${id}`} startOffset="50%" textAnchor="middle" dy="-6">
                        ↳ IF: {edgeData.handoffCondition}
                    </textPath>
                </text>
            )}
            {edgeData?.perception_gate && (
                <text className="pointer-events-none fill-cyan-500 font-mono text-[7px] uppercase font-bold tracking-tighter">
                    <textPath href={`#${id}`} startOffset="50%" textAnchor="middle" dy="-4">
                        ◬ PERCEPTION_GATE: {edgeData.perception_gate}
                    </textPath>
                </text>
            )}
            {edgeData?.variant === 'stream' && (
                <circle r="2.5" fill={(edgeData?.color as string) || style?.stroke || '#9d4edd'}>
                    <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
                </circle>
            )}
            {isHandingOff && (
                <g>
                    <rect width="6" height="6" fill={(edgeData?.color as string) || '#10b981'} rx="1">
                        <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
                        <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
                    </rect>
                </g>
            )}
        </>
    );
};

const ProcessVisualizerContent = () => {
    const { addLog, setMode } = useAppStore();
    const { fitView } = useReactFlow();
    const {
        state, activeTab, onNodesChange, onEdgesChange, onConnect, onPaneContextMenu, onPaneClick, onPaneDoubleClick,
        nodes, edges, animatedNodes, animatedEdges, visualTheme, showGrid, paneContextMenu,
        setPaneContextMenu,
        sequenceStatus, sequenceProgress, selectedNode, architecturePrompt,
        setArchitecturePrompt, getTabLabel, saveGraph, restoreGraph, setState,
        getPriorityBadgeStyle, handleAIAddNode, handleSourceUpload, removeSource, viewSourceAnalysis,
        handleGenerate, handleGenerateGraph, isGeneratingGraph,
        handleExecuteStep, handleResetSimulation
    } = useProcessVisualizerLogic();

    const nodeTypes = useMemo(() => ({ holographic: HolographicNode, agentic: AgenticNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);
    const [showSources, setShowSources] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [selectedWorkflowDomain, setSelectedWorkflowDomain] = useState<'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION'>('GENERAL');

    const triggerGenerate = (type: string) => {
        useAppStore.getState().setProcessState({ workflowType: selectedWorkflowDomain });
        handleGenerate(type);
    };

    const handleAiSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const sanitizedInput = typeof aiInput === 'string' ? aiInput.trim() : '';
        if (sanitizedInput) {
            handleAIAddNode(sanitizedInput);
            setAiInput('');
        }
    };

    const loadTemplate = (id: string) => {
        const presets: Record<string, string> = {
            'para': 'Construct a Google Drive PARA organization layout with folders for Projects, Areas, Resources, and Archives.',
            'rag': 'Blueprint a RAG system with a Vector Database, Embedding Service, LLM API, and Query Orchestrator.',
            'secure': 'Design a Zero-Trust security mesh with Identity Proxy, WAF, Enclave Monitor, and mTLS edges.',
            'orch': 'Orchestrate a multi-agent swarm for complex code generation, including perception filters, planning cycles, and handoff protocols.'
        };
        setArchitecturePrompt(presets[id] || '');
        handleGenerateGraph();
        setShowLibrary(false);
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-xl shadow-2xl">
            <div className="h-16 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded shadow-[0_0_15px_rgba(157,78,221,0.3)]"><BrainCircuit className="w-4 h-4 text-[#9d4edd]" /></div>
                        <div><h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Metaventions Process Core</h1><p className="text-[9px] text-gray-500 font-mono">Autonomous System Architect</p></div>
                    </div>
                    <div className="flex bg-[#111] p-1 rounded border border-white/5 ml-4">
                        {[
                            { id: 'living_map', icon: Map },
                            { id: 'architect', icon: DraftingCompass },
                            { id: 'google_nexus', icon: Globe },
                            { id: 'diagram', icon: Grid3X3 },
                            { id: 'workflow', icon: Workflow }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setState({ activeTab: tab.id })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}>
                                <tab.icon className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">{getTabLabel(tab.id)}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowLibrary(!showLibrary)} 
                            className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${showLibrary ? 'bg-[#9d4edd]/10 border-[#9d4edd] text-[#9d4edd]' : 'bg-[#111] border-white/5 text-gray-500 hover:text-white'}`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Library
                        </button>
                        <AnimatePresence>
                            {showLibrary && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 mt-2 w-56 bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl z-[100] overflow-hidden p-1.5">
                                    <button onClick={() => loadTemplate('para')} className="w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-mono text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors uppercase tracking-wider"><FolderSync size={14} className="text-[#22d3ee]"/> PARA Drive Protocol</button>
                                    <button onClick={() => loadTemplate('rag')} className="w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-mono text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors uppercase tracking-wider"><BrainCircuit size={14} className="text-[#9d4edd]"/> RAG Engine Stack</button>
                                    <button onClick={() => loadTemplate('orch')} className="w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-mono text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors uppercase tracking-wider"><Bot size={14} className="text-[#10b981]"/> Agentic Swarm</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button 
                        onClick={() => setShowSources(!showSources)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${showSources ? 'bg-[#22d3ee]/10 border-[#22d3ee] text-[#22d3ee]' : 'bg-[#111] border-white/5 text-gray-500 hover:text-white'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Sources {state.livingMapContext.sources?.length > 0 && `(${state.livingMapContext.sources.length})`}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#050505] flex">
                <div className="flex-1 relative">
                    {activeTab === 'living_map' && (
                        <div className="h-full w-full relative">
                            <ReactFlow 
                                nodes={nodes} 
                                edges={edges} 
                                onNodesChange={onNodesChange} 
                                onEdgesChange={onEdgesChange} 
                                onConnect={onConnect} 
                                onPaneContextMenu={onPaneContextMenu} 
                                onPaneClick={onPaneClick} 
                                onDoubleClick={onPaneDoubleClick} 
                                nodeTypes={nodeTypes} 
                                edgeTypes={edgeTypes} 
                                fitView 
                                minZoom={0.1} 
                                maxZoom={2} 
                                nodesDraggable={true}
                            >
                                <Background color="#111" gap={40} size={1} variant={BackgroundVariant.Dots} style={{ opacity: 0.5 }} />
                                <Controls className="bg-[#111] border border-white/5 text-gray-600" />
                                <MiniMap nodeStrokeColor="#333" nodeColor="#111" maskColor="rgba(0,0,0,0.85)" className="border border-white/5 bg-[#050505] rounded-xl" />
                            </ReactFlow>
                        </div>
                    )}
                    {activeTab === 'workflow' && (
                        <div className="h-full flex flex-col">
                            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[#9d4edd]"><Workflow className="w-5 h-5" /><span className="font-black font-mono text-sm uppercase tracking-widest">Protocol Synthesis</span></div>
                                    <div className="flex bg-black/40 border border-white/5 rounded p-0.5 ml-6">
                                        <button onClick={() => setSelectedWorkflowDomain('GENERAL')} className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === 'GENERAL' ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>General</button>
                                        <button onClick={() => setSelectedWorkflowDomain('DRIVE_ORGANIZATION')} className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === 'DRIVE_ORGANIZATION' ? 'bg-[#22d3ee] text-black shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>Drive Layout</button>
                                        <button onClick={() => setSelectedWorkflowDomain('SYSTEM_ARCHITECTURE')} className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === 'SYSTEM_ARCHITECTURE' ? 'bg-[#f59e0b] text-black shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>System Arch</button>
                                        <button onClick={() => setSelectedWorkflowDomain('AGENTIC_ORCHESTRATION')} className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === 'AGENTIC_ORCHESTRATION' ? 'bg-[#10b981] text-black shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>Agent Orchestration</button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => triggerGenerate('workflow')} disabled={state.isLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(157,78,221,0.3)] transition-all hover:scale-105 active:scale-95">
                                        {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                        Forge Protocol
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex overflow-hidden">
                                <div className="flex-1 bg-[#050505] p-10 overflow-y-auto custom-scrollbar">
                                    {!state.generatedWorkflow ? (
                                        <div className="h-full flex flex-col items-center justify-center p-12">
                                            <div className="max-w-2xl w-full space-y-12">
                                                <div className="text-center">
                                                    <Workflow className="w-20 h-20 mb-6 text-[#9d4edd] mx-auto opacity-30 animate-pulse" />
                                                    <h3 className="font-black font-mono text-base uppercase tracking-[0.4em] text-white mb-3">Metaventions Blueprint Matrix</h3>
                                                    <p className="text-[10px] text-gray-700 font-mono uppercase tracking-widest leading-relaxed">Select a domain-specific logic template to initialize autonomic synthesis.</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('DRIVE_ORGANIZATION'); triggerGenerate('workflow'); }}
                                                        className="p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-[#22d3ee]/50 transition-all text-left group shadow-2xl relative overflow-hidden"
                                                    >
                                                        <FolderSync className="w-10 h-10 text-[#22d3ee] mb-6 group-hover:scale-110 transition-transform" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 font-mono">Drive Organization</h4>
                                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">PARA method implementation with ISO naming standards.</p>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('SYSTEM_ARCHITECTURE'); triggerGenerate('workflow'); }}
                                                        className="p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-[#f59e0b]/50 transition-all text-left group shadow-2xl relative overflow-hidden"
                                                    >
                                                        <Server className="w-10 h-10 text-[#f59e0b] mb-6 group-hover:scale-110 transition-transform" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 font-mono">System Architecture</h4>
                                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">High-availability topology with Zero-Trust mesh protocols.</p>
                                                    </button>

                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('AGENTIC_ORCHESTRATION'); triggerGenerate('workflow'); }}
                                                        className="p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-[#10b981]/50 transition-all text-left group shadow-2xl relative overflow-hidden"
                                                    >
                                                        <Bot className="w-10 h-10 text-[#10b981] mb-6 group-hover:scale-110 transition-transform" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 font-mono">Agent Orchestration</h4>
                                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">Multi-agent coordination using ReAct, Swarm, and Handoff logic.</p>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 max-w-5xl mx-auto pb-20">
                                            <ProtocolLoom 
                                                protocols={state.generatedWorkflow.protocols} 
                                                type={selectedWorkflowDomain} 
                                                activeIndex={state.activeStepIndex}
                                                onStep={handleExecuteStep}
                                                results={state.runtimeResults}
                                                onReset={handleResetSimulation}
                                                isSimulating={state.isSimulating}
                                            />
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {(selectedWorkflowDomain === 'DRIVE_ORGANIZATION' || selectedWorkflowDomain === 'AGENTIC_ORCHESTRATION') && (
                                                    <DirectoryTaxonomy taxonomy={state.generatedWorkflow.taxonomy} type={selectedWorkflowDomain} />
                                                )}
                                                <div className="space-y-4">
                                                    <div className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <Zap className="w-3 h-3 text-[#9d4edd]" /> Executable steps
                                                    </div>
                                                    {state.generatedWorkflow.protocols?.map((p: any, i: number) => (
                                                        <div key={i} className={`bg-[#0a0a0a] border ${state.activeStepIndex === i ? 'border-[#10b981]' : 'border-white/5'} rounded-2xl p-6 group hover:border-[#9d4edd]/40 transition-all flex gap-6 shadow-lg relative overflow-hidden`}>
                                                            {state.activeStepIndex === i && <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981] animate-pulse" />}
                                                            <div className={`w-10 h-10 rounded-xl bg-[#111] border border-white/5 flex items-center justify-center text-[11px] font-black ${state.activeStepIndex === i ? 'text-[#10b981]' : 'text-gray-600'} shrink-0 group-hover:text-white transition-colors`}>{p.step || i+1}</div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <h3 className={`text-[13px] font-black ${state.activeStepIndex === i ? 'text-[#10b981]' : 'text-white'} font-mono uppercase tracking-widest`}>{p.action}</h3>
                                                                    <div className="flex gap-2">
                                                                        {state.runtimeResults[i] && <span className="text-[7px] font-mono bg-[#42be65]/10 border border-[#42be65]/30 text-[#42be65] px-1.5 py-0.5 rounded">VERIFIED</span>}
                                                                        <span className={`text-[8px] font-black font-mono px-2 py-1 rounded border tracking-widest ${getPriorityBadgeStyle(p.priority)}`}>{p.priority || 'MEDIUM'}</span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[11px] text-gray-400 leading-relaxed font-mono mb-4 italic">"{p.description}"</p>
                                                                
                                                                <AnimatePresence>
                                                                    {state.runtimeResults[i] && (
                                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4 bg-black/40 border border-white/5 p-4 rounded-xl">
                                                                            <div className="text-[8px] font-mono text-[#42be65] uppercase mb-2 flex items-center gap-2"><Cpu size={10}/> Runtime Output</div>
                                                                            <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{state.runtimeResults[i].output}</p>
                                                                            <div className="mt-3 pt-3 border-t border-white/5 text-[8px] font-mono text-gray-600 uppercase italic">
                                                                                Agent Thought: {state.runtimeResults[i].agentThought}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>

                                                                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                                                                    <div className="flex gap-6 text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">
                                                                        <span className="flex items-center gap-2 border-r border-white/10 pr-6"><User className="w-3.5 h-3.5 text-[#22d3ee]" /> {p.role}</span>
                                                                        <span className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-[#f59e0b]" /> {p.tool}</span>
                                                                    </div>
                                                                    {p.perception_gate && (
                                                                        <div className="text-[8px] font-mono text-cyan-500 uppercase flex items-center gap-2">
                                                                            <Filter size={12} /> Perception Gate: {p.perception_gate}
                                                                        </div>
                                                                    )}
                                                                    {p.handoff_protocol && (
                                                                        <div className="text-[8px] font-mono text-emerald-500 uppercase flex items-center gap-2">
                                                                            <GitMerge size={12} /> Handoff Strategy: {p.handoff_protocol}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'architect' && (
                        <div className="h-full flex flex-col p-8 bg-black gap-8">
                            <div className="flex gap-8 flex-1">
                                <div className="w-1/3 bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col justify-center gap-8">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center border border-white/5 mx-auto mb-6 shadow-[0_0_50px_rgba(157,78,221,0.2)]">
                                            <DraftingCompass className="w-10 h-10 text-[#9d4edd]" />
                                        </div>
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-[0.2em]">Neural Architect</h2>
                                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mt-2">Describe your system topology.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex bg-[#111] p-1 rounded border border-white/5">
                                            <button onClick={() => setSelectedWorkflowDomain('SYSTEM_ARCHITECTURE')} className={`flex-1 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === 'SYSTEM_ARCHITECTURE' ? 'bg-[#f59e0b] text-black' : 'text-gray-500 hover:text-white'}`}>Infrastructure</button>
                                            <button onClick={() => setSelectedWorkflowDomain('AGENTIC_ORCHESTRATION')} className={`flex-1 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === 'AGENTIC_ORCHESTRATION' ? 'bg-[#10b981] text-black' : 'text-gray-500 hover:text-white'}`}>Agent Swarm</button>
                                        </div>
                                        <textarea value={architecturePrompt} onChange={(e) => setArchitecturePrompt(e.target.value)} placeholder={selectedWorkflowDomain === 'AGENTIC_ORCHESTRATION' ? "Describe the agent swarm objectives..." : "Enter architectural directive..."} className="w-full h-48 bg-[#050505] border border-white/10 rounded-2xl p-5 text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800 shadow-inner" />
                                    </div>
                                    <button onClick={() => { handleGenerateGraph(); }} disabled={isGeneratingGraph || !architecturePrompt || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-5 rounded-2xl font-black font-mono text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(157,78,221,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        {isGeneratingGraph ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                        Construct Blueprint
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="h-full bg-black/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                        <Activity size={48} className="mb-4 opacity-20 animate-pulse" />
                                        <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-center">Real-time Logic Mapping<br/><span className="text-[8px] opacity-40">Ready for Synaptic Injection</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;
