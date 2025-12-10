
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { analyzeSchematic, researchComponents, fileToGenerativePart, promptSelectKey, generateXRayVariant, generateIsometricSchematic } from '../services/geminiService';
import { Upload, Search, Cpu, Zap, AlertTriangle, Activity, Loader2, CircuitBoard, Server, Thermometer, Camera, X, ExternalLink, Scan, FileText, Plus, Trash2, Download, List, MousePointer2, Globe, Box, Layers, Network, Wind, Droplets, Power, ShieldAlert, Sliders, CheckCircle2, BoxSelect } from 'lucide-react';
import { ComponentRecommendation, PowerRail, SchematicIssue } from '../types';

interface ErrorDisplayProps {
    message: string;
    onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => (
    <div className="p-4 bg-red-900/10 border border-red-900/30 text-red-400 text-xs font-mono flex items-center justify-between animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-2">
             <AlertTriangle className="w-4 h-4" />
             <span>{message}</span>
        </div>
        {onRetry && (
            <button 
                onClick={onRetry} 
                className="px-3 py-1 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded uppercase tracking-wider transition-colors text-[10px]"
            >
                Retry
            </button>
        )}
    </div>
);

// --- Schematic Analysis Panel ---
const SchematicAnalysisPanel: React.FC<{ analysis: any }> = ({ analysis }) => {
    if (!analysis) return null;

    const getCategoryColor = (cat?: string) => {
        switch(cat?.toLowerCase()) {
            case 'digital': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
            case 'analog': return 'text-orange-400 bg-orange-900/20 border-orange-500/30';
            case 'rf': return 'text-pink-400 bg-pink-900/20 border-pink-500/30';
            case 'power': return 'text-red-400 bg-red-900/20 border-red-500/30';
            default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] border-l border-[#1f1f1f] w-80 overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-[#1f1f1f] bg-[#0a0a0a]">
                <h3 className="text-[10px] font-bold font-mono uppercase text-[#9d4edd] flex items-center gap-2">
                    <CircuitBoard className="w-3 h-3" />
                    Schematic Analysis
                </h3>
            </div>

            <div className="p-4 space-y-6">
                {/* Efficiency Rating */}
                <div className="bg-[#111] border border-[#333] p-4 rounded text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Design Efficiency</div>
                    <div className="text-3xl font-mono font-bold text-white">
                        {analysis.efficiencyRating}<span className="text-sm text-[#9d4edd]">%</span>
                    </div>
                </div>

                {/* Power Rails */}
                <div>
                    <h4 className="text-[9px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        Power Rails
                    </h4>
                    <div className="space-y-2">
                        {analysis.powerRails?.map((rail: PowerRail, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-[#111] border border-[#333] rounded hover:border-[#9d4edd] transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono font-bold text-gray-200">{rail.voltage}</span>
                                    <span className="text-[9px] text-gray-500">{rail.source}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className={`px-1.5 py-0.5 text-[8px] font-mono uppercase rounded border ${getCategoryColor(rail.category)}`}>
                                        {rail.category || 'UNK'}
                                     </span>
                                     <div className={`w-1.5 h-1.5 rounded-full ${rail.status === 'stable' ? 'bg-[#42be65]' : 'bg-red-500'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Issues List */}
                {analysis.issues?.length > 0 && (
                    <div>
                        <h4 className="text-[9px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            Detected Issues
                        </h4>
                        <div className="space-y-3">
                            {analysis.issues.map((issue: SchematicIssue, i: number) => (
                                <div key={i} className="bg-red-900/5 border border-red-900/20 p-3 rounded">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-red-400 uppercase">{issue.severity}</span>
                                        <span className="text-[9px] text-gray-600 font-mono">{issue.location}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mb-2">{issue.description}</p>
                                    <div className="text-[9px] text-[#9d4edd] font-mono border-t border-red-900/20 pt-2 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {issue.recommendation}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- X-Ray Scanner Component ---
const XRayScanner = ({ baseImage, xrayImage }: { baseImage: string, xrayImage: string }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(150);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden cursor-crosshair group rounded border border-[#333] shadow-2xl bg-black"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setPos({ x: -1000, y: -1000 })}
    >
        <style>{`
          @keyframes electric-pulse {
            0% { filter: contrast(1.2) brightness(1.1) drop-shadow(0 0 5px rgba(66,245,245,0.5)); }
            50% { filter: contrast(1.4) brightness(1.3) drop-shadow(0 0 15px rgba(66,245,245,0.9)); }
            100% { filter: contrast(1.2) brightness(1.1) drop-shadow(0 0 5px rgba(66,245,245,0.5)); }
          }
          @keyframes grid-move {
            0% { background-position: 0 0; }
            100% { background-position: 20px 20px; }
          }
        `}</style>

        {/* Base Layer */}
        <div className="absolute inset-0 flex items-center justify-center">
            <img src={baseImage} className="max-w-full max-h-full object-contain opacity-50 grayscale" alt="Base Schematic" />
        </div>

        {/* X-Ray Layer (Clipped) */}
        <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{
                clipPath: `circle(${size}px at ${pos.x}px ${pos.y}px)`,
                transition: 'clip-path 0.05s linear'
            }}
        >
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                 <img 
                    src={xrayImage} 
                    className="max-w-full max-h-full object-contain" 
                    alt="X-Ray Layer" 
                    style={{ animation: 'electric-pulse 2s infinite ease-in-out' }}
                />
                 {/* Measurement Grid Overlay */}
                 <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(66,245,245,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(66,245,245,0.3)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            </div>
        </div>

        {/* Scanner Lens UI */}
        <div
            className="absolute pointer-events-none border border-[#42f5f5] rounded-full shadow-[0_0_30px_#42f5f5,inset_0_0_20px_rgba(66,245,245,0.2)] opacity-0 group-hover:opacity-100 transition-opacity z-20"
            style={{
                left: pos.x - size,
                top: pos.y - size,
                width: size * 2,
                height: size * 2,
            }}
        >
             {/* Dynamic Reticle */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-[9px] font-mono text-[#42f5f5] bg-black px-1">APERTURE: {size}mm</div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 text-[9px] font-mono text-[#42f5f5] bg-black px-1">ZOOM: {(size/100).toFixed(1)}x</div>
             
             {/* Crosshairs */}
             <div className="absolute top-1/2 left-0 w-4 h-px bg-[#42f5f5]/50"></div>
             <div className="absolute top-1/2 right-0 w-4 h-px bg-[#42f5f5]/50"></div>
             <div className="absolute top-0 left-1/2 w-px h-4 bg-[#42f5f5]/50"></div>
             <div className="absolute bottom-0 left-1/2 w-px h-4 bg-[#42f5f5]/50"></div>
        </div>
        
        {/* Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between z-30 pointer-events-none">
             <div className="bg-black/90 border border-[#42f5f5] px-4 py-2 text-[#42f5f5] text-[10px] font-mono rounded pointer-events-auto backdrop-blur animate-pulse shadow-[0_0_15px_rgba(66,245,245,0.3)]">
                BASIX NODE INSPECTOR :: LAYER_DEEP_SCAN
            </div>
            
            <div 
                className="flex flex-col items-end pointer-events-auto"
                onMouseMove={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                 <div className="bg-black/90 border border-[#333] p-3 rounded flex items-center gap-4 backdrop-blur shadow-2xl">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Lens Aperture</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="range" 
                                min="50" 
                                max="400" 
                                value={size} 
                                onChange={(e) => setSize(Number(e.target.value))}
                                className="w-32 h-1.5 bg-[#1f1f1f] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#42f5f5] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_#42f5f5]"
                            />
                            <input 
                                type="number" 
                                min="50" 
                                max="400" 
                                value={size}
                                onChange={(e) => setSize(Number(e.target.value))}
                                className="w-12 bg-[#050505] border border-[#333] text-[9px] font-mono text-[#42f5f5] text-right px-1 py-0.5 rounded focus:border-[#42f5f5] outline-none"
                            />
                            <span className="text-[9px] font-mono text-gray-500">px</span>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    </div>
  )
}

// --- WebGL Shaders for Thermal Sim ---
const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uSources[20]; // x, y, intensity
  uniform int uSourceCount;
  uniform float uConductivity;
  uniform float uCooling;

  float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
      }
      return v;
  }

  vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 col;
      if (t < 0.2) col = mix(vec3(0.0, 0.0, 0.2), vec3(0.0, 0.0, 1.0), t / 0.2);
      else if (t < 0.4) col = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), (t - 0.2) / 0.2);
      else if (t < 0.6) col = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), (t - 0.4) / 0.2);
      else if (t < 0.8) col = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (t - 0.6) / 0.2);
      else col = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.8) / 0.2);
      return col;
  }

  void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 p = uv * aspect;
      
      float heat = 0.0;
      
      for (int i = 0; i < 20; i++) {
          if (i >= uSourceCount) break;
          vec2 srcUV = uSources[i].xy / uResolution * aspect;
          float dist = distance(p, srcUV);
          float intensity = uSources[i].z;
          float spread = uConductivity * 0.5;
          // Apply active cooling reduction based on distance from center (simulating fluid flow)
          float flowCooling = uCooling * (1.0 + noise(p * 10.0 + uTime));
          heat += (intensity - flowCooling * 0.2) / (1.0 + (dist * dist) / spread);
      }
      
      float grain = fbm(p * 50.0) * 0.1;
      heat += grain * heat;
      
      heat = clamp(heat, 0.0, 1.0);
      vec3 col = ironbow(heat);
      
      // Flow lines
      float flow = sin(uv.y * 100.0 + uTime * 5.0) * 0.02 * uCooling;
      col += flow;

      gl_FragColor = vec4(col, 1.0);
  }
`;

// --- Tier 3: 3D Globe Visualizer ---

interface ComputeNode {
    id: string;
    lat: number;
    lon: number;
    label: string;
    status: 'ONLINE' | 'OFFLINE' | 'LATENCY';
    load: number;
}

const GlobalComputeTwin = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [globalLoad, setGlobalLoad] = useState(0.5);
    
    // Interactive State
    const [nodes, setNodes] = useState<ComputeNode[]>([
        { id: 'nyc', lat: 40.7128, lon: -74.0060, label: "NYC-CORE", status: 'ONLINE', load: 0.8 },
        { id: 'lon', lat: 51.5074, lon: -0.1278, label: "LON-ZER0", status: 'ONLINE', load: 0.6 },
        { id: 'tok', lat: 35.6762, lon: 139.6503, label: "TOK-EDGE", status: 'ONLINE', load: 0.9 },
        { id: 'dxb', lat: 25.2048, lon: 55.2708, label: "DXB-SOL", status: 'ONLINE', load: 0.4 },
        { id: 'sin', lat: 1.3521, lon: 103.8198, label: "SIN-HUB", status: 'ONLINE', load: 0.7 },
        { id: 'syd', lat: -33.8688, lon: 151.2093, label: "SYD-LINK", status: 'ONLINE', load: 0.5 },
        { id: 'par', lat: 48.8566, lon: 2.3522, label: "PAR-G5", status: 'ONLINE', load: 0.6 },
        { id: 'sfo', lat: 37.7749, lon: -122.4194, label: "SFO-SIL", status: 'ONLINE', load: 0.9 },
        { id: 'sao', lat: -23.5505, lon: -46.6333, label: "SAO-POW", status: 'LATENCY', load: 0.3 },
        { id: 'ice', lat: 64.1466, lon: -11.9426, label: "ICE-THERM", status: 'ONLINE', load: 0.2 } 
    ]);
    
    // Ref to hold nodes for animation loop
    const nodesRef = useRef(nodes);
    const loadRef = useRef(globalLoad);

    useEffect(() => {
        nodesRef.current = nodes;
        loadRef.current = globalLoad;
    }, [nodes, globalLoad]);

    // Update handlers
    const toggleNodeStatus = (id: string) => {
        setNodes(prev => prev.map(n => {
            if (n.id === id) {
                return { 
                    ...n, 
                    status: n.status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE' 
                };
            }
            return n;
        }));
    };

    const triggerChaos = () => {
        const randomId = nodes[Math.floor(Math.random() * nodes.length)].id;
        setNodes(prev => prev.map(n => n.id === randomId ? { ...n, status: 'OFFLINE' } : n));
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        let rotation = 0;

        // 3D Projection Logic
        const project = (lat: number, lon: number, r: number, rot: number) => {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            
            let x = -(r * Math.sin(phi) * Math.cos(theta));
            let z = (r * Math.sin(phi) * Math.sin(theta));
            let y = (r * Math.cos(phi));
            
            // Rotate around Y axis
            const xRot = x * Math.cos(rot) - z * Math.sin(rot);
            const zRot = x * Math.sin(rot) + z * Math.cos(rot);
            
            return { x: xRot, y, z: zRot, visible: zRot < 0 };
        };

        const render = () => {
            const currentNodes = nodesRef.current;
            const currentLoad = loadRef.current;
            
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const radius = Math.min(cx, cy) * 0.7;

            rotation += 0.003 * (0.5 + currentLoad); // Spin faster with load

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw Globe Wireframe
            ctx.strokeStyle = `rgba(157, 78, 221, ${0.1 + currentLoad * 0.1})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw Equator / Lat lines
            ctx.beginPath();
            ctx.ellipse(cx, cy, radius, radius * 0.2, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Project Nodes
            const projectedNodes = currentNodes.map(n => ({
                ...n,
                ...project(n.lat, n.lon, radius, rotation)
            }));

            // Draw Connections (Back)
            projectedNodes.forEach((n1, i) => {
                projectedNodes.forEach((n2, j) => {
                    if (i < j && (!n1.visible || !n2.visible)) {
                         // Connectivity Check
                         if (n1.status === 'OFFLINE' || n2.status === 'OFFLINE') return;

                         const dist = Math.sqrt((n1.x - n2.x)**2 + (n1.y - n2.y)**2);
                         if (dist < radius * 1.5) {
                             ctx.beginPath();
                             ctx.moveTo(cx + n1.x, cy + n1.y);
                             ctx.lineTo(cx + n2.x, cy + n2.y);
                             ctx.strokeStyle = 'rgba(66, 190, 101, 0.05)'; 
                             ctx.stroke();
                         }
                    }
                });
            });

            // Draw Connections (Front)
            projectedNodes.forEach((n1, i) => {
                projectedNodes.forEach((n2, j) => {
                    if (i < j && n1.visible && n2.visible) {
                         if (n1.status === 'OFFLINE' || n2.status === 'OFFLINE') return;

                         const dist = Math.sqrt((n1.x - n2.x)**2 + (n1.y - n2.y)**2);
                         if (dist < radius * 1.5) {
                             ctx.beginPath();
                             ctx.moveTo(cx + n1.x, cy + n1.y);
                             ctx.lineTo(cx + n2.x, cy + n2.y);
                             const pulse = Math.sin(Date.now()/(2000 - currentLoad*1000) + i) * 0.2;
                             ctx.strokeStyle = `rgba(66, 190, 101, ${0.1 + pulse})`; 
                             ctx.stroke();
                         }
                    }
                });
            });

            // Draw Nodes
            projectedNodes.forEach(n => {
                const alpha = n.visible ? 1 : 0.2;
                const size = n.visible ? 4 : 2;
                
                // Dot Color
                let color = '#9d4edd';
                if (n.status === 'OFFLINE') color = '#ef4444';
                if (n.status === 'LATENCY') color = '#f59e0b';

                ctx.fillStyle = n.visible ? color : '#333';
                ctx.beginPath();
                ctx.arc(cx + n.x, cy + n.y, size, 0, Math.PI * 2);
                ctx.fill();

                // Glow
                if (n.visible) {
                    if (n.status !== 'OFFLINE') {
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 10 + (n.load * 10 * currentLoad);
                    }
                    ctx.strokeStyle = '#fff';
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Label
                    ctx.fillStyle = '#fff';
                    ctx.font = '9px "Fira Code"';
                    ctx.fillText(n.label, cx + n.x + 8, cy + n.y + 3);
                    
                    // Price Tag simulation
                    if (n.status !== 'OFFLINE') {
                        ctx.fillStyle = '#42be65';
                        ctx.font = '8px "Fira Code"';
                        const price = (0.02 + Math.sin(Date.now()/2000 + n.lat)*0.01 + (currentLoad * 0.01)).toFixed(3);
                        ctx.fillText(`$${price}/h`, cx + n.x + 8, cy + n.y + 12);
                    } else {
                        ctx.fillStyle = '#ef4444';
                        ctx.font = '8px "Fira Code"';
                        ctx.fillText(`SIGNAL_LOST`, cx + n.x + 8, cy + n.y + 12);
                    }
                }
            });

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frameId);
    }, []);

    // Calculated stats
    const activeNodes = nodes.filter(n => n.status === 'ONLINE').length;
    const globalHashrate = (activeNodes * 12.5 * (1 + globalLoad)).toFixed(1);

    return (
        <div className="w-full h-full bg-[#030303] relative flex overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(21,5,32,1)_0%,#030303_80%)]"></div>
            
            {/* Simulation Canvas */}
            <div className="flex-1 relative">
                <canvas ref={canvasRef} className="w-full h-full absolute inset-0 z-0" />
                
                <div className="absolute top-8 left-8 z-10 pointer-events-none">
                    <h2 className="text-2xl font-black font-mono tracking-tighter text-white uppercase mb-1">BASIX Global Twin</h2>
                    <p className="text-[10px] font-mono text-[#42be65] tracking-[0.3em] uppercase animate-pulse">
                        Autopoietic Economy Active :: Hashrate {globalHashrate} EH/s
                    </p>
                </div>

                {/* Ticker Tape */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a]/90 border-t border-[#333] h-10 overflow-hidden flex items-center">
                    <div className="flex gap-8 animate-[marquee_20s_linear_infinite] whitespace-nowrap px-4 font-mono text-xs">
                        <span className="text-gray-400">GLOBAL_AVG: <span className="text-white">$0.032/h</span></span>
                        {nodes.map(n => (
                            <span key={n.id} className="text-gray-400">
                                {n.label}: <span className={n.status === 'ONLINE' ? 'text-[#42be65]' : 'text-red-500'}>
                                    {n.status === 'ONLINE' ? 'OPTIMAL' : 'OFFLINE'}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Simulation Controls Sidebar */}
            <div className="w-72 bg-[#050505] border-l border-[#1f1f1f] flex flex-col z-10">
                <div className="p-4 border-b border-[#1f1f1f]">
                    <h3 className="text-[10px] font-bold text-[#9d4edd] uppercase tracking-widest flex items-center gap-2">
                        <Sliders className="w-3 h-3" />
                        Simulation Control
                    </h3>
                </div>
                
                <div className="p-4 flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Global Load */}
                    <div>
                        <label className="text-[9px] text-gray-500 uppercase flex items-center gap-2 mb-2">
                            <Activity className="w-3 h-3" />
                            Global Compute Pressure
                        </label>
                        <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={globalLoad} 
                            onChange={(e) => setGlobalLoad(parseFloat(e.target.value))}
                            className="w-full accent-[#9d4edd] h-1 bg-[#333] rounded-full appearance-none mb-1"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-gray-600">
                            <span>IDLE</span>
                            <span>SURGE</span>
                        </div>
                    </div>

                    {/* Chaos Protocol */}
                    <div className="p-4 bg-red-900/10 border border-red-900/30 rounded">
                        <h4 className="text-[9px] font-bold text-red-500 uppercase mb-2 flex items-center gap-2">
                            <ShieldAlert className="w-3 h-3" />
                            Chaos Protocol
                        </h4>
                        <p className="text-[9px] text-gray-500 mb-3">Randomly destabilize node infrastructure to test redundancy.</p>
                        <button 
                            onClick={triggerChaos}
                            className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 text-red-400 text-[9px] font-bold uppercase tracking-wider transition-colors"
                        >
                            Trigger Outage
                        </button>
                    </div>

                    {/* Node Status List */}
                    <div>
                        <h4 className="text-[9px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <Network className="w-3 h-3" />
                            Node Status
                        </h4>
                        <div className="space-y-2">
                            {nodes.map(node => (
                                <div key={node.id} className="flex items-center justify-between bg-[#111] border border-[#333] p-2 rounded hover:border-gray-600 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'ONLINE' ? 'bg-[#42be65] shadow-[0_0_5px_#42be65]' : node.status === 'LATENCY' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                        <span className="text-[10px] font-mono text-gray-300">{node.label}</span>
                                    </div>
                                    <button 
                                        onClick={() => toggleNodeStatus(node.id)}
                                        className="text-[9px] text-gray-500 hover:text-white"
                                    >
                                        <Power className={`w-3 h-3 ${node.status === 'OFFLINE' ? 'text-gray-700' : 'text-[#9d4edd]'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};

// Types for Thermal State
interface HeatSource {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    intensity: number;
    freq: number;
    dx: number;
    dy: number;
}

const HardwareEngine: React.FC = () => {
  const { hardware, setHardwareState } = useAppStore();
  const [activeTier, setActiveTier] = useState<'TIER_1' | 'TIER_2' | 'TIER_3'>('TIER_1');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // X-Ray & View State
  const [xrayImageUrl, setXrayImageUrl] = useState<string | null>(null);
  const [isGeneratingXray, setIsGeneratingXray] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [isoImage, setIsoImage] = useState<string | null>(null);
  const [isGeneratingIso, setIsGeneratingIso] = useState(false);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // BOM State
  const [bom, setBom] = useState<ComponentRecommendation[]>([]);

  // Thermal State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [conductivity, setConductivity] = useState(0.05);
  const [cooling, setCooling] = useState(0.5);
  const [thermalProbe, setThermalProbe] = useState<{x:number, y:number, temp:number} | null>(null);
  
  const heatSourcesRef = useRef<HeatSource[]>([
    { x: 0, y: 0, baseX: 0, baseY: 0, intensity: 0.6, freq: 0.05, dx: 0.02, dy: 0.03 },
    { x: 0, y: 0, baseX: 0, baseY: 0, intensity: 0.5, freq: 0.03, dx: -0.02, dy: 0.01 },
    { x: 0, y: 0, baseX: 0, baseY: 0, intensity: 0.7, freq: 0.07, dx: 0.01, dy: -0.02 },
  ]);
  const isInitializedRef = useRef(false);

  // --- WebGL Thermal Simulation ---
  useEffect(() => {
    if (activeTier !== 'TIER_2') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Initialize Sources Positions
    if (!isInitializedRef.current) {
        const w = canvas.width;
        const h = canvas.height;
        heatSourcesRef.current.forEach((src, i) => {
             const offsets = [[0.3, 0.3], [0.7, 0.4], [0.5, 0.7], [0.8, 0.8], [0.2, 0.6]];
             src.baseX = w * (offsets[i]?.[0] || 0.5);
             src.baseY = h * (offsets[i]?.[1] || 0.5);
             src.x = src.baseX;
             src.y = src.baseY;
        });
        isInitializedRef.current = true;
    }

    const createShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
        return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    gl.useProgram(program);

    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ]), gl.STATIC_DRAW);

    const positionAttrib = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uTime = gl.getUniformLocation(program, "uTime");
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uSourceCount = gl.getUniformLocation(program, "uSourceCount");
    const uConductivity = gl.getUniformLocation(program, "uConductivity");
    const uCooling = gl.getUniformLocation(program, "uCooling");
    const uSources = gl.getUniformLocation(program, "uSources");

    let animationFrameId: number;
    let time = 0;

    const render = () => {
        time += 0.02;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // Update Physics (Drift)
        heatSourcesRef.current.forEach(src => {
            src.x = src.baseX + Math.sin(time * src.dx * 5.0) * 20.0;
            src.y = src.baseY + Math.cos(time * src.dy * 5.0) * 20.0;
        });

        // Pack sources
        const sourceData = [];
        for(let i=0; i<20; i++) {
            if(i < heatSourcesRef.current.length) {
                const s = heatSourcesRef.current[i];
                const pulse = 1.0 + Math.sin(time * s.freq * 10.0) * 0.2;
                sourceData.push(s.x, canvas.height - s.y, s.intensity * pulse);
            } else {
                sourceData.push(0,0,0);
            }
        }

        gl.uniform1f(uTime, time);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1i(uSourceCount, heatSourcesRef.current.length);
        gl.uniform1f(uConductivity, conductivity);
        gl.uniform1f(uCooling, cooling);
        gl.uniform3fv(uSources, new Float32Array(sourceData));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
        cancelAnimationFrame(animationFrameId);
        gl.deleteProgram(program);
    };
  }, [activeTier, conductivity, cooling]);

  useEffect(() => {
    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // --- Handlers ---

  const handleSchematicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const file = e.target.files[0];
        const fileData = await fileToGenerativePart(file);
        setHardwareState({ schematicImage: fileData, analysis: null, error: null, isLoading: true });
        setXrayImageUrl(null); 
        setIsoImage(null);
        setViewMode('2D');
        
        // Trigger X-Ray Generation
        setIsGeneratingXray(true);
        generateXRayVariant(fileData)
            .then(url => setXrayImageUrl(url))
            .catch(err => setHardwareState({ error: "X-Ray Gen Failed: " + err.message }))
            .finally(() => setIsGeneratingXray(false));

        // Trigger Schematic Analysis
        analyzeSchematic(fileData)
            .then(analysis => setHardwareState({ analysis, isLoading: false }))
            .catch(err => setHardwareState({ error: "Analysis Failed: " + err.message, isLoading: false }));

      } catch (err: any) {
        setHardwareState({ error: "Failed to process image.", isLoading: false });
      }
    }
  };

  const toggleIsoView = () => {
      if (viewMode === '2D') {
          setViewMode('3D');
          if (!isoImage && hardware.schematicImage && !isGeneratingIso) {
              setIsGeneratingIso(true);
              generateIsometricSchematic(hardware.schematicImage)
                .then(url => setIsoImage(url))
                .catch(err => setHardwareState({ error: "ISO Gen Failed: " + err.message }))
                .finally(() => setIsGeneratingIso(false));
          }
      } else {
          setViewMode('2D');
      }
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
          }
          setIsCameraOpen(true);
      } catch (err) {
          setHardwareState({ error: "Camera access denied." });
      }
  };

  const stopCamera = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      setIsCameraOpen(false);
  };

  const captureImage = () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
              const fileData = { 
                  inlineData: { data: base64, mimeType: 'image/jpeg' },
                  name: 'camera_capture.jpg' 
              };
              
              setHardwareState({ 
                  schematicImage: fileData,
                  analysis: null,
                  error: null,
                  isLoading: true
              });
              stopCamera();

              setXrayImageUrl(null);
              setIsoImage(null);
              setViewMode('2D');
              
              setIsGeneratingXray(true);
              generateXRayVariant(fileData)
                .then(url => setXrayImageUrl(url))
                .catch(err => setHardwareState({ error: "X-Ray Gen Failed: " + err.message }))
                .finally(() => setIsGeneratingXray(false));

              // Trigger Schematic Analysis
              analyzeSchematic(fileData)
                .then(analysis => setHardwareState({ analysis, isLoading: false }))
                .catch(err => setHardwareState({ error: "Analysis Failed: " + err.message, isLoading: false }));
          }
      }
  };

  const runComponentSearch = async () => {
    if (!hardware.componentQuery) return;
    setIsSearching(true);
    setHardwareState({ error: null });

    try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
       if (!hasKey) {
           await promptSelectKey();
           setIsSearching(false);
           return;
       }
        const results = await researchComponents(hardware.componentQuery);
        setHardwareState({ recommendations: results });
    } catch (err: any) {
        setHardwareState({ error: err.message || "Search failed." });
    } finally {
        setIsSearching(false);
    }
  };

