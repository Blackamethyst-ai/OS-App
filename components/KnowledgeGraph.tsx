
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeNode } from '../types';
import { BrainCircuit, Link as LinkIcon, Info, X, Maximize2, Search, Target } from 'lucide-react';

interface KnowledgeGraphProps {
    nodes: KnowledgeNode[];
    onNodeClick?: (node: KnowledgeNode) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ nodes, onNodeClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    
    // Internal node state for simulation
    const simulationNodes = useMemo(() => nodes.map(n => ({
        ...n,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0
    })), [nodes]);

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

            // 1. Force Simulation (Simplified Spring-Mass)
            simulationNodes.forEach((n1, i) => {
                // Repulsion
                simulationNodes.forEach((n2, j) => {
                    if (i === j) return;
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const d2 = dx*dx + dy*dy || 1;
                    const force = 500 / d2;
                    n1.vx += dx * force;
                    n1.vy += dy * force;
                });

                // Spring to Center
                const dx = width / 2 - n1.x;
                const dy = height / 2 - n1.y;
                n1.vx += dx * 0.01;
                n1.vy += dy * 0.01;

                // Explicit Connections (Attractive force)
                n1.connections.forEach(cid => {
                    const n2 = simulationNodes.find(sn => sn.id === cid);
                    if (n2) {
                        const dx = n2.x - n1.x;
                        const dy = n2.y - n1.y;
                        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                        const force = (dist - 100) * 0.02;
                        n1.vx += (dx / dist) * force;
                        n1.vy += (dy / dist) * force;
                    }
                });

                // Friction & Movement
                n1.x += n1.vx;
                n1.y += n1.vy;
                n1.vx *= 0.8;
                n1.vy *= 0.8;

                // Wall bounds
                n1.x = Math.max(50, Math.min(width - 50, n1.x));
                n1.y = Math.max(50, Math.min(height - 50, n1.y));
            });

            // 2. Rendering Connections
            ctx.lineWidth = 1;
            simulationNodes.forEach(n1 => {
                n1.connections.forEach(cid => {
                    const n2 = simulationNodes.find(sn => sn.id === cid);
                    if (n2) {
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
                        grad.addColorStop(0, n1.color || '#9d4edd');
                        grad.addColorStop(1, n2.color || '#9d4edd');
                        ctx.strokeStyle = grad;
                        ctx.globalAlpha = 0.2;
                        ctx.stroke();
                    }
                });
            });

            // 3. Rendering Nodes
            simulationNodes.forEach(n => {
                const isSelected = selectedNodeId === n.id;
                const isHovered = hoveredNodeId === n.id;
                const radius = isSelected ? 8 : isHovered ? 6 : 4;
                
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = n.color || '#9d4edd';
                ctx.shadowBlur = isSelected ? 20 : 0;
                ctx.shadowColor = n.color || '#9d4edd';
                ctx.fill();
                
                if (isSelected || isHovered) {
                    ctx.font = '10px Fira Code';
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.fillText(n.label, n.x, n.y - 12);
                }
            });

            frameId = requestAnimationFrame(loop);
        };

        loop();
        return () => cancelAnimationFrame(frameId);
    }, [simulationNodes, selectedNodeId, hoveredNodeId]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = simulationNodes.find(n => Math.hypot(n.x - x, n.y - y) < 15);
        if (hit) {
            setSelectedNodeId(hit.id);
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
        const hit = simulationNodes.find(n => Math.hypot(n.x - x, n.y - y) < 15);
        setHoveredNodeId(hit?.id || null);
    };

    return (
        <div className="relative w-full h-full bg-[#050505] rounded-xl overflow-hidden border border-white/5">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-[#9d4edd]" />
                    <span className="text-xs font-bold font-mono text-white uppercase tracking-widest">Neural Graph Topology</span>
                </div>
                <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Force-Directed Node Distribution</span>
            </div>
            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
            />
            
            <AnimatePresence>
                {selectedNodeId && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-4 right-4 w-72 bg-black/80 backdrop-blur-md border border-[#333] p-5 rounded-xl shadow-2xl z-20"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="text-sm font-bold text-white font-mono uppercase truncate">
                                {simulationNodes.find(n => n.id === selectedNodeId)?.label}
                            </h4>
                            <button onClick={() => setSelectedNodeId(null)} className="text-gray-500 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono">
                                    {simulationNodes.find(n => n.id === selectedNodeId)?.type}
                                </span>
                                <span className="text-[10px] text-[#42be65] font-mono">STRENGTH: {simulationNodes.find(n => n.id === selectedNodeId)?.strength}%</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed font-mono italic">
                                "{simulationNodes.find(n => n.id === selectedNodeId)?.data?.summary || 'Discrete logic node identified in the sovereign lattice.'}"
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default KnowledgeGraph;
