import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, RefreshCw, Radar, HardDrive, Dna, 
    Binary, Save, Globe, ShieldCheck, DollarSign, Search, 
    ChevronRight, CheckCircle2, Layers, Landmark, ShieldAlert
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
            setFeasibility("Signal error during real-world verification.");
        } finally {
            setLoading(false);
        }
    };

    if (!strategy) return null;

    return (
        <div className="mt-10 glass-card rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group brand-inner-glow border-white/5">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-[var(--cyan)]/10 rounded-2xl text-[var(--cyan)] border border-[var(--cyan)]/30">
                        <Globe size={24} />
                    </div>
                    <span className="text-xs font-black font-mono text-[var(--stellar-white)] uppercase tracking-[0.5em]">Real-World Deployment Vector</span>
                </div>
                <button 
                    onClick={checkRealWorld} 
                    disabled={loading}
                    className="px-6 py-2.5 bg-black/40 hover:bg-[var(--cyan)] hover:text-black border border-white/10 rounded-2xl text-[10px] font-black uppercase text-[var(--text-muted)] transition-all flex items-center gap-3 shadow-xl"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Verify Reality Node
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                {feasibility ? (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="p-8 bg-black/40 border border-[var(--cyan)]/30 rounded-[2.5rem] text-[13px] font-mono text-gray-200 leading-relaxed italic border-l-4 border-l-[var(--cyan)] shadow-inner">
                            "{feasibility}"
                        </div>
                        <div className="flex items-center gap-3 px-2 text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-[#10b981]" />
                            Grounded via Sovereign Search // LATTICE_SIGNAL_LOCKED
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-14 text-center opacity-10 group-hover:opacity-30 transition-all duration-700 scale-110">
                        <Radar size={64} className="mx-auto mb-6 animate-pulse text-[var(--cyan)]" />
                        <span className="text-[11px] font-black font-mono uppercase tracking-[1em] text-[var(--stellar-white)]">Awaiting Reality Handshake</span>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PhysicalDeltaGraph = ({ active }: { active: boolean }) => {
    const [data, setData] = useState(Array.from({ length: 30 }, (_, i) => ({
        time: i,
        displacement: 10 + Math.random() * 5,
        entropy: 30 + Math.random() * 10
    })));

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(1), { 
                    time: last.time + 1, 
                    displacement: Math.max(5, last.displacement + Math.random() * 12 - 5),
                    entropy: Math.max(10, 40 + Math.sin(last.time * 0.4) * 30)
                }];
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="h-56 w-full mt-10 glass-card rounded-[3rem] p-8 overflow-hidden relative border-white/5 brand-inner-glow">
            <div className="absolute top-5 left-8 text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <Radar size={14} className="text-[var(--amethyst)] animate-pulse" /> Reality Displacement Delta (R.D.D)
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="deltaColor" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--amethyst)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--amethyst)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="displacement" stroke="var(--amethyst)" fill="url(#deltaColor)" strokeWidth={3} isAnimationActive={false} />
                    <Area type="monotone" dataKey="entropy" stroke="#ef4444" fill="transparent" strokeWidth={1} strokeDasharray="5 5" isAnimationActive={false} opacity={0.3} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const SynthesisBridge: React.FC = () => {
    const { metaventions, setMetaventionsState, addLog, archiveIntervention, knowledge, toggleKnowledgeLayer, setMode, pushToInvestmentQueue } = useAppStore();
    const { layers, activeLayerId, strategyLibrary } = metaventions;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    const activeKnowledgeLayerIds = knowledge.activeLayers || [];

    const [isGenerating, setIsGenerating] = useState(false);
    const [currentMetavention, setCurrentMetavention] = useState<any | null>(null);

    const generateHack = async () => {
        if (!activeLayer) return;
        setIsGenerating(true);
        addLog('SYSTEM', `METAVENTION_INIT: Forging strategy link for "${activeLayer.name}"...`);
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
                contents: `Reality Layer: ${activeLayer.name}\nResource leverage: "${activeLayer.leverage}"\nStructural Knowledge: ${activeKnowledge}\nSynthesize an elite strategic Metavention to bridge digital capital to physical results. JSON Output.`,
                config: { responseMimeType: 'application/json', responseSchema: schema }
            }));

            const result = JSON.parse(response.text || '{}');
            setCurrentMetavention(result);
            addLog('SUCCESS', `METAVENTION_SYNC: "${result.title}" link synthesized.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'METAVENTION_FAIL: Structural collapse during forge.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleHandoffToTreasury = () => {
        if (!currentMetavention) return;
        pushToInvestmentQueue(currentMetavention);
        addLog('SUCCESS', `TREASURY_SYNC: Capital allocation protocol staged for "${currentMetavention.title}".`);
        audio.playSuccess();
        if (confirm("Metavention protocol staged for funding. Transition to Treasury sector?")) {
            setMode(AppMode.AUTONOMOUS_FINANCE);
        }
    };

    return (
        <div className="h-full w-full bg-[#030305] flex flex-col border border-[var(--border-main)] rounded-[4rem] overflow-hidden shadow-[0_80px_200px_rgba(0,0,0,1)] relative font-sans brand-inner-glow">
            <div className="h-24 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-20 flex items-center justify-between px-12 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-2xl shadow-[0_0_40px_rgba(123,44,255,0.25)]">
                        <GitMerge className="w-8 h-8 text-[var(--amethyst)]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black font-mono uppercase tracking-[0.5em] text-[var(--stellar-white)] leading-none">Synthesis Bridge</h1>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-[0.4em] mt-2 block">Reality Handover Control // v9.5-ZENITH</span>
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black font-mono text-gray-600 uppercase tracking-[0.3em]">Lattice Phase</span>
                        <div className="w-3 h-3 rounded-full bg-[var(--amethyst)] animate-pulse shadow-[0_0_20px_var(--amethyst)]" />
                    </div>
                    <button onClick={() => audio.playClick()} className="p-4 bg-white/5 border border-white/10 hover:border-[var(--amethyst)] rounded-2xl text-gray-500 hover:text-white transition-all shadow-2xl group active:scale-95">
                        <RefreshCw size={24} className="group-active:rotate-180 transition-transform duration-700" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden h-full">
                {/* Left Control Column */}
                <div className="w-[380px] border-r border-[var(--border-main)] bg-black/40 flex flex-col shrink-0 relative brand-inner-glow">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.6em]">Context Buffers</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                        <div className="space-y-4">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button key={layer.id} onClick={() => { toggleKnowledgeLayer(layer.id); audio.playClick(); }}
                                        className={`w-full p-6 rounded-[2rem] border transition-all duration-700 text-left relative overflow-hidden group
                                            ${isActive ? 'bg-black border-[var(--color)] shadow-[0_20px_50px_rgba(0,0,0,0.8)] scale-[1.02]' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="p-4 rounded-2xl bg-white/5 shadow-inner" style={{ color: layer.color }}>
                                                <Landmark size={24} />
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-black text-white uppercase font-mono tracking-widest">{layer.label}</div>
                                                <div className="text-[10px] text-gray-500 font-mono tracking-tighter mt-1 leading-relaxed">{layer.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-10 border-t border-white/5 space-y-6">
                            <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.6em] mb-6 flex items-center gap-5 px-3">
                                <Layers size={18} className="text-[var(--amethyst)]" /> Reality Planes
                            </div>
                            <div className="space-y-4">
                                {layers.map(layer => (
                                    <div key={layer.id} onClick={() => { setMetaventionsState({ activeLayerId: layer.id }); audio.playClick(); }} 
                                        className={`p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-700 group relative overflow-hidden ${activeLayerId === layer.id ? 'bg-[#0a0a0a] border-[var(--amethyst)] shadow-[0_40px_80px_rgba(0,0,0,0.8)] scale-[1.05]' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                {layer.status === 'OPTIMIZED' && <CheckCircle2 size={16} className="text-[#10b981]" />}
                                                <span className={`text-[13px] font-black font-mono uppercase tracking-widest transition-colors ${activeLayerId === layer.id ? 'text-white' : 'text-gray-500'}`}>{layer.name}</span>
                                            </div>
                                            <div className={`text-[9px] font-black font-mono px-3 py-1 rounded-xl border border-white/10 uppercase ${layer.status === 'OPTIMIZED' ? 'text-[#10b981] border-[#10b981]/30' : 'text-gray-700'}`}>{layer.status}</div>
                                        </div>
                                        {activeLayerId === layer.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-4 mt-8">
                                                {layer.metrics.slice(0, 2).map((m, i) => (
                                                    <div key={i} className="bg-black/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                                                        <div className="text-[9px] text-gray-600 uppercase font-mono tracking-widest mb-2">{m.label}</div>
                                                        <div className="text-sm text-white font-black font-mono">{m.value}</div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Central Workspace */}
                <div className="flex-1 bg-black/20 flex flex-col relative overflow-hidden h-full brand-inner-glow">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.03)_0%,transparent_80%)] pointer-events-none"></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-20 flex flex-col items-center min-h-0">
                        <div className="w-full max-w-5xl flex flex-col h-full">
                            <AnimatePresence mode="wait">
                                {!activeLayer ? (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center opacity-10 text-center gap-16 scale-110">
                                        <div className="w-72 h-72 rounded-full border-4 border-dashed border-gray-800 flex items-center justify-center animate-[spin_40s_linear_infinite]">
                                            <Dna size={120} className="text-gray-600" />
                                        </div>
                                        <p className="font-mono text-3xl uppercase tracking-[1em] text-white">Lattice_Disconnected</p>
                                    </motion.div>
                                ) : currentMetavention ? (
                                    <motion.div key="result" initial={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} className="flex-1 flex flex-col gap-14">
                                        <div className="glass-card p-16 rounded-[4rem] relative overflow-hidden shadow-[0_80px_200px_rgba(0,0,0,1)] group/result border-white/5 brand-inner-glow">
                                            <div className="absolute top-0 right-0 p-14 opacity-[0.05] group-hover/result:opacity-[0.15] transition-all duration-1000 rotate-12"><Sparkles size={220} className="text-[var(--amethyst)]" /></div>
                                            <div className="flex items-center gap-6 mb-12">
                                                <div className="px-8 py-3 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-full shadow-2xl">
                                                    <span className="text-[12px] font-black text-[var(--amethyst)] uppercase font-mono tracking-[0.5em]">LATTICE_CONVERGENCE_LOCKED</span>
                                                </div>
                                            </div>
                                            <h3 className="text-6xl font-black text-[var(--stellar-white)] uppercase font-mono tracking-tighter mb-10 leading-[0.9]">{currentMetavention.title}</h3>
                                            <p className="text-lg text-gray-200 font-mono leading-relaxed italic border-l-4 border-[var(--amethyst)] pl-12 mb-16 py-4 group-hover/result:text-white transition-colors drop-shadow-xl">"{currentMetavention.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-10">
                                                <div className="bg-black/60 p-10 rounded-[3rem] border border-white/5 shadow-inner transition-all hover:border-[#10b981]/40">
                                                    <span className="text-[11px] text-gray-600 uppercase font-black block mb-6 tracking-[0.5em]">Viability Index</span>
                                                    <div className="flex items-center gap-8">
                                                        <span className="text-5xl font-black text-[#10b981] font-mono tracking-tighter shadow-sm">{currentMetavention.viability}%</span>
                                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${currentMetavention.viability}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-[#10b981] shadow-[0_0_25px_#10b981]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 p-10 rounded-[3rem] border border-white/5 shadow-inner transition-all hover:border-red-500/40">
                                                    <span className="text-[11px] text-gray-600 uppercase font-black block mb-6 tracking-[0.5em]">Risk Manifold</span>
                                                    <div className="flex items-center gap-6 text-red-500">
                                                        {/* Fix: Added ShieldAlert from lucide-react */}
                                                        <ShieldAlert size={28} className="animate-pulse" />
                                                        <span className="text-sm font-black font-mono uppercase tracking-[0.3em] truncate">{currentMetavention.riskVector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <RealWorldFeasibility strategy={currentMetavention.logic} />
                                        <PhysicalDeltaGraph active={true} />

                                        <div className="mt-14 flex gap-8 pb-20">
                                            <button onClick={handleHandoffToTreasury} className="flex-1 py-8 bg-[#10b981] text-black text-[13px] font-black uppercase tracking-[0.5em] rounded-[3rem] transition-all flex items-center justify-center gap-6 shadow-[0_30px_70px_rgba(16,185,129,0.4)] active:scale-95 group/fin">
                                                <DollarSign size={24} className="group-hover/fin:scale-125 transition-transform" /> Allocate Digital Capital
                                            </button>
                                            <button onClick={generateHack} className="px-14 py-8 bg-[var(--amethyst)] text-white font-black uppercase text-[13px] tracking-[0.6em] rounded-[3rem] hover:bg-[#8d3ee0] transition-all shadow-[0_50px_100px_rgba(123,44,255,0.4)] active:scale-95 group/refresh">
                                                <RefreshCw size={24} className="group-hover/refresh:rotate-180 transition-transform duration-1000" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="forge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-20 min-h-0 scale-110">
                                        <div className="relative group cursor-pointer" onClick={generateHack}>
                                            <div className="absolute inset-0 bg-[var(--amethyst)]/20 rounded-full blur-[120px] group-hover:blur-[180px] transition-all duration-1000 animate-pulse" />
                                            <div className="w-80 h-80 rounded-full border-4 border-dashed border-[var(--amethyst)]/40 flex items-center justify-center relative z-10 group-hover:rotate-180 transition-transform duration-[5s] ease-in-out">
                                                <Target size={100} className="text-[var(--amethyst)] group-hover:scale-125 transition-transform duration-1000" />
                                            </div>
                                            <div className="absolute inset-0 border-2 border-white/5 rounded-full animate-[ping_4s_linear_infinite] opacity-10" />
                                        </div>
                                        <div className="text-center space-y-8">
                                            <h2 className="text-4xl font-black text-[var(--stellar-white)] uppercase tracking-[0.8em] drop-shadow-2xl">Protocol Forge</h2>
                                            <p className="text-[13px] text-[var(--text-muted)] font-mono max-w-xl mx-auto uppercase leading-relaxed tracking-[0.3em] opacity-80">Synthesizing {activeLayer.name} metadata into autonomous strategic sequence L0_Handover.</p>
                                        </div>
                                        <button onClick={generateHack} disabled={isGenerating} className="px-24 py-10 bg-[var(--amethyst)] hover:bg-[#8d3ee0] text-white font-black text-sm uppercase tracking-[0.7em] rounded-[4rem] transition-all shadow-[0_60px_120px_rgba(123,44,255,0.4)] flex items-center gap-8 disabled:opacity-50 active:scale-95 group/main">
                                            {isGenerating ? <Loader2 size={32} className="animate-spin" /> : <Zap size={32} className="group-hover/main:scale-125 transition-transform" />}
                                            {isGenerating ? 'SIMULATING_VECTORS' : 'Execute Metavention'}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bridge Status HUD */}
            <div className="h-14 bg-black/60 border-t border-[var(--border-main)] px-14 flex items-center justify-between text-[11px] font-mono text-gray-500 shrink-0 relative z-[60]">
                <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-5 text-[#10b981] font-black uppercase tracking-[0.3em]">
                        {/* Fix: Replaced CheckCircle with CheckCircle2 as recommended */}
                        <CheckCircle2 size={20} className="shadow-[0_0_20px_#10b981]" /> Handover_Stable
                    </div>
                    <div className="flex items-center gap-5 uppercase tracking-widest font-black">
                        <Binary size={20} className="text-[var(--amethyst)]" /> Protocol: ZENITH_v9.5
                    </div>
                </div>
                <div className="flex items-center gap-12 shrink-0">
                    <span className="uppercase tracking-[0.6em] opacity-50 leading-none text-[9px] font-black">SOVEREIGN_OS_CORE // STRATEGY_ENGINE</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;