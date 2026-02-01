/**
 * RELATIONAL MEMORY
 * Conversation history display with timeline visualization.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Dna } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface HistoryEntry {
    role: 'USER' | 'AI' | 'SYSTEM';
    text: string;
    timestamp: number;
}

interface RelationalMemoryProps {
    history: HistoryEntry[];
}

export const RelationalMemory: React.FC<RelationalMemoryProps> = ({ history }) => {
    if (history.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-10 grayscale">
                <Dna size={160} className="animate-[spin_30s_linear_infinite]" />
                <p className="text-2xl font-mono uppercase tracking-[1em]">Memory Pool Silent</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative max-w-5xl mx-auto">
            <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            {history.map((entry, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                        "relative ml-16 p-6 rounded-[2.5rem] border transition-all group overflow-hidden shadow-2xl",
                        entry.role === 'USER'
                            ? "bg-white/[0.01] border-white/5"
                            : "bg-[#9d4edd]/5 border-[#9d4edd]/20"
                    )}
                >
                    <div
                        className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-20"
                        style={{ color: entry.role === 'AI' ? '#9d4edd' : '#666' }}
                    />
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-8 h-8 rounded-2xl border flex items-center justify-center shadow-lg",
                                entry.role === 'USER'
                                    ? "bg-black/40 border-white/10 text-gray-500"
                                    : "bg-[#9d4edd]/20 border-[#9d4edd]/40 text-[#9d4edd]"
                            )}>
                                {entry.role === 'USER' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.4em]">
                                Trace_Buffer_{i} // {entry.role}
                            </span>
                        </div>
                        <span className="text-[8px] font-mono text-gray-700">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <p className="text-sm text-gray-300 font-mono leading-relaxed select-text tracking-tight">
                        {entry.text}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};

export default RelationalMemory;
