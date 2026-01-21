import { apiKeyService } from '../services/apiKeyService';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, validateSyntax } from '../services/geminiService';
import { audio } from '../services/audioService'; 
import { useFlywheel } from '../hooks/useFlywheel';
import { 
    Code, Copy, Check, Loader2, Sparkles, FileText, AlertTriangle, 
    Activity, CheckCircle, Target, Terminal, GitMerge, 
    BrainCircuit, Search, ListTodo, RefreshCw, TrendingUp, GitBranch,
    Play, Settings, Save, Layout, Zap, CheckCircle2, Waves, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskBoard from './TaskBoard';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { usePerspectiveRefraction } from '../hooks/usePerspectiveRefraction';

const highlightCode = (code: string, lang: string) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
        .replace(/\b(const|let|var|function|class|import|from|return|if|else|for|while|async|await|export|default|interface|type|public|private|protected|new|try|catch|finally|switch|case|break|throw)\b/g, '<span style="color: #f1c21b">$1</span>')
        .replace(/\b(string|number|boolean|any|Promise|Array|Object|null|undefined|true|false)\b/g, '<span style="color: #22d3ee">$1</span>')
        .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span style="color: #6b7280; font-style: italic">$1</span>')
        .replace(/(".*?"|'.*?'|`[\s\S]*?`)/g, '<span style="color: #42be65">$1</span>');
};

