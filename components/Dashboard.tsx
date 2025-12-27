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
    Database, LineChart as ChartIcon
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

                // Orbit 1: Inner Core Pulse
                ctx.beginPath();
                ctx.arc(cx, cy, 68 + vol * 15, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(157, 78, 221, ${0.2 + vol})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Orbit 2: Frequency Jitter Spikes
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
                    ctx.strokeStyle = i % 2 === 0 ? '#9d4edd' : '#00f2ff';
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }

                // Orbit 3: Outer Geometric Rings
                ctx.beginPath();
                ctx.setLineDash([2, 10]);
                ctx.arc(cx, cy, 85 + vol * 30, time, time + Math.PI * 1.5);
                ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                // Idle Aesthetic
                ctx.beginPath();
                ctx.arc(cx, cy, 70, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
            className="w-full bg-[#050505] border border-white/10 rounded-[3rem] p-1 shadow-[0_0_100px_rgba(0,0,0,1)] mb-4 relative overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#120a1a] to-black opacity-60" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/40 to-transparent" />
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
            
            <div className="relative z-10 flex items-center gap-12 p-8">
                
                {/* Node Identity Segment */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
                        
                        <div className={cn(
                            "w-32 h-32 rounded-full border-2 p-1.5 bg-[#080808] flex items-center justify-center relative transition-all duration-1000 z-10",
                            voice.isActive ? "border-[#00f2ff] shadow-[0_0_40px_rgba(0,242,255,0.2)] scale-105" : "border-white/10 group-hover:border-[#9d4edd]/50"
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center relative">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700" alt="Architect" />
                                ) : (
                                    <UserCircle size={60} className="text-gray-800" />
                                )}
                                {voice.isConnecting && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 size={32} className="text-[#9d4edd] animate-spin" />
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
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 px-4 py-1 rounded-full shadow-2xl z-20"
                                >
                                    <span className="text-[8px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.4em] whitespace-nowrap">Node: ARCHITECT_01</span>
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
                                : "bg-[#9d4edd] border-[#9d4edd]/40 text-black hover:bg-[#b06bf7] shadow-[#9d4edd]/20"
                        )}
                    >
                        {voice.isActive ? <MicOff size={14} /> : <Mic size={14} />}
                        {voice.isActive ? 'Sever Link' : 'Neural Engage'}
                    </button>
                </div>

                {/* Branding Core Segment */}
                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-6 mb-3">
                        <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.8em]">Sovereign Architecture Environment</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            <span className="text-[9px] font-black font-mono text-[#10b981] uppercase tracking-widest">System Optimal</span>
                        </div>
                        <div className="h-4 w-px bg-white/5" />
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">Auth_Status: Secured</span>
                    </div>

                    <h1 className="text-7xl font-black text-white uppercase tracking-[-0.04em] font-mono leading-none flex items-baseline gap-4">
                        Metaventions <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600">AI</span>
                    </h1>

                    <p className="text-[12px] text-gray-400 font-mono uppercase tracking-[0.2em] mt-6 max-w-2xl leading-relaxed italic opacity-60">
                        Topological control active. Directing real-time telemetry, strategic asset generation, and recursive intelligence feeds across all authorized neural sectors.
                    </p>
                </div>

                {/* Technical Metadata Readout */}
                <div className="flex flex-col items-end gap-10 pr-6 shrink-0">
                    <div className="flex gap-12">
                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] font-black font-mono uppercase text-gray-700 tracking-widest">Lattice_Sync</span>
                            <div className="flex gap-1.5">
                                {[1,1,1,0.4,0.2].map((op, i) => (
                                    <div key={i} className="w-1.5 h-6 rounded-sm bg-[#9d4edd]/80" style={{ opacity: op }} />
                                ))}
                            </div>
                        </div>
                        <div className="h-16 w-px bg-white/10" />
                        <div className="flex flex-col items-end justify-center">
                            <span className="text-[9px] font-black font-mono text-gray-700 uppercase tracking-widest mb-1">Sector_ID</span>
                            <span className="text-2xl font-black font-mono text-white tracking-tighter">0xAF-CENTRAL</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white transition-all shadow-xl">
                            <Settings2 size={16} />
                        </button>
                        <button className="flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black font-mono uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/30 transition-all active:scale-95">
                            <Binary size={14} className="text-[#9d4edd]" /> Protocols
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
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 h-full relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#f59e0b]/5 rounded-lg border border-[#f59e0b]/10 text-[#f59e0b]">
                        <Globe size={14} />
                    </div>
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.2em]">Real-World Intel</span>
                </div>
                <button onClick={syncIntel} disabled={isSyncing} className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
                    {isSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10 max-h-[500px]">
                {marketData.opportunities.map((op, i) => (
                    <div key={i} className="p-2.5 bg-[#0a0a0a] border border-white/5 rounded-xl hover:border-[#f59e0b]/30 transition-all group/op">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-black text-gray-300 uppercase truncate pr-3">{op.title}</span>
                            <span className="text-[8px] font-black font-mono text-[#10b981]">{op.yield}</span>
                        </div>
                        <p className="text-[7.5px] font-mono text-gray-600 uppercase leading-relaxed line-clamp-2">"{op.logic}"</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NeuralResonance = () => {
    const data = [
        { name: 'Vision', val: 74 },
        { name: 'Code', val: 88 },
        { name: 'Finance', val: 92 },
        { name: 'Hardware', val: 56 },
        { name: 'Voice', val: 81 },
    ];

    return (
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 h-full relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#22d3ee]/5 rounded-lg border border-[#22d3ee]/10 text-[#22d3ee]">
                        <Signal size={14} />
                    </div>
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.2em]">Resonance Map</span>
                </div>
            </div>
            <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#444', fontSize: 8, fontFamily: 'Fira Code' }} width={60} />
                        <Bar dataKey="val" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={8} background={{ fill: '#111', radius: 4 }} />
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const SwarmSynchrony = () => {
    const data = [
        { subject: 'Puck', A: 85, fullMark: 100 },
        { subject: 'Charon', A: 72, fullMark: 100 },
        { subject: 'Fenrir', A: 90, fullMark: 100 },
        { subject: 'Aris', A: 65, fullMark: 100 },
    ];

    const synergy = Math.round(data.reduce((acc, curr) => acc + curr.A, 0) / data.length);

    return (
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 h-full relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#9d4edd]/5 rounded-lg border border-[#9d4edd]/10 text-[#9d4edd]">
                        <UsersIcon size={14} />
                    </div>
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.2em]">Swarm Synchrony</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-[9px] font-black font-mono text-[#10b981]">{synergy}%</span>
                </div>
            </div>
            <div className="flex-1 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={data}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 8, fontFamily: 'Fira Code' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartRadar name="Synergy" dataKey="A" stroke="#9d4edd" fill="#9d4edd" fillOpacity={0.15} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const CompactMetric = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="bg-[#050505] border border-white/5 rounded-xl p-3 relative overflow-hidden group shadow-xl h-24 flex flex-col justify-between transition-all hover:border-white/10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-15" style={{ '--accent': color } as any}></div>
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-white/5 border border-white/5 text-gray-700 group-hover:text-white transition-colors">
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
            <div className="text-xl font-black font-mono text-white tracking-tighter leading-none">{value}</div>
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
  const { dashboard, setDashboardState, user, addLog, setMode, setProcessState, voice, setVoiceState } = useAppStore();
  const accent = dashboard.activeThemeColor || '#9d4edd';

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
      const prompt = `Hyper-realistic extreme wide shot 8k cinematic production still of an advanced volumetric 3D command interface in a dark high-tech environment, sophisticated futuristic industrial UI design, anamorphic lens flares, realistic data stream physics, deep obsidian surfaces, max resolution.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_16_9, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      addLog('SUCCESS', 'LATTICE_SYNC: Identity synchronized with high-fidelity cinematic buffers.');
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
        setProcessState({ generatedWorkflow: result, activeTab: type === 'DRIVE' ? 'workflow' : 'workflow', workflowType: type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE' });
        setMode(AppMode.PROCESS_MAP);
        audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'FORGE_FAIL: Logic collision.');
    }
  };

  return (
    <div className="w-full text-gray-200 font-sans relative h-full transition-colors duration-[2000ms] overflow-y-auto custom-scrollbar bg-[#020202]">
      <div className="relative z-10 max-w-[2000px] mx-auto p-4 space-y-6 pb-32">
          
          <SovereignBanner />

          <div className="grid grid-cols-12 gap-4 pt-1">
              {/* Telemetry & Intel */}
              <div className="col-span-2 space-y-4 flex flex-col h-[880px]">
                  <div className="grid grid-cols-1 gap-2 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={Cpu} color={accent} data={cpuHistory} trend={telemetry.cpu > 50 ? 'up' : 'down'} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Radio} color={accent} data={netHistory} trend="up" />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color={accent} data={memHistory} trend="down" />
                      <CompactMetric title="INTEGRITY" value={`${telemetry.load.toFixed(1)}`} detail="Auth_OK" icon={Shield} color="#10b981" data={loadHistory} trend="up" />
                  </div>
                  <div className="flex-1 min-h-0">
                    <RealWorldIntelFeed />
                  </div>
              </div>

              {/* Hub Visualizer */}
              <div className="col-span-7 flex flex-col gap-4 h-[880px]">
                  <div className="flex-1 bg-[#020202] border border-white/5 rounded-[3rem] relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      <div className="flex-1 flex items-center justify-between relative z-10 px-8 py-4 shrink-0">
                          <div className="flex items-center gap-4">
                              <ChartIcon size={20} className="text-[#9d4edd]" />
                              <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Neural Topology Projection</span>
                          </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.9)_100%)] z-10 pointer-events-none" />
                          {dashboard.identityUrl ? (
                              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-105" alt="Hub Banner" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-4 opacity-10 group-hover/viewport:opacity-25 transition-all duration-1000 text-center select-none">
                                  <Radar size={48} className="text-gray-500 animate-[spin_60s_linear_infinite]" />
                                  <p className="text-[10px] font-mono uppercase tracking-[0.6em] text-white">Hub_Standby</p>
                              </div>
                          )}
                      </div>
                      <div className="h-16 border-t border-white/5 bg-[#050505] flex items-center justify-between px-8 shrink-0">
                         <div className="flex gap-3">
                             {[
                                { label: 'Sync', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#9d4edd' }
                             ].map((btn) => (
                                 <button key={btn.label} onClick={btn.action} className="px-5 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-[9px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-3 active:scale-95 shadow-lg">
                                     <btn.icon size={11} style={{ color: btn.color }} /> {btn.label}
                                 </button>
                             ))}
                         </div>
                         <button onClick={handleIdentityGen} disabled={dashboard.isGenerating} className="px-7 py-2 bg-[#9d4edd] text-black rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.4em] transition-all flex items-center gap-3 hover:bg-[#b06bf7] active:scale-95 disabled:opacity-50 shadow-[0_10px_30px_rgba(157,78,221,0.3)]">
                            {dashboard.isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Forge_Identity
                         </button>
                      </div>
                  </div>
              </div>

              {/* Metric Cluster */}
              <div className="col-span-3 space-y-4 flex flex-col h-[880px]">
                  <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-4 flex flex-col gap-3 shadow-xl group/ref relative overflow-hidden h-[180px] shrink-0">
                      <div className="flex items-center gap-3 relative z-10 px-1">
                          <Target size={14} className="text-[#9d4edd]" />
                          <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Style Matrix</span>
                      </div>
                      <div className="flex-1 relative rounded-[1.5rem] border border-dashed border-white/5 bg-black flex items-center justify-center overflow-hidden">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[60%] group-hover/preview:grayscale-0 transition-all duration-1000" alt="Ref" />
                                    <button onClick={() => setDashboardState({ referenceImage: null })} className="absolute top-2 right-2 p-2 bg-red-900/40 text-red-500 rounded-xl opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-md border border-red-500/30"><Trash2 size={14}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-2 cursor-pointer group/label p-6">
                                    <Upload size={20} className="text-gray-700 group-hover/label:text-[#9d4edd] transition-colors" />
                                    <span className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-[0.3em] group-hover:text-white">Seed Reference</span>
                                    <input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) { setDashboardState({ referenceImage: await fileToGenerativePart(e.target.files[0]) }); audio.playSuccess(); } }} />
                                </label>
                          )}
                      </div>
                  </div>
                  <div className="flex-1 min-h-0">
                      <NeuralResonance />
                  </div>
                  <div className="flex-1 min-h-0">
                      <SwarmSynchrony />
                  </div>
                  <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-6 relative overflow-hidden h-[240px] shadow-inner shrink-0">
                      <div className="flex items-center gap-3">
                          <DollarSign size={16} className="text-[#22d3ee]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Capital Pulse</span>
                      </div>
                      <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center px-2">
                          {[
                              { label: 'Compute Arb', val: 94, color: '#9d4edd', usage: '+$1.2k/hr' },
                              { label: 'Network Stake', val: 82, color: '#22d3ee', usage: '+$420/day' },
                              { label: 'Asset Liquidity', val: 71, color: '#f59e0b', usage: '+$8.2k/wk' },
                              { label: 'Strategic Reserves', val: 99, color: '#10b981', usage: '$120k CAP' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-1.5 group/pulse">
                                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                      <span className="group-hover/pulse:text-white transition-colors font-black truncate max-w-[120px]">{cat.label}</span>
                                      <span className="text-gray-500 font-bold whitespace-nowrap">{cat.usage}</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          {/* Expanded Sovereign Ecosystem */}
          <div className="w-full h-[1100px] shrink-0 mt-60 pb-20">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;