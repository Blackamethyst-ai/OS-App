/**
 * ExperimentLogger Component
 *
 * Captures ACE trial data for paper experiments.
 * Displays as floating panel during Bicameral consensus.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, Download, BarChart3, X, Check, AlertCircle } from 'lucide-react';

interface TrialData {
    trial_id: string;
    task: string;
    condition: 'C1_BASELINE' | 'C2_ACE';
    complexity_detected: string | null;
    rounds_used: number;
    gap_achieved: number;
    target_gap: number;
    agents_participating: string[];
    dq_score: {
        validity: number;
        specificity: number;
        correctness: number;
        overall: number;
    } | null;
    actionable: boolean;
    output_preview: string;
    timestamp: string;
}

interface ExperimentLoggerProps {
    isVisible: boolean;
    onClose: () => void;
    // Current run data
    currentTask?: string;
    aceEnabled?: boolean;
    complexity?: string;
    rounds?: number;
    gap?: number;
    targetGap?: number;
    agents?: string[];
    dqScore?: {
        validity: number;
        specificity: number;
        correctness: number;
        overall: number;
    };
    output?: string;
}

const STORAGE_KEY = 'ace_experiment_trials';

export function ExperimentLogger({
    isVisible,
    onClose,
    currentTask,
    aceEnabled,
    complexity,
    rounds,
    gap,
    targetGap,
    agents,
    dqScore,
    output
}: ExperimentLoggerProps) {
    const [trials, setTrials] = useState<TrialData[]>([]);
    const [showStats, setShowStats] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    // Load trials from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setTrials(JSON.parse(stored));
        }
    }, []);

    // Save trials to localStorage
    const saveTrials = (newTrials: TrialData[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrials));
        setTrials(newTrials);
    };

    // Log current run
    const logCurrentRun = () => {
        if (!currentTask || rounds === undefined) return;

        const trial: TrialData = {
            trial_id: `${aceEnabled ? 'C2_ACE' : 'C1_BASELINE'}_${Date.now()}`,
            task: currentTask,
            condition: aceEnabled ? 'C2_ACE' : 'C1_BASELINE',
            complexity_detected: complexity || null,
            rounds_used: rounds,
            gap_achieved: gap || 0,
            target_gap: targetGap || 3,
            agents_participating: agents || [],
            dq_score: dqScore || null,
            actionable: dqScore ? dqScore.overall > 0.5 : false,
            output_preview: output?.substring(0, 200) || '',
            timestamp: new Date().toISOString()
        };

        saveTrials([...trials, trial]);
    };

    // Export to JSON
    const exportData = () => {
        const blob = new Blob([JSON.stringify(trials, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ace_trials_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Calculate stats
    const c1Trials = trials.filter(t => t.condition === 'C1_BASELINE');
    const c2Trials = trials.filter(t => t.condition === 'C2_ACE');

    const c1AvgRounds = c1Trials.length
        ? c1Trials.reduce((a, b) => a + b.rounds_used, 0) / c1Trials.length
        : 0;
    const c2AvgRounds = c2Trials.length
        ? c2Trials.reduce((a, b) => a + b.rounds_used, 0) / c2Trials.length
        : 0;

    const c2AvgDQ = c2Trials.filter(t => t.dq_score).length
        ? c2Trials.filter(t => t.dq_score).reduce((a, b) => a + b.dq_score!.overall, 0) /
          c2Trials.filter(t => t.dq_score).length
        : 0;

    const actionableCount = c2Trials.filter(t => t.actionable).length;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    className="fixed right-4 top-20 w-80 bg-black/90 border border-[var(--amethyst-soft)]/30 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <FlaskConical size={18} className="text-[var(--amethyst-soft)]" />
                            <span className="text-sm font-bold text-white uppercase tracking-wider">
                                Experiment Logger
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Current Run */}
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">
                            Current Run
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Task:</span>
                                <span className="text-white truncate max-w-[180px]">
                                    {currentTask || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Condition:</span>
                                <span className={aceEnabled ? 'text-[var(--cyan)]' : 'text-orange-400'}>
                                    {aceEnabled ? 'C2 (ACE)' : 'C1 (Baseline)'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Rounds:</span>
                                <span className="text-white font-mono">{rounds ?? '—'}</span>
                            </div>
                            {aceEnabled && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Complexity:</span>
                                        <span className="text-[var(--executive-gold)] uppercase">{complexity || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">DQ Score:</span>
                                        <span className={
                                            dqScore
                                                ? dqScore.overall >= 0.7 ? 'text-[var(--plasma-green)]' :
                                                  dqScore.overall >= 0.5 ? 'text-[var(--executive-gold)]' : 'text-red-400'
                                                : 'text-gray-500'
                                        }>
                                            {dqScore ? `${(dqScore.overall * 100).toFixed(0)}%` : '—'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={logCurrentRun}
                            disabled={!currentTask || rounds === undefined}
                            className="w-full mt-3 py-2 bg-[var(--amethyst)] hover:bg-[var(--amethyst-soft)] disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={14} />
                            Log This Trial
                        </button>
                    </div>

                    {/* Stats Summary */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                Collected Data
                            </div>
                            <button
                                onClick={() => setShowStats(!showStats)}
                                className="text-[10px] text-[var(--amethyst-soft)] hover:text-purple-300"
                            >
                                {showStats ? 'Hide' : 'Show'} Details
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-orange-400">{c1Trials.length}</div>
                                <div className="text-[9px] text-gray-500 uppercase">C1 Baseline</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-[var(--cyan)]">{c2Trials.length}</div>
                                <div className="text-[9px] text-gray-500 uppercase">C2 ACE</div>
                            </div>
                        </div>

                        {showStats && trials.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="mt-3 space-y-2 text-xs"
                            >
                                <div className="flex justify-between">
                                    <span className="text-gray-400">C1 Avg Rounds:</span>
                                    <span className="text-white font-mono">
                                        {c1AvgRounds.toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">C2 Avg Rounds:</span>
                                    <span className="text-white font-mono">
                                        {c2AvgRounds.toFixed(1)}
                                    </span>
                                </div>
                                {c1AvgRounds > 0 && c2AvgRounds > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Reduction:</span>
                                        <span className="text-[var(--plasma-green)] font-mono">
                                            {((c1AvgRounds - c2AvgRounds) / c1AvgRounds * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-400">C2 Avg DQ:</span>
                                    <span className="text-white font-mono">
                                        {(c2AvgDQ * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Actionable:</span>
                                    <span className="text-white font-mono">
                                        {actionableCount}/{c2Trials.length}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 flex gap-2">
                        <button
                            onClick={exportData}
                            disabled={trials.length === 0}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={14} />
                            Export JSON
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
                                saveTrials([]); setConfirmClear(false);
                            }}
                            disabled={trials.length === 0}
                            className={`px-3 py-2 disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${confirmClear ? 'bg-red-500/30 text-red-300' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'}`}
                        >
                            {confirmClear ? 'Confirm?' : 'Clear'}
                        </button>
                    </div>

                    {/* Progress indicator */}
                    {trials.length > 0 && trials.length < 100 && (
                        <div className="px-4 pb-4">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <AlertCircle size={12} />
                                <span>{100 - trials.length} trials to target (100)</span>
                            </div>
                            <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[var(--amethyst-soft)] transition-all"
                                    style={{ width: `${trials.length}%` }}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ExperimentLogger;
