/**
 * METAVENTIONS HUB - Visual Effects
 * Background animations and visual flourishes.
 */

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Volumetric fog animation for ambient background.
 */
export const VolumetricFog: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <motion.div
            animate={{
                x: [-100, 100, -100],
                y: [-50, 50, -50],
                scale: [1, 1.2, 1],
                rotate: [0, 15, 0]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-[100%] bg-[radial-gradient(circle_at_30%_40%,color-mix(in_srgb,var(--amethyst),transparent_92%)_0%,transparent_50%)]"
        />
        <motion.div
            animate={{
                x: [100, -100, 100],
                y: [50, -50, 50],
                scale: [1.2, 1, 1.2],
                rotate: [0, -15, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-[100%] bg-[radial-gradient(circle_at_70%_60%,color-mix(in_srgb,var(--cyan),transparent_95%)_0%,transparent_40%)]"
        />
    </div>
);

/**
 * SVG data stream tether animation.
 */
export const DataStreamTether: React.FC = () => (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-30 opacity-40">
        <defs>
            <linearGradient id="streamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--amethyst)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--cyan)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--amethyst)" stopOpacity="0" />
            </linearGradient>
            <filter id="packetGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <motion.line
            x1="5%" y1="85%" x2="95%" y2="15%"
            stroke="url(#streamGradient)"
            strokeWidth="0.5"
            strokeDasharray="4 8"
            animate={{ strokeDashoffset: [0, -100] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
            r="3"
            fill="var(--cyan)"
            filter="url(#packetGlow)"
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{ offsetPath: "path('M 50 850 Q 500 400 950 150')" }}
        />
    </svg>
);

interface NeuralFileStreamProps {
    active: boolean;
    isDraggingOver?: boolean;
}

/**
 * Canvas-based particle animation for file stream visualization.
 */
export const NeuralFileStream: React.FC<NeuralFileStreamProps> = ({ active, isDraggingOver }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!active && !isDraggingOver) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const count = isDraggingOver ? 100 : 40;
        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
        }> = Array.from({ length: count }, () => ({
            x: Math.random() * 800,
            y: Math.random() * 400,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 2 + 1,
            color: isDraggingOver
                ? '#ffffff'
                : ['#9d4edd', '#22d3ee', '#f1c21b', '#10b981'][Math.floor(Math.random() * 4)]
        }));

        let frameId: number;
        const animate = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                if (isDraggingOver) {
                    const dx = canvas.width / 2 - p.x;
                    const dy = canvas.height / 2 - p.y;
                    p.vx += dx * 0.001;
                    p.vy += dy * 0.001;
                }
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.98;
                p.vy *= 0.98;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fill();
            });

            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [active, isDraggingOver]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-30"
        />
    );
};
