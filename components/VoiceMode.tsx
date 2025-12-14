
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { liveSession, promptSelectKey } from '../services/geminiService';
import { Mic, Activity, Power, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { neuralVault } from '../services/persistenceService';

const VoiceMode: React.FC = () => {
  const { voice, setVoiceState, system } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- SOVEREIGN DUAL-RING VISUALIZER ---
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let phase = 0;
    
    // Physics State
    let rotationA = 0;
    let rotationB = 0;

    const render = () => {
        if (!canvas || !ctx) return;
        
        // Setup Canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        // Physics Updates
        phase += 0.05;
        if (voice.isConnecting) {
             rotationA += 0.1;
             rotationB -= 0.1;
        } else {
             rotationA += 0.005;
             rotationB -= 0.002;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- LAYER 1: USER VOICE (Inner Ring / Cyan) ---
        const userFreqs = liveSession.getInputFrequencies();
        const innerRadius = 80;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotationA);

        if (voice.isActive && userFreqs) {
            const bars = 64;
            const step = Math.floor(userFreqs.length / bars);
            
            ctx.beginPath();
            for (let i = 0; i < bars; i++) {
                const val = userFreqs[i * step] || 0;
                const norm = val / 255;
                const height = norm * 40;
                
                const angle = (Math.PI * 2 * i) / bars;
                const x1 = Math.cos(angle) * innerRadius;
                const y1 = Math.sin(angle) * innerRadius;
                const x2 = Math.cos(angle) * (innerRadius + height);
                const y2 = Math.sin(angle) * (innerRadius + height);

                // Cyan Electric aesthetic
                ctx.strokeStyle = `rgba(34, 211, 238, ${0.2 + norm})`; // #22d3ee
                ctx.lineWidth = 2;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();

            // Core Glow based on input
            ctx.fillStyle = `rgba(34, 211, 238, ${Math.min(voice.volume / 100, 0.5)})`;
            ctx.beginPath();
            ctx.arc(0, 0, innerRadius - 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (voice.isConnecting) {
            // Connecting Spinner
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, innerRadius, 0, Math.PI * 1.5);
            ctx.stroke();
        } else {
            // Idle State
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // --- LAYER 2: AI VOICE (Outer Ring / Amethyst) ---
        const aiFreqs = liveSession.getOutputFrequencies();
        const outerRadius = 140;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotationB);

        if (voice.isActive && aiFreqs) {
            const bars = 128;
            const step = Math.floor(aiFreqs.length / bars);
            
            ctx.beginPath();
            for (let i = 0; i < bars; i++) {
                const val = aiFreqs[i * step] || 0;
                const norm = val / 255;
                const height = norm * 80; // Larger range for AI
                
                const angle = (Math.PI * 2 * i) / bars;
                const x1 = Math.cos(angle) * outerRadius;
                const y1 = Math.sin(angle) * outerRadius;
                const x2 = Math.cos(angle) * (outerRadius + height);
                const y2 = Math.sin(angle) * (outerRadius + height);

                // Amethyst Royal aesthetic
                ctx.strokeStyle = `rgba(157, 78, 221, ${0.3 + norm})`; // #9d4edd
                ctx.lineWidth = 2;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        } else if (voice.isConnecting) {
             // Outer Spinner
            ctx.strokeStyle = '#9d4edd';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 20]);
            ctx.beginPath();
            ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
             // Idle Outer Ring
            ctx.strokeStyle = 'rgba(157, 78, 221, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [voice.isActive, voice.isConnecting, voice.volume]);

  const toggleSession = async () => {
    if (voice.isActive) {
        // Disconnect handled by VoiceManager reacting to store state change
        setVoiceState({ isActive: false });
    } else {
        setVoiceState({ isConnecting: true, error: null });
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) await promptSelectKey();
            
            // Set both active and connecting. VoiceManager will see isActive, connect, then set isConnecting to false.
            setVoiceState({ isActive: true, isConnecting: true });
        } catch (err: any) {
            console.error(err);
            setVoiceState({ isConnecting: false, error: "Uplink Failed: " + err.message });
        }
    }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
      
      {/* 1. HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-20 pointer-events-none">
          <div className="pointer-events-auto">
              <div className="flex items-center gap-2 mb-1">
                  <Activity className={`w-3 h-3 ${voice.isActive ? 'text-[#9d4edd] animate-pulse' : 'text-gray-600'}`} />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Neural Voice Core</span>
              </div>
              <div className="text-xs font-mono text-[#22d3ee] uppercase tracking-wider">
                  {voice.isConnecting ? 'ESTABLISHING HANDSHAKE...' : voice.isActive ? 'SYSTEM ONLINE' : 'STANDBY MODE'}
              </div>
          </div>
          
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0a0a0a]/80 border border-[#333] p-1.5 rounded backdrop-blur">
               <Settings className="w-3 h-3 text-gray-500" />
               <select 
                    value={voice.voiceName}
                    onChange={(e) => setVoiceState({ voiceName: e.target.value as any })}
                    disabled={voice.isActive}
                    className="bg-transparent text-[10px] font-mono text-[#9d4edd] outline-none cursor-pointer uppercase"
                >
                    <option value="Puck">Puck</option>
                    <option value="Charon">Charon</option>
                    <option value="Kore">Kore</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Zephyr">Zephyr</option>
                </select>
          </div>
      </div>

      {/* 2. Visualizer Stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
         <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
         
         <AnimatePresence mode="wait">
            {!voice.isActive && !voice.isConnecting && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative z-20 text-center pointer-events-none mix-blend-screen"
                >
                    <h2 className="text-4xl font-light text-[#222] font-mono tracking-[0.5em] uppercase mb-4">Void State</h2>
                    <p className="text-[10px] text-[#9d4edd]/40 font-mono uppercase tracking-widest">Initialize Uplink Protocol</p>
                </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 3. Transcription Log */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center z-20 pointer-events-none px-8">
          <div className="max-w-2xl w-full text-center space-y-3">
            <AnimatePresence>
                {voice.transcripts.slice(-2).map((t, i) => (
                    <motion.div 
                        key={`${i}-${t.role}-${t.text.length}`}
                        initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0 }}
                        className={`text-sm font-mono leading-relaxed ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}
                    >
                        <span className="text-[9px] opacity-50 mr-2 uppercase tracking-wide border px-1 rounded border-current">
                            {t.role === 'user' ? 'OP' : 'AI'}
                        </span>
                        {t.text}
                    </motion.div>
                ))}
            </AnimatePresence>
          </div>
      </div>

      {/* 4. Power Control */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30">
        <button
            onClick={toggleSession}
            disabled={voice.isConnecting}
            className={`relative flex items-center justify-center transition-all duration-700 ease-out group ${voice.isActive ? 'w-20 h-20' : 'w-24 h-24'}`}
        >
            <div className={`absolute inset-0 rounded-full border border-current opacity-30 transition-all duration-700
                ${voice.isActive ? 'border-red-500 scale-100 rotate-180' : 'border-[#9d4edd] scale-90 group-hover:scale-110'}
            `}></div>
            
            <div className={`absolute inset-0 rounded-full bg-current opacity-10 blur-2xl transition-all duration-700
                 ${voice.isActive ? 'bg-red-500' : 'bg-[#9d4edd] group-hover:opacity-30'}
            `}></div>

            {voice.isConnecting ? (
                <Activity className="w-8 h-8 text-[#9d4edd] animate-spin" />
            ) : voice.isActive ? (
                <Power className="w-8 h-8 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)]" />
            ) : (
                <Mic className="w-8 h-8 text-[#9d4edd] drop-shadow-[0_0_15px_rgba(157,78,221,0.8)]" />
            )}
        </button>
      </div>

      {/* Error Toast */}
      {voice.error && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-900/10 border border-red-500/50 backdrop-blur text-red-400 px-6 py-3 rounded text-xs font-mono shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-top-4">
              <Zap className="w-3 h-3" />
              {voice.error}
          </div>
      )}
    </div>
  );
};

export default VoiceMode;
