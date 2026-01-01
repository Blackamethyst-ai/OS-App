
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { performGlobalSearch, promptSelectKey } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { AppMode, SearchResultItem } from '../types';
import { 
    Search, Loader2, ArrowRight, X, History, 
    Command, BrainCircuit, Globe, Database, 
    Zap, Terminal, Sparkles, Filter, Trash2, Clock,
    Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

const MotionDiv = motion.div as any;

// Mock Internal Commands based on AppMode
const SYSTEM_COMMANDS = [
    { id: 'nav-eco', title: 'Open Ecosystem Hub', description: 'Switch focus to Dashboard sector.', category: 'COMMANDS', type: 'NAV', target: AppMode.METAVENTIONS_HUB },
    { id: 'nav-logic', title: 'Open Logic Studio', description: 'Switch focus to Code sector.', category: 'COMMANDS', type: 'NAV', target: AppMode.CODE_STUDIO },
    { id: 'nav-vault', title: 'Open Neural Vault', description: 'Switch focus to Memory sector.', category: 'COMMANDS', type: 'NAV', target: AppMode.MEMORY_CORE },
    { id: 'nav-topo', title: 'Open Topology Map', description: 'Switch focus to Process sector.', category: 'COMMANDS', type: 'NAV', target: AppMode.PROCESS_MAP },
    { id: 'sys-term', title: 'Toggle Kernel Terminal', description: 'Open Quake-style root terminal.', category: 'COMMANDS', type: 'ACTION', action: 'TERMINAL' },
];

const FilterChip = ({ label, active, onClick, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border shrink-0",
            active 
                ? "bg-[#9d4edd] border-[#9d4edd] text-black shadow-[0_0_15px_rgba(157,78,221,0.4)]" 
                : "bg-black/40 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
        )}
    >
        <Icon size={10} />
        {label}
    </button>
);

