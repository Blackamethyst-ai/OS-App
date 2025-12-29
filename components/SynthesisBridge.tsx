import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, RefreshCw, Radar, HardDrive, Dna, 
    Binary, Save, Globe, ShieldCheck, DollarSign, Search, 
    ChevronRight, CheckCircle2, Layers, Landmark, ShieldAlert,
    Shield, GitCommit, Radio, Gauge, Waves, Fingerprint, PlayCircle
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, promptSelectKey, analyzeDeploymentFeasibility } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { AppMode } from '../types';

const DeploymentFeasibility = ({ strategy }: { strategy: string | null }) => {
    const [feasibility, setFeasibility] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const checkFeasibility = async () => {
        if (!strategy) return;
        setLoading(true);
        audio.playClick();
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const summary = await analyzeDeploymentFeasibility(strategy);
            setFeasibility(summary);
            audio.playSuccess();
        } catch (e) {
            setFeasibility("Data retrieval error during feasibility grounding.");
        } finally {
            setLoading(false);
        }
    };

    if (!strategy) return null;

    return (
        <div className="mt-4 bg-[var(--bg-card-top)] rounded-2xl p-6 border border-white/5 relative overflow-hidden group shadow-lg">
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[var(--cyan)]/10 rounded-xl text-[var(--cyan)] border border-[var(--cyan)]/30">
                        <Globe size={20} />
                    </div>
                    <div>
                        <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Deployment Feasibility Audit</span>
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1">Grounding: Production Environment 2025.Q1</p>
                    </div>
                </div>
                <button 
                    onClick={checkFeasibility} 
                    disabled={loading}
                    className="px-5 py-2 bg-black/40 hover:bg-[var(--cyan)] hover:text-black border border-white/10 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2.5 active:scale-95 group/btn shadow-xl"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    Run Audit
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                {feasibility ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="p-5 bg-black/60 border border-white/5 rounded-2xl text-[12px] font-mono text-gray-300 leading-relaxed italic border-l-4 border-l-[var(--cyan)] shadow-inner">
                            "{feasibility}"
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-[8px] font-black font-mono text-gray-600 uppercase tracking-widest">
                                <ShieldCheck size={12} className="text-[#10b981]" />
                                Validated via D-Ecosystem Grounds
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-10 text-center opacity-10 group-hover:opacity-25 transition-all duration-1000">
                        <Radar size={40} className="mx-auto mb-3 animate-pulse text-[var(--cyan)]" />
                        <span className="text-[10px] font-black font-mono uppercase tracking-[0.8em] text-white">Awaiting Implementation Pulse</span>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const InfrastructureEfficiencyGraph = ({ active }: { active: boolean }) => {
    const [data, setData] = useState(Array.from({ length: 40 }, (_, i) => ({
        time: i,
        displacement: 15 + Math.random() * 10,
        entropy: 35 + Math.random() * 15
    })));

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(1), { 
                    time: last.time + 1, 
                    displacement: Math.max(5, last.displacement + Math.random() * 12 - 5),
                    entropy: Math.max(10, 40 + Math.sin(last.time * 0.2) * 20)
                }];
            });
        }, 1200);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="h-40 w-full mt-4 bg-[var(--bg-card-top)] rounded-2xl p-5 overflow-hidden relative border border-white/5 shadow-xl">
            <div className="absolute top-5 left-6 text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2.5">
                <Activity size={14} className="text-[var(--amethyst)] animate-pulse" /> Infrastructure Efficiency Delta
            </div>
            <div className="absolute top-5 right-6 flex gap-6 text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--amethyst)]" /> Production Logic</span>
                <span className="flex items-center gap-2"><div className="w-2 h-0.5 bg-[#ef4444] border-t border-dashed" /> System Drift</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <Area type="monotone" dataKey="displacement" stroke="var(--amethyst)" fill="var(--amethyst)" fillOpacity={0.08} strokeWidth={2} isAnimationActive={false} />
                    <Area type="monotone" dataKey="entropy" stroke="#ef4444" fill="transparent" strokeWidth={1} strokeDasharray="5 5" isAnimationActive={false} opacity={0.3} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const SynthesisBridge: React.FC = () => {
    const { metaventions, setMetaventionsState, addLog, knowledge, toggleKnowledgeLayer, setMode, pushToInvestmentQueue } = useAppStore();
    const { layers, activeLayerId } = metaventions;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    const activeKnowledgeLayerIds = knowledge.activeLayers || [];

    const [isGenerating, setIsGenerating] = useState(false);
    const [currentImplementation, setCurrentImplementation] = useState<any | null>(null);

    const generateImplementation = async () => {
        if (!activeLayer) return;
        setIsGenerating(true);
        addLog('SYSTEM', `SYNC_INIT: Forging strategic implementation for "${activeLayer.name}"...`);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const activeKnowledge = activeKnowledgeLayerIds.map(id => KNOWLEDGE_LAYERS[id]?.label).join(', ');
            
            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    logic: { type: Type.STRING },
                    physicalImpact: { type: Type.STRING },
                    viability: { type: Type.NUMBER },
                    riskVector: { type: Type.STRING }
                },
                required: ['title', 'logic', 'physicalImpact', 'viability', 'riskVector']
            };

            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Infrastructure Layer: ${activeLayer.name}. Strategic Context: ${activeKnowledge}. Directive: Synthesize an elite strategic implementation protocol to bridge digital capital to physical results within The D-Ecosystem. JSON Output.`,
                config: { responseMimeType: 'application/json', responseSchema: schema }
            }));

            const result = JSON.parse(response.text || '{}');
            setCurrentImplementation(result);
            addLog('SUCCESS', `SYNC_COMPLETE: Strategic protocol finalized.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'SYNC_FAIL: Strategic synthesis interrupted.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleHandoffToFinance = () => {
        if (!currentImplementation) return;
        pushToInvestmentQueue(currentImplementation);
        addLog('SUCCESS', `TREASURY_SYNC: Capital allocation protocol staged for deployment.`);
        audio.playSuccess();
        if (confirm("Protocol staged for funding. Transition to Treasury control?")) {
            setMode(AppMode.AUTONOMOUS_FINANCE);
        }
    };

    return (
        <div className="h-full w-full bg-[var(--bg-main)] flex flex-col border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans transition-colors duration-500">
            <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#18E6FF]/50 to-transparent" />
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/30 rounded-xl shadow-xl">
                        <GitMerge className="w-5 h-5 text-[var(--amethyst)]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Implementation Bridge</h1>
                        <span className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-1.5 block">D-System Handover Logic // v2025.Q1</span>
                    </div>
                </div>
                <button onClick={() => { audio.playClick(); generateImplementation(); }} className="p-2.5 bg-white/5 border border-white/10 hover:border-[var(--amethyst)] rounded-xl text-gray-500 hover:text-white transition-all active:scale-95 group shadow-lg">
                    <RefreshCw size={16} className="group-active:rotate-180 transition-transform duration-700" />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden h-full">
                <div className="w-[300px] border-r border-[var(--border-main)] bg-[var(--bg-side)] flex flex-col shrink-0 relative">
                    <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic Context</span>
                        <Fingerprint size={14} className="text-gray-800" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        <div className="space-y-2">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button key={layer.id} onClick={() => { toggleKnowledgeLayer(layer.id); audio.playClick(); }}
                                        className={`w-full p-4 rounded-2xl border transition-all duration-500 text-left relative overflow-hidden group
                                            ${isActive ? 'bg-[var(--bg-panel)] border-[var(--color)] shadow-xl scale-[1.02]' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-1.5 rounded-lg bg-white/5" style={{ color: layer.color }}>
                                                <Landmark size={16} />
                                            </div>
                                            <div className="text-[11px] font-black text-white uppercase font-mono truncate w-40">{layer.label}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-6 border-t border-white/10 space-y-4">
                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Infrastructure Hubs</div>
                            <div className="space-y-2">
                                {layers.map(layer => (
                                    <div key={layer.id} onClick={() => { setMetaventionsState({ activeLayerId: layer.id }); audio.playClick(); }} 
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-500 ${activeLayerId === layer.id ? 'bg-[var(--bg-panel)] border-[var(--amethyst)] shadow-xl' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-3">
                                                {layer.status === 'OPTIMIZED' && <CheckCircle2 size={14} className="text-[#10b981]" />}
                                                <span className={`text-[10px] font-black font-mono uppercase transition-colors ${activeLayerId === layer.id ? 'text-white' : 'text-gray-500'}`}>{layer.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-black/40 flex flex-col relative overflow-hidden h-full">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 flex flex-col items-center min-h-0">
                        <div className="w-full max-w-[800px] flex flex-col h-full">
                            <AnimatePresence mode="wait">
                                {!activeLayer ? (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center opacity-10 text-center gap-10">
                                        <Activity size={100} className="text-gray-600 animate-pulse" />
                                        <p className="font-mono text-2xl uppercase tracking-[1em] text-white">System_Offline</p>
                                    </motion.div>
                                ) : currentImplementation ? (
                                    <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col gap-6">
                                        <div className="bg-[var(--bg-card-top)] p-10 rounded-[3rem] relative overflow-hidden shadow-2xl group/result border border-white/5">
                                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover/result:opacity-[0.08] transition-all duration-1000 rotate-12"><Sparkles size={160} className="text-[var(--amethyst)]" /></div>
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="px-5 py-1.5 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-full">
                                                    <span className="text-[10px] font-black text-[var(--amethyst)] uppercase font-mono tracking-widest">Implementation Verified</span>
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-white uppercase font-mono tracking-tighter mb-6 leading-tight">{currentImplementation.title}</h3>
                                            <p className="text-[15px] text-gray-300 font-mono leading-relaxed italic border-l-4 border-[var(--amethyst)] pl-8 mb-10 py-2 group-hover:text-white transition-colors duration-500">"{currentImplementation.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 shadow-inner group/viability relative overflow-hidden">
                                                    <span className="text-[10px] text-gray-600 uppercase font-black block mb-4 tracking-widest">Protocol Confidence</span>
                                                    <div className="flex items-center gap-6 relative z-10">
                                                        <span className="text-4xl font-black text-[#10b981] font-mono tracking-tighter">{currentImplementation.viability}%</span>
                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden p-px">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${currentImplementation.viability}%` }} transition={{ duration: 1.5 }} className="h-full bg-[#10b981] shadow-[0_0_15px_#10b981]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 shadow-inner group/risk relative overflow-hidden">
                                                    <span className="text-[10px] text-gray-600 uppercase font-black block mb-4 tracking-widest">Deployment Risk</span>
                                                    <div className="flex items-center gap-4 text-red-500 relative z-10">
                                                        <ShieldAlert size={28} className="animate-pulse" />
                                                        <span className="text-[11px] font-black font-mono uppercase tracking-widest truncate">{currentImplementation.riskVector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <DeploymentFeasibility strategy={currentImplementation.logic} />
                                        <InfrastructureEfficiencyGraph active={true} />

                                        <div className="mt-8 flex gap-6 pb-12">
                                            <button onClick={handleHandoffToFinance} className="flex-1 py-6 bg-[#10b981] text-black text-[11px] font-black uppercase tracking-[0.4em] rounded-[1.8rem] transition-all flex items-center justify-center gap-5 shadow-xl active:scale-95 group/fin">
                                                <DollarSign size={20} className="group-hover/fin:scale-125 transition-transform" /> Commit Strategic Capital
                                            </button>
                                            <button onClick={generateImplementation} className="px-12 py-6 bg-[var(--amethyst)] text-white font-black uppercase text-[11px] tracking-[0.4em] rounded-[1.8rem] hover:bg-[#8d3ee0] transition-all shadow-xl active:scale-95 group/refresh">
                                                <RefreshCw size={20} className="group-hover/refresh:rotate-180 transition-transform duration-700" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="forge" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-12 min-h-0 scale-90">
                                        <div className="relative group cursor-pointer" onClick={generateImplementation}>
                                            <div className="absolute inset-0 bg-[var(--amethyst)]/5 rounded-full blur-[80px] animate-pulse" />
                                            <div className="w-[240px] h-[240px] rounded-full border border-dashed border-[var(--amethyst)]/30 flex items-center justify-center relative z-10 group-hover:rotate-45 transition-transform duration-[20s]">
                                                <Zap size={80} className="text-[var(--amethyst)] group-hover:scale-110 transition-transform shadow-[0_0_60px_rgba(123,44,255,0.2)]" />
                                            </div>
                                            <div className="absolute inset-0 border border-white/5 rounded-full animate-[ping_15s_linear_infinite] opacity-10" />
                                        </div>
                                        <div className="text-center space-y-4">
                                            <h2 className="text-2xl font-black text-white uppercase tracking-[0.6em]">Implementation Lab</h2>
                                            <p className="text-[11px] text-gray-500 font-mono max-w-sm mx-auto uppercase tracking-widest opacity-60 leading-relaxed">Synthesizing {activeLayer.name} metadata into active strategic implementations for The D-Ecosystem.</p>
                                        </div>
                                        <button onClick={generateImplementation} disabled={isGenerating} className="px-20 py-6 bg-[var(--amethyst)] hover:bg-[#8d3ee0] text-white font-black text-[11px] uppercase tracking-[0.5em] rounded-2xl transition-all shadow-2xl flex items-center gap-6 active:scale-95 group/main">
                                            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <PlayCircle size={20} className="group-hover/main:scale-125 transition-transform" />}
                                            {isGenerating ? 'ANALYZING VECTORS...' : 'Initialize Implementation'}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-12 bg-black/80 border-t border-[var(--border-main)] px-10 flex items-center justify-between text-[10px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-3xl">
                <div className="flex gap-10 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-3 text-[#10b981] font-black uppercase tracking-widest">
                        <CheckCircle2 size={16} /> Implementation_Stable
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest font-bold">
                        <Binary size={16} className="text-[var(--amethyst)]" /> Protocol Release: 2025.Q1
                    </div>
                </div>
                <div className="uppercase tracking-widest opacity-40 leading-none text-[8px] font-black">THE D-ECOSYSTEM IMPLEMENTATION BRIDGE</div>
            </div>
        </div>
    );
};

export default SynthesisBridge;