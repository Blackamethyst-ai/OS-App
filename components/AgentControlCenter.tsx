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
                
                ctx.beginPath();
                ctx.arc(cx + xOffset, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(cx - xOffset, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = 'var(--text-main)';
                ctx.globalAlpha = 0.3;
                ctx.fill();
                ctx.globalAlpha = 1;

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
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative overflow-hidden transition-colors duration-500">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 text-[var(--text-main)]"><Dna size={200} /></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/30 text-[#9d4edd] shadow-xl">
                            <Sliders size={24} />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-widest">DNA Calibration</h2>
                            <p className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-[0.4em]">{agent.name} // Biometric Profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl transition-all text-[var(--text-muted)]"><X size={20} /></button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                    <div className="flex flex-col items-center justify-center bg-black/5 border border-[var(--border-main)] rounded-[2rem] aspect-square p-6 shadow-inner">
                        <DnaVisualizer active={true} color="#9d4edd" />
                        <span className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-widest mt-4">Structural Helix Simulation</span>
                    </div>
                    <div className="space-y-6 flex flex-col justify-center">
                        {[
                            { id: 'skepticism', label: 'Logical Skepticism', color: '#ef4444' },
                            { id: 'excitement', label: 'Neural Excitement', color: '#f59e0b' },
                            { id: 'alignment', label: 'Directive Alignment', color: '#22d3ee' }
                        ].map(param => (
                            <div key={param.id} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{param.label}</span>
                                    <span className="text-xs font-black font-mono" style={{ color: param.color }}>{(mindset as any)[param.id]}%</span>
                                </div>
                                <div className="relative h-1 w-full bg-black/5 rounded-full overflow-hidden border border-[var(--border-main)]">
                                    <motion.div animate={{ width: `${(mindset as any)[param.id]}%` }} className="h-full" style={{ backgroundColor: param.color }} />
                                    <input type="range" min="0" max="100" value={(mindset as any)[param.id]} onChange={e => setMindset({ ...mindset, [param.id]: parseInt(e.target.value) })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={handleSave} className="w-full py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black uppercase text-[10px] tracking-[0.4em] rounded-xl shadow-xl transition-all active:scale-95">Commit Neural Sequence</button>
            </motion.div>
        </motion.div>
    );
};

const AgentControlCenter: React.FC = () => {
    const { agents, setAgentState, updateAgent, addLog } = useAppStore();
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const [showDNA, setShowDNA] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeAgent = agents.activeAgents.find(a => a.id === selectedAgentId);

    const handleIntentDispatch = async () => {
        if (!input.trim() || !activeAgent) return;
        const query = input;
        setInput('');
        setAgentState({ isDispatching: true });
        updateAgent(activeAgent.id, { status: 'THINKING', memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'USER', text: query }] });

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setAgentState({ isDispatching: false }); return; }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Directive: "${query}"`,
                config: { responseMimeType: 'application/json' }
            });
            const result = JSON.parse(response.text || '{}');
            updateAgent(activeAgent.id, { status: 'ACTIVE', energyLevel: Math.max(0, activeAgent.energyLevel - 5), memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'AI', text: result.responseText || "Task acknowledged." }] });
            audio.playSuccess();
        } catch (e: any) {
            updateAgent(activeAgent.id, { status: 'IDLE' });
            audio.playError();
        } finally {
            setAgentState({ isDispatching: false });
        }
    };

    return (
        <div className="h-full w-full bg-[var(--bg-main)] flex flex-col border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans transition-colors duration-500">
            <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/50 to-transparent" />
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-xl text-[#9d4edd]">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black font-mono text-[var(--text-main)] uppercase tracking-[0.4em] leading-none">Swarm Command</h1>
                        <span className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-1.5 block">Sovereign Layer // v9.4-ZENITH</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                     <div className="flex items-center bg-black/5 px-5 py-1.5 rounded-xl border border-[var(--border-main)] shadow-inner">
                        <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mr-3">Nodes</span>
                        <span className="text-lg font-black font-mono text-[#9d4edd]">{agents.activeAgents.length}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[340px] border-r border-[var(--border-main)] bg-[var(--bg-side)] flex flex-col shrink-0 relative">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {agents.activeAgents.map(agent => (
                            <motion.div 
                                key={agent.id} layout onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }}
                                className={`p-5 rounded-[1.5rem] border cursor-pointer transition-all duration-700 relative group overflow-hidden ${selectedAgentId === agent.id ? 'bg-[var(--bg-panel)] border-[#9d4edd] shadow-xl scale-[1.02] z-10' : 'bg-transparent border-transparent hover:bg-black/5 opacity-60 hover:opacity-100'}`}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl overflow-hidden border transition-all duration-700 ${selectedAgentId === agent.id ? 'border-[#9d4edd]' : 'border-[var(--border-main)] bg-black/5'}`}>
                                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-[#9d4edd]">
                                                {agent.id === 'charon' ? <Shield size={20} /> : agent.id === 'puck' ? <Sparkles size={20} /> : <Zap size={20} />}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider mb-0.5">{agent.name}</div>
                                            <div className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-tighter leading-none">{agent.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 bg-transparent flex flex-col relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div key={activeAgent.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-8 border-b border-[var(--border-main)] bg-[var(--bg-panel)] backdrop-blur flex justify-between items-center shrink-0 relative transition-colors duration-500">
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 rounded-2xl bg-black/5 border border-[var(--border-main)]" style={{ color: CONTEXT_CONFIG[activeAgent.context].color }}>
                                            {React.createElement(CONTEXT_CONFIG[activeAgent.context].icon, { size: 28 })}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-[0.3em] mb-1">{activeAgent.name} Interface</h3>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${activeAgent.status !== 'SLEEPING' ? 'bg-[#10b981] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                                                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{activeAgent.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex overflow-hidden">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8" ref={scrollRef}>
                                        <div className="max-w-3xl mx-auto space-y-8 pb-20 text-[var(--text-main)]">
                                            {activeAgent.memoryBuffer.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] p-6 rounded-[1.8rem] border shadow-md ${msg.role === 'USER' ? 'bg-black/5 border-[var(--border-main)] text-[var(--text-muted)]' : 'bg-[var(--bg-panel)] border-[#9d4edd]/20 text-[var(--text-main)] border-l-4 border-l-[#9d4edd]'}`}>
                                                        <p className="font-mono text-[12px] leading-relaxed">{msg.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 border-t border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur shrink-0 relative transition-colors duration-500">
                                    <form onSubmit={(e) => { e.preventDefault(); handleIntentDispatch(); }} className="max-w-3xl mx-auto relative flex items-center bg-black/5 border border-[var(--border-main)] focus-within:border-[#9d4edd] p-2 rounded-[2rem] shadow-xl transition-all duration-700">
                                        <div className="p-4 text-[var(--text-muted)] focus-within:text-[#9d4edd]"><BrainCircuit size={24} /></div>
                                        <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Dispatch directive to ${activeAgent.name}...`} className="flex-1 bg-transparent border-none outline-none text-base font-mono text-[var(--text-main)] placeholder:[var(--text-muted)] uppercase tracking-widest" />
                                        <button disabled={!input.trim()} className="px-8 py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all disabled:opacity-20 shadow-lg active:scale-95">SEND</button>
                                    </form>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 py-32 grayscale text-[var(--text-muted)]">
                                <Bot size={180} className="animate-pulse" /><p className="text-3xl font-mono uppercase tracking-[1.5em] text-center">Swarm Standby</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AgentControlCenter;