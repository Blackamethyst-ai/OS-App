import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from './store';
import { useSystemMind } from './stores/useSystemMind'; 
import { AppMode, AppTheme } from './types';
import Starfield from './components/Starfield';

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
import FlywheelOrbit from './components/FlywheelOrbit';
import AgenticHUD from './components/AgenticHUD';
import GlobalStatusBar from './components/GlobalStatusBar';
import PeerMeshOverlay from './components/PeerMeshOverlay';
import MetaventionsLogo from './components/MetaventionsLogo';

import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { useResearchAgent } from './hooks/useResearchAgent'; 
import { 
    Target, X, User, ExternalLink, Activity
} from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { collabService } from './services/collabService';
import { audio } from './services/audioService'; 
import { AnimatePresence, motion } from 'framer-motion';

// --- NAVIGATION CONFIGURATION (Prestigious Suite) ---
const NAV_CONFIG = [
  { id: AppMode.DASHBOARD, label: 'CORE', path: '/dashboard' },
  { id: AppMode.BIBLIOMORPHIC, label: 'VISION', path: '/bibliomorphic' },
  { id: AppMode.PROCESS_MAP, label: 'LOGIC', path: '/process' },
  { id: AppMode.AUTONOMOUS_FINANCE, label: 'TREASURY', path: '/finance' },
  { id: AppMode.CODE_STUDIO, label: 'FORGE', path: '/code' },
  { id: AppMode.AGENT_CONTROL, label: 'SWARM', path: '/agents' },
  { id: AppMode.MEMORY_CORE, label: 'VAULT', path: '/memory' },
  { id: AppMode.IMAGE_GEN, label: 'STUDIO', path: '/assets' },
  { id: AppMode.HARDWARE_ENGINEER, label: 'LATTICE', path: '/hardware' },
  { id: AppMode.VOICE_MODE, label: 'VOICE', path: '/voice' },
  { id: AppMode.SYNTHESIS_BRIDGE, label: 'BRIDGE', path: '/bridge' },
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

  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') { 
              e.preventDefault(); toggleCommandPalette(); audio.playClick(); 
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 's') { 
              e.preventDefault(); setSearchState({ isOpen: true }); audio.playClick(); 
          }
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') { 
              e.preventDefault(); setVoiceState({ isActive: !voice.isActive }); audio.playClick(); 
          }
          if (e.key === 'F1') {
              e.preventDefault(); setHelpOpen(!isHelpOpen); audio.playClick();
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [voice.isActive, isHelpOpen, toggleCommandPalette, setSearchState, setVoiceState, setHelpOpen]);

  const switchPath = (path: string) => {
      window.location.hash = path;
      audio.playTransition();
  };

  const themeVars = useMemo(() => {
      switch (theme) {
          case AppTheme.LIGHT: return { '--bg-main': '#f5f5f5', '--text-main': '#171717', '--border-main': '#e5e5e5' };
          case AppTheme.AMBER: return { '--bg-main': '#0a0500', '--text-main': '#f59e0b', '--border-main': '#451a03' };
          case AppTheme.MIDNIGHT: return { '--bg-main': '#020617', '--text-main': '#e2e8f0', '--border-main': '#1e293b' };
          default: return { '--bg-main': '#020203', '--text-main': '#e5e5e5', '--border-main': '#1f1f1f', '--accent-gold': '#f1c21b', '--accent-purple': '#7b2cbf' };
      }
  }, [theme]);

  const isFixedLayout = useMemo(() => 
    mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER || mode === AppMode.SYNTHESIS_BRIDGE || mode === AppMode.VOICE_MODE || mode === AppMode.AUTONOMOUS_FINANCE
  , [mode]);

  return (
    <div className="h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-500 ease-in-out relative" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', ...themeVars as any }}>
      <Starfield mode={mode} />
      
      {/* PRESTIGE OVERLAY: Subtle Abberation and Noise */}
      <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      <div className="absolute inset-0 pointer-events-none z-[200] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>

      <GlobalStatusBar />

      <FocusOverlay />
      <VoiceCoreOverlay /> 
      <UserProfileOverlay /> 
      <CommandPalette /> 
      <PeerMeshOverlay />
      <SystemNotification isOpen={isDiagnosticsOpen} onClose={() => setDiagnosticsOpen(false)} /> 
      <TimeTravelScrubber 
        mode={mode} 
        onRestore={() => addLog('INFO', 'Timeline resync successful.')} 
        isOpen={isScrubberOpen}
        onClose={() => setScrubberOpen(false)}
      />
      <OverlayOS /> 
      <HoloProjector /> 
      <ResearchTray /> 
      <VoiceManager /> 
      
      <AnimatePresence>
        {!isHUDClosed && <AgenticHUD />}
      </AnimatePresence>
      
      {isHUDClosed && (
          <button 
            onClick={() => setHUDClosed(false)}
            className="fixed bottom-12 right-6 p-2 bg-[#f1c21b]/20 border border-[#f1c21b]/40 rounded-full text-[#f1c21b] hover:bg-[#f1c21b] hover:text-black transition-all z-50 pointer-events-auto shadow-[0_0_20px_rgba(241,194,27,0.3)]"
          >
              <Activity size={16} />
          </button>
      )}

      <AnimatePresence>
        {isHelpOpen && <HelpCenter onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>

      {/* --- RESTORED HEADER (64px) --- */}
      <header className="flex-shrink-0 h-[64px] border-b z-[100] px-8 flex items-center justify-between backdrop-blur-3xl bg-[#030303]/90 border-white/5 shadow-2xl relative">
        
        {/* TOP HIGHLIGHT BAR (Purple/Gold Gradient) */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#7b2cbf] via-[#f1c21b] to-[#7b2cbf] opacity-60 blur-[1px]" />

        {/* Left Side: Logo and Navigation Tabs */}
        <div className="flex items-center gap-10 h-full">
            <div className="flex items-center gap-6 cursor-pointer group" onClick={() => switchPath('/dashboard')}>
                <MetaventionsLogo size={28} showText={true} />
            </div>

            <div className="h-6 w-px bg-white/5" />

            {/* FULL NAVIGATION MENU (Restored) */}
            <nav className="flex items-center gap-1 xl:gap-2 overflow-x-auto no-scrollbar max-w-[900px] h-full">
                {NAV_CONFIG.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => switchPath(item.path)} 
                        className="relative h-full px-3.5 group flex-shrink-0 flex items-center"
                    >
                        <span className={`text-[10px] xl:text-[10.5px] font-[900] uppercase tracking-[0.25em] font-mono transition-all duration-500 ${mode === item.id ? 'text-[#f1c21b]' : 'text-gray-500 group-hover:text-gray-200'}`}>
                            {item.label}
                        </span>
                        {mode === item.id && (
                            <motion.div 
                                layoutId="activeTabGlow"
                                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-[#7b2cbf] via-[#f1c21b] to-[#7b2cbf] shadow-[0_0_12px_rgba(241,194,27,0.6)]"
                            />
                        )}
                    </button>
                ))}
            </nav>
        </div>

        {/* Right Side: Functional Control Stack and D-ECOSYSTEM */}
        <div className="flex items-center gap-6 h-full">
            <div className="flex items-center h-full pt-1">
                <GlobalSearchBar />
            </div>
            
            <div className="h-6 w-px bg-white/5" />

            <div className="flex items-center gap-1">
                <ThemeSwitcher />
                <button 
                    onClick={() => toggleProfile(true)}
                    className="p-2.5 text-gray-500 hover:text-[#f1c21b] transition-all rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
                >
                    <User size={18} />
                </button>
            </div>

            {/* D-ECOSYSTEM BUTTON (Award Edition) */}
            <button 
                onClick={() => toggleCommandPalette()}
                className="relative group/eco px-5 py-2 bg-[#0a0a0a] border border-white/10 hover:border-[#f1c21b]/40 rounded-xl transition-all duration-500 shadow-2xl overflow-hidden active:scale-95"
            >
                <span className="relative z-10 text-[9px] font-black font-mono text-white tracking-[0.3em] uppercase flex items-center gap-3 text-[#f1c21b]">
                    D-ECOSYSTEM
                    <ExternalLink size={11} className="text-gray-600 group-hover:text-[#f1c21b] transition-colors" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#7b2cbf]/10 to-[#f1c21b]/10 opacity-0 group-hover/eco:opacity-100 transition-opacity" />
            </button>
        </div>
      </header>

      {/* --- CONTENT CONTAINER --- */}
      <div className={`flex-1 relative flex flex-col min-h-0 ${isFixedLayout ? 'pb-0' : 'pb-1 overflow-y-auto custom-scrollbar'}`}>
        <SynapticRouter />
      </div>
    </div>
  );
};

export default App;