const CodeStudio: React.FC = () => {
  const { codeStudio, actions } = useAppStore();
  const { setCodeStudioState, addLog } = actions;
  const { track } = useFlywheel('BUILDER PROTOCOL');
  const { state: agentState } = useAgentRuntime();
  
  // Material Sovereignty Physics
  const { ref: tiltRef, style: tiltStyle, onMouseMove, onMouseLeave } = usePerspectiveRefraction(0.4);

  const [isCopied, setIsCopied] = React.useState(false);
  const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);

  useEffect(() => {
      const code = codeStudio.generatedCode;
      if (!code) { setSyntaxErrors([]); return; }
      const timer = setTimeout(async () => {
          const hasKey = apiKeyService.hasGeminiKey();
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
      if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); return; }
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

  const codeLines = useMemo(() => codeStudio.generatedCode?.split('\n') || [], [codeStudio.generatedCode]);

  return (
    <div className="flex flex-col h-full rounded-3xl border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans relative transition-all duration-1000">
      {/* Background Kinetic Shader */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <motion.div 
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,44,255,0.05)_0%,transparent_70%)]"
          />
      </div>

      <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-30 flex items-center px-8 justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/30 to-transparent" />
          <div className="flex items-center gap-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded shadow-[0_0_15px_rgba(157,78,221,0.2)]">
                    <Code size={18} className="text-[#9d4edd]" />
                </div>
                <div>
                    <h1 className="text-sm font-black font-mono text-white uppercase tracking-widest leading-none">Logic Forge</h1>
                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1 block">Kinetic_Engine_Active</span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#111] p-1 rounded-xl border border-white/5 shadow-inner">
                <button 
                    onClick={() => setActiveTab('IDE')} 
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${codeStudio.activeTab === 'IDE' ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Terminal size={14} /> IDE
                </button>
                <button 
                    onClick={() => setActiveTab('ACTIONS')} 
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${codeStudio.activeTab === 'ACTIONS' ? 'bg-[#9d4edd] text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <ListTodo size={14} /> Actions
                </button>
              </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
              <div className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-xl shadow-inner">
                  <Activity size={12} className="text-[#10b981] animate-pulse" />
                  <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Coherence: 94.2%</span>
              </div>
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#222] rounded-xl text-[10px] font-mono text-gray-400 hover:text-white transition-all">
                  {isCopied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
                  {isCopied ? 'SYNCED' : 'BUFF_COPY'}
              </button>
              <button 
                onClick={handleGenerate} 
                disabled={codeStudio.isLoading}
                className="px-6 py-2.5 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(157,78,221,0.4)] disabled:opacity-50 active:scale-95"
              >
                  {codeStudio.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Synthesize Logic
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative overflow-hidden">
              <AnimatePresence mode="wait">
                  {codeStudio.activeTab === 'IDE' && (
                      <motion.div 
                        key="ide" 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 20 }} 
                        className="flex-1 overflow-auto custom-scrollbar relative p-12"
                        ref={tiltRef}
                        onMouseMove={onMouseMove}
                        onMouseLeave={onMouseLeave}
                        style={tiltStyle}
                      >
                          <div className="max-w-5xl mx-auto min-h-full crystalline invisible-glass p-8 rounded-[3rem] border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
                              {codeStudio.isLoading ? (
                                  <div className="h-full flex flex-col items-center justify-center gap-6 opacity-60 py-20">
                                      <div className="relative">
                                          <Loader2 size={64} className="text-[#9d4edd] animate-spin" />
                                          <div className="absolute inset-0 blur-3xl bg-[#9d4edd]/20 animate-pulse" />
                                      </div>
                                      <div className="text-center space-y-2">
                                          <p className="text-[11px] font-black font-mono text-white uppercase tracking-[0.5em]">Forging Recursive Logic...</p>
                                          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Inverting latent space vectors</p>
                                      </div>
                                  </div>
                              ) : codeStudio.generatedCode ? (
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="relative flex group/codeblock"
                                  >
                                      <div className="absolute inset-0 bg-gradient-to-r from-[#9d4edd]/5 via-transparent to-transparent opacity-0 group-hover/codeblock:opacity-100 transition-opacity pointer-events-none" />
                                      <div className="w-10 shrink-0 text-right pr-4 border-r border-white/5 text-[10px] font-mono text-gray-700 select-none space-y-[1.4em] pt-[0.2em]">
                                          {codeLines.map((_, i) => <div key={i}>{i + 1}</div>)}
                                      </div>
                                      <pre className="flex-1 pl-6 font-mono text-[13px] text-gray-300 leading-[1.4em] whitespace-pre-wrap selection:bg-[#9d4edd]/40">
                                          <code dangerouslySetInnerHTML={{ __html: highlightCode(codeStudio.generatedCode, codeStudio.language) }} />
                                      </pre>
                                  </motion.div>
                              ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 group py-40">
                                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center mb-8 group-hover:scale-110 transition-all group-hover:border-[#9d4edd]/40">
                                          <Waves size={64} className="text-gray-500 group-hover:text-[#9d4edd] transition-colors" />
                                      </div>
                                      <p className="text-sm font-mono uppercase tracking-[0.4em]">Compiler Standing By</p>
                                      <p className="text-[9px] text-gray-600 mt-2 uppercase font-mono tracking-widest">Input operational directive to initialize fabrication</p>
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

          <div className="w-[420px] border-l border-[#1f1f1f] bg-[#0a0a0a] flex flex-col shrink-0 relative z-20 shadow-2xl">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01] shrink-0">
                    <div className="flex items-center gap-3">
                        <Activity size={16} className="text-[#22d3ee] animate-pulse" />
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Neural Diagnostic</span>
                    </div>
                    {syntaxErrors.length > 0 && <span className="text-[8px] font-black px-2.5 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]">ALERTS_DETECTED</span>}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                    {syntaxErrors.length > 0 ? (
                        syntaxErrors.map((err, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i} 
                                className="p-6 bg-red-950/20 border border-red-500/40 rounded-[2rem] space-y-3 group hover:bg-red-950/30 transition-all shadow-xl"
                            >
                                <div className="flex items-start gap-3 text-red-500">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    <span className="text-[9px] font-black font-mono uppercase tracking-[0.2em]">LN_{err.line} // Conflict</span>
                                </div>
                                <p className="text-[11px] text-red-100 font-mono leading-relaxed italic">"{err.message}"</p>
                            </motion.div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-30 group grayscale hover:grayscale-0 transition-all duration-1000">
                            <div className="relative">
                                {/* Fix: Added missing ShieldCheck to imports to resolve "Cannot find name 'ShieldCheck'" error on line 241. */}
                                <ShieldCheck size={80} className="text-[#10b981] mb-8 group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 blur-3xl bg-[#10b981]/20 animate-pulse" />
                            </div>
                            <p className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">Lattice Verified</p>
                            <p className="text-[9px] font-mono text-gray-500 mt-3 uppercase tracking-widest leading-relaxed">Zero entropy drift detected.<br/>Buffer structural integrity optimal.</p>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-[#1f1f1f] bg-black/60 backdrop-blur-3xl shrink-0">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Operational Directive</span>
                        <Zap size={12} className="text-[#9d4edd] animate-pulse" />
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#9d4edd]/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <textarea 
                            value={codeStudio.prompt} 
                            onChange={e => setCodeStudioState({ prompt: e.target.value })} 
                            className="w-full bg-[#0a0a0a] border border-white/5 p-6 rounded-[2.5rem] text-xs font-mono text-gray-300 outline-none h-48 resize-none focus:border-[#9d4edd]/50 transition-all placeholder:text-gray-800 shadow-inner group-hover:border-white/10 relative z-10" 
                            placeholder="Input strategic intent sequence..." 
                        />
                        <div className="absolute bottom-4 right-6 opacity-0 group-focus-within:opacity-100 transition-opacity z-20">
                            <span className="text-[8px] font-mono text-gray-600 font-black uppercase tracking-widest">CMD+ENTER TO SYNC</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex gap-3">
                        <select 
                            value={codeStudio.model}
                            onChange={(e) => setCodeStudioState({ model: e.target.value })}
                            className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-gray-400 outline-none focus:border-[#9d4edd] transition-all cursor-pointer hover:bg-[#1a1a1a]"
                        >
                            <option value="gemini-1.5-pro">PRO_FORGE_V3</option>
                            <option value="gemini-2.0-flash">FLASH_FORGE_V3</option>
                        </select>
                        <div className="px-4 py-3 bg-[#10b981]/5 border border-[#10b981]/20 rounded-xl flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            <span className="text-[9px] font-mono text-[#10b981] font-black uppercase">STABLE</span>
                        </div>
                    </div>
                </div>
          </div>
      </div>

      <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-10 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-20 uppercase font-black tracking-[0.4em]">
          <div className="flex gap-12 items-center">
              <div className="flex items-center gap-3 text-[#10b981]">
                <CheckCircle2 size={14} className="shadow-[0_0_10px_#10b981]" /> Sync_Stable
              </div>
              <div className="flex items-center gap-3">
                <GitBranch size={14} className="text-[#9d4edd]" /> Lattice_Active
              </div>
              <div className="flex items-center gap-3">
                <Target size={14} className="text-[#22d3ee]" /> Segment: {codeStudio.activeTab}
              </div>
          </div>
          <div className="flex items-center gap-6">
              <span className="opacity-40">BUFF_LENS: {codeStudio.generatedCode?.length || 0}B</span>
              <div className="h-4 w-px bg-white/5" />
              <span className="text-gray-500">ZENITH_OS_LOGIC</span>
          </div>
      </div>
    </div>
  );
};

export default CodeStudio;
