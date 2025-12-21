
import React from 'react';
import { motion } from 'framer-motion';
import { useFlywheelStore } from '../store/flywheelStore';
import { Zap } from 'lucide-react';

const FlywheelOrbit: React.FC = () => {
  const { velocity, confidenceScore } = useFlywheelStore();

  const getColors = (score: number) => {
    if (score > 0.7) return { border: 'border-cyan-400', shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]', text: 'text-cyan-300' };
    if (score > 0.4) return { border: 'border-blue-500', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]', text: 'text-blue-400' };
    return { border: 'border-zinc-700', shadow: 'shadow-none', text: 'text-zinc-500' };
  };

  const style = getColors(confidenceScore);
  const duration = velocity > 0 ? Math.max(0.5, 50 / velocity) : 10;

  return (
    <div className="fixed bottom-6 left-6 z-[200] flex items-center justify-center group cursor-pointer">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: duration, ease: "linear" }}
        className={`w-14 h-14 rounded-full border-t-2 border-r-[1px] ${style.border} ${style.shadow} opacity-80`}
      />

      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[7px] font-black font-mono text-zinc-600 group-hover:text-cyan-400 transition-colors uppercase tracking-tighter">
            FLY_WHEEL
        </span>
        <span className={`text-[10px] font-bold font-mono ${style.text}`}>
          {Math.round(confidenceScore * 100)}%
        </span>
      </div>

      <div className="absolute left-16 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 bg-black/90 border border-zinc-800 p-2 rounded-lg text-[9px] font-mono text-zinc-400 whitespace-nowrap shadow-2xl pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
            <Zap size={10} className="text-cyan-400" />
            <span className="text-white">Velocity: {Math.round(velocity)}</span>
        </div>
        <div>Alignment: {confidenceScore > 0.7 ? 'OPTIMAL' : 'CALIBRATING'}</div>
      </div>
    </div>
  );
};

export default FlywheelOrbit;
