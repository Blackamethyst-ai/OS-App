import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, Loader2, Target, 
    RefreshCw, HardDrive, Binary, Save, ShieldCheck, 
    ChevronRight, ListChecks, Compass, Share2, PlayCircle,
    FolderTree, Cloud, Code, FolderOpen, FileText, Component,
    Microscope, Terminal, Aperture, BookOpen, Fingerprint,
    Cpu, Database, Shield, Globe, AlertTriangle, CheckCircle2,
    Lock, Unlock, ShieldAlert, Gauge, Waves
} from 'lucide-react';
import { promptSelectKey, generateStructuredWorkflow } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { TechnicalManifest, DirectoryNode, ProtocolStep } from '../types';
import { renderSafe } from '../utils/renderSafe';

const BlueprintStat = ({ label, value, color, detail }: { label: string, value: string, color: string, detail?: string }) => (
    <div className="flex flex-col gap-1 p-5 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all shadow-inner glass-refraction">
        <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color }} />
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">{label}</span>
        <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-white tracking-tighter" style={{ color }}>{value}</span>
            {detail && <span className="text-[7px] font-mono text-gray-600 uppercase">{detail}</span>}
        </div>
    </div>
);

const ImplementationTerminal = ({ protocols, isDeploying }: { protocols: ProtocolStep[], isDeploying: boolean }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isDeploying && protocols.length > 0) {
            let i = 0;
            const interval = setInterval(() => {
                if (i < protocols.length) {
                    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYNC_NODE_${i}: ${protocols[i].logOutput || protocols[i].instruction}`]);
                    i++;
                } else {
                    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYSTEM_STABLE: LATTICE_CONVERGENCE_ACK.`]);
                    clearInterval(interval);
                }
            }, 600);
            return () => clearInterval(interval);
        } else if (!isDeploying) {
            setLogs([]);
        }
    }, [isDeploying, protocols]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-72 bg-black/90 border border-white/5 rounded-[3rem] p-8 font-mono text-[10px] text-[#10b981] overflow-hidden flex flex-col shadow-2xl relative group">
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
            <div className="absolute top-6 right-10 flex items-center gap-4">
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Sovereign_Handshake</span>
                <div className={cn("w-2 h-2 rounded-full", isDeploying ? "bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" : "bg-gray-800")} />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-4 relative z-10">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 text-gray-500 gap-4">
                        <Terminal size={40} />
                        <span className="uppercase tracking-[0.6em] text-[10px]">Awaiting Kernel Auth</span>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex gap-4 border-l border-white/5 pl-4 ml-1">
                            <span className="text-gray-700 shrink-0 select-none">#</span>
                            <span className="break-all tracking-tight">{log}</span>
                        </motion.div>
                    ))
                )}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

const TreeView = ({ data }: { data: TechnicalManifest }) => {
    if (!data || !Array.isArray(data.structure)) return null;
    
    const renderNode = (node: DirectoryNode, depth = 0) => {
        const isFolder = node.type === 'folder';
        const entropy = node.entropy || 0;
        
        const getEntropyColor = (val: number) => {
            if (val > 75) return 'text-red-500';
            if (val > 35) return 'text-[#f59e0b]';
            return 'text-[#10b981]';
        };

        return (
            <div key={node.name} className="space-y-1">
                <div 
                    className="flex items-center gap-4 py-3 hover:bg-white/5 rounded-2xl px-5 transition-all cursor-default group/node border border-transparent hover:border-white/5"
                    style={{ paddingLeft: `${depth * 2 + 1}rem` }}
                >
                    <div className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center border transition-all shadow-lg",
                        isFolder ? "bg-[#f1c21b]/10 border-[#f1c21b]/30 text-[#f1c21b]" : "bg-white/5 border-white/10 text-gray-600"
                    )}>
                        {isFolder ? <FolderOpen size={14} /> : <FileText size={14} />}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[11px] font-mono tracking-tight transition-colors",
                            isFolder ? "text-white font-black uppercase" : "text-gray-400 group-hover/node:text-white"
                        )}>{node.name}</span>
                        {node.description && (
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[8px] text-gray-600 font-mono line-clamp-1 max-w-[320px] uppercase">{node.description}</span>
                                <div className="h-px w-4 bg-white/5" />
                                <span className={cn("text-[7px] font-black font-mono uppercase tracking-widest", getEntropyColor(entropy))}>Drift_{entropy}%</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="ml-auto flex items-center gap-4 opacity-0 group-hover/node:opacity-100 transition-opacity">
                        {node.securityAttestation === 'VERIFIED' && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#10b981]/10 rounded border border-[#10b981]/20">
                                <ShieldCheck size={8} className="text-[#10b981]" />
                                <span className="text-[6px] font-black text-[#10b981] uppercase">Attested</span>
                            </div>
                        )}
                        <span className="text-[7px] font-mono text-gray-700 uppercase tracking-widest">{node.modified || '2025.Q1'}</span>
                    </div>
                </div>
                {Array.isArray(node.children) && node.children.map((child: any) => renderNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="p-10 bg-black/40 border border-white/5 rounded-[4rem] shadow-inner font-mono overflow-hidden flex flex-col group/tree relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,194,27,0.02)_0%,transparent_60%)] pointer-events-none" />
            <div className="flex items-center justify-between mb-10 px-4 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-[#f1c21b]/10 rounded-2xl border border-[#f1c21b]/40 text-[#f1c21b] shadow-[0_0_30px_rgba(241,194,27,0.15)]">
                        <FolderTree size={22} />
                    </div>
                    <div>
                        <span className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Drive Topology</span>
                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-2 block">Hierarchical Metadata Synthesis //PARA 2.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1">Lattice Density</span>
                        <div className="flex gap-1">
                             {[1,1,1,1,0].map((v, i) => <div key={i} className={cn("w-1 h-3 rounded-full", v ? "bg-[#f1c21b]" : "bg-white/5")} />)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 max-h-[550px] relative z-10">
                {data.structure.map((root: any) => renderNode(root))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center px-4 opacity-40 group-hover/tree:opacity-100 transition-opacity relative z-10">
                <div className="flex gap-6 text-[8px] font-mono text-gray-600 uppercase tracking-[0.2em] font-black">
                    <span>Protocol: IMPERIAL_PARA</span>
                    <span>Class: Recursive_Lattice</span>
                </div>
                <button className="text-[9px] font-black font-mono text-[#f1c21b] hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} /> View Raw Manifest
                </button>
            </div>
        </div>
    );
};

const ImplementationDeck: React.FC<{
    data: TechnicalManifest;
    onDeploy: (d: TechnicalManifest) => void;
    onArchive: (d: TechnicalManifest) => void;
}> = ({ data, onDeploy, onArchive }) => {
    const [isDeploying, setIsDeploying] = useState(false);
    if (!data) return null;

    const handleCommit = () => {
        setIsDeploying(true);
        onDeploy(data);
        audio.playClick();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-10 pb-32"
        >
            {/* Header Shield */}
            <div className="p-12 crystalline rounded-[4.5rem] relative overflow-hidden shadow-2xl glass-refraction">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] rotate-12 pointer-events-none scale-150"><Component size={200} /></div>
                
                <div className="flex justify-between items-start mb-14 relative z-10">
                    <div className="space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-1.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded-full flex items-center gap-2.5 backdrop-blur-xl">
                                <ShieldCheck size={12} className="text-[#10b981]" />
                                <span className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.3em]">Imperial Verifier Lock</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.4em] font-black opacity-60">ID_REF: {crypto.randomUUID().split('-')[0].toUpperCase()}</span>
                        </div>
                        <h2 className="text-6xl font-black text-white font-mono tracking-tighter uppercase leading-[0.9]">{data.title}</h2>
                    </div>

                    <div className="flex gap-4 shrink-0">
                        <button onClick={() => onArchive(data)} className="p-5 bg-white/5 border border-white/10 rounded-[2rem] text-gray-500 hover:text-white transition-all hover:bg-white/10 hover:border-white/30 shadow-2xl active:scale-95">
                            <Save size={24} />
                        </button>
                        <div className="px-8 py-4 bg-black/40 border border-white/5 rounded-[2rem] flex flex-col items-end shadow-inner min-w-[160px]">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5 opacity-50">Risk Gradient</span>
                            <span className={cn(
                                "text-2xl font-black font-mono tracking-widest",
                                data.riskVector === 'LOW' ? "text-[#10b981]" : "text-[#ef4444]"
                            )}>{data.riskVector}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-8 relative z-10 mb-14">
                    <BlueprintStat label="Coherence Q" value={`${data.viability || 98}`} detail="%" color="#7B2CFF" />
                    <BlueprintStat label="Logical Depth" value={`L${data.depth || 8}`} detail="Nodes" color="#f97316" />
                    <BlueprintStat label="Auth Tier" value={data.complexity || 'IMPERIAL'} color="#f1c21b" />
                    <BlueprintStat label="Structural ID" value={data.type} color="#18E6FF" />
                </div>

                <div className="p-12 bg-black/60 border border-white/5 rounded-[3.5rem] shadow-inner group/logic relative overflow-hidden mb-12">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/logic:opacity-10 transition-opacity duration-1000"><Microscope size={100} /></div>
                    <div className="flex items-center gap-4 mb-8">
                        <Terminal size={22} className="text-[#7B2CFF]" />
                        <span className="text-[12px] font-black text-gray-500 uppercase tracking-[0.4em]">Core Operational Directive</span>
                    </div>
                    <p className="text-3xl text-gray-300 font-mono leading-tight italic border-l-[6px] border-[#7B2CFF] pl-12 group-hover:text-white transition-colors duration-1000">
                        "{renderSafe(data.logic || data.internalPlanningMonologue)}"
                    </p>
                </div>

                {data.type === 'DIRECTORY' && <TreeView data={data} />}
            </div>

            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-8 mb-4">
                        <div className="flex items-center gap-5">
                            <ListChecks size={28} className="text-[#10b981]" />
                            <div>
                                <span className="text-xl font-black text-white uppercase tracking-[0.4em]">Deployment Protocol</span>
                                <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mt-1.5 opacity-60">Zero-drift execution sequence</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <span className="text-[9px] font-mono text-gray-700 uppercase">Wait_State: Minimal</span>
                             <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                        </div>
                    </div>
                    
                    <ImplementationTerminal protocols={data.protocols || []} isDeploying={isDeploying} />

                    <div className="space-y-5 pt-6">
                        {(data.protocols || []).map((step: any, i: number) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-10 bg-[#0a0a0c] border border-white/5 rounded-[4rem] flex items-center gap-12 group hover:border-[#10b981]/40 transition-all shadow-2xl relative overflow-hidden backdrop-blur-4xl"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                                <div className="w-16 h-16 bg-black border border-white/10 rounded-[2rem] flex items-center justify-center shrink-0 group-hover:bg-[#10b981] group-hover:text-black transition-all shadow-2xl relative z-10 overflow-hidden group-hover:scale-105">
                                    <span className="text-2xl font-black font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                </div>
                                <div className="flex-1 min-w-0 relative z-10">
                                    <div className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.4em] mb-3 opacity-60 group-hover:opacity-100 flex items-center gap-4">
                                        {step.phase || step.role || 'CORE_LOGIC'}
                                        <div className="h-px w-12 bg-current opacity-20" />
                                    </div>
                                    <p className="text-xl text-gray-300 font-mono leading-relaxed group-hover:text-white transition-colors uppercase tracking-tight">{step.instruction}</p>
                                </div>
                                <div className="px-7 py-3 bg-black/60 border border-white/10 rounded-[1.5rem] flex items-center gap-5 shrink-0 relative z-10 shadow-inner group-hover:border-white/30 transition-all">
                                    <Binary size={18} className="text-gray-600 group-hover:text-[#22d3ee] transition-colors" />
                                    <span className="text-[11px] font-mono text-gray-500 font-black uppercase tracking-[0.3em]">{step.nodeRef || 'STABLE'}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-10">
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-[4.5rem] p-12 flex flex-col gap-12 shadow-2xl h-full invisible-glass backdrop-blur-4xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(123,44,255,0.04)_0%,transparent_70%)] pointer-events-none" />
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="p-5 bg-[#7B2CFF]/10 rounded-3xl text-[#7B2CFF] border border-[#7B2CFF]/30 shadow-2xl">
                                <Compass size={36} />
                            </div>
                            <div>
                                <span className="text-lg font-black text-white uppercase tracking-[0.4em]">System Alpha</span>
                                <p className="text-[10px] text-gray-500 font-mono uppercase mt-2 tracking-widest opacity-60">Lattice stabilization model</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-14 relative z-10">
                            <div className="space-y-8">
                                <div className="flex justify-between items-end px-2">
                                    <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Operational Success Rating</span>
                                    <span className="text-2xl font-black font-mono text-[#7B2CFF] leading-none">{data.viability}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner p-px">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${data.viability}%` }} 
                                        transition={{ duration: 2, ease: "circOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-[#7B2CFF] to-[#18E6FF] shadow-[0_0_30px_rgba(123,44,255,0.4)]" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-6 px-3">
                                {[
                                    { label: 'Latency Shift', val: '-24ms', color: '#10b981', icon: Gauge },
                                    { label: 'Network Yield', val: '+41%', color: '#22d3ee', icon: Activity },
                                    { label: 'Entropy Cost', val: 'Minimal', color: '#f1c21b', icon: Waves }
                                ].map((stat, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 group/stat">
                                        <div className="flex items-center gap-4">
                                            <stat.icon size={14} className="text-gray-700 group-hover/stat:text-white transition-colors" />
                                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest group-hover/stat:text-gray-300">{stat.label}</span>
                                        </div>
                                        <span className="text-[12px] font-black font-mono uppercase" style={{ color: stat.color }}>{stat.val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-14 border-t border-white/5 flex flex-col gap-6">
                                <button 
                                    onClick={handleCommit}
                                    disabled={isDeploying}
                                    className={cn(
                                        "w-full py-8 rounded-[3rem] text-[13px] font-black uppercase tracking-[0.6em] transition-all flex items-center justify-center gap-8 shadow-inner active:scale-95 group",
                                        isDeploying ? "bg-gray-900 text-gray-600 cursor-default" : "bg-[#10b981] hover:bg-[#15d192] text-black shadow-[0_30px_100px_rgba(16,185,129,0.3)]"
                                    )}
                                >
                                    {isDeploying ? <Loader2 size={28} className="animate-spin" /> : <PlayCircle size={32} className="group-hover:rotate-90 transition-transform duration-1000 fill-current" />}
                                    {isDeploying ? 'Protocol Live' : 'Commit Protocol'}
                                </button>
                                <button className="w-full py-6 border border-white/10 text-gray-500 hover:text-white rounded-[3rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-5 hover:bg-white/5 active:scale-95 group">
                                    <Share2 size={24} className="group-hover:scale-110 transition-transform" /> Synchronize to Swarm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Fix: Added missing DomainCard sub-component to resolve "Cannot find name 'DomainCard'" errors.
const DomainCard = ({ label, sub, icon: Icon, color, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={cn(
            "w-full p-6 rounded-[2rem] border transition-all text-left flex flex-col gap-3 relative overflow-hidden group/domain",
            active ? "bg-white/[0.03] border-current shadow-2xl" : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
        )}
        style={{ color: active ? color : undefined }}
    >
        <div className="absolute inset-0 bg-current opacity-0 group-hover/domain:opacity-5 transition-opacity" />
        <div className="flex justify-between items-start relative z-10">
            <div className={cn(
                "w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-700",
                active ? "bg-current border-current text-black shadow-lg" : "bg-black/40 border-white/10 text-gray-600"
            )}>
                <Icon size={20} className="group-hover/domain:scale-110 transition-transform" />
            </div>
            {active && (
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
            )}
        </div>
        <div className="relative z-10">
            <div className="text-[11px] font-black text-white uppercase font-mono tracking-widest leading-none">{label}</div>
            <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mt-1.5">{sub}</div>
        </div>
    </button>
);

const SynthesisBridge: React.FC = () => {
    const { actions, knowledge, dashboard } = useAppStore();
    const { addLog, archiveIntervention, deployStrategyToLattice } = actions;
    
    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM' | 'CODE'>('DRIVE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<TechnicalManifest | null>(null);
    const [customIntent, setCustomIntent] = useState('');

    const PRESETS = [
        { id: 'para_ritual', label: 'PARA 2.0 Imperial Ritual', type: 'DRIVE', description: 'Architect a Tier-1 recursive PARA file hierarchy with semantic Zettelkasten linking and strict [YYYY.MM]_[ID] naming convention protocols.', icon: FolderTree },
        { id: 'lattice_infra', label: 'Sovereign Cloud Topology', type: 'SYSTEM', description: 'Forge a high-fidelity cloud infrastructure manifest featuring edge data refraction, load-balanced ingestion, and self-healing node clusters.', icon: Globe },
        { id: 'ts_fortress', label: 'TypeScript Type Sovereignty', type: 'CODE', description: 'Imperial protocol for React/TypeScript structural integrity. Enforces explicit generic inheritance and zero-ambiguity type coverage.', icon: Shield },
    ];

    const generateBlueprint = async (presetPrompt?: string) => {
        setIsGenerating(true);
        setResult(null);
        audio.playClick();
        addLog('SYSTEM', `SYNC_INIT: Initializing Imperial Logic Forge for ${processType}...`);

        try {
            const hasKey = await promptSelectKey();
            if (!hasKey) { setIsGenerating(false); return; }
            
            const activeLayers = (knowledge.activeLayers || []).map(id => KNOWLEDGE_LAYERS[id]?.label || id).join(', ');

            const directive = presetPrompt || (processType === 'DRIVE' 
                ? "Forge a professional PARA 2.0 Imperial Drive Organization. STRUCTURE: Inbox, Projects, Areas, Resources, Archives. NAMING: [TYPE]_[DATE]_[PROJECT]. Provide deep metadata for entropy scores."
                : processType === 'SYSTEM'
                ? "Synthesize an ultra-fidelity Systems Architecture manifest. Domain: Sovereign Cloud Lattice. Include IaC Terraform/HCL execution steps and terminal logOutput."
                : "Forge a React/TypeScript Type-Safety Manifesto. Use absolute technical nomenclature and eliminate all implicit 'any' types.");

            const workflow = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', processType === 'DRIVE' ? 'DIRECTORY' : 'SYSTEM_FLOW', { 
                prompt: `${directive}. User Intent: ${customIntent}. Context Layers: ${activeLayers}.`,
                fidelity: 100
            });

            setResult(workflow);
            actions.setDashboardState({ activeManifest: workflow });
            
            addLog('SUCCESS', `SYNC_COMPLETE: ${workflow.title} manifest locked and verified.`);
            audio.playSuccess();
        } catch (e: any) {
            addLog('ERROR', `SYNC_FAIL: ${e.message}`);
            audio.playError();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full w-full bg-transparent flex flex-col font-sans overflow-hidden transition-all duration-700">
            {/* Command Header HUD */}
            <div className="h-24 border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl z-30 flex items-center justify-between px-14 shrink-0 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#7B2CFF]/60 to-transparent" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[#7B2CFF]/10 border border-[#7B2CFF]/40 rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <GitMerge size={30} className="text-[#7B2CFF] group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-[0.5em] leading-none">Synthesis Bridge</h1>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-3 block">Tactical Process Command Deck // v9.5-Zenith</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-16">
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest font-black">Lattice_Handshake</span>
                        <div className="flex items-center gap-4 bg-black/40 px-5 py-1.5 rounded-full border border-white/5 shadow-inner">
                            <span className="text-[11px] font-black font-mono text-[#10b981] uppercase tracking-tighter shimmer-text">Stable Link</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-12 gap-12 relative z-10">
                <div className="w-[420px] flex flex-col gap-10 shrink-0 overflow-y-auto custom-scrollbar pr-4">
                    <div className="p-10 bg-[#0a0a0c] border border-white/5 rounded-[3rem] shadow-2xl invisible-glass space-y-10 backdrop-blur-4xl relative overflow-hidden group/sector">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,44,255,0.03)_0%,transparent_70%)]" />
                        <div className="flex items-center gap-4 mb-4 px-2 relative z-10">
                            <Target size={20} className="text-[#7B2CFF] animate-pulse" />
                            <span className="text-[13px] font-black text-gray-500 uppercase tracking-[0.6em]">Forge Sector</span>
                        </div>
                        <div className="space-y-5 relative z-10">
                            <DomainCard 
                                id="DRIVE" label="PARA Protocol" sub="RECURSIVE TAXONOMY" icon={HardDrive} color="#7B2CFF"
                                active={processType === 'DRIVE'} onClick={() => { setProcessType('DRIVE'); audio.playClick(); }} 
                            />
                            <DomainCard 
                                id="SYSTEM" label="Cloud Lattice" sub="INFRASTRUCTURE IaC" icon={Cloud} color="#18E6FF"
                                active={processType === 'SYSTEM'} onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }} 
                            />
                             <DomainCard 
                                id="CODE" label="Type Sovereignty" sub="TECHNICAL STACK" icon={Shield} color="#f1c21b"
                                active={processType === 'CODE'} onClick={() => { setProcessType('CODE'); audio.playClick(); }} 
                            />
                        </div>
                    </div>

                    <div className="p-10 bg-[#0a0a0c] border border-white/5 rounded-[3rem] shadow-2xl invisible-glass space-y-10 backdrop-blur-4xl relative overflow-hidden group/ritual">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
                        <div className="flex items-center gap-4 mb-4 px-2 relative z-10">
                            <BookOpen size={20} className="text-gray-500" />
                            <span className="text-[13px] font-black text-gray-500 uppercase tracking-[0.6em]">Imperial Rituals</span>
                        </div>
                        <div className="space-y-5 relative z-10">
                            {PRESETS.map(preset => (
                                <button 
                                    key={preset.id}
                                    onClick={() => { setProcessType(preset.type as any); setCustomIntent(preset.description); generateBlueprint(preset.description); }}
                                    className="w-full p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-[2rem] text-left transition-all group hover:border-white/10 shadow-xl"
                                >
                                    <div className="flex items-center gap-5 mb-3">
                                        <preset.icon size={18} className="text-[#7B2CFF] group-hover:scale-110 transition-transform" />
                                        <div className="text-[12px] font-black text-white uppercase font-mono truncate tracking-tighter">{preset.label}</div>
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-mono line-clamp-2 uppercase leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6 pt-2">
                        <textarea 
                            value={customIntent}
                            onChange={e => setCustomIntent(e.target.value)}
                            placeholder="Input operational requirements..."
                            className="w-full h-44 bg-black/60 border border-white/5 rounded-[2.5rem] p-8 text-xs font-mono text-gray-300 outline-none focus:border-[#7B2CFF]/60 transition-all placeholder:text-gray-800 shadow-inner resize-none"
                        />
                        <button 
                            onClick={() => generateBlueprint()}
                            disabled={isGenerating}
                            className="w-full py-8 bg-[#7B2CFF] hover:bg-[#8e49ff] text-black rounded-[3rem] text-[12px] font-black uppercase tracking-[0.6em] transition-all shadow-[0_30px_80px_rgba(123,44,255,0.4)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-8 group/gen"
                        >
                            {isGenerating ? <Loader2 className="w-7 h-7 animate-spin" /> : <RefreshCw size={28} className="group-hover/gen:rotate-180 transition-transform duration-700" />}
                            {isGenerating ? 'Synthesizing...' : 'Forge Protocol'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-6">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <ImplementationDeck 
                                key="active-deck" 
                                data={result} 
                                onArchive={(d) => { archiveIntervention({ ...d, timestamp: Date.now() }); audio.playSuccess(); }}
                                onDeploy={(d) => { deployStrategyToLattice(d); addLog('SUCCESS', `PROTOCOL_ENGAGED: Structural transformation sequence initiated.`); audio.playSuccess(); }}
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="h-full flex flex-col items-center justify-center text-center p-24 gap-14 grayscale opacity-10 group hover:grayscale-0 hover:opacity-25 transition-all duration-1000"
                            >
                                <div className="relative">
                                    <Aperture size={240} className="text-white animate-[spin_20s_linear_infinite]" />
                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 8, repeat: Infinity }} className="absolute inset-0 bg-[#7B2CFF]/30 blur-[180px] rounded-full" />
                                </div>
                                <div className="space-y-8">
                                    <h3 className="text-5xl font-black font-mono text-white uppercase tracking-[1.5em] leading-none">Bridge Standby</h3>
                                    <p className="text-xs font-mono text-gray-500 max-w-md mx-auto uppercase tracking-[0.6em] leading-loose">Select a template or input operational intent to forge a sovereign technical manifest.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global HUD Status Strip */}
            <div className="h-12 bg-[#020204]/95 border-t border-white/5 px-14 flex items-center justify-between text-[10px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-4xl uppercase font-black tracking-widest shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="flex gap-20 items-center">
                    <div className="flex items-center gap-4 text-[#10b981] group cursor-pointer">
                        <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" /> 
                        <span className="shimmer-text">Sync_Stable</span>
                    </div>
                </div>
                <div className="flex items-center gap-14">
                    <div className="flex items-center gap-4 text-gray-600">
                        <Gauge size={14} />
                        <span>Core_Load: 12.4%</span>
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <span className="tracking-[0.8em] opacity-40 leading-none">Strategic Command Deck</span>
                    <div className="h-6 w-px bg-white/10" />
                    <span className="text-gray-500 tracking-[0.4em] leading-none">ZENITH_OS_V9.5</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;