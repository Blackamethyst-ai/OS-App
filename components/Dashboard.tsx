
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
    generateAvatar
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
    ChevronUp, Volume2, Timer, History, Languages, Hash, Activity as PulseIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

// --- SHARED VOICE SUB-COMPONENTS ---

const NeuralReasoningCanvas: React.FC<{ isThinking: boolean; userActive: boolean; agentActive: boolean }> = ({ isThinking, userActive, agentActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

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

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            if (isThinking || userActive || agentActive) {
                const count = isThinking ? 8 : 2;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 100 + Math.random() * 80;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 1.8,
                        vy: (Math.random() - 0.5) * 1.8,
                        life: 1.0,
                        color: userActive ? '#22d3ee' : agentActive ? '#f1c21b' : '#9d4edd'
                    });
                }
            }

            particles.current.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.003; 

                if (p.life <= 0) {
                    particles.current.splice(idx, 1);
                    return;
                }

                ctx.globalAlpha = p.life * 0.4;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
                ctx.fill();

                if (p.life > 0.8) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.15;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(cx, cy);
                    ctx.stroke();
                }
            });

            ctx.globalAlpha = 1;
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [isThinking, userActive, agentActive]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40" />;
};

const TelemetryRing = ({ color, duration, delay, radius, volume, opacity = 0.2 }: { color: string, duration: number, delay: number, radius: number, volume: number, opacity?: number }) => (
    <motion.div
        animate={{ 
            rotate: 360, 
            scale: [1, 1 + (volume / 350), 1],
            opacity: [opacity, opacity * 1.8, opacity] 
        }}
        transition={{ duration, repeat: Infinity, ease: "linear", delay }}
        className="absolute rounded-full border border-dashed pointer-events-none"
        style={{ 
            width: radius * 2, 
            height: radius * 2, 
            borderColor: color,
            filter: `drop-shadow(0 0 ${4 + volume/25}px ${color})`
        }}
    >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-1 h-1 rounded-full bg-white opacity-60" />
        </div>
    </motion.div>
);

const CognitiveLattice: React.FC<{ 
    image: string | null; 
    freqs: Uint8Array | null; 
    color: string; 
    isAgent: boolean; 
    isThinking?: boolean;
}> = ({ image, freqs, color, isAgent, isThinking }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const volume = useMemo(() => {
        if (freqs && freqs.length > 0) {
            return freqs.reduce((a, b) => a + b, 0) / freqs.length;
        }
        return 0;
    }, [freqs]);

    useEffect(() => {
        let frameId: number;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const render = () => {
            if (!canvas || !ctx) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const normalizedVol = volume / 255;
            const time = Date.now() / 4000; 

            const nodeCount = 8;
            for(let i=0; i<nodeCount; i++) {
                const angle = (i / nodeCount) * Math.PI * 2 + time * (isAgent ? 0.8 : -0.6);
                const r = 130 + Math.sin(time * 2 + i) * 12;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                
                ctx.beginPath();
                ctx.arc(px, py, 1.5 + normalizedVol * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.2 + normalizedVol * 0.6;
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(px, py);
                ctx.strokeStyle = `${color}06`;
                ctx.stroke();
            }

            const threadCount = 18;
            const baseRadius = 100;
            ctx.lineWidth = 0.4;
            for (let i = 0; i < threadCount; i++) {
                const angle = (i / threadCount) * Math.PI * 2 + time * 0.15;
                const r = baseRadius + Math.sin(time * 3 + i) * 15 * normalizedVol;
                const tx = cx + Math.cos(angle) * r;
                const ty = cy + Math.sin(angle) * r;

                ctx.beginPath();
                ctx.strokeStyle = `${color}${Math.floor((0.03 + normalizedVol * 0.3) * 255).toString(16).padStart(2, '0')}`;
                ctx.moveTo(cx, cy);
                ctx.quadraticCurveTo(cx + Math.cos(angle + 0.6) * (r * 0.7), cy + Math.sin(angle + 0.6) * (r * 0.7), tx, ty);
                ctx.stroke();
            }

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [volume, color, isAgent, isThinking]);

    return (
        <div className="relative w-80 h-80 flex items-center justify-center group/node">
            <AnimatePresence>
                <TelemetryRing color={color} duration={35} delay={0} radius={125} volume={volume} opacity={0.12} />
                <TelemetryRing color={color} duration={22} delay={0.4} radius={155} volume={volume} opacity={0.06} />
                {isThinking && <TelemetryRing color="#f1c21b" duration={4} delay={0} radius={185} volume={volume * 1.5} opacity={0.25} />}
            </AnimatePresence>
            
            <canvas ref={canvasRef} className="absolute inset-[-100px] w-[calc(100%+200px)] h-[calc(100%+200px)] pointer-events-none z-0 opacity-50 group-hover/node:opacity-95 transition-opacity" />
            
            <motion.div 
                whileHover={{ scale: 1.05 }}
                className={`relative z-10 w-56 h-56 rounded-full border-2 border-white/5 overflow-hidden bg-[#020202] shadow-[0_0_100px_rgba(0,0,0,1)] transition-all duration-[1000ms] ${isThinking ? 'border-[#f1c21b]/40 scale-105 shadow-[0_0_60px_rgba(241,194,27,0.2)]' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[20%] contrast-125 group-hover/node:grayscale-0 transition-all duration-[1200ms]" alt="Entity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {isAgent ? <BotIcon size={64} className="text-gray-800" /> : <User size={64} className="text-gray-800" />}
                    </div>
                )}
                
                {isThinking && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] flex flex-col items-center justify-center">
                         <div className="relative">
                            <Loader2 className="w-12 h-12 text-[#f1c21b] animate-spin mb-2" />
                            <div className="absolute inset-0 bg-[#f1c21b]/20 blur-2xl animate-pulse" />
                         </div>
                         <span className="text-[8px] font-black font-mono text-[#f1c21b] uppercase tracking-[0.5em]">Lattice_Sync</span>
                    </div>
                )}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.12)_50%)] z-20 bg-[length:100%_4px] opacity-25" />
            </motion.div>
        </div>
    );
};

// --- CORE UPGRADE: PRISMATIC FRACTAL CORE (ITERATION 8.0) ---

interface ShardSplinter {
    id: string;
    x: number; y: number;
    vx: number; vy: number;
    rotation: number;
    rv: number;
    size: number;
    opacity: number;
    hue: number;
    level: number; 
}

const PrismaticLatticeCore = ({ cpu, integrity }: { cpu: number, integrity: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { mode, system } = useAppStore();
    const lastLogCount = useRef(0);
    const currC = useRef({ x: 0, y: 0 });
    const shards = useRef<ShardSplinter[]>([]);
    
    const [weights, setWeights] = useState<Record<string, number>>({
        RESEARCH: 10, PROCESS: 10, VAULT: 10, STUDIO: 10, HARDWARE: 10, CODE: 10, AGENT: 10, BRIDGE: 10
    });

    useEffect(() => {
        const logs = system.logs || [];
        if (logs.length > lastLogCount.current) {
            const latest = logs[logs.length - 1];
            const msg = (latest?.message || "").toString().toUpperCase();
            let sector = "";
            if (msg.includes("VAULT") || msg.includes("DRIVE")) sector = "VAULT";
            else if (msg.includes("RESEARCH") || msg.includes("BIBLIO")) sector = "RESEARCH";
            else if (msg.includes("AGENT") || msg.includes("SWARM")) sector = "AGENT";
            else if (msg.includes("CODE") || msg.includes("FORGE")) sector = "CODE";
            else if (msg.includes("HW") || msg.includes("THERMAL")) sector = "HARDWARE";
            else if (msg.includes("PROCESS") || msg.includes("BLUEPRINT")) sector = "PROCESS";
            else if (msg.includes("STUDIO") || msg.includes("ASSET")) sector = "STUDIO";
            else if (msg.includes("BRIDGE") || msg.includes("REALITY")) sector = "BRIDGE";

            if (sector) {
                setWeights(prev => ({ ...prev, [sector]: 320 }));
                if (cpu > 60) {
                    const victims = shards.current.filter(s => s.level === 0 && Math.random() > 0.5).slice(0, 3);
                    victims.forEach(v => {
                        v.vx *= 3; v.vy *= 3; 
                    });
                }
            }
            lastLogCount.current = logs.length;
        }

        const decay = setInterval(() => {
            setWeights(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    next[key] = Math.max(10, next[key] * 0.988);
                });
                const modeMap: Record<string, string> = {
                    [AppMode.BIBLIOMORPHIC]: 'RESEARCH',
                    [AppMode.PROCESS_MAP]: 'PROCESS',
                    [AppMode.MEMORY_CORE]: 'VAULT',
                    [AppMode.IMAGE_GEN]: 'STUDIO',
                    [AppMode.HARDWARE_ENGINEER]: 'HARDWARE',
                    [AppMode.CODE_STUDIO]: 'CODE',
                    [AppMode.AGENT_CONTROL]: 'AGENT',
                    [AppMode.SYNTHESIS_BRIDGE]: 'BRIDGE',
                    [AppMode.DASHBOARD]: 'PROCESS'
                };
                const currentSector = modeMap[mode as string];
                if (currentSector) next[currentSector] = Math.max(next[currentSector], 240);
                return next;
            });
        }, 800); 
        return () => clearInterval(decay);
    }, [mode, system.logs, cpu]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const sectors = Object.keys(weights);

        if (shards.current.length === 0) {
            for (let i = 0; i < 35; i++) {
                shards.current.push({
                    id: Math.random().toString(36), x: Math.random() * 400, y: Math.random() * 400,
                    vx: 0, vy: 0, rotation: Math.random() * Math.PI, rv: (Math.random() - 0.5) * 0.04,
                    size: 6 + Math.random() * 10, opacity: 0.1 + Math.random() * 0.6,
                    hue: 260 + Math.random() * 40, level: 0
                });
            }
        }

        const render = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const time = Date.now() / 15000;

            const coherence = integrity / 100;
            const entropy = cpu / 100;

            let targetX = 0, targetY = 0, totalW = 0;
            sectors.forEach((key, i) => {
                const angle = (i / sectors.length) * Math.PI * 2 - Math.PI / 2;
                const w = weights[key];
                const rX = canvas.width * 0.38, rY = canvas.height * 0.38;
                const sx = cx + Math.cos(angle) * rX, sy = cy + Math.sin(angle) * rY;
                targetX += sx * w; targetY += sy * w; totalW += w;

                if (w > 120) {
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1 + w/120, 0, Math.PI * 2);
                    ctx.fillStyle = w > 220 ? '#fff' : '#9d4edd22';
                    ctx.fill();
                }
            });

            currC.current.x += (targetX / totalW - currC.current.x) * 0.03;
            currC.current.y += (targetY / totalW - currC.current.y) * 0.03;

            const activeShards = [...shards.current];
            activeShards.forEach((s, i) => {
                const dx = currC.current.x - s.x;
                const dy = currC.current.y - s.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;

                s.vx += (dx / dist) * 0.12 * coherence;
                s.vy += (dy / dist) * 0.12 * coherence;
                s.vx *= 0.98; s.vy *= 0.98;
                s.x += s.vx; s.y += s.vy;
                s.rotation += s.rv + entropy * 0.04;

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation);
                
                const baseAlpha = s.opacity * (0.3 + coherence * 0.7);
                ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${baseAlpha})`;
                ctx.beginPath();
                const radius = s.size;
                ctx.moveTo(0, -radius);
                ctx.lineTo(radius * 0.8, radius * 0.6);
                ctx.lineTo(-radius * 0.8, radius * 0.6);
                ctx.fill();
                ctx.restore();
            });

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [weights, cpu, integrity]);

    return (
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-6 h-full flex flex-col group shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.01)_0%,transparent_95%)] pointer-events-none" />
            <div className="flex justify-between items-center mb-1 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <Atom size={16} className="text-[#9d4edd] animate-spin-slow opacity-30" />
                    <span className="text-[9px] font-black font-mono text-white uppercase tracking-[0.4em]">Neural Core</span>
                </div>
                <div className="text-[6px] font-mono text-gray-700 uppercase tracking-tighter">Sync_LOCKED</div>
            </div>
            <canvas ref={canvasRef} className="flex-1 w-full min-h-0" />
            <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[6px] font-black font-mono text-gray-800 uppercase tracking-[0.3em] z-10 pointer-events-none pt-4 border-t border-white/5">
                <span>Entropy: {Math.round(cpu)}%</span>
            </div>
        </div>
    );
};

