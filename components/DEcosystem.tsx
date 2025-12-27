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

const PARTICLE_COUNT = 900; 

class Particle {
  x: number = 0;
  y: number = 0;
  px: number = 0; // Previous X for motion blur
  py: number = 0; // Previous Y
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
    this.orbitRadius = Math.random() * 50 + 25; // Slightly increased for longer container
    this.orbitSpeed = (0.008 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1);
    
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
      ctx.fillStyle = 'rgba(1, 1, 3, 0.18)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // PERFECT CENTERING LOGIC
      const centerX = canvas.width / (2 * (window.devicePixelRatio || 1));
      const centerY = canvas.height / (2 * (window.devicePixelRatio || 1));
      const time = performance.now() / 1000;

      // Optimized Sector Mapping relative to center
      const baseDist = Math.min(canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1)) * 0.4;
      const nodes = SECTORS.map(s => {
        const rad = s.angle * (Math.PI / 180);
        return {
          ...s,
          x: centerX + Math.cos(rad) * baseDist,
          y: centerY + Math.sin(rad) * baseDist
        };
      });

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const node = nodes.find(n => n.id === p.targetSectorId);
        if (!node) continue;

        p.px = p.x;
        p.py = p.y;

        if (p.state === 'clustering') {
          p.orbitAngle += p.orbitSpeed;
          const jitter = Math.sin(time * 2 + p.noiseOffset) * 10;
          const tx = node.x + Math.cos(p.orbitAngle) * p.orbitRadius + jitter;
          const ty = node.y + Math.sin(p.orbitAngle) * p.orbitRadius + jitter;
          
          p.x += (tx - p.x) * 0.07;
          p.y += (ty - p.y) * 0.07;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          const dx = node.x - p.x;
          const dy = node.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 12) {
            p.state = 'clustering';
            p.color = node.color;
          } else {
            p.x += dx * 0.16;
            p.y += dy * 0.16;
            
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = COLORS.hot;
            ctx.lineWidth = p.size * 1.8;
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

      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(n => {
        const beat = 1 + Math.sin(time * 4) * 0.12;
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4.5 * beat, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = '900 11px Fira Code';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(`${n.label}`, n.x, n.y - 25);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '700 9px Fira Code';
        ctx.fillText(`${n.load}% LOAD`, n.x, n.y - 38);
      });

      frameId = requestAnimationFrame(render);
    };

    const rebalanceInterval = setInterval(() => {
        const sourceId = Math.random() > 0.5 ? 'code' : 'agents';
        const targetId = SECTORS[Math.floor(Math.random() * SECTORS.length)].id;
        if (sourceId === targetId) return;

        let batchCount = 0;
        const batchMax = 15;

        for (let i = 0; i < particles.length; i++) {
            if (batchCount >= batchMax) break;
            if (particles[i].targetSectorId === sourceId && particles[i].state === 'clustering') {
                particles[i].targetSectorId = targetId;
                particles[i].state = 'transit';
                batchCount++;
            }
        }

        setCoherence(prev => {
            const jitter = (Math.random() * 0.8 - 0.4);
            return Math.max(94.0, Math.min(99.9, prev + jitter));
        });
    }, 1200);

    const resize = () => {
      if (canvas && containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const context = canvas.getContext('2d');
        if (context) context.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
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
        <h2 className="text-white text-lg font-black font-mono uppercase tracking-[0.9em] mb-4 drop-shadow-2xl">
            Sovereign Ecosystem
        </h2>
        <div className="flex items-center gap-4 bg-black/50 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/5 shadow-2xl">
            <div className="w-3 h-3 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_15px_#10b981]" />
            <span className="text-[11px] font-black font-mono text-gray-300 uppercase tracking-[0.3em]">Autonomous_Swarm_Lattice // ACTIVE</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* NEURAL CORE - PERFECTLY CENTERED */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-72 h-72 rounded-full bg-[#050505]/95 backdrop-blur-[40px] border border-[#a855f7]/50 flex flex-col items-center justify-center shadow-[0_0_200px_rgba(168,85,247,0.4)] relative"
        >
            <div className="absolute inset-[-25px] rounded-full border border-purple-500/10 animate-[ping_5s_linear_infinite]" />
            <div className="absolute inset-[-60px] rounded-full border border-cyan-500/5 animate-[pulse_8s_ease-in-out_infinite]" />
            
            <div className="relative z-10 flex flex-col items-center">
                <span className="text-[12px] font-black font-mono text-purple-400 uppercase tracking-[0.8em] mb-4 opacity-90 text-center leading-relaxed">Neural<br/>Coherence</span>
                <span className="text-8xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]">
                    {coherence.toFixed(1)}%
                </span>
                
                <div className="flex gap-2.5 mt-8 h-10 items-end">
                    {[1,2,3,4,5,6,5,4,3,2,1].map((h, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: [10, 30, 10] }}
                            transition={{ duration: 0.2 + i*0.07, repeat: Infinity, ease: "easeInOut" }}
                            className="w-2 bg-[#22d3ee]/90 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.7)]"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
      </div>

      {/* Background Matrix Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,1)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,1)_1.5px,transparent_1.5px)] bg-[size:80px_80px]"></div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-14 left-14 right-14 flex items-center justify-between z-30">
        <div className="flex items-center gap-20 text-[12px] font-black font-mono text-gray-500 uppercase tracking-[0.6em]">
            <div className="flex flex-col gap-2">
                <span className="opacity-40 text-[10px]">Lattice_Node_State</span>
                <span className="text-gray-200 font-black">1,240_AUTH_OK</span>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="flex flex-col gap-2">
                <span className="opacity-40 text-[10px]">Resonance_Calibration</span>
                <span className="text-cyan-400 font-black">OPTIMAL_ZENITH</span>
            </div>
        </div>
        
        <div className="bg-[#0a0a0a]/80 border border-white/10 px-8 py-5 rounded-3xl flex items-center gap-10 backdrop-blur-3xl shadow-2xl">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black font-mono text-gray-600 uppercase tracking-widest mb-1">Aggregate_Load</span>
                <span className="text-sm font-black font-mono text-white tracking-tighter">4.82_ZETTA/H</span>
            </div>
            <div className="w-12 h-12 rounded-full border border-[#ef4444]/50 flex items-center justify-center p-2 bg-[#ef4444]/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Activity size={22} className="text-[#ef4444] animate-pulse" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default DEcosystem;