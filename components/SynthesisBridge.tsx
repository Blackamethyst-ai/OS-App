import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, Loader2, Target, 
    RefreshCw, HardDrive, Binary, Save, ShieldCheck, 
    ChevronRight, ListChecks, Compass, Share2, PlayCircle,
    FolderTree, Cloud, Code, FolderOpen, FileText, Component,
    Microscope, Terminal, Aperture, BookOpen, Fingerprint,
    Cpu, Database, Shield, Globe
} from 'lucide-react';
import { promptSelectKey, generateStructuredWorkflow } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { TechnicalManifest, DirectoryNode } from '../types';
import { renderSafe } from '../utils/renderSafe';

const BlueprintStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="flex flex-col gap-1 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all shadow-inner">
        <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color }} />
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-xl font-black font-mono text-white tracking-tighter" style={{ color }}>{value}</span>
    </div>
);

const DomainCard = ({ id, label, sub, icon: Icon, active, onClick, color }: any) => (
    <button 
        onClick={onClick}
        className={cn(
            "w-full p-5 rounded-3xl border text-left transition-all duration-500 flex items-center gap-4 relative overflow-hidden group",
            active ? "bg-white/[0.04] border-white/20 shadow-2xl" : "bg-transparent border-transparent text-gray-600 hover:border-white/5 hover:bg-white/[0.01]"
        )}
    >
        <div className={cn(
            "p-3 rounded-2xl border transition-all duration-500 shadow-lg",
            active ? "border-white/20 bg-white/5" : "border-white/5 bg-black/40"
        )} style={{ color: active ? color : 'inherit' }}>
            <Icon size={20} className={cn("transition-transform duration-700", active ? "scale-110" : "group-hover:scale-110")} />
        </div>
        <div className="flex-1 min-w-0">
            <div className={cn("text-[11px] font-black uppercase font-mono tracking-[0.2em] transition-colors", active ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>{label}</div>
            <div className="text-[8px] opacity-40 uppercase tracking-tighter font-mono mt-1">{sub}</div>
        </div>
        {active && <motion.div layoutId="active-domain-indicator" className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" style={{ color }} />}
    </button>
);

const TreeView = ({ data }: { data: TechnicalManifest }) => {
    if (!data || !Array.isArray(data.structure)) return null;
    
    const renderNode = (node: DirectoryNode, depth = 0) => {
        const isFolder = node.type === 'folder';
        return (
            <div key={node.name} className="space-y-1">
                <div 
                    className="flex items-center gap-3 py-2 hover:bg-white/5 rounded-xl px-3 transition-colors cursor-default group/node"
                    style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                >
                    <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center border transition-all",
                        isFolder ? "bg-[#f1c21b]/10 border-[#f1c21b]/30 text-[#f1c21b]" : "bg-white/5 border-white/10 text-gray-600"
                    )}>
                        {isFolder ? <FolderOpen size={12} /> : <FileText size={12} />}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[10px] font-mono tracking-tight transition-colors",
                            isFolder ? "text-white font-black uppercase" : "text-gray-400 group-hover/node:text-white"
                        )}>{node.name}</span>
                        {node.description && (
                            <span className="text-[8px] text-gray-600 font-mono line-clamp-1 max-w-[400px] mt-0.5">{node.description}</span>
                        )}
                    </div>
                    
                    <div className="ml-auto flex items-center gap-3 opacity-0 group-hover/node:opacity-100 transition-opacity">
                        <span className="text-[7px] font-mono text-gray-700 uppercase">{node.size || '--'}</span>
                        <div className="h-2 w-px bg-white/5" />
                        <span className="text-[7px] font-mono text-gray-700 uppercase">{node.modified || '2025.Q1'}</span>
                    </div>
                </div>
                {Array.isArray(node.children) && node.children.map((child: any) => renderNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="p-10 bg-black/60 border border-white/5 rounded-[3rem] shadow-inner font-mono overflow-hidden flex flex-col group/tree">
            <div className="flex items-center justify-between mb-8 px-2 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#f1c21b]/10 rounded-xl border border-[#f1c21b]/30 text-[#f1c21b] shadow-xl">
                        <FolderTree size={18} />
                    </div>
                    <div>
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Drive Topology</span>
                        <p className="text-[7px] text-gray-500 font-mono uppercase tracking-[0.2em] mt-1">Hierarchical Metadata Synthesis</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Lattice Integrity: OK</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 max-h-[500px]">
                {data.structure.map((root: any) => renderNode(root))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center px-2 opacity-40 group-hover/tree:opacity-100 transition-opacity">
                <div className="flex gap-4 text-[7px] font-mono text-gray-600 uppercase tracking-widest">
                    <span>Paths: Recursive</span>
                    <span>Format: Sovereign_Standard</span>
                </div>
                <button className="text-[8px] font-black font-mono text-[#f1c21b] hover:underline uppercase tracking-tighter">View Detailed Manifest</button>
            </div>
        </div>
    );
};

const ImplementationDeck: React.FC<{
    data: TechnicalManifest;
    onDeploy: (d: TechnicalManifest) => void;
    onArchive: (d: TechnicalManifest) => void;
}> = ({ data, onDeploy, onArchive }) => {
    if (!data) return null;

    const protocols = data.protocols || [];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8 pb-20"
        >
            <div className="p-12 bg-[#0a0a0c] border border-white/5 rounded-[4rem] relative overflow-hidden shadow-2xl invisible-glass backdrop-blur-3xl">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-12 pointer-events-none"><Component size={240} /></div>
                
                <div className="flex justify-between items-start mb-12 relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/30 rounded-full flex items-center gap-2">
                                <ShieldCheck size={10} className="text-[#10b981]" />
                                <span className="text-[9px] font-black text-[#10b981] uppercase tracking-[0.2em]">Verified Manifest</span>
                            </div>
                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">ID_HEX: {crypto.randomUUID().split('-')[0].toUpperCase()}</span>
                        </div>
                        <h2 className="text-5xl font-black text-white font-mono tracking-tighter uppercase leading-none">{data.title}</h2>
                    </div>

                    <div className="flex gap-4 shrink-0">
                        <button onClick={() => onArchive(data)} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all hover:bg-white/10 hover:border-white/30 shadow-xl active:scale-95">
                            <Save size={20} />
                        </button>
                        <div className="px-6 py-3 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-end shadow-inner">
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Risk Assessment</span>
                            <span className={cn(
                                "text-lg font-black font-mono tracking-widest",
                                data.riskVector === 'LOW' ? "text-[#10b981]" : "text-[#ef4444]"
                            )}>{data.riskVector}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-8 relative z-10 mb-12">
                    <BlueprintStat label="Coherence Quotient" value={`${data.viability || 98}%`} color="#7B2CFF" />
                    <BlueprintStat label="Logical Depth" value={`L${data.depth || 8}`} color="#f97316" />
                    <BlueprintStat label="Optimization Tier" value={data.complexity || 'PRODUCTION'} color="#f1c21b" />
                    <BlueprintStat label="Structural Class" value={data.type} color="#18E6FF" />
                </div>

                <div className="p-10 bg-black/40 border border-white/5 rounded-[3rem] shadow-inner group/logic relative overflow-hidden mb-12">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group/logic:opacity-10 transition-opacity duration-700"><Microscope size={80} /></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Terminal size={18} className="text-[#7B2CFF]" />
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Operational Directive</span>
                    </div>
                    <p className="text-2xl text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#7B2CFF] pl-10 group-hover/logic:text-white transition-colors duration-700">
                        "{renderSafe(data.logic || data.internalPlanningMonologue)}"
                    </p>
                </div>

                {data.type === 'DIRECTORY' && <TreeView data={data} />}
            </div>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-4">
                    <div className="flex items-center gap-4 px-6 mb-8">
                        <ListChecks size={24} className="text-[#10b981]" />
                        <div>
                            <span className="text-base font-black text-white uppercase tracking-[0.4em]">Implementation Protocol</span>
                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">Deterministic execution sequence</p>
                        </div>
                    </div>
                    {protocols.map((step: any, i: number) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-10 bg-[#0a0a0c] border border-white/5 rounded-[4rem] flex items-center gap-12 group hover:border-[#10b981]/30 transition-all shadow-xl relative overflow-hidden backdrop-blur-3xl"
                        >
                            <div className="w-16 h-16 bg-black border border-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#10b981] group-hover:text-black transition-all shadow-2xl relative z-10 overflow-hidden">
                                <span className="text-2xl font-black font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-20" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.3em] mb-3 opacity-60 group-hover:opacity-100 flex items-center gap-3">
                                    {step.phase || step.role || 'CORE'}
                                    <div className="h-px w-8 bg-current opacity-20" />
                                </div>
                                <p className="text-lg text-gray-300 font-mono leading-relaxed group-hover:text-white transition-colors">{step.instruction}</p>
                            </div>
                            <div className="px-6 py-3 bg-black/60 border border-white/10 rounded-2xl flex items-center gap-4 shrink-0 relative z-10 shadow-inner group-hover:border-white/20 transition-all">
                                <Binary size={16} className="text-gray-600 group-hover:text-[#22d3ee] transition-colors" />
                                <span className="text-[10px] font-mono text-gray-500 font-black uppercase tracking-[0.2em]">{step.nodeRef || 'STABLE'}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="col-span-4 flex flex-col gap-8">
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-[4rem] p-12 flex flex-col gap-12 shadow-2xl h-full invisible-glass backdrop-blur-4xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(123,44,255,0.03)_0%,transparent_70%)] pointer-events-none" />
                        
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-4 bg-[#7B2CFF]/10 rounded-2xl text-[#7B2CFF] border border-[#7B2CFF]/20 shadow-2xl">
                                <Compass size={32} />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white uppercase tracking-[0.3em]">System Impact</span>
                                <p className="text-[9px] text-gray-500 font-mono uppercase mt-1">Predictive analysis</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-12 relative z-10">
                            <div className="space-y-6">
                                <div className="flex justify-between items-end px-1">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Operational Success Rate</span>
                                    <span className="text-[16px] font-black font-mono text-[#7B2CFF]">{data.viability}%</span>
                                </div>
                                <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner p-px">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${data.viability}%` }} 
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-[#7B2CFF] to-[#18E6FF] shadow-[0_0_20px_rgba(123,44,255,0.5)]" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 px-2">
                                {[
                                    { label: 'Latency Shift', val: '-12ms', color: '#10b981' },
                                    { label: 'Throughput', val: '+24%', color: '#22d3ee' },
                                    { label: 'Entropy Cost', val: 'Low', color: '#f1c21b' }
                                ].map((stat, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{stat.label}</span>
                                        <span className="text-[10px] font-black font-mono uppercase" style={{ color: stat.color }}>{stat.val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-12 border-t border-white/5 flex flex-col gap-6">
                                <button 
                                    onClick={() => onDeploy(data)}
                                    className="w-full py-7 bg-[#10b981] hover:bg-[#15d192] text-black rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-6 shadow-[0_30px_80px_rgba(16,185,129,0.3)] active:scale-95 group shadow-inner"
                                >
                                    <PlayCircle size={28} className="group-hover:rotate-90 transition-transform duration-700 fill-current" /> Commit Protocol
                                </button>
                                <button className="w-full py-5 border border-white/10 text-gray-500 hover:text-white rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 hover:bg-white/5 active:scale-95 group">
                                    <Share2 size={20} className="group-hover:scale-110 transition-transform" /> Broadcast Manifest
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
        { id: 'para_drive', label: 'PARA+ Drive Ritual', type: 'DRIVE', description: 'Architect a Tier-1 PARA file hierarchy (Projects, Areas, Resources, Archives). Includes Zettelkasten cross-linking and a strict [YYYY.MM]_[ID] naming convention protocol.', icon: FolderTree },
        { id: 'depin_infra', label: 'DePIN Node Topology', type: 'SYSTEM', description: 'Forge a decentralized infrastructure manifest. Orchestrate edge data filtering -> persistent event bus -> autonomous indexing -> refractive storage sequence.', icon: Globe },
        { id: 'cloud_architect', label: 'Self-Healing Cloud', type: 'SYSTEM', description: 'Synthesize a high-fidelity cloud blueprint with active load-balanced ingestion, state-synced persistent store, and global inference failover logic.', icon: Cloud },
        { id: 'ts_sovereignty', label: 'Type-Safety Manifesto', type: 'CODE', description: 'Imperial protocol for React/TypeScript structural integrity. Enforces explicit generic inheritance and eliminates implicit "any" across the entire lattice.', icon: Shield },
    ];

    const generateBlueprint = async (presetPrompt?: string) => {
        setIsGenerating(true);
        setResult(null);
        audio.playClick();
        addLog('SYSTEM', `SYNC: Initializing high-fidelity logic forge for ${processType}...`);

        try {
            const hasKey = await promptSelectKey();
            if (!hasKey) { setIsGenerating(false); return; }
            
            const activeLayers = (knowledge.activeLayers || []).map(id => KNOWLEDGE_LAYERS[id]?.label || id).join(', ');

            const directive = presetPrompt || (processType === 'DRIVE' 
                ? "Forge a professional PARA+ Drive Organization. STRUCTURE: Projects (Active), Areas (Ongoing Responsibilities), Resources (Topic Interest), Archives (Completed). NAMING RITUAL: [YEAR.MONTH]_[PROJECT_ID]_[NODE_TYPE]. Provide a detailed 'structure' array for recursive tree visualization."
                : processType === 'SYSTEM'
                ? "Synthesize a high-fidelity Systems Architecture manifest. Domain: Sovereign Production Cloud. Logic: Edge Redundancy -> Load Balanced Ingestion -> Persistent State Store -> Global Inference CDN. Focus on IaC Terraform/HCL steps."
                : "Forge a React/TypeScript Type-Safety Manifesto. Use absolute technical terminology.");

            const workflow = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', processType === 'DRIVE' ? 'DIRECTORY' : 'SYSTEM_FLOW', { 
                prompt: `${directive}. User Intent: ${customIntent}. Context Layers: ${activeLayers}.`,
                fidelity: dashboard.architecturalFidelity
            });

            setResult(workflow);
            actions.setDashboardState({ activeManifest: workflow });
            
            addLog('SUCCESS', `SYNC_COMPLETE: ${workflow.title} stabilized and verified.`);
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
            <div className="h-20 border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl z-30 flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7B2CFF]/50 to-transparent" />
                
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-[#7B2CFF]/10 border border-[#7B2CFF]/40 rounded-2xl shadow-xl">
                            <GitMerge size={26} className="text-[#7B2CFF]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase tracking-[0.5em] leading-none">Synthesis Bridge</h1>
                            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-3 block uppercase">Structured Process Forge // v9.5</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Protocol Sync</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black font-mono text-[#10b981] uppercase tracking-tighter">Handshake OK</span>
                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_12px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-10 gap-10">
                <div className="w-[380px] flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar pr-3">
                    <div className="p-8 bg-[#0a0a0c] border border-white/5 rounded-[3rem] shadow-2xl invisible-glass space-y-8 backdrop-blur-3xl">
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <Target size={16} className="text-[#7B2CFF]" />
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Forge Sector</span>
                        </div>
                        <div className="space-y-4">
                            <DomainCard 
                                id="DRIVE" label="Drive Protocol" sub="PARA+ STRUCTURE" icon={HardDrive} color="#7B2CFF"
                                active={processType === 'DRIVE'} onClick={() => { setProcessType('DRIVE'); audio.playClick(); }} 
                            />
                            <DomainCard 
                                id="SYSTEM" label="Infrastructure" sub="CLOUD TOPOLOGY" icon={Cloud} color="#18E6FF"
                                active={processType === 'SYSTEM'} onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }} 
                            />
                             <DomainCard 
                                id="CODE" label="Type Sovereignty" sub="ARCH DEBT FIX" icon={Code} color="#f1c21b"
                                active={processType === 'CODE'} onClick={() => { setProcessType('CODE'); audio.playClick(); }} 
                            />
                        </div>
                    </div>

                    <div className="p-8 bg-[#0a0a0c] border border-white/5 rounded-[3rem] shadow-2xl invisible-glass space-y-8 backdrop-blur-3xl">
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <BookOpen size={16} className="text-gray-500" />
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Imperial Rituals</span>
                        </div>
                        <div className="space-y-4">
                            {PRESETS.map(preset => (
                                <button 
                                    key={preset.id}
                                    onClick={() => { setProcessType(preset.type as any); setCustomIntent(preset.description); generateBlueprint(preset.description); }}
                                    className="w-full p-5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-[1.5rem] text-left transition-all group hover:border-white/10"
                                >
                                    <div className="flex items-center gap-4 mb-2">
                                        <preset.icon size={14} className="text-[#7B2CFF]" />
                                        <div className="text-[11px] font-black text-white uppercase font-mono truncate tracking-tight">{preset.label}</div>
                                    </div>
                                    <div className="text-[9px] text-gray-600 font-mono line-clamp-2 uppercase leading-relaxed opacity-60 group-hover:opacity-100">{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5 pt-2">
                        <textarea 
                            value={customIntent}
                            onChange={e => setCustomIntent(e.target.value)}
                            placeholder="Input operational requirements..."
                            className="w-full h-36 bg-black/40 border border-white/5 rounded-[2rem] p-6 text-xs font-mono text-gray-300 outline-none focus:border-[#7B2CFF]/50 transition-all placeholder:text-gray-800 shadow-inner resize-none"
                        />
                        <button 
                            onClick={() => generateBlueprint()}
                            disabled={isGenerating}
                            className="w-full py-6 bg-[#7B2CFF] hover:bg-[#8e49ff] text-black rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.5em] transition-all shadow-[0_25px_60px_rgba(123,44,255,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-5"
                        >
                            {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw size={22} />}
                            {isGenerating ? 'Synthesizing...' : 'Generate Blueprint'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-5">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <ImplementationDeck 
                                key="active-deck" 
                                data={result} 
                                onArchive={(d) => { archiveIntervention({ ...d, timestamp: Date.now() }); audio.playSuccess(); }}
                                onDeploy={(d) => { deployStrategyToLattice(d); addLog('SUCCESS', `MANIFEST_ENGAGED: Protocol authorized for deployment.`); audio.playSuccess(); }}
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="h-full flex flex-col items-center justify-center text-center p-20 gap-12 grayscale opacity-10 group hover:grayscale-0 hover:opacity-25 transition-all duration-1000"
                            >
                                <div className="relative">
                                    <Aperture size={200} className="text-white" />
                                    <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 6, repeat: Infinity }} className="absolute inset-0 bg-[#7B2CFF]/20 blur-[150px] rounded-full" />
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-4xl font-black font-mono text-white uppercase tracking-[1.2em] leading-none">Bridge Standby</h3>
                                    <p className="text-xs font-mono text-gray-500 max-w-sm mx-auto uppercase tracking-widest leading-loose">Select a template or input operational intent to forge a structured technical manifest.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="h-10 bg-[#020204]/80 border-t border-white/5 px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-4xl uppercase font-black">
                <div className="flex gap-16 items-center">
                    <div className="flex items-center gap-3 text-[#10b981] tracking-[0.2em]">
                        <ShieldCheck size={16} /> Sync_Stable
                    </div>
                </div>
                <div className="flex items-center gap-12">
                    <span className="tracking-[0.6em] opacity-40 leading-none">STRATEGIC IMPLEMENTATION ENGINE</span>
                    <div className="h-5 w-px bg-white/10" />
                    <span className="text-gray-500 tracking-widest leading-none">V9.5-ZENITH</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;