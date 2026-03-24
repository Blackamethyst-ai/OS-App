import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scan, ShieldCheck, Crosshair } from 'lucide-react';
import { cn } from '../utils/cn';
import { audio } from '../services/audioService';
import { generateSpeech } from '../services/geminiService';
import { logger } from '../services/logger';

const TacticalScanner: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    // Ultra-slow velocity for smooth cinematic tracking (reduced from 0.04 to 0.015)
    const [pos, setPos] = useState({ x: 30, y: 30 });
    const velRef = useRef({ x: 0.015, y: 0.012 });
    const [isVerified, setIsVerified] = useState(false);
    const [isLocking, setIsLocking] = useState(false);
    const lockTriggered = useRef(false);

    // Audio Playback Helper for TTS
    const playTTS = async (text: string) => {
        try {
            const base64Audio = await generateSpeech(text, 'Zephyr');
            if (!base64Audio) return;

            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtx({ sampleRate: 24000 });
            const pcm16Count = Math.floor(len / 2);
            const audioBuffer = audioCtx.createBuffer(1, pcm16Count, 24000);
            const channelData = audioBuffer.getChannelData(0);
            const dataView = new DataView(bytes.buffer);

            for (let i = 0; i < pcm16Count; i++) {
                const sample = dataView.getInt16(i * 2, true);
                channelData[i] = sample / 32768.0;
            }

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.start();
        } catch (e) {
            logger.error("TTS Synthesis Fault:", e);
        }
    };

    // Rhythmic Radar Signal (Slower, 6-second intervals for meditative pace)
    useEffect(() => {
        if (isVerified) return;
        const interval = setInterval(() => {
            // Soft resonant radar pulse
            audio.playTone(180, 'sine', 0.1, 0);
            setTimeout(() => {
                audio.playTone(140, 'sine', 0.05, 0.15);
            }, 100);
        }, 6000);
        return () => clearInterval(interval);
    }, [isVerified]);

    useEffect(() => {
        let frame: number;
        let lastTime = performance.now();

        const move = (time: number) => {
            const dt = (time - lastTime) / 16; 
            lastTime = time;

            if (!isLocking) {
                setPos(prev => {
                    let nextX = prev.x + velRef.current.x * dt;
                    let nextY = prev.y + velRef.current.y * dt;

                    // Precision Boundary Handling - Soft clamping prevents visual "glitching"
                    const margin = 12; // Wider margin for smoother transition
                    if (nextX <= margin) {
                        nextX = margin;
                        velRef.current.x = Math.abs(velRef.current.x);
                    } else if (nextX >= 100 - margin) {
                        nextX = 100 - margin;
                        velRef.current.x = -Math.abs(velRef.current.x);
                    }

                    if (nextY <= margin) {
                        nextY = margin;
                        velRef.current.y = Math.abs(velRef.current.y);
                    } else if (nextY >= 100 - margin) {
                        nextY = 100 - margin;
                        velRef.current.y = -Math.abs(velRef.current.y);
                    }

                    // FACE RECOGNITION LOCK-ON: Central anchor detection (High precision)
                    const inTargetX = nextX > 49 && nextX < 51;
                    const inTargetY = nextY > 28 && nextY < 32;
                    
                    if (inTargetX && inTargetY && !lockTriggered.current) {
                        setIsLocking(true);
                        setIsVerified(true);
                        lockTriggered.current = true;
                        
                        // Execute Sovereign Handshake Protocol with requested phrase
                        playTTS("Identity Confirmed, Soveriegn Protocol Initiated, Welcome Dico Angelo");
                        
                        setTimeout(() => {
                            setIsLocking(false);
                            setIsVerified(false);
                            // Resuming scan with fresh vector cooldown to prevent immediate re-trigger
                            setTimeout(() => { lockTriggered.current = false; }, 30000);
                        }, 10000);
                    }

                    return { x: nextX, y: nextY };
                });
            }

            frame = requestAnimationFrame(move);
        };

        frame = requestAnimationFrame(move);
        return () => cancelAnimationFrame(frame);
    }, [isLocking]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-[100] pointer-events-none overflow-hidden">
            <motion.div 
                animate={{ 
                    left: `${pos.x}%`, 
                    top: `${pos.y}%` 
                }}
                transition={{ duration: 0.1, ease: "linear" }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
            >
                <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Reticle Brackets - Ultra-precise architectural profile */}
                    <div className={cn(
                        "absolute top-0 left-0 w-16 h-16 border-t border-l transition-all duration-1000",
                        isVerified ? "border-[var(--plasma-green)] shadow-[0_0_60px_var(--plasma-green)]" : "border-white/5"
                    )} />
                    <div className={cn(
                        "absolute top-0 right-0 w-16 h-16 border-t border-r transition-all duration-1000",
                        isVerified ? "border-[var(--plasma-green)] shadow-[0_0_60px_var(--plasma-green)]" : "border-white/5"
                    )} />
                    <div className={cn(
                        "absolute bottom-0 left-0 w-16 h-16 border-b border-l transition-all duration-1000",
                        isVerified ? "border-[var(--plasma-green)] shadow-[0_0_60px_var(--plasma-green)]" : "border-white/5"
                    )} />
                    <div className={cn(
                        "absolute bottom-0 right-0 w-16 h-16 border-b border-r transition-all duration-1000",
                        isVerified ? "border-[var(--plasma-green)] shadow-[0_0_60px_var(--plasma-green)]" : "border-white/5"
                    )} />

                    {/* Scanning Axis Rails - Minimalist refraction */}
                    <div className={cn(
                        "absolute w-[200vw] h-px transition-all duration-1000",
                        isVerified ? "bg-[var(--plasma-green)]/10" : "bg-white/[0.005]"
                    )} />
                    <div className={cn(
                        "absolute h-[200vh] w-px transition-all duration-1000",
                        isVerified ? "bg-[var(--plasma-green)]/10" : "bg-white/[0.005]"
                    )} />

                    <Crosshair 
                        size={40} 
                        className={cn(
                            "transition-all duration-1000",
                            isVerified ? "text-[var(--plasma-green)] scale-110 rotate-180" : "text-white/5 rotate-0"
                        )} 
                    />
                </div>

                <div className={cn(
                    "mt-12 px-14 py-8 bg-[#010102]/95 backdrop-blur-5xl border rounded-[3rem] shadow-[0_80px_160px_rgba(0,0,0,1)] transition-all duration-1000 min-w-[360px] overflow-hidden",
                    isVerified ? "border-[var(--plasma-green)]/30 scale-105" : "border-white/5"
                )}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-6">
                            <Scan size={24} className={isVerified ? "text-[var(--plasma-green)]" : "text-gray-800"} />
                            <span className={cn(
                                "text-[12px] font-black font-mono uppercase tracking-[0.7em]",
                                isVerified ? "text-[var(--plasma-green)]" : "text-gray-800"
                            )}>
                                {isVerified ? "IDENTITY_LOCKED" : "OCULUS_SCAN"}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            {[1,2,3].map(i => (
                                <motion.div 
                                    key={i}
                                    animate={isVerified ? { opacity: 1, scale: 1.2 } : { opacity: [0.05, 0.3, 0.05] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
                                    className={cn("w-2.5 h-2.5 rounded-full", isVerified ? "bg-[var(--plasma-green)]" : "bg-gray-900")}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-5 relative z-10">
                        <div className="flex justify-between text-[10px] font-mono text-gray-700 uppercase tracking-[0.5em]">
                            <span>Lattice_Pos</span>
                            <span className="text-white/60 font-bold">{pos.x.toFixed(4)}, {pos.y.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-gray-700 uppercase tracking-[0.5em]">
                            <span>Signal_Auth</span>
                            <span className={cn("font-black tracking-[0.3em]", isVerified ? "text-[var(--plasma-green)]" : "text-gray-900")}>
                                {isVerified ? "CONFIRMED" : "SEARCHING..."}
                            </span>
                        </div>
                        
                        <AnimatePresence>
                            {isVerified && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="pt-6 flex flex-col gap-4 border-t border-white/10 mt-5"
                                >
                                    <div className="flex items-center gap-6 text-base font-black text-[var(--plasma-green)] uppercase tracking-[0.4em]">
                                        <ShieldCheck size={24} />
                                        <span>Dico Angelo Confirmed</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.6em] pl-12">Soveriegn_Protocol_Active</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TacticalScanner;