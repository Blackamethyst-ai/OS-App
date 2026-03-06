/**
 * METAVENTIONS HUB - Metrics & Stats Components
 * Data visualization panels for system telemetry.
 */

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, DollarSign, Bot, Hexagon } from 'lucide-react';
import { useAppStore } from '../../../store';
import { cn } from '../../../utils/cn';
import { SwarmLattice } from './effects';
import type { LucideIcon } from 'lucide-react';

interface CompactMetricProps {
    title: string;
    value: string | number;
    detail: string;
    icon: LucideIcon;
    color: string;
    trend: 'up' | 'down';
}

/**
 * Compact metric display card with trend indicator.
 */
export const CompactMetric: React.FC<CompactMetricProps> = ({
    title,
    value,
    detail,
    icon: Icon,
    color,
    trend
}) => (
    <div className="crystalline border-none rounded-2xl p-4 flex flex-col gap-2 hover:border-white/15 transition-all group shadow-inner relative overflow-hidden invisible-glass hover:scale-[1.02]">
        <div className="flex justify-between items-center relative z-10">
            <div className="p-1.5 rounded-lg bg-white/5 text-gray-500 group-hover:text-white transition-all">
                <Icon size={12} style={{ color }} />
            </div>
            <div className={`text-[8px] font-mono font-black flex items-center gap-0.5 ${trend === 'up' ? 'text-[var(--plasma-green)]' : 'text-[#ef4444]'}`}>
                {trend === 'up' ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                {detail}
            </div>
        </div>
        <div className="relative z-10">
            <div className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest mb-0.5">
                {title}
            </div>
            <div className="text-lg font-black font-mono text-white tracking-tighter leading-none">
                {value}
            </div>
        </div>
        <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20" />
    </div>
);

interface CapitalVelocityProps {
    telemetry: { cpu?: number } | null;
}

/**
 * Capital velocity metrics panel showing compute, treasury, and reach.
 */
export const CapitalVelocity: React.FC<CapitalVelocityProps> = ({ telemetry }) => {
    const agents = useAppStore(s => s.agents);

    const computeVal = Math.min(100, Math.floor(telemetry ? (telemetry.cpu || 0) * 3 : 45));
    const flowVal = 50 + (agents.activeAgents.filter(a => a.status === 'THINKING').length * 20);
    const reachVal = Math.min(100, 20 + (agents.activeAgents.length * 15));

    const categories = [
        { label: 'Compute Units', val: computeVal },
        { label: 'Treasury Flow', val: flowVal },
        { label: 'System Reach', val: reachVal }
    ];

    const getBarColor = (val: number): string => {
        if (val >= 90) return 'var(--plasma-green)';
        if (val >= 70) return 'var(--cyan)';
        if (val >= 50) return 'var(--executive-gold)';
        if (val >= 30) return '#f97316';
        return '#ef4444';
    };

    return (
        <div className="crystalline rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden group/cap shrink-0 invisible-glass border border-white/5 hover:border-white/20 transition-all duration-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.01)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
                <div className="p-2 bg-[var(--plasma-green)]/10 rounded-xl text-[var(--plasma-green)] border border-[var(--plasma-green)]/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <DollarSign size={16} />
                </div>
                <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">
                    Capital Velocity
                </span>
            </div>
            <div className="space-y-6 relative z-10">
                {categories.map((cat) => {
                    const barColor = getBarColor(cat.val);
                    return (
                        <div key={cat.label} className="space-y-2.5">
                            <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest font-black">
                                <span className="text-gray-500">{cat.label}</span>
                                <span className="text-white">{cat.val}%</span>
                            </div>
                            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-px shadow-inner">
                                <motion.div
                                    initial={{ width: 0, backgroundColor: '#333' }}
                                    animate={{ width: `${cat.val}%`, backgroundColor: barColor }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                    className="h-full rounded-full transition-colors duration-1000"
                                    style={{ boxShadow: `0 0 10px ${barColor}40` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Swarm matrix box with hexagonal grid showing active agents.
 */
export const SwarmBox: React.FC = () => {
    const agents = useAppStore(s => s.agents.activeAgents);
    const hexCount = 6;

    return (
        <div className="crystalline rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden group/swarm shrink-0 invisible-glass border border-white/5 hover:border-white/20 transition-all duration-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.02)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center justify-between px-1 relative z-10">
                <div className="flex items-center gap-2.5">
                    <Hexagon size={12} className="text-[var(--amethyst-soft)] animate-pulse" />
                    <span className="text-[8px] font-black font-mono text-white uppercase tracking-[0.4em]">
                        Swarm Matrix
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[var(--plasma-green)] shadow-[0_0_8px_var(--plasma-green)]" />
                    <span className="text-[6px] font-mono text-gray-600 uppercase tracking-widest">
                        Active
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 relative z-10 px-1">
                <SwarmLattice />
                {Array.from({ length: hexCount }).map((_, i) => {
                    const agent = agents[i];
                    const isActive = !!agent;
                    const isThinking = agent?.status === 'THINKING';
                    return (
                        <motion.div
                            key={i}
                            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
                            className={cn(
                                "aspect-square flex flex-col items-center justify-center rounded-xl border transition-all duration-700 shadow-inner relative overflow-hidden",
                                isActive
                                    ? "bg-black/60 border-[var(--amethyst-soft)]/30 shadow-[0_0_10px_rgba(157,78,221,0.1)]"
                                    : "bg-black/10 border-white/5 opacity-10"
                            )}
                        >
                            {isActive ? (
                                <>
                                    <Bot
                                        size={14}
                                        className={cn(
                                            isThinking ? "text-[var(--executive-gold)] animate-spin" : "text-[var(--amethyst-soft)]"
                                        )}
                                    />
                                    {isThinking && (
                                        <motion.div
                                            animate={{ opacity: [0, 0.4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="absolute inset-0 bg-[var(--executive-gold)]/10"
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="w-0.5 h-0.5 rounded-full bg-white/5" />
                            )}
                        </motion.div>
                    );
                })}
            </div>
            <div className="pt-2 border-t border-white/5 relative z-10">
                <div className="flex justify-between items-center text-[6px] font-mono text-gray-700 uppercase tracking-widest">
                    <span>LATTICE_OK</span>
                    <span className="text-[var(--plasma-green)] font-black opacity-60">The D-Ecosystem</span>
                </div>
            </div>
        </div>
    );
};

interface SystemPulseProps {
    active: boolean;
}

/**
 * System pulse indicator showing connection status.
 */
export const SystemPulse: React.FC<SystemPulseProps> = ({ active }) => (
    <div className="flex items-center gap-3">
        <div className={`relative w-3 h-3 rounded-full ${
            active ? 'bg-[var(--plasma-green)]' : 'bg-gray-700'
        }`}>
            {active && (
                <>
                    <div className="absolute inset-0 rounded-full bg-[var(--plasma-green)] animate-ping opacity-75" />
                    <div className="absolute inset-0 rounded-full bg-[var(--plasma-green)] shadow-[0_0_10px_var(--plasma-green)]" />
                </>
            )}
        </div>
        <span className="text-[9px] font-mono font-black uppercase tracking-widest text-gray-500">
            {active ? 'ONLINE' : 'STANDBY'}
        </span>
    </div>
);
