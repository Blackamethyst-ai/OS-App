
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey, fileToGenerativePart } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';
import { Activity, Shield, Image as ImageIcon, Sparkles, RefreshCw, Cpu, Clock, Users, ArrowUpRight, X, ScanFace, Terminal, Zap, Network, Database, Globe, Lock, Wifi, AlertCircle, Radio, Hexagon, TrendingUp, TrendingDown, DollarSign, BarChart3, RadioReceiver, Search, Filter, SortAsc, SortDesc, Bot, BrainCircuit, MapPin, Share2, Server, Radar, Target, Eye, FileText, FolderGit2, HardDrive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, BarChart as RechartsBarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose'; 

const MotionDiv = motion.div as any;

// --- TYPES ---
interface Signal {
    id: string;
    timestamp: number;
    headline: string;
    tags: string[];
    source: string;
    veracity: number; // 0-100
    leverage: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

// --- SUB-COMPONENTS ---

// 1. Metric Detail Overlay (Improved)
const MetricDetailOverlay: React.FC<{ title: string, color: string, data: any[], onClose: () => void }> = ({ title, color, data, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-8"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#0a0a0a] border border-[#333] rounded-2xl w-full max-w-4xl h-[500px] overflow-hidden shadow-2xl flex flex-col relative group"
                onClick={(e) => e.stopPropagation()}
                style={{ boxShadow: `0 0 40px ${color}20` }}
            >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent)] bg-[length:20px_20px] pointer-events-none"></div>
                
                <div className="flex justify-between items-center p-6 border-b border-[#1f1f1f] bg-[#111]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            <Activity className="w-5 h-5" style={{ color }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-white">{title} Telemetry</h3>
                            <p className="text-[10px] text-gray-500 font-mono">Real-time Data Stream</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 p-8 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`grad-detail-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.6}/>
                                    <stop offset="90%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                hide 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <YAxis 
                                stroke="#444" 
                                tick={{fontSize: 10, fontFamily: 'Fira Code', fill: '#666'}} 
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                                width={40}
                            />
                            <RechartsTooltip 
                                contentStyle={{ 
                                    backgroundColor: '#0a0a0a', 
                                    borderColor: '#333', 
                                    fontSize: '11px', 
                                    fontFamily: 'Fira Code',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    color: '#eee'
                                }}
                                itemStyle={{ color: color }}
                                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={color} 
                                strokeWidth={3} 
                                fill={`url(#grad-detail-${title})`} 
                                animationDuration={1000}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="px-6 py-4 border-t border-[#1f1f1f] bg-[#080808] flex justify-between text-[10px] font-mono text-gray-500">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        LIVE CONNECTION ESTABLISHED
                    </div>
                    <span>SAMPLE RATE: 100ms</span>
                </div>
            </motion.div>
        </motion.div>
    );
};

// 2. Kinetic Metric Card with Sparkline
const MetricCard = ({ title, value, subtext, icon: Icon, color, data, onClick }: any) => {
    const chartData = useMemo(() => {
        if (data && data.length > 0) return data;
        return Array.from({ length: 20 }, (_, i) => ({ value: 40 + Math.random() * 40 }));
    }, [data, value]);

    return (
      <MotionDiv 
        onClick={onClick}
        whileHover={{ scale: 1.02, translateY: -4 }}
        whileTap={{ scale: 0.98 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden hover:border-[#333] cursor-pointer group shadow-lg relative select-none flex flex-col justify-between"
        style={{ height: '160px' }}
      >
          {/* Glowing Top Line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-white/50 transition-all"></div>
          <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: color, opacity: 0 }} />

          <div className="p-5 flex justify-between items-start relative z-10">
              <div>
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" style={{ color: color }} />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-widest">{title}</span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-white group-hover:text-white/90 transition-colors tracking-tight">
                      {value}
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 mt-1 flex items-center gap-1">
                      {subtext}
                  </div>
              </div>
          </div>
          
          {/* Sparkline Area - positioned at bottom */}
          <div className="h-16 w-full opacity-60 group-hover:opacity-100 transition-opacity relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none"></div>
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                      <defs>
                          <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={0.5}/>
                              <stop offset="100%" stopColor={color} stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={color} 
                        strokeWidth={2} 
                        fill={`url(#grad-${title})`} 
                        isAnimationActive={false}
                      />
                  </AreaChart>
              </ResponsiveContainer>
          </div>
          
          {/* Hover Glow Background */}
          <div 
            className="absolute -right-10 -bottom-10 w-40 h-40 blur-[60px] rounded-full opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
            style={{ backgroundColor: color }}
          ></div>
          
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              <ArrowUpRight className="w-4 h-4 text-gray-500" />
          </div>
      </MotionDiv>
    );
};

const CyberMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeNodes, setActiveNodes] = useState<{x:number, y:number, life:number}[]>([]);
    const mousePos = useRef({ x: -100, y: -100 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        const points: {x:number, y:number, baseAlpha:number}[] = [];
        const cols = 24;
        const rows = 14;
        
        const resize = () => {
            canvas.width = canvas.parentElement?.offsetWidth || 300;
            canvas.height = canvas.parentElement?.offsetHeight || 200;
            points.length = 0;
            const xStep = canvas.width / cols;
            const yStep = canvas.height / rows;
            
            for(let r=0; r<=rows; r++) {
                for(let c=0; c<=cols; c++) {
                    const nx = c/cols;
                    const ny = r/rows;
                    const isLand = (ny > 0.2 && ny < 0.8) && (nx > 0.1 && nx < 0.9) && Math.random() > 0.45;
                    if(isLand) {
                        points.push({
                            x: c * xStep + (Math.random() * 5),
                            y: r * yStep + (Math.random() * 5),
                            baseAlpha: 0.1 + Math.random() * 0.2
                        });
                    }
                }
            }
        };
        
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        resize();
        window.addEventListener('resize', resize);
        canvas.addEventListener('mousemove', handleMouseMove);

        let frame = 0;
        const loop = () => {
            frame++;
            ctx.clearRect(0,0,canvas.width, canvas.height);
            
            if(frame % 15 === 0 && Math.random() > 0.3) {
                const target = points[Math.floor(Math.random() * points.length)];
                if(target) setActiveNodes(prev => [...prev, { x: target.x, y: target.y, life: 1.0 }]);
            }

            points.forEach(p => {
                const dist = Math.hypot(p.x - mousePos.current.x, p.y - mousePos.current.y);
                const hoverEffect = Math.max(0, 100 - dist) / 100;
                ctx.fillStyle = `rgba(100, 116, 139, ${p.baseAlpha + hoverEffect * 0.6})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5 + hoverEffect * 1.5, 0, Math.PI*2);
                ctx.fill();
            });

            setActiveNodes(prev => {
                const next: typeof prev = [];
                prev.forEach(node => {
                    node.life -= 0.015;
                    if(node.life > 0) {
                        const size = (1-node.life) * 30;
                        const alpha = node.life;
                        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.8})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, size, 0, Math.PI*2);
                        ctx.stroke();
                        ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 2, 0, Math.PI*2);
                        ctx.fill();
                        points.forEach(p => {
                            const d = Math.hypot(p.x - node.x, p.y - node.y);
                            if(d < 60 && Math.random() > 0.9) {
                                ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.2})`;
                                ctx.beginPath();
                                ctx.moveTo(node.x, node.y);
                                ctx.lineTo(p.x, p.y);
                                ctx.stroke();
                            }
                        });
                        next.push(node);
                    }
                });
                return next;
            });
            requestAnimationFrame(loop);
        };
        loop();
        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="relative w-full h-56 bg-[#080808] border border-[#1f1f1f] rounded-xl overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex flex-col">
                <span className="text-[10px] font-bold text-[#22d3ee] font-mono uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    Global Node Activity
                </span>
                <span className="text-[9px] text-gray-500 font-mono">Real-time signal propagation</span>
            </div>
            
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1 text-[9px] font-mono text-gray-500">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#22d3ee] rounded-full animate-pulse"></span>
                    <span>ONLINE</span>
                </div>
                <span>LATENCY: 24ms</span>
            </div>

            <canvas ref={canvasRef} className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500 cursor-crosshair" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
        </div>
    );
};

