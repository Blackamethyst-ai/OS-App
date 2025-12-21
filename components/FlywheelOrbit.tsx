
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlywheelStore } from '../store/flywheelStore';
import { Activity, Shield } from 'lucide-react';

const FlywheelOrbit: React.FC = () => {
  const { velocity, confidenceScore } = useFlywheelStore();

  const getTheme = (score: number) => {
    if (score > 0.8) return { color: '#22d3ee', label: 'OPTIMAL', glow: 'shadow-[0_0_35px_rgba(34,211,238,0.5)]' };
    if (score > 0.5) return { color: '#9d4edd', label: 'STABLE', glow: 'shadow-[0_0_25px_rgba(157,78,221,0.3)]' };
    return { color: '#ef4444', label: 'CRITICAL', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' };
  };

  const theme = getTheme(confidenceScore);
  const rotationDuration = velocity > 0 ? Math.max(0.3, 55 / velocity) : 20;

  return (
    <div className="relative flex items-center justify-center group pointer-events-none scale-[0.6] origin-center mx-2">
      <div className="relative w-16 h-16 flex items-center justify-center pointer-events-auto cursor-help">
        
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: rotationDuration * 2, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-dashed border-white/10 opacity-40"
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
          className={`w-10 h-10 rounded-full bg-black border border-white/10 flex flex-col items-center justify-center z-10 ${theme.glow} shadow-inner shadow-white/5`}
        >
            <span className="text-[10px] font-black font-mono" style={{ color: theme.color }}>
                {Math.round(confidenceScore * 100)}%
            </span>
        </motion.div>

        <AnimatePresence>
            {velocity > 70 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 rounded-full border border-cyan-400/20 blur-md"
                />
            )}
        </AnimatePresence>
      </div>

      {/* Hover Detail Panel - Adjusted to float above/beside since it's in the header */}
      <div className="absolute top-12 left-0 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-[#0a0a0a]/98 backdrop-blur-3xl border border-white/10 p-5 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] min-w-[220px] scale-[1.6] origin-top-left z-[300]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Shield size={12} className="text-[#9d4edd]" />
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest leading-none">Teleological Engine</span>
                </div>
                <Activity size={12} style={{ color: theme.color }} className="animate-pulse" />
            </div>
            
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-gray-500 uppercase">KINETIC_VELOCITY</span>
                    <span className="text-xs font-black font-mono text-white tracking-tighter">{Math.round(velocity)} <span className="text-[8px] text-gray-600">m/s</span></span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-gray-500 uppercase">LATTICE_ALIGN</span>
                    <span className="text-xs font-black font-mono" style={{ color: theme.color }}>{theme.label}</span>
                </div>
                
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2 relative">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${confidenceScore * 100}%` }}
                        className="h-full relative z-10"
                        style={{ backgroundColor: theme.color }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FlywheelOrbit;
