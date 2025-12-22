
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    Bot, Cpu, Activity, Zap, Shield, Search, Send, 
    Loader2, BrainCircuit, Terminal, Radio, Info,
    Power, RefreshCw, Layers, Target, Code, Database, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutonomousAgent, OperationalContext } from '../types';
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

const AgentControlCenter: React.FC = () => {
    const { agents, setAgentState, updateAgent, addLog } = useAppStore();
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents.activeAgents[0]?.id || null);
    const [input, setInput] = useState('');
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
            
            // Step 1: Detect intent and context shift
            // Fix: Pass explicit GenerateContentResponse type to retryGeminiRequest to ensure response.text is accessible.
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User Intent: "${currentInput}"\nCurrent Context: ${activeAgent.context}\nTask: 1. Determine if the user intent requires a shift in operational context. 2. Respond as the agent.`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            suggestedContext: { type: Type.STRING, enum: Object.values(OperationalContext) },
                            responseText: { type: Type.STRING },
                            internalThought: { type: Type.STRING },
                            energyDrain: { type: Type.NUMBER }
                        },
                        required: ['suggestedContext', 'responseText', 'internalThought', 'energyDrain']
                    }
                }
            }));

            const result = JSON.parse(response.text || '{}');
            
            // Step 2: Apply updates to agent
            const nextContext = result.suggestedContext as OperationalContext;
            const contextShifted = nextContext !== activeAgent.context;

            if (contextShifted) {
                addLog('INFO', `AGENT_CORE: Context migration detected. [${activeAgent.context}] -> [${nextContext}]`);
                audio.playTransition();
            }

            updateAgent(activeAgent.id, {
                status: 'ACTIVE',
                context: nextContext,
                energyLevel: Math.max(0, activeAgent.energyLevel - (result.energyDrain || 5)),
                memoryBuffer: [...activeAgent.memoryBuffer, `AI: ${result.responseText}`],
                lastInstruction: result.internalThought
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
        <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl relative font-sans">
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded shadow-[0_0_15px_rgba(157,78,221,0.3)]">
                        <Bot className="w-4 h-4 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Agent Control Center</h1>
                        <p className="text-[9px] text-gray-500 font-mono">Autonomous Swarm Management v4.2</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-600 uppercase">Swarm Sync</span>
                        <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    </div>
                    <button className="p-2 bg-[#111] border border-[#333] hover:border-[#9d4edd] rounded text-gray-500 hover:text-white transition-all">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Agent Sidebar */}
                <div className="w-80 border-r border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-4 border-b border-[#1f1f1f] bg-white/[0.02]">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">Active Swarm Nodes</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {agents.activeAgents.map(agent => (
                            <div 
                                key={agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative group overflow-hidden
                                    ${selectedAgentId === agent.id ? 'bg-[#111] border-[#9d4edd] shadow-xl' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-all ${selectedAgentId === agent.id ? 'bg-[#9d4edd] text-black shadow-[0_0_15px_#9d4edd]' : 'bg-[#1a1a1a] text-gray-600 group-hover:text-gray-300'}`}>
                                            <Bot size={18} />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-white uppercase tracking-wider">{agent.name}</div>
                                            <div className="text-[8px] font-mono text-gray-500 uppercase">{agent.role}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent.id); }}
                                        className={`p-1 rounded transition-colors ${agent.status === 'ACTIVE' || agent.status === 'IDLE' ? 'text-[#10b981]' : 'text-gray-700'}`}
                                    >
                                        <Power size={12} />
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[7px] font-mono text-gray-600 uppercase">
                                        <span>Energy Core</span>
                                        <span>{agent.energyLevel}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-[#111] rounded-full overflow-hidden">
                                        <motion.div 
                                            animate={{ width: `${agent.energyLevel}%` }}
                                            className={`h-full ${agent.energyLevel > 30 ? 'bg-[#10b981]' : 'bg-red-500'}`}
                                        />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'ACTIVE' || agent.status === 'THINKING' ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                                    <span className="text-[8px] font-mono text-gray-600 uppercase">{agent.status} // {agent.context.replace('_', ' ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a]">
                        <button className="w-full py-2 bg-[#111] border border-[#333] hover:border-white rounded-lg text-[9px] font-black text-gray-500 hover:text-white uppercase transition-all tracking-widest">Register New Agent</button>
                    </div>
                </div>

                {/* Agent Viewport */}
                <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeAgent ? (
                            <motion.div 
                                key={activeAgent.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Agent Header Info */}
                                <div className="p-6 border-b border-[#1f1f1f] bg-[#0a0a0a]/50 flex justify-between items-center shrink-0">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            {React.createElement(CONTEXT_CONFIG[activeAgent.context].icon, { 
                                                size: 20, 
                                                style: { color: CONTEXT_CONFIG[activeAgent.context].color } 
                                            })}
                                            <div>
                                                <h3 className="text-xs font-black text-white uppercase tracking-widest">{CONTEXT_CONFIG[activeAgent.context].label} Mode</h3>
                                                <p className="text-[9px] text-gray-500 font-mono italic">{CONTEXT_CONFIG[activeAgent.context].desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-right">
                                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block">Uplink Hash</span>
                                            <span className="text-[10px] font-black font-mono text-[#9d4edd]">{activeAgent.id.split('-')[1]?.toUpperCase() || 'CORE'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Memory Buffer */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6" ref={scrollRef}>
                                    <div className="max-w-3xl mx-auto space-y-6 pb-20">
                                        {activeAgent.memoryBuffer.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center space-y-4">
                                                <Terminal size={48} className="text-gray-500" />
                                                <div>
                                                    <p className="text-xs font-mono uppercase tracking-widest">Memory Buffer Flushed</p>
                                                    <p className="text-[9px] text-gray-600 mt-1 uppercase">Awaiting initial instruction sequence...</p>
                                                </div>
                                            </div>
                                        ) : (
                                            activeAgent.memoryBuffer.map((line, i) => {
                                                const isUser = line.startsWith('User:');
                                                const content = line.split(': ').slice(1).join(': ');
                                                return (
                                                    <motion.div 
                                                        initial={{ opacity: 0, x: isUser ? 20 : -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        key={i} 
                                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[80%] p-4 rounded-2xl border font-mono text-[11px] leading-relaxed shadow-xl
                                                            ${isUser ? 'bg-black border-white/10 text-gray-300' : 'bg-[#111] border-[#9d4edd]/30 text-white shadow-[#9d4edd]/5'}
                                                        `}>
                                                            {content}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                        {activeAgent.status === 'THINKING' && (
                                            <div className="flex items-center gap-3 text-[#9d4edd] animate-pulse">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-[10px] font-mono uppercase font-black">Agent reasoning...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Command Interface */}
                                <div className="p-8 border-t border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-xl shrink-0">
                                    <div className="max-w-3xl mx-auto relative group">
                                        <div className="absolute -top-12 left-0 right-0 flex justify-between px-2">
                                            <div className="flex items-center gap-2">
                                                <Activity size={12} className="text-[#9d4edd] animate-pulse" />
                                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Active Neural Circuitry</span>
                                            </div>
                                            {activeAgent.energyLevel < 20 && (
                                                <div className="flex items-center gap-2 text-red-500 animate-bounce">
                                                    <Zap size={10} />
                                                    <span className="text-[8px] font-mono uppercase font-black">Low Power Warning</span>
                                                </div>
                                            )}
                                        </div>
                                        <form 
                                            onSubmit={(e) => { e.preventDefault(); handleIntentDispatch(); }}
                                            className="relative flex items-center bg-[#050505] border border-[#222] group-focus-within:border-[#9d4edd] p-1.5 rounded-2xl shadow-2xl transition-all"
                                        >
                                            <div className="p-3 text-gray-600 group-focus-within:text-[#9d4edd]">
                                                <BrainCircuit size={20} />
                                            </div>
                                            <input 
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                disabled={activeAgent.status === 'THINKING' || activeAgent.status === 'SLEEPING'}
                                                placeholder={activeAgent.status === 'SLEEPING' ? "NODE_OFFLINE: Reactivate to input..." : "Input strategic directive..."}
                                                className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-800"
                                            />
                                            <button 
                                                disabled={!input.trim() || activeAgent.status === 'THINKING'}
                                                className="p-3 bg-[#9d4edd] hover:bg-[#b06bf7] text-black rounded-xl transition-all disabled:opacity-30 shadow-lg"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-30 space-y-6">
                                <Radio size={64} className="animate-pulse" />
                                <p className="text-sm font-mono uppercase tracking-[0.4em]">Select Agent for Uplink</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* State/Action Sidebar */}
                <div className="w-80 border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0">
                    <div className="p-6 border-b border-[#1f1f1f] bg-[#111]">
                        <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                            <Activity size={14} className="text-[#22d3ee]" /> Logic Diagnostics
                        </h2>
                    </div>
                    <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                        {activeAgent?.lastInstruction && (
                            <div className="space-y-3">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Internal Monologue</span>
                                <div className="p-4 bg-black border border-[#222] rounded-2xl text-[10px] font-mono text-[#42be65] leading-relaxed italic border-l-4 border-l-[#42be65]">
                                    "{activeAgent.lastInstruction}"
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Core Capabilities</span>
                            <div className="flex flex-wrap gap-2">
                                {activeAgent?.capabilities.map(cap => (
                                    <span key={cap} className="px-2.5 py-1 rounded-lg bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[9px] font-mono text-[#9d4edd] uppercase">{cap}</span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Autonomic Tasks</span>
                            <div className="space-y-2">
                                {[
                                    { label: 'Neural Pruning', cost: '12%', icon: RefreshCw },
                                    { label: 'Context Optimization', cost: '18%', icon: Zap },
                                    { label: 'Archival Dump', cost: '4%', icon: Database }
                                ].map(task => (
                                    <button key={task.label} className="w-full p-3 bg-[#111] border border-[#222] hover:border-white/20 rounded-xl flex items-center justify-between group transition-all">
                                        <div className="flex items-center gap-3 text-gray-400 group-hover:text-white">
                                            <task.icon size={14} />
                                            <span className="text-[10px] font-bold uppercase">{task.label}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-gray-600">{task.cost}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-[#1f1f1f] bg-black">
                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 mb-2 uppercase">
                            <span>Sector Awareness</span>
                            <span>94%</span>
                        </div>
                        <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                            <div className="h-full bg-[#22d3ee] w-[94%]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentControlCenter;
