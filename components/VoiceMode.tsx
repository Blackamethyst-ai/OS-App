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
        className="flex flex-col gap-0.5 px-2.5 py-1 bg-black/40 border border-white/5 rounded-lg backdrop-blur-xl shrink-0 pointer-events-none"
    >
        <span className="text-[6px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-[7.5px] font-black font-mono uppercase truncate" style={{ color }}>{value}</span>
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
                const count = isThinking ? 6 : 2;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 80 + Math.random() * 60;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 2.5,
                        vy: (Math.random() - 0.5) * 2.5,
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
                ctx.arc(p.x, p.y, p.life * 1.5, 0, Math.PI * 2);
                ctx.fill();

                if (p.life > 0.5) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.3;
                    ctx.globalAlpha = p.life * 0.15;
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
                const threadCount = 14;
                const baseRadius = 75;
                const excitementMult = mentalState ? (mentalState.excitement / 50) : 1;
                const skepticismMult = mentalState ? (mentalState.skepticism / 50) : 1;

                ctx.lineWidth = 0.5;
                for (let i = 0; i < threadCount; i++) {
                    const angle = (i / threadCount) * Math.PI * 2 + time * (0.25 * excitementMult);
                    const r = baseRadius + Math.sin(time * (2.5 * excitementMult) + i) * (15 * normalizedVol * skepticismMult);
                    const tx = cx + Math.cos(angle) * r;
                    const ty = cy + Math.sin(angle) * r;

                    ctx.beginPath();
                    ctx.strokeStyle = `${color}${Math.floor((0.15 + normalizedVol) * 255).toString(16).padStart(2, '0')}`;
                    ctx.moveTo(cx, cy);
                    ctx.quadraticCurveTo(
                        cx + Math.cos(angle + 0.4) * (r * 0.5),
                        cy + Math.sin(angle + 0.4) * (r * 0.5),
                        tx, ty
                    );
                    ctx.stroke();
                }
            }

            const corePulse = 70 + Math.sin(time * 4) * 6 + normalizedVol * 35;
            const gradient = ctx.createRadialGradient(cx, cy, 35, cx, cy, corePulse);
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
        <div className="relative w-64 h-64 flex items-center justify-center group/node">
            {/* Visual HUD Decoration */}
            <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none group-hover/node:border-white/10 transition-colors" />
            
            <canvas ref={canvasRef} className="absolute inset-[-80px] w-[calc(100%+160px)] h-[calc(100%+160px)] pointer-events-none z-0 opacity-60 group-hover/node:opacity-90 transition-opacity" />
            
            <motion.div 
                animate={isThinking ? { 
                    scale: [1, 1.05, 1],
                    boxShadow: [
                        `0 0 15px ${color}15`,
                        `0 0 45px ${color}30`,
                        `0 0 15px ${color}15`
                    ]
                } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className={`relative z-10 w-36 h-36 rounded-full border border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_80px_rgba(0,0,0,1)] transition-all duration-700 ${isThinking ? 'border-[#f1c21b] scale-105' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[15%] group-hover/node:grayscale-0 transition-all duration-1000" alt="Node Identity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {isAgent ? <BrainCircuit size={48} className="text-gray-800" /> : <User size={48} className="text-gray-800" />}
                    </div>
                )}
                
                {isThinking && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] flex flex-col items-center justify-center">
                         <div className="relative">
                            <Loader2 className="w-8 h-8 text-[#f1c21b] animate-spin mb-2" />
                            <div className="absolute inset-0 blur-lg bg-[#f1c21b]/20 animate-pulse" />
                         </div>
                         <span className="text-[8px] font-black font-mono text-[#f1c21b] uppercase tracking-[0.4em] animate-pulse">Synthesis</span>
                    </div>
                )}
                
                {/* Glitch CRT Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-20 bg-[length:100%_2px] opacity-30" />
            </motion.div>

            {/* Floating Data Bits */}
            <div className="absolute top-4 right-4 z-30 translate-x-8 -translate-y-4">
                <DataBit label="ID" value={isAgent ? "0xAGENT_9" : "0xOPERATOR"} color={color} />
            </div>
            <div className="absolute bottom-10 left-4 z-30 -translate-x-8">
                <DataBit label="SIG" value={isThinking ? "PROCESSING" : "STABLE"} color={isThinking ? "#f1c21b" : "#10b981"} />
            </div>
            {isAgent && (
                <div className="absolute top-1/2 left-0 z-30 -translate-x-12 -translate-y-1/2 flex flex-col gap-1.5">
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
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} 
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} 
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-10 z-50 pointer-events-none"
        >
            <div className="bg-[#050505]/95 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_60px_150px_rgba(0,0,0,0.9)] relative overflow-hidden group brand-inner-glow">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f1c21b]/30 to-transparent" />
                <div className="flex items-center gap-4 mb-4">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isUser ? 'bg-[#18E6FF] shadow-[0_0_10px_#18E6FF]' : 'bg-[#7B2CFF] shadow-[0_0_10px_#7B2CFF]'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-[0.5em] ${isUser ? 'text-[#18E6FF]' : 'text-[#7B2CFF]'}`}>
                        {isUser ? 'Transmission_Incoming' : 'Sovereign_Synthesis'}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Node_Auth_0xV1</span>
                </div>
                <p className="text-xl font-mono text-white leading-relaxed italic font-medium tracking-tight selection:bg-[#7B2CFF]/30">
                    "{transcript.text || '...'}"
                </p>
                <div className="mt-6 flex justify-between items-center opacity-20">
                    <div className="flex gap-1.5">
                        {[1,2,3,4].map(i => <div key={i} className="w-1 h-1 rounded-sm bg-gray-600" />)}
                    </div>
                    <Binary size={12} className="text-gray-600" />
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
    <div className="h-full w-full bg-[#030305] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-[3rem] shadow-[0_0_200px_rgba(0,0,0,1)] group/voicestudio brand-inner-glow">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.03)_0%,transparent_80%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7B2CFF]/30 to-transparent" />
      <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 60)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 60)} />

      <div className="h-20 flex justify-between items-center px-10 bg-[#080808]/95 backdrop-blur-2xl border-b border-white/5 z-30 shrink-0 relative">
          <div className="flex items-center gap-6">
              <div className="p-3 bg-[#7B2CFF]/10 border border-[#7B2CFF]/30 rounded-xl shadow-[0_0_30px_rgba(123,44,255,0.15)]">
                <Radio size={22} className={voice.isActive ? 'text-[#7B2CFF] animate-pulse' : 'text-gray-700'} />
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-base font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Voice Executive Hub</h1>
                      <div className={`w-2 h-2 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-gray-800'}`} />
                  </div>
                  <div className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.4em] leading-none">
                    {voice.isConnecting ? 'ESTABLISHING_NEURAL_UPLINK...' : voice.isActive ? '0xSYNAPTIC_LINK_STABLE' : 'LATTICE_NODE_STANDBY'}
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-6">
               <button 
                onClick={() => { setShowTuning(!showTuning); audio.playClick(); }} 
                className={`p-3 border rounded-xl transition-all duration-700 group ${showTuning ? 'bg-[#7B2CFF] text-white border-[#7B2CFF] shadow-[0_0_30px_rgba(123,44,255,0.3)]' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white shadow-2xl'}`}
               >
                   <Sliders size={18} />
               </button>
               <div className="h-8 w-px bg-white/10" />
               <div className="flex items-center gap-4 bg-[#111] border border-[#333] px-5 py-2 rounded-xl shadow-inner group/select relative overflow-hidden">
                   <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] relative z-10">Architect Node</span>
                   <select 
                    value={voice.voiceName} 
                    onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                    disabled={voice.isActive} 
                    className="bg-transparent text-xs font-black font-mono text-[#7B2CFF] outline-none uppercase cursor-pointer pr-4 hover:text-white transition-colors relative z-10"
                   >
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-32 p-10 relative overflow-hidden perspective-2000">
         <AnimatePresence>
             {showTuning && (
                 <motion.div 
                    initial={{ opacity: 0, x: -100, rotateY: 30, filter: 'blur(20px)' }} 
                    animate={{ opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, x: -100, rotateY: 30, filter: 'blur(20px)' }} 
                    className="absolute left-16 w-[360px] bg-[#0a0a0a]/98 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] z-[60] space-y-10 shadow-[0_80px_200px_rgba(0,0,0,1)] brand-inner-glow"
                 >
                    <div className="flex justify-between items-start border-b border-white/5 pb-6">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">DNA Calibration</h3>
                            <span className="text-[9px] font-mono text-gray-600 uppercase mt-1 tracking-widest">Biometric Bias Override</span>
                        </div>
                        <button onClick={() => setShowTuning(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-600 hover:text-white"><X size={20} /></button>
                    </div>
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-3">
                                    <Target size={12} className={key === 'skepticism' ? 'text-red-500' : key === 'excitement' ? 'text-orange-500' : 'text-cyan-400'} />
                                    <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">{key} Protocol</span>
                                </div>
                                <span className={`text-sm font-black font-mono ${key === 'skepticism' ? 'text-red-500' : key === 'excitement' ? 'text-[#f59e0b]' : 'text-cyan-400'}`}>{(voice.mentalState as any)[key]}%</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div 
                                    className="h-full rounded-full"
                                    animate={{ width: `${(voice.mentalState as any)[key]}%` }}
                                    style={{ backgroundColor: key === 'skepticism' ? '#ef4444' : key === 'excitement' ? '#f59e0b' : '#18E6FF', boxShadow: `0 0 10px currentColor` }}
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
                    <div className="pt-4 flex items-center justify-between opacity-30">
                         <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">System_Auth: Admin_L0</span>
                         <Fingerprint size={16} className="text-gray-800" />
                    </div>
                 </motion.div>
             )}
         </AnimatePresence>

         <HighFidelityCaptions transcript={voice.partialTranscript} />

         <motion.div 
            initial={{ opacity: 0, x: -60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="flex flex-col items-center gap-10 group"
         >
            <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/5 mb-1 opacity-40 group-hover:opacity-100 transition-all duration-700">
                <Target size={14} className="text-[#18E6FF]" />
                <span className="text-[11px] font-black text-[#18E6FF] uppercase tracking-[0.4em]">Operator</span>
            </div>
            <div className="relative">
                <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#18E6FF" isAgent={false} />
            </div>
         </motion.div>

         <div className="flex flex-col items-center gap-12 relative">
            <div className={`absolute -inset-16 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#7B2CFF]/30 animate-[spin_60s_linear_infinite]' : 'border-white/5 opacity-0'}`} />
            <div className={`absolute -inset-12 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#18E6FF]/15 animate-[spin_40s_linear_infinite_reverse]' : 'border-white/5 opacity-0'}`} />
            
            <button 
                onClick={toggleSession} 
                disabled={voice.isConnecting}
                className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-1000 relative z-10 border-2
                    ${voice.isActive 
                        ? 'bg-red-500/10 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.3)] scale-110 rotate-90' 
                        : 'bg-[#7B2CFF]/5 border-[#7B2CFF] shadow-[0_0_60px_rgba(123,44,255,0.3)] hover:scale-105 active:scale-95'
                    }
                    ${voice.isConnecting ? 'animate-pulse opacity-50' : ''}
                `}
            >
                <div className="absolute inset-2 border border-white/5 rounded-full" />
                {voice.isConnecting ? <Loader2 className="animate-spin text-white w-12 h-12" /> : voice.isActive ? <Power className="text-white w-12 h-12 drop-shadow-[0_0_15px_white]" /> : <Mic className="text-white w-12 h-12 drop-shadow-[0_0_15px_rgba(123,44,255,0.4)]" />}
            </button>
            <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.5em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {voice.isConnecting ? 'SYNCING_VECTORS' : voice.isActive ? 'SEVER_UPLINK' : 'ENGAGE_NEURAL_LINK'}
                </span>
                {voice.isActive && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full border border-white/5 shadow-2xl">
                        <Zap size={12} className="text-[#f1c21b] animate-pulse" />
                        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.3em]">Node: ACTIVE</div>
                    </div>
                )}
            </div>
         </div>

         <motion.div 
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="flex flex-col items-center gap-10 group"
         >
            <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/5 mb-1 opacity-40 group-hover:opacity-100 transition-all duration-700">
                <BrainCircuit size={14} className="text-[#7B2CFF]" />
                <span className="text-[11px] font-black text-[#7B2CFF] uppercase tracking-[0.4em]">{voice.voiceName}</span>
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
            animate={{ height: 320, opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-[#050505]/98 backdrop-blur-2xl p-10 relative flex flex-col overflow-hidden shadow-inner"
          >
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-[#7B2CFF]/10 border border-[#7B2CFF]/30 rounded-xl shadow-[0_0_20px_rgba(123,44,255,0.1)]">
                        <Terminal size={20} className="text-[#7B2CFF]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-black uppercase tracking-[0.4em] text-white">Handshake_Transcript</span>
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em] mt-1 block">Buffer_Stream // {voice.transcripts.length} packets cached</span>
                    </div>
                </div>
                <button onClick={() => setShowDialogueStream(false)} className="text-gray-500 hover:text-white transition-all group flex items-center gap-3 bg-white/5 px-5 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Collapse</span>
                    <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed pr-8" ref={scrollRef}>
                  {voice.transcripts.map((t, i) => {
                      const isUser = (t.role || '').toLowerCase() === 'user';
                      return (
                          <motion.div 
                            initial={{ opacity: 0, y: 15 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            key={i} 
                            className={`mb-8 flex gap-8 p-8 rounded-[2.5rem] border shadow-2xl ${isUser ? 'bg-[#18E6FF]/5 border-[#18E6FF]/10 text-[#18E6FF] flex-row-reverse' : 'bg-[#7B2CFF]/5 border-[#7B2CFF]/10 text-[#7B2CFF]'}`}
                          >
                              <div className="shrink-0 flex flex-col items-center gap-2.5 opacity-20 mt-1">
                                    {isUser ? <User size={20} /> : <Bot size={20} />}
                                    <div className="w-0.5 h-full bg-current rounded-full" />
                              </div>
                              <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                                  <p className="text-gray-200 font-medium tracking-tight leading-relaxed italic drop-shadow-lg text-base">{(t.text || '').toString()}</p>
                                  <div className={`mt-3 flex items-center gap-2.5 text-[8px] font-mono text-gray-700 uppercase tracking-widest ${isUser ? 'flex-row-reverse' : ''}`}>
                                       <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                                       <div className="w-1 h-1 rounded-full bg-gray-900" />
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