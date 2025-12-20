
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Task, TaskStatus, TaskPriority, SubTask } from '../types';
import { 
    Plus, Tag, ChevronDown, ChevronRight, CheckCircle, Trash2, Filter, 
    SortAsc, AlertCircle, GripVertical, Check, ListTodo, MoreVertical, 
    X, Archive, Zap, Play, CheckCircle2, ListChecks, Activity, 
    BarChart3, Hash, Clock, Sparkles, Loader2
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
        // Add a class for visual styling during drag if needed
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 shadow-xl group relative overflow-hidden mb-3 hover:border-[#333] transition-colors cursor-grab active:cursor-grabbing`}
            style={{ borderLeftColor: PRIORITY_COLORS[task.priority], borderLeftWidth: '3px' }}
        >
            <CheckmarkFlourish isVisible={showFlourish} />
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-2">
                    <h4 className={`text-[13px] font-bold font-mono tracking-tight text-white uppercase truncate ${task.status === TaskStatus.DONE ? 'line-through opacity-30' : ''}`}>
                        {task.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border tracking-widest bg-black/40`} style={{ borderColor: `${PRIORITY_COLORS[task.priority]}33`, color: PRIORITY_COLORS[task.priority] }}>
                            {task.priority}
                        </span>
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

            {/* Subtasks Section */}
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
                        {task.subtasks.length === 0 && !isAddingSubtask && (
                            <div className="text-[8px] text-gray-700 font-mono italic">NO_SUB_PROTOCOLS</div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Action Transitions */}
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

const StatsRibbon = ({ tasks }: { tasks: Task[] }) => {
    const stats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
        const wip = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
        const high = tasks.filter(t => t.priority === TaskPriority.HIGH).length;
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);
        
        return { total, done, wip, high, progress };
    }, [tasks]);

    return (
        <div className="px-6 py-3 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center gap-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(157,78,221,0.05)_0%,transparent_50%)] pointer-events-none"></div>
            
            <div className="flex items-center gap-3">
                <div className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">Global Progress</div>
                <div className="w-32 h-1.5 bg-[#111] rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_10px_#9d4edd]"
                    />
                </div>
                <span className="text-xs font-black font-mono text-white">{stats.progress}%</span>
            </div>

            <div className="h-6 w-px bg-[#222]"></div>

            <div className="flex gap-6">
                {[
                    { label: 'Total', value: stats.total, color: 'text-gray-400', icon: ListTodo },
                    { label: 'Engaged', value: stats.wip, color: 'text-[#f59e0b]', icon: Zap },
                    { label: 'Critical', value: stats.high, color: 'text-[#ef4444]', icon: AlertCircle },
                    { label: 'Finalized', value: stats.done, color: 'text-[#42be65]', icon: CheckCircle2 }
                ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <stat.icon size={12} className={stat.color} />
                        <span className="text-[10px] font-black font-mono text-white">{stat.value}</span>
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">{stat.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TaskBoard: React.FC = () => {
    const { tasks, addTask, deleteTask, updateTask, addLog } = useAppStore();
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'PRIORITY' | 'DATE'>('PRIORITY');
    const [isAdding, setIsAdding] = useState(false);
    const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

    // Form state for new task
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [newTags, setNewTags] = useState('');

    const allTags = useMemo(() => {
        const tagsSet = new Set<string>();
        tasks.forEach(t => t.tags.forEach(tag => tagsSet.add(tag)));
        return Array.from(tagsSet);
    }, [tasks]);

    const filteredAndSortedTasks = useMemo(() => {
        let list = [...tasks];
        if (filterTag) {
            list = list.filter(t => t.tags.includes(filterTag));
        }

        if (sortBy === 'PRIORITY') {
            const priorityWeight = { [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
            list.sort((a, b) => {
                if (a.priority !== b.priority) return priorityWeight[b.priority] - priorityWeight[a.priority];
                return b.timestamp - a.timestamp;
            });
        } else {
            list.sort((a, b) => b.timestamp - a.timestamp);
        }

        return list;
    }, [tasks, filterTag, sortBy]);

    const handleAddTask = () => {
        if (!newTitle.trim()) return;
        addTask({
            title: newTitle,
            description: newDesc,
            status: TaskStatus.TODO,
            priority: newPriority,
            tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
            subtasks: [],
            isSubtasksCollapsed: false
        });
        setNewTitle('');
        setNewDesc('');
        setNewTags('');
        setIsAdding(false);
        audio.playSuccess();
    };

    const clearCompletedInColumn = (status: TaskStatus) => {
        const toDelete = tasks.filter(t => t.status === status && t.status === TaskStatus.DONE);
        if (toDelete.length > 0) {
            toDelete.forEach(t => deleteTask(t.id));
            addLog('SYSTEM', `ARCHIVE: Purged ${toDelete.length} finalized items from matrix.`);
            audio.playClick();
        }
    };

    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        setDragOverStatus(status);
    };

    const handleDragLeave = () => {
        setDragOverStatus(null);
    };

    const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        setDragOverStatus(null);
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== status) {
                updateTask(taskId, { status });
                addLog('INFO', `TASK_MIGRATION: Moved "${task.title}" to ${status}`);
                audio.playClick();
            }
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col font-sans overflow-hidden border border-[#1f1f1f] rounded-xl shadow-2xl relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            {/* Header / Controls */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded shadow-[0_0_15px_rgba(157,78,221,0.3)]">
                            <ListTodo className="w-4 h-4 text-[#9d4edd]" />
                        </div>
                        <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Action Matrix</h1>
                    </div>
                    
                    <div className="h-8 w-px bg-[#333]"></div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-gray-500" />
                            <select 
                                onChange={(e) => setFilterTag(e.target.value || null)}
                                className="bg-[#111] border border-[#333] rounded px-2 py-1 text-[10px] font-mono text-gray-400 outline-none focus:border-[#9d4edd] cursor-pointer"
                            >
                                <option value="">ALL TAGS</option>
                                {allTags.map(t => <option key={t} value={t}>#{t.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <SortAsc size={14} className="text-gray-500" />
                            <select 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-[#111] border border-[#333] rounded px-2 py-1 text-[10px] font-mono text-gray-400 outline-none focus:border-[#9d4edd] cursor-pointer"
                            >
                                <option value="PRIORITY">SORT: PRIORITY</option>
                                <option value="DATE">SORT: RECENT</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-[#9d4edd] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_25px_rgba(157,78,221,0.3)]"
                    >
                        <Plus size={14} /> Initialize Task
                    </button>
                </div>
            </div>

            <StatsRibbon tasks={tasks} />

            {/* Kanban Columns */}
            <div className="flex-1 flex gap-6 p-6 overflow-x-auto custom-scrollbar bg-[#050505]/50 relative z-10">
                {Object.values(TaskStatus).map(status => (
                    <div 
                        key={status} 
                        className={`w-[350px] flex flex-col shrink-0 rounded-2xl transition-colors duration-300 ${dragOverStatus === status ? 'bg-[#9d4edd]/5 border-2 border-dashed border-[#9d4edd]/20' : ''}`}
                        onDragOver={(e) => handleDragOver(e, status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <div className="flex items-center justify-between mb-6 px-2 group/header">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${status === 'TODO' ? 'bg-[#3b82f6]' : status === 'IN_PROGRESS' ? 'bg-[#f59e0b]' : 'bg-[#42be65]'} shadow-[0_0_8px_currentColor]`}></div>
                                <h3 className="text-[11px] font-black font-mono text-gray-300 tracking-[0.2em]">{STATUS_LABELS[status]}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {status === TaskStatus.DONE && (
                                    <button 
                                        onClick={() => clearCompletedInColumn(status)}
                                        className="opacity-0 group-hover/header:opacity-100 transition-opacity text-gray-600 hover:text-red-500"
                                        title="Clear Finished"
                                    >
                                        <Archive size={14} />
                                    </button>
                                )}
                                <span className="text-[9px] font-black font-mono text-gray-600 bg-[#111] px-2 py-0.5 rounded border border-white/5">
                                    {filteredAndSortedTasks.filter(t => t.status === status).length}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            {filteredAndSortedTasks
                                .filter(t => t.status === status)
                                .map(task => <TaskCard key={task.id} task={task} />)
                            }
                            {filteredAndSortedTasks.filter(t => t.status === status).length === 0 && (
                                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-[#1f1f1f] rounded-2xl opacity-10 grayscale">
                                    <Archive className="w-12 h-12 mb-3" />
                                    <span className="text-[10px] font-black font-mono uppercase tracking-[0.3em]">Sector Clear</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Task Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#0a0a0a] border border-[#333] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-[#1f1f1f] bg-[#111] flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#9d4edd]/20 rounded-lg"><Zap size={20} className="text-[#9d4edd]" /></div>
                                    <div>
                                        <h3 className="text-sm font-black font-mono text-white uppercase tracking-widest">Forge New Action</h3>
                                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">Direct System Intervention</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={20} /></button>
                            </div>
                            
                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black font-mono text-[#9d4edd] uppercase tracking-widest flex items-center gap-2">
                                        <Hash size={12} /> Designation
                                    </label>
                                    <input 
                                        autoFocus
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        className="w-full bg-[#050505] border border-[#222] p-4 text-white text-sm font-mono rounded-xl outline-none focus:border-[#9d4edd] transition-colors shadow-inner"
                                        placeholder="Identify task kernel..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <ListTodo size={12} /> Context Directive
                                    </label>
                                    <textarea 
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        className="w-full bg-[#050505] border border-[#222] p-4 text-white text-xs font-mono rounded-xl outline-none focus:border-[#9d4edd] h-28 resize-none transition-colors shadow-inner"
                                        placeholder="Detailed objective data..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">Priority Protocol</label>
                                        <select 
                                            value={newPriority}
                                            onChange={e => setNewPriority(e.target.value as any)}
                                            className="w-full bg-[#050505] border border-[#222] p-3 text-white text-xs font-mono rounded-xl outline-none focus:border-[#9d4edd] cursor-pointer appearance-none"
                                        >
                                            <option value={TaskPriority.LOW}>LOW_INTENSITY</option>
                                            <option value={TaskPriority.MEDIUM}>MID_RANGE</option>
                                            <option value={TaskPriority.HIGH}>CRITICAL_PATH</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">Metadata Tags</label>
                                        <input 
                                            value={newTags}
                                            onChange={e => setNewTags(e.target.value)}
                                            className="w-full bg-[#050505] border border-[#222] p-3 text-white text-xs font-mono rounded-xl outline-none focus:border-[#9d4edd] transition-colors"
                                            placeholder="bug, core, v1..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-[#080808] border-t border-[#1f1f1f] flex gap-4">
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 py-4 bg-[#111] border border-[#222] text-gray-400 font-bold font-mono text-[10px] uppercase rounded-xl hover:text-white hover:border-gray-500 transition-all"
                                >
                                    Abort
                                </button>
                                <button 
                                    onClick={handleAddTask}
                                    className="flex-1 py-4 bg-[#9d4edd] text-black font-black font-mono text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#b06bf7] transition-all shadow-[0_0_30px_rgba(157,78,221,0.4)]"
                                >
                                    Initialize Protocol
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskBoard;
