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
        className="flex flex-col gap-0.5 px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl backdrop-blur-xl shrink-0 pointer-events-none shadow-lg"
    >
        <span className="text-[6.5px] font-black font-mono text-gray-600 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black font-mono uppercase truncate" style={{ color }}>{value}</span>
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
                const count = isThinking ? 4 : 1;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 60 + Math.random() * 50;
                    particles.current.push({
                        x: cx + Math.cos(angle) * r,
                        y: cy + Math.sin(angle) * r,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: 1.0,
                        speed: Math.random() * 0.02 + 0.008,
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

                ctx.globalAlpha = p.life * 0.5;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.life * 1.5, 0, Math.PI * 2);
                ctx.fill();

                if (p.life > 0.6) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.4;
                    ctx.globalAlpha = p.life * 0.1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(cx, cy);
                    ctx.stroke();
                }
            });

            ctx.globalAlpha = 1;
            frameId = requestAnimationFrame(render);
        };
        const handle = requestAnimationFrame(render);
        return () => cancelAnimationFrame(handle);
    }, [isThinking, userActive, agentActive]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40" />;
};

const CognitiveNode: React.FC<{ 
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
                const threadCount = 12;
                const baseRadius = 60;
                ctx.lineWidth = 0.5;
                for (let i = 0; i < threadCount; i++) {
                    const angle = (i / threadCount) * Math.PI * 2 + time * 0.2;
                    const r = baseRadius + Math.sin(time * 3 + i) * (10 * normalizedVol);
                    const tx = cx + Math.cos(angle) * r;
                    const ty = cy + Math.sin(angle) * r;

                    ctx.beginPath();
                    ctx.strokeStyle = `${color}${Math.floor((0.15 + normalizedVol) * 255).toString(16).padStart(2, '0')}`;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                }
            }

            const corePulse = 60 + Math.sin(time * 4) * 5 + normalizedVol * 30;
            const gradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, corePulse);
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
    }, [freqs, color, isAgent, isThinking]);

    return (
        <div className="relative w-48 h-48 flex items-center justify-center group/node">
            <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none group-hover/node:border-white/10 transition-colors" />
            <canvas ref={canvasRef} className="absolute inset-[-60px] w-[calc(100%+120px)] h-[calc(100%+120px)] pointer-events-none z-0 opacity-60" />
            <motion.div 
                animate={isThinking ? { scale: [1, 1.05, 1], boxShadow: [`0 0 15px ${color}15`, `0 0 30px ${color}30`, `0 0 15px ${color}15`] } : {}}
                className={`relative z-10 w-28 h-28 rounded-full border border-white/10 overflow-hidden bg-black shadow-2xl transition-all duration-700 ${isThinking ? 'border-[#f1c21b]' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[10%] group-hover/node:grayscale-0 transition-all duration-700" alt="Node" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#050505] text-gray-800">
                        {isAgent ? <BrainCircuit size={32} /> : <User size={32} />}
                    </div>
                )}
                {isThinking && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                         <Loader2 className="w-6 h-6 text-[#f1c21b] animate-spin" />
                    </div>
                )}
            </motion.div>

            {/* Micro-HUD Data Tags */}
            <div className="absolute top-0 right-0 translate-x-12 -translate-y-4 z-30">
                <DataBit label="TYPE" value={isAgent ? "NODE_AI" : "OPERATOR"} color={color} />
            </div>
            <div className="absolute bottom-4 left-0 -translate-x-12 z-30">
                <DataBit label="SYNC" value={isThinking ? "BUSY" : "OK"} color={isThinking ? "#f1c21b" : "#10b981"} />
            </div>
        </div>
    );
};

const VoiceMode: React.FC = () => {
  const { voice, setVoiceState, user, addLog } = useAppStore();
  const [showTuning, setShowTuning] = useState(false);
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
                      const url = await generateAvatar(currentAgent.id.toUpperCase(), currentAgent.name);
                      setVoiceState(prev => ({ agentAvatars: { ...prev.agentAvatars, [voice.voiceName]: url } }));
                  }
              } catch (e) { console.warn(e); } finally { setIsGeneratingAvatar(false); }
          };
          fetchAvatar();
      }
  }, [voice.voiceName, agentAvatar, currentAgent]);

  useEffect(() => {
      let rafId: number;
      const loop = () => {
          if (voice.isActive) {
              setUserFreqs(liveSession.getInputFrequencies());
              setAgentFreqs(liveSession.getOutputFrequencies());
          } else { setUserFreqs(null); setAgentFreqs(null); }
          rafId = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(rafId);
  }, [voice.isActive]);

  useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [voice.transcripts, voice.partialTranscript]);

  const toggleSession = async () => {
    if (voice.isActive || voice.isConnecting) {
        liveSession.disconnect();
        setVoiceState({ isActive: false, isConnecting: false });
        addLog('SYSTEM', 'COMMS: Handshake terminated.');
        audio.playError();
    } else {
        await liveSession.primeAudio();
        setVoiceState({ isConnecting: true });
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setVoiceState({ isConnecting: false }); return; }
            setVoiceState({ isActive: true });
            addLog('SUCCESS', 'COMMS: Secure uplink synchronized.');
            audio.playSuccess();
        } catch (err: any) { setVoiceState({ isConnecting: false }); }
    }
  };

  return (
    <div className="h-full w-full bg-[#030305] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-[2.5rem] shadow-2xl transition-colors duration-500">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,44,255,0.02)_0%,transparent_80%)] pointer-events-none" />
      <NeuralReasoningCanvas isThinking={voice.isActive && !!voice.partialTranscript} userActive={!!userFreqs && userFreqs.some(v => v > 50)} agentActive={!!agentFreqs && agentFreqs.some(v => v > 50)} />

      {/* Header - Professional Density */}
      <div className="h-16 flex justify-between items-center px-10 bg-black/60 backdrop-blur-2xl border-b border-white/5 z-30 shrink-0 relative">
          <div className="flex items-center gap-6">
              <div className="p-2.5 bg-[#7B2CFF]/10 border border-[#7B2CFF]/30 rounded-xl">
                <Radio size={20} className={voice.isActive ? 'text-[#7B2CFF] animate-pulse' : 'text-gray-700'} />
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-sm font-black font-mono uppercase tracking-[0.3em] text-white leading-none">Voice Hub</h1>
                      <div className={`w-1.5 h-1.5 rounded-full ${voice.isActive ? 'bg-[#10b981] animate-pulse' : 'bg-gray-800'}`} />
                  </div>
                  <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest leading-none">
                    {voice.isConnecting ? 'Establishing Link...' : voice.isActive ? 'Uplink Stable' : 'System Standby'}
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-5">
               <button onClick={() => { setShowTuning(!showTuning); audio.playClick(); }} className={`p-2.5 rounded-xl border transition-all ${showTuning ? 'bg-[#7B2CFF] text-white border-[#7B2CFF] shadow-lg' : 'bg-black border-[#333] text-gray-500 hover:text-white'}`}>
                   <Sliders size={16} />
               </button>
               <div className="h-6 w-px bg-white/10" />
               <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-1.5 rounded-xl shadow-inner">
                   <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Active Node</span>
                   <select value={voice.voiceName} onChange={(e) => setVoiceState({ voiceName: e.target.value })} disabled={voice.isActive} className="bg-transparent text-[10px] font-black font-mono text-[#7B2CFF] outline-none uppercase cursor-pointer pr-2">
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      {/* Workspace - Reduced Avatar Scale */}
      <div className="flex-1 flex items-center justify-center gap-24 p-10 relative overflow-hidden">
         <AnimatePresence>
             {showTuning && (
                 <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="absolute left-10 w-72 bg-[#0a0a0a]/98 border border-white/10 p-8 rounded-[2rem] z-[60] space-y-8 shadow-2xl">
                    <div className="flex justify-between items-start border-b border-white/5 pb-4">
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Cognitive Calibration</h3>
                        <button onClick={() => setShowTuning(false)} className="p-1 text-gray-600 hover:text-white"><X size={16} /></button>
                    </div>
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{key} bias</span>
                                <span className="text-[10px] font-black font-mono text-white">{(voice.mentalState as any)[key]}%</span>
                            </div>
                            <div className="relative h-1 w-full bg-black border border-white/5 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-[#7B2CFF]" animate={{ width: `${(voice.mentalState as any)[key]}%` }} />
                                <input type="range" min="0" max="100" value={(voice.mentalState as any)[key]} onChange={e => setVoiceState({ mentalState: { ...voice.mentalState, [key]: parseInt(e.target.value) } })} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    ))}
                 </motion.div>
             )}
         </AnimatePresence>

         <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center gap-6 group">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 opacity-40 group-hover:opacity-100 transition-all">
                <Target size={10} className="text-[#18E6FF]" />
                <span className="text-[9px] font-black text-[#18E6FF] uppercase tracking-widest">Operator</span>
            </div>
            <CognitiveNode image={user.avatar} freqs={userFreqs} color="#18E6FF" isAgent={false} />
         </motion.div>

         <div className="flex flex-col items-center gap-8 relative">
            <button onClick={toggleSession} disabled={voice.isConnecting} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 border shadow-2xl active:scale-95 ${voice.isActive ? 'bg-red-500/10 border-red-500 text-red-500 shadow-red-500/20' : 'bg-[#7B2CFF]/10 border-[#7B2CFF] text-white shadow-[#7B2CFF]/20 hover:bg-[#7B2CFF]/20'}`}>
                {voice.isConnecting ? <Loader2 className="animate-spin" size={24} /> : voice.isActive ? <Power size={32} /> : <Mic size={32} />}
            </button>
            <div className="text-center">
                <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">{voice.isConnecting ? 'SYNCING...' : voice.isActive ? 'SEVER LINK' : 'INITIATE UPLINK'}</span>
            </div>
         </div>

         <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center gap-6 group">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 opacity-40 group-hover:opacity-100 transition-all">
                <BrainCircuit size={10} className="text-[#7B2CFF]" />
                <span className="text-[9px] font-black text-[#7B2CFF] uppercase tracking-widest">{voice.voiceName}</span>
            </div>
            <CognitiveNode image={agentAvatar} freqs={agentFreqs} color="#7B2CFF" isAgent={true} isThinking={voice.isActive && !!voice.partialTranscript} />
         </motion.div>
      </div>

      <div className="h-44 bg-black/60 border-t border-white/5 p-6 relative flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-2 shrink-0">
            <div className="flex items-center gap-3">
                <Terminal size={14} className="text-gray-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Communication Transcript</span>
            </div>
            <span className="text-[7px] font-mono text-gray-700 uppercase tracking-widest">{voice.transcripts.length} packets cached</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed pr-6" ref={scrollRef}>
              {voice.transcripts.map((t, i) => (
                  <div key={i} className={`mb-3 flex gap-4 p-4 rounded-xl border border-white/5 ${t.role === 'user' ? 'bg-[#18E6FF]/5 text-[#18E6FF] flex-row-reverse' : 'bg-[#7B2CFF]/5 text-[#7B2CFF]'}`}>
                      <div className="flex-1 italic">"{(t.text || '').toString()}"</div>
                  </div>
              ))}
              {voice.partialTranscript && (
                  <div className={`mb-3 flex gap-4 p-4 rounded-xl border border-white/5 opacity-50 animate-pulse ${voice.partialTranscript.role === 'user' ? 'text-[#18E6FF]/5 text-[#18E6FF] flex-row-reverse' : 'bg-[#7B2CFF]/5 text-[#7B2CFF]'}`}>
                      <div className="flex-1 italic">"{(voice.partialTranscript.text || '').toString()}"</div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default VoiceMode;