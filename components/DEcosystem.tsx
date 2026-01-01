import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Globe, Zap, Cpu, Database, Network } from 'lucide-react';
import { audio } from '../services/audioService';

// --- Configuration & High-Fidelity Metadata ---
const SECTORS = [
  { id: 'vision', label: 'VISION', load: 8.2, color: '#f59e0b', angle: -160 },
  { id: 'process', label: 'PROCESS', load: 12.8, color: '#9d4edd', angle: -135 },
  { id: 'treasury', label: 'TREASURY', load: 5.1, color: '#f1c21b', angle: -110 },
  { id: 'vault', label: 'VAULT', load: 4.5, color: '#22d3ee', angle: -85 },
  { id: 'studio', label: 'STUDIO', load: 3.9, color: '#10b981', angle: -60 },
  { id: 'hardware', label: 'HARDWARE', load: 2.7, color: '#ec4899', angle: -35 },
  { id: 'voice', label: 'VOICE', load: 2.1, color: '#3b82f6', angle: -10 },
  { id: 'bridge', label: 'BRIDGE', load: 1.8, color: '#94a3b8', angle: 15 },
  { id: 'swarm', label: 'SWARM', load: 1.4, color: '#a855f7', angle: 40 },
  { id: 'code', label: 'CODE', load: 22.1, color: '#00f2ff', angle: 110 },
  { id: 'agents', label: 'AGENTS', load: 35.4, color: '#ef4444', angle: 155 },
];

const PARTICLE_COUNT = 3000; 

class Particle {
  x: number = 0;
  y: number = 0;
  px: number = 0; 
  py: number = 0; 
  vx: number = 0;
  vy: number = 0;
  size: number = 0;
  color: string = '';
  state: 'clustering' | 'transit' | 'repelled' = 'clustering';
  targetSectorId: string = '';
  orbitAngle: number = 0;
  orbitRadius: number = 0;
  orbitSpeed: number = 0;
  noiseOffset: number = 0;
  life: number = 1.0;

  constructor() {
    this.reset(true);
  }

  reset(randomizePos = false) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.x = randomizePos ? Math.random() * w : w / 2;
    this.y = randomizePos ? Math.random() * h : h / 2;
    this.px = this.x;
    this.py = this.y;
    this.vx = 0;
    this.vy = 0;
    this.life = 0.5 + Math.random() * 0.5;
    this.size = Math.random() * 1.5 + 0.5;
    this.noiseOffset = Math.random() * 2000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = Math.random() * 100 + 20; 
    this.orbitSpeed = (0.005 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1);
    
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const s of SECTORS) {
      cumulative += s.load;
      if (rand <= cumulative) {
        this.targetSectorId = s.id;
        this.color = s.color;
        break;
      }
    }
    if (!this.targetSectorId) {
        this.targetSectorId = SECTORS[0].id;
        this.color = SECTORS[0].color;
    }
  }
}

const DEcosystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coherence, setCoherence] = useState(94.8);
  const [activeTransitNode, setActiveTransitNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  
  const activeTransitNodeRef = useRef<string | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    let frameId: number;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

    const render = () => {
      if (!canvas || !containerRef.current) return;
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(1, 1, 3, 0.3)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      const centerX = (canvas.width / dpr) / 2;
      const centerY = (canvas.height / dpr) / 2;
      const time = performance.now() / 1000;

      const baseDist = Math.min(canvas.width / dpr, canvas.height / dpr) * 0.42;
      const nodes = SECTORS.map(s => {
        const rad = s.angle * (Math.PI / 180);
        return {
          ...s,
          x: centerX + Math.cos(rad) * baseDist,
          y: centerY + Math.sin(rad) * baseDist
        };
      });

      // 1. Draw Logical Neural Web (Intensity based on Coherence)
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.5;
      const coherenceFactor = coherence / 100;
      
      nodes.forEach((n1, i) => {
          nodes.forEach((n2, j) => {
              if (i >= j) return;
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 500) {
                  const alpha = (1 - dist / 500) * 0.08 * coherenceFactor;
                  ctx.strokeStyle = i % 2 === 0 ? `rgba(123, 44, 255, ${alpha})` : `rgba(24, 230, 255, ${alpha})`;
                  ctx.beginPath();
                  ctx.moveTo(n1.x, n1.y);
                  ctx.lineTo(n2.x, n2.y);
                  ctx.stroke();
              }
          });
      });

      // 2. Physics-Sensing Particle Update
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const node = nodes.find(n => n.id === p.targetSectorId);
        if (!node) continue;

        p.px = p.x;
        p.py = p.y;

        // Interaction Physics: Repulsion from Mouse
        const mdx = p.x - mouseRef.current.x;
        const mdy = p.y - mouseRef.current.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        const mouseRange = 120;
        
        if (mdist < mouseRange) {
          const force = (1 - mdist / mouseRange) * 2.5;
          p.vx += (mdx / mdist) * force;
          p.vy += (mdy / mdist) * force;
          p.state = 'repelled';
        }

        if (p.state === 'clustering') {
          p.orbitAngle += p.orbitSpeed;
          const jitter = Math.sin(time * 1.5 + p.noiseOffset) * 15;
          const tx = node.x + Math.cos(p.orbitAngle) * p.orbitRadius + jitter;
          const ty = node.y + Math.sin(p.orbitAngle) * p.orbitRadius + jitter;
          
          p.vx += (tx - p.x) * 0.04;
          p.vy += (ty - p.y) * 0.04;
          p.vx *= 0.85;
          p.vy *= 0.85;
        } else if (p.state === 'transit') {
          const dx = node.x - p.x;
          const dy = node.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 10) {
            p.state = 'clustering';
            p.color = node.color;
          } else {
            p.vx += (dx / dist) * 0.8;
            p.vy += (dy / dist) * 0.8;
            p.vx *= 0.95;
            p.vy *= 0.95;
          }
        } else if (p.state === 'repelled') {
           // Smooth return to node
           const dx = node.x - p.x;
           const dy = node.y - p.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           p.vx += (dx / dist) * 0.2;
           p.vy += (dy / dist) * 0.2;
           p.vx *= 0.92;
           p.vy *= 0.92;
           if (dist < 50 && mdist > mouseRange) p.state = 'clustering';
        }

        p.x += p.vx;
        p.y += p.vy;
        
        // Render Line Particles for Transit, dots for clustering
        if (p.state === 'transit') {
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.px - p.vx * 3, p.py - p.vy * 3);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          
          // Neural Sparkles
          if (Math.random() > 0.998) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
              ctx.fillStyle = '#fff';
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#fff';
              ctx.fill();
              ctx.shadowBlur = 0;
          }
        }
      }

      // 3. Render Functional Strategic Nodes
      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(n => {
        const beat = 1 + Math.sin(time * 6 + (n.angle / 10)) * 0.15;
        const isHovered = Math.sqrt(Math.pow(n.x - mouseRef.current.x, 2) + Math.pow(n.y - mouseRef.current.y, 2)) < 40;
        
        // Pulsing core
        ctx.beginPath();
        ctx.arc(n.x, n.y, (isHovered ? 10 : 7) * beat, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = isHovered ? 50 : 30;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Interactive Rings
        ctx.beginPath();
        ctx.arc(n.x, n.y, (isHovered ? 25 : 18) * beat, 0, Math.PI * 2);
        ctx.strokeStyle = `${n.color}44`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Readout Labels
        ctx.font = '900 12px Fira Code';
        ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(`${n.label}`, n.x, n.y - (isHovered ? 45 : 35));
        
        ctx.fillStyle = isHovered ? n.color : 'rgba(255,255,255,0.4)';
        ctx.font = '800 8px Fira Code';
        ctx.fillText(`L:${n.load}%`, n.x, n.y - (isHovered ? 58 : 48));

        if (activeTransitNodeRef.current === n.id) {
             ctx.beginPath();
             ctx.arc(n.x, n.y, 20 * beat, 0, Math.PI * 2);
             ctx.strokeStyle = '#fff';
             ctx.stroke();
        }
      });

      frameId = requestAnimationFrame(render);
    };

    // Smart Reasoning Rebalancing
    const rebalanceInterval = setInterval(() => {
        // Find sector with highest and lowest delta vs nominal to "transfer load"
        const targetId = SECTORS[Math.floor(Math.random() * SECTORS.length)].id;
        setActiveTransitNode(targetId);
        activeTransitNodeRef.current = targetId;

        let batchCount = 0;
        const batchMax = 60; 

        for (let i = 0; i < particles.length; i++) {
            if (batchCount >= batchMax) break;
            if (particles[i].state === 'clustering' && particles[i].targetSectorId !== targetId) {
                particles[i].targetSectorId = targetId;
                particles[i].state = 'transit';
                batchCount++;
            }
        }

        setCoherence(prev => {
            const delta = (Math.random() * 0.6 - 0.2);
            return Math.max(93.0, Math.min(99.9, prev + delta));
        });
        
        setTimeout(() => {
            setActiveTransitNode(null);
            activeTransitNodeRef.current = null;
        }, 1200);
    }, 2200);

    const resize = () => {
      if (canvasRef.current && containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        const context = canvasRef.current.getContext('2d');
        if (context) {
            context.scale(dpr, dpr);
        }
      }
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(rebalanceInterval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y };
      setMousePos({ x, y });
    }
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: -1000, y: -1000 };
    setMousePos({ x: -1000, y: -1000 });
  };

  return (
    <div 
        ref={containerRef} 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full relative bg-[#010103] rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_0_200px_rgba(0,0,0,1)] group cursor-none"
    >
      
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Physics Cursor */}
      <motion.div 
        animate={{ x: mousePos.x, y: mousePos.y }}
        transition={{ type: 'spring', damping: 25, stiffness: 250, mass: 0.5 }}
        className="fixed top-0 left-0 w-6 h-6 border border-[#22d3ee]/40 rounded-full z-50 pointer-events-none flex items-center justify-center"
      >
        <div className="w-1 h-1 bg-[#22d3ee] rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-4px] border border-dashed border-[#22d3ee]/20 rounded-full"
        />
      </motion.div>

      {/* NEURAL CORE REACTOR */}
      <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
        <motion.div 
            animate={{ 
                scale: [1, 1.05, 1],
                borderColor: [
                    'rgba(168, 85, 247, 0.2)',
                    'rgba(34, 211, 238, 0.4)',
                    'rgba(168, 85, 247, 0.2)'
                ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-[450px] h-[450px] rounded-full bg-[#050505]/60 backdrop-blur-[80px] border flex flex-col items-center justify-center shadow-[0_0_400px_rgba(157,78,221,0.2)] relative"
        >
            <div className="absolute inset-[-60px] rounded-full border border-purple-500/5 animate-[ping_10s_linear_infinite]" />
            <div className="absolute inset-[-120px] rounded-full border border-cyan-500/5 animate-[pulse_15s_ease-in-out_infinite]" />
            
            <div className="relative z-10 flex flex-col items-center">
                <span className="text-[12px] font-black font-mono text-purple-400 uppercase tracking-[1.5em] mb-10 opacity-70 text-center leading-relaxed">System<br/>Lattice</span>
                <div className="relative">
                    <span className="text-[120px] font-black font-mono text-white tracking-tighter drop-shadow-[0_0_80px_rgba(255,255,255,0.4)] leading-none">
                        {coherence.toFixed(1)}
                    </span>
                    <span className="absolute -top-4 -right-12 text-4xl font-black font-mono text-[#9d4edd] opacity-50">%</span>
                </div>
                
                <div className="flex gap-4 mt-12 h-20 items-end">
                    {[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1].map((h, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: [20, 64, 20] }}
                            transition={{ duration: 0.3 + i*0.04, repeat: Infinity, ease: "easeInOut" }}
                            className="w-4 bg-gradient-to-t from-[#7B2CFF] to-[#18E6FF] rounded-full shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                        />
                    ))}
                </div>
                
                <div className="mt-12 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 px-6 py-1.5 bg-white/5 border border-white/10 rounded-full">
                        <Activity size={12} className="text-[#10b981] animate-pulse" />
                        <span className="text-[9px] font-black font-mono text-gray-400 uppercase tracking-[0.4em]">Handshake: Synchronous</span>
                    </div>
                </div>
            </div>
        </motion.div>
      </div>

      {/* Atmospheric UI Readouts */}
      <div className="absolute top-12 left-16 flex flex-col gap-6 pointer-events-none z-50">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
              <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-2xl">
                  <Network size={20} className="text-[#9d4edd]" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[12px] font-black font-mono text-white uppercase tracking-[0.4em]">Core Mesh Architecture</span>
                  <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1">Autonomous Swarm Lattice v9.5.4</span>
              </div>
          </motion.div>
      </div>

      <div className="absolute bottom-12 right-16 flex flex-col items-end gap-3 pointer-events-none z-50">
          <div className="flex items-center gap-4 bg-black/80 backdrop-blur-3xl px-8 py-3 rounded-[2rem] border border-white/10 shadow-2xl">
              <Globe size={18} className="text-[#22d3ee] animate-pulse" />
              <div className="flex flex-col">
                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest leading-none mb-1">Global Node Status</span>
                  <span className="text-[8px] text-[#22d3ee] font-mono uppercase">Lattice_Sync: VERIFIED</span>
              </div>
          </div>
          <div className="flex items-center gap-4 bg-black/80 backdrop-blur-3xl px-8 py-3 rounded-[2rem] border border-white/10 shadow-2xl">
              <ShieldCheck size={18} className="text-[#10b981]" />
              <div className="flex flex-col">
                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest leading-none mb-1">Audit Protocol</span>
                  <span className="text-[8px] text-[#10b981] font-mono uppercase">Security_Enclave: ATTESTED</span>
              </div>
          </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,1)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,1)_1.5px,transparent_1.5px)] bg-[size:160px:160px]"></div>

    </div>
  );
};

export default DEcosystem;