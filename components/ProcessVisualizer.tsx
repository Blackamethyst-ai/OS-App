
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
    FolderTree, Terminal, Settings2, User, Copy, ExternalLink, Globe, ArrowRight, PieChart, ShieldAlert, Thermometer, Bell, FolderSync, Plus, Maximize, Stethoscope, FileJson, Trash2, GitBranch, BookOpen, LayoutGrid, Bot, Filter, GitMerge, Cpu, Brain, PlayCircle, RotateCcw, BarChart3, Scan, Target,
    Boxes, Package, Shield, Share2, Compass, Dna
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { AppTheme, AppMode, AgenticNodeData } from '../types';
import MermaidDiagram from './MermaidDiagram';
import NexusAPIExplorer from './NexusAPIExplorer';
import { useProcessVisualizerLogic, THEME } from '../hooks/useProcessVisualizerLogic';
import { renderSafe } from '../utils/renderSafe';

const EntropyMeter = ({ score }: { score: number }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-end">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Activity size={10} className={score > 60 ? 'text-red-500' : 'text-[#9d4edd]'} /> System Entropy
            </div>
            <span className={`text-xs font-black font-mono ${score > 60 ? 'text-red-500' : 'text-white'}`}>{score.toFixed(1)}%</span>
        </div>
        <div className="h-1 bg-[#111] rounded-full overflow-hidden border border-white/5">
            <motion.div 
                animate={{ width: `${score}%` }} 
                className={`h-full shadow-[0_0_10px_currentColor] ${score > 60 ? 'bg-red-500' : 'bg-[#9d4edd]'}`} 
            />
        </div>
    </div>
);

