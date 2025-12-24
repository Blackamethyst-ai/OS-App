import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlywheelStore } from '../store/flywheelStore';

const FlywheelOrbit: React.FC = () => {
  const { velocity, confidenceScore } = useFlywheelStore();

  const getTheme = (score: number) => {
    if (score > 0.8) return { color: '#22d3ee', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]' };
    if (score > 0.5) return { color: '#9d4edd', glow: 'shadow-[0_0_10px_rgba(157,78,221,0.3)]' };
    return { color: '#ef4444', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' };
  };

  const theme = getTheme(confidenceScore);
  const rotationDuration = velocity > 0 ? Math.max(0.3, 55 / velocity) : 20;

  return (
    <div className="relative flex items-center justify-center pointer-events-none scale-[0.6] origin-center mx-1">
      <div className="relative w-12 h-12 flex items-center justify-center">
        
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: rotationDuration * 2, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-dashed border-white/10 opacity-30"
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: rotationDuration, ease: "linear" }}
          className="absolute inset-1 rounded-full border-t-2 border-l-[1px] border-b-0 border-r-0"
          style={{ borderColor: theme.color, filter: velocity > 75 ? 'blur(1px)' : 'none' }}
        />

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 / Math.max(1, confidenceScore * 2) }}
          className={`w-7 h-7 rounded-full bg-black border border-white/10 flex flex-col items-center justify-center z-10 ${theme.glow}`}
        >
            <span className="text-[8px] font-black font-mono" style={{ color: theme.color }}>
                {Math.round(confidenceScore * 100)}%
            </span>
        </motion.div>
      </div>
    </div>
  );
};

export default FlywheelOrbit;