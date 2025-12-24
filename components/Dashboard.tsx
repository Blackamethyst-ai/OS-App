
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
    ChevronUp, Volume2, Timer, History, Languages
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
                    const r = 60 + Math.random() * 40;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5,
                        life: 1.0,
                        color: userActive ? '#22d3ee' : agentActive ? '#f1c21b' : '#9d4edd'
                    });
                }
            }

            particles.current.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.0025; 

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
            scale: [1, 1 + (volume / 400), 1],
            opacity: [opacity, opacity * 1.5, opacity] 
        }}
        transition={{ duration, repeat: Infinity, ease: "linear", delay }}
        className="absolute rounded-full border border-dashed pointer-events-none"
        style={{ 
            width: radius * 2, 
            height: radius * 2, 
            borderColor: color,
            filter: `drop-shadow(0 0 ${3 + volume/30}px ${color})`
        }}
    >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-0.5 h-0.5 rounded-full bg-white opacity-40" />
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

            const nodeCount = 5;
            for(let i=0; i<nodeCount; i++) {
                const angle = (i / nodeCount) * Math.PI * 2 + time * (isAgent ? 1.0 : -0.8);
                const r = 70 + Math.sin(time * 2 + i) * 6;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                
                ctx.beginPath();
                ctx.arc(px, py, 1 + normalizedVol * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.2 + normalizedVol * 0.5;
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(px, py);
                ctx.strokeStyle = `${color}06`;
                ctx.stroke();
            }

            const threadCount = 10;
            const baseRadius = 50;
            ctx.lineWidth = 0.2;
            for (let i = 0; i < threadCount; i++) {
                const angle = (i / threadCount) * Math.PI * 2 + time * 0.1;
                const r = baseRadius + Math.sin(time * 3 + i) * 8 * normalizedVol;
                const tx = cx + Math.cos(angle) * r;
                const ty = cy + Math.sin(angle) * r;

                ctx.beginPath();
                ctx.strokeStyle = `${color}${Math.floor((0.02 + normalizedVol * 0.2) * 255).toString(16).padStart(2, '0')}`;
                ctx.moveTo(cx, cy);
                ctx.quadraticCurveTo(cx + Math.cos(angle + 0.6) * (r * 0.6), cy + Math.sin(angle + 0.6) * (r * 0.6), tx, ty);
                ctx.stroke();
            }

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [volume, color, isAgent, isThinking]);

    return (
        <div className="relative w-40 h-40 flex items-center justify-center group/node">
            <AnimatePresence>
                <TelemetryRing color={color} duration={30} delay={0} radius={65} volume={volume} opacity={0.08} />
                <TelemetryRing color={color} duration={18} delay={0.3} radius={80} volume={volume} opacity={0.04} />
                {isThinking && <TelemetryRing color="#f1c21b" duration={5} delay={0} radius={95} volume={volume * 1.2} opacity={0.15} />}
            </AnimatePresence>
            
            <canvas ref={canvasRef} className="absolute inset-[-50px] w-[calc(100%+100px)] h-[calc(100%+100px)] pointer-events-none z-0 opacity-40 group-hover/node:opacity-80 transition-opacity" />
            
            <motion.div 
                whileHover={{ scale: 1.05 }}
                className={`relative z-10 w-28 h-28 rounded-full border border-white/5 overflow-hidden bg-[#020202] shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-all duration-[1000ms] ${isThinking ? 'border-[#f1c21b]/20 scale-105 shadow-[0_0_20px_rgba(241,194,27,0.1)]' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[40%] contrast-110 group-hover/node:grayscale-0 transition-all duration-[800ms]" alt="Node" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {isAgent ? <BotIcon size={32} className="text-gray-800" /> : <User size={32} className="text-gray-800" />}
                    </div>
                )}
                
                {isThinking && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center">
                         <div className="relative">
                            <Loader2 className="w-6 h-6 text-[#f1c21b] animate-spin mb-1" />
                            <div className="absolute inset-0 bg-[#f1c21b]/10 blur-xl animate-pulse" />
                         </div>
                         <span className="text-[6px] font-black font-mono text-[#f1c21b] uppercase tracking-[0.4em]">Scan</span>
                    </div>
                )}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.08)_50%)] z-20 bg-[length:100%_4px] opacity-15" />
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
                    size: 5 + Math.random() * 8, opacity: 0.1 + Math.random() * 0.5,
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
                    ctx.arc(sx, sy, 1 + w/150, 0, Math.PI * 2);
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

                s.vx += (dx / dist) * 0.1 * coherence;
                s.vy += (dy / dist) * 0.1 * coherence;
                s.vx *= 0.98; s.vy *= 0.98;
                s.x += s.vx; s.y += s.vy;
                s.rotation += s.rv + entropy * 0.03;

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation);
                
                const baseAlpha = s.opacity * (0.3 + coherence * 0.7);
                ctx.fillStyle = `hsla(${s.hue}, 70%, 60%, ${baseAlpha})`;
                ctx.beginPath();
                const radius = s.size;
                ctx.moveTo(0, -radius);
                ctx.lineTo(radius * 0.7, radius * 0.6);
                ctx.lineTo(-radius * 0.7, radius * 0.6);
                ctx.fill();
                ctx.restore();
            });

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [weights, cpu, integrity]);

    return (
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 h-full flex flex-col group shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.01)_0%,transparent_95%)] pointer-events-none" />
            <div className="flex justify-between items-center mb-1 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <Atom size={12} className="text-[#9d4edd] animate-spin-slow opacity-30" />
                    <span className="text-[7px] font-black font-mono text-white uppercase tracking-[0.4em]">Neural Core</span>
                </div>
                <div className="text-[6px] font-mono text-gray-700 uppercase tracking-tighter">Sync_LOCKED</div>
            </div>
            <canvas ref={canvasRef} className="flex-1 w-full min-h-0" />
            <div className="absolute bottom-3 left-6 right-6 flex justify-between text-[6px] font-black font-mono text-gray-800 uppercase tracking-[0.3em] z-10 pointer-events-none pt-2 border-t border-white/5">
                <span>Entropy: {Math.round(cpu)}%</span>
            </div>
        </div>
    );
};

// --- DATA VISUALIZATION MODULES ---

const CompactMetric = ({ title, value, detail, icon: Icon, color, data, trend }: any) => (
    <div className="bg-[#050505] border border-white/5 rounded-xl p-2.5 relative overflow-hidden group shadow-xl h-20 flex flex-col justify-between transition-all hover:border-white/10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-15" style={{ '--accent': color } as any}></div>
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-white/5 border border-white/5 text-gray-700 group-hover:text-white transition-colors">
                    <Icon size={9} style={{ color: color }} />
                </div>
                <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex items-center gap-1 text-[6px] font-mono text-gray-700 uppercase">{detail}</div>
        </div>
        <div className="flex items-end justify-between">
            <div className="text-lg font-black font-mono text-white tracking-tighter leading-none">{value}</div>
            <div className="h-6 w-12 opacity-10 group-hover:opacity-100 transition-opacity">
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
    <div className="bg-[#050505] border border-white/5 rounded-2xl p-3 flex flex-col gap-3 relative overflow-hidden h-[180px] shadow-inner">
        <div className="absolute top-0 right-0 p-3 opacity-[0.01] -rotate-12"><HardDrive size={80} /></div>
        <div className="flex items-center justify-between relative z-10 px-1">
            <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                    <Boxes size={12} />
                </div>
                <span className="text-[8px] font-black font-mono text-white uppercase tracking-[0.2em]">Drive Matrix</span>
            </div>
            <span className="text-[7px] font-mono text-gray-700 uppercase">{health}% Health</span>
        </div>
        
        <div className="space-y-2 relative z-10 flex-1 flex flex-col justify-center px-1">
            {[
                { label: 'Proj', val: 94, color: '#9d4edd', usage: '12G' },
                { label: 'Area', val: 82, color: '#22d3ee', usage: '42G' },
                { label: 'Reso', val: 71, color: '#f59e0b', usage: '118G' },
                { label: 'Arch', val: 99, color: '#10b981', usage: '2.4T' }
            ].map((cat) => (
                <div key={cat.label} className="space-y-1">
                    <div className="flex justify-between items-center text-[6px] font-mono text-gray-600 uppercase tracking-widest">
                        <span>{cat.label}</span>
                        <span className="text-gray-500 font-bold">{cat.usage}</span>
                    </div>
                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
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
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-3 flex flex-col gap-3 h-[240px] relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between relative z-10 px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-[#9d4edd]/5 rounded-lg border border-[#9d4edd]/10 text-[#9d4edd]">
                        <Users size={12} />
                    </div>
                    <span className="text-[8px] font-black font-mono text-white uppercase tracking-[0.2em]">Swarm Hive</span>
                </div>
            </div>
            
            <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10">
                {agents.activeAgents.map(agent => (
                    <div key={agent.id} className="p-2 bg-[#0a0a0a] border border-white/5 rounded-xl hover:border-[#9d4edd]/30 transition-all flex items-center justify-between group/agent">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-1 h-1 rounded-full bg-[#10b981] shrink-0" />
                            <span className="text-[8px] font-black text-gray-500 uppercase truncate group-hover/agent:text-white">{agent.name}</span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-[6px] font-mono text-gray-700 uppercase">{agent.energyLevel}% ENG</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full py-1.5 bg-[#111] border border-white/5 hover:border-[#9d4edd]/40 rounded-xl text-[7px] font-black font-mono uppercase tracking-[0.2em] transition-all text-gray-700 shrink-0">
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

      <div className="relative z-10 max-w-[1920px] mx-auto p-4 space-y-8 pb-32">
          
          {/* Header Cluster */}
          <div className="flex justify-between items-end pb-2 border-b border-white/5">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse"></div>
                      <span className="text-[7px] font-black font-mono text-gray-700 uppercase tracking-[0.4em]">Sovereign_Alpha</span>
                  </div>
                  <h1 className="text-3xl font-black font-mono text-white tracking-tighter uppercase leading-none italic">Metaventions AI</h1>
              </div>

              <div className="flex items-center gap-6 pb-1">
                  <button onClick={() => toggleProfile(true)} className="flex items-center gap-2.5 group">
                      <div className="text-right">
                          <div className="text-[8px] font-black text-white group-hover:text-[#9d4edd] transition-colors uppercase tracking-widest">{user.displayName}</div>
                          <div className="text-[6px] font-mono text-gray-600 uppercase tracking-tighter">AUTH_L05</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg border border-white/5 overflow-hidden bg-black flex items-center justify-center group-hover:border-[#9d4edd]/40 transition-all shadow-xl">
                          {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User" /> : <User className="text-gray-700" size={14}/>}
                      </div>
                  </button>
              </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-12 gap-4">
              
              {/* Left Column: Telemetry & Swarm (Denser) */}
              <div className="col-span-3 space-y-4 flex flex-col h-[900px]">
                  <div className="grid grid-cols-2 gap-2.5 shrink-0">
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
              <div className="col-span-6 flex flex-col gap-4 h-[900px]">
                  <div className="flex-1 bg-[#020202] border border-white/5 rounded-2xl relative overflow-hidden group shadow-2xl flex flex-col transition-all">
                      
                      {/* Main Hub Projection */}
                      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                          <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                          
                          {dashboard.identityUrl ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full rounded-xl overflow-hidden border border-white/5 shadow-2xl"
                              >
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-105" alt="Hub" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50" />
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-4 opacity-10 group-hover/viewport:opacity-25 transition-all duration-1000 text-center">
                                  <Radar size={48} className="text-gray-500 animate-[spin_60s_linear_infinite]" />
                                  <p className="text-xs font-mono uppercase tracking-[0.4em] text-white">Hub_Standby</p>
                              </div>
                          )}
                      </div>

                      {/* Viewport Controls (Denser) */}
                      <div className="h-12 border-t border-white/5 bg-[#050505] flex items-center justify-between px-6 shrink-0">
                         <div className="flex gap-2">
                             {[
                                { label: 'Sync', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#9d4edd' }
                             ].map((btn) => (
                                 <button 
                                    key={btn.label}
                                    onClick={() => { btn.action(); audio.playClick(); }} 
                                    className="px-3 py-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-[8px] font-black font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
                                 >
                                     <btn.icon size={10} style={{ color: btn.color }} /> 
                                     {btn.label}
                                 </button>
                             ))}
                         </div>
                         
                         <button 
                            onClick={handleIdentityGen} 
                            disabled={dashboard.isGenerating}
                            className="px-4 py-1.5 bg-[#9d4edd] text-black rounded-lg text-[8px] font-black font-mono uppercase tracking-[0.2em] transition-all flex items-center gap-2 hover:bg-[#b06bf7] active:scale-95 disabled:opacity-50"
                         >
                            {dashboard.isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            Forge_Identity
                         </button>
                      </div>
                  </div>

                  {/* Handover Ledger Log (Denser) */}
                  <div className="h-40 bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-xl relative overflow-hidden group/log">
                      <div className="flex items-center justify-between px-1 border-b border-white/5 pb-2 shrink-0">
                          <span className="text-[8px] font-black font-mono text-white uppercase tracking-[0.3em]">Handover Ledger</span>
                          <div className="w-1 h-1 rounded-full bg-[#10b981] shadow-[0_0_5px_#10b981] animate-pulse" />
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 font-mono text-[8px] pr-2">
                          {system.logs.slice(-10).reverse().map((log: any, i: number) => (
                              <div key={i} className="flex gap-2 items-start border-l border-white/5 pl-2 py-0.5">
                                  <span className="text-[#9d4edd]/40 font-black shrink-0">>></span>
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

              {/* Right Column: Style & PARA (Denser) */}
              <div className="col-span-3 space-y-4 flex flex-col h-[900px]">
                  <div className="bg-[#050505] border border-white/5 rounded-2xl p-3 flex flex-col gap-3 shadow-xl group/ref relative overflow-hidden h-[150px]">
                      <div className="flex items-center gap-1.5 relative z-10">
                          <Target size={10} className="text-[#9d4edd]" />
                          <span className="text-[8px] font-black font-mono text-white uppercase tracking-widest">Style Matrix</span>
                      </div>
                      <div className="flex-1 relative rounded-xl border border-dashed border-white/5 bg-black flex items-center justify-center overflow-hidden">
                          {dashboard.referenceImage ? (
                                <div className="relative w-full h-full group/preview">
                                    <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[60%] group-hover/preview:grayscale-0 transition-all duration-700" alt="Ref" />
                                    <button onClick={() => { setDashboardState({ referenceImage: null }); audio.playClick(); }} className="absolute top-1 right-1 p-1 bg-red-900/20 text-red-500 rounded-lg opacity-0 group-hover/preview:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                </div>
                          ) : (
                                <label className="flex flex-col items-center gap-1 cursor-pointer group/label">
                                    <Upload size={14} className="text-gray-700 group-hover/label:text-white transition-colors" />
                                    <span className="text-[6px] font-black font-mono text-gray-700 uppercase tracking-widest group-hover/label:text-white">Seed</span>
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
                  
                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-2xl p-3 shadow-xl relative overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2 mb-3 shrink-0">
                          <Activity size={12} className="text-[#22d3ee] animate-pulse" />
                          <span className="text-[8px] font-black font-mono text-white uppercase tracking-widest">Logic Flow</span>
                      </div>
                      <div className="flex-1 bg-black rounded-xl border border-white/5 relative overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                  <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                                  <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                                  <Scatter name="Nodes" data={Array.from({length: 25}, () => ({x: Math.random()*100, y: Math.random()*100}))}>
                                      {Array.from({length: 25}).map((_, i) => <Cell key={i} fill={i % 3 === 0 ? accent : '#111'} opacity={0.3} />)}
                                  </Scatter>
                              </ScatterChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>

          {/* --- VOICE CORE TERMINAL INTEGRATION (EXPANDED CONVERSATION DEPTH) --- */}
          <div className="pt-16 border-t border-white/5">
              <div 
                className="w-full bg-[#010101] flex flex-col relative overflow-hidden font-sans border border-white/10 rounded-[4rem] shadow-[0_0_150px_rgba(0,0,0,1)] group/voicestudio h-[1800px]"
              >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(241,194,27,0.02)_0%,transparent_90%)] pointer-events-none" />
                  
                  <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 50)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 50)} />

                  {/* High Density Header (Shifted Nodes High) */}
                  <div className="h-16 flex justify-between items-center px-10 bg-[#080808]/95 backdrop-blur-3xl border-b border-white/5 z-30 shrink-0 relative">
                      <div className="flex items-center gap-6">
                          <div className="p-3 bg-[#22d3ee]/5 border border-[#22d3ee]/20 rounded-xl">
                            <Radio size={18} className={voice.isActive ? 'text-[#22d3ee] animate-pulse' : 'text-gray-700'} />
                          </div>
                          <div className="flex flex-col">
                              <span className="text-xs font-black font-mono uppercase tracking-[0.5em] text-white leading-none">Voice Core</span>
                              <div className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.3em] mt-1">
                                {voice.isActive ? 'UPLINK_STABLE' : 'STANDBY'}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-black/70 border border-white/5 px-4 py-1.5 rounded-xl shadow-inner">
                           <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Agent</span>
                           <div className="h-3 w-px bg-white/10" />
                           <select 
                            value={voice.voiceName} 
                            onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                            disabled={voice.isActive} 
                            className="bg-transparent text-[10px] font-black font-mono text-[#f1c21b] outline-none uppercase cursor-pointer transition-colors"
                           >
                                {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                            </select>
                      </div>
                  </div>

                  {/* COMPACTED TOP-ALIGNED CORE UI */}
                  <div className="h-[380px] flex items-start justify-center gap-20 p-8 pt-10 relative overflow-hidden shrink-0">
                     
                     {/* Operator Node */}
                     <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-center gap-4"
                     >
                        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 shadow-lg opacity-60">
                            <Target size={12} className="text-[#22d3ee]" />
                            <span className="text-[8px] font-black text-[#22d3ee] uppercase tracking-[0.3em]">Operator</span>
                        </div>
                        <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
                     </motion.div>

                     {/* Central Control Hub (Denser) */}
                     <div className="flex flex-col items-center gap-6 relative pt-8">
                        <div className={`absolute -inset-16 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#f1c21b]/10 animate-[spin_40s_linear_infinite]' : 'opacity-0'}`} />
                        
                        <button 
                            onClick={toggleVoiceSession} 
                            disabled={voice.isConnecting}
                            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 overflow-hidden border-4
                                ${voice.isActive 
                                    ? 'bg-red-950/80 border-red-500/30 shadow-[0_0_60px_rgba(239,68,68,0.2)] rotate-90 scale-105' 
                                    : 'bg-[#0a0a0a] border-[#f1c21b]/10 shadow-[0_0_40px_rgba(241,194,27,0.1)] hover:border-[#f1c21b]/40 hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            <div className="relative z-20">
                                {voice.isConnecting ? <Loader2 className="animate-spin text-[#f1c21b] w-10 h-10" /> : voice.isActive ? <Power className="text-red-500 w-10 h-10" /> : <Mic className="text-[#f1c21b] w-10 h-10" />}
                            </div>
                        </button>
                        
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black font-mono text-white uppercase tracking-[0.6em] transition-all drop-shadow-lg">
                                {voice.isActive ? 'SEVER_UPLINK' : 'ENGAGE'}
                            </span>
                        </div>
                     </div>

                     {/* AI Node */}
                     <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-center gap-4"
                     >
                        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 shadow-lg opacity-60">
                            <BotIcon size={12} className="text-[#f1c21b]" />
                            <span className="text-[8px] font-black text-[#f1c21b] uppercase tracking-[0.3em]">AI_CORE</span>
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

                  {/* EXPANDED TRANSCRIPT VIEW (LONG SCROLL) */}
                  <div className="flex-1 border-t border-white/10 bg-[#050505]/98 backdrop-blur-3xl p-12 flex flex-col min-h-0 relative">
                      <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8 shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="p-3 bg-[#f1c21b]/10 border border-[#f1c21b]/20 rounded-2xl relative shadow-xl">
                                <Terminal size={20} className="text-[#f1c21b]" />
                                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#f1c21b] rounded-full animate-ping" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black uppercase tracking-[0.4em] text-white">Synaptic Ledger</span>
                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                    <History size={10} /> Transmission Stream synchronized // {voice.transcripts.length} packets
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 text-[9px] font-mono text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30">
                                <ShieldCheck size={12} /> L0_Grounded
                            </div>
                            <button onClick={() => { setShowDialogueStream(!showDialogueStream); audio.playClick(); }} className="text-gray-700 hover:text-white transition-all active:scale-90 p-2 bg-white/5 rounded-xl border border-white/10">
                                <ChevronDown size={18} className={showDialogueStream ? '' : 'rotate-180'} />
                            </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-base leading-relaxed pr-8" ref={voiceScrollRef}>
                          <AnimatePresence initial={false}>
                              {showDialogueStream && voice.transcripts.map((t, i) => {
                                  const isUser = (t.role || '').toLowerCase() === 'user';
                                  return (
                                      <motion.div 
                                        initial={{ opacity: 0, y: 30, scale: 0.99 }} 
                                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                                        key={i} 
                                        className={`mb-10 flex gap-10 p-10 rounded-[3rem] border transition-all duration-1000 shadow-2xl relative group/card overflow-hidden
                                            ${isUser 
                                                ? 'bg-[#22d3ee]/5 border-[#22d3ee]/10 flex-row-reverse text-[#22d3ee]' 
                                                : 'bg-[#f1c21b]/5 border-[#f1c21b]/20 text-[#f1c21b]'
                                            }`}
                                      >
                                          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xl transition-transform duration-1000 group-hover/card:scale-110 relative z-10
                                              ${isUser ? 'border-[#22d3ee]/30 bg-black' : 'border-[#f1c21b]/40 bg-black'}`}>
                                              {isUser ? <User size={28} /> : <BotIcon size={28} />}
                                          </div>
                                          <div className={`flex-1 relative z-10 ${isUser ? 'text-right' : 'text-left'}`}>
                                              <div className={`flex items-center gap-3 mb-4 opacity-50 uppercase text-[9px] font-black tracking-[0.4em] ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                  {isUser ? (
                                                      <>
                                                        <span>Node_OP</span>
                                                        <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                                        <span>ACK_OK</span>
                                                      </>
                                                  ) : (
                                                      <>
                                                        <Languages size={10} className="text-[#f1c21b]" />
                                                        <span className="text-[#f1c21b]">Live_Synthesis</span>
                                                        <div className="w-1 h-1 rounded-full bg-[#f1c21b]/30" />
                                                        <span>Node_Sync</span>
                                                      </>
                                                  )}
                                              </div>
                                              <p className="text-gray-100 font-medium tracking-tight text-xl selection:bg-current selection:text-black leading-relaxed">{(t.text || '').toString()}</p>
                                              
                                              <div className={`mt-6 flex items-center gap-4 opacity-20 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                  <div className="h-px w-12 bg-white/20" />
                                                  <span className="text-[10px] font-mono tracking-widest">{new Date(t.timestamp).toLocaleTimeString()}</span>
                                              </div>
                                          </div>
                                      </motion.div>
                                  );
                              })}
                          </AnimatePresence>
                          {voice.partialTranscript && (
                              <div className={`flex gap-10 p-10 rounded-[3rem] border border-dashed opacity-50 mb-10 ${voice.partialTranscript.role === 'user' ? 'bg-[#22d3ee]/5 border-[#22d3ee]/10 flex-row-reverse text-[#22d3ee]' : 'bg-[#f1c21b]/5 border-[#f1c21b]/10 text-[#f1c21b]'}`}>
                                  <div className="w-14 h-14 flex items-center justify-center shrink-0">
                                      <Loader2 size={32} className="animate-spin" />
                                  </div>
                                  <div className={`flex-1 ${voice.partialTranscript.role === 'user' ? 'text-right' : 'text-left'}`}>
                                      <p className="text-gray-300 italic text-xl">{(voice.partialTranscript.text || '').toString()}_</p>
                                  </div>
                              </div>
                          )}
                          {voice.transcripts.length === 0 && !voice.partialTranscript && (
                              <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-32 grayscale">
                                  <Waves size={120} className="mb-8 text-gray-500 animate-pulse" />
                                  <p className="text-3xl font-mono uppercase tracking-[1em]">Acoustic Cache Empty</p>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* OS Tactical HUD Footer */}
                  <div className="h-14 bg-[#050505] border-t border-white/5 px-14 flex items-center justify-between text-[10px] font-mono text-gray-700 shrink-0 relative z-[60]">
                    <div className="flex gap-14 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                        <div className="flex items-center gap-5 text-emerald-900 font-bold uppercase tracking-[0.3em]">
                            <ShieldCheck size={18} className="shadow-[0_0_20px_rgba(16,185,129,0.2)]" /> Handshake_Secure
                        </div>
                        <div className="flex items-center gap-5 uppercase tracking-[0.4em]">
                            <GitBranch size={18} className="text-[#f1c21b]" /> Kernel: EXECUTIVE_DIRECTIVE
                        </div>
                        <div className="flex items-center gap-5 uppercase tracking-[0.4em]">
                            <Globe size={18} className="text-[#22d3ee]" /> Node: SOVEREIGN_ALPHA
                        </div>
                    </div>
                    <div className="flex items-center gap-14 shrink-0">
                        <span className="uppercase tracking-[0.6em] opacity-40 text-[9px] hidden lg:block">Arch v9.2 // Global Link Active</span>
                        <div className="h-5 w-px bg-white/10 hidden lg:block" />
                        <span className="font-black text-gray-500 uppercase tracking-widest text-[11px]">SYSTEM_CORE</span>
                    </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
