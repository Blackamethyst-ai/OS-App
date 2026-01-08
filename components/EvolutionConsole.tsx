/**
 * EVOLUTION CONSOLE
 * 
 * The control interface for the Self-Evolution Protocol.
 * Shows friction signals, proposed evolutions, generated code,
 * and allows approval/rejection of self-modifications.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dna, Zap, AlertTriangle, Code, Check, X, ChevronDown, ChevronUp,
    Activity, TrendingUp, GitBranch, Cpu, Eye, Play, RefreshCw
} from 'lucide-react';
import { selfEvolution, EvolutionHypothesis, FrictionSignal } from '../services/selfEvolution';
import { cn } from '../utils/cn';

const FrictionCard: React.FC<{ signal: FrictionSignal }> = ({ signal }) => {
    const getTypeColor = (type: FrictionSignal['type']) => {
        switch (type) {
            case 'ERROR': return 'text-red-500 bg-red-500/10 border-red-500/30';
            case 'REPEATED_ACTION': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
            case 'DEAD_END': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
            case 'LONG_PAUSE': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
            case 'ABANDONMENT': return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
            default: return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30';
        }
    };

    return (
        <div className={cn("p-3 rounded-xl border", getTypeColor(signal.type))}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black font-mono uppercase tracking-wider">
                    {signal.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-black font-mono">
                    {signal.count}x
                </span>
            </div>
            <p className="text-[10px] font-mono opacity-80 line-clamp-2">
                {signal.context}
            </p>
            <div className="mt-2 text-[8px] font-mono opacity-50">
                Mode: {signal.mode}
            </div>
        </div>
    );
};

const EvolutionCard: React.FC<{
    evolution: EvolutionHypothesis;
    onApprove: () => void;
    onReject: () => void;
    onViewCode: () => void;
}> = ({ evolution, onApprove, onReject, onViewCode }) => {
    const getStatusStyle = (status: EvolutionHypothesis['status']) => {
        switch (status) {
            case 'PROPOSED': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
            case 'APPROVED': return 'bg-green-500/20 text-green-500 border-green-500/30';
            case 'REJECTED': return 'bg-red-500/20 text-red-500 border-red-500/30';
            case 'DEPLOYED': return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30';
            case 'ROLLED_BACK': return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
            default: return 'bg-white/10 text-gray-400 border-white/10';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#9d4edd]/20 rounded-xl text-[#9d4edd]">
                        <Dna size={16} />
                    </div>
                    <div>
                        <div className="text-[11px] font-black font-mono text-white">
                            {evolution.fileName}
                        </div>
                        <div className="text-[9px] font-mono text-gray-500 uppercase">
                            {evolution.fileType}
                        </div>
                    </div>
                </div>
                <span className={cn(
                    "text-[8px] font-black font-mono uppercase px-2 py-1 rounded-full border",
                    getStatusStyle(evolution.status)
                )}>
                    {evolution.status}
                </span>
            </div>

            <div className="space-y-2">
                <div>
                    <div className="text-[8px] font-mono text-gray-600 uppercase mb-1">Hypothesis</div>
                    <p className="text-[10px] font-mono text-gray-300">{evolution.hypothesis}</p>
                </div>
                <div>
                    <div className="text-[8px] font-mono text-gray-600 uppercase mb-1">Solution</div>
                    <p className="text-[10px] font-mono text-gray-400">{evolution.proposedSolution}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-600">Confidence:</span>
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${evolution.confidence * 100}%` }}
                            className="h-full bg-[#9d4edd]"
                        />
                    </div>
                    <span className="text-[9px] font-mono text-[#9d4edd]">
                        {Math.round(evolution.confidence * 100)}%
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onViewCode}
                        className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                    >
                        <Eye size={14} />
                    </button>
                    {evolution.status === 'PROPOSED' && (
                        <>
                            <button
                                onClick={onApprove}
                                className="p-1.5 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-all text-green-500"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                onClick={onReject}
                                className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-all text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const EvolutionConsole: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [stats, setStats] = useState(selfEvolution.getStats());
    const [frictions, setFrictions] = useState<FrictionSignal[]>([]);
    const [evolutions, setEvolutions] = useState<EvolutionHypothesis[]>([]);
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'friction' | 'evolutions' | 'cycles'>('evolutions');

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(selfEvolution.getStats());
            setFrictions(selfEvolution.getFrictionMap());
            setEvolutions(selfEvolution.getAllEvolutions());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleApprove = (id: string) => {
        selfEvolution.approveEvolution(id);
    };

    const handleReject = (id: string) => {
        selfEvolution.rejectEvolution(id);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-8 bg-[#0a0a0c]/98 border border-white/10 rounded-3xl z-[601] flex flex-col overflow-hidden shadow-[0_50px_150px_rgba(157,78,221,0.3)]"
                    >
                        {/* Header */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 shrink-0">
                            <div className="flex items-center gap-4">
                                <motion.div
                                    animate={{ rotate: stats.isEvolving ? 360 : 0 }}
                                    transition={{ duration: 2, repeat: stats.isEvolving ? Infinity : 0, ease: 'linear' }}
                                    className="p-2.5 bg-[#9d4edd]/20 rounded-xl text-[#9d4edd]"
                                >
                                    <Dna size={20} />
                                </motion.div>
                                <div>
                                    <h2 className="text-[14px] font-black font-mono text-white uppercase tracking-wider">
                                        Self-Evolution Protocol
                                    </h2>
                                    <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                        {stats.isEvolving ? 'EVOLVING...' : 'MONITORING FRICTION'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-7 gap-4 p-6 bg-black/20 border-b border-white/5">
                            {[
                                { label: 'Friction Signals', value: stats.totalFrictionSignals, icon: AlertTriangle, color: '#f59e0b' },
                                { label: 'Hypotheses', value: stats.totalHypotheses, icon: GitBranch, color: '#9d4edd' },
                                { label: 'Pending', value: stats.pendingEvolutions, icon: Zap, color: '#22d3ee' },
                                { label: 'Approved', value: stats.approvedEvolutions, icon: Check, color: '#10b981' },
                                { label: 'Ready to Deploy', value: (stats as any).pendingDeployments || 0, icon: Cpu, color: '#f43f5e' },
                                { label: 'Deployed', value: stats.deployedEvolutions, icon: Activity, color: '#3b82f6' },
                                { label: 'Cycles', value: stats.totalCycles, icon: RefreshCw, color: '#ec4899' }
                            ].map((stat) => (
                                <div key={stat.label} className="bg-black/40 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <stat.icon size={14} style={{ color: stat.color }} />
                                        <span className="text-[9px] font-mono text-gray-500 uppercase">{stat.label}</span>
                                    </div>
                                    <div className="text-2xl font-black font-mono text-white">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 px-6 pt-4 shrink-0">
                            {[
                                { id: 'evolutions', label: 'Evolutions', icon: Dna },
                                { id: 'friction', label: 'Friction Map', icon: AlertTriangle },
                                { id: 'cycles', label: 'Cycle History', icon: Activity }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all",
                                        activeTab === tab.id
                                            ? "bg-[#9d4edd] text-black"
                                            : "bg-white/5 text-gray-500 hover:bg-white/10"
                                    )}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}

                            <button
                                onClick={() => selfEvolution.triggerAnalysis()}
                                className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#22d3ee]/20 text-[#22d3ee] rounded-xl text-[10px] font-black font-mono uppercase tracking-wider hover:bg-[#22d3ee]/30 transition-all"
                            >
                                <Play size={14} />
                                Trigger Evolution
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {activeTab === 'evolutions' && (
                                evolutions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                                        <Dna size={48} className="mb-4 opacity-20" />
                                        <p className="text-[11px] font-mono uppercase tracking-widest">
                                            No evolutions yet
                                        </p>
                                        <p className="text-[9px] font-mono text-gray-700 mt-2">
                                            The system will generate code when friction is detected
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {evolutions.map((evo) => (
                                            <EvolutionCard
                                                key={evo.id}
                                                evolution={evo}
                                                onApprove={() => handleApprove(evo.id)}
                                                onReject={() => handleReject(evo.id)}
                                                onViewCode={() => setSelectedCode(evo.generatedCode)}
                                            />
                                        ))}
                                    </div>
                                )
                            )}

                            {activeTab === 'friction' && (
                                frictions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                                        <Activity size={48} className="mb-4 opacity-20" />
                                        <p className="text-[11px] font-mono uppercase tracking-widest">
                                            No friction detected
                                        </p>
                                        <p className="text-[9px] font-mono text-gray-700 mt-2">
                                            Use the app normally - friction will be recorded automatically
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        {frictions.map((friction) => (
                                            <FrictionCard key={friction.id} signal={friction} />
                                        ))}
                                    </div>
                                )
                            )}

                            {activeTab === 'cycles' && (
                                <div className="text-center text-gray-600 py-16">
                                    <RefreshCw size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-[11px] font-mono uppercase tracking-widest">
                                        Cycle history coming soon
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Code Viewer Modal */}
                        <AnimatePresence>
                            {selectedCode && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-12"
                                    onClick={() => setSelectedCode(null)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.9 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-[#0a0a0c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
                                    >
                                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                                            <div className="flex items-center gap-2 text-[#9d4edd]">
                                                <Code size={16} />
                                                <span className="text-[11px] font-black font-mono uppercase">Generated Code</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedCode(null)}
                                                className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <pre className="flex-1 overflow-auto p-6 text-[11px] font-mono text-gray-300 bg-black/40">
                                            <code>{selectedCode}</code>
                                        </pre>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EvolutionConsole;
