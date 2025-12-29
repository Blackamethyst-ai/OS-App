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

import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { useResearchAgent } from './hooks/useResearchAgent'; 
import { useVisualCortex } from './hooks/useVisualCortex';
import { 
    Target, X, User, ExternalLink, Activity
} from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { collabService } from './services/collabService';
import { audio } from './services/audioService'; 
import { AnimatePresence, motion } from 'framer-motion';

const NAV_CONFIG = [
  { id: AppMode.METAVENTIONS_HUB, label: 'METAVENTIONS HUB', path: '/metaventions-hub' },
  { id: AppMode.DASHBOARD, label: 'HUB', path: '/dashboard' },
  { id: AppMode.BIBLIOMORPHIC, label: 'LAB', path: '/bibliomorphic' },
  { id: AppMode.PROCESS_MAP, label: 'MAPPER', path: '/process' },
  { id: AppMode.AUTONOMOUS_FINANCE, label: 'TREASURY', path: '/finance' },
  { id: AppMode.CODE_STUDIO, label: 'LOGIC', path: '/code' },
  { id: AppMode.AGENT_CONTROL, label: 'SWARM', path: '/agents' },
  { id: AppMode.MEMORY_CORE, label: 'VAULT', path: '/memory' },
  { id: AppMode.IMAGE_GEN, label: 'ASSETS', path: '/assets' },
  { id: AppMode.HARDWARE_ENGINEER, label: 'INFRA', path: '/hardware' },
  { id: AppMode.VOICE_MODE, label: 'VOICE CORE', path: '/voice' },
  { id: AppMode.SYNTHESIS_BRIDGE, label: 'BRIDGE', path: '/bridge' },
  { id: 'NEXUS' as any, label: 'NEXUS', path: '/nexus' },
];

