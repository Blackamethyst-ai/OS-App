import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Globe, Zap, Cpu, Database, Network, Atom } from 'lucide-react';
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

const PARTICLE_COUNT = 4500; // Increased density for taller aspect

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
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.life = 0.5 + Math.random() * 0.5;
    this.size = Math.random() * 1.5 + 0.5;
    this.noiseOffset = Math.random() * 2000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = Math.random() * 120 + 30; 
    this.orbitSpeed = (0.003 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1);
    
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
      ctx.fillStyle = 'rgba(1, 1, 3, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      const centerX = (canvas.width / dpr) / 2;
      const centerY = (canvas.height / dpr) / 2;
      const time = performance.now() / 1000;

      // Adjust distribution for taller aspect ratio
      const baseDistX = Math.min(canvas.width / dpr, canvas.height / dpr) * 0.45;
      const baseDistY = Math.min(canvas.width / dpr, canvas.height / dpr) * 0.55; 

      const nodes = SECTORS.map(s => {
        const rad = s.angle * (Math.PI / 180);
        return {
          ...s,
          x: centerX + Math.cos(rad) * baseDistX,
          y: centerY + Math.sin(rad) * baseDistY
        };
      });

      // 1. Draw Logical Neural Web (Intensity based on Coherence)
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.4;
      const coherenceFactor = coherence / 100;
      
      nodes.forEach((n1, i) => {
          nodes.forEach((n2, j) => {
              if (i >= j) return;
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 600) {
                  const alpha = (1 - dist / 600) * 0.06 * coherenceFactor;
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
        const mouseRange = 140;
        
        if (mdist < mouseRange) {
          const force = (1 - mdist / mouseRange) * 3.5;
          p.vx += (mdx / mdist) * force;
          p.vy += (mdy / mdist) * force;
          p.state = 'repelled';
        }

        if (p.state === 'clustering') {
          p.orbitAngle += p.orbitSpeed;
          const jitter = Math.sin(time * 2 + p.noiseOffset) * 12;
          const tx = node.x + Math.cos(p.orbitAngle) * p.orbitRadius + jitter;
          const ty = node.y + Math.sin(p.orbitAngle) * p.orbitRadius + jitter;
          
          p.vx += (tx - p.x) * 0.035;
          p.vy += (ty - p.y) * 0.035;
          p.vx *= 0.88;
          p.vy *= 0.88;
        } else if (p.state === 'transit') {
          const dx = node.x - p.x;
          const dy = node.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 15) {
            p.state = 'clustering';
            p.color = node.color;
          } else {
            p.vx += (dx / dist) * 1.2;
            p.vy += (dy / dist) * 1.2;
            p.vx *= 0.94;
            p.vy *= 0.94;
          }
        } else if (p.state === 'repelled') {
           const dx = node.x - p.x;
           const dy = node.y - p.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           p.vx += (dx / dist) * 0.25;
           p.vy += (dy / dist) * 0.25;
           p.vx *= 0.91;
           p.vy *= 0.91;
           if (dist < 60 && mdist > mouseRange) p.state = 'clustering';
        }

        p.x += p.vx;
        p.y += p.vy;
        
        if (p.state === 'transit') {
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.px - p.vx * 4, p.py - p.vy * 4);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.state === 'repelled' ? 0.6 : 1), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          
          if (Math.random() > 0.999 && p.state === 'clustering') {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
              ctx.fillStyle = '#fff';
              ctx.shadowBlur = 12;
              ctx.shadowColor = '#fff';
              ctx.fill();
              ctx.shadowBlur = 0;
          }
        }
      }

      // 3. Render Functional Strategic Nodes
      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(n => {
        const distToMouse = Math.sqrt(Math.pow(n.x - mouseRef.current.x, 2) + Math.pow(n.y - mouseRef.current.y, 2));
        const isHovered = distToMouse < 60;
        const beat = 1 + Math.sin(time * 8 + (n.angle / 8)) * (isHovered ? 0.25 : 0.12);
        
        // Glow layer
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, (isHovered ? 80 : 40) * beat);
        gradient.addColorStop(0, `${n.color}22`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(n.x, n.y, (isHovered ? 80 : 40) * beat, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing core
        ctx.beginPath();
        ctx.arc(n.x, n.y, (isHovered ? 12 : 8) * beat, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = isHovered ? 60 : 25;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Functional readout
        ctx.font = '900 13px Fira Code';
        ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(`${n.label}`, n.x, n.y - (isHovered ? 55 : 40));
        
        ctx.fillStyle = isHovered ? n.color : 'rgba(255,255,255,0.35)';
        ctx.font = '800 9px Fira Code';
        ctx.fillText(`${n.load.toFixed(1)}%`, n.x, n.y - (isHovered ? 70 : 55));

        if (activeTransitNodeRef.current === n.id) {
             ctx.beginPath();
             ctx.arc(n.x, n.y, 30 * beat, 0, Math.PI * 2);
             ctx.strokeStyle = 'rgba(255,255,255,0.4)';
             ctx.lineWidth = 1;
             ctx.stroke();
        }
      });

      frameId = requestAnimationFrame(render);
    };

    // Smart Reasoning Rebalancing Logic
    const rebalanceInterval = setInterval(() => {
        // Intelligent Node Selection: Find the sector with highest "perceived" delta
        const targetId = SECTORS[Math.floor(Math.random() * SECTORS.length)].id;
        setActiveTransitNode(targetId);
        activeTransitNodeRef.current = targetId;

        let batchCount = 0;
        const batchMax = 120; // Increased throughput for larger lattice

        for (let i = 0; i < particles.length; i++) {
            if (batchCount >= batchMax) break;
            if (particles[i].state === 'clustering' && particles[i].targetSectorId !== targetId) {
                // Stochastic probability of migration based on current node density vs target
                if (Math.random() > 0.7) {
                    particles[i].targetSectorId = targetId;
                    particles[i].state = 'transit';
                    batchCount++;
                }
            }
        }

        setCoherence(prev => {
            const drift = (Math.random() * 1.2 - 0.5);
            return Math.max(92.0, Math.min(99.9, prev + drift));
        });
        
        setTimeout(() => {
            setActiveTransitNode(null);
            activeTransitNodeRef.current = null;
        }, 1500);
    }, 2800);

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

      {/* Logic Reticle (Custom Physics Cursor) */}
      <motion.div 
        animate={{ x: mousePos.x, y: mousePos.y }}
        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.4 }}
        className="fixed top-0 left-0 w-8 h-8 border border-[#22d3ee]/60 rounded-full z-[100] pointer-events-none flex items-center justify-center mix-blend-difference"
      >
        <div className="w-1.5 h-1.5 bg-[#22d3ee] rounded-full shadow-[0_0_15px_#22d3ee]" />
        <motion.div 
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-6px] border border-dashed border-[#22d3ee]/30 rounded-full"
        />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[6px] font-black font-mono text-[#22d3ee] uppercase tracking-[0.3em] opacity-40">
           Gravity_Active
        </div>
      </motion.div>

      {/* NEURAL CORE REACTOR (Denser Visuals) */}
      <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
        <motion.div 
            animate={{ 
                scale: [1, 1.04, 1],
                borderColor: [
                    'rgba(168, 85, 247, 0.2)',
                    'rgba(34, 211, 238, 0.5)',
                    'rgba(168, 85, 247, 0.2)'
                ]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-[520px] h-[520px] rounded-full bg-[#050505]/40 backdrop-blur-[100px] border flex flex-col items-center justify-center shadow-[0_0_500px_rgba(157,78,221,0.15)] relative"
        >
            <div className="absolute inset-[-80px] rounded-full border border-purple-500/5 animate-[ping_12s_linear_infinite]" />
            <div className="absolute inset-[-150px] rounded-full border border-cyan-500/5 animate-[pulse_20s_ease-in-out_infinite]" />
            
            <div className="relative z-10 flex flex-col items-center">
                <span className="text-[14px] font-black font-mono text-purple-400 uppercase tracking-[1.8em] mb-12 opacity-60 text-center leading-relaxed">Neural<br/>Coherence</span>
                <div className="relative">
                    <motion.span 
                        animate={{ opacity: [1, 0.8, 1] }}
                        transition={{ duration: 0.1, repeat: Infinity, repeatType: "mirror" }}
                        className="text-[140px] font-black font-mono text-white tracking-tighter drop-shadow-[0_0_100px_rgba(255,255,255,0.45)] leading-none"
                    >
                        {coherence.toFixed(1)}
                    </motion.span>
                    <span className="absolute -top-4 -right-16 text-5xl font-black font-mono text-[#9d4edd] opacity-40">%</span>
                </div>
                
                <div className="flex gap-4 mt-16 h-24 items-end">
                    {[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1].map((h, i) => (
                        <motion.div 
                            key={i}
                            animate={{ 
                                height: [24, 80, 24],
                                background: [
                                    'linear-gradient(to top, #7B2CFF, #18E6FF)',
                                    'linear-gradient(to top, #18E6FF, #7B2CFF)',
                                    'linear-gradient(to top, #7B2CFF, #18E6FF)'
                                ]
                            }}
                            transition={{ duration: 0.4 + i*0.03, repeat: Infinity, ease: "easeInOut" }}
                            className="w-5 rounded-full shadow-[0_0_35px_rgba(34,211,238,0.4)]"
                        />
                    ))}
                </div>
                
                <div className="mt-16 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3 px-8 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl">
                        <Atom size={14} className="text-[#10b981] animate-spin" />
                        <span className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-[0.5em]">Lattice Protocol v9.5.4</span>
                    </div>
                </div>
            </div>
        </motion.div>
      </div>

      {/* Atmospheric HUD (Visual Logic Markers) */}
      <div className="absolute top-16 left-16 flex flex-col gap-8 pointer-events-none z-50">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
              <div className="p-4 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-3xl shadow-2xl">
                  <Network size={24} className="text-[#9d4edd]" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[13px] font-black font-mono text-white uppercase tracking-[0.5em]">Core Mesh Fabric</span>
                  <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2">Recursive Swarm Orchestration active</span>
              </div>
          </motion.div>
      </div>

      <div className="absolute bottom-16 right-16 flex flex-col items-end gap-5 pointer-events-none z-50">
          <div className="flex items-center gap-5 bg-black/70 backdrop-blur-4xl px-10 py-4 rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
              <Globe size={22} className="text-[#22d3ee] animate-pulse" />
              <div className="flex flex-col">
                  <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest leading-none mb-2">Global Node Status</span>
                  <span className="text-[9px] text-[#22d3ee] font-mono uppercase font-black">Sync: PERSISTENT</span>
              </div>
          </div>
          <div className="flex items-center gap-5 bg-black/70 backdrop-blur-4xl px-10 py-4 rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
              <ShieldCheck size={22} className="text-[#10b981]" />
              <div className="flex flex-col">
                  <span className="text-[11px] font-black font-mono text-white uppercase tracking-widest leading-none mb-2">Integrity Audit</span>
                  <span className="text-[9px] text-[#10b981] font-mono uppercase font-black">Auth: VERIFIED_L0</span>
              </div>
          </div>
      </div>

      {/* Grid Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,1)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,1)_1.5px,transparent_1.5px)] bg-[size:200px:200px]"></div>

    </div>
  );
};

export default DEcosystem;