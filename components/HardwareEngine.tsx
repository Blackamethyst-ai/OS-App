import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
    analyzeSchematic, researchComponents, fileToGenerativePart, 
    promptSelectKey, generateXRayVariant, generateIsometricSchematic,
    getLiveSupplyChainData, generateHardwareDeploymentManifest, analyzeCrossSectorImpact
} from '../services/geminiService';
import { 
    Upload, Cpu, Zap, Activity, Loader2, 
    Thermometer, X, Scan, FileText, Trash2, Download, 
    Globe, RefreshCw, Layers,
    Maximize2, Info, ChevronRight, CheckCircle2, AlertTriangle,
    RotateCcw, SlidersHorizontal, Check, BoxSelect, Monitor,
    Radio, Binary, Server, Network, Fan, Settings, Terminal,
    PackageCheck, Lightbulb, Workflow, Target, MoveUpRight,
    Wrench, FastForward, Power, BarChart, FlaskConical, ShieldCheck, Box, Package,
    Clock, DollarSign, TrendingUp, BarChart3, Move, Search, TrendingDown, LayoutGrid,
    ShoppingBag, History, Microscope, ExternalLink, Gauge, Waves, Fingerprint,
    GitBranch, GitCommit
} from 'lucide-react';
import { TemporalEra, FileData, AppMode, ImageSize, AspectRatio, StoredArtifact } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { audio } from '../services/audioService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// --- TACTICAL HUD SUB-COMPONENTS ---

const ComputeFluxOverlay = ({ active, speed, color = '#22d3ee' }: { active: boolean, speed: number, color?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !active) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const particles: any[] = [];
        
        const render = () => {
            frame++;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (frame % Math.max(1, Math.floor(10 / speed)) === 0) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * speed * 1.5,
                    vy: (Math.random() - 0.5) * speed * 1.5,
                    life: 1.0,
                    pColor: Math.random() > 0.5 ? color : '#f59e0b'
                });
            }

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.01;
                if (p.life <= 0) { particles.splice(i, 1); return; }
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
                ctx.strokeStyle = p.pColor;
                ctx.globalAlpha = p.life * 0.3;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
                ctx.fillStyle = p.pColor;
                ctx.globalAlpha = p.life;
                ctx.fill();
            });
            requestAnimationFrame(render);
        };
        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, [active, speed, color]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-30" />;
};

const NeuralThermalGrid: React.FC<{ stressLevel: number }> = ({ stressLevel }) => {
    const [points, setPoints] = useState(() => Array.from({ length: 100 }, (_, i) => ({
        id: i,
        temp: 40 + Math.random() * 20,
        stress: Math.random() * 100
    })));

    useEffect(() => {
        const interval = setInterval(() => {
            setPoints(prev => prev.map(p => ({
                ...p,
                temp: Math.max(30, Math.min(100, p.temp + (Math.random() * (stressLevel / 15) - (stressLevel / 30)))),
                stress: Math.max(0, Math.min(100, p.stress + (Math.random() * 8 - 4)))
            })));
        }, 1200);
        return () => clearInterval(interval);
    }, [stressLevel]);

    return (
        <div className="grid grid-cols-10 gap-px w-full aspect-square bg-black border border-white/5 p-0.5 rounded shadow-inner overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#ef4444]/5 to-transparent pointer-events-none" />
            {points.map(p => (
                <div 
                    key={p.id} 
                    className="w-full h-full transition-colors duration-[2500ms]"
                    style={{ 
                        backgroundColor: p.temp > 85 ? `rgba(239, 68, 68, ${0.3 + (p.temp-85)/20})` : `hsla(${240 - (p.temp - 30) * 3}, 80%, 40%, 0.1)`,
                    }}
                />
            ))}
        </div>
    );
};

