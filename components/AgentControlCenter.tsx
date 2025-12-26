import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    Bot, Cpu, Activity, Zap, Shield, Search, Send, 
    Loader2, BrainCircuit, Terminal, Radio, Info,
    Power, RefreshCw, Layers, Target, Code, Database, Globe,
    Settings, Sliders, X, CheckCircle2, AlertTriangle, ListChecks,
    History, Binary, Brain, ShieldCheck, Sparkles, Microscope,
    Fingerprint, Gauge, Waves, ChevronRight, PlayCircle, Boxes
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, AtomicTask, MentalState } from '../types';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { audio } from '../services/audioService';

const CONTEXT_CONFIG: Record<OperationalContext, { label: string, icon: any, color: string, desc: string }> = {
    [OperationalContext.CODE_GENERATION]: { label: 'Code Weaver', icon: Code, color: '#f1c21b', desc: 'Synthesizing logical structures and algorithmic patterns.' },
    [OperationalContext.DATA_ANALYSIS]: { label: 'Data Sentinel', icon: Database, color: '#22d3ee', desc: 'Parsing multi-dimensional datasets for structural anomalies.' },
    [OperationalContext.SYSTEM_MONITORING]: { label: 'Kernel Overwatch', icon: Shield, color: '#10b981', desc: 'Deep-scanning system health and entropy propagation.' },
    [OperationalContext.STRATEGY_SYNTHESIS]: { label: 'Grand Architect', icon: Layers, color: '#9d4edd', desc: 'Mapping digital leverage points to physical deltas.' },
    [OperationalContext.GENERAL_PURPOSE]: { label: 'Synthetic Mind', icon: Globe, color: '#ffffff', desc: 'Autonomous general intelligence buffer.' }
};

const CapabilityChip: React.FC<{ text: string; color: string }> = ({ text, color }) => (
    <div 
        className="px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest whitespace-nowrap shadow-inner transition-all hover:scale-105"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}
    >
        {text}
    </div>
);

const BioResonanceMeter: React.FC<{ level: number, isActive: boolean }> = ({ level, isActive }) => {
    const color = level > 70 ? '#10b981' : level > 30 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Bio-Resonance // Energy</span>
                <span className="text-[11px] font-black font-mono" style={{ color }}>{level}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5 relative shadow-inner">
                <motion.div 
                    initial={false}
                    animate={{ 
                        width: `${level}%`,
                        backgroundColor: color,
                        opacity: isActive ? [0.6, 1, 0.6] : 1
                    }}
                    transition={isActive ? { duration: 1, repeat: Infinity } : { duration: 1 }}
                    className="h-full rounded-full transition-all shadow-[0_0_15px_currentColor]"
                />
            </div>
        </div>
    );
};

