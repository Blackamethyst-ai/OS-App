import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    Bot, Cpu, Activity, Zap, Shield, Search, Send, 
    Loader2, BrainCircuit, Terminal, Radio, Info,
    Power, RefreshCw, Layers, Target, Code, Database, Globe,
    Settings, Sliders, X, CheckCircle2, AlertTriangle, ListChecks,
    History, Binary, Brain, ShieldCheck, Sparkles, Microscope,
    Fingerprint, Gauge, Waves, ChevronRight, PlayCircle, Boxes, Dna,
    Plus, GitBranch, Share2
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
        className="px-2 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider whitespace-nowrap shadow-inner transition-all hover:scale-105"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}
    >
        {text}
    </div>
);

const DnaVisualizer = ({ active, color }: { active: boolean, color: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const render = () => {
            frame++;
            canvas.width = 120;
            canvas.height = 120;
            const cx = 60;
            const cy = 60;
            ctx.clearRect(0, 0, 120, 120);

            const speed = active ? 0.05 : 0.01;
            const points = 8;
            for (let i = 0; i < points; i++) {
                const y = 20 + i * 12;
                const angle = frame * speed + i * 0.8;
                const xOffset = Math.sin(angle) * 30;
                
                // Strand 1
                ctx.beginPath();
                ctx.arc(cx + xOffset, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Strand 2
                ctx.beginPath();
                ctx.arc(cx - xOffset, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = 0.3;
                ctx.fill();
                ctx.globalAlpha = 1;

                // Connection
                ctx.beginPath();
                ctx.moveTo(cx + xOffset, y);
                ctx.lineTo(cx - xOffset, y);
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.1;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            requestAnimationFrame(render);
        };
        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, [active, color]);

    return <canvas ref={canvasRef} className="w-full h-full opacity-60" />;
};

const DNACalibrationModal: React.FC<{ agent: AutonomousAgent, onClose: () => void }> = ({ agent, onClose }) => {
    const { updateAgent, addLog } = useAppStore();
    const [mindset, setMindset] = useState<MentalState>(agent.currentMindset);

    const handleSave = () => {
        updateAgent(agent.id, { currentMindset: mindset });
        addLog('SUCCESS', `DNA_CALIBRATION: Re-sequenced ${agent.name} cognitive vectors.`);
        audio.playSuccess();
        onClose();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-[#333] rounded-[2.5rem] p-10 w-full max-w-lg shadow-[0_0_150px_rgba(157,78,221,0.2)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12"><Dna size={200} /></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/30 text-[#9d4edd] shadow-2xl">
                            <Sliders size={24} />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">DNA Calibration</h2>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.4em]">{agent.name} // Biometric Profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all"><X size={20} className="text-gray-500" /></button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                    <div className="flex flex-col items-center justify-center bg-black/60 border border-white/5 rounded-[2rem] aspect-square p-6 shadow-inner">
                        <DnaVisualizer active={true} color="#9d4edd" />
                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mt-4">Structural Helix Simulation</span>
                    </div>
                    <div className="space-y-6 flex flex-col justify-center">
                        {[
                            { id: 'skepticism', label: 'Logical Skepticism', color: '#ef4444' },
                            { id: 'excitement', label: 'Neural Excitement', color: '#f59e0b' },
                            { id: 'alignment', label: 'Directive Alignment', color: '#22d3ee' }
                        ].map(param => (
                            <div key={param.id} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{param.label}</span>
                                    <span className="text-xs font-black font-mono" style={{ color: param.color }}>{(mindset as any)[param.id]}%</span>
                                </div>
                                <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <motion.div animate={{ width: `${(mindset as any)[param.id]}%` }} className="h-full" style={{ backgroundColor: param.color, boxShadow: `0 0 10px ${param.color}60` }} />
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
                </div>

                <button onClick={handleSave} className="w-full py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black uppercase text-[10px] tracking-[0.4em] rounded-xl shadow-[0_15px_30px_rgba(157,78,221,0.3)] transition-all active:scale-95">Commit Neural Sequence</button>
            </motion.div>
        </motion.div>
    );
};

const BioResonanceMeter: React.FC<{ level: number, isActive: boolean }> = ({ level, isActive }) => {
    const color = level > 70 ? '#10b981' : level > 30 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex flex-col gap-1.5 mt-4">
            <div className="flex justify-between items-end px-0.5">
                <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Neural Potency</span>
                <span className="text-[9px] font-black font-mono" style={{ color }}>{level}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5 relative shadow-inner">
                <motion.div 
                    initial={false}
                    animate={{ 
                        width: `${level}%`,
                        backgroundColor: color,
                        opacity: isActive ? [0.6, 1, 0.6] : 1
                    }}
                    transition={isActive ? { duration: 1, repeat: Infinity } : { duration: 1 }}
                    className="h-full rounded-full transition-all shadow-[0_0_10px_currentColor]"
                />
            </div>
        </div>
    );
};

const AgentControlCenter: React.FC = () => {
    const { agents, setAgentState, updateAgent, addLog } = useAppStore();
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const [showDNA, setShowDNA] = useState(false);
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
                contents: `Context: ${activeAgent.context}. Mindset: ${JSON.stringify(activeAgent.currentMindset)}. Intent: "${query}". Respond and provide 1-3 actionable atomic tasks.`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            responseText: { type: Type.STRING },
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
                        required: ['responseText', 'energyDrain']
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
                logs: [{ timestamp: Date.now(), message: 'Task serialized from agent directive.' }]
            } as AtomicTask));

            updateAgent(activeAgent.id, {
                status: 'ACTIVE',
                energyLevel: Math.max(0, activeAgent.energyLevel - (result.energyDrain || 5)),
                memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'AI', text: result.responseText }],
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
        <div className="h-full w-full bg-[#020202] flex flex-col border border-[#1f1f1f] rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans group/agentcenter">
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-xl">
                        <Bot className="w-5 h-5 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Swarm Command</h1>
                        <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mt-1.5 block">Sovereign Layer // v9.4-ZENITH</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                     <div className="flex items-center bg-black/60 px-5 py-1.5 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mr-3">Nodes</span>
                        <span className="text-lg font-black font-mono text-[#9d4edd]">{agents.activeAgents.length}</span>
                    </div>
                    <button className="p-2.5 bg-white/5 border border-white/10 hover:border-[#9d4edd] rounded-xl text-gray-500 hover:text-white transition-all shadow-xl group active:scale-95">
                        <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-700" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Compact Directory Sidebar */}
                <div className="w-[340px] border-r border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 relative">
                    <div className="p-6 border-b border-[#1f1f1f] bg-white/[0.01] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <Target size={14} className="text-[#9d4edd]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Agent_Manifest</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {agents.activeAgents.map(agent => (
                            <motion.div 
                                key={agent.id}
                                layout
                                onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }}
                                className={`p-5 rounded-[1.5rem] border cursor-pointer transition-all duration-700 relative group overflow-hidden
                                    ${selectedAgentId === agent.id ? 'bg-[#0a0a0a] border-[#9d4edd] shadow-[0_20px_40px_rgba(0,0,0,0.8)] scale-[1.02] z-10' : 'bg-transparent border-transparent hover:bg-white/[0.01] opacity-60 hover:opacity-100'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl overflow-hidden border transition-all duration-700 ${selectedAgentId === agent.id ? 'border-[#9d4edd] shadow-[0_0_15px_#9d4edd44]' : 'border-white/5 bg-[#111]'}`}>
                                            <div className="w-full h-full flex items-center justify-center text-gray-700 group-hover:text-[#9d4edd] transition-colors bg-gradient-to-br from-black to-[#111]">
                                                {agent.id === 'charon' ? <Shield size={20} /> : agent.id === 'puck' ? <Sparkles size={20} /> : agent.id === 'fenrir' ? <Zap size={20} /> : <Database size={20} />}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white uppercase tracking-wider mb-0.5">{agent.name}</div>
                                            <div className="text-[7px] font-mono text-gray-600 uppercase tracking-tighter leading-none">{agent.role}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent.id); }}
                                        className={`p-2 rounded-lg transition-all ${agent.status !== 'SLEEPING' ? 'text-[#10b981] bg-[#10b981]/5 border border-[#10b981]/20' : 'text-gray-800'}`}
                                    >
                                        <Power size={12} />
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap gap-1 mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                    {agent.capabilities.slice(0,2).map((cap: string) => (
                                        <CapabilityChip key={cap} text={cap} color={selectedAgentId === agent.id ? '#9d4edd' : '#666'} />
                                    ))}
                                    {agent.capabilities.length > 2 && <span className="text-[6px] text-gray-700 font-mono mt-1">+{agent.capabilities.length - 2}</span>}
                                </div>

                                <BioResonanceMeter level={agent.energyLevel} isActive={agent.status === 'THINKING'} />
                            </motion.div>
                        ))}
                    </div>
                    <div className="p-6 border-t border-[#1f1f1f] bg-black shrink-0">
                        <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-white hover:border-[#9d4edd] transition-all flex items-center justify-center gap-2">
                            <Plus size={14} /> New Agent Protocol
                        </button>
                    </div>
                </div>

                {/* Main Detail Viewport */}
                <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div 
                                key={activeAgent.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.4 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                <div className="p-8 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex justify-between items-center shrink-0 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-12 transition-transform duration-[20s]"><Brain size={140} /></div>
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner group/icon-header" style={{ color: CONTEXT_CONFIG[activeAgent.context].color }}>
                                                {React.createElement(CONTEXT_CONFIG[activeAgent.context].icon, { size: 28, className: "group-hover/icon-header:scale-110 transition-transform" })}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white uppercase tracking-[0.3em] mb-1">{activeAgent.name} Interface</h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${activeAgent.status !== 'SLEEPING' ? 'bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-gray-800'}`} />
                                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{activeAgent.status}</span>
                                                    </div>
                                                    <div className="h-2.5 w-px bg-white/10" />
                                                    <span className="text-[9px] font-mono text-[#9d4edd] uppercase font-black tracking-widest">{CONTEXT_CONFIG[activeAgent.context].label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 relative z-10">
                                        <button className="p-3 bg-[#111] hover:bg-white/5 border border-white/5 rounded-xl text-gray-600 hover:text-white transition-all active:scale-95 shadow-lg">
                                            <Microscope size={18} />
                                        </button>
                                        <button onClick={() => { setShowDNA(true); audio.playClick(); }} className="p-3 bg-[#111] hover:bg-[#9d4edd]/10 border border-white/5 rounded-xl text-gray-600 hover:text-[#9d4edd] transition-all active:scale-90 group/dna">
                                            <Dna size={18} className="group-hover/dna:rotate-12 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 flex overflow-hidden">
                                    {/* Scrollable Memory Loop */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8" ref={scrollRef}>
                                        <div className="max-w-3xl mx-auto space-y-8 pb-20">
                                            <AnimatePresence initial={false}>
                                                {activeAgent.memoryBuffer.map((msg, i) => (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        key={i} 
                                                        className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[85%] p-6 rounded-[1.8rem] border shadow-2xl relative overflow-hidden group
                                                            ${msg.role === 'USER' 
                                                                ? 'bg-[#0a0a0a] border-white/5 text-gray-400 rounded-tr-none' 
                                                                : 'bg-[#080808] border-[#9d4edd]/20 text-white rounded-tl-none border-l-4 border-l-[#9d4edd]'}
                                                        `}>
                                                            <div className="absolute top-2 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="text-[7px] font-black text-gray-700 uppercase">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                                                                <History size={8} className="text-gray-800" />
                                                            </div>
                                                            <p className="font-mono text-[12px] leading-relaxed selection:bg-[#9d4edd]/40">
                                                                {msg.text}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {activeAgent.status === 'THINKING' && (
                                                <div className="flex items-center gap-4 text-[#9d4edd] animate-pulse pl-6">
                                                    <div className="relative">
                                                        <BrainCircuit size={20} className="animate-spin-slow" />
                                                        <div className="absolute inset-0 blur-md bg-[#9d4edd]/30" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black font-mono uppercase tracking-widest">Reasoning...</span>
                                                        <span className="text-[7px] text-gray-700 font-mono uppercase tracking-widest mt-0.5">Synthesizing vectors</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Compact Task Ledger */}
                                    <div className="w-[400px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 relative">
                                        <div className="p-8 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01] shrink-0">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-[#22d3ee]/10 rounded-xl text-[#22d3ee] border border-[#22d3ee]/30">
                                                    <ListChecks size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Neural Ledger</h2>
                                                    <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">{activeAgent.tasks.filter(t => t.status !== 'COMPLETED').length} Operational Vectors</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                            {activeAgent.tasks.map((task, i) => (
                                                <motion.div 
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    key={task.id}
                                                    className={`p-6 bg-[#0a0a0a] border rounded-[1.8rem] group/task transition-all shadow-xl relative overflow-hidden
                                                        ${task.status === 'COMPLETED' ? 'border-[#10b981]/20 bg-[#10b981]/5 opacity-60' : 'border-white/5 hover:border-[#9d4edd]/30'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-2 rounded-lg transition-colors ${task.status === 'COMPLETED' ? 'text-[#10b981] bg-[#10b981]/10' : 'bg-white/5 text-gray-700 group-hover/task:text-[#9d4edd]'}`}>
                                                            <Binary size={16} />
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black font-mono uppercase tracking-widest ${task.status === 'COMPLETED' ? 'text-[#10b981] bg-[#10b981]/10' : 'text-gray-700 bg-white/5'}`}>
                                                            {task.status}
                                                        </div>
                                                    </div>
                                                    <p className="text-[12px] font-bold text-gray-200 uppercase font-mono tracking-tight leading-relaxed mb-4 group-hover/task:text-white transition-colors">"{task.description}"</p>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[7px] text-gray-700 font-mono uppercase tracking-widest">Weighting</span>
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(j => (
                                                                    <div key={j} className={`w-2 h-0.5 rounded-full ${j <= task.weight ? 'bg-[#9d4edd]' : 'bg-gray-900'}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {task.status !== 'COMPLETED' && (
                                                                <button 
                                                                    onClick={() => {
                                                                        const nextTasks = activeAgent.tasks.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' as const } : t);
                                                                        updateAgent(activeAgent.id, { tasks: nextTasks, energyLevel: Math.min(100, activeAgent.energyLevel + 5) });
                                                                        audio.playSuccess();
                                                                    }}
                                                                    className="px-4 py-1.5 bg-[#9d4edd]/10 hover:bg-[#9d4edd] text-[#9d4edd] hover:text-black border border-[#9d4edd]/30 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-90"
                                                                >
                                                                    RESOLVE
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {activeAgent.tasks.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center opacity-10 gap-8 py-20 grayscale">
                                                    <Boxes size={80} className="animate-[spin_40s_linear_infinite]" />
                                                    <p className="text-xl font-mono uppercase tracking-[0.5em]">Buffer Null</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-8 border-t border-[#1f1f1f] bg-black shrink-0 space-y-8">
                                            <div className="flex justify-between items-center text-[10px] font-black font-mono text-gray-600 uppercase tracking-widest px-1">
                                                <span>DNA_LATTICE_OK</span>
                                                <span className="text-[#22d3ee] animate-pulse">SYNC_ACTIVE</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Skept', val: activeAgent.currentMindset.skepticism, color: '#ef4444' },
                                                    { label: 'Excite', val: activeAgent.currentMindset.excitement, color: '#f59e0b' },
                                                    { label: 'Align', val: activeAgent.currentMindset.alignment, color: '#22d3ee' }
                                                ].map(st => (
                                                    <div key={st.label} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-inner group/stat hover:border-white/20 transition-all">
                                                        <span className="text-[7px] text-gray-700 uppercase font-mono tracking-widest">{st.label}</span>
                                                        <span className="text-lg font-black font-mono text-white group-hover:text-[var(--color)] transition-colors" style={{ '--color': st.color } as any}>{st.val}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compact Directive Input */}
                                <div className="p-10 border-t border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-3xl shrink-0 relative">
                                    <div className="max-w-3xl mx-auto relative group">
                                        <div className="absolute -top-12 left-4 right-4 flex justify-between">
                                            <div className="flex items-center gap-3">
                                                <Activity size={12} className="text-[#9d4edd] animate-pulse" />
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Direct_Feed_Live</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Enclave: 0x{activeAgent.id.substring(0,4).toUpperCase()}</span>
                                                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                            </div>
                                        </div>
                                        <form 
                                            onSubmit={(e) => { e.preventDefault(); handleIntentDispatch(); }}
                                            className="relative flex items-center bg-[#050505] border border-white/10 focus-within:border-[#9d4edd] p-2 rounded-[2rem] shadow-2xl transition-all duration-700"
                                        >
                                            <div className="p-4 text-gray-700 focus-within:text-[#9d4edd] transition-colors group-hover:scale-110 transition-transform duration-700">
                                                <BrainCircuit size={24} />
                                            </div>
                                            <input 
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                disabled={activeAgent.status === 'THINKING' || activeAgent.status === 'SLEEPING'}
                                                placeholder={activeAgent.status === 'SLEEPING' ? "NODE_OFFLINE: Reactivate..." : `Dispatch directive to ${activeAgent.name}...`}
                                                className="flex-1 bg-transparent border-none outline-none text-base font-mono text-white placeholder:text-gray-800 uppercase tracking-widest"
                                            />
                                            <button 
                                                disabled={!input.trim() || activeAgent.status === 'THINKING' || activeAgent.status === 'SLEEPING'}
                                                className="px-8 py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all disabled:opacity-20 shadow-[0_0_30px_rgba(157,78,221,0.3)] group/send active:scale-95"
                                            >
                                                <Send size={18} className="group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-12 py-32 grayscale">
                                <Bot size={180} className="animate-pulse" />
                                <p className="text-3xl font-mono uppercase tracking-[1.5em] text-center pl-8">Swarm Standby</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Calibration Modal Overlay */}
            <AnimatePresence>
                {showDNA && activeAgent && (
                    <DNACalibrationModal agent={activeAgent} onClose={() => setShowDNA(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgentControlCenter;