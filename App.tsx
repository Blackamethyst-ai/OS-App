
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from './store';
import { useSystemMind } from './stores/useSystemMind';
import { AppMode, AppTheme } from './types';
import Starfield from './components/Starfield';
import BackgroundEffect from './components/BackgroundEffect';

import CommandPalette from './components/CommandPalette';
import GlobalSearchBar from './components/GlobalSearchBar';
import SystemNotification from './components/SystemNotification';
import NeuralHeader from './components/NeuralHeader';
import OverlayOS from './components/OverlayOS';
import HoloProjector from './components/HoloProjector';
import SynapticRouter from './components/SynapticRouter';
import TimeTravelScrubber from './components/TimeTravelScrubber';
import HelpCenter from './components/HelpCenter';
import ThemeSwitcher from './components/ThemeSwitcher';
import ResearchTray from './components/ResearchTray';
import VoiceManager from './components/VoiceManager';
import VoiceCoreOverlay from './components/VoiceCoreOverlay';
import UserProfileOverlay from './components/UserProfileOverlay';
import VisualCortexOverlay from './components/VisualCortexOverlay';
import FlywheelOrbit from './components/FlywheelOrbit';
import AgenticHUD from './components/AgenticHUD';
import GlobalStatusBar from './components/GlobalStatusBar';
import PeerMeshOverlay from './components/PeerMeshOverlay';
import MetaventionsLogo from './components/MetaventionsLogo';
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
import { agentKernel } from './services/kernel';
import {
    Target, X, User, ExternalLink, Activity, ShieldCheck, Terminal, Cpu,
    Zap, ListTodo, Search, Key
} from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { apiKeyService } from './services/apiKeyService';
import { collabService } from './services/collabService';
import { audio } from './services/audioService';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from './utils/cn';
import ApiKeyModal from './components/ApiKeyModal';

const NAV_CONFIG = [
    { id: AppMode.METAVENTIONS_HUB, label: 'ECOSYSTEM', path: '/metaventions-hub' },
    { id: AppMode.BIBLIOMORPHIC, label: 'RESEARCH', path: '/bibliomorphic' },
    { id: AppMode.PROCESS_MAP, label: 'TOPOLOGY', path: '/process' },
    { id: AppMode.AUTONOMOUS_FINANCE, label: 'TREASURY', path: '/finance' },
    { id: AppMode.CODE_STUDIO, label: 'LOGIC', path: '/code' },
    { id: AppMode.AGENT_CONTROL, label: 'SWARM', path: '/agents' },
    { id: AppMode.MEMORY_CORE, label: 'MEMORY', path: '/memory' },
    { id: AppMode.IMAGE_GEN, label: 'CINEMA', path: '/assets' },
    { id: AppMode.HARDWARE_ENGINEER, label: 'HARDWARE', path: '/hardware' },
    { id: AppMode.VOICE_MODE, label: 'VOICE CORE', path: '/voice' },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'SYNTHESIS', path: '/bridge' },
    { id: 'NEXUS' as any, label: 'NEXUS', path: '/nexus' },
];

