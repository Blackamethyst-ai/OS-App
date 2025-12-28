import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, RefreshCw, Radar, HardDrive, Dna, 
    Binary, Save, Globe, ShieldCheck, DollarSign, Search, 
    ChevronRight, CheckCircle2, Layers, Landmark, ShieldAlert,
    // Add missing PlayCircle import
    Shield, GitCommit, Radio, Gauge, Waves, Fingerprint, PlayCircle
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, promptSelectKey, analyzeDeploymentFeasibility } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';
import { AppMode } from '../types';

const RealWorldFeasibility = ({ strategy }: { strategy: string | null }) => {
    const [feasibility, setFeasibility] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const checkRealWorld = async () => {
        if (!strategy) return;
        setLoading(true);
        audio.playClick();
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const summary = await analyzeDeploymentFeasibility(strategy);
            setFeasibility(summary);
            audio.playSuccess();
        } catch (e) {
            setFeasibility("Signal error during verification.");
        } finally {
            setLoading(false);
        }
    };

    if (!strategy) return null;

    return (
        <div className="mt-4 glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden group brand-inner-glow border-white/5 bg-black/40">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--cyan)]/10 rounded-lg text-[var(--cyan)] border border-[var(--cyan)]/30 shadow-[0_0_20px_rgba(24,230,255,0.1)]">
                        <Globe size={18} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black font-mono text-[var(--stellar-white)] uppercase tracking-[0.2em]">Deployment Feasibility Check</span>
                        <p className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-[0.1em] mt-0.5">Real-World Logic Grounding</p>
                    </div>
                </div>
                <button 
                    onClick={checkRealWorld} 
                    disabled={loading}
                    className="px-4 py-2 bg-black/60 hover:bg-[var(--cyan)] hover:text-black border border-white/10 rounded-lg text-[8px] font-black uppercase text-white transition-all flex items-center gap-2 active:scale-95 group/btn"
                >
                    {loading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                    Validate
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                {feasibility ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="p-4 bg-black/60 border border-[var(--cyan)]/20 rounded-xl text-[11px] font-mono text-gray-200 leading-relaxed italic border-l-2 border-l-[var(--cyan)]">
                            "{feasibility}"
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-8 text-center opacity-10 group-hover:opacity-20 transition-all duration-1000">
                        <Radar size={32} className="mx-auto mb-2 animate-pulse text-[var(--cyan)]" />
                        <span className="text-[9px] font-black font-mono uppercase tracking-[0.6em] text-[var(--stellar-white)]">Awaiting Verification</span>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PhysicalDeltaGraph = ({ active }: { active: boolean }) => {
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
                    displacement: Math.max(5, last.displacement + Math.random() * 16 - 7),
                    entropy: Math.max(10, 45 + Math.sin(last.time * 0.3) * 35)
                }];
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="h-32 w-full mt-4 glass-card rounded-2xl p-4 overflow-hidden relative border-white/5 brand-inner-glow bg-black/40">
            <div className="absolute top-4 left-5 text-[8px] font-black font-mono text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={12} className="text-[var(--amethyst)] animate-pulse" /> Efficiency Metrics
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <Area type="monotone" dataKey="displacement" stroke="var(--amethyst)" fill="var(--amethyst)" fillOpacity={0.1} strokeWidth={1} isAnimationActive={false} />
                    <Area type="monotone" dataKey="entropy" stroke="#ef4444" fill="transparent" strokeWidth={1} strokeDasharray="4 4" isAnimationActive={false} opacity={0.3} />
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
    const [currentMetavention, setCurrentMetavention] = useState<any | null>(null);

    const generateHack = async () => {
        if (!activeLayer) return;
        setIsGenerating(true);
        addLog('SYSTEM', `SYNC: Mapping deployment strategy for "${activeLayer.name}"...`);
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
                contents: `Context: ${activeLayer.name}. Knowledge: ${activeKnowledge}. Directive: Synthesize an elite strategic implementation protocol for production. JSON Output.`,
                config: { responseMimeType: 'application/json', responseSchema: schema }
            }));

            const result = JSON.parse(response.text || '{}');
            setCurrentMetavention(result);
            addLog('SUCCESS', `SYNC: Strategic protocol finalized.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'SYNC_FAIL: Structural interrupt.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleHandoffToTreasury = () => {
        if (!currentMetavention) return;
        pushToInvestmentQueue(currentMetavention);
        addLog('SUCCESS', `FINANCE_SYNC: Capital allocation protocol staged.`);
        audio.playSuccess();
        if (confirm("Protocol staged for funding. Transition to Finance core?")) {
            setMode(AppMode.AUTONOMOUS_FINANCE);
        }
    };

    return (
        <div className="h-full w-full bg-[#030305] flex flex-col border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-2xl relative font-sans brand-inner-glow">
            
            <div className="h-14 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-20 flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#18E6FF]/40 to-transparent" />
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-lg shadow-xl">
                        <GitMerge className="w-4 h-4 text-[var(--amethyst)]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black font-mono uppercase tracking-widest text-[var(--stellar-white)] leading-none">Deployment Bridge</h1>
                        <span className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-[0.2em] mt-1 block">Production Release // v2025.1</span>
                    </div>
                </div>
                <button onClick={() => { audio.playClick(); generateHack(); }} className="p-2 bg-white/5 border border-white/10 hover:border-[var(--amethyst)] rounded-lg text-gray-500 hover:text-white transition-all active:scale-95">
                    <RefreshCw size={14} className="group-active:rotate-180 transition-transform duration-1000" />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden h-full">
                <div className="w-[260px] border-r border-[var(--border-main)] bg-black/40 flex flex-col shrink-0 relative brand-inner-glow">
                    <div className="p-4 border-b border-white/5 bg-white/[0.04] flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Context</span>
                        <Fingerprint size={12} className="text-gray-800" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                        <div className="space-y-1.5">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button key={layer.id} onClick={() => { toggleKnowledgeLayer(layer.id); audio.playClick(); }}
                                        className={`w-full p-2.5 rounded-xl border transition-all duration-500 text-left relative overflow-hidden group
                                            ${isActive ? 'bg-[#050505] border-[var(--color)] shadow-lg' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="p-1.5 rounded-lg bg-white/5" style={{ color: layer.color }}>
                                                <Landmark size={12} />
                                            </div>
                                            <div className="text-[10px] font-black text-white uppercase font-mono truncate w-32">{layer.label}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-6 border-t border-white/10 space-y-2">
                            <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Infrastructure Hubs</div>
                            {layers.map(layer => (
                                <div key={layer.id} onClick={() => { setMetaventionsState({ activeLayerId: layer.id }); audio.playClick(); }} 
                                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-500 ${activeLayerId === layer.id ? 'bg-[#080808] border-[var(--amethyst)] shadow-lg' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {layer.status === 'OPTIMIZED' && <CheckCircle2 size={12} className="text-[#10b981]" />}
                                            <span className={`text-[9px] font-black font-mono uppercase transition-colors ${activeLayerId === layer.id ? 'text-white' : 'text-gray-500'}`}>{layer.name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-black/30 flex flex-col relative overflow-hidden h-full brand-inner-glow">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center min-h-0">
                        <div className="w-full max-w-[760px] flex flex-col h-full">
                            <AnimatePresence mode="wait">
                                {!activeLayer ? (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center opacity-10 text-center gap-8">
                                        <Activity size={80} className="text-gray-700 animate-pulse" />
                                        <p className="font-mono text-xl uppercase tracking-[0.8em] text-white">System_Offline</p>
                                    </motion.div>
                                ) : currentMetavention ? (
                                    <motion.div key="result" initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col gap-6">
                                        <div className="glass-card p-8 rounded-3xl relative overflow-hidden shadow-2xl group/result border border-white/10 brand-inner-glow bg-black/40">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="px-4 py-1 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-full">
                                                    <span className="text-[9px] font-black text-[var(--amethyst)] uppercase font-mono tracking-widest">Protocol Verified</span>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black text-[var(--stellar-white)] uppercase font-mono tracking-tighter mb-4 leading-tight">{currentMetavention.title}</h3>
                                            <p className="text-sm text-gray-300 font-mono leading-relaxed italic border-l-2 border-[var(--amethyst)] pl-6 mb-8 py-2">"{currentMetavention.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-black/60 p-5 rounded-2xl border border-white/5 shadow-inner group/viability relative overflow-hidden">
                                                    <span className="text-[9px] text-gray-600 uppercase font-black block mb-3 tracking-widest">Confidence Score</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-3xl font-black text-[#10b981] font-mono tracking-tighter">{currentMetavention.viability}%</span>
                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${currentMetavention.viability}%` }} transition={{ duration: 1.5 }} className="h-full bg-[#10b981]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 p-5 rounded-2xl border border-white/5 shadow-inner group/risk relative overflow-hidden">
                                                    <span className="text-[9px] text-gray-600 uppercase font-black block mb-3 tracking-widest">Risk Assessment</span>
                                                    <div className="flex items-center gap-3 text-red-500">
                                                        <ShieldAlert size={20} className="animate-pulse" />
                                                        <span className="text-[10px] font-black font-mono uppercase tracking-widest truncate">{currentMetavention.riskVector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <RealWorldFeasibility strategy={currentMetavention.logic} />
                                        <PhysicalDeltaGraph active={true} />

                                        <div className="mt-6 flex gap-4 pb-12">
                                            <button onClick={handleHandoffToTreasury} className="flex-1 py-5 bg-[#10b981] text-black text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
                                                <DollarSign size={18} /> Allocate Capital
                                            </button>
                                            <button onClick={generateHack} className="px-10 py-5 bg-[var(--amethyst)] text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-[#8d3ee0] transition-all shadow-xl active:scale-95">
                                                <RefreshCw size={18} /> Regenerate
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="forge" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-10 min-h-0 scale-90">
                                        <div className="relative group cursor-pointer" onClick={generateHack}>
                                            <div className="absolute inset-0 bg-[var(--amethyst)]/5 rounded-full blur-[60px] animate-pulse" />
                                            <div className="w-[180px] h-[180px] rounded-full border border-dashed border-[var(--amethyst)]/40 flex items-center justify-center relative z-10 group-hover:rotate-45 transition-transform duration-[15s]">
                                                <Zap size={60} className="text-[var(--amethyst)] group-hover:scale-110 transition-transform shadow-2xl" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-3">
                                            <h2 className="text-xl font-black text-[var(--stellar-white)] uppercase tracking-[0.6em]">Strategy Lab</h2>
                                            <p className="text-[10px] text-[var(--text-muted)] font-mono max-w-sm mx-auto uppercase tracking-widest opacity-60">Mapping {activeLayer.name} assets into production Implementation protocols.</p>
                                        </div>
                                        <button onClick={generateHack} disabled={isGenerating} className="px-16 py-5 bg-[var(--amethyst)] hover:bg-[#8d3ee0] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-2xl flex items-center gap-5 active:scale-95">
                                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                            Initialize Implementation
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-10 bg-black/80 border-t border-[var(--border-main)] px-8 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-3xl">
                <div className="flex gap-8 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-2 text-[#10b981] font-black uppercase tracking-widest">
                        <CheckCircle2 size={12} /> Sync_Stable
                    </div>
                    <div className="flex items-center gap-2 uppercase tracking-widest">
                        <Binary size={12} className="text-[var(--amethyst)]" /> Release: 2025.Q1
                    </div>
                </div>
                <div className="uppercase tracking-widest opacity-40 leading-none text-[8px] font-black">METAVENTIONS_CORE // SYSTEM_BRIDGE</div>
            </div>
        </div>
    );
};

export default SynthesisBridge;