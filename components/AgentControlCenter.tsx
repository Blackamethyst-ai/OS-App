import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    Bot, Cpu, Activity, Zap, Shield, Search, Send, 
    Loader2, BrainCircuit, Terminal, Radio, Info,
    Power, RefreshCw, Layers, Target, Code, Database, Globe,
    Settings, Sliders, X, CheckCircle2, AlertTriangle, ListChecks,
    History, Binary, Brain, ShieldCheck, Sparkles, Microscope,
    Fingerprint, Gauge, Waves, ChevronRight, PlayCircle, Boxes, Dna,
    Plus, GitBranch, Share2, PowerOff, Scissors, Command, Waypoints
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext, MentalState } from '../types';
import { GoogleGenAI } from "@google/genai";
import { promptSelectKey } from '../services/geminiService';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

/**
 * AutonomicTask Component
 * Visualizes background system processes for the active agent node.
 */
const AutonomicTask: React.FC<{ label: string, progress: number, color: string }> = ({ label, progress, color }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">
            <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                {label}
            </div>
            <span>{progress}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-px shadow-inner">
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progress}%` }} 
                className="h-full rounded-full shadow-[0_0_8px_currentColor]" 
                style={{ backgroundColor: color, color }} 
            />
        </div>
    </div>
);

/**
 * SwarmNodeCard Component
 * Represents a single agent node in the swarm with energy and status monitoring.
 */
const SwarmNodeCard: React.FC<{ agent: AutonomousAgent, isActive: boolean, onClick: () => void }> = ({ agent, isActive, onClick }) => {
    const isSleeping = agent.status === 'SLEEPING';
    const accent = agent.id === 'charon' ? '#10b981' : agent.id === 'puck' ? '#9d4edd' : '#22d3ee';

    return (
        <motion.div 
            onClick={onClick}
            whileHover={{ x: 4 }}
            className={cn(
                "p-4 border rounded-xl cursor-pointer transition-all relative overflow-hidden group",
                isActive 
                    ? "bg-white/[0.03] border-white/20 shadow-xl" 
                    : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
            )}
        >
            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex gap-3 items-center">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                        isActive ? "bg-white/10 border-white/20" : "bg-black/40 border-white/5"
                    )} style={{ color: isActive ? accent : 'gray' }}>
                        {agent.id === 'charon' ? <Shield size={16} /> : agent.id === 'puck' ? <Bot size={16} /> : <Cpu size={16} />}
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-white uppercase tracking-widest">{agent.name}</div>
                        <div className="text-[7px] text-gray-500 font-mono uppercase tracking-tighter">{agent.role}</div>
                    </div>
                </div>
                <Power size={10} className={cn("transition-colors", isActive ? "text-[#10b981]" : "text-gray-700")} />
            </div>

            <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-[6px] font-black font-mono text-gray-600 uppercase tracking-widest">
                    <span>Energy Core</span>
                    <span>{agent.energyLevel}%</span>
                </div>
                <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${agent.energyLevel}%` }} 
                        className="h-full" 
                        style={{ backgroundColor: accent }} 
                    />
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[7px] font-mono text-gray-600 uppercase">
                <div className={cn("w-1 h-1 rounded-full", isSleeping ? "bg-gray-700" : "bg-[#10b981] animate-pulse")} />
                {agent.status} // {agent.context.replace('_', ' ')}
            </div>
        </motion.div>
    );
};

