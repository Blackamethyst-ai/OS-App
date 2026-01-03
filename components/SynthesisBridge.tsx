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
    Lock, Unlock, ShieldAlert, Gauge, Waves, Bot, Trash2,
    // Fix: Added missing BrainCircuit and X icon imports to resolve "Cannot find name" errors.
    BrainCircuit, X
} from 'lucide-react';
import { promptSelectKey, generateStructuredWorkflow } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { TechnicalManifest, DirectoryNode, ProtocolStep, SwarmProposal } from '../types';
import { renderSafe } from '../utils/renderSafe';

const BlueprintStat = ({ label, value, color, detail }: { label: string, value: string, color: string, detail?: string }) => (
    <div className="flex flex-col gap-0.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all shadow-inner glass-refraction">
        <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color }} />
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.3em]">{label}</span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black font-mono text-white tracking-tighter" style={{ color }}>{value}</span>
            {detail && <span className="text-[6px] font-mono text-gray-600 uppercase">{detail}</span>}
        </div>
    </div>
);

const DomainCard = ({ label, sub, icon: Icon, color, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={cn(
            "w-full p-3.5 rounded-2xl border transition-all text-left flex items-center gap-3 relative overflow-hidden group/domain",
            active ? "bg-white/[0.03] border-current shadow-xl" : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
        )}
        style={{ color: active ? color : undefined }}
    >
        <div className="absolute inset-0 bg-current opacity-0 group-hover/domain:opacity-5 transition-opacity" />
        <div className={cn(
            "w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-500 shrink-0",
            active ? "bg-current border-current text-black shadow-lg" : "bg-black/40 border-white/10 text-gray-600"
        )}>
            <Icon size={16} className="group-hover/domain:scale-110 transition-transform" />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
            <div className="text-[10px] font-black text-white uppercase font-mono tracking-widest leading-none truncate">{label}</div>
            <div className="text-[7px] text-gray-600 font-mono uppercase tracking-widest mt-1 truncate">{sub}</div>
        </div>
        {active && (
            <div className="w-1 h-1 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor] ml-1" />
        )}
    </button>
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
        <div className="h-64 bg-black/90 border border-white/5 rounded-[2.5rem] p-6 font-mono text-[9px] text-[#10b981] overflow-hidden flex flex-col shadow-2xl relative group">
            <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
            <div className="absolute top-4 right-8 flex items-center gap-3">
                <span className="text-[7px] font-black text-gray-700 uppercase tracking-widest">Sovereign_Handshake</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", isDeploying ? "bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" : "bg-gray-800")} />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-4 relative z-10">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 text-gray-500 gap-3">
                        <Terminal size={32} />
                        <span className="uppercase tracking-[0.6em] text-[9px]">Awaiting Kernel Auth</span>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex gap-3 border-l border-white/5 pl-3 ml-1">
                            <span className="text-gray-700 shrink-0 select-none">#</span>
                            <span className="break-all tracking-tight opacity-90">{log}</span>
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
            <div key={node.name} className="space-y-0.5">
                <div 
                    className="flex items-center gap-3 py-1.5 hover:bg-white/5 rounded-xl px-4 transition-all cursor-default group/node border border-transparent hover:border-white/5"
                    style={{ paddingLeft: `${depth * 1.5 + 0.8}rem` }}
                >
                    <div className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center border transition-all shadow-lg",
                        isFolder ? "bg-[#f1c21b]/10 border-[#f1c21b]/30 text-[#f1c21b]" : "bg-white/5 border-white/10 text-gray-600"
                    )}>
                        {isFolder ? <FolderOpen size={10} /> : <FileText size={10} />}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                        <span className={cn(
                            "text-[10px] font-mono tracking-tight transition-colors truncate",
                            isFolder ? "text-white font-black uppercase" : "text-gray-400 group-hover/node:text-white"
                        )}>{node.name}</span>
                    </div>
                    
                    <div className="ml-auto flex items-center gap-2 opacity-0 group-hover/node:opacity-100 transition-opacity">
                        <span className={cn("text-[6px] font-black font-mono uppercase tracking-widest shrink-0", getEntropyColor(entropy))}>Drift_{entropy}%</span>
                    </div>
                </div>
                {Array.isArray(node.children) && node.children.map((child: any) => renderNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="p-6 bg-black/40 border border-white/5 rounded-[3rem] shadow-inner font-mono overflow-hidden flex flex-col group/tree relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,194,27,0.01)_0%,transparent_60%)] pointer-events-none" />
            <div className="flex items-center justify-between mb-6 px-1 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f1c21b]/10 rounded-xl border border-[#f1c21b]/30 text-[#f1c21b]">
                        <FolderTree size={14} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Drive Topology</span>
                        <p className="text-[7px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-1 block">PARA 2.0 Manifest</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px] relative z-10">
                {data.structure.map((root: any) => renderNode(root))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center px-1 opacity-40 group-hover/tree:opacity-100 transition-opacity relative z-10">
                <span className="text-[7px] font-mono text-gray-600 uppercase tracking-[0.2em] font-black">Recursive_Lattice</span>
                <button className="text-[7px] font-black font-mono text-[#f1c21b] hover:text-white transition-colors uppercase tracking-widest">
                    Raw Manifest
                </button>
            </div>
        </div>
    );
};

