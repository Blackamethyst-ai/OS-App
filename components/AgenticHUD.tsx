
import React, { useState } from 'react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Loader2, Command, X, ArrowRight, Zap, Terminal } from 'lucide-react';
import DynamicWidget from './DynamicWidget';

/**
 * SOVEREIGN AGENT HUD
 * Global overlay for intent processing and GenUI display.
 */
const AgenticHUD: React.FC = () => {
    const { execute, state } = useAgentRuntime();
    const [input, setInput] = useState('');
    const [isWidgetClosed, setIsWidgetClosed] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || state.isThinking) return;
        
        const prompt = input;
        setInput('');
        setIsWidgetClosed(false);
        await execute(prompt);
    };

    return (
        <div className="fixed bottom-24 right-8 z-[150] flex flex-col items-end gap-4 w-96 pointer-events-none">
            
            {/* 1. Results Area (GEN_UI) */}
            <AnimatePresence>
                {state.lastResult && !isWidgetClosed && (
                    <motion.div className="w-full pointer-events-auto shadow-2xl">
                        <DynamicWidget 
                            result={state.lastResult} 
                            onClose={() => setIsWidgetClosed(true)} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Chat / Intent Processor */}
            <div className="w-full pointer-events-auto">
                <form 
                    onSubmit={handleSubmit}
                    className="relative group"
                >
                    <div className={`
                        bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#333] rounded-2xl p-4 transition-all duration-500 shadow-2xl
                        ${state.isThinking ? 'border-[#9d4edd] ring-1 ring-[#9d4edd]/30' : 'group-hover:border-gray-500'}
                    `}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all duration-500 ${state.isThinking ? 'bg-[#9d4edd] text-black animate-pulse' : 'bg-[#111] text-gray-500'}`}>
                                {state.isThinking ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                            </div>
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={state.isThinking}
                                placeholder={state.isThinking ? `ENGAGING ${state.activeTool || 'SYSTEM'}...` : "Issue Intent Directive..."}
                                className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-800 uppercase"
                            />
                            {!state.isThinking && input && (
                                <button type="submit" className="text-[#9d4edd] hover:text-white transition-colors">
                                    <ArrowRight size={20} />
                                </button>
                            )}
                        </div>

                        {/* Thinking Indicators */}
                        <AnimatePresence>
                            {state.isThinking && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden pt-3 mt-3 border-t border-white/5"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-[#9d4edd] font-mono tracking-[0.2em] uppercase">Recursive Loop Active</span>
                                            <div className="flex gap-0.5">
                                                {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-[#9d4edd] rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                                            </div>
                                        </div>
                                        <span className="text-[7px] text-gray-600 font-mono">STEP_0{state.history.length}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {state.history.slice(-2).map((h, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <span className={`text-[7px] font-mono px-1 rounded border ${h.role === 'user' ? 'text-blue-400 border-blue-400/20' : 'text-[#9d4edd] border-[#9d4edd]/20'}`}>{h.role.toUpperCase()}</span>
                                                <span className="text-[9px] font-mono text-gray-500 truncate">{h.content}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgenticHUD;
