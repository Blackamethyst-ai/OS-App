/**
 * ArchonDashboard - Panel Components
 *
 * Model orchestration and goal command center panels.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Clock, Activity, CheckCircle2, AlertTriangle, X,
    Flame, Zap, Rocket, Cpu, Target, Crosshair,
    Send, ChevronRight, Sparkles
} from 'lucide-react';

// =============================================================================
// MODEL ORCHESTRATION PANEL
// =============================================================================

interface ModelOrchestrationPanelProps {
    models: any[];
    activeModelId?: string | null;
}

export const ModelOrchestrationPanel: React.FC<ModelOrchestrationPanelProps> = ({
    models,
    activeModelId,
}) => {
    const tierGroups = useMemo(() => {
        const groups: Record<string, any[]> = { flagship: [], standard: [], fast: [], local: [] };
        models.forEach((m) => {
            if (groups[m.tier]) groups[m.tier].push(m);
        });
        return groups;
    }, [models]);

    const tierConfig = {
        flagship: { color: 'purple', icon: <Flame className="w-4 h-4" />, label: 'Flagship' },
        standard: { color: 'blue', icon: <Zap className="w-4 h-4" />, label: 'Standard' },
        fast: { color: 'green', icon: <Rocket className="w-4 h-4" />, label: 'Fast' },
        local: { color: 'gray', icon: <Cpu className="w-4 h-4" />, label: 'Local' },
    };

    return (
        <div className="space-y-4">
            {Object.entries(tierGroups).map(([tier, tierModels]) => {
                const config = tierConfig[tier as keyof typeof tierConfig];
                if (!tierModels.length) return null;

                return (
                    <div key={tier}>
                        <div className={`flex items-center gap-2 mb-2 text-${config.color}-400`}>
                            {config.icon}
                            <span className="text-sm font-medium">{config.label}</span>
                            <span className="text-xs text-gray-500">({tierModels.length})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {tierModels.slice(0, 4).map((model) => {
                                const isActive = activeModelId === model.id;
                                return (
                                    <motion.div
                                        key={model.id}
                                        className={`px-3 py-2 rounded-lg border relative ${
                                            isActive
                                                ? 'border-green-500 bg-green-500/20 ring-2 ring-green-500/50'
                                                : model.available
                                                ? `border-${config.color}-500/30 bg-${config.color}-500/5`
                                                : 'border-white/5 bg-white/5 opacity-40'
                                        }`}
                                        whileHover={{ scale: 1.02 }}
                                        animate={isActive ? { boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 8px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0.4)'] } : {}}
                                        transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
                                    >
                                        {isActive && (
                                            <motion.div
                                                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                            />
                                        )}
                                        <div className={`text-xs truncate ${isActive ? 'text-green-300 font-medium' : 'text-white'}`}>
                                            {model.name}
                                        </div>
                                        <div className={`text-xs ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
                                            {isActive ? 'ACTIVE' : model.provider}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// =============================================================================
// GOAL COMMAND CENTER
// =============================================================================

interface GoalCommandCenterProps {
    goals: any[];
    onSubmit: (goal: string) => void;
    isSubmitting: boolean;
    isReady: boolean;
}

export const GoalCommandCenter: React.FC<GoalCommandCenterProps> = ({
    goals,
    onSubmit,
    isSubmitting,
    isReady
}) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

    const suggestions = [
        'Add dark mode toggle to settings',
        'Refactor authentication to use OAuth2',
        'Optimize database queries for dashboard',
        'Create comprehensive test suite',
        'Research competitor features',
    ];

    const handleSubmit = () => {
        if (input.trim()) {
            onSubmit(input);
            setInput('');
            setShowSuggestions(false);
        }
    };

    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
        pending: { color: 'gray', icon: <Clock className="w-3 h-3" /> },
        active: { color: 'blue', icon: <Activity className="w-3 h-3 animate-pulse" /> },
        completed: { color: 'green', icon: <CheckCircle2 className="w-3 h-3" /> },
        escalated: { color: 'orange', icon: <AlertTriangle className="w-3 h-3" /> },
        failed: { color: 'red', icon: <X className="w-3 h-3" /> },
    };

    return (
        <div className="h-full flex flex-col">
            {/* Input */}
            <div className="relative mb-4">
                <div className="flex items-center gap-2 bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3">
                    <Crosshair className="w-5 h-5 text-purple-400" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Define mission objective..."
                        className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                        disabled={!isReady}
                    />
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!input.trim() || isSubmitting || !isReady}
                        className="p-2 bg-purple-500 rounded-lg text-white disabled:opacity-30"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isSubmitting ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1 }}
                            >
                                <Sparkles className="w-4 h-4" />
                            </motion.div>
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </motion.button>
                </div>

                {/* Suggestions */}
                <AnimatePresence>
                    {showSuggestions && !input && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-black/80 border border-white/10 rounded-lg overflow-hidden z-10"
                        >
                            {suggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInput(suggestion);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-purple-500/20 hover:text-white transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Goals List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                <AnimatePresence mode="popLayout">
                    {goals.map((goal) => {
                        const status = statusConfig[goal.status] || statusConfig.pending;
                        const isExpanded = expandedGoalId === goal.id;

                        return (
                            <motion.div
                                key={goal.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`border rounded-xl overflow-hidden ${
                                    goal.status === 'active'
                                        ? 'border-blue-500/50 bg-blue-500/10'
                                        : goal.status === 'completed'
                                        ? 'border-green-500/30 bg-green-500/5'
                                        : goal.status === 'escalated'
                                        ? 'border-orange-500/30 bg-orange-500/5'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <button
                                    onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3"
                                >
                                    <div className={`text-${status.color}-400`}>
                                        {status.icon}
                                    </div>
                                    <span className="flex-1 text-left text-sm text-white truncate">
                                        {goal.text || goal.description}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                        className="text-gray-500"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 py-3 border-t border-white/5 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500">Status</span>
                                                    <span className={`text-${status.color}-400 capitalize`}>
                                                        {goal.status}
                                                    </span>
                                                </div>
                                                {(goal.plan || goal.metadata?.context) && (
                                                    <div className="text-xs text-gray-400 bg-black/40 rounded-lg p-2">
                                                        {goal.plan || goal.metadata?.context}
                                                    </div>
                                                )}
                                                {(goal.result || goal.output) && (
                                                    <div className="text-xs text-green-400 bg-green-500/10 rounded-lg p-2">
                                                        {(goal.result || goal.output)?.substring(0, 200)}...
                                                    </div>
                                                )}
                                                {(goal.error || goal.status === 'failed') && (
                                                    <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                                                        {goal.error || 'Goal failed'}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {goals.length === 0 && (
                    <div className="text-center py-12 text-gray-600">
                        <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No active missions</p>
                        <p className="text-sm">Enter an objective above to begin</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// =============================================================================
// ORGANISM LAYERS PANEL
// =============================================================================

interface OrganismLayerStatus {
    id: 'genome' | 'swarm' | 'cognitive';
    name: string;
    status: 'idle' | 'busy' | 'sleeping' | 'disabled';
    metrics: {
        invocations: number;
        successRate: number;
        avgDqScore: number;
        avgLatencyMs: number;
    };
    phase?: string; // For cognitive layer (wake/nrem/rem)
}

interface OrganismLayersPanelProps {
    layers: OrganismLayerStatus[];
    onLayerClick?: (layerId: string) => void;
}

export const OrganismLayersPanel: React.FC<OrganismLayersPanelProps> = ({
    layers,
    onLayerClick,
}) => {
    const layerConfig = {
        genome: {
            color: 'emerald',
            icon: '🧬',
            label: 'Genome',
            description: 'Portable Skills (DNA)',
        },
        swarm: {
            color: 'violet',
            icon: '🐝',
            label: 'Swarm',
            description: 'Self-Organizing (Nervous System)',
        },
        cognitive: {
            color: 'amber',
            icon: '🧠',
            label: 'Cognitive',
            description: 'Wake/Sleep (Consolidation)',
        },
    };

    const statusColors = {
        idle: 'text-gray-400',
        busy: 'text-green-400',
        sleeping: 'text-blue-400',
        disabled: 'text-red-400',
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <span className="text-lg">🦠</span>
                <span className="font-medium">Organism Layers</span>
            </div>

            {layers.map((layer) => {
                const config = layerConfig[layer.id];
                const statusColor = statusColors[layer.status];

                return (
                    <motion.div
                        key={layer.id}
                        className={`p-3 rounded-lg border border-${config.color}-500/20 bg-${config.color}-500/5 cursor-pointer hover:bg-${config.color}-500/10 transition-colors`}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => onLayerClick?.(layer.id)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{config.icon}</span>
                                <div>
                                    <div className={`text-sm font-medium text-${config.color}-300`}>
                                        {config.label}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {config.description}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {layer.phase && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                        {layer.phase}
                                    </span>
                                )}
                                <span className={`text-xs uppercase font-medium ${statusColor}`}>
                                    {layer.status}
                                </span>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="text-center">
                                <div className="text-gray-500">Calls</div>
                                <div className="text-white font-medium">
                                    {layer.metrics.invocations}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-gray-500">Success</div>
                                <div className={`font-medium ${
                                    layer.metrics.successRate >= 0.9 ? 'text-green-400' :
                                    layer.metrics.successRate >= 0.7 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {(layer.metrics.successRate * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-gray-500">DQ</div>
                                <div className={`font-medium ${
                                    layer.metrics.avgDqScore >= 0.8 ? 'text-green-400' :
                                    layer.metrics.avgDqScore >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {layer.metrics.avgDqScore.toFixed(2)}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-gray-500">Latency</div>
                                <div className="text-white font-medium">
                                    {layer.metrics.avgLatencyMs.toFixed(0)}ms
                                </div>
                            </div>
                        </div>

                        {/* Activity Indicator */}
                        {layer.status === 'busy' && (
                            <motion.div
                                className={`h-0.5 mt-2 rounded-full bg-${config.color}-500`}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                        )}
                    </motion.div>
                );
            })}

            {layers.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                    <span className="text-2xl">🦠</span>
                    <p className="mt-2 text-sm">Organism layers initializing...</p>
                </div>
            )}
        </div>
    );
};
