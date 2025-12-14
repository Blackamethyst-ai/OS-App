
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { performGlobalSearch, promptSelectKey } from '../services/geminiService';
import { AppMode, SearchResultItem } from '../types';
import { Search, Loader2, ArrowRight, Zap, Navigation, Map, Code, Image as ImageIcon, BookOpen, Activity, Command, BrainCircuit, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const GlobalSearchBar: React.FC = () => {
  const { search, setSearchState, setMode, setCodeStudioState, setImageGenState } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ThoughtStream State
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const thoughts = [
      "Optimizing neural pathways...",
      "Quantum dock engaged.",
      "Awaiting directive...",
      "Analyzing power grid fluctuations...",
      "Code synthesis module ready.",
      "Scanning for architectural anomalies...",
      "Intelligence L0 synchronized."
  ];

  // Cycle thoughts
  useEffect(() => {
      const interval = setInterval(() => {
          setThoughtIndex(prev => (prev + 1) % thoughts.length);
      }, 4000);
      return () => clearInterval(interval);
  }, []);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchState({ isOpen: false });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Persistence logic (State & History)
  useEffect(() => {
      // 1. Restore State
      const savedSearch = localStorage.getItem('global_search_state');
      if (savedSearch) {
          try {
              const { query, results } = JSON.parse(savedSearch);
              if (query || (results && results.length > 0)) {
                  setSearchState({ query, results }); 
              }
          } catch(e) { console.error("Failed to load search state"); }
      }

      // 2. Restore History
      const savedHistory = localStorage.getItem('global_search_history');
      if (savedHistory) {
          try {
              const history = JSON.parse(savedHistory);
              setSearchState({ history });
          } catch(e) { console.error("Failed to load search history"); }
      }
  }, []);

  // Persist State on Change
  useEffect(() => {
      localStorage.setItem('global_search_state', JSON.stringify({ query: search.query, results: search.results }));
  }, [search.query, search.results]);

  const addToHistory = (q: string) => {
      const cleanQ = q.trim();
      if (!cleanQ) return;
      const newHistory = [cleanQ, ...search.history.filter(h => h !== cleanQ)].slice(0, 8);
      setSearchState({ history: newHistory });
      localStorage.setItem('global_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchState({ history: [] });
      localStorage.removeItem('global_search_history');
  };

  const clearSearch = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchState({ query: '', results: [], isOpen: false });
      inputRef.current?.focus();
  };

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!search.query.trim()) return;
      
      addToHistory(search.query);
      setSearchState({ isSearching: true, isOpen: true, results: [] });
      
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) { await promptSelectKey(); setSearchState({ isSearching: false }); return; }
          const results = await performGlobalSearch(search.query);
          setSearchState({ results, isSearching: false });
      } catch (err) { setSearchState({ isSearching: false }); }
  };

  const handleHistoryClick = (q: string) => {
      setSearchState({ query: q, isOpen: true });
      // Trigger search immediately for UX
      setSearchState({ isSearching: true, results: [] });
      performGlobalSearch(q).then(results => {
          setSearchState({ results, isSearching: false });
          // Ensure persisted state updates
          localStorage.setItem('global_search_state', JSON.stringify({ query: q, results }));
      }).catch(() => setSearchState({ isSearching: false }));
  };

  const handleResultClick = (item: SearchResultItem) => {
      if (item.type === 'NAV' && item.meta?.targetMode) {
          const mode = AppMode[item.meta.targetMode as keyof typeof AppMode];
          if (mode) setMode(mode);
      } else if (item.type === 'ACTION') {
          if (item.meta?.targetMode === 'CODE_STUDIO' && item.meta?.payload) {
             setMode(AppMode.CODE_STUDIO);
             try {
                const payload = JSON.parse(item.meta.payload);
                if (payload.prompt) setCodeStudioState({ prompt: payload.prompt });
             } catch(e) { setCodeStudioState({ prompt: item.meta.payload }); }
          } else if (item.meta?.targetMode === 'IMAGE_GEN' && item.meta?.payload) {
             setMode(AppMode.IMAGE_GEN);
             try {
                 const payload = JSON.parse(item.meta.payload);
                 setImageGenState({ prompt: payload.prompt || item.meta.payload });
             } catch(e) { setImageGenState({ prompt: item.meta.payload }); }
          }
      }
      setSearchState({ isOpen: false });
  };

  const getIcon = (type: string, target?: string) => {
      if (type === 'NAV') return <Navigation className="w-3.5 h-3.5 text-blue-400" />;
      if (type === 'ACTION') {
          if (target === 'CODE_STUDIO') return <Code className="w-3.5 h-3.5 text-yellow-400" />;
          if (target === 'IMAGE_GEN') return <ImageIcon className="w-3.5 h-3.5 text-pink-400" />;
          return <Zap className="w-3.5 h-3.5 text-orange-400" />;
      }
      return <Search className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div ref={containerRef} className="relative z-50">
        <form onSubmit={handleSearch} className={`flex items-center transition-all duration-300 ${search.isOpen || search.query ? 'w-96' : 'w-72'}`}>
            <div className="relative w-full group">
                {/* Thought Stream Placeholder (only visible when empty) */}
                {!search.query && !search.isOpen && (
                    <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-4 w-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={thoughtIndex}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 0.5 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="text-xs font-mono text-[#9d4edd] flex items-center gap-2"
                            >
                                <BrainCircuit className="w-3 h-3" />
                                {thoughts[thoughtIndex]}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="text"
                    value={search.query}
                    onChange={(e) => setSearchState({ query: e.target.value })}
                    onFocus={() => setSearchState({ isOpen: true })}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-full px-10 py-1.5 text-xs font-mono text-white focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd]/20 outline-none transition-all shadow-inner"
                    style={{ color: 'transparent', textShadow: '0 0 0 white' }} // Hack to keep text white but hide default placeholder
                />
                
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    {search.isSearching ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#9d4edd] animate-spin" />
                    ) : (
                        <Search className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#9d4edd] transition-colors" />
                    )}
                </div>
                
                {search.query && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="text-gray-500 hover:text-white transition-colors p-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </form>

        <AnimatePresence>
            {search.isOpen && (
                <MotionDiv
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-96 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-lg shadow-2xl overflow-hidden"
                >
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                         {/* SEARCH RESULTS */}
                         {search.results.length > 0 ? (
                             search.results.map((item, i) => (
                                 <button
                                    key={item.id}
                                    onClick={() => handleResultClick(item)}
                                    className="w-full text-left p-3 hover:bg-[#1f1f1f] border-b border-[#1f1f1f] last:border-0 group transition-colors flex items-start gap-3"
                                 >
                                     <div className="mt-0.5 p-1.5 rounded bg-[#111] border border-[#222] group-hover:border-[#444]">
                                         {getIcon(item.type, item.meta?.targetMode)}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="flex items-center justify-between mb-0.5">
                                             <span className="text-[11px] font-bold text-gray-200 group-hover:text-white truncate font-sans tracking-wide">
                                                 {item.title}
                                             </span>
                                             <span className="text-[8px] font-mono text-gray-600 uppercase border border-[#333] px-1 rounded">
                                                 {item.type}
                                             </span>
                                         </div>
                                         <p className="text-[9px] text-gray-500 font-mono line-clamp-2 leading-relaxed">
                                             {item.description}
                                         </p>
                                     </div>
                                     <ArrowRight className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-[#9d4edd] transition-all self-center transform -translate-x-2 group-hover:translate-x-0" />
                                 </button>
                             ))
                         ) : !search.isSearching && !search.query && search.history.length > 0 ? (
                             // HISTORY VIEW
                             <div>
                                 <div className="px-3 py-2 border-b border-[#1f1f1f] flex items-center justify-between">
                                     <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                         <History className="w-3 h-3" /> Recent Queries
                                     </span>
                                     <button onClick={clearHistory} className="text-[9px] text-gray-600 hover:text-red-500 transition-colors">CLEAR</button>
                                 </div>
                                 {search.history.map((hist, i) => (
                                     <button
                                         key={i}
                                         onClick={() => handleHistoryClick(hist)}
                                         className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] border-b border-[#1f1f1f] last:border-0 group transition-colors flex items-center justify-between"
                                     >
                                         <span className="text-[10px] font-mono text-gray-400 group-hover:text-white">{hist}</span>
                                         <ArrowRight className="w-2.5 h-2.5 text-gray-700 group-hover:text-[#9d4edd] opacity-0 group-hover:opacity-100 transition-all" />
                                     </button>
                                 ))}
                             </div>
                         ) : (
                             // EMPTY STATES
                             <div className="p-4 text-center text-[10px] text-gray-500 font-mono">
                                 {search.isSearching ? (
                                     <span className="flex items-center justify-center gap-2">
                                         <Loader2 className="w-3 h-3 animate-spin" /> Scanning Neural Index...
                                     </span>
                                 ) : (
                                     search.query ? "No results found." : "Enter query to search global index."
                                 )}
                             </div>
                         )}
                    </div>
                    
                    {/* FOOTER */}
                    <div className="px-3 py-1.5 bg-[#050505] border-t border-[#1f1f1f] flex justify-between items-center text-[9px] font-mono text-gray-600">
                        <span>Neural Index v2.1</span>
                        <div className="flex items-center gap-1">
                             <Command className="w-2.5 h-2.5" />
                             <span>+ K for Commands</span>
                        </div>
                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    </div>
  );
};

export default GlobalSearchBar;
