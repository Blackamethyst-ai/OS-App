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
    ShoppingBag, History, Microscope, ExternalLink
} from 'lucide-react';
import { TemporalEra, FileData, AppMode, ImageSize, AspectRatio } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { audio } from '../services/audioService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

// --- TACTICAL HUD SUB-COMPONENTS ---

const ComputeFluxOverlay = ({ active, speed }: { active: boolean, speed: number }) => {
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
                    vx: (Math.random() - 0.5) * speed * 2,
                    vy: (Math.random() - 0.5) * speed * 2,
                    life: 1.0,
                    color: Math.random() > 0.5 ? '#22d3ee' : '#f59e0b'
                });
            }

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.01;
                if (p.life <= 0) { particles.splice(i, 1); return; }
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = p.life * 0.4;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fill();
            });
            requestAnimationFrame(render);
        };
        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, [active, speed]);

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
                temp: Math.max(30, Math.min(100, p.temp + (Math.random() * (stressLevel / 10) - (stressLevel / 20)))),
                stress: Math.max(0, Math.min(100, p.stress + (Math.random() * 10 - 5)))
            })));
        }, 1000);
        return () => clearInterval(interval);
    }, [stressLevel]);

    return (
        <div className="grid grid-cols-10 gap-0.5 w-full aspect-square bg-black border border-white/5 p-1 rounded-sm shadow-inner overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#ef4444]/5 to-transparent pointer-events-none" />
            {points.map(p => (
                <div 
                    key={p.id} 
                    className="w-full h-full transition-colors duration-[2000ms]"
                    style={{ 
                        backgroundColor: p.temp > 85 ? `rgba(239, 68, 68, ${0.4 + (p.temp-85)/15})` : `hsla(${240 - (p.temp - 30) * 3}, 80%, 40%, 0.15)`,
                        border: p.temp > 92 ? '1px solid #ef4444' : 'none'
                    }}
                />
            ))}
            {stressLevel > 90 && (
                <motion.div animate={{ opacity: [0, 0.2, 0] }} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute inset-0 bg-red-500/20 pointer-events-none" />
            )}
        </div>
    );
};