const FocusOverlay = () => {
    const selector = useAppStore(s => s.focusedSelector);
    const actions = useAppStore(s => s.actions);
    const [bounds, setBounds] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (selector) {
            const el = document.querySelector(selector);
            if (el) {
                setBounds(el.getBoundingClientRect());
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setBounds(null);
            }
        } else {
            setBounds(null);
        }
    }, [selector]);

    if (!bounds) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] pointer-events-none"
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" style={{
                clipPath: `polygon(0% 0%, 0% 100%, ${bounds.left}px 100%, ${bounds.left}px ${bounds.top}px, ${bounds.right}px ${bounds.top}px, ${bounds.right}px ${bounds.bottom}px, ${bounds.left}px ${bounds.bottom}px, ${bounds.left}px 100%, 100% 100%, 100% 0%)`
            }}></div>
            <motion.div
                animate={{ boxShadow: ['0 0 20px #7B2CFF', '0 0 40px #18E6FF', '0 0 20px #7B2CFF'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute border-2 border-[#7B2CFF] rounded-lg"
                style={{ left: bounds.left - 4, top: bounds.top - 4, width: bounds.width + 8, height: bounds.height + 8 }}
            >
                <div className="absolute -top-8 left-0 bg-gradient-to-r from-[#7B2CFF] to-[#18E6FF] text-black text-[10px] font-black font-mono px-3 py-1 rounded flex items-center gap-2 pointer-events-auto cursor-pointer" onClick={() => actions.setFocusedSelector(null)}>
                    <Target size={12} /> CONTEXT_FOCUS_L0 <X size={10} />
                </div>
            </motion.div>
        </motion.div>
    );
};

const OperationalSidebar = () => {
    const actions = useAppStore(s => s.actions);
    return (
        <motion.aside
            initial={{ x: 450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 450, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[450px] border-l border-white/10 bg-[#0a0a0c]/80 backdrop-blur-5xl z-[150] flex flex-col shadow-2xl relative"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#9d4edd]/20 rounded-xl text-[#9d4edd] shadow-xl">
                        <ListTodo size={18} />
                    </div>
                    <span className="text-xs font-black font-mono text-white uppercase tracking-[0.3em]">Operational Suite</span>
                </div>
                <button onClick={() => actions.setSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-10 relative z-10">
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                        <span>Research Signal Swarm</span>
                        <Zap size={12} className="text-[#f1c21b] animate-pulse" />
                    </div>
                    <ResearchTray />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                        <span>Lattice Diagnostics</span>
                    </div>
                    <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] text-center opacity-40 group hover:opacity-100 transition-all border-dashed">
                        <Activity size={32} className="mx-auto mb-4 text-gray-700 group-hover:text-[#22d3ee] transition-colors" />
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Awaiting Deep Integration...</p>
                    </div>
                </div>
            </div>

            <div className="h-12 border-t border-white/5 bg-black flex items-center justify-between px-8 text-[8px] font-mono text-gray-700 uppercase font-black">
                <div className="flex gap-4">
                    <span className="text-[#10b981]">Auth_Gate: PASS</span>
                    <span>L0_Link: Stable</span>
                </div>
                <span>Zenith_OS_v9.5</span>
            </div>
        </motion.aside>
    );
};

const App: React.FC = () => {
    const mode = useAppStore(s => s.mode);
    const theme = useAppStore(s => s.theme);
    const user = useAppStore(s => s.user);
    const system = useAppStore(s => s.system);
    const holo = useAppStore(s => s.holo);
    const search = useAppStore(s => s.search);
    const authenticated = useAppStore(s => s.authenticated);
    const actions = useAppStore(s => s.actions);
    const isHelpOpen = useAppStore(s => s.isHelpOpen);
    const isScrubberOpen = useAppStore(s => s.isScrubberOpen);
    const isDiagnosticsOpen = useAppStore(s => s.isDiagnosticsOpen);
    const isSidebarOpen = useAppStore(s => s.isSidebarOpen);
    const isHUDClosed = useAppStore(s => s.isHUDClosed);
    const focusedSelector = useAppStore(s => s.focusedSelector);

    const { setSector } = useSystemMind();

    // API Key Modal state
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

    useAutoSave();
    useDaemonSwarm();
    useVoiceControl();
    useResearchAgent();
    useVisualCortex();

    // Agentic Kernel & Biometric Integration
    const biometricSensor = useBiometricSensor();
    const stressDetector = useStressDetector();

    useEffect(() => {
        // Boot the Agentic Kernel
        agentKernel.boot().then(() => {
            actions.addLog('SYSTEM', 'KERNEL: Agentic Kernel booted successfully');
            actions.setKernelState({ operationalState: 'IDLE' });
        }).catch((err) => {
            actions.addLog('ERROR', `KERNEL: Boot failed - ${err.message}`);
        });

        return () => {
            agentKernel.shutdown();
        };
    }, []);

    useEffect(() => {
        collabService.init();
        actions.hydrateAgents();

        // Listen for API key modal events
        const handleShowModal = () => setIsApiKeyModalOpen(true);
        window.addEventListener('show-api-key-modal', handleShowModal);

        // Auto-show modal if no key configured
        let apiKeyTimer: ReturnType<typeof setTimeout> | null = null;
        if (!apiKeyService.hasGeminiKey()) {
            apiKeyTimer = setTimeout(() => setIsApiKeyModalOpen(true), 1500);
        }

        return () => {
            collabService.disconnect();
            window.removeEventListener('show-api-key-modal', handleShowModal);
            if (apiKeyTimer) clearTimeout(apiKeyTimer);
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            useAppStore.setState(state => ({
                kernel: { ...state.kernel, uptime: state.kernel.uptime + 1 }
            }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let warningTimer: ReturnType<typeof setTimeout> | null = null;

        const checkKey = async () => {
            // Check if we have a key in Environment OR LocalStorage
            const hasEnvKey = !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);
            const hasLocalKey = !!localStorage.getItem('gemini_api_key');

            if (!hasEnvKey && !hasLocalKey) {
                console.log("🔐 AUTH EXTENSION: No key found. Triggering auto-prompt.");
                // No key found anywhere. Prompt the user.
                warningTimer = setTimeout(() => {
                    actions.addLog('WARN', 'SECURITY: Neural Uplink Credentials missing.');
                }, 1000);
            } else {
                console.log("🔐 AUTH EXTENSION: Key detected.", { env: hasEnvKey, local: hasLocalKey });
            }
        };
        checkKey();

        return () => {
            if (warningTimer) clearTimeout(warningTimer);
        };
    }, [actions]);

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

    const handleRestore = (state: any) => {
        switch (mode) {
            case AppMode.PROCESS_MAP: actions.setProcessState(state); break;
            case AppMode.CODE_STUDIO: actions.setCodeStudioState(state); break;
            case AppMode.HARDWARE_ENGINEER: actions.setHardwareState(state); break;
            case AppMode.IMAGE_GEN: actions.setImageGenState(state); break;
            case AppMode.BIBLIOMORPHIC: actions.setBibliomorphicState(state); break;
            case AppMode.DASHBOARD: actions.setDashboardState(state); break;
            case AppMode.METAVENTIONS_HUB: actions.setMetaventionsState(state); break;
            case AppMode.AUTONOMOUS_FINANCE: actions.setMetaventionsState(state); break;
            case AppMode.AGENT_CONTROL: actions.setAgentState(state); break;
            case AppMode.SYNTHESIS_BRIDGE: actions.setMetaventionsState(state); break;
            case AppMode.MEMORY_CORE: actions.setMemoryState(state); break;
            case AppMode.VOICE_MODE: actions.setVoiceState(state); break;
            case AppMode.BICAMERAL: actions.setBicameralState(state); break;
        }
        actions.addLog('INFO', 'Timeline resync successful.');
        audio.playSuccess();
    };

    const themeVars = useMemo(() => {
        const isDark = theme !== AppTheme.LIGHT;

        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');

        switch (theme) {
            case AppTheme.LIGHT: return {
                '--bg-app': '#F8FAFC',
                '--bg-header': 'rgba(255, 255, 255, 0.7)',
                '--bg-panel': 'rgba(241, 245, 249, 0.4)',
                '--bg-side': '#F1F5F9',
                '--bg-card-top': 'rgba(255, 255, 255, 0.6)',
                '--bg-card-bottom': 'rgba(241, 245, 249, 0.4)',
                '--text-primary': '#0F172A',
                '--text-muted': '#64748B',
                '--border-main': 'rgba(15, 23, 42, 0.08)',
                '--cyan': '#18E6FF',
                '--amethyst': '#7B2CFF',
                '--plasma-green': '#10b981',
                '--executive-gold': '#f1c21b'
            };
            case AppTheme.AMBER: return {
                '--bg-app': '#0C0600',
                '--bg-header': 'rgba(12, 6, 0, 0.7)',
                '--bg-panel': 'rgba(20, 10, 0, 0.4)',
                '--bg-side': '#0E0700',
                '--bg-card-top': 'rgba(245, 158, 11, 0.12)',
                '--bg-card-bottom': 'rgba(15, 8, 0, 0.08)',
                '--text-primary': '#f59e0b',
                '--text-muted': '#92400e',
                '--border-main': 'rgba(245, 158, 11, 0.15)',
                '--cyan': '#f59e0b',
                '--amethyst': '#b45309',
                '--plasma-green': '#84cc16',
                '--executive-gold': '#fbbf24'
            };
            case AppTheme.MIDNIGHT: return {
                '--bg-app': '#020617',
                '--bg-header': 'rgba(2, 6, 23, 0.8)',
                '--bg-panel': 'rgba(3, 10, 33, 0.4)',
                '--bg-side': '#030a21',
                '--bg-card-top': 'rgba(59, 130, 246, 0.12)',
                '--bg-card-bottom': 'rgba(7, 10, 20, 0.06)',
                '--text-primary': '#e2e8f0',
                '--text-muted': '#64748b',
                '--border-main': 'rgba(59, 130, 246, 0.15)',
                '--cyan': '#38bdf8',
                '--amethyst': '#6366f1',
                '--plasma-green': '#22c55e',
                '--executive-gold': '#eab308'
            };
            case AppTheme.NEON_CYBER: return {
                '--bg-app': '#020204',
                '--bg-header': 'rgba(2, 2, 4, 0.8)',
                '--bg-panel': 'rgba(255, 255, 255, 0.015)',
                '--bg-side': '#050505',
                '--bg-card-top': 'rgba(24, 230, 255, 0.08)',
                '--bg-card-bottom': 'rgba(123, 44, 255, 0.05)',
                '--text-primary': '#18E6FF',
                '--text-muted': '#7B2CFF',
                '--border-main': 'rgba(24, 230, 255, 0.2)',
                '--cyan': '#18E6FF',
                '--amethyst': '#7B2CFF',
                '--plasma-green': '#00ff88',
                '--executive-gold': '#ffdd00'
            };
            default: return {
                '--bg-app': '#020204',
                '--bg-header': 'rgba(2, 2, 4, 0.8)',
                '--bg-panel': 'rgba(255, 255, 255, 0.012)',
                '--bg-side': '#080808',
                '--bg-card-top': 'rgba(255, 255, 255, 0.06)',
                '--bg-card-bottom': 'rgba(255, 255, 255, 0.02)',
                '--text-primary': '#FFFFFF',
                '--text-muted': '#94A3B8',
                '--border-main': 'rgba(255, 255, 255, 0.08)',
                '--cyan': '#18E6FF',
                '--amethyst': '#7B2CFF',
                '--plasma-green': '#10b981',
                '--executive-gold': '#f1c21b'
            };
        }
    }, [theme]);

    const isFixedLayout = useMemo(() =>
        mode === AppMode.METAVENTIONS_HUB || mode === AppMode.DASHBOARD || mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER || mode === AppMode.SYNTHESIS_BRIDGE || mode === AppMode.VOICE_MODE || mode === AppMode.AUTONOMOUS_FINANCE
        , [mode]);

    // MATERIAL SOVEREIGNTY: Deep Refraction Stacking
    const isDeepRefracted = system.isTerminalOpen || holo.isOpen;

    return (
        <div
            className={cn(
                "h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-700 ease-in-out relative",
                isDeepRefracted && "deep-refraction-active"
            )}
            style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', ...themeVars as any }}
        >
            <Starfield mode={mode} />
            <BackgroundEffect isDarkMode={theme !== AppTheme.LIGHT} />


            <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

            <AnimatePresence>
                {!authenticated && <AuthModule />}
            </AnimatePresence>

            <SynapticContextHub />

            <FocusOverlay />
            <VoiceCoreOverlay />
            <UserProfileOverlay />
            <VisualCortexOverlay />
            <CommandPalette />
            <PeerMeshOverlay />
            <SystemNotification isOpen={isDiagnosticsOpen} onClose={() => actions.setDiagnosticsOpen(false)} />
            <TimeTravelScrubber mode={mode} onRestore={handleRestore} isOpen={isScrubberOpen} onClose={() => actions.setScrubberOpen(false)} />
            <OverlayOS />
            <HoloProjector />
            <VoiceManager />
            {/* DreamProtocolWidget is now integrated into GlobalStatusBar pill */}

            {/* API Key Configuration Modal */}
            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
            />

            <AnimatePresence>
                {!isHUDClosed && <AgenticHUD />}
            </AnimatePresence>

            <AnimatePresence>
                {isHelpOpen && <HelpCenter onClose={() => actions.setHelpOpen(false)} />}
            </AnimatePresence>

            <header className="flex-shrink-0 h-[76px] z-[100] px-10 flex items-center justify-between backdrop-blur-3xl bg-[var(--bg-header)] shadow-2xl relative transition-all duration-500 border-b border-[var(--border-main)]">
                {/* Procedural Header Gradient Sweep */}
                <motion.div
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-0 w-full h-[1.5px] bg-[length:200%_auto] bg-gradient-to-r from-[#7B2CFF] via-[#f1c21b] to-[#18E6FF] opacity-80"
                />

                <div className="flex items-center gap-12 h-full w-full max-w-[2800px] mx-auto">
                    <div className="flex items-center gap-4 cursor-pointer group relative shrink-0" onClick={() => window.location.hash = '/metaventions-hub'}>
                        <MetaventionsLogo size={36} showText={true} className={cn("relative z-10 transition-all duration-700 group-hover:scale-110", focusedSelector === 'header' && "scale-125")} />
                    </div>

                    <div className="h-8 w-px bg-white/5 shrink-0" />

                    {/* SYNAPTIC COMMAND BAR: Fluid integration of Tabs and Search */}
                    <motion.div
                        layout
                        className="flex-1 h-[48px] bg-black/20 border border-white/5 rounded-2xl flex items-center px-2 relative group/cmdbar focus-within:border-[#9d4edd]/30 focus-within:bg-black/40 transition-all duration-500 overflow-hidden"
                    >
                        <nav className="flex items-center h-full overflow-x-auto no-scrollbar flex-1 min-w-0">
                            {NAV_CONFIG.map(item => (
                                <motion.button
                                    layout
                                    key={item.id}
                                    whileHover={{
                                        y: -1,
                                        scale: 1.05,
                                        x: [0, -0.5, 0.5, 0]
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { window.location.hash = item.path; audio.playClick(); }}
                                    className="relative h-full px-4 group flex-shrink-0 flex items-center overflow-visible transition-all duration-300"
                                >
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-[0.2em] font-mono transition-all duration-500 relative z-10",
                                        mode === item.id ? 'text-[#18E6FF]' : 'text-[var(--text-muted)] group-hover:text-[#18E6FF]'
                                    )}>
                                        {item.label}
                                    </span>
                                    {mode === item.id && (
                                        <motion.div
                                            layoutId="nav-underline"
                                            className="absolute bottom-[-4px] left-2 right-2 h-[3px] z-20 rounded-full"
                                            initial={{ opacity: 0 }}
                                            animate={{
                                                opacity: 1,
                                                boxShadow: [
                                                    "0 0 10px rgba(24, 230, 255, 0.7), 0 0 20px rgba(24, 230, 255, 0.4)",
                                                    "0 0 20px rgba(123, 44, 255, 0.9), 0 0 40px rgba(123, 44, 255, 0.5)",
                                                    "0 0 10px rgba(24, 230, 255, 0.7), 0 0 20px rgba(24, 230, 255, 0.4)"
                                                ],
                                                background: [
                                                    "linear-gradient(90deg, #7B2CFF, #18E6FF)",
                                                    "linear-gradient(90deg, #18E6FF, #7B2CFF)",
                                                    "linear-gradient(90deg, #7B2CFF, #18E6FF)"
                                                ]
                                            }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </nav>

                        <div className="h-6 w-px bg-white/5 shrink-0 mx-2" />

                        {/* LOCATE INTELLIGENCE: Connected and Flexible */}
                        <div className={cn(
                            "relative flex items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                            search.isOpen ? "w-[300px] lg:w-[400px]" : "w-12 md:w-64"
                        )}>
                            <GlobalSearchBar isIntegrated />
                        </div>
                    </motion.div>

                    <div className="h-8 w-px bg-white/5 shrink-0" />

                    <div className="flex items-center gap-6 shrink-0 h-full">
                        <div className="flex items-center gap-4">
                            <ThemeSwitcher />
                            <button
                                onClick={() => { actions.toggleProfile(true); audio.playClick(); }}
                                className={cn(
                                    "group/user relative p-1.5 transition-all rounded-full border border-white/5 bg-black/40 hover:border-[#9d4edd]/50 hover:shadow-[0_0_30px_rgba(157,78,221,0.3)]",
                                    focusedSelector === 'header button' && "scale-110 border-[#9d4edd]"
                                )}
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative border border-white/5">
                                    {user.avatar ? (
                                        <img src={user.avatar} className="w-full h-full object-cover" alt="Identity" />
                                    ) : (
                                        <User size={18} className="text-gray-600 group-hover/user:text-[#9d4edd]" />
                                    )}
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0a] border border-[#10b981]/50 rounded-full flex items-center justify-center z-10"
                                >
                                    <ShieldCheck size={12} className="text-[#10b981]" />
                                </motion.div>
                            </button>
                        </div>

                        <button
                            onClick={() => { actions.toggleCommandPalette(); audio.playClick(); }}
                            className={cn(
                                "relative group/eco px-6 py-2.5 bg-[#050505] border border-white/10 hover:border-[#f1c21b]/50 rounded-2xl transition-all duration-700 shadow-2xl overflow-hidden active:scale-95 shimmer-edge hidden xl:flex",
                                focusedSelector === 'header button:last-child' && "scale-110 border-[#f1c21b]"
                            )}
                        >
                            <span className="relative z-10 text-[10px] font-black font-mono tracking-[0.3em] uppercase flex items-center gap-4 text-gray-500 group-hover:text-[#f1c21b] transition-all">
                                <Terminal size={14} />
                                SYSTEM_KERNEL
                                <div className="w-1.5 h-1.5 rounded-full bg-[#f1c21b] animate-pulse" />
                            </span>
                        </button>
                    </div>
                </div>
            </header>

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
                    {isSidebarOpen && <OperationalSidebar />}
                </AnimatePresence>
            </div>

            <AppFooter />
        </div>
    );
};

export default App;
