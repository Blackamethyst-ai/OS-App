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

import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { useResearchAgent } from './hooks/useResearchAgent'; 
import { 
    LayoutGrid, Image, Settings, Activity, BookOpen, Mic, Cpu, 
    Code, HardDrive, GitMerge, Target, X, User, Bot 
} from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { collabService } from './services/collabService';
import { audio } from './services/audioService'; 
import { AnimatePresence, motion } from 'framer-motion';

const NAV_CONFIG = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'Strategy Bridge', icon: GitMerge, path: '/bridge' },
    { id: AppMode.AGENT_CONTROL, label: 'Agent Center', icon: Bot, path: '/agents' },
    { id: AppMode.BIBLIOMORPHIC, label: 'Bibliomorphic', icon: BookOpen, path: '/bibliomorphic' },
    { id: AppMode.PROCESS_MAP, label: 'Process Logic', icon: Settings, path: '/process' },
    { id: AppMode.MEMORY_CORE, label: 'Memory Core', icon: HardDrive, path: '/memory' },
    { id: AppMode.IMAGE_GEN, label: 'Asset Studio', icon: Image, path: '/assets' },
    { id: AppMode.HARDWARE_ENGINEER, label: 'Hardware', icon: Cpu, path: '/hardware' },
    { id: AppMode.CODE_STUDIO, label: 'Code Studio', icon: Code, path: '/code' },
    { id: AppMode.VOICE_MODE, label: 'Voice Core', icon: Mic, path: '/voice' },
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
      mode, user, theme, voice, toggleProfile, toggleCommandPalette, 
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
    // Initialize Collaboration Swarm
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
          default: return { '--bg-main': '#030303', '--text-main': '#e5e5e5', '--border-main': '#1f1f1f' };
      }
  }, [theme]);

  const isFixedLayout = useMemo(() => 
    mode === AppMode.PROCESS_MAP || mode === AppMode.CODE_STUDIO || mode === AppMode.IMAGE_GEN || mode === AppMode.AGENT_CONTROL || mode === AppMode.HARDWARE_ENGINEER
  , [mode]);

  return (
    <div className="h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-500 ease-in-out relative" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', ...themeVars as any }}>
      <Starfield mode={mode} />
      
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
            className="fixed bottom-24 right-6 p-2 bg-[#9d4edd]/20 border border-[#9d4edd]/40 rounded-full text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black transition-all z-50 pointer-events-auto"
          >
              <Activity size={16} />
          </button>
      )}

      <AnimatePresence>
        {isHelpOpen && <HelpCenter onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>

      <header className="flex-shrink-0 h-16 border-b z-[100] px-6 flex items-center justify-between backdrop-blur-xl" style={{ backgroundColor: 'rgba(10,10,10,0.85)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => switchPath('/dashboard')}>
          <NeuralHeader />
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold leading-none tracking-tight font-mono text-white group-hover:text-[#9d4edd] transition-colors uppercase">Metaventions OS</span>
            <FlywheelOrbit />
          </div>
        </div>
        
        <nav className="flex items-center space-x-1 p-1 rounded-sm border border-white/5 mx-auto overflow-x-auto no-scrollbar" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {NAV_CONFIG.map(item => (
              <button 
                key={item.id} 
                onClick={() => switchPath(item.path)} 
                className={`flex items-center px-4 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap ${mode === item.id ? 'bg-white/10 text-white border border-white/20' : 'text-gray-500 hover:text-white'}`}
              >
                <item.icon className="w-3 h-3 mr-2" />
                {item.label}
              </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
            <GlobalSearchBar />
            <ThemeSwitcher />
            <div className="h-4 w-px bg-white/10" />
            <button 
                onClick={() => toggleProfile(true)} 
                className="flex items-center gap-3 px-3 py-1.5 rounded-sm border border-[#333] hover:border-[#9d4edd] transition-all bg-black/40 group"
            >
                <User className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#9d4edd]" />
                <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white tracking-widest">{user.displayName}</span>
            </button>
        </div>
      </header>

      <div className={`flex-1 relative flex flex-col min-h-0 ${isFixedLayout ? 'pb-10' : 'pb-32 overflow-y-auto custom-scrollbar'}`}>
        <SynapticRouter />
      </div>
    </div>
  );
};

export default App;