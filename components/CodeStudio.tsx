
import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, simulateCodeExecution } from '../services/geminiService';
import { Code, Terminal, Play, Loader2, Copy, Check, Save, RotateCcw, AlertCircle, Maximize2, Minimize2, PanelBottomClose, PanelBottomOpen, ChevronRight } from 'lucide-react';

const CodeStudio: React.FC = () => {
  const { codeStudio, setCodeStudioState } = useAppStore();
  const [isCopied, setIsCopied] = React.useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Layout State
  const [showTerminal, setShowTerminal] = useState(true);
  
  // Terminal Boot Sequence State
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [activeOutput, setActiveOutput] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!codeStudio.prompt.trim()) return;

    setCodeStudioState({ isLoading: true, error: null });
    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await promptSelectKey();
        setCodeStudioState({ isLoading: false });
        return;
      }

      const generated = await generateCode(codeStudio.prompt, codeStudio.language);
      
      setCodeStudioState(prev => ({
        generatedCode: generated,
        isLoading: false,
        history: [...prev.history, { prompt: prev.prompt, code: generated, timestamp: Date.now() }]
      }));
    } catch (err: any) {
      setCodeStudioState({ error: err.message, isLoading: false });
    }
  };

  const handleRunSimulation = async () => {
      if (!codeStudio.generatedCode) return;
      
      setCodeStudioState({ isExecuting: true, executionOutput: null });
      setShowTerminal(true);
      setBootLog([]); // Reset boot log
      setActiveOutput(null);

      // Simulate boot latency
      const bootSteps = [
          "ALLOCATING_NEURAL_MEMORY...",
          "MOUNTING_VIRTUAL_VOLUMES...",
          "COMPILING_SOURCE_TARGET...",
          "LINKING_DEPENDENCIES...",
          "STARTING_RUNTIME_ENV..."
      ];
      
      for (let i = 0; i < bootSteps.length; i++) {
          await new Promise(r => setTimeout(r, 300));
          setBootLog(prev => [...prev, bootSteps[i]]);
      }
      
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();
          
          const output = await simulateCodeExecution(codeStudio.generatedCode, codeStudio.language);
          setCodeStudioState({ executionOutput: output, isExecuting: false });
          setActiveOutput(output);
      } catch (err: any) {
          const errorMsg = `CRITICAL EXECUTION FAILURE:\n${err.message}`;
          setCodeStudioState({ executionOutput: errorMsg, isExecuting: false });
          setActiveOutput(errorMsg);
      }
  };

  const handleCopy = () => {
    if (codeStudio.generatedCode) {
      navigator.clipboard.writeText(codeStudio.generatedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Scroll to bottom of output on new generation
  useEffect(() => {
    if (codeStudio.generatedCode && outputRef.current) {
        outputRef.current.scrollTop = 0;
    }
  }, [codeStudio.generatedCode]);
  
  // Auto-scroll terminal
  useEffect(() => {
      if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
  }, [bootLog, activeOutput]);

  // Syntax highlighting helper (Simple regex)
  const highlightCode = (code: string) => {
      return code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\b(const|let|var|function|class|import|from|return|if|else|for|while|async|await)\b/g, '<span class="text-[#f1c21b]">$1</span>')
        .replace(/\b(string|number|boolean|any|void|Promise)\b/g, '<span class="text-[#22d3ee]">$1</span>')
        .replace(/\/\/.*/g, '<span class="text-gray-500 italic">$&</span>')
        .replace(/".*?"/g, '<span class="text-[#42be65]">$&</span>')
        .replace(/'.*?'/g, '<span class="text-[#42be65]">$&</span>')
        .replace(/`.*?`/g, '<span class="text-[#42be65]">$&</span>');
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full rounded-xl border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans">
      
      {/* Sidebar: Controls */}
      <div className="lg:col-span-3 bg-[#050505] border-r border-[#1f1f1f] flex flex-col z-20">
         <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
               <Terminal className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Dev Matrix
            </h2>
         </div>

         <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto custom-scrollbar">
            
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
          <div className="h-10 bg-[#151515] border-b border-[#1f1f1f] flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <span className="ml-2 text-[10px] font-mono text-gray-500 border-r border-[#333] pr-3 mr-1">
                      {codeStudio.generatedCode ? 'script.ts' : 'untitled'}
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
              <div ref={outputRef} className={`overflow-auto custom-scrollbar relative bg-[#080808] transition-all duration-300 ${showTerminal ? 'h-2/3 border-b border-[#1f1f1f]' : 'h-full'}`}>
                 <div className="absolute top-0 bottom-0 left-0 w-10 bg-[#0a0a0a] border-r border-[#1f1f1f] text-gray-700 text-[10px] font-mono pt-4 text-right pr-2 select-none z-10">
                     {Array.from({length: codeStudio.generatedCode ? codeStudio.generatedCode.split('\n').length + 20 : 50}).map((_, i) => (
                         <div key={i} className="leading-6">{i+1}</div>
                     ))}
                 </div>

                 <div className="pl-12 pt-4 pr-4 pb-20 min-h-full">
                     {codeStudio.generatedCode ? (
                         <pre className="font-mono text-xs text-gray-300 leading-6 whitespace-pre-wrap">
                             <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.generatedCode) }} />
                         </pre>
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full pt-20 opacity-30 pointer-events-none">
                             <Code className="w-20 h-20 text-gray-600 mb-4" />
                             <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">Environment Idle</p>
                         </div>
                     )}
                 </div>
              </div>

              {/* Terminal Area (Runtime Simulation) */}
              <div ref={terminalRef} className={`bg-[#050505] transition-all duration-300 flex flex-col ${showTerminal ? 'h-1/3' : 'h-0 overflow-hidden'}`}>
                  <div className="h-8 bg-[#111] border-b border-[#1f1f1f] flex items-center px-3 justify-between select-none sticky top-0">
                      <span className="text-[10px] font-mono uppercase text-gray-500 flex items-center gap-2">
                          <Terminal className="w-3 h-3" />
                          Neural Runtime Output
                      </span>
                      {codeStudio.isExecuting && (
                          <span className="text-[9px] font-mono text-[#9d4edd] animate-pulse">Running Neural Simulation...</span>
                      )}
                  </div>
                  <div className="flex-1 p-3 font-mono text-xs overflow-y-auto custom-scrollbar text-gray-400">
                      <div className="flex gap-2 mb-2">
                          <span className="text-[#42be65]">$</span>
                          <span>node script.js</span>
                      </div>
                      
                      {bootLog.map((log, i) => (
                          <div key={i} className="text-gray-600 mb-1 animate-in fade-in slide-in-from-left-2 duration-300">
                              {`> [BOOT_${i.toString().padStart(2,'0')}] ${log}`}
                          </div>
                      ))}

                      {codeStudio.isExecuting && (
                          <div className="mt-2 text-gray-500 animate-pulse">
                              _
                          </div>
                      )}

                      {activeOutput && (
                           <div className="mt-4 border-t border-[#222] pt-2 animate-in fade-in slide-in-from-left-1 duration-500">
                               {parseTerminalOutput(activeOutput)}
                               <div className="mt-4 text-gray-600">
                                   Process exited with code {activeOutput.includes('CRITICAL') ? '1' : '0'}
                               </div>
                           </div>
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
          <div className="h-6 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-between px-3 text-[9px] font-mono text-gray-500 select-none">
              <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${codeStudio.isLoading ? 'bg-[#9d4edd] animate-pulse' : 'bg-gray-600'}`}></div>
                      {codeStudio.isLoading ? 'COMPILING...' : 'READY'}
                  </span>
                  <span>UTF-8</span>
              </div>
              <div>
                  {codeStudio.language}
              </div>
          </div>

      </div>
    </div>
  );
};

export default CodeStudio;
