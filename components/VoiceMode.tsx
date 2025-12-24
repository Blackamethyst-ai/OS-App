import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../services/geminiService';
import { 
    Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, 
    Sliders, X, RotateCcw, Send, Volume2, VolumeX, Terminal, 
    ShieldAlert, Navigation, ChevronDown, ChevronUp, Cpu, Radio,
    Waves, Target, BrainCircuit, Globe, Fingerprint, Shield,
    CheckCircle, Binary, History, Layers, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

const NeuralReasoningCanvas: React.FC<{ isThinking: boolean; userActive: boolean; agentActive: boolean }> = ({ isThinking, userActive, agentActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const render = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // Spawn logic
            if (isThinking || userActive || agentActive) {
                const count = isThinking ? 5 : 2;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 100 + Math.random() * 50;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: 1.0,
                        color: userActive ? '#22d3ee' : agentActive ? '#9d4edd' : '#fff'
                    });
                }
            }

            // Update & Draw
            particles.current.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.01;

                if (p.life <= 0) {
                    particles.current.splice(idx, 1);
                    return;
                }

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Connect to center if life is high
                if (p.life > 0.6) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.2;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(cx, cy);
                    ctx.stroke();
                }
            });

            ctx.globalAlpha = 1;
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [isThinking, userActive, agentActive]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

