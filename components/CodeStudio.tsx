
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, simulateCodeExecution, formatCode, fixCode, validateSyntax, generateCodeSuggestions, applyCodeSuggestion } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { audio } from '../services/audioService'; 
import { useFlywheel } from '../hooks/useFlywheel';
import { Code, Terminal, Play, Loader2, Copy, Check, Save, RotateCcw, AlertCircle, Maximize2, Minimize2, PanelBottomClose, PanelBottomOpen, ChevronRight, Wand2, Cpu, Map as MapIcon, HardDrive, ShieldCheck, Stethoscope, Sparkles, X, GitMerge, AlertTriangle, Repeat, Database, Lightbulb, FileText, ToggleLeft, ToggleRight, Layout, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileData } from '../types';
import { useVoiceAction } from '../hooks/useVoiceAction';
import TaskBoard from './TaskBoard';

const SYNTAX_CONFIG: Record<string, { keywords: string; types: string; comment: RegExp; string: RegExp }> = {
    python: {
        keywords: "\\b(def|class|import|from|return|if|else|elif|for|while|try|except|finally|with|as|pass|lambda|global|nonlocal|True|False|None|and|or|not|is|in|print)\\b",
        types: "\\b(int|str|bool|float|list|dict|set|tuple|self)\\b",
        comment: /(#.*$)/gm,
        string: /(".*?"|'.*?'|""".*?"""|'''.*?''')/g
    },
    rust: {
        keywords: "\\b(fn|let|mut|if|else|match|loop|while|for|return|break|continue|struct|enum|impl|trait|use|pub|mod|crate|super|self|static|const|unsafe|async|await|move|ref|type|where)\\b",
        types: "\\b(i32|u32|i64|u64|f32|f64|bool|char|str|String|Vec|Option|Result)\\b",
        comment: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        string: /(".*?"|'.*?')/g
    },
    go: {
        keywords: "\\b(break|default|func|interface|select|case|defer|go|map|struct|chan|else|goto|package|switch|const|fallthrough|if|range|type|continue|for|import|return|var)\\b",
        types: "\\b(bool|string|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|byte|rune|float32|float64|complex64|complex128|error)\\b",
        comment: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        string: /(".*?"|'.*?'|`[\s\S]*?`)/g
    },
    typescript: { 
        keywords: "\\b(const|let|var|function|class|import|from|return|if|else|for|while|async|await|export|default|interface|type|implements|extends|public|private|protected|new|try|catch|finally|switch|case|break|throw|typeof|instanceof|void|this)\\b",
        types: "\\b(string|number|boolean|any|Promise|Array|Object|null|undefined|true|false)\\b",
        comment: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        string: /(".*?"|'.*?'|`[\s\S]*?`)/g
    },
    markdown: {
        keywords: "(^#+\\s+.*$|^>+\\s+.*$|\\*\\*.*?\\*\\*|\\*.*?\\*|`.*?`|\\[.*?\\]\\(.*?\\))",
        types: "\\b(https?://\\S+)\\b",
        comment: /(<!--[\s\S]*?-->)/gm,
        string: /(^[-*+]\s+.*$|^\d+\.\s+.*$)/gm
    }
};

const highlightCode = (code: string, lang: string) => {
    let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const config = SYNTAX_CONFIG[lang.toLowerCase()] || SYNTAX_CONFIG.typescript;

    const tokens: { placeholder: string, value: string }[] = [];
    const storeToken = (val: string) => {
        const placeholder = `__TOKEN_${tokens.length}__`;
        tokens.push({ placeholder, value: val });
        return placeholder;
    };

    html = html.replace(config.comment, (match) => storeToken(`<span class="text-gray-500 italic">${match}</span>`));
    html = html.replace(config.string, (match) => storeToken(`<span class="text-[#42be65]">${match}</span>`));

    if (config.keywords) html = html.replace(new RegExp(config.keywords, 'g'), '<span class="text-[#f1c21b]">$1</span>');
    if (config.types) html = html.replace(new RegExp(config.types, 'g'), '<span class="text-[#22d3ee]">$1</span>');

    tokens.forEach(t => { html = html.replace(t.placeholder, t.value); });

    return html;
};

const CodeMinimap: React.FC<{ code: string; scrollRef: React.RefObject<HTMLDivElement> }> = ({ code, scrollRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [viewportY, setViewportY] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !code) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const lines = code.split('\n');
        const lineHeight = 3; 
        const gap = 1;
        const width = canvas.width;
        const totalHeight = lines.length * (lineHeight + gap);
        
        canvas.height = Math.max(canvas.parentElement?.clientHeight || 0, totalHeight);
        ctx.clearRect(0, 0, width, canvas.height);

        ctx.fillStyle = '#333'; 
        
        lines.forEach((line, i) => {
            const indent = line.search(/\S|$/) * 2;
            const length = Math.min((line.length - indent/2) * 2, width - indent);
            
            if (line.includes('import') || line.includes('from')) ctx.fillStyle = '#f1c21b';
            else if (line.trim().startsWith('//') || line.trim().startsWith('/*')) ctx.fillStyle = '#555';
            else if (line.includes('function') || line.includes('class') || line.includes('=>')) ctx.fillStyle = '#9d4edd';
            else ctx.fillStyle = '#444';

            if (length > 0) {
                ctx.fillRect(indent + 2, i * (lineHeight + gap) + 4, length, lineHeight);
            }
        });

    }, [code, canvasRef.current?.parentElement?.clientHeight]);

    useEffect(() => {
        const handleScroll = () => {
            if (!scrollRef.current || !canvasRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const canvasHeight = canvasRef.current.height;
            const ratio = canvasHeight / scrollHeight;
            
            setViewportY(scrollTop * ratio);
            setViewportHeight(clientHeight * ratio);
        };

        const el = scrollRef.current;
        el?.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => el?.removeEventListener('scroll', handleScroll);
    }, [code]);

    return (
        <div className="w-16 h-full bg-[#0c0c0c] border-l border-[#1f1f1f] relative overflow-hidden hidden md:block">
            <canvas ref={canvasRef} className="w-full opacity-60" width={64} />
            <div 
                className="absolute left-0 w-full bg-[#9d4edd]/10 border-y border-[#9d4edd]/30 pointer-events-none transition-transform duration-75"
                style={{ top: 0, height: viewportHeight, transform: `translateY(${viewportY}px)` }}
            />
        </div>
    );
};

