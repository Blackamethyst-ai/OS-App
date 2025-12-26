
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    Bot, Cpu, Activity, Zap, Shield, Search, Send, 
    Loader2, BrainCircuit, Terminal, Radio, Info,
    Power, RefreshCw, Layers, Target, Code, Database, Globe,
    Settings, Sliders, X, CheckCircle2, AlertTriangle, ListChecks,
    History, Binary, Brain, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, AtomicTask } from '../types';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { retryGeminiRequest } from '../services/geminiService';
import { audio } from '../services/audioService';

const CONTEXT_CONFIG: Record<OperationalContext, { label: string, icon: any, color: string, desc: string }> = {
    [OperationalContext.CODE_GENERATION]: { label: 'Code Weaver', icon: Code, color: '#f1c21b', desc: 'Synthesizing logical structures and algorithmic patterns.' },
    [OperationalContext.DATA_ANALYSIS]: { label: 'Data Sentinel', icon: Database, color: '#22d3ee', desc: 'Parsing multi-dimensional datasets for structural anomalies.' },
    [OperationalContext.SYSTEM_MONITORING]: { label: 'Kernel Overwatch', icon: Shield, color: '#10b981', desc: 'Deep-scanning system health and entropy propagation.' },
    [OperationalContext.STRATEGY_SYNTHESIS]: { label: 'Grand Architect', icon: Layers, color: '#9d4edd', desc: 'Mapping digital leverage points to physical deltas.' },
    [OperationalContext.GENERAL_PURPOSE]: { label: 'Synthetic Mind', icon: Globe, color: '#ffffff', desc: 'Autonomous general intelligence buffer.' }
};

