import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

const MetaventionsLogo: React.FC<LogoProps> = ({ size = 32, showText = false, className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div style={{ width: size, height: size }} className="relative shrink-0">
        {/* Deep background glow - Extremely slow pulse */}
        <motion.div 
            animate={{ 
                opacity: [0.1, 0.25, 0.1],
                scale: [0.8, 1.1, 0.8],
                background: [
                    "radial-gradient(circle, var(--amethyst) 0%, transparent 70%)",
                    "radial-gradient(circle, var(--cyan) 0%, transparent 70%)",
                    "radial-gradient(circle, var(--magenta) 0%, transparent 70%)",
                    "radial-gradient(circle, var(--amethyst) 0%, transparent 70%)"
                ]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-60%] pointer-events-none blur-2xl z-0 rounded-full"
        />

        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
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
                    "drop-shadow(0 0 10px var(--cyan))", 
                    "drop-shadow(0 0 6px var(--magenta))", 
                    "drop-shadow(0 0 2px var(--amethyst))"
                ] 
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Inner Glowing Delta */}
          <motion.path 
            d="M42 85L50 72L58 85H42Z" 
            fill="var(--cyan)"
            animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.1, 1],
                filter: [
                    "drop-shadow(0 0 4px var(--cyan))", 
                    "drop-shadow(0 0 15px var(--cyan))", 
                    "drop-shadow(0 0 4px var(--cyan))"
                ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline gap-2 select-none">
          {/* Metaventions Word - Spectral Glow */}
          <motion.span 
            animate={{ 
                color: ["var(--text-primary)", "#18E6FF", "#7B2CFF", "#FF3DF2", "var(--text-primary)"],
                textShadow: [
                    "0 0 15px var(--logo-glow)",
                    "0 0 20px rgba(24, 230, 255, 0.5)",
                    "0 0 25px rgba(123, 44, 255, 0.5)",
                    "0 0 20px rgba(255, 61, 242, 0.5)",
                    "0 0 15px var(--logo-glow)"
                ]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="text-xl font-black font-sans tracking-tight uppercase leading-none"
          >
            Metaventions
          </motion.span>

          {/* AI part - Synchronized but intense */}
          <motion.span 
            animate={{ 
                color: ["#18E6FF", "#7B2CFF", "#FF3DF2", "#18E6FF"],
                textShadow: [
                    "0 0 10px rgba(24, 230, 255, 0.8)",
                    "0 0 20px rgba(123, 44, 255, 0.8)",
                    "0 0 15px rgba(255, 61, 242, 0.8)",
                    "0 0 10px rgba(24, 230, 255, 0.8)"
                ]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="text-xl font-black font-sans uppercase leading-none"
          >
            AI
          </motion.span>
        </div>
      )}
    </div>
  );
};

export default MetaventionsLogo;