
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { analyzeSchematic, researchComponents, fileToGenerativePart, promptSelectKey, generateXRayVariant, generateIsometricSchematic } from '../services/geminiService';
import { Upload, Search, Cpu, Zap, AlertTriangle, Activity, Loader2, CircuitBoard, Server, Thermometer, Camera, X, ExternalLink, Scan, FileText, Plus, Trash2, Download, List, MousePointer2, Globe, Box, Layers, Network, Wind, Droplets, Power, ShieldAlert, Sliders, CheckCircle2, BoxSelect, RefreshCw, Filter, Move3d, ZoomIn, ZoomOut, Move, HardDrive, MemoryStick, Fan, Eye, TrendingUp, DollarSign, Calendar, Rotate3d, MousePointer, Gauge } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, LineChart, Line, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { ComponentRecommendation, PowerRail, SchematicIssue } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// --- Missing Definitions ---

interface HeatSource {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    intensity: number;
    freq: number;
    dx: number;
    dy: number;
}

const VERTEX_SHADER = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const FRAGMENT_SHADER = `
    precision mediump float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform int uSourceCount;
    uniform float uConductivity;
    uniform float uCooling;
    uniform vec3 uSources[20]; // x, y, intensity

    void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float heat = 0.0;
        
        for(int i = 0; i < 20; i++) {
            if(i >= uSourceCount) break;
            vec3 src = uSources[i];
            vec2 srcPos = src.xy / uResolution;
            float dist = distance(uv, srcPos);
            // Heat equation approximation
            float intensity = src.z;
            heat += intensity * exp(-dist * dist * (10.0 / uConductivity));
        }

        // Cooling
        heat -= uCooling * 0.1;
        heat = clamp(heat, 0.0, 1.0);

        // Color map (Cold Blue -> Hot Red/White)
        vec3 color = vec3(0.0);
        if(heat < 0.2) color = mix(vec3(0.0, 0.0, 0.2), vec3(0.0, 0.5, 1.0), heat * 5.0);
        else if(heat < 0.5) color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 1.0, 0.0), (heat - 0.2) * 3.33);
        else if(heat < 0.8) color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (heat - 0.5) * 3.33);
        else color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), (heat - 0.8) * 5.0);

        gl_FragColor = vec4(color, 1.0);
    }
`;

// --- Missing Component Implementations ---

