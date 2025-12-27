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
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--amethyst)" />
              <stop offset="100%" stopColor="var(--cyan)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Main Triangle / Chevron */}
          <motion.path 
            d="M50 15L15 85H30L50 45L70 85H85L50 15Z" 
            fill="url(#logoGradient)"
            animate={{ 
                filter: ["drop-shadow(0 0 2px var(--amethyst))", "drop-shadow(0 0 8px var(--cyan))", "drop-shadow(0 0 2px var(--amethyst))"] 
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Inner Glowing Delta */}
          <motion.path 
            d="M42 85L50 72L58 85H42Z" 
            fill="var(--cyan)"
            animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.1, 1],
                filter: ["drop-shadow(0 0 4px var(--cyan))", "drop-shadow(0 0 12px var(--cyan))", "drop-shadow(0 0 4px var(--cyan))"]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline gap-2 select-none">
          <span className="text-xl font-black font-sans tracking-tight uppercase leading-none text-[var(--text-primary)]" style={{ textShadow: '0 0 20px var(--logo-glow)' }}>
            Metaventions
          </span>
          <motion.span 
            animate={{ 
                color: ["#18E6FF", "#7B2CFF", "#FF3DF2", "#18E6FF"],
                textShadow: [
                    "0 0 10px rgba(24, 230, 255, 0.6)",
                    "0 0 15px rgba(123, 44, 255, 0.6)",
                    "0 0 10px rgba(255, 61, 242, 0.6)",
                    "0 0 10px rgba(24, 230, 255, 0.6)"
                ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
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