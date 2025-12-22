
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Task, TaskStatus, TaskPriority, SubTask } from '../types';
import { 
    Plus, Tag, ChevronDown, ChevronRight, CheckCircle, Trash2, Filter, 
    SortAsc, AlertCircle, GripVertical, Check, ListTodo, MoreVertical, 
    X, Archive, Zap, Play, CheckCircle2, ListChecks, Activity, 
    BarChart3, Hash, Clock, Sparkles, Loader2, SignalHigh, SignalMedium, SignalLow
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { decomposeTaskToSubtasks, promptSelectKey } from '../services/geminiService';
import { audio } from '../services/audioService';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: '#10b981',
    [TaskPriority.MEDIUM]: '#f59e0b',
    [TaskPriority.HIGH]: '#ef4444'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'TO DO',
    [TaskStatus.IN_PROGRESS]: 'IN PROGRESS',
    [TaskStatus.DONE]: 'DONE'
};

const CheckmarkFlourish: React.FC<{ isVisible: boolean }> = ({ isVisible }) => (
    <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
                <div className="bg-[#42be65]/20 p-4 rounded-full border border-[#42be65]/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <svg className="w-12 h-12 text-[#42be65]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </motion.div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const { updateTask, deleteTask, addLog } = useAppStore();
    const [showFlourish, setShowFlourish] = useState(false);
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isBreakingDown, setIsBreakingDown] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);

    const toggleStatus = (nextStatus?: TaskStatus) => {
        const targetStatus = nextStatus || (task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE);
        if (targetStatus === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
            setShowFlourish(true);
            setTimeout(() => setShowFlourish(false), 800);
            addLog('SUCCESS', `TASK_COMPLETE: ${task.title}`);
            audio.playSuccess();
        }
        updateTask(task.id, { status: targetStatus });
    };

    const setPriority = (priority: TaskPriority) => {
        updateTask(task.id, { priority });
        setShowPriorityPicker(false);
        audio.playClick();
    };

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        const sub: SubTask = { id: crypto.randomUUID(), title: newSubtaskTitle, completed: false };
        updateTask(task.id, { subtasks: [...task.subtasks, sub], isSubtasksCollapsed: false });
        setNewSubtaskTitle('');
        setIsAddingSubtask(false);
    };

    const handleAIBreakdown = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsBreakingDown(true);
        audio.playClick();
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsBreakingDown(false); return; }

            const newSubs = await decomposeTaskToSubtasks(task.title, task.description);
            const subtasks: SubTask[] = newSubs.map(title => ({
                id: crypto.randomUUID(),
                title,
                completed: false
            }));

            updateTask(task.id, { 
                subtasks: [...task.subtasks, ...subtasks],
                isSubtasksCollapsed: false
            });
            addLog('SUCCESS', `AI_BREAKDOWN: Synchronized ${subtasks.length} sub-units for "${task.title}".`);
            audio.playSuccess();
        } catch (err: any) {
            addLog('ERROR', `AI_BREAKDOWN_FAIL: ${err.message}`);
            audio.playError();
        } finally {
            setIsBreakingDown(false);
        }
    };

    const removeSubtask = (subId: string) => {
        updateTask(task.id, { subtasks: task.subtasks.filter(s => s.id !== subId) });
    };

    const toggleSubtask = (subId: string) => {
        const newSubtasks = task.subtasks.map(s => 
            s.id === subId ? { ...s, completed: !s.completed } : s
        );
        updateTask(task.id, { subtasks: newSubtasks });
    };

    const toggleCollapse = () => {
        updateTask(task.id, { isSubtasksCollapsed: !task.isSubtasksCollapsed });
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
    };

    const completedCount = task.subtasks.filter(s => s.completed).length;

    return (
        <motion.div
            layout
            draggable
            onDragStart={handleDragStart as any}
            onDragEnd={handleDragEnd as any}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 shadow-xl group relative overflow-visible mb-3 hover:border-[#333] transition-colors cursor-grab active:cursor-grabbing`}
            style={{ borderLeftColor: PRIORITY_COLORS[task.priority], borderLeftWidth: '3px' }}
        >
            <CheckmarkFlourish isVisible={showFlourish} />
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-2">
                    <h4 className={`text-[13px] font-bold font-mono tracking-tight text-white uppercase truncate ${task.status === TaskStatus.DONE ? 'line-through opacity-30' : ''}`}>
                        {task.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 relative">
                        <button 
                            onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                            className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border tracking-widest bg-black/40 flex items-center gap-1 hover:brightness-125 transition-all`} 
                            style={{ borderColor: `${PRIORITY_COLORS[task.priority]}33`, color: PRIORITY_COLORS[task.priority] }}
                        >
                            {task.priority === TaskPriority.HIGH ? <SignalHigh size={10}/> : task.priority === TaskPriority.MEDIUM ? <SignalMedium size={10}/> : <SignalLow size={10}/>}
                            {task.priority}
                        </button>
                        
                        <AnimatePresence>
                            {showPriorityPicker && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute top-full left-0 mt-1 z-[100] bg-[#111] border border-[#333] rounded shadow-2xl p-1 flex flex-col gap-0.5 min-w-[80px]"
                                >
                                    {Object.values(TaskPriority).map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => setPriority(p)}
                                            className={`text-[8px] font-black font-mono p-1.5 rounded uppercase text-left hover:bg-white/5 transition-colors`}
                                            style={{ color: PRIORITY_COLORS[p] }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <span className="text-[8px] font-mono text-gray-600 uppercase flex items-center gap-1">
                            <Clock size={10} /> {new Date(task.timestamp).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-gray-700 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <p className="text-[11px] text-gray-500 font-mono mb-4 leading-relaxed line-clamp-2 italic">
                "{task.description}"
            </p>

            {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {task.tags.map(tag => (
                        <span key={tag} className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#111] border border-white/5 text-[#22d3ee] uppercase tracking-tighter">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="bg-black/30 rounded-lg p-2.5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={toggleCollapse}
                        className="flex items-center gap-1 text-[9px] font-black font-mono text-gray-600 hover:text-white uppercase tracking-widest"
                    >
                        {task.isSubtasksCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        LOG_TASKS ({completedCount}/{task.subtasks.length})
                    </button>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handleAIBreakdown} 
                            disabled={isBreakingDown}
                            title="AI Decomposition"
                            className={`p-1 rounded transition-all ${isBreakingDown ? 'text-[#9d4edd] animate-pulse' : 'text-gray-600 hover:text-[#9d4edd]'}`}
                        >
                            {isBreakingDown ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        </button>
                        <button 
                            onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                            className="text-gray-600 hover:text-[#9d4edd] p-1"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                </div>
                
                {!task.isSubtasksCollapsed && (
                    <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {task.subtasks.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between group/sub">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <button 
                                        onClick={() => toggleSubtask(sub.id)}
                                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all shrink-0 ${sub.completed ? 'bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd]' : 'border-[#333] hover:border-[#9d4edd]'}`}
                                    >
                                        {sub.completed && <Check size={10} />}
                                    </button>
                                    <span className={`text-[10px] font-mono truncate ${sub.completed ? 'text-gray-700 line-through' : 'text-gray-400'}`}>
                                        {sub.title}
                                    </span>
                                </div>
                                <button onClick={() => removeSubtask(sub.id)} className="opacity-0 group-hover/sub:opacity-100 text-gray-700 hover:text-red-400 transition-all p-1">
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                        {isAddingSubtask && (
                            <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                                <input 
                                    autoFocus
                                    className="flex-1 bg-black border border-[#333] px-2 py-1 text-[10px] font-mono text-white outline-none rounded focus:border-[#9d4edd]"
                                    placeholder="Task designation..."
                                    value={newSubtaskTitle}
                                    onChange={e => setNewSubtaskTitle(e.target.value)}
                                    onBlur={() => !newSubtaskTitle && setIsAddingSubtask(false)}
                                />
                            </form>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex gap-1.5">
                {task.status !== TaskStatus.TODO && (
                    <button 
                        onClick={() => toggleStatus(TaskStatus.TODO)}
                        className="flex-1 py-1.5 bg-[#111] hover:bg-[#3b82f6]/10 hover:text-[#3b82f6] border border-[#222] rounded-lg text-[8px] font-bold font-mono uppercase tracking-widest transition-all"
                    >
                        De-Prioritize
                    </button>
                )}
                {task.status !== TaskStatus.IN_PROGRESS && (
                    <button 
                        onClick={() => toggleStatus(TaskStatus.IN_PROGRESS)}
                        className="flex-1 py-1.5 bg-[#111] hover:bg-[#f59e0b]/10 hover:text-[#f59e0b] border border-[#222] rounded-lg text-[8px] font-bold font-mono uppercase tracking-widest transition-all"
                    >
                        Engage
                    </button>
                )}
                {task.status !== TaskStatus.DONE && (
                    <button 
                        onClick={() => toggleStatus(TaskStatus.DONE)}
                        className="flex-1 py-1.5 bg-[#9d4edd]/10 hover:bg-[#42be65] hover:text-black border border-[#9d4edd]/20 rounded-lg text-[8px] font-black font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                    >
                        <CheckCircle2 size={10} /> Finalize
                    </button>
                )}
            </div>
        </motion.div>
    );
};
