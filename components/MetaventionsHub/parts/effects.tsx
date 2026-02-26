/**
 * METAVENTIONS HUB - Visual Effects
 * Background animations and visual flourishes.
 */

import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { FolderTree, FileText, ChevronRight } from 'lucide-react';

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
        <circle
            r="3"
            fill="var(--cyan)"
            filter="url(#packetGlow)"
            style={{ offsetPath: "path('M 50 850 Q 500 400 950 150')", animation: "packetFlow 3s linear infinite" }}
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

/**
 * Procedural hologram - rotating 3D sphere visualization.
 */
export const ProceduralHologram: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const points: Array<{ x: number; y: number; z: number }> = [];
        const count = 120;
        const radius = 100;

        for (let i = 0; i < count; i++) {
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            points.push({
                x: Math.cos(theta) * Math.sin(phi),
                y: Math.sin(theta) * Math.sin(phi),
                z: Math.cos(phi)
            });
        }

        const render = () => {
            frame += 0.01;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.strokeStyle = 'rgba(157, 78, 221, 0.1)';
            ctx.lineWidth = 0.5;
            points.forEach((p, i) => {
                const x1 = p.x * Math.cos(frame) - p.z * Math.sin(frame);
                const z1 = p.z * Math.cos(frame) + p.x * Math.sin(frame);
                const y1 = p.y * Math.cos(frame * 0.5) - z1 * Math.sin(frame * 0.5);
                const z2 = z1 * Math.cos(frame * 0.5) + p.y * Math.sin(frame * 0.5);
                const scale = 200 / (200 + z2);
                const screenX = cx + x1 * radius * scale;
                const screenY = cy + y1 * radius * scale;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 1.5 * scale, 0, Math.PI * 2);
                ctx.fill();
                if (i % 10 === 0) {
                    points.slice(i, i + 3).forEach(n => {
                        const nx = n.x * Math.cos(frame) - n.z * Math.sin(frame);
                        const nz1 = n.z * Math.cos(frame) + n.x * Math.sin(frame);
                        const ny = n.y * Math.cos(frame * 0.5) - nz1 * Math.sin(frame * 0.5);
                        const nz2 = nz1 * Math.cos(frame * 0.5) + n.y * Math.sin(frame * 0.5);
                        const nScale = 200 / (200 + nz2);
                        ctx.beginPath();
                        ctx.moveTo(screenX, screenY);
                        ctx.lineTo(cx + nx * radius * nScale, cy + ny * radius * nScale);
                        ctx.stroke();
                    });
                }
            });
            requestAnimationFrame(render);
        };
        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-10"
        />
    );
};

/**
 * Horizontal scanline effect.
 */
export const Scanline: React.FC = () => (
    <motion.div
        animate={{ top: ['-20%', '120%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[#9d4edd]/5 to-transparent pointer-events-none z-20"
    />
);

/**
 * SVG swarm lattice pattern for SwarmBox.
 */
export const SwarmLattice: React.FC = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20">
        <motion.path
            d="M 50,50 L 150,50 L 100,150 Z"
            fill="none"
            stroke="#9d4edd"
            strokeWidth="1"
            strokeDasharray="4 4"
            animate={{ strokeDashoffset: [0, 20] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
            cx="100" cy="80" r="40"
            fill="none"
            stroke="#18E6FF"
            strokeWidth="0.5"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
        />
    </svg>
);

interface DirectoryPeekProps {
    manifest: { structure?: Array<{ name: string }> } | null;
}

/**
 * Directory structure preview panel.
 */
export const DirectoryPeek: React.FC<DirectoryPeekProps> = ({ manifest }) => {
    if (!manifest || !Array.isArray(manifest.structure)) return null;

    return (
        <div className="crystalline rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden group/peek shrink-0 invisible-glass hover:border-white/10 transition-all">
            <div className="flex items-center justify-between relative z-10 px-1">
                <div className="flex items-center gap-3">
                    <FolderTree size={14} className="text-[#f1c21b]" />
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">
                        Drive Topology
                    </span>
                </div>
                <ChevronRight
                    size={12}
                    className="text-gray-600 group-hover/peek:translate-x-1 transition-transform"
                />
            </div>
            <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/5 max-h-[160px] overflow-y-auto custom-scrollbar space-y-2 relative z-10">
                {manifest.structure.slice(0, 5).map((node, i) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <FileText size={10} className="text-gray-600" />
                        <span className="text-[9px] font-mono text-gray-400 uppercase truncate tracking-tight">
                            {node.name}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
