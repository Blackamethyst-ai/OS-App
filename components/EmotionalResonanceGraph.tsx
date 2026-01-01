import React, { useRef, useState, useEffect } from 'react';
import { ResonancePoint } from '../types';
import { useAppStore } from '../store';
import { Activity, Sliders, RefreshCw, AudioWaveform, Zap, MousePointer2 } from 'lucide-react';
// Fix: Import motion from framer-motion to resolve "Cannot find name 'motion'" errors
import { motion } from 'framer-motion';
// Fix: Import audio service to resolve "Cannot find name 'audio'" errors
import { audio } from '../services/audioService';

const EmotionalResonanceGraph: React.FC = () => {
    const imageGen = useAppStore(s => s.imageGen);
    const setImageGenState = useAppStore(s => s.actions.setImageGenState);
    const { resonanceCurve } = imageGen;
    
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<{ index: number; type: 'tension' | 'dynamics' } | null>(null);
    
    const width = 600;
    const height = 240; 
    const padding = 25;
    const pointsCount = 10;
    const xStep = (width - padding * 2) / (pointsCount - 1);

    const applyAlgorithm = (algo: 'HERO' | 'CHAOS' | 'RISING' | 'STEADY') => {
        if (!Array.isArray(resonanceCurve)) return;
        const newCurve = resonanceCurve.map((_, i) => {
            const progress = i / (pointsCount - 1);
            let t = 50;
            let d = 50;

            if (algo === 'HERO') {
                t = 30 + Math.sin(progress * Math.PI * 1.5) * 40; 
                d = 40 + Math.sin(progress * Math.PI * 2) * 20;
                if (i === 8) { t = 95; d = 90; }
            } else if (algo === 'CHAOS') {
                t = Math.random() * 80 + 10;
                d = Math.random() * 80 + 10;
            } else if (algo === 'RISING') {
                t = 15 + progress * 80;
                d = 20 + progress * 70;
            } else if (algo === 'STEADY') {
                t = 65 + Math.sin(progress * 12) * 8;
                d = 45 + Math.cos(progress * 12) * 8;
            }

            return { frame: i, tension: Math.max(0, Math.min(100, t)), dynamics: Math.max(0, Math.min(100, d)) };
        });
        setImageGenState({ resonanceCurve: newCurve });
        // Fix: Use audio service for haptic feedback
        audio.playClick();
    };

    const nudgeTension = (amount: number) => {
        if (!Array.isArray(resonanceCurve)) return;
        const newCurve = resonanceCurve.map(p => ({
            ...p,
            tension: Math.max(0, Math.min(100, p.tension + amount))
        }));
        setImageGenState({ resonanceCurve: newCurve });
        // Fix: Use audio service for haptic feedback
        audio.playClick();
    };

    const handleMouseDown = (index: number, type: 'tension' | 'dynamics', e: React.MouseEvent) => {
        e.stopPropagation();
        setDragging({ index, type });
        // Fix: Use audio service for selection feedback
        audio.playHover();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !svgRef.current || !Array.isArray(resonanceCurve)) return;
        
        const rect = svgRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        const rawVal = ((height - padding - y) / (height - padding * 2)) * 100;
        const newVal = Math.max(0, Math.min(100, rawVal));

        const newCurve = [...resonanceCurve];
        newCurve[dragging.index] = {
            ...newCurve[dragging.index],
            [dragging.type]: Math.round(newVal)
        };
        
        setImageGenState({ resonanceCurve: newCurve });
    };

    const handleMouseUp = () => {
        // Fix: Provide release feedback via audio service
        if (dragging) audio.playClick();
        setDragging(null);
    };

    const getPath = (type: 'tension' | 'dynamics') => {
        if (!Array.isArray(resonanceCurve) || resonanceCurve.length === 0) return '';
        
        const points = resonanceCurve.map((p, i) => {
            const x = padding + i * xStep;
            const y = (height - padding) - (p[type] / 100) * (height - padding * 2);
            return [x, y];
        });

        let d = `M ${points[0][0]} ${points[0][1]}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cp1x = p0[0] + (p1[0] - p0[0]) / 2;
            const cp1y = p0[1];
            const cp2x = p0[0] + (p1[0] - p0[0]) / 2;
            const cp2y = p1[1];
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1[0]} ${p1[1]}`;
        }
        return d;
    };

    if (!Array.isArray(resonanceCurve)) return null;

    return (
        <div className="w-full h-full bg-[#050505] border border-white/5 rounded-2xl overflow-hidden relative group flex flex-col shadow-inner">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/5 bg-[#0a0a0a] shrink-0">
                <div className="flex items-center gap-6 text-[9px] font-mono uppercase tracking-[0.2em]">
                    <span className="text-[#9d4edd] flex items-center gap-2 font-black">
                        <Activity className="w-3.5 h-3.5"/> Tension_Arc
                    </span>
                    <span className="text-[#22d3ee] flex items-center gap-2 font-black">
                        <AudioWaveform className="w-3.5 h-3.5"/> Dynamics_Field
                    </span>
                </div>
                
                <div className="flex gap-2">
                    {['HERO', 'RISING', 'CHAOS', 'STEADY'].map(algo => (
                        <button 
                            key={algo}
                            onClick={() => applyAlgorithm(algo as any)} 
                            className="px-2.5 py-1 bg-white/5 hover:bg-[#222] rounded-lg text-[8px] font-black font-mono text-gray-500 hover:text-white uppercase transition-all border border-transparent hover:border-white/10"
                        >
                            {algo}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 relative p-6 bg-gradient-to-b from-[#0a0a0a] to-[#030303]">
                <svg 
                    ref={svgRef}
                    width="100%" 
                    height="100%" 
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    className="overflow-visible"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <defs>
                        <linearGradient id="grid-glow" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#9d4edd" stopOpacity="0.05"/>
                            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.02"/>
                            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    
                    <rect x={padding} y={padding} width={width - padding*2} height={height - padding*2} fill="url(#grid-glow)" />
                    
                    {/* Grid lines */}
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#222" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#222" strokeWidth="1" strokeDasharray="5 10" />
                    <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="#1a1a1a" strokeWidth="0.5" />
                    
                    <path d={getPath('tension')} fill="none" stroke="#9d4edd" strokeWidth="3" className="drop-shadow-[0_0_12px_rgba(157,78,221,0.6)] transition-all" />
                    <path d={getPath('dynamics')} fill="none" stroke="#22d3ee" strokeWidth="3" className="drop-shadow-[0_0_12px_rgba(34,211,238,0.6)] transition-all" />

                    {resonanceCurve.map((p, i) => {
                        const x = padding + i * xStep;
                        const yTension = (height - padding) - (p.tension / 100) * (height - padding * 2);
                        const yDynamics = (height - padding) - (p.dynamics / 100) * (height - padding * 2);

                        return (
                            <g key={i}>
                                {/* Alignment Line */}
                                <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="white" strokeOpacity="0.03" strokeWidth="1" />
                                
                                <circle 
                                    cx={x} cy={yTension} r={dragging?.index === i && dragging?.type === 'tension' ? 9 : 7} 
                                    fill="#050505" stroke="#9d4edd" strokeWidth={2.5}
                                    className="cursor-ns-resize hover:fill-[#9d4edd] transition-all hover:scale-125"
                                    onMouseDown={(e) => handleMouseDown(i, 'tension', e)}
                                />
                                <circle 
                                    cx={x} cy={yDynamics} r={dragging?.index === i && dragging?.type === 'dynamics' ? 7 : 5} 
                                    fill="#050505" stroke="#22d3ee" strokeWidth={2}
                                    className="cursor-ns-resize hover:fill-[#22d3ee] transition-all hover:scale-125"
                                    onMouseDown={(e) => handleMouseDown(i, 'dynamics', e)}
                                />
                                
                                <text x={x} y={height - padding + 15} textAnchor="middle" fill="#444" fontSize="8" fontFamily="Fira Code" className="uppercase font-black">F{i+1}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 border-t border-white/5 bg-[#080808] shrink-0">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest px-1">
                        <span>Intensity Magnitude</span>
                        <span className="text-[#9d4edd]">Logic_Shift</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => nudgeTension(-10)} className="w-8 h-6 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-gray-400 hover:text-white transition-all">-</button>
                        <div className="flex-1 h-6 bg-black border border-white/5 rounded-lg flex items-center px-3 relative overflow-hidden group/slider">
                            <div className="w-full h-[1px] bg-white/10"></div>
                            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#9d4edd] rounded-full -translate-y-1/2 -translate-x-1/2 shadow-[0_0_8px_#9d4edd] group-hover/slider:scale-125 transition-transform"></div>
                        </div>
                        <button onClick={() => nudgeTension(10)} className="w-8 h-6 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-gray-400 hover:text-white transition-all">+</button>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest px-1">
                        <span>Dynamics Spectrum</span>
                        <span className="text-[#22d3ee]">Field_Amp</span>
                    </div>
                    <div className="flex items-center gap-4 px-1">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                             {/* Fix: Use motion.div for animated spectrum visualizer */}
                             <motion.div animate={{ width: '60%' }} className="h-full bg-[#22d3ee] shadow-[0_0_10px_#22d3ee]" />
                        </div>
                        <span className="text-[10px] font-black font-mono text-[#22d3ee]">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmotionalResonanceGraph;