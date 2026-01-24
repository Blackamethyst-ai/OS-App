import React, { useEffect, useRef } from 'react';

interface BackgroundEffectProps {
  customBg?: string | null;
  bgOpacity?: number;
  isDarkMode?: boolean;
}

const BackgroundEffect: React.FC<BackgroundEffectProps> = ({ 
  customBg, 
  bgOpacity = 0.4, 
  isDarkMode 
}) => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const glowRef1 = useRef<HTMLDivElement>(null);
  const glowRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const updateParallax = () => {
      const scrollY = window.scrollY;
      
      // Update custom background parallax
      if (parallaxRef.current) {
        const translateValue = scrollY * 0.15; // 15% parallax for subtle depth
        parallaxRef.current.style.transform = `translate3d(0, ${translateValue}px, 0) scale(1.15)`;
      }

      // Update ethereal glows parallax (different speeds for multi-layered depth)
      if (glowRef1.current) {
        glowRef1.current.style.transform = `translate3d(0, ${scrollY * 0.1}px, 0)`;
      }
      if (glowRef2.current) {
        glowRef2.current.style.transform = `translate3d(0, ${-scrollY * 0.05}px, 0)`;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial update
    updateParallax();

    return () => window.removeEventListener('scroll', onScroll);
  }, [customBg]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-colors duration-700 bg-[var(--bg-app)]">
      {/* Subtle Light Grid Layer */}
      <div className="absolute inset-0 grid-bg-light opacity-30 transition-opacity"></div>

      {/* Default Cinematic Background Elements (Active when no custom image is set) */}
      {!customBg ? (
        <>
          <div 
            ref={glowRef1}
            className={`absolute top-[-20%] left-[-10%] w-[80%] h-[80%] blur-[120px] rounded-full animate-pulse transition-colors duration-700 will-change-transform ${isDarkMode ? 'bg-[#7B2CFF]/10' : 'bg-[#7B2CFF]/5'}`} 
            style={{ animationDuration: '8s' }}
          ></div>
          <div 
            ref={glowRef2}
            className={`absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] blur-[100px] rounded-full animate-pulse transition-colors duration-700 will-change-transform ${isDarkMode ? 'bg-[#18E6FF]/10' : 'bg-[#18E6FF]/5'}`} 
            style={{ animationDuration: '12s' }}
          ></div>
        </>
      ) : (
        /* High-Performance High-Quality Custom Background Layer */
        <div 
          ref={parallaxRef}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 will-change-transform"
          style={{ 
            backgroundImage: `url(${customBg})`,
            opacity: bgOpacity,
            height: '130vh',
            width: '100%',
            imageRendering: 'auto',
            // Hardware acceleration hints
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        ></div>
      )}

      {/* High-Fidelity Atmospheric Noise/Particles */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100"></div>
        {[...Array(25)].map((_, i) => (
          <div 
            key={i}
            className={`absolute rounded-full opacity-10 transition-colors duration-700 ${isDarkMode ? 'bg-white' : 'bg-black'}`}
            style={{
              width: (Math.random() * 1.5 + 0.5) + 'px',
              height: (Math.random() * 1.5 + 0.5) + 'px',
              top: (Math.random() * 100) + '%',
              left: (Math.random() * 100) + '%',
            }}
          />
        ))}
      </div>

      {/* Adaptive Cinematic Vignette */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${
        isDarkMode 
          ? 'bg-[radial-gradient(circle_at_50%_30%,transparent_0%,rgba(5,7,13,0.7)_100%)]' 
          : 'bg-[radial-gradient(circle_at_50%_30%,transparent_0%,rgba(248,250,252,0.6)_100%)]'
      }`}></div>
    </div>
  );
};

export default BackgroundEffect;