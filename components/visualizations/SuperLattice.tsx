
import React, { useEffect, useRef } from 'react';
import { KnowledgeNode } from '../../types';

interface SuperLatticeProps {
    nodes: KnowledgeNode[];
    mode: 'AMBIENT' | 'ACTIVE' | 'FOCUS';
    onNodeSelect?: (node: KnowledgeNode) => void;
    onNodeContextMenu?: (e: React.MouseEvent, node: KnowledgeNode) => void;
    selectedNodes?: string[];
}

const SuperLattice: React.FC<SuperLatticeProps> = ({ nodes, mode, onNodeSelect, onNodeContextMenu, selectedNodes = [] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const projectedNodesRef = useRef<{id: string, x: number, y: number, r: number}[]>([]);
    const requestRef = useRef<number>(0);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;

        // Stable Node Mapping
        const renderedNodes = nodes.map((n, i) => {
            const samples = nodes.length;
            const phi = Math.PI * (3 - Math.sqrt(5)); 
            const y = 1 - (i / (samples - 1)) * 2; 
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;

            return {
                ...n,
                x: 0, y: 0, z: 0, 
                baseX: Math.cos(theta) * radius, 
                baseY: y, 
                baseZ: Math.sin(theta) * radius,
                color: n.type === 'HYPOTHESIS' ? '#f59e0b' : n.type === 'CONCEPT' ? '#9d4edd' : n.type === 'BRIDGE' ? '#ffffff' : '#22d3ee'
            };
        });

        const render = () => {
            // Rotation Speed based on Mode
            const speed = mode === 'ACTIVE' ? 0.005 : mode === 'FOCUS' ? 0.001 : 0.002;
            time += speed;
            
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            // Zoom level based on mode
            const baseRadius = mode === 'FOCUS' ? 0.75 : 0.6;
            const globeRadius = Math.min(cx, cy) * baseRadius;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const rotX = time * 0.5;
            const rotY = time * 0.8;

            projectedNodesRef.current = [];

            // 1. Projection & Sorting
            renderedNodes.forEach(n => {
                let x1 = n.baseX * Math.cos(rotY) - n.baseZ * Math.sin(rotY);
                let z1 = n.baseZ * Math.cos(rotY) + n.baseX * Math.sin(rotY);
                let y1 = n.baseY * Math.cos(rotX) - z1 * Math.sin(rotX);
                let z2 = z1 * Math.cos(rotX) + n.baseY * Math.sin(rotX);
                
                const perspective = 300;
                const scale = perspective / (perspective + z2); 
                
                n.x = cx + x1 * globeRadius * scale;
                n.y = cy + y1 * globeRadius * scale;
                n.z = z2;
                (n as any).scale = scale;

                // Register hit target for interactions
                projectedNodesRef.current.push({
                    id: n.id,
                    x: n.x,
                    y: n.y,
                    r: (n.type === 'HYPOTHESIS' ? 10 : 6) * scale
                });
            });

            renderedNodes.sort((a, b) => b.z - a.z);

            // 2. Connections
            ctx.lineWidth = 0.5;
            // Optimization: Only draw connections for nodes somewhat close to front
            const visibleNodes = renderedNodes.filter(n => (n as any).scale > 0.6);
            
            for (let i = 0; i < visibleNodes.length; i++) {
                const n1 = visibleNodes[i];
                
                // Proximity connections (Visual "Neural" Web)
                for (let j = i + 1; j < visibleNodes.length; j++) {
                    const n2 = visibleNodes[j];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const distSq = dx*dx + dy*dy;
                    
                    if (distSq < 10000) { // Distance < 100
                        const alpha = (1 - Math.sqrt(distSq) / 100) * 0.15;
                        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                }
                
                // Explicit Graph Connections (Stronger lines)
                if (n1.connections) {
                    n1.connections.forEach(targetId => {
                        const n2 = renderedNodes.find(rn => rn.id === targetId);
                        if (n2) {
                            ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
                            ctx.beginPath();
                            ctx.moveTo(n1.x, n1.y);
                            ctx.lineTo(n2.x, n2.y);
                            ctx.stroke();
                        }
                    });
                }
            }

            // 3. Nodes
            renderedNodes.forEach(n => {
                const isSelected = selectedNodes.includes(n.id);
                const s = (n as any).scale;
                const size = (n.type === 'HYPOTHESIS' ? 6 : n.type === 'CONCEPT' ? 4 : 2) * s * (isSelected ? 1.5 : 1);
                
                ctx.beginPath();
                ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? '#ffffff' : n.color;
                ctx.globalAlpha = Math.max(0.1, s);
                ctx.fill();
                
                // Halo for selected/hypothesis
                if (isSelected || (n.type === 'HYPOTHESIS' && Math.random() > 0.95)) {
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, size * 1.8, 0, Math.PI * 2);
                    ctx.strokeStyle = isSelected ? '#ffffff' : n.color;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.5;
                    ctx.stroke();
                }

                // Labels
                if (s > 0.8 && (mode === 'FOCUS' || renderedNodes.length < 25 || isSelected || n.type === 'HYPOTHESIS')) {
                    ctx.fillStyle = isSelected ? '#fff' : '#aaa';
                    ctx.font = `${isSelected ? 'bold ' : ''}${9 * s}px Fira Code`;
                    ctx.textAlign = 'center';
                    ctx.fillText(n.label.substring(0, 15), n.x, n.y - (10 * s));
                }
                ctx.globalAlpha = 1;
            });

            requestRef.current = requestAnimationFrame(render);
        };

        render();
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [nodes, mode, selectedNodes]);

    const getHitNode = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check recent projected positions (reverse loop for z-index hit testing)
        for (let i = projectedNodesRef.current.length - 1; i >= 0; i--) {
            const p = projectedNodesRef.current[i];
            const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
            if (dist < p.r + 10) { // +10 padding for easier clicking
                return nodes.find(n => n.id === p.id);
            }
        }
        return null;
    };

    const handleClick = (e: React.MouseEvent) => {
        const node = getHitNode(e);
        if (node && onNodeSelect) onNodeSelect(node);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const node = getHitNode(e);
        if (node && onNodeContextMenu) {
            e.preventDefault();
            onNodeContextMenu(e, node);
        }
    };

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 z-0 bg-black cursor-crosshair overflow-hidden"
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)] pointer-events-none"></div>
            <canvas ref={canvasRef} className="w-full h-full opacity-80 block" />
        </div>
    );
};

export default SuperLattice;
