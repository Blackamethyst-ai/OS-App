
import React, { useRef, useEffect } from 'react';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, X, Activity } from 'lucide-react';
import DynamicWidget from './DynamicWidget';

const AgenticHUD: React.FC<{ isClosed: boolean; onClose: () => void }> = ({ isClosed, onClose }) => {
    const { state } = useAgentRuntime();
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [state.history]);

    if (isClosed) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 left-6 z-[140] flex flex-col items-end gap-4 pointer-events-none"
        >
            <div className="w-[420px] pointer-events-auto">
                <AnimatePresence>
                    {state.lastResult && (
                        <DynamicWidget result={state.lastResult} onClose={onClose} />
                    )}
                </AnimatePresence>
            </div>

            <div className="w-[420px] pointer-events-auto flex flex-col items-end">
                <AnimatePresence>
                    {state.isThinking && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 280, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="w-full bg-[#080808]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-[#9d4edd]/20 rounded-lg text-[#9d4edd]"><Terminal size={14} /></div>
                                    <span className="text-[10px] font-black text-white font-mono uppercase tracking-widest">Thought Stream</span>
                                </div>
                                <button onClick={onClose} className="text-gray-600 hover:text-white"><X size={14} /></button>
                            </div>
                            
                            <div ref={logContainerRef} className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-4 pr-2">
                                {state.history.map((h, i) => (
                                    <div key={i} className={`flex gap-3 items-start animate-in fade-in`}>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black shrink-0 border ${
                                            h.role === 'user' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                            h.role === 'tool' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            'bg-[#9d4edd]/10 text-[#9d4edd] border-[#9d4edd]/20'
                                        }`}>
                                            {h.toolName || h.role.toUpperCase()}
                                        </span>
                                        <span className="text-gray-400 leading-relaxed whitespace-pre-wrap">{h.content}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default AgenticHUD;
