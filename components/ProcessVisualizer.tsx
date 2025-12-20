import React, { useState, useMemo, useCallback } from 'react';
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
    FolderTree, Terminal, Settings2, User, Copy, ExternalLink, Globe, ArrowRight, PieChart, ShieldAlert, Thermometer, Bell, FolderSync, Plus, Maximize, Stethoscope, FileJson, Trash2, GitBranch
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { AppTheme, AppMode } from '../types';
import MermaidDiagram from './MermaidDiagram';
import NexusAPIExplorer from './NexusAPIExplorer';
import { useProcessVisualizerLogic, THEME } from '../hooks/useProcessVisualizerLogic';
import { renderSafe } from '../utils/renderSafe';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const ProtocolLoom: React.FC<{ protocols: any[], type?: string }> = ({ protocols, type }) => {
    if (!protocols || protocols.length === 0) return null;

    const accentColor = type === 'DRIVE_ORGANIZATION' ? '#22d3ee' : type === 'SYSTEM_ARCHITECTURE' ? '#f59e0b' : '#9d4edd';

    return (
        <div className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-8 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 mb-6 border-b border-[#1f1f1f] pb-3">
                <Activity className="w-4 h-4" style={{ color: accentColor }} />
                <h3 className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-[0.2em]">Protocol Loom // Sequence Visualization</h3>
            </div>
            
            <div className="flex items-center gap-0 pb-4 min-w-max">
                {protocols.map((p, i) => (
                    <React.Fragment key={i}>
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`
                                relative w-64 bg-black border p-4 rounded-xl shrink-0 group transition-all
                                ${p.priority === 'HIGH' ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-[#222] hover:border-[#9d4edd]'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black font-mono px-1.5 rounded" style={{ color: accentColor, backgroundColor: `${accentColor}15` }}>STEP_{String(p.step || i+1).padStart(2, '0')}</span>
                                {p.priority === 'HIGH' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />}
                            </div>
                            <h4 className="text-[11px] font-bold text-white font-mono mb-2 truncate group-hover:text-[#22d3ee] transition-colors">{p.action}</h4>
                            <div className="flex items-center gap-2 text-[8px] font-mono text-gray-600 uppercase">
                                <User className="w-2.5 h-2.5" /> {p.role}
                            </div>
                            
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-[#333]" />
                        </motion.div>
                        
                        {i < protocols.length - 1 && (
                            <div className="w-12 h-px bg-gradient-to-r from-[#9d4edd] to-[#3b82f6] opacity-40 shrink-0 self-center mx-1 flex items-center justify-center">
                                <ArrowRight className="w-3 h-3 text-[#3b82f6]" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

const ArchitecturalResonancePlot: React.FC<{ nodes: any[] }> = ({ nodes }) => {
    const data = useMemo(() => {
        return nodes.map(n => ({
            name: n.data.label,
            complexity: Math.random() * 100,
            resilience: Math.random() * 100,
            impact: 100 + Math.random() * 400
        }));
    }, [nodes]);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                        <Activity className="w-3 h-3 text-[#22d3ee]" /> System Resonance Matrix
                    </h3>
                    <p className="text-[8px] text-gray-600 font-mono mt-1 uppercase">Complexity vs Resilience Mapping</p>
                </div>
            </div>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis type="number" dataKey="complexity" name="complexity" unit="%" stroke="#444" tick={{ fontSize: 8, fontFamily: 'monospace' }} />
                        <YAxis type="number" dataKey="resilience" name="resilience" unit="%" stroke="#444" tick={{ fontSize: 8, fontFamily: 'monospace' }} />
                        <ZAxis type="number" dataKey="impact" range={[50, 400]} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px' }} />
                        <Scatter name="Logic Nodes" data={data}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.resilience < 40 && entry.complexity > 60 ? '#ef4444' : entry.resilience > 70 ? '#10b981' : '#9d4edd'} fillOpacity={0.6} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const JsonTreeViewer: React.FC<{ data: any; label?: string; level?: number }> = ({ data, label, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2);
    if (data === null || data === undefined) return <div className="pl-2 text-gray-600 font-mono text-[10px]">{label ? `${label}: ` : ''}null</div>;
    const isObject = typeof data === 'object';
    const isArray = Array.isArray(data);
    if (!isObject) return <div className="pl-2 flex gap-2 font-mono text-[10px]">{label && <span className="text-gray-500">{label}:</span>}<span className="text-[#9d4edd] break-all">{String(data)}</span></div>;
    const keys = Object.keys(data);
    if (keys.length === 0) return <div className="pl-2 text-gray-600 font-mono text-[10px]">{label ? `${label}: ` : ''}{isArray ? '[]' : '{}'}</div>;
    return (
        <div className="pl-2 font-mono text-[10px]">
            <div className="flex items-center gap-2 cursor-pointer hover:text-white text-gray-400 select-none py-0.5" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span className={`font-bold ${level === 0 ? 'text-[#42be65]' : 'text-[#22d3ee]'}`}>{label || (isArray ? `List [${keys.length}]` : 'Object')}</span>
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-2 border-l border-[#333] ml-1 overflow-hidden">
                        {keys.map(key => <JsonTreeViewer key={key} label={isArray ? undefined : key} data={data[key]} level={level + 1} />)}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const HolographicNode = ({ data: nodeData, selected }: NodeProps) => {
    const data = nodeData as any;
    const Icon = (Icons as any)[data.iconName as string] || Icons.Box;
    const accentColor = data.color || '#9d4edd';

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
                {data.status && (
                    <div className="px-2 py-0.5 rounded-sm text-[8px] font-black bg-white/5 border border-white/10 text-gray-500 uppercase tracking-widest">
                        {data.status}
                    </div>
                )}
            </div>

            <div className="mb-4">
                <div className="text-[13px] font-black font-mono uppercase tracking-[0.15em] text-white truncate group-hover:text-[#22d3ee] transition-colors">{renderSafe(data.label)}</div>
                <div className="text-[9px] font-mono uppercase tracking-tighter text-gray-500 mt-1">{renderSafe(data.subtext)}</div>
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
                        {data.footerRight || 'SYSTEM_CORE'}
                    </div>
                </div>
                <div className="text-[8px] font-black font-mono text-gray-400 uppercase tracking-widest">
                    {data.footerLeft || 'ACTIVE_LAYER'}
                </div>
            </div>
        </div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data: edgeData }: EdgeProps) => {
    const data = edgeData as any;
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    return (
        <>
            <path 
                id={id} 
                className="react-flow__edge-path" 
                d={edgePath} 
                strokeWidth={1.5} 
                stroke={data?.color || style?.stroke || '#333'} 
                markerEnd={markerEnd} 
                style={{ ...style, strokeOpacity: 0.2 }} 
            />
            {data?.variant === 'stream' && (
                <circle r="2" fill={data?.color || style?.stroke || '#9d4edd'}>
                    <animateMotion dur="4s" repeatCount="indefinite" path={edgePath} />
                </circle>
            )}
        </>
    );
};

const ProcessVisualizerContent = () => {
    const { addLog, setMode } = useAppStore();
    const { fitView } = useReactFlow();
    const {
        state, activeTab, onNodesChange, onEdgesChange, onConnect, onPaneContextMenu, onPaneClick, onPaneDoubleClick,
        nodes, edges, animatedNodes, animatedEdges, visualTheme, showGrid, toggleGrid,
        addNodeAtPosition, handleGenerateGraph, handleDecomposeNode, handleOptimizeNode, handleGenerateIaC,
        handleRunGlobalSequence, handleGenerate, isGeneratingGraph, isOptimizing, paneContextMenu,
        setPaneContextMenu,
        sequenceStatus, sequenceProgress, selectedNode, architecturePrompt,
        setArchitecturePrompt, getTabLabel, saveGraph, restoreGraph, setState,
        getPriorityBadgeStyle, handleAIAddNode, handleSourceUpload, removeSource, viewSourceAnalysis
    } = useProcessVisualizerLogic();

    const nodeTypes = useMemo(() => ({ holographic: HolographicNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);
    const [showSources, setShowSources] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [selectedWorkflowDomain, setSelectedWorkflowDomain] = useState<'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE'>('GENERAL');

    const triggerGenerate = (type: string) => {
        useAppStore.getState().setProcessState({ workflowType: selectedWorkflowDomain });
        handleGenerate(type);
    };

    const handleAiSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (aiInput.trim()) {
            handleAIAddNode(aiInput);
            setAiInput('');
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-xl shadow-2xl">
            <div className="h-16 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded shadow-[0_0_15px_rgba(157,78,221,0.3)]"><BrainCircuit className="w-4 h-4 text-[#9d4edd]" /></div>
                        <div><h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Process Logic Core</h1><p className="text-[9px] text-gray-500 font-mono">Autonomous System Architect</p></div>
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
                    <button 
                        onClick={() => setShowSources(!showSources)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${showSources ? 'bg-[#22d3ee]/10 border-[#22d3ee] text-[#22d3ee]' : 'bg-[#111] border-white/5 text-gray-500 hover:text-white'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Sources {state.livingMapContext.sources?.length > 0 && `(${state.livingMapContext.sources.length})`}
                    </button>
                    <button onClick={handleRunGlobalSequence} disabled={sequenceStatus === 'RUNNING'} className={`flex items-center gap-2 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${sequenceStatus === 'RUNNING' ? 'bg-[#9d4edd]/10 border-[#9d4edd] text-[#9d4edd]' : 'bg-[#1f1f1f] border-white/5 text-white hover:bg-[#222]'}`}>
                        {sequenceStatus === 'RUNNING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}{sequenceStatus === 'RUNNING' ? `Sequencing ${sequenceProgress}%` : 'Run Global Sequence'}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#050505] flex">
                
                {/* Floating System Topology Panel (Top-Left HUD) */}
                <div className="absolute top-6 left-6 z-50 pointer-events-none flex flex-col gap-4">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl min-w-[320px] pointer-events-auto"
                    >
                        <div className="text-[14px] font-black font-mono text-[#d946ef] uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                             <div className="w-1.5 h-6 bg-[#d946ef] rounded-full" />
                             System Topology
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Nodes: <span className="text-white font-black">{nodes.length}</span></span>
                            <span className="flex items-center gap-1.5"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Edges: <span className="text-white font-black">{edges.length}</span></span>
                            <span className="flex items-center gap-1.5 ml-auto"><div className="w-1 h-1 bg-[#42be65] rounded-full animate-pulse"/> Status: <span className="text-[#42be65] font-black">STABLE</span></span>
                        </div>
                    </motion.div>

                    {/* AI Node Command Bar */}
                    <motion.form 
                        onSubmit={handleAiSubmit}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto w-[400px] group focus-within:border-[#9d4edd]/50 transition-colors"
                    >
                        <div className="p-2 text-[#9d4edd]"><Sparkles size={16} /></div>
                        <input 
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            placeholder="Forge logic node from description..."
                            className="bg-transparent border-none outline-none text-xs font-mono text-white flex-1 placeholder:text-gray-700"
                        />
                        <button type="submit" disabled={!aiInput.trim()} className="p-2 bg-[#9d4edd] text-black rounded-xl hover:bg-[#b06bf7] transition-all disabled:opacity-50">
                            <Plus size={16} />
                        </button>
                    </motion.form>
                </div>

                {/* Floating Node Inspector (Bottom-Right) */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="absolute bottom-6 right-6 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-[380px] pointer-events-auto overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent opacity-50" />
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-xl text-[#22d3ee]">
                                        <Info size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black font-mono text-white uppercase tracking-widest">{selectedNode.data.label}</h3>
                                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{selectedNode.data.subtext}</p>
                                    </div>
                                </div>
                                <button onClick={() => setState({ nodes: nodes.map(n => n.id === selectedNode.id ? { ...n, selected: false } : n) })} className="text-gray-500 hover:text-white"><X size={16} /></button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-2">Diagnostic Scan</span>
                                    <p className="text-[11px] text-gray-400 font-mono leading-relaxed italic">"Logic node operating within nominal structural parameters. Ready for decomposition or optimization."</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <button 
                                    onClick={handleDecomposeNode} 
                                    className="w-full py-3 bg-[#111] hover:bg-[#22d3ee] hover:text-black border border-white/5 hover:border-[#22d3ee] rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
                                >
                                    <GitBranch size={14} className="group-hover:rotate-90 transition-transform" /> Decompose Structure
                                </button>
                                <button 
                                    onClick={handleOptimizeNode}
                                    className="w-full py-3 bg-[#111] hover:bg-[#9d4edd] hover:text-black border border-white/5 hover:border-[#9d4edd] rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                >
                                    {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />} Optimize Logic
                                </button>
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                                    <button onClick={() => handleGenerateIaC('TERRAFORM')} className="py-2.5 bg-black hover:bg-white/5 border border-white/10 rounded-lg text-[8px] font-black font-mono uppercase text-gray-400 flex items-center justify-center gap-2"><Cloud size={12} /> HCL_IAX</button>
                                    <button onClick={() => handleGenerateIaC('DOCKER')} className="py-2.5 bg-black hover:bg-white/5 border border-white/10 rounded-lg text-[8px] font-black font-mono uppercase text-gray-400 flex items-center justify-center gap-2"><Box size={12} /> DOCKER_COMPOSE</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showSources && (
                        <motion.div 
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            className="w-72 bg-[#0a0a0a] border-r border-white/5 z-30 flex flex-col"
                        >
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#111]">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5 text-[#22d3ee]" /> Source Context
                                </h3>
                                <button onClick={() => setShowSources(false)}><X className="w-4 h-4 text-gray-500 hover:text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                <label className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all cursor-pointer group">
                                    <FileUp className="w-8 h-8 text-gray-700 group-hover:text-[#9d4edd] mb-3" />
                                    <span className="text-[10px] font-black font-mono text-gray-600 uppercase tracking-widest">Ingest Materials</span>
                                    <input type="file" multiple className="hidden" onChange={handleSourceUpload} />
                                </label>
                                <div className="space-y-2">
                                    {state.livingMapContext.sources?.length === 0 ? (
                                        <p className="text-[10px] text-gray-700 font-mono italic text-center pt-6 uppercase tracking-widest">Zero Data Points</p>
                                    ) : (
                                        state.livingMapContext.sources.map((source: any, i: number) => (
                                            <div key={i} className="bg-[#111] border border-white/5 p-3.5 rounded-xl group hover:border-[#9d4edd]/50 transition-all relative">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-black text-gray-300 truncate max-w-[150px] uppercase font-mono">{source.name}</span>
                                                    <button onClick={() => removeSource(i)} className="text-gray-700 hover:text-red-500 transition-colors"><X size={12} /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1 relative">
                    {activeTab === 'living_map' && (
                        <div className="h-full w-full relative">
                            <ReactFlow 
                                nodes={animatedNodes} 
                                edges={animatedEdges} 
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

                            {/* Custom Context Menu UI */}
                            <AnimatePresence>
                                {paneContextMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        style={{ top: paneContextMenu.y, left: paneContextMenu.x }}
                                        className="fixed z-[100] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px] p-1.5"
                                    >
                                        <div className="px-3 py-1.5 text-[8px] font-mono text-gray-600 uppercase tracking-widest border-b border-white/5 mb-1">Topology Commands</div>
                                        <button onClick={() => { addNodeAtPosition(paneContextMenu.flowPos, 'holographic', 'Core Logic', '#9d4edd'); setPaneContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-xs font-mono text-gray-300 transition-colors text-left"><Plus size={14} className="text-[#9d4edd]" /> Add Manual Node</button>
                                        <button onClick={() => { handleRunGlobalSequence(); setPaneContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-xs font-mono text-gray-300 transition-colors text-left"><Play size={14} className="text-[#42be65]" /> Sequence Logic</button>
                                        <button onClick={() => { fitView(); setPaneContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-xs font-mono text-gray-300 transition-colors text-left"><Maximize size={14} className="text-[#22d3ee]" /> Focus Topology</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
                                    <textarea value={architecturePrompt} onChange={(e) => setArchitecturePrompt(e.target.value)} placeholder="ENTER ARCHITECTURAL DIRECTIVE..." className="w-full h-56 bg-[#050505] border border-white/10 rounded-2xl p-5 text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800" />
                                    <button onClick={() => { handleGenerateGraph(); }} disabled={isGeneratingGraph || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-5 rounded-2xl font-black font-mono text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(157,78,221,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        {isGeneratingGraph ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                        Construct Blueprint
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <ArchitecturalResonancePlot nodes={nodes} />
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'google_nexus' && <NexusAPIExplorer />}
                    {activeTab === 'diagram' && (
                        <div className="h-full flex flex-col p-6 bg-[#0a0a0a]">
                            <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2"><Grid3X3 className="w-5 h-5 text-[#9d4edd]" /><span className="text-sm font-bold font-mono text-white uppercase tracking-widest">Schematic Visualization</span></div><div className="flex gap-2"><button onClick={() => handleGenerate('diagram')} disabled={state.isLoading} className="text-[10px] flex items-center gap-2 text-gray-400 hover:text-white border border-white/5 px-3 py-1.5 rounded transition-colors uppercase font-black"><RefreshCw className="w-3 h-3" /> Regenerate</button></div></div>
                            <div className="flex-1 bg-black border border-white/5 rounded-2xl overflow-hidden relative shadow-inner">{state.isLoading ? <div className="absolute inset-0 flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-4" /><p className="text-[10px] font-black font-mono text-gray-600 uppercase tracking-[0.3em] animate-pulse">Rendering Physical Topology...</p></div> : state.generatedCode ? <MermaidDiagram code={state.generatedCode} /> : <div className="h-full flex items-center justify-center text-gray-800 opacity-20"><Grid3X3 className="w-24 h-24" /></div>}</div>
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
                                <div className="w-[350px] border-r border-white/5 bg-[#080808] p-6 overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center gap-2 text-gray-600 text-[9px] font-black font-mono uppercase tracking-widest mb-6 border-b border-white/5 pb-3">
                                        {selectedWorkflowDomain === 'DRIVE_ORGANIZATION' ? <FolderTree className="w-3.5 h-3.5" /> : selectedWorkflowDomain === 'SYSTEM_ARCHITECTURE' ? <Terminal className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
                                        Logical Structure
                                    </div>
                                    <JsonTreeViewer data={state.generatedWorkflow || {}} />
                                </div>
                                <div className="flex-1 bg-[#050505] p-10 overflow-y-auto custom-scrollbar">
                                    {!state.generatedWorkflow ? (
                                        <div className="h-full flex flex-col items-center justify-center p-12">
                                            <div className="max-w-2xl w-full space-y-12">
                                                <div className="text-center">
                                                    <Workflow className="w-20 h-20 mb-6 text-[#9d4edd] mx-auto opacity-30 animate-pulse" />
                                                    <h3 className="font-black font-mono text-base uppercase tracking-[0.4em] text-white mb-3">Protocol Blueprint Matrix</h3>
                                                    <p className="text-[10px] text-gray-700 font-mono uppercase tracking-widest leading-relaxed">Select a domain-specific logic template to initialize autonomic synthesis.</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('DRIVE_ORGANIZATION'); triggerGenerate('workflow'); }}
                                                        className="p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-[#22d3ee]/50 transition-all text-left group shadow-2xl relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#22d3ee]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#22d3ee]/10 transition-all"></div>
                                                        <FolderSync className="w-10 h-10 text-[#22d3ee] mb-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 font-mono">Drive Organization</h4>
                                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">PARA method implementation with ISO naming standards and automated lifecycle logic.</p>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('SYSTEM_ARCHITECTURE'); triggerGenerate('workflow'); }}
                                                        className="p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-[#f59e0b]/50 transition-all text-left group shadow-2xl relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f59e0b]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#f59e0b]/10 transition-all"></div>
                                                        <Server className="w-10 h-10 text-[#f59e0b] mb-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 font-mono">System Architecture</h4>
                                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">High-availability topology with Zero-Trust mesh protocols and autopoietic redundancy.</p>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 max-w-5xl mx-auto pb-20">
                                            <ProtocolLoom protocols={state.generatedWorkflow.protocols} type={selectedWorkflowDomain} />

                                            {selectedWorkflowDomain === 'DRIVE_ORGANIZATION' && state.generatedWorkflow.taxonomy && (
                                                <div className="p-8 bg-[#0a0a0a] border border-[#22d3ee]/20 rounded-3xl relative overflow-hidden group shadow-2xl">
                                                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                                        <FolderTree className="w-32 h-32 text-[#22d3ee]" />
                                                    </div>
                                                    <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                                        <h3 className="text-[#22d3ee] font-black font-mono text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                                                            <FolderSync className="w-5 h-5" /> Proposed Directory Topology
                                                        </h3>
                                                        <button 
                                                            onClick={() => setMode(AppMode.MEMORY_CORE)}
                                                            className="text-[9px] font-black font-mono text-[#22d3ee] bg-[#22d3ee]/5 px-4 py-2 rounded-xl border border-[#22d3ee]/20 hover:bg-[#22d3ee] hover:text-black transition-all shadow-lg"
                                                        >
                                                            Apply to Memory Core
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-6 relative z-10">
                                                        {state.generatedWorkflow.taxonomy.root?.map((folder: any, i: number) => (
                                                            <div key={i} className="flex flex-col gap-3 border-l-2 border-white/10 pl-6 py-2 hover:border-[#22d3ee]/50 transition-colors">
                                                                <div className="text-white font-black font-mono text-[13px] uppercase tracking-widest">/{folder.folder}</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {folder.subfolders?.map((sub: string, j: number) => (
                                                                        <span key={j} className="text-[9px] font-bold font-mono text-gray-500 bg-[#111] px-2 py-1 rounded-md border border-white/5 uppercase">/{sub}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-4">
                                                {state.generatedWorkflow.protocols?.map((p: any, i: number) => (
                                                    <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 group hover:border-[#9d4edd]/40 transition-all flex gap-6 shadow-lg">
                                                        <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/5 flex items-center justify-center text-[11px] font-black text-gray-600 shrink-0 group-hover:text-white transition-colors">{p.step || i+1}</div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <h3 className="text-[13px] font-black text-white font-mono uppercase tracking-widest">{p.action}</h3>
                                                                <span className={`text-[8px] font-black font-mono px-2 py-1 rounded border tracking-widest ${getPriorityBadgeStyle(p.priority)}`}>{p.priority || 'MEDIUM'}</span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-400 leading-relaxed font-mono mb-4 italic">"{p.description}"</p>
                                                            <div className="flex gap-6 text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">
                                                                <span className="flex items-center gap-2 border-r border-white/10 pr-6"><User className="w-3.5 h-3.5 text-[#22d3ee]" /> {p.role}</span>
                                                                <span className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-[#f59e0b]" /> {p.tool}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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