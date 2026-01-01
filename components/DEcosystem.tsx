import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Globe } from 'lucide-react';

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

const PARTICLE_COUNT = 2400; // Doubled for immersion

class Particle {
  x: number = 0;
  y: number = 0;
  px: number = 0; 
  py: number = 0; 
  vx: number = 0;
  vy: number = 0;
  size: number = 0;
  color: string = '';
  state: 'clustering' | 'transit' = 'clustering';
  targetSectorId: string = '';
  orbitAngle: number = 0;
  orbitRadius: number = 0;
  orbitSpeed: number = 0;
  noiseOffset: number = 0;

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
    this.size = Math.random() * 1.8 + 0.5;
    this.noiseOffset = Math.random() * 2000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = Math.random() * 80 + 20; 
    this.orbitSpeed = (0.004 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1);
    
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
      ctx.fillStyle = 'rgba(1, 1, 3, 0.25)'; // Darker trail accumulation
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      const centerX = (canvas.width / dpr) / 2;
      const centerY = (canvas.height / dpr) / 2;
      const time = performance.now() / 1000;

      const baseDist = Math.min(canvas.width / dpr, canvas.height / dpr) * 0.38;
      const nodes = SECTORS.map(s => {
        const rad = s.angle * (Math.PI / 180);
        return {
          ...s,
          x: centerX + Math.cos(rad) * baseDist,
          y: centerY + Math.sin(rad) * baseDist
        };
      });

      // Background Grid Interaction
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.5;
      nodes.forEach((n1, i) => {
          nodes.forEach((n2, j) => {
              if (i >= j) return;
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 450) {
                  const alpha = (1 - dist / 450) * 0.05;
                  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
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
          const jitter = Math.sin(time * 1.5 + p.noiseOffset) * 12;
          const tx = node.x + Math.cos(p.orbitAngle) * p.orbitRadius + jitter;
          const ty = node.y + Math.sin(p.orbitAngle) * p.orbitRadius + jitter;
          
          p.x += (tx - p.x) * 0.06;
          p.y += (ty - p.y) * 0.06;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          // Transit State (High Velocity Streaks)
          const dx = node.x - p.x;
          const dy = node.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 5) {
            p.state = 'clustering';
            p.color = node.color;
          } else {
            p.x += dx * 0.15;
            p.y += dy * 0.15;
            
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = p.size * 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.px - (p.x - p.px) * 2, p.py - (p.y - p.py) * 2);
            ctx.strokeStyle = node.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = p.size;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Render Functional Nodes
      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(n => {
        const beat = 1 + Math.sin(time * 5 + (n.angle / 10)) * 0.12;
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, 6 * beat, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 30;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label Decoration
        ctx.font = '900 13px Fira Code';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText(`${n.label}`, n.x, n.y - 32);
        
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '800 8px Fira Code';
        ctx.fillText(`${n.load}% ARCH LOAD`, n.x, n.y - 45);

        if (activeTransitNodeRef.current === n.id) {
             ctx.beginPath();
             ctx.arc(n.x, n.y, 15 * beat, 0, Math.PI * 2);
             ctx.strokeStyle = `${n.color}44`;
             ctx.stroke();
        }
      });

      frameId = requestAnimationFrame(render);
    };

    // Global Rebalancing Pulse
    const rebalanceInterval = setInterval(() => {
        const targetId = SECTORS[Math.floor(Math.random() * SECTORS.length)].id;
        setActiveTransitNode(targetId);
        activeTransitNodeRef.current = targetId;

        let batchCount = 0;
        const batchMax = 45; 

        for (let i = 0; i < particles.length; i++) {
            if (batchCount >= batchMax) break;
            if (particles[i].state === 'clustering') {
                particles[i].targetSectorId = targetId;
                particles[i].state = 'transit';
                batchCount++;
            }
        }

        setCoherence(prev => {
            const jitter = (Math.random() * 0.4 - 0.2);
            return Math.max(94.0, Math.min(99.9, prev + jitter));
        });
        
        setTimeout(() => {
            setActiveTransitNode(null);
            activeTransitNodeRef.current = null;
        }, 1000);
    }, 1800);

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
    <div ref={containerRef} className="w-full h-full relative bg-[#010103] rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_0_200px_rgba(0,0,0,1)] group">
      
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* NEURAL CORE OVERLAY */}
      <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
        <motion.div 
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-80 h-80 rounded-full bg-[#050505]/90 backdrop-blur-[60px] border border-[#a855f7]/30 flex flex-col items-center justify-center shadow-[0_0_300px_rgba(168,85,247,0.4)] relative"
        >
            <div className="absolute inset-[-40px] rounded-full border border-purple-500/10 animate-[ping_8s_linear_infinite]" />
            <div className="absolute inset-[-80px] rounded-full border border-cyan-500/5 animate-[pulse_12s_ease-in-out_infinite]" />
            
            <div className="relative z-10 flex flex-col items-center">
                <span className="text-[14px] font-black font-mono text-purple-400 uppercase tracking-[1em] mb-6 opacity-80 text-center leading-relaxed">Neural<br/>Coherence</span>
                <span className="text-9xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                    {coherence.toFixed(1)}%
                </span>
                
                <div className="flex gap-3 mt-10 h-16 items-end">
                    {[1,2,3,4,5,6,7,6,5,4,3,2,1].map((h, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: [15, 48, 15] }}
                            transition={{ duration: 0.25 + i*0.05, repeat: Infinity, ease: "easeInOut" }}
                            className="w-3 bg-[#22d3ee]/80 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.7)]"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
      </div>

      {/* Atmospheric UI Decorations */}
      <div className="absolute top-10 right-10 flex flex-col items-end gap-3 pointer-events-none">
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-3xl px-6 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <Globe size={16} className="text-[#22d3ee] animate-pulse" />
              <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Global_Sync: OK</span>
          </div>
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-3xl px-6 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <ShieldCheck size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Audit_Status: Secure</span>
          </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,1)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,1)_1.5px,transparent_1.5px)] bg-[size:120px_120px]"></div>

    </div>
  );
};

export default DEcosystem;