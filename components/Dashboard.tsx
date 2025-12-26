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
    TrendingUp, TrendingDown, DollarSign, BrainCircuit, Headphones
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import MetaventionsLogo from './MetaventionsLogo';

// --- REAL-TIME NEURAL PULSE COMPONENT ---
const NeuralMomentumPulse = ({ entropy }: { entropy: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const render = () => {
            frame++;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const scale = 1 + (entropy / 200);
            const radius = 80 * scale;

            // Concentric Energy Rings
            for (let i = 0; i < 3; i++) {
                const ringRad = radius + Math.sin(frame * 0.05 + i) * 10;
                ctx.beginPath();
                ctx.arc(cx, cy, ringRad, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(157, 126, 221, ${0.1 / (i + 1)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Neural Fibers
            const fiberCount = 12;
            for (let i = 0; i < fiberCount; i++) {
                const angle = (i / fiberCount) * Math.PI * 2 + frame * 0.01;
                const tx = cx + Math.cos(angle) * (radius + 20);
                const ty = cy + Math.sin(angle) * (radius + 20);
                
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.quadraticCurveTo(
                    cx + Math.cos(angle + 0.5) * radius,
                    cy + Math.sin(angle + 0.5) * radius,
                    tx, ty
                );
                ctx.strokeStyle = `rgba(157, 126, 221, ${0.05})`;
                ctx.stroke();
            }

            requestAnimationFrame(render);
        };
        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, [entropy]);

    return (
        <div className="w-full h-full relative flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <motion.div 
                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#9d4edd]/20 to-transparent border border-[#9d4edd]/30 backdrop-blur-3xl flex items-center justify-center"
            >
                <div className="text-center">
                    <span className="text-[10px] font-mono text-[#9d4edd] block uppercase tracking-[0.3em] mb-1">Coherence</span>
                    <span className="text-3xl font-black font-mono text-white tracking-tighter">{100 - Math.round(entropy)}%</span>
                </div>
            </motion.div>
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
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 h-[320px] relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f59e0b]/5 rounded-xl border border-[#f59e0b]/10 text-[#f59e0b]">
                        <Globe size={16} />
                    </div>
                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Real-World Intel</span>
                </div>
                <button onClick={syncIntel} disabled={isSyncing} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
                    {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10">
                {marketData.opportunities.map((op, i) => (
                    <div key={i} className="p-3 bg-[#0a0a0a] border border-white/5 rounded-xl hover:border-[#f59e0b]/30 transition-all group/op">
                        <div className="flex justify-between items-start mb-1.5">
                            <span className="text-[10px] font-black text-gray-300 uppercase truncate pr-4">{op.title}</span>
                            <span className="text-[9px] font-black font-mono text-[#10b981]">{op.yield}</span>
                        </div>
                        <p className="text-[8px] font-mono text-gray-600 uppercase leading-relaxed line-clamp-2">"{op.logic}"</p>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Shield size={8} className={op.risk === 'HIGH' ? 'text-red-500' : 'text-gray-600'} />
                                <span className="text-[7px] font-mono text-gray-600 uppercase">Risk: {op.risk}</span>
                            </div>
                            <span className="text-[7px] font-black text-[#9d4edd] uppercase tracking-tighter">Verified_L0</span>
                        </div>
                    </div>
                ))}
                {marketData.opportunities.length === 0 && !isSyncing && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 text-center space-y-4 py-10">
                        <Radio size={40} className="animate-pulse" />
                        <span className="text-[10px] font-mono uppercase">Signal Void</span>
                    </div>
                )}
            </div>
            <div className="h-10 bg-black/40 border-t border-white/5 flex items-center justify-between px-3 text-[7px] font-mono text-gray-600 uppercase tracking-widest shrink-0">
                <span>Last_Sync: {marketData.lastSync ? new Date(marketData.lastSync).toLocaleTimeString() : 'N/A'}</span>
                <span className="text-[#f59e0b]">Active_Feed</span>
            </div>
        </div>
    );
};

const CompactMetric = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="bg-[#050505] border border-white/5 rounded-xl p-3 relative overflow-hidden group shadow-xl h-24 flex flex-col justify-between transition-all hover:border-white/10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-15" style={{ '--accent': color } as any}></div>
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-white/5 border border-white/5 text-gray-700 group-hover:text-white transition-colors">
                    <Icon size={12} style={{ color: color }} />
                </div>
                <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[8px] font-mono text-gray-600 uppercase">
                {trend === 'up' ? <TrendingUp size={10} className="text-[#10b981]" /> : <TrendingDown size={10} className="text-[#ef4444]" />}
                {detail}
            </div>
        </div>
        <div className="flex items-end justify-between">
            <div className="text-2xl font-black font-mono text-white tracking-tighter leading-none">{value}</div>
            <div className="h-8 w-16 opacity-10 group-hover:opacity-100 transition-opacity">
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
      const prompt = `Hyper-detailed 4k futuristic architectural command interface, schematic data visualization overlay, deep obsidian with vibrant ${accent} accents, isometric perspective, technical masterpiece render.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_16_9, ImageSize.SIZE_2K, dashboard.referenceImage);
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
      addLog('SUCCESS', 'LATTICE_SYNC: Identity synchronized.');
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
      <div className="relative z-10 max-w-[1920px] mx-auto p-6 space-y-6 pb-32">
          <div className="grid grid-cols-12 gap-6 pt-4">
              {/* Left Column: Telemetry & Intel */}
              <div className="col-span-3 space-y-6 flex flex-col h-[900px]">
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={CpuIcon} color={accent} data={cpuHistory} trend={telemetry.cpu > 50 ? 'up' : 'down'} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Network} color={accent} data={netHistory} trend="up" />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color={accent} data={memHistory} trend="down" />
                      <CompactMetric title="INTEGRITY" value={`${telemetry.load.toFixed(1)}`} detail="Auth_OK" icon={Shield} color="#10b981" data={loadHistory} trend="up" />
                  </div>
                  
                  <div className="shrink-0">
                    <RealWorldIntelFeed />
                  </div>

                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-2xl">
                      <div className="flex justify-between items-center mb-4 relative z-10">
                          <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Sovereign Pulse</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse shadow-[0_0_8px_#9d4edd]" />
                      </div>
                      <NeuralMomentumPulse entropy={telemetry.cpu} />
                      <div className="absolute bottom-4 left-6 right-6 text-[8px] font-mono text-gray-700 uppercase tracking-widest text-center border-t border-white/5 pt-4">
                        Cognitive Mesh Analysis Active
                      </div>
                  </div>
              </div>

              {/* Middle Column: Hub Visualizer & Full Voice Mode */}
              <div className="col-span-6 flex flex-col gap-6 h-[900px]">
                  <div className="flex-1 bg-[#020202] border border-white/5 rounded-3xl relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                          
                          {dashboard.identityUrl ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
                              >
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-105" alt="Hub" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-6 opacity-10 group-hover/viewport:opacity-25 transition-all duration-1000 text-center select-none">
                                  <Radar size={64} className="text-gray-500 animate-[spin_60s_linear_infinite]" />
                                  <p className="text-sm font-mono uppercase tracking-[0.5em] text-white">Hub_Standby</p>
                              </div>
                          )}
                      </div>

                      <div className="h-16 border-t border-white/5 bg-[#050505] flex items-center justify-between px-8 shrink-0">
                         <div className="flex gap-3">
                             {[
                                { label: 'Sync', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#9d4edd' }
                             ].map((btn) => (
                                 <button 
                                    key={btn.label}
                                    onClick={() => { btn.action(); audio.playClick(); }} 
                                    className="px-5 py-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl text-[10px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                                 >
                                     <btn.icon size={12} style={{ color: btn.color }} /> 
                                     {btn.label}
                                 </button>
                             ))}
                         </div>
                         
                         <button 
                            onClick={handleIdentityGen} 
                            disabled={dashboard.isGenerating}
                            className="px-6 py-2.5 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-[0.3em] transition-all flex items-center gap-3 hover:bg-[#b06bf7] active:scale-95 disabled:opacity-50"
                         >
                            {dashboard.isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Forge_Identity
                         </button>
                      </div>
                  </div>

                  {/* Restored Full Voice Mode (Neural Uplink) Section */}
                  <div className="h-56 bg-[#0a0a0a] border border-[#9d4edd]/20 rounded-3xl p-6 flex flex-col gap-4 shadow-xl relative overflow-hidden group/voice-hub transition-all hover:border-[#9d4edd]/40">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover/voice-hub:opacity-[0.06] transition-opacity rotate-12"><Headphones size={120} /></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-[#9d4edd]/10 rounded-2xl border border-[#9d4edd]/30 text-[#9d4edd] shadow-inner">
                                  <Radio size={20} className={voice.isActive ? 'animate-pulse' : ''} />
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Neural Uplink</span>
                                  <div className="flex items-center gap-2 mt-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Voice Engine: Zephyr-v8.1</span>
                                  </div>
                              </div>
                          </div>
                          <button 
                            onClick={() => { setMode(AppMode.VOICE_MODE); audio.playTransition(); }}
                            className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]/30 transition-all"
                            title="Expand Immersive View"
                          >
                            <Maximize2 size={16} />
                          </button>
                      </div>

                      <div className="flex-1 flex gap-6 items-center px-2 relative z-10">
                          <div className="flex-1 space-y-4">
                              <div className="flex justify-between items-end text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                  <span>Cognitive Load</span>
                                  <span className="text-white">Low_Latency</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                  <motion.div 
                                    animate={{ width: voice.isActive ? '64%' : '0%' }}
                                    className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_10px_#9d4edd]"
                                  />
                              </div>
                              <p className="text-[10px] text-gray-500 font-mono italic leading-relaxed line-clamp-1">
                                {voice.isActive ? "Uplink stable. Direct the architect verbally for topological synthesis." : "Standby. Engage neural link to initialize acoustic context protocols."}
                              </p>
                          </div>
                          
                          <button 
                            onClick={() => { setVoiceState({ isActive: !voice.isActive }); audio.playClick(); }}
                            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-700 active:scale-95 shadow-2xl relative overflow-hidden
                                ${voice.isActive 
                                    ? 'bg-red-500 shadow-red-500/20 text-white' 
                                    : 'bg-[#9d4edd] shadow-[#9d4edd]/20 text-black hover:bg-[#b06bf7]'}
                            `}
                          >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
                              <Mic size={28} className={voice.isActive ? 'animate-pulse' : ''} />
                              <span className="text-[8px] font-black font-mono uppercase tracking-widest">
                                {voice.isActive ? 'Sever' : 'Engage'}
                              </span>
                          </button>
                      </div>
                  </div>
              </div>

              {/* Right Column: Assets & Yield */}
              <div className="col-span-3 space-y-6 flex flex-col h-[900px]">
                  <div className="bg-[#050505] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 shadow-xl group/ref relative overflow-hidden h-[180px]">
                      <div className="flex items-center gap-2 relative z-10">
                          <Target size={14} className="text-[#9d4edd]" />
                          <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Style Matrix</span>
                      </div>
                      <div className="flex-1 relative rounded-2xl border border-dashed border-white/5 bg-black flex items-center justify-center overflow-hidden shadow-inner">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[60%] group-hover/preview:grayscale-0 transition-all duration-1000" alt="Ref" />
                                    <button onClick={() => { setDashboardState({ referenceImage: null }); audio.playClick(); }} className="absolute top-2 right-2 p-2 bg-red-900/20 text-red-500 rounded-xl opacity-0 group-hover/preview:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-2 cursor-pointer group/label p-8">
                                    <Upload size={22} className="text-gray-700 group-hover/label:text-white transition-colors" />
                                    <span className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-widest group-hover/label:text-white">Seed Matrix</span>
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

                  <div className="bg-[#050505] border border-white/5 rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden h-[240px] shadow-inner">
                      <div className="flex items-center justify-between relative z-10 px-1">
                          <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                                  <DollarSign size={16} />
                              </div>
                              <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Capital Pulse</span>
                          </div>
                          <TrendingUp size={14} className="text-[#10b981]" />
                      </div>
                      <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center px-1">
                          {[
                              { label: 'Compute Arb', val: 94, color: '#9d4edd', usage: '+$1.2k/hr' },
                              { label: 'Network Stake', val: 82, color: '#22d3ee', usage: '+$420/day' },
                              { label: 'Asset Liquidity', val: 71, color: '#f59e0b', usage: '+$8.2k/wk' },
                              { label: 'Strategic Reserves', val: 99, color: '#10b981', usage: '$120k CAP' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-1.5 group/pulse">
                                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                      <span className="group-hover/pulse:text-white transition-colors">{cat.label}</span>
                                      <span className="text-gray-500 font-bold">{cat.usage}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col">
                      <div className="flex items-center gap-3 mb-6 shrink-0 px-1">
                          <GitBranch size={16} className="text-[#22d3ee]" />
                          <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Lattice Synchronization</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-8">
                          <div className="flex items-center justify-between px-2">
                             <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-mono text-gray-500 uppercase">Sector Alignment</span>
                                <span className="text-xl font-black font-mono text-white tracking-tighter">98.4%</span>
                             </div>
                             <ShieldCheck size={32} className="text-[#10b981] opacity-40" />
                          </div>
                          <div className="h-px w-full bg-white/5" />
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black border border-white/5 p-4 rounded-2xl">
                                 <span className="text-[7px] text-gray-600 uppercase font-mono block mb-1">Peer Nodes</span>
                                 <span className="text-sm font-bold text-[#22d3ee]">1,240_ACTIVE</span>
                              </div>
                              <div className="bg-black border border-white/5 p-4 rounded-2xl">
                                 <span className="text-[7px] text-gray-600 uppercase font-mono block mb-1">Latency</span>
                                 <span className="text-sm font-bold text-[#9d4edd]">4.2ms_STABLE</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;