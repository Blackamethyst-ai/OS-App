
import React, { useEffect, useState, useCallback, Suspense, lazy, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import {
    Copy, Eye, Wand2, Terminal, Code, X, Search, Activity,
    Layers, ArrowUpRight, Hash, Database, GitBranch, Scan,
    AlertTriangle, RefreshCw
} from 'lucide-react';
import { performGlobalSearch } from '../services/geminiService';
import { AppMode } from '../types';
import { audio } from '../services/audioService';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import SectorSkeleton from './SectorSkeleton';

// Lazy Load Views for performance
const Dashboard = lazy(() => import('./core/Dashboard'));
const MetaventionsHub = lazy(() => import('./MetaventionsHub'));
const SynthesisBridge = lazy(() => import('./SynthesisBridge'));
const BibliomorphicEngine = lazy(() => import('./research/BibliomorphicEngine'));
const ProcessVisualizer = lazy(() => import('./generation/ProcessVisualizer'));
const MemoryCore = lazy(() => import('./MemoryCore'));
const ImageGen = lazy(() => import('./generation/ImageGen'));
const HardwareEngine = lazy(() => import('./hardware/HardwareEngine'));
const VoiceMode = lazy(() => import('./voice/VoiceMode'));
const CodeStudio = lazy(() => import('./generation/CodeStudio'));
const AgentControlCenter = lazy(() => import('./agents/AgentControlCenter'));
const AutonomousFinance = lazy(() => import('./finance/AutonomousFinance'));
const NexusAPIExplorer = lazy(() => import('./NexusAPIExplorer'));
const AgentCoreTest = lazy(() => import('./AgentCoreTest'));
const CPBTest = lazy(() => import('./CPBTest'));
const ArchonDashboard = lazy(() => import('./agents/ArchonDashboard'));
const MetaLearningDashboard = lazy(() => import('./predictions/MetaLearningDashboard'));
const SovereignGallery = lazy(() => import('./SovereignGallery'));
const BicameralEngine = lazy(() => import('./BicameralEngine'));

// --- DYNAMIC PAGE TITLES ---
const SECTOR_TITLES: Record<AppMode, string> = {
    [AppMode.DASHBOARD]: 'Dashboard',
    [AppMode.METAVENTIONS_HUB]: 'Hub',
    [AppMode.SYNTHESIS_BRIDGE]: 'Synthesis Bridge',
    [AppMode.BIBLIOMORPHIC]: 'Bibliomorphic Engine',
    [AppMode.PROCESS_MAP]: 'Process Visualizer',
    [AppMode.MEMORY_CORE]: 'Memory Core',
    [AppMode.IMAGE_GEN]: 'Image Generation',
    [AppMode.HARDWARE_ENGINEER]: 'Hardware Engine',
    [AppMode.VOICE_MODE]: 'Voice Core',
    [AppMode.CODE_STUDIO]: 'Code Studio',
    [AppMode.AGENT_CONTROL]: 'Agent Control',
    [AppMode.AUTONOMOUS_FINANCE]: 'Finance',
    [AppMode.BICAMERAL]: 'Bicameral Engine',
    [AppMode.NEXUS]: 'Nexus API',
    [AppMode.AGENT_CORE_TEST]: 'SDK Test',
    [AppMode.CPB_TEST]: 'CPB Test',
    [AppMode.ARCHON]: 'Archon',
    [AppMode.META_LEARNING]: 'Meta Learning',
    [AppMode.SOVEREIGN_GALLERY]: 'Sovereign Vault',
};

// --- CYCLE 1: SPATIAL COORDINATE MAP ---
const SECTOR_COORDINATES: Record<AppMode, { x: number; y: number; z: number }> = {
    [AppMode.METAVENTIONS_HUB]: { x: 0, y: 0, z: 0 },
    [AppMode.DASHBOARD]: { x: 0, y: 0, z: 1 },
    [AppMode.BIBLIOMORPHIC]: { x: -1, y: 1, z: 0 },
    [AppMode.PROCESS_MAP]: { x: 1, y: 1, z: 0 },
    [AppMode.AUTONOMOUS_FINANCE]: { x: -1, y: -1, z: 0 },
    [AppMode.CODE_STUDIO]: { x: 1, y: -1, z: 0 },
    [AppMode.AGENT_CONTROL]: { x: 0, y: 1, z: 0 },
    [AppMode.MEMORY_CORE]: { x: 0, y: -1, z: 0 },
    [AppMode.IMAGE_GEN]: { x: -1, y: 0, z: 0 },
    [AppMode.HARDWARE_ENGINEER]: { x: 1, y: 0, z: 0 },
    [AppMode.VOICE_MODE]: { x: 0, y: 0, z: -1 },
    [AppMode.SYNTHESIS_BRIDGE]: { x: 0.5, y: 0.5, z: 0.5 },
    [AppMode.BICAMERAL]: { x: -0.5, y: 0.5, z: 0.5 },
    [AppMode.AGENT_CORE_TEST]: { x: -0.5, y: -0.5, z: 0.5 },
    [AppMode.CPB_TEST]: { x: 0.5, y: -0.5, z: 0.5 },
    [AppMode.ARCHON]: { x: 0, y: 0, z: 2 },
    [AppMode.META_LEARNING]: { x: -1, y: 1, z: 1 },
    [AppMode.SOVEREIGN_GALLERY]: { x: 0.5, y: -0.5, z: -0.5 },
    [AppMode.NEXUS]: { x: 1, y: 1, z: 1 }
};

/**
 * Panel-level error fallback — allows retrying the current sector
 * without a full page reload, unlike the root GlobalErrorBoundary.
 */
const PanelErrorFallback: React.FC<{ sectorName: string }> = ({ sectorName }) => {
    const handleRetry = useCallback(() => {
        // Force re-mount by navigating to hub and back
        const currentHash = window.location.hash;
        window.location.hash = '#/metaventions-hub';
        requestAnimationFrame(() => { window.location.hash = currentHash; });
    }, []);

    return (
        <div role="alert" aria-live="assertive" className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-full max-w-lg border border-[var(--amethyst)]/30 bg-black/60 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <AlertTriangle size={32} className="text-[var(--amethyst)]" />
                    <h2 className="text-xl font-bold text-[#F8FAFC] uppercase tracking-widest">
                        Sector Fault
                    </h2>
                </div>
                <p className="text-sm text-[#94A3B8] mb-6">
                    The <span className="text-[var(--cyan)] font-mono">{sectorName}</span> sector encountered an error and was isolated to protect system stability.
                </p>
                <button
                    onClick={handleRetry}
                    className="px-8 py-3 bg-[var(--amethyst)] hover:bg-[var(--cyan)] text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto group"
                >
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    Retry Sector
                </button>
            </div>
        </div>
    );
};

const SynapticRouter: React.FC = () => {
    const { mode, previousMode, contextMenu, actions } = useAppStore();
    const lastSyncedHash = useRef<string>('');
    const [routeInfo, setRouteInfo] = useState({ path: '', sub: '', params: '' });

    // --- Dynamic page title ---
    useEffect(() => {
        document.title = `${SECTOR_TITLES[mode] || mode} — Metaventions AI`;
    }, [mode]);

    // Transition Logic: Calculate Warp Vector
    const warpDirection = useMemo(() => {
        if (!previousMode) return { x: 0, y: 0, scale: 0.8 };
        const curr = SECTOR_COORDINATES[mode] || { x: 0, y: 0, z: 0 };
        const prev = SECTOR_COORDINATES[previousMode] || { x: 0, y: 0, z: 0 };
        return {
            x: (curr.x - prev.x) * 100,
            y: (curr.y - prev.y) * 100,
            z: curr.z - prev.z
        };
    }, [mode, previousMode]);

    useEffect(() => {
        const handleRouting = () => {
            const currentHash = window.location.hash || '#/metaventions-hub';
            if (currentHash === lastSyncedHash.current) return;

            const [fullPath, queryStr] = currentHash.replace('#', '').split('?');
            const parts = fullPath.split('/').filter(Boolean);
            const mainPath = parts[0] || 'metaventions-hub';
            const subPath = parts[1] || '';

            const routeMap: Record<string, AppMode> = {
                'dashboard': AppMode.DASHBOARD,
                'metaventions-hub': AppMode.METAVENTIONS_HUB,
                'bridge': AppMode.SYNTHESIS_BRIDGE,
                'bibliomorphic': AppMode.BIBLIOMORPHIC,
                'process': AppMode.PROCESS_MAP,
                'memory': AppMode.MEMORY_CORE,
                'assets': AppMode.IMAGE_GEN,
                'hardware': AppMode.HARDWARE_ENGINEER,
                'code': AppMode.CODE_STUDIO,
                'voice': AppMode.VOICE_MODE,
                'agents': AppMode.AGENT_CONTROL,
                'finance': AppMode.AUTONOMOUS_FINANCE,
                'nexus': AppMode.NEXUS,
                'bicameral': AppMode.BICAMERAL,
                'sdk-test': AppMode.AGENT_CORE_TEST,
                'cpb-test': AppMode.CPB_TEST,
                'archon': AppMode.ARCHON,
                'predictions': AppMode.META_LEARNING,
                'vault': AppMode.SOVEREIGN_GALLERY
            };

            const targetMode = routeMap[mainPath];
            if (targetMode !== undefined && targetMode !== mode) {
                actions.setMode(targetMode);
                audio.playTransition();
            }

            setRouteInfo({ path: mainPath, sub: subPath, params: queryStr || '' });
            lastSyncedHash.current = currentHash;
        };

        window.addEventListener('hashchange', handleRouting);
        handleRouting(); 
        return () => window.removeEventListener('hashchange', handleRouting);
    }, [actions, mode]);

    const isFixedLayout = useMemo(() => 
        mode === AppMode.METAVENTIONS_HUB || mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER || mode === AppMode.AUTONOMOUS_FINANCE || mode === AppMode.SOVEREIGN_GALLERY || mode === AppMode.NEXUS
    , [mode]);

    return (
        <div id="main-content" className="flex-1 relative overflow-hidden flex flex-col perspective-2000">
            <Suspense fallback={<SectorSkeleton />}>
                {/* Fix: Changed mode from 'popLayout' to 'wait' to eliminate the multiple window overlap during sector shifts */}
                <AnimatePresence mode="wait" initial={false}>
                    <motion.main
                        key={mode}
                        role="main"
                        aria-live="polite"
                        layoutId="synaptic-sector"
                        initial={{ 
                            opacity: 0, 
                            scale: 0.95, 
                            z: -200,
                            rotateX: warpDirection.y / 20,
                            rotateY: -warpDirection.x / 20,
                            filter: 'blur(20px) brightness(0.5)'
                        }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            z: 0,
                            rotateX: 0,
                            rotateY: 0,
                            filter: 'blur(0px) brightness(1)'
                        }}
                        exit={{ 
                            opacity: 0, 
                            scale: 1.05, 
                            z: 200,
                            filter: 'blur(30px) brightness(1.5)'
                        }}
                        transition={{ 
                            duration: 0.6, 
                            ease: [0.16, 1, 0.3, 1],
                            opacity: { duration: 0.3 }
                        }}
                        className={`flex-1 relative z-10 p-6 flex flex-col ${
                            isFixedLayout ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar pb-8'
                        }`}
                    >
                        <GlobalErrorBoundary fallback={<PanelErrorFallback sectorName={mode} />}>
                            {mode === AppMode.DASHBOARD && (
                                <RouteErrorBoundary sector="Dashboard">
                                    <Dashboard />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.METAVENTIONS_HUB && (
                                <RouteErrorBoundary sector="Metaventions Hub">
                                    <MetaventionsHub />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.SYNTHESIS_BRIDGE && (
                                <RouteErrorBoundary sector="Synthesis Bridge">
                                    <SynthesisBridge />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.BIBLIOMORPHIC && (
                                <RouteErrorBoundary sector="Bibliomorphic Engine">
                                    <BibliomorphicEngine />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.PROCESS_MAP && (
                                <RouteErrorBoundary sector="Process Visualizer">
                                    <ProcessVisualizer />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.MEMORY_CORE && (
                                <RouteErrorBoundary sector="Memory Core">
                                    <MemoryCore />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.IMAGE_GEN && (
                                <RouteErrorBoundary sector="Image Generation">
                                    <ImageGen className="h-full flex-1" />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.HARDWARE_ENGINEER && (
                                <RouteErrorBoundary sector="Hardware Engine">
                                    <HardwareEngine />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.VOICE_MODE && (
                                <RouteErrorBoundary sector="Voice Mode">
                                    <VoiceMode />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.CODE_STUDIO && (
                                <RouteErrorBoundary sector="Code Studio">
                                    <CodeStudio />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.AGENT_CONTROL && (
                                <RouteErrorBoundary sector="Agent Control Center">
                                    <AgentControlCenter />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.AUTONOMOUS_FINANCE && (
                                <RouteErrorBoundary sector="Autonomous Finance">
                                    <AutonomousFinance />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.NEXUS && (
                                <RouteErrorBoundary sector="Nexus API Explorer">
                                    <NexusAPIExplorer />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.BICAMERAL && (
                                <RouteErrorBoundary sector="Bicameral Engine">
                                    <BicameralEngine />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.AGENT_CORE_TEST && (
                                <RouteErrorBoundary sector="Agent Core Test">
                                    <AgentCoreTest />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.CPB_TEST && (
                                <RouteErrorBoundary sector="CPB Test">
                                    <CPBTest />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.ARCHON && (
                                <RouteErrorBoundary sector="Archon Dashboard">
                                    <ArchonDashboard />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.META_LEARNING && (
                                <RouteErrorBoundary sector="Meta Learning">
                                    <MetaLearningDashboard />
                                </RouteErrorBoundary>
                            )}
                            {mode === AppMode.SOVEREIGN_GALLERY && (
                                <RouteErrorBoundary sector="Sovereign Gallery">
                                    <SovereignGallery />
                                </RouteErrorBoundary>
                            )}
                        </GlobalErrorBoundary>
                    </motion.main>
                </AnimatePresence>
            </Suspense>
        </div>
    );
};

export default SynapticRouter;
