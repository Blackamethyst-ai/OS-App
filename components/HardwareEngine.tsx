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
    Maximize2, Info, ChevronRight, CheckCircle2, AlertTriangle, GitCommit,
    RotateCcw, SlidersHorizontal, Check, BoxSelect, Monitor, ChevronDown
} from 'lucide-react';
import { TemporalEra, FileData, AppMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { audio } from '../services/audioService';

// --- SUB-COMPONENTS ---

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
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl relative overflow-hidden group shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <Activity size={18} className="text-[#22d3ee] animate-pulse" />
                    <div>
                        <h3 className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">Cluster Telemetry // H100_LATTICE</h3>
                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">Active nodes: 08 // Status: OPTIMIZED</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-gray-600 uppercase font-mono">Total VRAM</span>
                        <span className="text-[10px] text-white font-black font-mono">640GB / 1.2TB</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
                {data.map((gpu) => (
                    <div key={gpu.id} className="bg-black/40 border border-[#222] p-3 rounded-xl hover:border-[#333] transition-all flex flex-col items-center">
                        <span className="text-[8px] font-mono text-gray-500 mb-2">{gpu.id}</span>
                        <div className="w-full flex-1 flex flex-col gap-2">
                            <div className="flex-1 w-full bg-[#111] rounded-sm overflow-hidden relative border border-white/5 h-12" title="Compute Load">
                                <motion.div className="absolute bottom-0 left-0 right-0 bg-[#22d3ee]/30 border-t border-[#22d3ee]" animate={{ height: `${gpu.load}%` }} />
                            </div>
                            <div className="flex-1 w-full bg-[#111] rounded-sm overflow-hidden relative border border-white/5 h-12" title="VRAM Allocation">
                                <motion.div className="absolute bottom-0 left-0 right-0 bg-[#9d4edd]/30 border-t border-[#9d4edd]" animate={{ height: `${(gpu.vram / gpu.limit) * 100}%` }} />
                            </div>
                        </div>
                        <span className={`text-[8px] font-bold font-mono mt-2 ${gpu.temp > 80 ? 'text-red-500' : 'text-[#42be65]'}`}>{gpu.temp.toFixed(0)}°C</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN HARDWARE ENGINE ---

const HardwareEngine: React.FC = () => {
    const { hardware, setHardwareState, addLog } = useAppStore();
    const { 
        currentEra, activeVendor, recommendations, componentQuery, 
        filters, schematicImage, analysis, bom, isLoading, xrayImage, searchHistory 
    } = hardware;
    
    const [inspectedComponent, setInspectedComponent] = useState<any>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [xrayIntensity, setXrayIntensity] = useState(50); 
    const [hoveredOverlay, setHoveredOverlay] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
    const [isometricImage, setIsometricImage] = useState<string | null>(null);
    const [isGenerating3D, setIsGenerating3D] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSearchingComponents, setIsSearchingComponents] = useState(false);

    useVoiceExpose('hardware-engine-v6', { era: currentEra, activeVendor, bomCount: bom.length });

    // History persistence
    useEffect(() => {
        const saved = localStorage.getItem('hw_search_history');
        if (saved) {
            try {
                setHardwareState({ searchHistory: JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to parse search history", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('hw_search_history', JSON.stringify(searchHistory));
    }, [searchHistory]);

    const addToHistory = (q: string) => {
        const trimmed = q?.trim();
        if (!trimmed) return;
        setHardwareState((prev) => {
            const history = prev.searchHistory || [];
            const nextHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 5);
            return { searchHistory: nextHistory };
        });
    };

    const handleSearchComponents = async () => {
        if (!componentQuery.trim()) return;
        setIsSearchingComponents(true);
        addLog('SYSTEM', `HARDWARE_SEARCH: Initializing component research for "${componentQuery}"...`);
        audio.playClick();
        
        try {
            if (!(await (window as any).aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const results = await researchComponents(componentQuery);
            setHardwareState({ recommendations: results });
            addLog('SUCCESS', `HARDWARE_SEARCH: Retrieved ${results.length} relevant component nodes.`);
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `SEARCH_FAIL: ${err.message}`);
            audio.playError();
        } finally {
            setIsSearchingComponents(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addToHistory(componentQuery);
            setIsHistoryOpen(false);
            handleSearchComponents();
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const data = await fileToGenerativePart(file);
            setHardwareState({ schematicImage: data, isLoading: true, analysis: null, xrayImage: null });
            setIsometricImage(null);
            addLog('SYSTEM', `INGEST: Extracting hardware signature from [${file.name}]...`);
            
            try {
                const [scan, xray, iso] = await Promise.all([
                    analyzeSchematic(data),
                    generateXRayVariant(data),
                    generateIsometricSchematic(data)
                ]);
                setHardwareState({ analysis: scan, xrayImage: xray, isLoading: false });
                setIsometricImage(iso);
                addLog('SUCCESS', 'DIAGNOSTIC: Multi-layer holographic scan finalized.');
                audio.playSuccess();
            } catch (err: any) {
                setHardwareState({ isLoading: false, error: err.message });
                addLog('ERROR', `SCAN_FAIL: ${err.message}`);
                audio.playError();
            }
        }
    };

    const handleRegenerate3D = async () => {
        if (!schematicImage || isGenerating3D) return;
        setIsGenerating3D(true);
        addLog('SYSTEM', '3D_GEN: Refreshing isometric cinematic render...');
        audio.playClick();
        try {
            if (!(await (window as any).aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsGenerating3D(false); return; }
            const iso = await generateIsometricSchematic(schematicImage);
            setIsometricImage(iso);
            addLog('SUCCESS', '3D_GEN: New isometric viewpoint synthesized.');
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `3D_GEN_FAIL: ${err.message}`);
            audio.playError();
        } finally {
            setIsGenerating3D(false);
        }
    };

    const filteredRecommendations = useMemo(() => {
        return recommendations.filter(item => {
            const matchesSearch = item.partNumber?.toLowerCase().includes((componentQuery || '').toLowerCase());
            const matchesVendor = activeVendor === 'ALL' || item.manufacturer?.toUpperCase() === activeVendor;
            const matchesPrice = (item.price || 0) >= (filters.minPrice || 0) && (item.price || 0) <= (filters.maxPrice || Infinity);
            const matchesStock = !filters.showOutOfStock || item.stock > 0;
            return matchesSearch && matchesVendor && matchesPrice && matchesStock;
        });
    }, [recommendations, componentQuery, activeVendor, filters]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (viewMode === '3D') {
            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const x = (e.clientX - centerX) / (rect.width / 2);
            const y = (e.clientY - centerY) / (rect.height / 2);
            setRotation({ x: -y * 10, y: x * 15 });
        }
    };

    const resetFilters = () => {
        setHardwareState({
            activeVendor: 'ALL',
            filters: { minPrice: 0, maxPrice: 5000000, shape: true, showOutOfStock: false }
        });
        audio.playClick();
    };

    return (
        <div className="h-full w-full bg-[#030303] text-white flex flex-col relative border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl font-sans">
            
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-8 z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-sm">
                        <Cpu className="w-5 h-5 text-black" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">Sovereign Hardware Core</h1>
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-0.5">Protocol: Zero-Trust // {currentEra}</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex gap-2">
                        {Object.values(TemporalEra).map(era => (
                            <button key={era} onClick={() => setHardwareState({ currentEra: era })} className={`px-5 py-2 rounded text-[9px] font-black font-mono uppercase tracking-widest border transition-all ${currentEra === era ? 'bg-[#9d4edd] text-black border-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.4)]' : 'bg-black text-gray-500 border-[#222] hover:border-gray-600'}`}>{era}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Supply Chain Sidebar */}
                <div className="w-[400px] border-r border-[#1f1f1f] flex flex-col bg-[#050505] font-mono relative z-20 shrink-0">
                    <div className="p-6 border-b border-[#1f1f1f] space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2"><Globe size={14} className="text-[#9d4edd]" /> Inventory Matrices</h2>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowFilters(!showFilters)} 
                                    className={`p-2 rounded border transition-all ${showFilters ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] border border-[#222] text-gray-500 hover:text-white'}`}
                                >
                                    <Filter size={14} />
                                </button>
                                {showFilters && (
                                    <button 
                                        onClick={resetFilters} 
                                        className="p-2 bg-[#111] border border-[#222] text-gray-500 hover:text-white rounded"
                                        title="Reset Filters"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="relative group" onBlur={() => setTimeout(() => setIsHistoryOpen(false), 200)}>
                            <input 
                                type="text" 
                                value={componentQuery || ''} 
                                onFocus={() => setIsHistoryOpen(true)}
                                onKeyDown={handleSearchKeyDown}
                                onChange={e => setHardwareState({ componentQuery: e.target.value })} 
                                placeholder="Search component matrix..." 
                                className="w-full bg-black border border-[#222] p-3 pl-10 pr-10 text-xs text-white focus:border-[#9d4edd] outline-none rounded-xl" 
                            />
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-700" />
                            <div className="absolute right-3 top-3">
                                {isSearchingComponents && <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" />}
                            </div>
                            
                            <AnimatePresence>
                                {isHistoryOpen && searchHistory && searchHistory.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-[#222] rounded-xl overflow-hidden z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                                    >
                                        <div className="p-2 border-b border-[#1f1f1f] flex justify-between items-center bg-white/[0.02]">
                                            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest px-2">Recent Queries</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setHardwareState({ searchHistory: [] }); }}
                                                className="text-[8px] font-mono text-red-500 hover:text-red-400 px-2 uppercase font-black"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                            {searchHistory.map((h, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => { setHardwareState({ componentQuery: h }); setIsHistoryOpen(false); audio.playClick(); handleSearchComponents(); }}
                                                    className="w-full text-left px-4 py-2.5 text-[10px] font-mono text-gray-400 hover:bg-[#111] hover:text-[#9d4edd] transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                                                >
                                                    <History size={12} className="text-gray-600" />
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-b border-white/5 pb-4 space-y-4"
                                >
                                    {/* Vendor Filter Dropdown */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Vendor Node</label>
                                        <div className="relative group">
                                            <select 
                                                value={activeVendor}
                                                onChange={e => { setHardwareState({ activeVendor: e.target.value as any }); audio.playClick(); }}
                                                className="w-full bg-[#050505] border border-[#333] rounded-lg px-4 py-2.5 text-[10px] font-black font-mono text-[#9d4edd] uppercase appearance-none outline-none focus:border-[#9d4edd] transition-all cursor-pointer"
                                            >
                                                <option value="ALL">ALL VENDORS</option>
                                                <option value="NVIDIA">NVIDIA_CORE</option>
                                                <option value="INTEL">INTEL_NODE</option>
                                                <option value="AMD">AMD_LATTICE</option>
                                                <option value="SUPERMICRO">SUPERMICRO_INFRA</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-[#9d4edd] transition-colors">
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price Filter */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Price Vector ($)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number"
                                                value={filters.minPrice}
                                                onChange={e => setHardwareState({ filters: { ...filters, minPrice: parseInt(e.target.value) || 0 } })}
                                                placeholder="Min"
                                                className="w-1/2 bg-[#111] border border-[#222] p-2 text-[10px] text-white rounded focus:border-[#9d4edd] outline-none"
                                            />
                                            <input 
                                                type="number"
                                                value={filters.maxPrice}
                                                onChange={e => setHardwareState({ filters: { ...filters, maxPrice: parseInt(e.target.value) || 0 } })}
                                                placeholder="Max"
                                                className="w-1/2 bg-[#111] border border-[#222] p-2 text-[10px] text-white rounded focus:border-[#9d4edd] outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Stock Toggle */}
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">In-Stock Only</label>
                                        <button 
                                            onClick={() => setHardwareState({ filters: { ...filters, showOutOfStock: !filters.showOutOfStock } })}
                                            className={`w-8 h-4 rounded-full relative transition-colors ${filters.showOutOfStock ? 'bg-[#9d4edd]' : 'bg-[#222]'}`}
                                        >
                                            <motion.div 
                                                animate={{ x: filters.showOutOfStock ? 16 : 2 }}
                                                className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5"
                                            />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredRecommendations.map((item, idx) => (
                            <div key={item.id || idx} className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${inspectedComponent?.id === item.id ? 'border-[#9d4edd] bg-[#9d4edd]/5' : 'border-transparent hover:bg-white/[0.02]'}`} onClick={() => setInspectedComponent(item)}>
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-[11px] font-black text-gray-200 uppercase truncate">{item.partNumber || item.name}</h4>
                                        {(item.stock > 0 || item.availability === 'In Stock') ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" title="In Stock" />
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Out of Stock" />
                                        )}
                                    </div>
                                    <span className="text-[8px] text-gray-600 uppercase font-bold">{item.manufacturer} • ${item.price?.toLocaleString()}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setHardwareState({ bom: [...bom, item] }); audio.playSuccess(); }} className="p-2 bg-[#9d4edd]/10 text-[#9d4edd] rounded-lg hover:bg-[#9d4edd] hover:text-black transition-all"><Plus size={14}/></button>
                            </div>
                        ))}
                        {filteredRecommendations.length === 0 && (
                            <div className="p-12 text-center opacity-30 flex flex-col items-center gap-4">
                                <Package size={32} />
                                <span className="text-[10px] font-mono uppercase">
                                    {recommendations.length > 0 ? "No components match current filters" : "Initiate search to research components"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Visualization Stage */}
                <div className="flex-1 bg-black relative flex flex-col p-8 overflow-hidden" onMouseMove={handleMouseMove}>
                    {!schematicImage ? (
                        <div className="h-full flex flex-col gap-8 overflow-y-auto no-scrollbar">
                            <GPUClusterMonitor />
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#1f1f1f] rounded-3xl group hover:border-[#9d4edd]/40 transition-all min-h-[300px]">
                                <label className="flex flex-col items-center gap-6 cursor-pointer text-center p-20">
                                    <div className="w-24 h-24 rounded-full bg-[#0a0a0a] border border-[#222] flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl">
                                        <Upload size={32} className="text-gray-700 group-hover:text-[#9d4edd]" />
                                    </div>
                                    <div><h2 className="text-sm font-black text-white font-mono uppercase tracking-[0.3em] mb-2">Ingest Topology</h2><p className="text-[10px] text-gray-600 font-mono">Upload 2D schematic for deep analysis</p></div>
                                    <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full relative flex flex-col">
                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-[#9d4edd]">
                                    <Loader2 className="w-12 h-12 animate-spin mb-6" />
                                    <span className="text-[10px] font-black font-mono tracking-[0.5em] uppercase text-center">De-scrambling Signal Path...<br/><span className="text-[8px] opacity-40">Synthesizing multi-layer holographic data</span></span>
                                </div>
                            ) : (
                                <div className="w-full h-full relative flex flex-col gap-6">
                                    {/* View Control HUD */}
                                    <div className="flex justify-between items-center z-20">
                                        <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-[#1f1f1f] shadow-2xl backdrop-blur-xl">
                                            <button 
                                                onClick={() => { setViewMode('2D'); audio.playClick(); }} 
                                                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === '2D' ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <Layers size={14} /> 2D Internal
                                            </button>
                                            <button 
                                                onClick={() => { setViewMode('3D'); audio.playClick(); }} 
                                                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === '3D' ? 'bg-[#22d3ee] text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <BoxSelect size={14} /> 3D Isometric
                                            </button>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {viewMode === '2D' ? (
                                                <motion.div 
                                                    key="xray-hud"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="flex items-center gap-4 bg-[#0a0a0a] px-5 py-2.5 rounded-xl border border-[#222] shadow-xl backdrop-blur-xl"
                                                >
                                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Scan size={14} className="text-[#9d4edd]"/> X-Ray Depth
                                                    </span>
                                                    <input 
                                                        type="range" 
                                                        min="0" max="100" 
                                                        value={xrayIntensity} 
                                                        onChange={e => setXrayIntensity(parseInt(e.target.value))} 
                                                        className="w-40 h-1 bg-[#222] rounded-full appearance-none accent-[#9d4edd] cursor-pointer" 
                                                    />
                                                </motion.div>
                                            ) : (
                                                <motion.div 
                                                    key="3d-hud"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="flex items-center gap-3"
                                                >
                                                    <button 
                                                        onClick={handleRegenerate3D}
                                                        disabled={isGenerating3D}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#333] hover:border-[#22d3ee] text-[#22d3ee] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        {isGenerating3D ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                                        Rescan Lattice
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <button onClick={() => setHardwareState({ schematicImage: null })} className="p-2.5 text-gray-600 hover:text-red-500 bg-[#0a0a0a] border border-[#222] rounded-xl transition-colors shadow-xl backdrop-blur-xl"><X size={18}/></button>
                                    </div>

                                    {/* Main Viewport */}
                                    <div className="flex-1 relative rounded-[2.5rem] overflow-hidden border border-[#1f1f1f] bg-[#050505] shadow-2xl flex items-center justify-center">
                                        {/* Cinematic Background Grid */}
                                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                                        
                                        <AnimatePresence mode="wait">
                                            {viewMode === '2D' ? (
                                                <motion.div 
                                                    key="2d-view"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 1.05 }}
                                                    className="relative w-full h-full flex items-center justify-center p-6"
                                                >
                                                    {/* X-Ray Under-layer */}
                                                    {xrayImage && (
                                                        <img src={xrayImage} className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-100" style={{ transform: 'scale(0.9)' }} />
                                                    )}
                                                    {/* Standard Layer with Clipping */}
                                                    <img 
                                                        src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`}
                                                        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 z-10"
                                                        style={{ clipPath: `inset(0 ${xrayIntensity}% 0 0)`, transform: 'scale(0.9)' }}
                                                    />
                                                    
                                                    {/* Hit Areas / Metadata Overlays */}
                                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 1000 1000" style={{ transform: 'scale(0.9)' }}>
                                                        {analysis?.components?.map((comp: any, i: number) => {
                                                            const [ymin, xmin, ymax, xmax] = comp.boundingBox;
                                                            return (
                                                                <rect 
                                                                    key={i} 
                                                                    x={xmin} y={ymin} width={xmax-xmin} height={ymax-ymin} 
                                                                    className="pointer-events-auto cursor-crosshair fill-transparent stroke-[#9d4edd]/20 hover:stroke-[#9d4edd] hover:fill-[#9d4edd]/5 transition-all stroke-[2]"
                                                                    onMouseEnter={() => setHoveredOverlay(comp)}
                                                                    onMouseLeave={() => setHoveredOverlay(null)}
                                                                />
                                                            );
                                                        })}
                                                    </svg>

                                                    <AnimatePresence>
                                                        {hoveredOverlay && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: 10 }} 
                                                                animate={{ opacity: 1, y: 0 }} 
                                                                className="absolute bg-[#0a0a0a]/95 backdrop-blur border border-[#9d4edd] p-5 rounded-2xl shadow-[0_0_50px_rgba(157,78,221,0.4)] z-50 pointer-events-none w-64"
                                                                style={{ left: hoveredOverlay.boundingBox[1] / 10 + '%', top: hoveredOverlay.boundingBox[0] / 10 + '%' }}
                                                            >
                                                                <div className="text-[12px] font-black text-[#9d4edd] uppercase font-mono tracking-widest mb-1">{hoveredOverlay.name}</div>
                                                                <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-3">
                                                                    <div className="text-[9px] text-gray-500 uppercase font-bold">{hoveredOverlay.type}</div>
                                                                    <div className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${hoveredOverlay.health > 80 ? 'text-[#10b981] border-[#10b981]/30' : 'text-[#f59e0b] border-[#f59e0b]/30'}`}>H_INDEX: {hoveredOverlay.health}%</div>
                                                                </div>
                                                                <div className="text-[11px] text-gray-300 font-mono italic leading-relaxed">"{hoveredOverlay.optimization}"</div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ) : (
                                                <motion.div 
                                                    key="3d-view"
                                                    initial={{ opacity: 0, scale: 1.1 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="relative w-full h-full flex flex-col items-center justify-center p-20 perspective-1000"
                                                >
                                                    <motion.div 
                                                        className="relative flex items-center justify-center preserve-3d"
                                                        animate={{ rotateY: rotation.y, rotateX: rotation.x }}
                                                        transition={{ type: 'spring', damping: 25, stiffness: 60 }}
                                                    >
                                                        {isometricImage ? (
                                                            <div className="relative group/iso">
                                                                {/* Holographic Projection Base */}
                                                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-[#22d3ee]/20 blur-2xl rounded-full animate-pulse" />
                                                                
                                                                {/* Main Cinematic Render */}
                                                                <img 
                                                                    src={isometricImage} 
                                                                    className="max-w-[80vw] max-h-[60vh] drop-shadow-[0_50px_100px_rgba(34,211,238,0.3)] border border-white/5 rounded-3xl" 
                                                                />
                                                                
                                                                {/* Scanline Overlay */}
                                                                <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 group-hover/iso:opacity-40 transition-opacity rounded-3xl" />
                                                                
                                                                <AnimatePresence>
                                                                    {isGenerating3D && (
                                                                        <motion.div 
                                                                            initial={{ opacity: 0 }} 
                                                                            animate={{ opacity: 1 }} 
                                                                            exit={{ opacity: 0 }}
                                                                            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl"
                                                                        >
                                                                            <Loader2 size={40} className="text-[#22d3ee] animate-spin mb-4" />
                                                                            <span className="text-[10px] font-black font-mono text-[#22d3ee] uppercase tracking-[0.4em]">Calibrating Optics...</span>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-500 font-mono text-[11px] animate-pulse uppercase flex flex-col items-center gap-6">
                                                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#22d3ee]/40 flex items-center justify-center">
                                                                    <Monitor size={32} className="text-[#22d3ee]/40" />
                                                                </div>
                                                                Crystallizing 3D Matrix Vector...
                                                            </div>
                                                        )}
                                                    </motion.div>

                                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                                        <RotateCcw size={14} className="animate-spin-slow text-[#22d3ee]" />
                                                        Dynamic Perspective Engine Active
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HardwareEngine;