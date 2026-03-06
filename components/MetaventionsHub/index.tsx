import { apiKeyService } from '../../services/apiKeyService';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useAppStore } from '../../store';
import {
    generateArchitectureImage,
    promptSelectKey,
    fileToGenerativePart,
    liveSession,
    generateStructuredWorkflow
} from '../../services/geminiService';
import { AspectRatio, ImageSize } from '../../types';
import {
    Activity, Shield, Cpu,
    Target, Loader2, RefreshCw, Upload,
    Radio, Fingerprint, Zap,
    User, Mic, MicOff, ShieldCheck,
    LineChart as ChartIcon, Download,
    FileSearch, ListChecks, Workflow, Code,
    X, Eye, EyeOff, Gauge,
    UserCircle, Anchor, Bot, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, ResponsiveContainer } from 'recharts';
import { audio } from '../../services/audioService';
import { cn } from '../../utils/cn';
// Fix: Import renderSafe to resolve missing name error during manifest visualization.
import { renderSafe } from '../../utils/renderSafe';
import DEcosystem from '../DEcosystem';
import ContextVelocityChart from '../ContextVelocityChart';
import { BiometricPanel, BiometricErrorBoundary } from '../biometric';

// Lazy load ZenithDisplay (uses three.js - ~500KB)
const ZenithDisplay = React.lazy(() => import('../ZenithDisplay').then(m => ({ default: m.ZenithDisplay })));
import { StrategicConsole } from '../StrategicConsole';
import { AdaptiveContainer, AdaptivePanel, AdaptiveRegion } from '../shared/AdaptiveContainer';
import { useAdaptiveUI } from '../../hooks/useAdaptiveUI';

// Extracted sub-components
import {
    VolumetricFog,
    DataStreamTether,
    NeuralFileStream,
    CompactMetric,
    CapitalVelocity,
    SwarmBox,
    VisionaryTicker,
    ProceduralHologram,
    Scanline,
    DirectoryPeek
} from './parts';

