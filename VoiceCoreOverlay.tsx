import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    Play, Pause, Download, FileText, Activity, Terminal, 
    GripHorizontal, Maximize2, Minimize2, Zap, Radio, Mic,
    MessageSquare, Waves, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

const MiniWaveform = ({ isActive }: { isActive: boolean }) => (
    <div className="flex items-center gap-0.5 h-3">
        {[1,2,3,4,5].map(i => (
            <motion.div
                key={i}
                animate={isActive ? { height: [2, 12, 2] } : { height: 2 }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className={`w-0.5 rounded-full ${isActive ? 'bg-[#9d4edd]' : 'bg-gray-700'}`}
            />
        ))}
    </div>
);

const VoiceCoreOverlay = () => {
  const { voice, actions } = useAppStore();
  const { setVoiceState } = actions;
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voice.transcripts, voice.partialTranscript]);

  const handleDownloadTxt = () => {
    const text = voice.transcripts.map(t => `${(t.role || 'USER').toUpperCase()}: ${t.text}`).join('\n\n');
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `voice_session_${Date.now()}.txt`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    audio.playSuccess();
  };

  if (!voice.isActive && !voice.isConnecting) return null;

  return (
    <motion.div
      drag={true}
      dragMomentum={false}
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        fixed z-[9999] bottom-24 left-6
        flex flex-col
        bg-[#0a0a0a]/90 border border-white/10 backdrop-blur-2xl
        rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]
        pointer-events-auto
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
      `}
      style={{
          width: expanded ? '400px' : '260px',
          height: expanded ? '280px' : '52px',
      }}
    >
        {/* Prime Time Header */}
        <div 
          className="flex items-center justify-between p-3 border-b border-white/5 bg-white/[0.02] cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <GripHorizontal className="w-4 h-4 text-gray-700 flex-shrink-0" />
            <div className="flex items-center gap-2 overflow-hidden">
                <div className={`p-1.5 rounded-lg ${voice.isActive ? 'bg-[#9d4edd]/20 text-[#9d4edd]' : 'bg-white/5 text-gray-600'}`}>
                    <Radio size={12} className={voice.isActive ? 'animate-pulse' : ''} />
                </div>
                <div className="flex flex-col">
                    <span className="font-mono text-[7px] text-[#9d4edd] font-black tracking-[0.2em] truncate uppercase leading-none">
                        {voice.isConnecting ? 'Handshaking...' : 'Handshake_Stable'}
                    </span>
                    <span className="text-[6px] text-gray-600 font-mono tracking-widest uppercase mt-0.5">Protocol_Zenith.v1</span>
                </div>
            </div>
          </div>

          <div className="flex gap-2 items-center pl-2" onPointerDown={(e) => e.stopPropagation()}>
             <MiniWaveform isActive={voice.isActive} />
             <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg">
                {expanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
             </button>
             <button onClick={() => setVoiceState({ isActive: false })} className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-lg transition-all">
                <X size={12} />
             </button>
          </div>
        </div>

        {/* Dynamic Telemetry View */}
        <AnimatePresence>
            {expanded && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="p-3 flex flex-col h-full gap-3 overflow-hidden" 
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex gap-3 h-full min-h-0">
                  {/* Neural Transcript Loop */}
                  <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[8px] text-gray-400 overflow-y-auto custom-scrollbar flex flex-col shadow-inner" ref={scrollRef}>
                    <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 text-[#9d4edd] font-black uppercase tracking-widest">
                            <Terminal size={9} /> Neural_Stream
                        </div>
                        <span className="text-[6px] opacity-30 font-bold tracking-tighter">AES256</span>
                    </div>
                    <div className="flex-1 space-y-2">
                        {voice.transcripts.map((t, i) => (
                            <div key={i} className={`flex gap-1.5 animate-in slide-in-from-left-1 ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                                <span className="opacity-40 shrink-0 font-black">[{t.role === 'user' ? 'OP' : 'AI'}]</span>
                                <span className="flex-1 text-gray-300 leading-relaxed italic">{(t.text || '').toString()}</span>
                            </div>
                        ))}
                        {voice.partialTranscript && (
                            <div className={`italic opacity-50 flex gap-1.5 animate-pulse ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                                <span className="shrink-0 font-black">[...]</span>
                                <span className="flex-1">{(voice.partialTranscript.text || '').toString()}</span>
                            </div>
                        )}
                        {voice.transcripts.length === 0 && !voice.partialTranscript && (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-2">
                                <Waves size={20} />
                                <span className="text-[6px] uppercase tracking-widest font-black">Quiet Orbit</span>
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="w-12 flex flex-col gap-1.5 shrink-0">
                       <button 
                          onClick={handleDownloadTxt}
                          className="flex flex-col items-center justify-center gap-1 bg-[#111] hover:bg-[#9d4edd]/10 border border-white/5 text-gray-600 hover:text-[#9d4edd] py-2 rounded-xl transition-all group"
                       >
                          <FileText size={14} className="group-hover:scale-110 transition-transform" />
                          <span className="text-[6px] uppercase font-black tracking-widest">Export</span>
                       </button>
                       <div className="flex-1 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center opacity-20 hover:opacity-100 transition-opacity hover:border-[#9d4edd]/30">
                           <Zap size={14} className="text-[#9d4edd]" />
                           <span className="text-[6px] font-black font-mono mt-1 uppercase tracking-widest">Core</span>
                       </div>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
  );
};

export default VoiceCoreOverlay;