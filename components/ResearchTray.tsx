import React, { useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, FileText, GitBranch, Target, Square, ListTodo, CircleDashed, CheckCircle, Eye, Share2, Sparkles } from 'lucide-react';
import { AppMode } from '../types';
import { audio } from '../services/audioService';

const ResearchTray: React.FC = () => {
    const { research, updateResearchTask, removeResearchTask, cancelResearchTask, openHoloProjector, addResearchTask, addLog, setMode, setBibliomorphicState } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const activeTasks = research.tasks.filter(t => ['QUEUED', 'PLANNING', 'SEARCHING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status));
    const completedTasks = research.tasks.filter(t => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(t.status));
    
    React.useEffect(() => { if (activeTasks.length > 0) setIsExpanded(true); }, [activeTasks.length]);

    const handleBranch = (fact: string, parentId: string) => {
        const safeFact = fact || 'Unknown Finding';
        const newQuery = `Deep investigation into: ${safeFact.substring(0, 50)}...`;
        addLog('SUCCESS', `LATTICE_BRANCH: New investigation initialized from finding.`);
        addResearchTask({
            id: crypto.randomUUID(),
            query: newQuery,
            status: 'QUEUED',
            progress: 0,
            logs: [`Branched from Task ID: ${(parentId || '').substring(0, 8)}`],
            timestamp: Date.now()
        });
        audio.playTransition();
    };

    if (research.tasks.length === 0) return null;

    return (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 right-6 z-50 w-96 flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl overflow-hidden">
                <div onClick={() => setIsExpanded(!isExpanded)} className="h-10 flex items-center justify-between px-4 bg-[#111] hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${activeTasks.length > 0 ? 'bg-[#9d4edd]/20 text-[#9d4edd] animate-pulse' : 'bg-[#333] text-gray-500'}`}><BrainCircuit className="w-4 h-4" /></div>
                        <span className="text-xs font-bold font-mono text-white uppercase tracking-wider">Research Swarm ({activeTasks.length})</span>
                    </div>
                    {isExpanded ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-[#050505] border-t border-[#1f1f1f]">
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {activeTasks.map(task => (
                                    <div key={task.id} className="bg-[#111] border border-[#222] rounded p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-white truncate max-w-[200px] flex items-center gap-2">{task.status === 'SWARM_VERIFY' ? <GitBranch className="w-3 h-3 text-[#f59e0b] animate-pulse" /> : <Loader2 className="w-3 h-3 text-[#9d4edd] animate-spin" />}{task.query}</span>
                                            <button onClick={(e) => cancelResearchTask(task.id)} className="text-gray-500 hover:text-red-500"><Square size={12} fill="currentColor"/></button>
                                        </div>
                                        <div className="w-full bg-[#222] h-1 rounded-full overflow-hidden mb-1"><div className="h-full bg-[#9d4edd]" style={{ width: `${task.progress}%` }} /></div>
                                        <div className="text-[8px] text-gray-600 font-mono truncate">{task.logs[task.logs.length-1]}</div>
                                    </div>
                                ))}
                                {completedTasks.map(task => (
                                    <div key={task.id} className={`bg-[#111] border rounded p-3 ${selectedTaskId === task.id ? 'border-[#9d4edd]' : 'border-[#222]'}`}>
                                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}>
                                            <span className="text-[10px] font-bold text-gray-300 truncate max-w-[200px] uppercase font-mono">{task.query}</span>
                                            <CheckCircle2 size={12} className="text-[#42be65]" />
                                        </div>
                                        <AnimatePresence>
                                            {selectedTaskId === task.id && task.findings && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="mt-3 pt-3 border-t border-[#222] space-y-2 overflow-hidden">
                                                    {task.findings.slice(0, 3).map((f: any, i: number) => (
                                                        <button key={i} onClick={() => handleBranch(f.fact, task.id)} className="w-full text-left p-2 rounded bg-black border border-[#222] hover:border-[#9d4edd] transition-all group">
                                                            <p className="text-[9px] text-gray-400 font-mono line-clamp-2 italic">"{f.fact || 'Empty data point'}"</p>
                                                            <div className="mt-1 text-[7px] text-[#9d4edd] opacity-0 group-hover:opacity-100 flex items-center gap-1 font-black uppercase tracking-widest"><Sparkles size={8}/> Branch This Vector</div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ResearchTray;
