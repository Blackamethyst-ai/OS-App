
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    generateArchitectureImage, 
    promptSelectKey, 
    fileToGenerativePart,
    analyzeImageVision,
    generateStructuredWorkflow,
    liveSession,
    HIVE_AGENTS
} from '../services/geminiService';
import { AspectRatio, ImageSize, AppMode } from '../types';
import { 
    Activity, Shield, Cpu, 
    Users, Terminal, Zap, Network, Database, 
    Radar, Target, HardDrive, User, Loader2, Maximize2, RefreshCw, Sparkles, Upload, Trash2, 
    GitCommit, Boxes, ShieldCheck, Waves, MoveUpRight, Command, Mic, Power, Atom, Plus,
    ChevronDown, Bot as BotIcon, CheckCircle, Navigation, Globe, Server, Radio,
    Compass, GitBranch, LayoutGrid, Monitor, ShieldAlert, Cpu as CpuIcon,
    Box, Diamond, Hexagon, Component, Share2, Binary, Fingerprint, Lock
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
                const count = isThinking ? 4 : 1;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 70 + Math.random() * 50;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 0.6,
                        vy: (Math.random() - 0.5) * 0.6,
                        life: 1.0,
                        color: userActive ? '#22d3ee' : agentActive ? '#9d4edd' : '#fff'
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

                if (p.life > 0.75) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.1;
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

const CognitiveLattice: React.FC<{ 
    image: string | null; 
    freqs: Uint8Array | null; 
    color: string; 
    isAgent: boolean; 
    isThinking?: boolean;
}> = ({ image, freqs, color, isAgent, isThinking }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
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

            let volume = 0;
            if (freqs && freqs.length > 0) {
                volume = freqs.reduce((a, b) => a + b, 0) / freqs.length;
            }
            const normalizedVol = volume / 255;
            const time = Date.now() / 6000; 

            if (isAgent) {
                const threadCount = 12;
                const baseRadius = 60;
                ctx.lineWidth = 0.25;
                for (let i = 0; i < threadCount; i++) {
                    const angle = (i / threadCount) * Math.PI * 2 + time * 0.1;
                    const r = baseRadius + Math.sin(time * 2 + i) * 10 * normalizedVol;
                    const tx = cx + Math.cos(angle) * r;
                    const ty = cy + Math.sin(angle) * r;

                    ctx.beginPath();
                    ctx.strokeStyle = `${color}${Math.floor((0.05 + normalizedVol * 0.2) * 255).toString(16).padStart(2, '0')}`;
                    ctx.moveTo(cx, cy);
                    ctx.quadraticCurveTo(cx + Math.cos(angle + 0.4) * (r * 0.4), cy + Math.sin(angle + 0.4) * (r * 0.4), tx, ty);
                    ctx.stroke();
                }
            }

            const corePulse = 38 + Math.sin(time * 4) * 3 + normalizedVol * 18;
            const gradient = ctx.createRadialGradient(cx, cy, 18, cx, cy, corePulse);
            gradient.addColorStop(0, `${color}12`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, corePulse, 0, Math.PI * 2);
            ctx.fill();

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color, isAgent, isThinking]);

    return (
        <div className="relative w-40 h-40 flex items-center justify-center group/node">
            <canvas ref={canvasRef} className="absolute inset-[-30px] w-[calc(100%+60px)] h-[calc(100%+60px)] pointer-events-none z-0 opacity-40" />
            <div className={`relative z-10 w-22 h-22 rounded-full border border-white/5 overflow-hidden bg-[#020202] shadow-[0_0_40px_rgba(0,0,0,1)] transition-all duration-[1500ms] ease-in-out ${isThinking ? 'border-[#9d4edd]/30 scale-105 shadow-[0_0_25px_rgba(157,78,221,0.15)]' : ''}`}>
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[60%] group-hover/node:grayscale-0 transition-all duration-[1000ms]" alt="Node" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {isAgent ? <BotIcon size={24} className="text-gray-800" /> : <User size={24} className="text-gray-800" />}
                    </div>
                )}
                {isThinking && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center">
                         <Loader2 className="w-5 h-5 text-[#9d4edd] animate-spin" />
                    </div>
                )}
            </div>
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
    level: number; // Fractal level (0-2)
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
                // Trigger localized "shockwave" to split nearby shards if high entropy
                if (cpu > 60) {
                    const victims = shards.current.filter(s => s.level === 0 && Math.random() > 0.5).slice(0, 3);
                    victims.forEach(v => {
                        v.vx *= 3; v.vy *= 3; // Split logic would happen in render but we prep the energy
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

            // 1. Calculate Multi-Vector Target Centroid
            let targetX = 0, targetY = 0, totalW = 0;
            sectors.forEach((key, i) => {
                const angle = (i / sectors.length) * Math.PI * 2 - Math.PI / 2;
                const w = weights[key];
                const rX = canvas.width * 0.38, rY = canvas.height * 0.38;
                const sx = cx + Math.cos(angle) * rX, sy = cy + Math.sin(angle) * rY;
                targetX += sx * w; targetY += sy * w; totalW += w;

                if (w > 60) {
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1 + w/120, 0, Math.PI * 2);
                    ctx.fillStyle = w > 220 ? '#fff' : '#9d4edd44';
                    ctx.fill();
                    if (w > 180) {
                        ctx.font = 'bold 7px Fira Code';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.fillText(key, sx, sy - 14);
                    }
                }
            });

            currC.current.x += (targetX / totalW - currC.current.x) * 0.02;
            currC.current.y += (targetY / totalW - currC.current.y) * 0.02;

            // 2. Quantum Shard Physics & Splitting
            const activeShards = [...shards.current];
            activeShards.forEach((s, i) => {
                const dx = currC.current.x - s.x;
                const dy = currC.current.y - s.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;

                // Physics: Attraction + Fractal Jitter
                s.vx += (dx / dist) * 0.12 * coherence;
                s.vy += (dy / dist) * 0.12 * coherence;
                s.vx += (Math.random() - 0.5) * entropy * 1.5;
                s.vy += (Math.random() - 0.5) * entropy * 1.5;

                // Quantum Glitch (Teleportation)
                if (entropy > 0.8 && Math.random() > 0.99) {
                    s.x += (Math.random() - 0.5) * 50;
                    s.y += (Math.random() - 0.5) * 50;
                }

                s.vx *= 0.97; s.vy *= 0.97;
                s.x += s.vx; s.y += s.vy;
                s.rotation += s.rv + entropy * 0.05;

                // 3. Chromatic Refraction Rendering
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation);
                
                // Hue shifts based on angle from center
                const ang = Math.atan2(s.y - cy, s.x - cx);
                const localHue = s.hue + Math.sin(ang + time) * 30 * entropy;

                ctx.beginPath();
                const radius = s.size;
                ctx.moveTo(0, -radius);
                ctx.lineTo(radius * 0.8, radius * 0.5);
                ctx.lineTo(-radius * 0.8, radius * 0.5);
                ctx.closePath();

                const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
                const baseAlpha = s.opacity * (0.4 + coherence * 0.6);
                grad.addColorStop(0, `hsla(${localHue}, 80%, 70%, ${baseAlpha})`);
                grad.addColorStop(0.5, `hsla(${localHue + 60}, 100%, 80%, ${baseAlpha * 0.3})`);
                grad.addColorStop(1, `rgba(255, 255, 255, ${baseAlpha * 0.9})`);
                
                ctx.fillStyle = grad;
                ctx.shadowBlur = entropy > 0.5 ? 10 : 0;
                ctx.shadowColor = `hsla(${localHue}, 100%, 50%, 0.2)`;
                ctx.fill();
                
                // Sharp Refractive Bevel
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + entropy * 0.2})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();

                ctx.restore();

                // Logical Data Packets (Dots moving along lattice)
                if (coherence > 0.7 && i < activeShards.length - 1) {
                    const next = activeShards[i+1];
                    const pTime = (Date.now() / 1000) % 1;
                    const px = s.x + (next.x - s.x) * pTime;
                    const py = s.y + (next.y - s.y) * pTime;
                    ctx.beginPath();
                    ctx.arc(px, py, 0.8, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 0.2 * coherence;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });

            // 4. Morphing Geometric Nucleus
            ctx.save();
            ctx.translate(currC.current.x, currC.current.y);
            ctx.rotate(time * 3);
            
            // Sides morph based on integrity (3 to 6)
            const sides = Math.max(3, Math.floor(3 + integrity / 33));
            const nRadius = 24 + Math.sin(time * 8) * 4;
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const a = (i / sides) * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * nRadius, Math.sin(a) * nRadius);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(157, 78, 221, ${0.4 * coherence})`;
            ctx.stroke();
            ctx.fillStyle = `rgba(157, 78, 221, 0.05)`;
            ctx.fill();
            ctx.restore();

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [weights, cpu, integrity]);

    return (
        <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-8 h-full flex flex-col group shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.01)_0%,transparent_95%)] pointer-events-none" />
            <div className="flex justify-between items-center mb-1 z-10">
                <div className="flex items-center gap-3">
                    <Atom size={20} className="text-[#9d4edd] animate-spin-slow opacity-30" />
                    <div>
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Crystalline Neural Core</span>
                        <p className="text-[6px] text-gray-700 font-mono uppercase tracking-widest mt-1">Iteration_8.0: FRACTAL_SWARM</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
                    <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">Sync_LOCKED</span>
                </div>
            </div>
            <canvas ref={canvasRef} className="flex-1 w-full" />
            <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[7px] font-black font-mono text-gray-800 uppercase tracking-[0.4em] z-10 pointer-events-none border-t border-white/5 pt-4">
                <span>Refraction: Chromatic_Dispersion</span>
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
            <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-white/5 border border-white/5 text-gray-700 group-hover:text-white transition-colors">
                    <Icon size={10} style={{ color: color }} />
                </div>
                <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex items-center gap-1 text-[7px] font-mono text-gray-700 uppercase">{detail}</div>
        </div>
        <div className="flex items-end justify-between">
            <div className="text-xl font-black font-mono text-white tracking-tighter leading-none">{value}</div>
            <div className="h-7 w-16 opacity-10 group-hover:opacity-100 transition-opacity">
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
    <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden h-[240px] shadow-inner">
        <div className="absolute top-0 right-0 p-4 opacity-[0.01] -rotate-12"><HardDrive size={110} /></div>
        <div className="flex items-center justify-between relative z-10 px-1">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                    <Boxes size={14} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black font-mono text-white uppercase tracking-[0.2em]">PARA Drive Matrix</span>
                    <span className="text-[6px] font-mono text-gray-600 uppercase">Integrity: {health}%</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-[8px] font-black font-mono text-[#22d3ee]">{syncProgress}% SYNC</span>
            </div>
        </div>
        
        <div className="space-y-3.5 relative z-10 flex-1 flex flex-col justify-center px-1">
            {[
                { label: 'Projects', val: 94, color: '#9d4edd', usage: '12.4GB' },
                { label: 'Areas', val: 82, color: '#22d3ee', usage: '42.1GB' },
                { label: 'Resources', val: 71, color: '#f59e0b', usage: '118GB' },
                { label: 'Archives', val: 99, color: '#10b981', usage: '2.4TB' }
            ].map((cat) => (
                <div key={cat.label} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[7px] font-mono text-gray-500 uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                            {cat.label}
                        </span>
                        <span className="text-gray-400 font-bold">{cat.usage}</span>
                    </div>
                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.val}%` }}
                            className="h-full"
                            style={{ backgroundColor: cat.color }}
                        />
                    </div>
                </div>
            ))}
        </div>

        <div className="pt-2 border-t border-white/5 flex justify-between items-center relative z-10 px-1">
            <span className="text-[6px] font-mono text-gray-700 uppercase font-black">Lock: SECURE_ENCLAVE</span>
            <div className="flex items-center gap-1.5">
                <ShieldCheck size={10} className="text-[#10b981]/60" />
                <span className="text-[7px] font-mono text-[#10b981]/60 uppercase font-black tracking-widest">AES-256</span>
            </div>
        </div>
    </div>
);

