
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from './store';
import { useSystemMind } from './stores/useSystemMind'; 
import { AppMode, AppTheme, OperationalContext } from './types';
import ImageGen from './components/ImageGen';
import ProcessVisualizer from './components/ProcessVisualizer';
import Dashboard from './components/Dashboard';
import PowerXRay from './components/PowerXRay';
import CommandPalette from './components/CommandPalette';
import BibliomorphicEngine from './components/BibliomorphicEngine';
import VoiceMode from './components/VoiceMode';
import HardwareEngine from './components/HardwareEngine';
import CodeStudio from './components/CodeStudio';
import MemoryCore from './components/MemoryCore'; 
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
import SynthesisBridge from './components/SynthesisBridge'; 
import { LayerToggle } from './components/LayerToggle';
import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { useResearchAgent } from './hooks/useResearchAgent'; 
import { useVoiceAction } from './hooks/useVoiceAction';
import { useVoiceExpose } from './hooks/useVoiceExpose';
import { Layout, Image, Settings, Key, Command, LayoutGrid, Activity, BookOpen, Mic, Cpu, Code, HardDrive, Split, User, FlaskConical, HelpCircle, GitMerge, Search, Globe, Network } from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { audio } from './services/audioService'; 
import { motion, AnimatePresence } from 'framer-motion';

const MotionMain = motion.main as any;

const NAV_CONFIG = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutGrid, desc: 'Overview of system telemetry and active agents.' },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'Strategy Bridge', icon: GitMerge, desc: 'The Metaventions Stack: DePIN, Finance, and AI Strategy.' },
    { id: AppMode.BIBLIOMORPHIC, label: 'Bibliomorphic', icon: BookOpen, desc: 'Discovery Lab, Agora Simulation, and Bicameral Swarm.' },
    { id: AppMode.PROCESS_MAP, label: 'Process Logic', icon: Settings, desc: 'Visual workflow builder and system architecture diagrams.' },
    { id: AppMode.MEMORY_CORE, label: 'Memory Core', icon: HardDrive, desc: 'Persistent file storage and Neural Vault access.' },
    { id: AppMode.IMAGE_GEN, label: 'Asset Studio', icon: Image, desc: 'Generative image creation and storyboard planning.' },
    { id: AppMode.POWER_XRAY, label: 'Power X-Ray', icon: Activity, desc: 'Deep diagnostic analysis of power structures.' },
    { id: AppMode.HARDWARE_ENGINEER, label: 'Hardware', icon: Cpu, desc: 'Schematic analysis and component BOM generation.' },
    { id: AppMode.CODE_STUDIO, label: 'Code Studio', icon: Code, desc: 'AI coding environment with neural simulation.' },
    { id: AppMode.VOICE_MODE, label: 'Voice Core', icon: Mic, desc: 'Direct neural voice interface and transcription logs.' },
];

const DEEP_NAV_REGISTRY = [
    { id: 'NAV_DASHBOARD', label: 'Dashboard', description: 'Main system overview.' },
    { id: 'NAV_BRIDGE', label: 'Synthesis Bridge', description: 'Metaventions high-level strategic stack.' },
    { id: 'NAV_BIBLIO_DISCOVERY', label: 'Discovery Lab', description: 'Science lab for hypothesis generation and synthesis.' },
    { id: 'NAV_PROCESS_MAP', label: 'Process Logic (Map)', description: 'The living system map.' },
    { id: 'NAV_HARDWARE_TIER1', label: 'Hardware (Supply Chain)', description: 'Component search and BOM management.' },
    { id: 'NAV_CODE_STUDIO', label: 'Code Studio', description: 'Coding environment.' },
    { id: 'NAV_VOICE_CORE', label: 'Voice Core Interface', description: 'The visual voice interface.' },
];

