
import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useAppStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { useSystemMind } from './stores/useSystemMind';
import { AppTheme } from './types';
import Starfield from './components/Starfield';
import { BackgroundEffect } from './components/shared';
import CommandPalette from './components/core/CommandPalette';
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
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useIsMobile } from './hooks/useMobileDetect';
import { useNavigation } from './hooks/useNavigation';
import { hasFixedLayout } from './config/navigation';
import { audio } from './services/audioService';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './utils/cn';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import AppHeader from './components/layout/AppHeader';
import { Menu } from 'lucide-react';

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
const WelcomeOverlay = lazy(() => import('./components/WelcomeOverlay'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
const ToastSystem = lazy(() => import('./components/ToastSystem'));

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

    // Mobile responsive state
    const isMobile = useIsMobile();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        const handleHashChange = () => setMobileMenuOpen(false);
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

    // Settings panel state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Listen for settings toggle from AppHeader gear icon
    useEffect(() => {
        const handleToggle = () => setIsSettingsOpen(prev => !prev);
        window.addEventListener('toggle-settings-panel', handleToggle);
        return () => window.removeEventListener('toggle-settings-panel', handleToggle);
    }, []);

    // Prediction demo toggle (via URL param: ?demo=predictions)
    const [showPredictionDemo, setShowPredictionDemo] = React.useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('demo') === 'predictions';
    });

    // Welcome overlay — shown once for first-time users
    const [showWelcome, setShowWelcome] = React.useState(
        () => !localStorage.getItem('metaventions_onboarded')
    );

    const { setSector } = useSystemMind();

    // Auth persistence (restore login state from localStorage)
    useAuthPersistence();

    // Hooks
    const { isOpen: isApiKeyModalOpen, setIsOpen: setIsApiKeyModalOpen } = useApiKeyModal();
    const { restore } = useTimeTravel();
    useKernelUptime();
    useKernelLifecycle();

    useGlobalShortcuts();
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
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--amethyst)] focus:text-white focus:rounded-lg focus:text-sm focus:font-mono"
                >
                    Skip to main content
                </a>
                <Suspense fallback={null}><MasterStabilizationProtocol /></Suspense>
                <Starfield mode={mode} />
                <BackgroundEffect isDarkMode={theme !== AppTheme.LIGHT} />


                <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

                {/* SOVEREIGN GATE: Hard authentication barrier */}
                {!authenticated ? (
                    <Suspense fallback={null}><AuthModule /></Suspense>
                ) : (
                    <>
                        {/* Welcome onboarding overlay — first-time users only */}
                        {showWelcome && (
                            <Suspense fallback={null}>
                                <WelcomeOverlay />
                            </Suspense>
                        )}

                        <Suspense fallback={null}><ToastSystem /></Suspense>
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

                        {/* Settings Panel (lazy-loaded, slides from right) */}
                        <Suspense fallback={null}>
                            <SettingsPanel
                                isOpen={isSettingsOpen}
                                onClose={() => setIsSettingsOpen(false)}
                                onOpenApiKeyModal={() => { setIsSettingsOpen(false); setIsApiKeyModalOpen(true); }}
                            />
                        </Suspense>

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

                        {/* Mobile Header Bar — hamburger + title (mobile only) */}
                        <div className="flex md:hidden items-center justify-between h-14 px-4 bg-[var(--bg-header)] border-b border-[var(--border-main)] backdrop-blur-3xl z-[100] shrink-0">
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="p-2 rounded-xl border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:border-[var(--amethyst-soft)]/40 transition-all"
                                aria-label="Open menu"
                            >
                                <Menu size={22} />
                            </button>
                            <span className="text-xs font-black font-mono text-white/80 uppercase tracking-[0.2em]">Metaventions OS</span>
                            <div className="w-10" />
                        </div>

                        {/* Desktop Header (hidden on mobile) */}
                        <div className="hidden md:block">
                            <AppHeader />
                        </div>

                        {/* OS Kernel Dock Layer */}
                        <GlobalStatusBar />

                        <div id="main-content" className="flex-1 flex overflow-hidden relative">
                            <div className={cn(
                                "w-full flex-1 relative flex flex-col min-h-0 transition-all duration-1000 main-content-layer",
                                isFixedLayout ? 'pb-0 overflow-hidden' : 'pb-1 overflow-y-auto no-scrollbar'
                            )}
                                style={{
                                    '--soc-height': '1000px',
                                    '--metrics-belt-gap': '-2rem',
                                } as React.CSSProperties}
                            >
                                <SynapticRouter />
                            </div>

                            {/* Desktop sidebar */}
                            <AnimatePresence>
                                {isSidebarOpen && !isMobile && (
                                    <Suspense fallback={null}>
                                        <OperationalSidebar />
                                    </Suspense>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile sidebar overlay */}
                        <AnimatePresence>
                            {mobileMenuOpen && isMobile && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]"
                                        onClick={closeMobileMenu}
                                    />
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '-100%' }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[380px] z-[999] bg-[#0a0a0c]/95 backdrop-blur-3xl border-r border-white/10 shadow-2xl flex flex-col"
                                    >
                                        <div className="h-14 border-b border-white/5 flex items-center justify-between px-5 bg-black/20 shrink-0">
                                            <span className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">Navigation</span>
                                            <button onClick={closeMobileMenu} className="text-gray-500 hover:text-white transition-colors p-1">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                        </div>
                                        <MobileNavContent onClose={closeMobileMenu} />
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>

                        <AppFooter />
                    </>
                )}
            </div>
        </GlobalErrorBoundary>
    );
};

/** Mobile slide-in navigation panel */
const MobileNavContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const mode = useAppStore(s => s.mode);
    const actions = useAppStore(s => s.actions);
    const { navItems } = useNavigation();

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3">
            <div className="space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            window.location.hash = item.path;
                            audio.playClick();
                            onClose();
                        }}
                        className={cn(
                            "w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center gap-3",
                            mode === item.id
                                ? "bg-white/[0.06] text-[var(--cyan)] border border-[var(--cyan)]/20"
                                : "text-gray-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                        )}
                    >
                        <span className="text-[11px] font-black font-mono uppercase tracking-[0.15em]">
                            {item.label}
                        </span>
                        {mode === item.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_6px_var(--cyan)] ml-auto" />
                        )}
                    </button>
                ))}
            </div>

            {/* Sidebar toggle in mobile menu */}
            <div className="mt-8 px-2">
                <div className="h-px bg-white/5 mb-4" />
                <button
                    onClick={() => {
                        actions.setSidebarOpen(true);
                        onClose();
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/5 flex items-center gap-3"
                >
                    <span className="text-[10px] font-black font-mono uppercase tracking-[0.15em]">Operational Suite</span>
                </button>
            </div>
        </div>
    );
};

export default App;
