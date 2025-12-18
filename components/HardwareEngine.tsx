import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { analyzeSchematic, researchComponents, fileToGenerativePart, promptSelectKey, generateXRayVariant, generateIsometricSchematic } from '../services/geminiService';
import { 
    Upload, Search, Cpu, Zap, AlertTriangle, Activity, Loader2, 
    CircuitBoard, Server, Thermometer, Camera, X, ExternalLink, Scan, 
    FileText, Plus, Trash2, Download, List, Globe, Box, Layers, 
    Network, Wind, Droplets, Power, ShieldAlert, Sliders, CheckCircle2, 
    BoxSelect, RefreshCw, Filter, Move3d, ZoomIn, ZoomOut, Move, 
    HardDrive, MemoryStick, Fan, Eye, TrendingUp, DollarSign, 
    Maximize2, ShieldCheck, Terminal, Fingerprint, Lock, Key,
    History, BarChart3, ChevronRight, Package, DollarSign as PriceIcon,
    Shield, Check, ChevronDown, Monitor, Gauge, Workflow, TrendingDown,
    AlertCircle, Clock, ArrowRight, GitCommit
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, LineChart, Line, CartesianGrid, Tooltip as RechartsTooltip, ScatterChart, Scatter, ZAxis, Cell, BarChart, Bar, ComposedChart } from 'recharts';
import { ComponentRecommendation, TemporalEra } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';

const MotionDiv = motion.div as any;

// --- Sub-Components ---

/**
 * GPU Cluster Monitoring System
 * Visualizes a 64-node high-density H100 cluster with real-time feedback.
 */
