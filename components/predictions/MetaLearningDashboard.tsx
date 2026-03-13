import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Brain, TrendingUp, Clock, AlertTriangle, Sparkles, Database, Activity } from 'lucide-react';
import { PredictionPanel } from './PredictionPanel';
import { usePredictionWithContext } from '../../libs/agent-core-sdk/src/hooks';

/**
 * MetaLearningDashboard — Full-page prediction intelligence interface
 *
 * Navigable via: /predictions or PREDICTIONS tab
 *
 * Features:
 * - Real-time session outcome predictions
 * - Historical learning insights
 * - Error prevention analysis
 * - Cognitive timing optimization
 * - Research recommendation engine
 */
const MetaLearningDashboard: React.FC = () => {
    const [intent, setIntent] = useState('');
    const [activeView, setActiveView] = useState<'predict' | 'insights' | 'history'>('predict');

    // Live prediction data
    const { data, isLoading } = usePredictionWithContext({
        intent,
        track: false,
        includeErrors: true,
        includeOptimalTime: true,
        debounceMs: 500,
    });

    return (
        <div className="h-full w-full flex flex-col gap-6 p-6 overflow-y-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2"
            >
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[var(--amethyst-soft)]/10 border border-[var(--amethyst-soft)]/30 rounded-lg">
                        <Brain className="w-6 h-6 text-[var(--amethyst-soft)]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black font-mono text-white uppercase tracking-wider">
                            Meta-Learning Engine
                        </h1>
                        <p className="text-sm text-gray-400 font-mono">
                            Predictive intelligence from 666+ historical sessions
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* View Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                {[
                    { id: 'predict', label: 'Live Predictions', icon: Sparkles },
                    { id: 'insights', label: 'Learning Insights', icon: TrendingUp },
                    { id: 'history', label: 'Session History', icon: Activity },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id as any)}
                        className={`
                            px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-all
                            flex items-center gap-2
                            ${activeView === tab.id
                                ? 'bg-[var(--amethyst-soft)]/20 text-purple-300 border border-[var(--amethyst-soft)]/40'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                            }
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Live Predictions View */}
            {activeView === 'predict' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col gap-6"
                >
                    {/* Input Section */}
                    <div className="space-y-3">
                        <label className="block text-sm font-mono font-semibold text-gray-300 uppercase tracking-wider">
                            What are you planning to work on?
                        </label>
                        <input
                            type="text"
                            value={intent}
                            onChange={(e) => setIntent(e.target.value)}
                            placeholder="e.g., implement authentication system, refactor API layer, debug rendering issue..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg
                                     text-white font-mono text-sm
                                     focus:outline-none focus:border-[var(--amethyst-soft)]/50 focus:bg-white/10
                                     placeholder:text-gray-500 transition-all"
                        />
                        {intent.length > 0 && intent.length < 3 && (
                            <p className="text-xs text-[var(--executive-gold)] font-mono">
                                Type at least 3 characters for predictions...
                            </p>
                        )}
                    </div>

                    {/* Prediction Results */}
                    {intent.length >= 3 && (
                        <div className="flex-1 overflow-y-auto">
                            <PredictionPanel
                                intent={intent}
                                track={false}
                                showErrors={true}
                                showTiming={true}
                                showResearch={true}
                                onStartTask={() => {}}
                                onScheduleLater={() => {}}
                                onSelectResearch={(research) => {
                                    if (research.url) window.open(research.url, '_blank', 'noopener');
                                }}
                            />
                        </div>
                    )}

                    {intent.length < 3 && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center space-y-4 max-w-2xl">
                                <Brain className="w-16 h-16 text-[var(--amethyst-soft)]/30 mx-auto" />
                                <div>
                                    <h3 className="text-lg font-mono font-bold text-white mb-2">
                                        AI-Powered Session Predictions
                                    </h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        Enter a task description to receive real-time predictions about session
                                        outcome, optimal timing, potential errors, and recommended research.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-[var(--plasma-green)] mb-2" />
                                        <div className="text-xs font-mono text-gray-300 font-semibold">Quality Score</div>
                                        <div className="text-xs text-gray-500 mt-1">1-5 star rating prediction</div>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                        <Clock className="w-5 h-5 text-[var(--azure-blue)] mb-2" />
                                        <div className="text-xs font-mono text-gray-300 font-semibold">Optimal Timing</div>
                                        <div className="text-xs text-gray-500 mt-1">Best time to work on task</div>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-orange-400 mb-2" />
                                        <div className="text-xs font-mono text-gray-300 font-semibold">Error Prevention</div>
                                        <div className="text-xs text-gray-500 mt-1">Predict potential issues</div>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                        <Database className="w-5 h-5 text-[var(--amethyst-soft)] mb-2" />
                                        <div className="text-xs font-mono text-gray-300 font-semibold">Research Context</div>
                                        <div className="text-xs text-gray-500 mt-1">Relevant past findings</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Learning Insights View */}
            {activeView === 'insights' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Data Source Stats */}
                        <div className="p-6 bg-gradient-to-br from-[var(--amethyst-soft)]/10 to-blue-500/10 border border-[var(--amethyst-soft)]/20 rounded-lg">
                            <Database className="w-8 h-8 text-[var(--amethyst-soft)] mb-3" />
                            <div className="text-2xl font-black font-mono text-white mb-1">666</div>
                            <div className="text-xs font-mono text-gray-400 uppercase">Session Outcomes</div>
                            <div className="text-xs text-gray-500 mt-2">Historical session data with quality ratings</div>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-[var(--cyan)]/10 border border-[var(--azure-blue)]/20 rounded-lg">
                            <Activity className="w-8 h-8 text-[var(--azure-blue)] mb-3" />
                            <div className="text-2xl font-black font-mono text-white mb-1">1,014</div>
                            <div className="text-xs font-mono text-gray-400 uppercase">Cognitive States</div>
                            <div className="text-xs text-gray-500 mt-2">Temporal patterns and energy levels</div>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
                            <AlertTriangle className="w-8 h-8 text-orange-400 mb-3" />
                            <div className="text-2xl font-black font-mono text-white mb-1">9</div>
                            <div className="text-xs font-mono text-gray-400 uppercase">Error Patterns</div>
                            <div className="text-xs text-gray-500 mt-2">Common issues with solutions</div>
                        </div>
                    </div>

                    {/* Correlation Weights */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                        <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[var(--plasma-green)]" />
                            Multi-Dimensional Correlation
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Session Outcomes', weight: 50, color: 'bg-[var(--amethyst-soft)]' },
                                { label: 'Cognitive State', weight: 30, color: 'bg-[var(--azure-blue)]' },
                                { label: 'Research Availability', weight: 15, color: 'bg-[var(--cyan)]' },
                                { label: 'Error Probability', weight: 5, color: 'bg-orange-500' },
                            ].map((signal) => (
                                <div key={signal.label} className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono text-gray-400">
                                        <span>{signal.label}</span>
                                        <span className="text-white font-semibold">{signal.weight}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${signal.color} transition-all duration-500`}
                                            style={{ width: `${signal.weight}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                        <h3 className="text-lg font-mono font-bold text-white mb-4">System Status</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-[var(--plasma-green)] rounded-full animate-pulse" />
                                <span className="text-sm font-mono text-gray-300">API Server Active</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-[var(--plasma-green)] rounded-full animate-pulse" />
                                <span className="text-sm font-mono text-gray-300">Vector Search Ready</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-[var(--plasma-green)] rounded-full animate-pulse" />
                                <span className="text-sm font-mono text-gray-300">Cognitive OS Sync</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-[var(--plasma-green)] rounded-full animate-pulse" />
                                <span className="text-sm font-mono text-gray-300">Error Patterns Loaded</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs font-mono text-gray-500">
                                Endpoint: <span className="text-[var(--amethyst-soft)]">Agent Core MCP</span>
                            </div>
                            <div className="text-xs font-mono text-gray-500 mt-1">
                                Model: <span className="text-[var(--amethyst-soft)]">Cohere embed-english-v3.0 (1024d)</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Session History View */}
            {activeView === 'history' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex items-center justify-center"
                >
                    <div className="text-center space-y-4">
                        <Activity className="w-16 h-16 text-gray-600 mx-auto" />
                        <p className="text-gray-500 font-mono text-sm">
                            Session history visualization coming soon...
                        </p>
                        <p className="text-xs text-gray-600 max-w-md mx-auto">
                            This view will show temporal patterns, success trends, and cognitive correlations
                            from your historical sessions.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default MetaLearningDashboard;
