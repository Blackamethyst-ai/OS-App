
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, simulateCodeExecution, formatCode, fixCode } from '../services/geminiService';
import { audio } from '../services/audioService'; // Added Audio
import { Code, Terminal, Play, Loader2, Copy, Check, Save, RotateCcw, AlertCircle, Maximize2, Minimize2, PanelBottomClose, PanelBottomOpen, ChevronRight, Wand2, Cpu, Map as MapIcon, HardDrive, ShieldCheck, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Syntax Highlighting Engine ---
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
    typescript: { // Default fallback
        keywords: "\\b(const|let|var|function|class|import|from|return|if|else|for|while|async|await|export|default|interface|type|implements|extends|public|private|protected|new|try|catch|finally|switch|case|break|throw|typeof|instanceof|void|this)\\b",
        types: "\\b(string|number|boolean|any|Promise|Array|Object|null|undefined|true|false)\\b",
        comment: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        string: /(".*?"|'.*?'|`[\s\S]*?`)/g
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

// --- Minimap Component ---
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
  const { codeStudio, setCodeStudioState } = useAppStore();
  const [isCopied, setIsCopied] = React.useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Layout State
  const [showTerminal, setShowTerminal] = useState(true);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  
  // Terminal Boot Sequence State
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [activeOutput, setActiveOutput] = useState<string | null>(null);

  // Persistence Hook
  useEffect(() => {
      const saved = localStorage.getItem('codestudio_state');
      if (saved) {
          try {
              const { prompt, language, model, generatedCode } = JSON.parse(saved);
              setCodeStudioState({ prompt, language, model, generatedCode });
          } catch(e) { console.error("Failed to restore session"); }
      }
  }, []);

  // Save State on Change
  useEffect(() => {
      const stateToSave = {
          prompt: codeStudio.prompt,
          language: codeStudio.language,
          model: codeStudio.model,
          generatedCode: codeStudio.generatedCode
      };
      localStorage.setItem('codestudio_state', JSON.stringify(stateToSave));
  }, [codeStudio.prompt, codeStudio.language, codeStudio.model, codeStudio.generatedCode]);

  const handleGenerate = async () => {
    if (!codeStudio.prompt.trim()) return;
    audio.playClick();

    setCodeStudioState({ isLoading: true, error: null });
    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await promptSelectKey();
        setCodeStudioState({ isLoading: false });
        return;
      }

      const generated = await generateCode(codeStudio.prompt, codeStudio.language, codeStudio.model);
      audio.playSuccess();
      
      setCodeStudioState(prev => ({
        generatedCode: generated,
        isLoading: false,
        history: [...prev.history, { prompt: prev.prompt, code: generated, timestamp: Date.now() }]
      }));
    } catch (err: any) {
      audio.playError();
      setCodeStudioState({ error: err.message, isLoading: false });
    }
  };

  const handleRunSimulation = async () => {
      if (!codeStudio.generatedCode) return;
      audio.playClick();
      
      setCodeStudioState({ isExecuting: true, executionOutput: null });
      setShowTerminal(true);
      setBootLog([]); 
      setActiveOutput(null);

      const bootSteps = [
          "[INIT]  Allocating Neural Memory...",
          "[MOUNT] Virtual Volumes Mounted",
          "[LOAD]  Injecting Runtime Dependencies...",
          "[COMP]  Compiling Source Target...",
          "[LINK]  Establishing Neural Link...",
          "[OK]    Runtime Environment Ready."
      ];
      
      for (let i = 0; i < bootSteps.length; i++) {
          await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
          setBootLog(prev => [...prev, bootSteps[i]]);
          if (i % 2 === 0) audio.playHover(); // Sound effect on steps
      }
      
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();
          
          const output = await simulateCodeExecution(codeStudio.generatedCode, codeStudio.language);
          audio.playSuccess();
          setCodeStudioState({ executionOutput: output, isExecuting: false });
          setActiveOutput(output);
      } catch (err: any) {
          audio.playError();
          const errorMsg = `CRITICAL EXECUTION FAILURE:\n${err.message}`;
          setCodeStudioState({ executionOutput: errorMsg, isExecuting: false });
          setActiveOutput(errorMsg);
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
          setActiveOutput(null); // Clear error state
      } catch (err: any) {
          audio.playError();
          setCodeStudioState({ error: "Healing failed: " + err.message });
      } finally {
          setIsHealing(false);
      }
  };

  const handleFormat = async () => {
      if (!codeStudio.generatedCode) return;
      setIsFormatting(true);
      audio.playClick();
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();

          const formatted = await formatCode(codeStudio.generatedCode, codeStudio.language);
          setCodeStudioState({ generatedCode: formatted });
      } catch (err: any) {
          console.error("Format Failed:", err);
          audio.playError();
      } finally {
          setIsFormatting(false);
      }
  };

  const handleCopy = () => {
    if (codeStudio.generatedCode) {
      navigator.clipboard.writeText(codeStudio.generatedCode);
      setIsCopied(true);
      audio.playClick();
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (codeStudio.generatedCode && outputRef.current) {
        outputRef.current.scrollTop = 0;
    }
  }, [codeStudio.generatedCode]);
  
  useEffect(() => {
      if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
  }, [bootLog, activeOutput]);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full rounded-xl border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans">
      
      {/* Sidebar: Controls */}
      <div className="lg:col-span-3 bg-[#050505] border-r border-[#1f1f1f] flex flex-col z-20">
         <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
               <Terminal className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Dev Matrix
            </h2>
            <div className="text-[8px] text-gray-600 font-mono flex items-center gap-1" title="Session Saved">
                <HardDrive className="w-2.5 h-2.5" />
                SAVED
            </div>
         </div>

         <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto custom-scrollbar">
            
            {/* Model Selector */}
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
                    <div className="absolute right-3 top-3 pointer-events-none">
                        <Cpu className="w-3 h-3 text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider block">Target Runtime</label>
                <div className="relative group">
                    <select
                        value={codeStudio.language}
                        onChange={(e) => setCodeStudioState({ language: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none appearance-none cursor-pointer hover:bg-[#111] transition-colors rounded-sm"
                    >
                        {['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'HTML/CSS', 'SQL', 'Bash'].map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none">
                        <div className="w-1.5 h-1.5 border-b border-r border-gray-500 rotate-45"></div>
                    </div>
                </div>
            </div>

            {/* Prompt Input */}
            <div className="flex-1 flex flex-col min-h-0">
                <label className="flex justify-between text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-2">
                    <span>Task Directive</span>
                </label>
                <textarea
                    value={codeStudio.prompt}
                    onChange={(e) => setCodeStudioState({ prompt: e.target.value })}
                    onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && handleGenerate()}
                    placeholder="Describe the function, component, or algorithm to construct..."
                    className="flex-1 w-full bg-[#0a0a0a] border border-[#333] p-3 text-gray-300 focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd]/20 focus:outline-none resize-none text-xs leading-relaxed font-mono placeholder:text-gray-700 rounded-sm"
                />
                <div className="text-[9px] text-gray-600 font-mono text-right mt-1">CMD+ENTER to RUN</div>
            </div>

            {/* History Snippets (Last 3) */}
            {codeStudio.history.length > 0 && (
                <div className="border-t border-[#1f1f1f] pt-4">
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Recent Compilations</label>
                    <div className="space-y-2">
                        {codeStudio.history.slice(-3).reverse().map((item, i) => (
                            <div 
                                key={i} 
                                onClick={() => setCodeStudioState({ prompt: item.prompt, generatedCode: item.code })}
                                className="p-2 bg-[#111] border border-[#222] rounded hover:border-[#9d4edd] cursor-pointer transition-colors"
                            >
                                <div className="text-[10px] text-gray-400 font-mono truncate">{item.prompt}</div>
                                <div className="text-[9px] text-gray-600 font-mono mt-1 text-right">{new Date(item.timestamp).toLocaleTimeString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {codeStudio.error && (
                <div className="p-3 bg-red-900/10 border border-red-900/30 text-red-400 text-[10px] font-mono flex items-start rounded">
                    <AlertCircle className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />
                    {codeStudio.error}
                </div>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={codeStudio.isLoading || !codeStudio.prompt.trim()}
                className={`w-full py-4 flex items-center justify-center font-bold text-[10px] tracking-[0.2em] uppercase font-mono transition-all rounded-sm border
                  ${codeStudio.isLoading || !codeStudio.prompt.trim()
                    ? 'bg-[#111] border-[#1f1f1f] text-gray-700 cursor-not-allowed' 
                    : 'bg-[#9d4edd] border-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.5)]'}`}
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
          
          {/* Editor Header */}
          <div className="h-10 bg-[#151515] border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <span className="ml-2 text-[10px] font-mono text-gray-500 border-r border-[#333] pr-3 mr-1">
                      {codeStudio.generatedCode ? `script.${codeStudio.language === 'python' ? 'py' : 'ts'}` : 'untitled'}
                  </span>
                  {codeStudio.generatedCode && (
                       <button 
                         onClick={handleRunSimulation}
                         disabled={codeStudio.isExecuting}
                         className="flex items-center gap-1 text-[10px] font-mono text-[#42be65] hover:text-white transition-colors disabled:opacity-50"
                       >
                           {codeStudio.isExecuting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3"/>}
                           RUN SIMULATION
                       </button>
                  )}
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setShowMinimap(!showMinimap)} className={`text-gray-500 hover:text-white transition-colors ${showMinimap ? 'text-[#9d4edd]' : ''}`} title="Toggle Minimap">
                      <MapIcon className="w-4 h-4" />
                  </button>
                  <div className="w-px h-3 bg-[#333]"></div>
                  <button 
                    onClick={handleFormat}
                    disabled={!codeStudio.generatedCode || isFormatting}
                    className="flex items-center px-2 py-1 text-[9px] font-mono text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Auto Format Code"
                  >
                      {isFormatting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                      FORMAT
                  </button>
                  <div className="w-px h-3 bg-[#333]"></div>
                  <button onClick={() => setShowTerminal(!showTerminal)} className={`text-gray-500 hover:text-white transition-colors ${showTerminal ? 'text-[#9d4edd]' : ''}`}>
                      {showTerminal ? <PanelBottomOpen className="w-4 h-4" /> : <PanelBottomClose className="w-4 h-4" />}
                  </button>
                  <div className="w-px h-3 bg-[#333]"></div>
                  <button 
                    onClick={handleCopy}
                    disabled={!codeStudio.generatedCode}
                    className="flex items-center px-2 py-1 text-[9px] font-mono text-gray-400 hover:text-white transition-colors"
                  >
                      {isCopied ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                      {isCopied ? 'COPIED' : 'COPY'}
                  </button>
              </div>
          </div>

          {/* Split Container */}
          <div className="flex-1 flex flex-col min-h-0 relative">
              
              {/* Code Editor Area */}
              <div className={`relative bg-[#080808] transition-all duration-300 flex overflow-hidden ${showTerminal ? 'h-2/3 border-b border-[#1f1f1f]' : 'h-full'}`}>
                 {/* Main Code Scroll */}
                 <div ref={outputRef} className="flex-1 overflow-auto custom-scrollbar relative">
                     <div className="absolute top-0 bottom-0 left-0 w-10 bg-[#0a0a0a] border-r border-[#1f1f1f] text-gray-700 text-[10px] font-mono pt-4 text-right pr-2 select-none z-10 min-h-full">
                         {Array.from({length: codeStudio.generatedCode ? codeStudio.generatedCode.split('\n').length + 20 : 50}).map((_, i) => (
                             <div key={i} className="leading-6">{i+1}</div>
                         ))}
                     </div>

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

                 {/* Minimap Sidebar */}
                 {showMinimap && codeStudio.generatedCode && (
                     <CodeMinimap code={codeStudio.generatedCode} scrollRef={outputRef} />
                 )}
              </div>

              {/* Terminal Area (Runtime Simulation) */}
              <div ref={terminalRef} className={`bg-[#050505] transition-all duration-300 flex flex-col ${showTerminal ? 'h-1/3' : 'h-0 overflow-hidden'}`}>
                  <div className="h-8 bg-[#111] border-b border-[#1f1f1f] flex items-center px-3 justify-between select-none sticky top-0 shrink-0">
                      <span className="text-[10px] font-mono uppercase text-gray-500 flex items-center gap-2">
                          <Terminal className="w-3 h-3" />
                          Neural Runtime Output
                      </span>
                      <div className="flex items-center gap-2">
                          {hasRuntimeError && (
                              <button 
                                onClick={handleAutoHeal}
                                disabled={isHealing}
                                className="flex items-center gap-1 text-[9px] font-mono bg-red-900/20 text-red-400 hover:bg-red-900/40 px-2 py-0.5 rounded border border-red-900/50 transition-colors"
                              >
                                  {isHealing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Stethoscope className="w-3 h-3"/>}
                                  AUTO-HEAL
                              </button>
                          )}
                          {codeStudio.isExecuting && (
                              <span className="text-[9px] font-mono text-[#9d4edd] animate-pulse">Running Neural Simulation...</span>
                          )}
                      </div>
                  </div>
                  <div className="flex-1 p-3 font-mono text-xs overflow-y-auto custom-scrollbar text-gray-400">
                      <div className="flex gap-2 mb-2">
                          <span className="text-[#42be65]">$</span>
                          <span>node script.js</span>
                      </div>
                      
                      <AnimatePresence>
                        {bootLog.map((log, i) => (
                            <motion.div 
                                key={`boot-${i}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mb-1"
                            >
                                <span className={log.includes('[OK]') ? 'text-[#42be65]' : log.includes('[INIT]') ? 'text-blue-400' : 'text-gray-500'}>
                                    {log.split(']')[0]}]
                                </span>
                                <span className="text-gray-400 ml-2">
                                    {log.split(']')[1]}
                                </span>
                            </motion.div>
                        ))}
                      </AnimatePresence>

                      {codeStudio.isExecuting && (
                          <div className="mt-2 text-gray-500 animate-pulse">
                              _
                          </div>
                      )}

                      {activeOutput && (
                           <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 border-t border-[#222] pt-2"
                           >
                               {parseTerminalOutput(activeOutput)}
                               <div className="mt-4 text-gray-600">
                                   Process exited with code {activeOutput.includes('CRITICAL') ? '1' : '0'}
                               </div>
                           </motion.div>
                      )}
                      
                      {!codeStudio.isExecuting && !activeOutput && bootLog.length === 0 && (
                          <div className="mt-2 text-gray-600 italic">
                              // Click 'RUN SIMULATION' to execute code logic...
                          </div>
                      )}
                  </div>
              </div>

          </div>

          {/* Status Bar */}
          <div className="h-6 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-between px-3 text-[9px] font-mono text-gray-500 select-none shrink-0">
              <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${codeStudio.isLoading ? 'bg-[#9d4edd] animate-pulse' : 'bg-gray-600'}`}></div>
                      {codeStudio.isLoading ? 'COMPILING...' : 'READY'}
                  </span>
                  <span>UTF-8</span>
              </div>
              <div className="flex gap-4">
                  <span>{codeStudio.model}</span>
                  <span>{codeStudio.language}</span>
                  <span>Ln {codeStudio.generatedCode ? codeStudio.generatedCode.split('\n').length : 0}</span>
              </div>
          </div>

      </div>
    </div>
  );
};

export default CodeStudio;
