import React, { useState, useMemo, useEffect, useRef } from 'react';
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
    Eye, Maximize2, Info, BarChart3, ShieldEllipsis, Cpu
} from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { AppMode } from '../types';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { cn } from '../utils/cn';
import { 
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const CoherenceAuditOverlay = ({ active, score }: { active: boolean, score: number }) => (
    <div className="absolute top-6 right-6 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl z-20">
        <div className="flex flex-col items-end">
            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Lattice Coherence</span>
            <span className={cn(
                "text-sm font-black font-mono leading-none tracking-tighter",
                score > 90 ? "text-[#10b981]" : score > 70 ? "text-[#22d3ee]" : "text-[#ef4444]"
            )}>{score}%</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <ShieldEllipsis size={18} className={cn(active ? "animate-pulse" : "opacity-30", score > 70 ? "text-[#10b981]" : "text-[#ef4444]")} />
    </div>
);

const ImpactProjection = ({ viability, risk }: { viability: number, risk: string }) => {
    const sectors = [
        { label: 'Structural Coherence', val: viability, color: '#9d4edd' },
        { label: 'Operational Velocity', val: Math.min(100, viability + 10), color: '#22d3ee' },
        { label: 'Security Buffer', val: risk === 'LOW' ? 95 : 40, color: '#10b981' }
    ];

    return (
        <div className="grid grid-cols-3 gap-4">
            {sectors.map((s, i) => (
                <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-2">
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-black font-mono text-white">{s.val}%</span>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${s.val}%` }} 
                                className="h-full" 
                                style={{ backgroundColor: s.color }} 
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const YieldProbeCLI = () => {
    const { actions } = useAppStore();
    const { execute, state: agentState } = useAgentRuntime();
    const [probeQuery, setProbeQuery] = useState('');
    const [probeResult, setProbeResult] = useState<string | null>(null);

    const scatterData = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 400 + 100,
        name: `NODE_${String(i).padStart(2,'0')}`
    })), []);

    const handleProbe = async () => {
        if (!probeQuery.trim() || agentState.isThinking) return;
        actions.addLog('SYSTEM', `META_TOOLING: Dispatching probe for "${probeQuery}"...`);
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
            <div className="col-span-5 bg-[#0a0a0a] border border-[#333] rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group shadow-2xl invisible-glass">
                <div className="absolute inset-0 bg-gradient-to-b from-[#f1c21b]/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-[#f1c21b]/10 rounded-2xl border border-[#f1c21b]/40 text-[#f1c21b] shadow-xl">
                        <Terminal size={22} />
                    </div>
                    <div>
                        <span className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">Yield Hunter CLI</span>
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1">Real-time Meta-Tooling Protocol</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-6 min-h-0">
                    <div className="flex-1 bg-black/60 rounded-3xl border border-white/5 p-6 font-mono text-[11px] text-gray-400 overflow-y-auto custom-scrollbar shadow-inner">
                        <div className="mb-3 text-[#f1c21b] opacity-60 font-black tracking-widest uppercase">// INITIALIZING META_TOOLING HANDSHAKE...</div>
                        <div className="mb-4 text-[#f1c21b] opacity-40 font-mono text-[9px]">// REGISTERING AUTONOMIC CAPABILITIES...</div>
                        {agentState.isThinking && <div className="flex items-center gap-3 text-[#f1c21b] animate-pulse py-2"><Loader2 size={12} className="animate-spin" /><span>FORGING_TOOL_CHAIN...</span></div>}
                        {probeResult && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white whitespace-pre-wrap leading-relaxed mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">{probeResult}</motion.div>}
                    </div>
                    <div className="relative group/input">
                        <input value={probeQuery} onChange={(e) => setProbeQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleProbe()} placeholder="E.g. 'Uniswap APY' or 'Qubic Difficulty'..." className="w-full bg-black border border-[#222] rounded-2xl py-5 pl-8 pr-16 text-xs font-mono text-white focus:outline-none focus:border-[#f1c21b] transition-all shadow-inner group-hover/input:border-[#333]" />
                        <button onClick={handleProbe} disabled={agentState.isThinking} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-[#f1c21b] text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl"><ArrowUpRight size={18} /></button>
                    </div>
                </div>
            </div>
            <div className="col-span-7 bg-[#0a0a0a] border border-[#333] rounded-[2.5rem] p-12 flex flex-col relative overflow-hidden shadow-2xl invisible-glass">
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/40 rounded-2xl text-[#10b981]">
                            <Activity size={22} />
                        </div>
                        <div>
                            <span className="text-base font-black font-mono text-white uppercase tracking-[0.4em]">Intelligence Delta</span>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2">Active Grounding Telemetry</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-6 py-2 bg-[#10b981]/10 text-[#10b981] rounded-full border border-[#10b981]/30 text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">Sync Active</div>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-6 min-h-0 relative z-10">
                    <div className="h-64 bg-black/40 rounded-[2rem] border border-white/5 p-6 relative overflow-hidden group shadow-inner">
                        <div className="absolute top-4 right-6 flex items-center gap-2 text-[8px] font-black text-gray-600 uppercase tracking-widest">
                            <Target size={10} className="text-[#f1c21b]" /> Risk vs Impact Matrix
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                <XAxis type="number" dataKey="x" name="Impact" unit="%" hide />
                                <YAxis type="number" dataKey="y" name="Risk" unit="%" hide />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', fontFamily: 'Fira Code' }} />
                                <Scatter name="Opportunities" data={scatterData}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.y > 70 ? '#ef4444' : entry.x > 70 ? '#10b981' : '#22d3ee'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-1 bg-black/20 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center group shadow-inner">
                        <Compass size={80} className="text-gray-800 animate-[spin_40s_linear_infinite] group-hover:scale-110 transition-transform duration-1000" />
                        <p className="mt-6 text-[10px] font-mono text-gray-600 uppercase tracking-[1em]">Scanning Reality Vectors</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StrategicBridge = () => {
    const { knowledge, actions } = useAppStore();
    const { addLog, toggleKnowledgeLayer, pushToInvestmentQueue } = actions;
    const activeKnowledgeLayerIds = knowledge.activeLayers || [];
    const [isGenerating, setIsGenerating] = useState(false);
    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM'>('DRIVE');
    const [currentImplementation, setCurrentImplementation] = useState<any | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [coherenceScore, setCoherenceScore] = useState(0);

    const generateImplementation = async () => {
        setIsGenerating(true);
        setCurrentImplementation(null);
        setCoherenceScore(0);
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
                ? "Generate a high-fidelity PARA (Projects, Areas, Resources, Archives) drive organization workflow."
                : "Generate a cloud-native systems architecture implementation process.";

            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Process Type: ${domainContext}. Contextual Overlays: ${activeKnowledge}. Output structured JSON blueprint.`,
                config: { 
                    responseMimeType: 'application/json', 
                    responseSchema: schema,
                    thinkingConfig: { thinkingBudget: 16000 }
                }
            }));

            const data = JSON.parse(response.text || '{}');
            setCurrentImplementation(data);
            
            // Post-Generation Audit Sequence
            setIsAuditing(true);
            const auditResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Audit this workflow for coherence: ${JSON.stringify(data)}. Output an integer score 0-100. JSON {score}.`,
                config: { responseMimeType: 'application/json' }
            });
            const auditResult = JSON.parse(auditResponse.text || '{"score": 85}');
            setCoherenceScore(auditResult.score);
            setIsAuditing(false);

            addLog('SUCCESS', `SYNC_COMPLETE: ${data.title} crystallized with ${auditResult.score}% coherence.`);
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
            <div className="w-[340px] flex flex-col gap-6 shrink-0">
                <div className="p-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2.5rem] shadow-2xl relative overflow-hidden group invisible-glass">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-6 px-1">Process Domain</span>
                    <div className="space-y-3">
                        <button 
                            onClick={() => { setProcessType('DRIVE'); audio.playClick(); }}
                            className={cn(
                                "w-full p-5 rounded-2xl border text-left transition-all duration-500 flex items-center gap-4 relative overflow-hidden",
                                processType === 'DRIVE' ? "bg-[#9d4edd]/10 border-[#9d4edd] shadow-xl" : "bg-transparent border-transparent text-gray-500 hover:border-white/10"
                            )}
                        >
                            <HardDrive size={18} className={processType === 'DRIVE' ? "text-[#9d4edd]" : ""} />
                            <div>
                                <div className="text-[10px] font-black uppercase font-mono tracking-widest">Drive Org</div>
                                <div className="text-[7px] opacity-40 uppercase tracking-tighter">PARA Taxonomy</div>
                            </div>
                        </button>
                        <button 
                            onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }}
                            className={cn(
                                "w-full p-5 rounded-2xl border text-left transition-all duration-500 flex items-center gap-4 relative overflow-hidden",
                                processType === 'SYSTEM' ? "bg-[#22d3ee]/10 border-[#22d3ee] shadow-xl" : "bg-transparent border-transparent text-gray-500 hover:border-white/10"
                            )}
                        >
                            <Server size={18} className={processType === 'SYSTEM' ? "text-[#22d3ee]" : ""} />
                            <div>
                                <div className="text-[10px] font-black uppercase font-mono tracking-widest">System Arch</div>
                                <div className="text-[7px] opacity-40 uppercase tracking-tighter">Cloud Topology</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2.5rem] shadow-2xl flex-1 overflow-y-auto custom-scrollbar invisible-glass">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-6 px-1">Synthesis Overlays</span>
                    <div className="space-y-2.5">
                        {Object.values(KNOWLEDGE_LAYERS).map(l => (
                            <button key={l.id} onClick={() => toggleKnowledgeLayer(l.id)} className={`w-full p-4 rounded-2xl border text-left transition-all duration-500 relative overflow-hidden group/btn ${activeKnowledgeLayerIds.includes(l.id) ? 'bg-white/5 border-[var(--color)] shadow-xl scale-[1.02]' : 'border-transparent text-gray-500 opacity-40 hover:opacity-100 hover:border-white/10'}`} style={{ '--color': l.color } as any}>
                                <span className="text-[10px] font-black uppercase font-mono tracking-widest relative z-10">{l.label}</span>
                                {activeKnowledgeLayerIds.includes(l.id) && <div className="absolute inset-0 bg-gradient-to-r from-[var(--color)] to-transparent opacity-[0.03]" style={{ '--color': l.color } as any} />}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={generateImplementation} 
                    disabled={isGenerating}
                    className="w-full py-6 bg-[#9d4edd] text-black rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(157,78,221,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <GitMerge size={18} className="group-hover:rotate-180 transition-transform duration-700" />}
                    Synthesize Process
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-4">
                <AnimatePresence mode="wait">
                    {currentImplementation ? (
                        <motion.div key="impl" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8 pb-12 relative">
                            
                            <CoherenceAuditOverlay active={isAuditing} score={coherenceScore} />

                            <div className="p-12 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[3.5rem] relative overflow-hidden shadow-2xl group/card invisible-glass">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover/card:opacity-[0.05] transition-opacity rotate-12"><Sparkles size={180} /></div>
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Blueprint // Locked</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-white uppercase font-mono tracking-tighter leading-tight">{currentImplementation.title}</h3>
                                    </div>
                                    <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-right">
                                        <span className="text-[8px] font-mono text-gray-500 uppercase block mb-1">Risk Classification</span>
                                        <span className={cn(
                                            "text-lg font-black font-mono tracking-widest",
                                            currentImplementation.riskVector === 'LOW' ? "text-[#10b981]" : "text-[#ef4444]"
                                        )}>{currentImplementation.riskVector}</span>
                                    </div>
                                </div>

                                <div className="p-10 bg-black/60 border border-white/5 rounded-[2.5rem] shadow-inner mb-10 group/logic">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Microscope size={18} className="text-[#9d4edd]" />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Operational Logic</span>
                                    </div>
                                    <p className="text-lg text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#9d4edd] pl-10 group-hover/logic:text-white transition-colors duration-500">"{currentImplementation.logic}"</p>
                                </div>

                                <ImpactProjection viability={currentImplementation.viability} risk={currentImplementation.riskVector} />
                                
                                <div className="mt-12 space-y-6">
                                    <div className="flex items-center gap-3 px-2">
                                        <ListChecks size={18} className="text-[#10b981]" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Implementation Sequence</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {currentImplementation.workflowSteps.map((step: any, i: number) => (
                                            <div key={i} className="flex items-center gap-6 p-6 bg-white/[0.01] border border-white/[0.03] rounded-[2rem] hover:bg-white/[0.04] transition-all group/step">
                                                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center font-mono font-black text-sm text-[#9d4edd] shrink-0 shadow-lg group-hover/step:bg-[#9d4edd] group-hover/step:text-black transition-all">
                                                    {String(i + 1).padStart(2, '0')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[9px] font-black text-[#22d3ee] uppercase tracking-widest mb-1">{step.phase}</div>
                                                    <p className="text-xs text-gray-400 font-mono leading-relaxed truncate">{step.instruction}</p>
                                                </div>
                                                <div className="text-[8px] font-mono text-gray-700 bg-black px-3 py-1.5 rounded-lg border border-white/5 opacity-0 group-hover/step:opacity-100 transition-opacity">
                                                    REF: {step.nodeRef}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => { pushToInvestmentQueue(currentImplementation); addLog('SUCCESS', `PROTOCOL_DEPLOY: Authorized deployment of "${currentImplementation.title}"`); audio.playSuccess(); }} 
                                className="w-full py-8 bg-[#10b981] text-black rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_30px_60px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5 group/commit"
                            >
                                <PlayCircle size={28} className="group-hover/commit:rotate-90 transition-transform duration-500" /> Commit Protocol Execution
                            </button>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center gap-10 py-40">
                            <Workflow size={120} className="animate-pulse text-[#9d4edd]" />
                            <div className="space-y-4">
                                <h3 className="text-2xl font-black uppercase tracking-[1em]">Lattice Standby</h3>
                                <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-gray-500">Establishing multi-layer synthesis command channels</p>
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
            <div className="h-20 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-20 flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-8">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-xl">
                        <GitMerge className="w-6 h-6 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-mono uppercase tracking-[0.5em] text-white leading-none uppercase">V9.5 - THE D-Ecosystem</h1>
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-2 block">D-System Implementation Hub</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <button onClick={() => { setSubTab('BLUEPRINT'); audio.playClick(); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'BLUEPRINT' ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Process Blueprint</button>
                    <button onClick={() => { setSubTab('PROBE'); audio.playClick(); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'PROBE' ? 'bg-[#f1c21b] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Meta-Tooling</button>
                </div>
            </div>

            <div className="flex-1 relative z-10 min-h-0 bg-transparent">
                <AnimatePresence mode="wait">
                    {subTab === 'BLUEPRINT' ? (
                        <motion.div key="blueprint" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="h-full">
                            <StrategicBridge />
                        </motion.div>
                    ) : (
                        <motion.div key="probe" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="h-full">
                            <YieldProbeCLI />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="h-10 bg-black/80 border-t border-[var(--border-main)] px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-3xl">
                <div className="flex gap-10 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-3 text-[#10b981] font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} /> Bridge_Handshake_Stable
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest font-bold">
                        <Binary size={14} className="text-[#9d4edd]" /> Kernel v9.5-ZENITH
                    </div>
                </div>
                <div className="uppercase tracking-widest opacity-40 leading-none text-[8px] font-black">THE D-ECOSYSTEM SYNTHESIS CORE</div>
            </div>
        </div>
    );
};

export default SynthesisBridge;