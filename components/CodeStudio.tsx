import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, validateSyntax } from '../services/geminiService';
import { audio } from '../services/audioService'; 
import { useFlywheel } from '../hooks/useFlywheel';
import { 
    Code, Copy, Check, Loader2, Sparkles, FileText, AlertTriangle, 
    Activity, CheckCircle, Target, Terminal, GitMerge, 
    BrainCircuit, Search, ListTodo, RefreshCw, TrendingUp, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MermaidDiagram from './MermaidDiagram';
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
  const { codeStudio, setCodeStudioState, process: processData, addLog } = useAppStore();
  const { track } = useFlywheel('BUILDER PROTOCOL');
  const { state: agentState } = useAgentRuntime();
  const [activeTab, setActiveTab] = useState<'IDE' | 'ACTIONS' | 'EVOLUTION' | 'LATTICE' | 'ORCHESTRATION' | 'DETECTIVE'>('IDE');
  const [isCopied, setIsCopied] = React.useState(false);
  const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);

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
    } catch (err: any) {
      setCodeStudioState({ error: err.message, isLoading: false });
      audio.playError();
    }
  };

  const handleCopy = () => {
    if (codeStudio.generatedCode) {
      navigator.clipboard.writeText(codeStudio.generatedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-3xl border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans relative">
      <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center px-6 justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-[#9d4edd]">
                <Code size={18} />
                <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Logic Studio</span>
              </div>
              <div className="flex bg-[#111] p-1 rounded-xl border border-white/5">
                {[
                    { id: 'IDE', icon: Terminal, label: 'Editor' },
                    { id: 'ACTIONS', icon: ListTodo, label: 'Actions' },
                    { id: 'EVOLUTION', icon: TrendingUp, label: 'Evo' },
                    { id: 'LATTICE', icon: GitMerge, label: 'Lattice' },
                    { id: 'ORCHESTRATION', icon: BrainCircuit, label: 'Orch' },
                    { id: 'DETECTIVE', icon: Search, label: 'Audit' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-[#1f1f1f] text-white shadow-inner' : 'text-gray-600 hover:text-gray-300'}`}>
                        <tab.icon size={12} /> {tab.label}
                    </button>
                ))}
              </div>
          </div>

          <div className="flex items-center gap-4">
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#222] rounded-xl text-[10px] font-mono text-gray-400 hover:text-white transition-all">
                  {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {isCopied ? 'COPIED' : 'COPY'}
              </button>
              <button onClick={handleGenerate} className="px-6 py-2 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-[10px] uppercase rounded-xl transition-all flex items-center gap-2">
                  <Sparkles size={14} /> Fabricate
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
              <AnimatePresence mode="wait">
                  {activeTab === 'IDE' && (
                      <motion.div key="ide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto custom-scrollbar relative">
                          <div className="pl-16 pt-6 pr-8 pb-20 min-h-full">
                              {codeStudio.isLoading ? (
                                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                                      <Loader2 size={40} className="text-[#9d4edd] animate-spin mb-4" />
                                      <span className="text-[10px] font-mono uppercase tracking-widest">Logic Inversion...</span>
                                  </div>
                              ) : codeStudio.generatedCode ? (
                                  <pre className="font-mono text-xs text-gray-300 leading-6 whitespace-pre-wrap">
                                      <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.generatedCode, codeStudio.language) }} />
                                  </pre>
                              ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                      <FileText size={64} className="mx-auto mb-6" />
                                      <p className="text-sm font-mono uppercase tracking-[0.3em]">Ready for Directive</p>
                                  </div>
                              )}
                          </div>
                      </motion.div>
                  )}

                  {activeTab === 'ACTIONS' && (
                      <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 h-full">
                          <TaskBoard />
                      </motion.div>
                  )}

                  {activeTab === 'EVOLUTION' && (
                      <motion.div key="evolution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-10 overflow-y-auto bg-black custom-scrollbar">
                          {codeStudio.activeEvolution ? (
                              <div className="max-w-4xl mx-auto space-y-8">
                                    <div className="p-8 bg-[#0a0a0a] border border-[#333] rounded-3xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#22d3ee]"></div>
                                        <h2 className="text-xl font-black text-[#22d3ee] uppercase mb-4 font-mono tracking-tighter">Architectural Critique</h2>
                                        <div className="text-[10px] text-gray-600 font-mono uppercase mb-2">Internal Monologue Sequence:</div>
                                        <p className="text-sm text-gray-300 leading-relaxed font-mono italic">{(codeStudio.activeEvolution as any).internalMonologue || "Analyzing structural drift... No monologue captured in current buffer."}</p>
                                    </div>
                                    <div className="rounded-2xl border border-[#1f1f1f] bg-[#050505] p-6 shadow-inner">
                                        <div className="flex items-center gap-2 mb-4 text-gray-600 text-[9px] font-mono uppercase">
                                            <Code size={12}/> Evolved Source Proposal
                                        </div>
                                        <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap leading-relaxed">
                                            <code>{codeStudio.activeEvolution.code}</code>
                                        </pre>
                                    </div>
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-20">
                                  <RefreshCw size={64} className="mb-4" />
                                  <p className="text-[10px] font-mono uppercase tracking-widest">Evo Daemon Monitoring Core Logic...</p>
                              </div>
                          )}
                      </motion.div>
                  )}

                  {activeTab === 'LATTICE' && (
                      <motion.div key="lattice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6">
                          <div className="h-full rounded-2xl border border-white/5 bg-black overflow-hidden">
                            <MermaidDiagram code={processData.generatedCode || 'graph TD\nA[Compiler] --> B[Lattice]\nB --> C[Orchestration]'} />
                          </div>
                      </motion.div>
                  )}

                  {activeTab === 'ORCHESTRATION' && (
                      <motion.div key="orchestration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-4 bg-black">
                          <div className="text-xs font-black text-white uppercase tracking-[0.4em] mb-6 border-b border-[#222] pb-2">Agentic Stream History</div>
                          {agentState.history.length === 0 ? (
                              <div className="p-12 text-center opacity-10">
                                <GitBranch size={48} className="mx-auto mb-4"/>
                                <span className="text-[10px] font-mono uppercase">Empty Execution History</span>
                              </div>
                          ) : (
                              agentState.history.map((h, i) => (
                                <div key={i} className="p-5 bg-[#0a0a0a] border border-[#222] rounded-2xl font-mono text-[11px] text-gray-300 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-5"><Terminal size={32}/></div>
                                    <span className={`font-black uppercase mr-3 ${h.role === 'user' ? 'text-[#22d3ee]' : h.role === 'tool' ? 'text-[#42be65]' : 'text-[#9d4edd]'}`}>
                                        [{h.role}]
                                    </span> 
                                    <span className="leading-relaxed">{h.content}</span>
                                </div>
                              ))
                          )}
                      </motion.div>
                  )}

                  {activeTab === 'DETECTIVE' && (
                      <motion.div key="detective" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-10 flex flex-col items-center justify-center bg-black">
                          <div className="max-w-md w-full text-center space-y-6 opacity-30">
                              <Search size={64} className="mx-auto text-gray-500" />
                              <div>
                                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Logic Audit Core</h3>
                                  <p className="text-[10px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Deep Semantic Scan for structural entropy</p>
                              </div>
                              <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Initialize Full Audit</button>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          <div className="w-80 border-l border-[#1f1f1f] bg-[#0a0a0a] flex flex-col shrink-0">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center gap-3">
                    <Activity size={16} className="text-[#22d3ee]" />
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Neural Diagnostic</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    {syntaxErrors.length > 0 ? (
                        syntaxErrors.map((err, i) => (
                            <div key={i} className="p-4 bg-red-950/20 border border-red-500/40 rounded-2xl space-y-2 group hover:bg-red-950/30 transition-all">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertTriangle size={12}/>
                                    <span className="text-[8px] font-black font-mono">ERROR_LN_{err.line}</span>
                                </div>
                                <p className="text-[10px] text-red-100 font-mono leading-relaxed">{err.message}</p>
                            </div>
                        ))
                    ) : (
                        <div className="p-10 text-center opacity-20 group hover:opacity-30 transition-opacity">
                            <CheckCircle size={32} className="mx-auto mb-4" />
                            <p className="text-[9px] font-mono uppercase tracking-widest">Topology Stable</p>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-[#1f1f1f] bg-black">
                    <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Logic Input Directive</div>
                    <textarea 
                        value={codeStudio.prompt} 
                        onChange={e => setCodeStudioState({ prompt: e.target.value })} 
                        className="w-full bg-[#111] border border-[#222] p-4 rounded-2xl text-[11px] font-mono text-gray-300 outline-none h-40 resize-none focus:border-[#9d4edd] transition-all placeholder:text-gray-800" 
                        placeholder="Enter intent sequence..." 
                    />
                </div>
          </div>
      </div>
    </div>
  );
};

export default CodeStudio;