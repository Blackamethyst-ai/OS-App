
import React, { useState } from 'react';
import { AppMode } from './types';
import ImageGen from './components/ImageGen';
import ProcessVisualizer from './components/ProcessVisualizer';
import Dashboard from './components/Dashboard';
import { Layout, Image, Settings, Key, Command, LayoutGrid } from 'lucide-react';
import { promptSelectKey } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);

  const handleKeySelection = async () => {
    await promptSelectKey();
  };

  return (
    <div className="h-screen w-screen bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30 relative overflow-hidden flex flex-col">
      
      {/* Global Background Effects - Amethyst Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#150520] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#0a0a0a] rounded-full blur-[150px]"></div>
      </div>

      {/* Navigation Header */}
      <header className="flex-shrink-0 h-16 bg-[#030303]/90 backdrop-blur-md border-b border-[#1f1f1f] z-50 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3" onClick={() => setMode(AppMode.DASHBOARD)} role="button">
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
        </nav>

        <button 
          onClick={handleKeySelection}
          className="flex items-center space-x-2 px-3 py-1.5 rounded border border-[#1f1f1f] hover:bg-[#111] hover:text-white text-gray-500 transition-colors text-[10px] font-mono tracking-wider"
          title="Configure API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span>API_KEY</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-6 overflow-hidden">
        {mode === AppMode.DASHBOARD && <Dashboard />}
        {mode === AppMode.PROCESS_MAP && <ProcessVisualizer />}
        {mode === AppMode.IMAGE_GEN && <ImageGen />}
      </main>
    </div>
  );
};

export default App;