const AgentHive: React.FC<{ count: number }> = ({ count }) => {
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 flex-1 relative overflow-hidden flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#9d4edd]" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Agent Hive</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#9d4edd] animate-pulse"></span>
                    <span className="text-[10px] font-mono text-[#9d4edd] border border-[#9d4edd]/30 px-2 py-0.5 rounded bg-[#9d4edd]/10">{count} Active</span>
                </div>
            </div>
            
            <div className="flex-1 grid grid-cols-6 gap-2 relative z-10 content-center">
                {Array.from({ length: 18 }).map((_, i) => {
                    const isActive = i < count;
                    const isWorking = isActive && Math.random() > 0.6;
                    return (
                        <div key={i} className="group relative flex justify-center">
                            <div className={`w-10 h-11 relative clip-hex transition-all duration-500 
                                ${isActive 
                                    ? isWorking 
                                        ? 'bg-[#9d4edd] scale-105 shadow-[0_0_15px_#9d4edd]' 
                                        : 'bg-[#1f1f1f] border-2 border-[#9d4edd]/40 hover:bg-[#9d4edd]/20' 
                                    : 'bg-[#111] opacity-20 border border-gray-800'}
                            `}>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {isActive ? (
                                        isWorking ? <Activity className="w-4 h-4 text-black animate-spin" /> : 
                                        <Bot className="w-4 h-4 text-[#9d4edd] group-hover:text-white transition-colors" />
                                    ) : (
                                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
                <Hexagon className="w-48 h-48 text-[#9d4edd]" strokeWidth={0.5} />
            </div>
            <style>{`
                .clip-hex {
                    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                }
            `}</style>
        </div>
    );
};

const OraclePanel: React.FC = () => {
    // Live Intelligence State
    const [signals, setSignals] = useState<{id: number, text: string, type: string, trend?: 'up' | 'down'}[]>([]);
    const [systemLoad, setSystemLoad] = useState<number[]>(new Array(20).fill(20));
    
    // EXPOSE DATA TO VOICE CORE
    useVoiceExpose('oracle-market-feed', {
        type: 'Market Intelligence',
        metrics: {
            status: 'LIVE_FEED_ACTIVE',
            active_signals: signals.length,
            latest_signal: signals[0]?.text || 'Initializing...'
        }
    });

    useEffect(() => {
        const events = [
            { text: "DRIVE_ORG: Optimizing Sector 7 file allocation...", type: "SYS" },
            { text: "ARCH: Rebuilding drive index tree...", type: "SYS" },
            { text: "MARKET: GPU Compute Spot Price +4%", type: "MKT", trend: 'up' },
            { text: "NET: 40TB Data Ingest Complete", type: "NET" },
            { text: "SEC: Analyzing drive permissions...", type: "SEC" },
            { text: "MARKET: Storage Credits -2%", type: "MKT", trend: 'down' },
            { text: "WORKFLOW: Initiating Auto-Sort Protocol...", type: "PROC" },
            { text: "ARCH: Defragmenting Neural Lattice...", type: "SYS" },
            { text: "DRIVE_ORG: 1,024 Orphaned files archived", type: "SYS" }
        ];

        const interval = setInterval(() => {
            const evt = events[Math.floor(Math.random() * events.length)];
            setSignals(prev => [{ id: Date.now(), text: evt.text, type: evt.type, trend: evt.trend as any }, ...prev].slice(0, 8));
            
            setSystemLoad(prev => [...prev.slice(1), 20 + Math.random() * 60]);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl flex flex-col h-96 relative group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            
            <div className="h-10 bg-[#111] border-b border-[#1f1f1f] flex items-center justify-between px-4 relative z-10">
                <div className="flex items-center gap-2">
                    <RadioReceiver className="w-4 h-4 text-[#9d4edd] animate-pulse" />
                    <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">
                        THE ORACLE <span className="text-gray-600">//</span> INTELLIGENCE L0
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse"></span>
                    <span className="text-[9px] font-mono text-[#42be65]">LIVE STREAM</span>
                </div>
            </div>
            
            <div className="flex flex-1 p-4 gap-4 relative z-10 overflow-hidden">
                {/* Left: Signal Stream */}
                <div className="flex-1 bg-[#050505] border border-[#222] rounded p-2 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-2 px-2 border-b border-[#222] pb-1">
                        <span className="text-[9px] text-gray-500 font-mono uppercase">Incoming Signals</span>
                        <Activity className="w-3 h-3 text-gray-600" />
                    </div>
                    <div className="flex-1 overflow-hidden space-y-1">
                        <AnimatePresence initial={false}>
                            {signals.map((sig) => (
                                <motion.div 
                                    key={sig.id}
                                    initial={{ opacity: 0, x: -20, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-3 p-2 rounded hover:bg-[#111] border border-transparent hover:border-[#333] transition-colors"
                                >
                                    <span className={`text-[8px] font-bold font-mono px-1.5 rounded border ${
                                        sig.type === 'MKT' ? 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10' :
                                        sig.type === 'SEC' ? 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10' :
                                        sig.type === 'SYS' ? 'text-[#9d4edd] border-[#9d4edd]/30 bg-[#9d4edd]/10' :
                                        'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10'
                                    }`}>
                                        {sig.type}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-300 truncate flex-1">{sig.text}</span>
                                    {sig.trend && (
                                        sig.trend === 'up' ? 
                                        <TrendingUp className="w-3 h-3 text-[#42be65]" /> : 
                                        <TrendingDown className="w-3 h-3 text-[#ef4444]" />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right: Visualizers */}
                <div className="w-1/3 flex flex-col gap-4">
                    {/* System Load */}
                    <div className="flex-1 bg-[#050505] border border-[#222] rounded p-2 flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] text-gray-500 font-mono uppercase">Processing Load</span>
                            <span className="text-[9px] text-[#9d4edd] font-mono">{Math.round(systemLoad[systemLoad.length-1])}%</span>
                        </div>
                        <div className="flex-1 flex items-end gap-0.5 opacity-80">
                            {systemLoad.map((val, i) => (
                                <div 
                                    key={i} 
                                    className="flex-1 bg-[#9d4edd] transition-all duration-300"
                                    style={{ height: `${val}%`, opacity: 0.3 + (i/20)*0.7 }}
                                ></div>
                            ))}
                        </div>
                    </div>

                    {/* Drive Status */}
                    <div className="flex-1 bg-[#050505] border border-[#222] rounded p-2 flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-2 text-gray-400">
                            <HardDrive className="w-3 h-3" />
                            <span className="text-[9px] font-mono uppercase">Drive Health</span>
                        </div>
                        <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#42be65] w-[92%] shadow-[0_0_10px_#42be65]"></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-gray-600">
                            <span>OPTIMIZED</span>
                            <span>92%</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 mt-1">
                            <FolderGit2 className="w-3 h-3" />
                            <span className="text-[9px] font-mono uppercase">Workflow</span>
                        </div>
                        <div className="flex gap-1">
                            {[1,1,1,0,0].map((v, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full ${v ? 'bg-[#22d3ee]' : 'bg-[#111]'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SentinelRadar: React.FC<{ packetLoss: number }> = ({ packetLoss }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Simple radar loop
        let angle = 0;
        const render = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const width = canvas.width;
            const height = canvas.height;

            if (width <= 0 || height <= 0) return; 

            const cx = width / 2;
            const cy = height / 2;
            const padding = 10;
            const r = Math.max(0, (Math.min(cx, cy) - padding));

            ctx.clearRect(0,0,width, height);
            
            if (r > 0) {
                // Sweep
                angle += 0.05;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, angle, angle + 0.5);
                ctx.fillStyle = `rgba(34, 211, 238, 0.15)`;
                ctx.fill();
                
                // Circles
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();

                // Axis
                ctx.strokeStyle = '#222';
                ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

                // Blips
                if (Math.random() > 0.95) {
                    const bx = cx + (Math.random() - 0.5) * r * 1.5;
                    const by = cy + (Math.random() - 0.5) * r * 1.5;
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI*2); ctx.fill();
                }
            }
            
            requestAnimationFrame(render);
        }
        render();
    }, []);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 flex-1 relative overflow-hidden flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    <Radar className={`w-4 h-4 ${packetLoss > 0.05 ? 'text-red-500 animate-pulse' : 'text-[#22d3ee]'}`} />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Sentinel Scan</span>
                </div>
                <div className="text-[9px] font-mono text-gray-600">SECTOR_9</div>
            </div>
            <div className="flex-1 relative z-10 w-full min-h-[150px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState } = useAppStore();
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<{title: string, color: string, data: any[]} | null>(null);

  // Live Telemetry State
  const [telemetry, setTelemetry] = useState({
      cpu: 12,
      net: 1.2,
      mem: 64,
      memCache: 15,
      temp: 42,
      packetLoss: 0.01,
      agents: Array(12).fill(0).map(() => Math.random() > 0.5 ? 1 : 0) // 1=Active, 0=Idle
  });

  // History for Sparklines
  const [cpuHistory, setCpuHistory] = useState<{value: number, time: string}[]>([]);
  const [netHistory, setNetHistory] = useState<{value: number, time: string}[]>([]);
  const [memHistory, setMemHistory] = useState<{value: number, time: string}[]>([]);

  // --- VOICE CORE UPLINK ---
  // Expose the live telemetry to the AI System Mind
  useVoiceExpose('dashboard-telemetry-main', {
      type: 'System Monitor',
      description: 'Real-time server telemetry',
      metrics: {
          cpu: `${telemetry.cpu.toFixed(1)}%`,
          network: `${telemetry.net.toFixed(1)} GB/s`,
          memory: `${telemetry.mem.toFixed(1)}%`,
          temperature: `${telemetry.temp.toFixed(1)} C`,
          status: telemetry.packetLoss > 0.05 ? 'THREAT DETECTED' : 'OPTIMAL'
      },
      activeAgents: telemetry.agents.filter(a => a === 1).length
  });

  const [logs, setLogs] = useState<string[]>([
      "SYSTEM_INIT: Core services online",
      "NET_LINK: Uplink established (secure)",
      "AGENT_01: Context sync complete"
  ]);

  // Clock & Uptime
  useEffect(() => {
    const timer = setInterval(() => {
        setTime(new Date());
        setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Uptime
  const formatUptime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Telemetry Simulation Loop
  useEffect(() => {
      const interval = setInterval(() => {
          setTelemetry(prev => {
              const newCpu = Math.max(5, Math.min(95, prev.cpu + (Math.random() * 15 - 7)));
              const newNet = Math.max(0.1, Math.min(10.0, prev.net + (Math.random() * 2 - 1)));
              const newMem = Math.max(20, Math.min(90, prev.mem + (Math.random() * 5 - 2.5)));
              const now = new Date().toLocaleTimeString();

              setCpuHistory(h => [...h, { value: newCpu, time: now }].slice(-50));
              setNetHistory(h => [...h, { value: newNet * 10, time: now }].slice(-50));
              setMemHistory(h => [...h, { value: newMem, time: now }].slice(-50));

              return {
                  cpu: newCpu,
                  net: newNet,
                  mem: newMem,
                  memCache: Math.max(5, Math.min(20, prev.memCache + (Math.random() * 2 - 1))),
                  temp: Math.max(35, Math.min(85, prev.temp + (Math.random() * 3 - 1.5))),
                  packetLoss: Math.random() > 0.95 ? Math.random() * 0.1 : 0,
                  agents: prev.agents.map(a => Math.random() > 0.9 ? (a === 1 ? 0 : 1) : a)
              };
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // Log Simulation Loop
  useEffect(() => {
      const messages = [
          "PACKET_IN: 0x4F verified",
          "THERMAL: Fan curve adjusted",
          "MEM_GC: Garbage collection cycle",
          "AGENT_02: Reasoning complete",
          "NET_HB: Heartbeat ACK",
          "STORAGE: Block committed",
          "CRYPT: Key rotation pending",
          "KERNEL: Task scheduled [ID:992]",
          "AI_CORE: Inference complete (12ms)",
          "SEC_SCAN: Integrity verified"
      ];
      
      const interval = setInterval(() => {
          const msg = messages[Math.floor(Math.random() * messages.length)];
          const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
          setLogs(prev => [...prev.slice(-10), `[${timestamp}] ${msg}`]);
      }, 2500);
      return () => clearInterval(interval);
  }, []);

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        // Validate MIME types to prevent GIF errors in generation models
        const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!supportedTypes.includes(file.type)) {
            alert(`File type ${file.type} is not supported. Please use PNG, JPEG, or WEBP.`);
            return;
        }

        try {
            const fileData = await fileToGenerativePart(file);
            setDashboardState({ referenceImage: fileData });
        } catch (err) {
            console.error("Reference upload failed", err);
        }
    }
  };

  const removeReference = () => {
      setDashboardState({ referenceImage: null });
  };

  const generateIdentity = async () => {
    setDashboardState({ isGenerating: true });
    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
          await promptSelectKey();
          setDashboardState({ isGenerating: false });
          return;
      }
      
      const prompt = `
        Hyper-realistic 4K cinematic render of a futuristic Sovereign OS command center.
        A sleek, high-tech workspace with holographic displays and advanced glass interfaces.
        The large central main screen prominently displays the text "METAVENTIONS AI" in a sharp, modern sans-serif font with glowing edges.
        On the dark metallic wall in the background, an elegant illuminated sign reads "SOVEREIGN EMPIRE" in deep violet neon.
        Atmosphere is moody and sophisticated, featuring rich amethyst purple and electric teal accent lighting.
        Photorealistic, volumetric lighting, ray-traced reflections, 8k resolution, architectural visualization style.
      `;
      
      const url = await generateArchitectureImage(
          prompt, 
          AspectRatio.RATIO_16_9, 
          ImageSize.SIZE_2K,
          dashboard.referenceImage
      );
      
      setDashboardState({ identityUrl: url });
    } catch (e) {
        console.error("Identity Generation Failed", e);
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 pb-32 bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30 relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#9d4edd]/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#22d3ee]/5 rounded-full blur-[120px]"></div>
      </div>

      <AnimatePresence>
          {selectedMetric && (
              <MetricDetailOverlay 
                  title={selectedMetric.title}
                  color={selectedMetric.color}
                  data={selectedMetric.data}
                  onClose={() => setSelectedMetric(null)}
              />
          )}
      </AnimatePresence>

      <div className="relative z-10 max-w-[1920px] mx-auto">
          {/* 1. Cinematic Header */}
          <MotionDiv
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative mb-8 p-8 rounded-2xl border border-[#1f1f1f] bg-[radial-gradient(circle_at_top_right,rgba(20,20,20,1),rgba(0,0,0,1))] overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.02)_75%,transparent_75%,transparent)] bg-[size:20px_20px] pointer-events-none opacity-20"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-end relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#42be65] shadow-[0_0_10px_#42be65] animate-pulse"></div>
                        <span className="text-[10px] font-mono text-[#42be65] uppercase tracking-widest">System Optimal</span>
                    </div>
                    <h1 className="text-5xl font-black font-mono text-white mb-3 tracking-tighter uppercase leading-none">METAVENTIONS AI</h1>
                    <p className="text-xs text-gray-500 font-mono max-w-lg leading-relaxed">
                        Sovereign Architecture Overview. Real-time telemetry, asset generation, and intelligence feeds active.
                    </p>
                </div>
                
                <div className="flex items-center gap-8 mt-6 md:mt-0 bg-[#080808]/50 p-4 rounded-xl border border-[#222]">
                     <div className="text-right">
                         <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Session Uptime</div>
                         <div className="text-xl font-mono font-bold text-white tracking-widest">{formatUptime(uptime)}</div>
                     </div>
                     <div className="w-px h-8 bg-[#333]"></div>
                     <div className="text-right">
                         <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Local Time</div>
                         <div className="text-xl font-mono font-bold text-white tracking-widest">{time.toLocaleTimeString()}</div>
                     </div>
                </div>
            </div>
          </MotionDiv>

          {/* 2. Metrics Grid with Sparklines */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
              <MetricCard 
                title="CPU Load" 
                value={`${telemetry.cpu.toFixed(1)}%`} 
                subtext="12 Cores Active" 
                icon={Cpu} 
                color="#9d4edd" 
                data={cpuHistory}
                onClick={() => setSelectedMetric({ title: 'CPU', color: '#9d4edd', data: cpuHistory })}
              />
              <MetricCard 
                title="Network" 
                value={`${telemetry.net.toFixed(1)} GB/s`} 
                subtext="Encrypted Uplink" 
                icon={Network} 
                color="#22d3ee" 
                data={netHistory}
                onClick={() => setSelectedMetric({ title: 'Network', color: '#22d3ee', data: netHistory })}
              />
              <MetricCard 
                title="Memory" 
                value={`${telemetry.mem.toFixed(1)}%`} 
                subtext={`Cache: ${telemetry.memCache.toFixed(0)}%`} 
                icon={Database} 
                color="#f59e0b" 
                data={memHistory}
                onClick={() => setSelectedMetric({ title: 'Memory', color: '#f59e0b', data: memHistory })}
              />
              <MetricCard 
                title="Security" 
                value="SECURE" 
                subtext="0 Intrusions" 
                icon={Lock} 
                color="#42be65" 
                data={[]} // Flatline for security
              />
          </MotionDiv>

          {/* 3. Main Content Split */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8"
          >
              {/* LEFT: Identity & GeoMap (2/3) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                   
                   {/* Identity Asset Gen */}
                   <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 relative overflow-hidden group flex flex-col h-[420px]">
                       {/* ... [Content Omitted for Brevity - Keeping Structure] ... */}
                       <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                           <ScanFace className="w-32 h-32 text-[#9d4edd]" />
                       </div>
                       
                       <div className="flex justify-between items-start mb-6 relative z-10 shrink-0">
                           <div>
                               <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
                                   <Shield className="w-4 h-4 text-[#9d4edd]" />
                                   Visual Identity
                               </h2>
                               <p className="text-[10px] text-gray-500 font-mono mt-1">Black Amethyst Brand Projection System</p>
                           </div>
                           <button 
                                onClick={generateIdentity}
                                disabled={dashboard.isGenerating}
                                className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] text-gray-300 text-[10px] font-bold font-mono uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 rounded-lg"
                           >
                                {dashboard.isGenerating ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                                {dashboard.isGenerating ? 'Rendering...' : 'Generate Identity'}
                           </button>
                       </div>

                       <div className="flex-1 flex gap-6 min-h-0">
                            {/* ... Image/Ref area ... */}
                            <div className="flex-1 bg-[#050505] border border-[#333] rounded-lg overflow-hidden relative flex items-center justify-center group/img">
                                {dashboard.identityUrl ? (
                                    <>
                                        <img src={dashboard.identityUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Identity" />
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-6">
                                            <div>
                                                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block mb-1">Generated Artifact</span>
                                                <span className="text-[10px] text-[#9d4edd] font-mono">High Fidelity Render</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="text-[10px] text-gray-600 font-mono uppercase mb-4 tracking-widest">No Identity Data</div>
                                        <div className="w-16 h-16 border border-[#333] rounded-full mx-auto flex items-center justify-center bg-[#080808]">
                                            <X className="w-6 h-6 text-gray-700" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="w-64 flex flex-col gap-4 shrink-0">
                                <div className="bg-[#111] p-5 rounded-lg border border-[#222]">
                                    <label className="text-[10px] font-mono text-gray-500 uppercase block mb-3 font-bold">Style Reference (Optional)</label>
                                    <div className="flex items-center gap-3">
                                         {dashboard.referenceImage ? (
                                             <div className="flex flex-col gap-2 w-full">
                                                 <div className="w-full h-24 bg-black rounded overflow-hidden border border-[#333]">
                                                     <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover" />
                                                 </div>
                                                 <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-mono text-gray-300 truncate max-w-[120px]">{dashboard.referenceImage.name}</span>
                                                    <button onClick={removeReference} className="text-gray-500 hover:text-red-500 p-1"><X className="w-3 h-3"/></button>
                                                 </div>
                                             </div>
                                         ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-24 px-4 py-2 bg-[#050505] border border-dashed border-[#333] hover:border-[#9d4edd] rounded cursor-pointer transition-colors group/upload">
                                                <ImageIcon className="w-6 h-6 text-gray-500 mb-2 group-hover/upload:text-[#9d4edd] transition-colors" />
                                                <span className="text-[9px] font-mono text-gray-500 group-hover/upload:text-gray-300 text-center">Upload Ref</span>
                                                <input type="file" className="hidden" onChange={handleReferenceUpload} accept="image/png, image/jpeg, image/webp" />
                                            </label>
                                         )}
                                    </div>
                                </div>
                                
                                <div className="bg-[#111]/50 p-4 rounded-lg border border-[#222] flex-1">
                                    <div className="flex items-start gap-3">
                                        <Target className="w-4 h-4 text-gray-600 mt-0.5" />
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Profile</h4>
                                            <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                                                Optimized for high-impact visual communication. Ensures alignment with sovereign brand directives.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                       </div>
                   </div>

                   {/* Cyber Map */}
                   <CyberMap />
              </div>

              {/* RIGHT: Agents & Logs (1/3) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Agent Hive (Replaces Grid) */}
                  <AgentHive count={telemetry.agents.filter(a => a === 1).length} />

                  {/* System Logs */}
                  <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 flex-1 flex flex-col min-h-[300px] overflow-hidden">
                      <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono mb-4">
                           <Terminal className="w-4 h-4 text-[#42be65]" />
                           System Logs
                      </h2>
                      <div className="space-y-3 font-mono text-[10px] flex-1 overflow-y-auto custom-scrollbar pr-2">
                          {logs.map((log, i) => (
                              <div key={i} className="text-gray-500 border-l-2 border-[#1f1f1f] pl-3 py-1 flex gap-2 animate-in slide-in-from-left-2 hover:border-[#42be65] transition-colors hover:bg-white/5">
                                  <span className="text-gray-600 whitespace-nowrap shrink-0">{log.split(']')[0]}]</span>
                                  <span className={`break-all ${log.includes('ERROR') ? 'text-red-400' : 'text-gray-300'}`}>{log.split(']')[1]}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </MotionDiv>

          {/* 4. Oracle & Charts (Bottom) */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
              <div className="lg:col-span-8">
                   <OraclePanel />
              </div>
              
              <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Sentinel Radar Visualization (Active Defense) */}
                  <SentinelRadar packetLoss={telemetry.packetLoss} />
              </div>
          </MotionDiv>
      </div>

    </div>
  );
};

export default Dashboard;
