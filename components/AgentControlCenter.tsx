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
    ShieldAlert, ChevronDown, MousePointer2, User, Trash2, Atom
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, MentalState, TaskStatus, AtomicTask } from '../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { promptSelectKey, SOVEREIGN_SYSTEM_INSTRUCTION, retryGeminiRequest } from '../services/geminiService';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

/**
 * LIVING SKILL CONSTELLATION
 * A procedurally animated geometric lattice representing agent functional evolution.
 */
const SkillConstellation: React.FC<{ capabilities: string[], color: string, isActive: boolean }> = ({ capabilities, color, isActive }) => {
    const radius = 70;
    const center = { x: 100, y: 100 };
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (!isActive) return;
        let frame = 0;
        const animate = () => {
            frame += 0.5;
            setRotation(frame);
            requestAnimationFrame(animate);
        };
        const handle = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(handle);
    }, [isActive]);

    return (
        <div className="relative w-64 h-64 flex items-center justify-center shrink-0 group">
            {/* Background Neural Pulse */}
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 rounded-full border border-current pointer-events-none"
                style={{ color }}
            />

            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <radialGradient id="centralGlow">
                        <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </radialGradient>
                </defs>
                
                <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '100px 100px' }}>
                    {/* Connection Web */}
                    {capabilities.map((_, i) => {
                        const angle = (i / capabilities.length) * Math.PI * 2;
                        const x = center.x + Math.cos(angle) * radius;
                        const y = center.y + Math.sin(angle) * radius;
                        
                        // Connect to neighbors
                        const nextIdx = (i + 1) % capabilities.length;
                        const nextAngle = (nextIdx / capabilities.length) * Math.PI * 2;
                        const nx = center.x + Math.cos(nextAngle) * radius;
                        const ny = center.y + Math.sin(nextAngle) * radius;

                        return (
                            <g key={`conn-${i}`}>
                                <motion.line 
                                    x1="100" y1="100" x2={x} y2={y} 
                                    stroke={color} strokeOpacity="0.15" strokeWidth="0.5"
                                />
                                <motion.line 
                                    x1={x} y1={y} x2={nx} y2={ny} 
                                    stroke={color} strokeOpacity="0.25" strokeWidth="1"
                                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                />
                            </g>
                        );
                    })}

                    {/* Nodes */}
                    {capabilities.map((cap, i) => {
                        const angle = (i / capabilities.length) * Math.PI * 2;
                        const x = center.x + Math.cos(angle) * radius;
                        const y = center.y + Math.sin(angle) * radius;
                        return (
                            <g key={i} className="cursor-help group/node">
                                <circle cx={x} cy={y} r="10" fill={color} fillOpacity="0.05" />
                                <motion.circle 
                                    cx={x} cy={y} r="3" fill={color}
                                    filter="url(#glow)"
                                    animate={{ r: [2, 4, 2] }}
                                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                                />
                                {/* Static text that counter-rotates would be complex, so we handle it outside */}
                            </g>
                        );
                    })}
                </g>

                {/* Central Identity Core */}
                <circle cx="100" cy="100" r="25" fill="url(#centralGlow)" className="animate-pulse" />
                <Bot x="88" y="88" size={24} className="text-white opacity-80" />
            </svg>
            
            {/* Counter-rotating Labels */}
            {capabilities.map((cap, i) => {
                const angle = (i / capabilities.length) * Math.PI * 2 + (rotation * Math.PI / 180);
                const x = 50 + Math.cos(angle) * 35;
                const y = 50 + Math.sin(angle) * 35;
                return (
                    <div 
                        key={`label-${i}`}
                        className="absolute text-[7px] font-black font-mono text-white/40 uppercase tracking-[0.2em] pointer-events-none whitespace-nowrap bg-black/60 px-2 py-0.5 rounded border border-white/5"
                        style={{ 
                            left: `${x}%`, 
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {cap.split('_').join(' ')}
                    </div>
                );
            })}
        </div>
    );
};

