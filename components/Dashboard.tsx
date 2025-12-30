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
    Database, LineChart as ChartIcon, Scan, Hexagon, Crown, Lock, ShieldCheck, Download, Bot
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import DEcosystem from './DEcosystem';
import ContextVelocityChart from './ContextVelocityChart';

const ExecutiveBanner = () => {
    const { user, voice, actions } = useAppStore();
    const { setVoiceState, addLog } = actions;
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
                ctx.arc(cx, cy, 24 + vol * 6, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(241, 194, 27, ${0.15 + vol})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                const bars = 36;
                const step = (Math.PI * 2) / bars;
                for (let i = 0; i < bars; i++) {
                    const angle = i * step + time * 0.15;
                    const val = (freqs[i % freqs.length] / 255) * (8 + vol * 15);
                    const r1 = 28;
                    const r2 = 28 + val;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                    ctx.strokeStyle = i % 2 === 0 ? '#f1c21b' : '#7b2cbf';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, 26, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([2, 4]);
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
        <div className="w-full crystalline rounded-2xl p-4 mb-4 relative overflow-hidden group">
            <div className="relative z-10 flex items-center gap-6">
                <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
                        <div className={cn(
                            "w-12 h-12 rounded-full border p-1 glass-action flex items-center justify-center relative transition-all duration-700 z-10",
                            voice.isActive ? "border-[#f1c21b] shadow-[0_0_15px_rgba(241,194,27,0.3)] scale-105" : "border-white/10"
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="Operator" />
                                ) : (
                                    <UserCircle size={20} className="text-gray-600" />
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleUplink}
                        className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-1.5 border glass-action active:scale-95",
                            voice.isActive 
                                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                                : "text-[#f1c21b] hover:text-white"
                        )}
                    >
                        {voice.isActive ? <MicOff size={8} /> : <Mic size={8} />}
                        {voice.isActive ? 'Sever' : 'Comms'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 glass-action rounded-full border-white/10">
                            <ShieldCheck size={10} className="text-[#10b981]" />
                            <span className="text-[8px] font-black font-mono text-white/90 uppercase tracking-widest">Sovereign_Enclave_V1</span>
                        </div>
                    </div>
                    <h1 className="text-xl font-black text-white uppercase tracking-tight font-mono leading-none">
                        D-Ecosystem Control
                    </h1>
                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1.5 max-w-xl leading-relaxed opacity-60">
                        High-fidelity orchestration of strategic implementation protocols and agentic workflows.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 px-6 border-l border-white/10">
                    <div className="text-right">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-0.5">System_Uptime</span>
                        <span className="text-lg font-black font-mono text-white tracking-tighter">99.99%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AgentHive = () => {
    const { agents } = useAppStore();
    return (
        <div className="flex items-center gap-4 py-2 border-t border-white/5 mt-auto">
            <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Agent_Hive</span>
                <span className="text-[7px] font-mono text-[#10b981] uppercase tracking-tighter">Active Swarm</span>
            </div>
            <div className="flex gap-2.5">
                {agents.activeAgents.map((agent, i) => (
                    <motion.div 
                        key={agent.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative group/hex"
                    >
                        <div className={cn(
                            "w-10 h-11 flex items-center justify-center transition-all duration-500",
                            agent.status === 'ACTIVE' || agent.status === 'THINKING' 
                                ? "bg-[#9d4edd]/20 border border-[#9d4edd]/40 shadow-[0_0_10px_rgba(157,78,221,0.2)]" 
                                : "bg-white/5 border border-white/10 opacity-40"
                        )} style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
                            {agent.status === 'THINKING' ? (
                                <Loader2 size={14} className="animate-spin text-[#9d4edd]" />
                            ) : (
                                <Bot size={14} className={agent.status === 'ACTIVE' ? "text-white" : "text-gray-500"} />
                            )}
                        </div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/hex:opacity-100 transition-all text-[6px] font-black font-mono text-white bg-black/60 px-1 rounded uppercase pointer-events-none">
                            {agent.name}
                        </div>
                    </motion.div>
                ))}
                {Array.from({ length: 4 - agents.activeAgents.length }).map((_, i) => (
                    <div key={i} className="w-10 h-11 bg-white/[0.02] border border-white/5 opacity-10" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />
                ))}
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="crystalline rounded-2xl p-4 h-24 flex flex-col justify-between transition-all hover:border-white/20 group relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg glass-action text-gray-500 group-hover:text-white transition-all border-white/10">
                    <Icon size={12} style={{ color }} />
                </div>
                <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">{title}</span>
            </div>
            <div className={`flex items-center gap-1 text-[8px] font-mono font-black ${trend === 'up' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {detail}
            </div>
        </div>
        <div className="flex items-end justify-between relative z-10">
            <div className="text-xl font-black font-mono text-white tracking-tighter leading-none">{value}</div>
            <div className="h-8 w-20 opacity-20 group-hover:opacity-60 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const { dashboard, user, voice, kernel, actions } = useAppStore();
  const { setDashboardState, setMode, setVoiceState, addLog, openHoloProjector } = actions;

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
      const prompt = `Hyper-realistic wide cinematic shot of the operator interacting with translucent floating holographic data lattices. Precise identity match.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_16_9, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      addLog('SUCCESS', 'IDENTITY_SYNC: Sovereign profile emerged.');
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
    <div className="w-full h-full flex flex-col font-sans bg-transparent overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-[2000px] mx-auto w-full space-y-4 pb-20">
          
          <ExecutiveBanner />

          <div className="grid grid-cols-12 gap-4">
              {/* Left Column: Metrics and Topology */}
              <div className="col-span-3 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                      <MetricCard title="CPU LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="STABLE" icon={Cpu} color="#f1c21b" data={cpuHist} trend="up" />
                      <MetricCard title="BANDWIDTH" value={`${telemetry.net.toFixed(1)}GB/s`} detail="PEAK" icon={Radio} color="#22d3ee" data={netHist} trend="up" />
                      <MetricCard title="TRUST INDEX" value="NOMINAL" detail="VERIFIED" icon={Shield} color="#10b981" data={[{value:98},{value:99},{value:98}]} trend="up" />
                  </div>
                  <div className="crystalline rounded-3xl p-6 h-56 relative overflow-hidden shadow-xl">
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <ChartIcon size={14} className="text-[#f1c21b]" />
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Network Topology</span>
                      </div>
                      <div className="flex-1 h-36 relative z-10">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={dashboard.topologyData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="s" tick={{ fill: '#666', fontSize: 8, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <RechartRadar dataKey="A" stroke="#f1c21b" fill="#f1c21b" fillOpacity={0.2} isAnimationActive={false} />
                            </RadarChart>
                         </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* Center Column: Strategic Operations Center */}
              <div className="col-span-6 flex flex-col min-h-[600px]">
                  <div className="flex-1 crystalline rounded-[2.5rem] overflow-hidden relative group flex flex-col border border-white/10 shadow-2xl">
                      <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.01] shrink-0 z-20">
                          <div className="flex items-center gap-3">
                              <Hexagon size={14} className="text-[#f1c21b] animate-pulse" />
                              <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Strategic Operations Center</span>
                          </div>
                          <div className="flex gap-4">
                              <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">STATUS // STABLE</span>
                          </div>
                      </div>
                      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/10">
                          {dashboard.identityUrl ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative group/hero">
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover grayscale-[10%] group-hover/hero:grayscale-0 transition-all duration-[30s]" alt="Executive" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                  
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-all duration-500 backdrop-blur-md z-30">
                                      <div className="flex gap-4 scale-90 group-hover/hero:scale-100 transition-transform">
                                          <button 
                                              onClick={() => openHoloProjector({ id: 'identity', title: 'Sovereign Emergence', type: 'IMAGE', content: dashboard.identityUrl })}
                                              className="p-4 glass-action rounded-full text-white"
                                          >
                                              <Maximize2 size={24} />
                                          </button>
                                          <button 
                                              onClick={() => { const link = document.createElement('a'); link.href = dashboard.identityUrl!; link.download = 'sovereign_sync.png'; link.click(); audio.playSuccess(); }}
                                              className="p-4 glass-action rounded-full text-white"
                                          >
                                              <Download size={24} />
                                          </button>
                                      </div>
                                  </div>
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-6 opacity-10 group-hover:opacity-25 transition-all text-center">
                                  <UserCircle size={80} className="animate-pulse" />
                                  <p className="text-xl font-mono uppercase tracking-[0.8em]">Awaiting Identity</p>
                              </div>
                          )}
                      </div>
                      <div className="h-20 bg-black/10 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-8 shrink-0 z-20">
                         <AgentHive />
                         <button onClick={handleIdentitySync} disabled={dashboard.isGenerating} className="px-6 py-2.5 bg-[#f1c21b] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(241,194,27,0.3)]">
                            {dashboard.isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
                            Sync
                         </button>
                      </div>
                  </div>
              </div>

              {/* Right Column: Identity, Logs, Capital */}
              <div className="col-span-3 space-y-4 flex flex-col">
                  <div className="crystalline rounded-3xl p-5 h-40 shadow-xl flex flex-col gap-3 relative overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                         <div className="flex items-center gap-3">
                             <Fingerprint size={14} className="text-[#f1c21b]" />
                             <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Biometric Anchor</span>
                         </div>
                         <label className="cursor-pointer p-1 glass-action rounded-lg transition-all border-white/10 group/label">
                            <Upload size={10} className="text-gray-500 group-hover/label:text-[#f1c21b]" />
                            <input type="file" className="hidden" onChange={handleAnchorSwap} accept="image/*" />
                         </label>
                      </div>
                      <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden relative group/anchor shadow-inner z-10">
                          {dashboard.referenceImage ? (
                                <>
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover" alt="Anchor" />
                                    <div className="absolute inset-0 glass-action opacity-0 group-hover/anchor:opacity-100 transition-all duration-500 flex items-center justify-center border-none">
                                        <label className="cursor-pointer px-4 py-2 glass-action rounded-lg border border-white/20 text-[8px] font-black uppercase tracking-widest text-white transition-all active:scale-95">Swap</label>
                                    </div>
                                </>
                          ) : (
                                <label className="flex flex-col items-center gap-2 cursor-pointer p-4 group/label opacity-40 hover:opacity-100 transition-all">
                                    <div className="p-2 rounded-lg glass-action border border-white/5 group-hover/label:border-[#f1c21b] transition-all">
                                        <Upload size={16} className="text-gray-600 group-hover/label:text-[#f1c21b]" />
                                    </div>
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Load Identity Key</span>
                                    <input type="file" className="hidden" onChange={handleAnchorSwap} />
                                </label>
                          )}
                      </div>
                  </div>

                  <div className="h-52">
                    <ContextVelocityChart onDrillDown={(p) => addLog('INFO', `TELEMETRY: Focus L0`)} />
                  </div>

                  <div className="flex-1 crystalline rounded-3xl p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden">
                      <div className="flex items-center gap-3 text-[#10b981] relative z-10">
                          <DollarSign size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Capital Velocity</span>
                      </div>
                      <div className="space-y-5 flex-1 flex flex-col justify-center relative z-10">
                          {[
                              { label: 'Compute Units', val: 92, color: '#f1c21b' },
                              { label: 'Treasury Flow', val: 78, color: '#22d3ee' },
                              { label: 'System Reach', val: 84, color: '#10b981' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-2">
                                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                      <span className="font-black text-gray-300">{cat.label}</span>
                                      <span className="text-white font-bold">{cat.val}%</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-px shadow-inner">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          <div className="w-full h-[600px] mt-8">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;