import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

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

const COLORS = {
  void: '#010103',
  amethyst: '#A855F7',
  cyan: '#00f2ff',
  hot: '#ffffff',
  glowAlpha: 'rgba(168, 85, 247, 0.15)'
};

const PARTICLE_COUNT = 1200; // Increased for higher visual fidelity

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
    this.size = Math.random() * 1.5 + 0.8;
    this.noiseOffset = Math.random() * 2000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = Math.random() * 60 + 30; 
    this.orbitSpeed = (0.006 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1);
    
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const s of SECTORS) {
      cumulative += s.load;
      if (rand <= (cumulative / 100) * 100) {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    let frameId: number;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

    const render = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(1, 1, 3, 0.22)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      const centerX = canvas.width / (2 * dpr);
      const centerY = canvas.height / (2 * dpr);
      const time = performance.now() / 1000;

      const baseDist = Math.min(canvas.width / dpr, canvas.height / dpr) * 0.4;
      const nodes = SECTORS.map(s => {
        const rad = s.angle * (Math.PI / 180);
        return {
          ...s,
          x: centerX + Math.cos(rad) * baseDist,
          y: centerY + Math.sin(rad) * baseDist
        };
      });

      // 1. Draw Lattice Connectors (New Prestigious Visual)
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.5;
      nodes.forEach((n1, i) => {
          nodes.forEach((n2, j) => {
              if (i >= j) return;
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 400) {
                  const alpha = (1 - dist / 400) * 0.08;
                  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                  ctx.beginPath();
                  ctx.moveTo(n1.x, n1.y);
                  ctx.lineTo(n2.x, n2.y);
                  ctx.stroke();
              }
          });
      });

      // 2. Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const node = nodes.find(n => n.id === p.targetSectorId);
        if (!node) continue;

        p.px = p.x;
        p.py = p.y;

        if (p.state === 'clustering') {
          p.orbitAngle += p.orbitSpeed;
          const jitter = Math.sin(time * 2 + p.noiseOffset) * 8;
          const tx = node.x + Math.cos(p.orbitAngle) * p.orbitRadius + jitter;
          const ty = node.y + Math.sin(p.orbitAngle) * p.orbitRadius + jitter;
          
          p.x += (tx - p.x) * 0.08;
          p.y += (ty - p.y) * 0.08;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          const dx = node.x - p.x;
          const dy = node.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 10) {
            p.state = 'clustering';
            p.color = node.color;
          } else {
            p.x += dx * 0.12;
            p.y += dy * 0.12;
            
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = p.size * 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.px - (p.x - p.px) * 1.5, p.py - (p.y - p.py) * 1.5);
            ctx.strokeStyle = node.color;
            ctx.globalAlpha = 0.2;
            ctx.lineWidth = p.size;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // 3. Draw Nodes (Sector Anchors)
      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(n => {
        const beat = 1 + Math.sin(time * 4) * 0.15;
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, 5 * beat, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = '900 12px Fira Code';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText(`${n.label}`, n.x, n.y - 28);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '800 8.5px Fira Code';
        ctx.fillText(`${n.load}% LOAD`, n.x, n.y - 42);
      });

      frameId = requestAnimationFrame(render);
    };

    const rebalanceInterval = setInterval(() => {
        const sourceId = Math.random() > 0.5 ? 'code' : 'agents';
        const targetId = SECTORS[Math.floor(Math.random() * SECTORS.length)].id;
        if (sourceId === targetId) return;

        let batchCount = 0;
        const batchMax = 18;

        for (let i = 0; i < particles.length; i++) {
            if (batchCount >= batchMax) break;
            if (particles[i].targetSectorId === sourceId && particles[i].state === 'clustering') {
                particles[i].targetSectorId = targetId;
                particles[i].state = 'transit';
                batchCount++;
            }
        }

        setCoherence(prev => {
            const jitter = (Math.random() * 0.6 - 0.3);
            return Math.max(94.0, Math.min(99.9, prev + jitter));
        });
    }, 1400);

    const resize = () => {
      if (canvasRef.current && containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        const context = canvasRef.current.getContext('2d');
        if (context) context.scale(dpr, dpr);
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
    <div ref={containerRef} className="w-full h-full relative bg-[#010103] rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_0_200px_rgba(0,0,0,1)]">
      
      {/* Top HUD Layer */}
      <div className="absolute top-14 left-14 z-30 pointer-events-none">
        <h2 className="text-white text-lg font-black font-mono uppercase tracking-[1em] mb-4 drop-shadow-2xl">
            Sovereign Ecosystem
        </h2>
        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
            <div className="w-3 h-3 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]" />
            <span className="text-[11px] font-black font-mono text-white/80 uppercase tracking-[0.4em]">Autonomous_Swarm_Lattice // ACTIVE</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* NEURAL CORE - PERFECTLY CENTERED */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <motion.div 
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-72 h-72 rounded-full bg-[#050505]/95 backdrop-blur-[50px] border border-[#a855f7]/50 flex flex-col items-center justify-center shadow-[0_0_250px_rgba(168,85,247,0.45)] relative"
        >
            <div className="absolute inset-[-30px] rounded-full border border-purple-500/10 animate-[ping_6s_linear_infinite]" />
            <div className="absolute inset-[-70px] rounded-full border border-cyan-500/5 animate-[pulse_10s_ease-in-out_infinite]" />
            
            <div className="relative z-10 flex flex-col items-center">
                <span className="text-[12px] font-black font-mono text-purple-400 uppercase tracking-[0.9em] mb-4 opacity-90 text-center leading-relaxed">Neural<br/>Coherence</span>
                <span className="text-8xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.6)]">
                    {coherence.toFixed(1)}%
                </span>
                
                <div className="flex gap-2.5 mt-9 h-12 items-end">
                    {[1,2,3,4,5,6,5,4,3,2,1].map((h, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: [12, 36, 12] }}
                            transition={{ duration: 0.2 + i*0.06, repeat: Infinity, ease: "easeInOut" }}
                            className="w-2.5 bg-[#22d3ee]/90 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
      </div>

      {/* Background Matrix Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,1)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,1)_1.5px,transparent_1.5px)] bg-[size:100px_100px]"></div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-14 left-14 right-14 flex items-center justify-between z-30">
        <div className="flex items-center gap-20 text-[12px] font-black font-mono text-gray-500 uppercase tracking-[0.7em]">
            <div className="flex flex-col gap-2">
                <span className="opacity-40 text-[9px]">Lattice_Node_State</span>
                <span className="text-gray-200 font-black">1,240_AUTH_OK</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col gap-2">
                <span className="opacity-40 text-[9px]">Resonance_Calibration</span>
                <span className="text-cyan-400 font-black">OPTIMAL_ZENITH</span>
            </div>
        </div>
        
        <div className="bg-[#0a0a0a]/80 border border-white/10 px-10 py-6 rounded-[2.5rem] flex items-center gap-12 backdrop-blur-3xl shadow-2xl">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.25em] mb-1.5">Aggregate_Load</span>
                <span className="text-base font-black font-mono text-white tracking-tighter">4.82_ZETTA/H</span>
            </div>
            <div className="w-14 h-14 rounded-2xl border border-[#ef4444]/40 flex items-center justify-center p-2 bg-[#ef4444]/5 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <Activity size={26} className="text-[#ef4444] animate-pulse" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default DEcosystem;