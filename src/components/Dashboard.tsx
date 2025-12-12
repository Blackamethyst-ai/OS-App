
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey, fileToGenerativePart } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';
import { Activity, Shield, Image as ImageIcon, Sparkles, RefreshCw, Cpu, Clock, Users, ArrowUpRight, X, ScanFace, Terminal, Zap, Network, Database, Globe, Lock, Wifi, AlertCircle, Radio, Hexagon, TrendingUp, TrendingDown, DollarSign, BarChart3, RadioReceiver, Search, Filter, SortAsc, SortDesc, Bot, BrainCircuit, MapPin, Share2, Server, Radar, Target, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, BarChart as RechartsBarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

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

    // Calculate trend
    const trend = useMemo(() => {
        if (!data || data.length < 2) return 0;
        const last = data[data.length - 1].value;
        const prev = data[data.length - 2].value;
        return ((last - prev) / prev) * 100;
    }, [data]);

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
              <div className={`flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${trend >= 0 ? 'text-[#42be65] border-[#42be65]/20 bg-[#42be65]/10' : 'text-red-500 border-red-500/20 bg-red-500/10'}`}>
                  {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend).toFixed(1)}%
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
          
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-gray-500">
              <ArrowUpRight className="w-4 h-4" />
          </div>
      </MotionDiv>
    );
};