const App: React.FC = () => {
  const { mode, setMode, toggleCommandPalette, toggleProfile, user, setBibliomorphicState, theme, voice, setSearchState, addLog, setOperationalContext, setVoiceState, setHardwareState } = useAppStore();
  const { setSector, registerNavigation } = useSystemMind(); 
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useAutoSave(); useDaemonSwarm(); useVoiceControl(); useResearchAgent(); 

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio?.hasSelectedApiKey) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) { 
                addLog('INFO', 'System Awaiting API Key Designation...'); 
                await promptSelectKey(); 
            }
        }
    };
    checkKey();
  }, []);

  useEffect(() => { registerNavigation(DEEP_NAV_REGISTRY); }, [registerNavigation]);
  useEffect(() => { setSector(mode); }, [mode, setSector]);

  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') { 
              e.preventDefault(); 
              toggleCommandPalette(); 
              audio.playClick(); 
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 's') { 
              e.preventDefault(); 
              setSearchState({ isOpen: true }); 
              audio.playClick(); 
          }
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') { 
              e.preventDefault(); 
              setVoiceState({ isActive: !voice.isActive }); 
              audio.playClick(); 
          }
          if (e.key === 'F1') {
              e.preventDefault();
              setIsHelpOpen(prev => !prev);
              audio.playClick();
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [voice.isActive, toggleCommandPalette, setSearchState, setVoiceState]);

  const switchMode = (newMode: AppMode) => {
      audio.playTransition();
      if (newMode === AppMode.DISCOVERY) { setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'discovery' }); }
      else if (newMode === AppMode.BICAMERAL) { setMode(AppMode.BIBLIOMORPHIC); setBibliomorphicState({ activeTab: 'bicameral' }); }
      else { setMode(newMode); }
  };

  const getThemeStyles = () => {
      switch (theme) {
          case 'LIGHT': return { '--bg-main': '#f5f5f5', '--text-main': '#171717', '--border-main': '#e5e5e5', '--accent': '#a855f7' };
          default: return { '--bg-main': '#030303', '--text-main': '#e5e5e5', '--border-main': '#1f1f1f', '--accent': '#9d4edd' };
      }
  };

  return (
    <div className="h-screen w-screen font-sans overflow-hidden flex flex-col transition-all duration-500 ease-in-out" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', ...getThemeStyles() as any }}>
      <VoiceCoreOverlay /> <UserProfileOverlay /> <CommandPalette /> <SystemNotification /> <LayerToggle />
      <TimeTravelScrubber mode={mode} onRestore={() => addLog('INFO', 'Timeline restoration complete.')} />
      <OverlayOS /> <HoloProjector /> <SynapticRouter /> <ResearchTray /> <VoiceManager /> 
      <AnimatePresence>{isHelpOpen && <HelpCenter onClose={() => setIsHelpOpen(false)} />}</AnimatePresence>

      <header className="flex-shrink-0 h-16 border-b z-[100] px-6 flex items-center justify-between backdrop-blur-md" style={{ backgroundColor: 'rgba(10,10,10,0.8)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center space-x-3 cursor-pointer mr-6 group" onClick={() => switchMode(AppMode.DASHBOARD)}>
          <NeuralHeader />
          <div className="flex flex-col"><span className="text-lg font-bold leading-none tracking-tight font-mono text-white">Metaventions</span><span className="text-[10px] font-mono tracking-widest uppercase opacity-60">Architect OS</span></div>
        </div>
        <nav className="flex items-center space-x-1 p-1 rounded border mr-auto overflow-x-auto custom-scrollbar" style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'var(--border-main)' }}>
          {NAV_CONFIG.map(item => (
              <button key={item.id} onClick={() => switchMode(item.id as AppMode)} className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap ${mode === item.id ? 'bg-[#1f1f1f] text-white border border-[#333]' : 'text-gray-500 hover:text-white'}`}><item.icon className="w-3.5 h-3.5 mr-2" />{item.label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
            <GlobalSearchBar />
            <ThemeSwitcher />
            <button onClick={() => setVoiceState({ isActive: !voice.isActive })} className={`p-2 rounded-lg border transition-all ${voice.isActive ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'border-transparent text-gray-500 hover:text-white'}`} title="Neural Voice Uplink"><Mic size={18} /></button>
            <button onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-500 hover:text-[#9d4edd] transition-colors" title="System Help (F1)"><HelpCircle size={18} /></button>
            <button onClick={() => toggleProfile(true)} className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#333] hover:border-[#9d4edd] transition-all"><User className="w-4 h-4 text-gray-400" /><span className="text-[10px] font-mono uppercase text-gray-300">{user.displayName}</span></button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <MotionMain key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 relative z-[10] p-6 overflow-hidden">
            {mode === AppMode.DASHBOARD && <Dashboard />}
            {mode === AppMode.SYNTHESIS_BRIDGE && <SynthesisBridge />}
            {(mode === AppMode.BIBLIOMORPHIC || mode === AppMode.DISCOVERY) && <BibliomorphicEngine />}
            {mode === AppMode.PROCESS_MAP && <ProcessVisualizer />}
            {mode === AppMode.MEMORY_CORE && <MemoryCore />}
            {mode === AppMode.IMAGE_GEN && <ImageGen />}
            {mode === AppMode.POWER_XRAY && <PowerXRay />}
            {mode === AppMode.HARDWARE_ENGINEER && <HardwareEngine />}
            {mode === AppMode.VOICE_MODE && <VoiceMode />}
            {mode === AppMode.CODE_STUDIO && <CodeStudio />}
        </MotionMain>
      </AnimatePresence>
    </div>
  );
};

export default App;
