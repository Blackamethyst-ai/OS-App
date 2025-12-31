import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, RefreshCw, Radar, HardDrive, Dna, 
    Binary, Save, Globe, ShieldCheck, DollarSign, Search, 
    ChevronRight, CheckCircle2, Layers, Landmark, ShieldAlert,
    Shield, GitCommit, Radio, Gauge, Waves, Fingerprint, PlayCircle,
    Terminal, ArrowUpRight, Compass, ListChecks, Network, 
    Database, Server, Layout, FileSearch, Workflow, AlertTriangle,
    Eye, Maximize2, Info, BarChart3, Library, Trash2, Send,
    Boxes, Cpu, Component, Share2, ClipboardList, BookOpen, 
    FolderTree,
    Cloud,
    Code,
    ChevronDown,
    FileText,
    FolderOpen
} from 'lucide-react';
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from '@google/genai';
import { retryGeminiRequest, promptSelectKey, safeParseJson } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

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

const TreeView = ({ data }: { data: any }) => {
    if (!data || !data.structure) return null;
    
    const renderNode = (node: any, depth = 0) => {
        return (
            <div key={node.name} className="space-y-1">
                <div 
                    className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-2 transition-colors cursor-default group/node"
                    style={{ paddingLeft: `${depth * 1.5}rem` }}
                >
                    {node.type === 'folder' ? (
                        <FolderOpen size={12} className="text-[#f1c21b]" />
                    ) : (
                        <FileText size={12} className="text-gray-500" />
                    )}
                    <span className={cn(
                        "text-[10px] font-mono tracking-tight",
                        node.type === 'folder' ? "text-gray-300 font-bold uppercase" : "text-gray-500"
                    )}>{node.name}</span>
                    {node.description && (
                        <span className="text-[8px] text-gray-700 opacity-0 group-hover/node:opacity-100 transition-opacity ml-2 italic">— {node.description}</span>
                    )}
                </div>
                {node.children && node.children.map((child: any) => renderNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem] shadow-inner font-mono overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <FolderTree size={16} className="text-[#f1c21b]" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Directory Topology</span>
            </div>
            {data.structure.map((root: any) => renderNode(root))}
        </div>
    );
};

const ImplementationDeck: React.FC<{
    data: any;
    onDeploy: (d: any) => void;
    onArchive: (d: any) => void;
}> = ({ data, onDeploy, onArchive }) => {
    if (!data) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8 pb-20"
        >
            <div className="p-10 bg-[#0a0a0c] border border-white/5 rounded-[3.5rem] relative overflow-hidden shadow-2xl invisible-glass">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] rotate-12"><Component size={180} /></div>
                
                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/30 rounded-full flex items-center gap-2">
                                <ShieldCheck size={10} className="text-[#10b981]" />
                                <span className="text-[9px] font-black text-[#10b981] uppercase tracking-[0.2em]">Verified Protocol</span>
                            </div>
                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Blueprint ID: {crypto.randomUUID().split('-')[0].toUpperCase()}</span>
                        </div>
                        <h2 className="text-4xl font-black text-white font-mono tracking-tighter uppercase leading-none">{data.title}</h2>
                    </div>

                    <div className="flex gap-4 shrink-0">
                        <button onClick={() => onArchive(data)} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all hover:bg-white/10">
                            <Save size={20} />
                        </button>
                        <div className="px-6 py-3 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-end">
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Risk Factor</span>
                            <span className={cn(
                                "text-lg font-black font-mono tracking-widest",
                                data.riskVector === 'LOW' ? "text-[#10b981]" : "text-[#ef4444]"
                            )}>{data.riskVector}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-6 relative z-10 mb-10">
                    <BlueprintStat label="Structural Stability" value={`${data.viability}%`} color="#7B2CFF" />
                    <BlueprintStat label="Neural Latency" value="12.4ms" color="#18E6FF" />
                    <BlueprintStat label="Complexity Tier" value={data.complexity || 'MODERATE'} color="#f1c21b" />
                    <BlueprintStat label="Recursive Depth" value={`L${data.depth || 4}`} color="#f97316" />
                </div>

                <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] shadow-inner group/logic relative overflow-hidden mb-10">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group/logic:opacity-10 transition-opacity"><Microscope size={60} /></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Terminal size={16} className="text-[#7B2CFF]" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Operational Logic</span>
                    </div>
                    <p className="text-xl text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#7B2CFF] pl-10 group-hover/logic:text-white transition-colors duration-500 select-all">
                        "{data.logic}"
                    </p>
                </div>

                {data.type === 'DIRECTORY' && <TreeView data={data} />}
            </div>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-4">
                    <div className="flex items-center gap-4 px-4 mb-6">
                        <ListChecks size={20} className="text-[#10b981]" />
                        <span className="text-xs font-black text-white uppercase tracking-[0.4em]">Implementation Sequence</span>
                    </div>
                    {data.workflowSteps.map((step: any, i: number) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] flex items-center gap-10 group hover:border-[#10b981]/30 transition-all shadow-xl relative overflow-hidden backdrop-blur-3xl"
                        >
                            <div className="w-16 h-16 bg-black border border-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#10b981] group-hover:text-black transition-all shadow-lg relative z-10 overflow-hidden">
                                <span className="text-xl font-black font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] mb-2 opacity-60 group-hover:opacity-100">{step.phase}</div>
                                <p className="text-base text-gray-300 font-mono leading-relaxed group-hover:text-white">{step.instruction}</p>
                            </div>
                            <div className="px-5 py-2.5 bg-black/60 border border-white/10 rounded-xl flex items-center gap-3 shrink-0 relative z-10">
                                <Binary size={14} className="text-gray-600" />
                                <span className="text-[9px] font-mono text-gray-500 font-black uppercase tracking-widest">{step.nodeRef}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-[3rem] p-10 flex flex-col gap-10 shadow-2xl h-full invisible-glass backdrop-blur-3xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#7B2CFF]/10 rounded-2xl text-[#7B2CFF] border border-[#7B2CFF]/20 shadow-xl">
                                <Compass size={24} />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Architectural Impact</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-10">
                            <div className="space-y-5">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Coherence Index</span>
                                    <span className="text-[14px] font-black font-mono text-[#7B2CFF]">{data.viability}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${data.viability}%` }} className="h-full bg-gradient-to-r from-[#7B2CFF] to-[#18E6FF] shadow-[0_0_15px_#7B2CFF]" />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Resource Delta</span>
                                    <span className="text-[14px] font-black font-mono text-[#18E6FF]">Optimized</span>
                                </div>
                                <div className="p-5 bg-black/60 border border-white/5 rounded-2xl text-[10px] text-gray-400 font-mono leading-relaxed italic">
                                    "Projected to reduce operational entropy by 34.2% across global nodes."
                                </div>
                            </div>
                            <div className="mt-auto pt-10 border-t border-white/5 flex flex-col gap-6">
                                <button 
                                    onClick={() => onDeploy(data)}
                                    className="w-full py-6 bg-[#10b981] hover:bg-[#15d192] text-black rounded-[2rem] text-[11px] font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-5 shadow-[0_30px_70px_rgba(16,185,129,0.3)] active:scale-95 group"
                                >
                                    <PlayCircle size={24} className="group-hover:rotate-90 transition-transform duration-700" /> Commit Protocol
                                </button>
                                <button className="w-full py-5 border border-white/10 text-gray-500 hover:text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 hover:bg-white/5 active:scale-95">
                                    <Share2 size={18} /> Broadcast Manifest
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
    const { actions, knowledge } = useAppStore();
    const { addLog, pushToInvestmentQueue, archiveIntervention } = actions;
    
    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM' | 'CODE'>('DRIVE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [customIntent, setCustomIntent] = useState('');

    const PRESETS = [
        { id: 'para_drive', label: 'PARA Drive Architecture', type: 'DRIVE', description: 'Comprehensive directory taxonomy for cinematic production. Multi-modal recursive linking.', icon: FolderTree },
        { id: 'cloud_infra', label: 'IaC Cloud Topology', type: 'SYSTEM', description: 'Self-healing edge redundant clustering for real-time inference delivery.', icon: Cloud },
        { id: 'ts_safety', label: 'Type-Safety Manifesto', type: 'CODE', description: 'Strict component inheritance and generic child-prop resolution protocols.', icon: Code },
    ];

    const generateBlueprint = async (presetPrompt?: string) => {
        setIsGenerating(true);
        setResult(null);
        audio.playClick();
        addLog('SYSTEM', `SYNC: Initializing high-fidelity logic forge for ${processType}...`);

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsGenerating(false); return; }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const activeLayers = knowledge.activeLayers.map(id => KNOWLEDGE_LAYERS[id]?.label || id).join(', ');

            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['DIRECTORY', 'SEQUENCE', 'PROTOCOL'] },
                    logic: { type: Type.STRING },
                    viability: { type: Type.NUMBER },
                    riskVector: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                    complexity: { type: Type.STRING },
                    depth: { type: Type.NUMBER },
                    structure: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['folder', 'file'] },
                                description: { type: Type.STRING },
                                children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING, enum: ['folder', 'file'] }, description: { type: Type.STRING } } } }
                            }
                        }
                    },
                    workflowSteps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                phase: { type: Type.STRING },
                                instruction: { type: Type.STRING },
                                nodeRef: { type: Type.STRING }
                            },
                            required: ['phase', 'instruction', 'nodeRef']
                        }
                    }
                },
                required: ['title', 'logic', 'viability', 'riskVector', 'workflowSteps']
            };

            const directive = presetPrompt || (processType === 'DRIVE' 
                ? "Synthesize a professional PARA file organization manifest. Include folders for Projects, Areas, Resources, Archives. Specify detailed naming conventions [DATE]_[PROJECT]_[TYPE]. Provide a structure array for the tree view."
                : processType === 'SYSTEM'
                ? "Forge a high-fidelity Systems Architecture manifest. Focus on edge redundant clustering, automated Failover/DR protocols, and IaC deployment steps. Domain: High-Scale AI Inference."
                : "Generate a technical manifesto for React/TypeScript type safety. Specifically address resolving Property props errors via explicit generic inheritance. Use strict architectural terms.");

            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Directive: ${directive}. User Context: ${customIntent}. Knowledge Layers: ${activeLayers}. Output full Structured Process Schema.`,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    thinkingConfig: { thinkingBudget: 16000 }
                }
            }));

            const data = safeParseJson<any>(response.text);
            setResult(data);
            addLog('SUCCESS', `SYNC_COMPLETE: ${data.title} crystallized and stabilized.`);
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
                            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-3">Structured Process Manifests // V9.5-ZENITH</p>
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
                                id="DRIVE" label="Drive Protocol" sub="PARA STRUCTURE" icon={HardDrive} color="#7B2CFF"
                                active={processType === 'DRIVE'} onClick={() => { setProcessType('DRIVE'); audio.playClick(); }} 
                            />
                            <DomainCard 
                                id="SYSTEM" label="Infrastructure" sub="CLOUD TOPOLOGY" icon={Server} color="#18E6FF"
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
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Standard Manifests</span>
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
                            placeholder="Initialize strategic intent sequences..."
                            className="w-full h-36 bg-black/40 border border-white/5 rounded-[2rem] p-6 text-xs font-mono text-gray-300 outline-none focus:border-[#7B2CFF]/50 transition-all placeholder:text-gray-800 shadow-inner resize-none uppercase"
                        />
                        <button 
                            onClick={() => generateBlueprint()}
                            disabled={isGenerating}
                            className="w-full py-6 bg-[#7B2CFF] hover:bg-[#8e49ff] text-black rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.5em] transition-all shadow-[0_25px_60px_rgba(123,44,255,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-5 group"
                        >
                            {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />}
                            {isGenerating ? 'FORGING...' : 'Synthesize Manifest'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-5">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <ImplementationDeck 
                                key="active-deck" 
                                data={result} 
                                onArchive={(d) => { archiveIntervention({ ...d, id: `strat-${Date.now()}`, timestamp: Date.now() }); audio.playSuccess(); }}
                                onDeploy={(d) => { pushToInvestmentQueue(d); addLog('SUCCESS', `MANIFEST_ENGAGED: Protocol authorized for deployment.`); audio.playSuccess(); }}
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="h-full flex flex-col items-center justify-center text-center p-20 gap-12 grayscale opacity-10 group hover:grayscale-0 hover:opacity-25 transition-all duration-1000"
                            >
                                <div className="relative">
                                    <Workflow size={200} className="text-white" />
                                    <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 6, repeat: Infinity }} className="absolute inset-0 bg-[#7B2CFF]/20 blur-[150px] rounded-full" />
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-4xl font-black font-mono text-white uppercase tracking-[1.2em] leading-none">Nexus Standby</h3>
                                    <p className="text-xs font-mono text-gray-500 max-w-sm mx-auto uppercase tracking-widest leading-loose">Select a standard manifest or input custom strategic intent to initialize structured process synthesis.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="h-10 bg-[#020204]/80 border-t border-white/5 px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-4xl uppercase font-black">
                <div className="flex gap-16 items-center">
                    <div className="flex items-center gap-3 text-[#10b981] tracking-[0.2em]">
                        <ShieldCheck size={16} className="shadow-[0_0_10px_#10b981]" /> Sync_Stable
                    </div>
                    <div className="flex items-center gap-3 tracking-widest">
                        <Activity size={16} className="text-[#18E6FF]" /> Load: {Math.floor(Math.random() * 8 + 2)}%
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