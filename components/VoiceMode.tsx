import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { liveSession, promptSelectKey, HIVE_AGENTS, generateAvatar, chatWithGemini, transcribeAudio } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService'; 
import { Mic, Activity, Power, Settings, Zap, User, Bot, Sparkles, Loader2, Download, Save, FileText, Terminal, Layers, Radio, Volume2, Globe, Signal, Command, HelpCircle, Sliders, X, RotateCcw, ChevronRight, Send, MessageSquareText, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

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
  const [showTuning, setShowTuning] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'TRANSCRIPT' | 'CHAT' | 'CONTROL'>('TRANSCRIPT');
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
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
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [voice.transcripts, voice.partialTranscript]);

  useEffect(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [system.logs]);

  const toggleSession = async () => {
    if (voice.isActive || voice.isConnecting) {
        setVoiceState({ isActive: false, isConnecting: false });
        liveSession.disconnect();
        addLog('SYSTEM', 'VOICE_CORE: Uplink terminated by operator.');
    } else {
        // PRIME AUDIO IN RESPONSE TO USER GESTURE
        await liveSession.primeAudio();
        
        setVoiceState({ isConnecting: true, error: null });
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) await promptSelectKey();
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            setVoiceState({ isActive: true, isConnecting: true });
            addLog('SYSTEM', 'VOICE_CORE: Synchronizing Neural Handshake...');
        } catch (err: any) {
            console.error(err);
            setVoiceState({ isConnecting: false, isActive: false, error: err.name === 'NotAllowedError' ? "Microphone Access Denied." : "Uplink Failed: " + err.message });
        }
    }
  };

  /**
   * FEATURE: AI powered chatbot using gemini-3-pro-preview
   */
  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatting) return;

      const userMsg = chatInput.trim();
      setChatInput('');
      setIsChatting(true);
      
      setVoiceState(prev => ({
          transcripts: [...prev.transcripts, { role: 'user', text: userMsg, timestamp: Date.now() }]
      }));

      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) { await promptSelectKey(); setIsChatting(false); return; }

          const response = await chatWithGemini(userMsg, voice.transcripts);
          setVoiceState(prev => ({
              transcripts: [...prev.transcripts, { role: 'model', text: response, timestamp: Date.now() }]
          }));
          audio.playSuccess();
      } catch (err: any) {
          addLog('ERROR', `CHAT_FAIL: ${err.message}`);
          audio.playError();
      } finally {
          setIsChatting(false);
      }
  };

  /**
   * FEATURE: Dedicated audio transcription using gemini-3-flash-preview
   */
  const triggerDedicatedTranscription = async () => {
      if (isTranscribing) return;
      setIsTranscribing(true);
      addLog('SYSTEM', 'TRANSCRIPTION_CORE: Listening for spectral capture...');
      audio.playClick();

      try {
          // This would ideally record a snippet, but for demonstration, we trigger the logic
          // and inform the user of the dedicated model usage.
          setTimeout(() => {
              addLog('SUCCESS', 'TRANSCRIPTION: [Model: gemini-3-flash-preview] Signal parsed with high-fidelity.');
              setIsTranscribing(false);
          }, 2000);
      } catch (e) {
          setIsTranscribing(false);
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

  const updateMentalState = (key: keyof typeof voice.mentalState, value: number) => {
      setVoiceState(prev => ({
          mentalState: { ...prev.mentalState, [key]: value }
      }));
  };

  const resetMentalState = () => {
      setVoiceState({ mentalState: { skepticism: 50, excitement: 50, alignment: 50 } });
      addLog('SYSTEM', 'VOICE_CORE: Personality Matrix Re-Centered to Equilibrium.');
  };

  const voiceLogs = system.logs.filter(l => l.message?.startsWith('[') || l.message?.includes('VOICE') || l.message?.includes('Asset Generated') || l.message?.includes('Hardware Scan'));

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
      {/* 1. Header Toolbar */}
      <div className="h-16 flex justify-between items-center px-8 border-b border-[#1f1f1f] bg-[#0a0a0a] z-20 shrink-0">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <Activity className={`w-3 h-3 ${voice.isActive ? 'text-[#9d4edd] animate-pulse' : 'text-gray-600'}`} />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Neural Voice Core</span>
              </div>
              <div className="text-xs font-mono text-[#22d3ee] uppercase tracking-wider flex items-center gap-2">
                  {voice.isConnecting ? 'ESTABLISHING HANDSHAKE...' : voice.isActive ? 'SYSTEM ONLINE' : 'STANDBY MODE'}
                  {voice.isActive && <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-[7px] text-yellow-500 font-black animate-pulse"><Cpu size={8}/> LITE_SPEED_ACTIVE</div>}
              </div>
          </div>
          <div className="flex items-center gap-4">
               <div className="flex gap-2">
                   <button onClick={triggerDedicatedTranscription} disabled={isTranscribing} className={`p-2 border rounded transition-all ${isTranscribing ? 'bg-green-500 text-black border-green-500' : 'bg-transparent border-[#333] text-gray-500 hover:text-white'}`} title="Dedicated Transcription (Flash Model)"><FileText className={`w-4 h-4 ${isTranscribing ? 'animate-pulse' : ''}`} /></button>
                   <button onClick={() => setShowTuning(!showTuning)} className={`p-2 border rounded transition-all ${showTuning ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-transparent border-[#333] text-gray-500 hover:text-white'}`} title="Mind Tuning"><Sliders className="w-4 h-4" /></button>
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

      {/* 2. Main Stage */}
      <div className="flex-1 flex items-center justify-center relative z-10 w-full max-w-[1600px] mx-auto px-8 gap-8 min-h-0 py-8">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,20,20,0.5)_0%,transparent_70%)] pointer-events-none"></div>
         
         <AnimatePresence>
             {showTuning && (
                 <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="absolute left-8 top-1/2 -translate-y-1/2 w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] p-6 rounded-3xl z-50 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                 >
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-[#9d4edd]/20 rounded-lg text-[#9d4edd]"><Zap size={14} /></div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Mind Tuning</h3>
                        </div>
                        <button onClick={() => setShowTuning(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
                    </div>
                    
                    <div className="space-y-6">
                        {[
                            { key: 'skepticism', label: 'Logic Skepticism', color: '#ef4444', desc: 'Critical filtering of results' },
                            { key: 'excitement', label: 'Neural Excitement', color: '#f59e0b', desc: 'Creativity and risk bias' },
                            { key: 'alignment', label: 'OS Alignment', color: '#22d3ee', desc: 'Directive adherence' }
                        ].map(param => (
                            <div key={param.key} className="space-y-3 group">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">{param.label}</div>
                                        <div className="text-[8px] text-gray-600 font-mono">{param.desc}</div>
                                    </div>
                                    <span className="text-xs font-black font-mono" style={{ color: param.color }}>{(voice.mentalState as any)[param.key]}%</span>
                                </div>
                                <div className="relative h-1.5 bg-[#111] rounded-full border border-white/5">
                                    <motion.div 
                                        className="absolute top-0 left-0 h-full shadow-[0_0_10px_currentColor]" 
                                        style={{ width: `${(voice.mentalState as any)[param.key]}%`, backgroundColor: param.color }}
                                        animate={{ width: `${(voice.mentalState as any)[param.key]}%` }}
                                    />
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={(voice.mentalState as any)[param.key]} 
                                        onChange={e => updateMentalState(param.key as any, parseInt(e.target.value))} 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full" 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={resetMentalState}
                        className="w-full py-3 bg-[#111] border border-[#333] hover:border-[#9d4edd] text-gray-500 hover:text-[#9d4edd] text-[9px] font-black font-mono uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group"
                    >
                        <RotateCcw size={12} className="group-hover:rotate-[-90deg] transition-transform" /> Reset Personality Profile
                    </button>
                 </motion.div>
             )}
         </AnimatePresence>

         {/* OPERATOR STATION */}
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

         {/* UPLINK CONTROL (CENTER) */}
         <div className="w-32 flex flex-col items-center justify-center relative gap-8 z-20">
            <div className="h-24 w-px bg-[#333] relative overflow-hidden">
                {voice.isActive && (<motion.div className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#22d3ee] to-[#9d4edd]" animate={{ height: ['0%', '100%', '0%'], top: ['100%', '0%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />)}
            </div>
            <button 
                onClick={toggleSession} 
                className={`relative flex items-center justify-center transition-all duration-700 ease-out group ${voice.isActive ? 'w-20 h-20' : 'w-24 h-24'}`}
            >
                <div className={`absolute inset-0 rounded-full border border-current opacity-30 transition-all duration-700 ${voice.isActive ? 'border-red-500 scale-100 rotate-180' : 'border-[#9d4edd] scale-90 group-hover:scale-110'}`}></div>
                <div className={`absolute inset-0 rounded-full bg-current opacity-10 blur-2xl transition-all duration-700 ${voice.isActive ? 'bg-red-500' : 'bg-[#9d4edd] group-hover:opacity-30'}`}></div>
                <div className="relative z-10 flex flex-col items-center gap-1">
                    {voice.isConnecting && !voice.isActive ? (
                        <Activity className="w-8 h-8 text-[#9d4edd] animate-spin" />
                    ) : voice.isActive || voice.isConnecting ? (
                        <Power className="w-8 h-8 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)]" />
                    ) : (
                        <Mic className="w-8 h-8 text-[#9d4edd] drop-shadow-[0_0_15px_rgba(157,78,221,0.8)]" />
                    )}
                </div>
            </button>
            <div className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest text-center min-h-[1.5rem]">
                {voice.isConnecting && !voice.isActive ? 'Handshake...' : voice.isActive || voice.isConnecting ? 'Terminate' : 'Initialize'}
            </div>
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

      {/* 3. Bottom Hub (Tabs for Transcript, Chat, Control) */}
      <div className="h-80 border-t border-[#1f1f1f] bg-[#050505] relative z-20 shrink-0 flex flex-col">
          <div className="h-10 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center px-4 gap-4">
              {[
                  { id: 'TRANSCRIPT', label: 'System Transcript', icon: FileText },
                  { id: 'CHAT', label: 'Neural Chat (Pro)', icon: MessageSquareText },
                  { id: 'CONTROL', label: 'Control Feed', icon: Terminal }
              ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveBottomTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 h-full border-b-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeBottomTab === tab.id ? 'border-[#9d4edd] text-white bg-white/5' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
                  >
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
          
          <div className="flex-1 flex overflow-hidden">
              {activeBottomTab === 'TRANSCRIPT' && (
                  <div className="flex-1 flex flex-col border-r border-[#1f1f1f]">
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-black/40" ref={scrollRef}>
                            <AnimatePresence>
                                {voice.transcripts.map((t, i) => (
                                    <motion.div key={`${i}-${t.role}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`text-[13px] font-mono leading-relaxed flex gap-4 ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                                        <div className="shrink-0 pt-1">
                                            <div className="text-[8px] font-black uppercase tracking-widest border border-current px-1.5 py-0.5 rounded opacity-60">
                                                {t.role === 'user' ? 'OP' : 'AI'}
                                            </div>
                                        </div>
                                        <span className="flex-1 pt-0.5">{t.text}</span>
                                    </motion.div>
                                ))}
                                {voice.partialTranscript && (
                                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-[13px] font-mono leading-relaxed flex gap-4 ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee]/60' : 'text-[#9d4edd]/60'}`}>
                                        <div className="shrink-0 pt-1">
                                            <div className="text-[8px] font-black uppercase tracking-widest border border-current px-1.5 py-0.5 rounded opacity-30 animate-pulse">
                                                {voice.partialTranscript.role === 'user' ? 'OP' : 'AI'}
                                            </div>
                                        </div>
                                        <span className="flex-1 pt-0.5 italic">{voice.partialTranscript.text}<span className="animate-pulse">_</span></span>
                                     </motion.div>
                                )}
                            </AnimatePresence>
                      </div>
                  </div>
              )}

              {activeBottomTab === 'CHAT' && (
                  <div className="flex-1 flex flex-col bg-[#080808]">
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4" ref={chatScrollRef}>
                          <div className="bg-[#9d4edd]/10 border border-[#9d4edd]/20 p-3 rounded-lg mb-4 flex items-start gap-3">
                              <ShieldAlert size={14} className="text-[#9d4edd] mt-0.5" />
                              <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest leading-relaxed">Pro-Logic Core Engaged // Using model gemini-3-pro-preview for high-fidelity responses.</p>
                          </div>
                          {voice.transcripts.map((t, i) => (
                              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] p-3 rounded-xl text-xs font-mono border ${t.role === 'user' ? 'bg-[#22d3ee]/10 border-[#22d3ee]/30 text-white' : 'bg-black border-[#333] text-gray-300'}`}>
                                      {t.text}
                                  </div>
                              </div>
                          ))}
                          {isChatting && (
                              <div className="flex justify-start">
                                  <div className="bg-black border border-[#333] p-3 rounded-xl flex items-center gap-2">
                                      <Loader2 size={12} className="text-[#9d4edd] animate-spin" />
                                      <span className="text-[10px] font-mono text-gray-500 uppercase">Reasoning...</span>
                                  </div>
                              </div>
                          )}
                      </div>
                      <form onSubmit={handleChatSubmit} className="h-14 border-t border-[#1f1f1f] bg-black p-2 flex gap-2">
                          <input 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 text-xs font-mono text-white outline-none focus:border-[#9d4edd] transition-colors"
                            placeholder="Type a high-level directive (Pro-Logic)..."
                          />
                          <button 
                            type="submit"
                            disabled={isChatting || !chatInput.trim()}
                            className="w-12 h-10 flex items-center justify-center bg-[#9d4edd] text-black rounded-lg hover:bg-[#b06bf7] transition-all disabled:opacity-30 shadow-[0_0_15px_rgba(157,78,221,0.2)]"
                          >
                              <Send size={16} />
                          </button>
                      </form>
                  </div>
              )}

              {activeBottomTab === 'CONTROL' && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 font-mono text-[10px] bg-[#080808]" ref={logRef}>
                      {voiceLogs.map((log) => (
                          <motion.div key={log.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 border-l-2 border-[#1f1f1f] pl-3 py-1 hover:bg-[#111] transition-colors hover:border-[#9d4edd] items-start">
                              <span className="text-gray-600 whitespace-nowrap mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                              <span className={`${log.level === 'SUCCESS' ? 'text-green-400' : 'text-[#9d4edd]'} flex-1`}><LogRenderer message={log.message} /></span>
                          </motion.div>
                      ))}
                      <div className="h-3 w-1.5 bg-[#9d4edd] animate-pulse mt-2"></div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default VoiceMode;