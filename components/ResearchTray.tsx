import React, { useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, FileText, GitBranch, Target, Square, ListTodo, CircleDashed, CheckCircle, Eye } from 'lucide-react';
import { AppMode } from '../types';

const ResearchTray: React.FC = () => {
    const { research, updateResearchTask, removeResearchTask, cancelResearchTask, openHoloProjector, addResearchTask, addLog, setMode, setBibliomorphicState } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const activeTasks = research.tasks.filter(t => ['QUEUED', 'PLANNING', 'SEARCHING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status));
    const completedTasks = research.tasks.filter(t => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(t.status));
    
    React.useEffect(() => {
        if (activeTasks.length > 0) setIsExpanded(true);
    }, [activeTasks.length]);

    if (research.tasks.length === 0) return null;

    const handleViewReport = (task: any) => {
        openHoloProjector({
            id: `report-${task.id}`,
            type: 'TEXT',
            title: `Research Report: ${(task.query || '').substring(0, 20)}...`,
            content: task.result || "No content generated."
        });
    };

    const handleBranch = (fact: string, parentId: string) => {
        const safeFact = String(fact || '');
        const newQuery = `Deep dive: ${safeFact.substring(0, 60)}...`;
        addLog('SYSTEM', `RESEARCH_BRANCH: Pivoting agent to new vector.`);
        addResearchTask({
            id: crypto.randomUUID(),
            query: newQuery,
            status: 'QUEUED',
            progress: 0,
            logs: [`Spawned from Task ID: ${String(parentId || '').substring(0,8)}`, `Vector: ${safeFact}`],
            timestamp: Date.now()
        });
    };

    const handleCancel = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        cancelResearchTask(id);
    };

    const toggleSelection = (id: string) => {
        setSelectedTaskId(selectedTaskId === id ? null : id);
    };

    const viewSwarm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMode(AppMode.BIBLIOMORPHIC);
        setBibliomorphicState({ activeTab: 'bicameral' });
    };

    return (
        <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 right-6 z-50 w-96 flex flex-col gap-2 pointer-events-none"
        >
            <div className="pointer-events-auto bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl overflow-hidden">
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-10 flex items-center justify-between px-4 bg-[#111] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${activeTasks.length > 0 ? 'bg-[#9d4edd]/20 text-[#9d4edd] animate-pulse' : 'bg-[#333] text-gray-500'}`}>
                            <BrainCircuit className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                            Deep Research ({activeTasks.length})
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-[#050505] border-t border-[#1f1f1f]">
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {activeTasks.map(task => (
                                    <div key={task.id} className="bg-[#111] border border-[#222] rounded p-3 relative group transition-colors hover:border-[#9d4edd]/50 cursor-pointer" onClick={() => toggleSelection(task.id)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-white truncate max-w-[200px] flex items-center gap-2">
                                                {task.status === 'SWARM_VERIFY' ? <GitBranch className="w-3 h-3 text-[#f59e0b] animate-pulse" /> : <Loader2 className="w-3 h-3 text-[#9d4edd] animate-spin" />}
                                                {task.query}
                                            </span>
                                            <button onClick={(e) => handleCancel(e, task.id)} className="text-gray-500 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors" title="Cancel Task"><Square className="w-3 h-3 fill-current" /></button>
                                        </div>
                                        <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                                            <motion.div className="h-full bg-[#9d4edd]" initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} />
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-500">
                                            <span className="truncate max-w-[200px]">{task.logs[task.logs.length - 1]}</span>
                                            <span>{Math.round(task.progress)}%</span>
                                        </div>
                                        {task.status === 'SWARM_VERIFY' && (
                                            <button onClick={viewSwarm} className="w-full mt-2 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-[9px] font-bold uppercase rounded hover:bg-[#f59e0b]/20 transition-colors flex items-center justify-center gap-2 animate-in slide-in-from-top-2"><Eye className="w-3 h-3" /> View Verification Battle</button>
                                        )}
                                        <AnimatePresence>
                                            {selectedTaskId === task.id && task.subQueries && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 pt-3 border-t border-[#222] overflow-hidden">
                                                    <div className="mb-3 text-[9px] font-mono text-gray-500 uppercase flex items-center gap-2"><ListTodo className="w-3 h-3" /> Execution Plan</div>
                                                    <div className="space-y-1">
                                                        {task.subQueries.map((q, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-[9px] font-mono">
                                                                {(task.findings?.length || 0) > idx ? <CheckCircle className="w-3 h-3 text-[#42be65]" /> : <CircleDashed className="w-3 h-3 text-gray-600" />}
                                                                <span className={(task.findings?.length || 0) > idx ? 'text-gray-400 line-through' : 'text-white'}>{q}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                                {completedTasks.map(task => (
                                    <div key={task.id} className={`bg-[#111] border rounded p-3 relative group transition-colors ${selectedTaskId === task.id ? 'border-[#9d4edd]' : 'border-[#222] hover:border-[#333]'}`}>
                                        <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={() => toggleSelection(task.id)}>
                                            <span className={`text-[10px] font-bold truncate max-w-[200px] ${task.status === 'FAILED' ? 'text-red-400' : task.status === 'CANCELLED' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{task.query}</span>
                                            {task.status === 'FAILED' ? <AlertCircle className="w-3 h-3 text-red-500" /> : <CheckCircle2 className="w-3 h-3 text-[#42be65]" />}
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                                            <span className="text-[9px] font-mono text-gray-600">{new Date(task.timestamp).toLocaleTimeString()}</span>
                                            <div className="flex gap-2">
                                                {task.status === 'COMPLETED' && <button onClick={(e) => { e.stopPropagation(); handleViewReport(task); }} className="flex items-center gap-1 text-[9px] text-[#9d4edd] hover:underline font-bold uppercase"><FileText className="w-3 h-3" /> Report</button>}
                                                <button onClick={(e) => { e.stopPropagation(); removeResearchTask(task.id); }} className="text-gray-600 hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {selectedTaskId === task.id && task.findings && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 pt-3 border-t border-[#222] overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-2 text-[9px] text-gray-500 font-mono uppercase font-bold tracking-widest"><Target className="w-3 h-3" /> Branch Knowledge Trace</div>
                                                    <div className="space-y-2">
                                                        {task.findings.slice(0, 5).map((fact, i) => (
                                                            <div key={i} className="flex gap-2 items-start p-2 rounded bg-[#0a0a0a] border border-[#222] hover:border-[#9d4edd] group/fact cursor-pointer transition-all" onClick={() => handleBranch(fact.fact, task.id)}>
                                                                <GitBranch className="w-3 h-3 text-gray-600 group-hover/fact:text-[#9d4edd] mt-0.5 shrink-0" />
                                                                <p className="text-[9px] text-gray-400 font-mono line-clamp-2 group-hover/fact:text-gray-200">{fact.fact}</p>
                                                            </div>
                                                        ))}
                                                    </div>
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