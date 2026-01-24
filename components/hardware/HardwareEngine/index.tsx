import { apiKeyService } from '../../../services/apiKeyService';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '../../../store';
import {
    analyzeSchematic, researchComponents, fileToGenerativePart,
    promptSelectKey, generateXRayVariant, generateIsometricSchematic,
    getLiveSupplyChainData, generateHardwareDeploymentManifest, analyzeCrossSectorImpact
} from '../../../services/geminiService';
import { fetchLivePrice, fetchBatchPrices, clearPriceCache, getCacheStats } from '../../../services/gpuPricingService';
import { GPU_CATALOG, getGpusByEra, getGpuById, getGpusByTier } from '../../../data/gpuCatalog';
import { enrichGpuData, calculateMTBF, calculateDynamicMTBF, calculatePowerDraw, getEraColor } from '../../../utils/hardwareCalculations';
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
    GitBranch, GitCommit, Filter
} from 'lucide-react';
import { TemporalEra, FileData, AppMode, ImageSize, AspectRatio, StoredArtifact, GpuSpec, GpuTier, LiveGpuPrice, GpuWithLiveData } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceExpose } from '../../../hooks/useVoiceExpose';
import { audio } from '../../../services/audioService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ProcurementModal from '../ProcurementModal';

// Extracted sub-components
import { ComputeFluxOverlay, NeuralThermalGrid, PerformanceMixer, GpuCard, GpuDetailPanel, TelemetrySidebar } from './parts';

