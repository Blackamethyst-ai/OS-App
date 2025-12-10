import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { fileToGenerativePart, analyzeBookDNA, promptSelectKey, chatWithFiles } from '../services/geminiService';
import { BookOpen, Upload, Cpu, Zap, Activity, MessageSquare, Send, Loader2, GitBranch, Database, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

// Simple Markdown Parser for Chat
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Basic parser for Bold (**text**) and Code Blocks (```code```)
    const parts = content.split(/(\*\*.*?\*\*|```[\s\S]*?```)/g);

    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="text-[#9d4edd] font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).trim();
                    return (
                        <div key={index} className="block my-2 p-2 bg-[#050505] border border-[#333] rounded text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                            {code}
                        </div>
                    );
                }
                return part;
            })}
        </span>
    );
};

const BibliomorphicEngine: React.FC = () => {
  const { bibliomorphic, setBibliomorphicState } = useAppStore();
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bibliomorphic.chatHistory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBibliomorphicState({ isLoading: true, error: null });
      
      try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) {
            await promptSelectKey();
            setBibliomorphicState({ isLoading: false });
            return;
        }

        const fileData = await fileToGenerativePart(file);
        setBibliomorphicState({ activeBook: fileData });

        const analysis = await analyzeBookDNA(fileData);
        setBibliomorphicState({ 
            dna: analysis,
            isLoading: false,
            // Add a welcome message from the kernel
            chatHistory: [{
                role: 'model',
                text: `**Kernel initialized** for "${analysis.title}".\nDirect access to the text's memory banks established. Waiting for query.`,
                timestamp: Date.now()
            }]
        });
      } catch (err: any) {
        setBibliomorphicState({ error: err.message || "Ingestion Failed", isLoading: false });
      }
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatProcessing || !bibliomorphic.activeBook) return;

    const userMsg = { role: 'user' as const, text: chatInput, timestamp: Date.now() };
    setBibliomorphicState({ chatHistory: [...bibliomorphic.chatHistory, userMsg] });
    setChatInput('');
    setIsChatProcessing(true);

    try {
        const historyForApi = bibliomorphic.chatHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        
        // System prompt context from the DNA
        const dnaContext = bibliomorphic.dna ? `
            CONTEXTUAL MEMORY [${bibliomorphic.dna.title}]:
            Author: ${bibliomorphic.dna.author}
            Kernel Prime Directive: ${bibliomorphic.dna.kernelIdentity.primeDirective}
            Tone: ${bibliomorphic.dna.toneAnalysis}
        ` : '';

        const response = await chatWithFiles(
            chatInput, 
            historyForApi, 
            [bibliomorphic.activeBook],
            dnaContext + "\nYou are the Living Book. Answer based strictly on the text content, maintaining the persona defined in the Kernel Identity. Use markdown for emphasis."
        );

        setBibliomorphicState(prev => ({ 
            chatHistory: [...prev.chatHistory, { role: 'model', text: response, timestamp: Date.now() }] 
        }));
    } catch (err: any) {
        setBibliomorphicState({ error: "Comms Link Broken" });
    } finally {
        setIsChatProcessing(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden border border-[#1f1f1f] rounded shadow-2xl">
      {/* Background Matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0)_0%,rgba(157,78,221,0.05)_50%,rgba(0,0,0,0)_100%)] bg-[size:100%_4px] pointer-events-none"></div>

      {/* Header */}
      <div className="h-16 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#0a0a0a]/90 backdrop-blur z-20">
         <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                <BookOpen className="w-4 h-4 text-[#9d4edd]" />
            </div>
            <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Bibliomorphic Engine</h1>
         </div>
         {bibliomorphic.dna && (
             <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                 <span>{bibliomorphic.dna.title}</span>
                 <span className="text-[#9d4edd]">///</span>
                 <span>{bibliomorphic.dna.author}</span>
             </div>
         )}
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Input & Chat */}
          <div className="w-1/3 border-r border-[#1f1f1f] flex flex-col bg-[#050505] z-10">
              {/* Upload Zone */}
              {!bibliomorphic.dna && (
                  <div className="p-6 flex-shrink-0 border-b border-[#1f1f1f]">
                       <div className="border border-dashed border-[#333] rounded-lg p-8 flex flex-col items-center justify-center relative group hover:border-[#9d4edd] transition-colors">
                            <Upload className="w-8 h-8 text-gray-600 mb-4 group-hover:text-[#9d4edd]" />
                            <p className="text-xs font-mono uppercase text-gray-500 mb-2">Ingest Text Artifact</p>
                            <input 
                                type="file" 
                                onChange={handleFileUpload} 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept=".txt,.pdf,.md"
                            />
                       </div>
                       {bibliomorphic.isLoading && (
                           <div className="mt-4 flex items-center justify-center text-[#9d4edd] text-xs font-mono">
                               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                               Sequencing DNA...
                           </div>
                       )}
                  </div>
              )}

              {/* Chat Interface */}
              <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" ref={scrollRef}>
                      {bibliomorphic.chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-3 rounded text-xs font-mono leading-relaxed border
                                ${msg.role === 'user' 
                                    ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 text-gray-200' 
                                    : 'bg-[#111] border-[#333] text-gray-400'}`}>
                                  <MarkdownRenderer content={msg.text} />
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-3 border-t border-[#1f1f1f] bg-[#0a0a0a]">
                      <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                            disabled={!bibliomorphic.activeBook || isChatProcessing}
                            placeholder={bibliomorphic.activeBook ? "Query the living text..." : "Waiting for ingestion..."}
                            className="flex-1 bg-[#111] border border-[#333] px-3 py-2 text-xs font-mono text-white focus:border-[#9d4edd] outline-none"
                          />
                          <button 
                            onClick={handleChat}
                            disabled={!bibliomorphic.activeBook || isChatProcessing}
                            className="p-2 bg-[#9d4edd] text-black hover:bg-[#b06bf7] disabled:opacity-50"
                          >
                              {isChatProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Column: DNA Viz */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
              {!bibliomorphic.dna ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50">
                      <Activity className="w-16 h-16 mb-6" />
                      <p className="font-mono text-sm uppercase tracking-widest">Awaiting Neural Sequence</p>
                  </div>
              ) : (
                  <AnimatePresence>
                      <MotionDiv 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-12 max-w-4xl mx-auto"
                      >
                          {/* 1. Kernel Identity */}
                          <section>
                              <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                  <Cpu className="w-4 h-4 text-[#9d4edd]" />
                                  <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Kernel Identity</h2>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="bg-[#0a0a0a] border border-[#333] p-5 rounded">
                                      <div className="text-[10px] text-gray-500 uppercase mb-2">Designation</div>
                                      <div className="text-lg text-white font-mono">{bibliomorphic.dna.kernelIdentity.designation}</div>
                                  </div>
                                  <div className="bg-[#0a0a0a] border border-[#333] p-5 rounded">
                                      <div className="text-[10px] text-gray-500 uppercase mb-2">Prime Directive</div>
                                      <div className="text-sm text-gray-300 italic">"{bibliomorphic.dna.kernelIdentity.primeDirective}"</div>
                                  </div>
                              </div>
                          </section>

                          {/* 2. Axioms */}
                          <section>
                              <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                  <Zap className="w-4 h-4 text-[#9d4edd]" />
                                  <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Foundational Axioms</h2>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {bibliomorphic.dna.axioms.map((axiom, i) => (
                                      <div key={i} className="bg-[#0a0a0a] border border-[#333] p-4 hover:border-[#9d4edd] transition-colors group">
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-xs font-bold text-[#9d4edd]">{axiom.concept}</span>
                                              <span className="text-[10px] text-gray-600 font-mono">AXIOM_0{i+1}</span>
                                          </div>
                                          <div className="bg-[#111] p-2 rounded text-[10px] font-mono text-gray-400 border-l-2 border-[#9d4edd] opacity-80 group-hover:opacity-100">
                                              {axiom.codeSnippet}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </section>

                          {/* 3. Proposed Modules */}
                          <section>
                              <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                  <Layout className="w-4 h-4 text-[#9d4edd]" />
                                  <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Structural Modules</h2>
                              </div>
                              <div className="space-y-3">
                                  {bibliomorphic.dna.modules.map((mod, i) => (
                                      <div key={i} className="flex items-start bg-[#0a0a0a] border border-[#333] p-4 rounded">
                                          <div className={`p-2 rounded mr-4 bg-opacity-10 border
                                              ${mod.type === 'UI' ? 'bg-blue-500 border-blue-500 text-blue-500' : 
                                                mod.type === 'LOGIC' ? 'bg-green-500 border-green-500 text-green-500' : 
                                                mod.type === 'DATABASE' ? 'bg-yellow-500 border-yellow-500 text-yellow-500' : 
                                                'bg-purple-500 border-purple-500 text-purple-500'}`}>
                                              {mod.type === 'UI' ? <Layout className="w-4 h-4" /> : 
                                               mod.type === 'LOGIC' ? <Cpu className="w-4 h-4" /> :
                                               mod.type === 'DATABASE' ? <Database className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
                                          </div>
                                          <div>
                                              <h3 className="text-sm font-bold text-gray-200 mb-1">{mod.title}</h3>
                                              <p className="text-xs text-gray-500 mb-2">{mod.description}</p>
                                              <p className="text-[10px] text-gray-600 font-mono border-t border-[#222] pt-2 mt-2">
                                                  // Reason: {mod.reasoning}
                                              </p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </section>

                          {/* 4. System Prompt */}
                          <section className="pb-12">
                               <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                  <MessageSquare className="w-4 h-4 text-[#9d4edd]" />
                                  <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Compiled System Prompt</h2>
                              </div>
                              <div className="bg-[#050505] border border-[#333] p-4 rounded overflow-x-auto">
                                  <pre className="text-[10px] font-mono text-gray-400 whitespace-pre-wrap">
                                      {bibliomorphic.dna.systemPrompt}
                                  </pre>
                              </div>
                          </section>

                      </MotionDiv>
                  </AnimatePresence>
              )}
          </div>
      </div>
    </div>
  );
};

export default BibliomorphicEngine;