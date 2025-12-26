import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeNode } from '../types';
import { BrainCircuit, X, Search, GitBranch, Sparkles, Target, Zap, Activity, Info, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { renderSafe } from '../utils/renderSafe';
import { audio } from '../services/audioService';

interface KnowledgeGraphProps {
    nodes: KnowledgeNode[];
    onNodeClick?: (node: KnowledgeNode) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ nodes, onNodeClick }) => {
    const { addResearchTask, addLog } = useAppStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Physics Simulation Engine
    const simulationNodes = useMemo(() => nodes.map(n => ({
        ...n,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
        mass: n.type === 'HYPOTHESIS' ? 2 : 1
    })), [nodes]);

    const activeNode = useMemo(() => simulationNodes.find(n => n.id === selectedNodeId), [simulationNodes, selectedNodeId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const width = canvas.width = canvas.parentElement?.offsetWidth || 800;
        const height = canvas.height = canvas.parentElement?.offsetHeight || 600;

        const loop = () => {
            ctx.clearRect(0, 0, width, height);

            // Force-Directed Layout Physics
            simulationNodes.forEach((n1, i) => {
                // Repulsion
                simulationNodes.forEach((n2, j) => {
                    if (i === j) return;
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const d2 = dx*dx + dy*dy || 1;
                    const force = 1200 / d2;
                    n1.vx += dx * force;
                    n1.vy += dy * force;
                });

                // Central Gravity
                const dx = width / 2 - n1.x;
                const dy = height / 2 - n1.y;
                n1.vx += dx * 0.02;
                n1.vy += dy * 0.02;

                // Attraction (Connections)
                n1.connections.forEach(cid => {
                    const n2 = simulationNodes.find(sn => sn.id === cid);
                    if (n2) {
                        const dxx = n2.x - n1.x;
                        const dyy = n2.y - n1.y;
                        const dist = Math.sqrt(dxx*dxx + dyy*dyy) || 1;
                        const force = (dist - 140) * 0.035;
                        n1.vx += (dxx / dist) * force;
                        n1.vy += (dyy / dist) * force;
                    }
                });

                // Friction & Movement
                n1.x += n1.vx;
                n1.y += n1.vy;
                n1.vx *= 0.75;
                n1.vy *= 0.75;

                // Bounds
                n1.x = Math.max(40, Math.min(width - 40, n1.x));
                n1.y = Math.max(40, Math.min(height - 40, n1.y));
            });

            // Draw Layer 1: Global Connections
            ctx.lineWidth = 1;
            simulationNodes.forEach(n1 => {
                n1.connections.forEach(cid => {
                    const n2 = simulationNodes.find(sn => sn.id === cid);
                    if (n2) {
                        const isFocused = selectedNodeId === n1.id || selectedNodeId === n2.id;
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.strokeStyle = isFocused ? '#9d4edd99' : '#1a1a1a';
                        if (isFocused) ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.lineWidth = 1;
                    }
                });
            });

            // Draw Layer 2: Semantic Nodes
            simulationNodes.forEach(n => {
                const isSelected = selectedNodeId === n.id;
                const isHovered = hoveredNodeId === n.id;
                const isMatch = searchTerm && (n.label || '').toLowerCase().includes(searchTerm.toLowerCase());
                const radius = isSelected ? 14 : (isHovered || isMatch) ? 12 : 7;
                
                ctx.globalAlpha = (searchTerm && !isMatch && !isSelected) ? 0.1 : 1;
                
                // Glow
                if (isSelected || isMatch) {
                    ctx.shadowBlur = 25;
                    ctx.shadowColor = isMatch ? '#22d3ee' : (n.color || '#9d4edd');
                }

                ctx.beginPath();
                ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? '#ffffff' : (isMatch ? '#22d3ee' : (n.color || '#333'));
                ctx.fill();
                
                ctx.shadowBlur = 0;
                
                if (isSelected || isHovered || isMatch) {
                    ctx.font = `black ${isSelected ? '12px' : '10px'} Fira Code`;
                    ctx.fillStyle = isMatch ? '#22d3ee' : '#fff';
                    ctx.textAlign = 'center';
                    const text = (n.label || '').toUpperCase();
                    ctx.fillText(text.substring(0, 20), n.x, n.y - (radius + 12));
                }
            });

            frameId = requestAnimationFrame(loop);
        };

        loop();
        return () => cancelAnimationFrame(frameId);
    }, [simulationNodes, selectedNodeId, hoveredNodeId, searchTerm]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = simulationNodes.find(n => Math.hypot(n.x - x, n.y - y) < 25);
        if (hit) {
            setSelectedNodeId(hit.id);
            audio.playClick();
            if (onNodeClick) onNodeClick(hit);
        } else {
            setSelectedNodeId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = simulationNodes.find(n => Math.hypot(n.x - x, n.y - y) < 20);
        setHoveredNodeId(hit?.id || null);
    };

    const handleBranch = () => {
        if (!activeNode) return;
        addResearchTask({
            id: crypto.randomUUID(),
            query: `Recursive Branch: "${activeNode.label}"`,
            status: 'QUEUED',
            progress: 0,
            logs: [`Establishing mission vector from Parent_ID: ${activeNode.id.substring(0,6)}`],
            timestamp: Date.now()
        });
        addLog('SUCCESS', `LATTICE_BRANCH: Spawning autonomous probe for "${activeNode.label}"`);
        audio.playTransition();
        setSelectedNodeId(null);
    };

    return (
        <div className="relative w-full h-full bg-[#030303] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl group/graph">
            {/* HUD Overlays */}
            <div className="absolute top-8 left-10 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd] border border-[#9d4edd]/30 shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <span className="text-xs font-black font-mono text-white uppercase tracking-[0.5em]">Neural Lattice</span>
                        <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mt-1">Multi-Node Vector Visualization // v3.2</div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-10 left-10 z-20 flex items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl px-5 py-3 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                <Search size={14} className="text-gray-600 group-focus-within/graph:text-[#22d3ee] transition-colors" />
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Locate Node Protocol..."
                    className="bg-transparent border-none outline-none text-[10px] font-mono text-white w-48 uppercase placeholder:text-gray-800"
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-white/5 rounded-lg"><X size={12} className="text-gray-500" /></button>}
            </div>

            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-crosshair opacity-80"
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
            />
            
            {/* Inspector Modal */}
            <AnimatePresence>
                {selectedNodeId && activeNode && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20 }}
                        className="absolute top-10 right-10 w-80 bg-[#0a0a0a]/98 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,1)] z-[100] flex flex-col gap-8"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-1.5">Sector: {activeNode.type || 'CONCEPT'}</span>
                                <h4 className="text-xl font-black text-white font-mono uppercase tracking-tighter truncate max-w-[200px]">
                                    {activeNode.label}
                                </h4>
                            </div>
                            <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group/info">
                                <div className="absolute top-0 right-0 p-3 opacity-[0.05] group-hover/info:opacity-10 transition-opacity"><Info size={40} /></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity size={10} className="text-[#9d4edd]" />
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Structural metadata</span>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed font-mono italic">
                                    "{renderSafe(activeNode.data?.summary || 'Discrete logic fragment stabilized in the long-term vault.')}"
                                </p>
                            </div>
                            
                            <div className="pt-2 flex flex-col gap-3">
                                <button onClick={handleBranch} className="w-full py-4 bg-[#9d4edd] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(157,78,221,0.3)] group/branch">
                                    <GitBranch size={16} className="group-hover/branch:scale-110 transition-transform" /> Initialize Branch Probe
                                </button>
                                <button className="w-full py-3.5 bg-[#111] border border-[#222] text-gray-500 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <Target size={14} /> Re-Center Viewport
                                </button>
                            </div>
                        </div>
                        
                        <div className="h-px w-full bg-white/5" />
                        <div className="flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                            <span>Rel: {activeNode.connections.length} nodes</span>
                            <span className="text-[#22d3ee]">Signal_Stable</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default KnowledgeGraph;