  const addToBom = (rec: ComponentRecommendation) => {
      if (!bom.find(i => i.partNumber === rec.partNumber)) {
          setBom(prev => [...prev, rec]);
      }
  };

  const exportBom = () => {
      const headers = ["Part Number", "Manufacturer", "Description", "Lead Time", "Stock", "Link"];
      const rows = bom.map(i => [
          i.partNumber,
          i.manufacturer,
          `"${i.description.replace(/"/g, '""')}"`,
          i.specs["Lead Time"] || "N/A",
          i.specs["Stock Status"] || "N/A",
          i.specs["Buy Link"] || "N/A"
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "basix_bom.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleHeatClick = (e: React.MouseEvent) => {
      if (activeTier !== 'TIER_2' || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      heatSourcesRef.current.push({
          x, y, baseX: x, baseY: y,
          intensity: 0.8,
          freq: 0.1,
          dx: 0.01,
          dy: 0.01
      });
  };

  const handleHeatHover = (e: React.MouseEvent) => {
      if (activeTier !== 'TIER_2' || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      let totalHeat = 0;
      heatSourcesRef.current.forEach(src => {
          const dist = Math.sqrt((x - src.x)**2 + (y - src.y)**2);
          totalHeat += (src.intensity * 100) / (1 + dist * 0.1);
      });
      
      setThermalProbe({ 
          x, y, 
          temp: 25 + totalHeat - (cooling * 10) 
      });
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden border border-[#1f1f1f] rounded shadow-2xl">
      {/* Background Matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

      {/* Header */}
      <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6">
         <div className="flex items-center gap-3">
             <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                 <Server className="w-4 h-4 text-[#9d4edd]" />
             </div>
             <div>
                 <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">BASIX Hardware Evolution Protocol</h1>
                 <p className="text-[9px] font-mono text-gray-500 uppercase">Sovereign Simulation Engine Infrastructure</p>
             </div>
         </div>
         
         <div className="flex bg-[#111] p-1 rounded border border-[#333]">
             <button
                onClick={() => setActiveTier('TIER_1')}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 ${activeTier === 'TIER_1' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 <Box className="w-3 h-3" />
                 2025: Foundation
             </button>
             <button
                onClick={() => setActiveTier('TIER_2')}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 ${activeTier === 'TIER_2' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 <Layers className="w-3 h-3" />
                 2030: Evolution
             </button>
             <button
                onClick={() => setActiveTier('TIER_3')}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 ${activeTier === 'TIER_3' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 <Globe className="w-3 h-3" />
                 2035: Singularity
             </button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative z-10 flex">
          
          {/* TIER 1: FOUNDATION (COMPONENTS & X-RAY) */}
          {activeTier === 'TIER_1' && (
              <div className="w-full h-full flex gap-6 p-6">
                  {/* Left: Component Scout */}
                  <div className="w-1/3 flex flex-col bg-[#050505] border border-[#1f1f1f]">
                      <div className="p-4 border-b border-[#1f1f1f] bg-[#0a0a0a]">
                          <h3 className="text-[10px] font-bold font-mono uppercase text-[#9d4edd] flex items-center gap-2">
                              <Search className="w-3 h-3" />
                              Compute Supply Chain
                          </h3>
                      </div>
                      <div className="p-4 flex flex-col flex-1 overflow-hidden">
                           <div className="flex gap-2 mb-4">
                               <input 
                                   type="text" 
                                   value={hardware.componentQuery}
                                   onChange={(e) => setHardwareState({ componentQuery: e.target.value })}
                                   onKeyDown={(e) => e.key === 'Enter' && runComponentSearch()}
                                   placeholder="Search H100, ZK ASIC, SmartNIC..."
                                   className="flex-1 bg-[#111] border border-[#333] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#9d4edd]"
                               />
                               <button 
                                   onClick={runComponentSearch}
                                   disabled={isSearching}
                                   className="px-3 bg-[#9d4edd] text-black hover:bg-[#b06bf7] disabled:opacity-50"
                               >
                                   {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                               </button>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                               {hardware.recommendations.length === 0 ? (
                                   <div className="text-center text-gray-600 mt-10">
                                       <Cpu className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                       <p className="text-[9px] font-mono uppercase">Provision Core Compute Nodes</p>
                                   </div>
                               ) : (
                                   hardware.recommendations.map((rec, i) => (
                                       <div key={i} className="bg-[#111] border border-[#333] p-3 hover:border-[#9d4edd] group">
                                           <div className="flex justify-between">
                                                <span className="text-xs font-bold text-gray-200 group-hover:text-[#9d4edd]">{rec.partNumber}</span>
                                                <button onClick={() => addToBom(rec)} className="text-gray-500 hover:text-white"><Plus className="w-3 h-3" /></button>
                                           </div>
                                           <p className="text-[9px] text-gray-500 uppercase">{rec.manufacturer}</p>
                                       </div>
                                   ))
                               )}
                           </div>
                           
                           {/* BOM Mini-View */}
                           {bom.length > 0 && (
                               <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="text-[9px] font-mono text-gray-500 uppercase">Provisioning List ({bom.length})</span>
                                       <button onClick={exportBom} className="text-[#9d4edd] text-[9px] hover:underline">EXPORT CSV</button>
                                   </div>
                               </div>
                           )}
                      </div>
                  </div>

                  {/* Right: X-Ray Inspector & Analysis */}
                  <div className="flex-1 flex gap-4">
                        <div className="flex-1 flex flex-col">
                            {!hardware.schematicImage && !isCameraOpen ? (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#333] rounded-lg bg-[#050505] hover:border-[#9d4edd] transition-colors group relative">
                                    <div className="mb-6 w-20 h-20 bg-[#111] rounded-full flex items-center justify-center border border-[#333] group-hover:border-[#9d4edd]">
                                        <Upload className="w-8 h-8 text-gray-500 group-hover:text-[#9d4edd] transition-colors" />
                                    </div>
                                    <h2 className="text-sm font-mono uppercase text-gray-300 mb-2">Inspect Core Node Architecture</h2>
                                    <p className="text-[10px] text-gray-600 font-mono mb-6 max-w-xs text-center">Upload schematic of H100 Node, ZK Accelerator, or Network Switch for X-Ray Analysis</p>
                                    
                                    <div className="flex gap-4">
                                        <label className="bg-[#9d4edd] text-black px-6 py-2 text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-[#b06bf7] cursor-pointer flex items-center shadow-lg">
                                            <Upload className="w-3 h-3 mr-2" />
                                            Upload Node
                                            <input type="file" onChange={handleSchematicUpload} className="hidden" accept="image/*" />
                                        </label>
                                        <button 
                                            onClick={startCamera}
                                            className="bg-[#1f1f1f] text-[#9d4edd] border border-[#333] px-6 py-2 text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-[#333] flex items-center"
                                        >
                                            <Camera className="w-3 h-3 mr-2" />
                                            Optical Scan
                                        </button>
                                    </div>
                                </div>
                            ) : isCameraOpen ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
                                    <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline></video>
                                    <div className="absolute bottom-8 flex gap-4">
                                        <button onClick={captureImage} className="w-16 h-16 rounded-full border-4 border-[#9d4edd] bg-transparent hover:bg-[#9d4edd]/20 transition-colors"></button>
                                        <button onClick={stopCamera} className="w-16 h-16 rounded-full bg-red-900/50 border border-red-500 flex items-center justify-center hover:bg-red-900"><X className="w-6 h-6 text-white" /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 relative bg-black border border-[#333] rounded overflow-hidden flex flex-col">
                                    
                                    {/* View Toggle Header */}
                                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                                        <button
                                            onClick={toggleIsoView}
                                            disabled={isGeneratingIso}
                                            className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider border rounded backdrop-blur transition-all flex items-center gap-2
                                                ${viewMode === '3D' ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-black/60 text-gray-400 border-[#333] hover:text-white hover:border-gray-500'}`}
                                        >
                                            {isGeneratingIso ? <Loader2 className="w-3 h-3 animate-spin"/> : <BoxSelect className="w-3 h-3" />}
                                            {viewMode === '3D' ? 'ISO 3D' : '2D SCAN'}
                                        </button>
                                    </div>

                                    {/* Content Area */}
                                    <div className="flex-1 relative">
                                        {hardware.schematicImage && (
                                            viewMode === '3D' ? (
                                                isGeneratingIso ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                                                        <Loader2 className="w-12 h-12 text-[#9d4edd] animate-spin mb-4" />
                                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#9d4edd] animate-pulse">Rendering 3D Isometric View...</p>
                                                    </div>
                                                ) : isoImage ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-[#050505]">
                                                        <img src={isoImage} className="max-w-full max-h-full object-contain" alt="Isometric View" />
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs font-mono">ISO Generation Pending</div>
                                                )
                                            ) : (
                                                isGeneratingXray ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <Loader2 className="w-12 h-12 text-[#9d4edd] animate-spin mb-4" />
                                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#9d4edd] animate-pulse">Generating BASIX Node X-Ray...</p>
                                                    </div>
                                                ) : xrayImageUrl ? (
                                                    <XRayScanner 
                                                            baseImage={`data:${hardware.schematicImage.inlineData.mimeType};base64,${hardware.schematicImage.inlineData.data}`}
                                                            xrayImage={xrayImageUrl}
                                                    />
                                                ) : (
                                                    <img 
                                                            src={`data:${hardware.schematicImage.inlineData.mimeType};base64,${hardware.schematicImage.inlineData.data}`} 
                                                            className="w-full h-full object-contain" 
                                                            alt="Base"
                                                    />
                                                )
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Analysis Panel Sidebar */}
                        {hardware.analysis && (
                            <SchematicAnalysisPanel analysis={hardware.analysis} />
                        )}
                  </div>
              </div>
          )}

          {/* TIER 2: EVOLUTION (IMMERSION THERMAL SIM) */}
          {activeTier === 'TIER_2' && (
              <div className="w-full h-full p-6 flex gap-6">
                  <div className="flex-1 bg-black border border-[#333] relative rounded overflow-hidden cursor-crosshair group">
                       <canvas 
                            ref={canvasRef} 
                            width={800} 
                            height={600} 
                            className="w-full h-full object-cover"
                            onClick={handleHeatClick}
                            onMouseMove={handleHeatHover}
                            onMouseLeave={() => setThermalProbe(null)}
                       />
                       <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur p-2 border border-[#333] rounded text-[10px] font-mono">
                           <div className="flex items-center gap-2 text-gray-400 mb-1">
                               <Thermometer className="w-3 h-3" />
                               <span>Avg Fluid Temp: {(45 - cooling * 10).toFixed(1)}°C</span>
                           </div>
                           <div className="flex items-center gap-2 text-[#9d4edd]">
                               <Activity className="w-3 h-3" />
                               <span>Immersion Cooling Physics: ACTIVE</span>
                           </div>
                       </div>
                       
                       {thermalProbe && (
                           <div 
                                className="absolute pointer-events-none bg-black/90 border border-[#9d4edd] px-2 py-1 rounded text-[9px] font-mono text-[#9d4edd] whitespace-nowrap z-50 transform -translate-y-full -translate-x-1/2 mt-[-10px]"
                                style={{ top: thermalProbe.y, left: thermalProbe.x }}
                           >
                               {thermalProbe.temp.toFixed(1)}°C
                           </div>
                       )}
                  </div>

                  <div className="w-64 bg-[#050505] border border-[#1f1f1f] p-4 flex flex-col">
                       <h3 className="text-[10px] font-bold font-mono uppercase text-[#9d4edd] mb-6">Immersion Tank Control</h3>
                       
                       <div className="space-y-6 flex-1">
                           <div>
                               <label className="text-[9px] text-gray-500 uppercase flex items-center gap-2 mb-2">
                                    <Droplets className="w-3 h-3" />
                                    Dielectric Viscosity
                               </label>
                               <input 
                                    type="range" 
                                    min="0.01" max="0.2" step="0.01"
                                    value={conductivity}
                                    onChange={(e) => setConductivity(parseFloat(e.target.value))}
                                    className="w-full accent-[#9d4edd] h-1 bg-[#333] rounded-full appearance-none"
                               />
                           </div>
                           
                           <div>
                               <label className="text-[9px] text-gray-500 uppercase flex items-center gap-2 mb-2">
                                    <Wind className="w-3 h-3" />
                                    Active Cooling Flow
                               </label>
                               <input 
                                    type="range" 
                                    min="0" max="2.0" step="0.1"
                                    value={cooling}
                                    onChange={(e) => setCooling(parseFloat(e.target.value))}
                                    className="w-full accent-[#42be65] h-1 bg-[#333] rounded-full appearance-none"
                               />
                               <div className="flex justify-between text-[9px] font-mono text-gray-600 mt-1">
                                   <span>PASSIVE</span>
                                   <span>OVERCLOCK</span>
                               </div>
                           </div>

                           <div className="p-3 bg-[#111] rounded border border-[#333]">
                               <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                                   Simulate thermal load of submerged ASIC/GPU arrays. Click to add compute hotspots. High flow rates reduce hotspot intensity.
                               </p>
                           </div>
                       </div>

                       {/* Thermal Legend */}
                       <div className="mt-6 border-t border-[#1f1f1f] pt-6 relative">
                           <h3 className="text-[10px] font-bold font-mono uppercase text-[#9d4edd] mb-3">Thermal Legend</h3>
                           <div className="h-4 w-full rounded-sm mb-2 relative" style={{
                               background: 'linear-gradient(to right, #000033 0%, #0000ff 20%, #00ffff 40%, #ffff00 60%, #ff0000 80%, #ffffff 100%)'
                           }}>
                                {/* Dynamic Indicator */}
                                {thermalProbe && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-0.5 bg-white border-x border-black shadow-[0_0_5px_white]"
                                        style={{ 
                                            left: `${Math.min(100, Math.max(0, (thermalProbe.temp - (25 - cooling*10)) / 85 * 100))}%` 
                                        }}
                                    />
                                )}
                           </div>
                           <div className="flex justify-between text-[9px] font-mono text-gray-500">
                               <span>{(25 - cooling * 10).toFixed(0)}°C</span>
                               <span>{(60 - cooling * 10).toFixed(0)}°C</span>
                               <span className="text-[#9d4edd]">{(110 - cooling * 10).toFixed(0)}°C (CRIT)</span>
                           </div>
                       </div>
                  </div>
              </div>
          )}

          {/* TIER 3: SINGULARITY (GLOBAL TWIN) */}
          {activeTier === 'TIER_3' && (
              <GlobalComputeTwin />
          )}
      </div>
    </div>
  );
};

export default HardwareEngine;
