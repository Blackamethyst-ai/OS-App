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

import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { useResearchAgent } from './hooks/useResearchAgent'; 
import { useVisualCortex } from './hooks/useVisualCortex';
import { 
    Target, X, User, ExternalLink, Activity, ShieldCheck, Terminal, Cpu
} from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { collabService } from './services/collabService';
import { audio } from './services/audioService'; 
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from './utils/cn';

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
                    <Target size={12}/> CONTEXT_FOCUS_L0 <X size={10} />
                </div>
            </motion.div>
        </motion.div>
    );
};

const App: React.FC = () => {
  const mode = useAppStore(s => s.mode);
  const theme = useAppStore(s => s.theme);
  const user = useAppStore(s => s.user);
  const authenticated = useAppStore(s => s.authenticated);
  const actions = useAppStore(s => s.actions);
  const isHelpOpen = useAppStore(s => s.isHelpOpen);
  const isScrubberOpen = useAppStore(s => s.isScrubberOpen);
  const isDiagnosticsOpen = useAppStore(s => s.isDiagnosticsOpen);
  const isHUDClosed = useAppStore(s => s.isHUDClosed);
  const focusedSelector = useAppStore(s => s.focusedSelector);
  
  const { setSector } = useSystemMind(); 

  useAutoSave(); 
  useDaemonSwarm(); 
  useVoiceControl(); 
  useResearchAgent(); 
  useVisualCortex();

  useEffect(() => {
    collabService.init();
    actions.hydrateAgents(); 
    return () => collabService.disconnect();
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
    const checkKey = async () => {
        if (window.aistudio?.hasSelectedApiKey) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) { 
                actions.addLog('WARN', 'SECURITY: API Key missing.'); 
                await promptSelectKey(); 
            }
        }
    };
    checkKey();
  }, []);

  useEffect(() => { setSector(mode); }, [mode, setSector]);

  const handleRestore = (state: any) => {
    switch(mode) {
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
              '--amethyst': '#7B2CFF'
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
              '--amethyst': '#78350f'
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
              '--amethyst': '#6366f1'
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
              '--amethyst': '#7B2CFF'
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
              '--amethyst': '#7B2CFF'
          };
      }
  }, [theme]);

  const isFixedLayout = useMemo(() => 
    mode === AppMode.METAVENTIONS_HUB || mode === AppMode.DASHBOARD || mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER || mode === AppMode.SYNTHESIS_BRIDGE || mode === AppMode.VOICE_MODE || mode === AppMode.AUTONOMOUS_FINANCE
  , [mode]);

  return (
    <div 
        className="h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-700 ease-in-out relative" 
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', ...themeVars as any }}
    >
      <Starfield mode={mode} />
      <BackgroundEffect isDarkMode={theme !== AppTheme.LIGHT} />
      
      <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

      <AnimatePresence>
        {!authenticated && <AuthModule />}
      </AnimatePresence>

      {/* OS Kernel Layer */}
      <GlobalStatusBar />
      
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
      <ResearchTray /> 
      <VoiceManager /> 
      
      <AnimatePresence>
        {!isHUDClosed && <AgenticHUD />}
      </AnimatePresence>
      
      <AnimatePresence>
        {isHelpOpen && <HelpCenter onClose={() => actions.setHelpOpen(false)} />}
      </AnimatePresence>

      <header className="flex-shrink-0 h-[70px] border-b border-[var(--border-main)] z-[100] px-10 flex items-center justify-between backdrop-blur-3xl bg-[var(--bg-header)] shadow-2xl relative transition-all duration-500">
        {/* Procedural Header Gradient Sweep */}
        <motion.div 
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-[1.5px] bg-[length:200%_auto] bg-gradient-to-r from-[#7B2CFF] via-[#f1c21b] to-[#18E6FF] opacity-80" 
        />

        <div className="flex items-center gap-12 h-full">
            <div className="flex items-center gap-4 cursor-pointer group relative" onClick={() => window.location.hash = '/metaventions-hub'}>
                {/* Focal Logo Glow */}
                <div className="absolute inset-[-30px] bg-[radial-gradient(circle,rgba(157,78,221,0.2)_0%,transparent_75%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <MetaventionsLogo size={36} showText={true} className={cn("relative z-10 transition-all duration-700 group-hover:scale-110", focusedSelector === 'header' && "scale-125")} />
            </div>
            <div className="h-6 w-px bg-white/5" />
            <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[1400px] h-full">
                {NAV_CONFIG.map(item => (
                    <motion.button 
                        key={item.id} 
                        whileHover={{ 
                            y: -1, 
                            scale: 1.05,
                            x: [0, -0.5, 0.5, 0] 
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { window.location.hash = item.path; audio.playClick(); }} 
                        className="relative h-full px-5 group flex-shrink-0 flex items-center overflow-hidden"
                    >
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] font-mono transition-all duration-500 relative z-10 ${mode === item.id ? 'text-[#18E6FF]' : 'text-[var(--text-muted)] group-hover:text-[#18E6FF] group-hover:[text-shadow:0_0_8px_var(--cyan)]'}`}>
                            {item.label}
                        </span>
                        {mode === item.id && (
                            <>
                                <motion.div 
                                    layoutId="laser-focus" 
                                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#18E6FF] to-transparent shadow-[0_0_15px_var(--cyan)] z-20" 
                                />
                                <motion.div 
                                    layoutId="laser-bleed"
                                    className="absolute inset-0 bg-gradient-to-t from-[#18E6FF]/10 to-transparent pointer-events-none z-0"
                                />
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                ))}
            </nav>
        </div>

        <div className="flex items-center gap-8 h-full">
            {/* Neural Probe Search bar */}
            <div className={cn(
                "relative group transition-all duration-500",
                focusedSelector === 'header input' && "scale-110 ring-2 ring-[#9d4edd]/40 rounded-full"
            )}>
                <GlobalSearchBar />
                <div className="absolute inset-x-0 bottom-[-2px] h-[1px] bg-[#9d4edd]/0 group-focus-within:bg-[#9d4edd]/50 transition-all duration-500 blur-sm" />
                {focusedSelector === 'header input' && (
                    <div className="absolute -inset-2 border border-dashed border-[#9d4edd]/30 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none" />
                )}
            </div>

            <div className="h-6 w-px bg-white/5" />

            <div className="flex items-center gap-5">
                <ThemeSwitcher />
                
                {/* Enhanced Biometric Identity Node */}
                <button 
                    onClick={() => { actions.toggleProfile(true); audio.playClick(); }} 
                    className={cn(
                        "group/user relative p-1.5 transition-all rounded-full border border-white/5 bg-black/40 hover:border-[#9d4edd]/50 hover:shadow-[0_0_30px_rgba(157,78,221,0.3)]",
                        focusedSelector === 'header button' && "scale-110 border-[#9d4edd]"
                    )}
                >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative border border-white/5 shadow-inner">
                        {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover grayscale-[30%] group-hover/user:grayscale-0 transition-all duration-1000" alt="Identity" />
                        ) : (
                            <User size={18} className="text-gray-600 group-hover/user:text-[#9d4edd] transition-colors" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/20 to-transparent opacity-0 group-hover/user:opacity-100 transition-opacity" />
                        
                        {/* Dynamic Scanning Ring */}
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-4px] border border-dashed border-[#9d4edd]/20 rounded-full pointer-events-none"
                        />
                    </div>
                    
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0a] border border-[#10b981]/50 rounded-full flex items-center justify-center shadow-2xl z-10"
                    >
                        <ShieldCheck size={12} className="text-[#10b981]" />
                    </motion.div>
                </button>
            </div>

            {/* Kernel Port Toggle */}
            <button 
                onClick={() => { actions.toggleCommandPalette(); audio.playClick(); }} 
                className={cn(
                    "relative group/eco px-6 py-2.5 bg-[#050505] border border-white/10 hover:border-[#f1c21b]/50 rounded-2xl transition-all duration-700 shadow-2xl overflow-hidden active:scale-95 shimmer-edge",
                    focusedSelector === 'header button:last-child' && "scale-110 border-[#f1c21b]"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-[#f1c21b]/10 to-transparent opacity-0 group-hover/eco:opacity-100 transition-opacity" />
                <span className="relative z-10 text-[10px] font-black font-mono tracking-[0.3em] uppercase flex items-center gap-4 text-gray-500 group-hover:text-[#f1c21b] transition-all">
                    <Terminal size={14} className="group-hover:rotate-12 transition-transform" />
                    SYSTEM_KERNEL
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f1c21b] animate-pulse shadow-[0_0_10px_#f1c21b]" />
                </span>
            </button>
        </div>
      </header>

      <div className={cn(
          "flex-1 relative flex flex-col min-h-0 transition-all duration-1000",
          isFixedLayout ? 'pb-0' : 'pb-1 overflow-y-auto custom-scrollbar'
      )}>
        <SynapticRouter />
      </div>

      <AppFooter />
    </div>
  );
};

export default App;