/**
 * DREAM PROTOCOL WIDGET
 * 
 * Floating indicator showing dream mode status.
 * Expands to show insights and past sessions.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Brain, Sparkles, ChevronUp, ChevronDown, Zap, Search, TrendingUp, Lightbulb } from 'lucide-react';
import { dreamProtocol, DreamSession, DreamInsight } from '../services/dreamProtocol';
import { cn } from '../utils/cn';

const InsightTypeIcon: React.FC<{ type: DreamInsight['type'] }> = ({ type }) => {
    switch (type) {
        case 'PATTERN': return <TrendingUp size={14} />;
        case 'RESEARCH': return <Search size={14} />;
        case 'OPTIMIZATION': return <Zap size={14} />;
        case 'PREDICTION': return <Lightbulb size={14} />;
        case 'DISCOVERY': return <Sparkles size={14} />;
        default: return <Brain size={14} />;
    }
};

const DreamProtocolWidget: React.FC = () => {
    const [status, setStatus] = useState(dreamProtocol.getStatus());
    const [isExpanded, setIsExpanded] = useState(false);
    const [pastSessions, setPastSessions] = useState<DreamSession[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setStatus(dreamProtocol.getStatus());
        }, 1000);

        setPastSessions(dreamProtocol.getPastSessions());

        return () => clearInterval(interval);
    }, []);

    const idleMinutes = Math.floor(status.idleTime / 60000);
    const idleSeconds = Math.floor((status.idleTime % 60000) / 1000);

    const totalInsights = pastSessions.reduce((sum, s) => sum + s.insights.length, 0);

    return (
        <motion.div
            layout
            className={cn(
                "fixed bottom-24 right-6 z-[500]",
                "bg-[#0a0a0c]/95 backdrop-blur-xl border rounded-2xl shadow-2xl",
                status.isDreaming
                    ? "border-[#9d4edd]/50 shadow-[0_0_30px_rgba(157,78,221,0.3)]"
                    : "border-white/10"
            )}
        >
            {/* Header - Always visible */}
            <motion.div
                layout
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
            >
                <motion.div
                    animate={status.isDreaming ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                        "p-2 rounded-xl",
                        status.isDreaming
                            ? "bg-[#9d4edd]/20 text-[#9d4edd]"
                            : "bg-white/5 text-gray-500"
                    )}
                >
                    {status.isDreaming ? <Moon size={16} /> : <Sun size={16} />}
                </motion.div>

                <div className="flex flex-col">
                    <span className={cn(
                        "text-[10px] font-black font-mono uppercase tracking-widest",
                        status.isDreaming ? "text-[#9d4edd]" : "text-gray-500"
                    )}>
                        {status.isDreaming ? 'DREAMING' : 'AWAKE'}
                    </span>
                    <span className="text-[8px] font-mono text-gray-600">
                        {status.isDreaming
                            ? `${status.currentSession?.insights.length || 0} insights`
                            : `Idle: ${idleMinutes}m ${idleSeconds}s`
                        }
                    </span>
                </div>

                {status.isDreaming && (
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex gap-1"
                    >
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1 h-1 rounded-full bg-[#9d4edd]"
                            />
                        ))}
                    </motion.div>
                )}

                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="text-gray-600 ml-auto"
                >
                    <ChevronUp size={14} />
                </motion.div>
            </motion.div>

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                                    <div className="text-lg font-black font-mono text-[#9d4edd]">
                                        {pastSessions.length}
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-600 uppercase">Sessions</div>
                                </div>
                                <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                                    <div className="text-lg font-black font-mono text-[#22d3ee]">
                                        {totalInsights}
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-600 uppercase">Insights</div>
                                </div>
                                <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                                    <div className="text-lg font-black font-mono text-[#10b981]">
                                        {status.pendingQueries}
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-600 uppercase">Queued</div>
                                </div>
                            </div>

                            {/* Current Session Insights */}
                            {status.isDreaming && status.currentSession && status.currentSession.insights.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[9px] font-black font-mono text-[#9d4edd] uppercase tracking-widest">
                                        Live Insights
                                    </div>
                                    {status.currentSession.insights.slice(-3).map((insight) => (
                                        <motion.div
                                            key={insight.id}
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            className="bg-[#9d4edd]/10 border border-[#9d4edd]/20 rounded-xl p-3"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <InsightTypeIcon type={insight.type} />
                                                <span className="text-[10px] font-black font-mono text-white truncate">
                                                    {insight.title}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-gray-400 line-clamp-2">
                                                {insight.content}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Past Sessions */}
                            {pastSessions.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">
                                        Recent Sessions
                                    </div>
                                    {pastSessions.slice(-3).reverse().map((session) => (
                                        <div
                                            key={session.id}
                                            className="bg-black/40 border border-white/5 rounded-xl p-3"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-mono text-gray-500">
                                                    {new Date(session.startTime).toLocaleDateString()}
                                                </span>
                                                <span className={cn(
                                                    "text-[8px] font-black font-mono uppercase px-2 py-0.5 rounded-full",
                                                    session.status === 'COMPLETE'
                                                        ? "bg-[#10b981]/20 text-[#10b981]"
                                                        : "bg-[#f59e0b]/20 text-[#f59e0b]"
                                                )}>
                                                    {session.status}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 text-[9px] font-mono text-gray-600">
                                                <span>{session.insights.length} insights</span>
                                                <span>{session.patternsAnalyzed} patterns</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Manual Trigger (Dev) */}
                            <button
                                onClick={() => dreamProtocol.triggerDream()}
                                className="w-full py-2 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-xl text-[9px] font-black font-mono text-[#9d4edd] uppercase tracking-widest hover:bg-[#9d4edd]/20 transition-all"
                            >
                                <Moon size={12} className="inline mr-2" />
                                Trigger Dream Mode
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default DreamProtocolWidget;
