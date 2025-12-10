
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { interpretIntent } from '../services/geminiService';
import { AppMode, AspectRatio, ImageSize, GovernanceSchema } from '../types';
import { Command, Loader2, ArrowRight, X, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const SUGGESTIONS = [
  { id: 'nav-hw', label: 'Navigate to Hardware Core', command: 'Navigate to Hardware' },
  { id: 'conf-gov', label: 'Configure Strict Governance', command: 'Set strict governance' },
  { id: 'gen-asset', label: 'Generate 4K Asset', command: 'Configure image gen for 4K' },
  { id: 'analyze-pwr', label: 'Analyze Power Dynamics', command: 'Analyze power systems' },
  { id: 'nav-voice', label: 'Initialize Voice Core', command: 'Open Voice Mode' },
];

const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, toggleCommandPalette, setMode, setProcessState, setImageGenState } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        toggleCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, toggleCommandPalette]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
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
             // Since Power X-Ray relies on its own internal state/API call, 
             // we just navigate there. Ideally we could pre-fill input if we exposed it in store.
             setResult("Opening Power X-Ray module...");
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

  if (!isCommandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm" onClick={() => toggleCommandPalette(false)}>
        <MotionDiv 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
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
              placeholder="Ask Structura to navigate or configure... (e.g. 'Set strict governance for Cloud Auth')"
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
                          <div className="w-1.5 h-1.5 rounded-full bg-[#333] group-hover:bg-[#9d4edd] mr-3 transition-colors"></div>
                          <span className="text-xs font-mono flex-1 text-left">{s.label}</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#9d4edd]" />
                      </button>
                  ))}
              </div>
          )}

          {/* Footer Legend */}
          <div className="bg-[#050505] p-2 text-xs text-gray-500 font-mono border-t border-[#1f1f1f] flex justify-between px-4">
             <div className="flex items-center gap-4">
                <span>Navigate</span>
                <span>Configure</span>
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
    </AnimatePresence>
  );
};

export default CommandPalette;
