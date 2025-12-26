import React, { useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronUp, ChevronDown, ChevronRight, CheckCircle2, Loader2, GitBranch, Square, Sparkles } from 'lucide-react';
import { audio } from '../services/audioService';

const ResearchTray: React.FC = () => {
    const { research, cancelResearchTask, addResearchTask, addLog } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const activeTasks = research.tasks.filter(t => ['QUEUED', 'PLANNING', 'SEARCHING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status));
    const completedTasks = research.tasks.filter(t => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(t.status));
    
    React.useEffect(() => { if (activeTasks.length > 0) setIsExpanded(true); }, [activeTasks.length]);

    const handleBranch = (fact: string, parentId: string) => {
        const safeFact = fact || 'Unknown Finding';
        const newQuery = `Strategic Investigation: ${safeFact.substring(0, 60)}...`;
        addLog('SUCCESS', `LATTICE_BRANCH: New mission initialized from neural finding.`);
        addResearchTask({
            id: crypto.randomUUID(),
            query: newQuery,
            status: 'QUEUED',
            progress: 0,
            logs: [`Branched from parent vector: ${parentId.substring(0, 8)}`],
            timestamp: Date.now()
        });
        audio.playTransition();
    };

    if (research.tasks.length === 0) return null;

    return (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-24 right-8 z-[140] w-96 flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                <div 
                    onClick={() => { setIsExpanded(!isExpanded); audio.playClick(); }} 
                    className="h-14 flex items-center justify-between px-6 bg-[#111] hover:bg-[#1a1a1a] cursor-pointer transition-all border-b border-white/5"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-1.5 rounded-lg ${activeTasks.length > 0 ? 'bg-[#9d4edd]/20 text-[#9d4edd] animate-pulse shadow-[0_0_15px_#9d4edd22]' : 'bg-[#333] text-gray-500'}`}>
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest">Research Swarm ({activeTasks.length})</span>
                    </div>
                    {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronUp size={18} className="text-gray-500" />}
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-[#050505] overflow-hidden">
                            <div className="max-h-[520px] overflow-y-auto custom-scrollbar p-3 space-y-3">
                                {activeTasks.map(task => (
                                    <div key={task.id} className="bg-[#111] border border-white/5 rounded-xl p-4 shadow-inner relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[11px] font-bold text-white truncate max-w-[220px] flex items-center gap-3 uppercase font-mono tracking-tight">
                                                {task.status === 'SWARM_VERIFY' ? <GitBranch className="w-4 h-4 text-[#f59e0b] animate-pulse" /> : <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" />}
                                                {task.query}
                                            </span>
                                            <button onClick={() => { cancelResearchTask(task.id); audio.playError(); }} className="text-gray-600 hover:text-red-500 transition-colors"><Square size={14} fill="currentColor" /></button>
                                        </div>
                                        <div className="w-full bg-[#222] h-1 rounded-full overflow-hidden mb-2 shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} className="h-full bg-[#9d4edd] shadow-[0_0_10px_#9d4edd]" />
                                        </div>
                                        <div className="text-[9px] text-gray-500 font-mono truncate uppercase tracking-tighter">
                                            {task.logs[task.logs.length-1]}
                                        </div>
                                    </div>
                                ))}
                                
                                {completedTasks.map(task => (
                                    <div key={task.id} className={`bg-[#0a0a0a] border rounded-xl p-4 transition-all duration-500 ${selectedTaskId === task.id ? 'border-[#9d4edd]/60 bg-[#9d4edd]/5' : 'border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'}`}>
                                        <div className="flex justify-between items-center cursor-pointer" onClick={() => { setSelectedTaskId(selectedTaskId === task.id ? null : task.id); audio.playClick(); }}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <CheckCircle2 size={16} className="text-[#10b981] shrink-0" />
                                                <span className="text-[11px] font-bold text-gray-300 truncate uppercase font-mono tracking-tight">{task.query}</span>
                                            </div>
                                            <ChevronRight size={14} className={`text-gray-700 transition-transform ${selectedTaskId === task.id ? 'rotate-90' : ''}`} />
                                        </div>
                                        
                                        <AnimatePresence>
                                            {selectedTaskId === task.id && task.findings && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/5 space-y-3 overflow-hidden">
                                                    <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest px-1">Atomic Findings // Divergent Paths</div>
                                                    {task.findings.slice(0, 4).map((f: any, i: number) => (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handleBranch(f.fact, task.id)} 
                                                            className="w-full text-left p-3 rounded-xl bg-black/40 border border-white/5 hover:border-[#9d4edd]/50 transition-all group relative overflow-hidden"
                                                        >
                                                            <p className="text-[10px] text-gray-400 font-mono line-clamp-2 leading-relaxed italic group-hover:text-white transition-colors">"{f.fact || 'Null pointer finding.'}"</p>
                                                            <div className="mt-2 text-[8px] text-[#9d4edd] opacity-0 group-hover:opacity-100 flex items-center gap-2 font-black uppercase tracking-widest transition-all">
                                                                <Sparkles size={10} /> Branch Vector
                                                            </div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}

                                {research.tasks.length === 0 && (
                                    <div className="py-12 text-center opacity-10 flex flex-col items-center gap-4">
                                        <BrainCircuit size={40} />
                                        <span className="text-[10px] font-mono uppercase">Neural standby</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ResearchTray;