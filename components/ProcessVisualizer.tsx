import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ReactFlow, Background, Controls, MiniMap, 
    NodeProps, EdgeProps, BackgroundVariant, ReactFlowProvider,
    Handle, Position, getSmoothStepPath
} from '@xyflow/react';
import { 
    BrainCircuit, X, Activity, Database, Zap, Wrench, 
    Atom, ChevronDown, ChevronRight, Grid3X3, 
    Map, Box, Play, Download, AlertCircle, CheckCircle, RefreshCw,
    DraftingCompass, Server, Layers, Workflow, Volume1,
    HardDriveDownload, Network as NetworkIcon,
    Save, VolumeX, Lightbulb, Search, Loader2, Code, Cloud,
    ShieldCheck, Sparkles, FileText, Upload, Eye, FileUp, Info,
    FolderTree, Terminal, Settings2, User, Copy, ExternalLink, Globe, ArrowRight, PieChart, ShieldAlert, Thermometer, Bell, FolderSync
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppStore } from '../store';
import { AppTheme, AppMode } from '../types';
import MermaidDiagram from './MermaidDiagram';
import NexusAPIExplorer from './NexusAPIExplorer';
import { useProcessVisualizerLogic, VISUAL_THEMES } from '../hooks/useProcessVisualizerLogic';
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
    const theme = VISUAL_THEMES[data.theme as AppTheme] || VISUAL_THEMES.DARK;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className={`relative group px-4 py-3 rounded-lg border transition-all duration-300 min-w-[180px] backdrop-blur-md ${selected ? 'border-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.3)] bg-[#9d4edd]/10' : 'border-[#333] hover:border-gray-500'}`} 
            style={{ backgroundColor: theme.nodeBg }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${selected ? 'text-[#9d4edd]' : 'text-gray-400'}`} style={{ backgroundColor: selected ? 'rgba(157,78,221,0.1)' : 'rgba(255,255,255,0.05)' }}><Icon size={20} /></div>
                <div><div className="text-xs font-bold font-mono uppercase tracking-wider" style={{ color: theme.text }}>{renderSafe(data.label)}</div><div className="text-[9px] font-mono uppercase" style={{ color: theme.subtext }}>{renderSafe(data.subtext)}</div></div>
            </div>
            {data.status && <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#111] border border-[#333] text-gray-400 uppercase tracking-wider">{renderSafe(data.status)}</div>}
            
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-[#0a0a0a] border border-[#333] p-3 rounded-lg shadow-2xl z-[1000] pointer-events-none"
                    >
                        <div className="flex items-center gap-2 mb-2 border-b border-[#222] pb-1.5">
                            <Info className="w-3 h-3 text-[#9d4edd]" />
                            <span className="text-[10px] font-bold font-mono uppercase text-white">{renderSafe(data.label)}</span>
                        </div>
                        <p className="text-[9px] font-mono text-gray-400 leading-relaxed mb-2">
                            {renderSafe(data.description || `Autonomous module executing ${data.label} logic. Part of core structural integrity.`)}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CinematicEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data: edgeData }: EdgeProps) => {
    const data = edgeData as any;
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} strokeWidth={style?.strokeWidth} stroke={style?.stroke} markerEnd={markerEnd} style={style} />
            {data?.variant === 'stream' && <circle r="2" fill={style?.stroke}><animateMotion dur="2s" repeatCount="indefinite" path={edgePath} /></circle>}
        </>
    );
};

const ProcessVisualizerContent = () => {
    const { addLog, setMode } = useAppStore();
    const {
        state, activeTab, onNodesChange, onEdgesChange, onConnect, onPaneContextMenu, onPaneClick, onPaneDoubleClick,
        nodes, edges, animatedNodes, animatedEdges, visualTheme, showGrid, toggleGrid,
        addNodeAtPosition, handleGenerateGraph, handleDecomposeNode, handleOptimizeNode, handleGenerateIaC,
        handleRunGlobalSequence, handleGenerate, isGeneratingGraph, isOptimizing, paneContextMenu,
        sequenceStatus, sequenceProgress, selectedNode, architecturePrompt,
        setArchitecturePrompt, getTabLabel, saveGraph, restoreGraph, setState,
        getPriorityBadgeStyle, handleAIAddNode, handleSourceUpload, removeSource, viewSourceAnalysis
    } = useProcessVisualizerLogic();

    const nodeTypes = useMemo(() => ({ holographic: HolographicNode }), []);
    const edgeTypes = useMemo(() => ({ cinematic: CinematicEdge }), []);
    const [showSources, setShowSources] = useState(false);
    const [selectedWorkflowDomain, setSelectedWorkflowDomain] = useState<'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE'>('GENERAL');

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
                        <div><h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Process Logic Core</h1><p className="text-[9px] text-gray-500 font-mono">Autonomous System Architect</p></div>
                    </div>
                    <div className="flex bg-[#111] p-1 rounded border border-[#333] ml-4">
                        {[
                            { id: 'living_map', icon: Map },
                            { id: 'architect', icon: DraftingCompass },
                            { id: 'google_nexus', icon: Globe },
                            { id: 'diagram', icon: Grid3X3 },
                            { id: 'workflow', icon: Workflow }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setState({ activeTab: tab.id })} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                                <tab.icon className="w-3 h-3" />
                                <span className="hidden xl:inline">{getTabLabel(tab.id)}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowSources(!showSources)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${showSources ? 'bg-[#22d3ee]/10 border-[#22d3ee] text-[#22d3ee]' : 'bg-[#111] border-[#333] text-gray-400 hover:text-white'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Sources {state.livingMapContext.sources?.length > 0 && `(${state.livingMapContext.sources.length})`}
                    </button>
                    <button onClick={handleRunGlobalSequence} disabled={sequenceStatus === 'RUNNING'} className={`flex items-center gap-2 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${sequenceStatus === 'RUNNING' ? 'bg-[#9d4edd]/10 border-[#9d4edd] text-[#9d4edd]' : 'bg-[#1f1f1f] border-[#333] text-white hover:bg-[#222]'}`}>
                        {sequenceStatus === 'RUNNING' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}{sequenceStatus === 'RUNNING' ? `Sequencing ${sequenceProgress}%` : 'Run Global Sequence'}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#050505] flex">
                <AnimatePresence>
                    {showSources && (
                        <motion.div 
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            className="w-72 bg-[#0a0a0a] border-r border-[#1f1f1f] z-30 flex flex-col"
                        >
                            <div className="p-4 border-b border-[#1f1f1f] flex justify-between items-center bg-[#111]">
                                <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Database className="w-3 h-3 text-[#22d3ee]" /> Source Context
                                </h3>
                                <button onClick={() => setShowSources(false)}><X className="w-3.5 h-3.5 text-gray-500 hover:text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#333] rounded-xl hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all cursor-pointer group">
                                    <FileUp className="w-6 h-6 text-gray-600 group-hover:text-[#9d4edd] mb-2" />
                                    <span className="text-[10px] font-mono text-gray-500 uppercase">Ingest Materials</span>
                                    <input type="file" multiple className="hidden" onChange={handleSourceUpload} />
                                </label>
                                <div className="space-y-2">
                                    {state.livingMapContext.sources?.length === 0 ? (
                                        <p className="text-[10px] text-gray-600 font-mono italic text-center pt-4">No active analysis context.</p>
                                    ) : (
                                        state.livingMapContext.sources.map((source: any, i: number) => (
                                            <div key={i} className="bg-[#111] border border-[#222] p-3 rounded group hover:border-[#9d4edd]/50 transition-colors relative">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-bold text-gray-300 truncate max-w-[150px]">{source.name}</span>
                                                    <button onClick={() => removeSource(i)} className="text-gray-600 hover:text-red-500"><X size={12} /></button>
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
                            <ReactFlow nodes={animatedNodes} edges={animatedEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onPaneContextMenu={onPaneContextMenu} onPaneClick={onPaneClick} onDoubleClick={onPaneDoubleClick} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView minZoom={0.1} maxZoom={2} nodesDraggable={true}>
                                <Background color={visualTheme === 'LIGHT' ? '#ccc' : '#222'} gap={20} size={1} variant={BackgroundVariant.Dots} />
                                <Controls className="bg-[#111] border border-[#333] text-gray-400" />
                                <MiniMap nodeStrokeColor="#555" nodeColor="#111" maskColor="rgba(0,0,0,0.8)" className="border border-[#333] bg-[#050505]" />
                            </ReactFlow>
                        </div>
                    )}
                    {activeTab === 'architect' && (
                        <div className="h-full flex flex-col p-8 bg-black gap-8">
                            <div className="flex gap-8 flex-1">
                                <div className="w-1/3 bg-[#0a0a0a] border border-[#333] rounded-xl p-6 shadow-2xl flex flex-col justify-center gap-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center border border-[#333] mx-auto mb-4 shadow-[0_0_30px_rgba(157,78,221,0.2)]">
                                            <DraftingCompass className="w-8 h-8 text-[#9d4edd]" />
                                        </div>
                                        <h2 className="text-xl font-bold font-mono text-white uppercase tracking-widest">Neural Architect</h2>
                                        <p className="text-xs text-gray-500 font-mono">Describe your system topology.</p>
                                    </div>
                                    <textarea value={architecturePrompt} onChange={(e) => setArchitecturePrompt(e.target.value)} placeholder="Describe your distributed system..." className="w-full h-48 bg-[#050505] border border-[#333] rounded-lg p-4 text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none" />
                                    <button onClick={() => { handleGenerateGraph(); }} disabled={isGeneratingGraph || !architecturePrompt.trim()} className="w-full bg-[#9d4edd] text-black py-4 rounded font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg">
                                        {isGeneratingGraph ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                        Generate Blueprint
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
                            <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2"><Grid3X3 className="w-5 h-5 text-[#9d4edd]" /><span className="text-sm font-bold font-mono text-white uppercase tracking-widest">Schematic Visualization</span></div><div className="flex gap-2"><button onClick={() => handleGenerate('diagram')} disabled={state.isLoading} className="text-[10px] flex items-center gap-2 text-gray-400 hover:text-white border border-[#333] px-3 py-1.5 rounded transition-colors"><RefreshCw className="w-3 h-3" /> Regenerate</button></div></div>
                            <div className="flex-1 bg-black border border-[#222] rounded-lg overflow-hidden relative">{state.isLoading ? <div className="absolute inset-0 flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-4" /><p className="text-xs font-mono text-gray-500 uppercase">Rendering Schematic...</p></div> : state.generatedCode ? <MermaidDiagram code={state.generatedCode} /> : <div className="h-full flex items-center justify-center text-gray-600 opacity-50"><Grid3X3 className="w-16 h-16" /></div>}</div>
                        </div>
                    )}
                    {activeTab === 'workflow' && (
                        <div className="h-full flex flex-col">
                            <div className="h-16 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#0a0a0a]">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[#9d4edd]"><Workflow className="w-5 h-5" /><span className="font-bold font-mono text-sm uppercase tracking-widest">Protocol Synthesis</span></div>
                                    <div className="flex bg-black/40 border border-[#333] rounded p-0.5 ml-6">
                                        <button onClick={() => setSelectedWorkflowDomain('GENERAL')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${selectedWorkflowDomain === 'GENERAL' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}>General</button>
                                        <button onClick={() => setSelectedWorkflowDomain('DRIVE_ORGANIZATION')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${selectedWorkflowDomain === 'DRIVE_ORGANIZATION' ? 'bg-[#22d3ee] text-black' : 'text-gray-500 hover:text-gray-300'}`}>Drive Layout</button>
                                        <button onClick={() => setSelectedWorkflowDomain('SYSTEM_ARCHITECTURE')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${selectedWorkflowDomain === 'SYSTEM_ARCHITECTURE' ? 'bg-[#f59e0b] text-black' : 'text-gray-500 hover:text-gray-300'}`}>System Arch</button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => triggerGenerate('workflow')} disabled={state.isLoading} className="flex items-center gap-2 px-4 py-2 bg-[#9d4edd] text-black rounded text-[10px] font-mono uppercase font-bold tracking-wider shadow-[0_0_15px_rgba(157,78,221,0.3)]">
                                        {state.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                                        Construct Protocol
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex overflow-hidden">
                                <div className="w-1/3 border-r border-[#1f1f1f] bg-[#080808] p-4 overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-4 border-b border-[#222] pb-2">
                                        {selectedWorkflowDomain === 'DRIVE_ORGANIZATION' ? <FolderTree className="w-3 h-3" /> : selectedWorkflowDomain === 'SYSTEM_ARCHITECTURE' ? <Terminal className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
                                        Logic Structure
                                    </div>
                                    <JsonTreeViewer data={state.generatedWorkflow || {}} />
                                </div>
                                <div className="flex-1 bg-[#050505] p-6 overflow-y-auto custom-scrollbar">
                                    {!state.generatedWorkflow ? (
                                        <div className="h-full flex flex-col items-center justify-center p-12">
                                            <div className="max-w-xl w-full space-y-10">
                                                <div className="text-center">
                                                    <Workflow className="w-16 h-16 mb-4 text-[#9d4edd] mx-auto opacity-40" />
                                                    <h3 className="font-mono text-sm uppercase tracking-widest text-white mb-2">Protocol Blueprint Gallery</h3>
                                                    <p className="text-[10px] text-gray-600 font-mono">Select a domain-specific logic template to initialize synthesis.</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('DRIVE_ORGANIZATION'); triggerGenerate('workflow'); }}
                                                        className="p-6 bg-[#0a0a0a] border border-[#22d3ee]/20 rounded-2xl hover:border-[#22d3ee] transition-all text-left group"
                                                    >
                                                        <FolderSync className="w-8 h-8 text-[#22d3ee] mb-4 group-hover:scale-110 transition-transform" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 font-mono">Drive Organization</h4>
                                                        <p className="text-[9px] text-gray-500 font-mono leading-relaxed">PARA method implementation with ISO naming standards and automated lifecycle archival logic.</p>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => { setSelectedWorkflowDomain('SYSTEM_ARCHITECTURE'); triggerGenerate('workflow'); }}
                                                        className="p-6 bg-[#0a0a0a] border border-[#f59e0b]/20 rounded-2xl hover:border-[#f59e0b] transition-all text-left group"
                                                    >
                                                        <Server className="w-8 h-8 text-[#f59e0b] mb-4 group-hover:scale-110 transition-transform" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 font-mono">System Architecture</h4>
                                                        <p className="text-[9px] text-gray-500 font-mono leading-relaxed">High-availability topology with Zero-Trust mesh protocols and autopoietic redundancy triggers.</p>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 max-w-4xl mx-auto">
                                            <ProtocolLoom protocols={state.generatedWorkflow.protocols} type={selectedWorkflowDomain} />

                                            {selectedWorkflowDomain === 'DRIVE_ORGANIZATION' && state.generatedWorkflow.taxonomy && (
                                                <div className="mb-8 p-6 bg-[#0a0a0a] border border-[#22d3ee]/20 rounded-xl relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-20 transition-opacity">
                                                        <FolderTree className="w-24 h-24 text-[#22d3ee]" />
                                                    </div>
                                                    <div className="flex justify-between items-center mb-6 border-b border-[#22d3ee]/20 pb-3">
                                                        <h3 className="text-[#22d3ee] font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <FolderSync className="w-4 h-4" /> Proposed Directory Topology
                                                        </h3>
                                                        <button 
                                                            onClick={() => setMode(AppMode.MEMORY_CORE)}
                                                            className="text-[9px] font-mono font-black text-[#22d3ee] bg-[#22d3ee]/10 px-2 py-1 rounded border border-[#22d3ee]/30 hover:bg-[#22d3ee] hover:text-black transition-all"
                                                        >
                                                            Apply to Memory Core
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 relative z-10">
                                                        {state.generatedWorkflow.taxonomy.root?.map((folder: any, i: number) => (
                                                            <div key={i} className="flex flex-col gap-2 border-l-2 border-[#22d3ee]/30 pl-4 py-1">
                                                                <div className="text-white font-mono text-xs font-bold">/{folder.folder}</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {folder.subfolders?.map((sub: string, j: number) => (
                                                                        <span key={j} className="text-[9px] font-mono text-gray-500 bg-[#111] px-1.5 py-0.5 rounded">/{sub}</span>
                                                                    ))}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {folder.tags?.map((tag: string, j: number) => (
                                                                        <span key={j} className="text-[8px] font-mono text-[#22d3ee]/60">#{tag}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedWorkflowDomain === 'SYSTEM_ARCHITECTURE' && state.generatedWorkflow.metrics && (
                                                <div className="mb-8">
                                                    <div className="flex items-center gap-2 mb-4 border-b border-[#f59e0b]/20 pb-3">
                                                        <Activity className="w-4 h-4 text-[#f59e0b]" />
                                                        <h3 className="text-[#f59e0b] font-mono text-xs font-bold uppercase tracking-widest">System Health Monitoring Matrix</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {state.generatedWorkflow.metrics.map((m: any, i: number) => (
                                                            <div key={i} className="bg-[#0a0a0a] border border-[#f59e0b]/20 p-5 rounded-xl group hover:border-[#f59e0b]/50 transition-all">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Thermometer className="w-3.5 h-3.5 text-[#f59e0b]" />
                                                                        <span className="text-[11px] font-black font-mono text-white uppercase">{m.key}</span>
                                                                    </div>
                                                                    <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[8px] font-mono text-red-400 font-bold uppercase">Critical Target</div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between text-[10px] font-mono">
                                                                        <span className="text-gray-500 uppercase">Alert Threshold</span>
                                                                        <span className="text-white font-bold">{m.alertThreshold}</span>
                                                                    </div>
                                                                    <div className="p-3 bg-black/60 border border-[#222] rounded-lg">
                                                                        <div className="flex items-center gap-2 mb-1.5 text-[9px] text-[#f59e0b] font-black uppercase tracking-widest">
                                                                            <ShieldAlert className="w-3 h-3" /> Autonomous Recovery
                                                                        </div>
                                                                        <p className="text-[10px] font-mono text-gray-400 leading-relaxed italic">"{m.recoveryAction}"</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-3">
                                                {state.generatedWorkflow.protocols?.map((p: any, i: number) => (
                                                    <div key={i} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-4 group hover:border-[#9d4edd]/50 transition-colors flex gap-4">
                                                        <div className="w-8 h-8 rounded bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">{p.step || i+1}</div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className="text-sm font-bold text-white font-mono">{p.action}</h3>
                                                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${getPriorityBadgeStyle(p.priority)}`}>{p.priority || 'MEDIUM'}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-300 leading-relaxed font-mono mb-2">{p.description}</p>
                                                            <div className="flex gap-4 text-[9px] font-mono text-gray-500">
                                                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.role}</span>
                                                                <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> {p.tool}</span>
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