const ProposalQueue = () => {
    const proposals = useAppStore(s => s.synthesis.incomingProposals);
    const { actions } = useAppStore();
    const { dismissProposal, addLog, setDashboardState } = actions;

    if (proposals.length === 0) return null;

    return (
        <div className="p-5 bg-black/40 border border-white/5 rounded-[2.5rem] shadow-2xl invisible-glass space-y-6 backdrop-blur-3xl relative overflow-hidden group/ritual shrink-0">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(157,78,221,0.02)_0%,transparent_70%)]" />
             <div className="flex items-center justify-between px-2 relative z-10">
                <div className="flex items-center gap-3">
                    <BrainCircuit size={16} className="text-[#9d4edd] animate-pulse" />
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Neural Queue</span>
                </div>
                <span className="text-[7px] px-2 py-0.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded text-[#9d4edd] font-black uppercase">Swarm_Signals</span>
             </div>

             <div className="space-y-3 relative z-10">
                {proposals.map(prop => (
                    <motion.div 
                        key={prop.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group transition-all hover:border-[#9d4edd]/30"
                    >
                        <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <Bot size={12} className="text-[#9d4edd]" />
                                <span className="text-[10px] font-black text-white uppercase truncate max-w-[140px]">{prop.agentName}</span>
                             </div>
                             <button onClick={() => dismissProposal(prop.id)} className="text-gray-700 hover:text-red-500 transition-colors"><X size={12} /></button>
                        </div>
                        <h4 className="text-[11px] font-black text-[#9d4edd] uppercase mb-1">{prop.title}</h4>
                        <p className="text-[9px] text-gray-500 font-mono leading-relaxed line-clamp-2 uppercase italic mb-3">"{prop.description}"</p>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { 
                                    setDashboardState({ activeManifest: prop.manifest });
                                    addLog('INFO', `PREVIEW: Reviewing ${prop.type} proposal from Swarm.`);
                                    audio.playClick();
                                }}
                                className="flex-1 py-1.5 bg-black border border-white/10 rounded-lg text-[8px] font-black uppercase text-gray-400 hover:text-white transition-all"
                            >
                                Review
                            </button>
                            <button 
                                onClick={() => {
                                    addLog('SUCCESS', `ATTESTATION: Proposal [${prop.title}] locked for implementation.`);
                                    dismissProposal(prop.id);
                                    audio.playSuccess();
                                }}
                                className="flex-1 py-1.5 bg-[#9d4edd]/20 border border-[#9d4edd]/40 rounded-lg text-[8px] font-black uppercase text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black transition-all"
                            >
                                Attest
                            </button>
                        </div>
                    </motion.div>
                ))}
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
            className="flex flex-col gap-6 pb-32"
        >
            <div className="p-8 crystalline rounded-[3.5rem] relative overflow-hidden shadow-2xl glass-refraction">
                <div className="absolute top-0 right-0 p-10 opacity-[0.01] rotate-12 pointer-events-none scale-150"><Component size={140} /></div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="px-2.5 py-0.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded-full flex items-center gap-1.5 backdrop-blur-xl">
                                <ShieldCheck size={9} className="text-[#10b981]" />
                                <span className="text-[8px] font-black text-[#10b981] uppercase tracking-[0.3em]">Verified</span>
                            </div>
                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.4em] font-black opacity-60">ID: {crypto.randomUUID().split('-')[0].toUpperCase()}</span>
                        </div>
                        <h2 className="text-4xl font-black text-white font-mono tracking-tighter uppercase leading-[0.9]">{data.title}</h2>
                    </div>

                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => onArchive(data)} className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white transition-all shadow-xl active:scale-95">
                            <Save size={16} />
                        </button>
                        <div className="px-5 py-2.5 bg-black/40 border border-white/5 rounded-xl flex flex-col items-end shadow-inner min-w-[120px]">
                            <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-0.5 opacity-50">Risk Vector</span>
                            <span className={cn(
                                "text-lg font-black font-mono tracking-widest",
                                data.riskVector === 'LOW' ? "text-[#10b981]" : "text-[#ef4444]"
                            )}>{data.riskVector}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 relative z-10 mb-8">
                    <BlueprintStat label="Coherence Q" value={`${data.viability || 98}`} detail="%" color="#7B2CFF" />
                    <BlueprintStat label="Node Count" value={`L${data.depth || 8}`} color="#f97316" />
                    <BlueprintStat label="Complexity" value={data.complexity || 'IMPERIAL'} color="#f1c21b" />
                    <BlueprintStat label="Structure" value={data.type} color="#18E6FF" />
                </div>

                <div className="p-6 bg-black/60 border border-white/5 rounded-[2.5rem] shadow-inner group/logic relative overflow-hidden mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Terminal size={14} className="text-[#7B2CFF]" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">Directive</span>
                    </div>
                    <p className="text-xl text-gray-300 font-mono leading-tight italic border-l-2 border-[#7B2CFF] pl-6 group-hover:text-white transition-colors duration-1000">
                        "{renderSafe(data.logic || data.internalPlanningMonologue)}"
                    </p>
                </div>

                {data.type === 'DIRECTORY' && <TreeView data={data} />}
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 space-y-4">
                    <div className="flex items-center gap-3 px-3 mb-1">
                        <ListChecks size={20} className="text-[#10b981]" />
                        <div>
                            <span className="text-base font-black text-white uppercase tracking-[0.4em]">Protocol Execution</span>
                        </div>
                    </div>
                    
                    <ImplementationTerminal protocols={data.protocols || []} isDeploying={isDeploying} />

                    <div className="space-y-3 pt-2">
                        {(data.protocols || []).map((step: any, i: number) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-6 bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] flex items-center gap-8 group hover:border-[#10b981]/40 transition-all shadow-2xl relative overflow-hidden backdrop-blur-4xl"
                            >
                                <div className="w-10 h-10 bg-black border border-white/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#10b981] group-hover:text-black transition-all shadow-2xl relative z-10 overflow-hidden group-hover:scale-105">
                                    <span className="text-lg font-black font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                </div>
                                <div className="flex-1 min-w-0 relative z-10">
                                    <div className="text-[8px] font-black text-[#10b981] uppercase tracking-[0.4em] mb-1 opacity-60 group-hover:opacity-100 flex items-center gap-2">
                                        {step.phase || step.role || 'CORE_LOGIC'}
                                        <div className="h-px w-8 bg-current opacity-20" />
                                    </div>
                                    <p className="text-base text-gray-300 font-mono leading-relaxed group-hover:text-white transition-colors uppercase tracking-tight truncate">{step.instruction}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-[3rem] p-8 flex flex-col gap-8 shadow-2xl h-full invisible-glass backdrop-blur-4xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(123,44,255,0.02)_0%,transparent_70%)] pointer-events-none" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-[#7B2CFF]/10 rounded-2xl text-[#7B2CFF] border border-[#7B2CFF]/30">
                                <Compass size={24} />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white uppercase tracking-[0.4em]">Success Model</span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-8 relative z-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Viability</span>
                                    <span className="text-lg font-black font-mono text-[#7B2CFF] leading-none">{data.viability}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner p-px">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${data.viability}%` }} 
                                        transition={{ duration: 2, ease: "circOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-[#7B2CFF] to-[#18E6FF]" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 px-1">
                                {[
                                    { label: 'Latency', val: '-24ms', color: '#10b981', icon: Gauge },
                                    { label: 'Yield', val: '+41%', color: '#22d3ee', icon: Activity }
                                ].map((stat, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 group/stat">
                                        <div className="flex items-center gap-2">
                                            <stat.icon size={10} className="text-gray-700 group-hover/stat:text-white transition-colors" />
                                            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                        <span className="text-[9px] font-black font-mono uppercase" style={{ color: stat.color }}>{stat.val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
                                <button 
                                    onClick={handleCommit}
                                    disabled={isDeploying}
                                    className={cn(
                                        "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 shadow-inner active:scale-95 group",
                                        isDeploying ? "bg-gray-900 text-gray-600 cursor-default" : "bg-[#10b981] hover:bg-[#15d192] text-black shadow-[0_15px_40px_rgba(16,185,129,0.2)]"
                                    )}
                                >
                                    {isDeploying ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={20} className="group-hover:rotate-90 transition-transform duration-1000 fill-current" />}
                                    Commit
                                </button>
                                <button className="w-full py-3 border border-white/10 text-gray-500 hover:text-white rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-white/5 active:scale-95 group">
                                    <Share2 size={16} /> Synchronize
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const SynthesisBridge: React.FC = () => {
    const { actions, knowledge, dashboard } = useAppStore();
    const { addLog, archiveIntervention, deployStrategyToLattice } = actions;
    
    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM' | 'CODE'>('DRIVE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<TechnicalManifest | null>(null);
    const [customIntent, setCustomIntent] = useState('');

    const PRESETS = [
        { id: 'para_ritual', label: 'PARA 2.0 Imperial Ritual', type: 'DRIVE', description: 'Architect a Tier-1 recursive PARA file hierarchy with semantic linking and strict convention protocols.', icon: FolderTree },
        { id: 'lattice_infra', label: 'Cloud Topology', type: 'SYSTEM', description: 'Forge a high-fidelity cloud manifest featuring edge data refraction and self-healing node clusters.', icon: Globe },
        { id: 'ts_fortress', label: 'Type Sovereignty', type: 'CODE', description: 'Imperial protocol for React/TypeScript structural integrity. Enforces generic inheritance.', icon: Shield },
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
            <div className="h-20 border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl z-30 flex items-center justify-between px-12 shrink-0 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7B2CFF]/60 to-transparent" />
                
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-[#7B2CFF]/10 border border-[#7B2CFF]/40 rounded-2xl shadow-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <GitMerge size={24} className="text-[#7B2CFF] group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase tracking-[0.4em] leading-none">Synthesis Bridge</h1>
                            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-2 block opacity-60">Tactical Process Command Deck // v9.5-Zenith</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-4 bg-black/40 px-5 py-1 rounded-full border border-white/5 shadow-inner">
                            <span className="text-[10px] font-black font-mono text-[#10b981] uppercase tracking-widest shimmer-text leading-none">Stable Link</span>
                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_12px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-10 gap-8 relative z-10">
                <div className="w-[380px] flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-2">
                    <div className="p-5 bg-[#0a0a0c]/60 border border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-3xl relative overflow-hidden group/sector">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,44,255,0.02)_0%,transparent_70%)]" />
                        <div className="flex items-center gap-3 mb-4 px-1 relative z-10">
                            <Target size={18} className="text-[#7B2CFF] animate-pulse" />
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Forge Sector</span>
                        </div>
                        <div className="space-y-3 relative z-10">
                            <DomainCard 
                                id="DRIVE" label="PARA Protocol" sub="DATA TAXONOMY" icon={HardDrive} color="#7B2CFF"
                                active={processType === 'DRIVE'} onClick={() => { setProcessType('DRIVE'); audio.playClick(); }} 
                            />
                            <DomainCard 
                                id="SYSTEM" label="Cloud Lattice" sub="INFRASTRUCTURE" icon={Cloud} color="#18E6FF"
                                active={processType === 'SYSTEM'} onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }} 
                            />
                             <DomainCard 
                                id="CODE" label="Type Sovereignty" sub="TECHNICAL STACK" icon={Shield} color="#f1c21b"
                                active={processType === 'CODE'} onClick={() => { setProcessType('CODE'); audio.playClick(); }} 
                            />
                        </div>
                    </div>

                    <ProposalQueue />

                    <div className="p-5 bg-[#0a0a0c]/60 border border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-3xl relative overflow-hidden group/ritual">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
                        <div className="flex items-center gap-3 mb-4 px-1 relative z-10">
                            <BookOpen size={18} className="text-gray-500" />
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Imperial Rituals</span>
                        </div>
                        <div className="space-y-3 relative z-10">
                            {PRESETS.map(preset => (
                                <button 
                                    key={preset.id}
                                    onClick={() => { setProcessType(preset.type as any); setCustomIntent(preset.description); generateBlueprint(preset.description); }}
                                    className={cn(
                                        "w-full p-4 rounded-xl text-left transition-all group border shadow-xl flex flex-col gap-1.5 relative overflow-hidden",
                                        "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <preset.icon size={14} className="text-[#7B2CFF] group-hover:scale-110 transition-transform" />
                                        <div className="text-[10px] font-black text-white uppercase font-mono truncate tracking-tight">{preset.label}</div>
                                    </div>
                                    <div className="text-[8px] text-gray-600 font-mono line-clamp-1 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-1">
                        <textarea 
                            value={customIntent}
                            onChange={e => setCustomIntent(e.target.value)}
                            placeholder="Input operational requirements..."
                            className="w-full h-32 bg-black/60 border border-white/5 rounded-[2rem] p-5 text-[10px] font-mono text-gray-300 outline-none focus:border-[#7B2CFF]/60 transition-all placeholder:text-gray-800 shadow-inner resize-none"
                        />
                        <button 
                            onClick={() => generateBlueprint()}
                            disabled={isGenerating}
                            className="w-full py-4 bg-[#7B2CFF] hover:bg-[#8e49ff] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] transition-all shadow-[0_15px_40px_rgba(123,44,255,0.2)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group/gen"
                        >
                            {isGenerating ? <Loader2 size={15} className="w-5 h-5 animate-spin" /> : <RefreshCw size={18} className="group-hover/gen:rotate-180 transition-transform duration-700" />}
                            {isGenerating ? 'Synthesizing...' : 'Forge Protocol'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-5">
                    <AnimatePresence mode="wait">
                        {(result || dashboard.activeManifest) ? (
                            <ImplementationDeck 
                                key="active-deck" 
                                data={(result || dashboard.activeManifest) as TechnicalManifest} 
                                onArchive={(d) => { archiveIntervention({ ...d, timestamp: Date.now() }); audio.playSuccess(); }}
                                onDeploy={(d) => { deployStrategyToLattice(d); addLog('SUCCESS', `PROTOCOL_ENGAGED: Structural transformation sequence initiated.`); audio.playSuccess(); }}
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="h-full flex flex-col items-center justify-center text-center p-20 gap-10 grayscale opacity-10 group hover:grayscale-0 hover:opacity-25 transition-all duration-1000"
                            >
                                <div className="relative">
                                    <Aperture size={180} className="text-white animate-[spin_20s_linear_infinite]" />
                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 8, repeat: Infinity }} className="absolute inset-0 bg-[#7B2CFF]/20 blur-[150px] rounded-full" />
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-4xl font-black font-mono text-white uppercase tracking-[1em] leading-none">Bridge Standby</h3>
                                    <p className="text-[10px] font-mono text-gray-500 max-w-md mx-auto uppercase tracking-[0.4em] leading-loose">Select a template or input operational intent to forge a sovereign technical manifest.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global HUD Status Strip */}
            <div className="h-10 bg-[#020204]/95 border-t border-white/5 px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-4xl uppercase font-black tracking-widest">
                <div className="flex gap-16 items-center">
                    <div className="flex items-center gap-3 text-[#10b981] group cursor-pointer leading-none">
                        <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" /> 
                        <span className="shimmer-text">Sync_Stable</span>
                    </div>
                </div>
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4 text-gray-600 leading-none">
                        <Gauge size={14} />
                        <span>Core_Load: 12.4%</span>
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <span className="tracking-[0.8em] opacity-40 leading-none uppercase">Strategic Command Deck</span>
                    <div className="h-6 w-px bg-white/10" />
                    <span className="text-gray-500 tracking-[0.4em] leading-none uppercase">ZENITH_OS_V9.5</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;
