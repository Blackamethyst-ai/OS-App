
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
import GlobalSearchBar from './components/GlobalSearchBar';
import SystemNotification from './components/SystemNotification';
import { Layout, Image, Settings, Key, Command, LayoutGrid, Activity, BookOpen, Mic, Cpu, Code } from 'lucide-react';
import { promptSelectKey } from './services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

const Starfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; z: number; size: number }[] = [];
    const numStars = 400;
    const speed = 0.5;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width - canvas.width / 2,
          y: Math.random() * canvas.height - canvas.height / 2,
          z: Math.random() * canvas.width,
          size: Math.random() * 2,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      stars.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width - canvas.width / 2;
          star.y = Math.random() * canvas.height - canvas.height / 2;
        }

        const x = (star.x / star.z) * canvas.width + cx;
        const y = (star.y / star.z) * canvas.width + cy;
        const s = (1 - star.z / canvas.width) * star.size * 2;

        const alpha = (1 - star.z / canvas.width);
        ctx.fillStyle = `rgba(157, 78, 221, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, s > 0 ? s : 0, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    initStars();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />;
};

const AmbientBackground: React.FC = () => {
  const { mode, process, voice, imageGen, hardware, codeStudio, bibliomorphic, isCommandPaletteOpen } = useAppStore();
  const [ripples, setRipples] = useState<{x: number, y: number, id: number}[]>([]);
  
  // Track mouse for subtle spotlight effect & Click Ripples
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    const handleClick = (e: MouseEvent) => {
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
          case AppMode.DASHBOARD: 
          default: return ['#9d4edd', '#4c1d95', 8]; // Deep Purple
      }
  };

  const [color1, color2, duration] = getTheme();
  
  // Dim background when Command Palette is open to focus attention
  const baseOpacity = isCommandPaletteOpen ? 0.1 : 0.3;

  // Dynamic Pulse Scale for Voice Mode
  const pulseScale = voice.isActive 
    ? [1, 1 + Math.min(voice.volume / 60, 0.4), 1] 
    : [1, 1.05, 1];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        {/* Dynamic Blobs with Drifting Animation */}
        <motion.div 
            animate={{ 
                background: `radial-gradient(circle at center, ${color1} 0%, transparent 70%)`,
                opacity: baseOpacity,
                x: [0, 50, 0],
                y: [0, 30, 0],
                scale: [1, 1.1, 1]
            }}
            transition={{ 
                background: { duration: 2 },
                opacity: { duration: 0.5 },
                default: { duration: 25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
            }}
            className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] blur-[120px] rounded-full mix-blend-screen origin-center"
        />
        
        <motion.div 
            animate={{ 
                background: `radial-gradient(circle at center, ${color2} 0%, transparent 70%)`,
                opacity: baseOpacity * 0.8,
                x: [0, -50, 0],
                y: [0, -30, 0],
                scale: [1, 1.2, 1]
            }}
            transition={{ 
                background: { duration: 2 },
                opacity: { duration: 0.5 },
                default: { duration: 30, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1 }
            }}
            className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] blur-[120px] rounded-full mix-blend-screen origin-center"
        />

        {/* Global Activity Pulse */}
        <motion.div
            animate={{
                opacity: [0.05, 0.15, 0.05],
                scale: pulseScale
            }}
            transition={{ 
                duration: duration as number, 
                repeat: Infinity, 
                ease: "easeInOut" 
            }}
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent blur-[80px]"
        />

        {/* Interactive Ripples */}
        {ripples.map(r => (
            <motion.div
                key={r.id}
                initial={{ opacity: 0.4, scale: 0, borderWidth: '2px' }}
                animate={{ opacity: 0, scale: 2.5, borderWidth: '0px' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute rounded-full border-white/40 bg-white/5"
                style={{
                    left: r.x,
                    top: r.y,
                    width: '80px',
                    height: '80px',
                    borderColor: color1 as string,
                    transform: 'translate(-50%, -50%)'
                }}
            />
        ))}

         {/* Mouse Spotlight (Performance Optimized via CSS Vars) */}
         <div 
            className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-10 transition-colors duration-1000"
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
  const { mode, setMode, toggleCommandPalette } = useAppStore();

  const handleKeySelection = async () => {
    await promptSelectKey();
  };

  return (
    <div className="h-screen w-screen bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30 relative overflow-hidden flex flex-col">
      
      {/* Background Layers */}
      <Starfield />
      <AmbientBackground />
      
      <CommandPalette />
      <SystemNotification />

      {/* Navigation Header */}
      <header className="flex-shrink-0 h-16 bg-[#030303]/90 backdrop-blur-md border-b border-[#1f1f1f] z-50 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer mr-6" onClick={() => setMode(AppMode.DASHBOARD)} role="button">
          <div className="w-8 h-8 bg-gradient-to-br from-[#9d4edd] to-[#5e3a8c] rounded flex items-center justify-center shadow-[0_0_15px_rgba(157,78,221,0.3)]">
            <Command className="text-black w-4 h-4" />
          </div>
          <div className="flex flex-col">
             <span className="text-lg font-bold text-white leading-none tracking-tight font-mono">Structura</span>
             <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Sovereign OS</span>
          </div>
        </div>

        <nav className="flex items-center space-x-1 bg-[#0a0a0a] p-1 rounded border border-[#1f1f1f] mr-auto">
          <button
            onClick={() => setMode(AppMode.DASHBOARD)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.DASHBOARD 
                ? 'bg-[#1f1f1f] text-white shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-2" />
            Dashboard
          </button>
          <div className="w-px h-4 bg-[#1f1f1f] mx-1"></div>
          <button
            onClick={() => setMode(AppMode.PROCESS_MAP)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.PROCESS_MAP 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Settings className="w-3.5 h-3.5 mr-2" />
            Process Logic
          </button>
          <button
            onClick={() => setMode(AppMode.IMAGE_GEN)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.IMAGE_GEN 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Image className="w-3.5 h-3.5 mr-2" />
            Asset Studio
          </button>
           <button
            onClick={() => setMode(AppMode.POWER_XRAY)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.POWER_XRAY 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Activity className="w-3.5 h-3.5 mr-2" />
            Power X-Ray
          </button>
           <button
            onClick={() => setMode(AppMode.BIBLIOMORPHIC)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.BIBLIOMORPHIC 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <BookOpen className="w-3.5 h-3.5 mr-2" />
            Bibliomorphic
          </button>
          <button
            onClick={() => setMode(AppMode.HARDWARE_ENGINEER)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.HARDWARE_ENGINEER
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Cpu className="w-3.5 h-3.5 mr-2" />
            Hardware
          </button>
          <button
            onClick={() => setMode(AppMode.CODE_STUDIO)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.CODE_STUDIO
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Code className="w-3.5 h-3.5 mr-2" />
            Code Studio
          </button>
           <button
            onClick={() => setMode(AppMode.VOICE_MODE)}
            className={`flex items-center px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 font-mono
              ${mode === AppMode.VOICE_MODE 
                ? 'bg-[#1f1f1f] text-[#9d4edd] shadow-sm border border-[#333]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
          >
            <Mic className="w-3.5 h-3.5 mr-2" />
            Voice Core
          </button>
        </nav>

        <div className="flex items-center gap-4">
            <GlobalSearchBar />
            <div className="w-px h-6 bg-[#333] mx-1"></div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => toggleCommandPalette(true)}
                    className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded border border-[#1f1f1f] bg-[#0a0a0a] hover:bg-[#111] text-gray-500 transition-colors text-[10px] font-mono tracking-wider group"
                >
                    <span className="text-[#9d4edd]">⌘K</span>
                    <span className="group-hover:text-white transition-colors">CMD</span>
                </button>
                <button 
                onClick={handleKeySelection}
                className="flex items-center space-x-2 px-3 py-1.5 rounded border border-[#1f1f1f] hover:bg-[#111] hover:text-white text-gray-500 transition-colors text-[10px] font-mono tracking-wider"
                title="Configure API Key"
                >
                <Key className="w-3.5 h-3.5" />
                <span>API_KEY</span>
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-6 overflow-hidden">
        {mode === AppMode.DASHBOARD && <Dashboard />}
        {mode === AppMode.PROCESS_MAP && <ProcessVisualizer />}
        {mode === AppMode.IMAGE_GEN && <ImageGen />}
        {mode === AppMode.POWER_XRAY && <PowerXRay />}
        {mode === AppMode.BIBLIOMORPHIC && <BibliomorphicEngine />}
        {mode === AppMode.HARDWARE_ENGINEER && <HardwareEngine />}
        {mode === AppMode.VOICE_MODE && <VoiceMode />}
        {mode === AppMode.CODE_STUDIO && <CodeStudio />}
      </main>
    </div>
  );
};

export default App;