// --- DATA VISUALIZATION MODULES ---

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
            <div className="flex items-center gap-1.5 text-[8px] font-mono text-gray-700 uppercase">{detail}</div>
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

const DrivePARAIntegrity = ({ health, syncProgress }: { health: number, syncProgress: number }) => (
    <div className="bg-[#050505] border border-white/5 rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden h-[220px] shadow-inner">
        <div className="absolute top-0 right-0 p-5 opacity-[0.01] -rotate-12"><HardDrive size={100} /></div>
        <div className="flex items-center justify-between relative z-10 px-1">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                    <Boxes size={16} />
                </div>
                <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Drive Matrix</span>
            </div>
            <span className="text-[9px] font-mono text-gray-700 uppercase">{health}% Health</span>
        </div>
        
        <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center px-1">
            {[
                { label: 'Project', val: 94, color: '#9d4edd', usage: '12GB' },
                { label: 'Area', val: 82, color: '#22d3ee', usage: '42GB' },
                { label: 'Resource', val: 71, color: '#f59e0b', usage: '118GB' },
                { label: 'Archive', val: 99, color: '#10b981', usage: '2.4TB' }
            ].map((cat) => (
                <div key={cat.label} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                        <span>{cat.label}</span>
                        <span className="text-gray-500 font-bold">{cat.usage}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${cat.val}%` }} className="h-full" style={{ backgroundColor: cat.color }} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SwarmHiveControl = () => {
    const { agents } = useAppStore();
    const activeAccent = useAppStore(s => s.dashboard.activeThemeColor) || '#9d4edd';

    return (
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-5 flex flex-col gap-5 h-[280px] relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#9d4edd]/5 rounded-xl border border-[#9d4edd]/10 text-[#9d4edd]">
                        <Users size={16} />
                    </div>
                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.3em]">Swarm Hive</span>
                </div>
            </div>
            
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10">
                {agents.activeAgents.map(agent => (
                    <div key={agent.id} className="p-3 bg-[#0a0a0a] border border-white/5 rounded-xl hover:border-[#9d4edd]/30 transition-all flex items-center justify-between group/agent">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
                            <span className="text-[10px] font-black text-gray-500 uppercase truncate group-hover/agent:text-white">{agent.name}</span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-[8px] font-mono text-gray-700 uppercase">{agent.energyLevel}% ENG</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full py-2 bg-[#111] border border-white/5 hover:border-[#9d4edd]/40 rounded-xl text-[9px] font-black font-mono uppercase tracking-[0.3em] transition-all text-gray-700 shrink-0">
                Register_Node
            </button>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState, user, toggleProfile, system, addLog, openHoloProjector, setMode, setProcessState, voice, setVoiceState } = useAppStore();
  const accent = dashboard.activeThemeColor || '#9d4edd';

  const [telemetry, setTelemetry] = useState({ cpu: 14.5, net: 1.2, mem: 64, load: 88, fan: 2400 });
  const [cpuHistory, setCpuHistory] = useState<{value: number}[]>([]);
  const [netHistory, setNetHistory] = useState<{value: number}[]>([]);
  const [memHistory, setMemHistory] = useState<{value: number}[]>([]);
  const [loadHistory, setLoadHistory] = useState<{value: number}[]>([]);

  // Integrated Voice State
  const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
  const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);
  const [showDialogueStream, setShowDialogueStream] = useState(true);
  const voiceScrollRef = useRef<HTMLDivElement>(null);
  const agentAvatar = voice.agentAvatars[voice.voiceName] || null;
  const [isGeneratingAgentAvatar, setIsGeneratingAgentAvatar] = useState(false);

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

  useEffect(() => {
      let rafId: number;
      const loop = () => {
          if (voice.isActive) {
              setUserFreqs(liveSession.getInputFrequencies());
              setAgentFreqs(liveSession.getOutputFrequencies());
          } else {
              setUserFreqs(null);
              setAgentFreqs(null);
          }
          rafId = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(rafId);
  }, [voice.isActive]);

  useEffect(() => {
      if (voiceScrollRef.current) voiceScrollRef.current.scrollTop = voiceScrollRef.current.scrollHeight;
  }, [voice.transcripts, voice.partialTranscript]);

  useEffect(() => {
      if (!agentAvatar && !isGeneratingAgentAvatar) {
          const triggerAgentGen = async () => {
              setIsGeneratingAgentAvatar(true);
              try {
                  const hasKey = await window.aistudio?.hasSelectedApiKey();
                  if (hasKey) {
                      const agent = HIVE_AGENTS[voice.voiceName] || HIVE_AGENTS['Puck'];
                      const url = await generateAvatar(agent.id, agent.name);
                      setVoiceState(prev => ({ 
                          agentAvatars: { ...prev.agentAvatars, [voice.voiceName]: url } 
                      }));
                  }
              } catch (e) {} finally {
                  setIsGeneratingAgentAvatar(false);
              }
          };
          triggerAgentGen();
      }
  }, [voice.voiceName, agentAvatar, setVoiceState, isGeneratingAgentAvatar]);

  const toggleVoiceSession = async () => {
    if (voice.isActive || voice.isConnecting) {
        liveSession.disconnect();
        setVoiceState({ isActive: false, isConnecting: false });
        addLog('SYSTEM', 'VOICE_CORE: Severed.');
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
            addLog('SUCCESS', 'VOICE_CORE: Handshake stable.');
            audio.playSuccess();
        } catch (err: any) {
            setVoiceState({ isConnecting: false });
        }
    }
  };

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
      
      {/* Protocol Ticker */}
      <div className="h-6 bg-black border-b border-white/5 flex items-center overflow-hidden shrink-0 z-50 relative">
          <div className="flex gap-12 animate-marquee whitespace-nowrap px-4 items-center">
              {[
                  { label: 'Uplink', val: 'STABLE', color: '#10b981' },
                  { label: 'Entropy', val: `${(telemetry.cpu / 100).toFixed(3)}v`, color: '#9d4edd' },
                  { label: 'Drive_Sync', val: 'CONNECTED', color: '#22d3ee' },
                  { label: 'Lattice', val: 'ITERATION_8.0', color: '#10b981' },
                  { label: 'Kernel', val: 'v8.1.0-Z', color: '#9d4edd' }
              ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                      <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">{t.label}:</span>
                      <span className="text-[8px] font-black font-mono" style={{ color: t.color }}>{t.val}</span>
                  </div>
              ))}
          </div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto p-6 space-y-12 pb-32">
          
          {/* Header Cluster */}
          <div className="flex justify-between items-end pb-4 border-b border-white/5">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
                      <span className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-[0.4em]">Sovereign_Alpha</span>
                  </div>
                  <h1 className="text-4xl font-black font-mono text-white tracking-tighter uppercase leading-none italic">Metaventions AI</h1>
              </div>

              <div className="flex items-center gap-6 pb-1">
                  <button onClick={() => toggleProfile(true)} className="flex items-center gap-4 group">
                      <div className="text-right">
                          <div className="text-[10px] font-black text-white group-hover:text-[#9d4edd] transition-colors uppercase tracking-widest">{user.displayName}</div>
                          <div className="text-[7px] font-mono text-gray-600 uppercase tracking-tighter mt-1">AUTH_L05</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl border border-white/5 overflow-hidden bg-black flex items-center justify-center group-hover:border-[#9d4edd]/40 transition-all shadow-2xl">
                          {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User" /> : <User className="text-gray-700" size={16}/>}
                      </div>
                  </button>
              </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-12 gap-6">
              
              {/* Left Column: Telemetry & Swarm */}
              <div className="col-span-3 space-y-6 flex flex-col h-[1000px]">
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                      <CompactMetric title="CPU" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={CpuIcon} color={accent} data={cpuHistory} />
                      <CompactMetric title="NET" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Network} color={accent} data={netHistory} />
                      <CompactMetric title="MEM" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color={accent} data={memHistory} />
                      <CompactMetric title="INTEGRITY" value={`${telemetry.load.toFixed(1)}`} detail="Auth_OK" icon={Shield} color="#10b981" data={loadHistory} />
                  </div>
                  
                  <div className="shrink-0">
                    <SwarmHiveControl />
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    <PrismaticLatticeCore cpu={telemetry.cpu} integrity={telemetry.load} />
                  </div>
              </div>

              {/* Center Stage: Interactive Viewport */}
              <div className="col-span-6 flex flex-col gap-6 h-[1000px]">
                  <div className="flex-1 bg-[#020202] border border-white/5 rounded-3xl relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      
                      {/* Main Hub Projection */}
                      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                          <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
                          
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

                      {/* Viewport Controls */}
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

                  {/* Handover Ledger Log */}
                  <div className="h-44 bg-[#050505] border border-white/5 rounded-3xl p-5 flex flex-col gap-4 shadow-xl relative overflow-hidden group/log">
                      <div className="flex items-center justify-between px-1 border-b border-white/5 pb-3 shrink-0">
                          <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Handover Ledger</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse" />
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[9px] pr-3">
                          {system.logs.slice(-15).reverse().map((log: any, i: number) => (
                              <div key={i} className="flex gap-3 items-start border-l border-white/5 pl-3 py-1">
                                  <span className="text-[#9d4edd]/50 font-black shrink-0">>></span>
                                  <span className={cn(
                                      "flex-1 break-all tracking-tight",
                                      log.level === 'ERROR' ? 'text-red-900' : 'text-gray-500 hover:text-gray-300 transition-colors'
                                  )}>
                                      {(log.message || "").toString()}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Right Column: Style & PARA */}
              <div className="col-span-3 space-y-6 flex flex-col h-[1000px]">
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

                  <DrivePARAIntegrity health={Math.round(telemetry.load)} syncProgress={Math.round(telemetry.load - 5)} />
                  
                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col">
                      <div className="flex items-center gap-3 mb-4 shrink-0 px-1">
                          <Activity size={16} className="text-[#22d3ee] animate-pulse" />
                          <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Logic Flow Dynamics</span>
                      </div>
                      <div className="flex-1 bg-black rounded-2xl border border-white/5 relative overflow-hidden shadow-inner">
                          <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                  <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                                  <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                                  <Scatter name="Nodes" data={Array.from({length: 30}, () => ({x: Math.random()*100, y: Math.random()*100}))}>
                                      {Array.from({length: 30}).map((_, i) => <Cell key={i} fill={i % 4 === 0 ? accent : '#1a1a1a'} opacity={0.4} />)}
                                  </Scatter>
                              </ScatterChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>

          {/* --- INNOVATED VOICE CORE TERMINAL (HIGH DENSITY + NODE EXPANSION) --- */}
          <div className="pt-24 border-t border-white/5">
              <div 
                className="w-full bg-[#010101] flex flex-col relative overflow-hidden font-sans border border-white/10 rounded-[5rem] shadow-[0_0_200px_rgba(0,0,0,1)] group/voicestudio h-[2600px]"
              >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(241,194,27,0.02)_0%,transparent_90%)] pointer-events-none" />
                  
                  <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 50)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 50)} />

                  {/* High Density Header */}
                  <div className="h-20 flex justify-between items-center px-16 bg-[#080808]/95 backdrop-blur-3xl border-b border-white/5 z-30 shrink-0 relative">
                      <div className="flex items-center gap-8">
                          <div className="p-4 bg-[#22d3ee]/5 border border-[#22d3ee]/20 rounded-[1.2rem]">
                            <Radio size={22} className={voice.isActive ? 'text-[#22d3ee] animate-pulse' : 'text-gray-700'} />
                          </div>
                          <div className="flex flex-col">
                              <span className="text-sm font-black font-mono uppercase tracking-[0.6em] text-white leading-none">Voice Core Protocol</span>
                              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.3em] mt-2">
                                {voice.isActive ? 'UPLINK_STABLE // 16-BIT_PCM' : 'STANDBY // AWAITING_HANDSHAKE'}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                           <div className="flex items-center gap-5 bg-black/70 border border-white/5 px-6 py-3 rounded-2xl shadow-inner">
                               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Node</span>
                               <div className="h-4 w-px bg-white/10" />
                               <select 
                                value={voice.voiceName} 
                                onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                                disabled={voice.isActive} 
                                className="bg-transparent text-xs font-black font-mono text-[#f1c21b] outline-none uppercase cursor-pointer transition-colors hover:text-white"
                               >
                                    {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                                </select>
                           </div>
                      </div>
                  </div>

                  {/* EXPANDED CORE NODE SECTOR */}
                  <div className="h-[750px] flex items-center justify-center gap-40 p-16 relative overflow-hidden shrink-0">
                     
                     {/* Operator Node */}
                     <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-center gap-12"
                     >
                        <div className="flex items-center gap-4 px-8 py-2.5 rounded-full bg-white/5 border border-white/10 shadow-lg opacity-60">
                            <Target size={18} className="text-[#22d3ee]" />
                            <span className="text-[11px] font-black text-[#22d3ee] uppercase tracking-[0.5em]">Operator_Enclave</span>
                        </div>
                        <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
                     </motion.div>

                     {/* Central Control Hub */}
                     <div className="flex flex-col items-center gap-12 relative pt-8">
                        <div className={`absolute -inset-24 border-2 border-dashed rounded-full pointer-events-none transition-all duration-[3000ms] ${voice.isActive ? 'border-[#f1c21b]/20 animate-[spin_60s_linear_infinite]' : 'opacity-0'}`} />
                        <div className={`absolute -inset-16 border border-white/5 rounded-full pointer-events-none transition-all duration-[2000ms] ${voice.isActive ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`} />
                        
                        <button 
                            onClick={toggleVoiceSession} 
                            disabled={voice.isConnecting}
                            className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 overflow-hidden border-4
                                ${voice.isActive 
                                    ? 'bg-red-950/80 border-red-500/40 shadow-[0_0_120px_rgba(239,68,68,0.3)] rotate-90 scale-105' 
                                    : 'bg-[#0a0a0a] border-[#f1c21b]/20 shadow-[0_0_80px_rgba(241,194,27,0.15)] hover:border-[#f1c21b]/50 hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            <div className="relative z-20">
                                {voice.isConnecting ? <Loader2 className="animate-spin text-[#f1c21b] w-12 h-12" /> : voice.isActive ? <Power className="text-red-500 w-12 h-12" /> : <Mic className="text-[#f1c21b] w-12 h-12" />}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] to-transparent pointer-events-none" />
                        </button>
                        
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.8em] transition-all drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                                {voice.isActive ? 'SEVER_UPLINK' : 'ENGAGE_LATTICE'}
                            </span>
                        </div>
                     </div>

                     {/* AI Node */}
                     <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-center gap-12"
                     >
                        <div className="flex items-center gap-4 px-8 py-2.5 rounded-full bg-white/5 border border-white/10 shadow-lg opacity-60">
                            <BotIcon size={18} className="text-[#f1c21b]" />
                            <span className="text-[11px] font-black text-[#f1c21b] uppercase tracking-[0.5em]">Lattice_AI_Core</span>
                        </div>
                        <CognitiveLattice 
                            image={agentAvatar} 
                            freqs={agentFreqs} 
                            color="#f1c21b" 
                            isAgent={true} 
                            isThinking={voice.isActive && !!voice.partialTranscript}
                        />
                     </motion.div>
                  </div>

                  {/* SYMMETRICAL NEURAL PACKET STREAM (LEDGER) */}
                  <div className="flex-1 border-t border-white/10 bg-[#050505]/98 backdrop-blur-3xl p-16 flex flex-col min-h-0 relative">
                      <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-10 shrink-0">
                        <div className="flex items-center gap-8">
                            <div className="p-4 bg-[#f1c21b]/10 border border-[#f1c21b]/30 rounded-[1.5rem] relative shadow-[0_0_40px_rgba(241,194,27,0.1)]">
                                <Binary size={24} className="text-[#f1c21b]" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#f1c21b] rounded-full animate-ping" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black uppercase tracking-[0.5em] text-white">Synaptic Ledger</span>
                                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mt-2 flex items-center gap-3">
                                    <History size={12} /> Bilateral Transmission // {voice.transcripts.length} packets cached
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-4 text-[10px] font-mono text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 px-6 py-2.5 rounded-2xl border border-emerald-500/30">
                                <ShieldCheck size={16} /> L0_GROUNDED
                            </div>
                            <button onClick={() => { setShowDialogueStream(!showDialogueStream); audio.playClick(); }} className="text-gray-700 hover:text-white transition-all active:scale-90 p-3 bg-white/5 rounded-2xl border border-white/10">
                                <ChevronDown size={22} className={showDialogueStream ? '' : 'rotate-180'} />
                            </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-base leading-relaxed pr-10" ref={voiceScrollRef}>
                          <AnimatePresence initial={false}>
                              {showDialogueStream && voice.transcripts.map((t, i) => {
                                  const isUser = (t.role || '').toLowerCase() === 'user';
                                  const currentAvatar = isUser ? user.avatar : agentAvatar;
                                  
                                  return (
                                      <motion.div 
                                        initial={{ opacity: 0, y: 30, scale: 0.99 }} 
                                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                                        key={i} 
                                        className={`mb-12 flex gap-12 p-12 rounded-[4rem] border transition-all duration-1000 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative group/card overflow-hidden
                                            ${isUser 
                                                ? 'bg-[#22d3ee]/5 border-[#22d3ee]/20 flex-row-reverse text-[#22d3ee]' 
                                                : 'bg-[#f1c21b]/5 border-[#f1c21b]/20 text-[#f1c21b]'
                                            }`}
                                      >
                                          <div className={`w-20 h-20 rounded-[2rem] border-2 flex items-center justify-center shrink-0 shadow-2xl transition-transform duration-1000 group-hover/card:scale-110 relative z-10 overflow-hidden bg-[#0a0a0a]
                                              ${isUser ? 'border-[#22d3ee]/50' : 'border-[#f1c21b]/50'}`}>
                                              {currentAvatar ? (
                                                  <img src={currentAvatar} className="w-full h-full object-cover" alt="Node" />
                                              ) : (
                                                  isUser ? <User size={36} /> : <BotIcon size={36} />
                                              )}
                                          </div>
                                          <div className={`flex-1 relative z-10 ${isUser ? 'text-right' : 'text-left'}`}>
                                              <div className={`flex items-center gap-4 mb-5 opacity-60 uppercase text-[10px] font-black tracking-[0.5em] ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                  {isUser ? (
                                                      <>
                                                        <PulseIcon size={12} className="text-[#22d3ee]" />
                                                        <span>Live_Neural_Ingest</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                                        <span>ACK_OK</span>
                                                      </>
                                                  ) : (
                                                      <>
                                                        <Languages size={12} className="text-[#f1c21b]" />
                                                        <span className="text-[#f1c21b]">Live_Neural_Synthesis</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#f1c21b]/30" />
                                                        <span>LATTICE_SYNC</span>
                                                      </>
                                                  )}
                                              </div>
                                              <p className="text-gray-100 font-medium tracking-tight text-2xl selection:bg-current selection:text-black leading-relaxed">{(t.text || '').toString()}</p>
                                              
                                              <div className={`mt-8 flex items-center gap-10 opacity-25 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                  <div className="flex items-center gap-2">
                                                      <Hash size={12} />
                                                      <span className="text-[9px] font-mono tracking-widest">PKT_{i.toString().padStart(4, '0')}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <Zap size={12} />
                                                      <span className="text-[9px] font-mono tracking-widest">LTNCY_14ms</span>
                                                  </div>
                                                  <span className="text-[11px] font-mono tracking-widest">{new Date(t.timestamp).toLocaleTimeString()}</span>
                                              </div>
                                          </div>
                                      </motion.div>
                                  );
                              })}
                          </AnimatePresence>

                          {/* LIVE NEURAL TRANSLATION (SYMMETRICAL) */}
                          {voice.partialTranscript && (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-12 p-12 rounded-[4rem] border border-dashed opacity-60 mb-12 transition-all duration-700
                                    ${voice.partialTranscript.role === 'user' 
                                        ? 'bg-[#22d3ee]/5 border-[#22d3ee]/40 flex-row-reverse text-[#22d3ee]' 
                                        : 'bg-[#f1c21b]/5 border-[#f1c21b]/40 text-[#f1c21b]'
                                    }`}
                              >
                                  <div className={`w-20 h-20 rounded-[2rem] border-2 flex items-center justify-center shrink-0 shadow-2xl overflow-hidden bg-black
                                      ${voice.partialTranscript.role === 'user' ? 'border-[#22d3ee]/30' : 'border-[#f1c21b]/30'}`}>
                                      {(voice.partialTranscript.role === 'user' ? user.avatar : agentAvatar) ? (
                                          <img src={voice.partialTranscript.role === 'user' ? user.avatar! : agentAvatar!} className="w-full h-full object-cover opacity-50 grayscale contrast-125" />
                                      ) : (
                                          <Loader2 size={36} className="animate-spin text-current opacity-40" />
                                      )}
                                  </div>
                                  <div className={`flex-1 ${voice.partialTranscript.role === 'user' ? 'text-right' : 'text-left'}`}>
                                      <div className={`flex items-center gap-4 mb-5 opacity-40 uppercase text-[10px] font-black tracking-[0.5em] ${voice.partialTranscript.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                          <Loader2 size={12} className="animate-spin" />
                                          <span>Neural_Translation_Buffer</span>
                                      </div>
                                      <p className="text-gray-300 italic text-2xl">{(voice.partialTranscript.text || '').toString()}_</p>
                                  </div>
                              </motion.div>
                          )}

                          {voice.transcripts.length === 0 && !voice.partialTranscript && (
                              <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-48 grayscale">
                                  <Waves size={160} className="mb-12 text-gray-500 animate-pulse" />
                                  <p className="text-4xl font-mono uppercase tracking-[1.2em]">Acoustic Cache Null</p>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* OS Tactical HUD Footer */}
                  <div className="h-16 bg-[#050505] border-t border-white/5 px-16 flex items-center justify-between text-[11px] font-mono text-gray-700 shrink-0 relative z-[60]">
                    <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                        <div className="flex items-center gap-6 text-emerald-900 font-bold uppercase tracking-[0.3em]">
                            <ShieldCheck size={20} className="shadow-[0_0_25px_rgba(16,185,129,0.25)]" /> Handshake_Secure
                        </div>
                        <div className="flex items-center gap-6 uppercase tracking-[0.5em]">
                            <GitBranch size={20} className="text-[#f1c21b]" /> Kernel: EXECUTIVE_DIRECTIVE
                        </div>
                        <div className="flex items-center gap-6 uppercase tracking-[0.5em]">
                            <Globe size={20} className="text-[#22d3ee]" /> Node: SOVEREIGN_ALPHA
                        </div>
                    </div>
                    <div className="flex items-center gap-16 shrink-0">
                        <span className="uppercase tracking-[0.7em] opacity-40 text-[10px] hidden lg:block">Arch v9.5 // Neural Link Prime</span>
                        <div className="h-6 w-px bg-white/10 hidden lg:block" />
                        <span className="font-black text-gray-500 uppercase tracking-widest text-xs">SYSTEM_CORE</span>
                    </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
