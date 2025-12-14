
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

const ResearchTray: React.FC = () => {
    const { research, updateResearchTask, removeResearchTask, openHoloProjector } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const activeTasks = research.tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'FAILED');
    const completedTasks = research.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'FAILED');
    
    // Auto-expand if new task starts
    React.useEffect(() => {
        if (activeTasks.length > 0) setIsExpanded(true);
    }, [activeTasks.length]);

    if (research.tasks.length === 0) return null;

    const handleViewReport = (task: any) => {
        openHoloProjector({
            id: `report-${task.id}`,
            type: 'TEXT',
            title: `Research Report: ${task.query.substring(0, 20)}...`,
            content: task.result || "No content generated."
        });
    };

    return (
        <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 right-6 z-50 w-96 flex flex-col gap-2 pointer-events-none"
        >
            {/* Main Header / Toggle */}
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
                        <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="bg-[#050505] border-t border-[#1f1f1f]"
                        >
                            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {/* Active Tasks */}
                                {activeTasks.map(task => (
                                    <div key={task.id} className="bg-[#111] border border-[#222] rounded p-3 relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-white truncate max-w-[200px]">{task.query}</span>
                                            <Loader2 className="w-3 h-3 text-[#9d4edd] animate-spin" />
                                        </div>
                                        <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                                            <motion.div 
                                                className="h-full bg-[#9d4edd]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${task.progress}%` }}
                                            />
                                        </div>
                                        <div className="text-[9px] font-mono text-gray-500 truncate">
                                            {task.logs[task.logs.length - 1]}
                                        </div>
                                    </div>
                                ))}

                                {/* Completed / Failed Tasks */}
                                {completedTasks.map(task => (
                                    <div key={task.id} className="bg-[#111] border border-[#222] rounded p-3 relative group hover:border-[#333] transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[10px] font-bold truncate max-w-[200px] ${task.status === 'FAILED' ? 'text-red-400' : 'text-gray-300'}`}>
                                                {task.query}
                                            </span>
                                            {task.status === 'FAILED' ? (
                                                <AlertCircle className="w-3 h-3 text-red-500" />
                                            ) : (
                                                <CheckCircle2 className="w-3 h-3 text-[#42be65]" />
                                            )}
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[9px] font-mono text-gray-600">{new Date(task.timestamp).toLocaleTimeString()}</span>
                                            <div className="flex gap-2">
                                                {task.status === 'COMPLETED' && (
                                                    <button 
                                                        onClick={() => handleViewReport(task)}
                                                        className="flex items-center gap-1 text-[9px] text-[#9d4edd] hover:underline"
                                                    >
                                                        <FileText className="w-3 h-3" /> REPORT
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => removeResearchTask(task.id)}
                                                    className="text-gray-600 hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {research.tasks.length === 0 && (
                                    <div className="text-center py-4 text-[10px] text-gray-600 font-mono">
                                        No active research tasks.
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
