
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateCode, promptSelectKey, validateSyntax } from '../services/geminiService';
import { audio } from '../services/audioService'; 
import { useFlywheel } from '../hooks/useFlywheel';
import { Code, Copy, Check, Loader2, Sparkles, FileText, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SYNTAX_CONFIG: Record<string, { keywords: string; types: string; comment: RegExp; string: RegExp }> = {
    python: {
        keywords: "\\b(def|class|import|from|return|if|else|elif|for|while|try|except|finally|with|as|pass|lambda|global|nonlocal|True|False|None|and|or|not|is|in|print)\\b",
        types: "\\b(int|str|bool|float|list|dict|set|tuple|self)\\b",
        comment: /(#.*$)/gm,
        string: /(".*?"|'.*?'|""".*?"""|'''.*?''')/g
    },
    typescript: { 
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

const CodeStudio: React.FC = () => {
  const { codeStudio, setCodeStudioState } = useAppStore();
  const { track } = useFlywheel('BUILDER PROTOCOL');
  const [isCopied, setIsCopied] = React.useState(false);
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
      setCodeStudioState({ generatedCode: generated, isLoading: false });
      audio.playSuccess();
      track('Code Gen').success();

    } catch (err: any) {
      setCodeStudioState({ error: err.message, isLoading: false });
      audio.playError();
      track('Code Gen').fail();
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

  return (
    <div className={`
        flex flex-col h-full rounded-3xl border bg-[#030303] shadow-2xl overflow-hidden font-sans relative transition-all duration-700
        ${syntaxErrors.length > 0 ? 'border-red-500 ring-2 ring-red-500/20' : 'border-[#1f1f1f]'}
    `}>
      
      <AnimatePresence>
          {syntaxErrors.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 0.03 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-red-600 pointer-events-none"
              />
          )}
      </AnimatePresence>

      <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center px-8 justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Code size={18} className={syntaxErrors.length > 0 ? 'text-red-500 animate-pulse' : 'text-[#9d4edd]'} />
                <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Logic Studio</span>
              </div>
              <div className="h-4 w-px bg-white/5" />
              <div className="flex gap-2">
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${syntaxErrors.length > 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>
                      {syntaxErrors.length > 0 ? 'LATTICE_ERROR' : 'LATTICE_SYNC_OK'}
                  </span>
              </div>
          </div>

          <div className="flex items-center gap-4">
              <button 
                onClick={handleCopy} 
                disabled={!codeStudio.generatedCode}
                className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-white/5 border border-[#222] rounded-xl text-[10px] font-mono text-gray-400 hover:text-white transition-all"
              >
                  {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {isCopied ? 'COPIED' : 'COPY'}
              </button>
              <button 
                onClick={handleGenerate} 
                disabled={codeStudio.isLoading}
                className="px-6 py-2 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-[10px] uppercase rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  {codeStudio.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Fabricate Logic
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
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
                              <p className="text-[10px] font-mono mt-2">Initialize Fabrication Directive</p>
                          </div>
                      )}
                  </div>
              </div>
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
                    <textarea 
                        value={codeStudio.prompt}
                        onChange={e => setCodeStudioState({ prompt: e.target.value })}
                        className="w-full bg-[#111] border border-[#222] p-4 rounded-2xl text-[11px] font-mono text-gray-300 outline-none h-40 resize-none focus:border-[#9d4edd] transition-all shadow-inner"
                        placeholder="Define the next logic iteration..."
                    />
                </div>
          </div>
      </div>
    </div>
  );
};

export default CodeStudio;
