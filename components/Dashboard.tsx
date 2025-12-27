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
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import MetaventionsLogo from './MetaventionsLogo';
import DEcosystem from './DEcosystem';

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
            
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10">
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
      
      // Updated prompt for cinematic, realistic production-grade holographic quality
      const prompt = `Hyper-realistic 8k cinematic production still of an advanced volumetric 3D command interface, sophisticated industrial UI design, anamorphic lens flares, optical refraction physics, deep obsidian surfaces with detailed brushed metal textures, realistic data visualizations, no cartoonish elements, production grade OS aesthetic.`;
      
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
      <div className="relative z-10 max-w-[1920px] mx-auto p-2 space-y-4 pb-32">
          
          <div className="grid grid-cols-12 gap-3 pt-1">
              {/* Left Column: Telemetry & Intel (Thin) */}
              <div className="col-span-2 space-y-4 flex flex-col h-[650px]">
                  <div className="grid grid-cols-1 gap-2 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={CpuIcon} color={accent} data={cpuHistory} trend={telemetry.cpu > 50 ? 'up' : 'down'} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Network} color={accent} data={netHistory} trend="up" />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color={accent} data={memHistory} trend="down" />
                      <CompactMetric title="INTEGRITY" value={`${telemetry.load.toFixed(1)}`} detail="Auth_OK" icon={Shield} color="#10b981" data={loadHistory} trend="up" />
                  </div>
                  
                  <div className="flex-1">
                    <RealWorldIntelFeed />
                  </div>
              </div>

              {/* Middle Column: Hub Visualizer (Banner Format - Very Wide and Longer) */}
              <div className="col-span-8 flex flex-col gap-4 h-[650px]">
                  <div className="flex-1 bg-[#020202] border border-white/5 rounded-3xl relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      <div className="flex-1 flex items-center justify-center relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.9)_100%)] z-10 pointer-events-none" />
                          
                          {dashboard.identityUrl ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
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

                      <div className="h-14 border-t border-white/5 bg-[#050505] flex items-center justify-between px-6 shrink-0">
                         <div className="flex gap-2">
                             {[
                                { label: 'Sync', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#9d4edd' }
                             ].map((btn) => (
                                 <button 
                                    key={btn.label}
                                    onClick={() => { btn.action(); audio.playClick(); }} 
                                    className="px-4 py-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                                 >
                                     <btn.icon size={10} style={{ color: btn.color }} /> 
                                     {btn.label}
                                 </button>
                             ))}
                         </div>
                         
                         <button 
                            onClick={handleIdentityGen} 
                            disabled={dashboard.isGenerating}
                            className="px-5 py-1.5 bg-[#9d4edd] text-black rounded-lg text-[9px] font-black font-mono uppercase tracking-[0.3em] transition-all flex items-center gap-2 hover:bg-[#b06bf7] active:scale-95 disabled:opacity-50"
                         >
                            {dashboard.isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Forge_Identity
                         </button>
                      </div>
                  </div>

                  {/* Neural Uplink (Voice Control Quick Access) */}
                  <div className="h-32 bg-[#0a0a0a] border border-[#9d4edd]/20 rounded-3xl p-5 flex flex-col gap-3 shadow-xl relative overflow-hidden group/voice-hub transition-all hover:border-[#9d4edd]/40">
                      <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover/voice-hub:opacity-0.06 transition-opacity rotate-12"><Headphones size={80} /></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/30 text-[#9d4edd] shadow-inner">
                                  <Radio size={16} className={voice.isActive ? 'animate-pulse' : ''} />
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Neural Uplink</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <div className={`w-1 h-1 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Zephyr-v8.1</span>
                                  </div>
                              </div>
                          </div>
                          <button 
                            onClick={() => { setMode(AppMode.VOICE_MODE); audio.playTransition(); }}
                            className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]/30 transition-all"
                          >
                            <Maximize2 size={14} />
                          </button>
                      </div>

                      <div className="flex-1 flex gap-4 items-center px-1 relative z-10">
                          <p className="flex-1 text-[10px] text-gray-500 font-mono italic leading-relaxed line-clamp-1">
                                {voice.isActive ? "Uplink stable. Direct the architect verbally for topological synthesis." : "Standby. Engage neural link for acoustic protocols."}
                          </p>
                          <button 
                            onClick={() => { setVoiceState({ isActive: !voice.isActive }); audio.playClick(); }}
                            className={`px-6 py-2 rounded-xl font-black font-mono uppercase text-[9px] tracking-widest transition-all
                                ${voice.isActive ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[#9d4edd]/20'}
                            `}
                          >
                              {voice.isActive ? 'Sever' : 'Engage'}
                          </button>
                      </div>
                  </div>
              </div>

              {/* Right Column: Assets & Yield (Thin) */}
              <div className="col-span-2 space-y-4 flex flex-col h-[650px]">
                  <div className="bg-[#050505] border border-white/5 rounded-3xl p-3 flex flex-col gap-3 shadow-xl group/ref relative overflow-hidden h-[140px]">
                      <div className="flex items-center gap-2 relative z-10">
                          <Target size={12} className="text-[#9d4edd]" />
                          <span className="text-[9px] font-black font-mono text-white uppercase tracking-widest">Style Matrix</span>
                      </div>
                      <div className="flex-1 relative rounded-xl border border-dashed border-white/5 bg-black flex items-center justify-center overflow-hidden">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[60%] group-hover/preview:grayscale-0 transition-all duration-1000" alt="Ref" />
                                    <button onClick={() => { setDashboardState({ referenceImage: null }); audio.playClick(); }} className="absolute top-1 right-1 p-1.5 bg-red-900/20 text-red-500 rounded-lg opacity-0 group-hover/preview:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-1.5 cursor-pointer group/label p-4">
                                    <Upload size={18} className="text-gray-700 group-hover/label:text-white transition-colors" />
                                    <span className="text-[7px] font-black font-mono text-gray-700 uppercase tracking-widest group-hover/label:text-white">Seed</span>
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

                  <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden flex-1 shadow-inner">
                      <div className="flex items-center justify-between relative z-10 px-1">
                          <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                                  <DollarSign size={14} />
                              </div>
                              <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.2em]">Capital Pulse</span>
                          </div>
                      </div>
                      <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center px-1">
                          {[
                              { label: 'Compute Arb', val: 94, color: '#9d4edd', usage: '+$1.2k/hr' },
                              { label: 'Network Stake', val: 82, color: '#22d3ee', usage: '+$420/day' },
                              { label: 'Asset Liquidity', val: 71, color: '#f59e0b', usage: '+$8.2k/wk' },
                              { label: 'Strategic Reserves', val: 99, color: '#10b981', usage: '$120k CAP' }
                          ].map((cat) => (
                              <div key={cat.label} className="space-y-1 group/pulse">
                                  <div className="flex justify-between items-center text-[7px] font-mono text-gray-600 uppercase tracking-widest">
                                      <span className="group-hover/pulse:text-white transition-colors">{cat.label}</span>
                                      <span className="text-gray-500 font-bold">{cat.usage}</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          {/* Expanded Hero Visualization Section at the Bottom - Spaced out for clarity */}
          <div className="w-full h-[1100px] shrink-0 mt-20 pb-20">
              <DEcosystem />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;