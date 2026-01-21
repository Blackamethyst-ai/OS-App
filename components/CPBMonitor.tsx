/**
 * CPB Monitor - Visual Dashboard for Cognitive Precision Bridge
 *
 * Displays real-time execution status, path routing, and quality metrics.
 */

import React, { useState, useEffect } from 'react';
import {
    BrainCircuit,
    Zap,
    Users,
    GitMerge,
    Layers,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Activity,
    Target,
    TrendingUp,
    Clock,
    Cpu,
    BarChart3
} from 'lucide-react';
import type { CPBStatus, CPBResult, CPBPath, CPBPhase } from '../services/cognitivePrecisionBridge/types';

// ============================================================================
// PATH DISPLAY CONFIG
// ============================================================================

interface PathConfig {
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
}

const PATH_CONFIGS: Record<CPBPath, PathConfig> = {
    direct: {
        label: 'Direct',
        icon: <Zap size={14} />,
        color: '#10b981',
        description: 'Fast single-pass execution'
    },
    rlm: {
        label: 'RLM',
        icon: <BrainCircuit size={14} />,
        color: '#8b5cf6',
        description: 'Recursive Language Model for long context'
    },
    ace: {
        label: 'ACE',
        icon: <Users size={14} />,
        color: '#3b82f6',
        description: 'Multi-agent consensus engine'
    },
    hybrid: {
        label: 'Hybrid',
        icon: <GitMerge size={14} />,
        color: '#f59e0b',
        description: 'RLM compression + ACE consensus'
    },
    cascade: {
        label: 'Cascade',
        icon: <Layers size={14} />,
        color: '#ef4444',
        description: 'Full pipeline with verification'
    }
};

const PHASE_CONFIGS: Record<CPBPhase, { label: string; color: string }> = {
    idle: { label: 'Idle', color: '#6b7280' },
    analyzing: { label: 'Analyzing', color: '#8b5cf6' },
    compressing: { label: 'Compressing', color: '#3b82f6' },
    exploring: { label: 'Exploring', color: '#10b981' },
    converging: { label: 'Converging', color: '#f59e0b' },
    verifying: { label: 'Verifying', color: '#06b6d4' },
    reconstructing: { label: 'Reconstructing', color: '#ec4899' },
    complete: { label: 'Complete', color: '#10b981' },
    error: { label: 'Error', color: '#ef4444' }
};

// ============================================================================
// COMPACT STATUS BADGE
// ============================================================================

interface CPBStatusBadgeProps {
    status: CPBStatus | null;
    onClick?: () => void;
}

export const CPBStatusBadge: React.FC<CPBStatusBadgeProps> = ({ status, onClick }) => {
    if (!status || status.phase === 'idle') return null;

    const pathConfig = PATH_CONFIGS[status.path];
    const phaseConfig = PHASE_CONFIGS[status.phase];
    const isActive = status.phase !== 'complete' && status.phase !== 'error';

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
            style={{
                background: `${pathConfig.color}15`,
                border: `1px solid ${pathConfig.color}40`
            }}
        >
            {isActive ? (
                <Loader2 size={12} className="animate-spin" style={{ color: pathConfig.color }} />
            ) : status.phase === 'complete' ? (
                <CheckCircle2 size={12} style={{ color: '#10b981' }} />
            ) : (
                <AlertCircle size={12} style={{ color: '#ef4444' }} />
            )}
            <span className="text-xs font-medium" style={{ color: pathConfig.color }}>
                {pathConfig.label}
            </span>
            <span className="text-xs text-gray-500">
                {phaseConfig.label}
            </span>
            <span className="text-xs text-gray-400">
                {status.progress}%
            </span>
        </button>
    );
};

// ============================================================================
// DETAILED MONITOR PANEL
// ============================================================================

interface CPBMonitorPanelProps {
    status: CPBStatus | null;
    lastResult: CPBResult | null;
    onClose?: () => void;
}

