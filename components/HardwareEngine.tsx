
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
    analyzeSchematic, researchComponents, fileToGenerativePart, 
    promptSelectKey, generateXRayVariant, generateIsometricSchematic,
    getLiveSupplyChainData
} from '../services/geminiService';
import { 
    Upload, Search, Cpu, Zap, Activity, Loader2, 
    Thermometer, X, Scan, FileText, Plus, Trash2, Download, 
    Globe, RefreshCw, Filter, MemoryStick, Eye, TrendingUp, 
    TrendingDown, ShieldCheck, History, Package, Shield, 
    Box, Tag, BarChart3, Clock, ArrowRight, Layers,
    Maximize2, Info, ChevronRight, CheckCircle2, AlertTriangle, GitCommit,
    RotateCcw, SlidersHorizontal, Check, BoxSelect, Monitor, ChevronDown,
    Radio, Binary, Gauge, Server, Network, Fan, Settings, Terminal, DollarSign,
    PackageCheck
} from 'lucide-react';
import { TemporalEra, FileData, AppMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { audio } from '../services/audioService';

// --- TACTICAL HUD SUB-COMPONENTS ---

const NeuralThermalGrid: React.FC = () => {
    const [points, setPoints] = useState(() => Array.from({ length: 100 }, (_, i) => ({
        id: i,
        temp: 40 + Math.random() * 20,
        stress: Math.random() * 100
    })));

    useEffect(() => {
        const interval = setInterval(() => {
            setPoints(prev => prev.map(p => ({
                ...p,
                temp: Math.max(30, Math.min(95, p.temp + (Math.random() * 6 - 3))),
                stress: Math.max(0, Math.min(100, p.stress + (Math.random() * 10 - 5)))
            })));
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-10 gap-0.5 w-full aspect-square bg-black border border-white/5 p-1 rounded-sm shadow-inner overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#ef4444]/5 to-transparent pointer-events-none" />
            {points.map(p => (
                <div 
                    key={p.id} 
                    className="w-full h-full transition-colors duration-1000"
                    style={{ 
                        backgroundColor: `hsla(${240 - (p.temp - 30) * 3}, 100%, 50%, ${0.1 + p.stress/200})`,
                        border: p.temp > 85 ? '1px solid #ef4444' : 'none'
                    }}
                />
            ))}
        </div>
    );
};

const NodeTelemetryHUD = ({ label, value, unit, trend }: { label: string, value: string | number, unit: string, trend: 'up' | 'down' | 'stable' }) => (
    <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl flex flex-col gap-2 group hover:border-[#22d3ee]/40 transition-all">
        <div className="flex justify-between items-center">
            <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">{label}</span>
            {trend === 'up' ? <TrendingUp size={10} className="text-[#10b981]" /> : <TrendingDown size={10} className="text-red-500" />}
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-white tracking-tighter">{value}</span>
            <span className="text-[9px] font-mono text-gray-600 uppercase">{unit}</span>
        </div>
        <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
                animate={{ width: `${Math.random() * 100}%` }}
                className={`h-full ${trend === 'up' ? 'bg-[#22d3ee]' : 'bg-[#9d4edd]'}`}
            />
        </div>
    </div>
);

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
    const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
    const [isometricImage, setIsometricImage] = useState<string | null>(null);
    const [isGenerating3D, setIsGenerating3D] = useState(false);
    const [isSearchingComponents, setIsSearchingComponents] = useState(false);
    const [rotation, setRotation] = useState({ x: 15, y: -25 });
    const [liveSupplyData, setLiveSupplyData] = useState<any>(null);
    const [isFetchingSupply, setIsFetchingSupply] = useState(false);

    useVoiceExpose('hardware-orchestrator', { era: currentEra, nodeCount: 1240, activeSectors: 8 });

    useEffect(() => {
        const saved = localStorage.getItem('hw_search_history');
        if (saved) {
            try { setHardwareState({ searchHistory: JSON.parse(saved) }); } catch (e) {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('hw_search_history', JSON.stringify(searchHistory));
    }, [searchHistory]);

    const handleSearchComponents = async () => {
        if (!componentQuery.trim()) return;
        setIsSearchingComponents(true);
        addLog('SYSTEM', `HARDWARE_SEARCH: Initializing component research for "${componentQuery}"...`);
        audio.playClick();
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
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

                // If scan found components, trigger supply chain grounding for the first one
                if (scan.components?.length > 0) {
                    fetchSupplyChain(scan.components[0].name);
                }
            } catch (err: any) {
                setHardwareState({ isLoading: false, error: err.message });
                addLog('ERROR', `SCAN_FAIL: ${err.message}`);
                audio.playError();
            }
        }
    };

    const fetchSupplyChain = async (compName: string) => {
        if (!compName) return;
        setIsFetchingSupply(true);
        addLog('SYSTEM', `SUPPLY_SYNC: Grounding supply data for "${compName}" via Gemini Search...`);
        try {
            const data = await getLiveSupplyChainData(compName);
            setLiveSupplyData(data);
            addLog('SUCCESS', `SUPPLY_SYNC: Live pricing acquired from ${data?.source || 'Global Distributors'}.`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsFetchingSupply(false);
        }
    };

    const filteredRecommendations = useMemo(() => {
        return (recommendations || []).filter(item => {
            const matchesSearch = item.partNumber?.toLowerCase().includes((componentQuery || '').toLowerCase());
            const matchesVendor = activeVendor === 'ALL' || item.manufacturer?.toUpperCase() === activeVendor;
            return matchesSearch && matchesVendor;
        });
    }, [recommendations, componentQuery, activeVendor]);

    return (
        <div className="h-full w-full bg-[#020202] text-white flex flex-col relative border border-[#1f1f1f] rounded-3xl overflow-hidden shadow-2xl font-sans group/hw">
            
            {/* Sector Control Bar */}
            <div className="h-20 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl flex items-center justify-between px-10 z-50 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#22d3ee]/10 border border-[#22d3ee]/40 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            <Cpu className="w-6 h-6 text-[#22d3ee]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Hardware Core</h1>
                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">DePIN Workstation // Protocol: {currentEra}</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex gap-2 bg-black/60 p-1 rounded-xl border border-white/5">
                        {Object.values(TemporalEra).map(era => (
                            <button 
                                key={era} 
                                onClick={() => { setHardwareState({ currentEra: era }); audio.playClick(); }} 
                                className={`px-5 py-2 rounded-lg text-[9px] font-black font-mono uppercase tracking-widest transition-all ${currentEra === era ? 'bg-[#22d3ee] text-black shadow-lg shadow-[#22d3ee]/20' : 'text-gray-500 hover:text-white'}`}
                            >
                                {era}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    {liveSupplyData && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-6 px-6 py-2 bg-[#10b981]/10 border border-[#10b981]/30 rounded-2xl shadow-lg">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none mb-1">Live Pricing</span>
                                <span className="text-sm font-black font-mono text-[#10b981]">{liveSupplyData.price}</span>
                            </div>
                            <div className="h-6 w-px bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none mb-1">Stock</span>
                                <span className="text-[10px] font-black font-mono text-white uppercase">{liveSupplyData.availability}</span>
                            </div>
                        </motion.div>
                    )}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Enclave Status</span>
                        <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                             <span className="text-[11px] font-mono font-black text-[#10b981] tracking-tighter uppercase">ATTESTED_L0</span>
                        </div>
                    </div>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all shadow-xl">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Visual Viewport Section */}
                <div className="flex-1 bg-black relative flex flex-col p-10 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03)_0%,transparent_80%)] pointer-events-none" />
                    
                    {!schematicImage ? (
                        <div className="h-full flex flex-col gap-10">
                            {/* DePIN Real-time Telemetry Grid */}
                            <div className="grid grid-cols-4 gap-6 shrink-0">
                                <NodeTelemetryHUD label="Lattice Load" value="84.2" unit="%" trend="up" />
                                <NodeTelemetryHUD label="Proof Intensity" value="1.2" unit="POUW" trend="stable" />
                                <NodeTelemetryHUD label="Compute Nodes" value="1,240" unit="LIVE" trend="up" />
                                <NodeTelemetryHUD label="Thermal Ceiling" value="72" unit="°C" trend="down" />
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] group hover:border-[#22d3ee]/40 transition-all duration-1000 bg-[#050505]/40 shadow-inner overflow-hidden relative">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />
                                <label className="flex flex-col items-center gap-8 cursor-pointer text-center p-20 relative z-10">
                                    <div className="w-32 h-32 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000 shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
                                        <Upload size={40} className="text-gray-700 group-hover:text-[#22d3ee]" />
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-black text-white font-mono uppercase tracking-[0.5em]">Ingest Logic Topology</h2>
                                        <p className="text-[12px] text-gray-600 font-mono max-w-sm mx-auto uppercase tracking-widest leading-relaxed">Synthesize multi-layer holographic data from 2D component schematics.</p>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-8 relative">
                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <div className="relative mb-12">
                                        <div className="w-32 h-32 rounded-full border-4 border-t-[#22d3ee] border-white/5 animate-spin" />
                                        <div className="absolute inset-0 blur-3xl bg-[#22d3ee]/20 animate-pulse" />
                                    </div>
                                    <div className="text-center space-y-4">
                                        <p className="text-xl font-black font-mono text-white uppercase tracking-[0.8em]">Describing Topology...</p>
                                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em]">Inverting spectral lattice coordinates</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col gap-8">
                                    {/* Viewport Control Tray */}
                                    <div className="flex justify-between items-center z-20">
                                        <div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-3xl">
                                            {[
                                                { id: '2D', icon: Layers, label: 'Lattice X-Ray', color: '#22d3ee' },
                                                { id: '3D', icon: BoxSelect, label: 'Isometric 3D', color: '#9d4edd' }
                                            ].map(btn => (
                                                <button 
                                                    key={btn.id}
                                                    onClick={() => { setViewMode(btn.id as any); audio.playClick(); }}
                                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3
                                                        ${viewMode === btn.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white'}
                                                    `}
                                                >
                                                    <btn.icon size={16} /> {btn.label}
                                                </button>
                                            ))}
                                        </div>

                                        {viewMode === '2D' && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-6 bg-[#0a0a0a] px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-3"><Scan size={16} className="text-[#22d3ee]"/> Scan Depth</span>
                                                <input 
                                                    type="range" min="0" max="100" 
                                                    value={xrayIntensity} 
                                                    onChange={e => setXrayIntensity(parseInt(e.target.value))}
                                                    className="w-48 h-1 bg-[#1a1a1a] rounded-full appearance-none accent-[#22d3ee] cursor-pointer" 
                                                />
                                            </motion.div>
                                        )}

                                        <button onClick={() => setHardwareState({ schematicImage: null })} className="p-4 text-gray-600 hover:text-red-500 bg-[#0a0a0a] border border-white/10 rounded-2xl transition-all shadow-xl active:scale-90"><X size={20}/></button>
                                    </div>

                                    {/* Workstation Hub */}
                                    <div className="flex-1 relative rounded-[4rem] border border-white/5 bg-[#050505] overflow-hidden shadow-[0_80px_200px_rgba(0,0,0,0.8)] flex items-center justify-center">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
                                        
                                        <AnimatePresence mode="wait">
                                            {viewMode === '2D' ? (
                                                <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative p-20 flex items-center justify-center">
                                                    {xrayImage && <img src={xrayImage} className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-100 scale-90" />}
                                                    <img 
                                                        src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`}
                                                        className="w-full h-full object-contain relative z-10 transition-all duration-700 scale-90"
                                                        style={{ clipPath: `inset(0 ${xrayIntensity}% 0 0)` }}
                                                    />
                                                    
                                                    {/* Hotspot Logic Visualization */}
                                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 1000 1000">
                                                        {analysis?.components?.map((comp: any, i: number) => {
                                                            const [ymin, xmin, ymax, xmax] = comp.boundingBox;
                                                            return (
                                                                <g key={i} className="pointer-events-auto cursor-crosshair group/box" onClick={() => fetchSupplyChain(comp.name)}>
                                                                    <rect 
                                                                        x={xmin} y={ymin} width={xmax-xmin} height={ymax-ymin} 
                                                                        className="fill-transparent stroke-[#22d3ee]/20 hover:stroke-[#22d3ee] hover:fill-[#22d3ee]/5 transition-all stroke-2"
                                                                    />
                                                                    <circle cx={xmin} cy={ymin} r="4" className="fill-[#22d3ee]" />
                                                                </g>
                                                            );
                                                        })}
                                                    </svg>
                                                </motion.div>
                                            ) : (
                                                <motion.div key="3d" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full relative perspective-2000 p-20 flex items-center justify-center">
                                                    {isometricImage ? (
                                                        <motion.div 
                                                            animate={{ rotateY: rotation.y, rotateX: rotation.x }}
                                                            transition={{ type: 'spring', damping: 25, stiffness: 60 }}
                                                            className="relative preserve-3d group/iso"
                                                        >
                                                            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-12 bg-[#22d3ee]/20 blur-[80px] rounded-full animate-pulse" />
                                                            <img src={isometricImage} className="max-w-[85vw] max-h-[70vh] drop-shadow-[0_100px_200px_rgba(34,211,238,0.3)] border border-white/5 rounded-3xl" />
                                                            
                                                            {/* HUD Elements attached to 3D */}
                                                            <div className="absolute top-10 -right-40 w-64 p-6 bg-black/80 backdrop-blur-2xl border-l-4 border-l-[#9d4edd] border-white/10 rounded-2xl shadow-2xl pointer-events-none opacity-0 group-hover/iso:opacity-100 transition-all duration-700 transform translate-x-10 group-hover/iso:translate-x-0">
                                                                <div className="text-[10px] font-black text-[#9d4edd] uppercase tracking-widest mb-2">Thermal Dissipation</div>
                                                                <div className="text-xl font-black font-mono text-white">4.2 kW/m²</div>
                                                                <div className="mt-4 text-[8px] text-gray-500 font-mono uppercase leading-relaxed">Structural vector alignment verified across X/Y axis.</div>
                                                            </div>
                                                        </motion.div>
                                                    ) : (
                                                        <div className="text-center space-y-6 opacity-30">
                                                            <Monitor size={80} className="mx-auto text-gray-500" />
                                                            <p className="text-xl font-mono uppercase tracking-[1em]">3D LATTICE VOID</p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Sovereign BIOS Console */}
                                    <div className="h-40 bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 flex flex-col gap-4 shadow-2xl relative overflow-hidden shrink-0 group/bios">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0 px-1">
                                            {/* Fixed missing lucide-react import for Terminal */}
                                            <div className="flex items-center gap-4">
                                                <Terminal size={16} className="text-[#22d3ee]" />
                                                <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Sovereign_BIOS_v8.1</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /><span className="text-[8px] font-mono text-gray-600 uppercase">Cooling: NOMINAL</span></div>
                                                <div className="h-3 w-px bg-white/10" />
                                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" /><span className="text-[8px] font-mono text-gray-600 uppercase">Power: STABLE</span></div>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] text-emerald-500/80 space-y-1.5 pr-4 group-hover/bios:text-emerald-400 transition-colors">
                                            <div>{">"} SYSTEM_INIT: Hardware Enclave Attestation: [OK]</div>
                                            <div>{">"} THERMAL_SCAN: L1_DIE Temp: 42°C // Delta: -0.4K</div>
                                            <div>{">"} POWER_RAIL_0: 12.04v // Ripples: 4mV</div>
                                            <div>{">"} LATTICE_HANDSHAKE: Symmetric cryptographic channel established.</div>
                                            <div>{">"} VECTOR_SYNC: 3D topology projection active.</div>
                                            {isFetchingSupply && <div className="text-cyan-400">{">"} SUPPLY_CHAIN_QUERY: Executing grounding search...</div>}
                                            <div className="animate-pulse">{">"} _</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Tactical Sidebar: Supply Chain & Matrices */}
                <div className="w-[420px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 z-30 relative shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <Globe size={18} className="text-[#22d3ee]" />
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Supply Chain Matrix</h2>
                            </div>
                            <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-[#22d3ee] text-black border-[#22d3ee]' : 'bg-[#111] border border-white/10 text-gray-600 hover:text-white'}`}>
                                <Filter size={16} />
                            </button>
                        </div>
                        
                        <div className="relative group">
                            <input 
                                value={componentQuery}
                                onChange={e => setHardwareState({ componentQuery: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleSearchComponents()}
                                placeholder="Locate Hardware Vectors..."
                                className="w-full bg-[#0a0a0a] border border-white/10 p-4 pl-12 rounded-2xl text-xs font-mono text-white outline-none focus:border-[#22d3ee] transition-all shadow-inner"
                            />
                            <Search className="absolute left-4 top-4 text-gray-700" size={18} />
                            <div className="absolute right-4 top-4">
                                {isSearchingComponents && <Loader2 size={18} className="animate-spin text-[#22d3ee]" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {/* Live Grounded Supply Data */}
                        <AnimatePresence>
                            {liveSupplyData && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-[#10b981]/5 border border-[#10b981]/30 rounded-[2rem] space-y-4 shadow-inner relative overflow-hidden group/supply">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover/supply:opacity-[0.08] transition-opacity"><PackageCheck size={64} /></div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#10b981]/20 rounded-xl text-[#10b981]">
                                            <DollarSign size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em]">Real-World Sourcing Active</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[8px] font-mono text-gray-600 uppercase block mb-1">Mkt Price</span>
                                            <span className="text-lg font-black font-mono text-white">{liveSupplyData.price}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-mono text-gray-600 uppercase block mb-1">Lead Time</span>
                                            <span className="text-lg font-black font-mono text-[#f59e0b]">{liveSupplyData.leadTime}</span>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[8px] font-mono text-gray-600 uppercase">Provider: {liveSupplyData.source}</span>
                                        <button onClick={() => setLiveSupplyData(null)} className="text-gray-700 hover:text-white"><X size={10}/></button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Interactive Bill of Materials (BOM) Grid */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3"><Package size={14}/> Active BOM</span>
                                <span className="text-[9px] font-mono text-[#22d3ee] font-bold">{bom.length} OBJECTS</span>
                            </div>
                            <div className="space-y-2">
                                {bom.map((item, i) => (
                                    <div key={i} className="p-4 bg-black/60 border border-white/5 rounded-2xl hover:border-[#22d3ee]/30 transition-all group/item flex items-center justify-between">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-[#111] flex items-center justify-center text-gray-600 group-hover/item:text-[#22d3ee] transition-colors border border-white/5">
                                                <Box size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-black text-white uppercase truncate">{item.name || item.partNumber}</div>
                                                <div className="text-[8px] text-gray-600 font-mono uppercase mt-1">Vendor: {item.manufacturer}</div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] font-black font-mono text-[#22d3ee]">${item.price?.toLocaleString()}</div>
                                            <button onClick={() => setHardwareState({ bom: bom.filter((_, idx) => idx !== i) })} className="text-gray-800 hover:text-red-500 transition-colors mt-1"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Node Thermal Map Monitor */}
                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3"><Thermometer size={14}/> Neural Thermal Map</span>
                                <span className="text-[9px] font-mono text-[#ef4444] font-bold animate-pulse">LIVE FEED</span>
                            </div>
                            <NeuralThermalGrid />
                        </div>

                        {/* Search Results Display */}
                        {recommendations.length > 0 && (
                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-3"><Activity size={14}/> Discovery results</span>
                                <div className="space-y-2">
                                    {filteredRecommendations.map((item, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => { setHardwareState({ bom: [...bom, item] }); audio.playSuccess(); }}
                                            className="w-full p-4 bg-[#111]/40 border border-transparent hover:border-[#22d3ee]/40 rounded-2xl flex items-center justify-between text-left group transition-all"
                                        >
                                            <div className="min-w-0 pr-4">
                                                <div className="text-[10px] font-black text-gray-200 uppercase truncate">{item.name}</div>
                                                <div className="text-[8px] text-gray-600 font-mono mt-1">{item.manufacturer} // STABLE</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-[#22d3ee] transition-all">
                                                <Plus size={16} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Workstation Footer Stats */}
                    <div className="p-8 border-t border-white/5 bg-black/60 shrink-0 space-y-5">
                        <div className="flex justify-between items-center text-[10px] font-black font-mono text-gray-600 uppercase tracking-widest">
                            <span>Lattice Synchronization</span>
                            <span className="text-[#22d3ee] animate-pulse">Active</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#111] rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: '92%' }} 
                                transition={{ duration: 1.5 }}
                                className="h-full bg-gradient-to-r from-[#22d3ee] to-[#9d4edd] shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                            />
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-gray-700 uppercase font-mono tracking-widest mb-1">Total Power Drain</span>
                                <span className="text-xl font-black font-mono text-white">4.22<span className="text-xs text-gray-600 ml-1">kW</span></span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-gray-700 uppercase font-mono tracking-widest mb-1">Vault Persistence</span>
                                <span className="text-xl font-black font-mono text-[#10b981]">99.9%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Footer HUD */}
            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f1f1f] px-10 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                        <ShieldCheck size={18} className="shadow-[0_0_15px_#10b981]" /> Hardware_Secure
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <Binary size={18} className="text-[#22d3ee]" /> Logic_Bus: 800 MHz
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <Fan size={18} className="animate-spin-slow text-[#9d4edd]" /> Thermal_Sync: ACTIVE
                    </div>
                </div>
                <div className="flex items-center gap-12 shrink-0">
                    <span className="uppercase tracking-[0.6em] opacity-40 leading-none hidden lg:block text-[9px]">Sovereign Hardware Core v9.0-ZENITH // Real-Time DePIN Orchestration</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-[0.3em] leading-none text-[10px]">OS_SYSTEM_CORE</span>
                </div>
            </div>
        </div>
    );
};

export default HardwareEngine;
