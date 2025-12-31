import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
    Bot, Cpu, Activity, Zap, Shield, Search, Send, 
    Loader2, BrainCircuit, Terminal, Radio, Info,
    Power, RefreshCw, Layers, Target, Code, Database, Globe,
    Settings, Sliders, X, CheckCircle2, AlertTriangle, ListChecks,
    History, Binary, Brain, ShieldCheck, Sparkles, Microscope,
    Fingerprint, Gauge, Waves, ChevronRight, PlayCircle, Boxes, Dna,
    Plus, GitBranch, Share2, PowerOff, Scissors, Command, Waypoints,
    Workflow, ListTodo, Circle, SearchCode, History as HistoryIcon,
    ShieldAlert, ChevronDown, MousePointer2, User, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, MentalState, TaskStatus, AtomicTask } from '../types';
import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { promptSelectKey, SOVEREIGN_SYSTEM_INSTRUCTION, retryGeminiRequest, safeParseJson } from '../services/geminiService';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

/**
 * SKILL CONSTELLATION
 * Visualizes agent capabilities as a geometric lattice.
 */
const SkillConstellation: React.FC<{ capabilities: string[], color: string }> = ({ capabilities, color }) => {
    const radius = 60;
    const center = { x: 100, y: 100 };

    return (
        <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                    <radialGradient id="nodeGlow">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </radialGradient>
                </defs>
                
                {/* Orbital Rings */}
                <circle cx="100" cy="100" r="40" stroke="white" strokeOpacity="0.05" fill="none" strokeDasharray="2 4" />
                <circle cx="100" cy="100" r="70" stroke="white" strokeOpacity="0.03" fill="none" />

                {/* Connection Lines */}
                {capabilities.map((_, i) => {
                    const angle = (i / capabilities.length) * Math.PI * 2;
                    const x = 100 + Math.cos(angle) * radius;
                    const y = 100 + Math.sin(angle) * radius;
                    return (
                        <motion.line 
                            key={`line-${i}`}
                            x1="100" y1="100" x2={x} y2={y} 
                            stroke={color} strokeOpacity="0.2" strokeWidth="1"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        />
                    );
                })}

                {/* Capability Nodes */}
                {capabilities.map((cap, i) => {
                    const angle = (i / capabilities.length) * Math.PI * 2;
                    const x = 100 + Math.cos(angle) * radius;
                    const y = 100 + Math.sin(angle) * radius;
                    return (
                        <g key={i} className="group/node cursor-help">
                            <circle cx={x} cy={y} r="12" fill="url(#nodeGlow)" />
                            <motion.circle 
                                cx={x} cy={y} r="4" fill={color}
                                animate={{ r: [3, 5, 3] }}
                                transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                            />
                        </g>
                    );
                })}

                {/* Central Core */}
                <circle cx="100" cy="100" r="8" fill="white" fillOpacity="0.1" />
                <Bot x="90" y="90" size={20} className="text-white opacity-40" />
            </svg>
            
            {/* Tooltips (Absolute Overlay) */}
            {capabilities.map((cap, i) => {
                const angle = (i / capabilities.length) * Math.PI * 2;
                const x = 100 + Math.cos(angle) * radius;
                const y = 100 + Math.sin(angle) * radius;
                return (
                    <div 
                        key={`label-${i}`}
                        className="absolute text-[6px] font-black font-mono text-gray-500 uppercase tracking-widest pointer-events-none whitespace-nowrap"
                        style={{ 
                            left: `${(x / 200) * 100}%`, 
                            top: `${(y / 200) * 100}%`,
                            transform: 'translate(-50%, -150%)'
                        }}
                    >
                        {cap.split('_').join(' ')}
                    </div>
                );
            })}
        </div>
    );
};

const MemoryTrace: React.FC<{ entry: any, index: number }> = ({ entry, index }) => (
    <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
            "flex gap-4 p-4 rounded-2xl border transition-all group relative",
            entry.role === 'USER' 
                ? "bg-white/[0.01] border-white/5" 
                : entry.role === 'AI' 
                ? "bg-[#9d4edd]/5 border-[#9d4edd]/20" 
                : "bg-red-500/5 border-red-500/20"
        )}
    >
        <div className="flex flex-col items-center shrink-0 w-8">
            <div className={cn(
                "w-1 h-full bg-white/5 rounded-full relative overflow-hidden",
                index === 0 ? "h-1/2 mt-auto" : ""
            )}>
                {entry.role === 'AI' && <div className="absolute top-0 left-0 w-full h-1/2 bg-[#9d4edd] opacity-40" />}
            </div>
            <div className={cn(
                "w-6 h-6 rounded-full border flex items-center justify-center -my-1 relative z-10 bg-black",
                entry.role === 'USER' ? "border-gray-700 text-gray-600" : "border-[#9d4edd] text-[#9d4edd] shadow-[0_0_10px_rgba(157,78,221,0.2)]"
            )}>
                {entry.role === 'USER' ? <User size={12} /> : <Bot size={12} />}
            </div>
            <div className={cn("w-1 h-full bg-white/5 rounded-full")} />
        </div>
        
        <div className="flex-1 min-w-0 py-1">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[7px] font-black font-mono text-gray-600 uppercase tracking-[0.2em]">Trace_Entry_{index} // {entry.role}</span>
                <span className="text-[7px] font-mono text-gray-800">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-[11px] text-gray-300 font-mono leading-relaxed select-text">
                {entry.text}
            </p>
        </div>
    </motion.div>
);