const ProtocolLoom: React.FC<{ protocols: any[], type?: string, activeIndex: number | null, onStep: (idx: number) => void, results: Record<number, any>, onReset: () => void, isSimulating: boolean }> = ({ protocols, type, activeIndex, onStep, results, onReset, isSimulating }) => {
    if (!protocols || protocols.length === 0) return null;
    const accentColor = type === 'DRIVE_ORGANIZATION' ? '#22d3ee' : type === 'SYSTEM_ARCHITECTURE' ? '#f59e0b' : type === 'AGENTIC_ORCHESTRATION' ? '#10b981' : '#9d4edd';

    return (
        <div className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-8 overflow-x-auto custom-scrollbar relative shadow-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-[#1f1f1f] pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: accentColor }} />
                    <h3 className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-[0.2em]">Protocol Loom // {type?.replace('_', ' ') || 'Sequence Visualization'}</h3>
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
                                <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5 text-[9px] font-mono text-gray-500 uppercase truncate">
                                    {p.tool}
                                </div>
                                {isDone && results[i] && (
                                    <div className="mt-3 p-2 bg-[#111] rounded border border-white/5 text-[8px] font-mono text-gray-400 italic line-clamp-2">
                                        Agent: "{results[i].agentThought}"
                                    </div>
                                )}
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
    const accentColor = type === 'AGENTIC_ORCHESTRATION' ? '#10b981' : type === 'DRIVE_ORGANIZATION' ? '#22d3ee' : '#f59e0b';
    const Icon = type === 'AGENTIC_ORCHESTRATION' ? BrainCircuit : FolderTree;
    
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1f1f1f] pb-4">
                <Icon className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">{type?.replace('_', ' ') || 'Logical Topology'}</h3>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {taxonomy.root.map((folder: any, i: number) => (
                    <div key={i} className="pl-4 border-l-2 border-[#222] hover:border-[var(--color)] transition-colors" style={{ '--color': accentColor } as any}>
                        <div className="flex items-center gap-2 mb-2">
                            <Icons.Folder className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span className="text-[11px] font-bold font-mono text-white uppercase tracking-widest">{folder.folder}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-6">
                            {folder.subfolders?.map((sub: string, j: number) => (
                                <div key={j} className="flex items-center gap-2 py-1 group/sub">
                                    <div className="w-1 h-1 rounded-full bg-gray-700 group-hover/sub:bg-[var(--color)]" style={{ '--color': accentColor } as any} />
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
        <div className={`relative px-5 py-4 rounded-xl border transition-all duration-300 min-w-[280px] backdrop-blur-xl group ${selected ? 'border-[#9d4edd] shadow-[0_0_40px_rgba(157,78,221,0.2)]' : 'border-white/5 hover:border-white/20'}`} style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
            <Handle type="target" position={Position.Top} className="!bg-[#333] !border-none !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-[#333] !border-none !w-2 !h-2" />
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-lg flex items-center justify-center transition-all duration-500 shadow-lg group-hover:scale-110" style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}40`, color: accentColor }}><Icon size={20} /></div>
                {(data.status === 'ACTIVE' || data.status === 'INITIALIZED') && <div className="text-[7px] font-mono text-emerald-500 flex items-center gap-1 animate-pulse uppercase"><Activity size={8} /> {proceduralState}</div>}
            </div>
            <div className="mb-4">
                <div className="text-[13px] font-black font-mono uppercase tracking-[0.15em] text-white truncate">{renderSafe(data.label as any)}</div>
                <div className="text-[9px] font-mono uppercase tracking-tighter text-gray-500 mt-1">{renderSafe(data.subtext as any)}</div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                <span>{data.footerLeft || 'SECTOR_0x'}</span>
                <span className="text-[#9d4edd]">{data.status || 'NOMINAL'}</span>
            </div>
        </div>
    );
};

const AgenticNode = ({ data: nodeData, selected }: NodeProps) => {
    const data = nodeData as AgenticNodeData;
    const accentColor = data.color || '#10b981';
    return (
        <div className={`relative px-6 py-5 rounded-2xl border transition-all duration-500 min-w-[320px] backdrop-blur-3xl group ${selected ? 'border-[#10b981] shadow-[0_0_50px_rgba(16,185,129,0.25)]' : 'border-white/10 hover:border-white/30'}`} style={{ backgroundColor: 'rgba(5, 10, 5, 0.95)' }}>
            <Handle type="target" position={Position.Top} className="!bg-[#222] !w-3 !h-3" />
            <Handle type="source" position={Position.Bottom} className="!bg-[#222] !w-3 !h-3" />
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-500"><Cpu size={24} /></div>
                <div>
                    <div className="text-[14px] font-black font-mono uppercase tracking-[0.2em] text-white">{data.label}</div>
                    <div className="text-[9px] font-bold font-mono text-emerald-500 uppercase tracking-widest mt-0.5">{data.role}</div>
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                    {data.tools?.map((tool: string, i: number) => (
                        <span key={i} className="text-[8px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono">#{tool}</span>
                    ))}
                </div>
                <div className="p-2.5 rounded-lg bg-black border border-white/5 flex items-center justify-between">
                    <div className="text-[8px] font-mono text-gray-500 uppercase">Model Instance</div>
                    <div className="text-[9px] font-black font-mono text-emerald-400">{data.modelType}</div>
                </div>
            </div>
        </div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data: edgeData }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    return (
        <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={1.5} stroke={(edgeData?.color as string) || style?.stroke || '#333'} markerEnd={markerEnd} style={{ ...style, strokeOpacity: 0.6 }} />
    );
};

const ProcessVisualizerContent = () => {
    const { addLog, setMode, process: processData, knowledge } = useAppStore();
    const {
        state, activeTab, onNodesChange, onEdgesChange, onConnect, onPaneContextMenu, onPaneClick, onPaneDoubleClick,
        nodes, edges, animatedNodes, animatedEdges, visualTheme, showGrid, paneContextMenu,
        setPaneContextMenu,
        sequenceStatus, sequenceProgress, selectedNode, architecturePrompt,
        setArchitecturePrompt, getTabLabel, saveGraph, restoreGraph, setState,
        getPriorityBadgeStyle, handleAIAddNode, handleSourceUpload, removeSource, viewSourceAnalysis,
        handleGenerate, handleGenerateGraph, isGeneratingGraph,
        handleExecuteStep, handleResetSimulation, handleDecomposeNode, handleOptimizeNode, handleAutoOrganize,
        handleGenerateIaC, handleRunGlobalSequence
    } = useProcessVisualizerLogic();

    const nodeTypes = useMemo(() => ({ holographic: HolographicNode, agentic: AgenticNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);
    const [selectedWorkflowDomain, setSelectedWorkflowDomain] = useState<'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION'>('GENERAL');
    const [showContext, setShowContext] = useState(false);
    const activeLayers = knowledge.activeLayers || [];

    const ARCHITECTURE_PRESETS = [
        { id: 'SYSTEM_ARCHITECTURE', label: 'Systems Architecture', icon: Server, desc: 'Tiered service infrastructure for cloud native deployments.' },
        { id: 'DRIVE_ORGANIZATION', label: 'Drive Organization', icon: FolderTree, desc: 'PARA-based autonomous knowledge vault management.' },
        { id: 'AGENTIC_ORCHESTRATION', label: 'Swarm Orchestration', icon: BrainCircuit, desc: 'Hierarchical AI swarm tasking and consensus loops.' }
    ];

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-xl shadow-2xl">
            {/* Header / Tab Navigation */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
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

                <div className="flex items-center gap-4">
                    {/* Active Intelligence Context */}
                    <div className="flex gap-1.5 px-3 py-1.5 bg-[#111] border border-white/5 rounded-full mr-4 hidden md:flex">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mr-1">Active Core:</span>
                        {activeLayers.length > 0 ? activeLayers.map(layer => (
                            <div key={layer} className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse" title={layer} />
                        )) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-700" title="Generic Kernel" />
                        )}
                    </div>

                    {activeTab === 'living_map' && (
                        <div className="flex items-center gap-2 mr-4">
                            <button onClick={handleAutoOrganize} className="p-2 bg-[#111] border border-[#333] hover:border-[#22d3ee] rounded text-gray-500 hover:text-[#22d3ee] transition-all" title="Auto-Organize Lattices"><Boxes size={16}/></button>
                            <button onClick={() => handleRunGlobalSequence()} disabled={sequenceStatus === 'RUNNING'} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sequenceStatus === 'RUNNING' ? 'bg-[#f59e0b]/20 text-[#f59e0b] animate-pulse' : 'bg-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_20px_rgba(157,78,221,0.3)]'}`}>
                                <Zap size={14} className={sequenceStatus === 'RUNNING' ? 'animate-spin' : ''} />
                                {sequenceStatus === 'RUNNING' ? 'ORCHESTRATING...' : 'GLOBAL SEQUENCE'}
                            </button>
                        </div>
                    )}
                    <button onClick={() => setShowContext(!showContext)} className={`p-2 rounded border transition-all ${showContext ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] border border-[#333] text-gray-500 hover:text-white'}`} title="Toggle Context Engine"><Database size={16} /></button>
                </div>
            </div>

            {/* Sequence HUD Overlay */}
            <AnimatePresence>
                {sequenceStatus === 'RUNNING' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-96 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#9d4edd] p-4 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" />
                                <span className="text-[10px] font-black font-mono text-[#9d4edd] uppercase tracking-widest">Autonomous Orchestration</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-white">{sequenceProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-[#111] rounded-full overflow-hidden border border-white/5">
                            <motion.div animate={{ width: `${sequenceProgress}%` }} className="h-full bg-[#9d4edd] shadow-[0_0_15px_#9d4edd]" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 relative overflow-hidden bg-[#050505] flex">
                <div className="flex-1 relative h-full w-full">
                    {activeTab === 'living_map' && (
                        <div className="h-full w-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="#111" gap={40} size={1} variant={BackgroundVariant.Dots} style={{ opacity: 0.5 }} />
                                <Controls className="bg-[#111] border border-white/5 text-gray-600" />
                                <MiniMap nodeStrokeColor="#333" nodeColor="#111" maskColor="rgba(0,0,0,0.85)" className="border border-white/5 bg-[#050505] rounded-xl" />
                            </ReactFlow>

                            {/* Autopoietic Toolbox (Left Floating) */}
                            <div className="absolute left-6 top-6 z-30 flex flex-col gap-2 p-2 bg-[#0a0a0a]/80 backdrop-blur border border-[#1f1f1f] rounded-2xl shadow-2xl">
                                <button onClick={handleAutoOrganize} className="p-3 bg-[#111] hover:bg-[#9d4edd] text-gray-500 hover:text-black rounded-xl transition-all" title="Calculate Semantic Layout"><Boxes size={18}/></button>
                                <button onClick={() => addLog('INFO', 'ENTROPY_ANALYSIS: Scanning for cognitive dissonance...')} className="p-3 bg-[#111] hover:bg-[#22d3ee] text-gray-500 hover:text-black rounded-xl transition-all" title="Analyze Entropy"><Activity size={18}/></button>
                                <button onClick={() => setState({ activeTab: 'diagram' })} className="p-3 bg-[#111] hover:bg-[#f59e0b] text-gray-500 hover:text-black rounded-xl transition-all" title="Generate Technical Diagram"><Grid3X3 size={18}/></button>
                                <div className="h-px bg-white/5 mx-2 my-1" />
                                <button onClick={() => setState({ nodes: [], edges: [] })} className="p-3 bg-[#111] hover:bg-red-500 text-gray-500 hover:text-black rounded-xl transition-all" title="Flush Current Lattice"><RotateCcw size={18}/></button>
                            </div>

                            {/* Node Operations Floating Panel */}
                            <AnimatePresence>
                                {selectedNode && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-8 right-8 z-30 w-72 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#333] p-6 rounded-2xl shadow-2xl flex flex-col gap-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-[8px] font-mono text-[#9d4edd] uppercase tracking-widest mb-1">Target Identified</div>
                                                <h3 className="text-sm font-black text-white uppercase truncate font-mono">{selectedNode.data.label as any}</h3>
                                            </div>
                                            <button onClick={() => onNodesChange([{ type: 'select', id: selectedNode.id, selected: false }])} className="text-gray-600 hover:text-white"><X size={16}/></button>
                                        </div>

                                        <div className="space-y-2">
                                            <button onClick={handleDecomposeNode} className="w-full flex items-center justify-between p-3 bg-[#111] hover:bg-[#9d4edd] hover:text-black border border-[#222] rounded-xl transition-all group">
                                                <span className="text-[10px] font-black font-mono uppercase tracking-widest">Decompose Logic</span>
                                                <Atom size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                            </button>
                                            <button onClick={handleOptimizeNode} className="w-full flex items-center justify-between p-3 bg-[#111] hover:bg-[#22d3ee] hover:text-black border border-[#222] rounded-xl transition-all group">
                                                <span className="text-[10px] font-black font-mono uppercase tracking-widest">Optimize Vectors</span>
                                                <Zap size={14} />
                                            </button>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-3">Provisioning Protocols</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => handleGenerateIaC('TERRAFORM')} className="py-2 bg-black border border-[#333] hover:border-white rounded-lg text-[9px] font-mono text-gray-400 hover:text-white uppercase transition-all flex items-center justify-center gap-2">
                                                    <Cloud size={10}/> Terraform
                                                </button>
                                                <button onClick={() => handleGenerateIaC('DOCKER')} className="py-2 bg-black border border-[#333] hover:border-white rounded-lg text-[9px] font-mono text-gray-400 hover:text-white uppercase transition-all flex items-center justify-center gap-2">
                                                    <Package size={10}/> Docker
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    {activeTab === 'workflow' && (
                        <div className="h-full flex flex-col">
                            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[#9d4edd]"><Workflow className="w-5 h-5" /><span className="font-black font-mono text-sm uppercase tracking-widest">Protocol Synthesis</span></div>
                                    <div className="flex bg-black/40 border border-white/5 rounded p-0.5 ml-6">
                                        {['GENERAL', 'DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE', 'AGENTIC_ORCHESTRATION'].map(d => (
                                            <button key={d} onClick={() => setSelectedWorkflowDomain(d as any)} className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === d ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>{d.split('_')[0]}</button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => handleGenerate('workflow')} disabled={state.isLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(157,78,221,0.3)] transition-all hover:scale-105 active:scale-95">
                                    {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                    Forge Protocol
                                </button>
                            </div>
                            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#050505]">
                                {!state.generatedWorkflow ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <Workflow size={64} className="mb-4" />
                                        <p className="text-[10px] font-mono uppercase tracking-widest">Initialize sequence to synthesize protocols.</p>
                                    </div>
                                ) : (
                                    <div className="max-w-6xl mx-auto space-y-10 pb-20">
                                        <ProtocolLoom protocols={state.generatedWorkflow.protocols} type={selectedWorkflowDomain} activeIndex={state.activeStepIndex} onStep={handleExecuteStep} results={state.runtimeResults} onReset={handleResetSimulation} isSimulating={state.isSimulating} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <DirectoryTaxonomy taxonomy={state.generatedWorkflow.taxonomy} type={selectedWorkflowDomain} />
                                            <div className="space-y-4">
                                                {state.generatedWorkflow.protocols?.map((p: any, i: number) => (
                                                    <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 group hover:border-[#9d4edd]/40 transition-all flex gap-6 shadow-lg">
                                                        <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/5 flex items-center justify-center text-[11px] font-black text-gray-600 shrink-0">{i+1}</div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <h3 className="text-[13px] font-black text-white font-mono uppercase tracking-widest">{p.action}</h3>
                                                                <span className={`text-[8px] font-black font-mono px-2 py-1 rounded border tracking-widest ${getPriorityBadgeStyle(p.priority)}`}>{p.priority || 'MEDIUM'}</span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-400 font-mono italic leading-relaxed">"{p.description}"</p>
                                                            <div className="flex gap-4 mt-4 text-[9px] font-mono text-gray-600 uppercase">
                                                                <span className="flex items-center gap-1.5"><User size={10}/> {p.role}</span>
                                                                <span className="flex items-center gap-1.5"><Wrench size={10}/> {p.tool}</span>
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
                    )}
                    {activeTab === 'architect' && (
                        <div className="h-full flex flex-col p-8 bg-black overflow-y-auto custom-scrollbar">
                            <div className="max-w-6xl mx-auto w-full flex-1 flex gap-8">
                                <div className="w-1/3 bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col gap-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={120} className="text-[#9d4edd]" /></div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-12 h-12 bg-[#111] rounded-xl flex items-center justify-center border border-white/5">
                                            <DraftingCompass className="w-6 h-6 text-[#9d4edd]" />
                                        </div>
                                        <h2 className="text-lg font-black font-mono text-white uppercase tracking-[0.2em]">Neural Architect</h2>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Select Architecture Domain</div>
                                        <div className="flex flex-col gap-2">
                                            {ARCHITECTURE_PRESETS.map(preset => (
                                                <button 
                                                    key={preset.id}
                                                    onClick={() => setState({ workflowType: preset.id as any })}
                                                    className={`p-4 rounded-xl border transition-all text-left flex items-start gap-4 ${state.workflowType === preset.id ? 'bg-[#111] border-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.15)]' : 'bg-black border-[#222] opacity-60 hover:opacity-100'}`}
                                                >
                                                    <preset.icon size={20} className={state.workflowType === preset.id ? 'text-[#9d4edd]' : 'text-gray-600'} />
                                                    <div>
                                                        <div className="text-[10px] font-bold text-white uppercase font-mono">{preset.label}</div>
                                                        <div className="text-[8px] text-gray-500 font-mono mt-0.5">{preset.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">Design Directive</label>
                                        <textarea value={architecturePrompt} onChange={(e) => setArchitecturePrompt(e.target.value)} placeholder="Describe the system topology you wish to crystallize..." className="flex-1 w-full bg-[#050505] border border-white/10 rounded-2xl p-5 text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all shadow-inner" />
                                    </div>
                                    
                                    <button onClick={() => handleGenerateGraph()} disabled={isGeneratingGraph || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-5 rounded-2xl font-black font-mono text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(157,78,221,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        {isGeneratingGraph ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                        Construct Blueprint
                                    </button>
                                </div>
                                
                                <div className="flex-1 flex flex-col gap-6">
                                    <div className="flex-1 bg-[#050505] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center opacity-30 text-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.02)_0%,transparent_70%)] group-hover:opacity-100 opacity-0 transition-opacity"></div>
                                        <div className="w-32 h-32 border-2 border-dashed border-gray-700 rounded-full flex items-center justify-center mb-8 relative">
                                            <Layers className="w-12 h-12 text-gray-700" />
                                            <div className="absolute inset-0 rounded-full border border-[#9d4edd]/20 animate-[ping_3s_infinite]" />
                                        </div>
                                        <h3 className="text-lg font-black font-mono text-gray-600 uppercase tracking-widest">Awaiting Manifest</h3>
                                        <p className="text-xs font-mono text-gray-700 max-w-xs mt-4 leading-relaxed">Select a domain and provide a natural language directive. The Autonomous Architect will synthesize a technical lattice and project it onto the Living Map.</p>
                                    </div>
                                    
                                    <div className="h-48 grid grid-cols-2 gap-6">
                                        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 text-[#22d3ee] mb-2 uppercase text-[10px] font-black font-mono"><Target size={14}/> Accuracy Factor</div>
                                            <div className="text-2xl font-mono font-black text-white">94.2%</div>
                                            <div className="text-[8px] text-gray-600 uppercase font-mono mt-1">Grounding Confidence Level</div>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 text-[#42be65] mb-2 uppercase text-[10px] font-black font-mono"><GitBranch size={14}/> Active Sectors</div>
                                            <div className="text-2xl font-mono font-black text-white">{nodes.length} / 50</div>
                                            <div className="text-[8px] text-gray-600 uppercase font-mono mt-1">Lattice Density Status</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'google_nexus' && <NexusAPIExplorer />}
                    {activeTab === 'diagram' && (
                        <div className="h-full w-full flex flex-col p-8 bg-black">
                            <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                                <MermaidDiagram code={state.generatedCode || 'graph TD\n    A[Lattice Empty] --> B[Initialize Architect]'} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Context & Diagnostics */}
                <AnimatePresence>
                    {showContext && (
                        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-l border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col z-30 overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between bg-[#111]">
                                <div className="flex items-center gap-3">
                                    <Activity size={18} className="text-[#22d3ee]" />
                                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Cognitive Diagnostics</span>
                                </div>
                                <button onClick={() => setShowContext(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                <EntropyMeter score={nodes.length > 0 ? 15 + nodes.length * 2 : 0} />

                                <div className="space-y-4">
                                    <div className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                                        <Database size={12} className="text-[#22d3ee]" /> Primary Data Anchors
                                    </div>
                                    <label className="block p-8 border-2 border-dashed border-[#222] rounded-2xl hover:border-[#22d3ee]/40 transition-all cursor-pointer group text-center bg-black/40">
                                        <FileUp className="w-8 h-8 text-gray-700 mx-auto mb-3 group-hover:text-[#22d3ee]" />
                                        <span className="text-[10px] font-black font-mono text-gray-600 uppercase group-hover:text-gray-300">Grounding Matrix</span>
                                        <input type="file" multiple className="hidden" onChange={handleSourceUpload} />
                                    </label>
                                    <div className="space-y-2">
                                        {(state.livingMapContext?.sources || []).map((s: any, i: number) => (
                                            <div key={i} className="p-3 bg-[#111] border border-[#222] rounded-xl flex items-center justify-between group">
                                                <div className="flex items-center gap-3 truncate">
                                                    <FileText size={14} className="text-gray-600 shrink-0" />
                                                    <span className="text-[10px] font-mono text-gray-300 truncate">{s.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => viewSourceAnalysis(s)} className="p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-[#22d3ee] transition-all"><Eye size={14}/></button>
                                                    <button onClick={() => removeSource(i)} className="p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-black/60 border border-[#222] rounded-2xl space-y-4 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={48} className="text-[#f59e0b]" /></div>
                                    <div className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">Active Capacities</div>
                                    <div className="flex flex-wrap gap-2">
                                        {['RAG_INDEX', 'FLOW_FORGE', 'CODE_IAC', 'TTS_OVERVIEW'].map(tag => (
                                            <span key={tag} className="text-[8px] px-2 py-0.5 rounded-full bg-[#111] border border-white/5 text-[#f59e0b] font-mono">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-[#0a0a0a] border-t border-[#1f1f1f] text-center">
                                <button onClick={() => handleGenerateIaC('TERRAFORM')} className="w-full py-3 bg-[#111] border border-[#333] hover:border-white rounded-xl text-[10px] font-black font-mono text-gray-500 hover:text-white uppercase transition-all flex items-center justify-center gap-3">
                                    <HardDriveDownload size={14} /> Export Manifest
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;
