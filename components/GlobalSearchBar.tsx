import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { performGlobalSearch, promptSelectKey } from '../services/geminiService';
import { AppMode, SearchResultItem } from '../types';
import { Search, Loader2, ArrowRight, X, History, Command, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const GlobalSearchBar: React.FC = () => {
  const { search, setSearchState, setMode } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const thoughts = ["Indexing Neural Vault...", "Querying Sovereign Memory...", "Vectorizing intent..."];
  const [thoughtIndex, setThoughtIndex] = useState(0);

  useEffect(() => {
      const interval = setInterval(() => setThoughtIndex(prev => (prev + 1) % thoughts.length), 4000);
      return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchState({ isOpen: false });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setSearchState]);

  useEffect(() => {
      const savedHistory = localStorage.getItem('global_search_history');
      if (savedHistory) {
          try { setSearchState({ history: JSON.parse(savedHistory) }); } catch(e) {}
      }
  }, [setSearchState]);

  const addToHistory = (q: string) => {
      const cleanQ = q?.trim();
      if (!cleanQ) return;
      const newHistory = [cleanQ, ...search.history.filter((h: string) => h !== cleanQ)].slice(0, 10);
      setSearchState({ history: newHistory });
      localStorage.setItem('global_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      const rawQuery = search.query || '';
      if (!rawQuery.trim()) return;
      
      addToHistory(rawQuery);
      setSearchState({ isSearching: true, isOpen: true, results: [] });
      
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) { await promptSelectKey(); setSearchState({ isSearching: false }); return; }
          const results = await performGlobalSearch(rawQuery);
          setSearchState({ results, isSearching: false });
      } catch (err) { setSearchState({ isSearching: false }); }
  };

  const handleResultClick = (item: SearchResultItem) => {
      if (item.type === 'NAV' && item.meta?.targetMode) {
          const mode = AppMode[item.meta.targetMode as keyof typeof AppMode];
          if (mode) setMode(mode);
      }
      setSearchState({ isOpen: false });
  };

  return (
    <div ref={containerRef} className="relative z-50 flex items-center h-full">
        <form onSubmit={handleSearch} className="flex items-center w-80">
            <div className="relative w-full group">
                <input
                    ref={inputRef}
                    type="text"
                    value={search.query || ''}
                    onChange={(e) => setSearchState({ query: e.target.value })}
                    onFocus={() => setSearchState({ isOpen: true })}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-full px-12 py-2 text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none transition-all shadow-inner"
                    placeholder="Search systems..."
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    {search.isSearching ? <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" /> : <Search className="w-4 h-4 text-gray-500" />}
                </div>
            </div>
        </form>

        <AnimatePresence>
            {search.isOpen && (
                <MotionDiv initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 mt-4 w-96 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] rounded-2xl shadow-2xl overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                         {search.results.length > 0 ? (
                             search.results.map((item: any) => (
                                 <button key={item.id} onClick={() => handleResultClick(item)} className="w-full text-left p-4 hover:bg-[#1f1f1f] border-b border-[#1f1f1f] flex items-start gap-4">
                                     <div className="flex-1 min-w-0">
                                         <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-gray-200 truncate">{item.title}</span></div>
                                         <p className="text-[10px] text-gray-500 font-mono line-clamp-1">{item.description}</p>
                                     </div>
                                     <ArrowRight className="w-4 h-4 text-gray-600" />
                                 </button>
                             ))
                         ) : search.history.length > 0 && !search.query ? (
                             <div>
                                 <div className="px-4 py-3 border-b border-[#1f1f1f] text-[10px] font-mono text-gray-500 uppercase tracking-widest bg-white/5">Recent Queries</div>
                                 {search.history.map((hist: string, i: number) => (
                                     <button key={i} onClick={() => { setSearchState({ query: hist }); handleSearch(); }} className="w-full text-left px-4 py-3 hover:bg-[#1f1f1f] text-[11px] font-mono text-gray-400 flex items-center gap-3 transition-colors border-b border-[#1f1f1f] last:border-0"><History size(12) className="text-gray-600"/>{hist}</button>
                                 ))}
                             </div>
                         ) : (
                             <div className="p-12 text-center text-xs text-gray-500 font-mono opacity-50">No results identified in current sector</div>
                         )}
                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    </div>
  );
};

export default GlobalSearchBar;