// 3. Cyber Map (Visualizing Global Nodes - Enhanced)
const CyberMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredNode, setHoveredNode] = useState<{x:number, y:number, id: string, region: string, latency: number} | null>(null);
    const pointsRef = useRef<{x:number, y:number, baseAlpha:number, region: string, id: string}[]>([]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        const cols = 24;
        const rows = 14;
        const regions = ['NA-EAST', 'EU-WEST', 'ASIA-PAC', 'SA-EAST', 'AF-NORTH'];
        
        const resize = () => {
            canvas.width = canvas.parentElement?.offsetWidth || 300;
            canvas.height = canvas.parentElement?.offsetHeight || 200;
            
            // Regenerate points only if empty or size changed significantly
            if (pointsRef.current.length === 0 || Math.abs(canvas.width - (pointsRef.current[0]?.x || 0) * cols) > 100) {
                pointsRef.current = [];
                const xStep = canvas.width / cols;
                const yStep = canvas.height / rows;
                
                for(let r=0; r<=rows; r++) {
                    for(let c=0; c<=cols; c++) {
                        const nx = c/cols;
                        const ny = r/rows;
                        // World map-ish shape approximation
                        const isLand = (ny > 0.2 && ny < 0.8) && (nx > 0.1 && nx < 0.9) && Math.random() > 0.45;
                        if(isLand) {
                            pointsRef.current.push({
                                x: c * xStep + (Math.random() * 5),
                                y: r * yStep + (Math.random() * 5),
                                baseAlpha: 0.1 + Math.random() * 0.2,
                                region: regions[Math.floor(Math.random() * regions.length)],
                                id: `NODE-${Math.floor(Math.random()*1000)}`
                            });
                        }
                    }
                }
            }
        };
        
        // Mouse Tracking for Hover
        let mouseX = -100;
        let mouseY = -100;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        resize();
        window.addEventListener('resize', resize);
        canvas.addEventListener('mousemove', handleMouseMove);

        let activeNodes: {x:number, y:number, life:number}[] = [];
        let frame = 0;

        const loop = () => {
            frame++;
            ctx.clearRect(0,0,canvas.width, canvas.height);
            
            // Random packet generation
            if(frame % 15 === 0 && Math.random() > 0.3) {
                const target = pointsRef.current[Math.floor(Math.random() * pointsRef.current.length)];
                if(target) activeNodes.push({ x: target.x, y: target.y, life: 1.0 });
            }

            let foundHover = null;

            pointsRef.current.forEach(p => {
                const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
                const isHover = dist < 15;
                
                if (isHover) {
                    foundHover = { ...p, latency: Math.floor(Math.random() * 50 + 10) };
                }

                const hoverEffect = Math.max(0, 100 - dist) / 100;
                
                ctx.fillStyle = isHover ? '#fff' : `rgba(100, 116, 139, ${p.baseAlpha + hoverEffect * 0.6})`; 
                ctx.beginPath();
                ctx.arc(p.x, p.y, isHover ? 3 : 1.5 + hoverEffect * 1.5, 0, Math.PI*2);
                ctx.fill();
                
                if (isHover) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#fff';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            });

            // Update React state for tooltip (throttled/checked)
            if (foundHover?.id !== hoveredNode?.id) {
                setHoveredNode(foundHover);
            } else if (!foundHover && hoveredNode) {
                setHoveredNode(null);
            }

            // Draw connecting lines for active nodes (simulating traffic)
            const nextActiveNodes: typeof activeNodes = [];
            activeNodes.forEach(node => {
                node.life -= 0.015;
                if(node.life > 0) {
                    const size = (1-node.life) * 30;
                    const alpha = node.life;
                    
                    // Expanding Ring
                    ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.8})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, Math.PI*2);
                    ctx.stroke();

                    // Core
                    ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 2, 0, Math.PI*2);
                    ctx.fill();

                    nextActiveNodes.push(node);
                }
            });
            activeNodes = nextActiveNodes;

            requestAnimationFrame(loop);
        };
        loop();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, []); // Only init once, but referencing mutable refs

    return (
        <div className="relative w-full h-56 bg-[#080808] border border-[#1f1f1f] rounded-xl overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
                <span className="text-[10px] font-bold text-[#22d3ee] font-mono uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    Global Node Activity
                </span>
                <span className="text-[9px] text-gray-500 font-mono">Real-time signal propagation</span>
            </div>
            
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1 text-[9px] font-mono text-gray-500 pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#22d3ee] rounded-full animate-pulse"></span>
                    <span>ONLINE</span>
                </div>
                <span>LATENCY: 24ms</span>
            </div>

            <canvas ref={canvasRef} className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500 cursor-crosshair" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

            {/* Tooltip Overlay */}
            <AnimatePresence>
                {hoveredNode && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute pointer-events-none bg-black/90 backdrop-blur border border-[#22d3ee]/50 px-3 py-2 rounded shadow-xl z-20"
                        style={{ top: hoveredNode.y - 50, left: hoveredNode.x + 10 }}
                    >
                        <div className="text-[10px] font-bold text-[#22d3ee] font-mono">{hoveredNode.id}</div>
                        <div className="text-[9px] text-gray-400 font-mono">{hoveredNode.region}</div>
                        <div className="text-[9px] text-white font-mono mt-1">{hoveredNode.latency}ms latency</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 4. Agent Hive (Improved Hex Grid)
const AgentHive: React.FC<{ count: number }> = ({ count }) => {
    const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

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
                    const isSelected = selectedAgent === i;

                    return (
                        <div key={i} className="group relative flex justify-center">
                            <button 
                                onClick={() => isActive && setSelectedAgent(isSelected ? null : i)}
                                className={`w-10 h-11 relative clip-hex transition-all duration-300 outline-none
                                    ${isActive 
                                        ? isWorking 
                                            ? 'bg-[#9d4edd] scale-105 shadow-[0_0_15px_#9d4edd]' 
                                            : isSelected 
                                                ? 'bg-[#fff] scale-110 z-20'
                                                : 'bg-[#1f1f1f] border-2 border-[#9d4edd]/40 hover:bg-[#9d4edd]/20 hover:scale-110' 
                                        : 'bg-[#111] opacity-20 border border-gray-800 cursor-default'}
                                `}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {isActive ? (
                                        isWorking ? <Activity className="w-4 h-4 text-black animate-spin" /> : 
                                        <Bot className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-[#9d4edd]'} transition-colors`} />
                                    ) : (
                                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                                    )}
                                </div>
                            </button>
                            
                            {/* Hover Tooltip for Agent */}
                            {isActive && !isSelected && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-black/90 backdrop-blur border border-[#333] px-3 py-1.5 rounded text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 pointer-events-none z-20 transition-opacity">
                                    <div className="font-bold text-[#9d4edd]">AGENT_0{i}</div>
                                    <div className="text-gray-400">{isWorking ? 'PROCESSING DATA' : 'IDLE / LISTENING'}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Selection Overlay */}
            <AnimatePresence>
                {selectedAgent !== null && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-x-4 bottom-4 bg-[#1a1a1a]/95 backdrop-blur border border-[#9d4edd]/50 rounded-lg p-3 z-30 shadow-2xl flex justify-between items-start"
                    >
                        <div>
                            <div className="text-[10px] font-bold text-[#9d4edd] font-mono uppercase mb-1">Agent 0{selectedAgent} Analysis</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono text-gray-300">
                                <span>Status: <span className="text-white">ACTIVE</span></span>
                                <span>Uptime: <span className="text-white">4h 12m</span></span>
                                <span>Task: <span className="text-white">Neural Sync</span></span>
                                <span>Efficiency: <span className="text-[#42be65]">98.2%</span></span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedAgent(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>
                    </motion.div>
                )}
            </AnimatePresence>

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

// 5. Oracle Panel (Signals - Enhanced)
const OraclePanel: React.FC = () => {
    const [h100Price, setH100Price] = useState(28450);
    const [energyPrice, setEnergyPrice] = useState(0.142);
    const [arbIndex, setArbIndex] = useState(14.2);
    const [priceHistory, setPriceHistory] = useState<{time: number, price: number}[]>([]);
    const [isBooting, setIsBooting] = useState(true);
    const [sortBy, setSortBy] = useState<'veracity' | 'leverage' | 'time'>('time');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const [signals, setSignals] = useState<Signal[]>([
        { id: 'sig-001', timestamp: Date.now() - 100000, headline: 'NVIDIA securing sovereign energy rights in Iceland', tags: ['#Geopolitics', '#Energy'], source: 'Reuters (Encrypted)', veracity: 98, leverage: 'CRITICAL' },
        { id: 'sig-002', timestamp: Date.now() - 500000, headline: 'Blackwell architecture leak suggests 4x throughput', tags: ['#Hardware', '#PatternRecognition'], source: 'DarkWeb Relay', veracity: 65, leverage: 'HIGH' },
        { id: 'sig-003', timestamp: Date.now() - 1200000, headline: 'Global lithium supply chain contraction projected Q3', tags: ['#SupplyChain', '#ComputeArbitrage'], source: 'Bloomberg Terminal', veracity: 89, leverage: 'MODERATE' },
        { id: 'sig-004', timestamp: Date.now() - 3600000, headline: 'New recursive self-improvement algo detected in wild', tags: ['#AI_Safety', '#Evolution'], source: 'NetSec Monitor', veracity: 42, leverage: 'CRITICAL' },
        { id: 'sig-005', timestamp: Date.now() - 7200000, headline: 'TSMC increasing wafer pricing by 12% for Tier 2', tags: ['#Market', '#Hardware'], source: 'Industry Insider', veracity: 92, leverage: 'HIGH' },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            const time = Date.now();
            setH100Price(p => p + (Math.random() * 100 - 40));
            setEnergyPrice(p => Math.max(0.05, p + (Math.random() * 0.002 - 0.001)));
            setArbIndex(p => p + (Math.random() * 0.2 - 0.1));
            setPriceHistory(prev => [...prev, { time, price: h100Price }].slice(-30));
        }, 2000);
        return () => clearInterval(interval);
    }, [h100Price]);

    useEffect(() => {
        const timer = setTimeout(() => setIsBooting(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const getVeracityColor = (score: number) => {
        if (score >= 90) return 'bg-[#42be65]';
        if (score >= 70) return 'bg-[#22d3ee]';
        if (score >= 50) return 'bg-[#f59e0b]';
        return 'bg-[#ef4444]';
    };

    const getLeverageColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10';
            case 'HIGH': return 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10';
            case 'MODERATE': return 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10';
            default: return 'text-gray-500 border-gray-500/30 bg-gray-500/10';
        }
    };
    
    const sortedSignals = [...signals].sort((a, b) => {
        let valA, valB;
        if (sortBy === 'veracity') { valA = a.veracity; valB = b.veracity; } 
        else if (sortBy === 'leverage') {
            const map = { 'CRITICAL': 3, 'HIGH': 2, 'MODERATE': 1, 'LOW': 0 };
            valA = map[a.leverage]; valB = map[b.leverage];
        } else { valA = a.timestamp; valB = b.timestamp; }
        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const toggleSort = (key: 'veracity' | 'leverage' | 'time') => {
        if (sortBy === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('desc'); }
    };

    if (isBooting) {
        return (
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl h-96 flex flex-col items-center justify-center p-8 relative">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.05)_50%,transparent_75%,transparent)] bg-[length:30px_30px] animate-[pulse_4s_infinite]"></div>
                <div className="w-full max-w-sm space-y-3 font-mono text-xs text-[#9d4edd]">
                    <div className="flex justify-between border-b border-[#333] pb-1"><span>INIT_ORACLE_PROTOCOL</span><span>OK</span></div>
                    <div className="flex justify-between border-b border-[#333] pb-1"><span>CONNECTING_DARK_POOLS</span><span>OK</span></div>
                    <div className="flex justify-between border-b border-[#333] pb-1"><span>SYNC_BASIX_INDEX</span><span className="animate-pulse">...</span></div>
                    <div className="h-1 w-full bg-[#222] rounded overflow-hidden mt-6">
                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: "easeInOut" }} className="h-full bg-[#9d4edd]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl flex flex-col h-96">
            <div className="h-10 bg-[#111] border-b border-[#1f1f1f] flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <RadioReceiver className="w-4 h-4 text-[#9d4edd] animate-pulse" />
                    <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">
                        THE ORACLE <span className="text-gray-600">//</span> INTELLIGENCE L0
                    </h2>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-mono text-gray-500">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#42be65]"></div> FEED_ACTIVE</span>
                    <span>LATENCY: 12ms</span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Financial Data */}
                <div className="w-64 border-r border-[#1f1f1f] bg-[#080808] p-4 flex flex-col gap-4">
                    <div className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider mb-1 border-b border-[#333] pb-2">
                        BASIX Index Feed
                    </div>
                    
                    {/* H100 Price */}
                    <div className="group cursor-pointer">
                        <div className="text-[9px] text-gray-500 font-mono uppercase mb-1">H100 Spot Price</div>
                        <div className="flex items-end justify-between">
                            <span className="text-xl font-mono font-bold text-white group-hover:text-[#42be65] transition-colors">${h100Price.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            <span className="text-[9px] font-mono text-[#42be65] flex items-center mb-1"><TrendingUp className="w-3 h-3 mr-1" /> +2.4%</span>
                        </div>
                        <div className="h-10 w-full mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceHistory}>
                                    <Line type="step" dataKey="price" stroke="#42be65" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Energy Price */}
                    <div className="mt-2">
                        <div className="text-[9px] text-gray-500 font-mono uppercase mb-1">Global Energy / kWh</div>
                        <div className="flex items-end justify-between">
                            <span className="text-xl font-mono font-bold text-white">${energyPrice.toFixed(3)}</span>
                            <span className="text-[9px] font-mono text-red-400 flex items-center mb-1"><TrendingDown className="w-3 h-3 mr-1" /> -0.1%</span>
                        </div>
                    </div>

                    <div className="mt-auto bg-[#111] p-3 rounded border border-[#222]">
                        <div className="text-[9px] text-gray-500 font-mono uppercase mb-1 flex items-center gap-1"><Zap className="w-3 h-3 text-[#f59e0b]" /> Compute Arb</div>
                        <div className="text-2xl font-mono font-bold text-[#f59e0b]">{arbIndex.toFixed(1)}x</div>
                        <div className="w-full bg-[#333] h-1 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-[#f59e0b]" style={{ width: `${(arbIndex/20)*100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Right: Signal List */}
                <div className="flex-1 flex flex-col bg-[#030303] overflow-hidden relative">
                    <div className="h-10 border-b border-[#1f1f1f] flex items-center px-4 gap-4 bg-[#080808]">
                        <div className="flex items-center gap-2 text-gray-500 bg-[#111] px-2 py-1 rounded border border-[#222] flex-1 focus-within:border-[#9d4edd] transition-colors">
                            <Search className="w-3 h-3" />
                            <input type="text" placeholder="Search Signal Database..." className="bg-transparent text-[10px] font-mono outline-none text-white w-full placeholder:text-gray-700"/>
                        </div>
                        <button className="text-gray-500 hover:text-white transition-colors"><Filter className="w-3 h-3" /></button>
                        <button className="text-[#9d4edd] text-[10px] font-mono uppercase hover:underline">Sync Intelligence Rail</button>
                    </div>
                    <div className="grid grid-cols-12 bg-[#0a0a0a] border-b border-[#1f1f1f] py-2 px-4 text-[9px] font-mono uppercase text-gray-500 tracking-wider">
                        <div className="col-span-5 flex items-center cursor-pointer hover:text-white" onClick={() => toggleSort('time')}>Signal / Headline {sortBy === 'time' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3 ml-1"/> : <SortDesc className="w-3 h-3 ml-1"/>)}</div>
                        <div className="col-span-2">Tags</div>
                        <div className="col-span-2">Source</div>
                        <div className="col-span-2 flex items-center cursor-pointer hover:text-white" onClick={() => toggleSort('veracity')}>Veracity {sortBy === 'veracity' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3 ml-1"/> : <SortDesc className="w-3 h-3 ml-1"/>)}</div>
                        <div className="col-span-1 text-right flex items-center justify-end cursor-pointer hover:text-white" onClick={() => toggleSort('leverage')}>Leverage {sortBy === 'leverage' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3 ml-1"/> : <SortDesc className="w-3 h-3 ml-1"/>)}</div>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-0">
                        {sortedSignals.map((signal) => (
                            <div key={signal.id} className="grid grid-cols-12 py-3 px-4 border-b border-[#1f1f1f] hover:bg-[#0f0f0f] transition-colors group cursor-pointer items-center">
                                <div className="col-span-5 pr-4">
                                    <div className="text-xs font-bold text-gray-300 font-mono group-hover:text-white truncate">{signal.headline}</div>
                                    <div className="text-[9px] text-gray-600 font-mono mt-0.5">{new Date(signal.timestamp).toLocaleTimeString()} // ID: {signal.id}</div>
                                </div>
                                <div className="col-span-2 flex flex-wrap gap-1">
                                    {signal.tags.map(tag => (<span key={tag} className="text-[8px] font-mono text-[#9d4edd] bg-[#9d4edd]/10 px-1 rounded border border-[#9d4edd]/20">{tag}</span>))}
                                </div>
                                <div className="col-span-2 text-[10px] font-mono text-gray-400 truncate">{signal.source}</div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-[#222] rounded-full overflow-hidden"><div className={`h-full ${getVeracityColor(signal.veracity)}`} style={{ width: `${signal.veracity}%` }}></div></div>
                                    <span className="text-[9px] font-mono text-gray-500">{signal.veracity}%</span>
                                </div>
                                <div className="col-span-1 text-right">
                                    <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border ${getLeverageColor(signal.leverage)}`}>{signal.leverage}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none"></div>
                </div>
            </div>
        </div>
    );
};

// 6. Sentinel Radar (Enhanced Active Defense)
const SentinelRadar: React.FC<{ packetLoss: number }> = ({ packetLoss }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedThreat, setSelectedThreat] = useState<{r:number, theta:number} | null>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let angle = 0;
        const blips: {r: number, theta: number, opacity: number}[] = [];
        
        const resize = () => {
            canvas.width = canvas.parentElement?.offsetWidth || 300;
            canvas.height = canvas.parentElement?.offsetHeight || 300;
        };
        resize();
        window.addEventListener('resize', resize);

        const render = () => {
            if (!canvas || !ctx) return;
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;
            const radius = Math.min(w, h) / 2 - 10;

            ctx.clearRect(0, 0, w, h);

            // Draw Radar Circles
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            [0.25, 0.5, 0.75, 1].forEach(r => {
                ctx.beginPath();
                ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // Axis Lines
            ctx.beginPath();
            ctx.moveTo(cx - radius, cy);
            ctx.lineTo(cx + radius, cy);
            ctx.moveTo(cx, cy - radius);
            ctx.lineTo(cx, cy + radius);
            ctx.stroke();

            // Sweep Animation
            angle = (angle + 0.04) % (Math.PI * 2);
            
            const sweepColor = packetLoss > 0.05 ? '239, 68, 68' : '34, 211, 238'; // Red or Cyan
            const grad = ctx.createConicGradient(angle + Math.PI / 2, cx, cy);
            
            grad.addColorStop(0, `rgba(${sweepColor}, 0)`);
            grad.addColorStop(0.7, `rgba(${sweepColor}, 0)`);
            grad.addColorStop(1, `rgba(${sweepColor}, 0.3)`);
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Leading Edge Line
            ctx.strokeStyle = `rgba(${sweepColor}, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.stroke();

            // Generate Blips (Threats)
            if (Math.random() < (packetLoss + 0.01)) {
                blips.push({
                    r: 0.3 + Math.random() * 0.6,
                    theta: Math.random() * Math.PI * 2,
                    opacity: 1
                });
            }

            // Draw Blips
            blips.forEach((b, i) => {
                b.opacity -= 0.02;
                if (b.opacity <= 0) {
                    blips.splice(i, 1);
                    return;
                }
                
                const bx = cx + Math.cos(b.theta) * radius * b.r;
                const by = cy + Math.sin(b.theta) * radius * b.r;
                
                // Threat Blip
                ctx.fillStyle = `rgba(239, 68, 68, ${b.opacity})`; 
                ctx.beginPath();
                ctx.arc(bx, by, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Threat Ripple
                ctx.strokeStyle = `rgba(239, 68, 68, ${b.opacity * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(bx, by, 10 * (1-b.opacity), 0, Math.PI * 2);
                ctx.stroke();
            });

            requestAnimationFrame(render);
        };
        render();

        return () => window.removeEventListener('resize', resize);
    }, [packetLoss]);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 flex-1 relative overflow-hidden flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    <Radar className={`w-4 h-4 ${packetLoss > 0.05 ? 'text-red-500 animate-pulse' : 'text-[#22d3ee]'}`} />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Sentinel Scan</span>
                </div>
                <span className={`text-[10px] font-mono border px-2 py-0.5 rounded ${packetLoss > 0.05 ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10'}`}>
                    {packetLoss > 0.05 ? 'THREAT DETECTED' : 'SECURE'}
                </span>
            </div>
            
            <div className="flex-1 relative z-10 w-full min-h-[150px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" />
            </div>
            
            {/* Recent Threats List (New) */}
            {packetLoss > 0.03 && (
                <div className="mt-2 space-y-1 relative z-10">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-red-400 bg-red-900/10 px-2 py-1 rounded border border-red-900/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>DDOS_SIG_04 DETECTED</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 px-2">
                        <Activity className="w-3 h-3" />
                        <span>Mitigation: Active Rerouting...</span>
                    </div>
                </div>
            )}
            
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
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
        try {
            const file = e.target.files[0];
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
                       <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                           <ScanFace className="w-32 h-32 text-[#9d4edd]" />
                       </div>
                       
                       <div className="flex justify-between items-start mb-6 relative z-10 shrink-0">
                           <div>
                               <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
                                   <Shield className="w-4 h-4 text-[#9d4edd]" />
                                   Visual Identity
                               </h2>
                               <p className="text-[10px] text-gray-500 font-mono mt-1">Sovereign Brand Projection System</p>
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
                                                <input type="file" className="hidden" onChange={handleReferenceUpload} />
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
