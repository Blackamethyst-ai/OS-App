import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, Skull, Crown, Activity, Radar, Crosshair, Terminal, AlertTriangle, ShieldCheck, Waves, TrendingUp, BarChart3, Radio, Loader2, GitCommit, ExternalLink, Globe, Check, Layers } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { analyzePowerDynamics, promptSelectKey } from "../services/geminiService";
import { AnalysisResult, StoredArtifact } from "../types";

const MotionDiv = motion.div as any;

// --- Sub-Components ---

const VitalityPulse = ({ value }: { value: number }) => {
    const historyData = useMemo(() => {
        return Array.from({ length: 40 }, (_, i) => ({
            time: i,
            val: Math.max(10, value + (Math.random() * 10 - 5))
        }));
    }, [value]);

    return (
        <div className="relative w-full h-[320px] flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                        <defs>
                            <linearGradient id="vitalityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#42be65" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#42be65" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#42be65" strokeWidth={1} fill="url(#vitalityGradient)" animationDuration={1500} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                    <motion.div 
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full border border-[#42be65]/40 shadow-[0_0_20px_#42be6522]"
                    />
                    <motion.div 
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-4 rounded-full bg-[#42be65]/5 border border-[#42be65]/30 flex items-center justify-center backdrop-blur-sm"
                    >
                        <div className="text-5xl font-black font-mono text-white drop-shadow-[0_0_15px_rgba(66,190,101,0.6)]">
                            {value || 0}
                        </div>
                    </motion.div>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black font-mono text-[#42be65] uppercase tracking-[0.4em] flex items-center gap-2">
                        <Radio className="w-3 h-3 animate-pulse" />
                        Vitality Index
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Spectral Integrity: NOMINAL</span>
                </div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4 h-8 opacity-40">
                <svg viewBox="0 0 400 40" className="w-full h-full">
                    <motion.path
                        d="M 0,20 Q 20,10 40,20 T 80,20 T 120,20 T 160,20 T 200,20 T 240,20 T 280,20 T 320,20 T 360,20 T 400,20"
                        fill="none"
                        stroke="#42be65"
                        strokeWidth="1"
                        animate={{ 
                            d: [
                                "M 0,20 Q 20,5 40,20 T 80,20 T 120,20 T 160,20 T 200,20 T 240,20 T 280,20 T 320,20 T 360,20 T 400,20",
                                "M 0,20 Q 20,35 40,20 T 80,20 T 120,20 T 160,20 T 200,20 T 240,20 T 280,20 T 320,20 T 360,20 T 400,20",
                                "M 0,20 Q 20,5 40,20 T 80,20 T 120,20 T 160,20 T 200,20 T 240,20 T 280,20 T 320,20 T 360,20 T 400,20"
                            ]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                </svg>
            </div>
        </div>
    );
};

const PowerCard = ({ title, icon: Icon, content, color, delay }: any) => (
  <MotionDiv
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`relative overflow-hidden border border-white/5 bg-black/40 p-5 group transition-all duration-300 shadow-lg`}
  >
    <div className={`absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-${color === 'emerald' ? 'green' : color === 'amber' ? 'yellow' : 'red'}-500/50 to-transparent`} />
    
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-1.5 rounded-sm bg-${color === 'emerald' ? 'green' : color === 'amber' ? 'yellow' : 'red'}-500/10 text-${color === 'emerald' ? 'green' : color === 'amber' ? 'yellow' : 'red'}-400 border border-${color === 'emerald' ? 'green' : color === 'amber' ? 'yellow' : 'red'}-500/20`}>
        <Icon size={16} />
      </div>
      <h3 className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-gray-400 group-hover:text-gray-300 transition-colors">
        {title}
      </h3>
    </div>
    
    <p className="text-xs text-gray-300 font-mono leading-relaxed border-l border-white/5 pl-3 ml-1 italic">
      "{content}"
    </p>
  </MotionDiv>
);

const TerminalLoader = ({ system }: { system: string }) => {
    const [log, setLog] = useState<string[]>([]);
    const logs = [
        `INIT_SEQUENCE: Analyzing "${system}"...`,
        "SCANNING: Topological Power Structure...",
        "LIVE_QUERY: Executing Google Search Grounding...",
        "DETECTING: Centralized Nodes...",
        "MEASURING: Entropy Gradient...",
        "VECTORING: Influence Protocols...",
        "DECRYPTING: Hidden Sustenance Layers...",
        "CALCULATING: Vitality Index...",
        "COMPILING: Sovereign Diagnostics..."
    ];

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < logs.length) {
                setLog(prev => [...prev, logs[i]]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-64 w-full bg-black border border-[#1f1f1f] p-4 font-mono text-[10px] text-[#42be65] overflow-hidden flex flex-col shadow-inner rounded-sm">
            <div className="flex-1 space-y-1">
                {log.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span className="opacity-40 text-[8px]">{new Date().toLocaleTimeString().split(' ')[0]}</span>
                        <span className="animate-in slide-in-from-left-2">{line}</span>
                    </div>
                ))}
                <div className="animate-pulse">_</div>
            </div>
            <div className="border-t border-[#333] pt-2 mt-2 flex justify-between text-gray-600 text-[8px] uppercase tracking-widest">
                <span>CPU: {(Math.random() * 40 + 10).toFixed(1)}%</span>
                <span>SECURE_ENCLAVE: ACTIVE</span>
            </div>
        </div>
    );
};

export default function PowerXRay({ availableSources = [] }: { availableSources?: StoredArtifact[] }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());

  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSources = () => {
    if (selectedSourceIds.size === availableSources.length) {
      setSelectedSourceIds(new Set());
    } else {
      setSelectedSourceIds(new Set(availableSources.map(s => s.id)));
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setData(null);

    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await promptSelectKey();
        setLoading(false);
        return;
      }

      // Hybrid Synthesis: Extract text from selected internal sources
      let internalContext = "";
      if (selectedSourceIds.size > 0) {
        const selectedArtifacts = availableSources.filter(s => selectedSourceIds.has(s.id));
        const contents = await Promise.all(selectedArtifacts.map(async (art) => {
          try {
            const text = await art.data.text();
            return `FILE: ${art.name}\nCONTENT: ${text.substring(0, 5000)}`;
          } catch (e) {
            return `FILE: ${art.name}\nERROR: Could not read content.`;
          }
        }));
        internalContext = contents.join('\n\n---\n\n');
      }

      const result = await analyzePowerDynamics(input, internalContext);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!data || !data.scores) return [];
    return [
        { subject: 'Centralization', A: data.scores.centralization || 0, fullMark: 100 },
        { subject: 'Entropy', A: data.scores.entropy || 0, fullMark: 100 },
        { subject: 'Vitality', A: data.scores.vitality || 0, fullMark: 100 },
        { subject: 'Opacity', A: data.scores.opacity || 0, fullMark: 100 },
        { subject: 'Adaptability', A: data.scores.adaptability || 0, fullMark: 100 },
    ];
  }, [data]);

  const getSeverityStyles = (severity: string) => {
      switch(severity?.toUpperCase()) {
          case 'CRITICAL': return 'text-red-500 border-red-500/30 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
          case 'HIGH': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
          case 'MEDIUM': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
          default: return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
      }
  };

  return (
    <div className="h-full w-full bg-[#030303] text-white flex flex-col p-6 relative overflow-hidden border border-[#1f1f1f] rounded shadow-2xl">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-2 relative z-10">
           <div>
               <h1 className="text-2xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase">
                   Power X-Ray
               </h1>
               <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-1">
                   Live Intelligence Diagnostic // <span className="text-[#22d3ee]">Hybrid Grounding</span>
               </p>
           </div>
           
           <form onSubmit={handleAnalyze} className="relative group w-96">
                <div className="relative flex items-center bg-[#0a0a0a] border border-[#333] rounded-sm p-1 focus-within:border-[#9d4edd] transition-colors shadow-inner">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="ENTER TARGET FOR LIVE SCAN..."
                    className="w-full bg-transparent px-4 py-2 text-white outline-none placeholder:text-gray-800 font-mono text-xs uppercase"
                  />
                  <button
                    disabled={loading}
                    className="px-4 py-2 bg-[#111] border-l border-[#333] text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                     {loading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                  </button>
                </div>
            </form>
      </div>

      {/* Context Toolbar */}
      <AnimatePresence>
        {availableSources.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6 relative z-10 bg-white/5 p-2 rounded border border-white/5"
          >
            <div className="flex items-center gap-2 px-2 border-r border-white/10 text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">
              <Layers size={12} className="text-[#9d4edd]" /> Internal Context
            </div>
            <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
              <button 
                onClick={toggleAllSources}
                className={`px-3 py-1 rounded text-[9px] font-mono uppercase transition-all border ${selectedSourceIds.size === availableSources.length ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-black/50 border-white/10 text-gray-500 hover:text-white'}`}
              >
                {selectedSourceIds.size === availableSources.length ? 'DESELECT ALL' : 'SELECT ALL'}
              </button>
              {availableSources.map(source => (
                <button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-[9px] font-mono uppercase transition-all border whitespace-nowrap group
                    ${selectedSourceIds.has(source.id) 
                      ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd] shadow-[0_0_10px_rgba(157,78,221,0.2)]' 
                      : 'bg-black/50 border-white/5 text-gray-600 hover:border-white/20 hover:text-gray-400'}
                  `}
                >
                  {selectedSourceIds.has(source.id) && <Check size={10} />}
                  {source.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pr-2">
        <AnimatePresence mode="wait">
            {loading ? (
                <MotionDiv 
                    key="loader"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto"
                >
                    <TerminalLoader system={input} />
                </MotionDiv>
            ) : !data ? (
                <MotionDiv 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-gray-700"
                >
                    <Radar className="w-32 h-32 mb-8 opacity-10 animate-[spin_20s_linear_infinite]" />
                    <p className="font-mono text-sm uppercase tracking-[0.5em] text-gray-700 font-black">Awaiting Target Selection</p>
                    <div className="mt-4 flex gap-4 text-[9px] font-mono text-gray-800">
                        <span>SCAN_READY</span>
                        <span>GROUNDING_STABLE</span>
                        <span>ENCLAVE_READY</span>
                    </div>
                </MotionDiv>
            ) : (
                <MotionDiv
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                    className="grid grid-cols-12 gap-8 pb-12"
                >
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <div className="flex items-center gap-3 mb-2 pb-2 border-b border-[#333] border-dashed">
                            <Activity className="w-3 h-3 text-[#22d3ee]" />
                            <h2 className="text-[10px] font-black font-mono uppercase tracking-[0.3em] text-gray-500">Live Core Dynamics</h2>
                        </div>
                        <PowerCard
                            title="Sustainer"
                            icon={Zap}
                            content={data.sustainer}
                            color="emerald"
                            delay={0}
                        />
                        <PowerCard
                            title="Extractor"
                            icon={Crown}
                            content={data.extractor}
                            color="amber"
                            delay={0.1}
                        />
                         <PowerCard
                            title="Destroyer"
                            icon={Skull}
                            content={data.destroyer}
                            color="rose"
                            delay={0.2}
                        />
                        
                        {data.groundingSources && data.groundingSources.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-[#1f1f1f]">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-3 h-3 text-[#22d3ee]" />
                                    <span className="text-[9px] font-black font-mono uppercase tracking-widest text-gray-500">Grounded Sources</span>
                                </div>
                                <div className="space-y-2">
                                    {data.groundingSources.slice(0, 5).map((source, idx) => (
                                        <a 
                                            key={idx} 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-2 rounded bg-black border border-[#222] hover:border-[#22d3ee]/50 transition-all group"
                                        >
                                            <span className="text-[9px] font-mono text-gray-400 truncate max-w-[180px] group-hover:text-white">{source.title}</span>
                                            <ExternalLink size={10} className="text-gray-600 group-hover:text-[#22d3ee]" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                        <div className="flex items-center gap-3 mb-0 pb-2 border-b border-[#333] border-dashed">
                            <Radar className="w-3 h-3 text-[#9d4edd]" />
                            <h2 className="text-[10px] font-black font-mono uppercase tracking-[0.3em] text-gray-500">Power Signature</h2>
                        </div>
                        
                        <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg relative flex flex-col overflow-hidden shadow-2xl">
                             <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                                <motion.div 
                                    animate={{ 
                                        x: [-20, 20, -20], 
                                        y: [-10, 10, -10],
                                        opacity: [0.3, 0.6, 0.3]
                                    }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,#9d4edd_0%,transparent_70%)]"
                                />
                             </div>

                             <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6">
                                 {data.scores && <VitalityPulse value={data.scores.vitality || 0} />}

                                 <div className="w-full h-72 -mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                                            <PolarGrid stroke="#222" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#555', fontSize: 9, fontFamily: 'Fira Code', fontWeight: 'bold' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <RechartRadar
                                                name="Signature"
                                                dataKey="A"
                                                stroke="#9d4edd"
                                                strokeWidth={2}
                                                fill="#9d4edd"
                                                fillOpacity={0.25}
                                                animationDuration={1500}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                 </div>
                             </div>

                             <div className="mt-auto grid grid-cols-2 gap-px bg-[#1f1f1f] text-[10px] font-mono">
                                 <div className="flex flex-col gap-1 bg-[#0a0a0a] p-4 group">
                                     <span className="text-gray-600 uppercase tracking-widest font-black flex items-center gap-2 group-hover:text-gray-400 transition-colors">
                                         <Activity size={12}/> ENTROPY
                                     </span>
                                     <span className={`text-2xl font-black ${(data.scores?.entropy || 0) > 70 ? 'text-red-500' : 'text-gray-200'}`}>
                                         {data.scores?.entropy || 0}%
                                     </span>
                                 </div>
                                 <div className="flex flex-col gap-1 bg-[#0a0a0a] p-4 group">
                                     <span className="text-gray-600 uppercase tracking-widest font-black flex items-center gap-2 group-hover:text-gray-400 transition-colors">
                                         <GitCommit size={12}/> CENTRALIZATION
                                     </span>
                                     <span className={`text-2xl font-black ${(data.scores?.centralization || 0) > 80 ? 'text-amber-500' : 'text-gray-200'}`}>
                                         {data.scores?.centralization || 0}%
                                     </span>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#333] border-dashed">
                                <ShieldCheck className="w-3 h-3 text-[#9d4edd]" />
                                <h2 className="text-[10px] font-black font-mono uppercase tracking-[0.3em] text-gray-500">Attack Vectors</h2>
                            </div>
                            
                            <div className="space-y-4">
                                {data.vectors?.map((vec, i) => (
                                    <MotionDiv 
                                        key={i} 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                        className="bg-[#050505] border border-[#222] p-4 rounded hover:border-[#9d4edd]/40 transition-all relative group shadow-lg"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="p-1.5 rounded bg-[#111] border border-[#333] text-gray-500 group-hover:text-[#9d4edd] transition-colors">
                                                <Terminal size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest font-black">Control Mechanism</span>
                                                    <span className={`px-2 py-0.5 rounded border text-[8px] font-black tracking-tighter ${getSeverityStyles(vec.severity)}`}>
                                                        {vec.severity || 'LOW'}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-gray-100 font-mono font-bold leading-relaxed">{vec.mechanism}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 border-t border-[#1a1a1a] pt-4 mt-1">
                                            <AlertTriangle className="w-3.5 h-3.5 text-red-900 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-[8px] text-red-900 font-mono uppercase font-black tracking-widest mb-1">Vector Vulnerability</div>
                                                <div className="text-[10px] text-gray-400 font-mono leading-relaxed group-hover:text-gray-300 transition-colors">{vec.vulnerability}</div>
                                            </div>
                                        </div>
                                    </MotionDiv>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 bg-gradient-to-br from-[#9d4edd]/10 to-transparent border border-[#9d4edd]/20 p-8 flex flex-col justify-center text-center relative overflow-hidden group shadow-2xl">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <Activity className="w-16 h-16 text-[#9d4edd] animate-pulse" />
                             </div>
                             <div className="absolute -left-4 -bottom-4 opacity-5 rotate-12">
                                <Zap className="w-32 h-32 text-white" />
                             </div>
                             
                             <h3 className="text-[10px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.5em] mb-4">Sovereign Insight</h3>
                             <div className="relative z-10">
                                 <p className="text-[13px] font-medium text-white italic leading-relaxed font-mono drop-shadow-lg">
                                     "{data.insight}"
                                 </p>
                             </div>
                             
                             <div className="mt-6 flex justify-center gap-8 opacity-40">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-ping" />
                                    <span className="text-[8px] font-mono uppercase tracking-widest">Logic Lock</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
                                    <span className="text-[8px] font-mono uppercase tracking-widest">Auth Valid</span>
                                </div>
                             </div>
                        </div>

                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>

      </div>

      <div className="mt-4 border-t border-[#1f1f1f] pt-4 flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest relative z-10 shrink-0">
          <div className="flex gap-6">
              <span className="flex items-center gap-2"><Activity size={10} className="text-[#42be65]" /> Grounded context feed active</span>
              <span className="flex items-center gap-2"><ShieldCheck size={10} className="text-[#22d3ee]" /> Enclave Attestation: Valid</span>
          </div>
          <div className="flex gap-4">
              <span>OS_VERSION: 4.2.1-XRAY</span>
              <span className="text-gray-500">METAVENTIONS_CORE</span>
          </div>
      </div>
    </div>
  );
}