const FocusOverlay = () => {
    const selector = useAppStore(s => s.focusedSelector);
    const setFocusedSelector = useAppStore(s => s.setFocusedSelector);
    const [bounds, setBounds] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!selector) { setBounds(null); return; }
        const el = document.querySelector(selector);
        if (el) {
            setBounds(el.getBoundingClientRect());
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" style={{ 
                clipPath: `polygon(0% 0%, 0% 100%, ${bounds.left}px 100%, ${bounds.left}px ${bounds.top}px, ${bounds.right}px ${bounds.top}px, ${bounds.right}px ${bounds.bottom}px, ${bounds.left}px ${bounds.bottom}px, ${bounds.left}px 100%, 100% 100%, 100% 0%)`
            }}></div>
            <motion.div 
                animate={{ boxShadow: ['0 0 20px #9d4edd', '0 0 40px #9d4edd', '0 0 20px #9d4edd'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute border-2 border-[#9d4edd] rounded"
                style={{ left: bounds.left - 4, top: bounds.top - 4, width: bounds.width + 8, height: bounds.height + 8 }}
            >
                <div className="absolute -top-8 left-0 bg-[#9d4edd] text-black text-[10px] font-black font-mono px-2 py-0.5 rounded flex items-center gap-2 pointer-events-auto cursor-pointer" onClick={() => setFocusedSelector(null)}>
                    <Target size={12}/> CONTEXT_FOCUS_L0 <X size={10} />
                </div>
            </motion.div>
        </motion.div>
    );
};

const App: React.FC = () => {
  const { 
      mode, theme, voice, toggleProfile, toggleCommandPalette, 
      setSearchState, setVoiceState, addLog, 
      isHelpOpen, setHelpOpen, 
      isScrubberOpen, setScrubberOpen, 
      isDiagnosticsOpen, setDiagnosticsOpen, 
      isHUDClosed, setHUDClosed 
  } = useAppStore();
  
  const { setSector } = useSystemMind(); 

  useAutoSave(); 
  useDaemonSwarm(); 
  useVoiceControl(); 
  useResearchAgent(); 
  useVisualCortex();

  useEffect(() => {
    collabService.init();
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
                addLog('WARN', 'SECURITY: API Key missing.'); 
                await promptSelectKey(); 
            }
        }
    };
    checkKey();
  }, [addLog]);

  useEffect(() => { setSector(mode); }, [mode, setSector]);

  const themeVars = useMemo(() => {
      const isDark = theme !== AppTheme.LIGHT;
      
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');

      // Alpha values dropped significantly (0.05 to 0.12 range) for "Actual Glass" look
      switch (theme) {
          case AppTheme.LIGHT: return { 
              '--bg-app': '#F5F7FA', 
              '--bg-header': 'rgba(255, 255, 255, 0.4)',
              '--bg-panel': 'rgba(255, 255, 255, 0.1)',
              '--bg-side': '#f8f9fb',
              '--bg-card-top': 'rgba(255, 255, 255, 0.12)', 
              '--bg-card-bottom': 'rgba(240, 240, 245, 0.05)', 
              '--text-primary': '#0B1020', 
              '--text-muted': '#666666',
              '--border-main': 'rgba(11, 16, 32, 0.1)'
          };
          case AppTheme.AMBER: return { 
              '--bg-app': '#0a0500', 
              '--bg-header': 'rgba(10, 5, 0, 0.5)',
              '--bg-panel': 'rgba(13, 7, 0, 0.2)',
              '--bg-side': '#0d0700',
              '--bg-card-top': 'rgba(245, 158, 11, 0.08)', 
              '--bg-card-bottom': 'rgba(15, 8, 0, 0.05)', 
              '--text-primary': '#f59e0b', 
              '--text-muted': '#78350f',
              '--border-main': 'rgba(245, 158, 11, 0.12)'
          };
          case AppTheme.MIDNIGHT: return { 
              '--bg-app': '#020617', 
              '--bg-header': 'rgba(2, 6, 23, 0.5)',
              '--bg-panel': 'rgba(3, 10, 33, 0.2)',
              '--bg-side': '#030a21',
              '--bg-card-top': 'rgba(59, 130, 246, 0.1)', 
              '--bg-card-bottom': 'rgba(7, 10, 20, 0.05)', 
              '--text-primary': '#e2e8f0', 
              '--text-muted': '#64748b',
              '--border-main': 'rgba(59, 130, 246, 0.12)'
          };
          case AppTheme.NEON_CYBER: return { 
              '--bg-app': '#010101', 
              '--bg-header': 'rgba(1, 1, 1, 0.5)',
              '--bg-panel': 'rgba(5, 5, 5, 0.2)',
              '--bg-side': '#050505',
              '--bg-card-top': 'rgba(217, 70, 239, 0.06)', 
              '--bg-card-bottom': 'rgba(0, 5, 15, 0.04)', 
              '--text-primary': '#22d3ee', 
              '--text-muted': '#d946ef',
              '--border-main': 'rgba(217, 70, 239, 0.15)'
          };
          default: return { 
              '--bg-app': '#05070D', 
              '--bg-header': 'rgba(3, 3, 3, 0.5)',
              '--bg-panel': 'rgba(10, 10, 10, 0.2)',
              '--bg-side': '#080808',
              '--bg-card-top': 'rgba(255, 255, 255, 0.05)', 
              '--bg-card-bottom': 'rgba(255, 255, 255, 0.02)', 
              '--text-primary': '#ffffff', 
              '--text-muted': '#a3a3a3',
              '--border-main': 'rgba(255, 255, 255, 0.08)'
          };
      }
  }, [theme]);

  const isFixedLayout = useMemo(() => 
    mode === AppMode.METAVENTIONS_HUB || mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER || mode === AppMode.SYNTHESIS_BRIDGE || mode === AppMode.VOICE_MODE || mode === AppMode.AUTONOMOUS_FINANCE
  , [mode]);

  return (
    <div 
        className="h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-700 ease-in-out relative" 
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', ...themeVars as any }}
    >
      <Starfield mode={mode} />
      <BackgroundEffect isDarkMode={theme !== AppTheme.LIGHT} />
      
      <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

      <GlobalStatusBar />

      <FocusOverlay />
      <VoiceCoreOverlay /> 
      <UserProfileOverlay /> 
      <VisualCortexOverlay />
      <CommandPalette /> 
      <PeerMeshOverlay />
      <SystemNotification isOpen={isDiagnosticsOpen} onClose={() => setDiagnosticsOpen(false)} /> 
      <TimeTravelScrubber mode={mode} onRestore={() => addLog('INFO', 'Timeline resync successful.')} isOpen={isScrubberOpen} onClose={() => setScrubberOpen(false)} />
      <OverlayOS /> 
      <HoloProjector /> 
      <ResearchTray /> 
      <VoiceManager /> 
      
      <AnimatePresence>
        {!isHUDClosed && <AgenticHUD />}
      </AnimatePresence>
      
      <AnimatePresence>
        {isHelpOpen && <HelpCenter onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>

      <header className="flex-shrink-0 h-[56px] border-b border-[var(--border-main)] z-[100] px-6 flex items-center justify-between backdrop-blur-3xl bg-[var(--bg-header)] shadow-xl relative transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[#7b2cbf] via-[#f1c21b] to-[#7b2cbf] opacity-40" />

        <div className="flex items-center gap-8 h-full">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.location.hash = '/dashboard'}>
                <MetaventionsLogo size={24} showText={true} />
            </div>
            <div className="h-4 w-px bg-[var(--border-main)]" />
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[1400px] h-full">
                {NAV_CONFIG.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => window.location.hash = item.path} 
                        className="relative h-full px-3.5 group flex-shrink-0 flex items-center"
                    >
                        <span className={`text-[9px] font-black uppercase tracking-[0.25em] font-mono transition-all duration-500 ${mode === item.id ? 'text-[#f1c21b]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>
                            {item.label}
                        </span>
                        {mode === item.id && (
                            <motion.div layoutId="activeTabGlow" className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-[#7b2cbf] via-[#f1c21b] to-[#7b2cbf] shadow-[0_0_12px_rgba(241,194,27,0.6)]" />
                        )}
                    </button>
                ))}
            </nav>
        </div>

        <div className="flex items-center gap-4 h-full">
            <GlobalSearchBar />
            <div className="h-4 w-px bg-[var(--border-main)]" />
            <div className="flex items-center gap-1">
                <ThemeSwitcher />
                <button onClick={() => toggleProfile(true)} className="p-2 text-[var(--text-muted)] hover:text-[#f1c21b] transition-all rounded-lg hover:bg-black/5">
                    <User size={16} />
                </button>
            </div>
            <button onClick={() => toggleCommandPalette()} className="relative group/eco px-4 py-1.5 bg-[var(--bg-app)] border border-[var(--border-main)] hover:border-[#f1c21b]/40 rounded-lg transition-all duration-500 shadow-lg overflow-hidden active:scale-95">
                <span className="relative z-10 text-[8px] font-black font-mono tracking-[0.2em] uppercase flex items-center gap-2 text-[#f1c21b]">
                    SYSTEMS
                    <ExternalLink size={10} className="text-[var(--text-muted)] group-hover:text-[#f1c21b] transition-colors" />
                </span>
            </button>
        </div>
      </header>

      <div className={`flex-1 relative flex flex-col min-h-0 ${isFixedLayout ? 'pb-0' : 'pb-1 overflow-y-auto custom-scrollbar'}`}>
        <SynapticRouter />
      </div>

      <AppFooter />
    </div>
  );
};

export default App;