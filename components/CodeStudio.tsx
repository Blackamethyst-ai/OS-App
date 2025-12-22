import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, validateSyntax, evolveSystemArchitecture } from '../services/geminiService';
import { audio } from '../services/audioService'; 
import { useFlywheel } from '../hooks/useFlywheel';
import { 
    Code, Copy, Check, Loader2, Sparkles, FileText, AlertTriangle, 
    Activity, CheckCircle, Target, Layers, Cpu, Terminal, GitMerge, 
    BrainCircuit, X, HelpCircle, ArrowUpRight, Zap, Info, Binary, 
    TrendingUp, History, ShieldCheck, Database, RefreshCw, Eye, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MermaidDiagram from './MermaidDiagram';
import { useAgentRuntime } from '../hooks/useAgentRuntime';

const highlightCode = (code: string, lang: string) => {
    // Escape standard HTML characters first to prevent XSS and tag mangling
    let escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // We use style="color: ..." instead of class="..." to avoid matching the 'class' keyword inside our own highlighter tags
    return escaped
        .replace(/\b(const|let|var|function|class|import|from|return|if|else|for|while|async|await|export|default|interface|type|public|private|protected|new|try|catch|finally|switch|case|break|throw)\b/g, '<span style="color: #f1c21b">$1</span>')
        .replace(/\b(string|number|boolean|any|Promise|Array|Object|null|undefined|true|false)\b/g, '<span style="color: #22d3ee">$1</span>')
        .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span style="color: #6b7280; font-style: italic">$1</span>')
        .replace(/(".*?"|'.*?'|`[\s\S]*?`)/g, '<span style="color: #42be65">$1</span>');
};

const CodeStudio: React.FC = () => {
  const { codeStudio, setCodeStudioState, process: processData, addLog } = useAppStore();
  const { track } = useFlywheel('BUILDER PROTOCOL');
  const { state: agentState } = useAgentRuntime();
  const [activeTab, setActiveTab] = useState<'IDE' | 'EVOLUTION' | 'LATTICE' | 'ORCHESTRATION' | 'DETECTIVE'>('IDE');
  const [isCopied, setIsCopied] = React.useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
      const code = codeStudio.generatedCode;
      if (!code || codeStudio.language === 'markdown') { setSyntaxErrors([]); return; }
      const timer = setTimeout(async () => {
          setIsValidating(true);
          const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
          if (hasKey) {
              const errors = await validateSyntax(code, codeStudio.language);
              setSyntaxErrors(errors);
              if (errors.length > 0) audio.playError();
          }
          setIsValidating(false);
      }, 2000);
      return () => clearTimeout(timer);
  }, [codeStudio.generatedCode, codeStudio.language]);

  const handleGenerate = async () => {
    if (!codeStudio.prompt?.trim()) return;
    audio.playClick();
    setCodeStudioState({ isLoading: true, error: null }); 
    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) { await promptSelectKey(); setCodeStudioState({ isLoading: false }); return; }
      const generated = await generateCode(codeStudio.prompt, codeStudio.language, codeStudio.model);
      setCodeStudioState({ generatedCode: generated, isLoading: false, lastEditTimestamp: Date.now() });
      audio.playSuccess();
      track('Code Gen').success();
    } catch (err: any) {
      setCodeStudioState({ error: err.message, isLoading: false });
      audio.playError();
      track('Code Gen').fail();
    }
  };

  const applyPatch = () => {
      if (!codeStudio.activePatch) return;
      setCodeStudioState({ 
          generatedCode: codeStudio.activePatch.code,
          activePatch: null,
          lastEditTimestamp: Date.now()
      });
      addLog('SUCCESS', 'NEURAL_HEALER: Logic patch integrated successfully.');
      audio.playSuccess();
  };

  const applyEvolution = () => {
      if (!codeStudio.activeEvolution) return;
      setCodeStudioState({
          generatedCode: codeStudio.activeEvolution.code,
          activeEvolution: null,
          lastEditTimestamp: Date.now()
      });
      addLog('SUCCESS', 'AUTOPOIETIC: Architectural evolution integrated into core logic.');
      audio.playSuccess();
      setActiveTab('IDE');
  };

  const handleCopy = () => {
    if (codeStudio.generatedCode) {
      navigator.clipboard.writeText(codeStudio.generatedCode);
      setIsCopied(true);
      audio.playClick();
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-3xl border bg-[#030303] shadow-2xl overflow-hidden font-sans relative transition-all duration-700 ${syntaxErrors.length > 0 ? 'border-red-500 ring-2 ring-red-500/20' : 'border-[#1f1f1f]'}`}>
      
      {/* Evolution HUD Overlay */}
      <div className="absolute top-20 left-6 z-40 flex flex-col gap-4 pointer-events-none">
          <AnimatePresence>
              {codeStudio.isEvolving && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-3 bg-[#0a0a0a]/90 backdrop-blur border border-cyan-500/30 rounded-xl shadow-2xl flex flex-col gap-2 w-48">
                      <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><RefreshCw size={10} className="animate-spin" /> Evolving Architecture</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: ['0%', '100%'] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      {/* Patch Notification Overlay - Neon Purple Box */}
      <AnimatePresence>
        {codeStudio.activePatch && (
            <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl"
            >
                <div className="mx-6 bg-[#0a0a0a]/95 backdrop-blur-xl border-2 border-[#9d4edd] p-6 rounded-3xl shadow-[0_0_100px_rgba(157,78,221,0.3)] flex items-center justify-between gap-8">
                    <div className="flex items-start gap-5">
                        <div className="p-3 bg-[#9d4edd]/20 rounded-2xl text-[#9d4edd] animate-pulse shrink-0">
                            <Zap size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-black text-[#9d4edd] uppercase tracking-[0.4em] mb-2">Optimization Available</div>
                            <div className="text-[12px] text-white font-mono leading-relaxed">{codeStudio.activePatch.explanation}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => setCodeStudioState({ activePatch: null })} className="px-5 py-2.5 text-[10px] font-bold text-gray-500 hover:text-white uppercase transition-colors tracking-widest">Dismiss</button>
                        <button onClick={applyPatch} className="px-8 py-2.5 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-[#b06bf7] transition-all hover:scale-105 active:scale-95">Apply Patch</button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center px-6 justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Code size={18} className={syntaxErrors.length > 0 ? 'text-red-500 animate-pulse' : 'text-[#9d4edd]'} />
                <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Logic Studio</span>
              </div>
              <div className="flex bg-[#111] p-1 rounded-xl border border-white/5">
                {[
                    { id: 'IDE', icon: Terminal, label: 'Editor' },
                    { id: 'DETECTIVE', icon: Search, label: 'Detective' },
                    { id: 'EVOLUTION', icon: TrendingUp, label: 'Evolution' },
                    { id: 'LATTICE', icon: GitMerge, label: 'Lattice' },
                    { id: 'ORCHESTRATION', icon: BrainCircuit, label: 'Orch' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all relative ${activeTab === tab.id ? 'bg-[#1f1f1f] text-white shadow-inner' : 'text-gray-600 hover:text-gray-300'}`}>
                        <tab.icon size={12} /> {tab.label}
                        {tab.id === 'EVOLUTION' && codeStudio.activeEvolution && <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />}
                    </button>
                ))}
              </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-white/5 rounded-lg">
                  {codeStudio.isEvolving ? (
                      <Loader2 size={12} className="text-cyan-400 animate-spin" />
                  ) : (
                      <Binary size={12} className="text-gray-600" />
                  )}
                  <span className={`text-[8px] font-mono uppercase tracking-widest ${codeStudio.isEvolving ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`}>
                      {codeStudio.isEvolving ? 'Evolving architecture...' : 'System Stable'}
                  </span>
              </div>
              <button onClick={() => setShowHelp(!showHelp)} className={`p-2 rounded-lg transition-colors ${showHelp ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
                  <HelpCircle size={18} />
              </button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <button onClick={handleCopy} disabled={!codeStudio.generatedCode} className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-white/5 border border-[#222] rounded-xl text-[10px] font-mono text-gray-400 hover:text-white transition-all">
                  {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {isCopied ? 'COPIED' : 'COPY'}
              </button>
              <button onClick={handleGenerate} disabled={codeStudio.isLoading} className="px-6 py-2 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-[10px] uppercase rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {codeStudio.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Fabricate Logic
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
              {activeTab === 'IDE' && (
                  <div className="flex-1 overflow-auto custom-scrollbar relative" ref={outputRef}>
                      <div className="absolute top-0 bottom-0 left-0 w-12 bg-black/40 border-r border-[#1f1f1f] text-gray-700 text-[10px] font-mono pt-6 text-right pr-3 select-none z-10">
                          {codeStudio.generatedCode ? codeStudio.generatedCode.split('\n').map((_, i) => (
                              <div key={i} className={`h-6 leading-6 ${syntaxErrors.some(e => e.line === i + 1) ? 'text-red-500 font-black' : ''}`}>{i + 1}</div>
                          )) : Array.from({length: 30}).map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
                      </div>
                      <div className="pl-16 pt-6 pr-8 pb-20 min-h-full">
                          {codeStudio.isLoading ? (
                              <div className="h-full flex flex-col items-center justify-center opacity-40">
                                  <Loader2 size={40} className="text-[#9d4edd] animate-spin mb-4" />
                                  <span className="text-[10px] font-mono uppercase tracking-[0.4em] animate-pulse">Binary Stream Reification...</span>
                              </div>
                          ) : codeStudio.generatedCode ? (
                              <pre className="font-mono text-xs text-gray-300 leading-6 whitespace-pre-wrap selection:bg-[#9d4edd]/20">
                                  <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.generatedCode, codeStudio.language) }} />
                              </pre>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-40 grayscale">
                                  <FileText size={64} className="mx-auto mb-6" />
                                  <p className="text-sm font-mono uppercase tracking-[0.3em]">Codebase Standby</p>
                                  <p className="text-[10px] font-mono mt-2">Initialize Fabrication Directive (Right Panel)</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'DETECTIVE' && (
                  <div className="flex-1 flex flex-col p-10 bg-black overflow-y-auto custom-scrollbar">
                      <div className="max-w-3xl mx-auto w-full space-y-10">
                          <div className="flex items-center gap-5">
                              <div className="p-4 bg-[#22d3ee]/20 rounded-3xl border border-[#22d3ee]/40 text-[#22d3ee]">
                                  <Search size={32} />
                              </div>
                              <div>
                                  <h2 className="text-3xl font-black font-mono text-white uppercase tracking-tighter">Detective Mode</h2>
                                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em]">Advanced Semantic Framework Construction</p>
                              </div>
                          </div>
                          
                          <div className="bg-[#0a0a0a] border border-[#222] p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                              <div className="space-y-3 relative z-10">
                                  <label className="text-[10px] font-black text-[#22d3ee] uppercase tracking-widest flex items-center gap-2">
                                      <Zap size={12} /> Framework Intent
                                  </label>
                                  <textarea 
                                      value={codeStudio.prompt}
                                      onChange={e => setCodeStudioState({ prompt: e.target.value })}
                                      className="w-full bg-black border border-[#333] p-5 rounded-2xl text-sm font-mono text-white outline-none focus:border-[#22d3ee] h-40 resize-none transition-all placeholder:text-gray-800"
                                      placeholder="Describe the overall system goal. E.g., 'A PARA organized drive for robotics research' or 'A microservice-based error handling library'..."
                                  />
                              </div>
                              <div className="flex gap-4">
                                  <button onClick={() => setCodeStudioState({ prompt: 'Build a PARA organized drive for AI ethics research' })} className="flex-1 py-3 px-4 bg-[#111] border border-[#222] hover:border-[#22d3ee] rounded-xl text-[9px] font-mono text-gray-400 transition-all uppercase tracking-widest text-left">Generate PARA Structure</button>
                                  <button onClick={() => setCodeStudioState({ prompt: 'Create a microservice-based error response architecture for nodejs' })} className="flex-1 py-3 px-4 bg-[#111] border border-[#222] hover:border-[#22d3ee] rounded-xl text-[9px] font-mono text-gray-400 transition-all uppercase tracking-widest text-left">Forge Tiered Architecture</button>
                              </div>
                              <button onClick={handleGenerate} className="w-full py-5 bg-[#22d3ee] text-black rounded-2xl font-black font-mono text-xs uppercase tracking-[0.4em] shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:bg-[#67e8f9] transition-all">Execute Synthesis</button>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'EVOLUTION' && (
                  <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-black">
                      {!codeStudio.activeEvolution && !codeStudio.isEvolving ? (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-6">
                              <TrendingUp size={64} className="text-gray-600" />
                              <div className="space-y-2">
                                  <h3 className="text-sm font-black font-mono uppercase tracking-[0.4em]">Autopoietic Matrix Standby</h3>
                                  <p className="text-[10px] font-mono max-w-sm mx-auto">Architecture daemon is monitoring the buffer. Significant logic changes will trigger an evolutionary branch proposal.</p>
                              </div>
                          </div>
                      ) : codeStudio.isEvolving ? (
                          <div className="h-full flex flex-col items-center justify-center text-center gap-8">
                              <div className="relative">
                                  <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }} className="w-32 h-32 rounded-full border border-dashed border-cyan-400/50" />
                                  <Loader2 size={48} className="text-cyan-400 absolute inset-0 m-auto animate-spin" />
                              </div>
                              <h3 className="text-sm font-black font-mono uppercase tracking-[0.3em] text-cyan-400 animate-pulse">Architecting Evolution...</h3>
                          </div>
                      ) : (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8 pb-20">
                              <div className="flex items-center justify-between border-b border-[#333] pb-10">
                                  <div className="flex items-center gap-6">
                                      <div className="p-4 bg-cyan-400/10 border-2 border-cyan-400/40 rounded-3xl text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]"><GitMerge size={32} /></div>
                                      <div>
                                          <h2 className="text-3xl font-black text-white font-mono uppercase tracking-widest">PROPOSED EVOLUTION</h2>
                                          <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-widest font-black">Integrity Score: <span className="text-cyan-400">{codeStudio.activeEvolution?.integrityScore}%</span></div>
                                      </div>
                                  </div>
                                  <button onClick={applyEvolution} className="px-10 py-3.5 bg-cyan-400 text-black text-xs font-black uppercase rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:bg-cyan-300 transition-all hover:scale-105 active:scale-95 tracking-[0.2em]">MERGE EVOLUTION</button>
                              </div>
                              
                              <div className="p-8 bg-[#0a0a0a] border-2 border-cyan-900/30 rounded-3xl text-xs font-mono text-gray-300 leading-relaxed italic border-l-[10px] border-l-cyan-400 shadow-xl">
                                  "{codeStudio.activeEvolution?.reasoning}"
                              </div>

                              <div className="rounded-3xl border border-[#1f1f1f] overflow-hidden bg-black shadow-2xl max-h-[600px] flex flex-col relative">
                                  <div className="h-10 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center px-6 justify-between">
                                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Evolved Source Matrix</span>
                                      <div className="flex gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                          <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                                          <div className="w-2 h-2 rounded-full bg-green-500/20" />
                                      </div>
                                  </div>
                                  <div className="overflow-y-auto custom-scrollbar flex-1">
                                      <pre className="p-8 text-[11px] font-mono text-gray-400 selection:bg-cyan-400/20 leading-relaxed">
                                          <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.activeEvolution?.code || '', codeStudio.language) }} />
                                      </pre>
                                  </div>
                                  <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                              </div>
                          </motion.div>
                      )}
                  </div>
              )}

              {activeTab === 'LATTICE' && (
                  <div className="flex-1 p-6"><div className="h-full rounded-2xl border border-white/5 overflow-hidden shadow-inner bg-black"><MermaidDiagram code={processData.generatedCode || 'graph TD\n    A[IDE] --> B[Lattice]\n    B --> C[Orchestration]'} /></div></div>
              )}

              {activeTab === 'ORCHESTRATION' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-[#050505] p-6">
                      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-4 bg-black/40 border border-white/5 rounded-2xl p-6">
                          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                              <BrainCircuit size={16} className="text-[#22d3ee] animate-pulse" />
                              <span className="text-white uppercase font-black tracking-widest">Agentic Stream History</span>
                          </div>
                          {agentState.history.map((h, i) => (
                              <div key={i} className="flex gap-4 border-l border-white/5 pl-4 py-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black shrink-0 ${h.role === 'user' ? 'bg-blue-500/10 text-blue-400' : h.role === 'tool' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#9d4edd]/10 text-[#9d4edd]'}`}>{h.toolName || h.role.toUpperCase()}</span>
                                  <span className="text-gray-400 break-words">{h.content}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          <div className="w-80 border-l border-[#1f1f1f] bg-[#0a0a0a] flex flex-col shrink-0">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center gap-3">
                    <Activity size={16} className="text-[#22d3ee]" />
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Neural Diagnostic</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    {isValidating ? (
                        <div className="p-4 flex items-center gap-3 bg-black rounded-2xl border border-white/5">
                            <Loader2 size={14} className="text-[#9d4edd] animate-spin" />
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Validating Logic Atoms...</span>
                        </div>
                    ) : syntaxErrors.length > 0 ? (
                        syntaxErrors.map((err, i) => (
                            <div key={i} className="p-4 bg-red-950/20 border border-red-500/40 rounded-2xl space-y-2 group hover:bg-red-950/40 transition-all">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-red-500 font-mono">ERROR_LN_{err.line}</span>
                                    <AlertTriangle size={12} className="text-red-500 animate-pulse" />
                                </div>
                                <p className="text-[10px] text-red-100 font-mono leading-relaxed">{err.message}</p>
                            </div>
                        ))
                    ) : (
                        <div className="p-10 text-center opacity-20">
                            <CheckCircle size={32} className="mx-auto mb-4" />
                            <p className="text-[9px] font-mono uppercase">Topology Stable</p>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-[#1f1f1f] bg-black">
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-[0.4em] mb-3 px-1 flex items-center justify-between">
                        <span>Iterative Directive</span>
                        <Target size={10} />
                    </div>
                    <textarea 
                        value={codeStudio.prompt}
                        onChange={e => setCodeStudioState({ prompt: e.target.value, lastEditTimestamp: Date.now() })}
                        className="w-full bg-[#111] border border-[#222] p-4 rounded-2xl text-[11px] font-mono text-gray-300 outline-none h-40 resize-none focus:border-[#9d4edd] transition-all shadow-inner"
                        placeholder="E.g. 'Build a React component for a task list' or 'Generate a PARA drive organization'..."
                    />
                </div>
          </div>
      </div>
    </div>
  );
};

export default CodeStudio;