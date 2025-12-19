import React, { useEffect, useRef, useMemo } from 'react';
import { AppMode } from '../types';

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  size: number;
  color: string;
}

interface StarfieldProps {
  mode: AppMode;
}

const Starfield: React.FC<StarfieldProps> = ({ mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Performance-optimized density mapping
  const starCount = useMemo(() => {
    switch (mode) {
      case AppMode.DASHBOARD: return 400;
      case AppMode.CODE_STUDIO: return 80;
      case AppMode.SYNTHESIS_BRIDGE: return 300;
      case AppMode.VOICE_MODE: return 150;
      default: return 200;
    }
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent canvas
    if (!ctx) return;

    let animationFrameId: number;
    let w: number, h: number;
    const stars: Star[] = [];

    const initStars = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      
      stars.length = 0;
      const colors = ['#ffffff', '#9d4edd', '#22d3ee', '#f59e0b'];
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * w - w / 2,
          y: Math.random() * h - h / 2,
          z: Math.random() * w,
          px: 0,
          py: 0,
          size: Math.random() * 1.5 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const update = () => {
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, w, h);
      
      const cx = w / 2;
      const cy = h / 2;
      
      // Speed varies slightly by mode
      const speed = mode === AppMode.IMAGE_GEN ? 0.5 : 0.2;

      for (const star of stars) {
        star.z -= speed;
        
        if (star.z <= 0) {
          star.z = w;
          star.x = Math.random() * w - cx;
          star.y = Math.random() * h - cy;
        }

        const scale = 128 / star.z;
        const x = star.x * scale + cx;
        const y = star.y * scale + cy;

        if (x < 0 || x > w || y < 0 || y > h) continue;

        const opacity = Math.min(1, (w - star.z) / (w * 0.8));
        ctx.globalAlpha = opacity;
        ctx.fillStyle = star.color;
        
        // Draw star
        ctx.beginPath();
        ctx.arc(x, y, star.size * (1 - star.z / w) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(update);
    };

    const handleResize = () => {
      initStars();
    };

    window.addEventListener('resize', handleResize);
    initStars();
    update();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [starCount, mode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[-1] pointer-events-none opacity-40 transition-opacity duration-1000"
    />
  );
};

export default Starfield;