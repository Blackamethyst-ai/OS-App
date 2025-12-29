import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    generateArchitectureImage, 
    promptSelectKey, 
    fileToGenerativePart,
    analyzeImageVision,
    generateStructuredWorkflow,
    liveSession,
    fetchMarketIntelligence,
} from '../services/geminiService';
import { AspectRatio, ImageSize, AppMode } from '../types';
import { 
    Activity, Shield, Cpu, 
    Radar, Target, HardDrive, Loader2, Maximize2, RefreshCw, Sparkles, Upload, Trash2, 
    GitBranch, Globe, Server, Radio,
    Binary, Fingerprint, 
    TrendingUp, TrendingDown, DollarSign, Headphones, Users as UsersIcon,
    Flame, Signal, UserCircle, MicOff, Mic, Settings2, Zap,
    Database, LineChart as ChartIcon, Scan, Hexagon, Crown, Lock, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, BarChart as ReBarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import DEcosystem from './DEcosystem';
import ContextVelocityChart from './ContextVelocityChart';

const ExecutiveBanner = () => {
    const { user, voice, setVoiceState, addLog } = useAppStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width / (2 * dpr);
            const cy = canvas.height / (2 * dpr);
            const time = performance.now() / 1000;

            if (voice.isActive) {
                const freqs = liveSession.getInputFrequencies() || new Uint8Array(64);
                const avg = freqs.reduce((a, b) => a + b, 0) / freqs.length;
                const vol = avg / 255;

                ctx.beginPath();
                ctx.arc(cx, cy, 38 + vol * 8, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(241, 194, 27, ${0.15 + vol})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                const bars = 48;
                const step = (Math.PI * 2) / bars;
                for (let i = 0; i < bars; i++) {
                    const angle = i * step + time * 0.15;
                    const val = (freqs[i % freqs.length] / 255) * (12 + vol * 20);
                    const r1 = 44;
                    const r2 = 44 + val;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                    ctx.strokeStyle = i % 2 === 0 ? '#f1c21b' : '#7b2cbf';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, 40, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(241, 194, 27, 0.05)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([3, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [voice.isActive]);

    const handleUplink = async () => {
        if (voice.isActive || voice.isConnecting) {
            liveSession.disconnect();
            setVoiceState({ isActive: false, isConnecting: false });
            addLog('SYSTEM', 'UPLINK_TERMINATED: Secure channel closed.');
            audio.playError();
        } else {
            setVoiceState({ isConnecting: true });
            try {
                if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setVoiceState({ isConnecting: false }); return; }
                await liveSession.primeAudio();
                setVoiceState({ isActive: true, isConnecting: false });
                addLog('SUCCESS', 'UPLINK_ESTABLISHED: Active Voice Core synchronized.');
                audio.playSuccess();
            } catch (e) {
                setVoiceState({ isConnecting: false });
                addLog('ERROR', 'UPLINK_FAIL: Audio interface unreachable.');
            }
        }
    };

    return (
        <div className="w-full bg-[var(--bg-card-top)] border border-[var(--border-main)] backdrop-blur-2xl rounded-2xl p-6 shadow-xl mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent opacity-50" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f1c21b]/30 to-transparent" />
            
            <div className="relative z-10 flex items-center gap-8">
                <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
                        <div className={cn(
                            "w-18 h-18 rounded-full border p-1 bg-black/40 backdrop-blur-xl flex items-center justify-center relative transition-all duration-700 z-10",
                            voice.isActive ? "border-[#f1c21b] shadow-lg scale-105" : "border-white/5"
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black/60 flex items-center justify-center border border-white/5">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="Operator" />
                                ) : (
                                    <UserCircle size={32} className="text-gray-700" />
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleUplink}
                        className={cn(
                            "px-3 py-1 rounded-md text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 border active:scale-95",
                            voice.isActive 
                                ? "bg-red-500/10 border-red-500/30 text-red-500" 
                                : "bg-[#f1c21b]/10 border-[#f1c21b]/30 text-[#f1c21b] hover:bg-[#f1c21b] hover:text-black"
                        )}
                    >
                        {voice.isActive ? <MicOff size={10} /> : <Mic size={10} />}
                        {voice.isActive ? 'Sever' : 'Comms'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f1c21b]/5 border border-[#f1c21b]/20 rounded-md">
                            <ShieldCheck size={9} className="text-[#10b981]" />
                            <span className="text-[8px] font-black font-mono text-[#f1c21b] uppercase tracking-widest">Enterprise Secured</span>
                        </div>
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Node: 0xEXEC_ALPHA</span>
                    </div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight font-mono leading-none">
                        The D-Ecosystem Hub
                    </h1>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2 max-w-2xl leading-relaxed italic">
                        Integrated production management. Orchestrating strategic implementation protocols and autonomous agentic workflows across core infrastructure.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-4 shrink-0 px-4">
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[7px] font-black font-mono uppercase text-gray-600 tracking-widest">Performance_Index</span>
                        <div className="flex gap-0.5">
                            {[1,1,1,1,0.4].map((op, i) => (
                                <div key={i} className="w-1 h-3 rounded-sm bg-[#10b981]" style={{ opacity: op }} />
                            ))}
                        </div>
                    </div>
                    <div className="h-px w-24 bg-[var(--border-main)]" />
                    <div className="text-right">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block">System_Uptime</span>
                        <span className="text-sm font-black font-mono text-white">99.999%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] backdrop-blur-md rounded-xl p-4 h-28 flex flex-col justify-between transition-all hover:border-white/10 group shadow-lg">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-black/20 text-gray-500 group-hover:text-white transition-all">
                    <Icon size={12} style={{ color }} />
                </div>
                <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">{title}</span>
            </div>
            <div className={`flex items-center gap-1 text-[8px] font-mono ${trend === 'up' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {detail}
            </div>
        </div>
        <div className="flex items-end justify-between">
            <div className="text-2xl font-black font-mono text-white tracking-tighter leading-none">{value}</div>
            <div className="h-10 w-16 opacity-20 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.1} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState, addLog, setMode, voice, setVoiceState, openContextMenu } = useAppStore();

  const [telemetry, setTelemetry] = useState({ cpu: 12.5, net: 0.8, mem: 58, health: 98 });
  const [cpuHist, setCpuHist] = useState(Array.from({length: 20}, () => ({ value: 10 + Math.random() * 5 })));
  const [netHist, setNetHist] = useState(Array.from({length: 20}, () => ({ value: 5 + Math.random() * 10 })));

  useEffect(() => {
      const interval = setInterval(() => {
          setTelemetry(prev => {
              const newCpu = Math.max(5, Math.min(95, prev.cpu + (Math.random() * 6 - 3)));
              setCpuHist(h => [...h, { value: newCpu }].slice(-20));
              return { ...prev, cpu: newCpu };
          });
      }, 5000);
      return () => clearInterval(interval);
  }, []);

  const handleIdentitySync = async () => {
    setDashboardState({ isGenerating: true });
    audio.playClick();
    try {
      if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setDashboardState({ isGenerating: false }); return; }
      const prompt = `Hyper-realistic close-up portrait of the operator from the reference. High-class black enterprise professional, sharp visual clarity, corporate office background.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_1_1, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      addLog('SUCCESS', 'IDENTITY_SYNC: Professional profile validated and updated.');
      audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'SYNC_FAIL: Identity oracle unreachable.');
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  return (
    <div className="w-full h-full flex flex-col font-sans bg-transparent overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-[1800px] mx-auto w-full space-y-6 pb-20">
          
          <ExecutiveBanner />

          <div className="grid grid-cols-12 gap-6">
              {/* Left Analytics Column */}
              <div className="col-span-3 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                      <MetricCard title="CPU LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="Core_Stable" icon={Cpu} color="#f1c21b" data={cpuHist} trend="up" />
                      <MetricCard title="NETWORK" value={`${telemetry.net.toFixed(1)}GB/s`} detail="Fiber_Link" icon={Radio} color="#22d3ee" data={netHist} trend="up" />
                      <MetricCard title="INFRASTRUCTURE" value="NOMINAL" detail="Verified" icon={Shield} color="#10b981" data={[{value:98},{value:99},{value:98}]} trend="up" />
                  </div>
                  <div className="h-[420px]">
                    <ContextVelocityChart onDrillDown={(p) => addLog('INFO', `TELEMETRY_FOCUS: Latency ${p.latency}ms / Throughput ${p.throughput}pps`)} />
                  </div>
              </div>

              {/* Central Operational Viewport */}
              <div className="col-span-7 h-[800px] flex flex-col">
                  <div className="flex-1 bg-[var(--bg-card-top)] border border-[var(--border-main)] backdrop-blur-3xl rounded-3xl overflow-hidden relative group shadow-2xl flex flex-col">
                      <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0 z-20">
                          <div className="flex items-center gap-3">
                              <Hexagon size={16} className="text-[#f1c21b]" />
                              <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Main Operation Viewport</span>
                          </div>
                          <div className="flex gap-4">
                              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">0xEXEC_NODE_STABLE</span>
                          </div>
                      </div>
                      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/40">
                          {dashboard.identityUrl ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-[20s]" alt="Executive" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-4 opacity-10 group-hover:opacity-30 transition-all text-center">
                                  <UserCircle size={100} className="animate-pulse" />
                                  <p className="text-lg font-mono uppercase tracking-[0.5em]">Establishing Identity</p>
                              </div>
                          )}
                      </div>
                      <div className="h-20 bg-black/30 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-8 shrink-0 z-20">
                         <div className="flex gap-3">
                             <button onClick={() => setMode(AppMode.PROCESS_MAP)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-[#f1c21b]/40 transition-all">Topology Mapper</button>
                             <button onClick={() => setMode(AppMode.CODE_STUDIO)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-[#f1c21b]/40 transition-all">Logic Studio</button>
                         </div>
                         <button onClick={handleIdentitySync} disabled={dashboard.isGenerating} className="px-8 py-3 bg-[#f1c21b] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-yellow-400 active:scale-95 disabled:opacity-50">
                            {dashboard.isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
                            Sync Profile
                         </button>
                      </div>
                  </div>
              </div>

              {/* Right Telemetry Column */}
              <div className="col-span-2 space-y-4 flex flex-col">
                  <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-xl p-4 h-[240px] shadow-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <ChartIcon size={14} className="text-[#f1c21b]" />
                        <span className="text-[9px] font-black font-mono text-white uppercase tracking-widest">D-System Topology</span>
                      </div>
                      <div className="flex-1 h-36">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[
                                { s: 'LOGIC', A: 92 }, { s: 'SPEED', A: 88 }, { s: 'SECURITY', A: 96 }, { s: 'YIELD', A: 84 }, { s: 'SCALE', A: 91 }
                            ]}>
                                <PolarGrid stroke="#222" />
                                <PolarAngleAxis dataKey="s" tick={{ fill: '#666', fontSize: 8, fontBold: 'bold' }} />
                                <RechartRadar dataKey="A" stroke="#f1c21b" fill="#f1c21b" fillOpacity={0.1} isAnimationActive={false} />
                            </RadarChart>
                         </ResponsiveContainer>
                      </div>
                  </div>
                  
                  <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-xl p-4 h-[200px] shadow-lg flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Fingerprint size={14} className="text-[#f1c21b]" />
                         <span className="text-[9px] font-black font-mono text-white uppercase tracking-widest">Biometric Anchor</span>
                      </div>
                      <div className="flex-1 bg-black/40 rounded-lg border border-white/5 flex items-center justify-center overflow-hidden relative group/anchor">
                          {dashboard.referenceImage ? (
                                <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover" alt="Anchor" />
                          ) : (
                                <label className="flex flex-col items-center gap-2 cursor-pointer p-4 group/label">
                                    <Upload size={20} className="text-gray-700 group-hover/label:text-[#f1c21b] transition-colors" />
                                    <span className="text-[8px] font-black text-gray-700 uppercase">Load Image Key</span>
                                    <input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) { setDashboardState({ referenceImage: await fileToGenerativePart(e.target.files[0]) }); audio.playSuccess(); } }} />
                                </label>
                          )}
                      </div>
                  </div>

                  <div className="flex-1 bg-gradient-to-br from-[var(--bg-card-top)] to-transparent border border-[var(--border-main)] rounded-xl p-5 flex flex-col gap-4 shadow-xl">
                      <div className="flex items-center gap-2 text-[#10b981]">
                          <DollarSign size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Asset Velocity</span>
                      </div>
                      <div className="space-y-4 flex-1 flex flex-col justify-center">
                          {[
                              { label: 'Cloud Units', val: 92, color: '#f1c21b' },
                              { label: 'Treasury Flow', val: 78, color: '#22d3ee' },
                              { label: 'System Reach', val: 84, color: '#10b981' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-2">
                                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase">
                                      <span className="font-black text-white">{cat.label}</span>
                                      <span>{cat.val}%</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full" style={{ backgroundColor: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          <div className="w-full h-[600px] mt-12">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;