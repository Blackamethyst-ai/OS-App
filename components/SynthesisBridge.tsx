import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, Eye, History, Construction, Navigation2, 
    LineChart, ShieldAlert, Binary, Save, Radar, HardDrive, Dna, 
    BoxSelect, FlaskConical, CircleDot, AlertTriangle, ChevronRight, X,
    Layers, RefreshCw, Hammer, Coins, Telescope, Info, TrendingUp, BarChart3,
    CheckCircle2, Cpu, CheckCircle, Shield, Globe, ExternalLink, Search,
    ShieldCheck, ArrowUpRight, DollarSign
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
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
        <div className="mt-8 bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#22d3ee]/10 rounded-xl text-[#22d3ee] border border-[#22d3ee]/30">
                        <Globe size={18} />
                    </div>
                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Real-World Deployment Vector</span>
                </div>
                <button 
                    onClick={checkRealWorld} 
                    disabled={loading}
                    className="px-4 py-2 bg-[#111] hover:bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-[#22d3ee] transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    Verify Feasibility
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                {feasibility ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="p-5 bg-black border border-[#22d3ee]/20 rounded-2xl text-[11px] font-mono text-gray-300 leading-relaxed italic border-l-4 border-l-[#22d3ee]">
                            "{feasibility}"
                        </div>
                        <div className="flex items-center gap-3 px-1 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                            <ShieldCheck size={12} className="text-[#10b981]" />
                            Grounded via Google Search // Signal_Confirmed
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-8 text-center opacity-20 group-hover:opacity-40 transition-opacity">
                        <Radar size={40} className="mx-auto mb-4 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-widest">Awaiting Reality Handshake</span>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PhysicalDeltaGraph = ({ active }: { active: boolean }) => {
    const [data, setData] = useState(Array.from({ length: 20 }, (_, i) => ({
        time: i,
        displacement: 0,
        entropy: 10 + Math.random() * 20
    })));

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(1), { 
                    time: last.time + 1, 
                    displacement: Math.max(0, last.displacement + Math.random() * 10 - 2),
                    entropy: Math.max(0, 50 + Math.sin(last.time * 0.5) * 40)
                }];
            });
        }, 800);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="h-44 w-full mt-6 bg-black/40 border border-[#222] rounded-2xl p-4 overflow-hidden relative">
            <div className="absolute top-3 left-5 text-[8px] font-black font-mono text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Radar size={10} className="text-[#9d4edd] animate-pulse" /> Physical Reality Displacement Delta
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="deltaColor" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#9d4edd" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="displacement" stroke="#9d4edd" fill="url(#deltaColor)" strokeWidth={2} isAnimationActive={false} />
                    <Area type="monotone" dataKey="entropy" stroke="#ef4444" fill="transparent" strokeWidth={1} strokeDasharray="3 3" isAnimationActive={false} />
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
        addLog('SYSTEM', `METAVENTION_INIT: Infiltrating layer "${activeLayer.name}" topology...`);
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
                contents: `LAYER: ${activeLayer.name}\nLEVERAGE: "${activeLayer.leverage}"\nKNOWLEDGE_CONTEXT: ${activeKnowledge}\nSynthesize a strategic Metavention to bridge this digital intent into physical displacement. Return JSON.`,
                config: { responseMimeType: 'application/json', responseSchema: schema }
            }));

            const result = JSON.parse(response.text || '{}');
            setCurrentMetavention(result);
            addLog('SUCCESS', `METAVENTION_SYNC: "${result.title}" probe stabilized.`);
        } catch (e) {
            addLog('ERROR', 'METAVENTION_FAIL: Strategic collision detected.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleHandoffToTreasury = () => {
        if (!currentMetavention) return;
        pushToInvestmentQueue(currentMetavention);
        addLog('SUCCESS', `FIN_HANDOVER: "${currentMetavention.title}" pushed to Treasury sector.`);
        audio.playSuccess();
        if (confirm("Metavention pushed to Finance sector for capital allocation. Transition to Treasury?")) {
            setMode(AppMode.AUTONOMOUS_FINANCE);
        }
    };

    const handleArchive = () => {
        if (!currentMetavention) return;
        archiveIntervention({
            id: crypto.randomUUID(),
            title: currentMetavention.title,
            context: activeLayer?.name || 'GENERIC',
            logic: currentMetavention.logic,
            physicalImpact: currentMetavention.physicalImpact,
            timestamp: Date.now()
        });
        setCurrentMetavention(null);
        addLog('SUCCESS', 'ARCHIVE: Metavention protocol secured in vault.');
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-[3rem] overflow-hidden shadow-2xl relative font-sans">
            <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-10 shrink-0">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <GitMerge className="w-6 h-6 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-base font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Strategy Bridge</h1>
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Handover Control // v3.1-LATTICE</span>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black font-mono text-gray-600 uppercase tracking-widest">Lattice Density</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#9d4edd] animate-pulse shadow-[0_0_15px_#9d4edd]" />
                    </div>
                    <button onClick={() => audio.playClick()} className="p-3 bg-white/5 border border-white/10 hover:border-[#9d4edd] rounded-2xl text-gray-500 hover:text-white transition-all shadow-xl group">
                        <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden h-full">
                <div className="w-80 border-r border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-6 border-b border-[#1f1f1f] bg-white/[0.02]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Context Buffers</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
                        <div className="space-y-3">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button 
                                        key={layer.id}
                                        onClick={() => { toggleKnowledgeLayer(layer.id); audio.playClick(); }}
                                        className={`w-full p-5 rounded-2xl border transition-all duration-500 text-left relative overflow-hidden group
                                            ${isActive 
                                                ? 'bg-[#111] border-[var(--color)] shadow-2xl' 
                                                : 'bg-transparent border-transparent hover:bg-white/[0.02] opacity-40 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex items-center gap-5 relative z-10">
                                            <div className="p-3 rounded-xl bg-white/5" style={{ color: layer.color }}>
                                                {layer.id === 'BUILDER_PROTOCOL' && <Hammer size={20} />}
                                                {layer.id === 'CRYPTO_CONTEXT' && <Coins size={20} />}
                                                {layer.id === 'STRATEGIC_FUTURISM' && <Telescope size={20} />}
                                            </div>
                                            <div>
                                                <div className="text-[12px] font-black text-white uppercase font-mono tracking-widest">{layer.label}</div>
                                                <div className="text-[9px] text-gray-600 font-mono tracking-tight mt-1 leading-relaxed">{layer.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="pt-8 border-t border-white/5">
                            <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-4 px-2">
                                <Layers size={16} className="text-[#9d4edd]" /> Reality Planes
                            </div>
                            <div className="space-y-3">
                                {layers.map(layer => (
                                    <div 
                                        key={layer.id} 
                                        onClick={() => { setMetaventionsState({ activeLayerId: layer.id }); audio.playClick(); }} 
                                        className={`p-6 rounded-[2rem] border cursor-pointer transition-all duration-500 group relative overflow-hidden ${activeLayerId === layer.id ? 'bg-[#0a0a0a] border-[#9d4edd] shadow-[0_30px_60px_rgba(0,0,0,0.6)]' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                {layer.status === 'OPTIMIZED' && <CheckCircle2 size={14} className="text-[#10b981]" />}
                                                <span className={`text-[12px] font-black font-mono uppercase tracking-widest transition-colors ${activeLayerId === layer.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{layer.name}</span>
                                            </div>
                                            <div className={`text-[9px] font-black font-mono px-2.5 py-1 rounded-xl border border-white/10 uppercase ${layer.status === 'OPTIMIZED' ? 'text-[#10b981] border-[#10b981]/30' : 'text-gray-600'}`}>{layer.status}</div>
                                        </div>
                                        {activeLayerId === layer.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-3 mt-6">
                                                {layer.metrics.slice(0,2).map((m, i) => (
                                                    <div key={i} className="bg-black/60 p-4 rounded-xl border border-white/5 shadow-inner">
                                                        <div className="text-[8px] text-gray-600 uppercase font-mono tracking-widest mb-1.5">{m.label}</div>
                                                        <div className="text-[11px] text-white font-black font-mono">{m.value}</div>
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

                <div className="flex-1 bg-black flex flex-col relative overflow-hidden h-full">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none"></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-16 flex flex-col items-center min-h-0">
                        <div className="w-full max-w-4xl flex flex-col h-full">
                            <AnimatePresence mode="wait">
                                {!activeLayer ? (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center opacity-20 text-center gap-12">
                                        <div className="w-56 h-56 rounded-full border-2 border-dashed border-gray-800 flex items-center justify-center animate-[spin_25s_linear_infinite]">
                                            <Dna size={100} className="text-gray-600" />
                                        </div>
                                        <div className="space-y-4">
                                            <p className="font-mono text-2xl uppercase tracking-[0.8em] text-white">Synaptic Link Offline</p>
                                            <p className="text-[12px] text-gray-500 uppercase tracking-widest">Identify a Reality Plane to initialize strategic handover</p>
                                        </div>
                                    </motion.div>
                                ) : currentMetavention ? (
                                    <motion.div key="result" initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} className="flex-1 flex flex-col gap-10">
                                        <div className="bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] relative overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,1)] group/result">
                                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover/result:opacity-[0.08] transition-all duration-700 rotate-12"><Sparkles size={160} className="text-[#9d4edd]" /></div>
                                            <div className="flex items-center gap-6 mb-10">
                                                <div className="px-6 py-2.5 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-full shadow-[0_0_30px_rgba(157,78,221,0.2)]">
                                                    <span className="text-[11px] font-black text-[#9d4edd] uppercase font-mono tracking-[0.3em]">Protocol_Crystallized</span>
                                                </div>
                                            </div>
                                            <h3 className="text-5xl font-black text-white uppercase font-mono tracking-tighter mb-8 leading-tight">{currentMetavention.title}</h3>
                                            <p className="text-base text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#9d4edd] pl-10 mb-12 py-2 group-hover/result:text-white transition-colors">"{currentMetavention.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="bg-black/60 p-8 rounded-[2rem] border border-white/5 shadow-inner group/stat transition-all hover:border-[#10b981]/30">
                                                    <span className="text-[10px] text-gray-600 uppercase font-black block mb-5 tracking-[0.4em]">Viability Momentum</span>
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-4xl font-black text-[#10b981] font-mono tracking-tighter">{currentMetavention.viability}%</span>
                                                        <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${currentMetavention.viability}%` }} className="h-full bg-[#10b981] shadow-[0_0_15px_#10b981]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 p-8 rounded-[2rem] border border-white/5 shadow-inner group/stat transition-all hover:border-red-500/30">
                                                    <span className="text-[10px] text-gray-600 uppercase font-black block mb-5 tracking-[0.4em]">System Risk Manifold</span>
                                                    <div className="flex items-center gap-4 text-red-500">
                                                        <ShieldAlert size={22} className="animate-pulse" />
                                                        <span className="text-[12px] font-black font-mono uppercase tracking-widest truncate">{currentMetavention.riskVector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <RealWorldFeasibility strategy={currentMetavention.logic} />
                                        <PhysicalDeltaGraph active={true} />

                                        <div className="mt-auto pt-16 flex gap-6 pb-12">
                                            <button onClick={handleArchive} className="flex-1 py-6 bg-white/5 border border-white/10 hover:border-white/40 text-white text-[12px] font-black uppercase tracking-[0.4em] rounded-[2.5rem] transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95 group/save">
                                                <Save size={22} className="group-hover/save:scale-110 transition-transform" /> Secure to Sovereign Vault
                                            </button>
                                            <button onClick={handleHandoffToTreasury} className="flex-1 py-6 bg-[#10b981]/10 border border-[#10b981]/40 text-[#10b981] text-[12px] font-black uppercase tracking-[0.4em] rounded-[2.5rem] transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95 group/fin">
                                                <DollarSign size={22} className="group-hover/fin:scale-110 transition-transform" /> Commit to Treasury
                                            </button>
                                            <button onClick={generateHack} className="px-16 py-6 bg-[#9d4edd] text-black font-black uppercase text-[12px] tracking-[0.5em] rounded-[2.5rem] hover:bg-[#b06bf7] transition-all shadow-[0_40px_80px_rgba(157,78,221,0.5)] active:scale-95 group/refresh">
                                                <RefreshCw size={22} className="group-hover/refresh:rotate-90 transition-transform duration-500" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="forge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-16 min-h-0">
                                        <div className="relative group cursor-pointer" onClick={generateHack}>
                                            <div className="absolute inset-0 bg-[#9d4edd]/20 rounded-full blur-[100px] group-hover:blur-[140px] transition-all animate-pulse" />
                                            <div className="w-64 h-64 rounded-full border-2 border-dashed border-[#9d4edd]/40 flex items-center justify-center relative z-10 group-hover:rotate-180 transition-transform duration-[3s] ease-in-out">
                                                <Target size={80} className="text-[#9d4edd] group-hover:scale-125 transition-transform duration-700" />
                                            </div>
                                            <div className="absolute inset-0 border border-white/5 rounded-full animate-ping opacity-20" />
                                        </div>
                                        <div className="text-center space-y-6">
                                            <h2 className="text-3xl font-black text-white uppercase tracking-[0.6em]">Protocol Forge</h2>
                                            <p className="text-[12px] text-gray-500 font-mono max-w-lg uppercase leading-relaxed tracking-widest opacity-60">Synthesizing {activeLayer.name} metadata into autonomous physical displacement sequence L0.</p>
                                        </div>
                                        <button onClick={generateHack} disabled={isGenerating} className="px-20 py-8 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black text-sm uppercase tracking-[0.6em] rounded-[3rem] transition-all shadow-[0_50px_100px_rgba(157,78,221,0.4)] flex items-center gap-6 disabled:opacity-50 active:scale-95 group/main">
                                            {isGenerating ? <Loader2 className="w-7 h-7 animate-spin" /> : <Zap size={28} className="group-hover/main:scale-125 transition-transform" />}
                                            {isGenerating ? 'SIMULATING_VECTORS' : 'Execute Metavention'}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="w-80 border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-6 border-b border-[#1f1f1f] bg-white/[0.02] flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Historical Ledger</span>
                        <History size={18} className="text-gray-700" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {strategyLibrary.map(item => (
                            <div key={item.id} className="p-6 bg-[#0a0a0a] border border-white/5 hover:border-[#9d4edd]/40 rounded-[2rem] transition-all duration-500 cursor-default group relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-10 transition-opacity"><Zap size={40} className="text-[#9d4edd]" /></div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[12px] font-black text-gray-200 uppercase truncate pr-4 font-mono tracking-widest">{item.title}</span>
                                    <span className="text-[9px] text-gray-600 font-mono whitespace-nowrap bg-white/5 px-2.5 py-1 rounded-xl">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-mono leading-relaxed line-clamp-3 italic group-hover:text-gray-400 transition-colors">"{item.logic}"</p>
                                <div className="mt-5 flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-[#9d4edd] shadow-[0_0_10px_#9d4edd]" />
                                    <span className="text-[10px] font-black text-[#9d4edd] uppercase font-mono tracking-widest">{item.context}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-10 border-t border-[#1f1f1f] bg-black/60 shrink-0">
                        <div className="flex justify-between items-center text-[11px] font-black font-mono text-gray-600 mb-4 uppercase tracking-[0.2em]">
                            <span>Reality Displacement</span>
                            <span className="text-[#9d4edd] animate-pulse">LOCKED_STABLE</span>
                        </div>
                        <div className="h-2 w-full bg-[#111] rounded-full overflow-hidden border border-white/5 p-0.5">
                            <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] rounded-full shadow-[0_0_15px_#9d4edd]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-14 bg-[#0a0a0a] border-t border-[#1f1f1f] px-12 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-14 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                        <CheckCircle size={18} className="shadow-[0_0_15px_#10b981]" /> Handover_Stable
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-widest">
                        <Shield size={18} className="text-[#9d4edd]" /> Multi-Signature Enclave: ACTIVE
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-widest">
                        <Activity size={18} className="text-[#22d3ee]" /> Synthesis_Efficiency: 99.4%
                    </div>
                </div>
                <div className="flex items-center gap-10 shrink-0">
                    <span className="uppercase tracking-[0.6em] opacity-40 leading-none hidden lg:block text-[9px]">Strategic Handover Protocol v3.1-LATTICE // Real-Time Displacement Bridge</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-[0.3em] leading-none text-[10px]">SOVEREIGN_OS_CORE</span>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;
