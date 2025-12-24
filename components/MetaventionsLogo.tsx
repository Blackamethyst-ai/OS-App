
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
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9d4edd" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Stylized 'A' / Chevron */}
          <path 
            d="M50 15L15 85H30L50 45L70 85H85L50 15Z" 
            fill="url(#logoGradient)" 
          />
          
          {/* Glowing Base Triangle */}
          <path 
            d="M42 85L50 72L58 85H42Z" 
            fill="#00f2ff" 
            filter="url(#glow)"
            className="animate-pulse"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-2">
          <span className="text-xl font-[900] font-sans tracking-tight text-white uppercase leading-none">
            Metaventions
          </span>
          <span className="text-xl font-[900] font-sans text-[#00f2ff] uppercase leading-none drop-shadow-[0_0_10px_rgba(0,242,255,0.6)]">
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export default MetaventionsLogo;
