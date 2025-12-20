
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useAppStore } from './store';
import { useSystemMind } from './stores/useSystemMind'; 
import { AppMode, AppTheme } from './types';
import Starfield from './components/Starfield';

// Standard Layout Components
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
import { LayerToggle } from './components/LayerToggle';

// Hooks & Utilities
import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { useResearchAgent } from './hooks/useResearchAgent'; 
import { LayoutGrid, Image, Settings, Activity, BookOpen, Mic, Cpu, Code, HardDrive, GitMerge, HelpCircle, User, ListTodo, ShieldAlert, CpuIcon } from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { audio } from './services/audioService'; 
import { AnimatePresence, motion } from 'framer-motion';

const NAV_CONFIG = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
    { id: AppMode.TASK_MANAGER, label: 'Actions', icon: ListTodo, path: '/tasks' },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'Strategy Bridge', icon: GitMerge, path: '/bridge' },
    { id: AppMode.BIBLIOMORPHIC, label: 'Bibliomorphic', icon: BookOpen, path: '/bibliomorphic' },
    { id: AppMode.PROCESS_MAP, label: 'Process Logic', icon: Settings, path: '/process' },
    { id: AppMode.MEMORY_CORE, label: 'Memory Core', icon: HardDrive, path: '/memory' },
    { id: AppMode.IMAGE_GEN, label: 'Asset Studio', icon: Image, path: '/assets' },
    { id: AppMode.POWER_XRAY, label: 'Power X-Ray', icon: Activity, path: '/power' },
    { id: AppMode.HARDWARE_ENGINEER, label: 'Hardware', icon: Cpu, path: '/hardware' },
    { id: AppMode.CODE_STUDIO, label: 'Code Studio', icon: Code, path: '/code' },
    { id: AppMode.VOICE_MODE, label: 'Voice Core', icon: Mic, path: '/voice' },
];

const DEEP_NAV_REGISTRY = [
    { id: 'NAV_DASHBOARD', label: 'Dashboard', description: 'Main system overview.' },
    { id: 'NAV_TASKS', label: 'Action Matrix', description: 'Task and process tracking.' },
    { id: 'NAV_BRIDGE', label: 'Synthesis Bridge', description: 'Metaventions high-level strategic stack.' },
    { id: 'NAV_BIBLIO_DISCOVERY', label: 'Discovery Lab', description: 'Science lab for hypothesis generation.' },
    { id: 'NAV_PROCESS_MAP', label: 'Process Logic (Map)', description: 'The living system map.' },
    { id: 'NAV_HARDWARE', label: 'Hardware', description: 'Component search and BOM management.' },
    { id: 'NAV_CODE_STUDIO', label: 'Code Studio', description: 'Coding environment.' },
    { id: 'NAV_VOICE_CORE', label: 'Voice Core Interface', description: 'The visual voice interface.' },
];

const KernelHud = () => {
    const kernel = useAppStore(s => s.kernel);
    
    return (
        <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 border border-white/5 rounded-sm bg-black/40 backdrop-blur-sm ml-6">
            <div className="flex flex-col">
                <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1">Load</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1 bg-[#111] rounded-full overflow-hidden">
                        <motion.div 
                            animate={{ width: `${kernel.coreLoad}%` }}
                            className="h-full bg-[#9d4edd]"
                        />
                    </div>
                    <span className="text-[8px] font-mono text-white/80">{kernel.coreLoad}%</span>
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1">Entropy</span>
                <span className="text-[10px] font-mono font-black text-[#22d3ee] leading-none">{kernel.entropy}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1">Integrity</span>
                <span className="text-[10px] font-mono font-black text-[#10b981] leading-none">{kernel.integrity}%</span>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const { mode, user, theme, voice, toggleProfile, toggleCommandPalette, setSearchState, setVoiceState, addLog } = useAppStore();
  const { setSector, registerNavigation } = useSystemMind(); 
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Initialize Core Automations
  useAutoSave(); 
  useDaemonSwarm(); 
  useVoiceControl(); 
  useResearchAgent(); 

  // API Key Guard
  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio?.hasSelectedApiKey) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) { 
                addLog('WARN', 'SECURITY: API Key missing. Requesting authorization...'); 
                await promptSelectKey(); 
            }
        }
    };
    checkKey();
  }, [addLog]);

  useEffect(() => { registerNavigation(DEEP_NAV_REGISTRY); }, [registerNavigation]);
  useEffect(() => { setSector(mode); }, [mode, setSector]);

  // Global Keyboard Shortcuts
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
              e.preventDefault(); setIsHelpOpen(prev => !prev); audio.playClick();
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [voice.isActive, toggleCommandPalette, setSearchState, setVoiceState]);

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

  return (
    <div className="h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-500 ease-in-out relative" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', ...themeVars as any }}>
      <Starfield mode={mode} />
      
      {/* Immersive Layers */}
      <LayerToggle />

      {/* Overlays */}
      <VoiceCoreOverlay /> 
      <UserProfileOverlay /> 
      <CommandPalette /> 
      <SystemNotification /> 
      <TimeTravelScrubber mode={mode} onRestore={(state) => addLog('INFO', 'Timeline resync successful.')} />
      <OverlayOS /> 
      <HoloProjector /> 
      <ResearchTray /> 
      <VoiceManager /> 
      
      <AnimatePresence>
        {isHelpOpen && <HelpCenter onClose={() => setIsHelpOpen(false)} />}
      </AnimatePresence>

      <header className="flex-shrink-0 h-16 border-b z-[100] px-6 flex items-center justify-between backdrop-blur-xl" style={{ backgroundColor: 'rgba(10,10,10,0.85)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => switchPath('/dashboard')}>
          <NeuralHeader />
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none tracking-tight font-mono text-white group-hover:text-[#9d4edd] transition-colors uppercase">Metaventions OS</span>
            <span className="text-[8px] font-mono tracking-[0.4em] uppercase opacity-40">Sovereign Architecture Environment</span>
          </div>
          <KernelHud />
        </div>
        
        <nav className="flex items-center space-x-1 p-1 rounded-sm border border-white/5 mx-auto overflow-x-auto custom-scrollbar no-scrollbar" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
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
                <div className="relative">
                    <User className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#9d4edd]" />
                    <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#10b981] rounded-full border border-black" />
                </div>
                <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white tracking-widest">{user.displayName}</span>
            </button>
        </div>
      </header>

      {/* DYNAMIC CONTENT ROUTER */}
      <SynapticRouter />
    </div>
  );
};

export default App;