const AgentSettingsModal = ({ agent, onClose }: { agent: AutonomousAgent, onClose: () => void }) => {
    const { updateAgent, addLog } = useAppStore();
    const [mindset, setMindset] = useState(agent.currentMindset);

    const handleSave = () => {
        updateAgent(agent.id, { currentMindset: mindset });
        addLog('SUCCESS', `CALIBRATION: Adjusted ${agent.name} neural weights.`);
        audio.playSuccess();
        onClose();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-[#333] rounded-[2.5rem] p-10 w-full max-w-lg shadow-[0_0_100px_rgba(157,78,221,0.2)]">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 rounded-2xl border border-[#9d4edd]/30 text-[#9d4edd]">
                            <Sliders size={20} />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest">{agent.name} Calibration</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={20}/></button>
                </div>

                <div className="space-y-8">
                    {[
                        { id: 'skepticism', label: 'Logical Skepticism', color: '#ef4444' },
                        { id: 'excitement', label: 'Neural Excitement', color: '#f59e0b' },
                        { id: 'alignment', label: 'System Alignment', color: '#22d3ee' }
                    ].map(param => (
                        <div key={param.id} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">{param.label}</div>
                                    <div className="text-[8px] text-gray-600 font-mono">Critical filtering and error detection bias.</div>
                                </div>
                                <span className="text-sm font-black font-mono" style={{ color: param.color }}>{(mindset as any)[param.id]}%</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div animate={{ width: `${(mindset as any)[param.id]}%` }} className="h-full" style={{ backgroundColor: param.color }} />
                                <input 
                                    type="range" min="0" max="100" 
                                    value={(mindset as any)[param.id]} 
                                    onChange={e => setMindset({ ...mindset, [param.id]: parseInt(e.target.value) })}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className="w-full py-5 mt-12 bg-[#9d4edd] text-black font-black uppercase text-xs tracking-[0.4em] rounded-[1.5rem] shadow-2xl hover:bg-[#b06bf7] active:scale-95 transition-all">Apply Neural Drift</button>
            </motion.div>
        </motion.div>
    );
};

const AgentControlCenter: React.FC = () => {
    const { agents, setAgentState, updateAgent, addLog } = useAppStore();
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeAgent = agents.activeAgents.find(a => a.id === selectedAgentId);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [activeAgent?.memoryBuffer]);

    const handleIntentDispatch = async () => {
        if (!input.trim() || !activeAgent) return;
        
        const currentInput = input;
        setInput('');
        setAgentState({ isDispatching: true });
        
        updateAgent(activeAgent.id, { 
            status: 'THINKING', 
            memoryBuffer: [...activeAgent.memoryBuffer, `User: ${currentInput}`] 
        });

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User Intent: "${currentInput}"\nCurrent Context: ${activeAgent.context}\nMental State: ${JSON.stringify(activeAgent.currentMindset)}\nTask: 1. Respond as the agent. 2. If the user asks for a task or organization, suggest 1-3 atomic tasks.`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            suggestedContext: { type: Type.STRING, enum: Object.values(OperationalContext) },
                            responseText: { type: Type.STRING },
                            internalThought: { type: Type.STRING },
                            energyDrain: { type: Type.NUMBER },
                            newTasks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        description: { type: Type.STRING },
                                        instruction: { type: Type.STRING },
                                        weight: { type: Type.NUMBER }
                                    }
                                }
                            }
                        },
                        required: ['suggestedContext', 'responseText', 'internalThought', 'energyDrain']
                    }
                }
            }));

            const result = JSON.parse(response.text || '{}');
            
            const nextContext = result.suggestedContext as OperationalContext;
            const contextShifted = nextContext !== activeAgent.context;

            if (contextShifted) {
                addLog('INFO', `AGENT_CORE: Context migration detected. [${activeAgent.context}] -> [${nextContext}]`);
                audio.playTransition();
            }

            const generatedTasks = (result.newTasks || []).map((t: any) => ({
                id: `task-${Date.now()}-${Math.random()}`,
                description: t.description,
                instruction: t.instruction,
                weight: t.weight,
                status: 'PENDING',
                isolated_input: ''
            } as AtomicTask));

            updateAgent(activeAgent.id, {
                status: 'ACTIVE',
                context: nextContext,
                energyLevel: Math.max(0, activeAgent.energyLevel - (result.energyDrain || 5)),
                memoryBuffer: [...activeAgent.memoryBuffer, `AI: ${result.responseText}`],
                lastInstruction: result.internalThought,
                tasks: [...activeAgent.tasks, ...generatedTasks]
            });

            audio.playSuccess();
        } catch (e: any) {
            addLog('ERROR', `DISPATCH_FAIL: ${e.message}`);
            updateAgent(activeAgent.id, { status: 'IDLE' });
            audio.playError();
        } finally {
            setAgentState({ isDispatching: false });
        }
    };

    const toggleAgentStatus = (id: string) => {
        const agent = agents.activeAgents.find(a => a.id === id);
        if (!agent) return;
        const nextStatus = agent.status === 'SLEEPING' ? 'IDLE' : 'SLEEPING';
        updateAgent(id, { status: nextStatus });
        addLog('SYSTEM', `AGENT_UPDATE: ${agent.name} is now ${nextStatus}.`);
        audio.playClick();
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-[3rem] overflow-hidden shadow-2xl relative font-sans">
            <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-2xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <Bot className="w-6 h-6 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Swarm Command</h1>
                        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Autonomous Cognitive Layer // v9.2</span>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active_Nodes</span>
                        <span className="text-sm font-black font-mono text-[#9d4edd]">{agents.activeAgents.filter(a => a.status !== 'SLEEPING').length}</span>
                    </div>
                    <button className="p-3 bg-white/5 border border-white/10 hover:border-[#9d4edd] rounded-2xl text-gray-500 hover:text-white transition-all shadow-xl group">
                        <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Agent Sidebar */}
                <div className="w-[380px] border-r border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-6 border-b border-[#1f1f1f] bg-white/[0.02] flex justify-between items-center">
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Synaptic Directory</span>
                        <Target size={14} className="text-gray-700" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                        {agents.activeAgents.map(agent => (
                            <div 
                                key={agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                                className={`p-6 rounded-[2rem] border cursor-pointer transition-all duration-500 relative group overflow-hidden
                                    ${selectedAgentId === agent.id ? 'bg-[#0a0a0a] border-[#9d4edd] shadow-2xl scale-[1.02] z-10' : 'bg-transparent border-transparent hover:bg-white/[0.02] opacity-60 hover:opacity-100'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-3 rounded-2xl transition-all duration-700 ${selectedAgentId === agent.id ? 'bg-[#9d4edd] text-black shadow-[0_0_20px_#9d4edd]' : 'bg-[#1a1a1a] text-gray-700 group-hover:text-gray-300'}`}>
                                            <Bot size={24} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white uppercase tracking-widest mb-1">{agent.name}</div>
                                            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">{agent.role}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent.id); }}
                                        className={`p-2 rounded-xl transition-all ${agent.status !== 'SLEEPING' ? 'text-[#10b981] bg-[#10b981]/5 border border-[#10b981]/20' : 'text-gray-800'}`}
                                    >
                                        <Power size={14} />
                                    </button>
                                </div>
                                
                                <div className="space-y-2 relative z-10">
                                    <div className="flex justify-between text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                        <span>Energy Manifest</span>
                                        <span className={agent.energyLevel < 30 ? 'text-red-500 animate-pulse' : 'text-white'}>{agent.energyLevel}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                        <motion.div 
                                            animate={{ width: `${agent.energyLevel}%` }}
                                            className={`h-full rounded-full transition-colors duration-1000 ${agent.energyLevel > 60 ? 'bg-[#10b981]' : agent.energyLevel > 30 ? 'bg-[#f59e0b]' : 'bg-red-500'}`}
                                            style={{ boxShadow: `0 0 10px ${agent.energyLevel > 60 ? '#10b98144' : agent.energyLevel > 30 ? '#f59e0b44' : '#ef444444'}` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Agent Viewport */}
                <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div 
                                key={activeAgent.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Immersive Header */}
                                <div className="p-8 border-b border-white/5 bg-[#0a0a0a]/50 flex justify-between items-center shrink-0 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-12"><Activity size={160} /></div>
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10" style={{ color: CONTEXT_CONFIG[activeAgent.context].color }}>
                                                {React.createElement(CONTEXT_CONFIG[activeAgent.context].icon, { size: 24 })}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">{CONTEXT_CONFIG[activeAgent.context].label} Interface</h3>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${activeAgent.status !== 'SLEEPING' ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Latent Buffer Ready // {activeAgent.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative z-10">
                                        <button onClick={() => setShowSettings(true)} className="p-3.5 bg-[#111] hover:bg-white/5 border border-white/5 rounded-2xl text-gray-600 hover:text-white transition-all shadow-xl active:scale-90">
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Main Interaction Zone */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Memory Stream */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10" ref={scrollRef}>
                                        <div className="max-w-4xl mx-auto space-y-10 pb-20">
                                            <AnimatePresence initial={false}>
                                                {activeAgent.memoryBuffer.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-10 py-32 text-center gap-8">
                                                        <Radio size={80} className="text-gray-500 animate-pulse" />
                                                        <div className="space-y-2">
                                                            <p className="text-2xl font-mono uppercase tracking-[0.6em]">Memory Void</p>
                                                            <p className="text-[11px] text-gray-600 uppercase tracking-widest">Awaiting primary directive sequence to populate buffer</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    activeAgent.memoryBuffer.map((line, i) => {
                                                        const isUser = line.startsWith('User:');
                                                        const content = line.split(': ').slice(1).join(': ');
                                                        return (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                key={i} 
                                                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                                            >
                                                                <div className={`max-w-[75%] p-8 rounded-[2.5rem] border font-mono text-[13px] leading-relaxed shadow-2xl relative overflow-hidden group
                                                                    ${isUser 
                                                                        ? 'bg-[#0a0a0a] border-white/5 text-gray-300 rounded-tr-none' 
                                                                        : 'bg-[#080808] border-[#9d4edd]/20 text-white rounded-tl-none border-l-4 border-l-[#9d4edd]'}
                                                                `}>
                                                                    <div className="absolute top-2 right-4 text-[8px] font-black text-gray-700 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Trace_L0</div>
                                                                    {content}
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })
                                                )}
                                            </AnimatePresence>
                                            {activeAgent.status === 'THINKING' && (
                                                <div className="flex items-center gap-4 text-[#9d4edd] animate-pulse pl-4">
                                                    <div className="relative">
                                                        <Loader2 size={18} className="animate-spin" />
                                                        <div className="absolute inset-0 blur-md bg-[#9d4edd]/20" />
                                                    </div>
                                                    <span className="text-[11px] font-mono uppercase font-black tracking-widest">Neural Resonance active...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Agent Task Panel */}
                                    <div className="w-[450px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 shadow-2xl relative">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
                                        
                                        <div className="p-8 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01] shrink-0">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-[#22d3ee]/10 rounded-xl text-[#22d3ee] border border-[#22d3ee]/30 shadow-inner">
                                                    <ListChecks size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Atomic Tasks</h2>
                                                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">{activeAgent.tasks.length} Vectors Queued</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                                            {activeAgent.tasks.length > 0 ? (
                                                activeAgent.tasks.map((task, i) => (
                                                    <motion.div 
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.1 }}
                                                        key={task.id}
                                                        className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl group/task hover:border-[#9d4edd]/30 transition-all shadow-xl relative overflow-hidden"
                                                    >
                                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                                            <div className="p-2 rounded-lg bg-white/5 text-gray-600 group-hover/task:text-[#9d4edd] transition-colors">
                                                                <Binary size={16} />
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black font-mono uppercase tracking-tighter ${task.status === 'COMPLETED' ? 'text-[#10b981] bg-[#10b981]/5' : 'text-[#f59e0b] bg-[#f59e0b]/5'}`}>
                                                                {task.status}
                                                            </div>
                                                        </div>
                                                        <p className="text-[12px] font-bold text-gray-200 uppercase font-mono tracking-tight leading-relaxed mb-4 group-hover/task:text-white transition-colors">"{task.description}"</p>
                                                        <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase relative z-10">
                                                            <div className="flex items-center gap-2">
                                                                <Target size={12} />
                                                                <span>Weight: {task.weight}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    const updatedTasks = activeAgent.tasks.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' as const } : t);
                                                                    updateAgent(activeAgent.id, { tasks: updatedTasks });
                                                                    audio.playSuccess();
                                                                }}
                                                                className="text-[#9d4edd] opacity-0 group-hover/task:opacity-100 hover:underline transition-all"
                                                            >
                                                                RESOLVE
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6 py-20 grayscale">
                                                    <Brain size={64} />
                                                    <p className="text-[10px] font-mono uppercase tracking-[0.4em]">No Active Tasks</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-10 border-t border-[#1f1f1f] bg-black shrink-0 space-y-6">
                                            <div className="flex justify-between items-center text-[11px] font-black font-mono text-gray-600 uppercase tracking-widest px-1">
                                                <span>Cognitive Load</span>
                                                <span className="text-[#22d3ee] animate-pulse">Sync_OK</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col gap-1 shadow-inner group/stat hover:border-white/10 transition-all">
                                                    <span className="text-[8px] text-gray-600 uppercase font-mono tracking-widest">Skepticism</span>
                                                    <span className="text-2xl font-black font-mono text-white group-hover:text-red-500 transition-colors">{activeAgent.currentMindset.skepticism}%</span>
                                                </div>
                                                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col gap-1 shadow-inner group/stat hover:border-white/10 transition-all">
                                                    <span className="text-[8px] text-gray-600 uppercase font-mono tracking-widest">Excitement</span>
                                                    <span className="text-2xl font-black font-mono text-white group-hover:text-[#f59e0b] transition-colors">{activeAgent.currentMindset.excitement}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Terminal Command Input */}
                                <div className="p-10 border-t border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-3xl shrink-0 relative">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />
                                    <div className="max-w-4xl mx-auto relative group">
                                        <div className="absolute -top-14 left-0 right-0 flex justify-between px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Activity size={14} className="text-[#9d4edd] animate-pulse" />
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Synaptic_Handshake_L0</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest">Input: DIRECTIVE_PROTOCOL_V4</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                            </div>
                                        </div>
                                        <form 
                                            onSubmit={(e) => { e.preventDefault(); handleIntentDispatch(); }}
                                            className="relative flex items-center bg-[#050505] border border-white/10 group-focus-within:border-[#9d4edd] p-2.5 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] transition-all duration-700"
                                        >
                                            <div className="p-4 text-gray-700 group-focus-within:text-[#9d4edd] transition-colors">
                                                <BrainCircuit size={28} />
                                            </div>
                                            <input 
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                disabled={activeAgent.status === 'THINKING' || activeAgent.status === 'SLEEPING'}
                                                placeholder={activeAgent.status === 'SLEEPING' ? "NODE_OFFLINE: Reactivate to input directive..." : "Dispatch high-fidelity operational directive sequence..."}
                                                className="flex-1 bg-transparent border-none outline-none text-base font-mono text-white placeholder:text-gray-800 uppercase tracking-widest"
                                            />
                                            <button 
                                                disabled={!input.trim() || activeAgent.status === 'THINKING'}
                                                className="px-10 py-5 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all disabled:opacity-30 shadow-2xl group/send active:scale-95"
                                            >
                                                <Send size={20} className="group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-12 py-32 grayscale">
                                <Bot size={180} className="animate-pulse" />
                                <p className="text-3xl font-mono uppercase tracking-[1.5em] text-center">Node Standby</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Tactical Footer HUD */}
            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f1f1f] px-12 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                        {/* Fix: Added ShieldCheck to lucide-react imports above */}
                        <ShieldCheck size={18} className="shadow-[0_0_15px_#10b981]" /> Agent_Integrity_Confirmed
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <Binary size={18} className="text-[#9d4edd]" /> Logic_Bus: 4.8 GHz
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.4em]">
                        <Globe size={18} className="text-[#22d3ee]" /> Node_Origin: SOVEREIGN_ENCLAVE
                    </div>
                </div>
                <div className="flex items-center gap-12 shrink-0">
                    <span className="uppercase tracking-[0.6em] opacity-40 leading-none hidden lg:block text-[9px]">Sovereign Swarm Architecture v9.2 // Multi-Agent Orchestration</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-[0.3em] leading-none text-[10px]">OS_AGENTS_CORE</span>
                </div>
            </div>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && activeAgent && (
                    <AgentSettingsModal agent={activeAgent} onClose={() => setShowSettings(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgentControlCenter;
