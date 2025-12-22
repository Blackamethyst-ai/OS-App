
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar, chatWithGemini } from '../services/geminiService';
import { Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, Sliders, X, RotateCcw, Send, Volume2, VolumeX, Terminal, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

const AvatarCore: React.FC<{ image: string | null; freqs: Uint8Array | null; color: string; isAgent: boolean; }> = ({ image, freqs, color, isAgent }) => {
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
            const baseRadius = 80; 
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let volume = 0;
            if (freqs && freqs.length > 0) volume = freqs.reduce((a, b) => a + b, 0) / freqs.length;
            const normalizedVol = volume / 255;
            if (normalizedVol > 0.05) {
                ctx.beginPath();
                const haloRadius = baseRadius + (normalizedVol * 60);
                ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(cx, cy, baseRadius, cx, cy, haloRadius);
                gradient.addColorStop(0, `${color}40`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius + (normalizedVol * 25), 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2 + (normalizedVol * 4);
            ctx.stroke();
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color]);

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-[-80px] w-[calc(100%+160px)] h-[calc(100%+160px)] pointer-events-none z-0" />
            <div className={`relative z-10 w-40 h-40 rounded-full border border-white/10 overflow-hidden bg-[#050505] shadow-2xl`}>
                {image ? <img src={image} className="w-full h-full object-cover" alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-gray-800">{isAgent ? <Bot size={64} /> : <User size={64} />}</div>}
            </div>
        </div>
    );
};

const VoiceMode: React.FC = () => {
  const { voice, setVoiceState, user, addLog } = useAppStore();
  const [showTuning, setShowTuning] = useState(false);
  const [isNarrationMuted, setIsNarrationMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
  const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);

  const currentAgent = (HIVE_AGENTS as any)[voice.voiceName] || HIVE_AGENTS['Puck'];

  useEffect(() => {
      let rafId: number;
      const loop = () => {
          if (voice.isActive) {
              setUserFreqs(liveSession.getInputFrequencies());
              setAgentFreqs(liveSession.getOutputFrequencies());
          }
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
        addLog('SYSTEM', 'VOICE_CORE: Connection Terminated.');
        audio.playError();
    } else {
        await liveSession.primeAudio();
        setVoiceState({ isConnecting: true });
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            setVoiceState({ isActive: true, isConnecting: false });
            addLog('SYSTEM', 'VOICE_CORE: Uplink Stable.');
            audio.playSuccess();
        } catch (err: any) {
            setVoiceState({ isConnecting: false, error: err.message });
        }
    }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
      <div className="h-16 flex justify-between items-center px-8 border-b border-[#1f1f1f] bg-[#0a0a0a] z-20 shrink-0">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <Activity className={`w-3 h-3 ${voice.isActive ? 'text-[#9d4edd] animate-pulse' : 'text-gray-600'}`} />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Neural Voice Hub</span>
              </div>
              <div className="text-xs font-mono text-[#22d3ee] uppercase">{voice.isConnecting ? 'HANDSHAKE...' : voice.isActive ? 'ONLINE' : 'STANDBY'}</div>
          </div>
          <div className="flex items-center gap-4">
               <button onClick={() => setShowTuning(!showTuning)} className={`p-2 border rounded transition-all ${showTuning ? 'bg-[#9d4edd] text-black' : 'border-[#333] text-gray-500'}`}><Sliders size={18} /></button>
               <div className="flex items-center gap-2 bg-[#111] border border-[#333] p-1.5 rounded">
                   <Settings size={14} className="text-gray-500" />
                   <select value={voice.voiceName} onChange={(e) => setVoiceState({ voiceName: e.target.value })} disabled={voice.isActive} className="bg-transparent text-[10px] font-mono text-[#9d4edd] outline-none uppercase cursor-pointer">
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name}>{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-20 p-10 relative">
         <AnimatePresence>
             {showTuning && (
                 <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="absolute left-10 w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] p-6 rounded-3xl z-50 space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">Mind Tuning</h3>
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase"><span>{key}</span><span>{(voice.mentalState as any)[key]}%</span></div>
                            <input type="range" min="0" max="100" value={(voice.mentalState as any)[key]} onChange={e => setVoiceState({ mentalState: { ...voice.mentalState, [key]: parseInt(e.target.value) } })} className="w-full h-1 bg-[#222] rounded-full appearance-none accent-[#9d4edd] cursor-pointer" />
                        </div>
                    ))}
                    <button onClick={() => setVoiceState({ mentalState: { skepticism: 50, excitement: 50, alignment: 50 } })} className="w-full py-2 bg-[#111] border border-[#333] rounded-lg text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all"><RotateCcw size={12} className="inline mr-2" /> Reset Profile</button>
                 </motion.div>
             )}
         </AnimatePresence>

         <div className="flex flex-col items-center gap-6">
            <span className="text-[10px] font-black text-[#22d3ee] uppercase tracking-[0.3em]">Operator</span>
            <AvatarCore image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
         </div>

         <div className="flex flex-col items-center gap-8">
            <button onClick={toggleSession} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 ${voice.isActive ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'bg-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.3)]'}`}>
                {voice.isConnecting ? <Loader2 className="animate-spin text-black" /> : voice.isActive ? <Power className="text-black" /> : <Mic className="text-black" size={32} />}
            </button>
            <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">{voice.isActive ? 'Terminate Uplink' : 'Initialize Session'}</span>
         </div>

         <div className="flex flex-col items-center gap-6">
            <span className="text-[10px] font-black text-[#9d4edd] uppercase tracking-[0.3em]">{voice.voiceName} Agent</span>
            <AvatarCore image={null} freqs={agentFreqs} color="#9d4edd" isAgent={true} />
         </div>
      </div>

      <div className="h-48 border-t border-[#1f1f1f] bg-[#050505] p-6 relative flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-[#9d4edd] text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
            <Terminal size={14} /> Real-Time Spectral Transcription
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-relaxed" ref={scrollRef}>
              {voice.transcripts.map((t, i) => (
                  <div key={i} className={`mb-3 flex gap-3 ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                      <span className="font-black uppercase shrink-0">[{t.role === 'user' ? 'OP' : 'AI'}]:</span>
                      <span>{t.text}</span>
                  </div>
              ))}
              {voice.partialTranscript && (
                  <div className={`flex gap-3 italic opacity-50 ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                      <span className="font-black uppercase shrink-0">[{voice.partialTranscript.role === 'user' ? 'OP' : 'AI'}]:</span>
                      <span>{voice.partialTranscript.text}...</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default VoiceMode;
