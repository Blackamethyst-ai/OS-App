import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    generateArchitectureImage, 
    promptSelectKey, 
    fileToGenerativePart,
    liveSession,
    generateStructuredWorkflow
} from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';
import { 
    Activity, Shield, Cpu, 
    Target, Loader2, RefreshCw, Upload, 
    Radio, Fingerprint, 
    TrendingUp, TrendingDown, Zap,
    Bot, Globe, User, Hexagon,
    Mic, MicOff, ShieldCheck, DollarSign,
    LineChart as ChartIcon, Download, Layers,
    AlertTriangle, ZapOff, Scan, Maximize2,
    FileSearch, ListChecks, Workflow, Code,
    X, FolderTree, FileText, ChevronRight,
    Terminal, Crosshair, Sparkles, Eye, EyeOff,
    Navigation, Settings, Layout, MousePointer2,
    Search, Gauge, Compass, Atom,
    Dna, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import DEcosystem from './DEcosystem';
import ContextVelocityChart from './ContextVelocityChart';

// --- VISIONARY CONSTANTS ---
const VISIONARY_DIRECTIVES = [
    "Architecture is the frozen music of logic.",
    "Metaventions: Sovereign architecture secured.",
    "Entropy is the architect's primary adversary.",
    "System coherence emerges from recursive symmetry.",
    "Identity is the first anchor of any autonomous lattice.",
    "Complexity must be distilled, not merely managed.",
    "The D-Ecosystem thrives on decentralized integrity.",
    "Vision is the roadmap of implementation."
];

// --- SUB-COMPONENTS ---

const VisionaryTicker = () => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setIndex(i => (i + 1) % VISIONARY_DIRECTIVES.length), 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl border border-white/5 px-6 py-2 rounded-full shadow-2xl">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3"
                >
                    <Sparkles size={10} className="text-[#f1c21b] animate-pulse" />
                    <span className="text-[8px] font-black font-mono text-gray-400 uppercase tracking-[0.4em] italic">
                        {VISIONARY_DIRECTIVES[index]}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const CompactMetric = ({ title, value, detail, icon: Icon, color, trend }: any) => (
    <div className="crystalline border-none rounded-2xl p-4 flex flex-col gap-2 hover:border-white/15 transition-all group shadow-inner relative overflow-hidden invisible-glass hover:scale-[1.02]">
        <div className="flex justify-between items-center relative z-10">
            <div className="p-1.5 rounded-lg bg-white/5 text-gray-500 group-hover:text-white transition-all">
                <Icon size={12} style={{ color }} />
            </div>
            <div className={`text-[8px] font-mono font-black flex items-center gap-0.5 ${trend === 'up' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend === 'up' ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                {detail}
            </div>
        </div>
        <div className="relative z-10">
            <div className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest mb-0.5">{title}</div>
            <div className="text-lg font-black font-mono text-white tracking-tighter leading-none">{value}</div>
        </div>
    </div>
);

const SystemsIntegrityWrapper = ({ telemetry }: { telemetry: any }) => (
    <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-2xl relative overflow-hidden group/integrity">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/20 to-transparent" />
        <CompactMetric title="CPU LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="STABLE" icon={Cpu} color="#18E6FF" trend="up" />
        <CompactMetric title="TRUST INDEX" value="NOMINAL" detail="VERIFIED" icon={Shield} color="#10b981" trend="up" />
        <CompactMetric title="GRAVITY" value="0.98G" detail="SYNC" icon={Atom} color="#22d3ee" trend="up" />
        <CompactMetric title="COHERENCE" value={`${telemetry.trust.toFixed(1)}%`} detail="SECURE" icon={ShieldCheck} color="#9d4edd" trend="up" />
    </div>
);

const CapitalVelocity = () => (
    <div className="crystalline rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden group/cap shrink-0 invisible-glass hover:border-white/10 transition-all">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.01)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
            <div className="p-2 bg-[#10b981]/10 rounded-xl text-[#10b981] border border-[#10b981]/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <DollarSign size={16} />
            </div>
            <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Capital Velocity</span>
        </div>

        <div className="space-y-6 relative z-10">
            {[
                { label: 'Compute Units', val: 92, color: '#f1c21b' },
                { label: 'Treasury Flow', val: 78, color: '#22d3ee' },
                { label: 'System Reach', val: 84, color: '#10b981' }
            ].map((cat) => (
                <div key={cat.label} className="space-y-2.5">
                    <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest font-black">
                        <span className="text-gray-500">{cat.label}</span>
                        <span className="text-white">{cat.val}%</span>
                    </div>
                    <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-px shadow-inner">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${cat.val}%` }} 
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full rounded-full" 
                            style={{ backgroundColor: cat.color, boxShadow: `0 0 10px ${cat.color}40` }} 
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SwarmBox = () => {
    const agents = useAppStore(s => s.agents.activeAgents);

    return (
        <div className="crystalline rounded-[3rem] p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden group/swarm shrink-0 invisible-glass hover:border-white/10 transition-all h-full">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.02)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="flex items-center justify-between px-1 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd] border border-[#9d4edd]/20">
                        <Hexagon size={16} className="animate-pulse" />
                    </div>
                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Operational Swarm Matrix</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1 bg-[#10b981]/10 rounded-full border border-[#10b981]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                    <span className="text-[8px] font-mono text-[#10b981] font-black uppercase tracking-widest">Stable</span>
                </div>
            </div>
            
            <div className="grid grid-cols-6 gap-4 relative z-10 px-1">
                {Array.from({ length: 6 }).map((_, i) => {
                    const agent = agents[i];
                    const isActive = !!agent;
                    const isThinking = agent?.status === 'THINKING';

                    return (
                        <div key={i} className={cn(
                            "aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all duration-1000 shadow-inner relative overflow-hidden",
                            isActive 
                                ? "bg-black/60 border-[#9d4edd]/30 shadow-[0_0_20px_rgba(157,78,221,0.1)]" 
                                : "bg-black/10 border-white/5 opacity-10"
                        )}>
                            {isActive ? (
                                <>
                                    <Bot size={20} className={cn(isThinking ? "text-[#f1c21b] animate-pulse" : "text-[#9d4edd]")} />
                                    <div className="text-[6px] font-mono mt-1 text-gray-500 uppercase">{agent.name}</div>
                                    {isThinking && (
                                        <motion.div 
                                            animate={{ opacity: [0, 0.4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="absolute inset-0 bg-[#f1c21b]/10"
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="w-1 h-1 rounded-full bg-white/5" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-white/5 relative z-10 mt-auto flex justify-between items-center text-[7px] font-mono text-gray-600 uppercase tracking-widest">
                <span>Autonomous_Handshake: Synchronous</span>
                <span className="text-[#10b981] font-black opacity-80">Lattice_OK</span>
            </div>
        </div>
    );
};

const DirectoryPeek = ({ manifest }: { manifest: any }) => {
    if (!manifest || !Array.isArray(manifest.structure)) return null;
    return (
        <div className="crystalline rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden group/peek shrink-0 invisible-glass hover:border-white/10 transition-all">
            <div className="flex items-center justify-between relative z-10 px-1">
                <div className="flex items-center gap-3">
                    <FolderTree size={14} className="text-[#f1c21b]" />
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Drive Topology</span>
                </div>
                <ChevronRight size={12} className="text-gray-600 group-hover/peek:translate-x-1 transition-transform" />
            </div>
            <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/5 max-h-[160px] overflow-y-auto custom-scrollbar space-y-2 relative z-10">
                {manifest.structure.slice(0, 5).map((node: any, i: number) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <FileText size={10} className="text-gray-600" />
                        <span className="text-[9px] font-mono text-gray-400 uppercase truncate tracking-tight">{node.name}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN HUB COMPONENT ---

const MetaventionsHub: React.FC = () => {
  const actions = useAppStore(s => s.actions);
  const dashboard = useAppStore(s => s.dashboard);
  const theme = useAppStore(s => s.theme);
  const user = useAppStore(s => s.user);
  const voice = useAppStore(s => s.voice);
  const kernel = useAppStore(s => s.kernel);

  const [isSyncing, setIsSyncing] = useState(false);
  const [telemetry, setTelemetry] = useState({ cpu: 13.2, net: 0.8, trust: 99.4, entropy: kernel.entropy });
  const voiceCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
        setTelemetry(prev => ({
            ...prev,
            cpu: Math.max(5, Math.min(25, prev.cpu + (Math.random() * 2 - 1))),
            entropy: Math.max(1, Math.min(15, prev.entropy + (Math.random() * 0.4 - 0.2)))
        }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = voiceCanvasRef.current;
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
            ctx.arc(cx, cy, 20 + vol * 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(157, 78, 221, ${0.2 + vol})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            const bars = 24;
            const step = (Math.PI * 2) / bars;
            for (let i = 0; i < bars; i++) {
                const angle = i * step + time * 0.2;
                const val = (freqs[i % freqs.length] / 255) * (10 + vol * 20);
                const r1 = 22;
                const r2 = 22 + val;
                
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                ctx.strokeStyle = i % 2 === 0 ? '#9d4edd' : '#22d3ee';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
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

  const handleGlobalSync = async () => {
      setIsSyncing(true);
      actions.addLog('SYSTEM', 'HUB_SYNC: Initializing Zenith Fidelity visualization...');
      audio.playClick();
      try {
          if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsSyncing(false); return; }
          const [imageUrl, manifest] = await Promise.all([
              generateArchitectureImage(
                  "ZENITH MASTERWORK: Sovereign Architect standing at the primary obsidian nexus. CGI holographic PARA drive structures seamlessly fused with a 8K photorealistic environment.",
                  AspectRatio.RATIO_16_9,
                  ImageSize.SIZE_4K, 
                  dashboard.referenceImage
              ),
              generateStructuredWorkflow([], 'D-Ecosystem Protocol 2025.Q1', 'SYSTEM_ARCHITECTURE', {
                  description: "High-fidelity PARA Drive Architecture and Cloud-Infrastucture topology.",
                  context: "Ecosystem Hub Core"
              })
          ]);
          actions.setDashboardState({ hubViewUrl: imageUrl, activeManifest: manifest });
          actions.addLog('SUCCESS', 'HUB_SYNC: Strategic view established.');
          audio.playSuccess();
      } catch (e: any) {
          actions.addLog('ERROR', `SYNC_FAIL: ${e.message}`);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleAnchorSwap = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const file = e.target.files[0];
          const part = await fileToGenerativePart(file);
          actions.setDashboardState({ referenceImage: part });
          actions.addLog('SUCCESS', `ANCHOR_LOAD: Biometric vector updated.`);
          audio.playSuccess();
      }
  };

  const handleUplink = async () => {
    if (voice.isActive || voice.isConnecting) {
        liveSession.disconnect();
        actions.setVoiceState({ isActive: false, isConnecting: false });
        actions.addLog('SYSTEM', 'COMMS: Link severed.');
    } else {
        actions.setVoiceState({ isConnecting: true });
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); actions.setVoiceState({ isConnecting: false }); return; }
            await liveSession.primeAudio();
            actions.setVoiceState({ isActive: true, isConnecting: false });
            actions.addLog('SUCCESS', 'COMMS: Link established.');
        } catch (e) { actions.setVoiceState({ isConnecting: false }); }
    }
  };

  return (
    <div key={theme} className="h-full w-full bg-[#020204] flex flex-col font-sans overflow-y-auto custom-scrollbar transition-all duration-700 ease-in-out relative">
      
      {/* Background Living Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[#020204]" />
          <motion.div 
            animate={{ 
                opacity: [0.03, 0.08, 0.03],
                background: [
                    "radial-gradient(circle at 20% 30%, #7B2CFF 0%, transparent 50%)",
                    "radial-gradient(circle at 80% 70%, #18E6FF 0%, transparent 50%)",
                    "radial-gradient(circle at 20% 30%, #7B2CFF 0%, transparent 50%)"
                ]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 blur-[120px]"
          />
          <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
      </div>
      
      <div className="flex-1 p-10 relative bg-transparent z-10 flex flex-col gap-12 max-w-[2200px] mx-auto w-full">
          {!dashboard.isOculusView && <VisionaryTicker />}

          {/* MAIN GRID - VIEWPORT & SIDEBAR */}
          <div className="grid grid-cols-12 gap-10 items-start shrink-0">
              
              <div className={cn(
                  "crystalline shadow-2xl relative overflow-hidden flex flex-col min-h-[900px] group/soc invisible-glass border border-white/5 transition-all duration-1000",
                  "col-span-9 rounded-[4rem]"
              )}>
                  <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0 z-20 relative">
                      <div className="flex items-center gap-4">
                          <Target size={18} className="text-[#9d4edd] animate-pulse" />
                          <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Strategic Operations Center</span>
                      </div>
                      <div className="flex items-center gap-4">
                           <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Adaptive_View: Active</span>
                      </div>
                  </div>
                  
                  <div className="flex-1 relative overflow-hidden bg-[#020204] group/view">
                      <AnimatePresence mode="wait">
                          {isSyncing ? (
                              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-3xl">
                                  <Loader2 size={60} className="text-[#9d4edd] animate-spin mb-6" />
                                  <span className="text-[12px] font-black font-mono text-white uppercase tracking-[0.8em]">Synthesizing Lattice...</span>
                              </motion.div>
                          ) : (
                              <motion.div key="content" className="w-full h-full relative group/img-node">
                                  {dashboard.hubViewUrl ? (
                                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative overflow-hidden">
                                          <motion.img 
                                            initial={{ scale: 1.05 }}
                                            animate={{ scale: 1 }}
                                            src={dashboard.hubViewUrl} 
                                            className="w-full h-full object-cover transition-all duration-[30s] group-hover/view:scale-110" 
                                          />
                                          <motion.div 
                                              animate={{ top: ['10%', '80%', '40%', '10%'], left: ['10%', '20%', '70%', '10%'] }}
                                              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                              className="absolute w-40 h-40 border border-[#9d4edd]/40 rounded-full flex items-center justify-center pointer-events-none z-20"
                                          >
                                              <Crosshair className="text-[#9d4edd] opacity-50" size={32} />
                                          </motion.div>
                                      </motion.div>
                                  ) : (
                                      <div className="h-full flex flex-col items-center justify-center opacity-10 gap-8 grayscale p-20">
                                          <Target size={120} className="animate-pulse" />
                                          <p className="text-xl font-mono uppercase tracking-[1em]">Establishing Viewport...</p>
                                      </div>
                                  )}
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>

                  <div className="h-28 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-10 shrink-0 z-20 relative">
                     <div className="flex items-center gap-12">
                        <div className="flex items-center gap-6">
                            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                <canvas ref={voiceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                                <div className={cn(
                                    "w-10 h-10 rounded-full border p-1 flex items-center justify-center relative transition-all duration-700 z-10 bg-black/40",
                                    voice.isActive ? "border-[#9d4edd]" : "border-white/10"
                                )}>
                                    <Radio size={16} className={voice.isActive ? "text-[#9d4edd] animate-pulse" : "text-gray-700"} />
                                </div>
                            </div>
                            <button 
                                onClick={handleUplink}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-[10px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 border active:scale-95",
                                    voice.isActive ? "bg-red-500/10 border-red-500/20 text-red-400" : "text-[#9d4edd] border-[#9d4edd]/30 hover:border-[#9d4edd] hover:text-white"
                                )}
                            >
                                {voice.isActive ? <MicOff size={10} /> : <Mic size={10} />}
                                {voice.isActive ? 'Sever Link' : 'Establish Comms'}
                            </button>
                        </div>
                     </div>
                     <button 
                        onClick={handleGlobalSync} 
                        disabled={isSyncing}
                        className="px-8 py-3 bg-[#f1c21b] hover:bg-[#ffdf6b] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all active:scale-95 shadow-xl flex items-center gap-4 group"
                    >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />}
                        Establish Zenith View
                    </button>
                  </div>
              </div>

              {/* Sidebar Panel - BIOMETRIC ANCHOR RESTORED & ELONGATED */}
              <div className="col-span-3 space-y-8 flex flex-col relative z-10 h-full">
                    {/* Metaventions Biometric Anchor */}
                    <div className="crystalline rounded-[3.5rem] p-8 h-[600px] shadow-2xl flex flex-col gap-6 relative overflow-hidden invisible-glass border border-white/5 group/anchor-box">
                        <div className="flex items-center justify-between relative z-10 px-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#f1c21b]/10 rounded-xl text-[#f1c21b] border border-[#f1c21b]/20">
                                    <Fingerprint size={14} />
                                </div>
                                <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Biometric Anchor</span>
                            </div>
                            <label className="cursor-pointer p-1.5 glass-action rounded-xl transition-all border-white/10 hover:border-[#f1c21b]/50 group/upload-btn">
                                <Upload size={12} className="text-gray-500 group-hover/upload-btn:text-[#f1c21b]" />
                                <input type="file" className="hidden" onChange={handleAnchorSwap} accept="image/*" />
                            </label>
                        </div>
                        <div className="flex-1 bg-black/40 rounded-[2.5rem] border border-white/5 flex items-center justify-center overflow-hidden relative group/anchor shadow-inner z-10">
                            {dashboard.referenceImage ? (
                                    <>
                                        <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[30%] group-hover/anchor:grayscale-0 transition-all duration-700" alt="Anchor" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/anchor:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-sm">
                                            <label className="cursor-pointer px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95">Rotate Vector</label>
                                        </div>
                                    </>
                            ) : (
                                    <label className="flex flex-col items-center gap-6 cursor-pointer p-10 group/label opacity-40 hover:opacity-100 transition-all">
                                        <div className="w-20 h-20 rounded-full border border-dashed border-gray-700 flex items-center justify-center group-hover/label:border-[#f1c21b] transition-all">
                                            <Scan size={32} className="text-gray-600 group-hover/label:text-[#f1c21b] transition-all" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">Load Identity Key</span>
                                        <input type="file" className="hidden" onChange={handleAnchorSwap} />
                                    </label>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                            <span>Auth_Vector: Persistent</span>
                            <ShieldCheck size={12} className="text-[#10b981]" />
                        </div>
                    </div>

                    <DirectoryPeek manifest={dashboard.activeManifest} />
                    <CapitalVelocity />
              </div>
          </div>

          {/* TELEMETRY MATRIX - INTEGRATED SYSTEM WRAPPER */}
          <SystemsIntegrityWrapper telemetry={telemetry} />

          {/* INTELLIGENCE MATRIX (WIDE SPAN) */}
          <div className="grid grid-cols-12 gap-10 items-stretch shrink-0">
                <div className="col-span-8">
                    <SwarmBox />
                </div>
                <div className="col-span-4 h-full">
                    <div className="h-[400px] w-full">
                        <ContextVelocityChart onDrillDown={(p) => actions.addLog('INFO', `LOG_DRILL: ${p.throughput} pkts`)} />
                    </div>
                </div>
          </div>

          {/* ECOSYSTEM LATTICE - LONG VERTICAL VIEW */}
          <div className="w-full h-[1200px] rounded-[5rem] overflow-hidden border border-white/10 shadow-[0_80px_200px_rgba(0,0,0,1)] relative group/ecosystem shrink-0 bg-black/40 backdrop-blur-3xl">
                <div className="absolute top-12 left-16 z-20 flex flex-col gap-5 pointer-events-none">
                    <h2 className="text-white text-5xl font-black font-mono uppercase tracking-[0.3em] drop-shadow-[0_0_20px_rgba(0,0,0,1)]">The D-Ecosystem</h2>
                    <div className="flex items-center gap-6 bg-black/60 backdrop-blur-2xl px-8 py-3.5 rounded-full border border-white/10 shadow-2xl w-fit">
                        <div className="p-2 bg-[#10b981]/10 rounded-lg">
                            <Network size={16} className="text-[#10b981] animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Core Mesh Fabric</span>
                            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Autonomous_Swarm_Lattice // ACTIVE_SYNC</span>
                        </div>
                    </div>
                </div>
                <DEcosystem />
          </div>

          {/* SPACER FOR FOOTER CLEARANCE */}
          <div className="h-40 shrink-0" />
      </div>
    </div>
  );
};

export default MetaventionsHub;