import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { performGlobalSearch, promptSelectKey } from '../services/geminiService';
import { AppMode, SearchResultItem } from '../types';
import { Search, Loader2, ArrowRight, Zap, Navigation, Map, Code, Image as ImageIcon, BookOpen, Activity, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const GlobalSearchBar: React.FC = () => {
  const { search, setSearchState, setMode, setCodeStudioState, setImageGenState } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!search.query.trim()) return;

      setSearchState({ isSearching: true, isOpen: true, results: [] });

      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) {
              await promptSelectKey();
              setSearchState({ isSearching: false });
              return;
          }

          const results = await performGlobalSearch(search.query);
          setSearchState({ results, isSearching: false });
      } catch (err) {
          console.error("Search failed", err);
          setSearchState({ isSearching: false });
      }
  };

  const handleResultClick = (item: SearchResultItem) => {
      // Execute the result action
      if (item.type === 'NAV' && item.meta?.targetMode) {
          const mode = AppMode[item.meta.targetMode as keyof typeof AppMode];
          if (mode) setMode(mode);
      } else if (item.type === 'ACTION') {
          if (item.meta?.targetMode === 'CODE_STUDIO' && item.meta?.payload) {
             setMode(AppMode.CODE_STUDIO);
             try {
                // If payload is a JSON string, parse it. If simple string, use directly.
                const payload = JSON.parse(item.meta.payload);
                if (payload.prompt) {
                     setCodeStudioState({ prompt: payload.prompt });
                }
             } catch(e) {
                 // Payload might be raw string
                 setCodeStudioState({ prompt: item.meta.payload });
             }
          } else if (item.meta?.targetMode === 'IMAGE_GEN' && item.meta?.payload) {
             setMode(AppMode.IMAGE_GEN);
             try {
                 const payload = JSON.parse(item.meta.payload);
                 setImageGenState({ prompt: payload.prompt || item.meta.payload });
             } catch(e) {
                 setImageGenState({ prompt: item.meta.payload });
             }
          }
      }
      
      setSearchState({ isOpen: false, query: '' });
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
        <form onSubmit={handleSearch} className={`flex items-center transition-all duration-300 ${search.isOpen || search.query ? 'w-80' : 'w-64'}`}>
            <div className="relative w-full group">
                <input
                    ref={inputRef}
                    type="text"
                    value={search.query}
                    onChange={(e) => setSearchState({ query: e.target.value })}
                    onFocus={() => setSearchState({ isOpen: true })}
                    placeholder="Search systems..."
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-full px-10 py-1.5 text-xs font-mono text-white placeholder:text-gray-600 focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd]/20 outline-none transition-all shadow-inner"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    {search.isSearching ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#9d4edd] animate-spin" />
                    ) : (
                        <Search className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#9d4edd] transition-colors" />
                    )}
                </div>
                {search.query && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-mono hidden group-focus-within:block">
                        ENTER
                    </div>
                )}
            </div>
        </form>

        <AnimatePresence>
            {search.isOpen && (search.results.length > 0 || search.isSearching) && (
                <MotionDiv
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-lg shadow-2xl overflow-hidden"
                >
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                         {search.results.map((item, i) => (
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
                         ))}
                         
                         {search.results.length === 0 && !search.isSearching && (
                             <div className="p-4 text-center text-[10px] text-gray-500 font-mono">
                                 No results found for query.
                             </div>
                         )}
                    </div>
                    <div className="px-3 py-1.5 bg-[#050505] border-t border-[#1f1f1f] flex justify-between items-center text-[9px] font-mono text-gray-600">
                        <span>Neural Index</span>
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