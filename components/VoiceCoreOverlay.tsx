
import React, { useState, useEffect } from 'react';
import { useSystemMind } from '../stores/useSystemMind';
import { Play, Pause, Download, FileText, Activity, Terminal, GripHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceCoreOverlay = () => {
  const { voiceActive, toggleVoice, currentLocation } = useSystemMind();
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Fake Transcript Data for the demo
  const transcript = [
    "Getting the balance right—data centre growth...",
    "Energy transition is critical for sovereign...",
    "Systems must maintain 99.9% uptime...",
    " analyzing local grid dependencies."
  ];

  // Logic: Handle Text Download
  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([transcript.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "neural_briefing_log.txt";
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  // Logic: Handle Audio Download (Mock)
  const handleDownloadAudio = () => {
    alert("SYSTEM: Audio Sequence Extracted to Local Drive.");
  };

  if (!voiceActive) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        fixed z-[9999] bottom-6 left-6
        flex flex-col
        bg-[#050505]/95 border border-purple-500/40 backdrop-blur-xl
        rounded-xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)]
        pointer-events-auto
        transition-[width,height] duration-300 ease-out
      `}
      style={{
          width: expanded ? '600px' : '320px',
          height: expanded ? '280px' : '56px',
      }}
    >
        {/* HEADER - Drag Handle */}
        <div 
          className="flex items-center justify-between p-3 border-b border-purple-500/20 bg-white/5 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <GripHorizontal className="w-4 h-4 text-purple-500/50 flex-shrink-0" />
            <div 
                className="flex items-center gap-2 overflow-hidden"
                onDoubleClick={() => setExpanded(!expanded)}
            >
                <Activity className={`w-4 h-4 flex-shrink-0 ${isPlaying ? 'text-green-400 animate-pulse' : 'text-purple-400'}`} />
                <span className="font-mono text-[10px] text-purple-300 tracking-widest truncate">
                NEURAL_BRIEFING // {currentLocation}
                </span>
            </div>
          </div>

          <div 
            className="flex gap-2 items-center pl-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
             <button 
                onClick={() => setExpanded(!expanded)} 
                className="text-gray-500 hover:text-white transition-colors"
                title={expanded ? "Minimize" : "Expand"}
             >
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
             </button>
             <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="hover:text-white text-purple-400 transition-colors"
             >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
             </button>
          </div>
        </div>

        {/* EXPANDED CONTENT */}
        {expanded && (
          <div className="p-4 flex flex-col h-full gap-4 overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
            
            {/* Visualizer & Transcript Split */}
            <div className="flex gap-4 h-full min-h-0">
              
              {/* Left: Waveform & Controls */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {/* CSS Fake Visualizer */}
                <div className="flex-1 bg-black/50 border border-purple-500/20 rounded flex items-center justify-center gap-1 px-4 min-h-0">
                  {[...Array(20)].map((_, i) => (
                     <div 
                       key={i} 
                       className={`w-1 bg-purple-500/60 rounded-full transition-all duration-75`}
                       style={{ 
                         height: isPlaying ? `${Math.random() * 100}%` : '20%',
                         opacity: isPlaying ? 1 : 0.3 
                        }}
                     />
                  ))}
                </div>
                
                {/* Extraction Buttons */}
                <div className="flex gap-2 mt-auto pt-2">
                   <button 
                      onClick={handleDownloadAudio}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 text-purple-200 text-[10px] uppercase tracking-wider py-2 rounded transition-colors whitespace-nowrap"
                   >
                      <Download size={12} /> WAV
                   </button>
                   <button 
                      onClick={handleDownloadTxt}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 text-purple-200 text-[10px] uppercase tracking-wider py-2 rounded transition-colors whitespace-nowrap"
                   >
                      <FileText size={12} /> LOG
                   </button>
                </div>
              </div>

              {/* Right: Transcript Stream */}
              <div className="w-[45%] bg-black/50 border border-white/5 rounded p-3 font-mono text-[10px] text-gray-400 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="text-purple-500 mb-2 border-b border-purple-500/20 pb-1 flex items-center gap-2 shrink-0">
                  <Terminal size={10} /> STREAM_OUTPUT
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {transcript.map((line, i) => (
                    <div key={i} className="mb-2 hover:text-white transition-colors">
                        <span className="text-purple-700 mr-2">{`00:${12 + (i * 5)}`}</span>
                        {line}
                    </div>
                    ))}
                    {isPlaying && <span className="animate-pulse text-purple-500">_</span>}
                </div>
              </div>

            </div>
          </div>
        )}
    </motion.div>
  );
};

export default VoiceCoreOverlay;
