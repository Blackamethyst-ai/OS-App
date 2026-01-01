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
    Search, Gauge, Compass, Atom
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, ResponsiveContainer } from 'recharts';
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
    "Vision is the roadmap of implementation.",
    "Data without structure is noise; structure without data is an empty shell."
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
        <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20" />
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
    const hexCount = 6;

    return (
        <div className="crystalline rounded-[2rem] p-5 flex flex-col gap-4 shadow-2xl relative overflow-hidden group/swarm shrink-0 invisible-glass hover:border-white/10 transition-all h-full">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.02)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="flex items-center justify-between px-1 relative z-10">
                <div className="flex items-center gap-2.5">
                    <Hexagon size={12} className="text-[#9d4edd] animate-pulse" />
                    <span className="text-[8px] font-black font-mono text-white uppercase tracking-[0.4em]">Swarm Matrix</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                    <span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest">Active</span>
                </div>
            </div>
            
            <div className="grid grid-cols-6 gap-2 relative z-10 px-1">
                {Array.from({ length: 6 }).map((_, i) => {
                    const agent = agents[i];
                    const isActive = !!agent;
                    const isThinking = agent?.status === 'THINKING';

                    return (
                        <div key={i} className={cn(
                            "aspect-square flex flex-col items-center justify-center rounded-xl border transition-all duration-700 shadow-inner relative overflow-hidden",
                            isActive 
                                ? "bg-black/60 border-[#9d4edd]/30 shadow-[0_0_10px_rgba(157,78,221,0.1)]" 
                                : "bg-black/10 border-white/5 opacity-10"
                        )}>
                            {isActive ? (
                                <>
                                    <Bot size={14} className={cn(isThinking ? "text-[#f1c21b] animate-pulse" : "text-[#9d4edd]")} />
                                    {isThinking && (
                                        <motion.div 
                                            animate={{ opacity: [0, 0.4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="absolute inset-0 bg-[#f1c21b]/10"
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="w-0.5 h-0.5 rounded-full bg-white/5" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-2 border-t border-white/5 relative z-10 mt-auto">
                <div className="flex justify-between items-center text-[6px] font-mono text-gray-700 uppercase tracking-widest">
                    <span>LATTICE_OK</span>
                    <span className="text-[#10b981] font-black opacity-60">The D-Ecosystem Swarm</span>
                </div>
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
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [telemetry, setTelemetry] = useState({ cpu: 13.2, net: 0.8, trust: 99.4, entropy: kernel.entropy });
  const voiceCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUplink = async () => {
    if (voice.isActive || voice.isConnecting) {
        liveSession.disconnect();
        actions.setVoiceState({ isActive: false, isConnecting: false });
        actions.addLog('SYSTEM', 'COMMS_SEVERED: Neural voice channel terminated.');
        audio.playError();
    } else {
        actions.setVoiceState({ isConnecting: true });
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); actions.setVoiceState({ isConnecting: false }); return; }
            await liveSession.primeAudio();
            actions.setVoiceState({ isActive: true, isConnecting: false });
            actions.addLog('SUCCESS', 'COMMS_ESTABLISHED: Voice Core online.');
            audio.playSuccess();
        } catch (e) {
            actions.setVoiceState({ isConnecting: false });
            actions.addLog('ERROR', 'COMMS_FAIL: Voice interface handshake failed.');
        }
    }
  };

  const handleGlobalSync = async () => {
      setIsSyncing(true);
      actions.addLog('SYSTEM', 'HUB_SYNC: Initiating Zenith Fidelity Indistinguishable Reality visualization & technical synthesis...');
      audio.playClick();
      try {
          if (!(await window.aistudio?.hasSelectedApiKey())) { 
              await promptSelectKey(); 
              setIsSyncing(false); 
              return; 
          }
          
          const [imageUrl, manifest] = await Promise.all([
              generateArchitectureImage(
                  "ZENITH MASTERWORK: Sovereign Architect standing at the primary obsidian nexus. CGI holographic PARA drive structures seamlessly fused with a 8K photorealistic environment. Arri Alexa optics, physical lighting accuracy, indistinguishable from reality. Cinematic high-fidelity textures.",
                  AspectRatio.RATIO_16_9,
                  ImageSize.SIZE_4K, 
                  dashboard.referenceImage
              ),
              generateStructuredWorkflow([], 'D-Ecosystem Protocol 2025.Q1', 'SYSTEM_ARCHITECTURE', {
                  description: "High-fidelity PARA Drive Architecture and Cloud-Infrastucture topology for cinematic AI production. Focus on recursive naming, Zettelkasten linking, and self-healing cloud nodes.",
                  context: "Ecosystem Hub Core"
              })
          ]);

          actions.setDashboardState({ 
              hubViewUrl: imageUrl,
              activeManifest: manifest,
              deploymentProgress: 0,
              activeStepIndex: 0
          });
          
          actions.addLog('SUCCESS', 'HUB_SYNC: Strategic view established at Zenith Indistinguishable Reality level.');
          audio.playSuccess();

          let progress = 0;
          const deployInterval = setInterval(() => {
            progress += 5;
            actions.setDashboardState({ deploymentProgress: progress });
            if (progress >= 100) clearInterval(deployInterval);
          }, 3000);

      } catch (e: any) {
          actions.addLog('ERROR', `SYNC_FAIL: ${e.message}`);
      } finally {
          setIsSyncing(false);
      }
  };

  const runVisualIntegrityProbe = async () => {
    actions.addLog('SYSTEM', 'DIAGNOSTIC: Initializing automated visual integrity probe cycle...');
    const probes = [
        { label: 'Header Chroma', selector: 'header' },
        { label: 'Sovereign Delta Logo', selector: 'header svg' },
        { label: 'Global Search Index', selector: 'header input' },
        { label: 'Operator Identity Icon', selector: 'header .group\\/user' }, 
        { label: 'System Kernel Access', selector: 'header button:last-child' } 
    ];

    for (const probe of probes) {
        actions.setFocusedSelector(probe.selector);
        actions.addLog('INFO', `PROBING_NODE: ${probe.label.toUpperCase()} Vector Synchronization...`);
        audio.playClick();
        await new Promise(r => setTimeout(r, 1800));
    }
    
    actions.setFocusedSelector(null);
    actions.addLog('SUCCESS', 'DIAGNOSTIC: Universal visual alignment confirmed.');
    audio.playSuccess();
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

  const handleDownloadMainAsset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!dashboard.hubViewUrl) return;
    const link = document.createElement('a');
    link.href = dashboard.hubViewUrl;
    link.download = `The_D_Ecosystem_Sync_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    audio.playSuccess();
    actions.addLog('SUCCESS', 'ASSET_STUDIO: Strategic view manifest cached to local storage.');
  };

  const toggleOculus = () => {
    actions.setDashboardState({ isOculusView: !dashboard.isOculusView });
    audio.playClick();
  };

  return (
    <div key={theme} className="h-full w-full bg-[#020204] flex flex-col font-sans overflow-hidden transition-all duration-700 ease-in-out relative">
      
      {/* Living Neural Mesh Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[#020204]" />
          <motion.div 
            animate={{ 
                opacity: [0.03, 0.08, 0.03],
                scale: [1, 1.1, 1],
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
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:60px_60px] opacity-20" />
      </div>
      
      <AnimatePresence>
        {!dashboard.isOculusView && (
            <motion.div 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="h-20 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-3xl z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                
                <div className="flex items-center gap-10 relative z-10">
                    <div className="relative group cursor-pointer" onClick={() => actions.toggleProfile(true)}>
                        <div className="w-14 h-14 rounded-[2rem] border-2 border-[#9d4edd]/30 overflow-hidden bg-black/60 flex items-center justify-center shadow-[0_0_30px_rgba(157,78,221,0.15)] group-hover:border-[#9d4edd] group-hover:shadow-[0_0_40px_rgba(157,78,221,0.3)] transition-all duration-700">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User" /> : <User size={24} className="text-gray-700" />}
                        </div>
                        <motion.div 
                            animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center text-[#9d4edd] shadow-2xl"
                        >
                            <ShieldCheck size={12} className="text-[#10b981]" />
                        </motion.div>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <div className="px-3 py-0.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-lg backdrop-blur-3xl shadow-inner">
                                <span className="text-[9px] font-black text-[#9d4edd] uppercase font-mono tracking-[0.4em] leading-none">Identity_Verified_L0</span>
                            </div>
                            <div className="h-1 w-8 bg-white/5 rounded-full" />
                            <span className="text-gray-500 font-mono text-[9px] tracking-widest font-black uppercase opacity-60">Handshake Stable</span>
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase font-mono tracking-tighter leading-none mt-1.5 flex items-center gap-3">
                            The D-Ecosystem
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] shadow-[0_0_12px_#9d4edd]" />
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-16 relative z-10">
                    <div className="flex items-center gap-12">
                        <div className="text-right group/stat">
                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1 group-hover:text-white transition-colors">Global Lattice</span>
                            <div className="flex items-center gap-4 mt-0.5">
                                <span className="text-2xl font-black font-mono text-white tracking-tighter">99.99%</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]" />
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <div className="text-right group/stat">
                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1 group-hover:text-white transition-colors">Neural Flux</span>
                            <div className="flex items-center gap-4 mt-0.5">
                                <span className="text-2xl font-black font-mono text-white tracking-tighter">{telemetry.entropy.toFixed(1)}</span>
                                <div className={cn(
                                    "w-2.5 h-2.5 rounded-full animate-pulse transition-all duration-700",
                                    telemetry.entropy > 12 ? 'bg-[#ef4444] shadow-[0_0_15px_#ef4444]' : 'bg-[#9d4edd] shadow-[0_0_15px_#9d4edd]'
                                )} />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative bg-transparent z-10">
          {!dashboard.isOculusView && <VisionaryTicker />}

          <div className="flex flex-col gap-10 min-h-0 items-start">
              
              <div className="w-full grid grid-cols-12 gap-10">
                <div className={cn(
                    "crystalline shadow-2xl relative overflow-hidden flex flex-col min-h-[700px] group/soc invisible-glass border border-white/5 transition-all duration-1000",
                    dashboard.isOculusView ? "col-span-12 rounded-none border-none" : "col-span-9 rounded-[4rem]"
                )}>
                    {!dashboard.isOculusView && (
                        <div className="absolute top-14 left-0 w-full h-8 z-30 bg-[#0a0a0c]/40 backdrop-blur-md border-y border-white/5 overflow-hidden flex items-center">
                            <motion.div 
                                animate={{ x: ['100%', '-100%'] }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="whitespace-nowrap flex items-center gap-12"
                            >
                                {['INITIALIZING_PARA_DRIVE_V8', 'CLOUD_NODES_STABILIZED', 'DEPIN_EQUITY_LOCKED', 'RECURSIVE_ZETTELKASTEN_SYNC', 'IA_ORCHESTRATION_L0_OK'].map((msg, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-1 h-1 rounded-full bg-[#9d4edd] shadow-[0_0_8px_#9d4edd]" />
                                        <span className="text-[8px] font-black font-mono text-white/40 uppercase tracking-[0.5em]">{msg}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    )}

                    <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0 z-20 relative">
                        <div className="flex items-center gap-4">
                            <Target size={18} className="text-[#9d4edd] animate-pulse" />
                            <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Strategic Operations Center</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <button onClick={runVisualIntegrityProbe} className="flex items-center gap-2 px-4 py-1 rounded-full border border-[#22d3ee]/30 bg-black/40 text-[#22d3ee] hover:bg-[#22d3ee]/10 transition-all">
                                <Gauge size={12} />
                                <span className="text-[8px] font-mono uppercase tracking-widest font-black">Integrity Probe</span>
                            </button>
                            <button onClick={toggleOculus} className={cn("flex items-center gap-2 px-4 py-1 rounded-full border transition-all", dashboard.isOculusView ? "bg-[#f1c21b] border-[#f1c21b] text-black" : "bg-black/40 border-white/10 text-gray-500 hover:text-white")}>
                                {dashboard.isOculusView ? <EyeOff size={12} /> : <Eye size={12} />}
                                <span className="text-[8px] font-mono uppercase tracking-widest font-black">{dashboard.isOculusView ? 'Disable Oculus' : 'Oculus View'}</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 relative overflow-hidden bg-[#020204] group/view">
                        <AnimatePresence mode="wait">
                            {isSyncing ? (
                                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-3xl">
                                    <div className="relative">
                                        <Loader2 size={60} className="text-[#9d4edd] animate-spin mb-6" />
                                        <div className="absolute inset-0 blur-3xl bg-[#9d4edd]/20 animate-pulse" />
                                    </div>
                                    <span className="text-[12px] font-black font-mono text-white uppercase tracking-[0.8em]">Synthesizing Lattice...</span>
                                </motion.div>
                            ) : (
                                <motion.div key="content" className="w-full h-full relative group/img-node">
                                    {dashboard.hubViewUrl ? (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative overflow-hidden">
                                            <motion.img initial={{ scale: 1.05 }} animate={{ scale: 1 }} src={dashboard.hubViewUrl} className="w-full h-full object-cover grayscale-[20%] opacity-80 transition-all duration-[30s] group-hover/view:scale-110 group-hover/view:grayscale-0 group-hover/view:opacity-100 cursor-pointer" />
                                            <motion.div animate={{ top: ['10%', '80%', '40%', '10%'], left: ['10%', '20%', '70%', '10%'] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute w-40 h-40 border border-[#9d4edd]/40 rounded-full flex items-center justify-center pointer-events-none z-20">
                                                <Crosshair className="text-[#9d4edd] opacity-50" size={32} />
                                                <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-[#18E6FF]/30 animate-spin" />
                                            </motion.div>
                                        </motion.div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10 gap-8 grayscale p-20">
                                            <Target size={120} className="animate-pulse" />
                                            <p className="text-xl font-mono uppercase tracking-[1em]">Establishing Viewport...</p>
                                        </div>
                                    )}
                                    <div className="absolute top-10 right-10 z-40 opacity-0 group-hover/img-node:opacity-100 transition-all">
                                        <div className="flex flex-col gap-3">
                                            <button onClick={handleDownloadMainAsset} className="p-4 bg-black/60 hover:bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"><Download size={24} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); actions.openHoloProjector({ id: 'soc-scan', title: 'Holo Inspect', type: 'IMAGE', content: dashboard.hubViewUrl }); }} className="p-4 bg-black/60 hover:bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl text-[#18E6FF] shadow-2xl hover:scale-105 active:scale-95 transition-all"><Maximize2 size={24} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none" />
                    </div>

                    <div className="h-32 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-10 shrink-0 z-20 relative">
                        <div className="flex items-center gap-12">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest font-black">Neural Coherence</span>
                                <span className="text-lg font-black font-mono text-white tracking-tighter uppercase">98.4% STABLE</span>
                            </div>
                            <div className="h-10 w-px bg-white/5" />
                            <div className="flex items-center gap-6">
                                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                    <canvas ref={voiceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                                    <div className={cn("w-9 h-9 rounded-full border p-1 glass-action flex items-center justify-center relative transition-all duration-700 z-10", voice.isActive ? "border-[#9d4edd] shadow-[0_0_15px_rgba(157,78,221,0.3)] scale-105" : "border-white/10")}>
                                        <div className="w-full h-full rounded-full overflow-hidden bg-black/20 flex items-center justify-center">
                                            <Radio size={14} className={voice.isActive ? "text-[#9d4edd] animate-pulse" : "text-gray-700"} />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleUplink} className={cn("px-5 py-1.5 rounded-xl text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 border glass-action active:scale-95", voice.isActive ? "bg-red-500/10 border-red-500/20 text-red-400" : "text-[#9d4edd] border-[#9d4edd]/30 hover:border-[#9d4edd] hover:text-white")}>
                                    {voice.isActive ? <MicOff size={10} /> : <Mic size={10} />}
                                    {voice.isActive ? 'Sever Link' : 'Establish Comms'}
                                </button>
                            </div>
                        </div>
                        <button onClick={handleGlobalSync} disabled={isSyncing} className="px-8 py-3 bg-[#f1c21b] hover:bg-[#ffdf6b] text-black rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] transition-all active:scale-95 shadow-xl flex items-center gap-4 group">
                            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />}
                            Establish Zenith View
                        </button>
                    </div>
                </div>

                <div className="col-span-3 space-y-8 flex flex-col relative z-10">
                    {/* Metaventions Biometric Anchor - Original Slot */}
                    <div className="crystalline rounded-[3rem] p-5 h-40 shadow-xl flex flex-col gap-3 relative overflow-hidden invisible-glass">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <Fingerprint size={14} className="text-[#f1c21b]" />
                                <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Biometric Anchor</span>
                            </div>
                            <label className="cursor-pointer p-1 glass-action rounded-lg border-white/10 group/label">
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
                    <DirectoryPeek manifest={dashboard.activeManifest} />
                    <CapitalVelocity />
                </div>
              </div>

              {/* NEW Operational Intelligence Matrix Row */}
              <div className="w-full grid grid-cols-12 gap-10">
                <div className="col-span-9 grid grid-cols-12 gap-8">
                  <div className="col-span-6">
                    <SwarmBox />
                  </div>
                  <div className="col-span-6 grid grid-cols-2 gap-4">
                    <CompactMetric title="CPU LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="STABLE" icon={Cpu} color="var(--cyan)" trend="up" />
                    <CompactMetric title="TRUST INDEX" value="NOMINAL" detail="VERIFIED" icon={Shield} color="#10b981" trend="up" />
                    <CompactMetric title="GRAVITY" value="0.98G" detail="SYNC" icon={Atom} color="#22d3ee" trend="up" />
                    <CompactMetric title="COHERENCE" value={`${telemetry.trust.toFixed(1)}%`} detail="SECURE" icon={ShieldCheck} color="#9d4edd" trend="up" />
                  </div>
                </div>
                <div className="col-span-3 h-[250px]">
                  <ContextVelocityChart onDrillDown={(p) => actions.addLog('INFO', `LOG_DRILL: ${p.throughput} pkts`)} />
                </div>
              </div>

              <AnimatePresence>
                {!dashboard.isOculusView && (
                    <motion.div 
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        className="w-full h-[950px] mt-20 rounded-[5rem] overflow-hidden border border-white/10 shadow-[0_80px_200px_rgba(0,0,0,1)] relative group/ecosystem shrink-0"
                    >
                        <div className="absolute top-12 left-16 z-20 flex flex-col gap-3 pointer-events-none">
                            <h2 className="text-white text-3xl font-black font-mono uppercase tracking-[0.3em] drop-shadow-[0_0_20px_rgba(0,0,0,1)]">The D-Ecosystem</h2>
                            <div className="flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl w-fit">
                                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
                                <span className="text-[9px] font-black font-mono text-white uppercase tracking-[0.3em]">Autonomous_Swarm_Lattice // Active</span>
                            </div>
                        </div>
                        <DEcosystem />
                    </motion.div>
                )}
              </AnimatePresence>
          </div>
      </div>
    </div>
  );
};

export default MetaventionsHub;