const HardwareEngine: React.FC = () => {
    const { hardware, actions, metaventions } = useAppStore();
    const { setHardwareState, addLog } = actions;
    const {
        currentEra, schematicImage, analysis, bom, isLoading, xrayImage, finTelemetry,
        livePrices: storedPrices, selectedGpuId, tierFilter: storedTierFilter, gpuSearchQuery: storedSearchQuery,
        searchHistory, filters, recommendations
    } = hardware;

    const [clockSpeed, setClockSpeed] = useState(3.4);
    const [voltage, setVoltage] = useState(1.2);
    const [fanSpeed, setFanSpeed] = useState(2200);
    const [viewMode, setViewMode] = useState<'2D' | '3D' | 'SCHEMATIC' | 'XRAY' | 'QUANTUM'>('QUANTUM');
    const [showComputeFlux, setShowComputeFlux] = useState(true);

    const eraColor = useMemo(() => getEraColor(currentEra), [currentEra]);

    // Convert stored prices to Map for efficient lookups
    const livePrices = useMemo(() => {
        const map = new Map<string, LiveGpuPrice>();
        for (const [model, price] of Object.entries(storedPrices)) {
            map.set(model, price as LiveGpuPrice);
        }
        return map;
    }, [storedPrices]);

    // Tier filter from store
    const tierFilter = storedTierFilter as GpuTier | null;
    const setTierFilter = useCallback((tier: GpuTier | null) => {
        setHardwareState({ tierFilter: tier });
    }, [setHardwareState]);

    // Live pricing state (local for loading indicator)
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [lastPriceUpdate, setLastPriceUpdate] = useState<number | null>(null);
    const [cacheStats, setCacheStats] = useState(() => getCacheStats());

    // Filter GPUs by era and tier
    const filteredGpus = useMemo(() => {
        let gpus = getGpusByEra(currentEra as 'SILICON' | 'QUANTUM' | 'BIOMIMETIC');
        if (tierFilter && currentEra === 'SILICON') {
            gpus = gpus.filter(g => g.tier === tierFilter);
        }
        return gpus.map(gpu => enrichGpuData(gpu, livePrices.get(gpu.model)));
    }, [currentEra, tierFilter, livePrices]);

    // Selected GPU from store - uses getGpuById helper
    const selectedGpu = useMemo(() => {
        if (selectedGpuId) {
            const gpu = getGpuById(selectedGpuId);
            if (gpu) return enrichGpuData(gpu, livePrices.get(gpu.model));
        }
        return filteredGpus[0] || null;
    }, [selectedGpuId, filteredGpus, livePrices]);

    const setSelectedGpu = useCallback((gpu: GpuWithLiveData | null) => {
        setHardwareState({ selectedGpuId: gpu?.id || null });
    }, [setHardwareState]);

    // GPU search query from store with history tracking
    const gpuSearchQuery = storedSearchQuery || '';
    const setGpuSearchQuery = useCallback((query: string) => {
        setHardwareState({ gpuSearchQuery: query });
    }, [setHardwareState]);

    // Add search to history when user finishes typing (debounced)
    const saveSearchToHistory = useCallback((query: string) => {
        if (query.length >= 2 && !searchHistory.includes(query)) {
            const newHistory = [query, ...searchHistory].slice(0, 10); // Keep last 10 searches
            setHardwareState({ searchHistory: newHistory });
        }
    }, [searchHistory, setHardwareState]);

    // Calculate maintenance estimate based on selected GPU MTBF
    const maintenanceEst = useMemo(() => {
        if (!selectedGpu) return 0;
        // Estimate based on replacement cost and MTBF
        // Annual maintenance = (GPU cost / MTBF hours) * 8760 hours/year
        const gpuCost = selectedGpu.livePrice?.price || selectedGpu.msrp;
        const annualMaintenance = (gpuCost / selectedGpu.mtbf) * 8760;
        return Math.round(annualMaintenance);
    }, [selectedGpu]);
    const [isometricImage, setIsometricImage] = useState<string | null>(null);
    const [liveSupplyData, setLiveSupplyData] = useState<any>(null);
    const [isFetchingSupply, setIsFetchingSupply] = useState(false);

    // AI Analysis states
    const [isResearchingComponents, setIsResearchingComponents] = useState(false);
    const [componentResearch, setComponentResearch] = useState<any>(null);
    const [isGeneratingManifest, setIsGeneratingManifest] = useState(false);
    const [deploymentManifest, setDeploymentManifest] = useState<any>(null);
    const [isAnalyzingImpact, setIsAnalyzingImpact] = useState(false);
    const [crossSectorImpact, setCrossSectorImpact] = useState<any>(null);

    // Procurement modal state
    const [isProcurementOpen, setIsProcurementOpen] = useState(false);
    const [procurementGpu, setProcurementGpu] = useState<GpuWithLiveData | null>(null);

    const handleOpenProcurement = useCallback((gpu: GpuWithLiveData) => {
        setProcurementGpu(gpu);
        setIsProcurementOpen(true);
    }, []);

    const handleCloseProcurement = useCallback(() => {
        setIsProcurementOpen(false);
        setProcurementGpu(null);
    }, []);

    // AI Analysis Handlers
    const handleResearchComponents = useCallback(async () => {
        if (!selectedGpu) return;
        setIsResearchingComponents(true);
        addLog('SYSTEM', `AI_RESEARCH: Analyzing component architecture for ${selectedGpu.model}...`);
        try {
            if (!apiKeyService.hasGeminiKey()) await promptSelectKey();
            const research = await researchComponents(selectedGpu.bom.join(', '));
            setComponentResearch(research);
            addLog('SUCCESS', 'AI_RESEARCH: Component analysis complete.');
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `AI_RESEARCH: ${err.message}`);
            audio.playError();
        } finally {
            setIsResearchingComponents(false);
        }
    }, [selectedGpu, addLog]);

    const handleGenerateManifest = useCallback(async () => {
        if (!selectedGpu) return;
        setIsGeneratingManifest(true);
        addLog('SYSTEM', `MANIFEST_GEN: Creating deployment manifest for ${selectedGpu.model}...`);
        try {
            if (!apiKeyService.hasGeminiKey()) await promptSelectKey();
            const manifest = await generateHardwareDeploymentManifest(selectedGpu.model, selectedGpu.specs);
            setDeploymentManifest(manifest);
            addLog('SUCCESS', 'MANIFEST_GEN: Deployment manifest generated.');
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `MANIFEST_GEN: ${err.message}`);
            audio.playError();
        } finally {
            setIsGeneratingManifest(false);
        }
    }, [selectedGpu, addLog]);

    const handleAnalyzeImpact = useCallback(async () => {
        if (!selectedGpu) return;
        setIsAnalyzingImpact(true);
        addLog('SYSTEM', `IMPACT_ANALYSIS: Evaluating cross-sector implications for ${selectedGpu.model}...`);
        try {
            if (!apiKeyService.hasGeminiKey()) await promptSelectKey();
            const impact = await analyzeCrossSectorImpact(selectedGpu.model, selectedGpu.tier);
            setCrossSectorImpact(impact);
            addLog('SUCCESS', 'IMPACT_ANALYSIS: Cross-sector analysis complete.');
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `IMPACT_ANALYSIS: ${err.message}`);
            audio.playError();
        } finally {
            setIsAnalyzingImpact(false);
        }
    }, [selectedGpu, addLog]);

    // Reset selected GPU when era or tier changes (only if current selection not in filtered list)
    useEffect(() => {
        if (selectedGpuId && !filteredGpus.find(g => g.id === selectedGpuId)) {
            const firstGpu = filteredGpus[0];
            setHardwareState({ selectedGpuId: firstGpu?.id || null });
        }
    }, [currentEra, tierFilter, filteredGpus, selectedGpuId, setHardwareState]);

    // Fetch live price when GPU is selected
    const fetchGpuPrice = useCallback(async (gpu: GpuSpec) => {
        if (gpu.era !== 'SILICON') return; // Only fetch for real GPUs

        setIsFetchingPrice(true);
        try {
            const price = await fetchLivePrice(gpu.model, gpu.msrp);
            // Update store with new price
            setHardwareState(prev => ({
                livePrices: { ...prev.livePrices, [gpu.model]: price }
            }));
            setLastPriceUpdate(Date.now());
        } catch (error) {
            console.error('Failed to fetch GPU price:', error);
        } finally {
            setIsFetchingPrice(false);
        }
    }, [setHardwareState]);

    // Fetch price when selected GPU changes
    useEffect(() => {
        if (selectedGpu && selectedGpu.era === 'SILICON' && !livePrices.has(selectedGpu.model)) {
            fetchGpuPrice(selectedGpu);
        }
    }, [selectedGpu, livePrices, fetchGpuPrice]);

    // Manual price refresh
    const handleRefreshPrice = useCallback(() => {
        if (selectedGpu) {
            clearPriceCache();
            setCacheStats(getCacheStats());
            fetchGpuPrice(selectedGpu);
        }
    }, [selectedGpu, fetchGpuPrice]);

    // Batch fetch all prices for visible GPUs
    const handleFetchAllPrices = useCallback(async () => {
        const siliconGpus = filteredGpus.filter(g => g.era === 'SILICON' && !livePrices.has(g.model));
        if (siliconGpus.length === 0) {
            addLog('INFO', 'PRICE_SYNC: All prices already cached.');
            return;
        }

        setIsFetchingPrice(true);
        addLog('SYSTEM', `PRICE_SYNC: Fetching ${siliconGpus.length} GPU prices...`);
        try {
            const prices = await fetchBatchPrices(siliconGpus.map(g => ({ model: g.model, msrp: g.msrp })));
            const priceObj: Record<string, any> = {};
            prices.forEach((price, model) => { priceObj[model] = price; });
            setHardwareState(prev => ({
                livePrices: { ...prev.livePrices, ...priceObj }
            }));
            setLastPriceUpdate(Date.now());
            setCacheStats(getCacheStats());
            addLog('SUCCESS', `PRICE_SYNC: ${prices.size} prices updated.`);
            audio.playSuccess();
        } catch (error) {
            console.error('Batch price fetch failed:', error);
            addLog('ERROR', 'PRICE_SYNC: Batch fetch failed.');
            audio.playError();
        } finally {
            setIsFetchingPrice(false);
        }
    }, [filteredGpus, livePrices, setHardwareState, addLog]);

    const stressLevel = useMemo(() => {
        const base = (clockSpeed - 1) * 20;
        const voltBonus = (voltage - 0.8) * 50;
        const fanPenalty = (fanSpeed / 6000) * 40;
        return Math.max(10, Math.min(100, base + voltBonus - fanPenalty));
    }, [clockSpeed, voltage, fanSpeed]);

    // Dynamic MTBF based on current stress level - uses shared utility
    const mtbf = useMemo(() => calculateDynamicMTBF(stressLevel), [stressLevel]);

    // Power draw calculation - uses shared utility
    const powerDraw = useMemo(() => calculatePowerDraw(voltage, clockSpeed, fanSpeed).toString(), [voltage, clockSpeed, fanSpeed]);

    useVoiceExpose('hardware-fabricator', { era: currentEra, stressLevel, powerDraw, mtbf, clocks: `${clockSpeed}GHz`, activeGpu: selectedGpu?.model });

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const data = await fileToGenerativePart(file);
            setHardwareState({ schematicImage: data, isLoading: true, analysis: null, xrayImage: null });
            setIsometricImage(null);
            addLog('SYSTEM', `INGEST_INIT: Processing Blueprint [${file.name}]...`);
            try {
                if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); }
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
                    {/* Compute Flux Toggle */}
                    <button
                        onClick={() => { setShowComputeFlux(!showComputeFlux); audio.playClick(); }}
                        className={`p-2 rounded-lg border transition-all ${showComputeFlux ? 'bg-[#22d3ee]/10 border-[#22d3ee]/40 text-[#22d3ee]' : 'bg-[#0a0a0a] border-white/10 text-gray-600 hover:text-white'}`}
                        title="Toggle Compute Flux Visualization"
                    >
                        <Activity size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 bg-black relative flex flex-col p-6 overflow-hidden">
                    {/* Compute Flux Overlay - Particle visualization */}
                    <ComputeFluxOverlay active={showComputeFlux} speed={stressLevel / 20} color={eraColor} />
                    <AnimatePresence mode="wait">
                        {viewMode === 'QUANTUM' ? (
                            <motion.div key="quantum-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="h-full flex flex-col gap-6 overflow-hidden">
                                <div className="flex justify-between items-end shrink-0">
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-tight">Component Procurement Hub</h2>
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 w-64 focus-within:border-[#22d3ee] transition-all">
                                                    <Search size={12} className="text-gray-600 mr-2" />
                                                    <input
                                                        value={gpuSearchQuery}
                                                        onChange={e => setGpuSearchQuery(e.target.value)}
                                                        onBlur={() => saveSearchToHistory(gpuSearchQuery)}
                                                        onKeyDown={e => e.key === 'Enter' && saveSearchToHistory(gpuSearchQuery)}
                                                        placeholder="Filter components..."
                                                        className="bg-transparent border-none outline-none text-[10px] font-mono text-white w-full uppercase placeholder:text-gray-800"
                                                        list="search-history"
                                                    />
                                                </div>
                                                {/* Search history datalist */}
                                                <datalist id="search-history">
                                                    {searchHistory.map((term, i) => (
                                                        <option key={i} value={term} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            {/* Tier Filter - Only show for SILICON era */}
                                            {currentEra === 'SILICON' && (
                                                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                                                    <Filter size={10} className="text-gray-600 ml-2" />
                                                    <button
                                                        onClick={() => { setTierFilter(null); audio.playClick(); }}
                                                        className={`px-3 py-1 rounded text-[8px] font-black font-mono uppercase tracking-widest transition-all ${tierFilter === null ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                                                    >ALL</button>
                                                    {(['CONSUMER', 'WORKSTATION', 'DATACENTER'] as GpuTier[]).map(tier => (
                                                        <button
                                                            key={tier}
                                                            onClick={() => { setTierFilter(tier); audio.playClick(); }}
                                                            className={`px-3 py-1 rounded text-[8px] font-black font-mono uppercase tracking-widest transition-all ${tierFilter === tier ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                                                        >{tier}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Price refresh, cache stats, and batch fetch */}
                                    <div className="flex items-center gap-3">
                                        {/* Cache Stats */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-white/5 rounded-lg">
                                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Cache</span>
                                            <span className="text-[9px] font-bold font-mono text-[#22d3ee]">{cacheStats.entries}</span>
                                            {cacheStats.oldestEntry && (
                                                <span className="text-[7px] font-mono text-gray-700">
                                                    ({Math.round(cacheStats.oldestEntry / 60000)}m old)
                                                </span>
                                            )}
                                        </div>
                                        {lastPriceUpdate && (
                                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                                Updated {new Date(lastPriceUpdate).toLocaleTimeString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={handleFetchAllPrices}
                                            disabled={isFetchingPrice}
                                            className="px-3 py-1.5 bg-[#0a0a0a] border border-white/10 rounded-lg hover:border-[#10b981]/50 transition-all disabled:opacity-50 flex items-center gap-2"
                                            title="Fetch all prices"
                                        >
                                            <Download size={11} className="text-gray-500" />
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Fetch All</span>
                                        </button>
                                        <button
                                            onClick={handleRefreshPrice}
                                            disabled={isFetchingPrice}
                                            className="p-2 bg-[#0a0a0a] border border-white/10 rounded-lg hover:border-[#22d3ee]/50 transition-all disabled:opacity-50"
                                            title="Refresh selected price"
                                        >
                                            <RefreshCw size={12} className={`text-gray-500 ${isFetchingPrice ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-1 pb-6">
                                    {filteredGpus.filter(g => g.model.toLowerCase().includes(gpuSearchQuery.toLowerCase())).map(gpu => (
                                        <GpuCard
                                            key={gpu.id}
                                            gpu={gpu}
                                            isSelected={selectedGpu?.id === gpu.id}
                                            isFetchingPrice={isFetchingPrice}
                                            onSelect={setSelectedGpu}
                                        />
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {selectedGpu && (
                                        <GpuDetailPanel
                                            gpu={selectedGpu}
                                            onFetchSupplyChain={fetchSupplyChain}
                                            onOpenProcurement={handleOpenProcurement}
                                        />
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ) : viewMode === '2D' ? (
                            /* BLUEPRINT VIEW - Technical Schematic Analysis */
                            <motion.div key="blueprint-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="h-full flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-tight">Technical Blueprint</h2>
                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">Architecture visualization & schematic analysis</p>
                                    </div>
                                </div>

                                {schematicImage || isometricImage || xrayImage ? (
                                    <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
                                        {schematicImage && (
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex flex-col">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">Source Schematic</span>
                                                <div className="flex-1 relative rounded-xl overflow-hidden">
                                                    <img src={`data:${schematicImage.mimeType};base64,${schematicImage.data}`} className="w-full h-full object-contain" alt="Schematic" />
                                                </div>
                                            </div>
                                        )}
                                        {isometricImage && (
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex flex-col">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">Isometric Render</span>
                                                <div className="flex-1 relative rounded-xl overflow-hidden">
                                                    <img src={isometricImage} className="w-full h-full object-contain" alt="Isometric" />
                                                </div>
                                            </div>
                                        )}
                                        {xrayImage && (
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex flex-col">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">X-Ray Analysis</span>
                                                <div className="flex-1 relative rounded-xl overflow-hidden">
                                                    <img src={xrayImage} className="w-full h-full object-contain" alt="X-Ray" />
                                                </div>
                                            </div>
                                        )}
                                        {analysis && (
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex flex-col">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">Analysis Summary</span>
                                                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{analysis.summary}</p>
                                                {analysis.components.length > 0 && (
                                                    <div className="mt-4 space-y-1">
                                                        <span className="text-[7px] text-gray-600 uppercase tracking-widest">Detected Components</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {analysis.components.map((c, i) => (
                                                                <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-mono text-gray-400">{c}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-[#050505]/40 group hover:border-[#22d3ee]/20 transition-all">
                                        <label className="flex flex-col items-center gap-6 cursor-pointer text-center p-12">
                                            <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl">
                                                <Upload size={32} className="text-gray-700 group-hover:text-[#22d3ee] transition-colors" />
                                            </div>
                                            <div className="space-y-2">
                                                <h2 className="text-lg font-black text-white font-mono uppercase tracking-[0.3em]">Import Blueprint</h2>
                                                <p className="text-[9px] text-gray-600 font-mono max-w-xs mx-auto uppercase tracking-widest">Upload a schematic for AI-powered analysis and visualization.</p>
                                            </div>
                                            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                        </label>
                                    </div>
                                )}
                            </motion.div>
                        ) : viewMode === 'XRAY' ? (
                            /* THERMAL VIEW - Power & Thermal Analysis */
                            <motion.div key="thermal-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="h-full flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-tight">Thermal Analysis</h2>
                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">Power distribution & heat dissipation modeling</p>
                                    </div>
                                    <div className="flex items-center gap-3 px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl">
                                        <Thermometer size={14} className="text-amber-500" />
                                        <span className="text-[10px] font-black font-mono text-white">{stressLevel.toFixed(0)}% Load</span>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    {/* Large Thermal Grid */}
                                    <div className="col-span-2 bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-4">Heat Distribution Matrix</span>
                                        <div className="flex-1 relative">
                                            <NeuralThermalGrid stressLevel={stressLevel} />
                                        </div>
                                    </div>

                                    {/* Power Metrics */}
                                    <div className="space-y-4">
                                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Power Draw</span>
                                            <div className="mt-3 text-3xl font-black font-mono text-[#22d3ee]">{powerDraw}W</div>
                                            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-[#22d3ee] to-[#9d4edd] rounded-full transition-all" style={{ width: `${Math.min(100, (parseFloat(powerDraw) / 500) * 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">MTBF Estimate</span>
                                            <div className="mt-3 text-3xl font-black font-mono text-[#10b981]">{mtbf.toLocaleString()}h</div>
                                            <p className="text-[8px] text-gray-600 mt-2">Based on current thermal profile</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Cooling Efficiency</span>
                                            <div className="mt-3 text-3xl font-black font-mono text-[#9d4edd]">{fanSpeed} RPM</div>
                                            <p className="text-[8px] text-gray-600 mt-2">{fanSpeed > 4000 ? 'High performance mode' : fanSpeed > 2000 ? 'Balanced cooling' : 'Silent operation'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : viewMode === 'SCHEMATIC' ? (
                            /* LOGISTICS VIEW - Supply Chain & Procurement */
                            <motion.div key="logistics-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="h-full flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-black font-mono text-white uppercase tracking-tight">Supply Chain Logistics</h2>
                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">Procurement pipeline & vendor network</p>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
                                    {/* Supply Chain Data */}
                                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Live Supply Data</span>
                                            {isFetchingSupply && <Loader2 size={12} className="text-[#22d3ee] animate-spin" />}
                                        </div>
                                        {liveSupplyData ? (
                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                    <span className="text-[7px] text-gray-600 uppercase tracking-widest">Lead Time</span>
                                                    <div className="text-sm font-black font-mono text-white mt-1">{liveSupplyData.leadTime || '2-4 weeks'}</div>
                                                </div>
                                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                    <span className="text-[7px] text-gray-600 uppercase tracking-widest">Primary Vendor</span>
                                                    <div className="text-sm font-black font-mono text-white mt-1">{liveSupplyData.vendor || 'Direct from Manufacturer'}</div>
                                                </div>
                                                {liveSupplyData.summary && (
                                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                        <span className="text-[7px] text-gray-600 uppercase tracking-widest">Market Intelligence</span>
                                                        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">{liveSupplyData.summary}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                                <Network size={48} className="text-gray-700 mb-4" />
                                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Select a component from BOM to view supply chain data</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Procurement Status */}
                                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-4">Procurement Pipeline</span>
                                        {selectedGpu ? (
                                            <div className="flex-1 space-y-3">
                                                <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <CheckCircle2 size={16} className="text-[#10b981]" />
                                                        <span className="text-[10px] font-black text-white uppercase">{selectedGpu.model}</span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-500">{selectedGpu.manufacturer} • {selectedGpu.arch}</p>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="text-lg font-black font-mono text-[#10b981]">${(selectedGpu.livePrice?.price || selectedGpu.msrp).toLocaleString()}</span>
                                                        <span className={`text-[8px] font-mono px-2 py-1 rounded ${selectedGpu.livePrice?.stock === 'IN_STOCK' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-amber-500/20 text-amber-500'}`}>
                                                            {selectedGpu.livePrice?.stock === 'IN_STOCK' ? 'Ready to Ship' : 'Lead Time Applies'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-[7px] text-gray-600 uppercase tracking-widest">BOM Components</span>
                                                    {selectedGpu.bom.slice(0, 4).map((item, i) => (
                                                        <div key={i} className="p-2 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                                                            <span className="text-[9px] font-mono text-gray-400">{item}</span>
                                                            <button onClick={() => fetchSupplyChain(item)} className="text-[7px] text-[#22d3ee] hover:underline">Track</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center opacity-40">
                                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">No GPU selected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* FALLBACK - Upload Interface */
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
                                        <div className="text-lg font-black font-mono text-white tracking-tighter">${finTelemetry.totalBomCost > 0 ? finTelemetry.totalBomCost.toLocaleString() : selectedGpu ? (selectedGpu.livePrice?.price || selectedGpu.msrp).toLocaleString() : '--'}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Efficiency Yield</span>
                                        <div className="text-lg font-black font-mono text-[#10b981] tracking-tighter">{finTelemetry.roiProjection > 0 ? `+${finTelemetry.roiProjection}%` : '--'}</div>
                                    </div>
                                </div>
                                {/* Maintenance Estimate */}
                                <div className="pt-2 border-t border-[#10b981]/10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Annual Maintenance Est.</span>
                                        <div className="text-sm font-black font-mono text-amber-500/80">${maintenanceEst > 0 ? maintenanceEst.toLocaleString() : '--'}/yr</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 px-1"><span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Thermometer size={12}/> Thermal Distribution</span><NeuralThermalGrid stressLevel={stressLevel} /></div>

                        {/* AI Analysis Tools */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5 px-1">
                                <FlaskConical size={12} className="text-[#9d4edd]"/> AI Analysis
                            </span>
                            <div className="space-y-2">
                                <button
                                    onClick={handleResearchComponents}
                                    disabled={!selectedGpu || isResearchingComponents}
                                    className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:border-[#9d4edd]/30 hover:bg-[#9d4edd]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                                >
                                    {isResearchingComponents ? (
                                        <Loader2 size={14} className="text-[#9d4edd] animate-spin" />
                                    ) : (
                                        <Microscope size={14} className="text-gray-600 group-hover:text-[#9d4edd] transition-colors" />
                                    )}
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Research Components</span>
                                </button>
                                <button
                                    onClick={handleGenerateManifest}
                                    disabled={!selectedGpu || isGeneratingManifest}
                                    className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:border-[#22d3ee]/30 hover:bg-[#22d3ee]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                                >
                                    {isGeneratingManifest ? (
                                        <Loader2 size={14} className="text-[#22d3ee] animate-spin" />
                                    ) : (
                                        <FileText size={14} className="text-gray-600 group-hover:text-[#22d3ee] transition-colors" />
                                    )}
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Generate Manifest</span>
                                </button>
                                <button
                                    onClick={handleAnalyzeImpact}
                                    disabled={!selectedGpu || isAnalyzingImpact}
                                    className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:border-[#10b981]/30 hover:bg-[#10b981]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                                >
                                    {isAnalyzingImpact ? (
                                        <Loader2 size={14} className="text-[#10b981] animate-spin" />
                                    ) : (
                                        <Target size={14} className="text-gray-600 group-hover:text-[#10b981] transition-colors" />
                                    )}
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Analyze Impact</span>
                                </button>
                            </div>
                            {/* Analysis Results Preview */}
                            {(componentResearch || deploymentManifest || crossSectorImpact) && (
                                <div className="p-3 bg-[#0a0a0a] border border-white/10 rounded-xl space-y-2">
                                    <span className="text-[7px] text-gray-600 uppercase tracking-widest">Latest Analysis</span>
                                    {componentResearch && (
                                        <div className="text-[8px] text-gray-400 truncate">
                                            <span className="text-[#9d4edd]">Components:</span> {typeof componentResearch === 'string' ? componentResearch.slice(0, 50) : 'Complete'}...
                                        </div>
                                    )}
                                    {deploymentManifest && (
                                        <div className="text-[8px] text-gray-400 truncate">
                                            <span className="text-[#22d3ee]">Manifest:</span> {typeof deploymentManifest === 'string' ? deploymentManifest.slice(0, 50) : 'Generated'}...
                                        </div>
                                    )}
                                    {crossSectorImpact && (
                                        <div className="text-[8px] text-gray-400 truncate">
                                            <span className="text-[#10b981]">Impact:</span> {typeof crossSectorImpact === 'string' ? crossSectorImpact.slice(0, 50) : 'Analyzed'}...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black shrink-0 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center text-[8px] font-medium font-mono text-gray-600 uppercase tracking-widest"><span>System Status</span><span className="text-[#22d3ee]/70">Operational</span></div>
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

            {/* Procurement Modal */}
            {procurementGpu && (
                <ProcurementModal
                    gpu={procurementGpu}
                    isOpen={isProcurementOpen}
                    onClose={handleCloseProcurement}
                />
            )}
        </div>
    );
};

export default HardwareEngine;