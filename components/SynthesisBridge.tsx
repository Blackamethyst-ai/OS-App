
import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Zap, ArrowRight, Loader2, Target, GitBranch, 
    Microscope, Sparkles, Eye, History, Construction, Navigation2, 
    LineChart, ShieldAlert, Binary, Save, Radar, HardDrive, Dna, 
    BoxSelect, FlaskConical, CircleDot, AlertTriangle, ChevronRight, X,
    Layers, RefreshCw, Hammer, Coins, Telescope, Info, TrendingUp, BarChart3
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';

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
        <div className="h-40 w-full mt-6 bg-black/40 border border-[#222] rounded-2xl p-4 overflow-hidden relative">
            <div className="absolute top-2 left-4 text-[8px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                <Radar size={10} className="text-[#9d4edd] animate-pulse" /> Physical Reality Displacement Delta
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="deltaColor" x1="0" y1="0" x2="0" y2="1">
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
    const { metaventions, setMetaventionsState, addLog, archiveIntervention, knowledge, toggleKnowledgeLayer } = useAppStore();
    const { layers, activeLayerId, strategyLibrary } = metaventions;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    const activeKnowledgeLayerIds = knowledge.activeLayers || [];

    const [isGenerating, setIsGenerating] = useState(false);
    const [currentMetavention, setCurrentMetavention] = useState<any | null>(null);
    const [showLayerDetails, setShowLayerDetails] = useState(false);

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
        <div className="h-full w-full bg-[#030303] flex flex-col font-sans overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 px-2 shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-[#9d4edd]/20 rounded-lg border border-[#9d4edd]/40"><GitMerge className="w-6 h-6 text-[#9d4edd]" /></div>
                        <span className="text-[11px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.5em]">Strategy Bridge</span>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">The Metaventions Stack</h1>
                    <p className="text-[11px] text-gray-500 font-mono mt-4 uppercase tracking-[0.3em]">Mapping Digital Intent to Physical Reality Delta</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0 px-2">
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-20">
                    
                    {/* SECTION 1: CONTEXT PROTOCOLS (Knowledge Layers) */}
                    <div>
                        <div className="text-[9px] font-mono font-bold text-[#9d4edd] uppercase tracking-[0.3em] mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Binary size={12}/> Context Protocols</span>
                            <span className="text-[8px] opacity-40">{activeKnowledgeLayerIds.length} ACTIVE</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                                const isActive = activeKnowledgeLayerIds.includes(layer.id);
                                return (
                                    <button 
                                        key={layer.id}
                                        onClick={() => toggleKnowledgeLayer(layer.id)}
                                        className={`p-4 rounded-xl border transition-all duration-300 text-left relative overflow-hidden group
                                            ${isActive 
                                                ? 'bg-[#111] border-[var(--color)] shadow-[0_0_20px_rgba(0,0,0,0.4)]' 
                                                : 'bg-[#0a0a0a] border-[#222] opacity-40 hover:opacity-100'}
                                        `}
                                        style={{ '--color': layer.color } as any}
                                    >
                                        <div className="flex justify-between items-center relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded bg-white/5" style={{ color: layer.color }}>
                                                    {layer.id === 'BUILDER_PROTOCOL' && <Hammer size={14} />}
                                                    {layer.id === 'CRYPTO_CONTEXT' && <Coins size={14} />}
                                                    {layer.id === 'STRATEGIC_FUTURISM' && <Telescope size={14} />}
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-white uppercase font-mono">{layer.label}</div>
                                                    <div className="text-[8px] text-gray-500 font-mono tracking-tighter">{layer.description}</div>
                                                </div>
                                            </div>
                                            <div className={`text-[8px] font-bold px-2 py-0.5 rounded border ${isActive ? 'bg-[var(--color)] text-black border-[var(--color)]' : 'border-[#333] text-gray-600'}`}>
                                                {isActive ? 'ACTIVE' : 'IDLE'}
                                            </div>
                                        </div>
                                        {isActive && (
                                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--color)] to-transparent opacity-50" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: STRATEGY LAYERS (Deployment Targets) */}
                    <div>
                        <div className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Layers size={12}/> Strategy Layers</span>
                            <Info size={12} className="text-gray-700 cursor-help hover:text-white transition-colors" />
                        </div>
                        <div className="flex flex-col gap-2">
                            {layers.map(layer => (
                                <div 
                                    key={layer.id} 
                                    onClick={() => {
                                        setMetaventionsState({ activeLayerId: layer.id });
                                        if (activeLayerId === layer.id) setShowLayerDetails(!showLayerDetails);
                                        else setShowLayerDetails(true);
                                    }} 
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-500 group relative overflow-hidden ${activeLayerId === layer.id ? 'bg-[#111] border-[#9d4edd] shadow-2xl' : 'bg-[#0a0a0a] border-[#222] opacity-40 hover:opacity-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-white uppercase font-mono">{layer.name}</span>
                                        <div className="text-[8px] font-mono px-2 py-0.5 rounded border border-white/10 uppercase">{layer.status}</div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed line-clamp-1">{layer.leverage}</p>
                                    {activeLayerId === layer.id && (
                                        <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
                                            {layer.metrics.map((m, i) => (
                                                <div key={i} className="bg-black/40 p-2 rounded-lg border border-white/5">
                                                    <div className="text-[7px] text-gray-600 uppercase font-mono">{m.label}</div>
                                                    <div className="text-[10px] text-white font-bold">{m.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 min-h-0">
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-3xl p-8 flex flex-col h-full relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-30"></div>
                        
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <FlaskConical className="text-[#9d4edd] w-5 h-5 animate-pulse" />
                                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-widest">Protocol Synthesis</h2>
                            </div>
                            <div className="flex gap-2">
                                <AnimatePresence>
                                    {showLayerDetails && activeLayer && (
                                        <motion.button 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            onClick={() => setShowLayerDetails(false)}
                                            className="px-3 py-1.5 bg-[#111] border border-[#333] hover:border-[#9d4edd] text-[#9d4edd] text-[9px] font-black uppercase rounded-lg transition-all"
                                        >
                                            Hide Analysis
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        
                        {!activeLayer ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-20"><Dna size={64} className="mb-4" /><p className="font-mono text-xs uppercase tracking-widest">Select Logic Layer</p></div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <AnimatePresence mode="wait">
                                    {showLayerDetails ? (
                                        <motion.div 
                                            key="layer-analysis"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2"
                                        >
                                            <div className="p-6 bg-black/40 border border-[#333] rounded-2xl">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-12 h-12 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/30 flex items-center justify-center text-[#9d4edd]">
                                                        <Target size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-white uppercase font-mono">{activeLayer.name}</h3>
                                                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{activeLayer.role}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div>
                                                        <span className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-widest block mb-1">Leverage Point</span>
                                                        <p className="text-xs text-gray-300 font-mono leading-relaxed">{activeLayer.leverage}</p>
                                                    </div>
                                                    <div className="h-px bg-white/5" />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {activeLayer.metrics.map((m, i) => (
                                                            <div key={i} className="space-y-1">
                                                                <span className="text-[8px] text-gray-600 uppercase font-mono block">{m.label}</span>
                                                                <div className="flex items-end gap-2">
                                                                    <span className="text-xl font-black text-white font-mono">{m.value}</span>
                                                                    {m.trend === 'up' && <TrendingUp size={14} className="text-[#42be65] mb-1" />}
                                                                    {m.trend === 'stable' && <Activity size={14} className="text-[#22d3ee] mb-1" />}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-[#111] border border-white/5 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-2 text-[#f59e0b]">
                                                        <AlertTriangle size={12} />
                                                        <span className="text-[8px] font-black uppercase font-mono">Risk Vectors</span>
                                                    </div>
                                                    <ul className="text-[9px] text-gray-500 font-mono space-y-1.5">
                                                        <li>• Centralization decay</li>
                                                        <li>• Protocol fork collision</li>
                                                    </ul>
                                                </div>
                                                <div className="p-4 bg-[#111] border border-white/5 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-2 text-[#42be65]">
                                                        <GitBranch size={12} />
                                                        <span className="text-[8px] font-black uppercase font-mono">Integration Chain</span>
                                                    </div>
                                                    <ul className="text-[9px] text-gray-500 font-mono space-y-1.5">
                                                        <li>• Mainnet Uplink: OK</li>
                                                        <li>• P2P Swarm: STABLE</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={generateHack}
                                                className="w-full py-4 bg-white/5 border border-white/10 hover:border-[#9d4edd] text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-3 group mt-auto"
                                            >
                                                <Zap size={14} className="group-hover:text-[#9d4edd] transition-colors" />
                                                Synthesize Layer Intervention
                                            </button>
                                        </motion.div>
                                    ) : currentMetavention ? (
                                        <motion.div key="intervention" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col">
                                            <div className="flex-1 space-y-6">
                                                <div className="bg-black/60 border border-[#222] p-5 rounded-2xl relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                        <Sparkles size={48} className="text-[#9d4edd]" />
                                                    </div>
                                                    <h3 className="text-lg font-black text-[#9d4edd] uppercase font-mono mb-3">{currentMetavention.title}</h3>
                                                    <p className="text-xs text-gray-400 font-mono leading-relaxed italic mb-4">"{currentMetavention.logic}"</p>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1 bg-[#111] p-3 rounded-xl border border-white/5">
                                                            <span className="text-[8px] text-gray-600 uppercase block mb-1">Reality Viability</span>
                                                            <span className="text-lg font-black text-[#42be65] font-mono">{currentMetavention.viability}%</span>
                                                        </div>
                                                        <div className="flex-1 bg-[#111] p-3 rounded-xl border border-white/5">
                                                            <span className="text-[8px] text-gray-600 uppercase block mb-1">Critical Friction</span>
                                                            <span className="text-[10px] font-black text-[#ef4444] font-mono uppercase">{currentMetavention.riskVector}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <PhysicalDeltaGraph active={!!currentMetavention} />
                                            </div>
                                            <div className="mt-8 flex gap-3">
                                                <button onClick={handleArchive} className="flex-1 py-4 bg-[#111] border border-[#333] hover:border-white text-white text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-2"><Save size={14} /> Vault Protocol</button>
                                                <button onClick={generateHack} className="px-6 bg-[#9d4edd] text-black font-black uppercase text-[10px] rounded-2xl hover:bg-[#b06bf7] transition-all"><RefreshCw size={14} /></button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div key="idle" className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#222] rounded-3xl bg-black/20">
                                            <button onClick={generateHack} disabled={isGenerating} className="px-12 py-6 bg-[#9d4edd] text-black font-black text-xs uppercase tracking-[0.4em] rounded-2xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(157,78,221,0.4)] flex items-center gap-4">
                                                {isGenerating ? <Loader2 className="animate-spin" /> : <Radar size={18} />}
                                                {isGenerating ? 'SIMULATING...' : 'RUN METAVENTION'}
                                            </button>
                                            <p className="mt-6 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                                Active Contexts: {activeKnowledgeLayerIds.length > 0 ? activeKnowledgeLayerIds.join(', ') : 'NONE'}
                                            </p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 min-h-0">
                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl h-full flex flex-col overflow-hidden shadow-2xl">
                        <div className="h-12 bg-[#111] border-b border-[#1f1f1f] flex items-center px-6 justify-between">
                            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-widest flex items-center gap-2"><History size={14}/> Protocol Archive</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            {strategyLibrary.map(item => (
                                <div key={item.id} className="p-4 bg-black/40 border border-[#222] rounded-2xl hover:border-[#9d4edd]/50 transition-all cursor-default group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-white uppercase group-hover:text-[#9d4edd] transition-colors">{item.title}</span>
                                        <span className="text-[8px] text-gray-600 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-mono leading-relaxed line-clamp-2">"{item.logic}"</p>
                                    <div className="mt-3 text-[7px] text-[#9d4edd] bg-[#9d4edd]/10 px-1.5 py-0.5 rounded border border-[#9d4edd]/20 w-fit uppercase font-bold">{item.context}</div>
                                </div>
                            ))}
                            {strategyLibrary.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 py-20 grayscale"><History size={48} /><p className="text-[10px] font-mono mt-4">NO_PROTOCOLS_SECURED</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SynthesisBridge;
