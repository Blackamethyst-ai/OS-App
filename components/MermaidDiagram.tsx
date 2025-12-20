import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Image as ImageIcon, FileCode, Maximize, ZoomIn, ZoomOut, Move, Download, AlertCircle, Focus, Sparkles, Loader2 } from 'lucide-react';
import mermaid from 'mermaid';
import { motion, AnimatePresence } from 'framer-motion';
import { repairMermaidSyntax, promptSelectKey } from '../services/geminiService';
import { useAppStore } from '../store';

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgData, setSvgData] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [activeCode, setActiveCode] = useState(code);
  const { setProcessState } = useAppStore();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'Fira Code',
      flowchart: { htmlLabels: false },
      themeVariables: { primaryColor: '#000', primaryTextColor: '#fff', primaryBorderColor: '#9d4edd', lineColor: '#555' }
    });
  }, []);

  useEffect(() => { setActiveCode(code); }, [code]);

  useEffect(() => {
    if (!activeCode) return;
    let isMounted = true;
    const render = async () => {
      setIsRendering(true); setError(null);
      setProcessState({ diagramStatus: 'OK', diagramError: null });
      try {
        const id = `mermaid-${Date.now()}`;
        const cleanCode = activeCode.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        const { svg } = await mermaid.render(id, cleanCode);
        if (isMounted) { setSvgData(svg); setTransform({ x: 0, y: 0, scale: 0.8 }); }
      } catch (err: any) {
        if (isMounted) {
           setError(`Topology Conflict: ${err.message}`);
           setProcessState({ diagramStatus: 'ERROR', diagramError: err.message });
        }
      } finally { if (isMounted) setIsRendering(false); }
    };
    render();
    return () => { isMounted = false; };
  }, [activeCode]);

  const handleAutoRepair = async () => {
      if (!error) return;
      setIsRepairing(true);
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) { await promptSelectKey(); setIsRepairing(false); return; }
          const repairedCode = await repairMermaidSyntax(activeCode, error);
          setActiveCode(repairedCode);
          setProcessState({ generatedCode: repairedCode });
      } catch (err) { console.error("Repair failed", err); }
      finally { setIsRepairing(false); }
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/10 p-8 border border-red-500/20 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none"></div>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-pulse" />
        <h3 className="text-red-400 font-mono text-lg uppercase tracking-widest mb-2 font-black">Schematic Render Failure</h3>
        <p className="text-gray-500 font-mono text-xs max-w-md text-center mb-6">{error}</p>
        <button onClick={handleAutoRepair} disabled={isRepairing} className="px-8 py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-xl uppercase tracking-[0.2em] text-[10px] font-black font-mono text-red-200 flex items-center gap-3 mb-8 shadow-2xl transition-all hover:scale-105 active:scale-95">
            {isRepairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isRepairing ? "REPAIRING TOPOLOGY..." : "AUTO-REPAIR SYNTAX"}
        </button>
        <div className="w-full max-w-2xl bg-black border border-red-900/30 p-5 rounded-xl shadow-inner overflow-hidden relative">
            <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2 text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                <FileCode size={10} /> Corrupted Manifest
            </div>
            <code className="text-[10px] font-mono text-red-300/80 whitespace-pre-wrap block max-h-48 overflow-y-auto custom-scrollbar">{activeCode}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#030303] relative overflow-hidden group border border-[#1f1f1f] rounded-lg">
      <AnimatePresence>
        {isRendering && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-4" />
            <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.3em]">Crystallizing Diagram...</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(circle, #333 1px, transparent 1px)`, backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`, backgroundPosition: `${transform.x}px ${transform.y}px` }}></div>
      <div className="w-full h-full cursor-move relative flex items-center justify-center" onWheel={e => setTransform(p => ({...p, scale: Math.min(10, Math.max(0.1, p.scale - e.deltaY * 0.0015))}))} onMouseDown={e => { isDragging.current = true; lastMousePosition.current = { x: e.clientX, y: e.clientY }; }} onMouseMove={e => { if (isDragging.current) { setTransform(p => ({ ...p, x: p.x + (e.clientX - lastMousePosition.current.x), y: p.y + (e.clientY - lastMousePosition.current.y) })); lastMousePosition.current = { x: e.clientX, y: e.clientY }; } }} onMouseUp={() => isDragging.current = false} onMouseLeave={() => isDragging.current = false}>
        <div className="origin-center" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging.current ? 'none' : 'transform 0.1s ease-out' }} dangerouslySetInnerHTML={{ __html: svgData }} />
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 transition-all">
         <div className="flex bg-[#0a0a0a]/90 border border-[#333] rounded-full p-2 shadow-2xl backdrop-blur-xl">
             <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 text-gray-400 hover:text-white transition-colors"><ZoomOut className="w-4 h-4"/></button>
             <button onClick={() => setTransform({x:0, y:0, scale:1})} className="p-2 text-[#9d4edd] font-mono text-[10px] w-12 flex items-center justify-center gap-1"><Focus className="w-3 h-3"/>{Math.round(transform.scale * 100)}%</button>
             <button onClick={() => setTransform(p => ({...p, scale: Math.min(10, p.scale + 0.2)}))} className="p-2 text-gray-400 hover:text-white transition-colors"><ZoomIn className="w-4 h-4"/></button>
         </div>
      </div>
    </div>
  );
};

export default MermaidDiagram;