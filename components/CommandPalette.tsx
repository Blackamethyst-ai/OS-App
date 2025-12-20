
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { interpretIntent, predictNextActions, promptSelectKey } from '../services/geminiService';
import { AppMode, SuggestedAction, AppTheme } from '../types';
import { Command, Loader2, X, Sparkles, ChevronRight, Code, Cpu, Mic, Zap, Image, BookOpen, Layers, Terminal, Activity, Search, Shield, BrainCircuit, Split, Palette, History, User, HardDrive, Settings, FlaskConical, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const CommandPalette: React.FC = () => {
  // Destructured addLog from useAppStore
  const { 
      isCommandPaletteOpen, 
      toggleCommandPalette, 
      setMode, 
      setProcessState, 
      setImageGenState,
      setCodeStudioState,
      setHardwareState,
      setVoiceState,
      setBibliomorphicState,
      setTheme,
      addResearchTask, 
      setFocusedSelector,
      addLog,
      mode,
      system,
      user
  } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedAction[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const staticSuggestions = useMemo(() => {
      const base = [
          { id: 'nav-dashboard', label: 'Navigate: Dashboard', command: 'Navigate to Dashboard', icon: Layers },
          { id: 'nav-hw', label: 'Navigate: Hardware Core', command: 'Navigate to Hardware', icon: Cpu },
          { id: 'nav-voice', label: 'Initialize Voice Core', command: 'Open Voice Mode', icon: Mic },
          { id: 'nav-bicameral', label: 'Engage Swarm Intelligence', command: 'Open Bicameral Engine', icon: Split },
          { id: 'theme-midnight', label: 'UI Skin: Midnight Blue', command: 'Switch to Midnight Theme', icon: Palette },
          { id: 'theme-amber', label: 'UI Skin: Amber Terminal', command: 'Switch to Amber Theme', icon: Palette },
      ];

      switch(mode) {
          case AppMode.CODE_STUDIO:
              return [
                  { id: 'code-gen', label: 'Generate React Hook', command: 'Write a custom React state hook', icon: Code },
                  { id: 'code-api', label: 'Create FastAPI Endpoint', command: 'Write a Python FastAPI router', icon: Terminal },
                  ...base
              ];
          case AppMode.IMAGE_GEN:
              return [
                  { id: 'img-4k', label: 'Set Resolution to 4K', command: 'Set image resolution to 4K', icon: Image },
                  { id: 'img-cyber', label: 'Generate Neo-Tokyo', command: 'Generate a futuristic cityscape with rain', icon: Sparkles },
                  ...base
              ];
          case AppMode.BIBLIOMORPHIC:
              return [
                  { id: 'biblio-hyp', label: 'Generate Hypotheses', command: 'Generate new hypotheses from research', icon: FlaskConical },
                  ...base
              ];
          default:
              return [
                  { id: 'gen-code', label: 'Open Studio', command: 'Open Code Studio', icon: Code },
                  { id: 'analyze-pwr', label: 'Analyze System Power', command: 'Analyze power systems', icon: Activity },
                  ...base
              ];
      }
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.matches('input, textarea, [contenteditable]');

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      if (e.key === '/' && !isInput && !isCommandPaletteOpen) {
        e.preventDefault();
        toggleCommandPalette(true);
      }

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
      setTimeout(() => inputRef.current?.focus(), 50);
      setInput('');
      setResult(null);
      setAiSuggestions([]); 
      
      const fetchSuggestions = async () => {
          setIsPredicting(true);
          try {
              const hasKey = await window.aistudio?.hasSelectedApiKey();
              if (hasKey) {
                  const lastLog = system.logs.length > 0 ? system.logs[system.logs.length - 1].message : undefined;
                  const suggestions = await predictNextActions(mode, {}, lastLog);
                  setAiSuggestions(suggestions);
              }
          } catch(e) { console.error("AI Prediction Failed", e); }
          finally { setIsPredicting(false); }
      };
      fetchSuggestions();
    }
  }, [isCommandPaletteOpen, mode, system.logs]);

  const executeCommand = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setResult(null);

    const lowInput = input.toLowerCase();

    // 0. Focus Mode Trigger
    if (lowInput.startsWith("focus ") || lowInput.startsWith("target ")) {
        const selector = input.split(' ').slice(1).join(' ');
        if (selector) {
            setFocusedSelector(selector);
            setResult(`Targeting element: ${selector}`);
            setTimeout(() => toggleCommandPalette(false), 800);
            setIsLoading(false);
            return;
        }
    }

    if (lowInput.includes('theme') || lowInput.includes('switch to')) {
        let msg = '';
        if (lowInput.includes('midnight')) { setTheme(AppTheme.MIDNIGHT); msg = 'Midnight Core Enabled'; }
        else if (lowInput.includes('amber')) { setTheme(AppTheme.AMBER); msg = 'Amber Protocol Engaged'; }
        else if (lowInput.includes('dark')) { setTheme(AppTheme.DARK); msg = 'Dark Mode Restored'; }
        else if (lowInput.includes('light')) { setTheme(AppTheme.LIGHT); msg = 'High Clarity Skin Active'; }
        else if (lowInput.includes('neon')) { setTheme(AppTheme.NEON_CYBER); msg = 'Neon Entropy Initialized'; }
        
        if (msg) {
            setResult(msg);
            setTimeout(() => toggleCommandPalette(false), 800);
            setIsLoading(false);
            return;
        }
    }

    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) { await promptSelectKey(); setIsLoading(false); return; }

      if (lowInput.startsWith("research")) {
          const query = input.replace(/^research\s+/i, '').trim();
          if (query) {
              addResearchTask({ id: crypto.randomUUID(), query, status: 'QUEUED', progress: 0, logs: ['Dispatched via Command Palette'], timestamp: Date.now() });
              setResult(`Agent Dispatched: Researching "${query}"...`);
              setTimeout(() => toggleCommandPalette(false), 1200);
              setIsLoading(false);
              return;
          }
      }

      const intent = await interpretIntent(input);
      
      switch (intent.action) {
        case 'NAVIGATE':
          if (intent.target) {
             const targetMode = AppMode[intent.target as keyof typeof AppMode];
             if (targetMode) {
                if (targetMode === AppMode.BICAMERAL) {
                    setMode(AppMode.BIBLIOMORPHIC);
                    setBibliomorphicState({ activeTab: 'bicameral' });
                } else {
                    setMode(targetMode);
                }
                setResult(`Redirecting to ${intent.target} Sector...`);
                setTimeout(() => toggleCommandPalette(false), 800);
             }
          }
          break;
        case 'FOCUS_ELEMENT':
            if (intent.parameters?.selector) {
                setFocusedSelector(intent.parameters.selector);
                setResult(`Focusing UI context: ${intent.parameters.selector}`);
                setTimeout(() => toggleCommandPalette(false), 800);
            }
            break;
        default:
          setResult(`Protocol Executed: ${intent.action}`);
          if (intent.reasoning) addLog('INFO', `COMMAND_LOG: ${intent.reasoning}`);
          setTimeout(() => toggleCommandPalette(false), 1500);
      }

    } catch (err) {
      console.error(err);
      setResult("Command interpretation failure.");
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (name: string) => {
      switch(name) {
          case 'Zap': return Zap;
          case 'Code': return Code;
          case 'Search': return Search;
          case 'Cpu': return Cpu;
          case 'Image': return Image;
          case 'BookOpen': return BookOpen;
          case 'Shield': return Shield;
          case 'Terminal': return Terminal;
          case 'Palette': return Palette;
          case 'Target': return Target;
          default: return Sparkles;
      }
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/70 backdrop-blur-md" onClick={() => toggleCommandPalette(false)}>
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e: any) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-6 py-5 border-b border-[#1f1f1f]">
              <Command className="w-5 h-5 text-[#9d4edd] mr-4" />
              <input 
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                placeholder="Ask Structura to navigate, focus, or research (e.g. 'focus .header')..."
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-gray-700"
                autoComplete="off"
              />
              {isLoading && <Loader2 className="w-5 h-5 text-[#9d4edd] animate-spin ml-4" />}
              <button onClick={() => toggleCommandPalette(false)} className="ml-4 p-1 text-gray-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            {!input && !isLoading && !result && (
                <div className="flex flex-col">
                    <div className="bg-[#0e0e0e]/50">
                        <div className="px-6 py-2.5 text-[8px] text-[#9d4edd] font-mono uppercase tracking-[0.4em] flex items-center justify-between border-b border-[#1f1f1f] bg-[#111]">
                            <span className="flex items-center gap-2"><BrainCircuit className="w-3.5 h-3.5" /> Predicted Actions (Grounded)</span>
                            {isPredicting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        </div>
                        
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                            {aiSuggestions.length > 0 ? (
                                aiSuggestions.map((s) => {
                                    const Icon = getIcon(s.iconName);
                                    return (
                                        <button key={s.id} onClick={() => { setInput(s.command); inputRef.current?.focus(); }} className="w-full flex items-center px-6 py-4 hover:bg-white/5 text-gray-300 hover:text-white transition-all group border-b border-[#1f1f1f] last:border-0">
                                            <div className="w-8 h-8 flex items-center justify-center rounded bg-[#9d4edd]/10 text-[#9d4edd] border border-[#9d4edd]/20 mr-4 transition-all group-hover:bg-[#9d4edd] group-hover:text-black"><Icon className="w-4 h-4" /></div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-xs font-bold font-mono group-hover:text-white">{s.label}</div>
                                                <div className="text-[9px] text-gray-600 font-mono truncate">{s.reasoning}</div>
                                            </div>
                                            <span className="text-[9px] font-mono text-[#9d4edd] opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5">EXECUTE <ChevronRight className="w-3.5 h-3.5" /></span>
                                        </button>
                                    );
                                })
                            ) : !isPredicting && (
                                <div className="px-6 py-6 text-[9px] text-gray-600 font-mono text-center italic">Waiting for system signals...</div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-[#1f1f1f]">
                        <div className="px-6 py-2.5 text-[8px] text-gray-600 font-mono uppercase tracking-[0.4em] bg-[#050505]">System Shortcuts</div>
                        <div className="grid grid-cols-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {staticSuggestions.map((s) => (
                                <button key={s.id} onClick={() => { setInput(s.command); inputRef.current?.focus(); }} className="flex items-center px-6 py-3.5 hover:bg-white/5 text-gray-400 hover:text-white transition-all group border-b border-r border-[#1f1f1f]">
                                    <div className="w-6 h-6 flex items-center justify-center rounded bg-[#1f1f1f] text-gray-500 group-hover:text-white mr-3 transition-colors">{s.icon ? <s.icon className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</div>
                                    <span className="text-[11px] font-mono flex-1 text-left">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#050505] p-3 px-6 text-[9px] text-gray-600 font-mono border-t border-[#1f1f1f] flex justify-between items-center">
              <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5"><History size={11}/> RECENT_OP</span>
                  <span className="flex items-center gap-1.5"><Search size={11}/> CROSS_INDEX</span>
                  <span className="flex items-center gap-1.5"><Palette size={11}/> UI_VECTORS</span>
              </div>
              <div className="flex items-center gap-3">
                  <span className="bg-[#111] px-1.5 py-0.5 rounded border border-[#333]">ESC TO EXIT</span>
                  <span className="bg-[#111] px-1.5 py-0.5 rounded border border-[#333]">↵ TO EXECUTE</span>
              </div>
            </div>

            {result && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4 bg-[#9d4edd]/10 border-t border-[#9d4edd]/30 text-[#9d4edd] text-xs font-mono flex items-center">
                    <Sparkles className="w-4 h-4 mr-3 animate-pulse" />
                    {result}
                </motion.div>
            )}
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
