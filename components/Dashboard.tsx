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
    // Add missing ShieldCheck import
    Database, LineChart as ChartIcon, Scan, Hexagon, Crown, Lock, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, BarChart as ReBarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import DEcosystem from './DEcosystem';

const SovereignBanner = () => {
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
                ctx.arc(cx, cy, 48 + vol * 10, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(241, 194, 27, ${0.2 + vol})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                const bars = 60;
                const step = (Math.PI * 2) / bars;
                for (let i = 0; i < bars; i++) {
                    const angle = i * step + time * 0.2;
                    const val = (freqs[i % freqs.length] / 255) * (15 + vol * 30);
                    const r1 = 54;
                    const r2 = 54 + val;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                    ctx.strokeStyle = i % 2 === 0 ? '#f1c21b' : '#7b2cbf';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, 50, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(241, 194, 27, 0.05)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 10]);
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
            addLog('SYSTEM', 'COMMMS: Terminated.');
            audio.playError();
        } else {
            setVoiceState({ isConnecting: true });
            try {
                if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setVoiceState({ isConnecting: false }); return; }
                await liveSession.primeAudio();
                setVoiceState({ isActive: true, isConnecting: false });
                addLog('SUCCESS', 'COMMMS: Established.');
                audio.playSuccess();
            } catch (e) {
                setVoiceState({ isConnecting: false });
                addLog('ERROR', 'COMMMS_FAIL: Check hardware permissions.');
            }
        }
    };

    return (
        <div 
            className="w-full bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-3xl rounded-3xl p-1 shadow-2xl mb-4 relative overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c051a]/10 to-black/5 opacity-80" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f1c21b]/20 to-transparent" />
            
            <div className="relative z-10 flex items-center gap-10 p-6">
                <div className="flex flex-col items-center gap-3 shrink-0">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
                        <div className={cn(
                            "w-24 h-24 rounded-full border-2 p-1 bg-black/20 backdrop-blur-xl flex items-center justify-center relative transition-all duration-1000 z-10 shadow-xl",
                            voice.isActive ? "border-[#f1c21b] shadow-[0_0_20px_rgba(241,194,27,0.3)] scale-105" : "border-white/5 group-hover:border-[#f1c21b]/50"
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black/40 flex items-center justify-center relative border border-white/5">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover grayscale-[5%] group-hover:grayscale-0 transition-all duration-700" alt="Architect" />
                                ) : (
                                    <UserCircle size={40} className="text-gray-800" />
                                )}
                                {voice.isConnecting && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 size={24} className="text-[#f1c21b] animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleUplink}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 border shadow-lg active:scale-95",
                            voice.isActive 
                                ? "bg-red-500/10 border-red-500/40 text-red-500" 
                                : "bg-[#f1c21b] border-[#f1c21b]/40 text-black hover:bg-yellow-400"
                        )}
                    >
                        {voice.isActive ? <MicOff size={12} /> : <Mic size={12} />}
                        {voice.isActive ? 'Sever' : 'Comms'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.4em]">Enterprise Operations Hub</span>
                        <div className="h-px flex-1 bg-[var(--border-main)]" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-[#f1c21b]/5 border border-[#f1c21b]/20 rounded-lg">
                            {/* Fix: Added missing ShieldCheck import above */}
                            <ShieldCheck size={10} className="text-[#10b981]" />
                            <span className="text-[8px] font-black font-mono text-[#f1c21b] uppercase tracking-widest leading-none">Security Verified</span>
                        </div>
                        <div className="h-3 w-px bg-[var(--border-main)]" />
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.2em]">Release: 2025.Q1_STABLE</span>
                    </div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tight font-mono leading-none flex items-baseline gap-2 drop-shadow-xl">
                        Executive Dashboard
                    </h1>
                    <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest mt-4 max-w-xl leading-relaxed italic opacity-80">
                        Enterprise intelligence orchestration. Consolidating production telemetry and autonomous agentic workflows across the global infrastructure.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-6 pr-4 shrink-0">
                    <div className="flex gap-8">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[8px] font-black font-mono uppercase text-gray-500 tracking-widest">System_Sync</span>
                            <div className="flex gap-1">
                                {[1,1,1,0.6].map((op, i) => (
                                    <div key={i} className="w-1 h-4 rounded-sm bg-[#f1c21b]/80" style={{ opacity: op }} />
                                ))}
                            </div>
                        </div>
                        <div className="h-10 w-px bg-[var(--border-main)]" />
                        <div className="flex flex-col items-end justify-center">
                            <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest mb-0.5 text-[#f1c21b]">Network_ID</span>
                            <span className="text-xl font-black font-mono text-[var(--text-primary)] tracking-tighter">0xEXEC_NODE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RealWorldIntelFeed = () => {
    const { marketData, addLog } = useAppStore();
    const [isSyncing, setIsSyncing] = useState(false);

    const syncIntel = async () => {
        setIsSyncing(true);
        audio.playClick();
        addLog('SYSTEM', 'INTEL_SYNC: Querying market signals...');
        try {
            const intel = await fetchMarketIntelligence();
            useAppStore.setState(s => ({ marketData: { ...s.marketData, opportunities: intel, lastSync: Date.now() } }));
            addLog('SUCCESS', `INTEL_SYNC: Synchronized.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'INTEL_FAIL: Data interrupt.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="bg-gradient-to-b from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 h-full relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#f1c21b]/5 rounded-lg border border-[#f1c21b]/10 text-[#f1c21b]">
                        <Globe size={14} />
                    </div>
                    <span className="text-[10px] font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.2em]">Market Intelligence</span>
                </div>
                <button onClick={syncIntel} disabled={isSyncing} className="p-1 hover:bg-white/5 rounded-lg text-gray-500 transition-all">
                    {isSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                </button>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10 max-h-[500px]">
                {marketData.opportunities.map((op, i) => (
                    <div key={i} className="p-2.5 bg-black/20 backdrop-blur-md border border-[var(--border-main)] rounded-xl hover:border-[#f1c21b]/30 transition-all group/op shadow-md">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase truncate pr-3">{op.title}</span>
                            <span className="text-[8px] font-black font-mono text-[#10b981]">{op.yield}</span>
                        </div>
                        <p className="text-[7.5px] font-mono text-gray-600 uppercase leading-relaxed line-clamp-2 italic">"{op.logic}"</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CompactMetric = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-md rounded-xl p-3 relative overflow-hidden group shadow-xl h-24 flex flex-col justify-between transition-all hover:border-white/10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30" style={{ '--accent': color } as any}></div>
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-white/5 border border-white/5 text-gray-700 group-hover:text-[var(--text-primary)] transition-colors">
                    <Icon size={12} style={{ color: color }} />
                </div>
                <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex items-center gap-1 text-[7px] font-mono text-gray-600 uppercase">
                {trend === 'up' ? <TrendingUp size={9} className="text-[#10b981]" /> : <TrendingDown size={9} className="text-[#ef4444]" />}
                {detail}
            </div>
        </div>
        <div className="flex items-end justify-between">
            <div className="text-xl font-black font-mono text-[var(--text-primary)] tracking-tighter leading-none">{value}</div>
            <div className="h-8 w-12 opacity-10 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1} fill={color} fillOpacity={0.05} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState, user, addLog, setMode, setProcessState, voice, setVoiceState, openContextMenu } = useAppStore();
  const accent = dashboard.activeThemeColor || '#f1c21b';

  const [telemetry, setTelemetry] = useState({ cpu: 14.5, net: 1.2, mem: 64, load: 88, fan: 2400 });
  const [cpuHistory, setCpuHistory] = useState<{value: number}[]>([]);
  const [netHistory, setNetHistory] = useState<{value: number}[]>([]);
  const [memHistory, setMemHistory] = useState<{value: number}[]>([]);
  const [loadHistory, setLoadHistory] = useState<{value: number}[]>([]);

  useEffect(() => {
      const interval = setInterval(() => {
          setTelemetry(prev => {
              const newCpu = Math.max(5, Math.min(95, prev.cpu + (Math.random() * 8 - 4)));
              const newNet = Math.max(0.1, Math.min(10.0, prev.net + (Math.random() * 0.6 - 0.3)));
              const newMem = Math.max(20, Math.min(90, prev.mem + (Math.random() * 2 - 1)));
              const newLoad = Math.max(70, Math.min(100, prev.load + (Math.random() * 2 - 1)));
              const newFan = Math.max(1200, Math.min(6000, prev.fan + (Math.random() * 100 - 50)));
              setCpuHistory(h => [...h, { value: newCpu }].slice(-20));
              setNetHistory(h => [...h, { value: newNet * 10 }].slice(-20));
              setMemHistory(h => [...h, { value: newMem }].slice(-20));
              setLoadHistory(h => [...h, { value: newLoad }].slice(-20));
              return { cpu: newCpu, net: newNet, mem: newMem, load: newLoad, fan: newFan };
          });
      }, 4000); 
      return () => clearInterval(interval);
  }, []);

  const handleIdentityGen = async () => {
    setDashboardState({ isGenerating: true });
    audio.playClick();
    try {
      if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setDashboardState({ isGenerating: false }); return; }
      const prompt = `Hyper-realistic close-up portrait of the man from the reference. Portrayed as a high-echelon enterprise leader. Minimalist obsidian executive office with floating data grids. 8k masterpiece.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_1_1, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      addLog('SUCCESS', 'SYNC: Profile updated.');
      audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'SYNC_FAIL: Network interrupt.');
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  const handleQuickForge = async (type: 'DRIVE' | 'ARCH') => {
    addLog('SYSTEM', `SYNC: Processing ${type} logic...`);
    try {
        const result = await generateStructuredWorkflow([], 'PRODUCTION_CORE', type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE', {
            prompt: type === 'DRIVE' ? "PARA Data Taxonomy" : "Zero-Trust Cloud Mesh",
        });
        setProcessState({ generatedWorkflow: result, activeTab: 'workflow', workflowType: type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE' });
        setMode(AppMode.PROCESS_MAP);
        audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'SYNC_FAIL: Structural collision.');
    }
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  const handleViewportContextMenu = (e: React.MouseEvent) => {
    if (!dashboard.identityUrl) return;
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, 'IMAGE', dashboard.identityUrl);
  };

  return (
    <div className="w-full font-sans relative h-full transition-colors duration-[2000ms] overflow-y-auto custom-scrollbar bg-transparent" style={{ color: 'var(--text-primary)' }}>
      <div className="relative z-10 max-w-[1800px] mx-auto p-4 space-y-4 pb-10">
          
          <SovereignBanner />

          <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 space-y-4 flex flex-col h-[700px]">
                  <div className="grid grid-cols-1 gap-2 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="Core_Sync" icon={Cpu} color="#f1c21b" data={cpuHistory} trend={telemetry.cpu > 50 ? 'up' : 'down'} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} icon={Radio} color="#22d3ee" data={netHistory} trend="up" />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} icon={Database} color="#7b2cbf" data={memHistory} trend="down" />
                      <CompactMetric title="HEALTH" value={`${telemetry.load.toFixed(1)}`} icon={Shield} color="#10b981" data={loadHistory} trend="up" />
                  </div>
                  <div className="flex-1 min-h-0">
                    <RealWorldIntelFeed />
                  </div>
              </div>

              <div className="col-span-7 flex flex-col h-[700px]">
                  <div className="flex-1 bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-3xl rounded-3xl relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      <div className="flex items-center justify-between relative z-30 px-8 py-6 shrink-0">
                          <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-[#f1c21b]/10 rounded-lg border border-[#f1c21b]/20 text-[#f1c21b]">
                                <Hexagon size={18} />
                              </div>
                              <span className="text-[10px] font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Executive Viewport</span>
                          </div>
                      </div>
                      <div 
                        onContextMenu={handleViewportContextMenu}
                        className="flex-1 flex items-center justify-center relative overflow-hidden group/viewport cursor-crosshair z-10"
                      >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(0,0,0,1)_100%)] z-10 pointer-events-none" />
                          {dashboard.identityUrl ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full">
                                  <img 
                                    src={dashboard.identityUrl} 
                                    className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-105" 
                                    alt="Sovereign Leader" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-70" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-6 opacity-10 group-hover/viewport:opacity-25 transition-all duration-1000 text-center select-none">
                                  <UserCircle size={120} className="text-gray-500 animate-pulse" />
                                  <p className="text-[14px] font-mono uppercase tracking-[0.8em] text-[var(--text-primary)]">Awaiting Identity Key</p>
                              </div>
                          )}
                      </div>
                      <div className="h-20 border-t border-[var(--border-main)] bg-black/20 backdrop-blur-3xl flex items-center justify-between px-8 shrink-0 z-30">
                         <div className="flex gap-3">
                             <button onClick={() => handleQuickForge('DRIVE')} className="px-5 py-2 bg-black/20 border border-[var(--border-main)] hover:border-[#f1c21b]/50 rounded-xl text-[9px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-[var(--text-primary)] transition-all">
                                 PARA Sync
                             </button>
                             <button onClick={() => handleQuickForge('ARCH')} className="px-5 py-2 bg-black/20 border border-[var(--border-main)] hover:border-[#f1c21b]/50 rounded-xl text-[9px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-[var(--text-primary)] transition-all">
                                 Forge Cloud
                             </button>
                         </div>
                         <button onClick={handleIdentityGen} disabled={dashboard.isGenerating} className="px-8 py-3 bg-[#f1c21b] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 shadow-xl">
                            {dashboard.isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Update Identity Profile
                         </button>
                      </div>
                  </div>
              </div>

              <div className="col-span-2 space-y-4 flex flex-col h-[700px]">
                  <div className="bg-gradient-to-b from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 shadow-xl h-[280px] shrink-0">
                      <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <ChartIcon size={14} className="text-[#f1c21b]" />
                            <span className="text-[9px] font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Topology</span>
                          </div>
                      </div>
                      <div className="flex-1 relative rounded-xl bg-black/10 border border-[var(--border-main)] p-1 flex items-center justify-center shadow-inner">
                          <div className="w-full h-full opacity-80">
                             <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={[
                                    { s: 'Logic', A: 94 }, { s: 'Ethos', A: 82 }, { s: 'Synthesis', A: 88 }, { s: 'Stability', A: 96 }, { s: 'Velocity', A: 91 }
                                ]}>
                                    <PolarGrid stroke="#333" />
                                    <PolarAngleAxis dataKey="s" tick={{ fill: '#666', fontSize: 7, fontFamily: 'Fira Code' }} />
                                    <RechartRadar dataKey="A" stroke="#f1c21b" strokeWidth={1} fill="#f1c21b" fillOpacity={0.1} isAnimationActive={false} />
                                </RadarChart>
                             </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-gradient-to-b from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 shadow-xl h-[200px] shrink-0">
                      <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 text-[#f1c21b]">
                             <Fingerprint size={12} />
                             <span className="text-[9px] font-black font-mono uppercase tracking-widest">Seed Profile</span>
                          </div>
                      </div>
                      <div className="flex-1 relative rounded-xl border border-[var(--border-main)] bg-black/10 flex items-center justify-center overflow-hidden group/anchor">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[20%]" alt="Anchor" />
                                    <button onClick={() => setDashboardState({ referenceImage: null })} className="absolute top-1 right-1 p-1 bg-red-900/60 text-red-500 rounded-lg opacity-0 group-hover/preview:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-2 cursor-pointer group/label p-4">
                                    <Upload size={18} className="text-gray-700 group-hover/label:text-[#f1c21b] transition-colors" />
                                    <span className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-widest">Upload Key</span>
                                    <input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) { setDashboardState({ referenceImage: await fileToGenerativePart(e.target.files[0]) }); audio.playSuccess(); } }} />
                                </label>
                          )}
                      </div>
                  </div>

                  <div className="bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden flex-1 shadow-inner min-h-0">
                      <div className="flex items-center gap-2 text-[#10b981]">
                          <DollarSign size={14} />
                          <span className="text-[9px] font-black uppercase tracking-widest">Capital Velocity</span>
                      </div>
                      <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center">
                          {[
                              { label: 'Mining', val: 94, color: '#f1c21b', usage: '+$4.2k/hr' },
                              { label: 'Staking', val: 82, color: '#22d3ee', usage: '+$1.8k/day' },
                              { label: 'Liquidity', val: 71, color: '#9d4edd', usage: '+$12k/wk' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-1">
                                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase">
                                      <span className="font-black">{cat.label}</span>
                                      <span className="text-gray-600">{cat.usage}</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-[var(--border-main)]">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          <div className="w-full h-[800px] shrink-0 mt-20">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;