const GlobalSearchBar: React.FC = () => {
  const { search, actions } = useAppStore();
  const { setSearchState, setMode, addLog, toggleTerminal } = actions;
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- Search Persistence Logic ---
  const addToHistory = useCallback((q: string) => {
      const cleanQ = q?.trim();
      if (!cleanQ) return;
      const newHistory = [cleanQ, ...search.history.filter((h: string) => h !== cleanQ)].slice(0, 10);
      setSearchState({ history: newHistory });
      localStorage.setItem('global_search_history', JSON.stringify(newHistory));
  }, [search.history, setSearchState]);

  const clearHistory = () => {
      setSearchState({ history: [] });
      localStorage.removeItem('global_search_history');
      audio.playClick();
  };

  // --- Heuristic & Vector Search Logic ---
  const executeSearch = useCallback(async (q: string) => {
      if (!q.trim() || q.length < 2) {
          setSearchState({ results: [], isSearching: false });
          return;
      }

      setSearchState({ isSearching: true, isOpen: true });
      let finalResults: any[] = [];

      try {
          // 1. Local Command Logic (Category: COMMANDS)
          if (search.filter === 'ALL' || search.filter === 'COMMANDS') {
              const cmdMatches = SYSTEM_COMMANDS.filter(cmd => 
                cmd.title.toLowerCase().includes(q.toLowerCase()) || 
                cmd.description.toLowerCase().includes(q.toLowerCase())
              );
              finalResults.push(...cmdMatches.map(c => ({ ...c, type: 'CMD' })));
          }

          // 2. Vector Memory Logic (Category: MEMORY)
          if (search.filter === 'ALL' || search.filter === 'MEMORY') {
              const queryVector = await (window as any).geminiInternal?.generateEmbedding?.(q) || [];
              if (queryVector.length > 0) {
                  const matches = await neuralVault.searchVectors(queryVector, 5);
                  for (const match of matches) {
                      const art = await neuralVault.getArtifact(match.id);
                      if (art) {
                          finalResults.push({
                              id: art.id,
                              title: art.name,
                              description: art.analysis?.summary || 'Artifact fragment.',
                              category: 'MEMORY',
                              type: 'ART',
                              meta: { score: match.score }
                          });
                      }
                  }
              }
          }

          // 3. Grounded Intelligence (Category: WORLD)
          if (search.filter === 'ALL' || search.filter === 'WORLD') {
              if (q.length > 3) {
                  const worldResults = await performGlobalSearch(q);
                  finalResults.push(...worldResults.map(r => ({ ...r, category: 'WORLD', type: 'WEB' })));
              }
          }

          setSearchState({ results: finalResults, isSearching: false });
          setSelectedIndex(0);
      } catch (err) {
          console.error("Search Fail", err);
          setSearchState({ isSearching: false });
      }
  }, [search.filter, setSearchState]);

  // --- Adaptive Debouncing ---
  useEffect(() => {
      if (!search.query || search.query.length < 2) {
          setSearchState({ results: [], isOpen: search.isOpen });
          setValidationError(search.query.length === 1 ? 'Query too brief' : null);
          return;
      }
      setValidationError(null);
      const timer = setTimeout(() => executeSearch(search.query), 400);
      return () => clearTimeout(timer);
  }, [search.query, executeSearch, setSearchState, search.isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchState({ isOpen: false });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setSearchState]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!search.isOpen) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(1, search.results.length));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + search.results.length) % Math.max(1, search.results.length));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (search.results[selectedIndex]) {
              handleResultClick(search.results[selectedIndex]);
          } else {
              executeSearch(search.query);
              addToHistory(search.query);
          }
      } else if (e.key === 'Escape') {
          setSearchState({ isOpen: false });
      }
  };

  const handleResultClick = (item: any) => {
      addToHistory(search.query);
      if (item.type === 'CMD') {
          if (item.action === 'TERMINAL') toggleTerminal(true);
          if (item.target) setMode(item.target);
      } else if (item.type === 'ART') {
          setMode(AppMode.MEMORY_CORE);
      } else if (item.type === 'WEB') {
          window.open(item.meta?.sources?.[0]?.uri, '_blank');
      }
      setSearchState({ isOpen: false });
      audio.playTransition();
  };

  return (
    <div ref={containerRef} className="relative z-50 flex items-center h-full">
        <form onSubmit={e => e.preventDefault()} className="flex items-center w-80">
            <div className="relative w-full group">
                <input
                    ref={inputRef}
                    type="text"
                    value={search.query || ''}
                    onChange={(e) => setSearchState({ query: e.target.value })}
                    onFocus={() => setSearchState({ isOpen: true })}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "w-full bg-black/40 border rounded-full px-12 py-2 text-[10px] font-mono text-white outline-none transition-all shadow-inner",
                        validationError ? "border-red-500/50" : "border-white/10 focus:border-[#9d4edd] group-hover:border-white/20"
                    )}
                    placeholder="Locate intelligence..."
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    {search.isSearching ? <Loader2 className="w-3.5 h-3.5 text-[#9d4edd] animate-spin" /> : <Search className="w-3.5 h-3.5 text-gray-500" />}
                </div>
                
                {/* Validation Feedback */}
                <AnimatePresence>
                    {validationError && (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0 }}
                            className="absolute right-12 top-1/2 -translate-y-1/2 text-[7px] font-black text-red-500 uppercase tracking-tighter"
                        >
                            {validationError}
                        </motion.div>
                    )}
                </AnimatePresence>

                {search.query && (
                    <button 
                        onClick={() => setSearchState({ query: '' })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
        </form>

        <AnimatePresence>
            {search.isOpen && (
                <MotionDiv 
                    initial={{ opacity: 0, y: 15, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 10, scale: 0.98 }} 
                    className="absolute top-full right-0 mt-4 w-[420px] bg-[#0a0a0a]/98 backdrop-blur-4xl border border-white/10 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
                >
                    {/* Header: Filters */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <FilterChip label="ALL" icon={Layers} active={search.filter === 'ALL'} onClick={() => setSearchState({ filter: 'ALL' })} />
                            <FilterChip label="COMMANDS" icon={Terminal} active={search.filter === 'COMMANDS'} onClick={() => setSearchState({ filter: 'COMMANDS' })} />
                            <FilterChip label="MEMORY" icon={Database} active={search.filter === 'MEMORY'} onClick={() => setSearchState({ filter: 'MEMORY' })} />
                            <FilterChip label="WORLD" icon={Globe} active={search.filter === 'WORLD'} onClick={() => setSearchState({ filter: 'WORLD' })} />
                        </div>
                    </div>

                    <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                         {search.results.length > 0 ? (
                             <div className="py-2">
                                 {search.results.map((item: any, i: number) => (
                                     <button 
                                        key={item.id} 
                                        onClick={() => handleResultClick(item)} 
                                        onMouseEnter={() => setSelectedIndex(i)}
                                        className={cn(
                                            "w-full text-left px-5 py-4 border-b border-white/5 flex items-start gap-5 transition-all relative group/res",
                                            selectedIndex === i ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                                        )}
                                     >
                                         {selectedIndex === i && <motion.div layoutId="search-active" className="absolute left-0 top-0 bottom-0 w-1 bg-[#9d4edd] shadow-[0_0_15px_#9d4edd]" />}
                                         
                                         <div className={cn(
                                             "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                                             selectedIndex === i ? "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd]" : "bg-black/40 border-white/10 text-gray-700"
                                         )}>
                                             {item.category === 'COMMANDS' ? <Terminal size={18} /> : 
                                              item.category === 'MEMORY' ? <Database size={18} /> : 
                                              <Globe size={18} />}
                                         </div>

                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between mb-1">
                                                 <span className="text-[11px] font-black text-gray-200 truncate uppercase tracking-tight group-hover/res:text-white">{item.title}</span>
                                                 <span className="text-[7px] font-mono text-gray-600 font-bold uppercase border border-white/5 px-1.5 py-0.5 rounded-sm">
                                                     {item.category}
                                                 </span>
                                             </div>
                                             <p className="text-[9px] text-gray-500 font-mono line-clamp-1 leading-relaxed">{item.description}</p>
                                         </div>
                                         <ArrowRight className={cn("w-4 h-4 mt-1 transition-all", selectedIndex === i ? "text-[#9d4edd] translate-x-0" : "text-gray-800 -translate-x-2")} />
                                     </button>
                                 ))}
                             </div>
                         ) : search.query && !search.isSearching ? (
                             <div className="p-16 text-center flex flex-col items-center gap-6 opacity-40">
                                 <div className="w-16 h-16 rounded-full border border-dashed border-gray-700 flex items-center justify-center">
                                     <Search size={24} className="text-gray-600" />
                                 </div>
                                 <div className="space-y-1">
                                     <p className="text-[10px] font-mono uppercase tracking-[0.5em]">No logical matches</p>
                                     <p className="text-[8px] font-mono text-gray-600 uppercase">Sector: {search.filter}</p>
                                 </div>
                             </div>
                         ) : search.history.length > 0 && !search.query ? (
                             <div className="bg-black/20">
                                 <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-widest bg-white/[0.02]">
                                     <span className="flex items-center gap-2"><History size={10}/> Recent Temporal Signals</span>
                                     <button onClick={clearHistory} className="hover:text-red-500 transition-colors flex items-center gap-1.5">
                                         <Trash2 size={10} /> Purge
                                     </button>
                                 </div>
                                 {search.history.map((hist: string, i: number) => (
                                     <button 
                                        key={i} 
                                        onClick={() => setSearchState({ query: hist })} 
                                        className="w-full text-left px-5 py-3.5 hover:bg-white/[0.05] text-[10px] font-mono text-gray-400 flex items-center gap-4 transition-colors border-b border-white/5 group/hist"
                                     >
                                         <Clock size={12} className="text-gray-700 group-hover/hist:text-[#22d3ee]" />
                                         <span className="flex-1 truncate">{hist}</span>
                                         <ArrowRight size={10} className="text-gray-800 opacity-0 group-hover/hist:opacity-100 -translate-x-2 group-hover/hist:translate-x-0 transition-all" />
                                     </button>
                                 ))}
                             </div>
                         ) : (
                             <div className="p-16 text-center space-y-8">
                                 <div className="relative inline-block">
                                     <BrainCircuit size={64} className="text-[#9d4edd] opacity-20 animate-pulse" />
                                     <div className="absolute inset-0 blur-2xl bg-[#9d4edd]/10 rounded-full" />
                                 </div>
                                 <div className="space-y-2">
                                     <p className="text-[11px] font-black font-mono text-gray-500 uppercase tracking-[0.6em]">System Oracle Idle</p>
                                     <p className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Awaiting Command Vector Influx</p>
                                 </div>
                                 <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                                     {['Lattice Topology', 'Vault Archetypes', 'Grounded World Search'].map(tag => (
                                         <span key={tag} className="text-[7px] font-black font-mono text-gray-800 border border-white/5 px-2 py-0.5 rounded uppercase">{tag}</span>
                                     ))}
                                 </div>
                             </div>
                         )}
                    </div>
                    
                    {/* Footer HUD info */}
                    <div className="p-3 bg-white/[0.01] border-t border-white/5 flex justify-between items-center px-6">
                        <div className="flex gap-4 items-center">
                            <span className="flex items-center gap-1.5 text-[8px] font-mono text-gray-600">
                                <Zap size={10} className="text-[#f1c21b]" /> Debounce: 400ms
                            </span>
                            <span className="flex items-center gap-1.5 text-[8px] font-mono text-gray-600">
                                <Terminal size={10} className="text-[#9d4edd]" /> Heuristics: OK
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-1.5 py-0.5 bg-black rounded text-[7px] font-mono text-gray-500">ESC to Close</span>
                            <span className="px-1.5 py-0.5 bg-[#9d4edd]/20 text-[#9d4edd] border border-[#9d4edd]/30 rounded text-[7px] font-bold">ENTER to Sync</span>
                        </div>
                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    </div>
  );
};

export default GlobalSearchBar;
