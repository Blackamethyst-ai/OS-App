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
    Database, LineChart as ChartIcon, Scan, Hexagon, Crown, Lock
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

    // High-fidelity Audio Loop
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
                ctx.arc(cx, cy, 68 + vol * 15, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(241, 194, 27, ${0.2 + vol})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                const bars = 80;
                const step = (Math.PI * 2) / bars;
                for (let i = 0; i < bars; i++) {
                    const angle = i * step + time * 0.2;
                    const val = (freqs[i % freqs.length] / 255) * (20 + vol * 40);
                    const r1 = 74;
                    const r2 = 74 + val;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                    ctx.strokeStyle = i % 2 === 0 ? '#f1c21b' : '#7b2cbf';
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.setLineDash([2, 10]);
                ctx.arc(cx, cy, 85 + vol * 30, time, time + Math.PI * 1.5);
                ctx.strokeStyle = 'rgba(241, 194, 27, 0.4)';
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, 70, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(241, 194, 27, 0.05)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 15]);
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
            addLog('SYSTEM', 'UPLINK_TERMINATED: Neural link severed.');
            audio.playError();
        } else {
            setVoiceState({ isConnecting: true });
            try {
                if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setVoiceState({ isConnecting: false }); return; }
                await liveSession.primeAudio();
                setVoiceState({ isActive: true, isConnecting: false });
                addLog('SUCCESS', 'UPLINK_ESTABLISHED: Voice core synchronized with Architect node.');
                audio.playSuccess();
            } catch (e) {
                setVoiceState({ isConnecting: false });
                addLog('ERROR', 'UPLINK_FAIL: Check hardware permissions.');
            }
        }
    };

    return (
        <div 
            className="w-full bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-3xl rounded-[3rem] p-1 shadow-2xl mb-4 relative overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c051a]/10 to-black/5 opacity-80" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f1c21b]/20 to-transparent" />
            
            <div className="relative z-10 flex items-center gap-12 p-8">
                <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
                        <div className={cn(
                            "w-32 h-32 rounded-full border-2 p-1.5 bg-black/20 backdrop-blur-xl flex items-center justify-center relative transition-all duration-1000 z-10 shadow-2xl",
                            voice.isActive ? "border-[#f1c21b] shadow-[0_0_40px_rgba(241,194,27,0.3)] scale-105" : "border-white/5 group-hover:border-[#f1c21b]/50"
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black/40 flex items-center justify-center relative border border-white/5">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover grayscale-[5%] group-hover:grayscale-0 transition-all duration-700" alt="Architect" />
                                ) : (
                                    <UserCircle size={60} className="text-gray-800" />
                                )}
                                {voice.isConnecting && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 size={32} className="text-[#f1c21b] animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <AnimatePresence>
                            {(voice.isActive || isHovered) && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-[#f1c21b]/20 px-4 py-1 rounded-full shadow-2xl z-20"
                                >
                                    <span className="text-[8px] font-black font-mono text-[#f1c21b] uppercase tracking-[0.4em] whitespace-nowrap">Node: ARCHITECT_01</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button 
                        onClick={handleUplink}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.3em] transition-all flex items-center gap-3 border shadow-2xl active:scale-95",
                            voice.isActive 
                                ? "bg-red-500/10 border-red-500/40 text-red-500 hover:bg-red-500 hover:text-black" 
                                : "bg-[#f1c21b] border-[#f1c21b]/40 text-black hover:bg-yellow-400 shadow-[#f1c21b]/20"
                        )}
                    >
                        {voice.isActive ? <MicOff size={14} /> : <Mic size={14} />}
                        {voice.isActive ? 'Sever Link' : 'Neural Engage'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-6 mb-3">
                        <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.8em]">Metaventions Imperial Environment</span>
                        <div className="h-px flex-1 bg-[var(--border-main)]" />
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#f1c21b]/5 border border-[#f1c21b]/20 rounded-full shadow-inner">
                            <Crown size={10} className="text-[#f1c21b]" />
                            <span className="text-[9px] font-black font-mono text-[#f1c21b] uppercase tracking-widest leading-none">Protocol Sovereign</span>
                        </div>
                        <div className="h-4 w-px bg-[var(--border-main)]" />
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">Auth_Status: Secured</span>
                    </div>
                    <h1 className="text-7xl font-black text-[var(--text-primary)] uppercase tracking-[-0.04em] font-mono leading-none flex items-baseline gap-4 drop-shadow-2xl">
                        Metaventions <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-primary)] to-[#f1c21b]">AI</span>
                    </h1>
                    <p className="text-[12px] text-gray-500 font-mono uppercase tracking-[0.2em] mt-6 max-w-2xl leading-relaxed italic opacity-80">
                        Sovereign intelligence active. Directing real-time imperial futuristic telemetry and recursive intelligence feeds across all sectors.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-10 pr-6 shrink-0">
                    <div className="flex gap-12">
                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] font-black font-mono uppercase text-gray-500 tracking-widest">Lattice_Sync</span>
                            <div className="flex gap-1.5">
                                {[1,1,1,0.4,0.2].map((op, i) => (
                                    <div key={i} className="w-1.5 h-6 rounded-sm bg-[#f1c21b]/80" style={{ opacity: op }} />
                                ))}
                            </div>
                        </div>
                        <div className="h-16 w-px bg-[var(--border-main)]" />
                        <div className="flex flex-col items-end justify-center">
                            <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest mb-1 text-[#f1c21b]">Sector_ID</span>
                            <span className="text-2xl font-black font-mono text-[var(--text-primary)] tracking-tighter">0xMETAVENTIONS</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 bg-white/5 border border-[var(--border-main)] rounded-xl text-gray-500 hover:text-[var(--text-primary)] transition-all shadow-xl hover:border-[#f1c21b]/30">
                            <Settings2 size={16} />
                        </button>
                        <button className="flex items-center gap-3 px-6 py-2.5 bg-black/40 border border-[#f1c21b]/20 backdrop-blur-md rounded-2xl text-[10px] font-black font-mono uppercase tracking-widest text-[#f1c21b] hover:text-white hover:bg-[#f1c21b] hover:border-[#f1c21b] transition-all active:scale-95 shadow-2xl">
                            <Binary size={14} /> Protocols
                        </button>
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
        addLog('SYSTEM', 'INTEL_UPLINK: Fetching real-world market signals...');
        try {
            const intel = await fetchMarketIntelligence();
            useAppStore.setState(s => ({ marketData: { ...s.marketData, opportunities: intel, lastSync: Date.now() } }));
            addLog('SUCCESS', `INTEL_UPLINK: Captured ${intel.length} strategic opportunities.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'INTEL_FAIL: Outside signal interrupt.');
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
                    <span className="text-[10px] font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.2em]">Empire Intelligence</span>
                </div>
                <button onClick={syncIntel} disabled={isSyncing} className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-[var(--text-primary)] transition-all">
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
      const prompt = `Hyper-realistic close-up portrait of the man from the reference. He is portrayed as a high-echelon sovereign leader. Strictly maintain facial structure, skin tone, and thin mustache/goatee. He is wearing the premium black faux-leather mandarin collar jacket. He is standing in a minimalist obsidian executive vault with floating translucent data grids. masterpiece 8k cinematography.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_1_1, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      addLog('SUCCESS', 'IDENTITY_SYNC: Sovereign Empire biometric profile confirmed.');
      audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'SYNC_FAIL: Neural link interrupt.');
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  const handleQuickForge = async (type: 'DRIVE' | 'ARCH') => {
    addLog('SYSTEM', `FORGE_EXEC: Synthesizing ${type} logic...`);
    try {
        const result = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE', {
            prompt: type === 'DRIVE' ? "PARA Drive Refinement" : "Zero-Trust Mesh Stack",
        });
        setProcessState({ generatedWorkflow: result, activeTab: 'workflow', workflowType: type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE' });
        setMode(AppMode.PROCESS_MAP);
        audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'FORGE_FAIL: Logic collision.');
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
      <div className="relative z-10 max-w-[2400px] mx-auto p-4 space-y-6 pb-32">
          
          <SovereignBanner />

          <div className="grid grid-cols-12 gap-6 pt-1">
              {/* Telemetry Sector */}
              <div className="col-span-2 space-y-4 flex flex-col h-[880px]">
                  <div className="grid grid-cols-1 gap-2 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={Cpu} color="#f1c21b" data={cpuHistory} trend={telemetry.cpu > 50 ? 'up' : 'down'} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Radio} color="#22d3ee" data={netHistory} trend="up" />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color="#7b2cbf" data={memHistory} trend="down" />
                      <CompactMetric title="INTEGRITY" value={`${telemetry.load.toFixed(1)}`} detail="Auth_OK" icon={Shield} color="#10b981" data={loadHistory} trend="up" />
                  </div>
                  <div className="flex-1 min-h-0">
                    <RealWorldIntelFeed />
                  </div>
              </div>

              {/* MAIN EMPIRE VIEWPORT */}
              <div className="col-span-8 flex flex-col gap-4 h-[880px]">
                  <div className="flex-1 bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-3xl rounded-[4rem] relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      {/* Beveled Edge Overlay */}
                      <div className="absolute inset-0 border-[4px] border-white/5 pointer-events-none z-20 opacity-20 rounded-[4rem]" />
                      
                      <div className="flex items-center justify-between relative z-30 px-12 py-8 shrink-0">
                          <div className="flex items-center gap-4">
                              <div className="p-2 bg-[#f1c21b]/10 rounded-full border border-[#f1c21b]/20">
                                <Hexagon size={24} className="text-[#f1c21b]" />
                              </div>
                              <span className="text-[12px] font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.4em]">Sovereign Imperial Viewport</span>
                          </div>
                          <div className="flex items-center gap-3">
                               <div className="px-6 py-2 bg-black/60 backdrop-blur-3xl rounded-full border border-[#f1c21b]/30 text-[9px] font-mono text-[#f1c21b] uppercase flex items-center gap-3 shadow-[0_0_30px_rgba(241,194,27,0.2)]">
                                    <Scan size={14} className="animate-pulse" />
                                    Right-Click for Diagnostic Scan
                               </div>
                          </div>
                      </div>
                      <div 
                        ref={viewportRef}
                        onContextMenu={handleViewportContextMenu}
                        className="flex-1 flex items-center justify-center relative overflow-hidden group/viewport cursor-crosshair z-10"
                      >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(0,0,0,1)_100%)] z-10 pointer-events-none" />
                          {dashboard.identityUrl ? (
                              <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full">
                                  <img 
                                    src={dashboard.identityUrl} 
                                    className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-110" 
                                    alt="Sovereign Leader" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-70" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-8 opacity-10 group-hover/viewport:opacity-25 transition-all duration-1000 text-center select-none">
                                  <UserCircle size={180} className="text-gray-500 animate-pulse" />
                                  <p className="text-[18px] font-mono uppercase tracking-[1.2em] text-[var(--text-primary)]">Identity_Buffer_Empty</p>
                              </div>
                          )}
                      </div>
                      <div className="h-24 border-t border-[var(--border-main)] bg-black/20 backdrop-blur-3xl flex items-center justify-between px-12 shrink-0 z-30">
                         <div className="flex gap-4">
                             {[
                                { label: 'PARA Sync', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Imperial Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#7b2cbf' }
                             ].map((btn) => (
                                 <button key={btn.label} onClick={btn.action} className="px-8 py-3 bg-black/20 backdrop-blur-md border border-[var(--border-main)] hover:border-[#f1c21b]/50 rounded-2xl text-[11px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-[var(--text-primary)] transition-all flex items-center gap-4 active:scale-95 shadow-xl">
                                     <btn.icon size={16} style={{ color: btn.color }} /> {btn.label}
                                 </button>
                             ))}
                         </div>
                         <button onClick={handleIdentityGen} disabled={dashboard.isGenerating} className="px-12 py-4 bg-[#f1c21b] text-black rounded-[2rem] text-[11px] font-black font-mono uppercase tracking-[0.5em] transition-all flex items-center gap-5 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 shadow-[0_20px_50px_rgba(241,194,27,0.4)]">
                            {dashboard.isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Forge_Sovereign_DNA
                         </button>
                      </div>
                  </div>
              </div>

              {/* Technical Topology & Reference Cluster (Right) */}
              <div className="col-span-2 space-y-4 flex flex-col h-[880px]">
                  <div className="bg-gradient-to-b from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-[3rem] p-6 flex flex-col gap-3 shadow-xl group/ref relative overflow-hidden h-[340px] shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#f1c21b]/5 to-transparent pointer-events-none" />
                      <div className="flex items-center justify-between relative z-10 px-1">
                          <div className="flex items-center gap-3">
                            <ChartIcon size={16} className="text-[#f1c21b]" />
                            <span className="text-[10px] font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Neural Topology</span>
                          </div>
                          <span className="text-[8px] font-mono text-gray-700">LVL_0xV1</span>
                      </div>
                      <div className="flex-1 relative rounded-[1.5rem] bg-black/10 border border-[var(--border-main)] p-2 flex items-center justify-center shadow-inner">
                          <div className="w-full h-full opacity-80 group-hover/ref:opacity-100 transition-opacity">
                             <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={[
                                    { s: 'Logic', A: 94 }, { s: 'Ethos', A: 82 }, { s: 'Synthesis', A: 88 }, { s: 'Stability', A: 96 }, { s: 'Velocity', A: 91 }
                                ]}>
                                    <PolarGrid stroke="#444" />
                                    <PolarAngleAxis dataKey="s" tick={{ fill: '#666', fontSize: 8, fontWeight: 'bold', fontFamily: 'Fira Code' }} />
                                    <RechartRadar dataKey="A" stroke="#f1c21b" strokeWidth={2} fill="#f1c21b" fillOpacity={0.15} isAnimationActive={false} />
                                </RadarChart>
                             </ResponsiveContainer>
                          </div>
                      </div>
                      <div className="flex justify-between items-center px-1 text-[7px] font-mono text-gray-600 uppercase tracking-widest relative z-10">
                          <span>Handshake: Nominal</span>
                          <span className="text-[#10b981]">Aligned</span>
                      </div>
                  </div>
                  
                  <div className="bg-gradient-to-b from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-[2.5rem] p-4 flex flex-col gap-3 shadow-xl group/style relative overflow-hidden h-[240px] shrink-0">
                      <div className="flex items-center justify-between relative z-10 px-1">
                          <div className="flex items-center gap-3">
                             <Fingerprint size={14} className="text-[#f1c21b]" />
                             <span className="text-[10px] font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Imperial Seed</span>
                          </div>
                          <Lock size={10} className="text-gray-700" />
                      </div>
                      <div className="flex-1 relative rounded-[1.5rem] border border-[var(--border-main)] bg-black/10 flex items-center justify-center overflow-hidden shadow-2xl group/anchor">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[20%] group-hover/preview:grayscale-0 transition-all duration-1000" alt="Anchor Face" />
                                    <div className="absolute inset-0 border-[2px] border-[#f1c21b]/30 opacity-40 pointer-events-none" />
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                                        <span className="text-[8px] font-black font-mono text-[#f1c21b] uppercase tracking-widest leading-none">Biometric Anchor</span>
                                        <span className="text-[6px] font-mono text-gray-400 uppercase tracking-widest">ID_AUTH_LATTICE_OK</span>
                                    </div>
                                    <button onClick={() => setDashboardState({ referenceImage: null })} className="absolute top-2 right-2 p-2 bg-red-900/60 text-red-500 rounded-xl opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-md border border-red-500/30"><Trash2 size={14}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-3 cursor-pointer group/label p-6">
                                    <Upload size={24} className="text-gray-700 group-hover/label:text-[#f1c21b] transition-colors" />
                                    <span className="text-[9px] font-black font-mono text-gray-700 uppercase tracking-[0.3em] group-hover:text-[var(--text-primary)]">Seed Reference</span>
                                    <input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) { setDashboardState({ referenceImage: await fileToGenerativePart(e.target.files[0]) }); audio.playSuccess(); } }} />
                                </label>
                          )}
                      </div>
                  </div>

                  <div className="bg-gradient-to-br from-[var(--bg-card-top)] to-[var(--bg-card-bottom)] border border-[var(--border-main)] backdrop-blur-xl rounded-[3rem] p-8 flex flex-col gap-6 relative overflow-hidden flex-1 shadow-inner min-h-0">
                      <div className="flex items-center gap-3">
                          <DollarSign size={16} className="text-[#10b981]" />
                          <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.3em]">Capital Velocity</span>
                      </div>
                      <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center px-1">
                          {[
                              { label: 'Neural Mining', val: 94, color: '#f1c21b', usage: '+$4.2k/hr' },
                              { label: 'Imperial Staking', val: 82, color: '#22d3ee', usage: '+$1.8k/day' },
                              { label: 'Lattice Liquidity', val: 71, color: '#9d4edd', usage: '+$12k/wk' },
                              { label: 'Strategic Ops', val: 99, color: '#10b981', usage: '$420k CAP' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-2 group/pulse">
                                  <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                      <span className="group-hover/pulse:text-[var(--text-primary)] transition-colors font-black truncate max-w-[130px]">{cat.label}</span>
                                      <span className="text-gray-500 font-bold whitespace-nowrap">{cat.usage}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-[var(--border-main)] p-0.5">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          <div className="w-full h-[1100px] shrink-0 mt-60 pb-20">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;