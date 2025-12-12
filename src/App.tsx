
import React, { useState, useEffect, useRef } from 'react';
// import '@xyflow/react/dist/style.css'; // Styles loaded via index.html in this environment
import { useAppStore } from './store';
import { AppMode } from './types';
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
import BicameralEngine from './components/BicameralEngine'; 
import ResearchTray from './components/ResearchTray'; // New Import
import { useAutoSave } from './hooks/useAutoSave'; 
import { useDaemonSwarm } from './hooks/useDaemonSwarm'; 
import { useVoiceControl } from './hooks/useVoiceControl'; 
import { Layout, Image, Settings, Key, Command, LayoutGrid, Activity, BookOpen, Mic, Cpu, Code, HardDrive, Split } from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { audio } from './services/audioService'; 
import { motion, AnimatePresence } from 'framer-motion';

const Starfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; z: number; size: number; color: string }[] = [];
    const numStars = 600;
    const speed = 0.5;
    
    // Mouse interaction
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetX = mouseX;
    let targetY = mouseY;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars = [];
      const colors = ['#ffffff', '#9d4edd', '#22d3ee', '#f59e0b']; 
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width - canvas.width / 2,
          y: Math.random() * canvas.height - canvas.height / 2,
          z: Math.random() * canvas.width,
          size: Math.random() * 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
        targetX = e.clientX;
        targetY = e.clientY;
    };

    const draw = () => {
      // Trail effect: clear with transparency
      ctx.fillStyle = 'rgba(3, 3, 3, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Smooth mouse follow
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Parallax
      const offsetX = (mouseX - cx) * 0.5;
      const offsetY = (mouseY - cy) * 0.5;

      stars.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width - canvas.width / 2;
          star.y = Math.random() * canvas.height - canvas.height / 2;
        }

        const x = ((star.x - offsetX) / star.z) * canvas.width + cx;
        const y = ((star.y - offsetY) / star.z) * canvas.width + cy;
        const s = (1 - star.z / canvas.width) * star.size * 2.5;

        const alpha = (1 - star.z / canvas.width);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, s > 0 ? s : 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();
    initStars();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-80" />;
};