const AgentControlCenter: React.FC = () => {
    const { agents, actions } = useAppStore();
    const { updateAgent, addLog, setAgentState } = actions;
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const [viewMode, setViewMode] = useState<'MEMORY' | 'SKILLS' | 'TASKS'>('MEMORY');
    const [taskInput, setTaskInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeAgent = agents.activeAgents.find(a => a.id === selectedAgentId);

    const handleSearchGrounding = async () => {
        if (!activeAgent || !input.trim()) return;
        audio.playClick();
        const query = input;
        setInput('');
        
        updateAgent(activeAgent.id, { status: 'THINKING' });
        addLog('SYSTEM', `SWARM_SEARCH: [${activeAgent.name}] querying Reality Oracles...`);

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) return;
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Grounding Query: ${query}. Synthesize verified technical data for agent internal memory.`,
                config: { tools: [{ googleSearch: {} }] }
            }));

            const resultText = response.text || "No grounded data identified.";
            const updatedMemory = [...activeAgent.memoryBuffer, 
                { timestamp: Date.now(), role: 'USER' as const, text: `Research Directive: ${query}` },
                { timestamp: Date.now(), role: 'AI' as const, text: `GROUNDED_DATA: ${resultText}` }
            ];

            updateAgent(activeAgent.id, { 
                status: 'IDLE', 
                memoryBuffer: updatedMemory,
                energyLevel: Math.max(10, activeAgent.energyLevel - 5)
            });
            
            addLog('SUCCESS', `SWARM_SEARCH: Grounded context injected into [${activeAgent.name}] buffer.`);
            audio.playSuccess();
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            addLog('ERROR', `SEARCH_FAIL: ${e.message}`);
        }
    };

    const handleAddTask = () => {
        if (!activeAgent || !taskInput.trim()) return;
        const newTask: AtomicTask = {
            id: `task-${Date.now()}`,
            description: taskInput,
            isolated_input: '',
            instruction: taskInput,
            weight: 1,
            status: 'PENDING'
        };
        updateAgent(activeAgent.id, { tasks: [...activeAgent.tasks, newTask] });
        setTaskInput('');
        audio.playClick();
        addLog('INFO', `TASK_QUEUE: New directive logged for [${activeAgent.name}].`);
    };

    const toggleTaskStatus = (taskId: string) => {
        if (!activeAgent) return;
        const updated = activeAgent.tasks.map(t => {
            if (t.id === taskId) {
                const nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' = t.status === 'PENDING' ? 'IN_PROGRESS' : t.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';
                return { ...t, status: nextStatus };
            }
            return t;
        });
        updateAgent(activeAgent.id, { tasks: updated });
        audio.playSuccess();
    };

    const handleDirectExecute = async () => {
        if (!input.trim() || !activeAgent) return;
        const directive = input;
        setInput('');
        
        updateAgent(activeAgent.id, { 
            status: 'THINKING', 
            memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'USER', text: directive }] 
        });

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) return;
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: directive,
                config: { 
                    systemInstruction: `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\nACT AS: ${activeAgent.name}.`,
                    thinkingConfig: { thinkingBudget: 8000 }
                }
            }));

            updateAgent(activeAgent.id, { 
                status: 'IDLE',
                memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'AI', text: response.text || "Execution finalized." }]
            });
            audio.playSuccess();
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            addLog('ERROR', `EXEC_FAIL: ${e.message}`);
        }
    };

    return (
        <div className="h-full w-full bg-[#020202] flex flex-col font-sans overflow-hidden border border-white/5 rounded-[2.5rem] shadow-2xl relative transition-all duration-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(157,78,221,0.03)_0%,transparent_80%)] pointer-events-none" />
            
            {/* Command Header */}
            <div className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-40 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-xl">
                            <Bot className="w-6 h-6 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white uppercase tracking-[0.4em]">Swarm Hub</h1>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1 uppercase">Autonomous Node Orchestration</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/5" />

                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        {[
                            { id: 'MEMORY', label: 'Neural Trace', icon: HistoryIcon },
                            { id: 'SKILLS', label: 'Capability Grid', icon: Waypoints },
                            { id: 'TASKS', label: 'Deployment', icon: ListTodo }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setViewMode(tab.id as any); audio.playClick(); }}
                                className={cn(
                                    "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all",
                                    viewMode === tab.id ? "bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/30" : "text-gray-600 hover:text-gray-300"
                                )}
                            >
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Swarm_Coherence</span>
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black font-mono text-white tracking-tighter">98.4%</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Node Selector (Sidebar) */}
                <div className="w-[320px] border-r border-white/5 flex flex-col shrink-0 bg-black/20 z-10">
                    <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-2">
                            <Binary size={12} /> Active Agents
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                        {agents.activeAgents.map(agent => (
                            <button 
                                key={agent.id}
                                onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }}
                                className={cn(
                                    "w-full p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 relative overflow-hidden group",
                                    selectedAgentId === agent.id 
                                        ? "bg-white/[0.04] border-[#9d4edd]/40 shadow-2xl" 
                                        : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl border flex items-center justify-center transition-all",
                                            selectedAgentId === agent.id ? "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd]" : "bg-black/40 border-white/10 text-gray-600"
                                        )}>
                                            <Bot size={18} className={agent.status === 'THINKING' ? 'animate-spin' : ''} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{agent.name}</div>
                                            <div className="text-[7px] text-gray-500 font-mono uppercase tracking-tighter">{agent.role}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        agent.status === 'ACTIVE' ? "bg-[#10b981] animate-pulse" : "bg-gray-700"
                                    )} />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div animate={{ width: `${agent.energyLevel}%` }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee]" />
                                    </div>
                                    <div className="flex justify-between text-[6px] font-mono text-gray-600 uppercase tracking-widest">
                                        <span>Capacity: {agent.capabilities.length}</span>
                                        <span>E: {agent.energyLevel}%</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Content Deck */}
                <div className="flex-1 flex flex-col relative bg-transparent overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div 
                                key={`${selectedAgentId}-${viewMode}`}
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.01 }}
                                className="flex-1 flex flex-col min-h-0"
                            >
                                {/* Active Node Meta */}
                                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/10 z-10 shrink-0">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-3xl border border-white/10 flex items-center justify-center bg-black/40 relative overflow-hidden group/avatar">
                                                <Bot size={32} className="text-[#9d4edd] group-hover/avatar:scale-110 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/10 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-2">{activeAgent.name}Mind_v4</h2>
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <Target size={12} className="text-[#9d4edd]" />
                                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{activeAgent.context}</span>
                                                </div>
                                                <div className="h-3 w-px bg-white/10" />
                                                <div className="flex items-center gap-2 text-[#10b981]">
                                                    <ShieldCheck size={12} />
                                                    <span className="text-[9px] font-mono uppercase tracking-widest font-black uppercase">Secure_Handshake_L0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                         <button className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center gap-2">
                                             <HistoryIcon size={14} /> Neural Checkpoint
                                         </button>
                                         <button className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 hover:bg-red-500 hover:text-black transition-all">
                                             <PowerOff size={16} />
                                         </button>
                                    </div>
                                </div>

                                {/* Dynamic Views */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative" ref={scrollRef}>
                                    {viewMode === 'MEMORY' && (
                                        <div className="max-w-4xl mx-auto space-y-4">
                                            {activeAgent.memoryBuffer.length === 0 ? (
                                                <div className="h-[400px] flex flex-col items-center justify-center opacity-10 gap-8 grayscale">
                                                    <Dna size={120} className="animate-[spin_20s_linear_infinite]" />
                                                    <p className="text-lg font-mono uppercase tracking-[1em] text-center">Memory Pool Empty</p>
                                                </div>
                                            ) : (
                                                activeAgent.memoryBuffer.map((trace, i) => (
                                                    <MemoryTrace key={i} entry={trace} index={i} />
                                                ))
                                            )}
                                            {activeAgent.status === 'THINKING' && (
                                                <div className="p-8 flex items-center gap-6 opacity-40">
                                                    <Loader2 className="w-6 h-6 animate-spin text-[#9d4edd]" />
                                                    <span className="text-xs font-mono uppercase tracking-widest animate-pulse uppercase">Crystallizing Neural Logic...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {viewMode === 'SKILLS' && (
                                        <div className="h-full flex flex-col items-center justify-center gap-16">
                                            <div className="relative">
                                                <SkillConstellation capabilities={activeAgent.capabilities} color="#9d4edd" />
                                                <div className="absolute inset-0 blur-[100px] bg-[#9d4edd]/5 rounded-full pointer-events-none" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-5xl">
                                                {activeAgent.capabilities.map(cap => (
                                                    <div key={cap} className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col gap-3 group hover:border-[#9d4edd]/40 transition-all shadow-xl">
                                                        <div className="flex justify-between items-start">
                                                            <div className="p-2 rounded-lg bg-black/40 text-[#9d4edd] border border-[#9d4edd]/30">
                                                                <Zap size={14} />
                                                            </div>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                                                        </div>
                                                        <div className="text-[11px] font-black text-white uppercase font-mono tracking-tighter leading-tight">{cap.split('_').join(' ')}</div>
                                                        <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">Protocol: Operational</div>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => window.location.hash = '/nexus'}
                                                    className="p-5 border border-dashed border-white/10 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 opacity-30 hover:opacity-100 hover:border-[#9d4edd] transition-all cursor-pointer group"
                                                >
                                                    <Plus size={24} className="text-gray-600 group-hover:text-[#9d4edd]" />
                                                    <span className="text-[9px] font-black uppercase text-gray-700 font-mono tracking-widest">Graft Skill</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'TASKS' && (
                                        <div className="max-w-3xl mx-auto space-y-6">
                                            <div className="flex items-center justify-between mb-8 px-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-[#10b981]/10 rounded-xl text-[#10b981] border border-[#10b981]/30">
                                                        <Workflow size={18} />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black text-white uppercase tracking-widest">Deployment Pipeline</span>
                                                        <p className="text-[9px] text-gray-500 font-mono uppercase mt-1 tracking-tighter uppercase">Sequential Execution Logic</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        value={taskInput}
                                                        onChange={e => setTaskInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                                        placeholder="New Directive..."
                                                        className="bg-black/60 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-mono text-white focus:border-[#9d4edd] outline-none"
                                                    />
                                                    <button onClick={handleAddTask} className="p-2 bg-[#9d4edd] text-black rounded-xl hover:scale-105 transition-transform"><Plus size={16}/></button>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {activeAgent.tasks.map((task, i) => (
                                                    <div key={task.id} className={cn(
                                                        "p-6 rounded-[2rem] border transition-all flex items-center justify-between shadow-2xl relative overflow-hidden group",
                                                        task.status === 'COMPLETED' ? "bg-black/40 border-[#10b981]/20 opacity-50" : 
                                                        task.status === 'IN_PROGRESS' ? "bg-[#9d4edd]/5 border-[#9d4edd]/40" : 
                                                        "bg-white/[0.01] border-white/5"
                                                    )}>
                                                        {task.status === 'IN_PROGRESS' && (
                                                            <motion.div animate={{ left: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-30" />
                                                        )}
                                                        <div className="flex items-center gap-8 relative z-10">
                                                            <button 
                                                                onClick={() => toggleTaskStatus(task.id)}
                                                                className={cn(
                                                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-sm transition-all",
                                                                    task.status === 'COMPLETED' ? "bg-[#10b981] text-black" : 
                                                                    task.status === 'IN_PROGRESS' ? "bg-[#9d4edd] text-black shadow-[0_0_20px_#9d4edd55]" : 
                                                                    "bg-black border border-white/10 text-gray-600 hover:border-white/40"
                                                                )}
                                                            >
                                                                {(i+1).toString().padStart(2, '0')}
                                                            </button>
                                                            <div>
                                                                <h4 className="text-[13px] font-black text-white uppercase tracking-tight mb-1 group-hover:text-[#9d4edd] transition-colors">{task.description}</h4>
                                                                <div className="flex gap-4 items-center">
                                                                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-600 uppercase tracking-widest font-bold">
                                                                        <Target size={10} className="text-[#9d4edd]" /> NODE_L{i}
                                                                    </div>
                                                                    <div className="text-[9px] font-mono text-gray-700 uppercase italic">Instruction: {task.instruction.substring(0, 40)}...</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative z-10 flex gap-2">
                                                            {task.status === 'COMPLETED' ? <CheckCircle2 size={24} className="text-[#10b981]" /> :
                                                             task.status === 'IN_PROGRESS' ? <Loader2 size={24} className="text-[#9d4edd] animate-spin" /> :
                                                             <button onClick={() => toggleTaskStatus(task.id)} className="p-3 hover:bg-white/5 rounded-xl text-gray-700 transition-colors"><ChevronRight size={20} /></button>}
                                                            <button 
                                                                onClick={() => updateAgent(activeAgent.id, { tasks: activeAgent.tasks.filter(t => t.id !== task.id) })}
                                                                className="p-3 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-700 hover:text-red-500 rounded-xl transition-all"
                                                            >
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Active Command Input Strip */}
                                <div className="p-10 border-t border-white/5 bg-black/40 relative z-20 shrink-0">
                                    <div className="max-w-4xl mx-auto space-y-4">
                                        <div className="flex justify-between px-6">
                                             <div className="flex gap-4">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.6em] flex items-center gap-2">
                                                    <Radio size={10} className="text-[#10b981] animate-pulse" /> Uplink Stable
                                                </span>
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.6em] flex items-center gap-2">
                                                    <Database size={10} className="text-[#22d3ee]" /> Memory R/W: OK
                                                </span>
                                             </div>
                                             <div className="flex gap-6">
                                                 <button onClick={() => setInput('Ground current market sentiment using Google Search')} className="text-[7px] font-mono text-gray-700 hover:text-[#9d4edd] uppercase tracking-widest transition-all">{"{ GROUND_SEARCH }"}</button>
                                                 <button onClick={() => setInput('Decompose primary goal into atomic deployment steps')} className="text-[7px] font-mono text-gray-700 hover:text-[#22d3ee] uppercase tracking-widest transition-all">{"{ DECOMPOSE_LOGIC }"}</button>
                                             </div>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#9d4edd]/5 via-transparent to-[#9d4edd]/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                            <div className="crystalline border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-2 focus-within:border-[#9d4edd]/50 transition-all shadow-2xl relative z-10 overflow-hidden invisible-glass">
                                                <div className="pl-6 text-gray-700">
                                                    <BrainCircuit size={22} className={activeAgent.status === 'THINKING' ? 'animate-pulse text-[#9d4edd]' : ''} />
                                                </div>
                                                <input 
                                                    value={input}
                                                    onChange={e => setInput(e.target.value)}
                                                    placeholder={activeAgent.status === 'THINKING' ? "NODE BUSY: CRYSTALLIZING NEURAL LATTICE..." : `GIVE COMMAND TO ${activeAgent.name.toUpperCase()}...`}
                                                    className="flex-1 bg-transparent border-none outline-none text-[13px] font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.2em] py-5 px-4"
                                                    onKeyDown={e => e.key === 'Enter' && (e.shiftKey ? handleSearchGrounding() : handleDirectExecute())}
                                                />
                                                <div className="flex gap-2 pr-2">
                                                    <button 
                                                        onClick={handleSearchGrounding}
                                                        title="Search & Ground (CMD+S)"
                                                        className="p-4 bg-black/40 hover:bg-[#22d3ee] border border-white/5 hover:text-black rounded-[1.5rem] text-[#22d3ee] transition-all active:scale-95 shadow-xl group/btn"
                                                    >
                                                        <Search size={22} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                    <button 
                                                        onClick={handleDirectExecute}
                                                        className="p-4 bg-[#9d4edd]/10 hover:bg-[#9d4edd] border border-[#9d4edd]/30 hover:text-black rounded-[1.5rem] text-[#9d4edd] transition-all active:scale-95 shadow-[0_0_30px_rgba(157,78,221,0.25)] group/btn"
                                                    >
                                                        <Send size={22} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-10 grayscale p-20 text-center">
                                <Bot size={180} className="animate-pulse" />
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black font-mono uppercase tracking-[1em]">Swarm Standby</h2>
                                    <p className="text-xs font-mono uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                                        Select a cognitive node from the sidebar to initialize high-fidelity autonomous orchestration and logic synthesis.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Swarm HUD Strip */}
            <div className="h-10 border-t border-white/5 bg-black/80 px-10 flex items-center justify-between text-[8px] font-mono text-gray-700 tracking-[0.2em] shrink-0 z-50 uppercase">
                <div className="flex gap-12">
                    <div className="flex items-center gap-3">
                        <Activity size={14} className="text-[#10b981]" /> Swarm_Sync: Stable
                    </div>
                    <div className="flex items-center gap-3">
                        <Cpu size={14} className="text-[#9d4edd]" /> Neural_Load: {Math.floor(Math.random() * 20 + 5)}%
                    </div>
                    <div className="flex items-center gap-3">
                        <Database size={14} className="text-[#22d3ee]" /> Memory_State: Synchronized
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <span>Lattice_Core_v9.5.4</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="font-black text-gray-500">ZENITH_OPERATIONAL_OS</span>
                </div>
            </div>
        </div>
    );
};

export default AgentControlCenter;