const GPUClusterAnalytics = () => {
    const [nodes, setNodes] = useState(Array.from({ length: 64 }, (_, i) => ({
        id: i,
        load: 10 + Math.random() * 40,
        temp: 40 + Math.random() * 20
    })));
    
    const [history, setHistory] = useState<{ time: string, avgLoad: number, avgTemp: number, power: number }[]>([]);
    const [vram, setVram] = useState({ used: 42.5, total: 128 });

    useEffect(() => {
        const interval = setInterval(() => {
            setNodes(prev => prev.map(n => ({
                ...n,
                load: Math.max(5, Math.min(100, n.load + (Math.random() * 10 - 5))),
                temp: Math.max(35, Math.min(85, n.temp + (Math.random() * 4 - 2)))
            })));

            setVram(v => ({ ...v, used: Math.max(20, Math.min(v.total, v.used + (Math.random() * 2 - 1))) }));

            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setHistory(h => {
                const currentNodes = nodes;
                const avgLoad = currentNodes.reduce((acc, curr) => acc + curr.load, 0) / currentNodes.length;
                const avgTemp = currentNodes.reduce((acc, curr) => acc + curr.temp, 0) / currentNodes.length;
                const power = (avgLoad / 100) * 800 + 150; 
                return [...h, { time: now, avgLoad, avgTemp, power }].slice(-20);
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [nodes]);

    const latest = history[history.length - 1] || { avgLoad: 0, avgTemp: 0, power: 0 };

    return (
        <div className="flex-1 flex flex-col gap-6 h-full p-2 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 shrink-0">
                {[
                    { label: 'Cluster Load', value: `${latest.avgLoad.toFixed(1)}%`, icon: Activity, color: '#22d3ee' },
                    { label: 'Thermal Aggr', value: `${latest.avgTemp.toFixed(1)}°C`, icon: Thermometer, color: latest.avgTemp > 75 ? '#ef4444' : '#10b981' },
                    { label: 'VRAM Usage', value: `${vram.used.toFixed(1)} TB`, icon: MemoryStick, color: '#f59e0b' },
                    { label: 'Aggregate Power', value: `${latest.power.toFixed(0)} kW`, icon: Zap, color: '#9d4edd' }
                ].map((stat, i) => (
                    <div key={i} className="bg-[#0a0a0a] border border-[#1f1f1f] p-4 rounded-xl flex items-center gap-4 group hover:border-[#333] transition-colors shadow-lg">
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                            <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <div>
                            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{stat.label}</div>
                            <div className="text-xl font-black font-mono text-white tracking-tighter">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col overflow-hidden shadow-2xl relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.02)_0%,transparent_70%)] pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-6 z-10">
                        <div className="flex items-center gap-3">
                            <Workflow size={16} className="text-[#22d3ee]" />
                            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-[0.2em]">64-Node Compute Lattice</h3>
                        </div>
                        <div className="flex gap-4 text-[8px] font-mono text-gray-600">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div> NOMINAL</div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div> WARNING</div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div> CRITICAL</div>
                        </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-8 gap-2 content-center z-10">
                        {nodes.map(node => (
                            <motion.div
                                key={node.id}
                                animate={{ 
                                    opacity: node.load > 10 ? 1 : 0.4,
                                    borderColor: node.temp > 75 ? '#ef4444' : node.temp > 65 ? '#f59e0b' : '#111',
                                    backgroundColor: node.temp > 75 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)'
                                }}
                                className="aspect-square rounded border border-[#111] relative overflow-hidden flex items-center justify-center group/node cursor-crosshair"
                            >
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-[#22d3ee]/30 transition-all duration-700" 
                                    style={{ height: `${node.load}%` }}
                                />
                                <span className="text-[7px] font-mono text-gray-700 group-hover/node:text-white transition-colors relative z-10">{node.id + 1}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="w-[350px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2">
                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col h-[280px]">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
                            <Activity size={14} className="text-[#9d4edd]" /> Performance History
                        </h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={[0, 100]} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }} />
                                    <Area type="monotone" dataKey="avgLoad" fill="#22d3ee" stroke="#22d3ee" fillOpacity={0.05} strokeWidth={2} name="Load %" />
                                    <Line type="monotone" dataKey="avgTemp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temp °C" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
                            <MemoryStick size={14} className="text-[#f59e0b]" /> Memory Allocation
                        </h4>
                        <div className="space-y-4">
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div className="text-[10px] font-mono text-gray-400 uppercase">Usage Density</div>
                                    <div className="text-xs font-bold text-white font-mono">{Math.round((vram.used / vram.total) * 100)}%</div>
                                </div>
                                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-black border border-white/5">
                                    <motion.div 
                                        animate={{ width: `${(vram.used / vram.total) * 100}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#f59e0b] to-[#9d4edd]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                    <div className="text-[8px] text-gray-600 uppercase mb-1 font-mono">Allocated</div>
                                    <div className="text-xs font-bold text-white font-mono">{vram.used.toFixed(1)} TB</div>
                                </div>
                                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                    <div className="text-[8px] text-gray-600 uppercase mb-1 font-mono">Total capacity</div>
                                    <div className="text-xs font-bold text-white font-mono">{vram.total} TB</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#9d4edd]/5 to-transparent border border-[#9d4edd]/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3 text-[#9d4edd]">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest font-mono">System Insight</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                            Cluster is running within optimal thermal envelopes. VRAM pressure is low. 
                            Autonomous re-balancing protocol ready for high-bandwidth inference tasks.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GPUClusterMonitor = () => {
    const [metrics, setMetrics] = useState({ usage: 45, temp: 62, fan: 40, vram: 12 });
    
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => {
                const usage = Math.max(5, Math.min(99, prev.usage + (Math.random() * 20 - 10)));
                return { 
                    usage, 
                    temp: 45 + (usage * 0.35) + (Math.random() * 2), 
                    fan: 30 + (usage * 0.5), 
                    vram: Math.max(8, Math.min(24, prev.vram + (Math.random() * 2 - 1))) 
                };
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const GaugeComp = ({ val, color, label, unit }: any) => (
        <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" stroke="#111" strokeWidth="6" fill="none" />
                    <circle cx="40" cy="40" r="32" stroke={color} strokeWidth="6" fill="none" strokeDasharray={201} strokeDashoffset={201 - (val/100)*201} strokeLinecap="round" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold font-mono text-white">{val.toFixed(0)}</span>
                    <span className="text-[7px] text-gray-500 font-mono">{unit}</span>
                </div>
            </div>
            <span className="text-[8px] font-mono text-gray-500 uppercase mt-1">{label}</span>
        </div>
    );

    return (
        <div className="p-4 bg-[#0a0a0a] border-t border-[#1f1f1f] flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CircuitBoard className="w-3 h-3 text-[#9d4edd]" /> GPU CLUSTER TELEMETRY
                </h4>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#42be65] rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-mono text-gray-600">ENCLAVE_READY</span>
                </div>
            </div>
            <div className="flex justify-around items-center">
                <GaugeComp val={metrics.usage} color="#9d4edd" label="Compute" unit="%" />
                <GaugeComp val={metrics.temp} color={metrics.temp > 75 ? '#ef4444' : '#42be65'} label="Thermal" unit="°C" />
                <GaugeComp val={metrics.vram} color="#f59e0b" label="VRAM" unit="GB" />
            </div>
        </div>
    );
};

const PriceHistoryChart: React.FC<{ basePrice: number }> = ({ basePrice }) => {
    const [range, setRange] = useState<'1W' | '1M' | '1Y'>('1M');

    const data = useMemo(() => {
        const points = range === '1W' ? 14 : range === '1M' ? 30 : 90;
        let lastPrice = basePrice * (0.8 + Math.random() * 0.2);
        return Array.from({ length: points }, (_, i) => {
            const volatility = range === '1W' ? 0.015 : range === '1M' ? 0.04 : 0.08;
            const drift = (Math.random() - 0.47) * (basePrice * volatility);
            lastPrice = Math.max(basePrice * 0.4, lastPrice + drift);
            return {
                day: i,
                price: lastPrice,
                volume: Math.floor(Math.random() * 500) + 100,
                timestamp: new Date(Date.now() - (points - i) * 86400000).toLocaleDateString()
            };
        });
    }, [basePrice, range]);

    const stats = useMemo(() => {
        const first = data[0].price;
        const last = data[data.length - 1].price;
        const change = ((last - first) / first) * 100;
        const isUp = change >= 0;
        return { change: Math.abs(change).toFixed(2), isUp, current: last.toFixed(2) };
    }, [data]);

    return (
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 mt-4 overflow-hidden relative flex flex-col gap-4 group">
            <div className="flex justify-between items-start z-10">
                <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-1">MSRP TRADING VECTORS</span>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-black font-mono text-white tracking-tighter">
                            ${parseFloat(stats.current).toLocaleString()}
                        </span>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${stats.isUp ? 'bg-[#42be65]/10 text-[#42be65]' : 'bg-red-500/10 text-red-500'}`}>
                            {stats.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {stats.isUp ? '+' : '-'}{stats.change}%
                        </div>
                    </div>
                </div>
                <div className="flex bg-[#111] p-0.5 rounded border border-[#333] shadow-inner shrink-0">
                    {['1W', '1M', '1Y'].map(r => (
                        <button 
                            key={r} 
                            onClick={() => setRange(r as any)}
                            className={`px-3 py-1 text-[9px] font-black font-mono rounded transition-all ${range === r ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={stats.isUp ? "#42be65" : "#ef4444"} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={stats.isUp ? "#42be65" : "#ef4444"} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#151515" vertical={false} />
                        <XAxis dataKey="timestamp" hide />
                        <YAxis 
                            orientation="right" 
                            domain={['auto', 'auto']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 8, fill: '#444', fontFamily: 'monospace' }}
                            width={40}
                        />
                        <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px', fontFamily: 'monospace', borderRadius: '4px' }}
                            itemStyle={{ fontSize: '9px', fontWeight: 'bold', padding: '0' }}
                            cursor={{ stroke: '#9d4edd', strokeWidth: 1, strokeDasharray: '4 4' }}
                            labelStyle={{ color: '#666', marginBottom: '4px' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={stats.isUp ? "#42be65" : "#ef4444"} 
                            fillOpacity={1} 
                            fill="url(#priceGradient)" 
                            strokeWidth={2} 
                            name="Price" 
                            animationDuration={800}
                        />
                        <Bar 
                            dataKey="volume" 
                            fill="#333" 
                            opacity={0.3} 
                            barSize={4} 
                            name="Vol" 
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-gray-700 border-t border-white/5 pt-2 uppercase tracking-widest">
                <span className="flex items-center gap-1"><RefreshCw size={8} className="animate-spin-slow" /> Real-time pricing buffer</span>
                <span>Interval: {range === '1W' ? 'Day' : 'Agg'}</span>
            </div>
        </div>
    );
};

const SupplyChainSidebar: React.FC<{ 
    inventory: any[], 
    query: string, 
    onQueryChange: (v: string) => void,
    onCommitSearch: (v?: string) => void,
    onAdd: (v: any) => void,
    onInspect: (v: any) => void,
    provisioningList: any[],
    activeVendor: string,
    onVendorChange: (v: string) => void,
    searchHistory: string[],
    onClearHistory: () => void,
    filters: any,
    onFilterChange: (f: any) => void
}> = ({ inventory, query, onQueryChange, onCommitSearch, onAdd, onInspect, provisioningList, activeVendor, onVendorChange, searchHistory, onClearHistory, filters, onFilterChange }) => {
    const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const vendors = ['ALL', 'NVIDIA', 'SUPERMICRO', 'INTEL', 'AMD'];

    const handleExport = () => {
        const csv = "Part Number,Manufacturer,Type,Price\n" + provisioningList.map(item => `${item.partNumber},${item.manufacturer},${item.specs?.type || 'Unknown'},${item.price || 0}`).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BOM_EXPORT_${Date.now()}.csv`;
        a.click();
    };

    const selectHistoryItem = (item: string) => {
        onQueryChange(item);
        onCommitSearch(item);
        setIsHistoryOpen(false);
    };

    return (
        <div ref={sidebarRef} className="w-[450px] border-r border-[#1f1f1f] flex flex-col bg-[#050505] font-mono">
            <div className="p-6 border-b border-[#1f1f1f]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Search className="w-4 h-4 text-[#9d4edd]" />
                        <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Compute Supply Chain</h2>
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className={`p-1.5 rounded transition-all ${showFilters ? 'bg-[#9d4edd] text-black shadow-[0_0_15px_rgba(157,78,221,0.4)]' : 'bg-[#111] text-gray-500 hover:text-white'}`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="relative mb-6">
                    <div className="relative group">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onCommitSearch()}
                            onFocus={() => setIsHistoryOpen(true)}
                            placeholder="Nvidia gb300 bianca board" 
                            className="w-full bg-black border border-[#222] p-3 pl-10 text-xs text-white focus:border-[#9d4edd] outline-none rounded-lg transition-colors placeholder:text-gray-800"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-[#9d4edd] transition-colors" />
                        <button 
                            onClick={() => onCommitSearch()}
                            className="absolute right-2 top-2 p-1.5 bg-[#9d4edd] text-black rounded transition-transform active:scale-95"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {isHistoryOpen && searchHistory.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl z-[100] overflow-hidden"
                            >
                                <div className="flex justify-between items-center px-4 py-2 border-b border-[#222] bg-[#111]">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <History size={10} /> Persistent Cache
                                    </span>
                                    <button onClick={onClearHistory} className="text-[8px] text-red-500 font-black uppercase hover:underline flex items-center gap-1">
                                        <Trash2 size={10} /> Wipe
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {searchHistory.map((item, i) => (
                                        <button 
                                            key={i}
                                            onMouseDown={() => selectHistoryItem(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-[#1f1f1f] text-[10px] text-gray-300 font-mono flex items-center justify-between group transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock size={12} className="text-gray-600 group-hover:text-[#9d4edd]" />
                                                <span className="truncate">{item}</span>
                                            </div>
                                            <ChevronRight size={12} className="text-gray-700 opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {isHistoryOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsHistoryOpen(false)} />}
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 mb-6 pt-2 border-t border-[#111] overflow-hidden"
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Manufacturer Filter</span>
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
                                        className="px-3 py-1 text-[8px] font-black text-white uppercase bg-[#222] rounded flex items-center gap-2 hover:bg-[#333] transition-colors min-w-[120px] justify-between"
                                    >
                                        {activeVendor === 'ALL' ? 'ALL MFGS' : activeVendor} <ChevronRight className={`w-2.5 h-2.5 transition-transform duration-300 ${isVendorDropdownOpen ? 'rotate-[-90deg]' : 'rotate(90deg)'}`}/>
                                    </button>
                                    <AnimatePresence>
                                        {isVendorDropdownOpen && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 mt-1 w-full bg-[#111] border border-[#333] rounded z-50 overflow-hidden shadow-2xl"
                                            >
                                                {vendors.map(v => (
                                                    <button 
                                                        key={v}
                                                        onClick={() => { onVendorChange(v as any); setIsVendorDropdownOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 text-[8px] font-black uppercase hover:bg-[#9d4edd] hover:text-black transition-colors ${activeVendor === v ? 'text-[#9d4edd]' : 'text-gray-400'}`}
                                                    >
                                                        {v === 'ALL' ? 'ALL MFGS' : v}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-[8px] text-gray-500 font-black uppercase">
                                    <span>Price Vectors (Min - Max)</span>
                                    <span className="text-[#9d4edd]">${filters.minPrice.toLocaleString()} - ${filters.maxPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="range" min="0" max="5000000" step="5000"
                                        value={filters.minPrice}
                                        onChange={(e) => onFilterChange({ ...filters, minPrice: Number(e.target.value) })}
                                        className="w-full accent-[#22d3ee] h-1.5"
                                    />
                                    <input 
                                        type="range" min="0" max="5000000" step="5000"
                                        value={filters.maxPrice}
                                        onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                                        className="w-full accent-[#9d4edd] h-1.5"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[8px] text-gray-500 font-black uppercase">Stock Available Only</span>
                                <button 
                                    onClick={() => onFilterChange({ ...filters, showOutOfStock: !filters.showOutOfStock })} 
                                    className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${!filters.showOutOfStock ? 'bg-[#9d4edd]' : 'bg-[#222]'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${!filters.showOutOfStock ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {inventory.length > 0 ? inventory.map((item) => (
                    <div key={item.id} className="group p-4 bg-transparent border border-transparent hover:border-white/5 hover:bg-white/[0.02] rounded-xl transition-all flex items-center justify-between cursor-pointer" onClick={() => onInspect(item)}>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-black text-gray-200 group-hover:text-white transition-colors truncate">{item.partNumber}</h4>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[8px] text-gray-600 uppercase tracking-widest">{item.manufacturer}</span>
                                <span className="text-[8px] text-[#9d4edd] font-bold">${item.price?.toLocaleString() || '0'}</span>
                                {!item.isInStock && <span className="text-[7px] text-red-500 bg-red-500/10 px-1 rounded font-black uppercase">OOS</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-gray-600 hover:text-[#9d4edd] bg-black border border-[#222] rounded shadow-inner"><Eye className="w-3.5 h-3.5"/></button>
                            <button onClick={(e) => { e.stopPropagation(); onAdd(item); }} className="p-1.5 text-gray-600 hover:text-white bg-black border border-[#222] rounded shadow-inner"><Plus className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-6">
                        <Package size={32} className="mb-2" />
                        <p className="text-[10px] uppercase font-black tracking-widest">No matching components found in inventory lattice.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a]">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Provisioning List ({provisioningList.length})</span>
                    <button 
                        onClick={handleExport} 
                        disabled={provisioningList.length === 0}
                        className="text-[8px] text-[#9d4edd] font-black uppercase hover:underline flex items-center gap-1.5 disabled:opacity-30 disabled:no-underline"
                    >
                        <Download size={10} /> Export CSV
                    </button>
                </div>
                <div className="space-y-1">
                    {provisioningList.slice(0, 3).map((item, i) => (
                        <div key={i} className="bg-black/60 border border-[#1f1f1f] p-2.5 rounded-lg flex items-center justify-between group">
                            <span className="text-[9px] text-gray-400 truncate max-w-[200px]">{item.partNumber}</span>
                            <button className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    ))}
                    {provisioningList.length > 3 && (
                        <div className="text-[8px] text-gray-600 text-center uppercase tracking-widest py-1">+{provisioningList.length - 3} more items</div>
                    )}
                    {provisioningList.length === 0 && (
                        <div className="text-[8px] text-gray-700 italic text-center py-2 uppercase">BOM Buffer Empty</div>
                    )}
                </div>
            </div>

            <GPUClusterMonitor />
        </div>
    );
};

const HardwareEngine: React.FC = () => {
    const { hardware, setHardwareState, addLog } = useAppStore();
    const { currentEra, activeVendor, recommendations, componentQuery, searchHistory, filters, schematicImage, xrayImage, analysis, bom, isLoading } = hardware;
    const [inspectedComponent, setInspectedComponent] = useState<any>(null);

    useVoiceExpose('hardware-engine-v4', { era: currentEra, components: recommendations.length, diagnosticsActive: !!analysis });

    useEffect(() => {
        const storedHistory = localStorage.getItem('hw_search_history');
        if (storedHistory) {
            try {
                const parsed = JSON.parse(storedHistory);
                if (Array.isArray(parsed)) {
                    setHardwareState({ searchHistory: parsed });
                }
            } catch (e) {
                console.error("Failed to parse search history", e);
            }
        }
    }, []);

    const filteredRecommendations = useMemo(() => {
        return recommendations.filter((item: any) => {
            const matchesQuery = !componentQuery || item.partNumber.toLowerCase().includes(componentQuery.toLowerCase());
            const matchesVendor = activeVendor === 'ALL' || item.manufacturer === activeVendor;
            const matchesStock = filters.showOutOfStock || item.isInStock;
            const matchesPrice = item.price >= filters.minPrice && item.price <= filters.maxPrice;
            return matchesQuery && matchesVendor && matchesStock && matchesPrice;
        });
    }, [recommendations, componentQuery, activeVendor, filters]);

    const handleQueryChange = (v: string) => {
        setHardwareState({ componentQuery: v });
    };

    const handleCommitSearch = (customQuery?: string) => {
        const q = (customQuery !== undefined ? customQuery : componentQuery)?.trim();
        if (!q) return;

        const newHistory = [q, ...searchHistory.filter(h => h !== q)].slice(0, 8);
        setHardwareState({ searchHistory: newHistory });
        localStorage.setItem('hw_search_history', JSON.stringify(newHistory));
        
        addLog('INFO', `HW_SEARCH: Committing search vector for "${q}"...`);
    };

    const handleClearHistory = () => {
        setHardwareState({ searchHistory: [] });
        localStorage.removeItem('hw_search_history');
        addLog('SYSTEM', 'HW_HISTORY: Cleared persistent search trace.');
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const data = await fileToGenerativePart(file);
            setHardwareState({ schematicImage: data, isLoading: true });
            addLog('SYSTEM', `BASIX: Ingesting hardware signature for era ${currentEra}...`);
            
            try {
                const [scan, xray] = await Promise.all([
                    analyzeSchematic(data),
                    generateXRayVariant(data)
                ]);
                setHardwareState({ analysis: scan, xrayImage: xray, isLoading: false });
                addLog('SUCCESS', 'BASIX_DIAG: System signature authenticated. Secure Enclave attestation valid.');
            } catch (err: any) {
                setHardwareState({ isLoading: false, error: err.message });
                addLog('ERROR', `DIAG_FAIL: ${err.message}`);
            }
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] text-white flex flex-col relative border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl font-sans">
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-8 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-sm relative group">
                        <Cpu className="w-5 h-5 text-black" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#9d4edd] rounded-full shadow-[0_0_8px_#9d4edd]"></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">Basix Hardware Evolution Protocol</h1>
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-0.5">Secure Enclave Attestation: <span className="text-[#42be65]">ENCRYPTED_AES256</span></span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {Object.values(TemporalEra).map(era => (
                        <button 
                            key={era}
                            onClick={() => setHardwareState({ currentEra: era })}
                            className={`px-6 py-2 rounded text-[9px] font-black font-mono uppercase tracking-widest border transition-all
                                ${currentEra === era ? 'bg-[#9d4edd] text-black border-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.4)]' : 'bg-black text-gray-500 border-[#222] hover:border-gray-600'}
                            `}
                        >
                            {era}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <SupplyChainSidebar 
                    inventory={filteredRecommendations} 
                    query={componentQuery} 
                    onQueryChange={handleQueryChange} 
                    onCommitSearch={handleCommitSearch}
                    onAdd={(item) => setHardwareState({ bom: [...bom, item] })}
                    onInspect={setInspectedComponent}
                    provisioningList={bom}
                    activeVendor={activeVendor}
                    onVendorChange={(v) => setHardwareState({ activeVendor: v as any })}
                    searchHistory={searchHistory}
                    onClearHistory={handleClearHistory}
                    filters={filters}
                    onFilterChange={(f) => setHardwareState({ filters: f })}
                />

                <div className="flex-1 bg-black relative flex flex-col p-8 overflow-hidden">
                    {!schematicImage ? (
                        <div className="h-full flex flex-col overflow-hidden">
                            <GPUClusterAnalytics />
                            
                            <div className="mt-auto flex flex-col items-center gap-6 pb-12">
                                <label className="flex flex-col items-center gap-4 cursor-pointer group">
                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#222] flex items-center justify-center group-hover:border-[#9d4edd] transition-all relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[#9d4edd]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Upload className="w-6 h-6 text-gray-700 group-hover:text-[#9d4edd]" />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-sm font-black text-white font-mono uppercase tracking-widest mb-1">Ingest Node Schema</h2>
                                        <p className="text-[8px] text-gray-600 font-mono uppercase tracking-[0.2em]">Upload schematic to begin diagnostic scan</p>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full relative flex flex-col">
                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-[#9d4edd]">
                                    <Loader2 className="w-12 h-12 animate-spin mb-6" />
                                    <span className="text-xs font-black font-mono tracking-[0.5em] uppercase animate-pulse">Synchronizing Enclave Topology...</span>
                                </div>
                            ) : (
                                <div className="w-full h-full relative grid grid-cols-2 gap-px bg-[#9d4edd]/20 overflow-hidden rounded-xl border border-[#1f1f1f]">
                                    <div className="relative bg-black group overflow-hidden">
                                        <img src={xrayImage || ""} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" alt="X-Ray" />
                                        <div className="absolute inset-0 bg-[#9d4edd]/5 pointer-events-none"></div>
                                        <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 rounded border border-[#9d4edd]/30 text-[8px] text-[#9d4edd] font-black uppercase tracking-widest z-10 backdrop-blur-md">X-Ray Mode Active</div>
                                    </div>
                                    <div className="relative bg-black group overflow-hidden">
                                        <img src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" alt="Physical" />
                                        <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded border border-white/10 text-[8px] text-gray-400 font-black uppercase tracking-widest z-10 backdrop-blur-md flex items-center gap-2">
                                            <BoxSelect className="w-3 h-3" /> 2D Scan
                                        </div>
                                    </div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#9d4edd] rounded-full border-4 border-[#030303] z-30 shadow-[0_0_20px_rgba(157,78,221,0.5)] flex items-center justify-center">
                                        <Shield className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {inspectedComponent && (
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="w-96 border-l border-[#1f1f1f] bg-[#050505] flex flex-col p-6 font-mono z-30 shadow-2xl overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Asset Inspection Detail</h3>
                                <button onClick={() => setInspectedComponent(null)} className="text-gray-500 hover:text-white transition-colors"><X size={16}/></button>
                            </div>

                            <div className="flex-1 space-y-8">
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black text-white tracking-tighter">{inspectedComponent.partNumber}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-bold text-[#9d4edd] uppercase">{inspectedComponent.manufacturer}</span>
                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${inspectedComponent.isInStock ? 'bg-[#42be65]/10 text-[#42be65]' : 'bg-red-500/10 text-red-500'}`}>
                                            {inspectedComponent.isInStock ? 'IN_STOCK' : 'OUT_OF_STOCK'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <PriceHistoryChart basePrice={inspectedComponent.price || 1000} />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[#222]">
                                    <button onClick={() => { setHardwareState({ bom: [...bom, inspectedComponent] }); setInspectedComponent(null); }} className="w-full py-4 bg-[#9d4edd] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2 shadow-lg">
                                        <Plus size={14}/> Provision into BOM
                                    </button>
                                    <button className="w-full py-4 bg-[#111] border border-[#333] text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-white hover:text-white transition-all flex items-center justify-center gap-2">
                                        <FileText size={14} /> Query Datasheet
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!inspectedComponent && (
                    <div className="w-96 border-l border-[#1f1f1f] bg-[#050505] flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Diagnostic Matrix</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse"></div>
                                    <span className="text-[9px] text-[#42be65] font-bold uppercase">% Efficient</span>
                                </div>
                            </div>

                            {!analysis ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-20">
                                    <Scan className="w-12 h-12 mb-4" />
                                    <p className="text-[9px] uppercase tracking-widest">Awaiting Analysis</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div>
                                        <span className="text-[8px] text-gray-600 uppercase font-black block mb-4 tracking-widest">Secure Rails</span>
                                        <div className="bg-[#0a0a0a] border border-[#222] p-4 rounded-xl relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#9d4edd]"></div>
                                            <div className="flex justify-between items-start">
                                                <div className="text-[10px] text-gray-300 leading-relaxed max-w-[180px]">
                                                    {analysis.powerRails?.[0]?.source || "SecEnclave Rail A"} ({analysis.powerRails?.[0]?.voltage || "1.8V"})
                                                </div>
                                                <div className="bg-[#9d4edd]/10 border border-[#9d4edd]/30 px-1.5 py-0.5 rounded text-[7px] text-[#9d4edd] font-bold uppercase">
                                                    {analysis.powerRails?.[0]?.status || "PROTECTED"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <span className="text-[8px] text-gray-600 uppercase font-black block mb-4 tracking-widest">Integrity Issues</span>
                                        <div className="space-y-4">
                                            {analysis.issues?.map((issue: any, i: number) => (
                                                <div key={i} className="p-4 rounded-xl border border-[#1f1f1f] bg-black/40 hover:border-[#9d4edd]/50 transition-all cursor-default relative overflow-hidden">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[9px] font-black uppercase ${issue.severity === 'CRITICAL' ? 'text-red-500' : 'text-blue-400'}`}>{issue.severity}</span>
                                                        <span className="text-[7px] text-gray-600 tracking-tighter">Loc: {issue.location}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-300 leading-relaxed">{issue.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-10 border-t border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-8 text-[9px] font-mono text-gray-600 z-20 shrink-0">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse"></div> Secure Enclave Stable</span>
                    <span className="flex items-center gap-2 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]"></div> TPM Uplink Active</span>
                </div>
                <div className="uppercase tracking-[0.4em] font-black text-gray-500">Zero-Trust Architecture // v4.0.0</div>
            </div>
        </div>
    );
};

export default HardwareEngine;