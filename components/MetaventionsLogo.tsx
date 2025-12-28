import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

const MetaventionsLogo: React.FC<LogoProps> = ({ size = 32, showText = false, className = "" }) => {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <div style={{ width: size, height: size }} className="relative shrink-0">
        {/* Deep background glow - Meditative, ultra-slow pulse */}
        <motion.div 
            animate={{ 
                opacity: [0.1, 0.45, 0.1],
                scale: [0.9, 1.25, 0.9],
                background: [
                    "radial-gradient(circle, var(--amethyst) 0%, transparent 75%)",
                    "radial-gradient(circle, var(--azure-blue) 0%, transparent 75%)",
                    "radial-gradient(circle, var(--cyan) 0%, transparent 75%)",
                    "radial-gradient(circle, var(--amethyst) 0%, transparent 75%)"
                ]
            }}
            transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-120%] pointer-events-none blur-[70px] z-0 rounded-full"
        />

        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 filter drop-shadow-[0_0_15px_rgba(24,230,255,0.6)]">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--amethyst)" />
              <stop offset="100%" stopColor="var(--cyan)" />
            </linearGradient>
          </defs>
          
          {/* Main Triangle / Chevron */}
          <motion.path 
            d="M50 15L15 85H30L50 45L70 85H85L50 15Z" 
            fill="url(#logoGradient)"
            animate={{ 
                filter: [
                    "drop-shadow(0 0 2px var(--amethyst))", 
                    "drop-shadow(0 0 18px var(--cyan))", 
                    "drop-shadow(0 0 12px var(--azure-blue))", 
                    "drop-shadow(0 0 2px var(--amethyst))"
                ] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Inner Delta Glow */}
          <motion.path 
            d="M42 85L50 72L58 85H42Z" 
            fill="var(--stellar-white)"
            animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.3, 1],
                filter: [
                    "drop-shadow(0 0 5px var(--cyan))", 
                    "drop-shadow(0 0 30px var(--cyan))", 
                    "drop-shadow(0 0 5px var(--cyan))"
                ]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline gap-2 select-none">
          {/* Metaventions Word - Spectral Glow with Inner Reflection */}
          <motion.span 
            animate={{ 
                color: ["var(--stellar-white)", "var(--cyan)", "var(--azure-blue)", "var(--amethyst)", "var(--stellar-white)"],
                textShadow: [
                    "0 0 12px var(--logo-glow)",
                    "0 0 35px rgba(24, 230, 255, 0.8)",
                    "0 0 45px rgba(59, 130, 246, 0.8)",
                    "0 0 35px rgba(123, 44, 255, 0.8)",
                    "0 0 12px var(--logo-glow)"
                ]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="text-2xl font-black font-sans tracking-tight uppercase leading-none"
          >
            Metaventions
          </motion.span>

          {/* AI part - Intensive focus pulse */}
          <motion.span 
            animate={{ 
                color: ["var(--cyan)", "var(--amethyst)", "var(--cyan)"],
                textShadow: [
                    "0 0 12px var(--cyan)",
                    "0 0 25px var(--amethyst)",
                    "0 0 12px var(--cyan)"
                ]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="text-2xl font-black font-sans uppercase leading-none"
          >
            AI
          </motion.span>
        </div>
      )}
    </div>
  );
};

export default MetaventionsLogo;