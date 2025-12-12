
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Image as ImageIcon, FileCode, Maximize, ZoomIn, ZoomOut, Move, Download, AlertCircle, Focus, Sparkles } from 'lucide-react';
import mermaid from 'mermaid';
import { motion, AnimatePresence } from 'framer-motion';
import { repairMermaidSyntax, promptSelectKey } from '../services/geminiService'; // New service import

export type DiagramTheme = 'dark' | 'light' | 'contrast';

interface MermaidDiagramProps {
  code: string;
  theme?: DiagramTheme;
  showGrid?: boolean;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, theme = 'dark', showGrid = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgData, setSvgData] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [activeCode, setActiveCode] = useState(code);
  
  // Zoom & Pan State with Physics
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

  // Theme Configuration
  useEffect(() => {
    const getThemeVariables = () => {
        switch (theme) {
            case 'light':
                return {
                    primaryColor: '#ffffff',
                    primaryTextColor: '#000000',
                    primaryBorderColor: '#9d4edd',
                    lineColor: '#333333',
                    secondaryColor: '#f4f4f4',
                    tertiaryColor: '#fff',
                    mainBkg: '#ffffff',
                    nodeBorder: '#000000'
                };
            case 'contrast':
                return {
                    primaryColor: '#000000',
                    primaryTextColor: '#00ff00', // Terminal Green
                    primaryBorderColor: '#00ff00',
                    lineColor: '#00ff00',
                    secondaryColor: '#000000',
                    tertiaryColor: '#000000',
                    mainBkg: '#000000',
                    nodeBorder: '#00ff00'
                };
            case 'dark':
            default:
                return {
                    primaryColor: '#000000',
                    primaryTextColor: '#fff',
                    primaryBorderColor: '#9d4edd',
                    lineColor: '#555',
                    secondaryColor: '#000000',
                    tertiaryColor: '#000000',
                    mainBkg: '#030303',
                    nodeBorder: '#9d4edd'
                };
        }
    };

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base', // We use base to override with variables
      securityLevel: 'loose',
      fontFamily: 'Fira Code',
      flowchart: { htmlLabels: false }, // Disable HTML labels to prevent canvas tainting
      themeVariables: getThemeVariables()
    });
  }, [theme]); // Re-run init when theme changes

  // Update internal state when prop changes
  useEffect(() => {
      setActiveCode(code);
  }, [code]);

  useEffect(() => {
    if (!activeCode) return;

    let isMounted = true;
    const render = async () => {
      setIsRendering(true);
      setError(null);
      
      try {
        // Reset mermaid config for this render cycle if needed, though initialize handles it globally.
        // We use a unique ID to ensure fresh rendering
        const id = `mermaid-${Date.now()}`;
        const cleanCode = activeCode
          .replace(/```mermaid/g, '')
          .replace(/```/g, '')
          .trim();

        // Render returns { svg }
        const { svg } = await mermaid.render(id, cleanCode);
        
        if (isMounted) {
           setSvgData(svg);
           // Center the diagram initially if it's the first load
           // setTransform({ x: 0, y: 0, scale: 0.8 }); 
        }
      } catch (err: any) {
        console.error("Mermaid Render Error", err);
        if (isMounted) {
           setError(`Syntax Error: ${err.message}`);
        }
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    render();

    return () => { isMounted = false; };
  }, [activeCode, theme]); // Re-render on theme change too

  const handleAutoRepair = async () => {
      if (!error) return;
      setIsRepairing(true);
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();

          const repairedCode = await repairMermaidSyntax(activeCode, error);
          setActiveCode(repairedCode); // Triggers re-render
      } catch (err) {
          console.error("Repair failed", err);
      } finally {
          setIsRepairing(false);
      }
  };

  // --- Export Handlers ---

  const handleExport = (type: 'svg' | 'png') => {
    if (!svgData) return;
    
    if (type === 'svg') {
       const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
       downloadBlob(blob, `structura_schematic_${Date.now()}.svg`);
    } else {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       const img = new Image();
       img.crossOrigin = "anonymous";
       
       const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
       const url = URL.createObjectURL(svgBlob);
       
       img.onload = () => {
          const wMatch = svgData.match(/width="([\d\.]+)px"/);
          const hMatch = svgData.match(/height="([\d\.]+)px"/); 
          
          const scale = 2; 
          const width = wMatch ? parseFloat(wMatch[1]) : 1600;
          const height = hMatch ? parseFloat(hMatch[1]) : 1200;

          canvas.width = width * scale;
          canvas.height = height * scale;
          
          if (ctx) {
             // Background color based on theme for export
             ctx.fillStyle = theme === 'light' ? '#ffffff' : '#030303'; 
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.scale(scale, scale);
             ctx.drawImage(img, 0, 0, width, height);
             
             try {
                 canvas.toBlob(blob => {
                     if (blob) downloadBlob(blob, `structura_schematic_${Date.now()}.png`);
                     URL.revokeObjectURL(url);
                 });
             } catch (e) {
                 console.warn("Canvas export failed (likely tainted). Falling back to SVG.", e);
                 // Fallback to SVG if canvas is tainted
                 const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                 downloadBlob(blob, `structura_schematic_${Date.now()}.svg`);
                 URL.revokeObjectURL(url);
             }
          }
       };
       img.src = url;
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Pan / Zoom / Tooltip Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.0015;
    const newScale = Math.min(Math.max(0.1, transform.scale - e.deltaY * zoomSensitivity), 10);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Pan Logic
    if (isDragging.current) {
        const deltaX = e.clientX - lastMousePosition.current.x;
        const deltaY = e.clientY - lastMousePosition.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }

    // 2. Tooltip Logic (Inspect the SVG under the cursor)
    // We check if the target has a parent with class 'node' which Mermaid generates
    const target = e.target as Element;
    const nodeElement = target.closest('.node');
    
    if (nodeElement) {
        // Try to find the text content
        const textElement = nodeElement.querySelector('span') || nodeElement.querySelector('text');
        if (textElement && textElement.textContent) {
             // Position tooltip relative to viewport
             setTooltip({
                 x: e.clientX + 15,
                 y: e.clientY + 15,
                 text: textElement.textContent.trim()
             });
        }
    } else {
        setTooltip(null);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Theme-based styling for container
  const containerBg = theme === 'light' ? 'bg-[#f4f4f4]' : 'bg-[#030303]';
  const borderColor = theme === 'light' ? 'border-gray-300' : (theme === 'contrast' ? 'border-green-500' : 'border-[#1f1f1f]');
  const gridColor = theme === 'light' ? '#ddd' : '#333';

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/10 p-8 border border-red-500/20 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,0,0,0.05)_0,rgba(255,0,0,0.05)_10px,transparent_10px,transparent_20px)]"></div>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-red-400 font-mono text-lg uppercase tracking-widest mb-2">Schematic Render Failed</h3>
        <p className="text-gray-500 font-mono text-xs max-w-md text-center mb-6">The structural integrity of the generated diagram code was compromised.</p>
        
        <button 
            onClick={handleAutoRepair}
            disabled={isRepairing}
            className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 rounded uppercase tracking-wider transition-colors text-xs font-mono text-red-200 flex items-center gap-2 mb-6"
        >
            {isRepairing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isRepairing ? "Repairing Structure..." : "Auto-Repair Syntax"}
        </button>

        <div className="w-full max-w-2xl bg-black border border-red-900/50 p-4 rounded overflow-auto max-h-64 shadow-inner">
            <code className="text-[10px] font-mono text-red-300 whitespace-pre-wrap">{activeCode}</code>
        </div>
      </div>
    );
  }

  if (isRendering || !svgData) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center ${containerBg} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.1)_1px,transparent_1px)] bg-[size:40px_40px] animate-[pulse_2s_infinite]"></div>
        <RefreshCw className="w-12 h-12 text-[#9d4edd] animate-spin mb-6 relative z-10" />
        <p className="text-[#9d4edd] font-mono text-xs tracking-[0.3em] uppercase animate-pulse relative z-10">Constructing Visual Vector...</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${containerBg} relative overflow-hidden group border ${borderColor} rounded-lg shadow-2xl`}>
      
      {/* Dynamic Background Grid */}
      {showGrid && (
        <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
                backgroundImage: `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`,
                backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`,
                backgroundPosition: `${transform.x}px ${transform.y}px`
            }}
        ></div>
      )}

      {/* Main Canvas */}
      <div 
        ref={containerRef}
        className="w-full h-full cursor-move relative flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setTooltip(null); }}
      >
        <div 
          className="origin-center will-change-transform"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging.current ? 'none' : 'transform 0.1s ease-out' }}
          dangerouslySetInnerHTML={{ __html: svgData }}
        />
      </div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
         <div className="flex bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#333] rounded-full p-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
             <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 hover:bg-[#222] rounded-full text-gray-400 hover:text-white transition-colors"><ZoomOut className="w-4 h-4"/></button>
             <button onClick={() => setTransform({x:0, y:0, scale:1})} className="p-2 hover:bg-[#222] rounded-full text-[#9d4edd] hover:text-[#b06bf7] transition-colors font-mono text-[10px] w-12 flex items-center justify-center gap-1">
                 <Focus className="w-3 h-3"/>
                 {Math.round(transform.scale * 100)}%
             </button>
             <button onClick={() => setTransform(p => ({...p, scale: Math.min(10, p.scale + 0.2)}))} className="p-2 hover:bg-[#222] rounded-full text-gray-400 hover:text-white transition-colors"><ZoomIn className="w-4 h-4"/></button>
         </div>

         <div className="w-px h-8 bg-[#333]"></div>

         <div className="flex bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#333] rounded-full p-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
             <button onClick={() => handleExport('svg')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#222] rounded-full text-gray-400 hover:text-white transition-colors text-[10px] font-mono">
                 <FileCode className="w-3.5 h-3.5" /> SVG
             </button>
             <button onClick={() => handleExport('png')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#222] rounded-full text-[#9d4edd] hover:text-white transition-colors text-[10px] font-mono">
                 <ImageIcon className="w-3.5 h-3.5" /> PNG
             </button>
         </div>
      </div>
      
      {/* Overlay Details */}
      <div className="absolute top-4 left-4 pointer-events-none">
          <h3 className={`text-[10px] font-bold font-mono uppercase tracking-widest ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>Schematic Visualization</h3>
          <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full animate-pulse ${theme === 'contrast' ? 'bg-green-500' : 'bg-[#9d4edd]'}`}></span>
              <span className={`text-[9px] font-mono ${theme === 'contrast' ? 'text-green-500' : 'text-[#9d4edd]'}`}>LIVE RENDER</span>
          </div>
      </div>

      {/* Interactive Tooltip */}
      <AnimatePresence>
        {tooltip && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.1 }}
                style={{ left: tooltip.x, top: tooltip.y }}
                className="fixed z-[100] bg-[#0a0a0a]/95 backdrop-blur border border-[#9d4edd]/50 px-3 py-2 rounded shadow-[0_0_15px_rgba(157,78,221,0.2)] pointer-events-none min-w-[120px]"
            >
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">Node Metadata</div>
                <div className="text-xs font-bold text-white font-mono">{tooltip.text}</div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MermaidDiagram;
