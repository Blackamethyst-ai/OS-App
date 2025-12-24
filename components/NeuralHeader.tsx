
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { Activity, Zap } from 'lucide-react';
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
            time += 0.1;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Define Signature Color
            let color = '157, 78, 221'; // Amethyst
            if (isThinking) color = '34, 211, 238'; // Cyan
            if (isSpeaking) color = '245, 158, 11'; // Amber
            if (pulse) color = '16, 185, 129'; // Emerald

            // Multi-Layer Waveform Synthesis
            const drawWave = (offset: number, alpha: number, freq: number, amp: number) => {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${color}, ${alpha})`;
                ctx.lineWidth = 2;
                for (let i = 0; i < w; i++) {
                    const y = cy + Math.sin(i * freq + time + offset) * amp * Math.sin(time * 0.4);
                    if (i === 0) ctx.moveTo(i, y);
                    else ctx.lineTo(i, y);
                }
                ctx.stroke();
            };

            // Background harmonics
            drawWave(0, 0.15, 0.04, isThinking ? 15 : 5);
            drawWave(Math.PI, 0.1, 0.06, isSpeaking ? 18 : 8);

            // Primary foreground wave
            ctx.beginPath();
            const primaryAmp = isThinking ? 12 : isSpeaking ? 16 : 4;
            const primaryFreq = isThinking ? 0.12 : (pulse ? 0.25 : 0.05);
            
            ctx.shadowBlur = pulse ? 30 : (isThinking ? 15 : 5);
            ctx.shadowColor = `rgba(${color}, 0.8)`;
            
            for (let i = 0; i < w; i += 2) {
                const y = cy + Math.sin(i * primaryFreq + time) * primaryAmp;
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
            }
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = `rgba(${color}, 1)`;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Core Energy Node
            const coreRadius = (5 + Math.sin(time * 2.5) * (isThinking ? 4 : 2)) * (pulse ? 1.5 : 1);
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
            className="relative w-20 h-12 cursor-pointer group flex items-center justify-center bg-black/40 rounded-xl border border-white/5 hover:border-[#9d4edd]/50 transition-all shadow-inner" 
            role="button"
            onClick={() => toggleTerminal()}
        >
            <canvas ref={canvasRef} width={80} height={48} className="absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl backdrop-blur-[2px]">
                <Zap className="w-5 h-5 text-white animate-pulse" />
            </div>
        </div>
    );
};

export default NeuralHeader;
