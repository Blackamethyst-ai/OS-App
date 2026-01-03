import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Globe, Target, Cpu, Database, Binary } from 'lucide-react';

// --- Configuration & High-Fidelity Metadata ---
const SECTORS = [
  { id: 'vision', label: 'VISION', load: 8.2, color: '#f59e0b', angle: -160, detail: 'Semantic_Mapping' },
  { id: 'process', label: 'PROCESS', load: 12.8, color: '#9d4edd', angle: -135, detail: 'Lattice_Synthesis' },
  { id: 'treasury', label: 'TREASURY', load: 5.1, color: '#f1c21b', angle: -110, detail: 'Liquid_Capital' },
  { id: 'vault', label: 'VAULT', load: 4.5, color: '#22d3ee', angle: -85, detail: 'Vector_Memory' },
  { id: 'studio', label: 'STUDIO', load: 3.9, color: '#10b981', angle: -60, detail: 'Cinematic_Forge' },
  { id: 'hardware', label: 'HARDWARE', load: 2.7, color: '#ec4899', angle: -35, detail: 'Infra_L0' },
  { id: 'voice', label: 'VOICE', load: 2.1, color: '#3b82f6', angle: -10, detail: 'Neural_Uplink' },
  { id: 'bridge', label: 'BRIDGE', load: 1.8, color: '#94a3b8', angle: 15, detail: 'Cross_Lattice' },
  { id: 'swarm', label: 'SWARM', load: 1.4, color: '#a855f7', angle: 40, detail: 'Consensus_Engine' },
  { id: 'code', label: 'CODE', load: 22.1, color: '#00f2ff', angle: 110, detail: 'Logic_Recursion' },
  { id: 'agents', label: 'AGENTS', load: 35.4, color: '#ef4444', angle: 155, detail: 'Sovereign_Nodes' },
];

const PARTICLE_COUNT = 3200; // Increased for maximum immersion

class Particle {
  x: number = 0;
  y: number = 0;
  px: number = 0; 
  py: number = 0; 
  vx: number = 0;
  vy: number = 0;
  size: number = 0;
  color: string = '';
  state: 'clustering' | 'transit' | 'cohesion' = 'clustering';
  targetSectorId: string = '';
  orbitAngle: number = 0;
  orbitRadius: number = 0;
  orbitSpeed: number = 0;
  noiseOffset: number = 0;
  friction: number = 0.96;

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
    this.size = Math.random() * 2.2 + 0.4;
    this.noiseOffset = Math.random() * 3000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = Math.random() * 100 + 10; 
    this.orbitSpeed = (0.003 + Math.random() * 0.007) * (Math.random() > 0.5 ? 1 : -1);
    
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
  const [coherence, setCoherence] = useState(98.1);
  const [activeTransitNode, setActiveTransitNode] = useState<string | null>(null);
  const activeTransitNodeRef = useRef<string | null>(null);

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
      ctx.fillStyle = 'rgba(1, 1, 4, 0.3)'; // High trail decay
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

