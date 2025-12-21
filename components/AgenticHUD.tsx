
import React, { useRef, useEffect } from 'react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Terminal, Network, Cpu } from 'lucide-react';
import DynamicWidget from './DynamicWidget';

const AgenticHUD: React.FC<{ isClosed: boolean; onClose: () => void }> = ({ isClosed, onClose }) => {
    const { state } = useAgentRuntime();
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic for the thought stream
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [state.history]);

    return (
        <div className="fixed bottom-24 right-6 left-6 z-[140] flex flex-col items-end gap-4 pointer-events-none">
            
            {/* 1. Generative UI Layer (Widgets) */}
            <div className="w-[420px] pointer-events-none">
                <AnimatePresence>
                    {state.lastResult && !isClosed && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full pointer-events-auto"
                        >
                            <DynamicWidget 
                                result={state.lastResult} 
                                onClose={onClose} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 2. Motor Cortex Output (Thought History) - Floating above the bar */}
            <div className="w-[420px] pointer-events-none flex flex-col items-end">
                <AnimatePresence>
                    {state.isThinking && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0, scale: 0.95 }}
                            animate={{ height: 280, opacity: 1, scale: 1 }}
                            exit={{ height: 0, opacity: 0, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                            className="w-full pointer-events-auto bg-[#080808]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-[#9d4edd]/20 rounded-lg text-[#9d4edd]">
                                        <Terminal size={14} />
                                    </div>
                                    <span className="text-[10px] font-black text-white font-mono uppercase tracking-[0.3em]">Motor Cortex Output</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-[#22d3ee] rounded-full animate-ping" />
                                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">LATTICE_STREAM_0x{state.history.length.toString(16)}</span>
                                </div>
                            </div>
                            
                            <div 
                                ref={logContainerRef}
                                className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-4 pr-2"
                            >
                                {state.history.map((h, i) => (
                                    <div key={i} className={`flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300`}>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black shrink-0 border ${
                                            h.role === 'user' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                            h.role === 'tool' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            'bg-[#9d4edd]/10 text-[#9d4edd] border-[#9d4edd]/20'
                                        }`}>
                                            {h.toolName || h.role.toUpperCase()}
                                        </span>
                                        <span className="text-gray-400 leading-relaxed break-words whitespace-pre-wrap">
                                            {h.content}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-3 text-[#9d4edd] opacity-40 animate-pulse mt-4 pt-4 border-t border-white/5">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span className="text-[9px] uppercase tracking-[0.2em] font-black">Negotiating Recursive Synthesis...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AgenticHUD;
