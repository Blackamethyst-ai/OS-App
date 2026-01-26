
import React, { useEffect, Suspense, lazy } from 'react';
import { useAppStore } from './store';
import { useSystemMind } from './stores/useSystemMind';
import { AppTheme } from './types';
import Starfield from './components/Starfield';
import { BackgroundEffect } from './components/shared';
import { CommandPalette } from './components/core';
import SystemNotification from './components/SystemNotification';
import OverlayOS from './components/OverlayOS';
import HoloProjector from './components/HoloProjector';
import SynapticRouter from './components/SynapticRouter';
import UserProfileOverlay from './components/UserProfileOverlay';
import VisualCortexOverlay from './components/VisualCortexOverlay';
import GlobalStatusBar from './components/GlobalStatusBar';
import PeerMeshOverlay from './components/PeerMeshOverlay';
import AppFooter from './components/AppFooter';
import AuthModule from './components/AuthModule';
import SynapticContextHub from './components/SynapticContextHub';
import { useAutoSave } from './hooks/useAutoSave';
import { useDaemonSwarm } from './hooks/useDaemonSwarm';
import { useVoiceControl } from './hooks/useVoiceControl';
import { useResearchAgent } from './hooks/useResearchAgent';
import { useVisualCortex } from './hooks/useVisualCortex';
import { useBiometricSensor } from './hooks/useBiometricSensor';
import { useStressDetector } from './hooks/useStressDetector';
import { useFixationGlow } from './hooks/useFixationGlow';
import { useThemeVariables } from './hooks/useThemeVariables';
import { useApiKeyModal } from './hooks/useApiKeyModal';
import { useKernelUptime } from './hooks/useKernelUptime';
import { useKernelLifecycle } from './hooks/useKernelLifecycle';
import { useTimeTravel } from './hooks/useTimeTravel';
import { useAuthPersistence } from './hooks/useAuthPersistence';
import { hasFixedLayout } from './config/navigation';
import { audio } from './services/audioService';
import { AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import MasterStabilizationProtocol from './components/MasterStabilizationProtocol';
import FocusOverlay from './components/overlays/FocusOverlay';
import AppHeader from './components/layout/AppHeader';

import { VoiceSystem } from './components/voice';

// Lazy-loaded components (conditionally rendered)
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const AgenticHUD = lazy(() => import('./components/agents/AgenticHUD'));
const TimeTravelScrubber = lazy(() => import('./components/TimeTravelScrubber'));
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal'));
const OperationalSidebar = lazy(() => import('./components/OperationalSidebar'));
const PredictionDemo = lazy(() => import('./components/predictions/PredictionDemo'));

const App: React.FC = () => {
    const mode = useAppStore(s => s.mode);
    const theme = useAppStore(s => s.theme);
    const system = useAppStore(s => s.system);
    const holo = useAppStore(s => s.holo);
    const authenticated = useAppStore(s => s.authenticated);
    const actions = useAppStore(s => s.actions);
    const isHelpOpen = useAppStore(s => s.isHelpOpen);
    const isScrubberOpen = useAppStore(s => s.isScrubberOpen);
    const isDiagnosticsOpen = useAppStore(s => s.isDiagnosticsOpen);
    const isSidebarOpen = useAppStore(s => s.isSidebarOpen);
    const isHUDClosed = useAppStore(s => s.isHUDClosed);

    // Prediction demo toggle (via URL param: ?demo=predictions)
    const [showPredictionDemo, setShowPredictionDemo] = React.useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('demo') === 'predictions';
    });

    const { setSector } = useSystemMind();

    // Auth persistence (restore login state from localStorage)
    useAuthPersistence();

    // Hooks
    const { isOpen: isApiKeyModalOpen, setIsOpen: setIsApiKeyModalOpen } = useApiKeyModal();
    const { restore } = useTimeTravel();
    useKernelUptime();
    useKernelLifecycle();

    useAutoSave();
    useDaemonSwarm();
    useVoiceControl();
    useResearchAgent();
    useVisualCortex();

    // Biometric Integration
    useBiometricSensor();
    useStressDetector();
    useFixationGlow();

    useEffect(() => { setSector(mode); }, [mode, setSector]);

    // Global Context Menu Hijack
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            actions.openContextMenu(e.clientX, e.clientY, 'GLOBAL', null);
            audio.playClick();
        };
        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, [actions]);

    const themeVars = useThemeVariables(theme);
    const isFixedLayout = hasFixedLayout(mode);

    // MATERIAL SOVEREIGNTY: Deep Refraction Stacking
    const isDeepRefracted = system.isTerminalOpen || holo.isOpen;

    return (
        <GlobalErrorBoundary>
            <div
                className={cn(
                    "h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-700 ease-in-out relative",
                    isDeepRefracted && "deep-refraction-active"
                )}
                style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', ...themeVars as any }}
            >
                <MasterStabilizationProtocol />
                <Starfield mode={mode} />
                <BackgroundEffect isDarkMode={theme !== AppTheme.LIGHT} />


                <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

                {/* SOVEREIGN GATE: Hard authentication barrier */}
                {!authenticated ? (
                    <AuthModule />
                ) : (
                    <>
                        <SynapticContextHub />

                        <FocusOverlay />
                        <UserProfileOverlay />
                        <VisualCortexOverlay />
                        <CommandPalette />
                        <PeerMeshOverlay />
                        <SystemNotification isOpen={isDiagnosticsOpen} onClose={() => actions.setDiagnosticsOpen(false)} />
                        <OverlayOS />
                        <HoloProjector />

                        {/* Unified Voice Stack (always mounted for voice functionality) */}
                        <VoiceSystem />

                        {/* Time Travel Scrubber (lazy-loaded, conditionally rendered) */}
                        {isScrubberOpen && (
                            <Suspense fallback={null}>
                                <TimeTravelScrubber mode={mode} onRestore={restore} isOpen={isScrubberOpen} onClose={() => actions.setScrubberOpen(false)} />
                            </Suspense>
                        )}

                        {/* API Key Configuration Modal (lazy-loaded) */}
                        {isApiKeyModalOpen && (
                            <Suspense fallback={null}>
                                <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} />
                            </Suspense>
                        )}

                        <AnimatePresence>
                            {!isHUDClosed && (
                                <Suspense fallback={null}>
                                    <AgenticHUD />
                                </Suspense>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {isHelpOpen && (
                                <Suspense fallback={null}>
                                    <HelpCenter onClose={() => actions.setHelpOpen(false)} />
                                </Suspense>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showPredictionDemo && (
                                <Suspense fallback={null}>
                                    <div className="fixed inset-0 z-[9999] bg-black/95 overflow-y-auto">
                                        <button
                                            onClick={() => setShowPredictionDemo(false)}
                                            className="fixed top-4 right-4 z-[10000] px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-white font-mono text-sm transition-all"
                                        >
                                            ✕ Close Demo
                                        </button>
                                        <PredictionDemo />
                                    </div>
                                </Suspense>
                            )}
                        </AnimatePresence>

                        <AppHeader />

                        {/* OS Kernel Dock Layer */}
                        <GlobalStatusBar />

                        <div className="flex-1 flex overflow-hidden relative">
                            <div className={cn(
                                "flex-1 relative flex flex-col min-h-0 transition-all duration-1000 main-content-layer",
                                isFixedLayout ? 'pb-0 overflow-hidden' : 'pb-1 overflow-y-auto no-scrollbar'
                            )}
                                style={{
                                    '--soc-height': '1000px',
                                    '--metrics-belt-gap': '-2rem',
                                } as React.CSSProperties}
                            >
                                <SynapticRouter />
                            </div>

                            <AnimatePresence>
                                {isSidebarOpen && (
                                    <Suspense fallback={null}>
                                        <OperationalSidebar />
                                    </Suspense>
                                )}
                            </AnimatePresence>
                        </div>

                        <AppFooter />
                    </>
                )}
            </div>
        </GlobalErrorBoundary>
    );
};

export default App;