const AmbientBackground: React.FC = () => {
  const { mode, process, voice, imageGen, hardware, codeStudio, bibliomorphic, isCommandPaletteOpen } = useAppStore();
  const [ripples, setRipples] = useState<{x: number, y: number, id: number}[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  
  // Track mouse for subtle spotlight effect & Click Ripples
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    const handleClick = (e: MouseEvent) => {
        audio.playClick(); // SFX Hook
        const id = Date.now();
        setRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const getTheme = () => {
      // Returns [Primary, Secondary, PulseSpeed]
      if (voice.isActive) return ['#ef4444', '#7f1d1d', 0.2]; // Red Alert (Fast Pulse)
      
      // Check Loading States
      const isProcessing = process.isLoading || imageGen.isLoading || hardware.isLoading || codeStudio.isLoading || bibliomorphic.isLoading;
      
      if (isProcessing) return ['#ffffff', '#9d4edd', 1]; // White/Purple high energy for processing

      switch (mode) {
          case AppMode.PROCESS_MAP: return ['#42be65', '#065f46', 4]; // Matrix Green
          case AppMode.IMAGE_GEN: return ['#d946ef', '#701a75', 5]; // Pink
          case AppMode.POWER_XRAY: return ['#f59e0b', '#78350f', 3]; // Amber
          case AppMode.HARDWARE_ENGINEER: return ['#3b82f6', '#1e3a8a', 4]; // Blue
          case AppMode.CODE_STUDIO: return ['#10b981', '#064e3b', 5]; // Emerald
          case AppMode.BIBLIOMORPHIC: return ['#f97316', '#7c2d12', 4]; // Orange
          case AppMode.VOICE_MODE: return ['#22d3ee', '#155e75', 3]; // Cyan
          case AppMode.MEMORY_CORE: return ['#9d4edd', '#4c1d95', 6]; // Deep Purple
          case AppMode.BICAMERAL: return ['#22d3ee', '#9d4edd', 5]; // Cyan/Purple Split
          case AppMode.DASHBOARD: 
          default: return ['#9d4edd', '#4c1d95', 8]; // Deep Purple
      }
  };

  const [color1, color2, duration] = getTheme();
  
  // Dim background when Command Palette is open to focus attention
  const baseOpacity = isCommandPaletteOpen ? 0.1 : 0.4;

  // Dynamic Pulse Scale for Voice Mode
  const pulseScale = voice.isActive 
    ? [1, 1 + Math.min(voice.volume / 60, 0.4), 1] 
    : [1, 1.05, 1];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-40 transition-colors duration-1000">
        {/* Dynamic Blobs with Drifting Animation */}
        <motion.div 
            animate={{ 
                background: `radial-gradient(circle at center, ${color1} 0%, transparent 60%)`,
                opacity: baseOpacity,
                x: [0, 100, -50, 0],
                y: [0, 50, 20, 0],
                scale: [1, 1.2, 0.9, 1]
            }}
            transition={{ 
                background: { duration: 1.5 },
                opacity: { duration: 0.5 },
                default: { duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
            }}
            className="absolute top-[-30%] left-[-10%] w-[80vw] h-[80vw] blur-[120px] rounded-full mix-blend-screen origin-center"
        />
        
        <motion.div 
            animate={{ 
                background: `radial-gradient(circle at center, ${color2} 0%, transparent 60%)`,
                opacity: baseOpacity * 0.8,
                x: [0, -100, 50, 0],
                y: [0, -50, -20, 0],
                scale: [1, 1.3, 0.8, 1]
            }}
            transition={{ 
                background: { duration: 1.5 },
                opacity: { duration: 0.5 },
                default: { duration: 25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1 }
            }}
            className="absolute bottom-[-30%] right-[-10%] w-[80vw] h-[80vw] blur-[120px] rounded-full mix-blend-screen origin-center"
        />

        {/* Global Activity Pulse */}
        <motion.div
            animate={{
                opacity: [0.02, 0.08, 0.02],
                scale: pulseScale
            }}
            transition={{ 
                duration: duration as number, 
                repeat: Infinity, 
                ease: "easeInOut" 
            }}
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent blur-[80px]"
        />

        {/* Vertical Scanline */}
        <motion.div
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-[1px] opacity-30"
        />

        {/* Interactive Ripples */}
        {ripples.map(r => (
            <motion.div
                key={r.id}
                initial={{ opacity: 0.6, scale: 0, borderWidth: '2px' }}
                animate={{ opacity: 0, scale: 4, borderWidth: '0px' }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute rounded-full border-white/40 bg-white/5 backdrop-blur-[1px]"
                style={{
                    left: r.x,
                    top: r.y,
                    width: '50px',
                    height: '50px',
                    borderColor: color1 as string,
                    transform: 'translate(-50%, -50%)'
                }}
            />
        ))}

         {/* Mouse Spotlight (Performance Optimized via CSS Vars) */}
         <div 
            className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-15 transition-colors duration-1000"
            style={{
                background: color1,
                left: 'var(--mouse-x, 50%)',
                top: 'var(--mouse-y, 50%)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
            }}
         />
    </div>
  );
};

const App: React.FC = () => {
  const { 
      mode, 
      setMode, 
      toggleCommandPalette, 
      setProcessState,
      setCodeStudioState,
      setHardwareState,
      setImageGenState,
      setBibliomorphicState,
      setDashboardState,
      setBicameralState
  } = useAppStore();

  // 1. Activate Auto-Pilot (Persistence)
  useAutoSave(); 

  // 2. Activate Daemon Swarm (Autonomy)
  useDaemonSwarm();

  // 3. Activate Synaptic Bridge (Multimodality)
  useVoiceControl();

  const handleKeySelection = async () => {
    audio.playClick();
    await promptSelectKey();
  };

  const switchMode = (newMode: AppMode) => {
      audio.playTransition();
      setMode(newMode);
  };

  // 4. Define Restore Logic
  const handleRestoreState = (savedState: any) => {
      audio.playTransition();
      switch (mode) {
          case AppMode.PROCESS_MAP: setProcessState(savedState); break;
          case AppMode.CODE_STUDIO: setCodeStudioState(savedState); break;
          case AppMode.HARDWARE_ENGINEER: setHardwareState(savedState); break;
          case AppMode.IMAGE_GEN: setImageGenState(savedState); break;
          case AppMode.BIBLIOMORPHIC: setBibliomorphicState(savedState); break;
          case AppMode.DASHBOARD: setDashboardState(savedState); break;
          case AppMode.BICAMERAL: setBicameralState(savedState); break;
          default: console.warn("State restoration not implemented for this mode");
      }
  };

  return (
    <div className="h-screen w-screen bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30 relative overflow-hidden flex flex-col">
      
      {/* Background Layers */}
      <Starfield />
      <AmbientBackground />
      
      {/* System Overlays */}
      <CommandPalette />
      <SystemNotification />
      <TimeTravelScrubber mode={mode} onRestore={handleRestoreState} className="mb-12" />
      <OverlayOS /> 
      <HoloProjector /> 
      <SynapticRouter /> 
      <ResearchTray /> {/* New Research Tray Component */}

      {/* Navigation Header */}
      <header className="flex-shrink-0 h-16 bg-[#030303]/80 backdrop-blur-md border-b border-[#1f1f1f] z-50 px-6 flex items-center justify-between">
        <div 
            className="flex items-center space-x-3 cursor-pointer mr-6 group" 
            onClick={() => switchMode(AppMode.DASHBOARD)} 
            role="button"
            onMouseEnter={() => audio.playHover()}
        >
          {/* Reactive Header Icon */}
          <NeuralHeader />
          
          <div className="flex flex-col">
             <span className="text-lg font-bold text-white leading-none tracking-tight font-mono">Structura</span>
             <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Sovereign OS</span>
          </div>
        </div>

        <nav className="flex items-center space-x-1 bg-[#0a0a0a] p-1 rounded border border-[#1f1f1f] mr-auto overflow-x-auto custom-scrollbar max-w-[calc(100vw-400px)]">
          <button
            onClick={() => switchMode(AppMode.DASHBOARD)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.DASHBOARD 
                ? 'bg-[#1f1f1f] text-white shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-2" />
            Dashboard
          </button>
          <div className="w-px h-4 bg-[#1f1f1f] mx-1"></div>
          <button
            onClick={() => switchMode(AppMode.PROCESS_MAP)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.PROCESS_MAP 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Settings className="w-3.5 h-3.5 mr-2" />
            Process Logic
          </button>
          <button
            onClick={() => switchMode(AppMode.MEMORY_CORE)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.MEMORY_CORE 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <HardDrive className="w-3.5 h-3.5 mr-2" />
            Memory Core
          </button>
          <button
            onClick={() => switchMode(AppMode.BICAMERAL)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.BICAMERAL
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Split className="w-3.5 h-3.5 mr-2" />
            Bicameral
          </button>
          <button
            onClick={() => switchMode(AppMode.IMAGE_GEN)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.IMAGE_GEN 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Image className="w-3.5 h-3.5 mr-2" />
            Asset Studio
          </button>
           <button
            onClick={() => switchMode(AppMode.POWER_XRAY)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.POWER_XRAY 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Activity className="w-3.5 h-3.5 mr-2" />
            Power X-Ray
          </button>
           <button
            onClick={() => switchMode(AppMode.BIBLIOMORPHIC)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.BIBLIOMORPHIC 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <BookOpen className="w-3.5 h-3.5 mr-2" />
            Bibliomorphic
          </button>
          <button
            onClick={() => switchMode(AppMode.HARDWARE_ENGINEER)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.HARDWARE_ENGINEER
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Cpu className="w-3.5 h-3.5 mr-2" />
            Hardware
          </button>
          <button
            onClick={() => switchMode(AppMode.CODE_STUDIO)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.CODE_STUDIO
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Code className="w-3.5 h-3.5 mr-2" />
            Code Studio
          </button>
           <button
            onClick={() => switchMode(AppMode.VOICE_MODE)}
            onMouseEnter={() => audio.playHover()}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono whitespace-nowrap
              ${mode === AppMode.VOICE_MODE 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Mic className="w-3.5 h-3.5 mr-2" />
            Voice Core
          </button>
        </nav>

        <div className="flex items-center gap-4">
            <GlobalSearchBar /> {/* Upgrade C Included */}
            <div className="w-px h-6 bg-[#333] mx-1"></div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => { audio.playClick(); toggleCommandPalette(true); }}
                    onMouseEnter={() => audio.playHover()}
                    className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded border border-[#1f1f1f] bg-[#0a0a0a] hover:bg-[#111] text-gray-500 transition-colors text-[10px] font-mono tracking-wider group"
                >
                    <span className="text-[#9d4edd]">⌘K</span>
                    <span className="group-hover:text-white transition-colors">CMD</span>
                </button>
                <button 
                onClick={handleKeySelection}
                onMouseEnter={() => audio.playHover()}
                className="flex items-center space-x-2 px-3 py-1.5 rounded border border-[#1f1f1f] hover:bg-[#111] hover:text-white text-gray-500 transition-colors text-[10px] font-mono tracking-wider"
                title="Configure API Key"
                >
                <Key className="w-3.5 h-3.5" />
                <span>API_KEY</span>
                </button>
            </div>
        </div>
      </header>

      {/* Main Content with Transition */}
      <AnimatePresence mode="wait">
        <motion.main 
            key={mode}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 relative z-10 p-6 overflow-hidden pb-24"
        >
            {mode === AppMode.DASHBOARD && <Dashboard />}
            {mode === AppMode.PROCESS_MAP && <ProcessVisualizer />}
            {mode === AppMode.MEMORY_CORE && <MemoryCore />}
            {mode === AppMode.IMAGE_GEN && <ImageGen />}
            {mode === AppMode.POWER_XRAY && <PowerXRay />}
            {mode === AppMode.BIBLIOMORPHIC && <BibliomorphicEngine />}
            {mode === AppMode.HARDWARE_ENGINEER && <HardwareEngine />}
            {mode === AppMode.VOICE_MODE && <VoiceMode />}
            {mode === AppMode.CODE_STUDIO && <CodeStudio />}
            {mode === AppMode.BICAMERAL && <BicameralEngine />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
};

export default App;
