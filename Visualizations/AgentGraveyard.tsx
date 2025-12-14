
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface GraveyardProps {
  killedCount: number;
}

export const AgentGraveyard: React.FC<GraveyardProps> = ({ killedCount }) => {
  const [flash, setFlash] = useState(false);

  // Trigger flash effect when count increases
  useEffect(() => {
    if (killedCount > 0) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [killedCount]);

  return (
    <div className={`
      relative p-3 rounded border transition-colors duration-500 h-full flex flex-col justify-center
      ${flash ? 'bg-red-900/30 border-red-500' : 'bg-[#0a0a0a] border-[#333]'}
    `}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">💀</div>
        <div>
          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
            Agents Terminated
          </div>
          <div className="text-xl font-mono text-white flex items-baseline gap-2">
            {killedCount}
            <span className="text-[10px] text-gray-500 font-normal normal-case font-mono">
              (Red Flag Protocol)
            </span>
          </div>
        </div>
      </div>

      {/* Floating "+1" Animation on kill */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.5 }}
            animate={{ opacity: 1, y: -20, scale: 1.5 }}
            exit={{ opacity: 0 }}
            className="absolute right-4 top-2 text-red-500 font-bold font-mono"
          >
            +1 KILLED
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
