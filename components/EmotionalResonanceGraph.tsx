
import React, { useRef, useState, useEffect } from 'react';
import { ResonancePoint } from '../types';
import { useAppStore } from '../store';
import { Activity, Sliders, RefreshCw, AudioWaveform, Zap } from 'lucide-react';

const EmotionalResonanceGraph: React.FC = () => {
    const { imageGen, setImageGenState } = useAppStore();
    const { resonanceCurve } = imageGen;
    
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<{ index: number; type: 'tension' | 'dynamics' } | null>(null);
    
    // Mixer State
    const [tensionBias, setTensionBias] = useState(0); // -20 to +20
    const [dynamicsRange, setDynamicsRange] = useState(1); // 0.5 to 1.5

    const width = 600;
    const height = 150;
    const padding = 20;
    const pointsCount = 10;
    const xStep = (width - padding * 2) / (pointsCount - 1);

    // --- ALGORITHMS ---
    const applyAlgorithm = (algo: 'HERO' | 'CHAOS' | 'RISING' | 'STEADY') => {
        const newCurve = resonanceCurve.map((_, i) => {
            const progress = i / (pointsCount - 1);
            let t = 50;
            let d = 50;

            if (algo === 'HERO') {
                // Classic build up, dip (dark night), climax, resolve
                t = 30 + Math.sin(progress * Math.PI * 1.5) * 40; 
                d = 40 + Math.sin(progress * Math.PI * 2) * 20;
                // Add a spike near end
                if (i === 8) { t = 90; d = 90; }
            } else if (algo === 'CHAOS') {
                t = Math.random() * 80 + 10;
                d = Math.random() * 80 + 10;
            } else if (algo === 'RISING') {
                t = 20 + progress * 70;
                d = 30 + progress * 60;
            } else if (algo === 'STEADY') {
                t = 60 + Math.sin(progress * 10) * 5;
                d = 40 + Math.cos(progress * 10) * 5;
            }

            return { frame: i, tension: Math.max(0, Math.min(100, t)), dynamics: Math.max(0, Math.min(100, d)) };
        });
        setImageGenState({ resonanceCurve: newCurve });
    };

    // --- MIXER LOGIC ---
    // Applies bias/range changes non-destructively to a temp view or directly
    // Ideally, we'd store baseCurve and apply modifiers. 
    // For simplicity, we apply changes to the curve directly on drag end of slider to avoid state drift.
    // Or we just update `resonanceCurve` live.
    const applyMixer = (newBias: number, newRange: number) => {
        setTensionBias(newBias);
        setDynamicsRange(newRange);
        
        // This is a destructive operation in this simple implementation, 
        // effectively re-normalizing the current curve.
        // To be truly non-destructive, we'd need 'baseCurve' in store. 
        // For now, we assume user drags slider = modifies current state.
        
        const center = 50;
        const newCurve = resonanceCurve.map(p => ({
            ...p,
            tension: Math.max(0, Math.min(100, p.tension + newBias * 0.1)), // Incremental nudges
            dynamics: Math.max(0, Math.min(100, center + (p.dynamics - center) * newRange))
        }));
        
        // Only apply if user interaction stopped, otherwise it compounds?
        // Actually, let's just make the slider apply a one-time transform logic or 
        // simply don't support "live" sliders modifying state continuously in a loop without base state.
        // Alternative: The sliders just trigger a small nudge.
    };
    
    // Better Mixer: Sliders that just act as "Pushers"
    const nudgeTension = (amount: number) => {
        const newCurve = resonanceCurve.map(p => ({
            ...p,
            tension: Math.max(0, Math.min(100, p.tension + amount))
        }));
        setImageGenState({ resonanceCurve: newCurve });
    };

    const scaleDynamics = (factor: number) => {
        const newCurve = resonanceCurve.map(p => ({
            ...p,
            dynamics: Math.max(0, Math.min(100, 50 + (p.dynamics - 50) * factor))
        }));
        setImageGenState({ resonanceCurve: newCurve });
    };

    const handleMouseDown = (index: number, type: 'tension' | 'dynamics') => {
        setDragging({ index, type });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !svgRef.current) return;
        
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
        setDragging(null);
    };

    const getPath = (type: 'tension' | 'dynamics') => {
        if (resonanceCurve.length === 0) return '';
        
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

    return (
        <div className="w-full bg-[#050505] border border-[#222] rounded-lg overflow-hidden relative group">
            
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#222] bg-[#0a0a0a]">
                <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest">
                    <span className="text-[#9d4edd] flex items-center gap-1"><Activity className="w-3 h-3"/> Narrative Tension</span>
                    <span className="text-[#22d3ee] flex items-center gap-1"><AudioWaveform className="w-3 h-3"/> Visual Dynamics</span>
                </div>
                
                {/* Generative Synthesizer Buttons */}
                <div className="flex gap-1">
                    <button onClick={() => applyAlgorithm('HERO')} className="px-2 py-1 hover:bg-[#222] rounded text-[8px] font-mono text-gray-400 hover:text-white uppercase transition-colors" title="Hero's Journey">Hero</button>
                    <button onClick={() => applyAlgorithm('RISING')} className="px-2 py-1 hover:bg-[#222] rounded text-[8px] font-mono text-gray-400 hover:text-white uppercase transition-colors" title="Linear Rise">Rise</button>
                    <button onClick={() => applyAlgorithm('CHAOS')} className="px-2 py-1 hover:bg-[#222] rounded text-[8px] font-mono text-gray-400 hover:text-white uppercase transition-colors" title="Randomize">Chaos</button>
                    <button onClick={() => applyAlgorithm('STEADY')} className="px-2 py-1 hover:bg-[#222] rounded text-[8px] font-mono text-gray-400 hover:text-white uppercase transition-colors" title="Consistent">Flow</button>
                </div>
            </div>

            {/* Graph Area */}
            <div className="relative p-4 bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
                <svg 
                    ref={svgRef}
                    width="100%" 
                    height="150" 
                    viewBox={`0 0 ${width} ${height}`}
                    className="overflow-visible cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <defs>
                        <linearGradient id="grid-fade" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#333" stopOpacity="0.2"/>
                            <stop offset="100%" stopColor="#333" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <rect x={padding} y={padding} width={width - padding*2} height={height - padding*2} fill="url(#grid-fade)" />
                    
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="#222" strokeWidth="1" />
                    
                    <path d={getPath('tension')} fill="none" stroke="#9d4edd" strokeWidth="2" className="drop-shadow-[0_0_5px_rgba(157,78,221,0.5)]" />
                    <path d={getPath('dynamics')} fill="none" stroke="#22d3ee" strokeWidth="2" className="drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />

                    {resonanceCurve.map((p, i) => {
                        const x = padding + i * xStep;
                        const yTension = (height - padding) - (p.tension / 100) * (height - padding * 2);
                        const yDynamics = (height - padding) - (p.dynamics / 100) * (height - padding * 2);

                        return (
                            <g key={i}>
                                <circle 
                                    cx={x} cy={yTension} r={6} 
                                    fill="#050505" stroke="#9d4edd" strokeWidth={2}
                                    className="cursor-ns-resize hover:fill-[#9d4edd] transition-colors"
                                    onMouseDown={() => handleMouseDown(i, 'tension')}
                                />
                                <circle 
                                    cx={x} cy={yDynamics} r={4} 
                                    fill="#050505" stroke="#22d3ee" strokeWidth={2}
                                    className="cursor-ns-resize hover:fill-[#22d3ee] transition-colors"
                                    onMouseDown={() => handleMouseDown(i, 'dynamics')}
                                />
                                <line x1={x} y1={height - padding} x2={x} y2={height - padding + 5} stroke="#333" strokeWidth="1" />
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Mixer Controls (Bottom) */}
            <div className="grid grid-cols-2 gap-4 p-4 border-t border-[#222] bg-[#080808]">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                        <span>Tension Bias</span>
                        <span className="text-[#9d4edd]">SHIFT</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => nudgeTension(-10)} className="px-2 py-1 bg-[#1f1f1f] rounded text-[9px] hover:text-white">-</button>
                        <div className="flex-1 h-6 bg-[#111] rounded flex items-center px-2 relative overflow-hidden">
                            <div className="w-full h-0.5 bg-[#333]"></div>
                            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#9d4edd] rounded-full -translate-y-1/2 -translate-x-1/2"></div>
                        </div>
                        <button onClick={() => nudgeTension(10)} className="px-2 py-1 bg-[#1f1f1f] rounded text-[9px] hover:text-white">+</button>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                        <span>Dynamics Range</span>
                        <span className="text-[#22d3ee]">AMP</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => scaleDynamics(0.9)} className="px-2 py-1 bg-[#1f1f1f] rounded text-[9px] hover:text-white">-</button>
                        <div className="flex-1 h-6 bg-[#111] rounded flex items-center px-2 relative overflow-hidden">
                            <div className="w-full h-0.5 bg-[#333]"></div>
                            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#22d3ee] rounded-full -translate-y-1/2 -translate-x-1/2"></div>
                        </div>
                        <button onClick={() => scaleDynamics(1.1)} className="px-2 py-1 bg-[#1f1f1f] rounded text-[9px] hover:text-white">+</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmotionalResonanceGraph;
