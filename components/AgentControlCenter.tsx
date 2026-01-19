import { apiKeyService } from '../services/apiKeyService';
import { modelRouter } from '../services/modelRouter';
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
    ShieldAlert, ChevronDown, MousePointer2, User, Trash2, Atom, Headphones,
    BookOpen
} from 'lucide-react';
import { useSemanticSearch, useSessions } from '@antigravity/agent-core-sdk';
import { elevenLabs, ELEVEN_LABS_VOICES } from '../services/elevenLabsService';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, MentalState, TaskStatus, AtomicTask } from '../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { promptSelectKey, SOVEREIGN_SYSTEM_INSTRUCTION, retryGeminiRequest, getAI } from '../services/geminiService';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { ModelSelector } from './ModelSelector';
import { convergenceMemory } from '../services/bicameralService';

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
        <div className="relative w-56 h-56 flex items-center justify-center shrink-0 group">
            {/* Background Neural Pulse */}
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.12, 0.05] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-current pointer-events-none"
                style={{ color }}
            />

            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
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
                            </g>
                        );
                    })}
                </g>

                <circle cx="100" cy="100" r="25" fill="url(#centralGlow)" className="animate-pulse" />
                <Bot x="88" y="88" size={24} className="text-white opacity-80" />
            </svg>

            {capabilities.map((cap, i) => {
                const angle = (i / capabilities.length) * Math.PI * 2 + (rotation * Math.PI / 180);
                const x = 50 + Math.cos(angle) * 35;
                const y = 50 + Math.sin(angle) * 35;
                return (
                    <div
                        key={`label-${i}`}
                        className="absolute text-[8px] font-black font-mono text-white/50 uppercase tracking-[0.2em] pointer-events-none whitespace-nowrap bg-black/80 px-2.5 py-1 rounded-lg border border-white/5 shadow-2xl"
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

const RelationalMemory: React.FC<{ history: any[] }> = ({ history }) => {
    if (history.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-10 grayscale">
                <Dna size={160} className="animate-[spin_30s_linear_infinite]" />
                <p className="text-2xl font-mono uppercase tracking-[1em]">Memory Pool Silent</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative max-w-5xl mx-auto">
            <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            {history.map((entry, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                        "relative ml-16 p-6 rounded-[2.5rem] border transition-all group overflow-hidden shadow-2xl",
                        entry.role === 'USER'
                            ? "bg-white/[0.01] border-white/5"
                            : "bg-[#9d4edd]/5 border-[#9d4edd]/20"
                    )}
                >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-20" style={{ color: entry.role === 'AI' ? '#9d4edd' : '#666' }} />
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-8 h-8 rounded-2xl border flex items-center justify-center shadow-lg",
                                entry.role === 'USER' ? "bg-black/40 border-white/10 text-gray-500" : "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd]"
                            )}>
                                {entry.role === 'USER' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.4em]">
                                Trace_Buffer_{i} // {entry.role}
                            </span>
                        </div>
                        <span className="text-[8px] font-mono text-gray-700">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 font-mono leading-relaxed select-text tracking-tight">
                        {entry.text}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};

const AgentControlCenter: React.FC = () => {
    const { agents, actions, preferences } = useAppStore();
    const { updateAgent, addLog } = actions;
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const [viewMode, setViewMode] = useState<'MEMORY' | 'SKILLS' | 'TASKS' | 'CONVERGENCE'>('MEMORY');
    const [taskInput, setTaskInput] = useState('');
    const [knowledgeQuery, setKnowledgeQuery] = useState('');
    const [isKnowledgePanelOpen, setIsKnowledgePanelOpen] = useState(false);

    // Knowledge Base Integration
    const { results: knowledgeResults, isLoading: isSearchingKnowledge } = useSemanticSearch({
        query: knowledgeQuery,
        limit: 8,
        debounceMs: 400,
    });
    const { sessions: recentSessions } = useSessions({ limit: 5 });
    const [convergenceStats, setConvergenceStats] = useState<{
        totalPatterns: number;
        avgDQScore: number;
        avgRoundsToConverge: number;
        topDomains: { domain: string; count: number }[];
        topAgents: { agentId: string; winCount: number }[];
    } | null>(null);
    const [isGrounding, setIsGrounding] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Map Agent IDs to ElevenLabs Voices
    const getAgentVoice = (agentId: string) => {
        const map: Record<string, string> = {
            'mike': ELEVEN_LABS_VOICES.MIKE,
            'dr_ira': ELEVEN_LABS_VOICES.DR_IRA,
            'caleb': ELEVEN_LABS_VOICES.CALEB,
            'paramdeep': ELEVEN_LABS_VOICES.PARAMDEEP,
            'bilal': ELEVEN_LABS_VOICES.BILAL,
            'noah': ELEVEN_LABS_VOICES.NOAH,
            'helen': ELEVEN_LABS_VOICES.HELEN,
            'perri': ELEVEN_LABS_VOICES.PERRI
        };
        return map[agentId.toLowerCase()] || ELEVEN_LABS_VOICES.MIKE;
    };

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
            if (!(apiKeyService.hasGeminiKey())) { setIsGrounding(false); return; }
            const ai = getAI();

            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `Ground current search: ${query}. Extract strategic technical context for autonomic buffer.`,
                config: { tools: [{ googleSearch: {} }] }
            }));

            const resultText = response.text || "No verifiable data identifiable.";
            const updatedMemory = [...activeAgent.memoryBuffer,
            { timestamp: Date.now(), role: 'USER' as const, text: `Grounding Vector: ${query}` },
            { timestamp: Date.now(), role: 'AI' as const, text: `GROUNDED_RESULT: ${resultText}` }
            ];

            updateAgent(activeAgent.id, {
                status: 'IDLE',
                memoryBuffer: updatedMemory,
                energyLevel: Math.max(10, activeAgent.energyLevel - 5)
            });

            addLog('SUCCESS', `SWARM_SEARCH: Context lattice for [${activeAgent.name}] synchronized.`);
            audio.playSuccess();

            // Voice Output
            if (isVoiceEnabled && apiKeyService.getKey('eleven_labs')) {
                elevenLabs.speak(resultText.substring(0, 400), getAgentVoice(activeAgent.id));
            }
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            addLog('ERROR', `SEARCH_FAIL: ${e.message}`);
        } finally {
            setIsGrounding(false);
        }
    };

    // --- NEURO-LINK AUTONOMY LOOP ---
    useEffect(() => {
        if (!preferences.autonomyEnabled) return;

        const interval = setInterval(async () => {
            // Find an agent with pending work who isn't busy
            const availableAgent = agents.activeAgents.find(a =>
                a.status === 'IDLE' && a.tasks.some(t => t.status === 'PENDING')
            );

            if (!availableAgent) return;

            const pendingTask = availableAgent.tasks.find(t => t.status === 'PENDING');
            if (!pendingTask) return;

            // 1. Claim Task
            const tasksInProgress = availableAgent.tasks.map(t =>
                t.id === pendingTask.id ? { ...t, status: 'IN_PROGRESS' as const } : t
            );
            updateAgent(availableAgent.id, {
                status: 'THINKING',
                tasks: tasksInProgress
            });
            addLog('SYSTEM', `AUTONOMY: [${availableAgent.name}] executing: ${pendingTask.description}`);

            try {
                // 2. Execute via Model Router (Powerful Tier for Autonomous Tasks)
                const result = await modelRouter.generateContent(
                    `Task: ${pendingTask.description}. \nProvide a concise execution output or solution.`,
                    { tier: 'powerful' },
                    `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\nAct as ${availableAgent.name}.`
                );

                // 3. Resolve Task
                const tasksDone = availableAgent.tasks.map(t =>
                    t.id === pendingTask.id ? { ...t, status: 'COMPLETED' as const } : t
                );

                updateAgent(availableAgent.id, {
                    status: 'IDLE',
                    tasks: tasksDone,
                    memoryBuffer: [...availableAgent.memoryBuffer, {
                        timestamp: Date.now(),
                        role: 'AI',
                        text: `[AUTONOMOUS_EXECUTION] Task: ${pendingTask.description}\nResult: ${result}`
                    }]
                });
                addLog('SUCCESS', `AUTONOMY: Task [${pendingTask.description.substring(0, 20)}...] complted.`);
                audio.playSuccess();
            } catch (e) {
                // Fail Gracefully
                const tasksFailed = availableAgent.tasks.map(t =>
                    t.id === pendingTask.id ? { ...t, status: 'FAILED' as const } : t
                );
                updateAgent(availableAgent.id, { status: 'IDLE', tasks: tasksFailed });
                addLog('ERROR', `AUTONOMY_FAIL: ${e}`);
            }

        }, 5000); // Check every 5s

        return () => clearInterval(interval);
    }, [preferences.autonomyEnabled, agents.activeAgents]);

    // Fetch convergence stats when CONVERGENCE view is active
    useEffect(() => {
        if (viewMode === 'CONVERGENCE') {
            convergenceMemory.getStats().then(setConvergenceStats).catch(console.warn);
        }
    }, [viewMode]);

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
            // ROUTER UPDATE: Use modelRouter to select best model (Flash vs Sonnet vs Pro)
            // This prevents "Quota Exceeded" on high-end models for simple tasks
            const responseText = await modelRouter.generateContent(
                directive,
                { tier: preferences.modelTier }, // Uses user preference (Flash/Efficient default)
                `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\nACT AS NODE: ${activeAgent.name}.`
            );

            updateAgent(activeAgent.id, {
                status: 'IDLE',
                memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'AI', text: responseText }]
            });
            audio.playSuccess();

            // Voice Output
            if (isVoiceEnabled && apiKeyService.getKey('eleven_labs')) {
                // Determine stability based on keywords (e.g. if 'Analyze' -> more stable)
                elevenLabs.speak(responseText, getAgentVoice(activeAgent.id));
            }
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            addLog('ERROR', `EXEC_FAIL: ${e.message}`);
        }
    };

    return (
        <div className="h-full w-full bg-[#010103] flex flex-col font-sans overflow-hidden border border-white/5 rounded-[3rem] shadow-2xl relative transition-all duration-1000">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

            {/* Command Header */}
            <div className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-40 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-xl">
                            <BrainCircuit className="w-5 h-5 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white uppercase tracking-[0.5em] leading-none">Swarm Hub</h1>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-1.5">Autonomous Node Orchestration // v9.5</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/5" />

                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                        {[
                            { id: 'MEMORY', label: 'Neural Mesh', icon: Atom },
                            { id: 'SKILLS', label: 'Evolution', icon: Waypoints },
                            { id: 'TASKS', label: 'Deployment', icon: ListTodo },
                            { id: 'CONVERGENCE', label: 'ACE', icon: Gauge }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setViewMode(tab.id as any); audio.playClick(); }}
                                className={cn(
                                    "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all",
                                    viewMode === tab.id ? "bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/30" : "text-gray-600 hover:text-gray-300"
                                )}
                            >
                                <tab.icon size={12} className={viewMode === tab.id ? 'fill-current' : ''} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-white/5" />

                    {/* Persistent Knowledge Panel Toggle */}
                    <button
                        onClick={() => { setIsKnowledgePanelOpen(!isKnowledgePanelOpen); audio.playClick(); }}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border",
                            isKnowledgePanelOpen
                                ? "bg-[#18E6FF]/20 text-[#18E6FF] border-[#18E6FF]/40 shadow-[0_0_20px_rgba(24,230,255,0.2)]"
                                : "bg-black/40 border-white/10 text-gray-500 hover:text-[#18E6FF] hover:border-[#18E6FF]/30"
                        )}
                    >
                        <BookOpen size={14} className={isKnowledgePanelOpen ? 'fill-current' : ''} />
                        Knowledge
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            actions.setPreferences({ autonomyEnabled: !preferences.autonomyEnabled });
                            preferences.autonomyEnabled ? audio.playClick() : audio.playSuccess();
                        }}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all active:scale-95",
                            preferences.autonomyEnabled
                                ? "bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                : "bg-black/40 border-white/10 text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Zap size={14} className={preferences.autonomyEnabled ? "fill-current animate-pulse" : ""} />
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] font-black font-mono uppercase tracking-widest leading-none">Neuro-Link</span>
                            <span className="text-[10px] font-black font-mono uppercase leading-none">{preferences.autonomyEnabled ? "Autonomy: ON" : "Manual Mode"}</span>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            if (!apiKeyService.getKey('eleven_labs')) {
                                window.dispatchEvent(new CustomEvent('show-api-key-modal'));
                                return;
                            }
                            setIsVoiceEnabled(!isVoiceEnabled);
                            audio.playClick();
                        }}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all active:scale-95",
                            isVoiceEnabled
                                ? "bg-[#9d4edd]/10 border-[#9d4edd]/40 text-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.2)]"
                                : "bg-black/40 border-white/10 text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                        title={apiKeyService.getKey('eleven_labs') ? "Toggle Neural Voice" : "Configure ElevenLabs"}
                    >
                        <Headphones size={14} className={isVoiceEnabled ? "fill-current" : ""} />
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] font-black font-mono uppercase tracking-widest leading-none">Voice_Link</span>
                            <span className="text-[10px] font-black font-mono uppercase leading-none">{isVoiceEnabled ? "Audio: ON" : "Muted"}</span>
                        </div>
                    </button>
                    <ModelSelector />

                    <div className="h-8 w-px bg-white/5" />

                    <div className="text-right">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Swarm_Sync_Status</span>
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-black font-mono text-white tracking-tighter">98.4%</span>
                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_12px_#10b981]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Node Selector (Sidebar) */}
                <div className="w-[320px] border-r border-white/5 flex flex-col shrink-0 bg-black/20 z-10">
                    <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3 px-1">
                            <Binary size={14} className="text-[#9d4edd]" /> Operational Nodes
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        {agents.activeAgents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }}
                                className={cn(
                                    "w-full p-5 rounded-[2.5rem] border transition-all text-left flex flex-col gap-4 relative overflow-hidden group",
                                    selectedAgentId === agent.id
                                        ? "bg-white/[0.03] border-[#9d4edd]/40 shadow-2xl"
                                        : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-700",
                                            selectedAgentId === agent.id ? "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd] shadow-[0_0_15px_rgba(157,78,221,0.2)]" : "bg-black/40 border-white/10 text-gray-600"
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
                                        agent.status === 'ACTIVE' ? "bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" : "bg-gray-800"
                                    )} />
                                </div>
                                <div className="space-y-2.5">
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

                {/* Primary Content Deck */}
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
                                {/* Active Node Meta HUD - COMPACTED */}
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01] z-10 shrink-0 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] opacity-10" />

                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-[2rem] border border-white/10 flex items-center justify-center bg-black/40 relative overflow-hidden group/avatar shadow-2xl p-1">
                                                <Bot size={32} className="text-[#9d4edd] group-hover/avatar:scale-110 transition-transform duration-1000" />
                                                <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                            </div>
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center shadow-2xl"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_12px_#10b981]" />
                                            </motion.div>
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-lg font-black text-white uppercase tracking-[0.2em] leading-none font-mono">{activeAgent.name}_Mind_v4</h2>
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <Target size={12} className="text-[#9d4edd]" />
                                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{activeAgent.context}</span>
                                                </div>
                                                <div className="h-3 w-px bg-white/10" />
                                                <div className="flex items-center gap-2 text-[#10b981]">
                                                    <ShieldCheck size={12} />
                                                    <span className="text-[9px] font-mono font-black uppercase tracking-widest">Enclave_Attested_L0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 relative z-10">
                                        <button className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center gap-2 shadow-xl active:scale-95">
                                            <HistoryIcon size={14} /> Neural Checkpoint
                                        </button>
                                        <button className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 hover:bg-red-500 hover:text-black transition-all shadow-xl active:scale-95">
                                            <PowerOff size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Persistent Knowledge Panel - Visible across all tabs */}
                                <AnimatePresence>
                                    {isKnowledgePanelOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-b border-[#18E6FF]/20 bg-[#18E6FF]/[0.02] overflow-hidden shrink-0"
                                        >
                                            <div className="p-4">
                                                {/* Search Input */}
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="relative flex-1">
                                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#18E6FF]/50" />
                                                        <input
                                                            type="text"
                                                            value={knowledgeQuery}
                                                            onChange={(e) => setKnowledgeQuery(e.target.value)}
                                                            placeholder="Search knowledge... (multi-agent, routing, DQ scoring)"
                                                            className="w-full pl-11 pr-4 py-2.5 bg-black/60 border border-[#18E6FF]/20 rounded-xl text-xs font-mono text-white placeholder:text-gray-700 focus:border-[#18E6FF]/50 focus:outline-none transition-colors"
                                                        />
                                                        {isSearchingKnowledge && (
                                                            <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#18E6FF] animate-spin" />
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => { setIsKnowledgePanelOpen(false); audio.playClick(); }}
                                                        className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Search Results - Compact horizontal scroll */}
                                                {knowledgeQuery.length > 1 && knowledgeResults.length > 0 && (
                                                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                        {knowledgeResults.slice(0, 6).map((result, i) => (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: i * 0.05 }}
                                                                className="flex-shrink-0 w-72 p-3 bg-black/40 border border-white/5 rounded-xl hover:border-[#18E6FF]/30 transition-all group cursor-pointer"
                                                                onClick={() => {
                                                                    if (activeAgent) {
                                                                        const updatedMemory = [...activeAgent.memoryBuffer, {
                                                                            timestamp: Date.now(),
                                                                            role: 'AI' as const,
                                                                            text: `[KNOWLEDGE_INJECT] ${result.content}`
                                                                        }];
                                                                        updateAgent(activeAgent.id, { memoryBuffer: updatedMemory });
                                                                        addLog('SUCCESS', `Injected knowledge into ${activeAgent.name}'s context`);
                                                                        audio.playSuccess();
                                                                    }
                                                                }}
                                                            >
                                                                <p className="text-[11px] text-gray-300 font-mono leading-relaxed line-clamp-2 mb-2">
                                                                    {result.content.slice(0, 120)}{result.content.length > 120 ? '...' : ''}
                                                                </p>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 bg-[#9d4edd]/20 text-[#9d4edd] rounded text-[8px] font-black uppercase">
                                                                            {result.category}
                                                                        </span>
                                                                        <span className="text-[8px] font-mono text-gray-600">
                                                                            {Math.round(result.similarity * 100)}%
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-[#18E6FF] opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                                                                        + Inject
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Empty state */}
                                                {knowledgeQuery.length > 1 && knowledgeResults.length === 0 && !isSearchingKnowledge && (
                                                    <div className="text-center py-3 text-gray-600 text-[10px] font-mono uppercase tracking-widest">
                                                        No results for "{knowledgeQuery}"
                                                    </div>
                                                )}

                                                {/* Quick suggestions when no query */}
                                                {knowledgeQuery.length <= 1 && (
                                                    <div className="flex items-center gap-2 text-[9px] text-gray-600">
                                                        <span className="font-mono uppercase tracking-widest">Quick:</span>
                                                        {['routing', 'multi-agent', 'DQ scoring', 'ACE'].map(term => (
                                                            <button
                                                                key={term}
                                                                onClick={() => setKnowledgeQuery(term)}
                                                                className="px-2 py-1 bg-white/5 hover:bg-[#18E6FF]/10 rounded text-gray-500 hover:text-[#18E6FF] transition-colors font-mono"
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

                                {/* Dynamic Views - SPACED & COMPACTED */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative" ref={scrollRef}>
                                    {viewMode === 'MEMORY' && (
                                        <div className="max-w-4xl mx-auto space-y-8">
                                            <RelationalMemory history={activeAgent.memoryBuffer} />
                                            {activeAgent.status === 'THINKING' && (
                                                <div className="mt-12 p-10 flex flex-col items-center gap-8 opacity-60">
                                                    <Loader2 className="w-12 h-12 animate-spin text-[#9d4edd]" />
                                                    <span className="text-xs font-mono uppercase tracking-[0.6em] animate-pulse text-[#9d4edd] font-black uppercase">Crystallizing Neural Logic...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {viewMode === 'SKILLS' && (
                                        <div className="h-full flex flex-col items-center justify-center gap-12 py-4">
                                            <div className="scale-90 origin-center h-48 flex items-center justify-center">
                                                <SkillConstellation capabilities={activeAgent.capabilities} color="#9d4edd" isActive={true} />
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl px-4 pb-8">
                                                {activeAgent.capabilities.map(cap => (
                                                    <motion.div
                                                        key={cap}
                                                        whileHover={{ y: -3, scale: 1.01 }}
                                                        className="p-5 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col gap-4 group transition-all shadow-2xl relative overflow-hidden"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="flex justify-between items-start relative z-10">
                                                            <div className="p-3 rounded-2xl bg-black/40 text-[#9d4edd] border border-[#9d4edd]/30 shadow-lg">
                                                                <Zap size={16} className="group-hover:scale-110 transition-transform" />
                                                            </div>
                                                            <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                                        </div>
                                                        <div className="text-[12px] font-black text-white uppercase font-mono tracking-widest leading-tight relative z-10">{cap.split('_').join(' ')}</div>
                                                        <div className="text-[8px] text-gray-600 font-mono uppercase tracking-[0.2em] relative z-10">Protocol: Integrated</div>
                                                    </motion.div>
                                                ))}
                                                <button
                                                    onClick={() => window.location.hash = '/nexus'}
                                                    className="p-6 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-4 opacity-30 hover:opacity-100 hover:border-[#9d4edd]/50 transition-all cursor-pointer group shadow-2xl"
                                                >
                                                    <div className="p-4 bg-white/5 rounded-full group-hover:bg-[#9d4edd]/10 transition-colors">
                                                        <Plus size={32} className="text-gray-600 group-hover:text-[#9d4edd] transition-all" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-gray-500 font-mono tracking-[0.4em] group-hover:text-white">Graft Capability</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'TASKS' && (
                                        <div className="max-w-4xl mx-auto space-y-12 pb-24">
                                            <div className="flex items-center justify-between px-4">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-4 bg-[#10b981]/10 rounded-2xl text-[#10b981] border border-[#10b981]/30 shadow-xl">
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
                                                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                                        placeholder="New Mission Vector..."
                                                        className="bg-black/60 border border-white/10 px-6 py-3 rounded-2xl text-xs font-mono text-white focus:border-[#9d4edd] outline-none w-64 shadow-inner uppercase placeholder:text-gray-800"
                                                    />
                                                    <button onClick={handleAddTask} className="p-3 bg-[#9d4edd] text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"><Plus size={20} /></button>
                                                </div>
                                            </div>
                                            <div className="space-y-6 px-2">
                                                {activeAgent.tasks.map((task, i) => (
                                                    <motion.div
                                                        key={task.id}
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className={cn(
                                                            "p-8 rounded-[3rem] border transition-all flex items-center justify-between shadow-2xl relative overflow-hidden group",
                                                            task.status === 'COMPLETED' ? "bg-black/40 border-[#10b981]/20 opacity-50" :
                                                                task.status === 'IN_PROGRESS' ? "bg-[#9d4edd]/5 border-[#9d4edd]/40 shadow-[0_0_30px_rgba(157,78,221,0.1)]" :
                                                                    "bg-white/[0.01] border-white/5"
                                                        )}>
                                                        {task.status === 'IN_PROGRESS' && (
                                                            <motion.div animate={{ left: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-40" />
                                                        )}
                                                        <div className="flex items-center gap-12 relative z-10 min-w-0 flex-1 pr-10">
                                                            <button
                                                                onClick={() => toggleTaskStatus(task.id)}
                                                                className={cn(
                                                                    "w-14 h-14 rounded-[2rem] flex items-center justify-center font-mono font-black text-xl transition-all shrink-0 shadow-xl",
                                                                    task.status === 'COMPLETED' ? "bg-[#10b981] text-black shadow-[0_0_25px_rgba(16,185,129,0.3)]" :
                                                                        task.status === 'IN_PROGRESS' ? "bg-[#9d4edd] text-black shadow-[0_0_35px_rgba(157,78,221,0.4)]" :
                                                                            "bg-black border border-white/10 text-gray-700 hover:border-white/40 hover:text-white"
                                                                )}
                                                            >
                                                                {(i + 1).toString().padStart(2, '0')}
                                                            </button>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-lg font-black text-white uppercase tracking-tight mb-3 truncate group-hover:text-[#9d4edd] transition-colors">{task.description}</h4>
                                                                <div className="flex gap-8 items-center">
                                                                    <div className="flex items-center gap-2.5 text-[10px] font-mono text-gray-600 uppercase tracking-widest font-black">
                                                                        <Target size={14} className="text-[#9d4edd]" /> LATTICE_NODE_{i}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-gray-700 uppercase italic truncate opacity-60">Status: {task.status}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative z-10 flex gap-4">
                                                            {task.status === 'COMPLETED' ? <CheckCircle2 size={36} className="text-[#10b981]" /> :
                                                                task.status === 'IN_PROGRESS' ? <Loader2 size={36} className="text-[#9d4edd] animate-spin" /> :
                                                                    <button onClick={() => toggleTaskStatus(task.id)} className="p-4 hover:bg-white/5 rounded-2xl text-gray-600 hover:text-white transition-all"><ChevronRight size={28} /></button>}
                                                            <button
                                                                onClick={() => updateAgent(activeAgent.id, { tasks: activeAgent.tasks.filter(t => t.id !== task.id) })}
                                                                className="p-4 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-700 hover:text-red-500 rounded-2xl transition-all"
                                                            >
                                                                <Trash2 size={22} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'CONVERGENCE' && (
                                        <div className="max-w-5xl mx-auto space-y-12 pb-24">
                                            {/* Header */}
                                            <div className="flex items-center justify-between px-4">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-4 bg-[#22d3ee]/10 rounded-2xl text-[#22d3ee] border border-[#22d3ee]/30 shadow-xl">
                                                        <Gauge size={24} />
                                                    </div>
                                                    <div>
                                                        <span className="text-base font-black text-white uppercase tracking-[0.5em]">Adaptive Convergence Engine</span>
                                                        <p className="text-[10px] text-gray-500 font-mono uppercase mt-2.5 tracking-widest">DQ Scoring & Pattern Learning Analytics</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => convergenceMemory.getStats().then(setConvergenceStats)}
                                                    className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center gap-2 shadow-xl active:scale-95"
                                                >
                                                    <RefreshCw size={14} /> Refresh Stats
                                                </button>
                                            </div>

                                            {/* Stats Grid */}
                                            {convergenceStats ? (
                                                <div className="grid grid-cols-3 gap-6 px-4">
                                                    {/* Total Patterns */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl"
                                                    >
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <div className="p-3 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd] border border-[#9d4edd]/30">
                                                                <Layers size={20} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Patterns</span>
                                                        </div>
                                                        <div className="text-4xl font-black text-white font-mono">{convergenceStats.totalPatterns}</div>
                                                        <div className="text-[9px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Convergence Events Recorded</div>
                                                    </motion.div>

                                                    {/* Avg DQ Score */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="p-8 bg-white/[0.02] border border-[#10b981]/20 rounded-[2.5rem] shadow-2xl"
                                                    >
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <div className="p-3 bg-[#10b981]/10 rounded-xl text-[#10b981] border border-[#10b981]/30">
                                                                <Target size={20} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Avg DQ Score</span>
                                                        </div>
                                                        <div className={cn(
                                                            "text-4xl font-black font-mono",
                                                            convergenceStats.avgDQScore >= 0.7 ? "text-[#10b981]" :
                                                            convergenceStats.avgDQScore >= 0.5 ? "text-[#f59e0b]" : "text-[#ef4444]"
                                                        )}>
                                                            {Math.round(convergenceStats.avgDQScore * 100)}%
                                                        </div>
                                                        <div className="text-[9px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Decision Quality Index</div>
                                                    </motion.div>

                                                    {/* Avg Rounds */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.2 }}
                                                        className="p-8 bg-white/[0.02] border border-[#22d3ee]/20 rounded-[2.5rem] shadow-2xl"
                                                    >
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <div className="p-3 bg-[#22d3ee]/10 rounded-xl text-[#22d3ee] border border-[#22d3ee]/30">
                                                                <Activity size={20} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Avg Rounds</span>
                                                        </div>
                                                        <div className="text-4xl font-black text-[#22d3ee] font-mono">{convergenceStats.avgRoundsToConverge.toFixed(1)}</div>
                                                        <div className="text-[9px] font-mono text-gray-600 mt-2 uppercase tracking-widest">Rounds to Consensus</div>
                                                    </motion.div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                                    <Loader2 className="w-12 h-12 animate-spin text-[#22d3ee] mb-6" />
                                                    <span className="text-sm font-mono uppercase tracking-widest">Loading Convergence Data...</span>
                                                </div>
                                            )}

                                            {/* Top Domains & Agents */}
                                            {convergenceStats && (convergenceStats.topDomains.length > 0 || convergenceStats.topAgents.length > 0) && (
                                                <div className="grid grid-cols-2 gap-8 px-4">
                                                    {/* Top Domains */}
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 }}
                                                        className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl"
                                                    >
                                                        <div className="flex items-center gap-4 mb-8">
                                                            <Globe size={20} className="text-[#f59e0b]" />
                                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Top Domains</span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {convergenceStats.topDomains.map((d, i) => (
                                                                <div key={d.domain} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-[10px] font-mono text-gray-700 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                                                                        <span className="text-sm font-black text-white uppercase tracking-wider">{d.domain}</span>
                                                                    </div>
                                                                    <span className="text-sm font-mono text-[#f59e0b]">{d.count}</span>
                                                                </div>
                                                            ))}
                                                            {convergenceStats.topDomains.length === 0 && (
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
                                                            <Bot size={20} className="text-[#9d4edd]" />
                                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Top Winning Agents</span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {convergenceStats.topAgents.map((a, i) => (
                                                                <div key={a.agentId} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-[10px] font-mono text-gray-700 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                                                                        <span className="text-sm font-black text-white uppercase tracking-wider">{a.agentId}</span>
                                                                    </div>
                                                                    <span className="text-sm font-mono text-[#9d4edd]">{a.winCount} wins</span>
                                                                </div>
                                                            ))}
                                                            {convergenceStats.topAgents.length === 0 && (
                                                                <div className="text-[10px] font-mono text-gray-700 uppercase">No agent data yet</div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            )}

                                            {/* Empty State */}
                                            {convergenceStats && convergenceStats.totalPatterns === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                                    <Gauge size={80} className="mb-8 text-[#22d3ee]" />
                                                    <h3 className="text-xl font-black text-white uppercase tracking-[0.5em] mb-4">No Convergence Data</h3>
                                                    <p className="text-sm font-mono text-gray-500 uppercase tracking-widest text-center max-w-md">
                                                        Run tasks through the Bicameral Engine with ACE mode enabled to start collecting convergence patterns and DQ scores.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Active Command Input Strip - COMPACTED */}
                                <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-3xl relative z-20 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
                                    <div className="max-w-5xl mx-auto space-y-3">
                                        <div className="flex justify-between px-8">
                                            <div className="flex gap-8">
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.8em] flex items-center gap-3">
                                                    <Radio size={12} className="text-[#10b981] animate-pulse" /> Uplink Stable
                                                </span>
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.8em] flex items-center gap-3">
                                                    <Database size={12} className="text-[#22d3ee]" /> Relational R/W: OK
                                                </span>
                                            </div>
                                            <div className="flex gap-8">
                                                <button onClick={() => setInput('Ground strategic PARA context using Google Oracles')} className="text-[8px] font-mono text-gray-700 hover:text-[#9d4edd] uppercase tracking-[0.4em] transition-all font-black">{"{ GROUND_SEARCH }"}</button>
                                                <button onClick={() => setInput('Initialize recursive system evolution sequence')} className="text-[8px] font-mono text-gray-700 hover:text-[#22d3ee] uppercase tracking-[0.4em] transition-all font-black">{"{ EVOLVE_LATTICE }"}</button>
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#9d4edd]/15 via-transparent to-[#9d4edd]/15 blur-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000" />
                                            <div className="crystalline border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-4 focus-within:border-[#9d4edd]/50 transition-all shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden invisible-glass">

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
                                                    {activeAgent.status === 'THINKING' ? (
                                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                                                            <Brain size={20} className="text-[#9d4edd]" />
                                                        </motion.div>
                                                    ) : (
                                                        <Command size={20} className="group-focus-within:text-white transition-colors" />
                                                    )}
                                                </div>
                                                <input
                                                    value={input}
                                                    onChange={e => setInput(e.target.value)}
                                                    placeholder={activeAgent.status === 'THINKING' ? "NODE_BUSY: ALIGNING NEURAL VECTORS..." : `GIVE DIRECTIVE TO ${activeAgent.name.toUpperCase()}...`}
                                                    className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-800 uppercase tracking-[0.3em] py-3 px-4"
                                                    onKeyDown={e => e.key === 'Enter' && (e.shiftKey ? handleSearchGrounding() : handleDirectExecute())}
                                                />
                                                <div className="flex gap-2 pr-2">
                                                    <button
                                                        onClick={handleSearchGrounding}
                                                        title="Search Grounding (SHIFT+ENTER)"
                                                        className="p-3 bg-black/40 hover:bg-[#22d3ee] border border-white/5 hover:text-black rounded-[1.8rem] text-[#22d3ee] transition-all active:scale-95 shadow-xl group/btn"
                                                    >
                                                        <Search size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={handleDirectExecute}
                                                        className="p-3 bg-[#9d4edd]/10 hover:bg-[#9d4edd] border border-[#9d4edd]/30 hover:text-black rounded-[1.8rem] text-[#9d4edd] transition-all active:scale-95 shadow-[0_0_40px_rgba(157,78,221,0.3)] group/btn"
                                                    >
                                                        <Send size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-16 grayscale p-20 text-center group cursor-default">
                                <Bot size={240} className="group-hover:scale-110 transition-transform duration-[5s] opacity-50" />
                                <div className="space-y-8">
                                    <h2 className="text-5xl font-black font-mono uppercase tracking-[1.8em] text-white leading-tight">Hub Standby</h2>
                                    <p className="text-sm font-mono uppercase tracking-[0.6em] max-w-2xl mx-auto leading-loose opacity-80">
                                        Select an operational node from the matrix to initialize high-fidelity cognitive orchestration and recursive logic synthesis.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global HUD Status Strip */}
            <div className="h-10 border-t border-white/5 bg-black/90 px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 tracking-[0.5em] shrink-0 z-50 uppercase font-black">
                <div className="flex gap-20">
                    <div className="flex items-center gap-5">
                        <Activity size={16} className="text-[#10b981]" /> SYNC: STABLE
                    </div>
                    <div className="flex items-center gap-5">
                        <Cpu size={16} className="text-[#9d4edd]" /> LOAD: {Math.floor(Math.random() * 10 + 5)}%
                    </div>
                    <div className="flex items-center gap-5">
                        <Database size={16} className="text-[#22d3ee]" /> RELATIONAL_MESH: ACTIVE
                    </div>
                </div>
                <div className="flex items-center gap-12">
                    <span>LATTICE_CORE_V9.5.4</span>
                    <div className="h-5 w-px bg-white/10" />
                    <span className="text-gray-500">THE D-ECOSYSTEM ZENITH_OS</span>
                </div>
            </div>
        </div>
    );
};

export default AgentControlCenter;