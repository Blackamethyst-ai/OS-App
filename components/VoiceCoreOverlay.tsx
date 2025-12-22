import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
// Added Zap to lucide-react imports
import { Play, Pause, Download, FileText, Activity, Terminal, GripHorizontal, Maximize2, Minimize2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceCoreOverlay = () => {
  const { voice, setVoiceState } = useAppStore();
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voice.transcripts, voice.partialTranscript]);

  const handleDownloadTxt = () => {
    const text = voice.transcripts.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n');
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "metaventions_voice_log.txt";
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  if (!voice.isActive && !voice.isConnecting) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        fixed z-[9999] bottom-24 left-6
        flex flex-col
        bg-[#050505]/95 border border-[#9d4edd]/40 backdrop-blur-xl
        rounded-xl overflow-hidden shadow-[0_0_30px_rgba(157,78,221,0.15)]
        pointer-events-auto
        transition-[width,height] duration-300 ease-out
      `}
      style={{
          width: expanded ? '500px' : '300px',
          height: expanded ? '250px' : '48px',
      }}
    >
        {/* HEADER */}
        <div 
          className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <GripHorizontal className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div className="flex items-center gap-2 overflow-hidden">
                <Activity className={`w-3.5 h-3.5 flex-shrink-0 ${voice.isActive ? 'text-[#9d4edd] animate-pulse' : 'text-gray-500'}`} />
                <span className="font-mono text-[9px] text-[#9d4edd] tracking-widest truncate uppercase">
                    Voice Uplink // {voice.isConnecting ? 'HANDSHAKE' : 'STABLE'}
                </span>
            </div>
          </div>

          <div className="flex gap-2 items-center pl-2" onPointerDown={(e) => e.stopPropagation()}>
             <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white transition-colors">
                {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
             </button>
             <button onClick={() => setVoiceState({ isActive: false })} className="hover:text-red-500 text-gray-500 transition-colors">
                <Pause size={14} />
             </button>
          </div>
        </div>

        {/* CONTENT */}
        {expanded && (
          <div className="p-4 flex flex-col h-full gap-4 overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex gap-4 h-full min-h-0">
              {/* Transcript Stream */}
              <div className="flex-1 bg-black/50 border border-white/5 rounded p-3 font-mono text-[10px] text-gray-400 overflow-y-auto custom-scrollbar flex flex-col" ref={scrollRef}>
                <div className="text-[#9d4edd] mb-2 border-b border-[#9d4edd]/20 pb-1 flex items-center gap-2 shrink-0 uppercase font-black tracking-widest">
                  <Terminal size={10} /> Live Output
                </div>
                <div className="flex-1 space-y-2">
                    {voice.transcripts.map((t, i) => (
                        <div key={i} className={`hover:text-white transition-colors flex gap-2 ${t.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                            <span className="opacity-50 shrink-0">[{new Date(t.timestamp!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                            <span className="flex-1">{t.text}</span>
                        </div>
                    ))}
                    {voice.partialTranscript && (
                        <div className={`italic opacity-50 flex gap-2 ${voice.partialTranscript.role === 'user' ? 'text-[#22d3ee]' : 'text-[#9d4edd]'}`}>
                            <span className="shrink-0">[...]</span>
                            <span className="flex-1">{voice.partialTranscript.text}_</span>
                        </div>
                    )}
                </div>
              </div>

              {/* Tools Sidebar */}
              <div className="w-24 flex flex-col gap-2 shrink-0">
                   <button 
                      onClick={handleDownloadTxt}
                      className="flex flex-col items-center justify-center gap-1 bg-[#111] hover:bg-white/5 border border-white/10 text-gray-500 hover:text-white py-3 rounded transition-all"
                   >
                      <FileText size={16} />
                      <span className="text-[7px] uppercase font-black">Export</span>
                   </button>
                   <div className="flex-1 border border-dashed border-white/5 rounded flex flex-col items-center justify-center opacity-20">
                       <Zap size={16} className="text-[#9d4edd]" />
                       <span className="text-[6px] font-mono mt-1">HIVE_UP</span>
                   </div>
              </div>
            </div>
          </div>
        )}
    </motion.div>
  );
};

export default VoiceCoreOverlay;