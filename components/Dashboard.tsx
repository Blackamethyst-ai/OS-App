import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    generateArchitectureImage, 
    promptSelectKey, 
    fileToGenerativePart,
    liveSession
} from '../services/geminiService';
import { AspectRatio, ImageSize, AppMode } from '../types';
import { 
    Activity, Shield, Cpu, 
    Radar, Target, HardDrive, Loader2, Maximize2, RefreshCw, Sparkles, Upload, Trash2, 
    GitBranch, Globe, Server, Radio,
    Binary, Fingerprint, 
    TrendingUp, TrendingDown, DollarSign, Headphones, Users as UsersIcon,
    Flame, Signal, UserCircle, MicOff, Mic, Settings2, Zap,
    Database, LineChart as ChartIcon, Scan, Hexagon, Crown, Lock, ShieldCheck, Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import DEcosystem from './DEcosystem';
import ContextVelocityChart from './ContextVelocityChart';

const ExecutiveBanner = () => {
    const { user, voice, setVoiceState, addLog } = useAppStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
        <div className="w-full crystalline border border-white/10 rounded-3xl p-8 shadow-2xl mb-6 relative overflow-hidden group shimmer-edge">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-50" />
            
            <div className="relative z-10 flex items-center gap-10">
                <div className="flex flex-col items-center gap-3 shrink-0">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
                        <div className={cn(
                            "w-20 h-20 rounded-full border p-1 crystalline flex items-center justify-center relative transition-all duration-700 z-10",
                            voice.isActive ? "border-[#f1c21b] shadow-[0_0_25px_rgba(241,194,27,0.3)] scale-105" : "border-white/20"
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black/60 flex items-center justify-center border border-white/10">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="Operator" />
                                ) : (
                                    <UserCircle size={36} className="text-gray-600" />
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleUplink}
                        className={cn(
                            "px-4 py-1.5 rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.2em] transition-all flex items-center gap-2 border glass-action active:scale-95",
                            voice.isActive 
                                ? "bg-red-500/20 border-red-500/40 text-red-400" 
                                : "text-[#f1c21b] hover:text-white"
                        )}
                    >
                        {voice.isActive ? <MicOff size={10} /> : <Mic size={10} />}
                        {voice.isActive ? 'Sever' : 'Comms'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2 px-3 py-1 glass-action rounded-full border-white/10">
                            <ShieldCheck size={10} className="text-[#10b981]" />
                            <span className="text-[9px] font-black font-mono text-white/80 uppercase tracking-widest">Sovereign_Enclave_V1</span>
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Master Node: ALPHA_EXEC</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight font-mono leading-none">
                        D-Ecosystem Control
                    </h1>
                    <p className="text-[11px] text-gray-400 font-mono uppercase tracking-widest mt-3 max-w-2xl leading-relaxed opacity-70">
                        High-fidelity orchestration of strategic implementation protocols and autonomous agentic workflows across core infrastructure nodes.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-6 shrink-0 px-6 border-l border-white/10">
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[8px] font-black font-mono uppercase text-gray-500 tracking-widest">Neural_Sync</span>
                        <div className="flex gap-1">
                            {[1,1,1,1,0.3].map((op, i) => (
                                <div key={i} className="w-1.5 h-3 rounded-sm bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ opacity: op }} />
                            ))}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">System_Uptime</span>
                        <span className="text-lg font-black font-mono text-white">99.9997%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="crystalline border border-white/10 rounded-2xl p-5 h-32 flex flex-col justify-between transition-all hover:border-white/30 group shadow-xl shimmer-edge relative overflow-hidden">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl glass-action text-gray-400 group-hover:text-white transition-all border-white/10">
                    <Icon size={14} style={{ color }} />
                </div>
                <span className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">{title}</span>
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-mono font-black ${trend === 'up' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {detail}
            </div>
        </div>
        <div className="flex items-end justify-between relative z-10">
            <div className="text-3xl font-black font-mono text-white tracking-tighter leading-none">{value}</div>
            <div className="h-12 w-24 opacity-30 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.15} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const { 
    dashboard, setDashboardState, user, addLog, setMode, 
    voice, setVoiceState, kernel, openHoloProjector 
  } = useAppStore();

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
          
          setDashboardState({
              topologyData: [
                  { s: 'LOGIC', A: Math.round(kernel.integrity) },
                  { s: 'SPEED', A: 88 + Math.random() * 5 },
                  { s: 'SECURITY', A: 96 },
                  { s: 'YIELD', A: 84 + Math.random() * 2 },
                  { s: 'SCALE', A: 91 }
              ]
          });
      }, 5000);
      return () => clearInterval(interval);
  }, [kernel.integrity, setDashboardState]);

  const handleIdentitySync = async () => {
    setDashboardState({ isGenerating: true });
    audio.playClick();
    try {
      if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setDashboardState({ isGenerating: false }); return; }
      const prompt = `Hyper-realistic wide cinematic shot of the operator. Immersive action scene in the Metaventions Sovereign command center. He is interacting with complex floating holographic structures. Volumetric cyan and violet light illuminating his face and jacket.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_16_9, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      addLog('SUCCESS', 'IDENTITY_SYNC: Sovereign profile emerged and synchronized.');
      audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'SYNC_FAIL: Identity oracle unreachable.');
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  const handleAnchorSwap = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const file = e.target.files[0];
          const part = await fileToGenerativePart(file);
          setDashboardState({ referenceImage: part });
          addLog('SYSTEM', `ANCHOR_LOAD: New source vector [${file.name}] staged.`);
          audio.playSuccess();
      }
  };

  return (
    <div className="w-full h-full flex flex-col font-sans bg-transparent overflow-y-auto custom-scrollbar p-10">
      <div className="max-w-[2000px] mx-auto w-full space-y-8 pb-24">
          
          <ExecutiveBanner />

          <div className="grid grid-cols-12 gap-8">
              <div className="col-span-3 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                      <MetricCard title="CPU LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="STABLE" icon={Cpu} color="#f1c21b" data={cpuHist} trend="up" />
                      <MetricCard title="BANDWIDTH" value={`${telemetry.net.toFixed(1)}GB/s`} detail="MAX" icon={Radio} color="#22d3ee" data={netHist} trend="up" />
                      <MetricCard title="TRUST INDEX" value="NOMINAL" detail="VERIFIED" icon={Shield} color="#10b981" data={[{value:98},{value:99},{value:98}]} trend="up" />
                  </div>
                  <div className="h-[480px]">
                    <ContextVelocityChart onDrillDown={(p) => addLog('INFO', `TELEMETRY_FOCUS: Latency ${p.latency}ms / Throughput ${p.throughput}pps`)} />
                  </div>
              </div>

              <div className="col-span-7 h-[880px] flex flex-col">
                  <div className="flex-1 crystalline border border-white/15 rounded-[3rem] overflow-hidden relative group shadow-2xl flex flex-col shimmer-edge">
                      <div className="h-16 border-b border-white/10 flex items-center justify-between px-10 bg-white/[0.02] shrink-0 z-20">
                          <div className="flex items-center gap-4">
                              <Hexagon size={18} className="text-[#f1c21b] animate-pulse" />
                              <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Main Command Viewport</span>
                          </div>
                          <div className="flex gap-4">
                              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">SECURE_UPLINK_STABLE</span>
                          </div>
                      </div>
                      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/60">
                          {dashboard.identityUrl ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative group/hero">
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover grayscale-[20%] group-hover/hero:grayscale-0 transition-all duration-[25s]" alt="Executive" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70" />
                                  
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-all duration-700 backdrop-blur-md z-30">
                                      <div className="flex gap-6">
                                          <button 
                                              onClick={() => openHoloProjector({ id: 'identity', title: 'Sovereign Emergence', type: 'IMAGE', content: dashboard.identityUrl })}
                                              className="p-6 glass-action rounded-full text-white shadow-2xl scale-90 hover:scale-100"
                                          >
                                              <Maximize2 size={28} />
                                          </button>
                                          <button 
                                              onClick={() => { const link = document.createElement('a'); link.href = dashboard.identityUrl!; link.download = 'sovereign_sync.png'; link.click(); audio.playSuccess(); }}
                                              className="p-6 glass-action rounded-full text-white shadow-2xl scale-90 hover:scale-100"
                                          >
                                              <Download size={28} />
                                          </button>
                                      </div>
                                  </div>
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-6 opacity-10 group-hover:opacity-30 transition-all text-center">
                                  <UserCircle size={120} className="animate-pulse" />
                                  <p className="text-2xl font-mono uppercase tracking-[0.8em]">Awaiting Identity Pulse</p>
                              </div>
                          )}
                      </div>
                      <div className="h-24 bg-black/40 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-10 shrink-0 z-20">
                         <div className="flex gap-4">
                             <button onClick={() => { setMode(AppMode.PROCESS_MAP); window.location.hash = '/process'; }} className="px-6 py-3 glass-action rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white">Topology Mapper</button>
                             <button onClick={() => { setMode(AppMode.CODE_STUDIO); window.location.hash = '/code'; }} className="px-6 py-3 glass-action rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white">Logic Studio</button>
                         </div>
                         <button onClick={handleIdentitySync} disabled={dashboard.isGenerating} className="px-10 py-4 bg-[#f1c21b] text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-4 hover:bg-yellow-400 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-[0_0_30px_rgba(241,194,27,0.3)]">
                            {dashboard.isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
                            Sync Profile
                         </button>
                      </div>
                  </div>
              </div>

              <div className="col-span-2 space-y-6 flex flex-col">
                  <div className="crystalline border border-white/15 rounded-3xl p-6 h-[260px] shadow-2xl relative shimmer-edge overflow-hidden">
                      <div className="flex items-center gap-3 mb-6">
                        <ChartIcon size={16} className="text-[#f1c21b]" />
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Network Topology</span>
                      </div>
                      <div className="flex-1 h-36">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={dashboard.topologyData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="s" tick={{ fill: '#666', fontSize: 9, fontBold: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <RechartRadar dataKey="A" stroke="#f1c21b" fill="#f1c21b" fillOpacity={0.2} isAnimationActive={false} />
                            </RadarChart>
                         </ResponsiveContainer>
                      </div>
                  </div>
                  
                  <div className="crystalline border border-white/15 rounded-3xl p-6 h-[240px] shadow-2xl flex flex-col gap-4 relative shimmer-edge overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                             <Fingerprint size={16} className="text-[#f1c21b]" />
                             <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Biometric Anchor</span>
                         </div>
                         <label className="cursor-pointer p-1.5 glass-action rounded-xl transition-all border-white/10 group/label">
                            <Upload size={14} className="text-gray-500 group-hover/label:text-[#f1c21b]" />
                            <input type="file" className="hidden" onChange={handleAnchorSwap} accept="image/*" />
                         </label>
                      </div>
                      <div className="flex-1 bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden relative group/anchor">
                          {dashboard.referenceImage ? (
                                <>
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover" alt="Anchor" />
                                    <div className="absolute inset-0 glass-action opacity-0 group-hover/anchor:opacity-100 transition-all duration-500 flex items-center justify-center border-none">
                                        <label className="cursor-pointer px-6 py-3 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/30 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all shadow-2xl">Swap Key</label>
                                    </div>
                                </>
                          ) : (
                                <label className="flex flex-col items-center gap-3 cursor-pointer p-6 group/label">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 group-hover/label:border-[#f1c21b] transition-all">
                                        <Upload size={24} className="text-gray-600 group-hover/label:text-[#f1c21b]" />
                                    </div>
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Load Identity Key</span>
                                    <input type="file" className="hidden" onChange={handleAnchorSwap} />
                                </label>
                          )}
                      </div>
                  </div>

                  <div className="flex-1 crystalline border border-white/15 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative shimmer-edge overflow-hidden">
                      <div className="flex items-center gap-3 text-[#10b981]">
                          <DollarSign size={20} />
                          <span className="text-[11px] font-black uppercase tracking-widest text-white">Capital Velocity</span>
                      </div>
                      <div className="space-y-6 flex-1 flex flex-col justify-center">
                          {[
                              { label: 'Compute Units', val: 92, color: '#f1c21b' },
                              { label: 'Treasury Flow', val: 78, color: '#22d3ee' },
                              { label: 'System Reach', val: 84, color: '#10b981' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-3">
                                  <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                      <span className="font-black text-gray-300">{cat.label}</span>
                                      <span className="text-white font-bold">{cat.val}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-px shadow-inner">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          <div className="w-full h-[650px] mt-16">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;