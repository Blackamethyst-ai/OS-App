
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

const ProtocolLoom: React.FC<{ protocols: any[], type?: string, activeIndex: number | null, onStep: (idx: number) => void, results: Record<number, any>, onReset: () => void, isSimulating: boolean }> = ({ protocols, type, activeIndex, onStep, results, onReset, isSimulating }) => {
    if (!protocols || protocols.length === 0) return null;

    const accentColor = type === 'DRIVE_ORGANIZATION' ? '#22d3ee' : type === 'SYSTEM_ARCHITECTURE' ? '#f59e0b' : type === 'AGENTIC_ORCHESTRATION' ? '#10b981' : '#9d4edd';

    return (
        <div className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-8 overflow-x-auto custom-scrollbar relative">
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
                                
                                <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
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
    const accentColor = type === 'AGENTIC_ORCHESTRATION' ? '#10b981' : type === 'DRIVE_ORGANIZATION' ? '#22d3ee' : '#f59e0b';
    const Icon = type === 'AGENTIC_ORCHESTRATION' ? BrainCircuit : FolderTree;
    const title = type?.replace('_', ' ') || 'Logical Directory Topology';
    
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1f1f1f] pb-4">
                <Icon className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">{title}</h3>
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
    const { addLog, setMode } = useAppStore();
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
    const [selectedWorkflowDomain, setSelectedWorkflowDomain] = useState<'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION'>('GENERAL');

    const triggerGenerate = (type: string) => {
        useAppStore.getState().setProcessState({ workflowType: selectedWorkflowDomain });
        handleGenerate(type);
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-xl shadow-2xl">
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
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#050505] flex">
                <div className="flex-1 relative h-full w-full">
                    {activeTab === 'living_map' && (
                        <div className="h-full w-full relative">
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
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
                                        {['GENERAL', 'DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE', 'AGENTIC_ORCHESTRATION'].map(d => (
                                            <button key={d} onClick={() => setSelectedWorkflowDomain(d as any)} className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${selectedWorkflowDomain === d ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>{d.split('_')[0]}</button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => triggerGenerate('workflow')} disabled={state.isLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(157,78,221,0.3)] transition-all hover:scale-105 active:scale-95">
                                    {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                    Forge Protocol
                                </button>
                            </div>
                            <div className="flex-1 flex overflow-hidden">
                                <div className="flex-1 bg-[#050505] p-10 overflow-y-auto custom-scrollbar">
                                    {!state.generatedWorkflow ? (
                                        <div className="h-full flex flex-col items-center justify-center p-12">
                                            <Workflow className="w-20 h-20 mb-6 text-[#9d4edd] opacity-30 animate-pulse" />
                                            <h3 className="font-black font-mono text-base uppercase tracking-[0.4em] text-white mb-3 text-center">Blueprint Matrix</h3>
                                            <p className="text-[10px] text-gray-700 font-mono uppercase tracking-widest text-center">Select domain to synthesize structured processes.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 max-w-5xl mx-auto pb-20">
                                            <ProtocolLoom protocols={state.generatedWorkflow.protocols} type={selectedWorkflowDomain} activeIndex={state.activeStepIndex} onStep={handleExecuteStep} results={state.runtimeResults} onReset={handleResetSimulation} isSimulating={state.isSimulating} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <DirectoryTaxonomy taxonomy={state.generatedWorkflow.taxonomy} type={selectedWorkflowDomain} />
                                                <div className="space-y-4">
                                                    <div className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap className="w-3 h-3 text-[#9d4edd]" /> Executable steps</div>
                                                    {state.generatedWorkflow.protocols?.map((p: any, i: number) => (
                                                        <div key={i} className={`bg-[#0a0a0a] border ${state.activeStepIndex === i ? 'border-[#10b981]' : 'border-white/5'} rounded-2xl p-6 group hover:border-[#9d4edd]/40 transition-all flex gap-6 shadow-lg relative overflow-hidden`}>
                                                            <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/5 flex items-center justify-center text-[11px] font-black text-gray-600 shrink-0 group-hover:text-white transition-colors">{i+1}</div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <h3 className="text-[13px] font-black text-white font-mono uppercase tracking-widest">{p.action}</h3>
                                                                    <span className={`text-[8px] font-black font-mono px-2 py-1 rounded border tracking-widest ${getPriorityBadgeStyle(p.priority)}`}>{p.priority || 'MEDIUM'}</span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-400 leading-relaxed font-mono mt-1 italic">"{p.description}"</p>
                                                                <div className="flex gap-6 mt-4 pt-4 border-t border-white/5 text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">
                                                                    <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {p.role}</span>
                                                                    <span className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> {p.tool}</span>
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
                                    <div className="text-center"><div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center border border-white/5 mx-auto mb-6"><DraftingCompass className="w-10 h-10 text-[#9d4edd]" /></div><h2 className="text-xl font-black font-mono text-white uppercase tracking-[0.2em]">Neural Architect</h2></div>
                                    <textarea value={architecturePrompt} onChange={(e) => setArchitecturePrompt(e.target.value)} placeholder="Describe your system topology..." className="w-full h-48 bg-[#050505] border border-[#10 border-white/10 rounded-2xl p-5 text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all shadow-inner" />
                                    <button onClick={() => { handleGenerateGraph(); }} disabled={isGeneratingGraph || !architecturePrompt || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-5 rounded-2xl font-black font-mono text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(157,78,221,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        {isGeneratingGraph ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                        Construct Blueprint
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'google_nexus' && (
                        <div className="h-full w-full bg-[#030303] flex flex-col">
                             <NexusAPIExplorer />
                        </div>
                    )}
                    {activeTab === 'diagram' && (
                        <div className="h-full w-full flex flex-col p-8 bg-black">
                            <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                                <MermaidDiagram code={state.generatedCode || 'graph TD\n    A[Lattice Empty] --> B[Initialize Architect or Workflow Synthesis]'} />
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
