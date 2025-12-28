import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../services/geminiService';
import { 
    Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, 
    Sliders, X, RotateCcw, Send, Volume2, VolumeX, Terminal, 
    ShieldAlert, Navigation, ChevronDown, ChevronUp, Cpu, Radio,
    Waves, Target, BrainCircuit, Globe, Fingerprint, Shield,
    CheckCircle, Binary, History, Layers, ShieldCheck, Database,
    Cpu as CpuIcon, Network, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

const DataBit = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col gap-0.5 px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg backdrop-blur-xl shrink-0 pointer-events-none"
    >
        <span className="text-[6px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-[8px] font-black font-mono uppercase truncate" style={{ color }}>{value}</span>
    </motion.div>
);

const NeuralReasoningCanvas: React.FC<{ isThinking: boolean; userActive: boolean; agentActive: boolean }> = ({ isThinking, userActive, agentActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; speed: number }[]>([]);

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

            if (isThinking || userActive || agentActive) {
                const count = isThinking ? 8 : 3;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 100 + Math.random() * 80;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        life: 1.0,
                        speed: Math.random() * 0.02 + 0.005,
                        color: userActive ? '#18E6FF' : agentActive ? '#7B2CFF' : '#3b82f6'
                    });
                }
            }

            particles.current.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.speed;

                if (p.life <= 0) {
                    particles.current.splice(idx, 1);
                    return;
                }

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.life * 2, 0, Math.PI * 2);
                ctx.fill();

                if (p.life > 0.4) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.4;
                    ctx.globalAlpha = p.life * 0.2;
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

            if (isAgent) {
                const threadCount = 18;
                const baseRadius = 95;
                const excitementMult = mentalState ? (mentalState.excitement / 50) : 1;
                const skepticismMult = mentalState ? (mentalState.skepticism / 50) : 1;

                ctx.lineWidth = 0.6;
                for (let i = 0; i < threadCount; i++) {
                    const angle = (i / threadCount) * Math.PI * 2 + time * (0.3 * excitementMult);
                    const r = baseRadius + Math.sin(time * (3 * excitementMult) + i) * (20 * normalizedVol * skepticismMult);
                    const tx = cx + Math.cos(angle) * r;
                    const ty = cy + Math.sin(angle) * r;

                    ctx.beginPath();
                    ctx.strokeStyle = `${color}${Math.floor((0.15 + normalizedVol) * 255).toString(16).padStart(2, '0')}`;
                    ctx.moveTo(cx, cy);
                    ctx.quadraticCurveTo(
                        cx + Math.cos(angle + 0.5) * (r * 0.6),
                        cy + Math.sin(angle + 0.5) * (r * 0.6),
                        tx, ty
                    );
                    ctx.stroke();
                }
            }

            const corePulse = 85 + Math.sin(time * 5) * 8 + normalizedVol * 45;
            const gradient = ctx.createRadialGradient(cx, cy, 45, cx, cy, corePulse);
            gradient.addColorStop(0, `${color}33`);
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
        <div className="relative w-80 h-80 flex items-center justify-center group/node">
            {/* Visual HUD Decoration */}
            <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none group-hover/node:border-white/10 transition-colors" />
            
            <canvas ref={canvasRef} className="absolute inset-[-120px] w-[calc(100%+240px)] h-[calc(100%+240px)] pointer-events-none z-0 opacity-70 group-hover/node:opacity-100 transition-opacity" />
            
            <motion.div 
                animate={isThinking ? { 
                    scale: [1, 1.08, 1],
                    boxShadow: [
                        `0 0 20px ${color}20`,
                        `0 0 60px ${color}40`,
                        `0 0 20px ${color}20`
                    ]
                } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className={`relative z-10 w-48 h-48 rounded-full border-2 border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_100px_rgba(0,0,0,1)] transition-all duration-700 ${isThinking ? 'border-[#f1c21b] scale-105' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[20%] group-hover/node:grayscale-0 transition-all duration-1000" alt="Node Identity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {isAgent ? <BrainCircuit size={72} className="text-gray-800" /> : <User size={72} className="text-gray-800" />}
                    </div>
                )}
                
                {isThinking && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] flex flex-col items-center justify-center">
                         <div className="relative">
                            <Loader2 className="w-12 h-12 text-[#f1c21b] animate-spin mb-3" />
                            <div className="absolute inset-0 blur-xl bg-[#f1c21b]/30 animate-pulse" />
                         </div>
                         <span className="text-[10px] font-black font-mono text-[#f1c21b] uppercase tracking-[0.5em] animate-pulse">Synthesis</span>
                    </div>
                )}
                
                {/* Glitch CRT Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] z-20 bg-[length:100%_2px] opacity-40" />
            </motion.div>

            {/* Floating Data Bits */}
            <div className="absolute top-0 right-0 z-30 translate-x-12 -translate-y-4">
                <DataBit label="ID" value={isAgent ? "0xAGENT_9" : "0xOPERATOR"} color={color} />
            </div>
            <div className="absolute bottom-10 left-0 z-30 -translate-x-12">
                <DataBit label="SIG" value={isThinking ? "PROCESSING" : "STABLE"} color={isThinking ? "#f1c21b" : "#10b981"} />
            </div>
            {isAgent && (
                <div className="absolute top-1/2 left-0 z-30 -translate-x-16 -translate-y-1/2 flex flex-col gap-2">
                    <DataBit label="SKP" value={`${mentalState?.skepticism}%`} color="#ef4444" />
                    <DataBit label="EXC" value={`${mentalState?.excitement}%`} color="#f59e0b" />
                    <DataBit label="ALN" value={`${mentalState?.alignment}%`} color="#22d3ee" />
                </div>
            )}
        </div>
    );
};

const HighFidelityCaptions = ({ transcript }: { transcript: { role: string, text: string } | null }) => {
    if (!transcript) return null;
    const isUser = (transcript.role || '').toLowerCase() === 'user';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }} 
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} 
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-50 pointer-events-none"
        >
            <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-[0_80px_200px_rgba(0,0,0,1)] relative overflow-hidden group brand-inner-glow">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#f1c21b]/40 to-transparent" />
                <div className="flex items-center gap-5 mb-6">
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isUser ? 'bg-[#18E6FF] shadow-[0_0_15px_#18E6FF]' : 'bg-[#7B2CFF] shadow-[0_0_15px_#7B2CFF]'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-[0.6em] ${isUser ? 'text-[#18E6FF]' : 'text-[#7B2CFF]'}`}>
                        {isUser ? 'Transmission_Incoming' : 'Sovereign_Synthesis'}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest">Node_Auth_0xV1</span>
                </div>
                <p className="text-3xl font-mono text-white leading-relaxed italic font-medium tracking-tighter selection:bg-[#7B2CFF]/40">
                    "{transcript.text || '...'}"
                </p>
                <div className="mt-8 flex justify-between items-center opacity-30">
                    <div className="flex gap-2">
                        {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm bg-gray-600" />)}
                    </div>
                    <Binary size={14} className="text-gray-600" />
                </div>
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
        addLog('SYSTEM', 'VOICE_CORE: Neural Link Severed.');
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
            setVoiceState({ isActive: true });
            addLog('SUCCESS', 'VOICE_CORE: Engaging Synaptic Handshake...');
            audio.playSuccess();
        } catch (err: any) {
            setVoiceState({ isConnecting: false, error: err.message });
        }
    }
  };

  return (
    <div className="h-full w-full bg-[#030305] flex flex-col relative overflow-hidden font-sans border-2 border-[#1f1f1f] rounded-[4rem] shadow-[0_0_200px_rgba(0,0,0,1)] group/voicestudio brand-inner-glow">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.04)_0%,transparent_80%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7B2CFF]/40 to-transparent" />
      <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 60)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 60)} />

      <div className="h-24 flex justify-between items-center px-16 bg-[#080808]/95 backdrop-blur-3xl border-b-2 border-white/5 z-30 shrink-0 relative">
          <div className="flex items-center gap-10">
              <div className="p-4 bg-[#7B2CFF]/10 border border-[#7B2CFF]/30 rounded-[1.5rem] shadow-[0_0_40px_rgba(123,44,255,0.2)]">
                <Radio size={28} className={voice.isActive ? 'text-[#7B2CFF] animate-pulse' : 'text-gray-700'} />
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-4 mb-2">
                      <h1 className="text-xl font-black font-mono uppercase tracking-[0.5em] text-white leading-none">Voice Executive Hub</h1>
                      <div className={`w-2.5 h-2.5 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]' : 'bg-gray-800'}`} />
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] leading-none">
                    {voice.isConnecting ? 'ESTABLISHING_NEURAL_UPLINK...' : voice.isActive ? '0xSYNAPTIC_LINK_STABLE' : 'LATTICE_NODE_STANDBY'}
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-8">
               <button 
                onClick={() => { setShowTuning(!showTuning); audio.playClick(); }} 
                className={`p-4 border-2 rounded-[1.5rem] transition-all duration-700 group ${showTuning ? 'bg-[#7B2CFF] text-white border-[#7B2CFF] shadow-[0_0_40px_rgba(123,44,255,0.4)]' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white shadow-2xl'}`}
               >
                   <Sliders size={22} />
               </button>
               <div className="h-10 w-px bg-white/10" />
               <div className="flex items-center gap-6 bg-[#111] border-2 border-[#333] px-8 py-3 rounded-[2rem] shadow-inner group/select relative overflow-hidden">
                   <span className="text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] relative z-10">Architect Node</span>
                   <select 
                    value={voice.voiceName} 
                    onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                    disabled={voice.isActive} 
                    className="bg-transparent text-[13px] font-black font-mono text-[#7B2CFF] outline-none uppercase cursor-pointer pr-6 hover:text-white transition-colors relative z-10"
                   >
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-48 p-16 relative overflow-hidden perspective-2000">
         <AnimatePresence>
             {showTuning && (
                 <motion.div 
                    initial={{ opacity: 0, x: -120, rotateY: 40, filter: 'blur(20px)' }} 
                    animate={{ opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, x: -120, rotateY: 40, filter: 'blur(20px)' }} 
                    className="absolute left-20 w-[420px] bg-[#0a0a0a]/98 backdrop-blur-3xl border-2 border-white/10 p-12 rounded-[3.5rem] z-[60] space-y-12 shadow-[0_100px_250px_rgba(0,0,0,1)] brand-inner-glow"
                 >
                    <div className="flex justify-between items-start border-b border-white/10 pb-8">
                        <div className="flex flex-col">
                            <h3 className="text-base font-black text-white uppercase tracking-[0.4em]">DNA Calibration</h3>
                            <span className="text-[10px] font-mono text-gray-600 uppercase mt-2 tracking-widest">Biometric Bias Override</span>
                        </div>
                        <button onClick={() => setShowTuning(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-600 hover:text-white border border-transparent hover:border-white/10"><X size={24} /></button>
                    </div>
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-3">
                                    <Target size={14} className={key === 'skepticism' ? 'text-red-500' : key === 'excitement' ? 'text-orange-500' : 'text-cyan-400'} />
                                    <span className="text-[11px] font-black font-mono text-gray-400 uppercase tracking-widest">{key} Protocol</span>
                                </div>
                                <span className={`text-base font-black font-mono ${key === 'skepticism' ? 'text-red-500' : key === 'excitement' ? 'text-[#f59e0b]' : 'text-cyan-400'}`}>{(voice.mentalState as any)[key]}%</span>
                            </div>
                            <div className="relative h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-white/10 shadow-inner p-0.5">
                                <motion.div 
                                    className="h-full rounded-full"
                                    animate={{ width: `${(voice.mentalState as any)[key]}%` }}
                                    style={{ backgroundColor: key === 'skepticism' ? '#ef4444' : key === 'excitement' ? '#f59e0b' : '#18E6FF', boxShadow: `0 0 15px currentColor` }}
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
                    <div className="pt-4 flex items-center justify-between">
                         <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest">System_Auth: Admin_L0</span>
                         <Fingerprint size={20} className="text-gray-800" />
                    </div>
                 </motion.div>
             )}
         </AnimatePresence>

         <HighFidelityCaptions transcript={voice.partialTranscript} />

         <motion.div 
            initial={{ opacity: 0, x: -80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="flex flex-col items-center gap-14 group"
         >
            <div className="flex items-center gap-4 px-8 py-3 rounded-full bg-white/5 border border-white/5 mb-2 opacity-40 group-hover:opacity-100 transition-all duration-700 shadow-2xl">
                <Target size={18} className="text-[#18E6FF]" />
                <span className="text-[13px] font-black text-[#18E6FF] uppercase tracking-[0.6em]">Operator_Enclave</span>
            </div>
            <div className="relative">
                <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#18E6FF" isAgent={false} />
            </div>
         </motion.div>

         <div className="flex flex-col items-center gap-16 relative">
            <div className={`absolute -inset-24 border-2 border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#7B2CFF]/40 animate-[spin_60s_linear_infinite]' : 'border-white/5 opacity-0'}`} />
            <div className={`absolute -inset-16 border-2 border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#18E6FF]/20 animate-[spin_40s_linear_infinite_reverse]' : 'border-white/5 opacity-0'}`} />
            
            <button 
                onClick={toggleSession} 
                disabled={voice.isConnecting}
                className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 relative z-10 border-4
                    ${voice.isActive 
                        ? 'bg-red-500/20 border-red-500 shadow-[0_0_150px_rgba(239,68,68,0.4)] scale-110 rotate-90' 
                        : 'bg-[#7B2CFF]/10 border-[#7B2CFF] shadow-[0_0_80px_rgba(123,44,255,0.4)] hover:scale-105 active:scale-95'
                    }
                    ${voice.isConnecting ? 'animate-pulse opacity-50' : ''}
                `}
            >
                <div className="absolute inset-2 border-2 border-white/10 rounded-full" />
                {voice.isConnecting ? <Loader2 className="animate-spin text-white w-16 h-16" /> : voice.isActive ? <Power className="text-white w-16 h-16 drop-shadow-[0_0_20px_white]" /> : <Mic className="text-white w-16 h-16 drop-shadow-[0_0_20px_rgba(123,44,255,0.6)]" />}
            </button>
            <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-[13px] font-black font-mono text-white uppercase tracking-[0.8em] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    {voice.isConnecting ? 'SYNCING_VECTORS' : voice.isActive ? 'SEVER_UPLINK' : 'ENGAGE_NEURAL_LINK'}
                </span>
                {voice.isActive && (
                    <div className="flex items-center gap-3 px-6 py-2 bg-black/40 rounded-full border border-white/5 shadow-2xl">
                        <Zap size={14} className="text-[#f1c21b] animate-pulse" />
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.5em]">Lattice_Node: ACTIVE</div>
                    </div>
                )}
            </div>
         </div>

         <motion.div 
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="flex flex-col items-center gap-14 group"
         >
            <div className="flex items-center gap-4 px-8 py-3 rounded-full bg-white/5 border border-white/5 mb-2 opacity-40 group-hover:opacity-100 transition-all duration-700 shadow-2xl">
                <BrainCircuit size={18} className="text-[#7B2CFF]" />
                <span className="text-[13px] font-black text-[#7B2CFF] uppercase tracking-[0.6em]">{voice.voiceName}_Synthetic_Mind</span>
            </div>
            <div className="relative">
                <CognitiveLattice 
                    image={agentAvatar} 
                    freqs={agentFreqs} 
                    color="#7B2CFF" 
                    isAgent={true} 
                    isThinking={isGeneratingAvatar || (voice.isActive && !!voice.partialTranscript)}
                    mentalState={voice.mentalState}
                />
            </div>
         </motion.div>
      </div>

      <AnimatePresence>
        {showDialogueStream && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 420, opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="border-t-2 border-white/5 bg-[#050505]/98 backdrop-blur-3xl p-14 relative flex flex-col overflow-hidden shadow-inner"
          >
              <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8 shrink-0">
                <div className="flex items-center gap-8">
                    <div className="p-3 bg-[#7B2CFF]/10 border border-[#7B2CFF]/30 rounded-2xl shadow-[0_0_30px_rgba(123,44,255,0.15)]">
                        <Terminal size={24} className="text-[#7B2CFF]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black uppercase tracking-[0.6em] text-white">Handshake_Transcript</span>
                        <span className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.4em] mt-2 block">Buffer_Stream // {voice.transcripts.length} packets cached</span>
                    </div>
                </div>
                <button onClick={() => setShowDialogueStream(false)} className="text-gray-500 hover:text-white transition-all group flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 hover:border-white/20 active:scale-95 shadow-2xl">
                    <span className="text-[11px] font-black uppercase tracking-[0.4em]">Collapse_History</span>
                    <ChevronDown size={22} className="group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[16px] leading-relaxed pr-10" ref={scrollRef}>
                  {voice.transcripts.map((t, i) => {
                      const isUser = (t.role || '').toLowerCase() === 'user';
                      return (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            key={i} 
                            className={`mb-10 flex gap-10 p-10 rounded-[3.5rem] border-2 shadow-2xl ${isUser ? 'bg-[#18E6FF]/5 border-[#18E6FF]/10 text-[#18E6FF] flex-row-reverse' : 'bg-[#7B2CFF]/5 border-[#7B2CFF]/10 text-[#7B2CFF]'}`}
                          >
                              <div className="shrink-0 flex flex-col items-center gap-3 opacity-30 mt-1">
                                    {isUser ? <User size={24} /> : <Bot size={24} />}
                                    <div className="w-0.5 h-full bg-current rounded-full" />
                              </div>
                              <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                                  <p className="text-gray-100 font-medium tracking-tight leading-relaxed italic drop-shadow-lg text-lg">{(t.text || '').toString()}</p>
                                  <div className={`mt-4 flex items-center gap-3 text-[10px] font-mono text-gray-700 uppercase tracking-widest ${isUser ? 'flex-row-reverse' : ''}`}>
                                       <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                                       <div className="w-1 h-1 rounded-full bg-gray-800" />
                                       <span>Node_0x{i.toString(16).toUpperCase()}</span>
                                  </div>
                              </div>
                          </motion.div>
                      );
                  })}
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceMode;