export const CPBMonitorPanel: React.FC<CPBMonitorPanelProps> = ({ status, lastResult, onClose }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const pathConfig = status ? PATH_CONFIGS[status.path] : null;
    const phaseConfig = status ? PHASE_CONFIGS[status.phase] : null;

    return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <BrainCircuit size={16} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Cognitive Precision Bridge</h3>
                        <p className="text-xs text-gray-400">
                            {status?.message || 'Ready for execution'}
                        </p>
                    </div>
                </div>
                {status && pathConfig && (
                    <div
                        className="flex items-center gap-2 px-3 py-1 rounded-full"
                        style={{ background: `${pathConfig.color}20` }}
                    >
                        {pathConfig.icon}
                        <span className="text-xs font-medium" style={{ color: pathConfig.color }}>
                            {pathConfig.label}
                        </span>
                    </div>
                )}
            </div>

            {isExpanded && (
                <>
                    {/* Progress Bar */}
                    {status && status.phase !== 'idle' && (
                        <div className="px-4 py-3 border-b border-gray-700/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">
                                    {phaseConfig?.label}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {status.progress}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${status.progress}%`,
                                        background: pathConfig?.color || '#8b5cf6'
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatTime(status.elapsedMs)}
                                </span>
                                {status.estimatedRemainingMs > 0 && (
                                    <span>~{formatTime(status.estimatedRemainingMs)} remaining</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Path Selection Display */}
                    <div className="px-4 py-3 border-b border-gray-700/30">
                        <div className="text-xs text-gray-400 mb-2">Execution Paths</div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(PATH_CONFIGS).map(([key, config]) => {
                                const isActive = status?.path === key;
                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                                            isActive ? 'ring-1' : 'opacity-40'
                                        }`}
                                        style={{
                                            background: isActive ? `${config.color}20` : 'transparent',
                                            borderColor: config.color,
                                            boxShadow: isActive ? `0 0 0 2px ${config.color}40` : 'none'
                                        }}
                                        title={config.description}
                                    >
                                        {config.icon}
                                        <span
                                            className="text-xs"
                                            style={{ color: isActive ? config.color : '#6b7280' }}
                                        >
                                            {config.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Last Result Metrics */}
                    {lastResult && (
                        <div className="px-4 py-3">
                            <div className="text-xs text-gray-400 mb-3">Last Execution</div>
                            <div className="grid grid-cols-2 gap-3">
                                {/* DQ Score */}
                                <div className="p-3 rounded-lg bg-gray-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Target size={12} className="text-cyan-400" />
                                        <span className="text-xs text-gray-400">DQ Score</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="text-lg font-bold"
                                            style={{
                                                color: lastResult.dqScore.score > 0.7
                                                    ? '#10b981'
                                                    : lastResult.dqScore.score > 0.5
                                                    ? '#f59e0b'
                                                    : '#ef4444'
                                            }}
                                        >
                                            {(lastResult.dqScore.score * 100).toFixed(0)}%
                                        </span>
                                        {lastResult.verified && (
                                            <CheckCircle2 size={12} className="text-green-400" />
                                        )}
                                    </div>
                                    <DQBreakdown dqScore={lastResult.dqScore} />
                                </div>

                                {/* Execution Time */}
                                <div className="p-3 rounded-lg bg-gray-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock size={12} className="text-blue-400" />
                                        <span className="text-xs text-gray-400">Time</span>
                                    </div>
                                    <span className="text-lg font-bold text-white">
                                        {formatTime(lastResult.executionTimeMs)}
                                    </span>
                                </div>

                                {/* Confidence */}
                                <div className="p-3 rounded-lg bg-gray-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp size={12} className="text-green-400" />
                                        <span className="text-xs text-gray-400">Confidence</span>
                                    </div>
                                    <span className="text-lg font-bold text-white">
                                        {lastResult.confidence.toFixed(0)}%
                                    </span>
                                </div>

                                {/* Tokens */}
                                <div className="p-3 rounded-lg bg-gray-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Cpu size={12} className="text-purple-400" />
                                        <span className="text-xs text-gray-400">Tokens</span>
                                    </div>
                                    <span className="text-lg font-bold text-white">
                                        {formatNumber(lastResult.tokensUsed)}
                                    </span>
                                </div>
                            </div>

                            {/* Path Reasoning */}
                            {lastResult.pathReasoning && (
                                <div className="mt-3 p-2 rounded bg-gray-800/30 border border-gray-700/30">
                                    <div className="text-xs text-gray-400 mb-1">Path Selection</div>
                                    <p className="text-xs text-gray-300">{lastResult.pathReasoning}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ============================================================================
// DQ BREAKDOWN
// ============================================================================

interface DQBreakdownProps {
    dqScore: {
        score: number;
        components: {
            validity: number;
            specificity: number;
            correctness: number;
        };
    };
}

const DQBreakdown: React.FC<DQBreakdownProps> = ({ dqScore }) => {
    const components = [
        { label: 'V', value: dqScore.components.validity, weight: 40 },
        { label: 'S', value: dqScore.components.specificity, weight: 30 },
        { label: 'C', value: dqScore.components.correctness, weight: 30 }
    ];

    return (
        <div className="flex items-center gap-1 mt-1">
            {components.map(({ label, value, weight }) => (
                <div
                    key={label}
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                    style={{
                        background: `rgba(${value > 0.7 ? '16,185,129' : value > 0.5 ? '245,158,11' : '239,68,68'}, 0.2)`
                    }}
                    title={`${label === 'V' ? 'Validity' : label === 'S' ? 'Specificity' : 'Correctness'} (${weight}%)`}
                >
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-300">{(value * 100).toFixed(0)}</span>
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// COMPACT INLINE INDICATOR
// ============================================================================

interface CPBInlineIndicatorProps {
    status: CPBStatus | null;
}

export const CPBInlineIndicator: React.FC<CPBInlineIndicatorProps> = ({ status }) => {
    if (!status || status.phase === 'idle') return null;

    const pathConfig = PATH_CONFIGS[status.path];
    const isActive = status.phase !== 'complete' && status.phase !== 'error';

    return (
        <div className="flex items-center gap-1.5">
            {isActive && (
                <div className="relative">
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: pathConfig.color }}
                    />
                    <div
                        className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                        style={{ background: pathConfig.color, opacity: 0.5 }}
                    />
                </div>
            )}
            <span className="text-xs" style={{ color: pathConfig.color }}>
                {pathConfig.label}
            </span>
            <span className="text-xs text-gray-500">
                {status.progress}%
            </span>
        </div>
    );
};

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatNumber(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / 1000000).toFixed(1)}M`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CPBMonitorPanel;
