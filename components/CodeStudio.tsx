import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, validateSyntax } from '../services/geminiService';
import { audio } from '../services/audioService'; 
import { useFlywheel } from '../hooks/useFlywheel';
import { 
    Code, Copy, Check, Loader2, Sparkles, FileText, AlertTriangle, 
    Activity, CheckCircle, Target, Terminal, GitMerge, 
    BrainCircuit, Search, ListTodo, RefreshCw, TrendingUp, GitBranch,
    Play, Settings, Save, Layout, Zap, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskBoard from './TaskBoard';
import { useAgentRuntime } from '../hooks/useAgentRuntime';

const highlightCode = (code: string, lang: string) => {
    let escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
        .replace(/\b(const|let|var|function|class|import|from|return|if|else|for|while|async|await|export|default|interface|type|public|private|protected|new|try|catch|finally|switch|case|break|throw)\b/g, '<span style="color: #f1c21b">$1</span>')
        .replace(/\b(string|number|boolean|any|Promise|Array|Object|null|undefined|true|false)\b/g, '<span style="color: #22d3ee">$1</span>')
        .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span style="color: #6b7280; font-style: italic">$1</span>')
        .replace(/(".*?"|'.*?'|`[\s\S]*?`)/g, '<span style="color: #42be65">$1</span>');
};

const CodeStudio: React.FC = () => {
  const { codeStudio, setCodeStudioState, addLog } = useAppStore();
  const { track } = useFlywheel('BUILDER PROTOCOL');
  const { state: agentState } = useAgentRuntime();
  
  // Local UI state for copying
  const [isCopied, setIsCopied] = React.useState(false);
  const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);

  // Neural Syntax Validation Loop
  useEffect(() => {
      const code = codeStudio.generatedCode;
      if (!code) { setSyntaxErrors([]); return; }
      const timer = setTimeout(async () => {
          const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
          if (hasKey) {
              const errors = await validateSyntax(code, codeStudio.language);
              setSyntaxErrors(errors);
          }
      }, 2000);
      return () => clearTimeout(timer);
  }, [codeStudio.generatedCode, codeStudio.language]);

  const handleGenerate = async () => {
    if (!codeStudio.prompt?.trim()) return;
    setCodeStudioState({ isLoading: true, error: null }); 
    try {
      if (!(await (window as any).aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
      const generated = await generateCode(codeStudio.prompt, codeStudio.language, codeStudio.model);
      setCodeStudioState({ generatedCode: generated, isLoading: false, lastEditTimestamp: Date.now() });
      audio.playSuccess();
      track('Code Gen').success();
      addLog('SUCCESS', 'Logic synthesized and loaded into buffer.');
    } catch (err: any) {
      setCodeStudioState({ error: err.message, isLoading: false });
      audio.playError();
      addLog('ERROR', `Generation failed: ${err.message}`);
    }
  };

  const handleCopy = () => {
    if (codeStudio.generatedCode) {
      navigator.clipboard.writeText(codeStudio.generatedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      audio.playClick();
    }
  };

  const setActiveTab = (tab: 'IDE' | 'ACTIONS') => {
      setCodeStudioState({ activeTab: tab });
      audio.playClick();
  };

  // Fixed: codeLines now uses correctly imported useMemo
  const codeLines = useMemo(() => codeStudio.generatedCode?.split('\n') || [], [codeStudio.generatedCode]);

  return (
    <div className="flex flex-col h-full rounded-3xl border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans relative">
      {/* Sector Header */}
      <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-30 flex items-center px-8 justify-between shrink-0">
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                    <Code size={18} className="text-[#9d4edd]" />
                </div>
                <div>
                    <h1 className="text-sm font-black font-mono text-white uppercase tracking-widest leading-none">Code Studio</h1>
                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1">Logic Forge v5.0</span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-[#111] p-1 rounded-xl border border-white/5">
                <button 
                    onClick={() => setActiveTab('IDE')} 
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${codeStudio.activeTab === 'IDE' ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Terminal size={14} /> IDE
                </button>
                <button 
                    onClick={() => setActiveTab('ACTIONS')} 
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${codeStudio.activeTab === 'ACTIONS' ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <ListTodo size={14} /> Actions
                </button>
              </div>
          </div>

          <div className="flex items-center gap-4">
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#222] rounded-xl text-[10px] font-mono text-gray-400 hover:text-white transition-all">
                  {isCopied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
                  {isCopied ? 'STABLE_COPY' : 'COPY_BUFFER'}
              </button>
              <button 
                onClick={handleGenerate} 
                disabled={codeStudio.isLoading}
                className="px-6 py-2.5 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-[10px] uppercase rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(157,78,221,0.2)] disabled:opacity-50"
              >
                  {codeStudio.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Synthesize Logic
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
          {/* Main Display Sector */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative overflow-hidden">
              <AnimatePresence mode="wait">
                  {codeStudio.activeTab === 'IDE' && (
                      <motion.div 
                        key="ide" 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 20 }} 
                        className="flex-1 overflow-auto custom-scrollbar relative p-12"
                      >
                          <div className="max-w-5xl mx-auto min-h-full">
                              {codeStudio.isLoading ? (
                                  <div className="h-full flex flex-col items-center justify-center gap-6 opacity-60">
                                      <div className="relative">
                                          <Loader2 size={64} className="text-[#9d4edd] animate-spin" />
                                          <div className="absolute inset-0 blur-xl bg-[#9d4edd]/20 animate-pulse" />
                                      </div>
                                      <div className="text-center space-y-2">
                                          <p className="text-[11px] font-black font-mono text-white uppercase tracking-[0.5em]">Forging Recursive Logic...</p>
                                          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Inverting latent space vectors</p>
                                      </div>
                                  </div>
                              ) : codeStudio.generatedCode ? (
                                  <div className="relative flex">
                                      {/* Mock Line Numbers */}
                                      <div className="w-10 shrink-0 text-right pr-4 border-r border-white/5 text-[10px] font-mono text-gray-700 select-none space-y-[1.4em] pt-[0.2em]">
                                          {codeLines.map((_, i) => <div key={i}>{i + 1}</div>)}
                                      </div>
                                      <pre className="flex-1 pl-6 font-mono text-[13px] text-gray-300 leading-[1.4em] whitespace-pre-wrap selection:bg-[#9d4edd]/30">
                                          <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.generatedCode, codeStudio.language) }} />
                                      </pre>
                                  </div>
                              ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 group">
                                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                          <FileText size={48} className="text-gray-500" />
                                      </div>
                                      <p className="text-sm font-mono uppercase tracking-[0.4em]">Compiler Standing By</p>
                                      <p className="text-[9px] text-gray-600 mt-2 uppercase font-mono">Input operational directive to initialize fabrication</p>
                                  </div>
                              )}
                          </div>
                      </motion.div>
                  )}

                  {codeStudio.activeTab === 'ACTIONS' && (
                      <motion.div 
                        key="actions" 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.02 }} 
                        className="flex-1 h-full bg-[#030303]"
                      >
                          <TaskBoard />
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          {/* Right Context Sidebar */}
          <div className="w-96 border-l border-[#1f1f1f] bg-[#0a0a0a] flex flex-col shrink-0 relative z-20">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <Activity size={16} className="text-[#22d3ee]" />
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Neural Diagnostic</span>
                    </div>
                    {syntaxErrors.length > 0 && <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30">ALERTS_DETECTED</span>}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    {syntaxErrors.length > 0 ? (
                        syntaxErrors.map((err, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i} 
                                className="p-5 bg-red-950/20 border border-red-500/40 rounded-2xl space-y-2 group hover:bg-red-950/30 transition-all shadow-xl"
                            >
                                <div className="flex items-start gap-2 text-red-500">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    <span className="text-[8px] font-black font-mono uppercase tracking-widest">Compiler_Error_LN_{err.line}</span>
                                </div>
                                <p className="text-[11px] text-red-100 font-mono leading-relaxed">{err.message}</p>
                            </motion.div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-30 group">
                            <div className="relative">
                                <CheckCircle size={48} className="text-[#10b981] mb-6 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 blur-2xl bg-[#10b981]/20 animate-pulse" />
                            </div>
                            <p className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Lattice Verified</p>
                            <p className="text-[8px] font-mono text-gray-500 mt-2 uppercase">Zero entropy drift detected in current buffer</p>
                        </div>
                    )}
                </div>

                {/* Directive Input */}
                <div className="p-6 border-t border-[#1f1f1f] bg-black">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Logic Directive Matrix</span>
                        <Zap size={10} className="text-[#9d4edd] animate-pulse" />
                    </div>
                    <div className="relative group">
                        <textarea 
                            value={codeStudio.prompt} 
                            onChange={e => setCodeStudioState({ prompt: e.target.value })} 
                            className="w-full bg-[#0a0a0a] border border-[#222] p-5 rounded-2xl text-[11px] font-mono text-gray-300 outline-none h-44 resize-none focus:border-[#9d4edd] transition-all placeholder:text-gray-800 shadow-inner group-hover:border-[#333]" 
                            placeholder="Input strategic intent sequence (e.g. 'Build a decentralized consensus node in Rust')..." 
                        />
                        <div className="absolute bottom-4 right-4 opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <span className="text-[8px] font-mono text-gray-600">CMD+ENTER TO SYNC</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                        <select 
                            value={codeStudio.model}
                            onChange={(e) => setCodeStudioState({ model: e.target.value })}
                            className="flex-1 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-[9px] font-mono text-gray-400 outline-none focus:border-[#9d4edd]"
                        >
                            <option value="gemini-3-pro-preview">PRO_CORE_v3</option>
                            <option value="gemini-3-flash-preview">FLASH_CORE_v3</option>
                        </select>
                        <div className="px-3 py-2 bg-[#111] border border-[#222] rounded-lg flex items-center gap-2">
                            <Activity size={10} className="text-[#10b981]" />
                            <span className="text-[9px] font-mono text-[#10b981] font-bold">STABLE</span>
                        </div>
                    </div>
                </div>
          </div>
      </div>

      {/* Global Studio HUD Footer */}
      <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[8px] font-mono text-gray-600 shrink-0 relative z-20">
          <div className="flex gap-8 items-center">
              <div className="flex items-center gap-2 uppercase tracking-widest text-[#10b981]">
                <CheckCircle2 size={12} /> Sync_Stable
              </div>
              <div className="flex items-center gap-2 uppercase tracking-widest">
                <GitBranch size={12} className="text-[#9d4edd]" /> Main_Lattice_Active
              </div>
              <div className="flex items-center gap-2 uppercase tracking-widest">
                <Target size={12} className="text-[#22d3ee]" /> Focus: {codeStudio.activeTab}
              </div>
          </div>
          <div className="flex items-center gap-4">
              <span>BUFF: {codeStudio.generatedCode?.length || 0} bytes</span>
              <span className="text-gray-800">|</span>
              <span className="uppercase tracking-[0.3em]">Neural Compiler v4.2.1-ZENITH</span>
          </div>
      </div>
    </div>
  );
};

export default CodeStudio;