const MetaventionsHub: React.FC = () => {
    const actions = useAppStore(s => s.actions);
    const dashboard = useAppStore(s => s.dashboard);
    const theme = useAppStore(s => s.theme);
    const user = useAppStore(s => s.user);
    const voice = useAppStore(s => s.voice);
    const kernel = useAppStore(s => s.kernel);
    const agents = useAppStore(s => s.agents);

    // Adaptive UI integration
    const { isEnabled: auiEnabled, currentLayout, shouldShowComponent } = useAdaptiveUI();

    const sectorLoads = useMemo(() => {
        const activeCount = agents.activeAgents.length;
        const thinkingCount = agents.activeAgents.filter(a => a.status === 'THINKING').length;
        const taskCount = agents.activeAgents.reduce((acc, a) => acc + a.tasks.filter(t => t.status === 'IN_PROGRESS').length, 0);

        return {
            'agents': 20 + (activeCount * 10),
            'voice': voice.isActive ? 85 : 5,
            'vision': dashboard.isOculusView ? 90 : 10,
            'process': 10 + (taskCount * 20) + (thinkingCount * 30),
            'code': 20 + (thinkingCount * 10),
            'swarm': 30 + (activeCount * 5),
            'treasury': 50
        };
    }, [agents, voice.isActive, dashboard.isOculusView]);

    const [isSyncing, setIsSyncing] = useState(false);
    const [showBlueprint, setShowBlueprint] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const voiceCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // REAL TELEMETRY: Memoized to reduce re-renders (derived from active agent states)
    const telemetry = useMemo(() => {
        const thinkingCount = agents.activeAgents.filter(a => a.status === 'THINKING').length;
        const totalTasks = agents.activeAgents.reduce((acc, a) => acc + a.tasks.length, 0);
        const failedTasks = agents.activeAgents.reduce((acc, a) => acc + a.tasks.filter(t => t.status === 'FAILED').length, 0);

        return {
            cpu: 5 + (thinkingCount * 12.5) + (Math.random() * 2), // Jitter for realism
            net: 0.8 + (thinkingCount * 0.4),
            trust: 100 - (failedTasks * 0.5),
            entropy: Math.max(1, totalTasks * 1.5)
        };
    }, [agents.activeAgents]);

    useEffect(() => {
        const canvas = voiceCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let frameId: number;
        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width / (2 * dpr);
            const cy = canvas.height / (2 * dpr);
            const time = performance.now() / 1000;
            if (voice.isActive) {
                const freqs = liveSession.getInputFrequencies() || new Uint8Array(64);
                const avg = freqs.reduce((a, b) => a + b, 0) / freqs.length;
                const vol = avg / 255;
                ctx.beginPath();
                ctx.arc(cx, cy, 20 + vol * 8, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(157, 78, 221, ${0.2 + vol})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                const bars = 24;
                const step = (Math.PI * 2) / bars;
                for (let i = 0; i < bars; i++) {
                    const angle = i * step + time * 0.2;
                    const val = (freqs[i % freqs.length] / 255) * (10 + vol * 20);
                    const r1 = 22;
                    const r2 = 22 + val;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                    ctx.strokeStyle = i % 2 === 0 ? '#9d4edd' : '#18E6FF';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([2, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [voice.isActive]);

    const handleUplink = async () => {
        if (voice.isActive || voice.isConnecting) {
            liveSession.disconnect();
            actions.setVoiceState({ isActive: false, isConnecting: false });
            actions.addLog('SYSTEM', 'COMMS_SEVERED: Neural voice channel terminated.');
            audio.playError();
        } else {
            actions.setVoiceState({ isConnecting: true });
            try {
                if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); actions.setVoiceState({ isConnecting: false }); return; }
                await liveSession.primeAudio();
                actions.setVoiceState({ isActive: true, isConnecting: false });
                actions.addLog('SUCCESS', 'COMMS_ESTABLISHED: Voice Core online.');
                audio.playSuccess();
            } catch (e) {
                actions.setVoiceState({ isConnecting: false });
                actions.addLog('ERROR', 'COMMS_FAIL: Voice interface handshake failed.');
            }
        }
    };

    const handleGlobalSync = async () => {
        setIsSyncing(true);
        actions.addLog('SYSTEM', 'HUB_SYNC: Initiating Zenith Fidelity volumetric rendering & technical synthesis...');
        audio.playClick();
        try {
            if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); setIsSyncing(false); return; }
            const [imageUrl, manifest] = await Promise.all([
                generateArchitectureImage(
                    "ZENITH MASTERWORK: Sovereign Architect standing at the primary obsidian nexus. CGI holographic PARA drive structures seamlessly fused with a 4K photorealistic environment. Optics: f/1.4 cinematic bokeh, physically correct lighting. Indistinguishable from reality. 8K textures.",
                    AspectRatio.RATIO_16_9,
                    ImageSize.SIZE_4K,
                    dashboard.referenceImage
                ),
                generateStructuredWorkflow([], 'D-Ecosystem Protocol 2025.Q1', 'SYSTEM_ARCHITECTURE', {
                    description: "High-fidelity PARA Drive Architecture and Cloud-Infrastucture topology for cinematic AI production.",
                    context: "Ecosystem Hub Core"
                })
            ]);
            actions.setDashboardState({
                hubViewUrl: imageUrl,
                activeManifest: manifest,
                deploymentProgress: 0,
                activeStepIndex: 0
            });
            actions.addLog('SUCCESS', 'HUB_SYNC: Volumetric strategic view established.');
            audio.playSuccess();
            let progress = 0;
            const deployInterval = setInterval(() => {
                progress += 5;
                actions.setDashboardState({ deploymentProgress: progress });
                if (progress >= 100) clearInterval(deployInterval);
            }, 3000);
        } catch (e: any) {
            actions.addLog('ERROR', `SYNC_FAIL: ${e.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const runVisualIntegrityProbe = async () => {
        actions.addLog('SYSTEM', 'DIAGNOSTIC: Initializing automated visual integrity probe cycle...');
        const probes = [
            { label: 'Header Chroma', selector: 'header' },
            { label: 'Sovereign Delta Logo', selector: 'header svg' },
            { label: 'Global Search Index', selector: 'header input' },
            { label: 'Operator Identity Icon', selector: 'header .rounded-\\[2rem\\]' },
            { label: 'System Kernel Access', selector: 'header .shimmer-edge' }
        ];
        for (const probe of probes) {
            actions.setFocusedSelector(probe.selector);
            actions.addLog('INFO', `PROBING_NODE: ${probe.label.toUpperCase()} Vector Synchronization...`);
            audio.playClick();
            await new Promise(r => setTimeout(r, 2200));
        }
        actions.setFocusedSelector(null);
        actions.addLog('SUCCESS', 'DIAGNOSTIC: Universal visual alignment confirmed.');
        audio.playSuccess();
    };

    const handleAnchorSwap = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const part = await fileToGenerativePart(file);
            actions.setDashboardState({ referenceImage: part });
            actions.addLog('SUCCESS', `ANCHOR_LOAD: Biometric vector updated.`);
            audio.playSuccess();
        }
    };

    // --- AUTOPOIETIC INGESTION LOGIC ---
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setIsSyncing(true);
            audio.playClick();
            actions.addLog('SYSTEM', `VAULT_INGEST: Capturing [${file.name}] logic vectors for recursive synthesis...`);

            try {
                if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); setIsSyncing(false); return; }
                const fileData = await fileToGenerativePart(file);

                // Auto-detect domain based on file name or generic synthesis
                const manifest = await generateStructuredWorkflow([fileData], 'D-Ecosystem Protocol 2025.Q1', 'SYSTEM_ARCHITECTURE', {
                    description: `Autopoietic synthesis derived from ${file.name}. Synchronizing existing Vault intelligence with new artifact constraints.`,
                    context: "Ingestion Core"
                });

                actions.setDashboardState({
                    activeManifest: manifest,
                    deploymentProgress: 0,
                    activeStepIndex: 0
                });

                actions.addLog('SUCCESS', `LATTICE_EXPANDED: Structural logic model crystallized from ${file.name}.`);
                audio.playSuccess();

                let progress = 0;
                const deployInterval = setInterval(() => {
                    progress += 10;
                    actions.setDashboardState({ deploymentProgress: progress });
                    if (progress >= 100) clearInterval(deployInterval);
                }, 2000);
            } catch (err: any) {
                actions.addLog('ERROR', `INGEST_FAIL: ${err.message}`);
            } finally {
                setIsSyncing(false);
            }
        }
    }, [actions]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isDraggingOver) {
            setIsDraggingOver(true);
            audio.playHover();
        }
    };

    const handleDownloadMainAsset = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!dashboard.hubViewUrl) return;
        const link = document.createElement('a');
        link.href = dashboard.hubViewUrl;
        link.download = `The_D_Ecosystem_Sync_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        audio.playSuccess();
        actions.addLog('SUCCESS', 'ASSET_STUDIO: Strategic view manifest cached.');
    };

    const toggleOculus = () => {
        actions.setDashboardState({ isOculusView: !dashboard.isOculusView });
        audio.playClick();
    };

    const manifestProtocols = dashboard.activeManifest?.protocols || [];

    return (
        <BiometricErrorBoundary>
        <AdaptiveContainer
            regionId="metaventions-hub"
            enableMorphing={auiEnabled}
            showDebugOverlay={false}
            className="h-full w-full"
        >
        <div
            className="h-full w-full bg-[var(--bg-app)] flex flex-col font-sans overflow-hidden transition-all duration-700 ease-in-out relative"
            data-biometric-id="metaventions-hub"
            data-semantic-type="dashboard"
        >
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[var(--bg-app)]" />
                <VolumetricFog />
                <motion.div
                    animate={{
                        opacity: [0.03, 0.08, 0.03],
                        scale: [1, 1.1, 1],
                        background: [
                            "radial-gradient(circle at 20% 30%, var(--amethyst) 0%, transparent 50%)",
                            "radial-gradient(circle at 80% 70%, var(--cyan) 0%, transparent 50%)",
                            "radial-gradient(circle at 20% 30%, var(--amethyst) 0%, transparent 50%)"
                        ]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 blur-[120px]"
                />
                <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:60px_60px] opacity-20" />
            </div>
            <DataStreamTether />
            <AnimatePresence>
                {!dashboard.isOculusView && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="h-20 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-3xl z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--amethyst-soft)]/50 to-transparent" />
                        <div className="flex items-center gap-10 relative z-10">
                            <div className="relative group cursor-pointer" onClick={() => actions.toggleProfile(true)}>
                                <div className="w-14 h-14 rounded-[2rem] border-2 border-[var(--amethyst-soft)]/30 overflow-hidden bg-black/60 flex items-center justify-center shadow-[0_0_30px_rgba(157,78,221,0.15)] group-hover:border-[var(--amethyst-soft)] group-hover:shadow-[0_0_40px_rgba(157,78,221,0.3)] transition-all duration-700">
                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User" /> : <User size={24} className="text-gray-700" />}
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center text-[var(--amethyst-soft)] shadow-2xl"
                                >
                                    <ShieldCheck size={12} className="text-[var(--plasma-green)]" />
                                </motion.div>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-0.5 bg-[var(--amethyst-soft)]/10 border border-[var(--amethyst-soft)]/30 rounded-lg backdrop-blur-3xl shadow-inner">
                                        <span className="text-[9px] font-black text-[var(--amethyst-soft)] uppercase font-mono tracking-[0.4em] leading-none">Identity_Verified_L0</span>
                                    </div>
                                    <div className="h-1 w-8 bg-white/5 rounded-full" />
                                    <span className="text-gray-500 font-mono text-[9px] tracking-widest font-black uppercase opacity-60">Handshake Stable</span>
                                </div>
                                <h1 className="text-2xl font-black text-white uppercase font-mono tracking-tighter leading-none mt-1.5 flex items-center gap-3">
                                    The D-Ecosystem
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[var(--amethyst-soft)] shadow-[0_0_12px_var(--amethyst-soft)]" />
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-16 relative z-10">
                            <div className="flex items-center gap-12">
                                <div className="text-right group/stat">
                                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1 group-hover:text-white transition-colors">Global Lattice</span>
                                    <div className="flex items-center gap-4 mt-0.5">
                                        <span className="text-2xl font-black font-mono text-white tracking-tighter">99.99%</span>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--plasma-green)] animate-pulse shadow-[0_0_15px_var(--plasma-green)]" />
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-white/5" />
                                <div className="text-right group/stat">
                                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1 group-hover:text-white transition-colors">Neural Flux</span>
                                    <div className="flex items-center gap-4 mt-0.5">
                                        <span className="text-2xl font-black font-mono text-white tracking-tighter">{telemetry.entropy.toFixed(1)}</span>
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full animate-pulse transition-all duration-700",
                                            telemetry.entropy > 12 ? 'bg-[#ef4444] shadow-[0_0_15px_#ef4444]' : 'bg-[var(--amethyst-soft)] shadow-[0_0_15px_var(--amethyst-soft)]'
                                        )} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-6 py-8 relative bg-transparent z-10">
                {!dashboard.isOculusView && <VisionaryTicker />}
                <div className="grid grid-cols-12 gap-6 min-h-0 items-start">
                    {/* Left Column: SOC + Metrics Belt stacked */}
                    <div className={cn(
                        "flex flex-col gap-6",
                        dashboard.isOculusView ? "col-span-12" : "col-span-9"
                    )}>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={() => setIsDraggingOver(false)}
                            onDrop={handleDrop}
                            data-biometric-id="strategic-operations-center"
                            data-semantic-type="panel"
                            className={cn(
                                "crystalline shadow-[0_0_100px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col min-h-[1000px] group/soc invisible-glass border border-[var(--border-main)] transition-all duration-1000 rounded-[3rem]",
                                isDraggingOver && "border-[var(--amethyst-soft)] shadow-[0_0_80px_rgba(157,78,221,0.2)]"
                            )}>
                            {!dashboard.isOculusView && (
                                <div className="absolute top-14 left-0 w-full h-8 z-30 bg-[#0a0a0a]/40 backdrop-blur-md border-y border-white/5 overflow-hidden flex items-center">
                                    <motion.div
                                        animate={{ x: ['100%', '-100%'] }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                        className="whitespace-nowrap flex items-center gap-12"
                                    >
                                        {['INITIALIZING_PARA_DRIVE_V8', 'CLOUD_NODES_STABILIZED', 'DEPIN_EQUITY_LOCKED', 'RECURSIVE_ZETTELKASTEN_SYNC', 'IA_ORCHESTRATION_L0_OK'].map((msg, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-1 h-1 rounded-full bg-[var(--amethyst-soft)] shadow-[0_0_8px_var(--amethyst-soft)]" />
                                                <span className="text-[8px] font-black font-mono text-white/40 uppercase tracking-[0.5em]">{msg}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                </div>
                            )}
                            {/* Fingerprint scan line - same as Biometric Anchor */}
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-[2px] bg-[var(--cyan)] shadow-[0_0_20px_var(--cyan)] z-40 pointer-events-none opacity-30"
                            />
                            <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0 z-20 relative">
                                <div className="flex items-center gap-4">
                                    <Target size={18} className="text-[var(--amethyst-soft)] animate-pulse" />
                                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Strategic Operations Center</span>
                                    {dashboard.hubViewUrl && (
                                        <div className="flex items-center gap-2 px-3 py-0.5 bg-[var(--plasma-green)]/10 border border-[var(--plasma-green)]/30 rounded-full">
                                            <span className="text-[7px] font-black font-mono text-[var(--plasma-green)] uppercase tracking-widest">Zenith_Fidelity_3D</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={runVisualIntegrityProbe}
                                        className="flex items-center gap-2 px-4 py-1 rounded-full border border-[var(--cyan)]/30 bg-black/40 text-[var(--cyan)] hover:bg-[var(--cyan)]/10 transition-all"
                                    >
                                        <Gauge size={12} />
                                        <span className="text-[8px] font-mono uppercase tracking-widest font-black">Integrity Probe</span>
                                    </button>
                                    <button
                                        onClick={toggleOculus}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-1 rounded-full border transition-all",
                                            dashboard.isOculusView ? "bg-[var(--executive-gold)] border-[var(--executive-gold)] text-black" : "bg-black/40 border-white/10 text-gray-500 hover:text-white"
                                        )}
                                    >
                                        {dashboard.isOculusView ? <EyeOff size={12} /> : <Eye size={12} />}
                                        <span className="text-[8px] font-mono uppercase tracking-widest font-black">{dashboard.isOculusView ? 'Disable Oculus' : 'Oculus View'}</span>
                                    </button>
                                    {dashboard.activeManifest && (
                                        <button
                                            onClick={() => setShowBlueprint(!showBlueprint)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-1 rounded-full border transition-all",
                                                showBlueprint ? "bg-[var(--cyan)] border-[var(--cyan)] text-black shadow-[0_0_15px_var(--cyan)]" : "bg-black/40 border-white/10 text-[var(--cyan)] hover:bg-[var(--cyan)]/10"
                                            )}
                                        >
                                            <Workflow size={12} />
                                            <span className="text-[8px] font-mono uppercase tracking-widest font-black">View Blueprint</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 relative overflow-hidden bg-[#020204] group/view">
                                <AnimatePresence>
                                    {isDraggingOver && (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="absolute inset-0 z-40 bg-[var(--amethyst-soft)]/5 backdrop-blur-sm border-4 border-dashed border-[var(--amethyst-soft)]/40 flex flex-col items-center justify-center gap-8"
                                        >
                                            <div className="w-32 h-32 rounded-full bg-black border border-[var(--amethyst-soft)] flex items-center justify-center shadow-[0_0_50px_rgba(157,78,221,0.4)]">
                                                <Anchor size={48} className="text-[var(--amethyst-soft)] animate-bounce" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-black font-mono text-[var(--amethyst-soft)] uppercase tracking-[0.4em]">Anchor Forge</h3>
                                                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Release to initialize autopoietic synthesis</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <Scanline />
                                <NeuralFileStream active={!!dashboard.activeManifest} isDraggingOver={isDraggingOver} />

                                {/* Main Display Area Content */}
                                <div className="absolute inset-0 p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar z-10">


                                    <AnimatePresence mode="wait">
                                        {isSyncing ? (
                                            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-3xl">
                                                <div className="relative">
                                                    <Loader2 size={60} className="text-[var(--amethyst-soft)] animate-spin mb-6" />
                                                    <div className="absolute inset-0 blur-3xl bg-[var(--amethyst-soft)]/20 animate-pulse" />
                                                </div>
                                                <span className="text-[12px] font-black font-mono text-white uppercase tracking-[0.8em]">Synthesizing Lattice...</span>
                                            </motion.div>
                                        ) : dashboard.activeManifest && (
                                            <motion.div key="content" className="relative w-full h-full group/img-node">
                                                {dashboard.hubViewUrl ? (
                                                    <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-[var(--amethyst-soft)]" size={32} /></div>}>
                                                        <ZenithDisplay currentZenithImage={dashboard.hubViewUrl} />
                                                    </Suspense>
                                                ) : (
                                                    <div className="h-full w-full flex flex-col items-center justify-center relative bg-black/10">
                                                        <ProceduralHologram />
                                                        <div className="flex flex-col items-center gap-8 opacity-20 group-hover/view:opacity-40 transition-all duration-1000 text-center relative z-20">
                                                            <div className="relative">
                                                                <UserCircle size={100} className="animate-pulse" />
                                                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute -inset-4 border border-dashed border-white/20 rounded-full" />
                                                            </div>
                                                            <p className="text-xl font-mono uppercase tracking-[1.2em]">Sovereign Core Hub</p>
                                                            <div className="flex gap-4 justify-center">
                                                                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-mono uppercase">Idle_Lattice_L0</div>
                                                                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-mono uppercase">Context_Ready</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <AnimatePresence>
                                                    {showBlueprint && dashboard.activeManifest && (
                                                        <motion.div
                                                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                                                            className="absolute top-0 right-0 bottom-0 w-1/2 bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 z-[35] shadow-[0_0_100px_rgba(0,0,0,1)] p-12 flex flex-col gap-10"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2.5 bg-[var(--cyan)]/20 rounded-xl text-[var(--cyan)] border border-[var(--cyan)]/30">
                                                                            <FileSearch size={20} />
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-white font-mono uppercase tracking-[0.4em]">Structured Process Blueprint</span>
                                                                    </div>
                                                                    <h3 className="text-3xl font-black text-white uppercase font-mono tracking-tighter leading-none">{dashboard.activeManifest.title}</h3>
                                                                </div>
                                                                <button onClick={() => setShowBlueprint(false)} className="p-3 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-2xl"><X size={24} /></button>
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-4">
                                                                <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] shadow-inner relative group/logic">
                                                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group/logic:opacity-10 transition-opacity"><Zap size={60} /></div>
                                                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                                                        <Code size={14} className="text-[var(--amethyst-soft)]" />
                                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Logic</span>
                                                                    </div>
                                                                    <p className="text-xl text-gray-300 font-mono italic leading-relaxed">"{renderSafe(dashboard.activeManifest.logic || dashboard.activeManifest.internalPlanningMonologue)}"</p>
                                                                </div>
                                                                <div className="space-y-6">
                                                                    <div className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-widest px-2">
                                                                        <ListChecks size={16} className="text-[var(--plasma-green)]" /> Implementation Sequence
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        {Array.isArray(dashboard.activeManifest?.protocols) && dashboard.activeManifest.protocols.map((p: any, i: number) => (
                                                                            <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-6 group hover:border-white/10 transition-all">
                                                                                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center font-mono font-black text-sm text-[var(--cyan)] border border-white/5">{i + 1}</div>
                                                                                <span className="text-sm text-gray-300 font-mono group-hover:text-white transition-colors">{renderSafe(p.instruction)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="pt-8 border-t border-white/5 flex gap-4">
                                                                <button onClick={() => actions.deployStrategyToLattice(dashboard.activeManifest!)} className="flex-1 py-5 bg-[var(--cyan)] text-black font-black text-[10px] uppercase rounded-2xl tracking-[0.4em] shadow-[0_20px_50px_rgba(34,211,238,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                                                                    <RefreshCw size={16} /> Deploy to Topology
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                <div className="absolute top-10 right-10 z-40 opacity-0 group-hover/img-node:opacity-100 transition-all">
                                                    <div className="flex flex-col gap-3">
                                                        <button onClick={handleDownloadMainAsset} className="p-4 bg-black/60 hover:bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl text-white shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                                            <Download size={24} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); actions.openHoloProjector({ id: 'soc-scan', title: 'Holo Inspect', type: 'IMAGE', content: dashboard.hubViewUrl }); }} className="p-4 bg-black/60 hover:bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl text-[var(--cyan)] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                                            <Maximize2 size={24} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none" />
                                    <AnimatePresence>
                                        {dashboard.activeManifest && dashboard.deploymentProgress < 100 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute bottom-10 right-10 z-[35] w-72 bg-[#050505]/90 backdrop-blur-3xl border border-[var(--cyan)]/40 p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(34,211,238,0.15)] flex flex-col gap-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Activity size={14} className="text-[var(--cyan)] animate-pulse" />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Protocol Deployment</span>
                                                    </div>
                                                    <span className="text-[12px] font-black font-mono text-[var(--cyan)]">{dashboard.deploymentProgress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                    <motion.div className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--cyan)] shadow-[0_0_20px_var(--cyan)]" animate={{ width: `${dashboard.deploymentProgress}%` }} />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">Active Process Sequence:</div>
                                                    <div className="p-3 bg-black/60 border border-white/5 rounded-xl font-mono text-[9px] text-[var(--cyan)] italic leading-relaxed">
                                                        {manifestProtocols.length > 0
                                                            ? renderSafe(manifestProtocols[Math.min(manifestProtocols.length - 1, Math.floor((dashboard.deploymentProgress / 100) * manifestProtocols.length))]?.instruction)
                                                            : "Synchronizing Neural Lattice..."}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[7px] font-black text-gray-700 uppercase tracking-[0.4em]">
                                                    <span>Phase_{Math.floor(dashboard.deploymentProgress / 20) + 1}_Engaged</span>
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded border border-white/10">
                                                        <div className="w-1 h-1 rounded-full bg-[var(--amethyst-soft)] animate-pulse" />
                                                        <span className="text-[6px] font-mono text-[var(--amethyst-soft)]">SOVEREIGN_V1</span>
                                                    </span>
                                                    <Loader2 size={10} className="animate-spin" />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="absolute bottom-8 left-10 z-20 flex flex-col gap-3">
                                    <div className="text-[8px] font-black font-mono text-[var(--amethyst-soft)] uppercase tracking-[0.5em] mb-1 px-1 opacity-60">Lattice_Operational_State</div>
                                    <div className="flex gap-2.5">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl backdrop-blur-3xl flex items-center justify-center text-gray-500 hover:text-white hover:border-[var(--amethyst-soft)]/50 transition-all shadow-xl group/node cursor-pointer">
                                                <Bot size={18} className="group-hover/node:scale-110 transition-transform" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>


                            <div className="h-32 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-10 shrink-0 z-20 relative">
                                <div className="flex items-center gap-12">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest font-black">Neural Coherence</span>
                                        <span className="text-lg font-black font-mono text-white tracking-tighter uppercase">The D-Ecosystem</span>
                                    </div>
                                    <div className="h-10 w-px bg-white/5" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest font-black">Auth Protocol</span>
                                        <span className="text-base font-black font-mono text-[var(--plasma-green)] tracking-tighter uppercase">Secure_L0</span>
                                    </div>
                                    <div className="h-10 w-px bg-white/5" />
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                            <canvas ref={voiceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                                            <div className={cn(
                                                "w-9 h-9 rounded-full border p-1 glass-action flex items-center justify-center relative transition-all duration-700 z-10",
                                                voice.isActive ? "border-[var(--amethyst-soft)] shadow-[0_0_15px_rgba(157,78,221,0.3)] scale-105" : "border-white/10"
                                            )}>
                                                <div className="w-full h-full rounded-full overflow-hidden bg-black/20 flex items-center justify-center">
                                                    <Radio size={14} className={voice.isActive ? "text-[var(--amethyst-soft)] animate-pulse" : "text-gray-700"} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest font-black">Active Comms</span>
                                            <button onClick={handleUplink} className={cn("px-5 py-1.5 rounded-xl text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-2 border glass-action active:scale-95", voice.isActive ? "bg-red-500/10 border-red-500/20 text-red-400" : "text-[var(--amethyst-soft)] border-[var(--amethyst-soft)]/30 hover:border-[var(--amethyst-soft)] hover:text-white")}>
                                                {voice.isActive ? <MicOff size={10} /> : <Mic size={10} />}
                                                {voice.isActive ? 'Sever Link' : 'Establish Comms'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest max-w-[280px] text-right leading-relaxed italic opacity-60">
                                        Orchestrating Zenith Fidelity implementation protocols and autonomous agentic workflows.
                                    </p>
                                    <button onClick={handleGlobalSync} disabled={isSyncing} className="px-8 py-3 bg-[var(--executive-gold)] hover:bg-[#ffdf6b] text-black rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] transition-all active:scale-95 shadow-xl flex items-center gap-4 group">
                                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />}
                                        Establish Zenith View
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Belt: Network Topology + Capital Velocity + Context Velocity - 3-column equal */}
                        {!dashboard.isOculusView && (
                            <div className="grid grid-cols-3 gap-6 h-[320px]" data-biometric-id="metrics-belt" data-semantic-type="metrics">
                                {/* Network Topology */}
                                <div className="crystalline rounded-[2rem] p-5 shadow-2xl flex flex-col relative overflow-hidden group/topology shrink-0 invisible-glass border border-white/5 hover:border-white/20 transition-all duration-700">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,194,27,0.02)_0%,transparent_70%)] pointer-events-none" />
                                    <div className="flex items-center gap-3 mb-3 relative z-10">
                                        <ChartIcon size={14} className="text-[var(--executive-gold)]" />
                                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Network Topology</span>
                                    </div>
                                    <div className="flex-1 min-h-[180px] relative z-10">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                            <RadarChart data={dashboard.topologyData}>
                                                <PolarGrid stroke="#333" />
                                                <PolarAngleAxis dataKey="s" tick={{ fill: '#666', fontSize: 8, fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <RechartRadar dataKey="A" stroke="var(--executive-gold)" fill="var(--executive-gold)" fillOpacity={0.2} isAnimationActive={false} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--executive-gold)]/5 opacity-0 group-hover/topology:opacity-100 transition-opacity pointer-events-none" />
                                </div>

                                {/* Capital Velocity */}
                                <CapitalVelocity telemetry={telemetry} />

                                {/* Context Velocity */}
                                <ContextVelocityChart onDrillDown={(p) => actions.addLog('INFO', `LOG_DRILL: ${p.throughput} pkts`)} />
                            </div>
                        )}

                        {/* Command Deck + System Metrics - Moved to left column */}
                        {!dashboard.isOculusView && (
                            <div className="grid grid-cols-2 gap-6">
                                <StrategicConsole />
                                <div className="crystalline rounded-[2rem] p-5 shadow-2xl relative overflow-hidden shrink-0 invisible-glass border border-white/5 hover:border-white/20 transition-all duration-700">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.02)_0%,transparent_70%)] pointer-events-none" />
                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        <CompactMetric title="CPU LOAD" value={`${telemetry.cpu.toFixed(1)}%`} detail="STABLE" icon={Cpu} color="var(--cyan)" trend="up" />
                                        <CompactMetric title="BANDWIDTH" value={`${telemetry.net}GB/s`} detail="PEAK" icon={Radio} color="var(--amethyst)" trend="up" />
                                        <CompactMetric title="TRUST INDEX" value="NOMINAL" detail="VERIFIED" icon={Shield} color="var(--plasma-green)" trend="up" />
                                        <CompactMetric title="LATENCY" value="2.4ms" detail="OPTIMAL" icon={Zap} color="var(--amber)" trend="up" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Right Column */}
                    <AnimatePresence>
                        {!dashboard.isOculusView && (
                            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="col-span-3 space-y-4 flex flex-col relative z-10" data-biometric-id="sidebar-panel" data-semantic-type="navigation">

                                <div className="crystalline rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden group/anchor shrink-0 invisible-glass border border-white/5 hover:border-white/20 transition-all duration-700 min-h-[300px]">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />
                                    <div className="absolute inset-0 opacity-0 group-hover/anchor:opacity-20 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.8)_50%,transparent_55%)] bg-[length:200%_200%] animate-[shimmer_5s_infinite_linear] pointer-events-none" />
                                    <div className="flex items-center justify-between relative z-10 px-1">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Fingerprint size={20} className="text-[var(--amethyst-soft)]" />
                                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute -inset-2 border border-dashed border-[var(--amethyst-soft)]/30 rounded-full" />
                                            </div>
                                            <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Biometric Anchor</span>
                                        </div>
                                        <label className="cursor-pointer p-2.5 bg-black/40 hover:bg-black/60 rounded-xl transition-all border border-white/5 group/btn-up shadow-xl active:scale-95">
                                            <Upload size={14} className="text-gray-500 group-hover/btn-up:text-white" />
                                            <input type="file" className="hidden" onChange={handleAnchorSwap} accept="image/*" />
                                        </label>
                                    </div>
                                    <motion.div onClick={() => fileInputRef.current?.click()} whileHover="scanning" className="h-48 bg-black/60 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative group/v-anchor shadow-inner z-10 cursor-pointer flex-1">
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleAnchorSwap} accept="image/*" />
                                        <motion.div variants={{ scanning: { top: ['0%', '100%', '0%'], opacity: 1 } }} animate={isSyncing ? "scanning" : { opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-[2px] bg-[var(--cyan)] shadow-[0_0_20px_var(--cyan)] z-30 pointer-events-none" />
                                        {dashboard.referenceImage ? (
                                            <>
                                                <img src={`data:${dashboard.referenceImage.inlineData.mimeType};base64,${dashboard.referenceImage.inlineData.data}`} className="w-full h-full object-cover grayscale opacity-40 transition-all duration-1000 group-hover/v-anchor:opacity-90 group-hover/v-anchor:grayscale-0" alt="Anchor" />
                                                {isSyncing && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                        <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center relative">
                                                            <div className="absolute inset-0 border-t-2 border-[var(--amethyst-soft)] rounded-full animate-spin" />
                                                            <Target size={24} className="text-[var(--amethyst-soft)] animate-pulse" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/v-anchor:opacity-100 transition-all duration-700 flex items-center justify-center">
                                                    <div className="px-8 py-2 bg-black/80 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-[0.4em] text-white backdrop-blur-3xl shadow-2xl active:scale-95">RE-CALIBRATE</div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 opacity-20 group-hover/anchor:opacity-40 transition-opacity">
                                                <motion.div variants={{ scanning: { color: "var(--cyan)", scale: 1.1 } }} className="w-14 h-14 rounded-full border border-dashed border-white/30 flex items-center justify-center">
                                                    <Fingerprint size={24} />
                                                </motion.div>
                                                <span className="text-[9px] font-black uppercase tracking-[0.5em] font-mono">Load Identity Key</span>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Biometric Sensors Panel - Gaze & Stress Detection */}
                                <BiometricPanel showControls={true} />

                                <DirectoryPeek manifest={dashboard.activeManifest} />
                                <SwarmBox />

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {!dashboard.isOculusView && (
                        <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} className="w-full h-[850px] mt-8 rounded-[5rem] overflow-hidden border border-white/10 shadow-[0_80px_200px_rgba(0,0,0,1)] relative group/ecosystem shrink-0" data-biometric-id="d-ecosystem" data-semantic-type="chart">
                            <div className="absolute top-12 left-16 z-20 flex flex-col gap-3 pointer-events-none">
                                <h2 className="text-white text-3xl font-black font-mono uppercase tracking-[0.3em] drop-shadow-[0_0_20px_rgba(0,0,0,1)]">The D-Ecosystem</h2>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl w-fit">
                                        <div className="w-2 h-2 rounded-full bg-[var(--plasma-green)] animate-pulse shadow-[0_0_8px_var(--plasma-green)]" />
                                        <span className="text-[9px] font-black font-mono text-white uppercase tracking-[0.3em]">Autonomous_Swarm_Lattice // Active</span>
                                    </div>
                                    <div className="flex items-center gap-2 pl-6">
                                        <span className="text-[7px] text-gray-500 font-mono uppercase tracking-0.4em block">Active Global Node Synchronization</span>
                                        <span className="text-[6px] px-1.5 py-0.5 bg-[var(--amethyst-soft)]/10 border border-[var(--amethyst-soft)]/20 rounded font-black font-mono text-[var(--amethyst-soft)] uppercase">SOVEREIGN_V1_STABLE</span>
                                    </div>
                                </div>
                            </div>

                            <DEcosystem sectorOverrides={sectorLoads} />
                            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
        </AdaptiveContainer>
        </BiometricErrorBoundary>
    );
};

export default MetaventionsHub;
