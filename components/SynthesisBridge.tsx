import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, RefreshCw, Radar, HardDrive, Dna, 
    Binary, Save, Globe, ShieldCheck, DollarSign, Search, 
    ChevronRight, CheckCircle2, Layers, Landmark, ShieldAlert,
    AlertTriangle, Server, Radio, Shield, Fingerprint, GitCommit
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
        <div className="mt-10 glass-card rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group brand-inner-glow border-white/5 bg-black/40">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl text-[var(--cyan)] border border-[var(--cyan)]/30 shadow-[0_0_30px_rgba(24,230,255,0.15)]">
                        <Globe size={28} />
                    </div>
                    <div>
                        <span className="text-sm font-black font-mono text-[var(--stellar-white)] uppercase tracking-[0.6em]">Real-World Deployment Vector</span>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-[0.3em] mt-1.5">Grounded Reality Oracle // LATTICE_ZENITH</p>
                    </div>
                </div>
                <button 
                    onClick={checkRealWorld} 
                    disabled={loading}
                    className="px-8 py-3 bg-black/60 hover:bg-[var(--cyan)] hover:text-black border border-white/10 rounded-2xl text-[11px] font-black uppercase text-white transition-all flex items-center gap-4 shadow-2xl active:scale-95"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Verify Reality Node
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                {feasibility ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="p-10 bg-black/60 border border-[var(--cyan)]/20 rounded-[3rem] text-base font-mono text-gray-200 leading-relaxed italic border-l-8 border-l-[var(--cyan)] shadow-inner">
                            "{feasibility}"
                        </div>
                        <div className="flex items-center justify-between px-4">
                            <div className="flex items-center gap-4 text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">
                                <ShieldCheck size={18} className="text-[#10b981]" />
                                Grounded via Sovereign Search // LATTICE_SIGNAL_LOCKED
                            </div>
                            <div className="flex gap-4">
                                <span className="text-[9px] font-mono text-gray-700 uppercase">Reg_Tier: GLOBAL</span>
                                <span className="text-[9px] font-mono text-gray-700 uppercase">Auth: 0xV_ZENITH</span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-20 text-center opacity-10 group-hover:opacity-40 transition-all duration-1000 scale-110">
                        <Radar size={80} className="mx-auto mb-8 animate-pulse text-[var(--cyan)]" />
                        <span className="text-base font-black font-mono uppercase tracking-[1.2em] text-[var(--stellar-white)]">Awaiting Reality Handshake</span>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PhysicalDeltaGraph = ({ active }: { active: boolean }) => {
    const [data, setData] = useState(Array.from({ length: 40 }, (_, i) => ({
        time: i,
        displacement: 15 + Math.random() * 8,
        entropy: 35 + Math.random() * 15
    })));

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(1), { 
                    time: last.time + 1, 
                    displacement: Math.max(5, last.displacement + Math.random() * 14 - 6),
                    entropy: Math.max(10, 45 + Math.sin(last.time * 0.3) * 35)
                }];
            });
        }, 1200);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="h-64 w-full mt-10 glass-card rounded-[3.5rem] p-10 overflow-hidden relative border-white/5 brand-inner-glow bg-black/40">
            <div className="absolute top-6 left-10 text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.5em] flex items-center gap-4">
                <Radar size={16} className="text-[var(--amethyst)] animate-pulse" /> Reality Displacement Delta (R.D.D)
            </div>
            <div className="absolute top-6 right-10 flex gap-6 text-[8px] font-mono text-gray-600 uppercase">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--amethyst)]" /> Displacement</span>
                <span className="flex items-center gap-2"><div className="w-2 h-0.5 bg-[#ef4444] border-t border-dashed" /> Entropy</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="deltaColor" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--amethyst)" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="var(--amethyst)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="displacement" stroke="var(--amethyst)" fill="url(#deltaColor)" strokeWidth={4} isAnimationActive={false} />
                    <Area type="monotone" dataKey="entropy" stroke="#ef4444" fill="transparent" strokeWidth={1} strokeDasharray="6 6" isAnimationActive={false} opacity={0.4} />
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
        <div className="h-full w-full bg-[#030305] flex flex-col border border-[var(--border-main)] rounded-[4rem] overflow-hidden shadow-[0_100px_250px_rgba(0,0,0,1)] relative font-sans brand-inner-glow animate-drift">
            
            {/* Sector Header */}
            <div className="h-28 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-20 flex items-center justify-between px-16 shrink-0">
                <div className="flex items-center gap-8">
                    <div className="p-5 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-[2rem] shadow-[0_0_50px_rgba(123,44,255,0.3)]">
                        <GitMerge className="w-10 h-10 text-[var(--amethyst)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black font-mono uppercase tracking-[0.6em] text-[var(--stellar-white)] leading-none">Synthesis Bridge</h1>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase tracking-[0.5em] mt-2.5 block">Reality Handover Control // v9.5-ZENITH</span>
                    </div>
                </div>
                <div className="flex items-center gap-14">
                    <div className="flex items-center gap-6">
                        <span className="text-[11px] font-black font-mono text-gray-700 uppercase tracking-[0.4em]">Lattice Phase</span>
                        <div className="w-4 h-4 rounded-full bg-[var(--amethyst)] animate-pulse shadow-[0_0_25px_var(--amethyst)]" />
                    </div>
                    <button onClick={() => { audio.playClick(); generateHack(); }} className="p-5 bg-white/5 border border-white/10 hover:border-[var(--amethyst)] rounded-2xl text-gray-500 hover:text-white transition-all shadow-2xl group active:scale-95">
                        <RefreshCw size={28} className="group-active:rotate-180 transition-transform duration-1000" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden h-full">
                {/* Left Control Column */}
                <div className="w-[440px] border-r border-[var(--border-main)] bg-black/40 flex flex-col shrink-0 relative brand-inner-glow">
                    <div className="p-10 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
                        <span className="text-[12px] font-black text-gray-500 uppercase tracking-[0.7em]">Context Buffers</span>
                        <Fingerprint size={18} className="text-gray-800" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
                        <div className="space-y-6">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button key={layer.id} onClick={() => { toggleKnowledgeLayer(layer.id); audio.playClick(); }}
                                        className={`w-full p-8 rounded-[2.5rem] border transition-all duration-1000 text-left relative overflow-hidden group
                                            ${isActive ? 'bg-[#050505] border-[var(--color)] shadow-[0_40px_100px_rgba(0,0,0,0.9)] scale-[1.03]' : 'bg-transparent border-transparent opacity-30 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex items-center gap-8 relative z-10">
                                            <div className="p-5 rounded-2xl bg-white/5 shadow-inner" style={{ color: layer.color }}>
                                                <Landmark size={32} />
                                            </div>
                                            <div>
                                                <div className="text-base font-black text-white uppercase font-mono tracking-widest">{layer.label}</div>
                                                <div className="text-[11px] text-gray-500 font-mono tracking-tighter mt-1.5 leading-relaxed">{layer.description}</div>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity"><GitCommit size={60} /></div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-12 border-t border-white/5 space-y-8">
                            <div className="text-[12px] font-black text-gray-500 uppercase tracking-[0.7em] mb-8 flex items-center gap-6 px-4">
                                <Layers size={22} className="text-[var(--amethyst)]" /> Reality Planes
                            </div>
                            <div className="space-y-6">
                                {layers.map(layer => (
                                    <div key={layer.id} onClick={() => { setMetaventionsState({ activeLayerId: layer.id }); audio.playClick(); }} 
                                        className={`p-10 rounded-[3rem] border cursor-pointer transition-all duration-1000 group relative overflow-hidden ${activeLayerId === layer.id ? 'bg-[#080808] border-[var(--amethyst)] shadow-[0_60px_120px_rgba(0,0,0,1)] scale-[1.06]' : 'bg-transparent border-transparent opacity-30 hover:opacity-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex items-center gap-6">
                                                {layer.status === 'OPTIMIZED' && <CheckCircle2 size={20} className="text-[#10b981]" />}
                                                <span className={`text-base font-black font-mono uppercase tracking-widest transition-colors ${activeLayerId === layer.id ? 'text-white' : 'text-gray-500'}`}>{layer.name}</span>
                                            </div>
                                            <div className={`text-[10px] font-black font-mono px-4 py-1.5 rounded-xl border border-white/10 uppercase ${layer.status === 'OPTIMIZED' ? 'text-[#10b981] border-[#10b981]/30' : 'text-gray-700'}`}>{layer.status}</div>
                                        </div>
                                        {activeLayerId === layer.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-6 mt-10">
                                                {layer.metrics.slice(0, 2).map((m, i) => (
                                                    <div key={i} className="bg-black/60 p-6 rounded-3xl border border-white/5 shadow-inner">
                                                        <div className="text-[10px] text-gray-600 uppercase font-mono tracking-widest mb-3">{m.label}</div>
                                                        <div className="text-lg text-white font-black font-mono">{m.value}</div>
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
                <div className="flex-1 bg-black/30 flex flex-col relative overflow-hidden h-full brand-inner-glow">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.04)_0%,transparent_85%)] pointer-events-none"></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-24 flex flex-col items-center min-h-0">
                        <div className="w-full max-w-6xl flex flex-col h-full">
                            <AnimatePresence mode="wait">
                                {!activeLayer ? (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center opacity-10 text-center gap-20 scale-110">
                                        <div className="w-80 h-80 rounded-full border-8 border-dashed border-gray-900 flex items-center justify-center animate-[spin_60s_linear_infinite]">
                                            <Dna size={160} className="text-gray-700" />
                                        </div>
                                        <p className="font-mono text-4xl uppercase tracking-[1.5em] text-white">Lattice_Disconnected</p>
                                    </motion.div>
                                ) : currentMetavention ? (
                                    <motion.div key="result" initial={{ opacity: 0, scale: 0.96, filter: 'blur(30px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} className="flex-1 flex flex-col gap-16">
                                        <div className="glass-card p-20 rounded-[5rem] relative overflow-hidden shadow-[0_120px_250px_rgba(0,0,0,1)] group/result border-white/10 brand-inner-glow bg-black/40">
                                            <div className="absolute top-0 right-0 p-20 opacity-[0.04] group-hover/result:opacity-[0.2] transition-all duration-1000 rotate-12"><Sparkles size={300} className="text-[var(--amethyst)]" /></div>
                                            <div className="flex items-center gap-8 mb-16">
                                                <div className="px-10 py-4 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-full shadow-[0_0_40px_rgba(123,44,255,0.2)]">
                                                    <span className="text-[13px] font-black text-[var(--amethyst)] uppercase font-mono tracking-[0.6em]">LATTICE_CONVERGENCE_LOCKED</span>
                                                </div>
                                            </div>
                                            <h3 className="text-7xl font-black text-[var(--stellar-white)] uppercase font-mono tracking-tighter mb-14 leading-[0.85]">{currentMetavention.title}</h3>
                                            <p className="text-xl text-gray-200 font-mono leading-relaxed italic border-l-8 border-[var(--amethyst)] pl-16 mb-20 py-6 group-hover/result:text-white transition-colors drop-shadow-2xl">"{currentMetavention.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-12">
                                                <div className="bg-black/60 p-12 rounded-[4rem] border border-white/5 shadow-inner transition-all hover:border-[#10b981]/50 group/viability">
                                                    <span className="text-[12px] text-gray-600 uppercase font-black block mb-8 tracking-[0.6em] group-hover/viability:text-[#10b981] transition-colors">Viability Index</span>
                                                    <div className="flex items-center gap-10">
                                                        <span className="text-6xl font-black text-[#10b981] font-mono tracking-tighter shadow-sm">{currentMetavention.viability}%</span>
                                                        <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${currentMetavention.viability}%` }} transition={{ duration: 2, ease: "easeOut" }} className="h-full bg-[#10b981] shadow-[0_0_30px_#10b981]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 p-12 rounded-[4rem] border border-white/5 shadow-inner transition-all hover:border-red-500/50 group/risk">
                                                    <span className="text-[12px] text-gray-600 uppercase font-black block mb-8 tracking-[0.6em] group-hover/risk:text-red-500 transition-colors">Risk Manifold</span>
                                                    <div className="flex items-center gap-8 text-red-500">
                                                        <ShieldAlert size={40} className="animate-pulse" />
                                                        <span className="text-lg font-black font-mono uppercase tracking-[0.4em] truncate">{currentMetavention.riskVector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <RealWorldFeasibility strategy={currentMetavention.logic} />
                                        <PhysicalDeltaGraph active={true} />

                                        <div className="mt-20 flex gap-10 pb-32">
                                            <button onClick={handleHandoffToTreasury} className="flex-1 py-10 bg-[#10b981] text-black text-[15px] font-black uppercase tracking-[0.7em] rounded-[4rem] transition-all flex items-center justify-center gap-8 shadow-[0_40px_100px_rgba(16,185,129,0.5)] active:scale-95 group/fin">
                                                <DollarSign size={32} className="group-hover/fin:scale-125 transition-transform" /> Allocate Digital Capital
                                            </button>
                                            <button onClick={generateHack} className="px-20 py-10 bg-[var(--amethyst)] text-white font-black uppercase text-[15px] tracking-[0.8em] rounded-[4rem] hover:bg-[#8d3ee0] transition-all shadow-[0_60px_120px_rgba(123,44,255,0.5)] active:scale-95 group/refresh">
                                                <RefreshCw size={32} className="group-hover/refresh:rotate-180 transition-transform duration-1000" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="forge" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-24 min-h-0 scale-110">
                                        <div className="relative group cursor-pointer" onClick={generateHack}>
                                            <div className="absolute inset-0 bg-[var(--amethyst)]/20 rounded-full blur-[150px] group-hover:blur-[220px] transition-all duration-1000 animate-pulse" />
                                            <div className="w-96 h-96 rounded-full border-8 border-dashed border-[var(--amethyst)]/40 flex items-center justify-center relative z-10 group-hover:rotate-180 transition-transform duration-[8s] ease-in-out">
                                                <Target size={140} className="text-[var(--amethyst)] group-hover:scale-125 transition-transform duration-1000 shadow-[0_0_100px_rgba(123,44,255,0.4)]" />
                                            </div>
                                            <div className="absolute inset-0 border-4 border-white/5 rounded-full animate-[ping_6s_linear_infinite] opacity-20" />
                                        </div>
                                        <div className="text-center space-y-10">
                                            <h2 className="text-5xl font-black text-[var(--stellar-white)] uppercase tracking-[1em] drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">Protocol Forge</h2>
                                            <p className="text-base text-[var(--text-muted)] font-mono max-w-2xl mx-auto uppercase leading-relaxed tracking-[0.4em] opacity-80">Synthesizing {activeLayer.name} metadata into autonomous strategic sequence L0_Handover.</p>
                                        </div>
                                        <button onClick={generateHack} disabled={isGenerating} className="px-32 py-12 bg-[var(--amethyst)] hover:bg-[#8d3ee0] text-white font-black text-lg uppercase tracking-[0.8em] rounded-[5rem] transition-all shadow-[0_80px_160px_rgba(123,44,255,0.5)] flex items-center gap-10 disabled:opacity-50 active:scale-95 group/main">
                                            {isGenerating ? <Loader2 size={40} className="animate-spin" /> : <Zap size={40} className="group-hover/main:scale-125 transition-transform" />}
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
            <div className="h-16 bg-black/70 border-t border-[var(--border-main)] px-16 flex items-center justify-between text-[13px] font-mono text-gray-500 shrink-0 relative z-[60] backdrop-blur-3xl">
                <div className="flex gap-20 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-6 text-[#10b981] font-black uppercase tracking-[0.4em]">
                        <CheckCircle2 size={24} className="shadow-[0_0_30px_#10b981]" /> Handover_Stable
                    </div>
                    <div className="flex items-center gap-6 uppercase tracking-widest font-black">
                        <Binary size={24} className="text-[var(--amethyst)]" /> Protocol: ZENITH_v9.5
                    </div>
                </div>
                <div className="flex items-center gap-16 shrink-0">
                    <span className="uppercase tracking-[0.8em] opacity-50 leading-none text-[10px] font-black">SOVEREIGN_OS_CORE // STRATEGY_ENGINE</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;