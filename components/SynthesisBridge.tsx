
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
    Boxes, Cpu, Component, Share2, ClipboardList
} from 'lucide-react';
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from '@google/genai';
import { retryGeminiRequest, promptSelectKey, safeParseJson } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { 
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

/**
 * --- BLUEPRINT COMMAND DECK ---
 * Impeccable upgrade to the Synthesis Bridge.
 * Dedicated to structured processes: PARA organization and System Architecture.
 */

const BlueprintStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="flex flex-col gap-1 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all">
        <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color }} />
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-xl font-black font-mono text-white tracking-tighter" style={{ color }}>{value}</span>
    </div>
);

const DomainCard = ({ id, label, sub, icon: Icon, active, onClick, color }: any) => (
    <button 
        onClick={onClick}
        className={cn(
            "w-full p-5 rounded-2xl border text-left transition-all duration-500 flex items-center gap-4 relative overflow-hidden group",
            active ? "bg-white/[0.04] border-white/20 shadow-2xl" : "bg-transparent border-transparent text-gray-600 hover:border-white/5 hover:bg-white/[0.01]"
        )}
    >
        <div className={cn(
            "p-3 rounded-xl border transition-all duration-500 shadow-lg",
            active ? "border-white/20 bg-white/5" : "border-white/5 bg-black/40"
        )} style={{ color: active ? color : 'inherit' }}>
            <Icon size={20} className={cn("transition-transform duration-700", active ? "scale-110" : "group-hover:scale-110")} />
        </div>
        <div className="flex-1 min-w-0">
            <div className={cn("text-[11px] font-black uppercase font-mono tracking-[0.2em] transition-colors", active ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>{label}</div>
            <div className="text-[8px] opacity-40 uppercase tracking-tighter font-mono">{sub}</div>
        </div>
        {active && <motion.div layoutId="active-domain-indicator" className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" style={{ color }} />}
    </button>
);

// Fix: Typing ImplementationDeck as React.FC ensures that React-specific props like 'key' are allowed.
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
            {/* Header: Identity of the synthesized process */}
            <div className="p-10 bg-[#0a0a0a] border border-white/5 rounded-[3rem] relative overflow-hidden shadow-2xl invisible-glass">
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
                    <BlueprintStat label="Structural Stability" value={`${data.viability}%`} color="#9d4edd" />
                    <BlueprintStat label="Latency Reduction" value="38.4ms" color="#22d3ee" />
                    <BlueprintStat label="Deployment Complexity" value="MODERATE" color="#f1c21b" />
                    <BlueprintStat label="Recursive Depth" value="L4" color="#f97316" />
                </div>

                <div className="p-8 bg-black/40 border border-white/5 rounded-[2rem] shadow-inner group/logic relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover/logic:opacity-10 transition-opacity"><Microscope size={60} /></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Terminal size={16} className="text-[#9d4edd]" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Operational Logic</span>
                    </div>
                    <p className="text-xl text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#9d4edd] pl-10 group-hover/logic:text-white transition-colors duration-500 select-all">
                        "{data.logic}"
                    </p>
                </div>
            </div>

            {/* Steps: Detailed Sequence */}
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-4">
                    <div className="flex items-center gap-4 px-2 mb-6">
                        <ListChecks size={20} className="text-[#10b981]" />
                        <span className="text-xs font-black text-white uppercase tracking-[0.4em]">Implementation Sequence</span>
                    </div>
                    {data.workflowSteps.map((step: any, i: number) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl flex items-center gap-8 group hover:border-[#10b981]/30 transition-all shadow-xl relative overflow-hidden"
                        >
                            <div className="w-14 h-14 bg-black border border-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#10b981] group-hover:text-black transition-all shadow-lg relative z-10 overflow-hidden">
                                <span className="text-lg font-black font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="text-[9px] font-black text-[#10b981] uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100">{step.phase}</div>
                                <p className="text-sm text-gray-300 font-mono leading-relaxed truncate group-hover:text-white">{step.instruction}</p>
                            </div>
                            <div className="px-4 py-2 bg-black border border-white/5 rounded-xl flex items-center gap-3 shrink-0 relative z-10">
                                <Binary size={12} className="text-gray-600" />
                                <span className="text-[8px] font-mono text-gray-500 font-black uppercase tracking-widest">{step.nodeRef}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-8 shadow-2xl h-full invisible-glass">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd]">
                                <Compass size={20} />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">Architectural Impact</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">System Coherence</span>
                                    <span className="text-[12px] font-black font-mono text-[#9d4edd]">{data.viability}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${data.viability}%` }} className="h-full bg-[#9d4edd] shadow-[0_0_10px_#9d4edd]" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Resource Utilization</span>
                                    <span className="text-[12px] font-black font-mono text-[#22d3ee]">12.4%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '12.4%' }} className="h-full bg-[#22d3ee] shadow-[0_0_10px_#22d3ee]" />
                                </div>
                            </div>
                            <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-5">
                                <button 
                                    onClick={() => onDeploy(data)}
                                    className="w-full py-5 bg-[#10b981] hover:bg-[#15d192] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(16,185,129,0.3)] active:scale-95 group"
                                >
                                    <PlayCircle size={20} className="group-hover:rotate-90 transition-transform duration-500" /> Commit Protocol
                                </button>
                                <button className="w-full py-4 border border-white/10 text-gray-500 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3">
                                    <Share2 size={16} /> Broadcast Schematic
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
    const { actions, metaventions, knowledge } = useAppStore();
    const { addLog, pushToInvestmentQueue, archiveIntervention } = actions;
    
    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM'>('DRIVE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [customIntent, setCustomIntent] = useState('');

    const generateBlueprint = async () => {
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
                    logic: { type: Type.STRING },
                    viability: { type: Type.NUMBER },
                    riskVector: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
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

            const directive = processType === 'DRIVE' 
                ? "Synthesize a high-fidelity PARA (Projects, Areas, Resources, Archives) drive organization process. Focus on recursive naming and decentralized metadata anchors."
                : "Forge a cloud-native systems architecture blueprint. Focus on edge distribution, event-driven ingestion, and self-healing node clusters.";

            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Directive: ${directive}. User Context: ${customIntent}. Knowledge Layers: ${activeLayers}. Output Protocol Schema.`,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    thinkingConfig: { thinkingBudget: 12000 }
                }
            }));

            const data = safeParseJson<any>(response.text);
            setResult(data);
            addLog('SUCCESS', `SYNC_COMPLETE: ${data.title} blueprint stabilized.`);
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
            {/* Impeccable Header */}
            <div className="h-20 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-3xl z-30 flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-xl">
                            <GitMerge size={22} className="text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white uppercase tracking-[0.5em] leading-none">Synthesis Bridge</h1>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-2">D-System Architecture Core // V9.5</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Layers</span>
                        <div className="flex gap-1.5">
                            {knowledge.activeLayers.slice(0, 3).map(l => (
                                <div key={l} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[7px] text-[#9d4edd] font-black uppercase tracking-widest">{l.split('_')[0]}</div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Lattice Integrity</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black font-mono text-[#10b981] uppercase tracking-tighter">Optimal</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-10 gap-10">
                {/* Control Sidebar */}
                <div className="w-[360px] flex flex-col gap-8 shrink-0">
                    <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] shadow-2xl invisible-glass space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Target size={14} className="text-gray-500" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Target Domain</span>
                        </div>
                        <div className="space-y-3">
                            <DomainCard 
                                id="DRIVE" label="Drive Protocol" sub="PARA DRIVE SYST" icon={HardDrive} color="#9d4edd"
                                active={processType === 'DRIVE'} onClick={() => { setProcessType('DRIVE'); audio.playClick(); }} 
                            />
                            <DomainCard 
                                id="SYSTEM" label="System Arch" sub="CLOUD TOPOLOGY" icon={Server} color="#22d3ee"
                                active={processType === 'SYSTEM'} onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }} 
                            />
                        </div>
                    </div>

                    <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl invisible-glass">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <Library size={14} className="text-gray-500" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Protocol Archive</span>
                            </div>
                            <div className="text-[8px] font-mono text-gray-700">{metaventions.strategyLibrary.length} UNIT(S)</div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {metaventions.strategyLibrary.map(strat => (
                                <button 
                                    key={strat.id} 
                                    className="w-full text-left p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#9d4edd]/40 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={10} className="text-[#9d4edd]" /></div>
                                    <div className="text-[10px] font-black text-white uppercase tracking-tighter truncate mb-1">{strat.title}</div>
                                    <div className="text-[8px] text-gray-600 font-mono truncate">{strat.logic}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-6">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Global Intent Buffer</span>
                            <Binary size={12} className="text-[#9d4edd] animate-pulse" />
                        </div>
                        <textarea 
                            value={customIntent}
                            onChange={e => setCustomIntent(e.target.value)}
                            placeholder="Initialize strategic intent sequence..."
                            className="w-full h-32 bg-black/40 border border-white/5 rounded-3xl p-6 text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd]/50 transition-all placeholder:text-gray-800 shadow-inner resize-none"
                        />
                        <button 
                            onClick={generateBlueprint}
                            disabled={isGenerating}
                            className="w-full py-6 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[2rem] text-xs font-black uppercase tracking-[0.6em] transition-all shadow-[0_20px_50px_rgba(157,78,221,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
                            {isGenerating ? 'FORGING...' : 'Crystallize'}
                        </button>
                    </div>
                </div>

                {/* Main Deck / Result Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <ImplementationDeck 
                                key="active-deck" 
                                data={result} 
                                onArchive={(d) => { archiveIntervention({ ...d, id: `strat-${Date.now()}`, timestamp: Date.now() }); audio.playSuccess(); }}
                                onDeploy={(d) => { pushToInvestmentQueue(d); addLog('SUCCESS', `PROTOCOL_ENGAGED: Authorized [${d.title}]`); audio.playSuccess(); }}
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="h-full flex flex-col items-center justify-center text-center p-20 gap-10 grayscale opacity-10 group hover:grayscale-0 hover:opacity-25 transition-all duration-1000"
                            >
                                <div className="relative">
                                    <Workflow size={160} className="text-white" />
                                    <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-[#9d4edd]/20 blur-[120px] rounded-full" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black font-mono text-white uppercase tracking-[1em]">Logic Hub Standby</h3>
                                    <p className="text-[11px] font-mono text-gray-500 max-w-sm mx-auto uppercase tracking-widest leading-loose">Input intent and select a structural domain to initialize high-fidelity protocol synthesis.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global HUD Strip */}
            <div className="h-10 bg-black border-t border-white/5 px-12 flex items-center justify-between text-[8px] font-mono text-gray-600 shrink-0 relative z-[60] backdrop-blur-3xl">
                <div className="flex gap-12 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-3 text-[#10b981] font-black uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} className="shadow-[0_0_10px_#10b981]" /> Sync_Stable
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest font-black">
                        <Binary size={14} className="text-[#9d4edd]" /> Kernel_Handshake: 0xFFD4E
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest font-black">
                        <Database size={14} className="text-[#22d3ee]" /> Vault_Active: {metaventions.strategyLibrary.length} blueprints
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <span className="uppercase tracking-[0.5em] opacity-40 leading-none">THE D-ECOSYSTEM SYNTHESIS BRIDGE</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="font-black text-gray-400 uppercase tracking-widest leading-none">OS_VERSION_9.5_ZENITH</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;