const PerformanceMixer = ({ label, value, unit, min, max, onValueChange, color }: any) => (
    <div className="flex flex-col gap-1.5 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-white/10 transition-all">
        <div className="flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[7px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none">{label}</span>
                <span className="text-xs font-black font-mono text-white tracking-tighter mt-1">{value}{unit}</span>
            </div>
            <div className="h-3 w-0.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div animate={{ height: `${(value/max)*100}%` }} className="w-full bg-current mt-auto" style={{ color }} />
            </div>
        </div>
        <div className="relative h-1 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div className="h-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}30` }} animate={{ width: `${((value - min) / (max - min)) * 100}%` }} />
            <input type="range" min={min} max={max} step={(max-min)/100} value={value} onChange={(e) => onValueChange(parseFloat(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
    </div>
);

const MOCK_GPUS = [
    { id: 'gpu-h100', era: 'SILICON', model: 'Tensor Core H100', manufacturer: 'NVIDIA', arch: 'Hopper', price: 32500, trend: +2.4, stock: 'IN_STOCK', mtbf: 45, specs: { vram: '80GB HBM3', tdp: '700W', cores: '16896 CUDA' }, bom: ['HBM3 Memory Module', 'SXM5 Mezzanine Interface', 'Integrated Heat Sink', 'Tensor Cores Layer'] },
    { id: 'gpu-a100', era: 'SILICON', model: 'Ampere A100', manufacturer: 'NVIDIA', arch: 'Ampere', price: 12400, trend: -1.2, stock: 'LOW_STOCK', mtbf: 50, specs: { vram: '80GB HBM2e', tdp: '400W', cores: '6912 CUDA' }, bom: ['HBM2e Memory', 'SXM4 Interface', 'Vapor Chamber', 'Silicon Interposer'] },
    { id: 'gpu-q1', era: 'QUANTUM', model: 'Q-Tensor X1', manufacturer: 'Quantum Logic', arch: 'Sovereign-Q', price: 85000, trend: +12.4, stock: 'LIMITED', mtbf: 12, specs: { vram: '128QB Quantum VRAM', tdp: '1200W', cores: '512 Qubits' }, bom: ['Dilution Refrigerator Pipe', 'Superconducting Interconnect', 'Qubit Control Die', 'Vacuum Chamber Seal'] },
    { id: 'gpu-q2', era: 'QUANTUM', model: 'IonStream Z', manufacturer: 'Rigetti Labs', arch: 'Lattice-7', price: 145000, trend: +4.2, stock: 'IN_STOCK', mtbf: 18, specs: { vram: '256QB Cryo-Memory', tdp: '850W', cores: '1024 Qubits' }, bom: ['Iontrap Vacuum Stage', 'Microwave Oscillator', 'Gold plated chassis', 'Cryogenic Pump'] },
    { id: 'gpu-b1', era: 'BIOMIMETIC', model: 'Neural Vine v4', manufacturer: 'Synapse Corp', arch: 'Bio-Lattice', price: 54000, trend: +1.1, stock: 'LIMITED', mtbf: 85, specs: { vram: 'Organic Wetware 1TB', tdp: '150W', cores: '12B Synapses' }, bom: ['Myelin Sheath Plate', 'Electrolyte Pump', 'Neuron Array Patch', 'Vascular Cooling Mesh'] }
];

const HardwareEngine: React.FC = () => {
    const { hardware, setHardwareState, addLog, metaventions } = useAppStore();
    const { currentEra, schematicImage, analysis, bom, isLoading, xrayImage, finTelemetry } = hardware;
    
    const [clockSpeed, setClockSpeed] = useState(3.4);
    const [voltage, setVoltage] = useState(1.2);
    const [fanSpeed, setFanSpeed] = useState(2200);
    const [timing, setTiming] = useState(14);
    const [viewMode, setViewMode] = useState<'2D' | '3D' | 'SCHEMATIC' | 'XRAY' | 'QUANTUM'>('QUANTUM');
    const [showComputeFlux, setShowComputeFlux] = useState(true);
    
    const eraColor = useMemo(() => {
        if (currentEra === 'QUANTUM') return '#9d4edd';
        if (currentEra === 'BIOMIMETIC') return '#10b981';
        return '#22d3ee';
    }, [currentEra]);

    const filteredGpus = useMemo(() => {
        return MOCK_GPUS.filter(g => g.era === currentEra);
    }, [currentEra]);

    const [selectedGpu, setSelectedGpu] = useState(filteredGpus[0] || MOCK_GPUS[0]);
    const [gpuSearchQuery, setGpuSearchQuery] = useState('');
    const [isometricImage, setIsometricImage] = useState<string | null>(null);
    const [liveSupplyData, setLiveSupplyData] = useState<any>(null);
    const [isFetchingSupply, setIsFetchingSupply] = useState(false);
    const [isAnalyzingFinImpact, setIsAnalyzingFinImpact] = useState(false);

    useEffect(() => {
        setSelectedGpu(filteredGpus[0] || MOCK_GPUS[0]);
    }, [currentEra, filteredGpus]);

    const stressLevel = useMemo(() => {
        const base = (clockSpeed - 1) * 20;
        const voltBonus = (voltage - 0.8) * 50;
        const fanPenalty = (fanSpeed / 6000) * 40;
        const timingPenalty = (20 - timing) * 2;
        return Math.max(10, Math.min(100, base + voltBonus - fanPenalty + timingPenalty));
    }, [clockSpeed, voltage, fanSpeed, timing]);

    const mtbf = useMemo(() => {
        const baseline = 50000; 
        const thermalPenalty = Math.pow(stressLevel / 40, 2.5) * 4000;
        return Math.max(4500, Math.round(baseline - thermalPenalty));
    }, [stressLevel]);

    const powerDraw = useMemo(() => (voltage * clockSpeed * 0.85 + (fanSpeed / 1000) * 15).toFixed(2), [voltage, clockSpeed, fanSpeed]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!schematicImage && viewMode !== 'QUANTUM') return;
            setIsAnalyzingFinImpact(true);
            try {
                const impact = await analyzeCrossSectorImpact(
                    { clockSpeed, voltage, fanSpeed, powerDraw, currentEra, selectedGpu: selectedGpu?.model },
                    { strategyLibrary: metaventions.strategyLibrary.length, activeLayerId: metaventions.activeLayerId }
                );
                setHardwareState({ finTelemetry: { totalBomCost: impact.totalBomCost, roiProjection: impact.roiProjection, maintenanceEst: impact.maintenanceEst }});
            } catch (e) { console.error(e); } finally { setIsAnalyzingFinImpact(false); }
        }, 3000);
        return () => clearTimeout(timer);
    }, [clockSpeed, voltage, fanSpeed, schematicImage, selectedGpu, viewMode, currentEra, metaventions, powerDraw, setHardwareState]);

    useVoiceExpose('hardware-fabricator', { era: currentEra, stressLevel, powerDraw, mtbf, clocks: `${clockSpeed}GHz`, activeGpu: selectedGpu?.model });

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const data = await fileToGenerativePart(file);
            setHardwareState({ schematicImage: data, isLoading: true, analysis: null, xrayImage: null });
            setIsometricImage(null);
            addLog('SYSTEM', `INGEST: Extracting hardware signature from [${file.name}]...`);
            try {
                if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); }
                const [scan, xray, iso] = await Promise.all([analyzeSchematic(data), generateXRayVariant(data), generateIsometricSchematic(data)]);
                setHardwareState({ analysis: scan, xrayImage: xray, isLoading: false, bom: scan.components || [] });
                setIsometricImage(iso);
                addLog('SUCCESS', 'DIAGNOSTIC: Holographic lattice reconstruction finalized.');
                audio.playSuccess();
                if (scan.components?.length > 0) fetchSupplyChain(scan.components[0].name);
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
        addLog('SYSTEM', `SUPPLY_SYNC: Scanning nodes for "${compName}" availability...`);
        try {
            const data = await getLiveSupplyChainData(compName);
            setLiveSupplyData(data);
            addLog('SUCCESS', `SUPPLY_SYNC: Real-time logistics locked.`);
        } catch (e) { console.error(e); } finally { setIsFetchingSupply(false); }
    };

    return (
        <div className="h-full w-full bg-[#020202] text-white flex flex-col relative border border-[#1f1f1f] rounded-[2rem] overflow-hidden shadow-2xl font-sans group/hw">
            {/* Header - Tightened */}
            <div className="h-12 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl flex items-center justify-between px-6 z-50 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg border transition-all duration-700 shadow-lg" style={{ backgroundColor: `${eraColor}15`, borderColor: `${eraColor}40`, color: eraColor }}>
                            <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-xs font-black font-mono text-white uppercase tracking-[0.3em] leading-none">Hardware Core</h1>
                            <span className="text-[7px] text-gray-600 font-mono uppercase tracking-widest mt-0.5 block">Lattice Fabrication Hub</span>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-white/5" />
                    <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                        {Object.values(TemporalEra).map(era => (
                            <button key={era} onClick={() => { setHardwareState({ currentEra: era }); audio.playClick(); }} className={`px-3 py-1 rounded text-[7px] font-black font-mono uppercase tracking-widest transition-all ${currentEra === era ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>{era}</button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-[#0a0a0a] p-0.5 rounded-lg border border-white/10 shadow-lg">
                        {[
                            { id: 'QUANTUM', icon: ShoppingBag, label: 'Procurement' },
                            { id: '2D', icon: Layers, label: 'Lattice' },
                            { id: 'XRAY', icon: Scan, label: 'Thermal' },
                            { id: 'SCHEMATIC', icon: Binary, label: 'Logic' }
                        ].map(btn => (
                            <button key={btn.id} onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === btn.id ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-gray-300'}`}><btn.icon size={12} /> {btn.label}</button>
                        ))}
                    </div>
                    <button onClick={() => setShowComputeFlux(!showComputeFlux)} className={`p-2 rounded-lg transition-all border ${showComputeFlux ? 'bg-[#22d3ee]/20 border-[#22d3ee]/50 text-[#22d3ee]' : 'bg-white/5 border-white/10 text-gray-500'}`} title="Toggle Compute Flux Overlay"><Zap size={14} className={showComputeFlux ? 'animate-pulse' : ''} /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Viewport Surface */}
                <div className="flex-1 bg-black relative flex flex-col p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03)_0%,transparent_80%)] pointer-events-none" />
                    
                    <AnimatePresence mode="wait">
                        {viewMode === 'QUANTUM' ? (
                            <motion.div key="quantum-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="h-full flex flex-col gap-6 overflow-hidden">
                                <div className="flex justify-between items-end shrink-0">
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-tighter">{currentEra} Node Procurement</h2>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 w-64 focus-within:border-[#22d3ee] transition-all">
                                                <Search size={12} className="text-gray-600 mr-2" />
                                                <input value={gpuSearchQuery} onChange={e => setGpuSearchQuery(e.target.value)} placeholder="Search specifications..." className="bg-transparent border-none outline-none text-[9px] font-mono text-white w-full uppercase placeholder:text-gray-800" />
                                            </div>
                                            <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                                                <History size={10} /> Last Sync: 4m ago
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-0.5 text-right">
                                        <span className="text-[6px] text-gray-600 uppercase font-mono tracking-widest">Global Capacity</span>
                                        <span className="text-sm font-black font-mono text-[#22d3ee]">4.82<span className="text-[8px] text-gray-500 ml-1">Zetta/H</span></span>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-1 pb-6">
                                    {filteredGpus.filter(g => g.model.toLowerCase().includes(gpuSearchQuery.toLowerCase())).map(gpu => (
                                        <motion.div 
                                            key={gpu.id}
                                            onClick={() => setSelectedGpu(gpu)}
                                            whileHover={{ scale: 1.01 }}
                                            className={`p-4 bg-[#0a0a0a] border rounded-2xl cursor-pointer transition-all relative overflow-hidden group/gpu ${selectedGpu?.id === gpu.id ? 'border-[#22d3ee] shadow-xl' : 'border-white/5 hover:border-white/15'}`}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-[0.01] group-hover/gpu:opacity-[0.03] transition-opacity rotate-12"><Cpu size={60} /></div>
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="p-2 bg-white/5 rounded-lg text-gray-600 group-hover/gpu:text-[#22d3ee] transition-all"><Box size={16} /></div>
                                                <div className={`px-2 py-0.5 rounded text-[7px] font-black font-mono uppercase tracking-widest border ${gpu.stock === 'IN_STOCK' ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30' : 'text-red-500 bg-red-500/10 border-red-500/30'}`}>
                                                    {gpu.stock.replace('_', ' ')}
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-black text-white uppercase font-mono tracking-tighter mb-0.5 relative z-10">{gpu.model}</h3>
                                            <p className="text-[7px] text-gray-600 font-mono uppercase tracking-widest mb-4 relative z-10">{gpu.manufacturer} // {gpu.arch}</p>
                                            <div className="flex justify-between items-end border-t border-white/5 pt-4 relative z-10">
                                                <div>
                                                    <span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest block mb-0.5">Value</span>
                                                    <span className="text-base font-black font-mono text-[#10b981] tracking-tighter">${gpu.price.toLocaleString()}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest block mb-0.5">MTBF</span>
                                                    <span className="text-[10px] font-bold font-mono text-white">{gpu.mtbf}k hrs</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div className="aspect-video rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center gap-3 group hover:border-[#9d4edd]/30 transition-all cursor-pointer bg-white/[0.01]">
                                        <Microscope size={24} className="text-gray-700 group-hover:text-[#9d4edd] transition-all" />
                                        <p className="text-[8px] font-black font-mono text-gray-700 uppercase tracking-widest group-hover:text-white">Initialize Custom Dye Scan</p>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {selectedGpu && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 220, opacity: 1 }} className="border-t border-white/10 bg-[#050505]/95 backdrop-blur-2xl -mx-6 -mb-6 p-6 flex gap-6 overflow-hidden shadow-2xl relative z-20 shrink-0">
                                            <div className="w-[300px] flex flex-col gap-3 shrink-0">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-xs font-black font-mono text-white uppercase tracking-tighter">{selectedGpu.model} // BOM</h4>
                                                    <button onClick={() => setViewMode('SCHEMATIC')} className="px-2 py-1 hover:bg-[#22d3ee]/20 text-[#22d3ee] rounded-lg transition-all flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest border border-[#22d3ee]/20"><Scan size={10} /> Schematic</button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                    {selectedGpu.bom.map((item, i) => (
                                                        <div key={i} className="p-2 bg-black border border-white/5 rounded-lg flex items-center justify-between group/bom-item hover:border-[#22d3ee]/30 transition-all">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1 h-1 rounded-full bg-[#22d3ee] opacity-30 group-hover/bom-item:opacity-80" />
                                                                <span className="text-[8px] font-black text-gray-400 uppercase truncate max-w-[140px]">{item}</span>
                                                            </div>
                                                            <button onClick={() => fetchSupplyChain(item)} className="p-1 hover:bg-[#22d3ee]/20 text-gray-700 hover:text-[#22d3ee] rounded transition-all"><ExternalLink size={8}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-3">
                                                <div className="flex justify-between items-center px-1">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp size={12} className="text-[#10b981]" />
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Yield Variance Model</span>
                                                    </div>
                                                    <button onClick={() => fetchSupplyChain(selectedGpu.model)} className="px-4 py-1.5 bg-[#10b981] text-black rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all">Procure Node</button>
                                                </div>
                                                <div className="flex-1 bg-black rounded-2xl border border-white/5 p-4 shadow-inner relative overflow-hidden">
                                                    <AreaChart data={Array.from({length: 20}, (_, i) => ({ t: i, v: 30000 + Math.random() * 5000 }))} width={450} height={140}>
                                                        <Area type="monotone" dataKey="v" stroke="#10b981" fill="rgba(16,185,129,0.06)" strokeWidth={1.5} />
                                                    </AreaChart>
                                                    <div className="absolute top-3 right-5 text-[6px] font-mono text-gray-700 uppercase tracking-widest">Node_Health_Profile</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ) : !schematicImage ? (
                            <div className="h-full flex flex-col gap-5">
                                <div className="grid grid-cols-4 gap-4 shrink-0">
                                    {[
                                        { label: 'Node Load', val: '84.2%', icon: Activity, color: eraColor },
                                        { label: 'Efficiency', val: '1.22 P/W', icon: Zap, color: '#f59e0b' },
                                        { label: 'MTBF Rate', val: '50k hr', icon: Clock, color: '#10b981' },
                                        { label: 'Satellite Link', val: '4.8 Gb/s', icon: Radio, color: '#9d4edd' }
                                    ].map(stat => (
                                        <div key={stat.label} className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl space-y-2 shadow-xl">
                                            <div className="flex justify-between items-center text-[7px] font-mono text-gray-600 uppercase tracking-widest"><span>{stat.label}</span> <stat.icon size={10} style={{ color: stat.color }}/></div>
                                            <div className="text-lg font-black font-mono text-white tracking-tighter">{stat.val}</div>
                                            <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: '80%' }} className="h-full" style={{ backgroundColor: stat.color }} /></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-[#050505]/40 shadow-inner group hover:border-[#22d3ee]/20 transition-all duration-1000 relative">
                                    <label className="flex flex-col items-center gap-6 cursor-pointer text-center p-12 relative z-10">
                                        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-all duration-700 shadow-2xl">
                                            <Upload size={32} className="text-gray-700 group-hover:text-[#22d3ee] transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-base font-black text-white font-mono uppercase tracking-[0.4em]">Ingest Logic Probe</h2>
                                            <p className="text-[8px] text-gray-600 font-mono max-w-xs mx-auto uppercase tracking-[0.2em]">Map die topologies from logical blueprints.</p>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                    </label>
                                    
                                    <AnimatePresence>
                                        {(viewMode === 'XRAY' || viewMode === 'SCHEMATIC') && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-8 pointer-events-none">
                                                <div className="flex flex-col items-center gap-4 text-center">
                                                    <div className="p-3 bg-[#ef4444]/10 rounded-full text-[#ef4444] border border-[#ef4444]/20 animate-pulse">
                                                        <AlertTriangle size={24} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-sm font-black font-mono text-white uppercase tracking-widest">Buffer_Empty_Signal</h3>
                                                        <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest max-w-xs leading-relaxed">
                                                            Active {viewMode} scan requires primary {currentEra} signature. Ingest blueprint to initialize forensic trace.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col gap-5 relative">
                                {isLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <div className="relative">
                                            <Loader2 size={48} className="text-[#22d3ee] animate-spin mb-4" />
                                            <div className="absolute inset-0 blur-2xl bg-[#22d3ee]/10 animate-pulse" />
                                        </div>
                                        <p className="text-xs font-black font-mono uppercase tracking-[0.6em] text-white">Synthesizing Topology...</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col gap-4">
                                        <div className="flex justify-between items-center z-40">
                                            <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-white/10 shadow-xl">
                                                {[
                                                    { id: '2D', icon: Layers, label: 'Lattice Map' },
                                                    { id: 'XRAY', icon: Scan, label: 'Thermal X-Ray' },
                                                    { id: '3D', icon: BoxSelect, label: 'Exploded View' },
                                                    { id: 'SCHEMATIC', icon: Binary, label: 'Trace Logic' }
                                                ].map(btn => (
                                                    <button key={btn.id} onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${viewMode === btn.id ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-gray-300'}`}><btn.icon size={12} /> {btn.label}</button>
                                                ))}
                                            </div>
                                            <button onClick={() => setHardwareState({ schematicImage: null })} className="p-2.5 text-gray-600 hover:text-white bg-[#0a0a0a] border border-white/10 rounded-xl transition-all active:scale-90"><RotateCcw size={16}/></button>
                                        </div>
                                        <div className="flex-1 relative rounded-[2rem] border border-white/5 bg-[#050505] overflow-hidden shadow-2xl flex items-center justify-center group/viewport">
                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px:30px] pointer-events-none opacity-20" />
                                            <ComputeFluxOverlay active={showComputeFlux} speed={clockSpeed / 2.5} color={eraColor} />
                                            
                                            <AnimatePresence mode="wait">
                                                {viewMode === '2D' && (
                                                    <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full p-12 flex items-center justify-center relative">
                                                        {schematicImage && (
                                                            <img src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5 opacity-80 group-hover/viewport:opacity-100 transition-opacity duration-700" alt="2D Schematic" />
                                                        )}
                                                    </motion.div>
                                                )}

                                                {viewMode === 'XRAY' && (
                                                    <motion.div key="xray" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full p-8 flex gap-6 overflow-hidden">
                                                        <div className="flex-1 relative border border-white/5 rounded-2xl bg-black overflow-hidden flex items-center justify-center shadow-inner group/xray-img">
                                                            {xrayImage ? (
                                                                <img src={xrayImage} className="max-w-full max-h-full object-contain mix-blend-screen animate-pulse" style={{ filter: `hue-rotate(${stressLevel}deg) contrast(1.5)` }} alt="X-Ray View" />
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center opacity-10">
                                                                    <Monitor size={80} />
                                                                    <span className="text-sm font-mono mt-6">Thermal Buffer Empty</span>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="absolute inset-0 p-6 pointer-events-none">
                                                                <div className="flex flex-col gap-3">
                                                                    <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-500 text-[8px] font-black uppercase tracking-widest w-fit flex items-center gap-1.5">
                                                                        <AlertTriangle size={10} className="animate-pulse" />
                                                                        Thermal Anomaly
                                                                    </div>
                                                                    <div className="p-3.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl w-48 space-y-2.5 pointer-events-auto shadow-2xl">
                                                                        <div className="flex justify-between text-[7px] font-mono text-gray-500 uppercase tracking-widest"><span>Hotspot_01</span><span>{Math.round(40 + stressLevel * 0.6)}°C</span></div>
                                                                        <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: `${Math.min(100, 40 + stressLevel)}%` }} className="h-full bg-orange-500" /></div>
                                                                        <p className="text-[8px] font-mono text-gray-500 italic leading-tight">Component saturation detected.</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="w-[240px] flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                                            <div className="p-4 bg-black border border-white/5 rounded-xl space-y-3">
                                                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Thermometer size={12} className="text-orange-500" /> Forensic Scan</h4>
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-end"><span className="text-[8px] font-mono text-gray-600 uppercase">Entropy Delta</span><span className="text-[10px] font-black font-mono text-orange-400">+{ (stressLevel/12).toFixed(1) }%</span></div>
                                                                    <div className="flex justify-between items-end"><span className="text-[8px] font-mono text-gray-600 uppercase">Cortex Temp</span><span className="text-[10px] font-black font-mono text-white">{Math.round(35 + stressLevel * 0.45)}°C</span></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 bg-[#100a05] border border-orange-500/10 rounded-xl p-4 relative overflow-hidden group/audit">
                                                                <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover/audit:opacity-5 transition-opacity"><Fingerprint size={60} className="text-orange-500" /></div>
                                                                <h4 className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-3">Neural Auditor</h4>
                                                                <p className="text-[10px] font-mono text-orange-200/60 leading-relaxed italic border-l border-orange-500/30 pl-3">
                                                                    "Current offset creating ion migration. Recommended fan ramp to stabilize."
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {viewMode === '3D' && (
                                                    <motion.div key="3d" initial={{ opacity: 0, rotateY: 30 }} animate={{ opacity: 1, rotateY: 0 }} className="w-full h-full p-12 flex items-center justify-center perspective-1000">
                                                        {isometricImage ? (
                                                            <motion.img src={isometricImage} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="max-w-full max-h-full object-contain rounded-2xl drop-shadow-3xl" alt="3D Render" />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-5 opacity-15">
                                                                <Box size={64} />
                                                                <div className="text-gray-500 font-mono text-[8px] uppercase tracking-[0.4em]">Synthesizing 3D Model...</div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}

                                                {viewMode === 'SCHEMATIC' && (
                                                    <motion.div key="schem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
                                                        <div className="max-w-4xl mx-auto space-y-8">
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500"><Binary size={20} /></div>
                                                                    <div>
                                                                        <h2 className="text-base font-black uppercase tracking-widest text-white">Logic Trace Archive</h2>
                                                                        <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-0.5">Sovereign Architecture v9.2_SYNC</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="px-3 py-1.5 bg-black border border-white/5 rounded-lg text-[8px] font-black font-mono text-emerald-500 flex items-center gap-2"><ShieldCheck size={12}/> Integrity: Valid</div>
                                                                    <div className="px-3 py-1.5 bg-black border border-white/5 rounded-lg text-[8px] font-black font-mono text-cyan-400 flex items-center gap-2"><Cpu size={12}/> Nodes: {analysis?.components?.length || 0}</div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-12 gap-8">
                                                                <div className="col-span-7 space-y-4">
                                                                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1.5"><Target size={12} className="text-[#22d3ee]" /> Hardware Vectors</h3>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {analysis?.components?.map((c: any, i: number) => (
                                                                            <motion.div 
                                                                                key={i} 
                                                                                whileHover={{ scale: 1.01 }}
                                                                                onClick={() => fetchSupplyChain(c.name)}
                                                                                className="p-3.5 bg-black border border-white/5 rounded-xl hover:border-[#22d3ee]/30 transition-all cursor-pointer group/comp relative overflow-hidden"
                                                                            >
                                                                                <div className="flex justify-between items-start mb-3 relative z-10">
                                                                                    <div className="p-2 bg-white/5 rounded-lg text-gray-600 group-hover/comp:text-[#22d3ee] transition-all"><Box size={14} /></div>
                                                                                    <span className="text-[7px] text-[#10b981] font-mono font-black">{(c.confidence * 100).toFixed(0)}%</span>
                                                                                </div>
                                                                                <div className="text-[9px] font-black text-white uppercase group-hover/comp:text-[#22d3ee] transition-colors mb-1.5 truncate">{c.name}</div>
                                                                                <div className="flex items-center gap-1.5 text-[7px] font-mono text-gray-600 group-hover/comp:text-gray-400">
                                                                                    <Search size={8}/> Trace Node
                                                                                </div>
                                                                            </motion.div>
                                                                        )) || (
                                                                            <div className="col-span-2 py-12 text-center text-gray-800 font-mono uppercase tracking-[0.3em] text-[9px]">Buffer Empty</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="col-span-5 space-y-6">
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1.5"><Microscope size={12} className="text-emerald-500" /> Structural Briefing</h3>
                                                                        <div className="p-5 bg-black/60 border border-white/5 rounded-2xl text-[11px] font-mono text-gray-400 leading-relaxed italic border-l-2 border-l-emerald-500 shadow-xl">
                                                                            "{analysis?.summary || "Vector alignment confirmed. Logic bus shows minimal occupancy. Structural integrity verified."}"
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1.5"><GitBranch size={12} className="text-orange-400" /> Logic Simulation</h3>
                                                                        <div className="p-4 bg-black border border-white/5 rounded-2xl space-y-4 shadow-lg">
                                                                            {[
                                                                                { label: 'Signal Noise', val: 12, color: '#f59e0b' },
                                                                                { label: 'Clock Skew', val: 4, color: '#ef4444' }
                                                                            ].map(stat => (
                                                                                <div key={stat.label} className="space-y-1.5">
                                                                                    <div className="flex justify-between text-[7px] font-mono text-gray-600 uppercase"><span>{stat.label}</span><span>{stat.val} ps</span></div>
                                                                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div animate={{ width: `${stat.val * 5}%` }} className="h-full" style={{ backgroundColor: stat.color }} /></div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Tactical Sidebar - Narrower */}
                <div className="w-[300px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 z-30 shadow-2xl relative">
                    <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5"><SlidersHorizontal size={14} className="text-[#22d3ee]" /><h2 className="text-[9px] font-black text-white uppercase tracking-widest">Tuning</h2></div>
                            <span className="text-[6px] font-mono text-gray-700">v9.2_SYNC</span>
                        </div>
                        <div className="space-y-2">
                            <PerformanceMixer label="Clock" value={clockSpeed} unit="GHz" min={1.2} max={6.4} color={eraColor} onValueChange={setClockSpeed} />
                            <PerformanceMixer label="Voltage" value={voltage} unit="v" min={0.7} max={1.65} color="#ef4444" onValueChange={setVoltage} />
                            <PerformanceMixer label="Timing" value={timing} unit="cl" min={10} max={30} color="#f59e0b" onValueChange={setTiming} />
                            <PerformanceMixer label="Cooling" value={fanSpeed} unit=" RPM" min={0} max={6000} color="#9d4edd" onValueChange={(val: number) => setFanSpeed(val)} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center px-1"><span className="text-[8px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><DollarSign size={10} className="text-[#10b981]"/> Capital</span>{isAnalyzingFinImpact && <Loader2 size={8} className="animate-spin text-[#10b981]" />}</div>
                            <div className="p-4 bg-[#0a1a0a] border border-[#10b981]/15 rounded-2xl space-y-3 relative overflow-hidden group/fin shadow-lg">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/fin:opacity-5 transition-opacity rotate-12"><BarChart3 size={60} /></div>
                                <div className="grid grid-cols-2 gap-3 relative z-10"><div className="space-y-0.5"><span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest">Cost</span><div className="text-base font-black font-mono text-white tracking-tighter">{finTelemetry.totalBomCost > 0 ? `$${finTelemetry.totalBomCost.toLocaleString()}` : '--'}</div></div><div className="space-y-0.5 text-right"><span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest">ROI</span><div className="text-base font-black font-mono text-[#10b981] tracking-tighter">{finTelemetry.roiProjection > 0 ? `+${finTelemetry.roiProjection}%` : '--'}</div></div></div>
                                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10 shadow-inner"><motion.div animate={{ width: `${Math.min(100, (finTelemetry.roiProjection / 50) * 100)}%` }} className="h-full bg-[#10b981]" /></div>
                            </div>
                        </div>

                        <div className="space-y-2.5"><div className="flex justify-between items-center px-1"><span className="text-[8px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Thermometer size={10}/> Thermal Map</span><span className={`text-[7px] font-mono font-bold ${stressLevel > 85 ? 'text-red-500 animate-pulse' : 'text-[#f59e0b]'}`}>{stressLevel > 85 ? 'OVERLOAD' : 'NOMINAL'}</span></div><NeuralThermalGrid stressLevel={stressLevel} /></div>

                        <div className="space-y-2.5 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center px-1"><span className="text-[8px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Package size={10}/> Node Sourcing</span>{isFetchingSupply && <Loader2 size={8} className="animate-spin text-[#22d3ee]" />}</div>
                            <AnimatePresence>
                                {liveSupplyData ? (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2.5 shadow-lg">
                                        <div className="flex justify-between items-start relative z-10"><div className="flex flex-col"><span className="text-[6px] font-mono text-gray-600 uppercase mb-0.5">Source: {liveSupplyData.source}</span><span className="text-sm font-black font-mono text-[#10b981]">{liveSupplyData.price}</span></div><div className="text-right"><span className="text-[6px] font-mono text-gray-600 uppercase block mb-0.5">ETA</span><span className="text-[9px] font-black font-mono text-white">{liveSupplyData.leadTime}</span></div></div>
                                        <button onClick={() => setLiveSupplyData(null)} className="w-full py-1 bg-white/5 hover:bg-white/10 rounded text-[7px] font-black uppercase text-gray-600 hover:text-white transition-all">Flush Buffer</button>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {(bom || []).slice(0,3).map((item: any, i: number) => (
                                            <div key={i} className="p-2.5 bg-black border border-white/5 rounded-lg flex items-center justify-between group/item hover:border-[#22d3ee]/20 transition-all"><div className="flex items-center gap-2"><Box size={12} className="text-gray-700 group-hover/item:text-[#22d3ee]" /><span className="text-[8px] font-black text-gray-400 uppercase truncate max-w-[100px]">{item.name || item}</span></div><button onClick={() => fetchSupplyChain(item.name || item)} className="p-1 hover:bg-[#22d3ee]/20 text-gray-700 hover:text-[#22d3ee] rounded transition-all"><ExternalLink size={10}/></button></div>
                                        ))}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black shrink-0 space-y-4">
                        <div className="flex justify-between items-center text-[8px] font-black font-mono text-gray-700 mb-1 uppercase tracking-widest"><span>Sovereign Draw</span><span className="text-[#22d3ee] animate-pulse">ACK_OK</span></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col gap-0.5"><span className="text-[6px] text-gray-600 uppercase font-mono tracking-widest">Wattage</span><span className="text-base font-black font-mono text-white">{powerDraw}<span className="text-[8px] text-gray-700 ml-0.5">W</span></span></div>
                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col gap-0.5"><span className="text-[6px] text-gray-600 uppercase font-mono tracking-widest">Lattice Life</span><span className="text-base font-black font-mono text-[#10b981]">{mtbf.toLocaleString()}<span className="text-[8px] text-gray-700 ml-0.5">h</span></span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom HUD - Compact */}
            <div className="h-8 bg-[#0a0a0a] border-t border-[#1f1f1f] px-6 flex items-center justify-between text-[8px] font-mono text-gray-700 shrink-0 relative z-[60]">
                <div className="flex gap-8 items-center overflow-x-auto no-scrollbar whitespace-nowrap"><div className="flex items-center gap-2 text-emerald-500/80 font-bold uppercase tracking-widest"><ShieldCheck size={12} /> Secure</div><div className="flex items-center gap-2 uppercase tracking-widest"><Binary size={12} className="text-[#22d3ee]/70" /> Logic_Bus: 1.2 GHz</div><div className="flex items-center gap-2 uppercase tracking-widest"><Fan size={12} className={`${fanSpeed > 4000 ? 'animate-spin' : 'animate-spin-slow'} text-[#9d4edd]/70`} /> Cooling: {Math.round(fanSpeed/60)}%</div></div>
                <div className="flex items-center gap-6 shrink-0"><span className="uppercase tracking-[0.3em] opacity-40 leading-none hidden lg:block">Hardware OS v9.2</span><div className="h-3 w-px bg-white/5 hidden lg:block" /><span className="font-black text-gray-500 uppercase tracking-widest leading-none">OS_SYSTEM_CORE</span></div>
            </div>
        </div>
    );
};

export default HardwareEngine;