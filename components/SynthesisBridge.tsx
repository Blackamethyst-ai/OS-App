import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, Eye, History, Construction, Navigation2, 
    LineChart, ShieldAlert, Binary, Save, Radar, HardDrive, Dna, 
    BoxSelect, FlaskConical, CircleDot, AlertTriangle, ChevronRight, X,
    Layers, RefreshCw, Hammer, Coins, Telescope, Info, TrendingUp, BarChart3,
    CheckCircle2, Cpu, CheckCircle, Shield
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import { audio } from '../services/audioService';

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
    const { metaventions, setMetaventionsState, addLog, archiveIntervention, knowledge, toggleKnowledgeLayer, optimizeLayer } = useAppStore();
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
        <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-3xl overflow-hidden shadow-2xl relative font-sans">
            
            {/* Standardized Header (Fixed Height) */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <GitMerge className="w-5 h-5 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Strategy Bridge</h1>
                        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1.5 block">Handover Control // v3.1-LATTICE</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">Lattice Density</span>
                        <div className="w-2 h-2 rounded-full bg-[#9d4edd] animate-pulse shadow-[0_0_10px_#9d4edd]" />
                    </div>
                    <button className="p-3 bg-white/5 border border-white/10 hover:border-[#9d4edd] rounded-2xl text-gray-500 hover:text-white transition-all shadow-xl group">
                        <RefreshCw size={16} className="group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Main Body (Flex-1) */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Sidebar: Context Protocols (Fixed Width, Shrink-0) */}
                <div className="w-80 border-r border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-5 border-b border-[#1f1f1f] bg-white/[0.02]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Context Buffers</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                        {/* Knowledge Layers */}
                        <div className="space-y-2">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button 
                                        key={layer.id}
                                        onClick={() => toggleKnowledgeLayer(layer.id)}
                                        className={`w-full p-4 rounded-2xl border transition-all duration-500 text-left relative overflow-hidden group
                                            ${isActive 
                                                ? 'bg-[#111] border-[var(--color)] shadow-2xl' 
                                                : 'bg-transparent border-transparent hover:bg-white/[0.02] opacity-40 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-2 rounded-xl bg-white/5" style={{ color: layer.color }}>
                                                {layer.id === 'BUILDER_PROTOCOL' && <Hammer size={16} />}
                                                {layer.id === 'CRYPTO_CONTEXT' && <Coins size={16} />}
                                                {layer.id === 'STRATEGIC_FUTURISM' && <Telescope size={16} />}
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-black text-white uppercase font-mono tracking-widest">{layer.label}</div>
                                                <div className="text-[8px] text-gray-600 font-mono tracking-tight mt-0.5">{layer.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Strategy Layers */}
                        <div className="pt-6 border-t border-white/5">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3 px-1">
                                <Layers size={14} className="text-[#9d4edd]" /> Reality Planes
                            </div>
                            <div className="space-y-2">
                                {layers.map(layer => (
                                    <div 
                                        key={layer.id} 
                                        onClick={() => setMetaventionsState({ activeLayerId: layer.id })} 
                                        className={`p-5 rounded-[1.5rem] border cursor-pointer transition-all duration-500 group relative overflow-hidden ${activeLayerId === layer.id ? 'bg-[#0a0a0a] border-[#9d4edd] shadow-[0_20px_40px_rgba(0,0,0,0.5)]' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {layer.status === 'OPTIMIZED' && <CheckCircle2 size={12} className="text-[#10b981]" />}
                                                <span className={`text-[11px] font-black font-mono uppercase tracking-widest transition-colors ${activeLayerId === layer.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{layer.name}</span>
                                            </div>
                                            <div className={`text-[8px] font-black font-mono px-2 py-0.5 rounded-lg border border-white/10 uppercase ${layer.status === 'OPTIMIZED' ? 'text-[#10b981] border-[#10b981]/30' : 'text-gray-600'}`}>{layer.status}</div>
                                        </div>
                                        {activeLayerId === layer.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-2 mt-5">
                                                {layer.metrics.slice(0,2).map((m, i) => (
                                                    <div key={i} className="bg-black/60 p-3 rounded-xl border border-white/5 shadow-inner">
                                                        <div className="text-[7px] text-gray-600 uppercase font-mono tracking-widest mb-1">{m.label}</div>
                                                        <div className="text-[10px] text-white font-black font-mono">{m.value}</div>
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

                {/* Center Content: Forge (Flexible Space) */}
                <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none"></div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 flex flex-col items-center">
                        <div className="w-full max-w-3xl flex flex-col h-full">
                            <AnimatePresence mode="wait">
                                {!activeLayer ? (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center opacity-20 text-center gap-8">
                                        <div className="w-40 h-40 rounded-full border-2 border-dashed border-gray-800 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                                            <Dna size={80} className="text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-mono text-lg uppercase tracking-[0.6em] text-white">Synaptic Link Offline</p>
                                            <p className="text-[11px] text-gray-500 mt-3 uppercase tracking-widest">Select a reality plane from the context buffers to begin</p>
                                        </div>
                                    </motion.div>
                                ) : currentMetavention ? (
                                    <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col gap-8">
                                        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl group/result">
                                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover/result:opacity-[0.07] transition-opacity rotate-12"><Sparkles size={120} className="text-[#9d4edd]" /></div>
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="px-5 py-2 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-full shadow-[0_0_20px_rgba(157,78,221,0.1)]">
                                                    <span className="text-[10px] font-black text-[#9d4edd] uppercase font-mono tracking-[0.2em]">Protocol_Stabilized</span>
                                                </div>
                                            </div>
                                            <h3 className="text-4xl font-black text-white uppercase font-mono tracking-tighter mb-6">{currentMetavention.title}</h3>
                                            <p className="text-sm text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#9d4edd] pl-8 mb-10">"{currentMetavention.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="bg-black/60 p-6 rounded-[1.5rem] border border-white/5 shadow-inner">
                                                    <span className="text-[9px] text-gray-600 uppercase font-black block mb-4 tracking-[0.3em]">Viability Index</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-3xl font-black text-[#10b981] font-mono tracking-tighter">{currentMetavention.viability}%</span>
                                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#10b981] shadow-[0_0_10px_#10b981]" style={{ width: `${currentMetavention.viability}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 p-6 rounded-[1.5rem] border border-white/5 shadow-inner">
                                                    <span className="text-[9px] text-gray-600 uppercase font-black block mb-4 tracking-[0.3em]">System Risk Vector</span>
                                                    <div className="flex items-center gap-3 text-red-500">
                                                        <ShieldAlert size={18} />
                                                        <span className="text-[11px] font-black font-mono uppercase tracking-widest truncate">{currentMetavention.riskVector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <PhysicalDeltaGraph active={true} />

                                        <div className="mt-auto pt-12 flex gap-5">
                                            <button onClick={handleArchive} className="flex-1 py-5 bg-white/5 border border-white/10 hover:border-white/40 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
                                                <Save size={18} /> Secure to Vault
                                            </button>
                                            <button onClick={generateHack} className="px-14 py-5 bg-[#9d4edd] text-black font-black uppercase text-[11px] tracking-[0.4em] rounded-[1.5rem] hover:bg-[#b06bf7] transition-all shadow-[0_30px_60px_rgba(157,78,221,0.4)] active:scale-95">
                                                <RefreshCw size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="forge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-12">
                                        <div className="relative group cursor-pointer" onClick={generateHack}>
                                            <div className="absolute inset-0 bg-[#9d4edd]/20 rounded-full blur-[80px] group-hover:blur-[100px] transition-all animate-pulse" />
                                            <div className="w-48 h-48 rounded-full border-2 border-dashed border-[#9d4edd]/40 flex items-center justify-center relative z-10 group-hover:rotate-90 transition-transform duration-[2s]">
                                                <Target size={64} className="text-[#9d4edd] group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-5">
                                            <h2 className="text-2xl font-black text-white uppercase tracking-[0.5em]">Protocol Forge</h2>
                                            <p className="text-[11px] text-gray-500 font-mono max-w-sm uppercase leading-relaxed tracking-widest opacity-60">Bridging {activeLayer.name} metadata into autonomous physical displacement sequence.</p>
                                        </div>
                                        <button 
                                            onClick={generateHack} 
                                            disabled={isGenerating} 
                                            className="px-16 py-6 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black text-xs uppercase tracking-[0.5em] rounded-[2rem] transition-all shadow-[0_40px_80px_rgba(157,78,221,0.3)] flex items-center gap-5 disabled:opacity-50 active:scale-95 group"
                                        >
                                            {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap size={22} className="group-hover:scale-125 transition-transform" />}
                                            {isGenerating ? 'SIMULATING_VECTORS' : 'Execute Metavention'}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Protocol Archive (Fixed Width, Shrink-0) */}
                <div className="w-80 border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-5 border-b border-[#1f1f1f] bg-white/[0.02] flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Historical Ledger</span>
                        <History size={16} className="text-gray-700" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                        {strategyLibrary.map(item => (
                            <div key={item.id} className="p-5 bg-[#0a0a0a] border border-white/5 hover:border-[#9d4edd]/30 rounded-[1.5rem] transition-all duration-500 cursor-default group relative overflow-hidden shadow-lg">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity"><Zap size={32} className="text-[#9d4edd]" /></div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[11px] font-black text-gray-200 uppercase truncate pr-4 font-mono tracking-widest">{item.title}</span>
                                    <span className="text-[8px] text-gray-600 font-mono whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-lg">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-[9px] text-gray-500 font-mono leading-relaxed line-clamp-2 italic group-hover:text-gray-400 transition-colors">"{item.logic}"</p>
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] shadow-[0_0_8px_#9d4edd]" />
                                    <span className="text-[9px] font-black text-[#9d4edd] uppercase font-mono tracking-widest">{item.context}</span>
                                </div>
                            </div>
                        ))}
                        {strategyLibrary.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-5 py-24 grayscale">
                                <Archive size={48} />
                                <span className="text-[10px] font-black font-mono uppercase tracking-[0.4em]">Vault Empty</span>
                            </div>
                        )}
                    </div>
                    {/* Interior status readout */}
                    <div className="p-8 border-t border-[#1f1f1f] bg-black/60">
                        <div className="flex justify-between items-center text-[10px] font-black font-mono text-gray-600 mb-3 uppercase tracking-widest">
                            <span>Reality Displacement</span>
                            <span className="text-[#9d4edd]">Stable</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#111] rounded-full overflow-hidden border border-white/5">
                            <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_10px_#9d4edd]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector HUD Footer (The "Extended Bottom") */}
            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f1f1f] px-10 flex items-center justify-between text-[9px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-10 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-3 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                        <CheckCircle size={14} className="shadow-[0_0_10px_#10b981]" /> Sync_Stable
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest">
                        <Shield size={14} className="text-[#9d4edd]" /> Enclave_Locked
                    </div>
                    <div className="flex items-center gap-3 uppercase tracking-widest">
                        <Activity size={14} className="text-[#22d3ee]" /> Logic_Integrity: 98%
                    </div>
                </div>
                <div className="flex items-center gap-8 shrink-0">
                    <span className="uppercase tracking-[0.5em] opacity-40 leading-none hidden lg:block text-[8px]">Strategic Handover Protocol v3.1 // Real-Time Displacement</span>
                    <div className="h-4 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-widest leading-none text-[8px]">Sovereign_OS</span>
                </div>
            </div>
        </div>
    );
};

const Archive = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="5" x="2" y="3" rx="1" />
        <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
        <path d="M10 12h4" />
    </svg>
);

export default SynthesisBridge;