const PerformanceMixer = ({ label, value, unit, min, max, onValueChange, color }: any) => (
    <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
        <div className="flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">{label}</span>
                <span className="text-lg font-black font-mono text-white tracking-tighter">{value}{unit}</span>
            </div>
            <div className="h-6 w-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div animate={{ height: `${(value/max)*100}%` }} className="w-full bg-current mt-auto" style={{ color }} />
            </div>
        </div>
        <div className="relative h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div className="h-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }} animate={{ width: `${((value - min) / (max - min)) * 100}%` }} />
            <input type="range" min={min} max={max} step={(max-min)/100} value={value} onChange={(e) => onValueChange(parseFloat(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
    </div>
);

const DePINAllocationModule = ({ active, stressLevel }: { active: boolean, stressLevel: number }) => {
    const efficiency = useMemo(() => Math.max(0, 100 - stressLevel * 0.4), [stressLevel]);
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3"><Workflow size={14} className="text-[#9d4edd]"/> Provisioning Matrix</span>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${efficiency > 70 ? 'bg-[#10b981]' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-[8px] font-mono text-gray-400 uppercase">Eff: {efficiency.toFixed(1)}%</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { protocol: 'Akash_L3', status: 'READY', yield: '14.2%', color: '#10b981' },
                    { protocol: 'Render_GPU', status: 'IDLE', yield: '22.8%', color: '#9d4edd' },
                    { protocol: 'Helium_5G', status: 'SEARCHING', yield: '8.4%', color: '#22d3ee' },
                    { protocol: 'Lattice_POW', status: 'ACTIVE', yield: '34.1%', color: '#f59e0b' }
                ].map(node => (
                    <div key={node.protocol} className="p-4 bg-black border border-white/5 rounded-2xl hover:border-white/20 transition-all group/node cursor-pointer relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <span className="text-[9px] font-black font-mono text-gray-400 group-hover/node:text-white transition-colors">{node.protocol}</span>
                            <Target size={10} className="text-gray-700 group-hover/node:text-[var(--color)]" style={{ '--color': node.color } as any} />
                        </div>
                        <div className="flex justify-between items-end relative z-10">
                            <span className="text-xs font-bold font-mono" style={{ color: node.color }}>{node.yield} APY</span>
                            <span className="text-[7px] font-mono text-gray-600 uppercase">{node.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- QUANTUM GPU SEARCH COMPONENTS ---

const GPULibraryCard = ({ gpu, onSelect, active }: any) => (
    <motion.div 
        onClick={() => onSelect(gpu)}
        whileHover={{ scale: 1.02 }}
        className={`p-6 bg-[#0a0a0a] border rounded-[2.5rem] cursor-pointer transition-all relative overflow-hidden group/gpu ${active ? 'border-[#22d3ee] shadow-[0_0_50px_rgba(34,211,238,0.15)]' : 'border-white/5 hover:border-white/20'}`}
    >
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover/gpu:opacity-[0.08] transition-opacity rotate-12"><Cpu size={100} /></div>
        <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/5 rounded-2xl text-gray-600 group-hover/gpu:text-[#22d3ee] transition-all"><Box size={24} /></div>
            <div className={`px-3 py-1 rounded-full text-[8px] font-black font-mono uppercase tracking-widest ${gpu.stock === 'IN_STOCK' ? 'text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30' : 'text-red-500 bg-red-500/10 border border-red-500/30'}`}>{gpu.stock}</div>
        </div>
        <h3 className="text-xl font-black text-white uppercase font-mono tracking-tighter mb-2">{gpu.model}</h3>
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-6">Mfr: {gpu.manufacturer} // Architecture: {gpu.arch}</p>
        <div className="flex justify-between items-end border-t border-white/5 pt-6">
            <div>
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Current Value</span>
                <span className="text-2xl font-black font-mono text-[#10b981] tracking-tighter">${gpu.price.toLocaleString()}</span>
            </div>
            <div className="text-right">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Uptime Projection</span>
                <span className="text-xs font-bold font-mono text-white">{gpu.mtbf}k hrs</span>
            </div>
        </div>
    </motion.div>
);

const MOCK_GPUS = [
    { id: 'gpu-h100', model: 'Tensor Core H100', manufacturer: 'NVIDIA', arch: 'Hopper', price: 32500, trend: +2.4, stock: 'IN_STOCK', mtbf: 45, specs: { vram: '80GB HBM3', tdp: '700W', cores: '16896 CUDA' }, bom: ['HBM3 Memory Module', 'SXM5 Mezzanine Interface', 'Integrated Heat Sink', 'Tensor Cores Layer'] },
    { id: 'gpu-a100', model: 'Ampere A100', manufacturer: 'NVIDIA', arch: 'Ampere', price: 12400, trend: -1.2, stock: 'LOW_STOCK', mtbf: 50, specs: { vram: '80GB HBM2e', tdp: '400W', cores: '6912 CUDA' }, bom: ['HBM2e Memory', 'SXM4 Interface', 'Vapor Chamber', 'Silicon Interposer'] },
    { id: 'gpu-q1', model: 'Q-Tensor X1', manufacturer: 'Quantum Logic', arch: 'Sovereign-Q', price: 85000, trend: +12.4, stock: 'LIMITED', mtbf: 12, specs: { vram: '128QB Quantum VRAM', tdp: '1200W', cores: '512 Qubits' }, bom: ['Dilution Refrigerator Pipe', 'Superconducting Interconnect', 'Qubit Control Die', 'Vacuum Chamber Seal'] }
];

// --- MAIN HARDWARE ENGINE ---

const HardwareEngine: React.FC = () => {
    const { hardware, setHardwareState, addLog, openHoloProjector, metaventions } = useAppStore();
    const { currentEra, schematicImage, analysis, bom, isLoading, xrayImage, finTelemetry } = hardware;
    
    const chartData = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
        time: i,
        yield: 30000 + Math.random() * 5000 + (i * 200)
    })), []);

    const [clockSpeed, setClockSpeed] = useState(3.4);
    const [voltage, setVoltage] = useState(1.2);
    const [fanSpeed, setFanSpeed] = useState(2200);
    const [timing, setTiming] = useState(14);
    const [viewMode, setViewMode] = useState<'2D' | '3D' | 'SCHEMATIC' | 'XRAY' | 'QUANTUM'>('2D');
    const [showComputeFlux, setShowComputeFlux] = useState(true);
    
    const [selectedGpu, setSelectedGpu] = useState(MOCK_GPUS[0]);
    const [gpuSearchQuery, setGpuSearchQuery] = useState('');
    const [isForgingManifest, setIsForgingManifest] = useState(false);
    const [isometricImage, setIsometricImage] = useState<string | null>(null);
    const [liveSupplyData, setLiveSupplyData] = useState<any>(null);
    const [isFetchingSupply, setIsFetchingSupply] = useState(false);
    const [isAnalyzingFinImpact, setIsAnalyzingFinImpact] = useState(false);

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
                addLog('INFO', `FIN_SYNC: Hardware performance drift updated treasury projection.`);
            } catch (e) { console.error(e); } finally { setIsAnalyzingFinImpact(false); }
        }, 3000);
        return () => clearTimeout(timer);
    }, [clockSpeed, voltage, fanSpeed, schematicImage, selectedGpu, viewMode]);

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
                addLog('SUCCESS', 'DIAGNOSTIC: Multi-layer holographic scan finalized.');
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
        addLog('SYSTEM', `SUPPLY_SYNC: Querying market availability for "${compName}"...`);
        try {
            const data = await getLiveSupplyChainData(compName);
            setLiveSupplyData(data);
            addLog('SUCCESS', `SUPPLY_SYNC: Real-time pricing anchored.`);
        } catch (e) { console.error(e); } finally { setIsFetchingSupply(false); }
    };

    const handleForgeManifest = async () => {
        setIsForgingManifest(true);
        addLog('SYSTEM', 'MANIFEST_FORGE: Synthesizing provisioning spec for DePIN handoff...');
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsForgingManifest(false); return; }
            const spec = { era: currentEra, clockSpeed, voltage, fanSpeed, powerDraw, stressLevel, mtbf, gpu: selectedGpu?.model };
            const manifest = await generateHardwareDeploymentManifest(spec, bom);
            openHoloProjector({ id: `manifest-${Date.now()}`, title: 'Sovereign Deployment Manifest', type: 'TEXT', content: manifest });
            addLog('SUCCESS', 'MANIFEST_FORGE: Tactical Provisioning Protocol generated.');
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `FORGE_FAIL: ${err.message}`);
            audio.playError();
        } finally { setIsForgingManifest(false); }
    };

    return (
        <div className="h-full w-full bg-[#020202] text-white flex flex-col relative border border-[#1f1f1f] rounded-[2.5rem] overflow-hidden shadow-2xl font-sans group/hw">
            {/* Header */}
            <div className="h-20 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl flex items-center justify-between px-10 z-50 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#22d3ee]/10 border border-[#22d3ee]/40 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            <Cpu className="w-6 h-6 text-[#22d3ee]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Hardware Core</h1>
                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Tactical Fabrication Hub</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex gap-2 bg-black/60 p-1 rounded-xl border border-white/5">
                        {Object.values(TemporalEra).map(era => (
                            <button key={era} onClick={() => { setHardwareState({ currentEra: era }); audio.playClick(); }} className={`px-5 py-2 rounded-lg text-[9px] font-black font-mono uppercase tracking-widest transition-all ${currentEra === era ? 'bg-[#22d3ee] text-black shadow-lg shadow-[#22d3ee]/20' : 'text-gray-500 hover:text-white'}`}>{era}</button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-white/10 shadow-2xl">
                        {[
                            { id: 'QUANTUM', icon: ShoppingBag, label: 'Quantum GPU' },
                            { id: '2D', icon: Layers, label: 'Lattice Map' },
                            { id: 'XRAY', icon: Scan, label: 'Thermal X-Ray' },
                            { id: 'SCHEMATIC', icon: Binary, label: 'Trace Logic' }
                        ].map(btn => (
                            <button key={btn.id} onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === btn.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-gray-300'}`}><btn.icon size={14} /> {btn.label}</button>
                        ))}
                    </div>
                    <button onClick={() => setShowComputeFlux(!showComputeFlux)} className={`p-2.5 rounded-xl transition-all border ${showComputeFlux ? 'bg-[#22d3ee]/20 border-[#22d3ee]/50 text-[#22d3ee]' : 'bg-white/5 border-white/10 text-gray-500'}`} title="Toggle Compute Flux Overlay"><Zap size={18} className={showComputeFlux ? 'animate-pulse' : ''} /></button>
                    <button onClick={handleForgeManifest} disabled={isForgingManifest} className="px-6 py-2.5 bg-[#10b981] hover:bg-[#34d399] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-[0_15px_30px_rgba(16,185,129,0.2)] active:scale-95 disabled:opacity-20">{isForgingManifest ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={16}/>} Forge Manifest</button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Viewport */}
                <div className="flex-1 bg-black relative flex flex-col p-8 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03)_0%,transparent_80%)] pointer-events-none" />
                    
                    <AnimatePresence mode="wait">
                        {viewMode === 'QUANTUM' ? (
                            <motion.div key="quantum-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col gap-10 overflow-hidden">
                                <div className="flex justify-between items-end shrink-0">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-black font-mono text-white uppercase tracking-tighter">Sovereign GPU Procurement</h2>
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2 w-96 focus-within:border-[#22d3ee] transition-all">
                                                <Search size={14} className="text-gray-600 mr-3" />
                                                <input value={gpuSearchQuery} onChange={e => setGpuSearchQuery(e.target.value)} placeholder="Search node specifications..." className="bg-transparent border-none outline-none text-xs font-mono text-white w-full uppercase placeholder:text-gray-800" />
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                <History size={14} /> Last Update: 4m ago
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col gap-1 shadow-inner text-right">
                                            <span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Global Compute Index</span>
                                            <span className="text-2xl font-black font-mono text-[#22d3ee]">4.82<span className="text-sm text-gray-500 ml-1">Zetta/H</span></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-3 gap-8 overflow-y-auto custom-scrollbar pr-2 pb-10">
                                    {MOCK_GPUS.filter(g => g.model.toLowerCase().includes(gpuSearchQuery.toLowerCase())).map(gpu => (
                                        <GPULibraryCard key={gpu.id} gpu={gpu} onSelect={setSelectedGpu} active={selectedGpu?.id === gpu.id} />
                                    ))}
                                    <div className="aspect-square rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-6 group hover:border-[#9d4edd]/40 transition-all cursor-pointer bg-white/[0.01]">
                                        <div className="p-6 bg-white/5 rounded-full text-gray-700 group-hover:text-[#9d4edd] group-hover:scale-110 transition-all"><Microscope size={48} /></div>
                                        <p className="text-[11px] font-black font-mono text-gray-700 uppercase tracking-widest group-hover:text-white">Request Deep Scan for New Component</p>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {selectedGpu && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 380, opacity: 1 }} className="border-t border-white/10 bg-[#050505]/90 backdrop-blur-3xl -mx-10 -mb-10 p-10 flex gap-10 overflow-hidden shadow-[0_-20px_100px_rgba(0,0,0,0.8)] relative z-20 shrink-0">
                                            <div className="w-[420px] flex flex-col gap-6 shrink-0">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-lg font-black font-mono text-white uppercase tracking-tighter">{selectedGpu.model} // Detailed BOM</h4>
                                                    <button onClick={() => setViewMode('SCHEMATIC')} className="p-2 hover:bg-[#22d3ee]/20 text-[#22d3ee] rounded-xl transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest border border-[#22d3ee]/30"><Scan size={14} /> Open Schematic</button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                                    {selectedGpu.bom.map((item, i) => (
                                                        <div key={i} className="p-4 bg-black border border-white/5 rounded-2xl flex items-center justify-between group/bom-item hover:border-[#22d3ee]/40 transition-all shadow-lg">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] opacity-40 group-hover/bom-item:opacity-100 animate-pulse" />
                                                                <span className="text-[10px] font-black text-gray-300 uppercase truncate max-w-[200px]">{item}</span>
                                                            </div>
                                                            <button onClick={() => fetchSupplyChain(item)} className="p-1.5 hover:bg-[#22d3ee]/20 text-gray-600 hover:text-[#22d3ee] rounded-lg transition-all"><ExternalLink size={14}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-6">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <TrendingUp size={16} className="text-[#10b981]" />
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Market Value Trajectory</span>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <span className="text-[7px] text-gray-600 uppercase font-mono block mb-0.5">Price Delta</span>
                                                            <span className={`text-xs font-black font-mono ${selectedGpu.trend > 0 ? 'text-[#10b981]' : 'text-red-500'}`}>{selectedGpu.trend > 0 ? '+' : ''}{selectedGpu.trend}%</span>
                                                        </div>
                                                        <button onClick={() => fetchSupplyChain(selectedGpu.model)} className="px-5 py-2 bg-[#22d3ee] text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Direct Procurement</button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 bg-black rounded-[2rem] border border-white/5 p-6 shadow-inner relative overflow-hidden">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={chartData}>
                                                            <defs>
                                                                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                                                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <Area type="monotone" dataKey="yield" stroke="#22d3ee" fill="url(#priceGradient)" strokeWidth={2} isAnimationActive={false} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                    <div className="absolute top-4 right-6 text-[8px] font-mono text-gray-700 uppercase tracking-[0.4em]">Price_History_L0</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ) : !schematicImage ? (
                            <div className="h-full flex flex-col gap-8">
                                <div className="grid grid-cols-4 gap-6 shrink-0">
                                    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-widest"><span>Node Load</span> <Activity size={12} className="text-[#22d3ee]"/></div>
                                        <div className="text-3xl font-black font-mono text-white tracking-tighter">84.2<span className="text-sm text-gray-500 ml-1">%</span></div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: '84.2%' }} className="h-full bg-[#22d3ee]" /></div>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-widest"><span>Efficiency</span> <Zap size={12} className="text-[#f59e0b]"/></div>
                                        <div className="text-3xl font-black font-mono text-white tracking-tighter">1.22<span className="text-sm text-gray-500 ml-1">P/W</span></div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: '92%' }} className="h-full bg-[#f59e0b]" /></div>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-widest"><span>MTBF</span> <Clock size={12} className="text-[#10b981]"/></div>
                                        <div className="text-3xl font-black font-mono text-white tracking-tighter">50k<span className="text-sm text-gray-500 ml-1">hr</span></div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: '99%' }} className="h-full bg-[#10b981]" /></div>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-widest"><span>Uplink</span> <Radio size={12} className="text-[#9d4edd]"/></div>
                                        <div className="text-3xl font-black font-mono text-white tracking-tighter">4.8<span className="text-sm text-gray-500 ml-1">Gb/s</span></div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: '70%' }} className="h-full bg-[#9d4edd]" /></div>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[4rem] bg-[#050505]/40 shadow-inner group hover:border-[#22d3ee]/30 transition-all duration-1000 relative">
                                    <label className="flex flex-col items-center gap-10 cursor-pointer text-center p-20 relative z-10">
                                        <div className="w-40 h-40 rounded-[2.5rem] bg-[#0a0a0a] border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000 shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
                                            <Upload size={48} className="text-gray-700 group-hover:text-[#22d3ee] transition-colors" />
                                        </div>
                                        <div className="space-y-4">
                                            <h2 className="text-2xl font-black text-white font-mono uppercase tracking-[0.6em]">Initialize Prototype Scan</h2>
                                            <p className="text-xs text-gray-600 font-mono max-w-sm mx-auto uppercase tracking-[0.3em]">Map die topologies from logical schematics.</p>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col gap-6 relative">
                                {isLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <div className="relative">
                                            <Loader2 size={80} className="text-[#22d3ee] animate-spin mb-6" />
                                            <div className="absolute inset-0 blur-3xl bg-[#22d3ee]/20 animate-pulse" />
                                        </div>
                                        <p className="text-xl font-black font-mono uppercase tracking-[0.8em] text-white">Analyzing Lattice...</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col gap-6">
                                        <div className="flex justify-between items-center z-40">
                                            <div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                                                {[
                                                    { id: '2D', icon: Layers, label: 'Lattice Map' },
                                                    { id: 'XRAY', icon: Scan, label: 'Thermal X-Ray' },
                                                    { id: '3D', icon: BoxSelect, label: 'Exploded View' },
                                                    { id: 'SCHEMATIC', icon: Binary, label: 'Trace Logic' }
                                                ].map(btn => (
                                                    <button key={btn.id} onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === btn.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-gray-300'}`}><btn.icon size={14} /> {btn.label}</button>
                                                ))}
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => setHardwareState({ schematicImage: null })} className="p-3.5 text-gray-600 hover:text-white bg-[#0a0a0a] border border-white/10 rounded-2xl transition-all shadow-xl active:scale-90"><RotateCcw size={18}/></button>
                                                <button className="p-3.5 text-gray-600 hover:text-white bg-[#0a0a0a] border border-white/10 rounded-2xl transition-all shadow-xl active:scale-90"><Maximize2 size={18}/></button>
                                            </div>
                                        </div>
                                        <div className="flex-1 relative rounded-[3rem] border border-white/5 bg-[#050505] overflow-hidden shadow-2xl flex items-center justify-center group/viewport">
                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />
                                            <ComputeFluxOverlay active={showComputeFlux} speed={clockSpeed / 2} />
                                            <AnimatePresence mode="wait">
                                                {viewMode === '2D' && (
                                                    <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full p-20 flex items-center justify-center relative">
                                                        <img src={`data:${schematicImage.inlineData.mimeType};base64,${schematicImage.inlineData.data}`} className="max-w-full max-h-full object-contain rounded-xl shadow-[0_40px_100px_rgba(0,0,0,1)] border border-white/5 opacity-80 group-hover/viewport:opacity-100 transition-opacity duration-700" alt="2D Schematic" />
                                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1000">
                                                            {analysis?.components?.map((c: any, i: number) => {
                                                                const [ymin, xmin, ymax, xmax] = c.boundingBox;
                                                                return (
                                                                    <g key={i} className="pointer-events-auto cursor-crosshair group/box" onClick={() => fetchSupplyChain(c.name)}>
                                                                        <rect x={xmin} y={ymin} width={xmax-xmin} height={ymax-ymin} className="fill-transparent stroke-[#22d3ee]/20 group-hover/box:stroke-[#22d3ee] transition-all stroke-2" />
                                                                        <circle cx={xmin} cy={ymin} r="4" className="fill-[#22d3ee] opacity-0 group-hover/box:opacity-100 transition-opacity" />
                                                                    </g>
                                                                );
                                                            })}
                                                        </svg>
                                                    </motion.div>
                                                )}
                                                {viewMode === 'XRAY' && (
                                                    <motion.div key="xray" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full p-20 flex items-center justify-center bg-black">
                                                        {xrayImage && <img src={xrayImage} className="max-w-full max-h-full object-contain mix-blend-screen animate-pulse" style={{ filter: `hue-rotate(${stressLevel}deg)` }} alt="X-Ray View" />}
                                                        <div className="absolute top-10 left-10 text-[10px] font-mono text-[#ef4444] uppercase tracking-widest flex items-center gap-3"><Scan className="animate-pulse" size={14} /> Thermal Lattice Scan // LIVE</div>
                                                    </motion.div>
                                                )}
                                                {viewMode === '3D' && (
                                                    <motion.div key="3d" initial={{ opacity: 0, rotateY: 45 }} animate={{ opacity: 1, rotateY: 0 }} className="w-full h-full p-20 flex items-center justify-center perspective-1000">
                                                        {isometricImage ? <motion.img src={isometricImage} animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="max-w-full max-h-full object-contain rounded-3xl drop-shadow-[0_60px_150px_rgba(34,211,238,0.2)]" alt="3D Renders" /> : <div className="text-gray-700 font-mono text-sm uppercase">Synthesizing Exploded View...</div>}
                                                    </motion.div>
                                                )}
                                                {viewMode === 'SCHEMATIC' && (
                                                    <motion.div key="schem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full p-12 overflow-y-auto custom-scrollbar">
                                                        <div className="max-w-4xl mx-auto space-y-12">
                                                            <div className="flex items-center gap-6 border-b border-white/10 pb-8"><Binary className="text-[#10b981]" size={32} /><h2 className="text-2xl font-black uppercase tracking-[0.4em] text-white">Logic Trace Architecture</h2></div>
                                                            <div className="grid grid-cols-2 gap-12">
                                                                <div className="space-y-8">
                                                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest px-2">Detected Components</h3>
                                                                    <div className="space-y-4">
                                                                        {analysis?.components?.map((c: any, i: number) => (
                                                                            <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-[#22d3ee]/40 transition-all cursor-default group/comp">
                                                                                <span className="text-xs font-bold uppercase text-gray-300 group-hover/comp:text-white">{c.name}</span>
                                                                                <span className="text-[10px] text-emerald-500 font-mono font-black">[{c.confidence.toFixed(2)}]</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-8">
                                                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest px-2">Trace Summary</h3>
                                                                    <div className="p-8 bg-black/40 border border-white/10 rounded-3xl text-sm font-mono text-gray-400 leading-relaxed italic border-l-4 border-l-[#10b981] shadow-inner">"Structural vector alignment confirmed across primary logic bus. Die stress patterns indicate optimal placement for thermal dissipation at current frequency profile."</div>
                                                                    <div className="bg-[#10b981]/5 border border-[#10b981]/20 p-6 rounded-2xl space-y-3"><div className="flex items-center gap-3 text-[#10b981]"><CheckCircle2 size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Routing Verified</span></div><p className="text-[9px] text-gray-500 font-mono leading-tight">Impedance matched for high-frequency signal propagation across all identified nodes.</p></div>
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

                {/* Right Tactical Sidebar */}
                <div className="w-[420px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 z-30 shadow-2xl relative">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4"><SlidersHorizontal size={18} className="text-[#22d3ee]" /><h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Performance Overdrive</h2></div>
                            <span className="text-[8px] font-mono text-gray-600">v9.2_SYNC</span>
                        </div>
                        <div className="space-y-4">
                            <PerformanceMixer label="Core Clock Frequency" value={clockSpeed} unit="GHz" min={1.2} max={6.4} color="#22d3ee" onValueChange={setClockSpeed} />
                            <PerformanceMixer label="Core Voltage Offset" value={voltage} unit="v" min={0.7} max={1.65} color="#ef4444" onValueChange={setVoltage} />
                            <PerformanceMixer label="CAS Latency Timing" value={timing} unit="cl" min={10} max={30} color="#f59e0b" onValueChange={setTiming} />
                            <PerformanceMixer label="Thermal Exhaust Fan" value={fanSpeed} unit=" RPM" min={0} max={6000} color="#9d4edd" onValueChange={setFanSpeed} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3"><DollarSign size={14} className="text-[#10b981]"/> Treasury Impact</span>{isAnalyzingFinImpact && <Loader2 size={12} className="animate-spin text-[#10b981]" />}</div>
                            <div className="p-6 bg-[#0a1a0a] border border-[#10b981]/20 rounded-[2rem] space-y-6 relative overflow-hidden group/fin shadow-2xl transition-all hover:border-[#10b981]/40">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover/fin:opacity-10 transition-opacity rotate-12"><BarChart3 size={100} /></div>
                                <div className="grid grid-cols-2 gap-4 relative z-10"><div className="space-y-1"><span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Total BOM Cost</span><div className="text-xl font-black font-mono text-white tracking-tighter">{finTelemetry.totalBomCost > 0 ? `$${finTelemetry.totalBomCost.toLocaleString()}` : '--'}</div></div><div className="space-y-1 text-right"><span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">ROI Projected</span><div className="text-xl font-black font-mono text-[#10b981] tracking-tighter">{finTelemetry.roiProjection > 0 ? `+${finTelemetry.roiProjection}%` : '--'}</div></div></div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10 shadow-inner"><motion.div animate={{ width: `${Math.min(100, (finTelemetry.roiProjection / 50) * 100)}%` }} className="h-full bg-[#10b981] shadow-[0_0_10px_#10b981]" /></div>
                            </div>
                        </div>

                        <div className="space-y-4"><div className="flex justify-between items-center px-1"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3"><Thermometer size={14}/> Thermal Topography</span><span className={`text-[9px] font-mono font-bold ${stressLevel > 85 ? 'text-red-500 animate-pulse' : 'text-[#f59e0b]'}`}>{stressLevel > 85 ? 'OVERLOAD_DANGER' : 'NOMINAL_TEMP'}</span></div><NeuralThermalGrid stressLevel={stressLevel} /></div>
                        <DePINAllocationModule active={true} stressLevel={stressLevel} />

                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center px-2"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3"><Package size={14}/> Resource Sourcing</span>{isFetchingSupply && <Loader2 size={12} className="animate-spin text-[#22d3ee]" />}</div>
                            <AnimatePresence>
                                {liveSupplyData ? (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 relative overflow-hidden group/supply shadow-2xl">
                                        <div className="flex justify-between items-start relative z-10"><div className="flex flex-col"><span className="text-[8px] font-mono text-gray-600 uppercase mb-1">Source: {liveSupplyData.source}</span><span className="text-xl font-black font-mono text-[#10b981]">{liveSupplyData.price}</span></div><div className="text-right"><span className="text-[8px] font-mono text-gray-600 uppercase block mb-1">Lead Time</span><span className="text-sm font-black font-mono text-white">{liveSupplyData.leadTime}</span></div></div>
                                        <button onClick={() => setLiveSupplyData(null)} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all shadow-inner">Dismiss Signal</button>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-2">
                                        {(bom || []).slice(0,3).map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-black border border-white/5 rounded-xl flex items-center justify-between group/item hover:border-[#22d3ee]/40 transition-all shadow-lg"><div className="flex items-center gap-4"><Box size={16} className="text-gray-700 group-hover/item:text-[#22d3ee]" /><span className="text-[10px] font-black text-gray-300 uppercase truncate max-w-[140px]">{item.name || item.partNumber || item}</span></div><button onClick={() => fetchSupplyChain(item.name || item)} className="p-1.5 hover:bg-[#22d3ee]/20 text-gray-600 hover:text-[#22d3ee] rounded-lg transition-all"><ExternalLink size={14}/></button></div>
                                        ))}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="p-10 border-t border-white/5 bg-black shrink-0 space-y-6">
                        <div className="flex justify-between items-center text-[11px] font-black font-mono text-gray-600 mb-4 uppercase tracking-[0.2em]"><span>Sovereign Power Draw</span><span className="text-[#22d3ee] animate-pulse">Sync_OK</span></div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col gap-1 shadow-inner"><span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Estimated W</span><span className="text-2xl font-black font-mono text-white">{powerDraw}<span className="text-xs text-gray-700 ml-1">W</span></span></div>
                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col gap-1 shadow-inner"><span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Die Lifetime</span><span className="text-2xl font-black font-mono text-[#10b981]">{mtbf.toLocaleString()}<span className="text-xs text-gray-700 ml-1">h</span></span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* OS HUD Footer */}
            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f1f1f] px-12 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap"><div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]"><ShieldCheck size={18} className="shadow-[0_0_15px_#10b981]" /> Silicon_Secure</div><div className="flex items-center gap-4 uppercase tracking-[0.4em]"><Binary size={18} className="text-[#22d3ee]" /> Logic_Bus: 1.2 GHz</div><div className="flex items-center gap-4 uppercase tracking-[0.4em]"><Fan size={18} className={`${fanSpeed > 4000 ? 'animate-spin' : 'animate-spin-slow'} text-[#9d4edd]`} /> Active_Cooling: {Math.round(fanSpeed/60)}%</div></div>
                <div className="flex items-center gap-12 shrink-0"><span className="uppercase tracking-[0.6em] opacity-40 leading-none hidden lg:block text-[9px]">Sovereign Hardware Architecture v9.2 // Prototyping Division</span><div className="h-6 w-px bg-white/10 hidden lg:block" /><span className="font-black text-gray-400 uppercase tracking-[0.3em] leading-none text-[10px]">OS_SYSTEM_CORE</span></div>
            </div>
        </div>
    );
};

export default HardwareEngine;