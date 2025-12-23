import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../services/geminiService';
import { Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, Sliders, X, RotateCcw, Send, Volume2, VolumeX, Terminal, ShieldAlert, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

const AvatarCore: React.FC<{ image: string | null; freqs: Uint8Array | null; color: string; isAgent: boolean; isThinking?: boolean }> = ({ image, freqs, color, isAgent, isThinking }) => {
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

            // Background Pulse
            if (normalizedVol > 0.05 || isThinking) {
                const pulseAmount = isThinking ? Math.sin(Date.now() / 200) * 10 : normalizedVol * 60;
                ctx.beginPath();
                const haloRadius = baseRadius + pulseAmount;
                ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(cx, cy, baseRadius, cx, cy, haloRadius);
                gradient.addColorStop(0, `${color}40`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Main Ring
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius + (normalizedVol * 25), 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2 + (normalizedVol * 4);
            ctx.stroke();

            // Decorative tech circles
            if (isAgent) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = `${color}20`;
                ctx.beginPath();
                ctx.arc(cx, cy, baseRadius + 40, Date.now() / 1000, Date.now() / 1000 + Math.PI);
                ctx.stroke();
            }

            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color, isAgent, isThinking]);

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-[-80px] w-[calc(100%+160px)] h-[calc(100%+160px)] pointer-events-none z-0" />
            <div className={`relative z-10 w-40 h-40 rounded-full border-2 border-white/10 overflow-hidden bg-[#050505] shadow-2xl transition-all duration-700 ${isThinking ? 'scale-105 border-[#9d4edd]/50' : ''}`}>
                {image ? (
                    <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={image} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-800">
                        {isAgent ? <Bot size={64} className={isThinking ? 'text-[#9d4edd] animate-pulse' : ''} /> : <User size={64} />}
                    </div>
                )}
                {isThinking && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[2px]">
                         <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin mb-1" />
                         <span className="text-[7px] font-black font-mono text-[#9d4edd] uppercase">Reasoning</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const LiveCaptions = ({ transcript }: { transcript: { role: string, text: string } | null }) => {
    if (!transcript) return null;
    const isUser = (transcript.role || '').toLowerCase() === 'user';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-full max-w-xl text-center px-6 z-50 pointer-events-none"
        >
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <span className={`text-[8px] font-black uppercase tracking-widest block mb-2 ${isUser ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                    {isUser ? 'Operator Signal' : 'Architect Transmission'}
                </span>
                <p className="text-xl font-mono text-white leading-relaxed italic font-medium">
                    "{transcript.text || '...'}"
                </p>
            </div>
        </motion.div>
    );
};

const VoiceMode: React.FC = () => {
  const { voice, setVoiceState, user, addLog, mode } = useAppStore();
  const [showTuning, setShowTuning] = useState(false);
  const [showDialogueStream, setShowDialogueStream] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
  const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  const currentAgent = useMemo(() => (HIVE_AGENTS as any)[voice.voiceName] || HIVE_AGENTS['Puck'], [voice.voiceName]);
  const agentAvatar = voice.agentAvatars[voice.voiceName] || null;

  // Auto-generate agent avatar if missing
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
                  console.warn("Agent avatar gen failed", e);
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
        addLog('SYSTEM', 'VOICE_CORE: Connection Terminated.');
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
            addLog('SYSTEM', 'VOICE_CORE: Uplink Stable.');
            audio.playSuccess();
        } catch (err: any) {
            setVoiceState({ isConnecting: false, error: err.message });
        }
    }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="h-16 flex justify-between items-center px-8 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 shrink-0">
          <div className="flex items-center gap-4">
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <Activity className={`w-3 h-3 ${voice.isActive ? 'text-[#9d4edd] animate-pulse' : 'text-gray-600'}`} />
                      <span className="text-[10px] font-black font-mono uppercase tracking-[0.4em] text-white">Neural Voice Engine</span>
                  </div>
                  <div className="text-[8px] font-mono text-[#22d3ee] uppercase tracking-widest">{voice.isConnecting ? 'HANDSHAKE...' : voice.isActive ? 'UPLINK_STABLE_AES256' : 'STANDBY_MODE'}</div>
              </div>
          </div>
          <div className="flex items-center gap-4">
               <button onClick={() => setShowTuning(!showTuning)} className={`p-2 border rounded-xl transition-all ${showTuning ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white'}`}><Sliders size={18} /></button>
               <div className="flex items-center gap-2 bg-[#111] border border-[#333] p-1.5 rounded-xl">
                   <Settings size={14} className="text-gray-500 ml-2" />
                   <select value={voice.voiceName} onChange={(e) => setVoiceState({ voiceName: e.target.value })} disabled={voice.isActive} className="bg-transparent text-[10px] font-black font-mono text-[#9d4edd] outline-none uppercase cursor-pointer px-2 py-1">
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name}>{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-20 p-10 relative">
         <AnimatePresence>
             {showTuning && (
                 <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="absolute left-10 w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] p-6 rounded-3xl z-[60] space-y-6 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Cognitive Calibration</h3>
                        <X size={14} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => setShowTuning(false)} />
                    </div>
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-2">
                            <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest"><span>{key}</span><span>{(voice.mentalState as any)[key]}%</span></div>
                            <input type="range" min="0" max="100" value={(voice.mentalState as any)[key]} onChange={e => setVoiceState({ mentalState: { ...voice.mentalState, [key]: parseInt(e.target.value) } })} className="w-full h-1 bg-[#222] rounded-full appearance-none accent-[#9d4edd] cursor-pointer" />
                        </div>
                    ))}
                    <button onClick={() => setVoiceState({ mentalState: { skepticism: 50, excitement: 50, alignment: 50 } })} className="w-full py-2 bg-[#111] border border-[#333] rounded-lg text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all"><RotateCcw size={12} className="inline mr-2" /> Reset Logic Profile</button>
                 </motion.div>
             )}
         </AnimatePresence>

         <LiveCaptions transcript={voice.partialTranscript} />

         <div className="flex flex-col items-center gap-6 group">
            <span className="text-[9px] font-black text-[#22d3ee] uppercase tracking-[0.4em] opacity-40 group-hover:opacity-100 transition-opacity">Operator Node</span>
            <AvatarCore image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
         </div>

         <div className="flex flex-col items-center gap-8 relative">
            <div className={`absolute -inset-4 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#9d4edd]/40 animate-[spin_20s_linear_infinite]' : 'border-white/5 opacity-0'}`}></div>
            
            <button onClick={toggleSession} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 ${voice.isActive ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] scale-110' : 'bg-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95'}`}>
                {voice.isConnecting ? <Loader2 className="animate-spin text-black w-8 h-8" /> : voice.isActive ? <Power className="text-black w-8 h-8" /> : <Mic className="text-black w-8 h-8" />}
            </button>
            <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.3em]">{voice.isConnecting ? 'Establishing...' : voice.isActive ? 'Terminate' : 'Initialize'}</span>
         </div>

         <div className="flex flex-col items-center gap-6 group">
            <span className="text-[9px] font-black text-[#9d4edd] uppercase tracking-[0.4em] opacity-40 group-hover:opacity-100 transition-opacity">{voice.voiceName} Engine</span>
            <AvatarCore image={agentAvatar} freqs={agentFreqs} color="#9d4edd" isAgent={true} isThinking={isGeneratingAvatar} />
         </div>
      </div>

      <AnimatePresence>
        {showDialogueStream && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 256, opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="h-64 border-t border-[#1f1f1f] bg-[#050505]/95 backdrop-blur-xl p-8 relative flex flex-col overflow-hidden"
          >
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 shrink-0">
                <div className="flex items-center gap-3 text-[#9d4edd] text-[10px] font-black uppercase tracking-[0.4em]">
                    <Terminal size={14} /> Neural Dialogue Stream
                </div>
                <div className="flex items-center gap-6 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Activity size={10} className="text-[#10b981]" /> Grounded</span>
                    <span className="flex items-center gap-1.5"><Navigation size={10} className="text-[#22d3ee]" /> Logic Sync</span>
                    <button onClick={() => setShowDialogueStream(false)} className="hover:text-white transition-colors ml-4"><ChevronDown size={14}/></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-relaxed pr-4" ref={scrollRef}>
                  <AnimatePresence initial={false}>
                      {voice.transcripts.map((t, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            key={i} 
                            className={`mb-4 flex gap-4 p-3 rounded-xl border border-transparent hover:bg-white/[0.02] hover:border-white/5 transition-all ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}
                          >
                              <span className="font-black uppercase shrink-0 w-12 text-right opacity-60">[{t.role === 'user' ? 'OP' : 'AI'}]:</span>
                              <span className="text-gray-300">{(t.text || '').toString()}</span>
                          </motion.div>
                      ))}
                  </AnimatePresence>
                  {voice.partialTranscript && (
                      <div className={`flex gap-4 p-3 italic opacity-40 ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                          <span className="font-black uppercase shrink-0 w-12 text-right">[...]</span>
                          <span className="text-white">{(voice.partialTranscript.text || '').toString()}_</span>
                      </div>
                  )}
                  {voice.transcripts.length === 0 && !voice.partialTranscript && (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 text-center select-none">
                          <Terminal size={40} className="mb-4" />
                          <p className="text-[10px] font-mono uppercase tracking-[0.5em]">Dialogue Buffer Empty</p>
                      </div>
                  )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showDialogueStream && (
          <button 
            onClick={() => setShowDialogueStream(true)}
            className="absolute bottom-6 right-8 bg-[#0a0a0a] border border-[#1f1f1f] p-3 rounded-xl text-gray-500 hover:text-[#9d4edd] transition-all z-40 flex items-center gap-3 shadow-2xl"
          >
              <Terminal size={14}/>
              <span className="text-[8px] font-black uppercase tracking-widest">Restore Dialogue Stream</span>
              <ChevronUp size={14}/>
          </button>
      )}
    </div>
  );
};

export default VoiceMode;
