/**
 * CPB Status Overlay
 *
 * Visual heads-up display showing CPB execution state in real-time.
 * Designed to overlay on VoiceMode to show what the system is "thinking".
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import {
    Brain, Zap, Layers, Users, Shield, CheckCircle,
    Loader2, AlertCircle, Sparkles, Activity
} from 'lucide-react';
import { cn } from '../utils/cn';

const PATH_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
    direct: {
        label: 'DIRECT',
        color: '#00ff88',
        icon: <Zap size={14} />,
        description: 'Fast path'
    },
    rlm: {
        label: 'RLM',
        color: '#00d4ff',
        icon: <Layers size={14} />,
        description: 'Context compression'
    },
    ace: {
        label: 'ACE',
        color: '#a855f7',
        icon: <Users size={14} />,
        description: 'Multi-agent consensus'
    },
    hybrid: {
        label: 'HYBRID',
        color: '#f59e0b',
        icon: <Brain size={14} />,
        description: 'RLM + ACE'
    },
    cascade: {
        label: 'CASCADE',
        color: '#ef4444',
        icon: <Shield size={14} />,
        description: 'Full verification'
    }
};

const PHASE_CONFIG: Record<string, { label: string; progress: number }> = {
    idle: { label: 'Ready', progress: 0 },
    analyzing: { label: 'Analyzing', progress: 10 },
    compressing: { label: 'Compressing', progress: 30 },
    exploring: { label: 'Exploring', progress: 50 },
    converging: { label: 'Converging', progress: 70 },
    verifying: { label: 'Verifying', progress: 85 },
    reconstructing: { label: 'Reconstructing', progress: 95 },
    complete: { label: 'Complete', progress: 100 },
    error: { label: 'Error', progress: 0 }
};

const CPBStatusOverlay: React.FC = () => {
    const { cpb } = useAppStore();
    const pathConfig = PATH_CONFIG[cpb.path] || PATH_CONFIG.direct;
    const phaseConfig = PHASE_CONFIG[cpb.phase] || PHASE_CONFIG.idle;

    // Don't render if not active
    if (!cpb.isActive && cpb.phase === 'idle') {
        return null;
    }

    const isComplete = cpb.phase === 'complete';
    const isError = cpb.phase === 'error';
    const isProcessing = cpb.isActive && !isComplete && !isError;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50"
            >
                <div className={cn(
                    "relative bg-black/80 backdrop-blur-xl border rounded-2xl p-4 min-w-[320px] shadow-2xl",
                    isError ? "border-red-500/50" : isComplete ? "border-green-500/50" : "border-white/10"
                )}>
                    {/* Glow effect */}
                    <div
                        className="absolute inset-0 rounded-2xl blur-xl opacity-20 -z-10"
                        style={{ backgroundColor: pathConfig.color }}
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                    isProcessing && "animate-pulse"
                                )}
                                style={{ backgroundColor: `${pathConfig.color}20`, color: pathConfig.color }}
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : pathConfig.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-[10px] font-black tracking-widest"
                                        style={{ color: pathConfig.color }}
                                    >
                                        {pathConfig.label}
                                    </span>
                                    <span className="text-[8px] text-gray-500 uppercase">
                                        {pathConfig.description}
                                    </span>
                                </div>
                                <span className="text-[9px] text-gray-400 font-mono">
                                    Cognitive Precision Bridge
                                </span>
                            </div>
                        </div>

                        {/* Status indicator */}
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-bold uppercase",
                            isComplete ? "bg-green-500/20 text-green-400" :
                            isError ? "bg-red-500/20 text-red-400" :
                            "bg-white/5 text-gray-400"
                        )}>
                            {isComplete ? <CheckCircle size={10} /> :
                             isError ? <AlertCircle size={10} /> :
                             <Activity size={10} className="animate-pulse" />}
                            {phaseConfig.label}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: pathConfig.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${cpb.progress || phaseConfig.progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                        {isProcessing && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                        )}
                    </div>

                    {/* Message */}
                    {cpb.message && (
                        <div className="text-[10px] text-gray-400 font-mono truncate">
                            {cpb.message}
                        </div>
                    )}

                    {/* Result preview (when complete) */}
                    {isComplete && cpb.lastResult && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 pt-3 border-t border-white/5"
                        >
                            <div className="flex items-center justify-between text-[9px]">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Sparkles size={10} className="text-yellow-400" />
                                        <span className="text-gray-400">DQ:</span>
                                        <span className="text-white font-bold">
                                            {(cpb.lastResult.dqScore * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Zap size={10} className="text-cyan-400" />
                                        <span className="text-gray-400">Time:</span>
                                        <span className="text-white font-mono">
                                            {cpb.lastResult.executionTimeMs}ms
                                        </span>
                                    </div>
                                </div>
                                {cpb.lastResult.verified && (
                                    <div className="flex items-center gap-1 text-green-400">
                                        <CheckCircle size={10} />
                                        <span className="uppercase text-[8px]">Verified</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Error display */}
                    {isError && cpb.error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-2 text-[10px] text-red-400 font-mono"
                        >
                            {cpb.error}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CPBStatusOverlay;