const CognitiveLattice: React.FC<{ 
    image: string | null; 
    freqs: Uint8Array | null; 
    color: string; 
    isAgent: boolean; 
    isThinking?: boolean;
    mentalState?: { skepticism: number; excitement: number; alignment: number };
}> = ({ image, freqs, color, isAgent, isThinking, mentalState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        let frameId: number;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const render = () => {
            if (!canvas || !ctx) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let volume = 0;
            if (freqs && freqs.length > 0) {
                volume = freqs.reduce((a, b) => a + b, 0) / freqs.length;
            }
            const normalizedVol = volume / 255;
            const time = Date.now() / 1000;

            // 1. Procedural Neural Threads (Background)
            if (isAgent) {
                const threadCount = 12;
                const baseRadius = 90;
                ctx.lineWidth = 0.5;
                for (let i = 0; i < threadCount; i++) {
                    const angle = (i / threadCount) * Math.PI * 2 + time * 0.2;
                    const r = baseRadius + Math.sin(time * 2 + i) * 15 * normalizedVol;
                    const tx = cx + Math.cos(angle) * r;
                    const ty = cy + Math.sin(angle) * r;

                    ctx.beginPath();
                    ctx.strokeStyle = `${color}${Math.floor((0.1 + normalizedVol) * 255).toString(16).padStart(2, '0')}`;
                    ctx.moveTo(cx, cy);
                    ctx.quadraticCurveTo(
                        cx + Math.cos(angle + 0.5) * (r * 0.5),
                        cy + Math.sin(angle + 0.5) * (r * 0.5),
                        tx, ty
                    );
                    ctx.stroke();
                }
            }

            // 2. Mental State Geometry Overlay
            if (isAgent && mentalState) {
                const s = mentalState.skepticism / 100;
                const e = mentalState.excitement / 100;
                const a = mentalState.alignment / 100;

                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = `${color}44`;
                ctx.beginPath();
                ctx.arc(cx, cy, 110 + s * 20, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Pulsing Resonance Ring
                ctx.beginPath();
                ctx.lineWidth = 2 + e * 4;
                ctx.strokeStyle = color;
                ctx.arc(cx, cy, 85 + normalizedVol * 40 * a, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 3. Central Core Glow
            const corePulse = 80 + Math.sin(time * 4) * 5 + normalizedVol * 30;
            const gradient = ctx.createRadialGradient(cx, cy, 40, cx, cy, corePulse);
            gradient.addColorStop(0, `${color}22`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, corePulse, 0, Math.PI * 2);
            ctx.fill();

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color, isAgent, isThinking, mentalState]);

    return (
        <div className="relative w-72 h-72 flex items-center justify-center group/node">
            <canvas ref={canvasRef} className="absolute inset-[-100px] w-[calc(100%+200px)] h-[calc(100%+200px)] pointer-events-none z-0 opacity-60 group-hover/node:opacity-100 transition-opacity" />
            <motion.div 
                animate={isThinking ? { scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`relative z-10 w-44 h-44 rounded-full border-2 border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_80px_rgba(0,0,0,1)] transition-all duration-700 ${isThinking ? 'border-[#9d4edd]/50 scale-105' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[20%] contrast-125 group-hover/node:grayscale-0 transition-all duration-700" alt="Node Identity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {isAgent ? <BrainCircuit size={64} className="text-gray-800" /> : <User size={64} className="text-gray-800" />}
                    </div>
                )}
                
                {isThinking && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] flex flex-col items-center justify-center">
                         <div className="relative">
                            <Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-2" />
                            <div className="absolute inset-0 blur-md bg-[#9d4edd]/20 animate-pulse" />
                         </div>
                         <span className="text-[8px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.4em]">Reasoning</span>
                    </div>
                )}
                {/* Dynamic Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-20 bg-[length:100%_4px] opacity-40" />
            </motion.div>
        </div>
    );
};

const HighFidelityCaptions = ({ transcript }: { transcript: { role: string, text: string } | null }) => {
    if (!transcript) return null;
    const isUser = (transcript.role || '').toLowerCase() === 'user';
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50 pointer-events-none"
        >
            <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_50px_120px_rgba(0,0,0,1)] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <div className="flex items-center gap-4 mb-4">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isUser ? 'bg-[#22d3ee] shadow-[0_0_10px_#22d3ee]' : 'bg-[#9d4edd] shadow-[0_0_10px_#9d4edd]'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${isUser ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                        {isUser ? 'Neural_Input_Feed' : 'Model_Synthesis_Transmission'}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>
                <p className="text-2xl font-mono text-white leading-relaxed italic font-medium selection:bg-[#9d4edd]/30 tracking-tight drop-shadow-lg">
                    "{transcript.text || '...'}"
                </p>
            </div>
        </motion.div>
    );
};

const VoiceMode: React.FC = () => {
  const { voice, setVoiceState, user, addLog } = useAppStore();
  const [showTuning, setShowTuning] = useState(false);
  const [showDialogueStream, setShowDialogueStream] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
  const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  const currentAgent = useMemo(() => (HIVE_AGENTS as any)[voice.voiceName] || HIVE_AGENTS['Puck'], [voice.voiceName]);
  const agentAvatar = voice.agentAvatars[voice.voiceName] || null;

  useEffect(() => {
      if (!agentAvatar && !isGeneratingAvatar) {
          const fetchAvatar = async () => {
              setIsGeneratingAvatar(true);
              try {
                  const hasKey = await window.aistudio?.hasSelectedApiKey();
                  if (hasKey) {
                      const agentId = currentAgent.id || 'Puck';
                      const agentName = currentAgent.name || 'Puck';
                      const url = await generateAvatar(agentId.toUpperCase(), agentName);
                      setVoiceState(prev => ({ 
                          agentAvatars: { ...prev.agentAvatars, [voice.voiceName]: url } 
                      }));
                  }
              } catch (e) {
                  console.warn("Avatar gen failed", e);
              } finally {
                  setIsGeneratingAvatar(false);
              }
          };
          fetchAvatar();
      }
  }, [voice.voiceName, agentAvatar, currentAgent, setVoiceState, isGeneratingAvatar]);

  useEffect(() => {
      let rafId: number;
      const loop = () => {
          if (voice.isActive) {
              setUserFreqs(liveSession.getInputFrequencies());
              setAgentFreqs(liveSession.getOutputFrequencies());
          } else {
              setUserFreqs(null);
              setAgentFreqs(null);
          }
          rafId = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(rafId);
  }, [voice.isActive]);

  useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [voice.transcripts, voice.partialTranscript, showDialogueStream]);

  const toggleSession = async () => {
    if (voice.isActive || voice.isConnecting) {
        liveSession.disconnect();
        setVoiceState({ isActive: false, isConnecting: false });
        addLog('SYSTEM', 'VOICE_CORE: Uplink Severed.');
        audio.playError();
    } else {
        await liveSession.primeAudio();
        setVoiceState({ isConnecting: true });
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { 
                await promptSelectKey(); 
                setVoiceState({ isConnecting: false });
                return; 
            }
            setVoiceState({ isActive: true, isConnecting: false });
            addLog('SUCCESS', 'VOICE_CORE: Synaptic Handshake Confirmed.');
            audio.playSuccess();
        } catch (err: any) {
            setVoiceState({ isConnecting: false, error: err.message });
        }
    }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-[3rem] shadow-[0_0_150px_rgba(0,0,0,1)] group/voicestudio">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/20 to-transparent" />
      <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 50)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 50)} />

      {/* Primary Header */}
      <div className="h-20 flex justify-between items-center px-12 bg-[#080808]/90 backdrop-blur-3xl border-b border-white/5 z-30 shrink-0 relative">
          <div className="flex items-center gap-6">
              <div className="p-3 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                <Radio size={20} className={voice.isActive ? 'text-[#22d3ee] animate-pulse' : 'text-gray-700'} />
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-black font-mono uppercase tracking-[0.6em] text-white leading-none">Voice Core Terminal</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                  </div>
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                    {voice.isConnecting ? 'ESTABLISHING_LATTICE_LINK...' : voice.isActive ? 'SECURE_UPLINK_STABLE // 16-BIT PCM' : 'ENCLAVE_STANDBY'}
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-5">
               <button 
                onClick={() => { setShowTuning(!showTuning); audio.playClick(); }} 
                className={`p-3 border rounded-2xl transition-all duration-500 group ${showTuning ? 'bg-[#9d4edd] text-black border-[#9d4edd] shadow-lg shadow-[#9d4edd]/20' : 'bg-[#111] border border-[#333] text-gray-500 hover:text-white shadow-xl'}`}
               >
                   <Sliders size={18} className="group-active:scale-90 transition-transform" />
               </button>
               <div className="h-8 w-px bg-white/5" />
               <div className="flex items-center gap-4 bg-[#111] border border-[#333] px-5 py-2.5 rounded-2xl shadow-inner group/select">
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Persona</span>
                   <select 
                    value={voice.voiceName} 
                    onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                    disabled={voice.isActive} 
                    className="bg-transparent text-[11px] font-black font-mono text-[#9d4edd] outline-none uppercase cursor-pointer pr-4 hover:text-white transition-colors"
                   >
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-32 p-12 relative overflow-hidden perspective-2000">
         
         <AnimatePresence>
             {showTuning && (
                 <motion.div 
                    initial={{ opacity: 0, x: -100, rotateY: 30, filter: 'blur(15px)' }} 
                    animate={{ opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, x: -100, rotateY: 30, filter: 'blur(15px)' }} 
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute left-14 w-80 bg-[#0a0a0a]/98 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] z-[60] space-y-10 shadow-[0_50px_100px_rgba(0,0,0,1)]"
                 >
                    <div className="flex justify-between items-start border-b border-white/5 pb-6">
                        <div className="flex flex-col">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Cognitive Overlay</h3>
                            <span className="text-[8px] font-mono text-gray-600 uppercase mt-1">Manual DNA Override</span>
                        </div>
                        <button onClick={() => setShowTuning(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={16} className="text-gray-600" /></button>
                    </div>
                    
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">{key}</span>
                                <span className={`text-xs font-black font-mono ${key === 'skepticism' ? 'text-red-500' : key === 'excitement' ? 'text-orange-500' : 'text-cyan-400'}`}>{(voice.mentalState as any)[key]}%</span>
                            </div>
                            <div className="relative h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    className="h-full rounded-full"
                                    animate={{ width: `${(voice.mentalState as any)[key]}%` }}
                                    style={{ backgroundColor: key === 'skepticism' ? '#ef4444' : key === 'excitement' ? '#f59e0b' : '#22d3ee' }}
                                />
                                <input 
                                    type="range" min="0" max="100" 
                                    value={(voice.mentalState as any)[key]} 
                                    onChange={e => setVoiceState({ mentalState: { ...voice.mentalState, [key]: parseInt(e.target.value) } })} 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                />
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => { setVoiceState({ mentalState: { skepticism: 50, excitement: 50, alignment: 50 } }); audio.playClick(); }} 
                        className="w-full py-5 bg-[#111] border border-[#333] rounded-[1.5rem] text-[10px] font-black uppercase text-gray-500 hover:text-white hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl"
                    >
                        <RotateCcw size={14} /> Restore Baseline DNA
                    </button>
                 </motion.div>
             )}
         </AnimatePresence>

         <HighFidelityCaptions transcript={voice.partialTranscript} />

         {/* Operator Node */}
         <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-10 group"
         >
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 mb-2 opacity-40 group-hover:opacity-100 transition-opacity">
                <Target size={14} className="text-[#22d3ee]" />
                <span className="text-[11px] font-black text-[#22d3ee] uppercase tracking-[0.4em]">Operator_Enclave</span>
            </div>
            <div className="relative group/operator-node">
                <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black border border-white/10 rounded-full text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap shadow-2xl opacity-0 group-hover/operator-node:opacity-100 transition-opacity duration-500">Node_ID: ARCHITECT_01</div>
            </div>
         </motion.div>

         {/* Central Control Hub */}
         <div className="flex flex-col items-center gap-12 relative">
            <div className={`absolute -inset-16 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#9d4edd]/30 animate-[spin_40s_linear_infinite]' : 'border-white/5 opacity-0'}`} />
            <div className={`absolute -inset-10 border border-white/5 rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`} />
            
            <button 
                onClick={toggleSession} 
                disabled={voice.isConnecting}
                className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-1000 relative z-10 
                    ${voice.isActive 
                        ? 'bg-red-500 shadow-[0_0_100px_rgba(239,68,68,0.5)] scale-110 rotate-90' 
                        : 'bg-[#9d4edd] shadow-[0_0_50px_rgba(157,78,221,0.4)] hover:scale-105 active:scale-95'
                    }
                    ${voice.isConnecting ? 'animate-pulse opacity-50' : ''}
                `}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
                {voice.isConnecting ? <Loader2 className="animate-spin text-black w-12 h-12" /> : voice.isActive ? <Power className="text-black w-12 h-12" /> : <Mic className="text-black w-12 h-12" />}
            </button>
            
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-black font-mono text-white uppercase tracking-[0.6em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {voice.isConnecting ? 'SYNCING_VECTORS' : voice.isActive ? 'SEVER_UPLINK' : 'ENGAGE_NEURAL_LINK'}
                </span>
                <div className="flex items-center gap-2">
                    <Zap size={10} className="text-[#9d4edd] animate-pulse" />
                    <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Cognitive_Handshake_v8.1</div>
                </div>
            </div>
         </div>

         {/* Agent Node */}
         <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-10 group"
         >
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 mb-2 opacity-40 group-hover:opacity-100 transition-opacity">
                <BrainCircuit size={14} className="text-[#9d4edd]" />
                <span className="text-[11px] font-black text-[#9d4edd] uppercase tracking-[0.4em]">{voice.voiceName}_Synthetic_Mind</span>
            </div>
            <div className="relative group/agent-node">
                <CognitiveLattice 
                    image={agentAvatar} 
                    freqs={agentFreqs} 
                    color="#9d4edd" 
                    isAgent={true} 
                    isThinking={isGeneratingAvatar || (voice.isActive && !!voice.partialTranscript)}
                    mentalState={voice.mentalState}
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black border border-white/10 rounded-full text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap shadow-2xl opacity-0 group-hover/agent-node:opacity-100 transition-opacity duration-500">Node_ID: SWARM_CENTRAL</div>
            </div>
         </motion.div>
      </div>

      <AnimatePresence>
        {showDialogueStream && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 350, opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-[#050505]/98 backdrop-blur-3xl p-10 relative flex flex-col overflow-hidden shadow-inner"
          >
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-xl">
                        <Terminal size={18} className="text-[#9d4edd]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Synaptic Handshake Log</span>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Temporal alignment: ACTIVE // CACHE: {voice.transcripts.length} packets</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-10 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2 text-[#10b981] font-bold"><CheckCircle size={14} /> Grounded_L0</div>
                    <div className="flex items-center gap-2 text-[#22d3ee] font-bold"><Navigation size={14} /> GPS_Sync</div>
                    <div className="h-6 w-px bg-white/10" />
                    <button onClick={() => { setShowDialogueStream(false); audio.playClick(); }} className="hover:text-white transition-all group flex items-center gap-3 active:scale-95">
                        <span className="group-hover:mr-2 transition-all">Collapse_Buffer</span>
                        <ChevronDown size={18}/>
                    </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[14px] leading-relaxed pr-8" ref={scrollRef}>
                  <AnimatePresence initial={false}>
                      {voice.transcripts.map((t, i) => {
                          const isUser = (t.role || '').toLowerCase() === 'user';
                          return (
                              <motion.div 
                                initial={{ opacity: 0, x: isUser ? 20 : -20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                key={i} 
                                className={`mb-8 flex gap-8 p-6 rounded-[2.5rem] border transition-all duration-700 hover:shadow-2xl hover:scale-[1.01] ${isUser ? 'bg-[#22d3ee]/5 border-[#22d3ee]/10 text-[#22d3ee] flex-row-reverse' : 'bg-[#9d4edd]/5 border-[#9d4edd]/10 text-[#9d4edd]'}`}
                              >
                                  <div className="flex flex-col items-center gap-3 shrink-0 w-16 pt-1">
                                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${isUser ? 'border-[#22d3ee]/30 bg-black shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-[#9d4edd]/30 bg-black shadow-[0_0_15px_rgba(157,78,221,0.1)]'}`}>
                                        {isUser ? <User size={22} /> : <Bot size={22} />}
                                    </div>
                                    <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">[{isUser ? 'OP_01' : 'AI_CORE'}]</span>
                                  </div>
                                  <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                                      <p className="text-gray-200 font-medium selection:bg-[#9d4edd]/40 tracking-tight leading-relaxed">{(t.text || '').toString()}</p>
                                      <div className={`mt-3 text-[9px] opacity-40 uppercase tracking-widest font-mono flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <History size={10} /> {new Date(t.timestamp || Date.now()).toLocaleTimeString()}
                                      </div>
                                  </div>
                              </motion.div>
                          );
                      })}
                  </AnimatePresence>
                  {voice.partialTranscript && (
                      <div className={`flex gap-8 p-6 italic opacity-50 transition-all ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee] flex-row-reverse' : 'text-[#9d4edd]'}`}>
                          <div className="shrink-0 w-16 text-center pt-2"><div className="w-2 h-2 rounded-full bg-current mx-auto animate-ping" /></div>
                          <span className={`text-white/80 font-mono text-sm leading-relaxed ${voice.partialTranscript.role === 'user' ? 'text-right' : 'text-left'}`}>{(voice.partialTranscript.text || '').toString()}_</span>
                      </div>
                  )}
                  {voice.transcripts.length === 0 && !voice.partialTranscript && (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 text-center select-none py-16 grayscale">
                          <Waves size={120} className="mb-10 text-gray-500 animate-pulse" />
                          <p className="text-2xl font-mono uppercase tracking-[0.8em]">Acoustic Cache Empty</p>
                          <p className="text-xs font-mono mt-4 uppercase tracking-widest">Initialize neural handshake to begin encrypted transmission</p>
                      </div>
                  )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showDialogueStream && (
          <motion.button 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { setShowDialogueStream(true); audio.playClick(); }}
            className="absolute bottom-12 right-12 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-[#9d4edd]/30 px-8 py-5 rounded-[2.5rem] text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]/50 transition-all z-40 flex items-center gap-6 shadow-[0_30px_80px_rgba(0,0,0,0.8)] group active:scale-95"
          >
              <div className="p-3 rounded-2xl bg-[#9d4edd]/10 group-hover:bg-[#9d4edd]/20 group-hover:text-[#9d4edd] transition-all">
                <History size={20}/>
              </div>
              <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Restore_Lattice_Buffer</span>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">Buffer_Integrity: NOMINAL</span>
              </div>
              <ChevronUp size={20} className="ml-4 animate-bounce text-[#9d4edd]" />
          </motion.button>
      )}

      {/* OS Tactical HUD Footer */}
      <div className="h-12 bg-[#0a0a0a] border-t border-[#1f1f1f] px-12 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
        <div className="flex gap-12 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
            <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                <ShieldCheck size={16} className="shadow-[0_0_15px_#10b981]" /> Handshake_Secure
            </div>
            <div className="flex items-center gap-4 uppercase tracking-[0.3em]">
                <Cpu size={16} className="text-[#9d4edd]" /> Kernel_Priority: EXEC
            </div>
            <div className="flex items-center gap-4 uppercase tracking-[0.3em]">
                <Globe size={16} className="text-[#22d3ee]" /> Node_Origin: SOVEREIGN_ENCLAVE
            </div>
        </div>
        <div className="flex items-center gap-10 shrink-0">
            <span className="uppercase tracking-[0.5em] opacity-40 leading-none hidden lg:block text-[9px]">Sovereign Voice Architecture v8.1 // Live Neural Bridge</span>
            <div className="h-4 w-px bg-white/10 hidden lg:block" />
            <span className="font-black text-gray-400 uppercase tracking-widest leading-none text-[10px]">OS_SYSTEM_CORE</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceMode;