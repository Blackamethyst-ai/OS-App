/**
 * ArchonDashboard - Visual Effects & Helper Components
 *
 * Neural network background, holographic cards, phase orbs,
 * event stream, and telemetry ring visualizations.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Radio, CheckCircle2, AlertTriangle, X, Terminal
} from 'lucide-react';

// =============================================================================
// NEURAL NETWORK BACKGROUND
// =============================================================================

interface NeuralBackgroundProps {
    active: boolean;
}

export const NeuralBackground: React.FC<NeuralBackgroundProps> = ({ active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        const nodes: { x: number; y: number; vx: number; vy: number; radius: number; pulse: number }[] = [];
        const nodeCount = 50;

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.offsetWidth,
                y: Math.random() * canvas.offsetHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                pulse: Math.random() * Math.PI * 2,
            });
        }

        let animationId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

            // Update and draw nodes
            nodes.forEach((node, i) => {
                node.x += node.vx * (active ? 1.5 : 0.5);
                node.y += node.vy * (active ? 1.5 : 0.5);
                node.pulse += 0.02;

                // Wrap around edges
                if (node.x < 0) node.x = canvas.offsetWidth;
                if (node.x > canvas.offsetWidth) node.x = 0;
                if (node.y < 0) node.y = canvas.offsetHeight;
                if (node.y > canvas.offsetHeight) node.y = 0;

                // Draw connections
                nodes.forEach((other, j) => {
                    if (i >= j) return;
                    const dx = other.x - node.x;
                    const dy = other.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        const alpha = (1 - dist / 120) * (active ? 0.3 : 0.1);
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `rgba(147, 51, 234, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });

                // Draw node
                const pulseScale = 1 + Math.sin(node.pulse) * 0.3;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * pulseScale, 0, Math.PI * 2);
                ctx.fillStyle = active ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.3)';
                ctx.fill();
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationId);
    }, [active]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-50"
            style={{ pointerEvents: 'none' }}
        />
    );
};

// =============================================================================
// HOLOGRAPHIC CARD
// =============================================================================

interface HoloCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
    active?: boolean;
}

export const HoloCard: React.FC<HoloCardProps> = ({
    children,
    className = '',
    glowColor = 'purple',
    active = false
}) => (
    <motion.div
        className={`relative overflow-hidden rounded-2xl ${className}`}
        whileHover={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400 }}
    >
        {/* Gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--amethyst)]/20 via-transparent to-[var(--cyan)]/15" />

        {/* Glass effect */}
        <div className="absolute inset-[1px] rounded-2xl bg-black/70 backdrop-blur-xl" />

        {/* Shimmer sweep */}
        <div className="absolute inset-0 rounded-2xl glass-refraction opacity-50" />

        {/* Glow effect */}
        {active && (
            <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--amethyst) 0%, transparent 60%)' }}
                animate={{ opacity: [0.05, 0.12, 0.05] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
    </motion.div>
);

// =============================================================================
// PHASE ORBS
// =============================================================================

interface PhaseOrbProps {
    phase: string;
    isActive: boolean;
    label: string;
    icon: React.ReactNode;
}

export const PhaseOrb: React.FC<PhaseOrbProps> = ({ phase, isActive, label, icon }) => (
    <motion.div
        className={`flex flex-col items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-30 hover:opacity-50'} transition-opacity`}
        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: isActive ? Infinity : 0, duration: 2, ease: "easeInOut" }}
    >
        <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                isActive
                    ? 'bg-[var(--amethyst)]/20 border-[var(--amethyst-soft)] text-[var(--amethyst-soft)] shadow-[0_0_20px_rgba(123,44,255,0.3)]'
                    : 'bg-white/5 border-white/10 text-gray-500'
            }`}
        >
            {icon}
        </div>
        <span className={`text-xs font-mono uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-500'}`}>{label}</span>
        {isActive && (
            <motion.div
                className="w-1.5 h-1.5 rounded-full bg-[var(--amethyst-soft)] shadow-[0_0_8px_var(--amethyst-soft)]"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
            />
        )}
    </motion.div>
);

// =============================================================================
// EVENT STREAM
// =============================================================================

export interface StreamEvent {
    id: string;
    type: string;
    message: string;
    timestamp: number;
    level: 'info' | 'success' | 'warning' | 'error';
}

interface EventStreamProps {
    events: StreamEvent[];
}

export const EventStream: React.FC<EventStreamProps> = ({ events }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [events.length]);

    const levelColors = {
        info: 'text-[var(--azure-blue)]',
        success: 'text-[var(--plasma-green)]',
        warning: 'text-[var(--executive-gold)]',
        error: 'text-red-400',
    };

    const levelIcons = {
        info: <Radio className="w-3 h-3" />,
        success: <CheckCircle2 className="w-3 h-3" />,
        warning: <AlertTriangle className="w-3 h-3" />,
        error: <X className="w-3 h-3" />,
    };

    return (
        <div ref={containerRef} className="h-full overflow-y-auto font-mono text-xs space-y-1">
            <AnimatePresence mode="popLayout">
                {events.map((event) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2 py-1 border-b border-white/5"
                    >
                        <span className="text-gray-600 shrink-0">
                            {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`shrink-0 ${levelColors[event.level]}`}>
                            {levelIcons[event.level]}
                        </span>
                        <span className="text-gray-400">[{event.type}]</span>
                        <span className="text-gray-300 truncate">{event.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
            {events.length === 0 && (
                <div className="text-gray-600 text-center py-4">
                    <Terminal className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    Waiting for events...
                </div>
            )}
        </div>
    );
};

// =============================================================================
// TELEMETRY RING
// =============================================================================

interface TelemetryRingProps {
    value: number;
    max: number;
    label: string;
    color: string;
}

export const TelemetryRing: React.FC<TelemetryRingProps> = ({ value, max, label, color }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-white/5"
                    />
                    <motion.circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold" style={{ color }}>
                        {percentage.toFixed(0)}%
                    </span>
                </div>
            </div>
            <span className="text-xs text-gray-500 mt-2">{label}</span>
        </div>
    );
};