const SchematicAnalysisPanel: React.FC<{ analysis: any, onRescan: () => void, isScanning: boolean }> = ({ analysis, onRescan, isScanning }) => {
    return (
        <div className="p-4 space-y-4 overflow-y-auto h-full custom-scrollbar">
            <div className="flex justify-between items-center border-b border-[#333] pb-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analysis Matrix</h3>
                <div className="text-[#42be65] text-[10px] font-mono">{analysis.efficiencyRating}% EFFICIENT</div>
            </div>
            
            <div className="space-y-2">
                <div className="text-[9px] font-mono text-gray-500 uppercase">Power Rails</div>
                <AnimatePresence>
                    {analysis.powerRails?.map((rail: any, i: number) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex justify-between items-center bg-[#111] px-2 py-1.5 rounded border border-[#222]"
                        >
                            <span className="text-[10px] text-white font-mono">{rail.source} ({rail.voltage})</span>
                            <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded ${rail.status === 'stable' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                                {rail.status}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="space-y-2">
                <div className="text-[9px] font-mono text-gray-500 uppercase">Identified Issues</div>
                <AnimatePresence>
                    {analysis.issues?.map((issue: any, i: number) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="bg-[#111] p-2 rounded border border-[#222] hover:border-red-500/30 transition-colors"
                        >
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] text-red-400 font-bold uppercase">{issue.severity}</span>
                                <span className="text-[8px] text-gray-500">{issue.location}</span>
                            </div>
                            <p className="text-[9px] text-gray-300 leading-tight mb-1">{issue.description}</p>
                            <p className="text-[8px] text-[#9d4edd] font-mono">{issue.recommendation}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
             <button 
                onClick={onRescan}
                disabled={isScanning}
                className="w-full py-2 bg-[#1f1f1f] border border-[#333] text-gray-300 hover:text-white hover:bg-[#222] text-[10px] font-mono uppercase transition-all flex items-center justify-center gap-2 mt-4"
             >
                {isScanning ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
                Re-Scan Schematic
             </button>
        </div>
    );
};

const InteractiveIsoView: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
    return (
        <div className="w-full h-full relative group overflow-hidden bg-[#050505]">
             <img src={imageUrl} className="w-full h-full object-contain scale-100 group-hover:scale-105 transition-transform duration-700" alt="Isometric View" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
             <div className="absolute bottom-4 left-4">
                 <div className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-widest mb-1 flex items-center gap-2">
                     <Box className="w-3 h-3" /> 3D Spatial Topology
                 </div>
                 <p className="text-[9px] text-gray-500 max-w-[200px]">Isometric projection generated from schema topology.</p>
             </div>
        </div>
    );
};

const XRayScanner: React.FC<{ baseImage: string, xrayImage: string }> = ({ baseImage, xrayImage }) => {
    const [scanPosition, setScanPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        setScanPosition(x);
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative cursor-ew-resize overflow-hidden" 
            onMouseMove={handleMouseMove}
        >
            {/* Base Image */}
            <img src={baseImage} className="absolute inset-0 w-full h-full object-contain" alt="Base" />
            
            {/* X-Ray Image (Clipped) */}
            <div 
                className="absolute inset-0 overflow-hidden bg-black/50"
                style={{ width: `${scanPosition}%`, borderRight: '2px solid #9d4edd' }}
            >
                <img 
                    src={xrayImage} 
                    className="absolute top-0 left-0 h-full max-w-none object-contain" 
                    style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }} 
                    alt="X-Ray" 
                />
                
                {/* Scanline Effect inside X-Ray */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.1)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>
            </div>

            {/* Scanner Handle */}
            <div 
                className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-center pointer-events-none"
                style={{ left: `${scanPosition}%` }}
            >
                <div className="absolute w-6 h-6 bg-[#9d4edd] rounded-full flex items-center justify-center shadow-lg border border-black">
                    <Move className="w-3 h-3 text-black" />
                </div>
            </div>
            
             <div className="absolute top-4 left-4 bg-black/80 px-2 py-1 rounded border border-[#333] pointer-events-none">
                 <span className="text-[9px] font-mono text-[#9d4edd] uppercase flex items-center gap-2">
                    <Scan className="w-3 h-3" />
                    X-RAY MODE ACTIVE
                 </span>
             </div>
        </div>
    );
};

// --- Standard Components ---

interface ErrorDisplayProps {
    message: string;
    onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => (
    <div className="p-4 bg-red-900/10 border border-red-900/30 text-red-400 text-xs font-mono flex items-center justify-between animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-2">
             <AlertTriangle className="w-4 h-4" />
             <span>{message}</span>
        </div>
        {onRetry && (
            <button 
                onClick={onRetry} 
                className="px-3 py-1 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded uppercase tracking-wider transition-colors text-[10px]"
            >
                Retry
            </button>
        )}
    </div>
);

// --- GPU Cluster Monitor ---
const GPUClusterMonitor = () => {
    const [metrics, setMetrics] = useState({ usage: 45, temp: 62, fan: 40, vram: 12 });
    const [history, setHistory] = useState<number[]>(new Array(30).fill(45));

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => {
                const nextUsage = Math.max(5, Math.min(99, prev.usage + (Math.random() * 20 - 10)));
                return {
                    usage: nextUsage,
                    temp: 45 + (nextUsage * 0.35) + (Math.random() * 2),
                    fan: 30 + (nextUsage * 0.5),
                    vram: Math.max(8, Math.min(24, prev.vram + (Math.random() * 2 - 1)))
                };
            });
            setHistory(prev => [...prev.slice(1), metrics.usage]);
        }, 1000);
        return () => clearInterval(interval);
    }, [metrics.usage]);

    // Enhanced Sci-Fi Gauge
    const CircularGauge = ({ value, max = 100, label, color, unit }: any) => {
        const radius = 28; // Increased slightly
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (value / max) * circumference;
        
        return (
            <div className="flex flex-col items-center group relative p-2">
                <div className="relative w-20 h-20 flex items-center justify-center">
                    {/* Rotating Outer Ring */}
                    <div className="absolute inset-0 border border-dashed border-[#333] rounded-full animate-[spin_10s_linear_infinite] opacity-30"></div>
                    <div className="absolute inset-1.5 border border-dotted border-[#333] rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-20"></div>

                    {/* Main SVG Gauge */}
                    <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]" viewBox="0 0 80 80">
                        {/* Background Track */}
                        <circle cx="40" cy="40" r={radius} stroke="#1f1f1f" strokeWidth="4" fill="none" />
                        {/* Value Arc */}
                        <circle 
                            cx="40" cy="40" r={radius} 
                            stroke={color} strokeWidth="4" fill="none" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                        />
                    </svg>
                    
                    {/* Center Value */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-mono font-bold text-white leading-none">
                            {value.toFixed(0)}
                        </span>
                        <span className="text-[8px] text-gray-500 font-mono leading-none mt-0.5">{unit}</span>
                    </div>
                </div>
                <span className="text-[9px] text-gray-500 font-mono uppercase mt-1 tracking-wider group-hover:text-white transition-colors">{label}</span>
            </div>
        );
    };

    // Generate Path for Glowing Line Chart
    const generateSparklinePath = (data: number[]) => {
        const max = 100;
        const width = 100; 
        const height = 100;
        const step = width / (data.length - 1);
        
        const points = data.map((val, i) => {
            const x = i * step;
            const y = height - (val / max) * height;
            return `${x},${y}`;
        });
        
        return `M ${points.join(' L ')}`;
    };

    return (
        <div className="border-t border-[#1f1f1f] bg-[#0a0a0a] p-4 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.02)_50%,transparent_75%,transparent)] bg-[length:10px_10px] pointer-events-none"></div>
            
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10 shrink-0">
                <CircuitBoard className="w-3 h-3 text-[#9d4edd]" />
                GPU Cluster Analytics
            </h4>
            
            <div className="flex items-center justify-around mb-6 px-2 relative z-10 shrink-0">
                <CircularGauge value={metrics.usage} label="Compute" color="#9d4edd" unit="%" />
                <CircularGauge value={metrics.temp} label="Thermal" color={metrics.temp > 80 ? '#ef4444' : '#42be65'} unit="°C" />
                <CircularGauge value={metrics.fan} label="Fan RPM" color="#22d3ee" unit="%" />
            </div>

            <div className="space-y-4 relative z-10 shrink-0 mb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500">
                        <span>VRAM ALLOCATION</span>
                        <span className="text-white">{metrics.vram.toFixed(1)} GB / 24.0 GB</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] animate-[shimmer_2s_infinite]"></div>
                        <div className="h-full bg-[#9d4edd]" style={{ width: `${(metrics.vram / 24) * 100}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                </div>
            </div>

            {/* Glowing Line History */}
            <div className="relative z-10 min-h-[50px] flex flex-col justify-end">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-mono text-gray-600 uppercase">Load History (30s)</span>
                    <Activity className="w-3 h-3 text-[#9d4edd] opacity-50" />
                </div>
                <div className="h-12 w-full relative">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path 
                            d={generateSparklinePath(history)} 
                            fill="none" 
                            stroke="#9d4edd" 
                            strokeWidth="2" 
                            style={{ filter: 'drop-shadow(0 0 4px #9d4edd)' }}
                            vectorEffect="non-scaling-stroke"
                        />
                        {/* Fill Gradient Area */}
                        <path 
                            d={`${generateSparklinePath(history)} L 100,100 L 0,100 Z`} 
                            fill="url(#sparkGradient)" 
                            opacity="0.2"
                        />
                        <defs>
                            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#9d4edd" stopOpacity="0.8"/>
                                <stop offset="100%" stopColor="#9d4edd" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>
        </div>
    );
};

// ... Rest of component remains structurally the same, just included the above upgrades ...
// To save space in response, assume standard components below (ComponentInspector, SystemTelemetryPanel, GlobalComputeTwin, HardwareEngine main component) 
// retain previous logic but use the updated SchematicAnalysisPanel.

// --- Component Inspector Modal (Price Chart) ---
const ComponentInspector: React.FC<{ component: ComponentRecommendation; onClose: () => void; onAdd: () => void }> = ({ component, onClose, onAdd }) => {
    // Simulate Price History
    const priceData = useMemo(() => {
        if (!component) return [];
        // Deterministic random based on part number length to keep it consistent-ish for the session
        let basePrice = 100 + ((component.partNumber?.length || 5) * 50) + (Math.random() * 200);
        const data = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Random volatility
            const change = (Math.random() * 0.15) - 0.05; // -5% to +10%
            basePrice = basePrice * (1 + change);
            
            data.push({
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                price: parseFloat(basePrice.toFixed(2)),
                vol: Math.floor(Math.random() * 1000)
            });
        }
        return data;
    }, [component]);

    if (!component) return null;

    const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : 0;
    const startPrice = priceData.length > 0 ? priceData[0].price : 0;
    const trend = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8" onClick={onClose}>
            <div 
                className="bg-[#0a0a0a] border border-[#333] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-[#1f1f1f] bg-[#111]">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded text-[#9d4edd]">
                            <Cpu className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">{component.manufacturer}</div>
                            <h2 className="text-xl font-bold text-white font-mono">{component.partNumber}</h2>
                            <p className="text-xs text-gray-400 mt-1 max-w-md">{component.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Chart & Metrics */}
                    <div className="flex-1 p-6 border-r border-[#1f1f1f] flex flex-col overflow-y-auto custom-scrollbar">
                        
                        {/* Price Header */}
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <DollarSign className="w-3 h-3" /> Market Rate
                                </div>
                                <div className="text-3xl font-mono font-bold text-white">${currentPrice.toFixed(2)}</div>
                            </div>
                            <div className={`px-3 py-1 rounded border text-xs font-mono font-bold flex items-center gap-2 ${trend >= 0 ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                                <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                                {trend > 0 ? '+' : ''}{trend.toFixed(2)}% (7d)
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="h-64 w-full bg-[#050505] border border-[#222] rounded p-2 mb-6 relative">
                            <div className="absolute top-2 left-2 text-[9px] font-mono text-gray-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> 7-Day Trend
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceData}>
                                    <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke="#444" 
                                        tick={{fontSize: 9, fontFamily: 'Fira Code', fill: '#666'}} 
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke="#444" 
                                        tick={{fontSize: 9, fontFamily: 'Fira Code', fill: '#666'}} 
                                        tickLine={false}
                                        axisLine={false}
                                        domain={['auto', 'auto']}
                                        tickFormatter={(val) => `$${val}`}
                                        width={40}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', fontSize: '10px', fontFamily: 'Fira Code' }}
                                        itemStyle={{ color: '#9d4edd' }}
                                        formatter={(val: number) => [`$${val.toFixed(2)}`, 'Price']}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke="#9d4edd" 
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#0a0a0a', stroke: '#9d4edd', strokeWidth: 2 }}
                                        activeDot={{ r: 5, fill: '#9d4edd' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Specs Grid */}
                        <div>
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <List className="w-3 h-3" /> Technical Specifications
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(component.specs || {}).map(([key, val], i) => (
                                    <div key={i} className="flex justify-between items-center bg-[#111] px-3 py-2 rounded border border-[#222]">
                                        <span className="text-[9px] text-gray-500 font-mono uppercase truncate mr-2">{key}</span>
                                        <span className="text-[10px] text-gray-300 font-mono text-right truncate">{val as string}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions (Simple for now) */}
                    <div className="w-64 bg-[#080808] p-6 flex flex-col gap-4">
                        <div className="flex-1">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4">Availability</h3>
                            <div className="space-y-3">
                                {['DigiKey', 'Mouser', 'Arrow', 'LCSC'].map((vendor, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-mono text-gray-400 pb-2 border-b border-[#1f1f1f]">
                                        <span>{vendor}</span>
                                        <span className="text-[#42be65]">{Math.floor(Math.random() * 5000)} In Stock</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => { onAdd(); onClose(); }}
                            className="w-full py-3 bg-[#9d4edd] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#b06bf7] transition-all rounded shadow-[0_0_15px_rgba(157,78,221,0.3)] flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add to BOM
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- System Telemetry Panel (CPU/RAM/GPU) ---
const SystemTelemetryPanel = () => {
    const [data, setData] = useState<{time: number, gpuLoad: number, cpuLoad: number}[]>([]);
    const [stats, setStats] = useState({ 
        gpuLoad: 0, gpuTemp: 40, gpuVram: 0, gpuFan: 0, gpuPower: 0,
        cpuLoad: 0, cpuTemp: 35, cpuPower: 0,
        ramUsage: 0 
    });

    useEffect(() => {
        // Init data
        const initialData = Array(20).fill(0).map((_, i) => ({
             time: Date.now() - (20-i)*1000,
             gpuLoad: 30 + Math.random() * 10,
             cpuLoad: 20 + Math.random() * 10
        }));
        setData(initialData);

        const interval = setInterval(() => {
            setStats(prev => {
                const newGpuLoad = Math.max(10, Math.min(99, prev.gpuLoad + (Math.random() * 15 - 7)));
                const newCpuLoad = Math.max(5, Math.min(95, prev.cpuLoad + (Math.random() * 20 - 10)));
                
                const newGpuTemp = 45 + (newGpuLoad * 0.35) + (Math.random() * 2);
                const newCpuTemp = 30 + (newCpuLoad * 0.4) + (Math.random() * 2);
                
                // Update chart data
                setData(d => [...d.slice(1), { time: Date.now(), gpuLoad: newGpuLoad, cpuLoad: newCpuLoad }]);

                return {
                    gpuLoad: newGpuLoad,
                    gpuTemp: newGpuTemp,
                    gpuVram: 8 + (newGpuLoad * 0.12) + (Math.random()),
                    gpuFan: 1000 + (newGpuLoad * 25) + Math.random() * 50,
                    gpuPower: 50 + (newGpuLoad * 3) + Math.random() * 10,
                    cpuLoad: newCpuLoad,
                    cpuTemp: newCpuTemp,
                    cpuPower: 30 + (newCpuLoad * 1.5) + Math.random() * 5,
                    ramUsage: 12 + (newCpuLoad * 0.2) + (Math.random() * 0.5)
                };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="border-t border-[#1f1f1f] bg-[#080808] p-4">
             <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3 text-[#9d4edd]" />
                Local System Telemetry
             </h4>
             
             {/* Metrics Grid */}
             <div className="grid grid-cols-3 gap-2 mb-4">
                 {/* CPU Stats */}
                 <div className="bg-[#111] border border-[#222] p-2 rounded flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] text-gray-500 uppercase flex items-center gap-1"><Cpu className="w-2.5 h-2.5"/> CPU</span>
                        <span className={`text-[9px] ${stats.cpuTemp > 80 ? 'text-red-500' : 'text-[#42be65]'}`}>{stats.cpuTemp.toFixed(0)}°C</span>
                     </div>
                     <div className="text-sm font-mono text-white font-bold mb-1">{stats.cpuLoad.toFixed(0)}%</div>
                     <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                         <div className="h-full bg-[#42be65]" style={{ width: `${stats.cpuLoad}%` }}></div>
                     </div>
                     <div className="flex justify-between text-[8px] font-mono text-gray-600 border-t border-[#222] pt-1">
                         <span>PWR</span>
                         <span>{stats.cpuPower.toFixed(0)}W</span>
                     </div>
                 </div>

                 {/* RAM Stats */}
                 <div className="bg-[#111] border border-[#222] p-2 rounded flex flex-col justify-between">
                     <div className="text-[9px] text-gray-500 uppercase flex items-center gap-1 mb-1"><MemoryStick className="w-2.5 h-2.5"/> RAM</div>
                     <div className="text-sm font-mono text-[#f59e0b] font-bold mb-1">{stats.ramUsage.toFixed(1)} G</div>
                     <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                         <div className="h-full bg-[#f59e0b]" style={{ width: `${(stats.ramUsage / 64) * 100}%` }}></div>
                     </div>
                     <div className="flex justify-between text-[8px] font-mono text-gray-600 border-t border-[#222] pt-1">
                         <span>TOTAL</span>
                         <span>64GB</span>
                     </div>
                 </div>

                 {/* GPU Stats */}
                 <div className="bg-[#111] border border-[#222] p-2 rounded flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] text-gray-500 uppercase flex items-center gap-1"><Zap className="w-2.5 h-2.5"/> GPU</span>
                        <span className="text-[9px] text-[#22d3ee]">{stats.gpuVram.toFixed(1)}G</span>
                     </div>
                     <div className="text-sm font-mono text-[#9d4edd] font-bold mb-1">{stats.gpuLoad.toFixed(0)}%</div>
                     <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                         <div className="h-full bg-[#9d4edd]" style={{ width: `${stats.gpuLoad}%` }}></div>
                     </div>
                     <div className="flex justify-between text-[8px] font-mono text-gray-600 border-t border-[#222] pt-1 gap-1">
                         <span className="flex items-center gap-0.5"><Fan className="w-2 h-2"/> {stats.gpuFan.toFixed(0)}</span>
                         <span className="flex items-center gap-0.5"><Zap className="w-2 h-2"/> {stats.gpuPower.toFixed(0)}W</span>
                     </div>
                 </div>
             </div>

             {/* Comparative Chart */}
             <div className="h-28 w-full bg-[#111] border border-[#222] rounded relative overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                          <defs>
                              <linearGradient id="gradGpu" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.5}/>
                                  <stop offset="95%" stopColor="#9d4edd" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#42be65" stopOpacity={0.5}/>
                                  <stop offset="95%" stopColor="#42be65" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="gpuLoad" 
                            stroke="#9d4edd" 
                            strokeWidth={2} 
                            fill="url(#gradGpu)" 
                            isAnimationActive={false} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cpuLoad" 
                            stroke="#42be65" 
                            strokeWidth={1} 
                            fill="url(#gradCpu)" 
                            fillOpacity={0.3}
                            isAnimationActive={false} 
                          />
                      </AreaChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute top-1 right-2 flex gap-3 text-[8px] font-mono">
                      <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 bg-[#42be65]"></div>
                          <span className="text-gray-500">CPU</span>
                      </div>
                      <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 bg-[#9d4edd]"></div>
                          <span className="text-gray-500">GPU</span>
                      </div>
                  </div>
             </div>
        </div>
    );
};

const GlobalComputeTwin = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const nodes: {x: number, y: number, z: number, phase: number}[] = [];
        const nodeCount = 60;
        
        // Initialize Nodes on Sphere
        for(let i=0; i<nodeCount; i++) {
            const phi = Math.acos(-1 + (2 * i) / nodeCount);
            const theta = Math.sqrt(nodeCount * Math.PI) * phi;
            const r = 100;
            nodes.push({
                x: r * Math.cos(theta) * Math.sin(phi),
                y: r * Math.sin(theta) * Math.sin(phi),
                z: r * Math.cos(phi),
                phase: Math.random() * Math.PI * 2
            });
        }

        let angleX = 0;
        let angleY = 0;

        const render = () => {
            if(!ctx || !canvas) return;
            canvas.width = canvas.parentElement?.offsetWidth || 300;
            canvas.height = canvas.parentElement?.offsetHeight || 300;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            ctx.clearRect(0,0,canvas.width, canvas.height);
            
            angleY += 0.005;
            angleX += 0.002;

            // Sort nodes by Z for depth
            const projectedNodes = nodes.map(n => {
                // Rotate Y
                let x = n.x * Math.cos(angleY) - n.z * Math.sin(angleY);
                let z = n.z * Math.cos(angleY) + n.x * Math.sin(angleY);
                // Rotate X
                let y = n.y * Math.cos(angleX) - z * Math.sin(angleX);
                z = z * Math.cos(angleX) + n.y * Math.sin(angleX);
                
                const scale = 200 / (200 + z);
                return {
                    x: cx + x * scale,
                    y: cy + y * scale,
                    scale,
                    z,
                    phase: n.phase
                };
            }).sort((a,b) => b.z - a.z); // Draw back to front

            // Draw Connections
            ctx.lineWidth = 0.5;
            projectedNodes.forEach((n1, i) => {
                projectedNodes.slice(i+1).forEach(n2 => {
                    const dist = Math.sqrt((n1.x - n2.x)**2 + (n1.y - n2.y)**2);
                    if (dist < 40 && n1.z > -50 && n2.z > -50) { // Only connect close, front-ish nodes
                        const alpha = (1 - dist/40) * 0.3 * ((n1.scale + n2.scale)/2);
                        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                });
            });

            // Draw Nodes
            projectedNodes.forEach(n => {
                const alpha = Math.max(0.1, (n.z + 100) / 200);
                const pulse = Math.sin(Date.now() * 0.005 + n.phase) * 0.5 + 0.5;
                const size = 1.5 * n.scale + (pulse * n.scale);
                
                ctx.fillStyle = `rgba(157, 78, 221, ${alpha})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, size, 0, Math.PI*2);
                ctx.fill();
                
                if (pulse > 0.8) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#9d4edd';
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, size * 0.5, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <div className="w-full h-full bg-[#050505] flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 text-[#22d3ee] mb-1">
                    <Globe className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Global Compute Twin</span>
                </div>
                <div className="text-[9px] text-gray-500 font-mono">
                    Node Synchronization: Active
                </div>
            </div>
            <canvas ref={canvasRef} className="w-full h-full opacity-80" />
            
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1 pointer-events-none">
                <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd]"></div>
                    <span>Active Clusters: 1,024</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]"></div>
                    <span>Latency: 14ms</span>
                </div>
            </div>
        </div>
    );
};

const HardwareEngine: React.FC = () => {
  const { hardware, setHardwareState } = useAppStore();
  const [activeTier, setActiveTier] = useState<'TIER_1' | 'TIER_2' | 'TIER_3'>('TIER_1');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filtering
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<boolean>(false);

  // Inspection
  const [selectedComponent, setSelectedComponent] = useState<ComponentRecommendation | null>(null);

  // X-Ray & View State
  const [xrayImageUrl, setXrayImageUrl] = useState<string | null>(null);
  const [isGeneratingXray, setIsGeneratingXray] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [isoImage, setIsoImage] = useState<string | null>(null);
  const [isGeneratingIso, setIsGeneratingIso] = useState(false);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // BOM State
  const [bom, setBom] = useState<ComponentRecommendation[]>([]);

  // Thermal State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [conductivity, setConductivity] = useState(0.05);
  const [cooling, setCooling] = useState(0.5);
  const [thermalProbe, setThermalProbe] = useState<{x:number, y:number, temp:number} | null>(null);
  
  const heatSourcesRef = useRef<HeatSource[]>([
    { x: 0, y: 0, baseX: 0, baseY: 0, intensity: 0.6, freq: 0.05, dx: 0.02, dy: 0.03 },
    { x: 0, y: 0, baseX: 0, baseY: 0, intensity: 0.5, freq: 0.03, dx: -0.02, dy: 0.01 },
    { x: 0, y: 0, baseX: 0, baseY: 0, intensity: 0.7, freq: 0.07, dx: 0.01, dy: -0.02 },
  ]);
  const isInitializedRef = useRef(false);

  // Compute unique manufacturers for filter dropdown
  const uniqueManufacturers = Array.from(new Set(hardware.recommendations.map(r => r?.manufacturer).filter(Boolean))).sort();

  // Filter recommendations logic
  const filteredRecommendations = hardware.recommendations.filter(rec => {
      if (!rec) return false;
      const matchesMfg = manufacturerFilter === 'ALL' || rec.manufacturer === manufacturerFilter;
      const specs = rec.specs || {};
      const stockStatus = Object.entries(specs).find(([k]) => /stock|availability/i.test(k))?.[1] || '';
      const matchesStock = !stockFilter || /in stock|available|instock|yes/i.test(String(stockStatus));
      return matchesMfg && matchesStock;
  });

  // --- WebGL Thermal Simulation ---
  useEffect(() => {
    if (activeTier !== 'TIER_2') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Initialize Sources Positions
    if (!isInitializedRef.current) {
        const w = canvas.width;
        const h = canvas.height;
        heatSourcesRef.current.forEach((src, i) => {
             const offsets = [[0.3, 0.3], [0.7, 0.4], [0.5, 0.7], [0.8, 0.8], [0.2, 0.6]];
             src.baseX = w * (offsets[i]?.[0] || 0.5);
             src.baseY = h * (offsets[i]?.[1] || 0.5);
             src.x = src.baseX;
             src.y = src.baseY;
        });
        isInitializedRef.current = true;
    }

    const createShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
        return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    gl.useProgram(program);

    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ]), gl.STATIC_DRAW);

    const positionAttrib = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uTime = gl.getUniformLocation(program, "uTime");
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uSourceCount = gl.getUniformLocation(program, "uSourceCount");
    const uConductivity = gl.getUniformLocation(program, "uConductivity");
    const uCooling = gl.getUniformLocation(program, "uCooling");
    const uSources = gl.getUniformLocation(program, "uSources");

    let animationFrameId: number;
    let time = 0;

    const render = () => {
        time += 0.02;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        heatSourcesRef.current.forEach(src => {
            src.x = src.baseX + Math.sin(time * src.dx * 5.0) * 20.0;
            src.y = src.baseY + Math.cos(time * src.dy * 5.0) * 20.0;
        });

        const sourceData = [];
        for(let i=0; i<20; i++) {
            if(i < heatSourcesRef.current.length) {
                const s = heatSourcesRef.current[i];
                const pulse = 1.0 + Math.sin(time * s.freq * 10.0) * 0.2;
                sourceData.push(s.x, canvas.height - s.y, s.intensity * pulse);
            } else {
                sourceData.push(0,0,0);
            }
        }

        gl.uniform1f(uTime, time);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1i(uSourceCount, heatSourcesRef.current.length);
        gl.uniform1f(uConductivity, conductivity);
        gl.uniform1f(uCooling, cooling);
        gl.uniform3fv(uSources, new Float32Array(sourceData));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
        cancelAnimationFrame(animationFrameId);
        gl.deleteProgram(program);
    };
  }, [activeTier, conductivity, cooling]);

  useEffect(() => {
    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // --- Handlers ---
  const handleSchematicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const file = e.target.files[0];
        const fileData = await fileToGenerativePart(file);
        setHardwareState({ schematicImage: fileData, analysis: null, error: null, isLoading: true });
        setXrayImageUrl(null); 
        setIsoImage(null);
        setViewMode('2D');
        
        setIsGeneratingXray(true);
        generateXRayVariant(fileData)
            .then(url => setXrayImageUrl(url))
            .catch(err => setHardwareState({ error: "X-Ray Gen Failed: " + err.message }))
            .finally(() => setIsGeneratingXray(false));

        analyzeSchematic(fileData)
            .then(analysis => setHardwareState({ analysis, isLoading: false }))
            .catch(err => setHardwareState({ error: "Analysis Failed: " + err.message, isLoading: false }));

      } catch (err: any) {
        setHardwareState({ error: "Failed to process image.", isLoading: false });
      }
    }
  };

  const runAnalysis = async () => {
    if (!hardware.schematicImage) return;
    setHardwareState({ isLoading: true, error: null });
    try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) { await promptSelectKey(); setHardwareState({ isLoading: false }); return; }
        const analysis = await analyzeSchematic(hardware.schematicImage);
        setHardwareState({ analysis, isLoading: false });
    } catch (err: any) { setHardwareState({ error: "Analysis Failed: " + err.message, isLoading: false }); }
  };

  const toggleIsoView = async () => {
      if (viewMode === '2D') {
          setViewMode('3D');
          if (!isoImage && hardware.schematicImage && !isGeneratingIso) {
              const hasKey = await window.aistudio?.hasSelectedApiKey();
              if (!hasKey) { await promptSelectKey(); }
              setIsGeneratingIso(true);
              generateIsometricSchematic(hardware.schematicImage)
                .then(url => setIsoImage(url))
                .catch(err => setHardwareState({ error: "ISO Gen Failed: " + err.message }))
                .finally(() => setIsGeneratingIso(false));
          }
      } else {
          setViewMode('2D');
      }
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
          setIsCameraOpen(true);
      } catch (err) { setHardwareState({ error: "Camera access denied." }); }
  };

  const stopCamera = () => {
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
      setIsCameraOpen(false);
  };

  const captureImage = () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
              const fileData = { inlineData: { data: base64, mimeType: 'image/jpeg' }, name: 'camera_capture.jpg' };
              
              setHardwareState({ schematicImage: fileData, analysis: null, error: null, isLoading: true });
              stopCamera();
              setXrayImageUrl(null); setIsoImage(null); setViewMode('2D');
              
              setIsGeneratingXray(true);
              generateXRayVariant(fileData)
                .then(url => setXrayImageUrl(url))
                .catch(err => setHardwareState({ error: "X-Ray Gen Failed: " + err.message }))
                .finally(() => setIsGeneratingXray(false));

              analyzeSchematic(fileData)
                .then(analysis => setHardwareState({ analysis, isLoading: false }))
                .catch(err => setHardwareState({ error: "Analysis Failed: " + err.message, isLoading: false }));
          }
      }
  };

  const runComponentSearch = async () => {
    if (!hardware.componentQuery) return;
    setIsSearching(true);
    setHardwareState({ error: null });
    setManufacturerFilter('ALL');
    setStockFilter(false);

    try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
       if (!hasKey) { await promptSelectKey(); setIsSearching(false); return; }
        const results = await researchComponents(hardware.componentQuery);
        setHardwareState({ recommendations: results });
    } catch (err: any) { setHardwareState({ error: err.message || "Search failed." }); } 
    finally { setIsSearching(false); }
  };

  const addToBom = (rec: ComponentRecommendation) => {
      if (!rec) return;
      if (!bom.find(i => i.partNumber === rec.partNumber)) { setBom(prev => [...prev, rec]); }
  };

  const exportBom = () => {
      const headers = ["Part Number", "Manufacturer", "Description", "Lead Time", "Stock", "Link"];
      const rows = bom.map(i => {
          if (!i) return ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
          const specs = i.specs || {};
          return [
            i.partNumber || "N/A", 
            i.manufacturer || "N/A", 
            `"${(i.description || "").replace(/"/g, '""')}"`, 
            specs["Lead Time"] || "N/A", 
            specs["Stock Status"] || "N/A", 
            specs["Buy Link"] || "N/A"
          ];
      });
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "basix_bom.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleHeatClick = (e: React.MouseEvent) => {
      if (activeTier !== 'TIER_2' || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      heatSourcesRef.current.push({ x, y, baseX: x, baseY: y, intensity: 0.8, freq: 0.1, dx: 0.01, dy: 0.01 });
  };

  const handleHeatHover = (e: React.MouseEvent) => {
      if (activeTier !== 'TIER_2' || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let totalHeat = 0;
      heatSourcesRef.current.forEach(src => {
          const dist = Math.sqrt((x - src.x)**2 + (y - src.y)**2);
          totalHeat += (src.intensity * 100) / (1 + dist * 0.1);
      });
      setThermalProbe({ x, y, temp: 25 + totalHeat - (cooling * 10) });
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden border border-[#1f1f1f] rounded shadow-2xl">
      {/* Background Matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

      {/* Header */}
      <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6">
         <div className="flex items-center gap-3">
             <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                 <Server className="w-4 h-4 text-[#9d4edd]" />
             </div>
             <div>
                 <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">BASIX Hardware Evolution Protocol</h1>
                 <p className="text-[9px] font-mono text-gray-500 uppercase">Sovereign Simulation Engine Infrastructure</p>
             </div>
         </div>
         
         <div className="flex bg-[#111] p-1 rounded border border-[#333]">
             <button onClick={() => setActiveTier('TIER_1')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 ${activeTier === 'TIER_1' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}><Box className="w-3 h-3" />2025: Foundation</button>
             <button onClick={() => setActiveTier('TIER_2')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 ${activeTier === 'TIER_2' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}><Layers className="w-3 h-3" />2030: Evolution</button>
             <button onClick={() => setActiveTier('TIER_3')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 ${activeTier === 'TIER_3' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}><Globe className="w-3 h-3" />2035: Singularity</button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative z-10 flex">
          
          {/* TIER 1: FOUNDATION (COMPONENTS & X-RAY) */}
          {activeTier === 'TIER_1' && (
              <div className="w-full h-full flex gap-6 p-6">
                  {/* Left: Component Scout & Analytics Stack */}
                  <div className="w-1/3 flex flex-col bg-[#050505] border border-[#1f1f1f] overflow-hidden">
                      {/* Sticky Header */}
                      <div className="p-4 border-b border-[#1f1f1f] bg-[#0a0a0a] z-10 flex-shrink-0">
                          <h3 className="text-[10px] font-bold font-mono uppercase text-[#9d4edd] flex items-center gap-2">
                              <Search className="w-3 h-3" />
                              Compute Supply Chain
                          </h3>
                      </div>
                      
                      {/* Unified Scrollable Container */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                           {/* Search & List */}
                           <div className="p-4 flex flex-col gap-4">
                               <div className="flex gap-2">
                                   <input 
                                       type="text" 
                                       value={hardware.componentQuery}
                                       onChange={(e) => setHardwareState({ componentQuery: e.target.value })}
                                       onKeyDown={(e) => e.key === 'Enter' && runComponentSearch()}
                                       placeholder="Search H100, ZK ASIC, SmartNIC..."
                                       className="flex-1 bg-[#111] border border-[#333] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#9d4edd]"
                                   />
                                   <button onClick={runComponentSearch} disabled={isSearching} className="px-3 bg-[#9d4edd] text-black hover:bg-[#b06bf7] disabled:opacity-50">
                                       {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                   </button>
                               </div>

                               {/* Filter Controls */}
                               {hardware.recommendations.length > 0 && (
                                   <div className="flex items-center gap-4 mb-2 text-[10px] font-mono bg-[#0a0a0a] border border-[#1f1f1f] p-2 rounded">
                                       <div className="flex items-center gap-2 flex-1">
                                           <Filter className="w-3 h-3 text-gray-500" />
                                           <select 
                                               value={manufacturerFilter}
                                               onChange={(e) => setManufacturerFilter(e.target.value)}
                                               className="bg-[#111] border border-[#333] rounded px-2 py-0.5 text-gray-300 outline-none focus:border-[#9d4edd] cursor-pointer hover:bg-[#161616]"
                                           >
                                               <option value="ALL">ALL MFGS</option>
                                               {uniqueManufacturers.map((m: any) => <option key={m} value={m}>{m}</option>)}
                                           </select>
                                       </div>
                                       
                                       <label className="flex items-center gap-2 cursor-pointer group select-none border-l border-[#333] pl-4">
                                            <span className={`transition-colors ${stockFilter ? 'text-[#42be65]' : 'text-gray-500 group-hover:text-gray-300'}`}>IN STOCK</span>
                                            <div className={`relative w-8 h-4 rounded-full transition-colors ${stockFilter ? 'bg-[#42be65]/20' : 'bg-[#111] border border-[#333]'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${stockFilter ? 'left-[18px] bg-[#42be65] shadow-[0_0_5px_#42be65]' : 'left-0.5 bg-gray-500'}`}></div>
                                            </div>
                                            <input type="checkbox" checked={stockFilter} onChange={() => setStockFilter(!stockFilter)} className="hidden" />
                                       </label>
                                   </div>
                               )}
                               
                               <div className="space-y-3 min-h-[100px]">
                                   {hardware.recommendations.length === 0 ? (
                                       <div className="text-center text-gray-600 mt-4 mb-8">
                                           <Cpu className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                           <p className="text-[9px] font-mono uppercase">Provision Core Compute Nodes</p>
                                       </div>
                                   ) : filteredRecommendations.length === 0 ? (
                                        <div className="text-center text-gray-500 mt-4 mb-8 text-[10px] font-mono">No components match active filters.</div>
                                   ) : (
                                       filteredRecommendations.map((rec, i) => (
                                           <div key={i} className="bg-[#111] border border-[#333] p-3 hover:border-[#9d4edd] group">
                                               <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-200 group-hover:text-[#9d4edd]">{rec.partNumber}</span>
                                                        <p className="text-[9px] text-gray-500 uppercase">{rec.manufacturer}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => setSelectedComponent(rec)}
                                                            className="p-1 text-gray-500 hover:text-white transition-colors"
                                                            title="Inspect & Price History"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => addToBom(rec)} className="p-1 text-gray-500 hover:text-[#42be65] transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                                                    </div>
                                               </div>
                                           </div>
                                       ))
                                   )}
                               </div>
                               
                               {/* BOM Mini-View */}
                               {bom.length > 0 && (
                                   <div className="mt-2 pt-4 border-t border-[#1f1f1f]">
                                       <div className="flex justify-between items-center mb-2">
                                           <span className="text-[9px] font-mono text-gray-500 uppercase">Provisioning List ({bom.length})</span>
                                           <button onClick={exportBom} className="text-[#9d4edd] text-[9px] hover:underline">EXPORT CSV</button>
                                       </div>
                                   </div>
                               )}
                           </div>
                           
                           {/* GPU Monitor & Telemetry (Stacked) */}
                           <div className="mt-auto">
                                <GPUClusterMonitor />
                                <SystemTelemetryPanel />
                           </div>
                      </div>
                  </div>

                  {/* Right: X-Ray Inspector & Analysis */}
                  <div className="flex-1 flex gap-4">
                        {/* X-Ray Logic (Unchanged) */}
                        <div className="flex-1 flex flex-col">
                            {!hardware.schematicImage && !isCameraOpen ? (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#333] rounded-lg bg-[#050505] hover:border-[#9d4edd] transition-colors group relative">
                                    <div className="mb-6 w-20 h-20 bg-[#111] rounded-full flex items-center justify-center border border-[#333] group-hover:border-[#9d4edd]">
                                        <Upload className="w-8 h-8 text-gray-500 group-hover:text-[#9d4edd] transition-colors" />
                                    </div>
                                    <h2 className="text-sm font-mono uppercase text-gray-300 mb-2">Inspect Core Node Architecture</h2>
                                    <p className="text-[10px] text-gray-600 font-mono mb-6 max-w-xs text-center">Upload schematic of H100 Node, ZK Accelerator, or Network Switch for X-Ray Analysis</p>
                                    
                                    <div className="flex gap-4">
                                        <label className="bg-[#9d4edd] text-black px-6 py-2 text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-[#b06bf7] cursor-pointer flex items-center shadow-lg">
                                            <Upload className="w-3 h-3 mr-2" />
                                            Upload Node
                                            <input type="file" onChange={handleSchematicUpload} className="hidden" accept="image/*" />
                                        </label>
                                        <button 
                                            onClick={startCamera}
                                            className="bg-[#1f1f1f] text-[#9d4edd] border border-[#333] px-6 py-2 text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-[#333] flex items-center"
                                        >
                                            <Camera className="w-3 h-3 mr-2" />
                                            Optical Scan
                                        </button>
                                    </div>
                                </div>
                            ) : isCameraOpen ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
                                    <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline></video>
                                    <div className="absolute bottom-8 flex gap-4">
                                        <button onClick={captureImage} className="w-16 h-16 rounded-full border-4 border-[#9d4edd] bg-transparent hover:bg-[#9d4edd]/20 transition-colors"></button>
                                        <button onClick={stopCamera} className="w-16 h-16 rounded-full bg-red-900/50 border border-red-500 flex items-center justify-center hover:bg-red-900"><X className="w-6 h-6 text-white" /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 relative bg-black border border-[#333] rounded overflow-hidden flex flex-col">
                                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                                        <button
                                            onClick={toggleIsoView}
                                            disabled={isGeneratingIso}
                                            className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider border rounded backdrop-blur transition-all flex items-center gap-2
                                                ${viewMode === '3D' ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-black/60 text-gray-400 border-[#333] hover:text-white hover:border-gray-500'}`}
                                        >
                                            {isGeneratingIso ? <Loader2 className="w-3 h-3 animate-spin"/> : <BoxSelect className="w-3 h-3" />}
                                            {viewMode === '3D' ? 'ISO 3D' : '2D SCAN'}
                                        </button>
                                    </div>
                                    <div className="flex-1 relative">
                                        {hardware.schematicImage && (
                                            viewMode === '3D' ? (
                                                isGeneratingIso ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                                                        <Loader2 className="w-12 h-12 text-[#9d4edd] animate-spin mb-4" />
                                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#9d4edd] animate-pulse">Rendering 3D Isometric View...</p>
                                                    </div>
                                                ) : isoImage ? (
                                                    <InteractiveIsoView imageUrl={isoImage} />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs font-mono">ISO Generation Pending</div>
                                                )
                                            ) : (
                                                isGeneratingXray ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <Loader2 className="w-12 h-12 text-[#9d4edd] animate-spin mb-4" />
                                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#9d4edd] animate-pulse">Generating BASIX Node X-Ray...</p>
                                                    </div>
                                                ) : xrayImageUrl ? (
                                                    <XRayScanner 
                                                            baseImage={`data:${hardware.schematicImage.inlineData.mimeType};base64,${hardware.schematicImage.inlineData.data}`}
                                                            xrayImage={xrayImageUrl}
                                                    />
                                                ) : (
                                                    <img 
                                                            src={`data:${hardware.schematicImage.inlineData.mimeType};base64,${hardware.schematicImage.inlineData.data}`} 
                                                            className="w-full h-full object-contain" 
                                                            alt="Base"
                                                    />
                                                )
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Analysis Panel Sidebar */}
                        {(hardware.schematicImage || isCameraOpen) && (
                            <div className="w-80 border-l border-[#1f1f1f] bg-[#050505] flex flex-col">
                                {hardware.isLoading && !hardware.analysis ? (
                                     <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                         <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin mb-4" />
                                         <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Processing Schematic...</p>
                                         <p className="text-[9px] text-gray-600 font-mono mt-2">Extracting node topology and power rails</p>
                                     </div>
                                ) : hardware.analysis ? (
                                     <SchematicAnalysisPanel 
                                        analysis={hardware.analysis} 
                                        onRescan={runAnalysis}
                                        isScanning={hardware.isLoading}
                                     />
                                ) : (
                                     <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                         <Activity className="w-12 h-12 text-[#222] mb-4" />
                                         <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest mb-2">Diagnostic Standby</h3>
                                         <p className="text-[10px] text-gray-600 font-mono mb-6 leading-relaxed">
                                             Schematic detected. Initialize analysis protocol to verify power integrity and efficiency.
                                         </p>
                                         <button 
                                            onClick={runAnalysis}
                                            className="px-6 py-2 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] text-[#9d4edd] text-[10px] font-bold font-mono uppercase tracking-widest transition-all flex items-center"
                                         >
                                            <Scan className="w-3 h-3 mr-2" />
                                            Run Analysis
                                         </button>
                                     </div>
                                )}
                            </div>
                        )}
                  </div>
              </div>
          )}

          {/* TIER 2 & 3 */}
          {activeTier === 'TIER_2' && (
              <div className="w-full h-full p-6 flex gap-6">
                  <div className="flex-1 bg-black border border-[#333] relative rounded overflow-hidden cursor-crosshair group">
                       <canvas 
                            ref={canvasRef} 
                            width={800} 
                            height={600} 
                            className="w-full h-full object-cover"
                            onClick={handleHeatClick}
                            onMouseMove={handleHeatHover}
                            onMouseLeave={() => setThermalProbe(null)}
                       />
                       <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur p-2 border border-[#333] rounded text-[10px] font-mono">
                           <div className="flex items-center gap-2 text-gray-400 mb-1">
                               <Thermometer className="w-3 h-3" />
                               <span>Avg Fluid Temp: {(45 - cooling * 10).toFixed(1)}°C</span>
                           </div>
                           <div className="flex items-center gap-2 text-[#9d4edd]">
                               <Activity className="w-3 h-3" />
                               <span>Immersion Cooling Physics: ACTIVE</span>
                           </div>
                       </div>
                       {thermalProbe && (
                           <div 
                                className="absolute pointer-events-none bg-black/90 border border-[#9d4edd] px-2 py-1 rounded text-[9px] font-mono text-[#9d4edd] whitespace-nowrap z-50 transform -translate-y-full -translate-x-1/2 mt-[-10px]"
                                style={{ top: thermalProbe.y, left: thermalProbe.x }}
                           >
                               {thermalProbe.temp.toFixed(1)}°C
                           </div>
                       )}
                  </div>
                  {/* Immersion Controls Sidebar */}
                  <div className="w-64 bg-[#050505] border border-[#1f1f1f] p-4 flex flex-col">
                       <h3 className="text-[10px] font-bold font-mono uppercase text-[#9d4edd] mb-6">Immersion Tank Control</h3>
                       <div className="space-y-6 flex-1">
                           <div>
                               <div className="flex justify-between items-center mb-2">
                                   <label className="text-[9px] text-gray-500 uppercase flex items-center gap-2">
                                        <Droplets className="w-3 h-3" />
                                        Dielectric Viscosity
                                   </label>
                                   <span className="text-[9px] font-mono text-[#9d4edd]">{conductivity.toFixed(3)}</span>
                               </div>
                               <input 
                                    type="range" 
                                    min="0.01" 
                                    max="0.2" 
                                    step="0.01" 
                                    value={conductivity} 
                                    onChange={(e) => setConductivity(parseFloat(e.target.value))} 
                                    className="w-full accent-[#9d4edd] h-1 bg-[#333] rounded-full appearance-none cursor-pointer"
                               />
                           </div>
                           <div>
                               <div className="flex justify-between items-center mb-2">
                                   <label className="text-[9px] text-gray-500 uppercase flex items-center gap-2">
                                        <Wind className="w-3 h-3" />
                                        Active Cooling Flow
                                   </label>
                                   <span className="text-[9px] font-mono text-[#42be65]">{cooling.toFixed(1)}x</span>
                               </div>
                               <input 
                                    type="range" 
                                    min="0" 
                                    max="2.0" 
                                    step="0.1" 
                                    value={cooling} 
                                    onChange={(e) => setCooling(parseFloat(e.target.value))} 
                                    className="w-full accent-[#42be65] h-1 bg-[#333] rounded-full appearance-none cursor-pointer"
                               />
                           </div>
                       </div>
                  </div>
              </div>
          )}

          {activeTier === 'TIER_3' && <GlobalComputeTwin />}
      </div>

      {/* Component Inspector Overlay */}
      {selectedComponent && (
          <ComponentInspector 
              component={selectedComponent} 
              onClose={() => setSelectedComponent(null)} 
              onAdd={() => addToBom(selectedComponent)}
          />
      )}
    </div>
  );
};

export default HardwareEngine;
