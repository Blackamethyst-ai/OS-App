import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    generateArchitectureImage, 
    promptSelectKey, 
    fileToGenerativePart,
    analyzeImageVision,
    generateStructuredWorkflow,
    liveSession,
    HIVE_AGENTS,
    generateAvatar,
    fetchMarketIntelligence
} from '../services/geminiService';
import { AspectRatio, ImageSize, AppMode } from '../types';
import { 
    Activity, Shield, Cpu, 
    Users, Terminal, Zap, Network, Database, 
    Radar, Target, HardDrive, User, Loader2, Maximize2, RefreshCw, Sparkles, Upload, Trash2, 
    GitCommit, Boxes, ShieldCheck, Waves, MoveUpRight, Command, Mic, Power, Atom, Plus,
    ChevronDown, Bot as BotIcon, CheckCircle, Navigation, Globe, Server, Radio,
    Compass, GitBranch, LayoutGrid, Monitor, ShieldAlert, Cpu as CpuIcon,
    Box, Diamond, Hexagon, Component, Share2, Binary, Fingerprint, Lock,
    ChevronUp, Volume2, Timer, History, Languages, Hash, Activity as PulseIcon,
    TrendingUp, TrendingDown, DollarSign, BrainCircuit, Headphones, Users as UsersIcon,
    Flame, Gauge, Link, Signal, UserCircle, MicOff
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar as RechartRadar, BarChart as ReBarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import MetaventionsLogo from './MetaventionsLogo';
import DEcosystem from './DEcosystem';

const SovereignBanner = () => {
    const { user, voice, setVoiceState, addLog } = useAppStore();
    const [freqs, setFreqs] = useState<Uint8Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Live frequency loop for the profile visualizer
    useEffect(() => {
        let rafId: number;
        const loop = () => {
            if (voice.isActive) {
                const inputFreqs = liveSession.getInputFrequencies();
                const outputFreqs = liveSession.getOutputFrequencies();
                // Combine or select the most active one for the visualizer
                setFreqs(inputFreqs || outputFreqs);
            } else {
                setFreqs(null);
            }
            rafId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(rafId);
    }, [voice.isActive]);

    // Canvas drawing for the "Speaking" overlay around profile
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const render = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (freqs && voice.isActive) {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const radius = canvas.width / 2 - 4;
                const bars = 64;
                
                ctx.beginPath();
                for (let i = 0; i < bars; i++) {
                    const angle = (i / bars) * Math.PI * 2;
                    const val = freqs[i % freqs.length] / 255;
                    const h = val * 15;
                    const x1 = cx + Math.cos(angle) * radius;
                    const y1 = cy + Math.sin(angle) * radius;
                    const x2 = cx + Math.cos(angle) * (radius + h);
                    const y2 = cy + Math.sin(angle) * (radius + h);
                    
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
                ctx.strokeStyle = '#9d4edd';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, voice.isActive]);

    const toggleVoice = async () => {
        if (voice.isActive || voice.isConnecting) {
            liveSession.disconnect();
            setVoiceState({ isActive: false, isConnecting: false });
            addLog('SYSTEM', 'VOICE_CORE: Neural Link Severed.');
            audio.playError();
        } else {
            await liveSession.primeAudio();
            setVoiceState({ isConnecting: true });
            try {
                if (!(await window.aistudio?.hasSelectedApiKey())) { 
                    await promptSelectKey(); 
                    setVoiceState({ isConnecting: false });
                    return; 
                }
                setVoiceState({ isActive: true, isConnecting: false });
                addLog('SUCCESS', 'VOICE_CORE: Neural Engagement Established.');
                audio.playSuccess();
            } catch (err: any) {
                setVoiceState({ isConnecting: false });
                addLog('ERROR', 'VOICE_CORE: Establishing link failed.');
            }
        }
    };

    return (
        <div className="w-full bg-[#050505] border border-white/5 rounded-[2.5rem] p-10 flex items-center gap-12 relative overflow-hidden group shadow-2xl mb-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,78,221,0.05)_0%,transparent_50%)]" />
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
            
            {/* Profile Section with Voice Capability */}
            <div className="relative shrink-0 flex flex-col items-center gap-4">
                <div className="relative">
                    {/* Frequency Visualizer Canvas */}
                    <canvas ref={canvasRef} className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] pointer-events-none z-0" />
                    
                    <div className={cn(
                        "w-32 h-32 rounded-full border-2 p-1.5 bg-black overflow-hidden flex items-center justify-center relative shadow-[0_0_50px_rgba(157,78,221,0.15)] transition-all duration-700 z-10",
                        voice.isActive ? "border-[#9d4edd] scale-105" : "border-[#9d4edd]/30 group-hover:border-[#9d4edd]/60"
                    )}>
                        {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover rounded-full grayscale-[20%] group-hover:grayscale-0 transition-all duration-1000" alt="Architect" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                                <UserCircle size={60} className="text-gray-800" />
                            </div>
                        )}
                        <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
                        
                        {voice.isConnecting && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin" />
                            </div>
                        )}
                    </div>
                    
                    <motion.div 
                        animate={voice.isActive ? { scale: [1, 1.1, 1], y: [0, -2, 0] } : { scale: [1, 1.05, 1] }}
                        transition={{ duration: voice.isActive ? 1.5 : 4, repeat: Infinity }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-[#9d4edd]/50 px-5 py-1 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-20 flex items-center gap-2"
                    >
                        {voice.isActive && <div className="w-1 h-1 rounded-full bg-[#9d4edd] animate-ping" />}
                        <span className="text-[9px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.3em] whitespace-nowrap">Node_ID: ARCHITECT_01</span>
                    </motion.div>
                </div>

                {/* Engagement Button Under Profile */}
                <button 
                    onClick={toggleVoice}
                    disabled={voice.isConnecting}
                    className={cn(
                        "mt-2 px-4 py-1.5 rounded-xl text-[9px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 border shadow-lg active:scale-95",
                        voice.isActive 
                            ? "bg-red-500 border-red-500/50 text-white shadow-red-500/20" 
                            : "bg-[#9d4edd] border-[#9d4edd]/50 text-black hover:bg-[#b06bf7] shadow-[#9d4edd]/30"
                    )}
                >
                    {voice.isConnecting ? <Loader2 size={12} className="animate-spin" /> : voice.isActive ? <MicOff size={12} /> : <Mic size={12} />}
                    {voice.isActive ? "Sever Link" : "Neural Engage"}
                </button>
            </div>

            {/* Text Core Section */}
            <div className="flex-1 flex flex-col gap-1.5 relative z-10">
                <div className="flex items-center gap-6 mb-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.6em] font-black">Sovereign Architecture Environment</span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>
                
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]" />
                    <span className="text-[10px] font-mono text-[#10b981] uppercase tracking-[0.4em] font-black">System Optimal</span>
                </div>
                
                <h1 className="text-6xl font-black text-white uppercase tracking-tighter font-mono leading-none">
                    Metaventions AI
                </h1>
                
                <p className="text-[12px] text-gray-400 font-mono uppercase tracking-[0.2em] mt-5 max-w-2xl leading-relaxed italic opacity-70 group-hover:opacity-100 transition-opacity duration-700">
                    Sovereign Architecture Overview. Real-time telemetry, asset generation, and intelligence feeds active across all neural sectors.
                </p>
            </div>

            {/* Decorative Technical Readout */}
            <div className="ml-auto flex items-center gap-12 shrink-0 pr-6 relative z-10">
                <div className="flex flex-col items-end gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gray-700 font-black">Auth_Link</span>
                    <div className="flex gap-1">
                        {[1,1,1,0.3,0.3].map((op, i) => (
                            <div key={i} className="w-1.5 h-4 rounded-sm bg-[#9d4edd]" style={{ opacity: op }} />
                        ))}
                    </div>
                </div>
                <div className="h-16 w-px bg-white/5" />
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gray-700 font-black">Sector_ID</span>
                    <span className="text-xl font-black font-mono text-white tracking-tighter">0xAF-CENTRAL</span>
                </div>
                <GitBranch size={32} className="text-gray-800 opacity-20 group-hover:opacity-40 transition-opacity" />
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
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
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

    useEffect(() => {
        if (marketData.opportunities.length === 0) syncIntel();
    }, []);

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
                        <div className="mt-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <Shield size={7} className={op.risk === 'HIGH' ? 'text-red-500' : 'text-gray-600'} />
                                <span className="text-[7px] font-mono text-gray-600 uppercase">Risk: {op.risk}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {marketData.opportunities.length === 0 && !isSyncing && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 text-center space-y-4 py-10">
                        <Radio size={32} className="animate-pulse" />
                        <span className="text-[9px] font-mono uppercase">Signal Void</span>
                    </div>
                )}
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
            
            <div className="px-1 py-2 border-t border-white/5 mt-auto">
                <div className="flex justify-between items-center text-[7.5px] font-mono text-gray-500 uppercase tracking-widest">
                    <span>Average Coherence</span>
                    <span className="text-white font-black">78.2%</span>
                </div>
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
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#444', fontSize: 8, fontFamily: 'Fira Code' }} />
                        <RechartRadar
                            name="Synergy"
                            dataKey="A"
                            stroke="#9d4edd"
                            fill="#9d4edd"
                            fillOpacity={0.15}
                        />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <Flame size={16} className="text-[#f59e0b] animate-pulse" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
                {data.map((d, i) => (
                    <div key={i} className="bg-white/[0.01] border border-white/5 rounded-lg p-1.5 flex items-center justify-between">
                        <span className="text-[7px] font-black font-mono text-gray-500 uppercase">{d.subject}</span>
                        <span className="text-[8px] font-black font-mono text-white">{d.A}%</span>
                    </div>
                ))}
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
  const { dashboard, setDashboardState, user, toggleProfile, system, addLog, openHoloProjector, setMode, setProcessState, voice, setVoiceState } = useAppStore();
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
      
      const prompt = `Hyper-realistic extreme wide shot 8k cinematic production still of an advanced volumetric 3D command interface in a dark high-tech environment, sophisticated futuristic industrial UI design, anamorphic lens flares, realistic data stream physics, deep obsidian surfaces, realistic data visualizations, max resolution, production grade OS aesthetic.`;
      
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_16_9, ImageSize.SIZE_4K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
      
      const response = await fetch(url);
      const blob = await response.blob();
      const fileData = await fileToGenerativePart(new File([blob], 'identity.png', { type: 'image/png' }));
      const analysis = await analyzeImageVision(fileData);
      
      let detectedColor = '#9d4edd'; 
      const lowAnalysis = analysis.toLowerCase();
      if (lowAnalysis.includes('cyan') || lowAnalysis.includes('blue')) detectedColor = '#22d3ee';
      else if (lowAnalysis.includes('gold') || lowAnalysis.includes('amber')) detectedColor = '#f59e0b';
      else if (lowAnalysis.includes('green') || lowAnalysis.includes('emerald')) detectedColor = '#10b981';

      setDashboardState({ activeThemeColor: detectedColor });
      addLog('SUCCESS', 'LATTICE_SYNC: Identity synchronized with high-fidelity cinematic buffers.');
      audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'SYNC_FAIL: Neural link interrupt during image fabrication.');
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  const handleQuickForge = async (type: 'DRIVE' | 'ARCH') => {
    addLog('SYSTEM', `FORGE_EXEC: Synthesizing ${type} logic...`);
    try {
        const result = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE', {
            architecturePrompt: type === 'DRIVE' ? "PARA Drive Refinement" : "Zero-Trust Mesh Stack",
        });
        setProcessState({ 
            generatedWorkflow: result,
            activeTab: type === 'DRIVE' ? 'vault' : 'workflow',
            workflowType: type === 'DRIVE' ? 'DRIVE_ORGANIZATION' : 'SYSTEM_ARCHITECTURE'
        });
        setMode(AppMode.PROCESS_MAP);
        audio.playSuccess();
    } catch (e) {
        addLog('ERROR', 'FORGE_FAIL: Structural logic collision.');
    }
  };

  return (
    <div className="w-full text-gray-200 font-sans relative h-full transition-colors duration-[2000ms] overflow-y-auto custom-scrollbar bg-[#020202]">
      <div className="relative z-10 max-w-[2000px] mx-auto p-2 space-y-4 pb-32">
          
          <SovereignBanner />

          <div className="grid grid-cols-12 gap-3 pt-1">
              {/* Left Column: Telemetry & Intel - Now 880px Tall */}
              <div className="col-span-2 space-y-4 flex flex-col h-[880px]">
                  <div className="grid grid-cols-1 gap-2 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={CpuIcon} color={accent} data={cpuHistory} trend={telemetry.cpu > 50 ? 'up' : 'down'} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Network} color={accent} data={netHistory} trend="up" />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color={accent} data={memHistory} trend="down" />
                      <CompactMetric title="INTEGRITY" value={`${telemetry.load.toFixed(1)}`} detail="Auth_OK" icon={Shield} color="#10b981" data={loadHistory} trend="up" />
                  </div>
                  
                  <div className="flex-1 min-h-0">
                    <RealWorldIntelFeed />
                  </div>
              </div>

              {/* Middle Column: Hub Visualizer - Now 880px Tall */}
              <div className="col-span-7 flex flex-col gap-4 h-[880px]">
                  <div className="flex-1 bg-[#020202] border border-white/5 rounded-[3rem] relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      <div className="flex-1 flex items-center justify-center relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.9)_100%)] z-10 pointer-events-none" />
                          
                          {dashboard.identityUrl ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl"
                              >
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-105" alt="Hub Banner" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-4 opacity-10 group-hover/viewport:opacity-25 transition-all duration-1000 text-center select-none">
                                  <Radar size={48} className="text-gray-500 animate-[spin_60s_linear_infinite]" />
                                  <p className="text-[10px] font-mono uppercase tracking-[0.6em] text-white">Hub_Standby</p>
                              </div>
                          )}
                      </div>

                      <div className="h-14 border-t border-white/5 bg-[#050505] flex items-center justify-between px-8 shrink-0">
                         <div className="flex gap-3">
                             {[
                                { label: 'Sync', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#9d4edd' }
                             ].map((btn) => (
                                 <button 
                                    key={btn.label}
                                    onClick={() => { btn.action(); audio.playClick(); }} 
                                    className="px-5 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-[9px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-3 active:scale-95 shadow-lg"
                                 >
                                     <btn.icon size={11} style={{ color: btn.color }} /> 
                                     {btn.label}
                                 </button>
                             ))}
                         </div>
                         
                         <button 
                            onClick={handleIdentityGen} 
                            disabled={dashboard.isGenerating}
                            className="px-7 py-2 bg-[#9d4edd] text-black rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.4em] transition-all flex items-center gap-3 hover:bg-[#b06bf7] active:scale-95 disabled:opacity-50 shadow-[0_10px_30px_rgba(157,78,221,0.3)]"
                         >
                            {dashboard.isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Forge_Identity
                         </button>
                      </div>
                  </div>

                  {/* Manual Neural Uplink Quick Access */}
                  <div className="h-32 bg-[#0a0a0a] border border-[#9d4edd]/20 rounded-[2.5rem] p-5 flex flex-col gap-2 shadow-xl relative overflow-hidden group/voice-hub transition-all hover:border-[#9d4edd]/40 shrink-0">
                      <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover/voice-hub:opacity-0.08 transition-opacity rotate-12"><Headphones size={80} /></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                              <div className="p-2 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/30 text-[#9d4edd] shadow-inner">
                                  <Radio size={18} className={voice.isActive ? 'animate-pulse' : ''} />
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Secondary Uplink</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <div className={`w-1 h-1 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Zephyr Protocol</span>
                                  </div>
                              </div>
                          </div>
                          <button 
                            onClick={() => { setMode(AppMode.VOICE_MODE); audio.playTransition(); }}
                            className="p-1.5 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]/30 transition-all"
                          >
                            <Maximize2 size={16} />
                          </button>
                      </div>

                      <div className="flex-1 flex gap-5 items-center px-1 relative z-10">
                          <p className="flex-1 text-[10px] text-gray-500 font-mono italic leading-relaxed line-clamp-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                {voice.isActive ? "Uplink stable. Direct the architect verbally for topological synthesis." : "Standby. Core Voice module accessible via Architect profile header."}
                          </p>
                      </div>
                  </div>
              </div>

              {/* Right Column: Multi-Metric Cluster - Now 880px Tall */}
              <div className="col-span-3 space-y-4 flex flex-col h-[880px]">
                  <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-4 flex flex-col gap-3 shadow-xl group/ref relative overflow-hidden h-[180px] shrink-0">
                      <div className="flex items-center gap-3 relative z-10 px-1">
                          <Target size={14} className="text-[#9d4edd]" />
                          <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Style Matrix</span>
                      </div>
                      <div className="flex-1 relative rounded-[1.5rem] border border-dashed border-white/5 bg-black flex items-center justify-center overflow-hidden group/drop">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[60%] group-hover/preview:grayscale-0 transition-all duration-1000" alt="Ref" />
                                    <button onClick={() => { setDashboardState({ referenceImage: null }); audio.playClick(); }} className="absolute top-2 right-2 p-2 bg-red-900/40 text-red-500 rounded-xl opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-md border border-red-500/30"><Trash2 size={14}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-2 cursor-pointer group/label p-6">
                                    <div className="p-2 bg-white/5 rounded-2xl group-hover/label:bg-[#9d4edd]/10 transition-colors">
                                        <Upload size={20} className="text-gray-700 group-hover/label:text-[#9d4edd] transition-colors" />
                                    </div>
                                    <span className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-[0.3em] group-hover/label:text-white">Seed Reference</span>
                                    <input type="file" className="hidden" onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const fileData = await fileToGenerativePart(e.target.files[0]);
                                            setDashboardState({ referenceImage: fileData });
                                            audio.playSuccess();
                                        }
                                    }} />
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
                      <div className="flex items-center justify-between relative z-10 px-1">
                          <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-xl bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                                  <DollarSign size={16} />
                              </div>
                              <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Capital Pulse</span>
                          </div>
                      </div>
                      <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center px-1">
                          {[
                              { label: 'Compute Arb', val: 94, color: '#9d4edd', usage: '+$1.2k/hr' },
                              { label: 'Network Stake', val: 82, color: '#22d3ee', usage: '+$420/day' },
                              { label: 'Asset Liquidity', val: 71, color: '#f59e0b', usage: '+$8.2k/wk' },
                              { label: 'Strategic Reserves', val: 99, color: '#10b981', usage: '$120k CAP' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-1.5 group/pulse">
                                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                      <span className="group-hover/pulse:text-white transition-colors font-black">{cat.label}</span>
                                      <span className="text-gray-500 font-bold">{cat.usage}</span>
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