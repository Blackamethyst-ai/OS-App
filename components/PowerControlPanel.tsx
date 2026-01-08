/**
 * POWER CONTROL PANEL
 * 
 * UI for managing compute budget and feature toggles.
 * Shows current mode, usage stats, and granular controls.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Battery, BatteryLow, BatteryFull, BatteryCharging,
    Moon, Brain, Users, Database, GitBranch, Activity, Lightbulb,
    ChevronDown, ChevronUp, Settings, DollarSign, AlertTriangle, X
} from 'lucide-react';
import { powerService, PowerConfig, PowerMode, FeatureToggles } from '../services/powerService';
import { cn } from '../utils/cn';

interface FeatureToggleRowProps {
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    cost: string;
}

const FeatureToggleRow: React.FC<FeatureToggleRowProps> = ({
    label, description, icon: Icon, enabled, onChange, cost
}) => (
    <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center gap-3">
            <div className={cn(
                "p-2 rounded-lg transition-all",
                enabled ? "bg-[#22d3ee]/20 text-[#22d3ee]" : "bg-white/5 text-gray-600"
            )}>
                <Icon size={16} />
            </div>
            <div>
                <div className="text-[11px] font-black font-mono uppercase text-white">{label}</div>
                <div className="text-[9px] font-mono text-gray-500">{description}</div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-gray-600">{cost}</span>
            <button
                onClick={() => onChange(!enabled)}
                className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    enabled ? "bg-[#22d3ee]" : "bg-white/10"
                )}
            >
                <motion.div
                    animate={{ x: enabled ? 20 : 2 }}
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg"
                />
            </button>
        </div>
    </div>
);

const PowerControlPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [config, setConfig] = useState<PowerConfig>(powerService.getConfig());
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        const unsubscribe = powerService.subscribe(setConfig);
        return unsubscribe;
    }, []);

    const getModeIcon = (mode: PowerMode) => {
        switch (mode) {
            case 'ECO': return BatteryLow;
            case 'BALANCED': return Battery;
            case 'OVERDRIVE': return BatteryCharging;
            default: return Settings;
        }
    };

    const getModeColor = (mode: PowerMode) => {
        switch (mode) {
            case 'ECO': return '#10b981';
            case 'BALANCED': return '#f59e0b';
            case 'OVERDRIVE': return '#ef4444';
            default: return '#9d4edd';
        }
    };

    const features: Array<{
        key: keyof FeatureToggles;
        label: string;
        description: string;
        icon: React.ComponentType<{ size?: number; className?: string }>;
        cost: string;
    }> = [
            { key: 'dreamProtocol', label: 'Dream Protocol', description: 'Overnight research & insights', icon: Moon, cost: '~$0.05/night' },
            { key: 'multiAgentSwarm', label: 'Multi-Agent Swarm', description: '12 agents analyze in parallel', icon: Users, cost: '~$0.02/query' },
            { key: 'memoryRAG', label: 'Memory RAG', description: 'Semantic search through history', icon: Database, cost: '~$0.005/search' },
            { key: 'autoEvolution', label: 'Auto-Evolution', description: 'Continuous self-improvement', icon: GitBranch, cost: '~$0.01/cycle' },
            { key: 'continuousMonitor', label: 'Continuous Monitor', description: 'Real-time system awareness', icon: Activity, cost: '~$0.05/hour' },
            { key: 'proactiveInsights', label: 'Proactive Insights', description: 'AI suggests before you ask', icon: Lightbulb, cost: '~$0.003/insight' }
        ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-h-[80vh] bg-[#0a0a0c]/98 border border-white/10 rounded-3xl z-[701] overflow-hidden flex flex-col shadow-[0_50px_150px_rgba(34,211,238,0.2)]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-black/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#22d3ee]/20 rounded-xl">
                                        <Zap size={20} className="text-[#22d3ee]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[14px] font-black font-mono text-white uppercase tracking-wider">
                                            Power Control
                                        </h2>
                                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                            Compute Budget & Features
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
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Mode Selector */}
                            <div className="space-y-3">
                                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Power Mode</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['ECO', 'BALANCED', 'OVERDRIVE'] as const).map(mode => {
                                        const ModeIcon = getModeIcon(mode);
                                        const isActive = config.mode === mode;
                                        const color = getModeColor(mode);

                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => powerService.setMode(mode)}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                                    isActive
                                                        ? "border-white/20 bg-white/5"
                                                        : "border-white/5 hover:border-white/10"
                                                )}
                                                style={{
                                                    boxShadow: isActive ? `0 0 30px ${color}30` : 'none',
                                                    borderColor: isActive ? color : undefined
                                                }}
                                            >
                                                <ModeIcon size={24} style={{ color: isActive ? color : '#666' }} />
                                                <span className={cn(
                                                    "text-[10px] font-black font-mono uppercase",
                                                    isActive ? "text-white" : "text-gray-500"
                                                )}>
                                                    {mode}
                                                </span>
                                                <span className="text-[8px] font-mono text-gray-600">
                                                    {mode === 'ECO' ? '$0/day' : mode === 'BALANCED' ? '~$0.20/day' : '~$5/day'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Usage Stats */}
                            <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={14} className="text-[#22d3ee]" />
                                        <span className="text-[10px] font-mono text-gray-400 uppercase">Today's Usage</span>
                                    </div>
                                    <span className="text-[12px] font-black font-mono text-white">
                                        {powerService.getFormattedDailyCost()} / {powerService.getFormattedDailyBudget()}
                                    </span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${powerService.getDailyUsagePercent()}%` }}
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            powerService.isApproachingLimit() ? "bg-amber-500" : "bg-[#22d3ee]",
                                            powerService.isBudgetExceeded() && "bg-red-500"
                                        )}
                                    />
                                </div>
                                {powerService.isApproachingLimit() && !powerService.isBudgetExceeded() && (
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <AlertTriangle size={12} />
                                        <span className="text-[9px] font-mono">Approaching daily limit</span>
                                    </div>
                                )}
                                {powerService.isBudgetExceeded() && (
                                    <div className="flex items-center gap-2 text-red-500">
                                        <AlertTriangle size={12} />
                                        <span className="text-[9px] font-mono">Budget exceeded - ECO mode active</span>
                                    </div>
                                )}
                            </div>

                            {/* Feature Toggles */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-[9px] font-mono text-gray-500 uppercase tracking-widest hover:text-white transition-all"
                                >
                                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    Advanced Controls
                                </button>

                                <AnimatePresence>
                                    {showAdvanced && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2 overflow-hidden"
                                        >
                                            {features.map(feature => (
                                                <FeatureToggleRow
                                                    key={feature.key}
                                                    label={feature.label}
                                                    description={feature.description}
                                                    icon={feature.icon}
                                                    enabled={config.features[feature.key]}
                                                    onChange={(enabled) => powerService.toggleFeature(feature.key, enabled)}
                                                    cost={feature.cost}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/40">
                            <span className="text-[9px] font-mono text-gray-600">
                                Mode: {config.mode} • {Object.values(config.features).filter(Boolean).length} features active
                            </span>
                            <button
                                onClick={() => powerService.resetUsage()}
                                className="text-[9px] font-mono text-gray-500 hover:text-white transition-all"
                            >
                                Reset Usage
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PowerControlPanel;
