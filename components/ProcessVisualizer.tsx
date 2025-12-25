import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ReactFlow, Background, Controls, MiniMap, 
    NodeProps, EdgeProps, BackgroundVariant, ReactFlowProvider,
    Handle, Position, getSmoothStepPath, useReactFlow
} from '@xyflow/react';
// Added Search to the list of imports
import { 
    BrainCircuit, X, Activity, Database, Zap, Wrench, 
    Grid3X3, Map, Play, CheckCircle, RefreshCw,
    DraftingCompass, Server, Layers, Workflow, Loader2, Code,
    ShieldCheck, Sparkles, FileText, Upload, Eye, FileUp, Info,
    Boxes, Package, Scan, Trash2, Globe, Cpu, ChevronRight, Terminal, RotateCcw, Box,
    FolderTree, Folder, HardDrive, Share2, Target, GitBranch, Layout, Hammer, Network, Shield,
    Merge, FolderOpen, List, ChevronDown, Binary, Radio, FileJson, Clock, Lock, Download,
    SearchCode, BarChart4, Cloud, Image as ImageIcon, CheckCircle2, FileTerminal, FileCode,
    ArrowUpRight, AlertTriangle, Fingerprint, Search
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
    const drift = data.drift || 0; // Procedural drift / entropy

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
            {/* Entropy Flare */}
            {drift > 40 && (
                <div className="absolute -inset-1 rounded-[2rem] bg-red-500/5 blur-md pointer-events-none opacity-40" />
            )}

            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            
            {isDone && (
                <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute inset-0 rounded-[2rem] bg-emerald-500/10 pointer-events-none"
                />
            )}

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
                    <span className="text-[8px] font-black font-mono text-gray-700 mt-1 uppercase tracking-widest">Node_v8.1</span>
                </div>
            </div>
            
            <div className="mb-5 px-1">
                <div className="text-[14px] font-black font-mono uppercase tracking-[0.2em] text-white truncate leading-none mb-2">{renderSafe(data.label as any)}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 h-4 truncate">{renderSafe(data.subtext as any)}</div>
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/5 px-1">
                <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Coherence</span>
                    <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : drift > 50 ? 'bg-red-500 animate-pulse' : 'bg-[#9d4edd] animate-pulse'}`} />
                         <span className={`text-[10px] font-black font-mono uppercase tracking-tighter ${drift > 50 ? 'text-red-500' : 'text-white/90'}`}>{drift > 50 ? `DRIFT_${drift}%` : data.status || 'SYNCING'}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Index</span>
                    <span className="text-[10px] font-black font-mono text-[#9d4edd] truncate">#{(id || '').substring(0,6).toUpperCase()}</span>
                </div>
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

const VaultDriveOrg = ({ workflow }: any) => {
    const { addLog, setMemoryState, setMode } = useAppStore();
    const [optimizedNodes, setOptimizedNodes] = useState<Set<string>>(new Set());
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isForgingScript, setIsForgingScript] = useState(false);

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

    const handleExportManifest = () => {
        if (!workflow?.taxonomy) return;
        const manifest = {
            title: workflow.title,
            timestamp: Date.now(),
            taxonomy: workflow.taxonomy
        };
        
        // Handover to MemoryCore
        setMemoryState({ driveManifest: manifest });
        addLog('SUCCESS', 'VAULT_HANDOVER: PARA Drive Manifest synchronized with Memory Core.');
        audio.playSuccess();

        // Optional: Trigger sector migration
        if (confirm("Lattice logic stabilized. Handover to Memory Core for autonomous organization?")) {
            setMode(AppMode.MEMORY_CORE);
        }
    };

    const handleForgeShellScript = async () => {
        if (!workflow?.taxonomy) return;
        setIsForgingScript(true);
        addLog('SYSTEM', 'SCRIPT_FORGE: Synthesizing POSIX directory protocol...');
        try {
            const script = await generateDriveShellScript(workflow.taxonomy);
            const blob = new Blob([script], { type: 'text/x-shellscript' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `setup_vault_${Date.now()}.sh`;
            link.click();
            addLog('SUCCESS', 'SCRIPT_FORGE: Shell protocol stabilized and exported.');
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'SCRIPT_FORGE_FAIL: Link corruption.');
        } finally {
            setIsForgingScript(false);
        }
    };

    if (!workflow || !workflow.taxonomy) return (
        <div className="h-full flex flex-col items-center justify-center opacity-10 text-center space-y-12">
            <div className="relative">
                <FolderTree size={160} className="text-gray-700" strokeWidth={0.5} />
                <div className="absolute inset-0 bg-[#9d4edd]/5 blur-3xl animate-pulse" />
            </div>
            <div>
                <p className="text-2xl font-mono uppercase tracking-[0.8em] text-white">LatticeVault Offline</p>
                <p className="text-[11px] text-gray-600 font-mono mt-4 uppercase tracking-[0.4em]">Establish architectural intent to materialize taxonomy</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-20 bg-[#030303] overflow-y-auto custom-scrollbar relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto w-full relative z-10">
                <div className="flex justify-between items-end mb-20 border-b border-white/5 pb-14">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                <HardDrive size={24} className="text-[#10b981]" />
                            </div>
                            <span className="text-[12px] font-black font-mono text-[#10b981] uppercase tracking-[0.6em]">LatticeVault // Autonomous_PARA</span>
                        </div>
                        <h2 className="text-6xl font-black text-white uppercase tracking-tighter font-mono leading-none">{workflow.title}</h2>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Recursive Structural Protocol Active</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button 
                            onClick={handleForgeShellScript}
                            disabled={isForgingScript}
                            className="px-6 py-3 bg-[#22d3ee]/10 hover:bg-[#22d3ee] border border-[#22d3ee]/40 text-[#22d3ee] hover:text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl flex items-center gap-3 active:scale-95 disabled:opacity-30"
                        >
                            {isForgingScript ? <Loader2 size={16} className="animate-spin" /> : <FileTerminal size={16} />}
                            {isForgingScript ? 'FORGING...' : 'Forge Shell Script'}
                        </button>
                        <button 
                            onClick={handleExportManifest}
                            className="px-6 py-3 bg-[#10b981] hover:bg-[#34d399] text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_15px_30px_rgba(16,185,129,0.2)] flex items-center gap-3 active:scale-95"
                        >
                            <ArrowUpRight size={16} /> Handover to Vault
                        </button>
                        <div className="h-10 w-px bg-white/5 mx-2" />
                        <div className="text-right space-y-2">
                            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block">L1_Sectors</span>
                            <span className="text-5xl font-black font-mono text-[#9d4edd] tracking-tighter">{workflow.taxonomy?.root?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
                    {workflow.taxonomy?.root?.map((group: any, idx: number) => {
                        const isOptimized = optimizedNodes.has(group.folder);
                        const isExpanded = expandedFolders.has(group.folder);
                        
                        return (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className={`p-10 bg-[#080808] border rounded-[3rem] group relative overflow-hidden transition-all duration-1000 ${isOptimized ? 'border-[#10b981]/50 bg-[#10b981]/5 shadow-[0_0_80px_rgba(16,185,129,0.1)]' : 'border-white/5 hover:border-white/10 hover:bg-[#0a0a0a] shadow-2xl'}`}
                            >
                                <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-1000 group-hover:scale-125 rotate-12">
                                    <FolderTree size={160} />
                                </div>

                                <div className="flex justify-between items-start mb-10 relative z-10">
                                    <div className="flex items-center gap-7">
                                        <div className={`p-5 rounded-[1.5rem] border transition-all duration-700 shadow-inner group-hover:rotate-6 ${isOptimized ? 'bg-[#10b981] text-black border-[#10b981]' : 'bg-[#111] text-gray-600 border-white/10 group-hover:text-[#9d4edd] group-hover:border-[#9d4edd]/40'}`}>
                                            {isOptimized ? <ShieldCheck size={36} /> : <FolderOpen size={36} />}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase font-mono tracking-[0.2em] leading-none mb-3">{group.folder}</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse" />
                                                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Hierarchy Depth: L1</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => toggleOptimize(group.folder)}
                                            className={`p-3 rounded-2xl transition-all duration-500 ${isOptimized ? 'bg-[#10b981] text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-110' : 'bg-white/5 text-gray-700 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                        <button 
                                            onClick={() => toggleFolder(group.folder)}
                                            className="p-3 bg-white/5 text-gray-700 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-500"
                                        >
                                            {isExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-3 overflow-hidden border-t border-white/5 pt-8 mt-2 relative z-10"
                                        >
                                            {group.items?.map((item: string, i: number) => (
                                                <div key={i} className="flex items-center gap-4 text-[13px] text-gray-400 font-mono p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all cursor-default group/item hover:translate-x-2">
                                                    <div className="w-2 h-2 rounded-full bg-gray-800 group-hover/item:bg-[#9d4edd] transition-colors" />
                                                    <span className="truncate flex-1 tracking-tight">{item}</span>
                                                    <div className="flex items-center gap-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <Radio size={12} className="text-[#22d3ee] animate-pulse" />
                                                        <span className="text-[8px] font-black uppercase text-[#22d3ee]/60 tracking-widest">Metadata_Linked</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!group.items || group.items.length === 0) && (
                                                <div className="text-[11px] font-mono text-gray-700 italic px-6 py-4 bg-black/40 rounded-2xl border border-dashed border-white/5">Sector buffer empty. Awaiting architectural allocation...</div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isExpanded && (
                                    <p className="text-[12px] text-gray-600 font-mono line-clamp-2 leading-relaxed opacity-60 mb-2 relative z-10 px-1">
                                        Automated PARA allocation for {(group.folder || '').toLowerCase()} domain assets. System enforces ISO 8601 naming protocols and tiered archival triggers.
                                    </p>
                                )}

                                <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-gray-700 uppercase tracking-[0.3em] relative z-10 px-1">
                                    <div className="flex items-center gap-3">
                                        <Activity size={14} className={isOptimized ? 'text-[#10b981]' : 'animate-pulse'} />
                                        <span>Status: {isOptimized ? 'LOCKED_STABLE' : 'CALIBRATING'}</span>
                                    </div>
                                    <span className="font-black text-gray-500">{group.items?.length || 0} SUB_OBJECTS</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Fix: Implemented missing SourceGrounding sub-component
const SourceGrounding = ({ sources, onUpload, onRemove, onPreview }: any) => (
    <div className="h-full flex flex-col p-20 bg-black/20 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto w-full space-y-10">
            <div className="flex justify-between items-end border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-2xl">
                            <Database size={24} className="text-[#22d3ee]" />
                        </div>
                        <span className="text-[12px] font-black font-mono text-[#22d3ee] uppercase tracking-[0.6em]">Context Grounding Source</span>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter font-mono">Knowledge Ingestion</h2>
                </div>
                <label className="px-8 py-4 bg-[#22d3ee] hover:bg-[#67e8f9] text-black text-[12px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-[0_15px_30px_rgba(34,211,238,0.2)] active:scale-95">
                    <Upload size={18} className="inline mr-3" /> Ingest Sources
                    <input type="file" multiple className="hidden" onChange={onUpload} />
                </label>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {(sources || []).map((s: any, i: number) => (
                    <div key={s.id} className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl flex items-center justify-between group hover:border-[#22d3ee]/30 transition-all">
                        <div className="flex items-center gap-6">
                            <div className="p-3 bg-white/5 rounded-2xl text-gray-600 group-hover:text-[#22d3ee] transition-all">
                                {s.type?.startsWith('image/') ? <ImageIcon size={24} /> : <FileText size={24} />}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white uppercase font-mono">{s.name}</div>
                                <div className="text-[10px] text-gray-600 font-mono uppercase mt-1">{s.type} // {s.analysis ? 'INDEXED' : 'PENDING_SCAN'}</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => onPreview(s)} className="p-3 bg-white/5 text-gray-600 hover:text-white rounded-xl transition-all"><Eye size={18}/></button>
                            <button onClick={() => onRemove(i)} className="p-3 bg-white/5 text-gray-600 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
                {(!sources || sources.length === 0) && (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-6 grayscale">
                        {/* Added Search icon component correctly */}
                        <Search size={64} />
                        <p className="text-sm font-mono uppercase tracking-[0.4em]">No grounding sources identified</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Fix: Implemented missing ProtocolLoom sub-component
const ProtocolLoom = ({ workflow, results, isSimulating, activeIndex, onExecute, onReset }: any) => (
    <div className="h-full flex flex-col p-20 bg-black/40 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-5xl mx-auto w-full space-y-12 relative z-10">
            <div className="flex justify-between items-end border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-2xl">
                            <Workflow size={24} className="text-[#f59e0b]" />
                        </div>
                        <span className="text-[12px] font-black font-mono text-[#f59e0b] uppercase tracking-[0.6em]">Protocol Loom // Logic Sequence</span>
                    </div>
                    <h2 className="text-6xl font-black text-white uppercase tracking-tighter font-mono">{workflow?.title || 'System Protocol'}</h2>
                </div>
                <button onClick={onReset} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Reset Simulation</button>
            </div>

            <div className="space-y-6">
                {workflow?.protocols?.map((p: any, i: number) => {
                    const result = results?.[i];
                    const isActive = activeIndex === i;
                    return (
                        <div key={i} className={`p-8 bg-[#080808] border rounded-[2.5rem] transition-all duration-700 relative overflow-hidden ${result ? 'border-[#10b981]/30 bg-[#10b981]/5' : isActive ? 'border-[#f59e0b] shadow-[0_0_40px_rgba(245,158,11,0.15)]' : 'border-white/5'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-2xl font-mono font-black text-lg ${result ? 'bg-[#10b981] text-black' : 'bg-white/5 text-gray-700'}`}>{String(i + 1).padStart(2, '0')}</div>
                                    <div>
                                        <div className="text-xs font-black text-gray-500 font-mono uppercase tracking-widest mb-1">{p.role}</div>
                                        <div className="text-lg font-bold text-white uppercase tracking-tight">{p.instruction}</div>
                                    </div>
                                </div>
                                {!result && (
                                    <button 
                                        onClick={() => onExecute(i)} 
                                        disabled={isSimulating}
                                        className="p-4 bg-[#f59e0b] text-black rounded-2xl hover:scale-110 transition-transform active:scale-95 disabled:opacity-30 shadow-xl"
                                    >
                                        {isSimulating && isActive ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} fill="currentColor" />}
                                    </button>
                                )}
                            </div>
                            {result && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-8 pt-8 border-t border-white/5">
                                    <div className="p-6 bg-black rounded-2xl border border-white/5 italic text-sm text-gray-400 font-mono leading-relaxed border-l-4 border-l-[#10b981]">
                                        "{result.agentThought}"
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-xs text-[#10b981] whitespace-pre-wrap">
                                        {result.output}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);

// Fix: Implemented missing InfrastructureForge sub-component
const InfrastructureForge = ({ nodes, onGenerate }: any) => (
    <div className="h-full flex flex-col p-20 bg-[#030303] overflow-y-auto custom-scrollbar relative">
        <div className="max-w-4xl mx-auto w-full space-y-16">
            <div className="text-center space-y-6">
                <div className="p-4 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-[2rem] w-20 h-20 flex items-center justify-center mx-auto text-[#9d4edd] shadow-2xl">
                    <Server size={40} />
                </div>
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter font-mono">Infrastructure Forge</h2>
                <p className="text-xs text-gray-600 font-mono max-w-lg mx-auto uppercase tracking-widest leading-relaxed">Synthesize production-ready IaC manifests from current lattice topology. Target multi-cloud or bare-metal barebones.</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {[
                    { id: 'TERRAFORM', label: 'Terraform (HCL)', icon: Box, desc: 'Generate high-level resource orchestration.', color: '#9d4edd' },
                    { id: 'DOCKER', label: 'Docker Compose', icon: Boxes, desc: 'Containerize node stack logic.', color: '#22d3ee' },
                    { id: 'KUBERNETES', label: 'K8s Manifests', icon: Grid3X3, desc: 'Cluster orchestration protocols.', color: '#10b981' },
                    { id: 'CLOUD_INIT', label: 'Cloud-Init', icon: FileJson, desc: 'Bare-metal boot orchestration.', color: '#f59e0b' }
                ].map(provider => (
                    <button 
                        key={provider.id} 
                        onClick={() => onGenerate(provider.id)}
                        className="p-10 bg-[#0a0a0a] border border-white/5 hover:border-[var(--color)] rounded-[3rem] text-left transition-all duration-700 group relative overflow-hidden shadow-2xl"
                        style={{ '--color': provider.color } as any}
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity rotate-12 scale-150"><provider.icon size={120} /></div>
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-4 rounded-2xl bg-white/5 text-gray-500 group-hover:text-white transition-all group-hover:scale-110" style={{ color: provider.color }}>
                                <provider.icon size={32} />
                            </div>
                            <span className="text-xl font-black text-white uppercase font-mono tracking-widest">{provider.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 font-mono uppercase leading-relaxed group-hover:text-gray-400 transition-colors">{provider.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const IntegrityHUD = ({ coherence, driftCount }: { coherence: number, driftCount: number }) => (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-10 px-10 py-4 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-[70] pointer-events-none border-b-2 border-b-[#9d4edd]/40">
        <div className="flex items-center gap-4 border-r border-white/10 pr-10">
            <div className="p-2.5 bg-[#9d4edd]/20 rounded-xl">
                <ShieldCheck size={18} className="text-[#9d4edd]" />
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Topology Coherence</span>
                <div className="flex items-center gap-3 mt-0.5">
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${coherence}%` }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee]" />
                    </div>
                    <span className="text-[12px] font-black font-mono text-white">{coherence}%</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-5">
            <div className={`p-2.5 rounded-xl ${driftCount > 0 ? 'bg-red-500/20 animate-pulse' : 'bg-[#10b981]/10'}`}>
                <AlertTriangle size={18} className={driftCount > 0 ? 'text-red-500' : 'text-[#10b981]'} />
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Structural Drift</span>
                <span className={`text-[12px] font-black font-mono mt-0.5 ${driftCount > 0 ? 'text-red-500' : 'text-[#10b981]'}`}>
                    {driftCount > 0 ? `${driftCount} NODES_OUT_OF_SYNC` : 'SYSTEM_NOMINAL'}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-4 border-l border-white/10 pl-10">
            <Fingerprint size={16} className="text-gray-600" />
            <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">Sovereign_Lattice_v8.1</span>
        </div>
    </div>
);

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

    const driftCount = useMemo(() => nodes.filter(n => (n.data?.drift || 0) > 60).length, [nodes]);

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
            prompt: 'Forge a comprehensive PARA drive organization structure for a decentralized engineering firm. Include naming conventions (ISO 8601), directory depth rules (MAX 3), and folder mappings for Projects, Areas, Resources, and Archives. Prioritize zero-duplicate storage logic.' 
        },
        { 
            id: 'file_mgmt_flow', 
            label: 'Asset Flow Protocol', 
            icon: Workflow, 
            type: 'DRIVE_ORGANIZATION',
            color: '#22d3ee',
            prompt: 'Synthesize a formal file management workflow for high-fidelity digital production. Include ingestion layers, metadata classification nodes, human-in-the-loop review buffers, and tiered cold-storage archival stages.' 
        },
        { 
            id: 'arch_ha', 
            label: 'Zero-Trust Stack', 
            icon: Server, 
            type: 'SYSTEM_ARCHITECTURE',
            color: '#9d4edd',
            prompt: 'Design a multi-region scalable cloud architecture with zero-trust isolation. Include mTLS handshake nodes, hardware-backed security enclaves, and global load-balancing with high-availability failover protocols.' 
        },
        { 
            id: 'arch_event', 
            label: 'Event-Driven Core', 
            icon: Activity, 
            type: 'SYSTEM_ARCHITECTURE',
            color: '#f59e0b',
            prompt: 'Synthesize an event-driven system architecture utilizing Kafka cluster orchestration, serverless execution workers, and reactive data streams for real-time sensor telemetry and anomaly detection.' 
        }
    ];

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-[3.5rem] shadow-[0_0_150px_rgba(0,0,0,1)] group/pv">
            
            {/* Extended Sector Header */}
            <div className="h-24 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-3xl z-[60] flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-[0_0_30px_rgba(157,78,221,0.25)]">
                            <BrainCircuit className="w-6 h-6 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black font-mono uppercase tracking-[0.5em] text-white leading-none mb-2">Process Logic</h1>
                            <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest block">Autonomous Orchestration Core // v8.1-ZENITH</span>
                        </div>
                    </div>
                    
                    <div className="h-10 w-px bg-white/5" />
                    
                    <div className="flex items-center gap-1.5 bg-black/60 p-2 rounded-2xl border border-white/5 shadow-inner">
                        {[
                            { id: 'living_map', icon: Map, label: 'Lattice' },
                            { id: 'architect', icon: DraftingCompass, label: 'Architect' },
                            { id: 'vault', icon: FolderTree, label: 'Vault' },
                            { id: 'workflow', icon: Workflow, label: 'Loom' },
                            { id: 'iac', icon: Server, label: 'Forge' },
                            { id: 'nexus', icon: Globe, label: 'Nexus' },
                            { id: 'context', icon: Database, label: 'Ground' },
                            { id: 'diagram', icon: Grid3X3, label: 'Topology' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setState({ activeTab: tab.id }); audio.playClick(); }} 
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all whitespace-nowrap group/tab
                                    ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/30' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}
                                `}
                            >
                                <tab.icon size={16} className={`${activeTab === tab.id ? 'fill-current' : 'group-hover/tab:scale-110 transition-transform'}`} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button 
                        onClick={async () => {
                            addLog('SYSTEM', 'LATTICE_REALIGN: Re-calculating structural vectors for zero entropy...');
                            try {
                                if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
                                handleAutoOrganize();
                                audio.playSuccess();
                            } catch (e) {}
                        }}
                        className="p-3.5 bg-white/5 border border-white/10 hover:border-[#10b981] rounded-2xl text-gray-600 hover:text-[#10b981] transition-all shadow-xl group/align active:scale-90" 
                        title="Re-align Lattice Topology"
                    >
                        <RefreshCw size={22} className="group-hover/align:rotate-180 transition-transform duration-500" />
                    </button>
                    <button 
                        onClick={() => { handleRunGlobalSequence(); audio.playClick(); }} 
                        className="px-8 py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(157,78,221,0.4)] flex items-center gap-4 active:scale-95 group/seq"
                    >
                        <Zap size={20} className="fill-current group-hover/seq:animate-pulse"/> Forge Sequence
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#020202] z-10">
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-50 bg-[length:100%_4px] opacity-10" />
                
                <AnimatePresence mode="wait">
                    {activeTab === 'living_map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                            <IntegrityHUD coherence={processData.coherenceScore} driftCount={driftCount} />
                            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
                                <Background color="#111" gap={60} size={1.5} variant={BackgroundVariant.Dots} style={{ opacity: 0.3 }} />
                                <Controls className="!bg-[#0a0a0a] !border-white/10 !rounded-2xl !shadow-2xl !p-2" />
                                <MiniMap 
                                    nodeStrokeColor="#444" 
                                    nodeColor="#080808" 
                                    maskColor="rgba(0,0,0,0.95)" 
                                    className="border border-white/10 !bg-[#050505] !rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)]" 
                                />
                            </ReactFlow>
                        </motion.div>
                    )}

                    {activeTab === 'architect' && (
                        <motion.div key="architect" initial={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }} className="h-full flex flex-col items-center justify-start p-20 bg-black overflow-y-auto custom-scrollbar relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(157,78,221,0.08)_0%,transparent_70%)] pointer-events-none" />
                            
                            <div className="w-full max-w-[1400px] space-y-24 relative z-10">
                                <div className="text-center space-y-8">
                                    <div className="w-32 h-32 bg-[#9d4edd]/10 rounded-[3rem] flex items-center justify-center mx-auto text-[#9d4edd] border border-[#9d4edd]/30 shadow-[0_0_80px_rgba(157,78,221,0.3)] hover:scale-110 hover:rotate-12 transition-all duration-1000 group">
                                        <Hammer size={64} className="group-hover:animate-pulse" />
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-6xl font-black text-white uppercase tracking-tighter leading-none font-mono">Blueprint Architect</h2>
                                        <p className="text-[13px] text-gray-600 font-mono max-w-3xl mx-auto uppercase tracking-[0.4em] leading-relaxed italic">Synthesizing zero-trust logical topologies for PARA drive matrices and high-availability cloud orchestration swarms.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {TEMPLATES.map((template, idx) => (
                                        <motion.button 
                                            key={template.id}
                                            initial={{ opacity: 0, y: 40 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.08 }}
                                            onClick={() => {
                                                setArchitecturePrompt(template.prompt);
                                                setState({ workflowType: template.type as any });
                                                audio.playClick();
                                            }}
                                            className="p-10 bg-[#080808] border border-white/5 hover:border-[#9d4edd] rounded-[3.5rem] text-left transition-all duration-700 group flex flex-col gap-8 relative overflow-hidden shadow-2xl hover:shadow-[#9d4edd]/10 hover:bg-[#0a0a0a]"
                                        >
                                            <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.1] transition-all duration-1000 rotate-12 scale-150">
                                                <template.icon size={180} />
                                            </div>
                                            
                                            <div className="flex items-center gap-7 relative z-10">
                                                <div className="p-5 bg-[#111] rounded-2xl text-gray-700 group-hover:text-white group-hover:bg-[#9d4edd] transition-all duration-1000 border border-white/5 shadow-inner">
                                                    <template.icon size={36} />
                                                </div>
                                                <div>
                                                    <div className="text-lg font-black text-white uppercase tracking-[0.2em] font-mono leading-none mb-2">{template.label}</div>
                                                    <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest block font-bold">Vector Protocol v8.1</span>
                                                </div>
                                            </div>
                                            <p className="text-[13px] text-gray-500 font-mono line-clamp-3 leading-relaxed relative z-10 group-hover:text-gray-300 transition-colors italic">"{template.prompt}"</p>
                                            
                                            <div className="mt-auto flex items-center gap-3 pt-8 border-t border-white/5 relative z-10">
                                                <div className="w-2 h-2 rounded-full bg-[#9d4edd] group-hover:animate-ping" />
                                                <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest group-hover:text-[#9d4edd] transition-colors font-black">Ready for synthesis</span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="bg-[#080808]/95 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-16 shadow-[0_100px_200px_rgba(0,0,0,1)] flex flex-col gap-12 relative overflow-hidden group/input-sect">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.12)_0%,transparent_70%)] pointer-events-none" />
                                    
                                    <div className="flex flex-col gap-10 relative z-10">
                                        <div className="flex gap-6 p-2 bg-black/60 border border-white/5 rounded-[2.5rem] shadow-inner">
                                            {[
                                                { id: 'DRIVE_ORGANIZATION', label: 'Drive_Org', icon: FolderTree },
                                                { id: 'SYSTEM_ARCHITECTURE', label: 'System_Arch', icon: Network },
                                                { id: 'CONVERGENT_SYNTHESIS', label: 'Convergence', icon: Merge }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => { setState({ workflowType: type.id as any }); audio.playClick(); }}
                                                    className={`flex-1 flex items-center justify-center gap-4 py-6 rounded-[2rem] border text-[13px] font-black uppercase tracking-widest transition-all duration-1000 ${processData.workflowType === type.id ? 'bg-[#9d4edd] border-[#9d4edd] text-black shadow-[0_20px_40px_rgba(157,78,221,0.3)] scale-105' : 'bg-transparent border-transparent text-gray-700 hover:text-gray-300 hover:bg-white/5'}`}
                                                >
                                                    <type.icon size={20} />
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center px-6">
                                                <label className="text-[12px] font-black text-[#9d4edd] uppercase tracking-[0.6em] flex items-center gap-4">
                                                    <Binary size={18} /> Structural Directive Manifold
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">Input: PROMPT_PROTOCOL_V4</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse" />
                                                </div>
                                            </div>
                                            <textarea 
                                                value={architecturePrompt} 
                                                onChange={(e) => setArchitecturePrompt(e.target.value)} 
                                                placeholder="Describe high-fidelity system topology or organization goals..." 
                                                className="w-full h-72 bg-black border border-white/5 rounded-[3rem] p-10 text-lg font-mono text-gray-300 outline-none focus:border-[#9d4edd]/60 resize-none transition-all placeholder:text-gray-800 shadow-inner group-hover/input-sect:border-white/10 custom-scrollbar leading-relaxed italic" 
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-6 relative z-10">
                                        <button 
                                            onClick={() => { handleGenerateGraph(); audio.playClick(); }} 
                                            disabled={isGeneratingGraph || isSynthesizingVault || !architecturePrompt.trim()} 
                                            className="flex-1 bg-[#9d4edd] text-black py-8 rounded-[3rem] font-black text-sm uppercase tracking-[0.5em] flex items-center justify-center gap-6 shadow-[0_30px_100px_rgba(157,78,221,0.5)] hover:bg-[#b06bf7] hover:scale-[1.03] transition-all disabled:opacity-30 active:scale-95 group/gen-btn"
                                        >
                                            {isGeneratingGraph ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} className="group-hover/gen-btn:scale-125 transition-transform duration-700" />} 
                                            {isGeneratingGraph ? 'FORGING TOPOLOGY...' : 'Construct Architectural Blueprint'}
                                        </button>
                                        <button 
                                            onClick={() => { handleSynthesizeFromVault(); audio.playClick(); }} 
                                            disabled={isGeneratingGraph || isSynthesizingVault || !architecturePrompt.trim()} 
                                            className="px-16 bg-[#111] border border-[#333] text-white py-8 rounded-[3rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-5 hover:border-[#22d3ee] hover:bg-[#1a1a1a] transition-all disabled:opacity-30 active:scale-95 group/vault-btn"
                                        >
                                            {isSynthesizingVault ? <Loader2 className="animate-spin" size={22} /> : <Database size={22} className="group-hover/vault-btn:text-[#22d3ee] transition-colors duration-700" />} 
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
                        <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-20 bg-[#020202]">
                            <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[Core] --> B[Lattice]'} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f1f1f] px-12 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.3em]">
                        <CheckCircle size={18} className="shadow-[0_0_15px_#10b981]" /> Handover_Stable
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <GitBranch size={18} className="text-[#9d4edd]" /> Active_Lattice_Nodes: {nodes.length}
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <Activity size={18} className="text-[#22d3ee]" /> Current_Vector: {activeTab.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <ShieldCheck size={18} className="text-[#f59e0b]" /> Entropy_Suppression: ACTIVE
                    </div>
                </div>
                <div className="flex items-center gap-12 shrink-0">
                    <span className="uppercase tracking-[0.6em] opacity-40 leading-none hidden lg:block text-[9px]">Process Logic Synthesis Engine v8.1-ZENITH // Multi-Vector Orchestration</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-[0.3em] leading-none text-[10px]">SOVEREIGN_SYSTEM_CORE</span>
                </div>
            </div>
        </div>
    );
};

const ProcessVisualizer = () => <ReactFlowProvider><ProcessVisualizerContent /></ReactFlowProvider>;
export default ProcessVisualizer;