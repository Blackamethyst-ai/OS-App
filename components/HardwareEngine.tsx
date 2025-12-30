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
    <div className="flex flex-col gap-1 p-2 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-white/10 transition-all">
        <div className="flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[7px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none mb-1">{label}</span>
                <span className="text-[10px] font-black font-mono text-white tracking-tighter mt-0.5">{value}{unit}</span>
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
    { id: 'gpu-h100', era: 'SILICON', model: 'NVIDIA H100', manufacturer: 'NVIDIA', arch: 'Hopper', price: 32500, trend: +2.4, stock: 'IN_STOCK', mtbf: 45, specs: { vram: '80GB HBM3', tdp: '700W', cores: '16896 CUDA' }, bom: ['HBM3 Module', 'SXM5 Mezzanine', 'Heat Sink Unit', 'Core Processor Die'] },
    { id: 'gpu-q1', era: 'QUANTUM', model: 'Q-Tensor X1', manufacturer: 'Quantum Logic', arch: 'Q-Core', price: 85000, trend: +12.4, stock: 'LIMITED', mtbf: 12, specs: { vram: '128QB Quantum VRAM', tdp: '1200W', cores: '512 Qubits' }, bom: ['Cryo Interface', 'High-Fidelity Interconnect', 'Superconducting Logic Die', 'Vacuum Stage Control'] },
    { id: 'gpu-b1', era: 'BIOMIMETIC', model: 'Synapse V4', manufacturer: 'Synapse Corp', arch: 'Bio-Core', price: 54000, trend: +1.1, stock: 'LIMITED', mtbf: 85, specs: { vram: 'Organic Wetware 1TB', tdp: '150W', cores: '12B Synapses' }, bom: ['Neural Bus Interconnect', 'Micro-Fluidic Cooling', 'Node Logic Die', 'Electrolyte Delivery Module'] }
];

