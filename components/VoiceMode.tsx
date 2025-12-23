import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../services/geminiService';
import { 
    Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, 
    Sliders, X, RotateCcw, Send, Volume2, VolumeX, Terminal, 
    ShieldAlert, Navigation, ChevronDown, ChevronUp, Cpu, Radio,
    Waves, Target, BrainCircuit, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

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
        <div className="relative w-72 h-72 flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-[-100px] w-[calc(100%+200px)] h-[calc(100%+200px)] pointer-events-none z-0" />
            <motion.div 
                animate={isThinking ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`relative z-10 w-44 h-44 rounded-full border-2 border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_60px_rgba(0,0,0,1)] transition-all duration-700 ${isThinking ? 'border-[#9d4edd]/50' : ''}`}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover grayscale-[20%] contrast-125" alt="Node Identity" />
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
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-20 bg-[length:100%_4px]" />
            </motion.div>
        </div>
    );
};

const HighFidelityCaptions = ({ transcript }: { transcript: { role: string, text: string } | null }) => {
    if (!transcript) return null;
    const isUser = (transcript.role || '').toLowerCase() === 'user';
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50 pointer-events-none"
        >
            <div className="bg-[#050505]/90 backdrop-blur-2xl border-x border-white/10 p-6 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isUser ? 'bg-[#22d3ee]' : 'bg-[#9d4edd]'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-[0.5em] ${isUser ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                        {isUser ? 'Uplink Stream' : 'Architect Transmit'}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>
                <p className="text-xl font-mono text-white leading-relaxed italic font-medium selection:bg-[#9d4edd]/30">
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
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans border border-[#1f1f1f] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)]">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/20 to-transparent" />

      {/* Primary Header */}
      <div className="h-16 flex justify-between items-center px-10 bg-[#080808]/80 backdrop-blur-3xl border-b border-white/5 z-30 shrink-0 relative">
          <div className="flex items-center gap-5">
              <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${voice.isActive ? 'text-[#10b981] animate-pulse bg-current' : 'text-gray-700 bg-current'}`} />
                      <span className="text-[10px] font-black font-mono uppercase tracking-[0.6em] text-white">Sovereign Voice Interface</span>
                  </div>
                  <div className="text-[8px] font-mono text-[#22d3ee] uppercase tracking-widest pl-5">{voice.isConnecting ? 'ESTABLISHING_LINK...' : voice.isActive ? 'SECURE_UPLINK_STABLE' : 'STANDBY_MODE'}</div>
              </div>
          </div>
          <div className="flex items-center gap-4">
               <button 
                onClick={() => setShowTuning(!showTuning)} 
                className={`p-3 border rounded-2xl transition-all duration-500 group ${showTuning ? 'bg-[#9d4edd] text-black border-[#9d4edd] shadow-lg shadow-[#9d4edd]/20' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white'}`}
               >
                   <Sliders size={18} className="group-active:scale-90 transition-transform" />
               </button>
               <div className="flex items-center gap-3 bg-[#111] border border-[#333] p-1.5 rounded-2xl shadow-inner">
                   <div className="p-2 rounded-xl bg-black/40 text-gray-500">
                    <Radio size={14} className={voice.isActive ? 'text-[#9d4edd] animate-pulse' : ''} />
                   </div>
                   <select 
                    value={voice.voiceName} 
                    onChange={(e) => setVoiceState({ voiceName: e.target.value })} 
                    disabled={voice.isActive} 
                    className="bg-transparent text-[11px] font-black font-mono text-[#9d4edd] outline-none uppercase cursor-pointer px-2 py-1 pr-6 hover:text-white transition-colors"
                   >
                        {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name} className="bg-[#0a0a0a]">{name}</option>))}
                    </select>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-24 p-12 relative overflow-hidden">
         <AnimatePresence>
             {showTuning && (
                 <motion.div 
                    initial={{ opacity: 0, x: -60, filter: 'blur(10px)' }} 
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, x: -60, filter: 'blur(10px)' }} 
                    className="absolute left-10 w-80 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] z-[60] space-y-8 shadow-[0_40px_100px_rgba(0,0,0,1)]"
                 >
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex flex-col">
                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Cognitive Calibration</h3>
                            <span className="text-[8px] font-mono text-gray-600 uppercase mt-1">Mental Parameter Override</span>
                        </div>
                        <button onClick={() => setShowTuning(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={16} className="text-gray-600" /></button>
                    </div>
                    
                    {['skepticism', 'excitement', 'alignment'].map(key => (
                        <div key={key} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] font-black font-mono text-gray-400 uppercase tracking-widest">{key}</span>
                                <span className="text-xs font-black font-mono text-[#9d4edd]">{(voice.mentalState as any)[key]}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                value={(voice.mentalState as any)[key]} 
                                onChange={e => setVoiceState({ mentalState: { ...voice.mentalState, [key]: parseInt(e.target.value) } })} 
                                className="w-full h-1 bg-[#222] rounded-full appearance-none accent-[#9d4edd] cursor-pointer hover:accent-[#b06bf7] transition-all" 
                            />
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setVoiceState({ mentalState: { skepticism: 50, excitement: 50, alignment: 50 } })} 
                        className="w-full py-4 bg-[#111] border border-[#333] rounded-2xl text-[9px] font-black uppercase text-gray-500 hover:text-white hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all flex items-center justify-center gap-3"
                    >
                        <RotateCcw size={14} /> Reset Cognitive Profile
                    </button>
                 </motion.div>
             )}
         </AnimatePresence>

         <HighFidelityCaptions transcript={voice.partialTranscript} />

         {/* Operator Node */}
         <div className="flex flex-col items-center gap-8 group">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 mb-2 opacity-40 group-hover:opacity-100 transition-opacity">
                <Target size={12} className="text-[#22d3ee]" />
                <span className="text-[10px] font-black text-[#22d3ee] uppercase tracking-[0.4em]">Operator Node</span>
            </div>
            <CognitiveLattice image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
         </div>

         {/* Central Control Hub */}
         <div className="flex flex-col items-center gap-10 relative">
            <div className={`absolute -inset-10 border border-dashed rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'border-[#9d4edd]/40 animate-[spin_30s_linear_infinite]' : 'border-white/5 opacity-0'}`} />
            <div className={`absolute -inset-6 border border-white/5 rounded-full pointer-events-none transition-all duration-1000 ${voice.isActive ? 'opacity-100' : 'opacity-0'}`} />
            
            <button 
                onClick={toggleSession} 
                disabled={voice.isConnecting}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 
                    ${voice.isActive 
                        ? 'bg-red-500 shadow-[0_0_80px_rgba(239,68,68,0.4)] scale-110' 
                        : 'bg-[#9d4edd] shadow-[0_0_40px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95'
                    }
                    ${voice.isConnecting ? 'animate-pulse opacity-50' : ''}
                `}
            >
                {voice.isConnecting ? <Loader2 className="animate-spin text-black w-10 h-10" /> : voice.isActive ? <Power className="text-black w-10 h-10" /> : <Mic className="text-black w-10 h-10" />}
            </button>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.5em]">{voice.isConnecting ? 'Calibrating' : voice.isActive ? 'Sever Link' : 'Initialize'}</span>
                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Protocol Zenith_v1.0</div>
            </div>
         </div>

         {/* Agent Node */}
         <div className="flex flex-col items-center gap-8 group">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 mb-2 opacity-40 group-hover:opacity-100 transition-opacity">
                <BrainCircuit size={12} className="text-[#9d4edd]" />
                <span className="text-[10px] font-black text-[#9d4edd] uppercase tracking-[0.5em]">{voice.voiceName} Engine</span>
            </div>
            <CognitiveLattice 
                image={agentAvatar} 
                freqs={agentFreqs} 
                color="#9d4edd" 
                isAgent={true} 
                isThinking={isGeneratingAvatar}
                mentalState={voice.mentalState}
            />
         </div>
      </div>

      <AnimatePresence>
        {showDialogueStream && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 320, opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="h-80 border-t border-white/5 bg-[#050505]/95 backdrop-blur-3xl p-8 relative flex flex-col overflow-hidden"
          >
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4 shrink-0">
                <div className="flex items-center gap-4 text-[#9d4edd]">
                    <div className="p-1.5 rounded-lg bg-[#9d4edd]/10">
                        <Terminal size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-[0.4em]">Synaptic Dialogue Log</span>
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Temporal Alignment: LATTICE_LOCK_v4</span>
                    </div>
                </div>
                <div className="flex items-center gap-8 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2 text-[#10b981]"><Activity size={12} /> Grounded</div>
                    <div className="flex items-center gap-2 text-[#22d3ee]"><Navigation size={12} /> Live Sync</div>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => setShowDialogueStream(false)} className="hover:text-white transition-colors group flex items-center gap-2">
                        <span className="group-hover:mr-1 transition-all">Collapse</span>
                        <ChevronDown size={14}/>
                    </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-relaxed pr-6" ref={scrollRef}>
                  <AnimatePresence initial={false}>
                      {voice.transcripts.map((t, i) => {
                          const isUser = (t.role || '').toLowerCase() === 'user';
                          return (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                key={i} 
                                className={`mb-6 flex gap-6 p-4 rounded-3xl border transition-all duration-500 ${isUser ? 'bg-[#22d3ee]/5 border-[#22d3ee]/10 text-[#22d3ee]' : 'bg-[#9d4edd]/5 border-[#9d4edd]/10 text-[#9d4edd]'}`}
                              >
                                  <div className="flex flex-col items-center gap-2 shrink-0 w-12 pt-1">
                                    <div className={`p-2 rounded-xl border ${isUser ? 'border-[#22d3ee]/30 bg-black/40' : 'border-[#9d4edd]/30 bg-black/40'}`}>
                                        {isUser ? <User size={14} /> : <Bot size={14} />}
                                    </div>
                                    <span className="text-[8px] font-black uppercase opacity-60">[{isUser ? 'OP' : 'AI'}]</span>
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-gray-300 font-medium selection:bg-[#9d4edd]/40">{(t.text || '').toString()}</p>
                                      <div className="mt-2 text-[8px] opacity-40 uppercase tracking-widest">Synced: {new Date(t.timestamp || Date.now()).toLocaleTimeString()}</div>
                                  </div>
                              </motion.div>
                          );
                      })}
                  </AnimatePresence>
                  {voice.partialTranscript && (
                      <div className={`flex gap-6 p-4 italic opacity-40 transition-all ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                          <div className="shrink-0 w-12 text-center pt-1"><div className="w-1.5 h-1.5 rounded-full bg-current mx-auto animate-ping" /></div>
                          <span className="text-white/80">{(voice.partialTranscript.text || '').toString()}_</span>
                      </div>
                  )}
                  {voice.transcripts.length === 0 && !voice.partialTranscript && (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 text-center select-none py-12">
                          <BrainCircuit size={64} className="mb-6 text-gray-500" />
                          <p className="text-xs font-mono uppercase tracking-[0.6em]">Dialogue Buffer Empty</p>
                          <p className="text-[10px] font-mono mt-2 uppercase">Establish uplink to begin transmission</p>
                      </div>
                  )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showDialogueStream && (
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowDialogueStream(true)}
            className="absolute bottom-8 right-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-[2rem] text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]/50 transition-all z-40 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] group active:scale-95"
          >
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#9d4edd]/20 group-hover:text-[#9d4edd] transition-colors">
                <Terminal size={18}/>
              </div>
              <div className="flex flex-col items-start">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Restore Data Stream</span>
                  <span className="text-[7px] font-mono uppercase tracking-widest text-gray-600">Buffer size: {voice.transcripts.length} packets</span>
              </div>
              <ChevronUp size={16} className="ml-2 animate-bounce" />
          </motion.button>
      )}
    </div>
  );
};

export default VoiceMode;
