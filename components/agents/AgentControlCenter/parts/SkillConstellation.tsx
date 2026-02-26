/**
 * SKILL CONSTELLATION
 * A procedurally animated geometric lattice representing agent functional evolution.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';

interface SkillConstellationProps {
    capabilities: string[];
    color: string;
    isActive: boolean;
}

export const SkillConstellation: React.FC<SkillConstellationProps> = ({
    capabilities,
    color,
    isActive
}) => {
    const radius = 70;
    const center = { x: 100, y: 100 };
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (!isActive) return;
        let frame = 0;
        const animate = () => {
            frame += 0.5;
            setRotation(frame);
            requestAnimationFrame(animate);
        };
        const handle = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(handle);
    }, [isActive]);

    return (
        <div className="relative w-56 h-56 flex items-center justify-center shrink-0 group">
            {/* Background Neural Pulse */}
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.12, 0.05] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-current pointer-events-none"
                style={{ color }}
            />

            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <radialGradient id="centralGlow">
                        <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </radialGradient>
                </defs>

                <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '100px 100px' }}>
                    {/* Connection Web */}
                    {capabilities.map((_, i) => {
                        const angle = (i / capabilities.length) * Math.PI * 2;
                        const x = center.x + Math.cos(angle) * radius;
                        const y = center.y + Math.sin(angle) * radius;

                        const nextIdx = (i + 1) % capabilities.length;
                        const nextAngle = (nextIdx / capabilities.length) * Math.PI * 2;
                        const nx = center.x + Math.cos(nextAngle) * radius;
                        const ny = center.y + Math.sin(nextAngle) * radius;

                        return (
                            <g key={`conn-${i}`}>
                                <motion.line
                                    x1="100" y1="100" x2={x} y2={y}
                                    stroke={color} strokeOpacity="0.15" strokeWidth="0.5"
                                />
                                <motion.line
                                    x1={x} y1={y} x2={nx} y2={ny}
                                    stroke={color} strokeOpacity="0.25" strokeWidth="1"
                                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                />
                            </g>
                        );
                    })}

                    {/* Nodes */}
                    {capabilities.map((_, i) => {
                        const angle = (i / capabilities.length) * Math.PI * 2;
                        const x = center.x + Math.cos(angle) * radius;
                        const y = center.y + Math.sin(angle) * radius;
                        return (
                            <g key={i} className="cursor-help group/node">
                                <circle cx={x} cy={y} r="10" fill={color} fillOpacity="0.05" />
                                <motion.circle
                                    cx={x} cy={y} r="3" fill={color}
                                    filter="url(#glow)"
                                    animate={{ r: [2, 4, 2] }}
                                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                                />
                            </g>
                        );
                    })}
                </g>

                <circle cx="100" cy="100" r="25" fill="url(#centralGlow)" className="animate-pulse" />
                <Bot x="88" y="88" size={24} className="text-white opacity-80" />
            </svg>

            {capabilities.map((cap, i) => {
                const angle = (i / capabilities.length) * Math.PI * 2 + (rotation * Math.PI / 180);
                const x = 50 + Math.cos(angle) * 35;
                const y = 50 + Math.sin(angle) * 35;
                return (
                    <div
                        key={`label-${i}`}
                        className="absolute text-[8px] font-black font-mono text-white/50 uppercase tracking-[0.2em] pointer-events-none whitespace-nowrap bg-black/80 px-2.5 py-1 rounded-lg border border-white/5 shadow-2xl"
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {cap.split('_').join(' ')}
                    </div>
                );
            })}
        </div>
    );
};

export default SkillConstellation;
