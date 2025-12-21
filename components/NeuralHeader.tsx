
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAgentRuntime } from '../hooks/useAgentRuntime';

const NeuralHeader: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { voice, system, toggleTerminal } = useAppStore();
    const { state: agentState } = useAgentRuntime();
    const [pulse, setPulse] = useState(false);

    // Global reasoning state
    const isThinking = agentState.isThinking;
    const isSpeaking = voice.isActive;
    
    const lastLogTime = system.logs.length > 0 ? system.logs[system.logs.length - 1].timestamp : null;

    useEffect(() => {
        if (lastLogTime) {
            setPulse(true);
            const t = setTimeout(() => setPulse(false), 300);
            return () => clearTimeout(t);
        }
    }, [lastLogTime]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        let time = 0;

        const render = () => {
            time += 0.08;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Define Signature Color
            let color = '157, 78, 221'; // Sovereign Purple
            if (isThinking) color = '34, 211, 238'; // Agentic Cyan
            if (isSpeaking) color = '245, 158, 11'; // Voice Amber
            if (pulse) color = '16, 185, 129'; // Log Emerald

            // Multi-Layer Waveform Synthesis
            const drawWave = (offset: number, alpha: number, freq: number, amp: number) => {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${color}, ${alpha})`;
                ctx.lineWidth = 1.5;
                for (let i = 0; i < w; i++) {
                    const y = cy + Math.sin(i * freq + time + offset) * amp * Math.sin(time * 0.3);
                    if (i === 0) ctx.moveTo(i, y);
                    else ctx.lineTo(i, y);
                }
                ctx.stroke();
            };

            // Background harmonics
            drawWave(0, 0.2, 0.05, isThinking ? 12 : 4);
            drawWave(Math.PI, 0.1, 0.08, isSpeaking ? 15 : 6);

            // Primary foreground wave
            ctx.beginPath();
            const primaryAmp = isThinking ? 10 : isSpeaking ? 14 : 3;
            const primaryFreq = isThinking ? 0.15 : (pulse ? 0.3 : 0.06);
            
            ctx.shadowBlur = pulse ? 20 : (isThinking ? 12 : 5);
            ctx.shadowColor = `rgba(${color}, 0.6)`;
            
            for (let i = 0; i < w; i += 2) {
                const y = cy + Math.sin(i * primaryFreq + time) * primaryAmp;
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
            }
            
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = `rgba(${color}, 0.9)`;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Core Energy Node
            const coreRadius = (4 + Math.sin(time * 2) * (isThinking ? 3 : 1)) * (pulse ? 1.4 : 1);
            ctx.beginPath();
            ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, 1)`;
            ctx.fill();

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frameId);
    }, [isThinking, isSpeaking, pulse]);

    return (
        <div 
            className="relative w-16 h-10 cursor-pointer group flex items-center justify-center" 
            role="button"
            onClick={() => toggleTerminal()}
            title="Open Root Terminal"
        >
            <canvas ref={canvasRef} width={64} height={40} className="absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg backdrop-blur-[1px]">
                <Activity className="w-4 h-4 text-white animate-pulse" />
            </div>
            
            {/* Status Ghost Label */}
            {isThinking && (
                <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute -right-24 text-[8px] font-mono text-[#22d3ee] uppercase tracking-[0.2em] pointer-events-none font-black"
                >
                    REASONING_L1
                </motion.div>
            )}
        </div>
    );
};

export default NeuralHeader;
