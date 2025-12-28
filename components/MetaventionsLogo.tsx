import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

const MetaventionsLogo: React.FC<LogoProps> = ({ size = 32, showText = false, className = "" }) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div style={{ width: size, height: size }} className="relative shrink-0">
        {/* Deep background glow - Extremely slow, meditative pulse */}
        <motion.div 
            animate={{ 
                opacity: [0.1, 0.4, 0.1],
                scale: [0.9, 1.2, 0.9],
                background: [
                    "radial-gradient(circle, var(--amethyst) 0%, transparent 70%)",
                    "radial-gradient(circle, var(--azure-blue) 0%, transparent 70%)",
                    "radial-gradient(circle, var(--cyan) 0%, transparent 70%)",
                    "radial-gradient(circle, var(--amethyst) 0%, transparent 70%)"
                ]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-100%] pointer-events-none blur-[60px] z-0 rounded-full"
        />

        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 filter drop-shadow-[0_0_12px_rgba(24, 230, 255, 0.5)]">
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
                    "drop-shadow(0 0 15px var(--cyan))", 
                    "drop-shadow(0 0 10px var(--azure-blue))", 
                    "drop-shadow(0 0 2px var(--amethyst))"
                ] 
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Inner Delta Glow */}
          <motion.path 
            d="M42 85L50 72L58 85H42Z" 
            fill="var(--stellar-white)"
            animate={{ 
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.2, 1],
                filter: [
                    "drop-shadow(0 0 4px var(--cyan))", 
                    "drop-shadow(0 0 25px var(--cyan))", 
                    "drop-shadow(0 0 4px var(--cyan))"
                ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline gap-2 select-none">
          {/* Metaventions Word - Spectral Glow */}
          <motion.span 
            animate={{ 
                color: ["var(--stellar-white)", "var(--cyan)", "var(--azure-blue)", "var(--amethyst)", "var(--stellar-white)"],
                textShadow: [
                    "0 0 10px var(--logo-glow)",
                    "0 0 25px rgba(24, 230, 255, 0.7)",
                    "0 0 35px rgba(59, 130, 246, 0.7)",
                    "0 0 25px rgba(123, 44, 255, 0.7)",
                    "0 0 10px var(--logo-glow)"
                ]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="text-2xl font-black font-sans tracking-tight uppercase leading-none"
          >
            Metaventions
          </motion.span>

          <motion.span 
            animate={{ 
                color: ["var(--cyan)", "var(--amethyst)", "var(--cyan)"],
                textShadow: [
                    "0 0 10px var(--cyan)",
                    "0 0 20px var(--amethyst)",
                    "0 0 10px var(--cyan)"
                ]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
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