
import React, { useEffect, Suspense, lazy } from 'react';
import { useAppStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { useSystemMind } from './stores/useSystemMind';
import { AppTheme } from './types';
import Starfield from './components/Starfield';
import { BackgroundEffect } from './components/shared';
import { CommandPalette } from './components/core';
import SystemNotification from './components/SystemNotification';
import SynapticRouter from './components/SynapticRouter';
import GlobalStatusBar from './components/GlobalStatusBar';
import AppFooter from './components/AppFooter';
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
import { AnimatePresence } from 'motion/react';
import { cn } from './utils/cn';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import AppHeader from './components/layout/AppHeader';

// Lazy-loaded components (conditionally rendered, not needed on first paint)
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const AgenticHUD = lazy(() => import('./components/agents/AgenticHUD'));
const TimeTravelScrubber = lazy(() => import('./components/TimeTravelScrubber'));
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal'));
const OverlayOS = lazy(() => import('./components/OverlayOS'));
const HoloProjector = lazy(() => import('./components/HoloProjector'));
const UserProfileOverlay = lazy(() => import('./components/UserProfileOverlay'));
const VisualCortexOverlay = lazy(() => import('./components/VisualCortexOverlay'));
const PeerMeshOverlay = lazy(() => import('./components/PeerMeshOverlay'));
const AuthModule = lazy(() => import('./components/AuthModule'));
const SynapticContextHub = lazy(() => import('./components/SynapticContextHub'));
const MasterStabilizationProtocol = lazy(() => import('./components/MasterStabilizationProtocol'));
const FocusOverlay = lazy(() => import('./components/overlays/FocusOverlay'));
const VoiceSystem = lazy(() => import('./components/voice/VoiceSystem'));
const OperationalSidebar = lazy(() => import('./components/OperationalSidebar'));
const PredictionDemo = lazy(() => import('./components/predictions/PredictionDemo'));

const App: React.FC = () => {
    // Batched selectors to reduce subscription overhead
    const {
        mode,
        theme,
        system,
        holo,
        authenticated,
        actions,
        isHelpOpen,
        isScrubberOpen,
        isDiagnosticsOpen,
        isSidebarOpen,
        isHUDClosed,
    } = useAppStore(useShallow(s => ({
        mode: s.mode,
        theme: s.theme,
        system: s.system,
        holo: s.holo,
        authenticated: s.authenticated,
        actions: s.actions,
        isHelpOpen: s.isHelpOpen,
        isScrubberOpen: s.isScrubberOpen,
        isDiagnosticsOpen: s.isDiagnosticsOpen,
        isSidebarOpen: s.isSidebarOpen,
        isHUDClosed: s.isHUDClosed,
    })));

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
                <Suspense fallback={null}><MasterStabilizationProtocol /></Suspense>
                <Starfield mode={mode} />
                <BackgroundEffect isDarkMode={theme !== AppTheme.LIGHT} />


                <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

                {/* SOVEREIGN GATE: Hard authentication barrier */}
                {!authenticated ? (
                    <Suspense fallback={null}><AuthModule /></Suspense>
                ) : (
                    <>
                        <Suspense fallback={null}>
                            <SynapticContextHub />
                            <FocusOverlay />
                            <UserProfileOverlay />
                            <VisualCortexOverlay />
                        </Suspense>
                        <CommandPalette />
                        <Suspense fallback={null}>
                            <PeerMeshOverlay />
                        </Suspense>
                        <SystemNotification isOpen={isDiagnosticsOpen} onClose={() => actions.setDiagnosticsOpen(false)} />
                        <Suspense fallback={null}>
                            <OverlayOS />
                            <HoloProjector />
                        </Suspense>

                        {/* Unified Voice Stack (always mounted for voice functionality) */}
                        <Suspense fallback={null}><VoiceSystem /></Suspense>

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
