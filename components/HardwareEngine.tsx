import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
    analyzeSchematic, researchComponents, fileToGenerativePart, 
    promptSelectKey, generateXRayVariant, generateIsometricSchematic 
} from '../services/geminiService';
import { 
    Upload, Search, Cpu, Zap, Activity, Loader2, 
    Thermometer, X, Scan, FileText, Plus, Trash2, Download, 
    Globe, RefreshCw, Filter, MemoryStick, Eye, TrendingUp, 
    TrendingDown, ShieldCheck, History, Package, Shield, 
    Box, Tag, BarChart3, Clock, ArrowRight, Layers,
    Maximize2, Info, ChevronRight, CheckCircle2, AlertTriangle, GitCommit
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, BarChart, Bar, LineChart, Line } from 'recharts';
import { TemporalEra, AspectRatio, ImageSize } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { audio } from '../services/audioService';

// --- SUB-COMPONENTS ---

/**
 * GPU Cluster Monitor - Visualizes real-time performance of the local compute lattice
 */
const GPUClusterMonitor: React.FC = () => {
    const [data, setData] = useState(() => Array.from({ length: 8 }, (_, i) => ({
        id: `N_${i.toString().padStart(2, '0')}`,
        load: 20 + Math.random() * 30,
        temp: 40 + Math.random() * 10,
        vram: 15 + Math.random() * 5,
        limit: 80
    })));

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => prev.map(gpu => ({
                ...gpu,
                load: Math.max(5, Math.min(100, gpu.load + (Math.random() * 14 - 7))),
                temp: Math.max(35, Math.min(92, gpu.temp + (Math.random() * 4 - 2))),
                vram: Math.max(10, Math.min(gpu.limit, gpu.vram + (Math.random() * 2 - 1)))
            })));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <Activity size={18} className="text-[#22d3ee] animate-pulse" />
                    <div>
                        <h3 className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">Cluster Telemetry // H100_LATTICE</h3>
                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">Active nodes: 08 // Status: OPTIMIZED</p>
                    </div>
                </div>
                <div className="flex gap-4 text-[9px] font-mono text-gray-500 uppercase">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" /> Logic</span>
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" /> Thermal</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
                {data.map((gpu) => (
                    <div key={gpu.id} className="bg-black/40 border border-[#222] p-3 rounded-xl hover:border-[#333] transition-all flex flex-col items-center">
                        <span className="text-[8px] font-mono text-gray-500 mb-2">{gpu.id}</span>
                        <div className="w-full flex-1 flex flex-col gap-2">
                            {/* Load Bar */}
                            <div className="flex-1 w-full bg-[#111] rounded-sm overflow-hidden relative border border-white/5 h-12">
                                <motion.div 
                                    className="absolute bottom-0 left-0 right-0 bg-[#22d3ee]/30 border-t border-[#22d3ee]" 
                                    animate={{ height: `${gpu.load}%` }}
                                />
                            </div>
                            {/* Temp Bar */}
                            <div className="flex-1 w-full bg-[#111] rounded-sm overflow-hidden relative border border-white/5 h-12">
                                <motion.div 
                                    className={`absolute bottom-0 left-0 right-0 border-t ${gpu.temp > 80 ? 'bg-red-500/40 border-red-500' : 'bg-[#f59e0b]/30 border-[#f59e0b]'}`}
                                    animate={{ height: `${gpu.temp}%` }}
                                />
                            </div>
                        </div>
                        <span className={`text-[8px] font-bold font-mono mt-2 ${gpu.temp > 80 ? 'text-red-500' : 'text-[#42be65]'}`}>{gpu.temp.toFixed(0)}°C</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Historical Price Chart - Renders market trends for components
 */
const HistoricalPriceChart: React.FC<{ basePrice: number }> = ({ basePrice }) => {
    const data = useMemo(() => {
        let lastPrice = basePrice * (0.9 + Math.random() * 0.2);
        return Array.from({ length: 20 }, (_, i) => {
            const volatility = 0.05;
            const change = (Math.random() - 0.45) * (basePrice * volatility);
            lastPrice += change;
            return {
                day: i + 1,
                price: Math.max(basePrice * 0.4, lastPrice)
            };
        });
    }, [basePrice]);

    const isUp = data[data.length - 1].price >= data[0].price;

    return (
        <div className="bg-black/60 border border-white/5 rounded-xl p-5 mt-4 overflow-hidden relative flex flex-col gap-4 group">
            <div className="flex justify-between items-start z-10">
                <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.2em] mb-1">Price Vector (30D)</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black font-mono text-white tracking-tighter">${data[data.length-1].price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <div className={`flex items-center gap-1 text-[9px] font-bold font-mono ${isUp ? 'text-[#42be65]' : 'text-red-500'}`}>
                            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {isUp ? '+' : ''}{((data[data.length-1].price - data[0].price) / data[0].price * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-28 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isUp ? "#42be65" : "#ef4444"} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={isUp ? "#42be65" : "#ef4444"} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={isUp ? "#42be65" : "#ef4444"} 
                            fillOpacity={1} 
                            fill="url(#priceFill)" 
                            strokeWidth={2} 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- MAIN HARDWARE ENGINE ---

const HardwareEngine: React.FC = () => {
    const { hardware, setHardwareState, addLog } = useAppStore();
    const { 
        currentEra, activeVendor, recommendations, componentQuery, 
        searchHistory, filters, schematicImage, analysis, bom, isLoading 
    } = hardware;
    
    const [inspectedComponent, setInspectedComponent] = useState<any>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useVoiceExpose('hardware-engine-v5', { 
        era: currentEra, 
        activeVendor,
        filters,
        bomCount: bom.length 
    });

    // --- SEARCH HISTORY CACHE ---
    useEffect(() => {
        const saved = localStorage.getItem('hw_search_history');
        if (saved) {
            try { setHardwareState({ searchHistory: JSON.parse(saved) }); } catch(e) {}
        }
    }, []);

    const commitSearch = (query?: string) => {
        const q = (query || componentQuery).trim();
        if (!q) return;
        const newHistory = [q, ...searchHistory.filter(h => h !== q)].slice(0, 10);
        setHardwareState({ searchHistory: newHistory, componentQuery: q });
        localStorage.setItem('hw_search_history', JSON.stringify(newHistory));
        setIsHistoryOpen(false);
        audio.playClick();
    };

    // --- BOM EXPORT ---
    const exportBOM = () => {
        if (bom.length === 0) {
            addLog('WARN', 'EXPORTER: Ledger empty. No manifests to extract.');
            return;
        }
        
        // Group identical items for quantity count
        const counts: Record<string, { item: any, qty: number }> = {};
        bom.forEach(b => {
            const key = b.id || b.partNumber;
            if (!counts[key]) counts[key] = { item: b, qty: 0 };
            counts[key].qty += 1;
        });

        const csvHeader = "Part Number,Manufacturer,Description,Quantity,Price Each,Total\n";
        const csvRows = Object.values(counts).map(({ item, qty }) => {
            const desc = (item.specs?.type || item.description || "Hardware Artifact").replace(/,/g, ';');
            const price = item.price || 0;
            const total = price * qty;
            return `"${item.partNumber}","${item.manufacturer}","${desc}",${qty},${price},${total}`;
        }).join('\n');

        const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HARDWARE_MANIFEST_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('SUCCESS', `EXPORTER: Ledger serialized to CSV (${bom.length} items total).`);
        audio.playSuccess();
    };

    // --- FILTER LOGIC ---
    const filteredRecommendations = useMemo(() => {
        return recommendations.filter(item => {
            const matchesSearch = item.partNumber.toLowerCase().includes(componentQuery.toLowerCase());
            const matchesVendor = activeVendor === 'ALL' || item.manufacturer === activeVendor;
            const matchesPrice = (item.price || 0) >= filters.minPrice && (item.price || 0) <= filters.maxPrice;
            const matchesStock = filters.showOutOfStock || item.isInStock;
            return matchesSearch && matchesVendor && matchesPrice && matchesStock;
        });
    }, [recommendations, componentQuery, activeVendor, filters]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const data = await fileToGenerativePart(file);
            setHardwareState({ schematicImage: data, isLoading: true });
            addLog('SYSTEM', `BASIX: Ingesting hardware signature [${file.name}]...`);
            
            try {
                const scan = await analyzeSchematic(data);
                setHardwareState({ analysis: scan, isLoading: false });
                addLog('SUCCESS', 'BASIX_DIAG: Hardware integrity scan finalized.');
                audio.playSuccess();
            } catch (err: any) {
                setHardwareState({ isLoading: false, error: err.message });
                addLog('ERROR', `DIAG_FAIL: ${err.message}`);
                audio.playError();
            }
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] text-white flex flex-col relative border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl font-sans">
            
            {/* Header */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-8 z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-sm relative group">
                        <Cpu className="w-5 h-5 text-black" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#9d4edd] rounded-full shadow-[0_0_8px_#9d4edd]"></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">Sovereign Hardware Core</h1>
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-0.5">Protocol: Zero-Trust // ERA: {currentEra}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {Object.values(TemporalEra).map(era => (
                        <button 
                            key={era}
                            onClick={() => setHardwareState({ currentEra: era })}
                            className={`px-5 py-2 rounded text-[9px] font-black font-mono uppercase tracking-widest border transition-all
                                ${currentEra === era ? 'bg-[#9d4edd] text-black border-[#9d4edd] shadow-[0_0:20px_rgba(157,78,221,0.4)]' : 'bg-black text-gray-500 border-[#222] hover:border-gray-600'}
                            `}
                        >
                            {era}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* SIDEBAR: SUPPLY CHAIN */}
                <div className="w-[450px] border-r border-[#1f1f1f] flex flex-col bg-[#050505] font-mono relative z-20">
                    
                    <div className="p-6 border-b border-[#1f1f1f] space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                                <Globe size={14} className="text-[#9d4edd]" /> Supply Chain Vectors
                            </h2>
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded border transition-all ${showFilters ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] border border-[#222] text-gray-500 hover:text-white'}`}
                            >
                                <Filter size={14} />
                            </button>
                        </div>

                        {/* Search Bar + History Dropdown */}
                        <div className="relative">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={componentQuery}
                                    onChange={(e) => setHardwareState({ componentQuery: e.target.value })}
                                    onFocus={() => setIsHistoryOpen(true)}
                                    onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                                    placeholder="Search part number..." 
                                    className="w-full bg-black border border-[#222] p-3.5 pl-11 text-xs text-white focus:border-[#9d4edd] outline-none rounded-xl transition-all shadow-inner placeholder:text-gray-800"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-[#9d4edd] transition-colors" />
                                <button onClick={() => commitSearch()} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-[#111] hover:bg-[#222] rounded-lg text-gray-500 transition-colors">
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            <AnimatePresence>
                                {isHistoryOpen && searchHistory.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-xl shadow-2xl z-[100] overflow-hidden"
                                    >
                                        <div className="px-4 py-2 bg-[#111] border-b border-[#222] flex justify-between items-center text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5"><History size={10}/> Vector History</span>
                                            <button onClick={() => setHardwareState({ searchHistory: [] })} className="text-red-500 hover:underline">Wipe</button>
                                        </div>
                                        {searchHistory.map((h, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => commitSearch(h)}
                                                className="w-full text-left px-5 py-3 text-[10px] text-gray-400 hover:bg-[#111] hover:text-white transition-colors flex items-center gap-3 border-b border-[#111] last:border-0"
                                            >
                                                <Clock size={10} className="text-gray-700" /> {h}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {isHistoryOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsHistoryOpen(false)} />}
                        </div>

                        {/* Domain Filters */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-5 pt-2 overflow-hidden"
                                >
                                    <div className="space-y-2">
                                        <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest block">Manufacturer Matrix</span>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {['ALL', 'NVIDIA', 'INTEL', 'AMD', 'SUPERMICRO'].map(v => (
                                                <button 
                                                    key={v}
                                                    onClick={() => setHardwareState({ activeVendor: v as any })}
                                                    className={`py-1.5 rounded border text-[8px] font-black tracking-widest transition-all ${activeVendor === v ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-black text-gray-600 border-[#222] hover:border-gray-500'}`}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[9px] text-gray-600 uppercase font-black">
                                                <span>Price Ceiling</span>
                                                <span className="text-white">${(filters.maxPrice / 1000).toFixed(0)}k</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="5000000" step="50000"
                                                value={filters.maxPrice}
                                                onChange={(e) => setHardwareState({ filters: { ...filters, maxPrice: parseInt(e.target.value) } })}
                                                className="w-full h-1 bg-[#111] rounded-lg appearance-none cursor-pointer accent-[#9d4edd]"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <button 
                                                onClick={() => setHardwareState({ filters: { ...filters, showOutOfStock: !filters.showOutOfStock } })}
                                                className={`w-full py-2 rounded border text-[9px] font-black tracking-widest transition-all ${!filters.showOutOfStock ? 'bg-[#42be65]/10 text-[#42be65] border-[#42be65]/30' : 'bg-black text-gray-600 border-[#222]'}`}
                                            >
                                                {filters.showOutOfStock ? 'ALL STATUS' : 'IN-STOCK ONLY'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Recommendations List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredRecommendations.length > 0 ? filteredRecommendations.map((item) => (
                            <div 
                                key={item.id} 
                                className={`group p-4 bg-transparent border rounded-xl transition-all flex items-center justify-between cursor-pointer
                                    ${inspectedComponent?.id === item.id ? 'border-[#9d4edd] bg-[#9d4edd]/5' : 'border-transparent hover:border-white/5 hover:bg-white/[0.02]'}
                                `}
                                onClick={() => { setInspectedComponent(item); audio.playHover(); }}
                            >
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black text-gray-200 group-hover:text-white transition-colors truncate">{item.partNumber}</h4>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[8px] text-gray-600 uppercase tracking-widest font-bold">{item.manufacturer}</span>
                                        <span className="text-[9px] text-[#9d4edd] font-black">${item.price?.toLocaleString() || '0'}</span>
                                        {!item.isInStock && <span className="text-[7px] text-red-500 font-black px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 uppercase tracking-tighter">OOS</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-gray-600 hover:text-[#9d4edd] bg-black border border-[#222] rounded-lg shadow-inner" title="Inspect Component"><Eye size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); setHardwareState({ bom: [...bom, item] }); audio.playClick(); }} className="p-2 text-gray-600 hover:text-white bg-black border border-[#222] rounded-lg shadow-inner" title="Add to BOM"><Plus size={14}/></button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center opacity-20 text-center px-10">
                                <Package size={32} className="mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero results in target vector.</p>
                            </div>
                        )}
                    </div>

                    {/* BOM Summary Footer */}
                    <div className="p-5 bg-[#0a0a0a] border-t border-[#1f1f1f]">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest block">Bill of Materials ({bom.length})</span>
                                <span className="text-xl font-black text-white font-mono tracking-tighter">$ {bom.reduce((acc, cur) => acc + (cur.price || 0), 0).toLocaleString()}</span>
                            </div>
                            <button 
                                onClick={exportBOM}
                                disabled={bom.length === 0}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#111] hover:bg-[#9d4edd] border border-[#222] hover:border-[#9d4edd] text-gray-500 hover:text-black rounded-xl text-[9px] font-black font-mono uppercase tracking-widest transition-all disabled:opacity-20 shadow-lg"
                            >
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT: DASHBOARD OR SCAN */}
                <div className="flex-1 bg-black relative flex flex-col p-8 overflow-hidden">
                    {!schematicImage ? (
                        <div className="h-full flex flex-col gap-8">
                            <GPUClusterMonitor />
                            
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#1f1f1f] rounded-3xl group hover:border-[#9d4edd]/40 transition-all">
                                <label className="flex flex-col items-center gap-6 cursor-pointer text-center p-20 group/upload">
                                    <div className="w-24 h-24 rounded-full bg-[#0a0a0a] border border-[#222] flex items-center justify-center group-hover/upload:scale-110 group-hover/upload:border-[#9d4edd]/50 transition-all shadow-2xl relative">
                                        <div className="absolute inset-0 bg-[#9d4edd]/5 rounded-full animate-ping opacity-20"></div>
                                        <Upload size={32} className="text-gray-700 group-hover/upload:text-[#9d4edd]" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-white font-mono uppercase tracking-[0.3em] mb-2">Ingest Node Schema</h2>
                                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Upload physical topology for spectral analysis</p>
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
                                    <span className="text-[10px] font-black font-mono tracking-[0.5em] uppercase animate-pulse">De-scrambling signal...</span>
                                </div>
                            ) : (
                                <div className="w-full h-full relative flex flex-col gap-6">
                                    <div className="flex justify-between items-center z-20">
                                        <div className="flex bg-[#0a0a0a] p-1.5 rounded-xl border border-[#1f1f1f] shadow-2xl">
                                            <button className="px-5 py-2 bg-[#9d4edd] text-black rounded-lg text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg"><Layers size={14} /> 2D Schematic</button>
                                            <button className="px-5 py-2 text-gray-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all"><Box size={14} /> 3D Topology</button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl text-[10px] font-mono text-[#10b981] font-black shadow-lg">
                                                <ShieldCheck size={14} /> DIAGNOSTIC_OK
                                            </div>
                                            <button onClick={() => setHardwareState({ schematicImage: null })} className="p-2.5 text-gray-600 hover:text-red-500 transition-all bg-[#0a0a0a] border border-[#222] rounded-xl shadow-lg"><X size={18}/></button>
                                        </div>
                                    </div>

                                    <div className="flex-1 relative rounded-[2rem] overflow-hidden border border-[#1f1f1f] bg-[#050505] shadow-2xl flex items-center justify-center group/view">
                                        <img 
                                            src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`}
                                            className="w-full h-full object-contain opacity-80 mix-blend-screen group-hover/view:scale-105 transition-transform duration-[5s]"
                                            alt="Schematic" 
                                        />
                                        <motion.div 
                                            className="absolute top-0 left-0 right-0 h-px bg-[#9d4edd] z-30" 
                                            animate={{ top: ['0%', '100%', '0%'] }}
                                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                                        />
                                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT: COMPONENT INSPECTOR */}
                <AnimatePresence>
                    {inspectedComponent && (
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-[450px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col p-8 font-mono z-30 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar relative"
                        >
                            <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <Scan size={18} className="text-[#9d4edd] animate-pulse" />
                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Hardware Analysis</h3>
                                </div>
                                <button onClick={() => setInspectedComponent(null)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
                            </div>

                            <div className="space-y-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-[#9d4edd] uppercase bg-[#9d4edd]/10 px-2 py-1 rounded w-fit border border-[#9d4edd]/20">
                                        <Tag size={12} /> {inspectedComponent.manufacturer}
                                    </div>
                                    <h4 className="text-2xl font-black text-white tracking-tighter leading-none">{inspectedComponent.partNumber}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium mt-4">
                                        {inspectedComponent.description || "High-performance compute artifact optimized for sovereign infrastructure deployments."}
                                    </p>
                                </div>

                                <HistoricalPriceChart basePrice={inspectedComponent.price || 1000} />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#0a0a0a] border border-[#222] p-4 rounded-2xl group/stat hover:border-[#9d4edd]/30 transition-all">
                                        <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1 group-hover/stat:text-[#9d4edd]">Current Quote</div>
                                        <div className="text-xl font-black text-white">${(inspectedComponent.price || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-[#222] p-4 rounded-2xl group/stat hover:border-[#42be65]/30 transition-all">
                                        <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1 group-hover/stat:text-[#42be65]">Inventory</div>
                                        <div className={`text-xl font-black ${inspectedComponent.isInStock ? 'text-[#42be65]' : 'text-red-500'}`}>
                                            {inspectedComponent.isInStock ? 'AVAILABLE' : 'OOS'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 pt-8 border-t border-[#1f1f1f]">
                                    <h5 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Technical Matrix</h5>
                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.entries(inspectedComponent.specs || {}).map(([key, val]) => (
                                            <div key={key} className="flex justify-between items-center p-4 bg-black border border-[#1f1f1f] rounded-xl group/spec hover:border-[#22d3ee]/50 transition-all">
                                                <span className="text-[11px] text-gray-500 uppercase font-bold group-hover/spec:text-gray-300 transition-colors tracking-tighter">{key.replace('_', ' ')}</span>
                                                <span className="text-[12px] text-white font-black tracking-tight">{String(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-[#1f1f1f] flex flex-col gap-3 pb-12">
                                    <button 
                                        onClick={() => { setHardwareState({ bom: [...bom, inspectedComponent] }); setInspectedComponent(null); audio.playSuccess(); }} 
                                        className="w-full py-5 bg-[#9d4edd] text-black font-black text-[12px] uppercase tracking-[0.2em] rounded-[1.25rem] hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(157,78,221,0.3)]"
                                    >
                                        <Plus size={18}/> Commit to Manifest
                                    </button>
                                    <button className="w-full py-5 bg-[#0a0a0a] border border-[#222] text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-[1.25rem] hover:border-white hover:text-white transition-all flex items-center justify-center gap-3">
                                        <FileText size={16} /> Fetch Documentation
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Diagnostic Bar */}
            <div className="mt-4 border-t border-[#1f1f1f] pt-4 flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest relative z-10 shrink-0 px-8 pb-4">
                <div className="flex gap-6">
                    <span className="flex items-center gap-2 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse"></div> Secure Hardware Sandbox Active</span>
                    <span className="flex items-center gap-2 uppercase tracking-widest text-[#22d3ee]"><Activity size={10} /> Latency: 4ms</span>
                </div>
                <div className="uppercase tracking-[0.4em] font-black text-gray-800">Zero-Trust // Kern_v4.2.1-HW</div>
            </div>
        </div>
    );
};

export default HardwareEngine;