const CodeStudio: React.FC = () => {
  const { codeStudio, setCodeStudioState, addLog } = useAppStore();
  const { track } = useFlywheel('BUILDER PROTOCOL');
  const [isCopied, setIsCopied] = React.useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Layout State
  const [showTerminal, setShowTerminal] = useState(true);
  const [isFormatting, setIsFormatting] = useState(false);
  const [showFormatFlash, setShowFormatFlash] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
  
  // RAG State
  const [useContext, setUseContext] = useState(false);
  const [activeArtifactCount, setActiveArtifactCount] = useState(0);
  
  // Autonomous Loop State
  const [autoHealEnabled, setAutoHealEnabled] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Real-time Syntax Check
  const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  
  // Terminal Boot Sequence State
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [activeOutput, setActiveOutput] = useState<string | null>(null);

  // Persistence logic (localStorage)
  const saveToLocal = () => {
      const stateToSave = {
          prompt: codeStudio.prompt,
          language: codeStudio.language,
          model: codeStudio.model,
          generatedCode: codeStudio.generatedCode
      };
      localStorage.setItem('codestudio_state', JSON.stringify(stateToSave));
      addLog('SYSTEM', 'CODE_VAULT: Session encoded to persistent storage.');
  };

  // Periodic Save Timer
  useEffect(() => {
      let timer: number | undefined;
      if (codeStudio.autoSaveEnabled) {
          timer = window.setInterval(() => {
              saveToLocal();
          }, 30000); // 30 seconds
      }
      return () => { if (timer) clearInterval(timer); };
  }, [codeStudio.autoSaveEnabled, codeStudio.prompt, codeStudio.generatedCode, codeStudio.language, codeStudio.model]);

  // Initial load
  useEffect(() => {
      const saved = localStorage.getItem('codestudio_state');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setCodeStudioState(parsed);
          } catch(e) { console.error("Failed to restore session"); }
      }
  }, []);

  // Keyboard Shortcut: CMD+SHIFT+F for format
  useEffect(() => {
      const handleShortcut = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
              e.preventDefault();
              handleFormat();
          }
      };
      window.addEventListener('keydown', handleShortcut);
      return () => window.removeEventListener('keydown', handleShortcut);
  }, [codeStudio.generatedCode]);

  // Syntax Validation Effect
  useEffect(() => {
      const code = codeStudio.generatedCode;
      if (!code || codeStudio.language === 'markdown') { setSyntaxErrors([]); return; }

      const timer = setTimeout(async () => {
          setIsValidating(true);
          const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
          if (hasKey) {
              const errors = await validateSyntax(code, codeStudio.language);
              setSyntaxErrors(errors);
          }
          setIsValidating(false);
      }, 1500); // 1.5s debounce

      return () => clearTimeout(timer);
  }, [codeStudio.generatedCode, codeStudio.language]);

  // Context Fetcher Logic
  useEffect(() => {
      const checkArtifacts = async () => {
          if (useContext) {
              const arts = await neuralVault.getArtifacts();
              setActiveArtifactCount(arts.length);
          } else {
              setActiveArtifactCount(0);
          }
      };
      checkArtifacts();
  }, [useContext]);

  const handleGenerate = async () => {
    // 1. INPUT VALIDATION
    if (!codeStudio.prompt?.trim()) {
        setCodeStudioState({ error: "Task Directive cannot be empty. Please define functionality." });
        audio.playError();
        return;
    }
    
    audio.playClick();
    setCodeStudioState({ isLoading: true, error: null, activePatch: null }); 

    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await promptSelectKey();
        setCodeStudioState({ isLoading: false });
        return;
      }

      let contextFiles: FileData[] = [];
      
      // RAG Injection
      if (useContext) {
          const artifacts = await neuralVault.getArtifacts();
          if (artifacts.length > 0) {
              addLog('SYSTEM', `CODE_GEN: Injecting ${artifacts.length} artifacts from Neural Vault...`);
              for (const art of artifacts) {
                  const buffer = await art.data.arrayBuffer();
                  const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                  contextFiles.push({
                      inlineData: { data: base64, mimeType: art.type },
                      name: art.name
                  });
              }
          }
      }

      const generated = await generateCode(codeStudio.prompt, codeStudio.language, codeStudio.model, contextFiles);
      audio.playSuccess();
      
      setCodeStudioState(prev => ({
        generatedCode: generated,
        isLoading: false,
        history: [...prev.history, { prompt: prev.prompt, code: generated, timestamp: Date.now() }]
      }));

      // Generate Suggestions
      try {
          const suggestions = await generateCodeSuggestions(generated, codeStudio.language);
          setCodeStudioState({ suggestions });
      } catch (e) {
          console.error("Suggestion gen failed", e);
      }

    } catch (err: any) {
      audio.playError();
      
      // 2. SPECIFIC ERROR FEEDBACK
      let feedback = "An unknown error occurred during generation.";
      if (err.message?.includes('429')) feedback = "Resource Exhaustion (Rate Limit). Please pause for 60 seconds.";
      else if (err.message?.includes('403')) feedback = "Access Denied. Check API Key credentials.";
      else if (err.message?.includes('503')) feedback = "Model Overloaded. Retrying uplink...";
      else feedback = `Generation Failed: ${err.message}`;
      
      setCodeStudioState({ error: feedback, isLoading: false });
    }
  };

  const applySuggestion = async (suggestion: string) => {
      if (!codeStudio.generatedCode) return;
      setIsApplyingSuggestion(true);
      audio.playClick();
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();

          const newCode = await applyCodeSuggestion(codeStudio.generatedCode, suggestion, codeStudio.language);
          audio.playSuccess();
          setCodeStudioState({ generatedCode: newCode, suggestions: [] }); 
          addLog('SUCCESS', `Applied: ${suggestion}`);
          track('Apply Suggestion').success();
      } catch (e: any) {
          audio.playError();
          addLog('ERROR', `Failed to apply suggestion: ${e.message}`);
          track('Apply Suggestion').fail();
      } finally {
          setIsApplyingSuggestion(false);
      }
  };

  const executeSimulationLoop = async () => {
      if (!codeStudio.generatedCode) return;
      audio.playClick();
      
      let currentCode = codeStudio.generatedCode;
      let attempt = 0;
      let solved = false;
      
      setCodeStudioState({ isExecuting: true, executionOutput: null });
      setShowTerminal(true);
      setBootLog([]); 
      setActiveOutput(null);
      setRetryCount(0);

      setBootLog(prev => [...prev, "[INIT]  Spinning up Neural Runtime Environment..."]);
      await new Promise(r => setTimeout(r, 500));

      while (attempt <= (autoHealEnabled ? MAX_RETRIES : 0) && !solved) {
          if (attempt > 0) {
              setBootLog(prev => [...prev, `[LOOP]  Autonomous Repair Attempt ${attempt}/${MAX_RETRIES}...`]);
              setRetryCount(attempt);
          }

          try {
              const hasKey = await window.aistudio?.hasSelectedApiKey();
              if (!hasKey) { await promptSelectKey(); break; }
              
              setBootLog(prev => [...prev, `[EXEC]  Running Simulation (Cycle ${attempt + 1})...`]);
              const output = await simulateCodeExecution(currentCode, codeStudio.language);
              
              const isError = output.includes("ERROR") || output.includes("Exception") || output.includes("CRITICAL");
              
              if (!isError) {
                  audio.playSuccess();
                  setBootLog(prev => [...prev, "[SUCCESS] Execution Validated."]);
                  setActiveOutput(output);
                  setCodeStudioState({ executionOutput: output, isExecuting: false });
                  solved = true;
                  track('Simulation Run').success();
              } else {
                  audio.playError();
                  setActiveOutput(output); 
                  
                  if (autoHealEnabled && attempt < MAX_RETRIES) {
                      setBootLog(prev => [...prev, `[FAIL]  Runtime Error Detected.`, `[ANALYSIS] Diagnosing failure vector...`]);
                      const fixedCode = await fixCode(currentCode, output, codeStudio.language);
                      currentCode = fixedCode;
                      setCodeStudioState({ generatedCode: currentCode });
                      setBootLog(prev => [...prev, `[PATCH] Code modification applied.`]);
                      await new Promise(r => setTimeout(r, 800)); 
                  } else {
                      setBootLog(prev => [...prev, "[FATAL] Max retries exceeded. Manual intervention required."]);
                      setCodeStudioState({ executionOutput: output, isExecuting: false });
                      track('Simulation Run').fail();
                  }
              }
          } catch (err: any) {
              setBootLog(prev => [...prev, `[CRITICAL] System Exception: ${err.message}`]);
              setCodeStudioState({ isExecuting: false });
              track('Simulation Run').fail();
              break;
          }
          attempt++;
      }
  };

  const handleAutoHeal = async () => {
      if (!codeStudio.generatedCode || !activeOutput) return;
      setIsHealing(true);
      audio.playClick();
      
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();

          const fixedCode = await fixCode(codeStudio.generatedCode, activeOutput, codeStudio.language);
          audio.playSuccess();
          setCodeStudioState({ generatedCode: fixedCode });
          setBootLog(prev => [...prev, "[AUTO-HEAL] Code patched successfully. Re-run simulation."]);
          setActiveOutput(null);
          track('Manual Auto-Heal').success();
      } catch (err: any) {
          audio.playError();
          setCodeStudioState({ error: "Healing failed: " + err.message });
          track('Manual Auto-Heal').fail();
      } finally {
          setIsHealing(false);
      }
  };

  const handleFormat = async () => {
      if (!codeStudio.generatedCode || codeStudio.language === 'markdown' || isFormatting) return;
      setIsFormatting(true);
      audio.playClick();
      addLog('SYSTEM', 'CODE_STUDIO: Applying structural formatting rules...');
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();

          const formatted = await formatCode(codeStudio.generatedCode, codeStudio.language);
          setCodeStudioState({ generatedCode: formatted });
          addLog('SUCCESS', 'CODE_STUDIO: Formatting protocol finalized.');
          
          // UI Improvement: Visual Flash Feedback
          setShowFormatFlash(true);
          setTimeout(() => setShowFormatFlash(false), 500);
          audio.playSuccess();
          
      } catch (err: any) {
          console.error("Format Failed:", err);
          audio.playError();
          addLog('ERROR', 'CODE_STUDIO: Formatting failed.');
      } finally {
          setIsFormatting(false);
      }
  };

  const handleCopy = () => {
    if (codeStudio.generatedCode) {
      navigator.clipboard.writeText(codeStudio.generatedCode);
      setIsCopied(true);
      audio.playClick();
      track('Copy Code').success();
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const applyNeuralPatch = () => {
      if (codeStudio.activePatch) {
          audio.playSuccess();
          track('Neural Patch').success();
          setCodeStudioState(prev => ({
              generatedCode: codeStudio.activePatch!.code,
              activePatch: null, 
              history: [...prev.history, { prompt: "Autonomic Patch", code: prev.generatedCode || "", timestamp: Date.now() }]
          }));
      }
  };

  const discardPatch = () => { 
      setCodeStudioState({ activePatch: null }); 
      track('Neural Patch').fail();
  };

  useEffect(() => {
    if (codeStudio.generatedCode && outputRef.current) { outputRef.current.scrollTop = 0; }
  }, [codeStudio.generatedCode]);
  
  useEffect(() => {
      if (terminalRef.current) { terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }
  }, [bootLog, activeOutput]);

  useVoiceAction('run_simulation', 'Execute current code simulation', executeSimulationLoop);
  useVoiceAction('copy_code', 'Copy current code to clipboard', handleCopy);
  useVoiceAction('toggle_auto_heal', 'Toggle auto-healing', () => setAutoHealEnabled(p => !p));
  useVoiceAction('toggle_auto_save', 'Toggle session auto-save', () => setCodeStudioState({ autoSaveEnabled: !codeStudio.autoSaveEnabled }));

  const parseTerminalOutput = (text: string) => {
      return text.split('\n').map((line, i) => {
          let className = "text-gray-300";
          if (line.includes("ERROR") || line.includes("CRITICAL") || line.includes("Exception")) className = "text-red-400 font-bold";
          if (line.includes("WARN")) className = "text-amber-400";
          if (line.includes("INFO") || line.includes("LOG")) className = "text-blue-400";
          if (line.includes("SUCCESS")) className = "text-[#42be65]";
          
          return (
              <div key={i} className={`${className} whitespace-pre-wrap`}>
                  {line}
              </div>
          );
      });
  };

  const hasRuntimeError = activeOutput && (activeOutput.includes("ERROR") || activeOutput.includes("Exception") || activeOutput.includes("CRITICAL"));

  const activeSubTab = codeStudio.activeTab || 'IDE';

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans relative">
      
      {/* Tab Navigation Header */}
      <div className="h-12 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center px-6 gap-6 z-30 shrink-0">
          {[
              { id: 'IDE', label: 'Terminal / IDE', icon: Code },
              { id: 'ACTIONS', label: 'Action Matrix', icon: ListTodo }
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => { setCodeStudioState({ activeTab: tab.id as any }); audio.playClick(); }}
                  className={`h-full flex items-center gap-2.5 px-2 border-b-2 transition-all text-[10px] font-black uppercase tracking-widest ${activeSubTab === tab.id ? 'border-[#9d4edd] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  <tab.icon size={14} className={activeSubTab === tab.id ? 'text-[#9d4edd]' : ''} />
                  {tab.label}
              </button>
          ))}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
            {activeSubTab === 'ACTIONS' ? (
                <motion.div 
                    key="actions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full w-full"
                >
                    <TaskBoard />
                </motion.div>
            ) : (
                <motion.div 
                    key="ide"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full"
                >
                    {/* Neural Patch Notification Overlay */}
                    <AnimatePresence>
                        {codeStudio.activePatch && (
                            <motion.div 
                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0a] border border-[#9d4edd] rounded-xl shadow-[0_0_40px_rgba(157,78,221,0.3)] p-4 flex flex-col gap-3 min-w-[400px]"
                            >
                                <div className="flex items-center justify-between border-b border-[#9d4edd]/30 pb-2">
                                    <div className="flex items-center gap-2 text-[#9d4edd]">
                                        <Sparkles className="w-4 h-4 animate-pulse" />
                                        <span className="font-bold font-mono text-xs uppercase tracking-wider">Neural Healer Active</span>
                                    </div>
                                    <button onClick={discardPatch} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="text-xs text-gray-300 font-mono">{codeStudio.activePatch.explanation}</div>
                                <div className="flex gap-2 mt-1">
                                    <button onClick={applyNeuralPatch} className="flex-1 py-2 bg-[#9d4edd] text-black font-bold font-mono text-xs uppercase rounded hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2"><GitMerge className="w-3 h-3" /> Merge Patch</button>
                                    <button onClick={discardPatch} className="px-3 py-2 border border-[#333] hover:border-white text-gray-400 hover:text-white font-mono text-xs uppercase rounded transition-all">Dismiss</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sidebar: Controls */}
                    <div className="lg:col-span-3 bg-[#050505] border-r border-[#1f1f1f] flex flex-col z-20">
                        <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
                            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
                                <Terminal className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
                                Dev Matrix
                            </h2>
                            <button 
                                onClick={() => setCodeStudioState({ autoSaveEnabled: !codeStudio.autoSaveEnabled })}
                                className={`text-[8px] font-mono flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${codeStudio.autoSaveEnabled ? 'text-[#42be65] bg-[#42be65]/10 border border-[#42be65]/30' : 'text-gray-600 bg-[#111] border border-transparent'}`}
                            >
                                {codeStudio.autoSaveEnabled ? <ShieldCheck className="w-2.5 h-2.5" /> : <HardDrive className="w-2.5 h-2.5" />}
                                AUTO_SAVE: {codeStudio.autoSaveEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider block">Intelligence Model</label>
                                <div className="relative group">
                                    <select
                                        value={codeStudio.model || 'gemini-2.5-flash'}
                                        onChange={(e) => setCodeStudioState({ model: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none appearance-none cursor-pointer hover:bg-[#111] transition-colors rounded-sm"
                                    >
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                                        <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Advanced Reasoning)</option>
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none"><Cpu className="w-3 h-3 text-gray-500" /></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider block">Target Runtime</label>
                                <div className="relative group">
                                    <select
                                        value={codeStudio.language || 'typescript'}
                                        onChange={(e) => setCodeStudioState({ language: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none appearance-none cursor-pointer hover:bg-[#111] transition-colors rounded-sm"
                                    >
                                        {['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'HTML/CSS', 'SQL', 'Bash', 'Markdown'].map(lang => (
                                            <option key={lang} value={lang.toLowerCase()}>{lang}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none"><div className="w-1.5 h-1.5 border-b border-r border-gray-500 rotate-45"></div></div>
                                </div>
                            </div>

                            <div className="space-y-2 bg-[#111] p-3 rounded border border-[#222]">
                                <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Database className="w-3 h-3 text-[#22d3ee]" />
                                        Memory Context
                                    </label>
                                    <div 
                                        onClick={() => setUseContext(!useContext)}
                                        className={`w-8 h-4 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${useContext ? 'bg-[#22d3ee]' : 'bg-[#333]'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${useContext ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                {useContext && (
                                    <div className="text-[9px] font-mono text-gray-500 mt-1">
                                        Injecting <span className="text-[#22d3ee]">{activeArtifactCount}</span> artifacts from Neural Vault.
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="flex justify-between text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-2">
                                    <span>Task Directive</span>
                                </label>
                                <textarea
                                    value={codeStudio.prompt || ''}
                                    onChange={(e) => setCodeStudioState({ prompt: e.target.value })}
                                    onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && handleGenerate()}
                                    placeholder="Describe the function, component, or algorithm to construct..."
                                    className="flex-1 w-full bg-[#0a0a0a] border border-[#333] p-3 text-gray-300 focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd]/20 focus:outline-none resize-none text-xs leading-relaxed font-mono placeholder:text-gray-700 rounded-sm"
                                />
                                <div className="text-[9px] text-gray-600 font-mono text-right mt-1">CMD+ENTER to RUN</div>
                            </div>

                            {codeStudio.error && (
                                <div className="p-3 bg-red-900/10 border border-red-900/30 text-red-400 text-[10px] font-mono flex items-start rounded">
                                    <AlertCircle className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />
                                    {codeStudio.error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={codeStudio.isLoading}
                                className={`w-full py-4 flex items-center justify-center font-bold text-[10px] tracking-[0.2em] uppercase font-mono transition-all rounded-sm border
                                ${codeStudio.isLoading
                                    ? 'bg-[#111] border-[#1f1f1f] text-gray-700 cursor-not-allowed' 
                                    : 'bg-[#9d4edd] border-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_20px_rgba(157,78,221,0.3)]'}`}
                            >
                                {codeStudio.isLoading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                    COMPILING
                                </>
                                ) : (
                                <>
                                    <Code className="w-3.5 h-3.5 mr-2" />
                                    GENERATE CODE
                                </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Main View: Editor + Terminal Split */}
                    <div className="lg:col-span-9 bg-[#0e0e0e] flex flex-col relative overflow-hidden">
                        <div className="h-10 bg-[#151515] border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                </div>
                                <span className="ml-2 text-[10px] font-mono text-gray-500 border-r border-[#333] pr-3 mr-1">
                                    {codeStudio.generatedCode ? `script.${codeStudio.language === 'markdown' ? 'md' : codeStudio.language === 'python' ? 'py' : 'ts'}` : 'untitled'}
                                </span>
                                {codeStudio.generatedCode && codeStudio.language !== 'markdown' && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={executeSimulationLoop} disabled={codeStudio.isExecuting} className="flex items-center gap-1 text-[10px] font-mono text-[#42be65] hover:text-white transition-colors disabled:opacity-50">
                                            {codeStudio.isExecuting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3"/>}
                                            {codeStudio.isExecuting ? 'RUNNING...' : 'RUN'}
                                        </button>
                                        <div onClick={() => setAutoHealEnabled(!autoHealEnabled)} className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer border text-[9px] font-mono transition-all ${autoHealEnabled ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd]' : 'bg-[#111] border border-[#333] text-gray-500'}`} title="Automatically attempt to fix runtime errors">
                                            <Repeat className="w-3 h-3" /> AUTO-HEAL: {autoHealEnabled ? 'ON' : 'OFF'}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowMinimap(!showMinimap)} className={`text-gray-500 hover:text-white transition-colors ${showMinimap ? 'text-[#9d4edd]' : ''}`} title="Toggle Minimap"><MapIcon className="w-4 h-4" /></button>
                                <div className="w-px h-3 bg-[#333]"></div>
                                <button 
                                    onClick={handleFormat} 
                                    disabled={!codeStudio.generatedCode || isFormatting || codeStudio.language === 'markdown'} 
                                    className={`flex items-center px-3 py-1 text-[9px] font-mono border rounded transition-all shadow-lg ${isFormatting ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd] animate-pulse' : 'bg-white/5 border-white/10 text-gray-300 hover:border-[#9d4edd] hover:text-white'}`}
                                    title="Auto Format Code (CMD+SHIFT+F)"
                                >
                                    {isFormatting ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Layout className="w-3 h-3 mr-1.5" />} {isFormatting ? 'FORMATTING...' : 'BEAUTIFY'}
                                </button>
                                <div className="w-px h-3 bg-[#333]"></div>
                                <button onClick={() => setShowTerminal(!showTerminal)} className={`text-gray-500 hover:text-white transition-colors ${showTerminal ? 'text-[#9d4edd]' : ''}`}>
                                    {showTerminal ? <PanelBottomOpen className="w-4 h-4" /> : <PanelBottomClose className="w-4 h-4" />}
                                </button>
                                <div className="w-px h-3 bg-[#333]"></div>
                                <button onClick={handleCopy} disabled={!codeStudio.generatedCode} className="flex items-center px-2 py-1 text-[9px] font-mono text-gray-400 hover:text-white transition-colors">
                                    {isCopied ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />} {isCopied ? 'COPIED' : 'COPY'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 relative">
                            <div className={`relative bg-[#080808] transition-all duration-300 flex overflow-hidden ${showTerminal ? 'h-2/3 border-b border-[#1f1f1f]' : 'h-full'}`}>
                                <div ref={outputRef} className="flex-1 overflow-auto custom-scrollbar relative">
                                    <div className="absolute top-0 bottom-0 left-0 w-10 bg-[#0a0a0a] border-r border-[#1f1f1f] text-gray-700 text-[10px] font-mono pt-4 text-right pr-2 select-none z-10 min-h-full">
                                        {Array.from({length: codeStudio.generatedCode ? codeStudio.generatedCode.split('\n').length + 20 : 50}).map((_, i) => {
                                            const error = syntaxErrors.find(e => e.line === i + 1);
                                            return (
                                                <div key={i} className={`leading-6 relative group ${error ? 'text-red-500 font-bold' : ''}`}>
                                                    {i+1}
                                                    {error && <div className="absolute left-full top-0 ml-2 z-50 hidden group-hover:block bg-red-900 border border-red-500 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl">{error.message}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <AnimatePresence>
                                        {showFormatFlash && (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 0.15 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-[#9d4edd] pointer-events-none z-20"
                                            />
                                        )}
                                    </AnimatePresence>

                                    <div className="pl-12 pt-4 pr-4 pb-20 min-h-full">
                                        {codeStudio.generatedCode ? (
                                            <pre className="font-mono text-xs text-gray-300 leading-6 whitespace-pre-wrap selection:bg-[#9d4edd]/20">
                                                <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.generatedCode, codeStudio.language) }} />
                                            </pre>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full pt-20 opacity-30 pointer-events-none">
                                                <Code className="w-20 h-20 text-gray-600 mb-4" />
                                                <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">Environment Idle</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {showMinimap && codeStudio.generatedCode && <CodeMinimap code={codeStudio.generatedCode} scrollRef={outputRef} />}
                            </div>

                            {codeStudio.suggestions && codeStudio.suggestions.length > 0 && (
                                <div className="bg-[#111] border-t border-[#1f1f1f] px-4 py-2 flex items-center gap-3 overflow-x-auto whitespace-nowrap shrink-0">
                                    <div className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider flex items-center gap-1"><Lightbulb className="w-3 h-3" /> AI Insights</div>
                                    {codeStudio.suggestions.map((s: string, i: number) => (
                                        <button key={i} onClick={() => applySuggestion(s)} disabled={isApplyingSuggestion} className="px-3 py-1 bg-[#1f1f1f] hover:bg-[#222] border border-[#333] hover:border-[#9d4edd] rounded-full text-[10px] text-gray-300 transition-colors flex items-center gap-2">
                                            {isApplyingSuggestion ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 text-[#9d4edd]" />} {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div ref={terminalRef} className={`bg-[#050505] transition-all duration-300 flex flex-col ${showTerminal ? 'h-1/3' : 'h-0 overflow-hidden'}`}>
                                <div className="h-8 bg-[#111] border-b border-[#1f1f1f] flex items-center px-3 justify-between select-none sticky top-0 shrink-0">
                                    <span className="text-[10px] font-mono uppercase text-gray-500 flex items-center gap-2"><Terminal className="w-3 h-3" /> Neural Runtime Output</span>
                                    <div className="flex items-center gap-2">
                                        {retryCount > 0 && <span className="text-[9px] font-mono text-[#9d4edd] bg-[#9d4edd]/10 px-2 py-0.5 rounded">RETRIES: {retryCount}/{MAX_RETRIES}</span>}
                                        {hasRuntimeError && !autoHealEnabled && <button onClick={handleAutoHeal} disabled={isHealing} className="flex items-center gap-1 text-[9px] font-mono bg-red-900/20 text-red-400 hover:bg-red-900/40 px-2 py-0.5 rounded border border-red-900/50 transition-colors">{isHealing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Stethoscope className="w-3 h-3"/>} MANUAL FIX</button>}
                                        {codeStudio.isExecuting && <span className="text-[9px] font-mono text-[#9d4edd] animate-pulse">Running Neural Simulation...</span>}
                                    </div>
                                </div>
                                <div className="flex-1 p-3 font-mono text-xs overflow-y-auto custom-scrollbar text-gray-400">
                                    <div className="flex gap-2 mb-2"><span className="text-[#42be65]">$</span><span>node script.{codeStudio.language === 'python' ? 'py' : 'js'}</span></div>
                                    <AnimatePresence>
                                        {bootLog.map((log, i) => (
                                            <motion.div key={`boot-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-1">
                                                <span className={log.includes('[OK]') || log.includes('[SUCCESS]') ? 'text-[#42be65]' : log.includes('[INIT]') || log.includes('[PATCH]') ? 'text-blue-400' : log.includes('[FAIL]') || log.includes('[FATAL]') ? 'text-red-500' : log.includes('[LOOP]') ? 'text-[#9d4edd]' : 'text-gray-500'}>
                                                    {log.includes(']') ? log.split(']')[0] + ']' : '>'}
                                                </span>
                                                <span className="text-gray-400 ml-2">{log.includes(']') ? log.split(']')[1] : log}</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {activeOutput && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 border-t border-[#222] pt-2">{parseTerminalOutput(activeOutput)}<div className="mt-4 text-gray-600">Process exited with code {activeOutput.includes('CRITICAL') || activeOutput.includes('ERROR') ? '1' : '0'}</div></motion.div>}
                                </div>
                            </div>
                        </div>

                        <div className="h-6 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-between px-3 text-[9px] font-mono text-gray-500 select-none shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${codeStudio.isLoading ? 'bg-[#9d4edd] animate-pulse' : 'bg-gray-600'}`}></div>{codeStudio.isLoading ? 'COMPILING...' : 'READY'}</span>
                                <span>UTF-8</span>
                                <span className="border-l border-[#333] pl-3 flex items-center gap-2">
                                    {isValidating ? <Loader2 className="w-3 h-3 animate-spin text-gray-500" /> : syntaxErrors.length > 0 ? <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{syntaxErrors.length} Errors</span> : <span className="text-[#42be65] flex items-center gap-1"><Check className="w-3 h-3" />Syntax OK</span>}
                                </span>
                            </div>
                            <div className="flex gap-4"><span>{codeStudio.model}</span><span>{codeStudio.language}</span><span>Ln {codeStudio.generatedCode ? codeStudio.generatedCode.split('\n').length : 0}</span></div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CodeStudio;
