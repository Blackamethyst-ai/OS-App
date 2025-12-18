
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { Command } from 'lucide-react';

const NeuralHeader: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { process, imageGen, codeStudio, voice, system, toggleTerminal } = useAppStore();
    const [pulse, setPulse] = useState(false);

    // Determine global activity level
    const isThinking = process.isLoading || imageGen.isLoading || codeStudio.isLoading || voice.isConnecting;
    const isSpeaking = voice.isActive;
    
    // Watch logs for daemon activity
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
            time += 0.05;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Activity Color
            let color = '157, 78, 221'; // Default Purple
            if (isThinking) color = '34, 211, 238'; // Cyan
            if (isSpeaking) color = '245, 158, 11'; // Amber
            if (pulse) color = '16, 185, 129'; // Emerald (Daemon/Log Pulse)

            // Dynamic Waveform
            ctx.beginPath();
            for (let i = 0; i < w; i += 2) {
                const baseAmp = isThinking ? 8 : isSpeaking ? 12 : 3;
                const amp = pulse ? baseAmp * 1.5 : baseAmp;
                const freq = isThinking ? 0.2 : (pulse ? 0.4 : 0.05);
                const y = cy + Math.sin(i * freq + time) * amp * Math.sin(time * 0.5);
                
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
            }
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(${color}, 0.8)`;
            ctx.stroke();

            // Glow
            ctx.shadowBlur = pulse ? 20 : 10;
            ctx.shadowColor = `rgba(${color}, 0.5)`;
            
            // Central Pulse
            const radius = (4 + Math.sin(time * 2) * (isThinking ? 2 : 1)) * (pulse ? 1.5 : 1);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, 1)`;
            ctx.fill();
            ctx.shadowBlur = 0;

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frameId);
    }, [isThinking, isSpeaking, pulse]);

    return (
        <div 
            className="relative w-12 h-8 cursor-pointer group" 
            role="button"
            onClick={() => toggleTerminal()}
            title="Open System Terminal"
        >
            <canvas ref={canvasRef} width={48} height={32} className="absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Command className="w-4 h-4 text-white drop-shadow-md" />
            </div>
        </div>
    );
};

export default NeuralHeader;
