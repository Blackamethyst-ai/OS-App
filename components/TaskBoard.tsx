import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Task, TaskStatus, TaskPriority, SubTask } from '../types';
import { 
    Plus, Tag, ChevronDown, ChevronRight, CheckCircle, Trash2, Filter, 
    SortAsc, AlertCircle, GripVertical, Check, ListTodo, MoreVertical, 
    X, Archive, Zap, Play, CheckCircle2, ListChecks, Activity, 
    BarChart3, Hash, Clock, Sparkles, Loader2, SignalHigh, SignalMedium, SignalLow,
    Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { decomposeTaskToSubtasks, promptSelectKey } from '../services/geminiService';
import { audio } from '../services/audioService';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: '#10b981',
    [TaskPriority.MEDIUM]: '#f59e0b',
    [TaskPriority.HIGH]: '#ef4444',
    [TaskPriority.CRITICAL]: '#ef4444'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'TO DO',
    [TaskStatus.IN_PROGRESS]: 'IN PROGRESS',
    [TaskStatus.DONE]: 'DONE',
    [TaskStatus.COMPLETED]: 'COMPLETED',
    [TaskStatus.FAILED]: 'FAILED',
    [TaskStatus.CANCELLED]: 'CANCELLED'
};

const TaskBoard: React.FC = () => {
    const { tasks, addTask, updateTask, addLog } = useAppStore();
    const [filter, setFilter] = useState<{ priority: string; status: string }>({ priority: 'ALL', status: 'ALL' });
    const [sortBy, setSortBy] = useState<'DATE' | 'PRIORITY'>('PRIORITY');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const sortedTasks = useMemo(() => {
        let filtered = tasks.filter(t => {
            const matchPriority = filter.priority === 'ALL' || t.priority === filter.priority;
            const matchStatus = filter.status === 'ALL' || t.status === filter.status;
            return matchPriority && matchStatus;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'PRIORITY') {
                const map = { [TaskPriority.CRITICAL]: 4, [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
                return map[b.priority] - map[a.priority];
            }
            return b.timestamp - a.timestamp;
        });
    }, [tasks, filter, sortBy]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        addTask({
            title: newTaskTitle,
            description: 'New protocol initialized.',
            priority: TaskPriority.MEDIUM,
            status: TaskStatus.TODO,
            tags: ['MANUAL'],
            subtasks: []
        });
        setNewTaskTitle('');
        setIsCreating(false);
        addLog('INFO', `TASK_CREATE: "${newTaskTitle}" added to lattice.`);
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] p-6 gap-6 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black font-mono text-white uppercase tracking-[0.3em] flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-[#9d4edd]" /> Operational Backlog
                    </h2>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Filter size={12} className="text-gray-600" />
                        <select value={filter.priority} onChange={e => setFilter({...filter, priority: e.target.value})} className="bg-transparent text-[10px] font-mono text-gray-400 outline-none uppercase cursor-pointer">
                            <option value="ALL">All Priorities</option>
                            <option value="HIGH">High Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="LOW">Low Priority</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <SortAsc size={12} className="text-gray-600" />
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-transparent text-[10px] font-mono text-gray-400 outline-none uppercase cursor-pointer">
                            <option value="PRIORITY">By Priority</option>
                            <option value="DATE">By Date</option>
                        </select>
                    </div>
                </div>
                <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-[#9d4edd] text-black text-[10px] font-black uppercase rounded-lg hover:bg-[#b06bf7] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(157,78,221,0.3)]">
                    <Plus size={14} /> New Protocol
                </button>
            </div>

            {isCreating && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreate} className="bg-[#0a0a0a] border border-[#9d4edd]/30 p-4 rounded-xl flex gap-4">
                    <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="flex-1 bg-black border border-[#333] px-4 py-2 rounded-lg text-xs font-mono text-white outline-none focus:border-[#9d4edd]" placeholder="Enter task title..." />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:text-white uppercase text-[9px] font-black">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-[#9d4edd] text-black rounded-lg uppercase text-[9px] font-black">Add</button>
                    </div>
                </motion.form>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                {sortedTasks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center opacity-20 text-center gap-4">
                        <Activity size={48} />
                        <p className="text-xs font-mono uppercase tracking-widest">No active tasks match the current filter.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedTasks.map(task => <TaskCard key={task.id} task={task} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const { updateTask, deleteTask, addLog, toggleSubTask } = useAppStore();
    const [isBreakingDown, setIsBreakingDown] = useState(false);
    
    const isDone = task.status === TaskStatus.DONE || task.status === TaskStatus.COMPLETED;

    const toggleStatus = () => {
        const next = isDone ? TaskStatus.TODO : TaskStatus.DONE;
        updateTask(task.id, { status: next });
        if (next === TaskStatus.DONE) {
            audio.playSuccess();
            addLog('SUCCESS', `RESOLVED: ${task.title}`);
        }
    };

    const handleAIBreakdown = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsBreakingDown(true);
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsBreakingDown(false); return; }
            const subs = await decomposeTaskToSubtasks(task.title, task.description);
            const newSubs: SubTask[] = subs.map(t => ({ id: crypto.randomUUID(), title: t, completed: false }));
            updateTask(task.id, { subtasks: [...task.subtasks, ...newSubs] });
            addLog('SUCCESS', `DECOMPOSE: Distributed logic for "${task.title}".`);
        } catch (e: any) {
            addLog('ERROR', `DECOMPOSE_FAIL: ${e.message}`);
        } finally {
            setIsBreakingDown(false);
        }
    };

    return (
        <motion.div layout className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 flex flex-col gap-3 group hover:border-[#333] transition-colors relative" style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}` }}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className={`text-[11px] font-black font-mono uppercase truncate ${isDone ? 'line-through opacity-30 text-gray-500' : 'text-white'}`}>{task.title}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded border border-white/5 bg-black/50" style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                        <div className="flex items-center gap-1">
                            {isDone && <CheckCircle2 size={10} className="text-[#10b981]" />}
                            <span className={`text-[8px] font-mono uppercase ${isDone ? 'text-[#10b981]' : 'text-gray-600'}`}>{STATUS_LABELS[task.status]}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={handleAIBreakdown} title="AI Decompose" disabled={isBreakingDown} className="p-1.5 hover:bg-[#9d4edd]/10 rounded text-gray-500 hover:text-[#9d4edd] transition-all">
                        {isBreakingDown ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    </button>
                    <button onClick={() => deleteTask(task.id)} title="Delete" className="p-1.5 hover:bg-red-500/10 rounded text-gray-700 hover:text-red-500">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            <p className="text-[10px] text-gray-500 font-mono line-clamp-2 leading-relaxed italic">"{task.description}"</p>

            {task.subtasks.length > 0 && (
                <div className="bg-black/40 rounded-lg p-2 space-y-1.5 border border-white/5">
                    <div className="flex justify-between text-[7px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1 px-1">
                        <span>Process Logic Matrix</span>
                        <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                    </div>
                    {task.subtasks.map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => {
                                toggleSubTask(task.id, s.id);
                                if (!s.completed) audio.playClick();
                            }}
                            className="w-full flex items-center gap-2.5 text-[9px] font-mono group/sub text-left hover:bg-white/5 p-1 rounded transition-colors"
                        >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${s.completed ? 'bg-[#10b981] border-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'border-gray-800 bg-black'}`}>
                                {s.completed && <Check size={8} className="text-black font-black" />}
                            </div>
                            <span className={`flex-1 transition-all ${s.completed ? 'line-through opacity-30 text-[#10b981]' : 'text-gray-400 group-hover/sub:text-gray-200'}`}>{s.title}</span>
                        </button>
                    ))}
                </div>
            )}

            <button onClick={toggleStatus} className={`mt-2 w-full py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all ${isDone ? 'bg-transparent border-[#333] text-gray-600 hover:text-white' : 'bg-[#111] border-[#333] text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black'}`}>
                {isDone ? 'Re-Open Protocol' : 'Complete Cycle'}
            </button>
        </motion.div>
    );
};

export default TaskBoard;