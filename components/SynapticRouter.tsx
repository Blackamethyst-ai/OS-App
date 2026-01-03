import React, { useEffect, useState, Suspense, lazy, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Copy, Eye, Wand2, Terminal, Code, X, Search, Activity, 
    Layers, ArrowUpRight, Hash, Database, GitBranch, Loader2, Scan 
} from 'lucide-react';
import { performGlobalSearch } from '../services/geminiService';
import { AppMode } from '../types';
import { audio } from '../services/audioService';

// Lazy Load Views for performance
const Dashboard = lazy(() => import('./Dashboard'));
const MetaventionsHub = lazy(() => import('./MetaventionsHub'));
const SynthesisBridge = lazy(() => import('./SynthesisBridge'));
const BibliomorphicEngine = lazy(() => import('./BibliomorphicEngine'));
const ProcessVisualizer = lazy(() => import('./ProcessVisualizer'));
const MemoryCore = lazy(() => import('./MemoryCore'));
const ImageGen = lazy(() => import('./ImageGen'));
const HardwareEngine = lazy(() => import('./HardwareEngine'));
const VoiceMode = lazy(() => import('./VoiceMode'));
const CodeStudio = lazy(() => import('./CodeStudio'));
const AgentControlCenter = lazy(() => import('./AgentControlCenter'));
const AutonomousFinance = lazy(() => import('./AutonomousFinance'));
const NexusAPIExplorer = lazy(() => import('./NexusAPIExplorer'));

const SynapticRouter: React.FC = () => {
    const { mode, actions } = useAppStore();
    const lastSyncedHash = useRef<string>('');
    const [routeInfo, setRouteInfo] = useState({ path: '', sub: '', params: '' });

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
                'nexus': 'NEXUS' as any
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
        mode === AppMode.METAVENTIONS_HUB || mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER || mode === AppMode.AUTONOMOUS_FINANCE || (mode as any) === 'NEXUS'
    , [mode]);

    return (
        <div className="flex-1 relative overflow-hidden flex flex-col perspective-2000">
            <Suspense fallback={
                <div className="h-full w-full flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-4" />
                </div>
            }>
                <AnimatePresence mode="wait">
                    <motion.main
                        key={mode}
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.98, filter: 'blur(30px)' }}
                        transition={{ 
                            duration: 0.5, 
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className={`flex-1 relative z-10 p-6 flex flex-col ${
                            isFixedLayout ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar pb-8'
                        }`}
                    >
                        {mode === AppMode.DASHBOARD && <Dashboard />}
                        {mode === AppMode.METAVENTIONS_HUB && <MetaventionsHub />}
                        {mode === AppMode.SYNTHESIS_BRIDGE && <SynthesisBridge />}
                        {mode === AppMode.BIBLIOMORPHIC && <BibliomorphicEngine />}
                        {mode === AppMode.PROCESS_MAP && <ProcessVisualizer />}
                        {mode === AppMode.MEMORY_CORE && <MemoryCore />}
                        {mode === AppMode.IMAGE_GEN && <ImageGen className="h-full flex-1" />}
                        {mode === AppMode.HARDWARE_ENGINEER && <HardwareEngine />}
                        {mode === AppMode.VOICE_MODE && <VoiceMode />}
                        {mode === AppMode.CODE_STUDIO && <CodeStudio />}
                        {mode === AppMode.AGENT_CONTROL && <AgentControlCenter />}
                        {mode === AppMode.AUTONOMOUS_FINANCE && <AutonomousFinance />}
                        {(mode as any) === 'NEXUS' && <NexusAPIExplorer />}
                    </motion.main>
                </AnimatePresence>
            </Suspense>
        </div>
    );
};

export default SynapticRouter;