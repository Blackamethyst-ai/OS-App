import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService'; 
import { Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, Download, Save, FileText, Terminal, Layers, Radio, Volume2, Globe, Signal, Command, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- NEW VISUALIZER: CYAN BEAT CORE WITH PURPLE GLOW ---
const AvatarCore: React.FC<{
    image: string | null;
    freqs: Uint8Array | null;
    color: string;
    isAgent: boolean;
    onGenerate?: () => void;
    isGenerating?: boolean;
}> = ({ image, freqs, color, isAgent, onGenerate, isGenerating }) => {
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

            // 1. Calculate Average Volume
            let volume = 0;
            if (freqs && freqs.length > 0) {
                volume = freqs.reduce((a, b) => a + b, 0) / freqs.length;
            }
            const normalizedVol = volume / 255; // 0 to 1

            // 2. Purple Halo (Outer Glow)
            if (normalizedVol > 0.05) {
                ctx.beginPath();
                const haloRadius = baseRadius + (normalizedVol * 60);
                ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(cx, cy, baseRadius, cx, cy, haloRadius);
                gradient.addColorStop(0, 'rgba(157, 78, 221, 0.4)'); // #9d4edd Purple
                gradient.addColorStop(1, 'rgba(157, 78, 221, 0)');
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // 3. Cyan Beat Circle (The "Pulse")
            ctx.beginPath();
            const pulseRadius = baseRadius + (normalizedVol * 25);
            ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#22d3ee'; // Cyan
            ctx.lineWidth = 2 + (normalizedVol * 4);
            ctx.shadowBlur = normalizedVol * 20;
            ctx.shadowColor = '#22d3ee';
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset

            // 4. Secondary Inner Ring (Detail)
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frameId);
    }, [freqs, color]);

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Audio Canvas Layer */}
            <canvas ref={canvasRef} className="absolute inset-[-80px] w-[calc(100%+160px)] h-[calc(100%+160px)] pointer-events-none z-0" />
            
            {/* Avatar Container */}
            <div className={`relative z-10 w-40 h-40 rounded-full border border-white/10 overflow-hidden bg-[#050505] shadow-2xl transition-all duration-100 ease-out`} style={{ transform: `scale(${1 + (freqs ? (freqs.reduce((a,b)=>a+b,0)/freqs.length)/1000 : 0)})` }}>
                {image ? (
                    <img src={image} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-800">
                        {isAgent ? <Bot className="w-16 h-16 mb-2 text-[#9d4edd]" /> : <User className="w-16 h-16 mb-2 text-[#22d3ee]" />}
                    </div>
                )}
                
                {/* Generation Overlay for Agent */}
                {isAgent && !image && onGenerate && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer" onClick={onGenerate}>
                        <div className="flex flex-col items-center text-[#9d4edd]">
                            {isGenerating ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8" />}
                            <span className="text-[10px] font-mono uppercase font-bold mt-1">
                                {isGenerating ? 'Fabricating...' : 'Generate Visual'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LOG RENDERER (Handles Markdown Snippets) ---
const LogRenderer: React.FC<{ message: string }> = ({ message }) => {
    const parts = message ? message.split(/```/) : [];
    if (parts.length < 2) return <span>{message}</span>;
    return (
        <div className="w-full">
            {parts.map((part, index) => (
                index % 2 === 0 ? <span key={index}>{part}</span> : (
                    <div key={index} className="mt-1 mb-1 bg-[#111] border border-[#222] p-2 rounded relative group overflow-x-auto">
                        <pre className="text-[9px] font-mono text-[#42be65] whitespace-pre-wrap font-bold">{part.trim()}</pre>
                    </div>
                )
            ))}
        </div>
    );
};

const ActiveCommandsList = () => {
    const { actionRegistry } = useSystemMind();
    const actions = Object.entries(actionRegistry);
    
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg overflow-hidden flex flex-col h-full">
            <div className="px-4 py-2 border-b border-[#1f1f1f] flex justify-between items-center bg-[#111]">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Command className="w-3 h-3 text-[#9d4edd]" /> Voice Command Map
                </span>
                <HelpCircle className="w-3 h-3 text-gray-600" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* System Level Global Commands */}
                <div className="space-y-2">
                    <div className="text-[8px] text-gray-600 font-bold uppercase tracking-widest border-b border-[#1f1f1f] pb-1">Global Core</div>
                    <div className="text-[10px] text-gray-400 font-mono">"Switch to [Mode] mode"</div>
                    <div className="text-[10px] text-gray-400 font-mono">"Change theme to [Theme]"</div>
                    <div className="text-[10px] text-gray-400 font-mono">"Draft [Language] code for [Function]"</div>
                </div>

                {/* Local Injected Commands */}
                {actions.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div className="text-[8px] text-[#9d4edd] font-bold uppercase tracking-widest border-b border-[#9d4edd]/20 pb-1">Module Context</div>
                        {actions.map(([id, def]: [string, any]) => (
                            <div key={id} className="flex flex-col gap-0.5 group">
                                <div className="text-[10px] text-[#22d3ee] font-bold font-mono group-hover:text-white transition-colors">"{def.description}"</div>
                                <div className="text-[8px] text-gray-600 font-mono uppercase tracking-tighter">ID: {id}</div>
                            </div>
                        ))}
                    </div>
                )}
                
                {actions.length === 0 && (
                    <div className="text-[9px] text-gray-700 italic font-mono pt-4 text-center">No local capabilities detected in this sector.</div>
                )}
            </div>
        </div>
    );
};

const VoiceMode: React.FC = () => {
  const { voice, setVoiceState, user, addLog, system } = useAppStore();
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  
  const [userFreqs, setUserFreqs] = useState<Uint8Array | null>(null);
  const [agentFreqs, setAgentFreqs] = useState<Uint8Array | null>(null);

  const currentAgent = HIVE_AGENTS[voice.voiceName] || HIVE_AGENTS['Puck'];

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
  }, [voice.transcripts]);

  useEffect(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [system.logs]);

  const toggleSession = async () => {
    if (voice.isActive) {
        setVoiceState({ isActive: false });
        liveSession.disconnect();
    } else {
        setVoiceState({ isConnecting: true, error: null });
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) await promptSelectKey();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setVoiceState({ isActive: true, isConnecting: true });
        } catch (err: any) {
            console.error(err);
            setVoiceState({ isConnecting: false, error: err.name === 'NotAllowedError' ? "Microphone Access Denied." : "Uplink Failed: " + err.message });
        }
    }
  };

  const handleGenerateAgentAvatar = async () => {
      if (isGeneratingAvatar || !voice.voiceName) return;
      setIsGeneratingAvatar(true);
      try {
          const avatarUrl = await generateAvatar(currentAgent.role, voice.voiceName);
          setVoiceState(prev => ({ agentAvatars: { ...prev.agentAvatars, [voice.voiceName]: avatarUrl } }));
          addLog('SUCCESS', `VISUAL_CORE: Identity Fabricated for ${voice.voiceName}`);
      } catch (err: any) {
          addLog('ERROR', `AVATAR_GEN_FAIL: ${err.message}`);
      } finally { setIsGeneratingAvatar(false); }
  };

  const saveToMemory = async () => {
      if (voice.transcripts.length === 0) return;
      const text = voice.transcripts.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const file = new File([blob], `voice-log-${Date.now()}.txt`, { type: 'text/plain' });
      try {
          await neuralVault.saveArtifact(file, { classification: 'VOICE_LOG', ambiguityScore: 0, entities: ['Transcript', voice.voiceName], summary: 'Conversational log with Voice Core.' });
          addLog('SUCCESS', 'Transcript archived to Memory Core.');
      } catch (e) { addLog('ERROR', 'Failed to save transcript.'); }
  };

  const downloadTranscript = () => {
      if (voice.transcripts.length === 0) return;
      const text = voice.transcripts.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `neural-voice-log-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const voiceLogs = system.logs.filter(l => l.message?.startsWith('[') || l.message?.includes('VOICE') || l.message?.includes('Asset Generated') || l.message?.includes('Hardware Scan'));
  const isUserSpeaking = userFreqs && userFreqs.some(f => f > 10);
  const isAgentSpeaking = agentFreqs && agentFreqs.some(f => f > 10);

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
      <div className="h-16 flex justify-between items-center px-8 border-b border-[#1f1f1f] bg-[#0a0a0a] z-20 shrink-0">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <Activity className={`w-3 h-3 ${voice.isActive ? 'text-[#9d4edd] animate-pulse' : 'text-gray-600'}`} />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Neural Voice Core</span>
              </div>
              <div className="text-xs font-mono text-[#22d3ee] uppercase tracking-wider">
                  {voice.isConnecting ? 'ESTABLISHING HANDSHAKE...' : voice.isActive ? 'SYSTEM ONLINE' : 'STANDBY MODE'}
              </div>
          </div>
          <div className="flex items-center gap-4">
               <div className="flex gap-2">
                   <button onClick={saveToMemory} className="p-2 border border-[#333] hover:border-[#9d4edd] hover:text-[#9d4edd] text-gray-500 rounded transition-colors" title="Save to Memory"><Save className="w-4 h-4" /></button>
                   <button onClick={downloadTranscript} className="p-2 border border-[#333] hover:border-[#9d4edd] hover:text-[#9d4edd] text-gray-500 rounded transition-colors" title="Download Log"><Download className="w-4 h-4" /></button>
               </div>
               <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 bg-[#111] border border-[#333] p-1.5 rounded">
                       <Settings className="w-3 h-3 text-gray-500" />
                       <select value={voice.voiceName} onChange={(e) => setVoiceState({ voiceName: e.target.value })} disabled={voice.isActive} className="bg-transparent text-[10px] font-mono text-[#9d4edd] outline-none cursor-pointer uppercase text-right">
                            {Object.keys(HIVE_AGENTS).map(name => (<option key={name} value={name}>{name}</option>))}
                        </select>
                   </div>
                   <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-1 mr-1">{currentAgent.role}</div>
               </div>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10 w-full max-w-[1600px] mx-auto px-8 gap-8 min-h-0 py-8">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,20,20,0.5)_0%,transparent_70%)] pointer-events-none"></div>
         
         {/* OPERATOR */}
         <div className="flex-1 h-full max-h-[500px] bg-[#050505]/30 border border-[#1f1f1f] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#22d3ee]/20"></div>
            <div className="absolute top-6 left-6 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-[#22d3ee]" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Operator Station</span>
                </div>
                <div className="text-xs font-bold text-white font-mono uppercase">{user.displayName || 'Architect'}</div>
            </div>
            <AvatarCore image={user.avatar} freqs={userFreqs} color="#22d3ee" isAgent={false} />
            <div className="absolute bottom-10 flex gap-4 text-[9px] font-mono text-gray-600 uppercase">
                <div className="flex items-center gap-1"><Signal className="w-3 h-3" /> Input Active</div>
                <div className="flex items-center gap-1"><Globe className="w-3 h-3" /> Secure Link</div>
            </div>
         </div>

         {/* UPLINK CONTROL */}
         <div className="w-32 flex flex-col items-center justify-center relative gap-8 z-20">
            <div className="h-24 w-px bg-[#333] relative overflow-hidden">
                {voice.isActive && (<motion.div className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#22d3ee] to-[#9d4edd]" animate={{ height: ['0%', '100%', '0%'], top: ['100%', '0%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />)}
            </div>
            <button onClick={toggleSession} disabled={voice.isConnecting} className={`relative flex items-center justify-center transition-all duration-700 ease-out group ${voice.isActive ? 'w-20 h-20' : 'w-24 h-24'}`}>
                <div className={`absolute inset-0 rounded-full border border-current opacity-30 transition-all duration-700 ${voice.isActive ? 'border-red-500 scale-100 rotate-180' : 'border-[#9d4edd] scale-90 group-hover:scale-110'}`}></div>
                <div className={`absolute inset-0 rounded-full bg-current opacity-10 blur-2xl transition-all duration-700 ${voice.isActive ? 'bg-red-500' : 'bg-[#9d4edd] group-hover:opacity-30'}`}></div>
                <div className="relative z-10 flex flex-col items-center gap-1">
                    {voice.isConnecting ? <Activity className="w-8 h-8 text-[#9d4edd] animate-spin" /> : voice.isActive ? <Power className="w-8 h-8 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)]" /> : <Mic className="w-8 h-8 text-[#9d4edd] drop-shadow-[0_0_15px_rgba(157,78,221,0.8)]" />}
                </div>
            </button>
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{voice.isActive ? 'Terminate' : 'Initialize'}</div>
            <div className="h-24 w-px bg-[#333] relative overflow-hidden">
                {voice.isActive && (<motion.div className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#9d4edd] to-[#22d3ee]" animate={{ height: ['0%', '100%', '0%'], top: ['100%', '0%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />)}
            </div>
         </div>

         {/* NEURAL CORE */}
         <div className="flex-1 h-full max-h-[500px] bg-[#050505]/30 border border-[#1f1f1f] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#9d4edd]/20"></div>
             <div className="absolute top-6 right-6 flex flex-col gap-1 items-end">
                <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3 text-[#9d4edd]" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Neural Core</span>
                </div>
                <div className="text-xs font-bold text-white font-mono uppercase">{currentAgent.name}</div>
                <span className="text-[8px] font-mono text-[#9d4edd] uppercase tracking-wider bg-[#9d4edd]/10 px-1 rounded">{currentAgent.role}</span>
            </div>
            <AvatarCore image={voice.agentAvatars[voice.voiceName] || null} freqs={agentFreqs} color="#9d4edd" isAgent={true} onGenerate={handleGenerateAgentAvatar} isGenerating={isGeneratingAvatar} />
            <div className="absolute bottom-10 flex gap-4 text-[9px] font-mono text-gray-600 uppercase">
                <div className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> Audio Output</div>
                <div className="flex items-center gap-1"><Layers className="w-3 h-3" /> Context Active</div>
            </div>
         </div>
      </div>

      <div className="h-72 border-t border-[#1f1f1f] bg-[#050505] relative z-20 shrink-0 flex">
          <div className="w-1/4 border-r border-[#1f1f1f] flex flex-col">
              <ActiveCommandsList />
          </div>
          <div className="flex-1 border-r border-[#1f1f1f] flex flex-col">
              <div className="px-4 py-2 border-b border-[#1f1f1f] flex justify-between items-center bg-[#0a0a0a]">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2"><FileText className="w-3 h-3" /> System Transcript</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-black/40" ref={scrollRef}>
                    <AnimatePresence>
                        {voice.transcripts.map((t, i) => (
                            <motion.div key={`${i}-${t.role}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`text-sm font-mono leading-relaxed flex gap-3 ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                                <span className="text-[9px] opacity-50 uppercase tracking-wide border px-1 rounded border-current h-fit mt-0.5">{t.role === 'user' ? 'OP' : 'AI'}</span>
                                <span className="flex-1">{t.text}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
              </div>
          </div>
          <div className="w-1/3 flex flex-col bg-[#080808]">
              <div className="px-4 py-2 border-b border-[#1f1f1f] flex justify-between items-center bg-[#0a0a0a]">
                  <span className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-widest flex items-center gap-2"><Terminal className="w-3 h-3" /> Control Feed</span>
                  <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse"></div>
                      <span className="text-[9px] font-mono text-gray-600">LOOP: ACTIVE</span>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 font-mono text-[10px]" ref={logRef}>
                  {voiceLogs.map((log) => (
                      <motion.div key={log.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 border-l-2 border-[#1f1f1f] pl-3 py-1 hover:bg-[#111] transition-colors hover:border-[#9d4edd] items-start">
                          <span className="text-gray-600 whitespace-nowrap mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                          <span className={`${log.level === 'SUCCESS' ? 'text-green-400' : 'text-[#9d4edd]'} flex-1`}><LogRenderer message={log.message} /></span>
                      </motion.div>
                  ))}
                  <div className="h-3 w-1.5 bg-[#9d4edd] animate-pulse mt-2"></div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default VoiceMode;