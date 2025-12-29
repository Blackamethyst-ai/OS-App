import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, Loader2, GitBranch, 
    Microscope, Sparkles, HardDrive, Binary, 
    ShieldCheck, DollarSign, ListChecks, Network, 
    Server, Workflow, PlayCircle, X, Terminal, 
    ArrowUpRight, Compass, CheckCircle2, Info,
    Shield, Target, Gauge, Layers
} from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { cn } from '../utils/cn';

// --- SUB-COMPONENTS ---

const ImpactProjection = ({ viability, risk }: { viability: number, risk: string }) => {
    const sectors = [
        { label: 'Structural Coherence', val: viability, color: '#9d4edd' },
        { label: 'Operational Velocity', val: Math.min(100, viability + 10), color: '#22d3ee' },
        { label: 'Security Buffer', val: risk === 'LOW' ? 95 : 40, color: '#10b981' }
    ];

    return (
        <div className="grid grid-cols-3 gap-6">
            {sectors.map((s, i) => (
                <div key={i} className="p-5 bg-black/40 border border-white/5 rounded-3xl flex flex-col gap-3 shadow-inner group hover:border-white/10 transition-all">
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">{s.label}</span>
                    <div className="flex items-center gap-4">
                        <span className="text-xl font-black font-mono text-white">{s.val}%</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden p-px">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${s.val}%` }} 
                                className="h-full rounded-full shadow-[0_0_8px_currentColor]" 
                                style={{ backgroundColor: s.color, color: s.color }} 
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const YieldProbeCLI = () => {
    const { addLog } = useAppStore();
    const { execute, state: agentState } = useAgentRuntime();
    const [probeQuery, setProbeQuery] = useState('');
    const [probeResult, setProbeResult] = useState<string | null>(null);

    const handleProbe = async () => {
        if (!probeQuery.trim() || agentState.isThinking) return;
        addLog('SYSTEM', `META_TOOLING: Dispatching probe for "${probeQuery}"...`);
        setProbeResult(null);
        audio.playClick();
        
        try {
            const response = await execute(probeQuery);
            setProbeResult(response || "No data captured.");
            audio.playSuccess();
        } catch (e) {
            audio.playError();
        }
    };

    return (
        <div className="h-full grid grid-cols-12 gap-8 p-10">
            <div className="col-span-5 bg-[#0a0a0a]/60 border border-white/5 rounded-[3rem] p-10 flex flex-col relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-[#f1c21b]/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-5 mb-10">
                    <div className="p-3.5 bg-[#f1c21b]/10 rounded-2xl border border-[#f1c21b]/40 text-[#f1c21b] shadow-xl">
                        <Terminal size={24} />
                    </div>
                    <div>
                        <span className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">Yield Hunter CLI</span>
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1.5">Real-time Meta-Tooling Protocol</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-6 min-h-0">
                    <div className="flex-1 bg-black/60 rounded-[2rem] border border-white/5 p-8 font-mono text-[11px] text-gray-400 overflow-y-auto custom-scrollbar shadow-inner">
                        <div className="mb-3 text-[#f1c21b] opacity-60 font-black tracking-widest uppercase">// INITIALIZING META_TOOLING HANDSHAKE...</div>
                        <div className="mb-4 text-[#f1c21b] opacity-40 font-mono text-[9px]">// REGISTERING AUTONOMIC CAPABILITIES...</div>
                        {agentState.isThinking && (
                            <div className="flex items-center gap-3 text-[#f1c21b] animate-pulse py-4">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="tracking-[0.2em] font-black uppercase">FORGING_TOOL_CHAIN...</span>
                            </div>
                        )}
                        {probeResult && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white whitespace-pre-wrap leading-relaxed mt-6 p-6 bg-white/5 rounded-3xl border border-white/5 shadow-2xl italic">
                                {probeResult}
                            </motion.div>
                        )}
                        {!agentState.isThinking && !probeResult && (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4">
                                <Zap size={48} className="animate-pulse" />
                                <span className="text-[8px] tracking-[0.5em] uppercase">Awaiting Vector</span>
                            </div>
                        )}
                    </div>
                    <div className="relative group/input">
                        <input 
                            value={probeQuery} 
                            onChange={(e) => setProbeQuery(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleProbe()} 
                            placeholder="E.g. 'Uniswap APY' or 'Qubic Difficulty'..." 
                            className="w-full bg-black border border-[#222] rounded-2xl py-6 pl-8 pr-20 text-xs font-mono text-white focus:outline-none focus:border-[#f1c21b] transition-all shadow-inner group-hover/input:border-[#333]" 
                        />
                        <button 
                            onClick={handleProbe} 
                            disabled={agentState.isThinking || !probeQuery.trim()} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3.5 bg-[#f1c21b] text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl"
                        >
                            {agentState.isThinking ? <Loader2 size={20} className="animate-spin" /> : <ArrowUpRight size={20} />}
                        </button>
                    </div>
                </div>
            </div>
            <div className="col-span-7 bg-[#0a0a0a]/40 border border-white/5 rounded-[3rem] p-12 flex flex-col relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center mb-10 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-3.5 bg-[#10b981]/10 border border-[#10b981]/40 rounded-2xl text-[#10b981]">
                            <Activity size={24} />
                        </div>
                        <div>
                            <span className="text-base font-black font-mono text-white uppercase tracking-[0.4em]">Intelligence Delta</span>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2">Active Grounding Telemetry</p>
                        </div>
                    </div>
                    <div className="px-6 py-2 bg-[#10b981]/10 text-[#10b981] rounded-full border border-[#10b981]/30 text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        Sync Active
                    </div>
                </div>
                <div className="flex-1 bg-black/40 rounded-[4rem] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center group shadow-inner">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)]" />
                    <Compass size={160} className="text-gray-900 animate-[spin_30s_linear_infinite] group-hover:scale-110 transition-transform duration-1000" />
                    <p className="mt-12 text-[11px] font-mono text-gray-700 uppercase tracking-[1em] font-black">Awaiting Search Vector</p>
                </div>
            </div>
        </div>
    );
};

const StrategicBridge = () => {
    const { metaventions, addLog, knowledge, toggleKnowledgeLayer, pushToInvestmentQueue } = useAppStore();
    const activeKnowledgeLayerIds = knowledge.activeLayers || [];
    const [isGenerating, setIsGenerating] = useState(false);
    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM'>('DRIVE');
    const [currentImplementation, setCurrentImplementation] = useState<any | null>(null);

    const generateImplementation = async () => {
        setIsGenerating(true);
        setCurrentImplementation(null);
        addLog('SYSTEM', `SYNC_INIT: Forging structured process for ${processType === 'DRIVE' ? 'Drive Organization' : 'System Architecture'}...`);
        audio.playClick();

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsGenerating(false); return; }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const activeKnowledge = activeKnowledgeLayerIds.map(id => KNOWLEDGE_LAYERS[id]?.label).join(', ');
            
            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    logic: { type: Type.STRING },
                    physicalImpact: { type: Type.STRING },
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
                required: ['title', 'logic', 'physicalImpact', 'viability', 'riskVector', 'workflowSteps']
            };

            const domainContext = processType === 'DRIVE' 
                ? "Generate a high-fidelity PARA (Projects, Areas, Resources, Archives) drive organization workflow. Focus on naming conventions, hierarchical nesting rules, and archival triggers for strategic metaventions."
                : "Generate a cloud-native autonomous systems architecture implementation process. Components: Ingestion Layer (Edge), Processing Cluster (K8s/Serverless), Refractive Storage (S3/DB), and Security Mesh (IAM/mTLS).";

            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Process Type: ${domainContext}. Contextual Overlays: ${activeKnowledge}. Output high-fidelity structured JSON blueprint for immediate OS commit.`,
                config: { responseMimeType: 'application/json', responseSchema: schema }
            }));

            const data = JSON.parse(response.text || '{}');
            setCurrentImplementation(data);
            addLog('SUCCESS', `SYNC_COMPLETE: ${data.title} crystallized.`);
            audio.playSuccess();
        } catch (e: any) {
            addLog('ERROR', `SYNC_FAIL: ${e.message}`);
            audio.playError();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex h-full gap-8 p-10 overflow-hidden">
            {/* Optimized Control Sidebar */}
            <div className="w-[380px] flex flex-col gap-8 shrink-0">
                <div className="p-10 bg-[#0a0a0a]/60 border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-8 px-1">
                        <Target size={16} className="text-[#9d4edd]" />
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Process Domain</span>
                    </div>
                    <div className="space-y-4">
                        <button 
                            onClick={() => { setProcessType('DRIVE'); audio.playClick(); }}
                            className={cn(
                                "w-full p-6 rounded-[2rem] border text-left transition-all duration-500 flex items-center gap-5 relative overflow-hidden",
                                processType === 'DRIVE' ? "bg-[#9d4edd]/10 border-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.15)]" : "bg-transparent border-transparent text-gray-500 hover:border-white/10"
                            )}
                        >
                            <div className={cn("p-2 rounded-lg transition-colors", processType === 'DRIVE' ? "bg-[#9d4edd] text-black" : "bg-white/5 text-gray-600")}>
                                <HardDrive size={18} />
                            </div>
                            <div>
                                <div className="text-[11px] font-black uppercase font-mono tracking-widest">Drive Org</div>
                                <div className="text-[7px] opacity-40 uppercase tracking-tighter mt-0.5">PARA Taxonomy Logic</div>
                            </div>
                        </button>
                        <button 
                            onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }}
                            className={cn(
                                "w-full p-6 rounded-[2rem] border text-left transition-all duration-500 flex items-center gap-5 relative overflow-hidden",
                                processType === 'SYSTEM' ? "bg-[#22d3ee]/10 border-[#22d3ee] shadow-[0_0_30px_rgba(34,211,238,0.15)]" : "bg-transparent border-transparent text-gray-500 hover:border-white/10"
                            )}
                        >
                            <div className={cn("p-2 rounded-lg transition-colors", processType === 'SYSTEM' ? "bg-[#22d3ee] text-black" : "bg-white/5 text-gray-600")}>
                                <Server size={18} />
                            </div>
                            <div>
                                <div className="text-[11px] font-black uppercase font-mono tracking-widest">System Arch</div>
                                <div className="text-[7px] opacity-40 uppercase tracking-tighter mt-0.5">Cloud Topology Nodes</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-10 bg-[#0a0a0a]/60 border border-white/5 rounded-[3rem] shadow-2xl flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 mb-8 px-1">
                        <Layers size={16} className="text-[#22d3ee]" />
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Synthesis Overlays</span>
                    </div>
                    <div className="space-y-3">
                        {Object.values(KNOWLEDGE_LAYERS).map(l => (
                            <button 
                                key={l.id} 
                                onClick={() => { toggleKnowledgeLayer(l.id); audio.playClick(); }} 
                                className={`w-full p-5 rounded-2xl border text-left transition-all duration-500 relative overflow-hidden group/btn ${activeKnowledgeLayerIds.includes(l.id) ? 'bg-white/5 border-[var(--color)] shadow-xl scale-[1.02]' : 'border-transparent text-gray-600 opacity-40 hover:opacity-100 hover:border-white/10'}`} 
                                style={{ '--color': l.color } as any}
                            >
                                <span className="text-[10px] font-black uppercase font-mono tracking-widest relative z-10">{l.label}</span>
                                {activeKnowledgeLayerIds.includes(l.id) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color)] to-transparent opacity-[0.05]" style={{ '--color': l.color } as any} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={generateImplementation} 
                    disabled={isGenerating}
                    className="w-full py-8 bg-[#9d4edd] text-black rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_30px_60px_rgba(157,78,221,0.35)] hover:bg-[#b06bf7] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5 group"
                >
                    {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <GitMerge size={24} className="group-hover:rotate-180 transition-transform duration-700" />}
                    Synthesize Process
                </button>
            </div>

            {/* Cinematic Main Blueprint Display */}
            <div className="flex-1 flex flex-col gap-10 overflow-y-auto custom-scrollbar pr-4">
                <AnimatePresence mode="wait">
                    {currentImplementation ? (
                        <motion.div key="impl" initial={{ opacity: 0, scale: 0.98, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.02 }} className="space-y-10 pb-20">
                            <div className="p-14 bg-[#0a0a0a]/40 border border-white/10 rounded-[4rem] relative overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,0.8)] group/card">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover/card:opacity-[0.08] transition-opacity rotate-12 duration-1000">
                                    <Sparkles size={280} />
                                </div>
                                
                                <div className="flex justify-between items-start mb-14 relative z-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]" />
                                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] font-mono">Protocol Blueprint // Crystallized</span>
                                        </div>
                                        <h3 className="text-4xl font-black text-white uppercase font-mono tracking-tighter leading-tight drop-shadow-2xl">{currentImplementation.title}</h3>
                                    </div>
                                    <div className="px-8 py-4 bg-black/60 border border-white/10 rounded-3xl text-right shadow-2xl">
                                        <span className="text-[9px] font-mono text-gray-600 uppercase block mb-1 tracking-widest font-black">Risk Vector</span>
                                        <span className={cn(
                                            "text-2xl font-black font-mono tracking-[0.2em]",
                                            currentImplementation.riskVector === 'LOW' ? "text-[#10b981]" : "text-[#ef4444]"
                                        )}>{currentImplementation.riskVector}</span>
                                    </div>
                                </div>

                                <div className="p-12 bg-black/80 border border-white/5 rounded-[3.5rem] shadow-[inset_0_0_50px_rgba(0,0,0,1)] mb-14 group/logic relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#9d4edd] opacity-50" />
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-2.5 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd]">
                                            <Microscope size={20} />
                                        </div>
                                        <span className="text-[11px] font-black text-gray-600 uppercase tracking-[0.4em]">Operational Reasoning</span>
                                    </div>
                                    <p className="text-2xl text-gray-300 font-mono leading-relaxed italic pr-10 group-hover:text-white transition-colors duration-700">
                                        "{currentImplementation.logic}"
                                    </p>
                                </div>

                                <div className="space-y-4 mb-14">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">Impact Projections</span>
                                    <ImpactProjection viability={currentImplementation.viability} risk={currentImplementation.riskVector} />
                                </div>
                                
                                <div className="space-y-8 relative z-10">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="p-2.5 bg-[#10b981]/10 rounded-xl text-[#10b981]">
                                            <ListChecks size={20} />
                                        </div>
                                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Implementation Sequence</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {currentImplementation.workflowSteps.map((step: any, i: number) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="flex items-center gap-8 p-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.04] hover:border-[#22d3ee]/20 transition-all group/step shadow-lg"
                                            >
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-black border border-white/10 flex items-center justify-center font-mono font-black text-xl text-[#9d4edd] shrink-0 shadow-2xl group-hover/step:bg-[#9d4edd] group-hover/step:text-black transition-all duration-500">
                                                    {String(i + 1).padStart(2, '0')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-black text-[#22d3ee] uppercase tracking-[0.3em] mb-2">{step.phase}</div>
                                                    <p className="text-sm text-gray-400 font-mono leading-relaxed group-hover/step:text-white transition-colors">{step.instruction}</p>
                                                </div>
                                                <div className="shrink-0 px-5 py-2 bg-black border border-white/5 rounded-xl text-[8px] font-mono text-gray-700 opacity-0 group-hover/step:opacity-100 transition-all shadow-xl font-black">
                                                    REF: {step.nodeRef}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <button 
                                    onClick={() => { setProcessType(processType === 'DRIVE' ? 'SYSTEM' : 'DRIVE'); generateImplementation(); }}
                                    className="px-12 py-8 bg-white/5 border border-white/10 hover:border-white/30 text-gray-500 hover:text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all"
                                >
                                    Pivot Domain
                                </button>
                                <button 
                                    onClick={() => { pushToInvestmentQueue(currentImplementation); addLog('SUCCESS', `PROTOCOL_DEPLOY: Authorized commit for "${currentImplementation.title}"`); audio.playSuccess(); }} 
                                    className="flex-1 py-8 bg-[#10b981] text-black rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.6em] shadow-[0_40px_80px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6 group/commit"
                                >
                                    <PlayCircle size={32} className="group-hover/commit:rotate-90 transition-transform duration-700" /> Commit Protocol Execution
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center gap-14 py-48 grayscale group-hover:grayscale-0 transition-all duration-1000">
                            <div className="relative">
                                <Workflow size={180} className="animate-pulse text-white" />
                                <div className="absolute inset-0 blur-[100px] bg-white/10 animate-pulse" />
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-4xl font-black uppercase tracking-[1.5em] text-white">Lattice Standby</h3>
                                <p className="text-[12px] font-mono uppercase tracking-[0.6em] text-gray-600 max-w-xl mx-auto leading-loose">Establishing multi-layer synthesis command channels for autonomous structural emergence.</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const SynthesisBridge: React.FC = () => {
    const [subTab, setSubTab] = useState<'BLUEPRINT' | 'PROBE'>('BLUEPRINT');

    return (
        <div className="h-full w-full bg-[var(--bg-app)] flex flex-col border border-[var(--border-main)] rounded-[3rem] overflow-hidden shadow-2xl relative font-sans transition-colors duration-500">
            <div className="h-20 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-[100] flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/60 to-transparent" />
                
                <div className="flex items-center gap-8 relative z-10">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-[0_0_25px_rgba(157,78,221,0.2)]">
                        <GitMerge className="w-6 h-6 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-mono uppercase tracking-[0.5em] text-white leading-none">Synthesis Bridge</h1>
                        <span className="text-[10px] text-gray-600 font-mono uppercase tracking-[0.4em] mt-2 block font-black">Multi-Modal Decision Infrastructure</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-[1.2rem] border border-white/5 shadow-inner relative z-10">
                    <button 
                        onClick={() => { setSubTab('BLUEPRINT'); audio.playClick(); }} 
                        className={`px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'BLUEPRINT' ? 'bg-[#9d4edd] text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white'}`}
                    >
                        Process Blueprint
                    </button>
                    <button 
                        onClick={() => { setSubTab('PROBE'); audio.playClick(); }} 
                        className={`px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'PROBE' ? 'bg-[#f1c21b] text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white'}`}
                    >
                        Meta-Tooling
                    </button>
                </div>
            </div>

            <div className="flex-1 relative z-10 min-h-0 bg-transparent">
                <AnimatePresence mode="wait">
                    {subTab === 'BLUEPRINT' ? (
                        <motion.div key="blueprint" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                            <StrategicBridge />
                        </motion.div>
                    ) : (
                        <motion.div key="probe" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                            <YieldProbeCLI />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="h-10 bg-black/80 border-t border-[var(--border-main)] px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[110] backdrop-blur-3xl">
                <div className="flex gap-12 items-center">
                    <div className="flex items-center gap-3 text-[#10b981] font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} /> Bridge_Handshake_Stable
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest font-black">
                        <Binary size={14} className="text-[#9d4edd]" /> Kernel v9.5-ZENITH // READY
                    </div>
                </div>
                <div className="uppercase tracking-[0.4em] opacity-40 leading-none text-[8px] font-black">THE D-ECOSYSTEM SYNTHESIS CORE</div>
            </div>
        </div>
    );
};

export default SynthesisBridge;