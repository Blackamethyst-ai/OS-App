
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { interpretIntent, predictNextActions, promptSelectKey } from '../services/geminiService';
import { AppMode, SuggestedAction } from '../types';
import { Command, Loader2, X, Sparkles, ChevronRight, Code, Cpu, Mic, Zap, Image, BookOpen, Layers, Terminal, Activity, Search, Shield, BrainCircuit, Split } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const CommandPalette: React.FC = () => {
  const { 
      isCommandPaletteOpen, 
      toggleCommandPalette, 
      setMode, 
      setProcessState, 
      setImageGenState,
      setCodeStudioState,
      setHardwareState,
      mode,
      system,
      // Accessing state slices directly for context injection
      codeStudio,
      hardware,
      process,
      bibliomorphic
  } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedAction[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic Suggestions based on active context (Hardcoded Fallback)
  const staticSuggestions = useMemo(() => {
      const base = [
          { id: 'nav-hw', label: 'Navigate to Hardware Core', command: 'Navigate to Hardware', icon: Cpu },
          { id: 'nav-voice', label: 'Initialize Voice Core', command: 'Open Voice Mode', icon: Mic },
          { id: 'nav-bicameral', label: 'Engage Bicameral Engine', command: 'Open Bicameral Engine', icon: Split },
      ];

      switch(mode) {
          case AppMode.CODE_STUDIO:
              return [
                  { id: 'code-gen', label: 'Generate React Component', command: 'Write a responsive React card component', icon: Code },
                  { id: 'code-api', label: 'Create API Handler', command: 'Write a Python FastAPI endpoint for user login', icon: Terminal },
                  ...base
              ];
          case AppMode.IMAGE_GEN:
              return [
                  { id: 'img-4k', label: 'Set Resolution to 4K', command: 'Set image resolution to 4K', icon: Image },
                  { id: 'img-cyber', label: 'Generate Cyberpunk City', command: 'Generate a futuristic cyberpunk city skyline neon lights', icon: Sparkles },
                  ...base
              ];
          case AppMode.HARDWARE_ENGINEER:
              return [
                  { id: 'hw-h100', label: 'Search NVIDIA H100', command: 'Search specs for H100 GPU', icon: Cpu },
                  { id: 'hw-bom', label: 'Analyze Schematic', command: 'Analyze current schematic for power faults', icon: Zap },
                  ...base
              ];
          case AppMode.BIBLIOMORPHIC:
              return [
                  { id: 'bib-dna', label: 'Extract Book DNA', command: 'Analyze the tone and themes of the uploaded text', icon: BookOpen },
                  ...base
              ];
          case AppMode.PROCESS_MAP:
              return [
                  { id: 'bicam-plan', label: 'Generate Execution Plan', command: 'Decompose a complex task', icon: BrainCircuit },
                  ...base
              ]
          default:
              return [
                  { id: 'gen-code', label: 'Write Code', command: 'Open Code Studio', icon: Code },
                  { id: 'analyze-pwr', label: 'Analyze Power', command: 'Analyze power systems', icon: Activity },
                  ...base
              ];
      }
  }, [mode]);

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

  // Reset and Fetch AI Predictions on Open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      // Small delay to ensure DOM is ready for focus
      setTimeout(() => inputRef.current?.focus(), 50);
      setInput('');
      setResult(null);
      setAiSuggestions([]); // Clear previous
      
      // Fetch AI Suggestions
      const fetchSuggestions = async () => {
          setIsPredicting(true);
          try {
              const hasKey = await window.aistudio?.hasSelectedApiKey();
              if (hasKey) {
                  const lastLog = system.logs.length > 0 ? system.logs[system.logs.length - 1].message : undefined;
                  
                  // Gather Context
                  const contextData: any = {};
                  if (mode === AppMode.CODE_STUDIO) {
                      contextData.language = codeStudio.language;
                      contextData.hasCode = !!codeStudio.generatedCode;
                      contextData.lastPrompt = codeStudio.prompt;
                  } else if (mode === AppMode.HARDWARE_ENGINEER) {
                      contextData.hasSchematic = !!hardware.schematicImage;
                      contextData.recommendationCount = hardware.recommendations.length;
                  } else if (mode === AppMode.PROCESS_MAP) {
                      contextData.artifactCount = process.artifacts.length;
                      contextData.governance = process.governance.targetSystem;
                  } else if (mode === AppMode.BIBLIOMORPHIC) {
                      contextData.hasBook = !!bibliomorphic.dna;
                      contextData.title = bibliomorphic.dna?.title;
                  }

                  const suggestions = await predictNextActions(mode, contextData, lastLog);
                  setAiSuggestions(suggestions);
              }
          } catch(e) {
              console.error("AI Prediction Failed", e);
          } finally {
              setIsPredicting(false);
          }
      };
      
      fetchSuggestions();
    }
  }, [isCommandPaletteOpen, mode]); // Re-fetch if mode changes while open

  const executeCommand = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) { await promptSelectKey(); setIsLoading(false); return; }

      // Handle special alias for bicameral engine navigation
      if (input.toLowerCase().includes('bicameral') || input.toLowerCase().includes('engine')) {
          setMode(AppMode.PROCESS_MAP);
          setProcessState({ activeTab: 'workflow', architectMode: 'EXECUTION' });
          setResult('Engaging Bicameral Architecture...');
          setTimeout(() => toggleCommandPalette(false), 1000);
          setIsLoading(false);
          return;
      }

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
          default: return Sparkles;
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
                <div className="p-0 border-t border-[#1f1f1f]">
                    {/* AI Suggestions Section */}
                    <div className="bg-[#0e0e0e]">
                        <div className="px-4 py-2 text-[9px] text-[#9d4edd] font-mono uppercase tracking-widest flex items-center justify-between border-b border-[#1f1f1f] bg-[#111]">
                            <span className="flex items-center gap-2">
                                <BrainCircuit className="w-3 h-3" /> Neural Predictions
                            </span>
                            {isPredicting && <Loader2 className="w-3 h-3 animate-spin text-[#9d4edd]" />}
                        </div>
                        
                        {aiSuggestions.length > 0 ? (
                            aiSuggestions.map((s) => {
                                const Icon = getIcon(s.iconName);
                                return (
                                    <button
                                      key={s.id}
                                      onClick={() => {
                                          setInput(s.command);
                                          inputRef.current?.focus();
                                      }}
                                      className="w-full flex items-center px-4 py-3 hover:bg-[#1a1a1a] text-gray-300 hover:text-white transition-colors group border-b border-[#1f1f1f] last:border-0"
                                    >
                                        <div className="w-6 h-6 flex items-center justify-center rounded bg-[#9d4edd]/10 text-[#9d4edd] border border-[#9d4edd]/20 mr-3 transition-colors group-hover:bg-[#9d4edd] group-hover:text-black">
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-xs font-bold font-mono">{s.label}</div>
                                            <div className="text-[9px] text-gray-500 font-mono truncate max-w-sm">{s.reasoning}</div>
                                        </div>
                                        <span className="text-[9px] font-mono text-[#9d4edd] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            APPLY <ChevronRight className="w-3 h-3" />
                                        </span>
                                    </button>
                                );
                            })
                        ) : !isPredicting && (
                            <div className="px-4 py-3 text-[10px] text-gray-600 font-mono text-center italic">
                                No context signals detected.
                            </div>
                        )}
                    </div>

                    {/* Static Suggestions Section */}
                    <div className="border-t border-[#1f1f1f]">
                        <div className="px-4 py-2 text-[9px] text-gray-600 font-mono uppercase tracking-widest bg-[#050505]">
                            Standard Protocols
                        </div>
                        {staticSuggestions.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                  setInput(s.command);
                                  inputRef.current?.focus();
                              }}
                              className="w-full flex items-center px-4 py-2 hover:bg-[#111] text-gray-400 hover:text-white transition-colors group"
                            >
                                <div className="w-5 h-5 flex items-center justify-center rounded bg-[#1f1f1f] text-gray-500 group-hover:text-white mr-3 transition-colors">
                                    {s.icon ? <s.icon className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </div>
                                <span className="text-xs font-mono flex-1 text-left">{s.label}</span>
                            </button>
                        ))}
                    </div>
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
