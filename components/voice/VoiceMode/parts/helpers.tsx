/**
 * VoiceMode - Helper Components
 *
 * Visual components for the voice interface.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Bot, User, Loader2, Fingerprint, BrainCircuit, Gauge, Zap as ZapIcon
} from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { audio } from '../../../../services/audioService';
import type { VoiceMode as VoiceModeType } from '../../../../services/voiceNexus';

// =============================================================================
// DATA TAG
// =============================================================================

interface DataTagProps {
    label: string;
    value: string;
    color: string;
}

export const DataTag: React.FC<DataTagProps> = ({ label, value, color }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-3xl shadow-2xl group hover:border-white/10 transition-all"
    >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ color }} />
        <div className="flex flex-col">
            <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-[0.2em]">{label}</span>
            <span className="text-[10px] font-black font-mono text-white uppercase tracking-tighter" style={{ color }}>{value}</span>
        </div>
    </motion.div>
);

// =============================================================================
// FREQUENCY RING
// =============================================================================

interface FrequencyRingProps {
    freqs: Uint8Array | null;
    color: string;
    size: number;
    active: boolean;
}

export const FrequencyRing: React.FC<FrequencyRingProps> = ({ freqs, color, size, active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resolve CSS variables to actual color values for Canvas API
        let resolvedColor = color;
        if (color.startsWith('var(')) {
            const varName = color.slice(4, -1);
            resolvedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || 'var(--cyan)';
        }

        let frameId: number;
        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, size, size);

            const cx = size / 2;
            const cy = size / 2;
            const time = performance.now() / 1000;

            // Base Aura
            const gradient = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.5);
            gradient.addColorStop(0, `${resolvedColor}${active ? '33' : '11'}`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            if (freqs && active) {
                const barCount = 64;
                const step = (Math.PI * 2) / barCount;
                const innerRadius = size * 0.32;

                for (let i = 0; i < barCount; i++) {
                    const val = freqs[i % freqs.length] / 255;
                    const angle = i * step + time * 0.1;
                    const h = val * (size * 0.1);

                    const x1 = cx + Math.cos(angle) * innerRadius;
                    const y1 = cy + Math.sin(angle) * innerRadius;
                    const x2 = cx + Math.cos(angle) * (innerRadius + h);
                    const y2 = cy + Math.sin(angle) * (innerRadius + h);

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = resolvedColor;
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.globalAlpha = 0.4 + val * 0.6;
                    ctx.stroke();

                    // Tiny particle at tip
                    if (val > 0.6) {
                        ctx.beginPath();
                        ctx.arc(x2, y2, 1, 0, Math.PI * 2);
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                    }
                }
            } else {
                // Idle pulse ring
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
                ctx.strokeStyle = `${resolvedColor}44`;
                ctx.lineWidth = 0.5;
                ctx.setLineDash([2, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color, size, active]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} className="absolute pointer-events-none z-0" />;
};

// =============================================================================
// NODE PERSONA
// =============================================================================

interface NodePersonaProps {
    image: string | null;
    freqs: Uint8Array | null;
    color: string;
    label: string;
    isAgent: boolean;
    isThinking: boolean;
}

export const NodePersona: React.FC<NodePersonaProps> = ({ image, freqs, color, label, isAgent, isThinking }) => {
    const isActive = !!freqs && freqs.some((v: number) => v > 40);

    return (
        <div className="relative flex flex-col items-center gap-8 group">
            <div className="relative w-64 h-64 flex items-center justify-center">
                <FrequencyRing freqs={freqs} color={color} size={256} active={isActive || isThinking} />

                <motion.div
                    animate={isActive || isThinking ? {
                        scale: [1, 1.02, 1],
                        borderColor: [`${color}44`, color, `${color}44`]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                        "relative z-10 w-36 h-36 rounded-full border-2 overflow-hidden bg-black shadow-2xl transition-all duration-700 p-1.5",
                        isThinking ? "border-[var(--executive-gold)]" : "border-white/10"
                    )}
                >
                    <div className="w-full h-full rounded-full overflow-hidden border border-white/5 relative">
                        {image ? (
                            <img src={image} className="w-full h-full object-cover grayscale-[20%] group-hover/persona:grayscale-0 transition-all duration-1000" alt={label} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#050505] text-gray-800">
                                {isAgent ? <BrainCircuit size={40} /> : <User size={40} />}
                            </div>
                        )}
                        <AnimatePresence>
                            {isThinking && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                                >
                                    <Loader2 className="w-8 h-8 text-[var(--executive-gold)] animate-spin" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Satellite Tags */}
                <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 z-20">
                    <DataTag label="Protocol" value={isAgent ? "Node_AI" : "Operator"} color={color} />
                </div>
                <div className="absolute bottom-4 left-0 -translate-x-6 z-20">
                    <DataTag label="Signal" value={isActive ? "Streaming" : "Standby"} color={isActive ? color : "#666"} />
                </div>
            </div>

            <div className="text-center space-y-1">
                <div className="flex items-center gap-3 justify-center">
                    {isAgent ? <Bot size={14} style={{ color }} /> : <Fingerprint size={14} style={{ color }} />}
                    <h3 className="text-sm font-black font-mono text-white uppercase tracking-[0.3em]">{label}</h3>
                </div>
                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none">
                    {isAgent ? 'Autonomous Intelligence Node' : 'Sovereign Controller'}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MODE SELECTOR
// =============================================================================

interface ModeSelectorProps {
    currentMode: VoiceModeType;
    onChange: (mode: VoiceModeType) => void;
    disabled: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onChange, disabled }) => {
    const modes: { value: VoiceModeType; label: string; desc: string; icon: React.ReactNode }[] = [
        { value: 'realtime', label: 'Realtime', desc: 'Gemini end-to-end', icon: <ZapIcon size={10} /> },
        { value: 'hybrid', label: 'Hybrid', desc: 'Auto-routes', icon: <Gauge size={10} /> },
        { value: 'turn-based', label: 'Quality', desc: 'Claude + ElevenLabs', icon: <BrainCircuit size={10} /> },
    ];

    return (
        <div className="flex gap-1 p-1 bg-black/40 border border-white/5 rounded-xl">
            {modes.map(mode => (
                <button
                    key={mode.value}
                    onClick={() => { onChange(mode.value); audio.playClick(); }}
                    disabled={disabled}
                    className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[7px] font-black font-mono uppercase tracking-widest transition-all flex items-center gap-1.5",
                        currentMode === mode.value
                            ? "bg-white text-black shadow-lg"
                            : "text-gray-600 hover:text-white disabled:opacity-30"
                    )}
                    title={mode.desc}
                >
                    {mode.icon}
                    {mode.label}
                </button>
            ))}
        </div>
    );
};