      // Background Quantum Grid
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.5;
      nodes.forEach((n1, i) => {
          nodes.forEach((n2, j) => {
              if (i >= j) return;
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 480) {
                  const alpha = (1 - dist / 480) * 0.08;
                  ctx.strokeStyle = `rgba(123, 44, 255, ${alpha})`;
                  ctx.beginPath();
                  ctx.moveTo(n1.x, n1.y);
                  ctx.lineTo(n2.x, n2.y);
                  ctx.stroke();
              }
          });
      });

      // Render Living Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const node = nodes.find(n => n.id === p.targetSectorId);
        if (!node) continue;

        p.px = p.x;
        p.py = p.y;

        if (p.state === 'clustering') {
          p.orbitAngle += p.orbitSpeed;
          const jitter = Math.sin(time * 2 + p.noiseOffset) * 15;
          const tx = node.x + Math.cos(p.orbitAngle) * p.orbitRadius + jitter;
          const ty = node.y + Math.sin(p.orbitAngle) * p.orbitRadius + jitter;
          
          p.vx = (tx - p.x) * 0.08;
          p.vy = (ty - p.y) * 0.08;
          
          p.x += p.vx;
          p.y += p.vy;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else if (p.state === 'transit') {
          // Transit State (Hyper-Velocity Ribbons)
          const dx = node.x - p.x;
          const dy = node.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 8) {
            p.state = 'clustering';
            p.color = node.color;
          } else {
            p.vx = dx * 0.18;
            p.vy = dy * 0.18;
            p.x += p.vx;
            p.y += p.vy;
            
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = p.size * 2.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.px - (p.x - p.px) * 3, p.py - (p.y - p.py) * 3);
            ctx.strokeStyle = node.color;
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = p.size;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Render Functional Node Lattices
      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(n => {
        const beat = 1 + Math.sin(time * 6 + (n.angle / 15)) * 0.15;
        
        // Aura
        const grad = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, 40 * beat);
        grad.addColorStop(0, `${n.color}44`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 40 * beat, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, 7 * beat, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 40;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label Metadata
        ctx.font = '900 14px Fira Code';
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.textAlign = 'center';
        ctx.letterSpacing = "2px";
        ctx.fillText(`${n.label}`, n.x, n.y - 35);
        
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '800 8px Fira Code';
        ctx.fillText(`${n.detail.toUpperCase()}`, n.x, n.y - 50);

        if (activeTransitNodeRef.current === n.id) {
             ctx.beginPath();
             ctx.arc(n.x, n.y, 20 * beat, 0, Math.PI * 2);
             ctx.strokeStyle = `${n.color}66`;
             ctx.lineWidth = 2;
             ctx.stroke();
        }
      });

      frameId = requestAnimationFrame(render);
    };

    // Advanced Rebalancing Cycle
    const rebalanceInterval = setInterval(() => {
        const targetId = SECTORS[Math.floor(Math.random() * SECTORS.length)].id;
        setActiveTransitNode(targetId);
        activeTransitNodeRef.current = targetId;

        let batchCount = 0;
        const batchMax = 60; 

        for (let i = 0; i < particles.length; i++) {
            if (batchCount >= batchMax) break;
            if (particles[i].state === 'clustering' && Math.random() > 0.8) {
                particles[i].targetSectorId = targetId;
                particles[i].state = 'transit';
                batchCount++;
            }
        }

        setCoherence(prev => {
            const jitter = (Math.random() * 0.2 - 0.1);
            return Math.max(97.5, Math.min(99.9, prev + jitter));
        });
        
        setTimeout(() => {
            setActiveTransitNode(null);
            activeTransitNodeRef.current = null;
        }, 800);
    }, 1500);

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
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
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

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#010103] rounded-[5rem] overflow-hidden border border-white/5 shadow-[0_0_150px_rgba(0,0,0,1)] group glass-refraction">
      
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* NEURAL CORE DECK */}
      <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
        <motion.div 
            animate={{ scale: [1, 1.015, 1], y: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-96 h-96 rounded-full bg-[#050508]/80 backdrop-blur-[80px] border border-[#7B2CFF]/30 flex flex-col items-center justify-center shadow-[0_0_200px_rgba(123,44,255,0.25)] relative"
        >
            <div className="absolute inset-[-60px] rounded-full border border-purple-500/5 animate-[ping_10s_linear_infinite]" />
            <div className="absolute inset-[-120px] rounded-full border border-cyan-500/5 animate-[pulse_15s_ease-in-out_infinite]" />
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="flex gap-4 mb-8">
                     <Binary size={16} className="text-purple-500/60" />
                     <span className="text-[12px] font-black font-mono text-purple-400 uppercase tracking-[1em] opacity-80 text-center leading-relaxed">Neural<br/>Coherence</span>
                     <Binary size={16} className="text-purple-500/60" />
                </div>
                
                <span className="text-9xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_80px_rgba(255,255,255,0.3)]">
                    {coherence.toFixed(1)}<span className="text-4xl text-purple-500 opacity-50">%</span>
                </span>
                
                <div className="flex gap-4 mt-12 h-20 items-end">
                    {[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1].map((h, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: [12, 56, 12] }}
                            transition={{ duration: 0.3 + i*0.06, repeat: Infinity, ease: "easeInOut" }}
                            className="w-2.5 bg-gradient-to-t from-transparent via-[#22d3ee] to-white rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
      </div>

      {/* Ambient Telemetry HUD */}
      <div className="absolute bottom-16 left-16 flex items-center gap-12 z-50 pointer-events-none">
          <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none">Kernel_Sync</span>
              <div className="flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
                  <Globe size={14} className="text-[#22d3ee] animate-pulse" />
                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Global_Grid: Stable</span>
              </div>
          </div>
          <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest leading-none">Trust_Index</span>
              <div className="flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
                  <ShieldCheck size={14} className="text-[#10b981]" />
                  <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Audit: Verified</span>
              </div>
          </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,1)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,1)_1.5px,transparent_1.5px)] bg-[size:100px_100px]"></div>

    </div>
  );
};

export default DEcosystem;