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
import { Layout, Image, Settings, Key, Command, LayoutGrid, Activity, BookOpen, Mic, Cpu } from 'lucide-react';
import { promptSelectKey } from './services/geminiService';

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

const App: React.FC = () => {
  const { mode, setMode, toggleCommandPalette } = useAppStore();

  const handleKeySelection = async () => {
    await promptSelectKey();
  };

  return (
    <div className="h-screen w-screen bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30 relative overflow-hidden flex flex-col">
      
      {/* Global Background Effects - Amethyst Theme */}
      <Starfield />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#150520] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#0a0a0a] rounded-full blur-[150px]"></div>
      </div>
      
      <CommandPalette />

      {/* Navigation Header */}
      <header className="flex-shrink-0 h-16 bg-[#030303]/90 backdrop-blur-md border-b border-[#1f1f1f] z-50 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)} role="button">
          <div className="w-8 h-8 bg-gradient-to-br from-[#9d4edd] to-[#5e3a8c] rounded flex items-center justify-center shadow-[0_0_15px_rgba(157,78,221,0.3)]">
            <Command className="text-black w-4 h-4" />
          </div>
          <div className="flex flex-col">
             <span className="text-lg font-bold text-white leading-none tracking-tight font-mono">Structura</span>
             <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Sovereign OS</span>
          </div>
        </div>

        <nav className="flex items-center space-x-1 bg-[#0a0a0a] p-1 rounded border border-[#1f1f1f]">
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

        <div className="flex items-center gap-3">
            <button 
                onClick={() => toggleCommandPalette(true)}
                className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded border border-[#1f1f1f] bg-[#0a0a0a] hover:bg-[#111] text-gray-500 transition-colors text-[10px] font-mono tracking-wider group"
            >
                <span className="text-[#9d4edd]">⌘K</span>
                <span className="group-hover:text-white transition-colors">COMMAND</span>
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
      </main>
    </div>
  );
};

export default App;