const HardwareEngine: React.FC = () => {
    const { hardware, actions, metaventions } = useAppStore();
    const { setHardwareState, addLog } = actions;
    const { currentEra, schematicImage, analysis, bom, isLoading, xrayImage, finTelemetry } = hardware;
    
    const [clockSpeed, setClockSpeed] = useState(3.4);
    const [voltage, setVoltage] = useState(1.2);
    const [fanSpeed, setFanSpeed] = useState(2200);
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
        return Math.max(10, Math.min(100, base + voltBonus - fanPenalty));
    }, [clockSpeed, voltage, fanSpeed]);

    const mtbf = useMemo(() => {
        const baseline = 50000; 
        const thermalPenalty = Math.pow(stressLevel / 40, 2.5) * 4000;
        return Math.max(4500, Math.round(baseline - thermalPenalty));
    }, [stressLevel]);

    const powerDraw = useMemo(() => (voltage * clockSpeed * 0.85 + (fanSpeed / 1000) * 15).toFixed(2), [voltage, clockSpeed, fanSpeed]);

    useVoiceExpose('hardware-fabricator', { era: currentEra, stressLevel, powerDraw, mtbf, clocks: `${clockSpeed}GHz`, activeGpu: selectedGpu?.model });

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const data = await fileToGenerativePart(file);
            setHardwareState({ schematicImage: data, isLoading: true, analysis: null, xrayImage: null });
            setIsometricImage(null);
            addLog('SYSTEM', `INGEST_INIT: Processing Blueprint [${file.name}]...`);
            try {
                if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); }
                // Fixed: explicitly typed return values for analyzeSchematic to resolve unknown property errors
                const [scan, xray, iso] = await Promise.all([
                    analyzeSchematic(data) as Promise<{components: {name: string, confidence: number}[], summary: string}>, 
                    generateXRayVariant(data), 
                    generateIsometricSchematic(data)
                ]);
                setHardwareState({ analysis: scan, xrayImage: xray, isLoading: false, bom: scan.components || [] });
                setIsometricImage(iso);
                addLog('SUCCESS', 'SCAN_COMPLETE: Infrastructure topology reconstructed.');
                audio.playSuccess();
                // Fixed: Access scan.components safely after explicit typing
                if (scan.components && scan.components.length > 0) fetchSupplyChain(scan.components[0].name);
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
        addLog('SYSTEM', `SUPPLY_SYNC: Mapping assets for "${compName}"...`);
        try {
            const data = await getLiveSupplyChainData(compName);
            setLiveSupplyData(data);
            addLog('SUCCESS', `SUPPLY_SYNC: Logistics data locked.`);
        } catch (e) { console.error(e); } finally { setIsFetchingSupply(false); }
    };

    return (
        <div className="h-full w-full bg-[#020202] text-white flex flex-col relative border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl font-sans group/hw">
            <div className="h-14 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl flex items-center justify-between px-6 z-50 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg border transition-all" style={{ backgroundColor: `${eraColor}15`, borderColor: `${eraColor}40`, color: eraColor }}>
                            <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-[11px] font-black font-mono text-white uppercase tracking-widest leading-none">D-Infrastructure Engine</h1>
                            <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mt-1 block">Production Asset Management</span>
                        </div>
                    </div>
                    <div className="h-5 w-px bg-white/5" />
                    <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                        {Object.values(TemporalEra).map(era => (
                            <button key={era} onClick={() => { setHardwareState({ currentEra: era }); audio.playClick(); }} className={`px-4 py-1.5 rounded text-[8px] font-black font-mono uppercase tracking-widest transition-all ${currentEra === era ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>{era}</button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-[#0a0a0a] p-0.5 rounded-lg border border-white/10 shadow-lg">
                        {[
                            { id: 'QUANTUM', icon: ShoppingBag, label: 'BOM' },
                            { id: '2D', icon: Layers, label: 'BLUEPRINT' },
                            { id: 'XRAY', icon: Scan, label: 'THERMAL' },
                            { id: 'SCHEMATIC', icon: Binary, label: 'LOGISTICS' }
                        ].map(btn => (
                            <button key={btn.id} onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${viewMode === btn.id ? 'bg-white text-black shadow-md scale-105' : 'text-gray-500 hover:text-gray-300'}`}><btn.icon size={11} /> {btn.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 bg-black relative flex flex-col p-6 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {viewMode === 'QUANTUM' ? (
                            <motion.div key="quantum-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="h-full flex flex-col gap-6 overflow-hidden">
                                <div className="flex justify-between items-end shrink-0">
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-tight">Component Procurement Hub</h2>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 w-64 focus-within:border-[#22d3ee] transition-all">
                                                <Search size={12} className="text-gray-600 mr-2" />
                                                <input value={gpuSearchQuery} onChange={e => setGpuSearchQuery(e.target.value)} placeholder="Filter components..." className="bg-transparent border-none outline-none text-[10px] font-mono text-white w-full uppercase placeholder:text-gray-800" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-1 pb-6">
                                    {filteredGpus.filter(g => g.model.toLowerCase().includes(gpuSearchQuery.toLowerCase())).map(gpu => (
                                        <motion.div 
                                            key={gpu.id}
                                            onClick={() => setSelectedGpu(gpu)}
                                            className={`p-5 bg-[#0a0a0a] border rounded-2xl cursor-pointer transition-all relative overflow-hidden group/gpu ${selectedGpu?.id === gpu.id ? 'border-[#22d3ee] shadow-xl' : 'border-white/5 hover:border-white/15'}`}
                                        >
                                            <div className="flex justify-between items-start mb-5">
                                                <div className="p-2 bg-white/5 rounded-xl text-gray-600 group-hover/gpu:text-[#22d3ee] transition-all"><Box size={18} /></div>
                                                <div className={`px-3 py-1 rounded-md text-[8px] font-black font-mono uppercase tracking-widest border ${gpu.stock === 'IN_STOCK' ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30' : 'text-red-500 bg-red-500/10 border-red-500/30'}`}>
                                                    {gpu.stock.replace('_', ' ')}
                                                </div>
                                            </div>
                                            <h3 className="text-[13px] font-black text-white uppercase font-mono tracking-tighter mb-1">{gpu.model}</h3>
                                            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mb-6">{gpu.manufacturer} // Infrastructure Tier</p>
                                            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                                <div>
                                                    <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Asset Value</span>
                                                    <span className="text-base font-black font-mono text-[#10b981] tracking-tighter">${gpu.price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {selectedGpu && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 200, opacity: 1 }} className="border-t border-white/10 bg-[#050505]/95 backdrop-blur-2xl -mx-6 -mb-6 p-6 flex gap-8 overflow-hidden shadow-2xl relative z-20 shrink-0">
                                            <div className="w-[280px] flex flex-col gap-3 shrink-0">
                                                <h4 className="text-[11px] font-black font-mono text-white uppercase tracking-tight">{selectedGpu.model} // BOM Specification</h4>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                                                    {selectedGpu.bom.map((item, i) => (
                                                        <div key={i} className="p-2.5 bg-black border border-white/5 rounded-xl flex items-center justify-between group/bom-item hover:border-[#22d3ee]/30 transition-all">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase truncate">{item}</span>
                                                            <button onClick={() => fetchSupplyChain(item)} className="p-1 text-gray-700 hover:text-[#22d3ee] rounded transition-all"><ExternalLink size={10}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-4">
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Asset Lifecycle Projection</span>
                                                    <button onClick={() => fetchSupplyChain(selectedGpu.model)} className="px-4 py-2 bg-[#10b981] text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg">Procure Unit</button>
                                                </div>
                                                <div className="flex-1 bg-black rounded-2xl border border-white/5 p-4 relative overflow-hidden shadow-inner">
                                                    <AreaChart data={Array.from({length: 20}, (_, i) => ({ t: i, v: 30000 + Math.random() * 5000 }))} width={450} height={100}>
                                                        <Area type="monotone" dataKey="v" stroke="#10b981" fill="rgba(16,185,129,0.08)" strokeWidth={2} />
                                                    </AreaChart>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col gap-5">
                                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-[#050505]/40 group hover:border-[#22d3ee]/20 transition-all duration-700 relative">
                                    <label className="flex flex-col items-center gap-6 cursor-pointer text-center p-12">
                                        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl">
                                            <Upload size={32} className="text-gray-700 group-hover:text-[#22d3ee] transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-lg font-black text-white font-mono uppercase tracking-[0.3em]">Import Asset Blueprint</h2>
                                            <p className="text-[9px] text-gray-600 font-mono max-w-xs mx-auto uppercase tracking-widest">Digitize physical systems into The D-Ecosystem infrastructure layer.</p>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-[320px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 z-30 shadow-2xl relative">
                    <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-5 px-1">
                            <div className="flex items-center gap-2.5"><SlidersHorizontal size={14} className="text-[#22d3ee]" /><h2 className="text-[10px] font-black text-white uppercase tracking-widest">Hardware Parameters</h2></div>
                        </div>
                        <div className="space-y-2">
                            <PerformanceMixer label="CPU FREQUENCY" value={clockSpeed} unit="GHz" min={1.2} max={6.4} color={eraColor} onValueChange={setClockSpeed} />
                            <PerformanceMixer label="POWER VOLTAGE" value={voltage} unit="v" min={0.7} max={1.65} color="#ef4444" onValueChange={setVoltage} />
                            <PerformanceMixer label="COOLING ARRAY" value={fanSpeed} unit=" RPM" min={0} max={6000} color="#9d4edd" onValueChange={(val: number) => setFanSpeed(val)} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        <div className="space-y-3">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5 px-1"><DollarSign size={12} className="text-[#10b981]"/> CapEx Management</span>
                            <div className="p-5 bg-[#0a1a0a] border border-[#10b981]/20 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                    <div className="space-y-1">
                                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Projected Cost</span>
                                        <div className="text-lg font-black font-mono text-white tracking-tighter">${finTelemetry.totalBomCost > 0 ? finTelemetry.totalBomCost.toLocaleString() : '--'}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Efficiency Yield</span>
                                        <div className="text-lg font-black font-mono text-[#10b981] tracking-tighter">{finTelemetry.roiProjection > 0 ? `+${finTelemetry.roiProjection}%` : '--'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 px-1"><span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Thermometer size={12}/> Thermal Distribution</span><NeuralThermalGrid stressLevel={stressLevel} /></div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black shrink-0 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center text-[8px] font-black font-mono text-gray-700 uppercase tracking-widest"><span>Production Load Status</span><span className="text-[#22d3ee] animate-pulse">ACK_NOMINAL</span></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-1"><span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Unit Wattage</span><span className="text-sm font-black font-mono text-white">{powerDraw}W</span></div>
                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-1"><span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Estimated Life</span><span className="text-sm font-black font-mono text-[#10b981]">{mtbf.toLocaleString()}h</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60]">
                <div className="flex gap-10 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-2 text-emerald-500/80 font-bold uppercase tracking-widest"><ShieldCheck size={14} /> D-Production Valid</div>
                    <div className="flex items-center gap-2 uppercase tracking-widest"><Binary size={14} className="text-[#22d3ee]/70" /> Bus_Sync: 1.2 GHz</div>
                </div>
                <div className="flex items-center gap-8 shrink-0">
                    <span className="font-black text-gray-500 uppercase tracking-widest leading-none">THE D-ECOSYSTEM SYSTEMS_ENGINE</span>
                </div>
            </div>
        </div>
    );
};

export default HardwareEngine;