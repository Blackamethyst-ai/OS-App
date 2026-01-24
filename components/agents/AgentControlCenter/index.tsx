import { apiKeyService } from '../../../services/apiKeyService';
import { modelRouter } from '../../../services/modelRouter';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../../store';
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
import { elevenLabs, ELEVEN_LABS_VOICES } from '../../../services/elevenLabsService';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, MentalState, TaskStatus, AtomicTask } from '../../../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { promptSelectKey, SOVEREIGN_SYSTEM_INSTRUCTION, retryGeminiRequest, getAI } from '../../../services/geminiService';
import { audio } from '../../../services/audioService';
import { cn } from '../../../utils/cn';
import { ModelSelector } from '../../ModelSelector';
import { convergenceMemory } from '../../../services/bicameralService';

// Extracted sub-components
import {
    SkillConstellation,
    RelationalMemory,
    ConvergenceView,
    TasksView,
    KnowledgePanel,
    CommandStrip,
    NodeSelector
} from './parts';

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
                <NodeSelector
                    agents={agents.activeAgents}
                    selectedId={selectedAgentId}
                    onSelect={(id) => { setSelectedAgentId(id); audio.playClick(); }}
                />

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
                                <KnowledgePanel
                                    isOpen={isKnowledgePanelOpen}
                                    query={knowledgeQuery}
                                    setQuery={setKnowledgeQuery}
                                    results={knowledgeResults}
                                    isSearching={isSearchingKnowledge}
                                    onClose={() => { setIsKnowledgePanelOpen(false); audio.playClick(); }}
                                    onInject={(content) => {
                                        if (activeAgent) {
                                            const updatedMemory = [...activeAgent.memoryBuffer, {
                                                timestamp: Date.now(),
                                                role: 'AI' as const,
                                                text: `[KNOWLEDGE_INJECT] ${content}`
                                            }];
                                            updateAgent(activeAgent.id, { memoryBuffer: updatedMemory });
                                            addLog('SUCCESS', `Injected knowledge into ${activeAgent.name}'s context`);
                                            audio.playSuccess();
                                        }
                                    }}
                                />

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
                                        <TasksView
                                            agent={activeAgent}
                                            taskInput={taskInput}
                                            setTaskInput={setTaskInput}
                                            onAddTask={handleAddTask}
                                            onToggleStatus={toggleTaskStatus}
                                            onDeleteTask={(taskId) => updateAgent(activeAgent.id, { tasks: activeAgent.tasks.filter(t => t.id !== taskId) })}
                                        />
                                    )}

                                    {viewMode === 'CONVERGENCE' && (
                                        <ConvergenceView
                                            stats={convergenceStats}
                                            onRefresh={() => convergenceMemory.getStats().then(setConvergenceStats)}
                                        />
                                    )}
                                </div>

                                {/* Active Command Input Strip - COMPACTED */}
                                <CommandStrip
                                    agent={activeAgent}
                                    input={input}
                                    setInput={setInput}
                                    isGrounding={isGrounding}
                                    onExecute={handleDirectExecute}
                                    onSearchGrounding={handleSearchGrounding}
                                />
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