/**
 * RELATIONAL MEMORY TRACE
 * Visualizes memory as a living, connected mesh rather than a list.
 */
const RelationalMemory: React.FC<{ history: any[] }> = ({ history }) => {
    if (history.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-10 grayscale">
                <Dna size={160} className="animate-[spin_30s_linear_infinite]" />
                <p className="text-2xl font-mono uppercase tracking-[1em]">Lattice Dormant</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            {history.map((entry, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                        "relative ml-12 p-6 rounded-[2rem] border transition-all group overflow-hidden",
                        entry.role === 'USER' 
                            ? "bg-white/[0.02] border-white/5" 
                            : "bg-[#9d4edd]/5 border-[#9d4edd]/20 shadow-2xl shadow-[#9d4edd]/5"
                    )}
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color: entry.role === 'AI' ? '#9d4edd' : '#666' }} />
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-xl border flex items-center justify-center",
                                entry.role === 'USER' ? "bg-black/40 border-white/10 text-gray-500" : "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd]"
                            )}>
                                {entry.role === 'USER' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">
                                Protocol_Event_{i} // {entry.role}
                            </span>
                        </div>
                        <span className="text-[7px] font-mono text-gray-700">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-gray-300 font-mono leading-relaxed select-text">
                        {entry.text}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};

const AgentControlCenter: React.FC = () => {
    const { agents, actions } = useAppStore();
    const { updateAgent, addLog } = actions;
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const [viewMode, setViewMode] = useState<'MEMORY' | 'SKILLS' | 'TASKS'>('MEMORY');
    const [taskInput, setTaskInput] = useState('');
    const [isGrounding, setIsGrounding] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeAgent = agents.activeAgents.find(a => a.id === selectedAgentId);

    const handleSearchGrounding = async () => {
        if (!activeAgent || !input.trim()) return;
        setIsGrounding(true);
        audio.playClick();
        const query = input;
        setInput('');
        
        updateAgent(activeAgent.id, { status: 'THINKING' });
        addLog('SYSTEM', `SWARM_SEARCH: [${activeAgent.name}] querying Reality Oracles...`);

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { setIsGrounding(false); return; }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Search grounding: ${query}. Extraction focus: Strategic Implementation. Output verified context.`,
                config: { tools: [{ googleSearch: {} }] }
            }));

            const resultText = response.text || "No verifiable data stabilized.";
            const updatedMemory = [...activeAgent.memoryBuffer, 
                { timestamp: Date.now(), role: 'USER' as const, text: `Research Vector: ${query}` },
                { timestamp: Date.now(), role: 'AI' as const, text: `GROUNDED_DATA: ${resultText}` }
            ];

            updateAgent(activeAgent.id, { 
                status: 'IDLE', 
                memoryBuffer: updatedMemory,
                energyLevel: Math.max(10, activeAgent.energyLevel - 5)
            });
            
            addLog('SUCCESS', `SWARM_SEARCH: Context lattice updated for [${activeAgent.name}].`);
            audio.playSuccess();
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            addLog('ERROR', `SEARCH_FAIL: ${e.message}`);
        } finally {
            setIsGrounding(false);
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
        addLog('INFO', `DIRECTIVE: New task queued for ${activeAgent.name}.`);
    };

    const toggleTaskStatus = (taskId: string) => {
        if (!activeAgent) return;
        const updated = activeAgent.tasks.map(t => {
            if (t.id === taskId) {
                const nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' = 
                    t.status === 'PENDING' ? 'IN_PROGRESS' : 
                    t.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';
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
                    systemInstruction: `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\nACT AS NODE: ${activeAgent.name}.`,
                    thinkingConfig: { thinkingBudget: 8000 }
                }
            }));

            updateAgent(activeAgent.id, { 
                status: 'IDLE',
                memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'AI', text: response.text || "Protocol Finalized." }]
            });
            audio.playSuccess();
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            addLog('ERROR', `EXEC_FAIL: ${e.message}`);
        }
    };

    return (
        <div className="h-full w-full bg-[#010102] flex flex-col font-sans overflow-hidden border border-white/5 rounded-[3rem] shadow-2xl relative transition-all duration-1000">
            {/* Cinematic Background Atmosphere */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

            {/* Command Header HUD */}
            <div className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-40 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-xl">
                            <BrainCircuit className="w-6 h-6 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white uppercase tracking-[0.4em] leading-none">Swarm Interface</h1>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-2">Autonomous Node Orchestration // v9.5</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/5" />

                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                        {[
                            { id: 'MEMORY', label: 'Neural Mesh', icon: Atom },
                            { id: 'SKILLS', label: 'Evolution', icon: Waypoints },
                            { id: 'TASKS', label: 'Deployment', icon: ListTodo }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setViewMode(tab.id as any); audio.playClick(); }}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-all",
                                    viewMode === tab.id ? "bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/20" : "text-gray-600 hover:text-gray-300"
                                )}
                            >
                                <tab.icon size={14} className={viewMode === tab.id ? 'fill-current' : ''} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Swarm_Integrity</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black font-mono text-white tracking-tighter">98.4%</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Agent Sidebar Selector */}
                <div className="w-[320px] border-r border-white/5 flex flex-col shrink-0 bg-black/20 z-10">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3 px-1">
                            <Binary size={14} className="text-[#9d4edd]" /> Operational Nodes
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        {agents.activeAgents.map(agent => (
                            <button 
                                key={agent.id}
                                onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }}
                                className={cn(
                                    "w-full p-5 rounded-[2rem] border transition-all text-left flex flex-col gap-4 relative overflow-hidden group",
                                    selectedAgentId === agent.id 
                                        ? "bg-white/[0.03] border-[#9d4edd]/40 shadow-2xl" 
                                        : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-700",
                                            selectedAgentId === agent.id ? "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd] shadow-[0_0_15px_rgba(157,78,221,0.2)]" : "bg-black/40 border-white/10 text-gray-600"
                                        )}>
                                            <Bot size={22} className={cn(agent.status === 'THINKING' ? 'animate-spin' : 'group-hover:scale-110 transition-transform')} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white uppercase tracking-widest">{agent.name}</div>
                                            <div className="text-[8px] text-gray-600 font-mono uppercase tracking-tighter mt-0.5">{agent.role}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        agent.status === 'ACTIVE' ? "bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" : "bg-gray-800"
                                    )} />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${agent.energyLevel}%` }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee]" />
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

                {/* Main View Deck */}
                <div className="flex-1 flex flex-col relative bg-transparent overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div 
                                key={`${selectedAgentId}-${viewMode}`}
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.01 }}
                                transition={{ duration: 0.5 }}
                                className="flex-1 flex flex-col min-h-0"
                            >
                                {/* Active Agent Identity HUD */}
                                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01] z-10 shrink-0 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] opacity-10" />
                                    
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-[2.5rem] border-2 border-white/10 flex items-center justify-center bg-black/40 relative overflow-hidden group/avatar shadow-2xl">
                                                <Bot size={40} className="text-[#9d4edd] group-hover/avatar:scale-110 transition-transform duration-1000" />
                                                <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                            </div>
                                            <motion.div 
                                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                            </motion.div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] leading-none mb-3">{activeAgent.name}_Mind_Core</h2>
                                            <div className="flex items-center gap-8">
                                                <div className="flex items-center gap-3">
                                                    <Target size={14} className="text-[#9d4edd]" />
                                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{activeAgent.context}</span>
                                                </div>
                                                <div className="h-3 w-px bg-white/10" />
                                                <div className="flex items-center gap-3 text-[#10b981]">
                                                    <ShieldCheck size={14} />
                                                    <span className="text-[10px] font-mono font-black uppercase tracking-widest">Enclave_Attested_L0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 relative z-10">
                                         <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center gap-3 shadow-xl active:scale-95">
                                             <HistoryIcon size={16} /> Neural State Checkpoint
                                         </button>
                                         <button className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 hover:bg-red-500 hover:text-black transition-all shadow-xl active:scale-95">
                                             <PowerOff size={20} />
                                         </button>
                                    </div>
                                </div>

                                {/* Dynamic Neural Views */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-12 relative" ref={scrollRef}>
                                    {viewMode === 'MEMORY' && (
                                        <div className="max-w-4xl mx-auto">
                                            <RelationalMemory history={activeAgent.memoryBuffer} />
                                            {activeAgent.status === 'THINKING' && (
                                                <div className="mt-12 p-8 flex flex-col items-center gap-6 opacity-60">
                                                    <Loader2 className="w-10 h-10 animate-spin text-[#9d4edd]" />
                                                    <span className="text-xs font-mono uppercase tracking-[0.5em] animate-pulse text-[#9d4edd] font-black">Synthesizing Neural Lattice...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {viewMode === 'SKILLS' && (
                                        <div className="h-full flex flex-col items-center justify-center gap-16">
                                            <SkillConstellation capabilities={activeAgent.capabilities} color="#9d4edd" isActive={true} />
                                            
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
                                                {activeAgent.capabilities.map(cap => (
                                                    <motion.div 
                                                        key={cap} 
                                                        whileHover={{ y: -5, scale: 1.02 }}
                                                        className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col gap-4 group transition-all shadow-2xl relative overflow-hidden"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="flex justify-between items-start relative z-10">
                                                            <div className="p-3 rounded-2xl bg-black/40 text-[#9d4edd] border border-[#9d4edd]/30 shadow-lg">
                                                                <Zap size={18} className="group-hover:scale-110 transition-transform" />
                                                            </div>
                                                            <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                                        </div>
                                                        <div className="text-[12px] font-black text-white uppercase font-mono tracking-widest leading-tight relative z-10">{cap.split('_').join(' ')}</div>
                                                        <div className="text-[8px] text-gray-600 font-mono uppercase tracking-[0.2em] relative z-10">Status: Integrated</div>
                                                    </motion.div>
                                                ))}
                                                <button 
                                                    onClick={() => window.location.hash = '/nexus'}
                                                    className="p-8 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-4 opacity-30 hover:opacity-100 hover:border-[#9d4edd]/50 transition-all cursor-pointer group shadow-2xl"
                                                >
                                                    <div className="p-4 bg-white/5 rounded-full group-hover:bg-[#9d4edd]/10 transition-colors">
                                                        <Plus size={32} className="text-gray-600 group-hover:text-[#9d4edd] transition-all" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-gray-500 font-mono tracking-[0.3em] group-hover:text-white">Forge Protocol</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'TASKS' && (
                                        <div className="max-w-3xl mx-auto space-y-10 pb-20">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-5">
                                                    <div className="p-3 bg-[#10b981]/10 rounded-2xl text-[#10b981] border border-[#10b981]/30 shadow-xl">
                                                        <Workflow size={22} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-black text-white uppercase tracking-[0.4em]">Deployment Pipeline</span>
                                                        <p className="text-[9px] text-gray-500 font-mono uppercase mt-2">Active Implementation Sequence</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <input 
                                                        value={taskInput}
                                                        onChange={e => setTaskInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                                        placeholder="New Mission Directive..."
                                                        className="bg-black/60 border border-white/10 px-6 py-3 rounded-2xl text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none w-64 shadow-inner"
                                                    />
                                                    <button onClick={handleAddTask} className="p-3.5 bg-[#9d4edd] text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"><Plus size={20}/></button>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                {activeAgent.tasks.map((task, i) => (
                                                    <motion.div 
                                                        key={task.id} 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className={cn(
                                                        "p-8 rounded-[2.5rem] border transition-all flex items-center justify-between shadow-2xl relative overflow-hidden group",
                                                        task.status === 'COMPLETED' ? "bg-black/40 border-[#10b981]/20 opacity-50" : 
                                                        task.status === 'IN_PROGRESS' ? "bg-[#9d4edd]/5 border-[#9d4edd]/40" : 
                                                        "bg-white/[0.01] border-white/5"
                                                    )}>
                                                        {task.status === 'IN_PROGRESS' && (
                                                            <motion.div animate={{ left: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-40" />
                                                        )}
                                                        <div className="flex items-center gap-10 relative z-10 min-w-0 flex-1 pr-6">
                                                            <button 
                                                                onClick={() => toggleTaskStatus(task.id)}
                                                                className={cn(
                                                                    "w-14 h-14 rounded-3xl flex items-center justify-center font-mono font-black text-lg transition-all shrink-0",
                                                                    task.status === 'COMPLETED' ? "bg-[#10b981] text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]" : 
                                                                    task.status === 'IN_PROGRESS' ? "bg-[#9d4edd] text-black shadow-[0_0_30px_rgba(157,78,221,0.4)]" : 
                                                                    "bg-black border border-white/10 text-gray-700 hover:border-white/40 hover:text-white"
                                                                )}
                                                            >
                                                                {(i+1).toString().padStart(2, '0')}
                                                            </button>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-base font-black text-white uppercase tracking-tight mb-2 truncate group-hover:text-[#9d4edd] transition-colors">{task.description}</h4>
                                                                <div className="flex gap-6 items-center">
                                                                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-600 uppercase tracking-widest font-black">
                                                                        <Target size={12} className="text-[#9d4edd]" /> LATTICE_NODE_{i}
                                                                    </div>
                                                                    <div className="text-[9px] font-mono text-gray-700 uppercase italic truncate opacity-60">Handshake: {task.instruction.substring(0, 60)}...</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative z-10 flex gap-3">
                                                            {task.status === 'COMPLETED' ? <CheckCircle2 size={32} className="text-[#10b981]" /> :
                                                             task.status === 'IN_PROGRESS' ? <Loader2 size={32} className="text-[#9d4edd] animate-spin" /> :
                                                             <button onClick={() => toggleTaskStatus(task.id)} className="p-4 hover:bg-white/5 rounded-2xl text-gray-600 hover:text-white transition-all"><ChevronRight size={28} /></button>}
                                                            <button 
                                                                onClick={() => updateAgent(activeAgent.id, { tasks: activeAgent.tasks.filter(t => t.id !== task.id) })}
                                                                className="p-4 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-700 hover:text-red-500 rounded-2xl transition-all"
                                                            >
                                                                <Trash2 size={22}/>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Living Command Input Strip */}
                                <div className="p-12 border-t border-white/5 bg-black/40 backdrop-blur-3xl relative z-20 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                                    <div className="max-w-5xl mx-auto space-y-6">
                                        <div className="flex justify-between px-8">
                                             <div className="flex gap-8">
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.6em] flex items-center gap-3">
                                                    <Radio size={12} className="text-[#10b981] animate-pulse" /> Uplink Stable
                                                </span>
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.6em] flex items-center gap-3">
                                                    <Database size={12} className="text-[#22d3ee]" /> Relational R/W: OK
                                                </span>
                                             </div>
                                             <div className="flex gap-10">
                                                 <button onClick={() => setInput('Synthesize current strategic market context using Google Oracles')} className="text-[8px] font-mono text-gray-700 hover:text-[#9d4edd] uppercase tracking-[0.3em] transition-all font-black">{"{ GROUND_SEARCH }"}</button>
                                                 <button onClick={() => setInput('Establish multi-node deployment protocol for PARA organization')} className="text-[8px] font-mono text-gray-700 hover:text-[#22d3ee] uppercase tracking-[0.3em] transition-all font-black">{"{ PARA_SYNTHESIS }"}</button>
                                             </div>
                                        </div>
                                        
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#9d4edd]/10 via-transparent to-[#9d4edd]/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000" />
                                            <div className="crystalline border border-white/10 rounded-[3rem] p-3 flex items-center gap-3 focus-within:border-[#9d4edd]/50 transition-all shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden invisible-glass">
                                                
                                                <AnimatePresence>
                                                    {isGrounding && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }} 
                                                            animate={{ opacity: 1, height: '100%' }} 
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent z-20"
                                                        />
                                                    )}
                                                </AnimatePresence>

                                                <div className="pl-8 text-gray-700">
                                                    {activeAgent.status === 'THINKING' ? (
                                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                                                            <Brain size={24} className="text-[#9d4edd]" />
                                                        </motion.div>
                                                    ) : (
                                                        <Command size={24} className="group-focus-within:text-white transition-colors" />
                                                    )}
                                                </div>
                                                <input 
                                                    value={input}
                                                    onChange={e => setInput(e.target.value)}
                                                    placeholder={activeAgent.status === 'THINKING' ? "NODE_BUSY: CRYSTALLIZING NEURAL LATTICE..." : `GIVE DIRECTIVE TO ${activeAgent.name.toUpperCase()}...`}
                                                    className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em] py-6 px-6"
                                                    onKeyDown={e => e.key === 'Enter' && (e.shiftKey ? handleSearchGrounding() : handleDirectExecute())}
                                                />
                                                <div className="flex gap-3 pr-3">
                                                    <button 
                                                        onClick={handleSearchGrounding}
                                                        title="Search & Ground Intelligence (SHIFT+ENTER)"
                                                        className="p-5 bg-black/40 hover:bg-[#22d3ee] border border-white/5 hover:text-black rounded-[2.2rem] text-[#22d3ee] transition-all active:scale-95 shadow-xl group/btn"
                                                    >
                                                        <Search size={26} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                    <button 
                                                        onClick={handleDirectExecute}
                                                        className="p-5 bg-[#9d4edd]/10 hover:bg-[#9d4edd] border border-[#9d4edd]/30 hover:text-black rounded-[2.2rem] text-[#9d4edd] transition-all active:scale-95 shadow-[0_0_40px_rgba(157,78,221,0.3)] group/btn"
                                                    >
                                                        <Send size={26} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-12 grayscale p-20 text-center group cursor-default">
                                <Bot size={220} className="group-hover:scale-110 transition-transform duration-[5s] opacity-50" />
                                <div className="space-y-6">
                                    <h2 className="text-4xl font-black font-mono uppercase tracking-[1.5em] text-white">Hub Standby</h2>
                                    <p className="text-xs font-mono uppercase tracking-[0.5em] max-w-lg mx-auto leading-loose">
                                        Select an operational node from the matrix to initialize high-fidelity cognitive orchestration and recursive logic synthesis.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global HUD Status Strip */}
            <div className="h-10 border-t border-white/5 bg-black/80 px-10 flex items-center justify-between text-[8px] font-mono text-gray-700 tracking-[0.4em] shrink-0 z-50 uppercase font-black">
                <div className="flex gap-16">
                    <div className="flex items-center gap-4">
                        <Activity size={16} className="text-[#10b981]" /> SYNC: STABLE
                    </div>
                    <div className="flex items-center gap-4">
                        <Cpu size={16} className="text-[#9d4edd]" /> LOAD: {Math.floor(Math.random() * 15 + 5)}%
                    </div>
                    <div className="flex items-center gap-4">
                        <Database size={16} className="text-[#22d3ee]" /> RELATIONAL_MESH: ACTIVE
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <span>LATTICE_CORE_V9.5.4</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-gray-500">THE D-ECOSYSTEM ZENITH_OS</span>
                </div>
            </div>
        </div>
    );
};

export default AgentControlCenter;