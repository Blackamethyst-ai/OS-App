/**
 * AgentControlCenter - View Components
 *
 * Extracted view sections for different tabs and panels.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Bot, Activity, Zap, Search, Send,
    Loader2, Radio, Target, Code, Database, Globe,
    RefreshCw, Layers, CheckCircle2, AlertTriangle,
    History as HistoryIcon, Brain, ShieldCheck,
    Gauge, Plus, PowerOff, Command, Workflow,
    ChevronRight, Trash2, X
} from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { AutonomousAgent, AtomicTask } from '../../../../types';

// =============================================================================
// CONVERGENCE VIEW
// =============================================================================

interface ConvergenceStats {
    totalPatterns: number;
    avgDQScore: number;
    avgRoundsToConverge: number;
    topDomains: { domain: string; count: number }[];
    topAgents: { agentId: string; winCount: number }[];
}

interface ConvergenceViewProps {
    stats: ConvergenceStats | null;
    onRefresh: () => void;
}

export const ConvergenceView: React.FC<ConvergenceViewProps> = ({ stats, onRefresh }) => (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-[var(--cyan)]/10 rounded-2xl text-[var(--cyan)] border border-[var(--cyan)]/30 shadow-xl">
                    <Gauge size={24} />
                </div>
                <div>
                    <span className="text-base font-black text-white uppercase tracking-[0.5em]">Adaptive Convergence Engine</span>
                    <p className="text-[10px] text-gray-500 font-mono uppercase mt-2.5 tracking-widest">DQ Scoring & Pattern Learning Analytics</p>
                </div>
            </div>
            <button
                onClick={onRefresh}
                className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center gap-2 shadow-xl active:scale-95"
            >
                <RefreshCw size={14} /> Refresh Stats
            </button>
        </div>

        {/* Stats Grid */}
        {stats ? (
            <div className="grid grid-cols-3 gap-6 px-4">
                {/* Total Patterns */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[var(--amethyst-soft)]/10 rounded-xl text-[var(--amethyst-soft)] border border-[var(--amethyst-soft)]/30">
                            <Layers size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Patterns</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono">{stats.totalPatterns}</div>
                    <div className="text-[9px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Convergence Events Recorded</div>
                </motion.div>

                {/* Avg DQ Score */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-8 bg-white/[0.02] border border-[var(--plasma-green)]/20 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[var(--plasma-green)]/10 rounded-xl text-[var(--plasma-green)] border border-[var(--plasma-green)]/30">
                            <Target size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Avg DQ Score</span>
                    </div>
                    <div className={cn(
                        "text-4xl font-black font-mono",
                        stats.avgDQScore >= 0.7 ? "text-[var(--plasma-green)]" :
                        stats.avgDQScore >= 0.5 ? "text-[var(--amber)]" : "text-[#ef4444]"
                    )}>
                        {Math.round(stats.avgDQScore * 100)}%
                    </div>
                    <div className="text-[9px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Decision Quality Index</div>
                </motion.div>

                {/* Avg Rounds */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-8 bg-white/[0.02] border border-[var(--cyan)]/20 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[var(--cyan)]/10 rounded-xl text-[var(--cyan)] border border-[var(--cyan)]/30">
                            <Activity size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Avg Rounds</span>
                    </div>
                    <div className="text-4xl font-black text-[var(--cyan)] font-mono">{stats.avgRoundsToConverge.toFixed(1)}</div>
                    <div className="text-[9px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Rounds to Consensus</div>
                </motion.div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Loader2 className="w-12 h-12 animate-spin text-[var(--cyan)] mb-6" />
                <span className="text-sm font-mono uppercase tracking-widest">Loading Convergence Data...</span>
            </div>
        )}

        {/* Top Domains & Agents */}
        {stats && (stats.topDomains.length > 0 || stats.topAgents.length > 0) && (
            <div className="grid grid-cols-2 gap-8 px-4">
                {/* Top Domains */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <Globe size={20} className="text-[var(--amber)]" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Top Domains</span>
                    </div>
                    <div className="space-y-4">
                        {stats.topDomains.map((d, i) => (
                            <div key={d.domain} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono text-gray-700 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                                    <span className="text-sm font-black text-white uppercase tracking-wider">{d.domain}</span>
                                </div>
                                <span className="text-sm font-mono text-[var(--amber)]">{d.count}</span>
                            </div>
                        ))}
                        {stats.topDomains.length === 0 && (
                            <div className="text-[10px] font-mono text-gray-700 uppercase">No domain data yet</div>
                        )}
                    </div>
                </motion.div>

                {/* Top Winning Agents */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <Bot size={20} className="text-[var(--amethyst-soft)]" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Top Winning Agents</span>
                    </div>
                    <div className="space-y-4">
                        {stats.topAgents.map((a, i) => (
                            <div key={a.agentId} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono text-gray-700 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                                    <span className="text-sm font-black text-white uppercase tracking-wider">{a.agentId}</span>
                                </div>
                                <span className="text-sm font-mono text-[var(--amethyst-soft)]">{a.winCount} wins</span>
                            </div>
                        ))}
                        {stats.topAgents.length === 0 && (
                            <div className="text-[10px] font-mono text-gray-700 uppercase">No agent data yet</div>
                        )}
                    </div>
                </motion.div>
            </div>
        )}

        {/* Empty State */}
        {stats && stats.totalPatterns === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Gauge size={80} className="mb-8 text-[var(--cyan)]" />
                <h3 className="text-xl font-black text-white uppercase tracking-[0.5em] mb-4">No Convergence Data</h3>
                <p className="text-sm font-mono text-gray-500 uppercase tracking-widest text-center max-w-md">
                    Run tasks through the Bicameral Engine with ACE mode enabled to start collecting convergence patterns and DQ scores.
                </p>
            </div>
        )}
    </div>
);

// =============================================================================
// TASKS VIEW
// =============================================================================

interface TasksViewProps {
    agent: AutonomousAgent;
    taskInput: string;
    setTaskInput: (value: string) => void;
    onAddTask: () => void;
    onToggleStatus: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
    agent,
    taskInput,
    setTaskInput,
    onAddTask,
    onToggleStatus,
    onDeleteTask
}) => (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-[var(--plasma-green)]/10 rounded-2xl text-[var(--plasma-green)] border border-[var(--plasma-green)]/30 shadow-xl">
                    <Workflow size={24} />
                </div>
                <div>
                    <span className="text-base font-black text-white uppercase tracking-[0.5em]">Deployment Pipeline</span>
                    <p className="text-[10px] text-gray-500 font-mono uppercase mt-2.5 tracking-widest">Active Implementation Sequence</p>
                </div>
            </div>
            <div className="flex gap-4">
                <input
                    value={taskInput}
                    onChange={e => setTaskInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddTask()}
                    placeholder="New Mission Vector..."
                    className="bg-black/60 border border-white/10 px-6 py-3 rounded-2xl text-xs font-mono text-white focus:border-[var(--amethyst-soft)] outline-none w-64 shadow-inner uppercase placeholder:text-gray-800"
                />
                <button onClick={onAddTask} className="p-3 bg-[var(--amethyst-soft)] text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl" aria-label="Add task"><Plus size={20} /></button>
            </div>
        </div>
        <div className="space-y-6 px-2">
            {agent.tasks.map((task, i) => (
                <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                        "p-8 rounded-[3rem] border transition-all flex items-center justify-between shadow-2xl relative overflow-hidden group",
                        task.status === 'COMPLETED' ? "bg-black/40 border-[var(--plasma-green)]/20 opacity-50" :
                            task.status === 'IN_PROGRESS' ? "bg-[var(--amethyst-soft)]/5 border-[var(--amethyst-soft)]/40 shadow-[0_0_30px_rgba(157,78,221,0.1)]" :
                                "bg-white/[0.01] border-white/5"
                    )}>
                    {task.status === 'IN_PROGRESS' && (
                        <motion.div animate={{ left: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[var(--amethyst-soft)] to-transparent opacity-40" />
                    )}
                    <div className="flex items-center gap-12 relative z-10 min-w-0 flex-1 pr-10">
                        <button
                            onClick={() => onToggleStatus(task.id)}
                            className={cn(
                                "w-14 h-14 rounded-[2rem] flex items-center justify-center font-mono font-black text-xl transition-all shrink-0 shadow-xl",
                                task.status === 'COMPLETED' ? "bg-[var(--plasma-green)] text-black shadow-[0_0_25px_rgba(16,185,129,0.3)]" :
                                    task.status === 'IN_PROGRESS' ? "bg-[var(--amethyst-soft)] text-black shadow-[0_0_35px_rgba(157,78,221,0.4)]" :
                                        "bg-black border border-white/10 text-gray-700 hover:border-white/40 hover:text-white"
                            )}
                        >
                            {(i + 1).toString().padStart(2, '0')}
                        </button>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-lg font-black text-white uppercase tracking-tight mb-3 truncate group-hover:text-[var(--amethyst-soft)] transition-colors">{task.description}</h4>
                            <div className="flex gap-8 items-center">
                                <div className="flex items-center gap-2.5 text-[10px] font-mono text-gray-600 uppercase tracking-widest font-black">
                                    <Target size={14} className="text-[var(--amethyst-soft)]" /> LATTICE_NODE_{i}
                                </div>
                                <div className="text-[10px] font-mono text-gray-700 uppercase italic truncate opacity-60">Status: {task.status}</div>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 flex gap-4">
                        {task.status === 'COMPLETED' ? <CheckCircle2 size={36} className="text-[var(--plasma-green)]" /> :
                            task.status === 'IN_PROGRESS' ? <Loader2 size={36} className="text-[var(--amethyst-soft)] animate-spin" /> :
                                <button onClick={() => onToggleStatus(task.id)} className="p-4 hover:bg-white/5 rounded-2xl text-gray-600 hover:text-white transition-all" aria-label="Start task"><ChevronRight size={28} /></button>}
                        <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-4 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-700 hover:text-red-500 rounded-2xl transition-all"
                            aria-label="Delete task"
                        >
                            <Trash2 size={22} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
);

// =============================================================================
// KNOWLEDGE PANEL
// =============================================================================

interface KnowledgeResult {
    content: string;
    category: string;
    similarity: number;
}

interface KnowledgePanelProps {
    isOpen: boolean;
    query: string;
    setQuery: (value: string) => void;
    results: KnowledgeResult[];
    isSearching: boolean;
    onClose: () => void;
    onInject: (content: string) => void;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
    isOpen,
    query,
    setQuery,
    results,
    isSearching,
    onClose,
    onInject
}) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-b border-[var(--cyan)]/20 bg-[var(--cyan)]/[0.02] overflow-hidden shrink-0"
            >
                <div className="p-4">
                    {/* Search Input */}
                    <div className="flex items-center gap-4 mb-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cyan)]/50" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search knowledge... (multi-agent, routing, DQ scoring)"
                                className="w-full pl-11 pr-4 py-2.5 bg-black/60 border border-[var(--cyan)]/20 rounded-xl text-xs font-mono text-white placeholder:text-gray-700 focus:border-[var(--cyan)]/50 focus:outline-none transition-colors"
                            />
                            {isSearching && (
                                <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--cyan)] animate-spin" />
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Search Results - Compact horizontal scroll */}
                    {query.length > 1 && results.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {results.slice(0, 6).map((result, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex-shrink-0 w-72 p-3 bg-black/40 border border-white/5 rounded-xl hover:border-[var(--cyan)]/30 transition-all group cursor-pointer"
                                    onClick={() => onInject(result.content)}
                                >
                                    <p className="text-[11px] text-gray-300 font-mono leading-relaxed line-clamp-2 mb-2">
                                        {result.content.slice(0, 120)}{result.content.length > 120 ? '...' : ''}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-[var(--amethyst-soft)]/20 text-[var(--amethyst-soft)] rounded text-[8px] font-black uppercase">
                                                {result.category}
                                            </span>
                                            <span className="text-[8px] font-mono text-gray-600">
                                                {Math.round(result.similarity * 100)}%
                                            </span>
                                        </div>
                                        <span className="text-[8px] font-black text-[var(--cyan)] opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                                            + Inject
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {query.length > 1 && results.length === 0 && !isSearching && (
                        <div className="text-center py-3 text-gray-600 text-[10px] font-mono uppercase tracking-widest">
                            No results for "{query}"
                        </div>
                    )}

                    {/* Quick suggestions when no query */}
                    {query.length <= 1 && (
                        <div className="flex items-center gap-2 text-[9px] text-gray-600">
                            <span className="font-mono uppercase tracking-widest">Quick:</span>
                            {['routing', 'multi-agent', 'DQ scoring', 'ACE'].map(term => (
                                <button
                                    key={term}
                                    onClick={() => setQuery(term)}
                                    className="px-2 py-1 bg-white/5 hover:bg-[var(--cyan)]/10 rounded text-gray-500 hover:text-[var(--cyan)] transition-colors font-mono"
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

// =============================================================================
// COMMAND STRIP
// =============================================================================

interface CommandStripProps {
    agent: AutonomousAgent;
    input: string;
    setInput: (value: string) => void;
    isGrounding: boolean;
    onExecute: () => void;
    onSearchGrounding: () => void;
}

export const CommandStrip: React.FC<CommandStripProps> = ({
    agent,
    input,
    setInput,
    isGrounding,
    onExecute,
    onSearchGrounding
}) => (
    <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-3xl relative z-20 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
        <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex justify-between px-8">
                <div className="flex gap-8">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.8em] flex items-center gap-3">
                        <Radio size={12} className="text-[var(--plasma-green)] animate-pulse" /> Uplink Stable
                    </span>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.8em] flex items-center gap-3">
                        <Database size={12} className="text-[var(--cyan)]" /> Relational R/W: OK
                    </span>
                </div>
                <div className="flex gap-8">
                    <button onClick={() => setInput('Ground strategic PARA context using Google Oracles')} className="text-[8px] font-mono text-gray-700 hover:text-[var(--amethyst-soft)] uppercase tracking-[0.4em] transition-all font-black">{"{ GROUND_SEARCH }"}</button>
                    <button onClick={() => setInput('Initialize recursive system evolution sequence')} className="text-[8px] font-mono text-gray-700 hover:text-[var(--cyan)] uppercase tracking-[0.4em] transition-all font-black">{"{ EVOLVE_LATTICE }"}</button>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--amethyst-soft)]/15 via-transparent to-[var(--amethyst-soft)]/15 blur-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000" />
                <div className="crystalline border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-4 focus-within:border-[var(--amethyst-soft)]/50 transition-all shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden invisible-glass">

                    <AnimatePresence>
                        {isGrounding && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: '100%' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent z-20"
                            />
                        )}
                    </AnimatePresence>

                    <div className="pl-6 text-gray-700">
                        {agent.status === 'THINKING' ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                                <Brain size={20} className="text-[var(--amethyst-soft)]" />
                            </motion.div>
                        ) : (
                            <Command size={20} className="group-focus-within:text-white transition-colors" />
                        )}
                    </div>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={agent.status === 'THINKING' ? "NODE_BUSY: ALIGNING NEURAL VECTORS..." : `GIVE DIRECTIVE TO ${agent.name.toUpperCase()}...`}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em] py-3 px-4"
                        onKeyDown={e => e.key === 'Enter' && (e.shiftKey ? onSearchGrounding() : onExecute())}
                        data-voice-id="agent-directive-input"
                        aria-label="Agent directive input"
                    />
                    <div className="flex gap-2 pr-2">
                        <button
                            onClick={onSearchGrounding}
                            title="Search Grounding (SHIFT+ENTER)"
                            className="p-3 bg-black/40 hover:bg-[var(--cyan)] border border-white/5 hover:text-black rounded-[1.8rem] text-[var(--cyan)] transition-all active:scale-95 shadow-xl group/btn"
                            data-voice-id="agent-search-button"
                            aria-label="Search grounding"
                        >
                            <Search size={20} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={onExecute}
                            className="p-3 bg-[var(--amethyst-soft)]/10 hover:bg-[var(--amethyst-soft)] border border-[var(--amethyst-soft)]/30 hover:text-black rounded-[1.8rem] text-[var(--amethyst-soft)] transition-all active:scale-95 shadow-[0_0_40px_rgba(157,78,221,0.3)] group/btn"
                            data-voice-id="agent-execute-button"
                            aria-label="Execute directive"
                        >
                            <Send size={20} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// =============================================================================
// NODE SELECTOR
// =============================================================================

interface NodeSelectorProps {
    agents: AutonomousAgent[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const NodeSelector: React.FC<NodeSelectorProps> = ({ agents, selectedId, onSelect }) => (
    <div className="w-[320px] border-r border-white/5 flex flex-col shrink-0 bg-black/20 z-10">
        <div className="p-6 border-b border-white/5 bg-white/[0.01]">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3 px-1">
                <Code size={14} className="text-[var(--amethyst-soft)]" /> Operational Nodes
            </span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {agents.map(agent => (
                <button
                    key={agent.id}
                    onClick={() => onSelect(agent.id)}
                    className={cn(
                        "w-full p-5 rounded-[2.5rem] border transition-all text-left flex flex-col gap-4 relative overflow-hidden group",
                        selectedId === agent.id
                            ? "bg-white/[0.03] border-[var(--amethyst-soft)]/40 shadow-2xl"
                            : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
                    )}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-700",
                                selectedId === agent.id ? "bg-[var(--amethyst-soft)]/20 border-[var(--amethyst-soft)]/40 text-[var(--amethyst-soft)] shadow-[0_0_15px_rgba(157,78,221,0.2)]" : "bg-black/40 border-white/10 text-gray-600"
                            )}>
                                <Bot size={20} className={cn(agent.status === 'THINKING' ? 'animate-spin' : 'group-hover:scale-110 transition-transform')} />
                            </div>
                            <div>
                                <div className="text-xs font-black text-white uppercase tracking-widest">{agent.name}</div>
                                <div className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter mt-1">{agent.role}</div>
                            </div>
                        </div>
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            agent.status === 'ACTIVE' ? "bg-[var(--plasma-green)] animate-pulse shadow-[0_0_10px_#10b981]" : "bg-gray-800"
                        )} />
                    </div>
                    <div className="space-y-2.5">
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${agent.energyLevel}%` }} className="h-full bg-gradient-to-r from-[var(--amethyst-soft)] to-[#22d3ee]" />
                        </div>
                        <div className="flex justify-between text-[7px] font-mono text-gray-600 uppercase tracking-widest">
                            <span>Skills: {agent.capabilities.length}</span>
                            <span>E_LEVEL: {agent.energyLevel}%</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    </div>
);