const AgentControlCenter: React.FC = () => {
    const { agents, actions } = useAppStore();
    const { setAgentState, updateAgent, addLog } = actions;
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeAgent = agents.activeAgents.find(a => a.id === selectedAgentId);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [activeAgent?.memoryBuffer.length]);

    const handleIntentDispatch = async () => {
        if (!input.trim() || !activeAgent) return;
        const query = input;
        setInput('');
        setAgentState({ isDispatching: true });
        
        // Optimistically add user message to buffer
        updateAgent(activeAgent.id, { 
            status: 'THINKING', 
            memoryBuffer: [...activeAgent.memoryBuffer, { timestamp: Date.now(), role: 'USER', text: query }] 
        });

        audio.playClick();

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { 
                await promptSelectKey(); 
                setAgentState({ isDispatching: false }); 
                return; 
            }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User Directive: "${query}"`,
                config: { 
                    systemInstruction: `You are ${activeAgent.name}, role: ${activeAgent.role}. Respond to the user's directive within the context of ${activeAgent.context}. Maintain a technical, agentic, and professional tone. Output should be concise as it appears in a high-fidelity terminal buffer.`,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            responseText: { type: 'STRING' },
                            energyDelta: { type: 'NUMBER', description: "Amount of energy consumed by this reasoning task (1-5)" }
                        },
                        required: ['responseText', 'energyDelta']
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            
            updateAgent(activeAgent.id, { 
                status: 'ACTIVE', 
                energyLevel: Math.max(0, activeAgent.energyLevel - (result.energyDelta || 2)), 
                memoryBuffer: [...activeAgent.memoryBuffer, { 
                    timestamp: Date.now(), 
                    role: 'AI', 
                    text: result.responseText || "Directive processed. Logic stabilized." 
                }] 
            });
            
            audio.playSuccess();
        } catch (e: any) {
            console.error("Agent Dispatch Error:", e);
            updateAgent(activeAgent.id, { 
                status: 'IDLE',
                memoryBuffer: [...activeAgent.memoryBuffer, { 
                    timestamp: Date.now(), 
                    role: 'SYSTEM', 
                    text: `ERROR: Cognitive link interrupted. Reason: ${e.message}` 
                }]
            });
            audio.playError();
        } finally {
            setAgentState({ isDispatching: false });
        }
    };

    return (
        <div className="h-full w-full bg-transparent flex flex-col font-sans overflow-hidden transition-colors duration-500">
            {/* Tactical Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-30 crystalline">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#9d4edd]/10 border border-[#9d4edd]/20 rounded-lg">
                        <Bot size={16} className="text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Agent Control Center</h1>
                        <p className="text-[7px] text-gray-600 font-mono uppercase tracking-widest mt-0.5">Autonomous Swarm Management v4.2</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg">
                        <span className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">Swarm Sync</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
                    </div>
                    <button className="p-2 text-gray-600 hover:text-white transition-colors border border-white/5 rounded-lg glass-action group">
                        <RefreshCw size={14} className="group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Flank: Active Swarm Nodes */}
                <div className="w-[300px] border-r border-white/5 flex flex-col shrink-0">
                    <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                        <span className="text-9px font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Binary size={12} /> Active Swarm Nodes
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {agents.activeAgents.map(agent => (
                            <SwarmNodeCard 
                                key={agent.id} 
                                agent={agent} 
                                isActive={selectedAgentId === agent.id} 
                                onClick={() => { setSelectedAgentId(agent.id); audio.playClick(); }} 
                            />
                        ))}
                        <button className="w-full py-4 border border-dashed border-white/10 rounded-xl text-8px font-black uppercase text-gray-600 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
                            <Plus size={12} /> Register New Agent
                        </button>
                    </div>
                </div>

                {/* The Nexus: Synthetic Mind workspace */}
                <div className="flex-1 flex flex-col relative bg-transparent">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.02)_0%,transparent_80%)] pointer-events-none" />
                    
                    {activeAgent ? (
                        <>
                            <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-black/10">
                                <div className="flex items-center gap-4">
                                    <Globe size={14} className="text-[#9d4edd]" />
                                    <div>
                                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">{activeAgent.name.toUpperCase()} MIND MODE</h2>
                                        <p className="text-8px text-gray-600 font-mono uppercase tracking-widest mt-0.5">Autonomous general intelligence buffer.</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-7px font-mono text-gray-700 uppercase tracking-widest block">Uplink Hash</span>
                                    <span className="text-10px font-black font-mono text-[#9d4edd] uppercase">ALPHA_V8</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 relative z-10" ref={scrollRef}>
                                <AnimatePresence mode="popLayout">
                                    {activeAgent.memoryBuffer.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6 text-center select-none">
                                            <div className="relative">
                                                <Brain size={120} className="text-gray-500" />
                                                <motion.div animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-[#9d4edd]/20 blur-3xl rounded-full" />
                                            </div>
                                            <p className="text-sm font-mono uppercase tracking-[1em]">Awaiting Initial Instruction Sequence...</p>
                                        </div>
                                    ) : (
                                        activeAgent.memoryBuffer.map((msg, i) => (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={i} 
                                                className={cn("flex", msg.role === 'USER' ? "justify-end" : "justify-start")}
                                            >
                                                <div className={cn(
                                                    "max-w-[80%] p-5 rounded-2xl border text-[11px] font-mono leading-relaxed shadow-2xl relative crystalline",
                                                    msg.role === 'USER' 
                                                        ? "text-gray-500" 
                                                        : msg.role === 'SYSTEM'
                                                        ? "bg-red-500/5 border-red-500/20 text-red-400 font-bold"
                                                        : "text-white border-l-4 border-l-[#9d4edd]"
                                                )}>
                                                    <span className="text-7px font-black uppercase text-gray-700 block mb-2">{msg.role} // TERMINAL_OUTPUT</span>
                                                    {msg.text}
                                                    <div className="text-6px text-gray-800 absolute bottom-2 right-4 font-mono">
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Strategic Directive Input */}
                            <div className="p-8 border-t border-white/5 bg-transparent relative z-20">
                                <div className="max-w-3xl mx-auto">
                                    <div className="text-7px font-black text-gray-600 uppercase tracking-[0.5em] mb-3 px-4 flex items-center gap-2">
                                        <Zap size={8} className="text-[#9d4edd] animate-pulse" /> Active Neural Circuitry
                                    </div>
                                    <div className="crystalline border border-white/10 rounded-2xl p-1.5 focus-within:border-[#9d4edd]/50 transition-all shadow-2xl relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#9d4edd]/5 via-transparent to-[#9d4edd]/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity rounded-2xl" />
                                        <form onSubmit={(e) => { e.preventDefault(); handleIntentDispatch(); }} className="flex items-center gap-4 relative z-10">
                                            <div className="pl-4 text-gray-600">
                                                {agents.isDispatching ? <Loader2 size={16} className="animate-spin text-[#9d4edd]" /> : <BrainCircuit size={16} />}
                                            </div>
                                            <input 
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                disabled={agents.isDispatching}
                                                placeholder={agents.isDispatching ? "Synthesizing response..." : "Input strategic directive..."}
                                                className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-white placeholder:text-gray-800 uppercase tracking-widest py-3"
                                            />
                                            <button 
                                                disabled={!input.trim() || agents.isDispatching}
                                                className="p-3 bg-[#9d4edd]/10 hover:bg-[#9d4edd] hover:text-black rounded-xl text-[#9d4edd] transition-all disabled:opacity-20 active:scale-90"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                            <Bot size={160} className="animate-pulse" />
                            <p className="text-2xl font-mono uppercase tracking-[1em] mt-10">Swarm Standby</p>
                        </div>
                    )}
                </div>

                {/* Right Flank: Logic Diagnostics */}
                <div className="w-[340px] border-l border-white/5 flex flex-col shrink-0">
                    <div className="p-5 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
                        <Activity className="w-4 h-4 text-[#9d4edd]" />
                        <h2 className="text-10px font-black text-white uppercase tracking-[0.2em]">Logic Diagnostics</h2>
                    </div>

                    <div className="p-6 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Core Capabilities Chips */}
                        <div className="space-y-4">
                            <span className="text-8px font-black text-gray-600 uppercase tracking-widest px-1">Core Capabilities</span>
                            <div className="flex flex-wrap gap-2">
                                {(activeAgent?.capabilities || ['GENERAL_PURPOSE', 'LOGIC_SYNTHESIS']).map(cap => (
                                    <div key={cap} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-8px font-black text-[#9d4edd] uppercase tracking-widest transition-all hover:bg-white/10 hover:border-[#9d4edd]/30 cursor-default">
                                        {cap}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Autonomic Tasks Progress Bars */}
                        <div className="space-y-6">
                            <span className="text-8px font-black text-gray-600 uppercase tracking-widest px-1">Autonomic Tasks</span>
                            <div className="space-y-6">
                                <AutonomicTask label="Neural Pruning" progress={12} color="#9d4edd" />
                                <AutonomicTask label="Context Optimization" progress={18} color="#22d3ee" />
                                <AutonomicTask label="Archival Dump" progress={4} color="#10b981" />
                            </div>
                        </div>

                        {/* Stability Vector Projection */}
                        <div className="space-y-4 pt-10">
                            <div className="flex justify-between items-center text-8px font-black text-gray-600 uppercase tracking-widest px-1">
                                <span>Stability Vector</span>
                                <GitBranch size={12} />
                            </div>
                            <div className="aspect-square w-full rounded-[2rem] border border-white/5 bg-black/20 relative overflow-hidden flex items-center justify-center p-8 group shadow-inner">
                                <Waypoints size={80} className="text-[#9d4edd] opacity-20 group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.05)_0%,transparent_70%)]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 rounded-full border border-dashed border-[#9d4edd]/30 animate-[spin_30s_linear_infinite]" />
                                    <div className="w-12 h-12 rounded-full border border-dotted border-[#22d3ee]/20 animate-[spin_15s_linear_infinite_reverse] absolute" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sector Awareness Metric */}
                    <div className="p-5 border-t border-white/5 bg-transparent shrink-0">
                        <div className="flex justify-between items-center text-8px font-mono text-gray-600 uppercase mb-3 px-1">
                            <span>Sector Awareness</span>
                            <span className="text-[#10b981]">94%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden p-px">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '94%' }} 
                                className="h-full bg-[#10b981] shadow-[0_0_10px_#10b981]" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentControlCenter;