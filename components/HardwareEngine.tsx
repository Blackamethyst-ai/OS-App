
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
    // Fix: Added missing RotateCcw icon import
    RotateCcw
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, BarChart, Bar, LineChart, Line } from 'recharts';
import { TemporalEra, AspectRatio, ImageSize, FileData } from '../types';
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
    const { currentEra, activeVendor, recommendations, componentQuery, filters, schematicImage, analysis, bom, isLoading, xrayImage } = hardware;
    
    const [inspectedComponent, setInspectedComponent] = useState<any>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [xrayIntensity, setXrayIntensity] = useState(50); 
    const [hoveredOverlay, setHoveredOverlay] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
    const [isometricImage, setIsometricImage] = useState<string | null>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    useVoiceExpose('hardware-engine-v6', { era: currentEra, activeVendor, bomCount: bom.length });

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

    const filteredRecommendations = useMemo(() => {
        return recommendations.filter(item => {
            const matchesSearch = item.partNumber.toLowerCase().includes((componentQuery || '').toLowerCase());
            const matchesVendor = activeVendor === 'ALL' || item.manufacturer.toUpperCase() === activeVendor;
            const matchesPrice = (item.price || 0) <= (filters.maxPrice || Infinity);
            return matchesSearch && matchesVendor && matchesPrice;
        });
    }, [recommendations, componentQuery, activeVendor, filters]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (viewMode === '3D') {
            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const x = (e.clientX - centerX) / (rect.width / 2);
            const y = (e.clientY - centerY) / (rect.height / 2);
            setRotation({ x: -y * 15, y: x * 25 });
        }
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
                    <div className="flex items-center gap-2 bg-black border border-[#222] px-3 py-1.5 rounded-lg">
                        <Filter size={12} className="text-[#9d4edd]" />
                        <select 
                            value={activeVendor}
                            onChange={(e) => setHardwareState({ activeVendor: e.target.value as any })}
                            className="bg-transparent text-[10px] font-mono text-gray-400 outline-none uppercase cursor-pointer"
                        >
                            <option value="ALL">ALL VENDORS</option>
                            <option value="NVIDIA">NVIDIA</option>
                            <option value="SUPERMICRO">SUPERMICRO</option>
                            <option value="INTEL">INTEL</option>
                            <option value="AMD">AMD</option>
                        </select>
                    </div>
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
                            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded border ${showFilters ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] border border-[#222] text-gray-500 hover:text-white'}`}><Filter size={14} /></button>
                        </div>
                        <div className="relative group">
                            <input type="text" value={componentQuery || ''} onChange={e => setHardwareState({ componentQuery: e.target.value })} placeholder="Search component matrix..." className="w-full bg-black border border-[#222] p-3 pl-10 text-xs text-white focus:border-[#9d4edd] outline-none rounded-xl" />
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-700" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredRecommendations.map((item) => (
                            <div key={item.id} className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${inspectedComponent?.id === item.id ? 'border-[#9d4edd] bg-[#9d4edd]/5' : 'border-transparent hover:bg-white/[0.02]'}`} onClick={() => setInspectedComponent(item)}>
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="text-[11px] font-black text-gray-200 uppercase truncate">{item.partNumber}</h4>
                                    <span className="text-[8px] text-gray-600 uppercase font-bold">{item.manufacturer} • ${item.price?.toLocaleString()}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setHardwareState({ bom: [...bom, item] }); }} className="p-2 bg-[#9d4edd]/10 text-[#9d4edd] rounded-lg hover:bg-[#9d4edd] hover:text-black transition-all"><Plus size={14}/></button>
                            </div>
                        ))}
                        {filteredRecommendations.length === 0 && (
                            <div className="p-12 text-center opacity-30 flex flex-col items-center gap-4">
                                <Package size={32} />
                                <span className="text-[10px] font-mono uppercase">No components matched in current sector</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Visualization Stage */}
                <div className="flex-1 bg-black relative flex flex-col p-8 overflow-hidden">
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
                                <div className="w-full h-full relative flex flex-col gap-6" onMouseMove={handleMouseMove}>
                                    <div className="flex justify-between items-center z-20">
                                        <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-[#1f1f1f] shadow-2xl">
                                            <button onClick={() => setViewMode('2D')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === '2D' ? 'bg-[#9d4edd] text-black' : 'text-gray-500'}`}>2D Internal</button>
                                            <button onClick={() => setViewMode('3D')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === '3D' ? 'bg-[#9d4edd] text-black' : 'text-gray-500'}`}>3D Isometric</button>
                                        </div>
                                        {viewMode === '2D' && (
                                            <div className="flex items-center gap-4 bg-[#0a0a0a] px-4 py-2 rounded-xl border border-[#222] shadow-xl">
                                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2"><Scan size={12}/> X-Ray Depth</span>
                                                <input type="range" min="0" max="100" value={xrayIntensity} onChange={e => setXrayIntensity(parseInt(e.target.value))} className="w-32 h-1 bg-[#222] rounded-full appearance-none accent-[#9d4edd] cursor-pointer" />
                                            </div>
                                        )}
                                        <button onClick={() => setHardwareState({ schematicImage: null })} className="p-2.5 text-gray-600 hover:text-red-500 bg-[#0a0a0a] border border-[#222] rounded-xl transition-colors"><X size={18}/></button>
                                    </div>

                                    <div className="flex-1 relative rounded-[2rem] overflow-hidden border border-[#1f1f1f] bg-[#050505] shadow-2xl flex items-center justify-center">
                                        {viewMode === '2D' ? (
                                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                                {/* X-Ray Image (Background) */}
                                                {xrayImage && (
                                                    <img src={xrayImage} className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-100" style={{ transform: 'scale(0.95)' }} />
                                                )}
                                                {/* Standard Image (Foreground with Clip) */}
                                                <img 
                                                    src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`}
                                                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
                                                    style={{ clipPath: `inset(0 ${xrayIntensity}% 0 0)`, transform: 'scale(0.95)' }}
                                                />
                                                
                                                {/* Component Overlays */}
                                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1000" style={{ transform: 'scale(0.95)' }}>
                                                    {analysis?.components?.map((comp: any, i: number) => {
                                                        const [ymin, xmin, ymax, xmax] = comp.boundingBox;
                                                        return (
                                                            <rect 
                                                                key={i} 
                                                                x={xmin} y={ymin} width={xmax-xmin} height={ymax-ymin} 
                                                                className="pointer-events-auto cursor-crosshair fill-transparent stroke-[#9d4edd]/30 hover:stroke-[#9d4edd] hover:fill-[#9d4edd]/10 transition-all stroke-[2]"
                                                                onMouseEnter={() => setHoveredOverlay(comp)}
                                                                onMouseLeave={() => setHoveredOverlay(null)}
                                                            />
                                                        );
                                                    })}
                                                </svg>

                                                {/* Component Tooltip */}
                                                <AnimatePresence>
                                                    {hoveredOverlay && (
                                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute bg-[#0a0a0a]/90 backdrop-blur border border-[#9d4edd] p-4 rounded-xl shadow-[0_0_40px_rgba(157,78,221,0.5)] z-40 pointer-events-none" style={{ left: hoveredOverlay.boundingBox[1] + 20, top: hoveredOverlay.boundingBox[0] }}>
                                                            <div className="text-[11px] font-black text-[#9d4edd] uppercase font-mono tracking-widest">{hoveredOverlay.name}</div>
                                                            <div className="flex items-center gap-3 mt-1.5 border-b border-[#333] pb-2 mb-2">
                                                                <div className="text-[8px] text-gray-500 uppercase font-bold">{hoveredOverlay.type}</div>
                                                                <div className={`text-[9px] font-black font-mono ${hoveredOverlay.health > 80 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>H_INDEX: {hoveredOverlay.health}%</div>
                                                            </div>
                                                            <div className="text-[10px] text-gray-300 font-mono italic border-l-2 border-[#9d4edd]/40 pl-3 leading-relaxed">"{hoveredOverlay.optimization}"</div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            <div className="relative w-full h-full flex items-center justify-center p-20 perspective-1000">
                                                <motion.div 
                                                    className="relative flex items-center justify-center"
                                                    animate={{ rotateY: rotation.y, rotateX: rotation.x }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 60 }}
                                                    style={{ transformStyle: 'preserve-3d' }}
                                                >
                                                    {isometricImage ? (
                                                        <div className="relative group">
                                                            <img src={isometricImage} className="max-w-full max-h-full drop-shadow-[0_40px_100px_rgba(157,78,221,0.4)] transition-transform duration-500" />
                                                            <div className="absolute inset-0 bg-[#9d4edd]/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity border border-[#9d4edd]/20 pointer-events-none" style={{ transform: 'translateZ(-50px)' }} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500 font-mono text-[10px] animate-pulse uppercase flex flex-col items-center gap-4">
                                                            <Loader2 className="animate-spin text-[#9d4edd]" size={32} />
                                                            Crystallizing 3D Matrix...
                                                        </div>
                                                    )}
                                                </motion.div>
                                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <RotateCcw size={12} className="animate-spin-slow" /> Interactive Rotation Vector Engaged
                                                </div>
                                            </div>
                                        )}
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
