
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Image as ImageIcon, FileCode, Maximize, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgData, setSvgData] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Zoom & Pan State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!code) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        setTransform({ x: 0, y: 0, scale: 1 });
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // @ts-ignore
        if (window.mermaid) {
          // @ts-ignore
          window.mermaid.initialize({ 
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'Fira Code',
          });
          
          // @ts-ignore
          const { svg } = await window.mermaid.render(id, code);
          setSvgData(svg);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Failed to render diagram. Syntax might be invalid.');
      }
    };

    renderDiagram();
  }, [code]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSVG = () => {
    if (!svgData) return;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `structura-diagram-${Date.now()}.svg`);
  };

  const handleExportPNG = () => {
    if (!svgData || !containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const viewBox = svgElement.getAttribute('viewBox');
    let width = 0; 
    let height = 0;
    
    if (viewBox) {
        const parts = viewBox.split(/\s+|,/).filter(Boolean).map(parseFloat);
        if (parts.length === 4) {
             width = parts[2];
             height = parts[3];
        }
    }
    
    if (!width || !height) {
         const rect = svgElement.getBoundingClientRect();
         width = rect.width / transform.scale; 
         height = rect.height / transform.scale;
    }

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; 
      const padding = 40; 

      canvas.width = (width + padding * 2) * scale;
      canvas.height = (height + padding * 2) * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#030303'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.scale(scale, scale);
      ctx.drawImage(img, padding, padding, width, height);

      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `structura-diagram-${Date.now()}.png`);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    
    img.src = url;
  };

  // --- Pan & Zoom Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(0.1, transform.scale - e.deltaY * zoomSensitivity), 5);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastMousePosition.current.x;
    const deltaY = e.clientY - lastMousePosition.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 5) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.1) }));
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-red-900/10 border border-red-900/30 rounded text-red-400">
        <div className="bg-red-900/20 p-3 rounded-full mb-4">
           <RefreshCw className="w-6 h-6 text-red-400" />
        </div>
        <p className="font-mono text-sm mb-2">RENDER_ERR</p>
        <p className="text-xs opacity-80 text-center max-w-md mb-4 font-mono">{error}</p>
        <div className="w-full max-w-lg bg-black rounded p-4 border border-red-900/30 overflow-auto max-h-48">
             <code className="text-[10px] font-mono text-red-300 whitespace-pre-wrap">{code}</code>
        </div>
      </div>
    );
  }

  if (!svgData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-[#0a0a0a] rounded border border-[#1f1f1f]">
        <div className="relative">
          <div className="absolute inset-0 bg-[#9d4edd]/20 blur-xl rounded-full animate-pulse"></div>
          <RefreshCw className="w-8 h-8 relative z-10 animate-spin text-[#9d4edd]" />
        </div>
        <p className="mt-6 text-[10px] font-mono tracking-[0.2em] uppercase text-[#9d4edd]/80 animate-pulse">Constructing Visualization...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#030303] rounded border border-[#1f1f1f] shadow-2xl overflow-hidden flex flex-col relative group">
      
      {/* Canvas Area */}
      <div 
        className="w-full h-full overflow-hidden cursor-move relative flex items-center justify-center bg-[radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:16px_16px]"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
          <div 
            style={{ 
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
            }}
            className="origin-center"
            dangerouslySetInnerHTML={{ __html: svgData }} 
          />
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 transition-all duration-300 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex bg-[#0a0a0a]/90 backdrop-blur-md border border-[#333] rounded-full shadow-2xl p-1.5 ring-1 ring-black/20">
            
            {/* Zoom Controls */}
            <div className="flex items-center px-1">
              <button onClick={zoomOut} className="p-2 hover:bg-[#1f1f1f] text-gray-500 hover:text-white rounded-full transition-colors" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-gray-500 w-12 text-center select-none">{Math.round(transform.scale * 100)}%</span>
              <button onClick={zoomIn} className="p-2 hover:bg-[#1f1f1f] text-gray-500 hover:text-white rounded-full transition-colors" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={resetZoom} className="p-2 hover:bg-[#1f1f1f] text-gray-500 hover:text-[#9d4edd] rounded-full transition-colors ml-1" title="Reset View">
                <Move className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-6 bg-[#333] mx-1 self-center"></div>

            {/* Export Controls */}
            <div className="flex items-center px-1">
              <button 
                onClick={handleExportSVG}
                className="flex items-center px-3 py-1.5 text-[10px] font-medium text-gray-300 hover:bg-[#1f1f1f] hover:text-white rounded-full transition-all font-mono"
                title="Export as SVG"
              >
                <FileCode className="w-3.5 h-3.5 mr-1.5" />
                SVG
              </button>
              <button 
                onClick={handleExportPNG}
                className="flex items-center px-3 py-1.5 text-[10px] font-medium text-[#9d4edd] hover:bg-[#9d4edd]/10 rounded-full transition-all ml-1 font-mono"
                title="Export as PNG"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                PNG
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default MermaidDiagram;