const SwarmHiveControl = () => {
    const { agents } = useAppStore();
    const activeAccent = useAppStore(s => s.dashboard.activeThemeColor) || '#9d4edd';

    return (
        <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 h-[350px] relative overflow-hidden group shadow-inner">
            <div className="flex items-center justify-between mb-1 relative z-10 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#9d4edd]/5 rounded-xl border border-[#9d4edd]/10 text-[#9d4edd]">
                        <Users size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.2em]">Swarm Hive</span>
                        <span className="text-[7px] font-mono text-gray-700 uppercase">Load Balance: NOMINAL</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black font-mono text-white">{agents.activeAgents.length} NODES</span>
                    <span className="text-[6px] font-mono text-gray-800 uppercase tracking-tighter">14k ops/s</span>
                </div>
            </div>
            
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10">
                {agents.activeAgents.map(agent => (
                    <div key={agent.id} className="p-3 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-[#9d4edd]/30 transition-all flex flex-col gap-2 group/agent overflow-hidden relative shadow-md">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_5px_#10b981]" />
                                <span className="text-[9px] font-black text-gray-400 uppercase group-hover/agent:text-white transition-colors">{agent.name}</span>
                            </div>
                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">{agent.status}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-mono text-gray-700 uppercase truncate pr-2">{agent.role}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="h-6 w-10 opacity-10 group-hover/agent:opacity-40 transition-opacity">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={Array.from({length: 6}, () => ({v: 20 + Math.random()*50}))}>
                                            <Area type="monotone" dataKey="v" stroke={activeAccent} strokeWidth={1} fill={activeAccent} fillOpacity={0.1} isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <span className="text-[9px] font-black font-mono text-gray-400">{agent.energyLevel}%</span>
                            </div>
                        </div>
                        <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${agent.energyLevel}%` }} className="h-full bg-current opacity-30" style={{ color: activeAccent }} />
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full py-2.5 bg-[#111] border border-white/5 hover:border-[#9d4edd]/40 rounded-2xl text-[8px] font-black font-mono uppercase tracking-[0.3em] hover:bg-[#9d4edd]/5 hover:text-white transition-all text-gray-700 shrink-0 relative z-10 flex items-center justify-center gap-3 shadow-lg active:scale-95">
                <Plus size={12} /> Register_Swarm_Node
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

  const toggleVoiceSession = async () => {
    if (voice.isActive || voice.isConnecting) {
        liveSession.disconnect();
        setVoiceState({ isActive: false, isConnecting: false });
        addLog('SYSTEM', 'VOICE_CORE: Uplink severed.');
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
            addLog('SUCCESS', 'VOICE_CORE: Synaptic handshake confirmed.');
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
      addLog('SUCCESS', 'LATTICE_SYNC: Global identity frame crystallized.');
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
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]"></div>
                      <span className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-[0.4em]">Node // Sovereign_Alpha</span>
                  </div>
                  <h1 className="text-4xl font-black font-mono text-white tracking-tighter uppercase leading-none italic">Metaventions AI</h1>
              </div>

              <div className="flex items-center gap-10 pb-1">
                  <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[7px] font-mono text-gray-800 uppercase tracking-[0.3em] font-black">Thermal Map</span>
                      <div className="flex items-center gap-3">
                          <div className="w-20 h-1 bg-[#111] rounded-full overflow-hidden border border-white/5 shadow-inner">
                              <motion.div animate={{ width: `${(telemetry.fan / 6000) * 100}%` }} className="h-full bg-gradient-to-r from-[#22d3ee] to-[#ef4444]" />
                          </div>
                          <span className="text-[9px] font-mono font-black text-gray-500">{telemetry.fan.toFixed(0)} RPM</span>
                      </div>
                  </div>
                  <div className="h-8 w-[1px] bg-white/5" />
                  <button onClick={() => toggleProfile(true)} className="flex items-center gap-3 group">
                      <div className="text-right">
                          <div className="text-[10px] font-black text-white group-hover:text-[#9d4edd] transition-colors uppercase tracking-widest">{user.displayName}</div>
                          <div className="text-[7px] font-mono text-gray-600 uppercase tracking-tighter mt-0.5">AUTH_L05 // {user.role}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl border border-white/5 overflow-hidden bg-black flex items-center justify-center group-hover:border-[#9d4edd]/40 transition-all shadow-2xl">
                          {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User" /> : <User className="text-gray-700" size={16}/>}
                      </div>
                  </button>
              </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-12 gap-6">
              
              {/* Left Column: Telemetry & Rail */}
              <div className="col-span-3 space-y-6 flex flex-col h-[1050px]">
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                      <CompactMetric title="CPU_LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="12c_Sync" icon={CpuIcon} color={accent} data={cpuHistory} />
                      <CompactMetric title="UPLINK" value={`${telemetry.net.toFixed(1)}GB`} detail="Secure" icon={Network} color={accent} data={netHistory} />
                      <CompactMetric title="MEMORY" value={`${telemetry.mem.toFixed(0)}%`} detail="Lattice" icon={Database} color={accent} data={memHistory} />
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
              <div className="col-span-6 flex flex-col gap-6 h-[1050px]">
                  <div className="flex-1 bg-[#020202] border border-white/10 rounded-2xl relative overflow-hidden group shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col transition-all">
                      
                      {/* Main Hub Projection */}
                      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden group/viewport">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                          <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
                          
                          {dashboard.identityUrl ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full rounded-xl overflow-hidden border border-white/5 shadow-[0_50px_150px_rgba(0,0,0,1)]"
                              >
                                  <img src={dashboard.identityUrl} className="w-full h-full object-cover transition-transform duration-[45s] group-hover/viewport:scale-110" alt="Generated Hub" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                  
                                  {/* Viewport Actions Overlay */}
                                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/viewport:opacity-100 transition-all backdrop-blur-[4px] flex items-center justify-center gap-12">
                                      <div className="flex flex-col items-center gap-4">
                                          <button onClick={() => openHoloProjector({ id: 'id', title: 'Projection', type: 'IMAGE', content: dashboard.identityUrl })} className="p-6 bg-white text-black rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"><Maximize2 size={24}/></button>
                                          <span className="text-[8px] font-mono text-white uppercase tracking-widest">Projection_Full</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-4">
                                          <button onClick={() => handleIdentityGen()} className="p-6 bg-[#9d4edd] text-black rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"><RefreshCw size={24}/></button>
                                          <span className="text-[8px] font-mono text-white uppercase tracking-widest">Rescan_Lattice</span>
                                      </div>
                                  </div>
                              </motion.div>
                          ) : (
                              <div className="flex flex-col items-center gap-6 opacity-10 group-hover/viewport:opacity-25 transition-all duration-[2000ms] text-center select-none">
                                  <div className="w-32 h-32 rounded-full border border-dashed border-gray-700 flex items-center justify-center animate-[spin_80s_linear_infinite] relative">
                                      <Radar size={64} className="text-gray-500" />
                                      <div className="absolute inset-0 border border-[#9d4edd]/20 rounded-full animate-ping" />
                                  </div>
                                  <div className="space-y-1">
                                      <p className="text-xl font-black font-mono uppercase tracking-[0.5em] text-white">Hub_Standby</p>
                                      <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Awaiting neural strategic intent</p>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Viewport Controls */}
                      <div className="h-16 border-t border-white/5 bg-[#050505] flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
                         <div className="flex gap-2 relative z-10">
                             {[
                                { label: 'Sync_Drive', icon: HardDrive, action: () => handleQuickForge('DRIVE'), color: '#22d3ee' },
                                { label: 'Stack_Forge', icon: Server, action: () => handleQuickForge('ARCH'), color: '#9d4edd' }
                             ].map((btn) => (
                                 <button 
                                    key={btn.label}
                                    onClick={() => { btn.action(); audio.playClick(); }} 
                                    className="px-5 py-2 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-black font-mono uppercase tracking-widest text-gray-600 hover:text-white transition-all flex items-center gap-2 group/vbtn active:scale-95"
                                 >
                                     <btn.icon size={12} className="group-hover/vbtn:scale-110 transition-transform" style={{ color: btn.color }} /> 
                                     {btn.label}
                                 </button>
                             ))}
                         </div>
                         
                         <div className="flex items-center gap-4 relative z-10">
                            <div className="px-4 py-1.5 bg-black/40 border border-white/5 rounded-lg flex items-center gap-2">
                                <Command size={12} className="text-gray-600" />
                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Lattice_Control_v4.2</span>
                            </div>
                            <button 
                                onClick={handleIdentityGen} 
                                disabled={dashboard.isGenerating}
                                className="px-6 py-2.5 bg-[#9d4edd] text-black rounded-lg text-[10px] font-black font-mono uppercase tracking-[0.3em] transition-all shadow-[0_10px_30px_rgba(157,78,221,0.25)] flex items-center gap-2 hover:bg-[#b06bf7] active:scale-95 disabled:opacity-50"
                            >
                                {dashboard.isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Forge_Identity
                            </button>
                         </div>
                      </div>
                  </div>

                  {/* Handover Ledger Log (The "Neural Stream") */}
                  <div className="h-52 bg-[#050505] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl relative overflow-hidden group/log">
                      <div className="flex items-center justify-between relative z-10 px-1 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-lg bg-[#10b981]/5 text-[#10b981] border border-[#10b981]/10">
                                  <Terminal size={14} />
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Handover Ledger</span>
                                  <span className="text-[7px] font-mono text-gray-700 uppercase">Buffer: NOMINAL // Secure Feed</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[8px] font-mono text-gray-700 uppercase">Latency: 12ms</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse" />
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[9px] pr-3 group-hover/log:pr-1 transition-all">
                          {system.logs.slice(-15).reverse().map((log: any, i: number) => (
                              <div key={i} className="flex gap-4 items-start border-l border-white/5 pl-4 py-1.5 hover:bg-white/[0.01] transition-all group/item rounded-r-lg">
                                  <span className="text-gray-800 shrink-0 text-[8px] font-black">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false})}</span>
                                  <div className="flex-1 flex gap-3">
                                      <span className="text-[#9d4edd]/50 font-black shrink-0">>></span>
                                      <span className={cn(
                                          "flex-1 break-all tracking-tight transition-colors",
                                          log.level === 'ERROR' ? 'text-red-900' : 'text-gray-500 group-hover/item:text-gray-300'
                                      )}>
                                          {(log.message || "").toString()}
                                      </span>
                                  </div>
                              </div>
                          ))}
                          {system.logs.length === 0 && <div className="text-gray-800 italic uppercase text-center py-10 tracking-[0.5em] opacity-20">Lattice Idle // Signal Awaiting</div>}
                      </div>
                  </div>
              </div>

              {/* Right Column: Style, Matrix & PARA */}
              <div className="col-span-3 space-y-6 flex flex-col h-[1050px]">
                  <div className="grid grid-cols-1 gap-4 shrink-0">
                    {/* Style Vector Module */}
                    <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 shadow-xl group/ref relative overflow-hidden h-[180px]">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.02] rotate-45 group-hover:rotate-90 transition-transform duration-1000"><Target size={60} /></div>
                        <div className="flex items-center gap-2 relative z-10 px-1">
                            <div className="p-1 rounded bg-[#9d4edd]/5 text-[#9d4edd] border border-[#9d4edd]/10">
                                <Target size={12} />
                            </div>
                            <span className="text-[9px] font-black font-mono text-white uppercase tracking-widest">Style Matrix</span>
                        </div>
                        
                        <div className="flex-1 relative rounded-xl border border-dashed border-white/5 hover:border-white/10 transition-all bg-black flex items-center justify-center overflow-hidden shadow-inner">
                            {dashboard.referenceImage ? (
                                  <div className="relative w-full h-full group/preview">
                                      <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale-[60%] group-hover/preview:grayscale-0 transition-all duration-[1500ms]" alt="Ref" />
                                      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                          <button onClick={() => { setDashboardState({ referenceImage: null }); audio.playClick(); }} className="p-3 bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-2xl active:scale-90"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                            ) : (
                                  <label className="flex flex-col items-center gap-3 cursor-pointer text-center group/label">
                                      <div className="p-2 rounded-full border border-white/5 group-hover/label:border-[#9d4edd]/40 transition-colors">
                                        <Upload size={18} className="text-gray-800 group-hover/label:text-white transition-colors" />
                                      </div>
                                      <p className="text-[8px] font-black font-mono text-gray-700 uppercase group-hover/label:text-white tracking-widest">Seed Matrix</p>
                                      <input type="file" className="hidden" onChange={async (e) => {
                                          if (e.target.files?.[0]) {
                                              const fileData = await fileToGenerativePart(e.target.files[0]);
                                              setDashboardState({ referenceImage: fileData });
                                              addLog('SUCCESS', 'VECTORS: Style reference handshake complete.');
                                              audio.playSuccess();
                                          }
                                      }} />
                                  </label>
                            )}
                        </div>
                    </div>

                    {/* Global Lattice Map */}
                    <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden group/matrix h-[220px]">
                        <div className="flex items-center gap-2 px-1 shrink-0 relative z-10">
                            <div className="p-1 rounded bg-[#22d3ee]/5 text-[#22d3ee] border border-[#22d3ee]/10">
                                <GitCommit size={12} />
                            </div>
                            <span className="text-[9px] font-black font-mono text-white uppercase tracking-widest">Global Lattice</span>
                        </div>
                        
                        <div className="flex-1 bg-black rounded-xl relative overflow-hidden border border-white/5 shadow-inner">
                            <ResponsiveContainer width="100%" height="100%">
                                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                      <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                                      <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                                      <ZAxis type="number" range={[20, 120]} />
                                      <Scatter name="Nodes" data={Array.from({length: 45}, () => ({x: Math.random()*100, y: Math.random()*100}))}>
                                          {Array.from({length: 45}).map((_, i) => (
                                              <Cell key={i} fill={i % 5 === 0 ? accent : (i % 3 === 0 ? '#22d3ee' : '#111')} opacity={0.3} />
                                          ))}
                                      </Scatter>
                                  </ScatterChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/matrix:opacity-100 transition-all duration-[1000ms] bg-black/85 backdrop-blur-[2px] pointer-events-none text-center">
                                <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest">Lattice Latency</span>
                                <span className="text-xl font-black font-mono text-white">4.2ms</span>
                                <div className="mt-2 flex gap-1">
                                    {[1,1,1,1].map((_, i) => <div key={i} className="w-1 h-3 bg-[#10b981] rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />)}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* PARA Drive Matrix */}
                  <DrivePARAIntegrity health={Math.round(telemetry.load)} syncProgress={Math.round(telemetry.load - 5)} />
              </div>
          </div>

          {/* --- VOICE CORE TERMINAL INTEGRATION --- */}
          <div className="pt-20 border-t border-white/5">
              <div 
                className="w-full bg-[#020202] flex flex-col relative overflow-hidden font-sans border border-white/5 rounded-[3rem] shadow-[0_0_150px_rgba(0,0,0,1)] group/voicestudio h-[1000px]"
              >
                  <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 50)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 50)} />

                  {/* Primary Header */}
                  <div className="h-20 flex justify-between items-center px-12 bg-[#080808]/80 backdrop-blur-3xl border-b border-white/5 z-30 shrink-0 relative">
                      <div className="flex items-center gap-6">
                          <div className="p-3 bg-[#22d3ee]/5 border border-[#22d3ee]/10 rounded-2xl shadow-xl">
                            <Radio size={20} className={voice.isActive ? 'text-[#22d3ee] animate-pulse' : 'text-gray-700'} />
                          </div>
                          <div className="flex flex-col">
                              <div className="flex items-center gap-3 mb-1">
                                  <span className="text-xs font-black font-mono uppercase tracking-[0.6em] text-white leading-none">Voice Core Terminal</span>
                                  <div className={`w-1 h-1 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse' : 'bg-gray-900'}`} />
                              </div>
                              <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest leading-none">
                                {voice.isActive ? 'SECURE_UPLINK_STABLE // 16-BIT PCM' : 'ENCLAVE_STANDBY'}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-5">
                           <div className="flex items-center gap-4 bg-black border border-white/5 px-5 py-2.5 rounded-2xl shadow-inner group/select">
                               <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Persona</span>
                               <select 
                                value={voice.voiceName} 
                                onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                                disabled={voice.isActive} 
                                className="bg-transparent text-[11px] font-black font-mono text-[#9d4edd] outline-none uppercase cursor-pointer pr-4 hover:text-white transition-colors"
                               >
                                    {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                                </select>
                           </div>
                      </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center gap-32 p-12 relative overflow-hidden perspective-2000">
                     
                     {/* Operator Node */}
                     <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-center gap-10"
                     >
                        <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 mb-2 opacity-30 hover:opacity-100 transition-opacity cursor-default">
                            <Target size={14} className="text-[#22d3ee]" />
                            <span className="text-[11px] font-black text-[#22d3ee] uppercase tracking-[0.4em]">Operator</span>
                        </div>
                        <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
                     </motion.div>

                     {/* Central Control Hub */}
                     <div className="flex flex-col items-center gap-12 relative">
                        <div className={`absolute -inset-16 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#9d4edd]/20 animate-[spin_40s_linear_infinite]' : 'opacity-0'}`} />
                        <button 
                            onClick={toggleVoiceSession} 
                            disabled={voice.isConnecting}
                            className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-[2000ms] relative z-10 
                                ${voice.isActive 
                                    ? 'bg-red-950 border border-red-500/50 shadow-[0_0_100px_rgba(239,68,68,0.15)] rotate-90 scale-105' 
                                    : 'bg-[#0a0a0a] border border-[#9d4edd]/30 shadow-[0_0_60px_rgba(157,78,221,0.12)] hover:border-[#9d4edd] hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {voice.isConnecting ? <Loader2 className="animate-spin text-[#9d4edd] w-12 h-12" /> : voice.isActive ? <Power className="text-red-500 w-12 h-12" /> : <Mic className="text-[#9d4edd] w-12 h-12" />}
                        </button>
                        
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.6em] transition-colors group-hover:text-white">
                                {voice.isActive ? 'SEVER_UPLINK' : 'ENGAGE_NEURAL_LINK'}
                            </span>
                            <div className="text-[7px] font-mono text-gray-800 uppercase tracking-widest">Handshake_Protocol_v8.1</div>
                        </div>
                     </div>

                     {/* Agent Node */}
                     <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-center gap-10"
                     >
                        <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 mb-2 opacity-30 hover:opacity-100 transition-opacity cursor-default">
                            <Zap size={14} className="text-[#9d4edd]" />
                            <span className="text-[11px] font-black text-[#9d4edd] uppercase tracking-[0.4em]">AI_CORE</span>
                        </div>
                        <CognitiveLattice 
                            image={agentAvatar} 
                            freqs={agentFreqs} 
                            color="#9d4edd" 
                            isAgent={true} 
                            isThinking={voice.isActive && !!voice.partialTranscript}
                        />
                     </motion.div>
                  </div>

                  <AnimatePresence>
                    {showDialogueStream && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 350, opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-[#050505]/95 backdrop-blur-3xl p-10 relative flex flex-col overflow-hidden shadow-inner"
                      >
                          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6 shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="p-2 bg-[#9d4edd]/5 border border-[#9d4edd]/10 rounded-xl">
                                    <Terminal size={18} className="text-[#9d4edd]/50" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Handshake Transcript</span>
                                    <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest mt-1">Lattice alignment active // {voice.transcripts.length} fragments</span>
                                </div>
                            </div>
                            <button onClick={() => { setShowDialogueStream(false); audio.playClick(); }} className="text-gray-700 hover:text-white transition-all active:scale-90 p-2">
                                <ChevronDown size={20}/>
                            </button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-relaxed pr-8" ref={voiceScrollRef}>
                              <AnimatePresence initial={false}>
                                  {voice.transcripts.map((t, i) => {
                                      const isUser = (t.role || '').toLowerCase() === 'user';
                                      return (
                                          <motion.div 
                                            initial={{ opacity: 0, x: isUser ? 20 : -20 }} 
                                            animate={{ opacity: 1, x: 0 }} 
                                            key={i} 
                                            className={`mb-8 flex gap-6 p-6 rounded-3xl border transition-all duration-700 shadow-xl ${isUser ? 'bg-[#22d3ee]/5 border-[#22d3ee]/10 flex-row-reverse' : 'bg-[#9d4edd]/5 border-[#9d4edd]/10'}`}
                                          >
                                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-lg ${isUser ? 'border-[#22d3ee]/20 bg-black text-[#22d3ee]' : 'border-[#9d4edd]/20 bg-black text-[#9d4edd]'}`}>
                                                  {isUser ? <User size={18} /> : <BotIcon size={18} />}
                                              </div>
                                              <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                                                  <p className="text-gray-300 font-medium tracking-tight">{(t.text || '').toString()}</p>
                                              </div>
                                          </motion.div>
                                      );
                                  })}
                              </AnimatePresence>
                              {voice.transcripts.length === 0 && !voice.partialTranscript && (
                                  <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-16 grayscale">
                                      <Waves size={80} className="mb-6 text-gray-500 animate-pulse" />
                                      <p className="text-sm font-mono uppercase tracking-[0.8em]">Acoustic Cache Empty</p>
                                      <p className="text-[9px] font-mono mt-4 uppercase tracking-widest">Awaiting initial synaptic handshake</p>
                                  </div>
                              )}
                          </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* OS Tactical HUD Footer */}
                  <div className="h-12 bg-[#050505] border-t border-white/5 px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60]">
                    <div className="flex gap-12 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                        <div className="flex items-center gap-4 text-emerald-900 font-bold uppercase tracking-[0.2em]">
                            <ShieldCheck size={14} className="shadow-[0_0_10px_rgba(16,185,129,0.2)]" /> Handshake_Secure
                        </div>
                        <div className="flex items-center gap-4 uppercase tracking-[0.3em]">
                            <GitBranch size={14} className="text-[#9d4edd]" /> Kernel_Priority: EXEC
                        </div>
                        <div className="flex items-center gap-4 uppercase tracking-[0.3em]">
                            <Globe size={14} className="text-[#22d3ee]" /> Node_Origin: SOVEREIGN_ENCLAVE
                        </div>
                    </div>
                    <div className="flex items-center gap-10 shrink-0">
                        <span className="uppercase tracking-[0.5em] opacity-40 text-[8px] hidden lg:block">Architecture v8.1 // Live Neural Bridge</span>
                        <div className="h-4 w-px bg-white/5 hidden lg:block" />
                        <span className="font-black text-gray-500 uppercase tracking-widest text-[9px]">OS_SYSTEM_CORE</span>
                    </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
