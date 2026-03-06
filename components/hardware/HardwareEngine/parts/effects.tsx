/**
 * HARDWARE ENGINE - Visual Effects
 * Particle animations and thermal visualization.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ComputeFluxOverlayProps {
    active: boolean;
    speed: number;
    color?: string;
}

/**
 * Particle flux animation overlay for compute visualization.
 */
export const ComputeFluxOverlay: React.FC<ComputeFluxOverlayProps> = ({
    active,
    speed,
    color = 'var(--cyan)'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !active) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            life: number;
            pColor: string;
        }> = [];

        const render = () => {
            frame++;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (frame % Math.max(1, Math.floor(10 / speed)) === 0) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * speed * 1.5,
                    vy: (Math.random() - 0.5) * speed * 1.5,
                    life: 1.0,
                    pColor: Math.random() > 0.5 ? color : 'var(--amber)'
                });
            }

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.01;
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    return;
                }
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
                ctx.strokeStyle = p.pColor;
                ctx.globalAlpha = p.life * 0.3;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
                ctx.fillStyle = p.pColor;
                ctx.globalAlpha = p.life;
                ctx.fill();
            });
            requestAnimationFrame(render);
        };

        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, [active, speed, color]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
        />
    );
};

interface NeuralThermalGridProps {
    stressLevel: number;
}

/**
 * Thermal grid visualization for hardware stress monitoring.
 */
export const NeuralThermalGrid: React.FC<NeuralThermalGridProps> = ({ stressLevel }) => {
    const [points, setPoints] = useState(() =>
        Array.from({ length: 100 }, (_, i) => ({
            id: i,
            temp: 40 + Math.random() * 20,
            stress: Math.random() * 100
        }))
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setPoints(prev =>
                prev.map(p => ({
                    ...p,
                    temp: Math.max(30, Math.min(100, p.temp + (Math.random() * (stressLevel / 15) - (stressLevel / 30)))),
                    stress: Math.max(0, Math.min(100, p.stress + (Math.random() * 8 - 4)))
                }))
            );
        }, 1200);
        return () => clearInterval(interval);
    }, [stressLevel]);

    return (
        <div className="grid grid-cols-10 gap-px w-full aspect-square bg-black border border-white/5 p-0.5 rounded shadow-inner overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#ef4444]/5 to-transparent pointer-events-none" />
            {points.map(p => (
                <div
                    key={p.id}
                    className="w-full h-full transition-colors duration-[2500ms]"
                    style={{
                        backgroundColor: p.temp > 85
                            ? `rgba(239, 68, 68, ${0.3 + (p.temp - 85) / 20})`
                            : `hsla(${240 - (p.temp - 30) * 3}, 80%, 40%, 0.1)`
                    }}
                />
            ))}
        </div>
    );
};

interface PerformanceMixerProps {
    label: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    onValueChange: (value: number) => void;
    color: string;
}

/**
 * Performance mixer slider control.
 */
export const PerformanceMixer: React.FC<PerformanceMixerProps> = ({
    label,
    value,
    unit,
    min,
    max,
    onValueChange,
    color
}) => (
    <div className="flex flex-col gap-1 p-2 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-white/10 transition-all">
        <div className="flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[7px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none mb-1">
                    {label}
                </span>
                <span className="text-[10px] font-black font-mono text-white tracking-tighter mt-0.5">
                    {value}{unit}
                </span>
            </div>
            <div className="h-3 w-0.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    animate={{ height: `${(value / max) * 100}%` }}
                    className="w-full bg-current mt-auto"
                    style={{ color }}
                />
            </div>
        </div>
        <div className="relative h-1 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div
                className="h-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}30` }}
                animate={{ width: `${((value - min) / (max - min)) * 100}%` }}
            />
            <input
                type="range"
                min={min}
                max={max}
                step={(max - min) / 100}
                value={value}
                onChange={(e) => onValueChange(parseFloat(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
        </div>
    </div>
);
