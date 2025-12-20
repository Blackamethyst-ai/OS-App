
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey, fileToGenerativePart } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';
import { Activity, Shield, Image as ImageIcon, Sparkles, RefreshCw, Cpu, Clock, Users, ArrowUpRight, X, ScanFace, Terminal, Zap, Network, Database, Globe, Lock, Wifi, AlertCircle, Radio, Hexagon, TrendingUp, TrendingDown, DollarSign, BarChart3, RadioReceiver, Search, Filter, SortAsc, SortDesc, Bot, BrainCircuit, MapPin, Share2, Server, Radar, Target, Eye, FileText, FolderGit2, HardDrive, User, GitBranch, PieChart, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, BarChart, Bar, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { useVoiceAction } from '../hooks/useVoiceAction';

const MotionDiv = motion.div as any;

// 1. Metric Detail Overlay
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
                            <XAxis dataKey="time" hide axisLine={false} tickLine={false} />
                            <YAxis stroke="#444" tick={{fontSize: 10, fontFamily: 'Fira Code', fill: '#666'}} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', fontSize: '11px', fontFamily: 'Fira Code', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#eee' }} itemStyle={{ color: color }} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fill={`url(#grad-detail-${title})`} animationDuration={1000} activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }} />
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

// 2. Metric Card
const MetricCard = ({ title, value, subtext, icon: Icon, color, data, onClick }: any) => {
    const chartData = useMemo(() => {
        if (data && data.length > 0) return data;
        return Array.from({ length: 20 }, (_, i) => ({ value: 40 + Math.random() * 40 }));
    }, [data, value]);

    return (
      <MotionDiv onClick={onClick} whileHover={{ scale: 1.02, translateY: -4 }} whileTap={{ scale: 0.98 }} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden hover:border-[#333] cursor-pointer group shadow-lg relative select-none flex flex-col justify-between" style={{ height: '160px' }}>
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
                  <div className="text-3xl font-mono font-bold text-white group-hover:text-white/90 transition-colors tracking-tight">{value}</div>
                  <div className="text-[10px] font-mono text-gray-600 mt-1 flex items-center gap-1">{subtext}</div>
              </div>
          </div>
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
                      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title})`} isAnimationActive={false} />
                  </AreaChart>
              </ResponsiveContainer>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 blur-[60px] rounded-full opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ backgroundColor: color }}></div>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              <ArrowUpRight className="w-4 h-4 text-gray-500" />
          </div>
      </MotionDiv>
    );
};

// 3. CyberMap
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

// 4. AgentHive (Updated to accept real agents)
const AgentHive: React.FC<{ activeAgents: any[] }> = ({ activeAgents }) => {
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 flex-1 relative overflow-hidden flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#9d4edd]" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Agent Hive</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#9d4edd] animate-pulse"></span>
                    <span className="text-[10px] font-mono text-[#9d4edd] border border-[#9d4edd]/30 px-2 py-0.5 rounded bg-[#9d4edd]/10">
                        {activeAgents.length} Active
                    </span>
                </div>
            </div>
            <div className="flex-1 grid grid-cols-6 gap-2 relative z-10 content-center">
                {Array.from({ length: 18 }).map((_, i) => {
                    const agent = activeAgents[i];
                    const isActive = !!agent;
                    
                    return (
                        <div key={i} className="group relative flex justify-center" title={agent ? `${agent.type}: ${agent.label}` : 'Idle Slot'}>
                            <div className={`w-10 h-11 relative clip-hex transition-all duration-500 flex items-center justify-center
                                ${isActive ? 'bg-[#9d4edd]/20 border-2 border-[#9d4edd] shadow-[0_0_10px_#9d4edd]' : 'bg-[#111] opacity-20 border border-gray-800'}
                            `}>
                                {isActive ? (
                                    agent.type === 'VOICE' ? <Radio className="w-4 h-4 text-[#22d3ee] animate-pulse" /> :
                                    agent.type === 'RESEARCH' ? <BrainCircuit className="w-4 h-4 text-[#f59e0b] animate-spin-slow" /> :
                                    agent.type === 'BICAMERAL' ? <GitBranch className="w-4 h-4 text-red-500" /> :
                                    <Bot className="w-4 h-4 text-[#9d4edd]" />
                                ) : (
                                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
                <Hexagon className="w-48 h-48 text-[#9d4edd]" strokeWidth={0.5} />
            </div>
            <style>{`.clip-hex { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }`}</style>
        </div>
    );
};

// 5. OraclePanel (Updated with Bar Chart for Resource Distribution)
const OraclePanel: React.FC = () => {
    const { system } = useAppStore();
    
    const signals = system.logs
        .filter((l: any) => l.level !== 'ERROR')
        .slice(-8)
        .reverse()
        .map((l: any) => ({
            id: l.id,
            text: l.message,
            type: l.level === 'WARN' ? 'WARN' : l.message?.includes('VOICE') ? 'AUDIO' : l.message?.includes('RESEARCH') ? 'INTEL' : 'SYS',
            timestamp: l.timestamp
        }));

    // Mock data for resource distribution
    const resourceDistribution = [
        { name: 'Compute', value: 45, color: '#9d4edd' },
        { name: 'Energy', value: 30, color: '#22d3ee' },
        { name: 'Capital', value: 25, color: '#42be65' },
    ];

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl flex flex-col h-96 relative group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            <div className="h-10 bg-[#111] border-b border-[#1f1f1f] flex items-center px-4 relative z-10 justify-between">
                <div className="flex items-center gap-2">
                    <RadioReceiver className="w-4 h-4 text-[#9d4edd] animate-pulse" />
                    <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">THE ORACLE <span className="text-gray-600">//</span> INTELLIGENCE L0</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse"></span>
                    <span className="text-[9px] font-mono text-[#42be65]">LIVE STREAM</span>
                </div>
            </div>
            <div className="flex flex-1 p-4 gap-4 relative z-10 overflow-hidden">
                <div className="flex-1 bg-[#050505] border border-[#222] rounded p-2 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-2 px-2 border-b border-[#222] pb-1">
                        <span className="text-[9px] text-gray-500 font-mono uppercase">Incoming Signals</span>
                        <Activity className="w-3 h-3 text-gray-600" />
                    </div>
                    <div className="flex-1 overflow-hidden space-y-1">
                        <AnimatePresence initial={false}>
                            {signals.map((sig: any) => (
                                <motion.div key={sig.id} initial={{ opacity: 0, x: -20, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0 }} className="flex items-center gap-3 p-2 rounded hover:bg-[#111] border border-transparent hover:border-[#333] transition-colors">
                                    <span className={`text-[8px] font-bold font-mono px-1.5 rounded border 
                                        ${sig.type === 'WARN' ? 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10' : 
                                          sig.type === 'AUDIO' ? 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10' : 
                                          sig.type === 'INTEL' ? 'text-[#9d4edd] border-[#9d4edd]/30 bg-[#9d4edd]/10' : 
                                          'text-gray-500 border-gray-700 bg-[#111]'}`}>
                                        {sig.type}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-300 truncate flex-1">{sig.text}</span>
                                    <span className="text-[8px] text-gray-600">{new Date(sig.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
                <div className="w-1/3 flex flex-col gap-4">
                    <div className="flex-1 bg-[#050505] border border-[#222] rounded p-2 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] text-gray-500 font-mono uppercase">Resource Allocation</span>
                            <PieChart className="w-3 h-3 text-gray-600" />
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={resourceDistribution} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#666" fontSize={8} width={50} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {resourceDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.6} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

// 6. SystemVitality Matrix (Replaces Radar with functional Scatter Plot)
const SystemVitalityMatrix: React.FC = () => {
    const data = useMemo(() => [
        { id: 'HW', x: 20, y: 80, z: 400, label: 'Hardware' },
        { id: 'CODE', x: 45, y: 60, z: 300, label: 'Code' },
        { id: 'STRAT', x: 70, y: 90, z: 500, label: 'Strategy' },
        { id: 'MEM', x: 10, y: 30, z: 200, label: 'Memory' },
        { id: 'VOX', x: 85, y: 40, z: 350, label: 'Voice' },
        { id: 'RSRCH', x: 55, y: 20, z: 250, label: 'Research' },
    ], []);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 flex-1 relative overflow-hidden flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#22d3ee]" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Vitality Matrix</span>
                </div>
                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-tighter">Entropy vs Vitality</div>
            </div>
            <div className="flex-1 relative z-10 w-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis type="number" dataKey="x" name="entropy" unit="%" stroke="#444" tick={{ fontSize: 8, fontFamily: 'monospace' }} />
                        <YAxis type="number" dataKey="y" name="vitality" unit="%" stroke="#444" tick={{ fontSize: 8, fontFamily: 'monospace' }} />
                        <ZAxis type="number" dataKey="z" range={[60, 400]} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px', borderRadius: '4px' }} />
                        <Scatter name="System Sectors" data={data}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.y > 60 ? '#10b981' : entry.x > 60 ? '#ef4444' : '#9d4edd'} fillOpacity={0.6} strokeWidth={1} stroke={entry.y > 60 ? '#10b981' : '#fff'} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState, user, toggleProfile, research, voice, bicameral, kernel, system } = useAppStore();
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<{title: string, color: string, data: any[]} | null>(null);

  const [telemetry, setTelemetry] = useState({
      cpu: 12,
      net: 1.2,
      mem: 64,
      memCache: 15,
      temp: 42,
      packetLoss: 0.01,
  });

  const activeAgents = useMemo(() => {
      const agents = [];
      if (voice.isActive) agents.push({ type: 'VOICE', label: voice.voiceName });
      
      const activeResearch = research.tasks.filter(t => ['SEARCHING', 'PLANNING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status));
      activeResearch.forEach(t => agents.push({ type: 'RESEARCH', label: (String(t.query || '')).substring(0, 10) }));
      
      if (bicameral.isSwarming) {
          agents.push({ type: 'BICAMERAL', label: 'Swarm' });
          for(let i=0; i<3; i++) agents.push({ type: 'BICAMERAL', label: 'Node' });
      }
      
      return agents;
  }, [voice.isActive, voice.voiceName, research.tasks, bicameral.isSwarming]);

  const [cpuHistory, setCpuHistory] = useState<{value: number, time: string}[]>([]);
  const [netHistory, setNetHistory] = useState<{value: number, time: string}[]>([]);
  const [memHistory, setMemHistory] = useState<{value: number, time: string}[]>([]);

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
      activeAgents: activeAgents.length
  });

  useEffect(() => {
    const timer = setInterval(() => {
        setTime(new Date());
        setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
              };
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
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
      
      const prompt = `Hyper-realistic 4K cinematic render of a futuristic Sovereign OS command center. High-tech visual identity.`;
      const url = await generateArchitectureImage(prompt, AspectRatio.RATIO_16_9, ImageSize.SIZE_2K, dashboard.referenceImage);
      setDashboardState({ identityUrl: url });
    } catch (e) {
        console.error("Identity Generation Failed", e);
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  useVoiceAction('generate_identity', 'Generate visual brand identity asset for the dashboard.', generateIdentity);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 pb-32 bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30 relative">
      
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
          {/* Header */}
          <MotionDiv initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mb-8 p-8 rounded-2xl border border-[#1f1f1f] bg-[radial-gradient(circle_at_top_right,rgba(20,20,20,1),rgba(0,0,0,1))] overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.02)_75%,transparent_75%,transparent)] bg-[size:20px_20px] pointer-events-none opacity-20"></div>
            <div className="flex flex-col md:flex-row justify-between items-end relative z-10">
                <div className="flex items-end gap-6 w-full">
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative group cursor-pointer shrink-0" onClick={() => toggleProfile(true)}>
                        <div className="w-24 h-24 rounded-full border-2 border-[#333] p-1 bg-[#0a0a0a] group-hover:border-[#9d4edd] transition-colors shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-[#111]">
                                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User Identity" /> : <User className="w-10 h-10 text-gray-600" />}
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#0a0a0a] border border-[#333] px-2 py-0.5 rounded-full text-[8px] font-mono text-[#9d4edd] uppercase tracking-wider shadow-lg">{user.role}</div>
                    </motion.div>
                    <div className="flex-1">
                        <div className="flex flex-col gap-1 mb-2">
                            <span className="text-[8px] font-mono tracking-[0.4em] uppercase opacity-40">Sovereign Architecture Environment</span>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#42be65] shadow-[0_0_10px_#42be65] animate-pulse"></div>
                                <span className="text-[10px] font-mono text-[#42be65] uppercase tracking-widest">System Optimal</span>
                            </div>
                        </div>
                        <h1 className="text-5xl font-black font-mono text-white mb-3 tracking-tighter uppercase leading-none">METAVENTIONS AI</h1>
                        <p className="text-xs text-gray-500 font-mono max-w-lg leading-relaxed">Sovereign Architecture Overview. Real-time telemetry, asset generation, and intelligence feeds active.</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 mt-6 md:mt-0 w-full md:w-auto">
                    {/* Kernel HUD integrated into Dashboard Header */}
                    <div className="flex items-center justify-between md:justify-end gap-6 px-5 py-3 border border-white/5 rounded-xl bg-black/60 backdrop-blur-sm shadow-xl w-full md:w-auto mb-2">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1.5">Node Load</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1 bg-[#111] rounded-full overflow-hidden border border-white/5">
                                    <motion.div animate={{ width: `${kernel.coreLoad}%` }} className="h-full bg-[#9d4edd] shadow-[0_0_5px_#9d4edd]" />
                                </div>
                                <span className="text-[9px] font-mono text-white font-bold">{kernel.coreLoad}%</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/5"></div>
                        <div className="flex flex-col">
                            <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1.5">Entropy</span>
                            <span className="text-[14px] font-mono font-black text-[#22d3ee] leading-none drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{kernel.entropy}</span>
                        </div>
                        <div className="w-px h-8 bg-white/5"></div>
                        <div className="flex flex-col">
                            <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1.5">Integrity</span>
                            <span className="text-[14px] font-mono font-black text-[#10b981] leading-none drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">{kernel.integrity}%</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 bg-[#080808]/50 p-4 rounded-xl border border-[#222] shadow-inner w-full md:w-auto">
                         <div className="text-right">
                             <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Session Uptime</div>
                             <div className="text-xl font-mono font-bold text-white tracking-widest">{formatUptime(uptime)}</div>
                         </div>
                         <div className="w-px h-8 bg-[#333]"></div>
                         <div className="text-right">
                             <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Local Time</div>
                             <div className="text-xl font-mono font-bold text-white tracking-widest">{formatTime(time)}</div>
                         </div>
                    </div>
                </div>
            </div>
          </MotionDiv>

          {/* Metrics Grid */}
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, staggerChildren: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard title="CPU Load" value={`${telemetry.cpu.toFixed(1)}%`} subtext="12 Cores Active" icon={Cpu} color="#9d4edd" data={cpuHistory} onClick={() => setSelectedMetric({ title: 'CPU', color: '#9d4edd', data: cpuHistory })} />
              <MetricCard title="Network" value={`${telemetry.net.toFixed(1)} GB/s`} subtext="Encrypted Uplink" icon={Network} color="#22d3ee" data={netHistory} onClick={() => setSelectedMetric({ title: 'Network', color: '#22d3ee', data: netHistory })} />
              <MetricCard title="Memory" value={`${telemetry.mem.toFixed(1)}%`} subtext={`Cache: ${telemetry.memCache.toFixed(0)}%`} icon={Database} color="#f59e0b" data={memHistory} onClick={() => setSelectedMetric({ title: 'Memory', color: '#f59e0b', data: memHistory })} />
              <MetricCard title="Security" value="SECURE" subtext="0 Intrusions" icon={Lock} color="#42be65" data={[]} />
          </MotionDiv>

          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-8 flex flex-col gap-6">
                   <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 relative overflow-hidden group flex flex-col h-[420px]">
                       <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><ScanFace className="w-32 h-32 text-[#9d4edd]" /></div>
                       <div className="flex justify-between items-start mb-6 relative z-10">
                           <div>
                               <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono"><Shield className="w-4 h-4 text-[#9d4edd]" />Visual Identity</h2>
                               <p className="text-[10px] text-gray-500 font-mono mt-1">Black Amethyst Brand Projection System</p>
                           </div>
                           <button onClick={generateIdentity} disabled={dashboard.isGenerating} className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] text-gray-300 text-[10px] font-bold font-mono uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 rounded-lg">
                                {dashboard.isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                                {dashboard.isGenerating ? 'Rendering...' : 'Generate Identity'}
                           </button>
                       </div>
                       <div className="flex-1 flex gap-6 min-h-0">
                            <div className="flex-1 bg-[#050505] border border-[#333] rounded-lg overflow-hidden relative flex items-center justify-center group/img">
                                {dashboard.identityUrl ? <img src={dashboard.identityUrl} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" alt="Identity" /> : <div className="text-center p-4"><X className="w-16 h-16 text-gray-700 mx-auto" /></div>}
                            </div>
                            <div className="w-64 flex flex-col gap-4">
                                <div className="bg-[#111] p-5 rounded-lg border border-[#222]">
                                    <label className="text-[10px] font-mono text-gray-500 uppercase block mb-3 font-bold">Style Reference</label>
                                    {dashboard.referenceImage ? <div className="relative h-24 bg-black rounded overflow-hidden border border-[#333]"><img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover" /><button onClick={removeReference} className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white"><X size={10}/></button></div> : <label className="flex flex-col items-center justify-center h-24 bg-[#050505] border border-dashed border-[#333] rounded cursor-pointer hover:border-[#9d4edd] transition-colors"><ImageIcon className="w-6 h-6 text-gray-500 mb-1" /><span className="text-[9px] text-gray-600 uppercase">Upload Ref</span><input type="file" className="hidden" onChange={handleReferenceUpload} /></label>}
                                </div>
                                <div className="bg-[#111]/50 p-4 rounded-lg border border-[#222] flex-1"><p className="text-[10px] text-gray-600 font-mono leading-relaxed"><Target className="w-3 h-3 inline mr-1" /> Optimized for high-impact visual communication. Ensures alignment with sovereign brand directives.</p></div>
                            </div>
                       </div>
                   </div>
                   <CyberMap />
              </div>
              <div className="lg:col-span-4 flex flex-col gap-6">
                  <AgentHive activeAgents={activeAgents} />
                  <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 flex-1 flex flex-col min-h-[300px] overflow-hidden">
                      <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono mb-4"><Terminal className="w-4 h-4 text-[#42be65]" />System Logs</h2>
                      <div className="space-y-3 font-mono text-[10px] flex-1 overflow-y-auto custom-scrollbar pr-2">
                          {system.logs.slice(-15).reverse().map((log: any, i: number) => (
                              <div key={i} className="text-gray-500 border-l-2 border-[#1f1f1f] pl-3 py-1 flex gap-2 animate-in slide-in-from-left-2 hover:border-[#42be65] transition-colors hover:bg-white/5">
                                  <span className="text-gray-600 whitespace-nowrap shrink-0">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                  <span className={`break-all ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-gray-300'}`}>{log.message}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </MotionDiv>

          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                   <OraclePanel />
              </div>
              <div className="lg:col-span-4 flex flex-col gap-6">
                  <SystemVitalityMatrix />
              </div>
          </MotionDiv>
      </div>
    </div>
  );
};

export default Dashboard;
