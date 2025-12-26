import React, { useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronUp, ChevronDown, ChevronRight, CheckCircle2, Loader2, GitBranch, Square, Sparkles, Target, Zap, Activity, Split } from 'lucide-react';
import { audio } from '../services/audioService';

const ResearchTray: React.FC = () => {
    const { research, cancelResearchTask, addResearchTask, addLog } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const activeTasks = research.tasks.filter(t => ['QUEUED', 'PLANNING', 'SEARCHING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status));
    const completedTasks = research.tasks.filter(t => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(t.status));
    
    React.useEffect(() => { if (activeTasks.length > 0) setIsExpanded(true); }, [activeTasks.length]);

    const handleBranch = (fact: string, parentId: string) => {
        const safeFact = fact || 'Neural Anchor Investigation';
        const newQuery = `Strategic Branch: ${safeFact.substring(0, 50)}...`;
        addLog('SUCCESS', `LATTICE_BRANCH: mission vector initialized from finding.`);
        addResearchTask({
            id: crypto.randomUUID(),
            query: newQuery,
            status: 'QUEUED',
            progress: 0,
            logs: [`Spawning recursive branch from Node_ID: ${parentId.substring(0, 8)}`],
            timestamp: Date.now()
        });
        audio.playTransition();
    };

    if (research.tasks.length === 0) return null;

    return (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-24 right-8 z-[140] w-[400px] flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_40px_120px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col group/tray">
                
                {/* Header Strip */}
                <div 
                    onClick={() => { setIsExpanded(!isExpanded); audio.playClick(); }} 
                    className="h-14 flex items-center justify-between px-6 bg-[#111] hover:bg-[#1a1a1a] cursor-pointer transition-all border-b border-white/5 relative shrink-0"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg border transition-all ${activeTasks.length > 0 ? 'bg-[#9d4edd]/20 text-[#9d4edd] border-[#9d4edd]/30 animate-pulse' : 'bg-white/5 border-transparent text-gray-600'}`}>
                            <BrainCircuit className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.2em]">Research Swarm</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${activeTasks.length > 0 ? 'bg-[#10b981]' : 'bg-gray-800'}`} />
                                <span className="text-[7px] text-gray-500 font-mono uppercase tracking-widest">{activeTasks.length} Operations Active</span>
                            </div>
                        </div>
                    </div>
                    {isExpanded ? <ChevronDown size={18} className="text-gray-600" /> : <ChevronUp size={18} className="text-gray-600" />}
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-[#050505] overflow-hidden flex flex-col">
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-5 space-y-4">
                                {activeTasks.map(task => (
                                    <div key={task.id} className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-5 shadow-inner relative overflow-hidden group/task">
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover/task:opacity-[0.05] transition-opacity rotate-12"><Target size={60} /></div>
                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <span className="text-[11px] font-black text-white truncate max-w-[260px] flex items-center gap-3 uppercase font-mono leading-none">
                                                {task.status === 'SWARM_VERIFY' ? <GitBranch className="w-4 h-4 text-[#f59e0b] animate-pulse" /> : <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" />}
                                                {task.query}
                                            </span>
                                            <button onClick={() => { cancelResearchTask(task.id); audio.playError(); }} className="p-1.5 text-gray-700 hover:text-red-500 transition-colors bg-white/5 rounded-lg"><Square size={12} fill="currentColor" /></button>
                                        </div>
                                        <div className="w-full bg-[#111] h-1 rounded-full overflow-hidden mb-3 shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_10px_#9d4edd]" />
                                        </div>
                                        <div className="flex items-center gap-2 relative z-10">
                                            <Activity size={10} className="text-gray-700" />
                                            <span className="text-[8px] text-gray-600 font-mono truncate uppercase tracking-widest leading-none">
                                                {task.logs[task.logs.length-1]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                
                                {completedTasks.map(task => (
                                    <div key={task.id} className={`bg-[#080808] border rounded-2xl transition-all duration-500 ${selectedTaskId === task.id ? 'border-[#9d4edd]/40 bg-[#9d4edd]/5' : 'border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'}`}>
                                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => { setSelectedTaskId(selectedTaskId === task.id ? null : task.id); audio.playClick(); }}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2 bg-[#10b981]/10 rounded-lg"><CheckCircle2 size={16} className="text-[#10b981]" /></div>
                                                <span className="text-[10px] font-black text-gray-300 truncate uppercase font-mono tracking-widest">{task.query}</span>
                                            </div>
                                            <ChevronRight size={14} className={`text-gray-700 transition-transform duration-500 ${selectedTaskId === task.id ? 'rotate-90 text-[#9d4edd]' : ''}`} />
                                        </div>
                                        
                                        <AnimatePresence>
                                            {selectedTaskId === task.id && task.findings && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4 space-y-3 overflow-hidden">
                                                    <div className="h-px bg-white/5 mb-3" />
                                                    <div className="flex items-center gap-2 px-1 mb-2">
                                                        <Zap size={10} className="text-[#f59e0b]" />
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Crystallized intelligence</span>
                                                    </div>
                                                    {task.findings.slice(0, 3).map((f: any, i: number) => (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handleBranch(f.fact, task.id)} 
                                                            className="w-full text-left p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#9d4edd]/30 transition-all group relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <p className="text-[10px] text-gray-400 font-mono leading-relaxed group-hover:text-white transition-colors relative z-10 line-clamp-2">"{f.fact || 'Discrete logic finding recorded.'}"</p>
                                                            <div className="mt-2 text-[7px] text-[#9d4edd] opacity-0 group-hover:opacity-100 flex items-center gap-2 font-black uppercase tracking-[0.3em] transition-all relative z-10">
                                                                <Split size={10} className="animate-pulse" /> Sprout Mission Vector
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {task.findings.length === 0 && (
                                                        <div className="py-4 text-center opacity-20 text-[9px] font-mono uppercase italic">Synthesis buffer null</div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}

                                {research.tasks.length === 0 && (
                                    <div className="py-16 text-center opacity-10 flex flex-col items-center gap-5 grayscale scale-110">
                                        <BrainCircuit size={48} className="text-gray-500 animate-[spin_40s_linear_infinite]" />
                                        <span className="text-[10px] font-mono uppercase tracking-[0.5em] text-white">Lattice Standing By</span>
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