const AgentSettingsModal: React.FC<{ agent: AutonomousAgent, onClose: () => void }> = ({ agent, onClose }) => {
    const { updateAgent, addLog } = useAppStore();
    const [mindset, setMindset] = useState<MentalState>(agent.currentMindset);

    const handleSave = () => {
        updateAgent(agent.id, { currentMindset: mindset });
        addLog('SUCCESS', `CALIBRATION: Adjusted ${agent.name} neural weights.`);
        audio.playSuccess();
        onClose();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-[#333] rounded-[3rem] p-12 w-full max-w-xl shadow-[0_0_150px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12"><Brain size={200} /></div>
                
                <div className="flex justify-between items-center mb-10 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[#9d4edd]/10 rounded-[1.5rem] border border-[#9d4edd]/30 text-[#9d4edd] shadow-2xl">
                            <Sliders size={28} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">{agent.name} Calibration</h2>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Autonomous Personality Matrix v4.2</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all"><X size={24} className="text-gray-500" /></button>
                </div>

                <div className="space-y-10 relative z-10 px-4">
                    {[
                        { id: 'skepticism', label: 'Logical Skepticism', color: '#ef4444' },
                        { id: 'excitement', label: 'Neural Excitement', color: '#f59e0b' },
                        { id: 'alignment', label: 'System Alignment', color: '#22d3ee' }
                    ].map(param => (
                        <div key={param.id} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{param.label}</span>
                                <span className="text-sm font-black font-mono" style={{ color: param.color }}>{(mindset as any)[param.id]}%</span>
                            </div>
                            <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div animate={{ width: `${(mindset as any)[param.id]}%` }} className="h-full" style={{ backgroundColor: param.color, boxShadow: `0 0 15px ${param.color}60` }} />
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

                <button onClick={handleSave} className="w-full py-6 mt-10 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black uppercase text-xs tracking-[0.5em] rounded-2xl shadow-[0_20px_50px_rgba(157,78,221,0.4)] transition-all active:scale-95">Apply Synaptic Drift</button>
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
        
        const query = input;
        setInput('');
        setAgentState({ isDispatching: true });
        
        updateAgent(activeAgent.id, { 
            status: 'THINKING', 
            memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'USER', text: query }] 
        });

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setAgentState({ isDispatching: false }); return; }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User Intent: "${query}"\nCurrent Context: ${activeAgent.context}\nMental State: ${JSON.stringify(activeAgent.currentMindset)}\nTask: 1. Respond to user. 2. Decompose into 1-3 atomic tasks if actionable.`,
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
                                        weight: { type: Type.NUMBER },
                                        complexity: { type: Type.STRING, enum: ['LOW', 'MED', 'HIGH'] }
                                    }
                                }
                            }
                        },
                        required: ['suggestedContext', 'responseText', 'internalThought', 'energyDrain']
                    }
                }
            }));

            const result = JSON.parse(response.text || '{}');
            
            const generatedTasks = (result.newTasks || []).map((t: any) => ({
                id: `task-${Date.now()}-${Math.random()}`,
                description: t.description,
                instruction: t.instruction,
                weight: t.weight,
                complexity: t.complexity || 'MED',
                status: 'PENDING',
                isolated_input: '',
                logs: [{ timestamp: Date.now(), message: 'Task initialized by autonomous logic.' }]
            } as AtomicTask));

            updateAgent(activeAgent.id, {
                status: 'ACTIVE',
                context: result.suggestedContext as OperationalContext,
                energyLevel: Math.max(0, activeAgent.energyLevel - (result.energyDrain || 5)),
                memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'AI', text: result.responseText }],
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
        audio.playClick();
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-[3.5rem] overflow-hidden shadow-2xl relative font-sans">
            <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur z-20 flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-8">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-2xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <Bot className="w-7 h-7 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Swarm Command</h1>
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Autonomous Cognitive Layer // v9.4-LATTICE</span>
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Nodes_Active</span>
                        <span className="text-xl font-black font-mono text-[#9d4edd]">{agents.activeAgents.filter(a => a.status !== 'SLEEPING').length}</span>
                    </div>
                    <button className="p-3.5 bg-white/5 border border-white/10 hover:border-[#9d4edd] rounded-2xl text-gray-500 hover:text-white transition-all shadow-xl group active:scale-95">
                        <RefreshCw size={22} className="group-active:rotate-180 transition-transform duration-700" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Directory Sidebar */}
                <div className="w-[420px] border-r border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-8 border-b border-[#1f1f1f] bg-white/[0.01] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <Target size={18} className="text-[#9d4edd]" />
                            <span className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Synaptic Directory</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {agents.activeAgents.map(agent => (
                            <motion.div 
                                key={agent.id}
                                layout
                                onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }}
                                className={`p-6 rounded-[2.5rem] border cursor-pointer transition-all duration-700 relative group overflow-hidden
                                    ${selectedAgentId === agent.id ? 'bg-[#0a0a0a] border-[#9d4edd] shadow-[0_40px_80px_rgba(0,0,0,0.8)] scale-[1.02] z-10' : 'bg-transparent border-transparent hover:bg-white/[0.01] opacity-50 hover:opacity-100'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl overflow-hidden border transition-all duration-700 ${selectedAgentId === agent.id ? 'border-[#9d4edd] shadow-[0_0_20px_#9d4edd44]' : 'border-white/5 bg-[#111]'}`}>
                                            {agent.avatarUrl ? (
                                                <img src={agent.avatarUrl} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-700 group-hover:text-[#9d4edd] transition-colors"><Bot size={28}/></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-base font-black text-white uppercase tracking-widest mb-1.5">{agent.name}</div>
                                            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter leading-none">{agent.role}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent.id); }}
                                        className={`p-2.5 rounded-xl transition-all ${agent.status !== 'SLEEPING' ? 'text-[#10b981] bg-[#10b981]/5 border border-[#10b981]/20 shadow-[0_0_15px_#10b98122]' : 'text-gray-800'}`}
                                    >
                                        <Power size={14} />
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap gap-1.5 mb-8 opacity-60 group-hover:opacity-100 transition-opacity">
                                    {agent.capabilities.map((cap: string) => (
                                        <CapabilityChip key={cap} text={cap} color={selectedAgentId === agent.id ? '#9d4edd' : '#666'} />
                                    ))}
                                </div>

                                <BioResonanceMeter level={agent.energyLevel} isActive={agent.status === 'THINKING'} />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Detail Viewport */}
                <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div 
                                key={activeAgent.id}
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                <div className="p-10 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex justify-between items-center shrink-0 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 transition-transform duration-[20s]"><Brain size={180} /></div>
                                    <div className="flex items-center gap-10 relative z-10">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 rounded-[2rem] bg-white/5 border border-white/10 shadow-inner group/icon-header" style={{ color: CONTEXT_CONFIG[activeAgent.context].color }}>
                                                {React.createElement(CONTEXT_CONFIG[activeAgent.context].icon, { size: 36, className: "group-hover/icon-header:scale-110 transition-transform" })}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] mb-2">{activeAgent.name} Interface</h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${activeAgent.status !== 'SLEEPING' ? 'bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-gray-800'}`} />
                                                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{activeAgent.status} // LATENT_BUFFER_ACK</span>
                                                    </div>
                                                    <div className="h-3 w-px bg-white/10" />
                                                    <span className="text-[10px] font-mono text-[#9d4edd] uppercase font-black tracking-widest">Focus: {CONTEXT_CONFIG[activeAgent.context].label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowSettings(true); audio.playClick(); }} className="p-4 bg-[#111] hover:bg-[#9d4edd]/10 border border-white/5 rounded-2xl text-gray-600 hover:text-[#9d4edd] transition-all shadow-xl active:scale-90 relative z-10">
                                        <Settings size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 flex overflow-hidden">
                                    {/* Memory Playback */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-12" ref={scrollRef}>
                                        <div className="max-w-4xl mx-auto space-y-12 pb-24">
                                            <AnimatePresence initial={false}>
                                                {activeAgent.memoryBuffer.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-10 py-32 text-center gap-12 grayscale">
                                                        <Radio size={120} className="text-gray-500 animate-pulse" />
                                                        <div className="space-y-4">
                                                            <p className="text-3xl font-mono uppercase tracking-[0.8em]">Acoustic Cache Null</p>
                                                            <p className="text-xs text-gray-600 uppercase tracking-widest">Initiate handshake to establish persistent memory trace</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    activeAgent.memoryBuffer.map((msg, i) => (
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            key={i} 
                                                            className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div className={`max-w-[85%] p-10 rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden group
                                                                ${msg.role === 'USER' 
                                                                    ? 'bg-[#0a0a0a] border-white/5 text-gray-300 rounded-tr-none' 
                                                                    : 'bg-[#080808] border-[#9d4edd]/20 text-white rounded-tl-none border-l-[6px] border-l-[#9d4edd]'}
                                                            `}>
                                                                <div className="absolute top-4 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                                                                    <History size={10} className="text-gray-800" />
                                                                </div>
                                                                <p className="font-mono text-[14px] leading-relaxed selection:bg-[#9d4edd]/40">
                                                                    {msg.text}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </AnimatePresence>
                                            {activeAgent.status === 'THINKING' && (
                                                <div className="flex items-center gap-6 text-[#9d4edd] animate-pulse pl-10">
                                                    <div className="relative">
                                                        <BrainCircuit size={28} className="animate-spin-slow" />
                                                        <div className="absolute inset-0 blur-xl bg-[#9d4edd]/30" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-black font-mono uppercase tracking-[0.4em]">Reasoning...</span>
                                                        <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">Cross-referencing global operational context</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Task Ledger (Automatic Tracking) */}
                                    <div className="w-[500px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 shadow-[inset_20px_0_40px_rgba(0,0,0,0.5)] relative">
                                        <div className="p-10 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01] shrink-0">
                                            <div className="flex items-center gap-5">
                                                <div className="p-3 bg-[#22d3ee]/10 rounded-2xl text-[#22d3ee] border border-[#22d3ee]/30 shadow-inner">
                                                    <ListChecks size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-[14px] font-black text-white uppercase tracking-[0.4em]">Autonomous Ledger</h2>
                                                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{activeAgent.tasks.filter(t => t.status !== 'COMPLETED').length} Vectors Active</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8">
                                            <AnimatePresence initial={false}>
                                                {activeAgent.tasks.length > 0 ? (
                                                    activeAgent.tasks.map((task, i) => (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: 40 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            key={task.id}
                                                            className={`p-8 bg-[#0a0a0a] border rounded-[2.5rem] group/task transition-all shadow-2xl relative overflow-hidden
                                                                ${task.status === 'COMPLETED' ? 'border-[#10b981]/20 bg-[#10b981]/5 opacity-60' : 'border-white/5 hover:border-[#9d4edd]/30'}
                                                            `}
                                                        >
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className={`p-2.5 rounded-xl transition-colors ${task.status === 'COMPLETED' ? 'text-[#10b981] bg-[#10b981]/10' : 'bg-white/5 text-gray-700 group-hover/task:text-[#9d4edd]'}`}>
                                                                    <Binary size={20} />
                                                                </div>
                                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black font-mono uppercase tracking-widest ${task.status === 'COMPLETED' ? 'text-[#10b981] bg-[#10b981]/10' : 'text-gray-600 bg-white/5'}`}>
                                                                    {task.status}
                                                                </div>
                                                            </div>
                                                            <p className="text-[15px] font-bold text-gray-200 uppercase font-mono tracking-tight leading-relaxed mb-6 group-hover/task:text-white transition-colors">"{task.description}"</p>
                                                            
                                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[8px] text-gray-700 font-mono uppercase tracking-widest">Weighting</span>
                                                                    <div className="flex gap-1">
                                                                        {Array.from({ length: 5 }).map((_, j) => (
                                                                            <div key={j} className={`w-2.5 h-1 rounded-full ${j < task.weight ? 'bg-[#9d4edd]' : 'bg-gray-900'}`} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[8px] text-gray-700 font-mono uppercase tracking-widest">Complexity</span>
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{task.complexity || 'MED'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                                                <div className="flex items-center gap-3">
                                                                    <Target size={16} className="text-gray-700" />
                                                                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">IMPACT: {Math.round(task.weight * 15.5)}%</span>
                                                                </div>
                                                                {task.status !== 'COMPLETED' && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            const nextTasks = activeAgent.tasks.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' as const } : t);
                                                                            updateAgent(activeAgent.id, { tasks: nextTasks, energyLevel: Math.max(0, activeAgent.energyLevel - (task.weight * 3)) });
                                                                            audio.playSuccess();
                                                                        }}
                                                                        className="px-6 py-2.5 bg-[#9d4edd]/10 hover:bg-[#9d4edd] text-[#9d4edd] hover:text-black border border-[#9d4edd]/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-90"
                                                                    >
                                                                        RESOLVE
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-10 gap-10 py-32 grayscale">
                                                        <Boxes size={120} className="animate-[spin_40s_linear_infinite]" />
                                                        <p className="text-2xl font-mono uppercase tracking-[0.6em]">Backlog Depleted</p>
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="p-12 border-t border-[#1f1f1f] bg-black shrink-0 space-y-10">
                                            <div className="flex justify-between items-center text-[11px] font-black font-mono text-gray-600 uppercase tracking-widest px-1">
                                                <span>Synaptic Feedback Matrix</span>
                                                <span className="text-[#22d3ee] animate-pulse">LATTICE_OK</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.8rem] flex flex-col gap-1 shadow-inner group/stat hover:border-[#ef4444]/40 transition-all text-center">
                                                    <span className="text-[8px] text-gray-600 uppercase font-mono tracking-widest mb-1">Skept</span>
                                                    <span className="text-2xl font-black font-mono text-white group-hover:text-[#ef4444] transition-colors">{activeAgent.currentMindset.skepticism}%</span>
                                                </div>
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.8rem] flex flex-col gap-1 shadow-inner group/stat hover:border-[#f59e0b]/40 transition-all text-center">
                                                    <span className="text-[8px] text-gray-600 uppercase font-mono tracking-widest mb-1">Excite</span>
                                                    <span className="text-2xl font-black font-mono text-white group-hover:text-[#f59e0b] transition-colors">{activeAgent.currentMindset.excitement}%</span>
                                                </div>
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.8rem] flex flex-col gap-1 shadow-inner group/stat hover:border-[#22d3ee]/40 transition-all text-center">
                                                    <span className="text-[8px] text-gray-600 uppercase font-mono tracking-widest mb-1">Align</span>
                                                    <span className="text-2xl font-black font-mono text-white group-hover:text-[#22d3ee] transition-colors">{activeAgent.currentMindset.alignment}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Terminal Command Pad */}
                                <div className="p-12 border-t border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-3xl shrink-0 relative">
                                    <div className="max-w-4xl mx-auto relative group">
                                        <div className="absolute -top-16 left-0 right-0 flex justify-between px-10">
                                            <div className="flex items-center gap-3">
                                                <Activity size={16} className="text-[#9d4edd] animate-pulse" />
                                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Direct_Handshake_Live</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">Clearance: LVL_{activeAgent.energyLevel > 50 ? '5' : '2'}</span>
                                                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_15px_#10b981]" />
                                            </div>
                                        </div>
                                        <form 
                                            onSubmit={(e) => { e.preventDefault(); handleIntentDispatch(); }}
                                            className="relative flex items-center bg-[#050505] border border-white/10 focus-within:border-[#9d4edd] p-3 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] transition-all duration-700"
                                        >
                                            <div className="p-5 text-gray-700 focus-within:text-[#9d4edd] transition-colors group-hover:scale-110 transition-transform duration-700">
                                                <BrainCircuit size={32} />
                                            </div>
                                            <input 
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                disabled={activeAgent.status === 'THINKING' || activeAgent.status === 'SLEEPING'}
                                                placeholder={activeAgent.status === 'SLEEPING' ? "NODE_OFFLINE: Reactivate to establish uplink..." : `Input operational directive for ${activeAgent.name}...`}
                                                className="flex-1 bg-transparent border-none outline-none text-lg font-mono text-white placeholder:text-gray-800 uppercase tracking-widest"
                                            />
                                            <button 
                                                disabled={!input.trim() || activeAgent.status === 'THINKING' || activeAgent.status === 'SLEEPING'}
                                                className="px-12 py-6 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[2rem] font-black uppercase text-xs tracking-[0.5em] transition-all disabled:opacity-20 shadow-[0_0_40px_rgba(157,78,221,0.3)] group/send active:scale-95"
                                            >
                                                <Send size={24} className="group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-16 py-32 grayscale">
                                <Bot size={220} className="animate-pulse" />
                                <p className="text-4xl font-mono uppercase tracking-[2em] text-center pl-8">Swarm Standby</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modal Components */}
            <AnimatePresence>
                {showSettings && activeAgent && (
                    <AgentSettingsModal agent={activeAgent} onClose={() => setShowSettings(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgentControlCenter;