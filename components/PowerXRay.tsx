
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, Skull, Crown, Activity, Radar, Crosshair, Terminal, AlertTriangle, ShieldCheck } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, ResponsiveContainer } from "recharts";
import { analyzePowerDynamics, promptSelectKey } from "../services/geminiService";
import { AnalysisResult } from "../types";

const MotionDiv = motion.div as any;

// --- Sub-Components ---

const PowerCard = ({ title, icon: Icon, content, color, delay }: any) => (
  <MotionDiv
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`relative overflow-hidden border border-white/5 bg-black/40 p-5 group hover:border-${color}-500/30 transition-all duration-300`}
  >
    <div className={`absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-${color}-500/50 to-transparent`} />
    
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-1.5 rounded-sm bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
        <Icon size={16} />
      </div>
      <h3 className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-300 transition-colors">
        {title}
      </h3>
    </div>
    
    <p className="text-sm text-gray-300 font-mono leading-relaxed border-l border-white/5 pl-3 ml-1">
      {content}
    </p>
  </MotionDiv>
);

const TerminalLoader = ({ system }: { system: string }) => {
    const [log, setLog] = useState<string[]>([]);
    const logs = [
        `INIT_SEQUENCE: Analyzing "${system}"...`,
        "SCANNING: Topological Power Structure...",
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
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-64 w-full bg-black border border-[#1f1f1f] p-4 font-mono text-[10px] text-[#42be65] overflow-hidden flex flex-col">
            <div className="flex-1 space-y-1">
                {log.map((line, idx) => (
                    <div key={idx} className="flex items-center">
                        <span className="mr-2 opacity-50">{new Date().toLocaleTimeString().split(' ')[0]}</span>
                        <span className="animate-in slide-in-from-left-2">{line}</span>
                    </div>
                ))}
                <div className="animate-pulse">_</div>
            </div>
            <div className="border-t border-[#333] pt-2 mt-2 flex justify-between text-gray-600">
                <span>CPU: {(Math.random() * 40 + 10).toFixed(1)}%</span>
                <span>MEM: 1024MB</span>
            </div>
        </div>
    );
};

export default function PowerXRay() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);

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

      const result = await analyzePowerDynamics(input);
      setData(result);
    } catch (err) {
      console.error(err);
      alert("Analysis Failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data ? [
    { subject: 'Centralization', A: data.scores.centralization, fullMark: 100 },
    { subject: 'Entropy', A: data.scores.entropy, fullMark: 100 },
    { subject: 'Vitality', A: data.scores.vitality, fullMark: 100 },
    { subject: 'Opacity', A: data.scores.opacity, fullMark: 100 },
    { subject: 'Adaptability', A: data.scores.adaptability, fullMark: 100 },
  ] : [];

  return (
    <div className="h-full w-full bg-[#030303] text-white flex flex-col p-6 relative overflow-hidden border border-[#1f1f1f] rounded shadow-2xl">
      {/* Background Grid Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
           <div>
               <h1 className="text-2xl font-bold font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                   POWER X-RAY
               </h1>
               <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em]">
                   Sovereign Systems Diagnostic
               </p>
           </div>
           
           <form onSubmit={handleAnalyze} className="relative group w-96">
                <div className="relative flex items-center bg-[#0a0a0a] border border-[#333] rounded-sm p-1 focus-within:border-[#9d4edd] transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="ENTER TARGET SYSTEM..."
                    className="w-full bg-transparent px-4 py-2 text-white outline-none placeholder:text-gray-700 font-mono text-xs"
                  />
                  <button
                    disabled={loading}
                    className="px-4 py-2 bg-[#111] border-l border-[#333] text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                     <Crosshair size={14} />
                  </button>
                </div>
            </form>
      </div>

      {/* Main Stage */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        
        <AnimatePresence mode="wait">
            {loading ? (
                <MotionDiv 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
                    <Radar className="w-24 h-24 mb-6 opacity-20" />
                    <p className="font-mono text-sm uppercase tracking-widest text-gray-600">Awaiting Target Designation</p>
                </MotionDiv>
            ) : (
                <MotionDiv
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                    className="grid grid-cols-12 gap-6 pb-12"
                >
                    {/* Column 1: The Trinity (Cards) */}
                    <div className="col-span-12 lg:col-span-3 space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#333]">
                            <Activity className="w-3 h-3 text-[#9d4edd]" />
                            <h2 className="text-[10px] font-bold font-mono uppercase tracking-widest text-gray-400">Core Dynamics</h2>
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
                    </div>

                    {/* Column 2: Power Signature (Radar Chart) */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#333]">
                            <Radar className="w-3 h-3 text-[#9d4edd]" />
                            <h2 className="text-[10px] font-bold font-mono uppercase tracking-widest text-gray-400">Power Signature</h2>
                        </div>
                        
                        <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded relative p-4 flex flex-col">
                             <div className="absolute top-4 right-4 flex flex-col items-end">
                                 <div className="text-3xl font-mono font-bold text-white">{data.scores.vitality}</div>
                                 <div className="text-[9px] font-mono text-[#42be65] uppercase">Vitality Index</div>
                             </div>

                             <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                        <PolarGrid stroke="#333" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontFamily: 'Fira Code' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <RechartRadar
                                            name="Power"
                                            dataKey="A"
                                            stroke="#9d4edd"
                                            strokeWidth={2}
                                            fill="#9d4edd"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                             </div>

                             <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500 border-t border-[#333] pt-4">
                                 <div className="flex justify-between">
                                     <span>ENTROPY</span>
                                     <span className={data.scores.entropy > 70 ? 'text-red-500' : 'text-gray-300'}>{data.scores.entropy}%</span>
                                 </div>
                                 <div className="flex justify-between">
                                     <span>CENTRALIZATION</span>
                                     <span className={data.scores.centralization > 80 ? 'text-amber-500' : 'text-gray-300'}>{data.scores.centralization}%</span>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Column 3: Vectors & Insight */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                        
                        {/* Vectors */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#333]">
                                <ShieldCheck className="w-3 h-3 text-[#9d4edd]" />
                                <h2 className="text-[10px] font-bold font-mono uppercase tracking-widest text-gray-400">Attack Vectors</h2>
                            </div>
                            
                            <div className="space-y-3">
                                {data.vectors.map((vec, i) => (
                                    <div key={i} className="bg-[#050505] border border-[#333] p-3 rounded hover:border-[#9d4edd] transition-colors">
                                        <div className="flex items-start gap-2 mb-2">
                                            <Terminal className="w-3 h-3 text-gray-600 mt-0.5" />
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Control Mechanism</div>
                                                <div className="text-xs text-gray-200 font-mono">{vec.mechanism}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 border-t border-[#1f1f1f] pt-2 mt-2">
                                            <AlertTriangle className="w-3 h-3 text-red-900 mt-0.5" />
                                            <div>
                                                <div className="text-[10px] text-red-900 font-mono uppercase mb-1">Critical Vulnerability</div>
                                                <div className="text-xs text-gray-400 font-mono">{vec.vulnerability}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Insight */}
                        <div className="flex-1 bg-gradient-to-br from-[#9d4edd]/10 to-transparent border border-[#9d4edd]/20 p-6 flex flex-col justify-center text-center relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-20">
                                 <Activity className="w-12 h-12 text-[#9d4edd]" />
                             </div>
                             <h3 className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-widest mb-3">Sovereign Insight</h3>
                             <p className="text-sm font-light text-white italic leading-relaxed">
                                 "{data.insight}"
                             </p>
                        </div>

                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}
