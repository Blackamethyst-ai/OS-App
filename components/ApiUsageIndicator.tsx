/**
 * API USAGE INDICATOR
 * Displays real-time API usage statistics with rate limit warnings.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, Zap } from 'lucide-react';
import { useApiUsage } from '../hooks/useApiUsage';

const ApiUsageIndicator: React.FC = () => {
    const { stats } = useApiUsage();

    // Determine status color based on calls per minute
    const getStatusColor = () => {
        if (stats.callsThisMinute >= 12) return '#ef4444'; // Red - near limit
        if (stats.callsThisMinute >= 8) return '#f59e0b';  // Amber - moderate
        return 'var(--plasma-green)';                       // Green - normal
    };

    const statusColor = getStatusColor();
    const isNearLimit = stats.callsThisMinute >= 10;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl"
        >
            {/* Pulse Indicator */}
            <div className="relative">
                <Activity size={12} style={{ color: statusColor }} />
                {stats.callsThisMinute > 0 && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: statusColor }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
            </div>

            {/* Stats Display */}
            <div className="flex items-center gap-3 text-[9px] font-mono">
                <div className="flex items-center gap-1">
                    <Zap size={10} className="text-[var(--amethyst)]" />
                    <span className="text-gray-500">{stats.callsThisMinute}/min</span>
                </div>
                <div className="text-gray-600">|</div>
                <span className="text-gray-500">{stats.callsThisHour}/hr</span>
            </div>

            {/* Warning on near limit */}
            {isNearLimit && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 text-[8px] text-amber-400"
                >
                    <AlertTriangle size={10} />
                    <span className="uppercase font-bold">Rate Limit</span>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ApiUsageIndicator;
