


import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { interpretIntent } from '../services/geminiService';
import { AppMode } from '../types';
import { Command, Loader2, X, Sparkles, ChevronRight, Code, Cpu, Mic, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const SUGGESTIONS = [
  { id: 'nav-hw', label: 'Navigate to Hardware Core', command: 'Navigate to Hardware' },
  { id: 'conf-gov', label: 'Configure Strict Governance', command: 'Set strict governance' },
  { id: 'gen-asset', label: 'Generate 4K Asset', command: 'Configure image gen for 4K' },
  { id: 'analyze-pwr', label: 'Analyze Power Dynamics', command: 'Analyze power systems' },
  { id: 'nav-voice', label: 'Initialize Voice Core', command: 'Open Voice Mode' },
  { id: 'code-gen', label: 'Write React Component', command: 'Create a responsive navigation bar in React' },
  { id: 'hw-search', label: 'Search H100 Specs', command: 'Find detailed specs for NVIDIA H100' },
];

const CommandPalette: React.FC = () => {
  const { 
      isCommandPaletteOpen, 
      toggleCommandPalette, 
      setMode, 
      setProcessState, 
      setImageGenState,
      setCodeStudioState,
      setHardwareState
  } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.matches('input, textarea, [contenteditable]');

      // Toggle: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      // Open: '/' (Forward Slash) - Standard shortcut for search/commands
      if (e.key === '/' && !isInput && !isCommandPaletteOpen) {
        e.preventDefault();
        toggleCommandPalette(true);
      }

      // Close: Escape
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        toggleCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, toggleCommandPalette]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      // Small delay to ensure DOM is ready for focus
      setTimeout(() => inputRef.current?.focus(), 50);
      setInput('');
      setResult(null);
    }
  }, [isCommandPaletteOpen]);

  const executeCommand = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const intent = await interpretIntent(input);
      
      switch (intent.action) {
        case 'NAVIGATE':
          if (intent.target) {
             const targetMode = AppMode[intent.target as keyof typeof AppMode];
             if (targetMode) {
                setMode(targetMode);
                setResult(`Navigating to ${intent.target}...`);
                setTimeout(() => toggleCommandPalette(false), 1000);
             } else {
                 setResult(`Unknown destination: ${intent.target}`);
             }
          }
          break;

        case 'CONFIGURE_GOVERNANCE':
          setMode(AppMode.PROCESS_MAP);
          setProcessState((prev) => {
              const newGov = { ...prev.governance };
              if (intent.parameters?.targetSystem) newGov.targetSystem = intent.parameters.targetSystem;
              if (intent.parameters?.constraintLevel) newGov.constraintLevel = intent.parameters.constraintLevel;
              if (intent.parameters?.outputTopology) newGov.outputTopology = intent.parameters.outputTopology;
              return { governance: newGov };
          });
          setResult(`Updated Governance Config: ${intent.reasoning}`);
          setTimeout(() => toggleCommandPalette(false), 1500);
          break;
          
        case 'CONFIGURE_IMAGE':
          setMode(AppMode.IMAGE_GEN);
          setImageGenState((prev) => {
             const updates: any = {};
             if (intent.parameters?.aspectRatio) updates.aspectRatio = intent.parameters.aspectRatio;
             if (intent.parameters?.size) updates.size = intent.parameters.size;
             if (intent.parameters?.prompt) updates.prompt = intent.parameters.prompt;
             return updates;
          });
          setResult(`Updated Image Config: ${intent.reasoning}`);
          setTimeout(() => toggleCommandPalette(false), 1500);
          break;

        case 'ANALYZE_POWER':
             setMode(AppMode.POWER_XRAY);
             setResult("Opening Power X-Ray module...");
             setTimeout(() => toggleCommandPalette(false), 1000);
             break;
        
        case 'GENERATE_CODE':
            setMode(AppMode.CODE_STUDIO);
            setCodeStudioState({
                prompt: intent.parameters?.prompt || input,
                language: intent.parameters?.language || 'TypeScript'
            });
            setResult(`Initializing Dev Matrix: ${intent.reasoning}`);
            setTimeout(() => toggleCommandPalette(false), 1500);
            break;

        case 'HARDWARE_SEARCH':
            setMode(AppMode.HARDWARE_ENGINEER);
            setHardwareState({
                componentQuery: intent.parameters?.query || input
            });
            setResult(`Targeting Component Search: ${intent.reasoning}`);
            setTimeout(() => toggleCommandPalette(false), 1500);
            break;

        case 'ACTIVATE_VOICE':
            setMode(AppMode.VOICE_MODE);
            setResult(`Engaging Neural Voice Core: ${intent.reasoning}`);
            setTimeout(() => toggleCommandPalette(false), 1000);
            break;

        default:
          setResult(`Action interpreted: ${intent.action} (No handler)`);
      }

    } catch (err) {
      console.error(err);
      setResult("Failed to interpret command.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm" onClick={() => toggleCommandPalette(false)}>
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e: any) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 py-4 border-b border-[#1f1f1f]">
              <Command className="w-5 h-5 text-[#9d4edd] mr-3" />
              <input 
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                placeholder="Ask Structura to navigate, configure, or create... (e.g. 'Write a Python script for data analysis')"
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-gray-600"
              />
              {isLoading && <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin ml-3" />}
              <button 
                  onClick={() => toggleCommandPalette(false)}
                  className="ml-3 p-1 text-gray-500 hover:text-white"
              >
                  <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Suggested Actions */}
            {!input && !isLoading && !result && (
                <div className="p-2 border-t border-[#1f1f1f]">
                    <div className="px-3 py-2 text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-1">Suggested Directives</div>
                    {SUGGESTIONS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                              setInput(s.command);
                              inputRef.current?.focus();
                          }}
                          className="w-full flex items-center px-3 py-2 rounded hover:bg-[#111] text-gray-400 hover:text-white transition-colors group"
                        >
                            <div className="w-5 h-5 flex items-center justify-center rounded bg-[#1f1f1f] text-gray-500 group-hover:bg-[#9d4edd] group-hover:text-black mr-3 transition-colors">
                                {s.id === 'code-gen' ? <Code className="w-3 h-3" /> : 
                                 s.id === 'hw-search' ? <Cpu className="w-3 h-3" /> :
                                 s.id === 'nav-voice' ? <Mic className="w-3 h-3" /> :
                                 s.id.includes('nav') ? <ChevronRight className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-mono flex-1 text-left">{s.label}</span>
                            <span className="text-[9px] font-mono text-gray-600 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                EXECUTE
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Footer Legend */}
            <div className="bg-[#050505] p-2 text-xs text-gray-500 font-mono border-t border-[#1f1f1f] flex justify-between px-4">
              <div className="flex items-center gap-4">
                  <span>Navigate</span>
                  <span>Configure</span>
                  <span>Generate</span>
                  <span>Analyze</span>
              </div>
              <div className="flex items-center gap-2">
                  <span>ESC to close</span>
                  <span>↵ to execute</span>
              </div>
            </div>

            {result && (
                <div className="px-4 py-3 bg-[#9d4edd]/10 border-t border-[#9d4edd]/20 text-[#9d4edd] text-xs font-mono flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    {result}
                </div>
            )}
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;