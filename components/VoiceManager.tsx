
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import useSystemMind from '../stores/useSystemMind';
import { liveSession } from '../services/geminiService';
import { AppMode } from '../types';
import { Radio, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration, Type } from '@google/genai';

const VoiceManager: React.FC = () => {
    const { voice, setVoiceState, mode, addLog } = useAppStore();
    const { getSnapshot } = useSystemMind();
    const [isHudVisible, setIsHudVisible] = useState(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const connectionAttemptRef = useRef(false);

    // --- 1. Connection Logic ---
    useEffect(() => {
        let mounted = true;

        const manageConnection = async () => {
            // Case A: App wants voice ACTIVE, but we are not connected.
            if (voice.isActive && !liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                // Ensure UI shows connecting
                if (!voice.isConnecting) setVoiceState({ isConnecting: true });

                try {
                    // 1. Setup Callbacks
                    liveSession.onTranscriptUpdate = (role, text) => {
                        setVoiceState(prev => ({
                            transcripts: [...prev.transcripts, { role, text }].slice(-50)
                        }));
                    };

                    liveSession.onDisconnect = () => {
                        setVoiceState({ isActive: false, isConnecting: false });
                        connectionAttemptRef.current = false;
                        addLog('INFO', 'Voice Core Disconnected');
                    };

                    // 2. Override Tools for Context Awareness
                    const originalToolHandler = liveSession.onToolCall;
                    liveSession.onToolCall = async (name, args) => {
                        if (name === 'get_screen_context') {
                            const snapshot = getSnapshot();
                            addLog('SYSTEM', `VOICE_EYE: Context Snapshot taken (${snapshot.sector})`);
                            return snapshot;
                        }
                        return originalToolHandler ? originalToolHandler(name, args) : { error: "Unknown Tool" };
                    };

                    // 3. Connect
                    await liveSession.connect(voice.voiceName || 'Puck');
                    
                    if (mounted) {
                        setVoiceState({ isConnecting: false });
                        addLog('SUCCESS', 'Voice Core Uplink Established');
                    }

                } catch (err: any) {
                    console.error("[VoiceManager] Connection Failed:", err);
                    if (mounted) {
                        setVoiceState({ isActive: false, isConnecting: false, error: err.message });
                        addLog('ERROR', `Voice Link Failed: ${err.message}`);
                    }
                    connectionAttemptRef.current = false;
                }
            } 
            // Case B: App wants voice INACTIVE, but we are connected.
            else if (!voice.isActive && liveSession.isConnected()) {
                liveSession.disconnect();
                if (mounted) {
                    setVoiceState({ isConnecting: false });
                }
                connectionAttemptRef.current = false;
            }
        };

        manageConnection();

        return () => {
            mounted = false;
        };
    }, [voice.isActive, voice.voiceName, setVoiceState, getSnapshot, addLog]);

    // --- 2. HUD Visibility Logic ---
    useEffect(() => {
        setIsHudVisible(voice.isActive && mode !== AppMode.VOICE_MODE && !voice.isConnecting);
    }, [voice.isActive, mode, voice.isConnecting]);

    // --- 3. HUD Visualizer ---
    useEffect(() => {
        if (!isHudVisible) return;
        
        let animationId: number;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const render = () => {
            const freqs = liveSession.getOutputFrequencies(); // AI Voice
            const inputFreqs = liveSession.getInputFrequencies(); // User Voice
            
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const w = canvas.width;
            const h = canvas.height;
            const cy = h / 2;

            ctx.clearRect(0, 0, w, h);

            // Draw Center Line
            ctx.beginPath();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.moveTo(0, cy);
            ctx.lineTo(w, cy);
            ctx.stroke();

            // Draw AI Waveform (Cyan)
            if (freqs.length > 0) {
                ctx.beginPath();
                const sliceWidth = w / freqs.length;
                let x = 0;
                for(let i = 0; i < freqs.length; i++) {
                    const v = freqs[i] / 255.0;
                    const y = v * (h / 2);
                    if(i===0) ctx.moveTo(x, cy - y);
                    else ctx.lineTo(x, cy - y);
                    x += sliceWidth;
                }
                // Mirror
                x = 0;
                for(let i = 0; i < freqs.length; i++) {
                    const v = freqs[i] / 255.0;
                    const y = v * (h / 2);
                    if(i===0) ctx.moveTo(x, cy + y);
                    else ctx.lineTo(x, cy + y);
                    x += sliceWidth;
                }
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw User Input Indicator (Dot)
            const inputVol = inputFreqs.reduce((a,b)=>a+b,0) / (inputFreqs.length || 1);
            if (inputVol > 10) {
                ctx.beginPath();
                ctx.fillStyle = '#9d4edd';
                ctx.arc(w/2, cy, 4 + (inputVol/255)*20, 0, Math.PI*2);
                ctx.fill();
            }

            animationId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationId);
    }, [isHudVisible]);

    const handleDisconnect = () => {
        setVoiceState({ isActive: false });
    };

    return (
        <AnimatePresence>
            {isHudVisible && (
                <motion.div
                    drag
                    dragMomentum={false}
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-6 left-6 z-[9000] bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#333] rounded-full px-6 py-2 shadow-2xl flex items-center gap-4 min-w-[320px] cursor-grab active:cursor-grabbing"
                >
                    {/* Visualizer */}
                    <div className="w-32 h-8 relative bg-black/50 rounded overflow-hidden border border-[#222]">
                        <canvas ref={canvasRef} className="w-full h-full" />
                    </div>

                    {/* Status Text */}
                    <div className="flex flex-col pointer-events-none select-none">
                        <span className="text-[10px] font-mono text-[#22d3ee] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Radio className="w-3 h-3 animate-pulse" />
                            Voice Core Active
                        </span>
                        <span className="text-[8px] font-mono text-gray-500 uppercase">
                            Monitoring: {getSnapshot().sector}
                        </span>
                    </div>

                    {/* Controls */}
                    <div className="h-6 w-px bg-[#333]"></div>
                    <button 
                        onClick={handleDisconnect}
                        className="p-1.5 rounded-full hover:bg-red-900/30 text-gray-500 hover:text-red-500 transition-colors"
                        title="Disconnect Voice"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
                    >
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VoiceManager;
