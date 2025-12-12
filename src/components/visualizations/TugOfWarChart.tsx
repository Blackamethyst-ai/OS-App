
import React from 'react';
import { motion } from 'framer-motion';

interface TugOfWarProps {
  votes: Record<string, number>;
  confidenceGap: number; // e.g., 3
}

export const TugOfWarChart: React.FC<TugOfWarProps> = ({ votes, confidenceGap }) => {
  // Sort votes to find Leader vs RunnerUp
  const candidates = Object.entries(votes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2); // Only care about top 2

  const [leader, runnerUp] = candidates;
  const leaderVotes = leader ? leader[1] : 0;
  const runnerUpVotes = runnerUp ? runnerUp[1] : 0;
  
  // Calculate the gap. Max range is usually confidenceGap * 1.5 for visuals
  const currentGap = leaderVotes - runnerUpVotes;
  const maxRange = Math.max(confidenceGap + 2, currentGap + 2);

  return (
    <div className="w-full bg-[#0a0a0a] p-4 rounded-lg border border-[#333] shadow-xl">
      <div className="flex justify-between mb-2 text-[10px] uppercase tracking-widest text-gray-400 font-mono">
        <span>Consensus Drift</span>
        <span className="text-[#42be65]">Target Gap: +{confidenceGap}</span>
      </div>

      {/* The Battle Arena */}
      <div className="relative h-12 bg-[#1f1f1f] rounded-full overflow-hidden flex items-center justify-center border border-[#333]">
        
        {/* The "Confidence Threshold" Lines (The Finish Line) */}
        {/* If gap hits this, the bar turns green */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-dashed border-r border-gray-600 left-[calc(50%+20%)] opacity-50" title="Victory Line" />
        
        {/* Runner Up Bar (Pushing Left) */}
        <motion.div 
          className="absolute right-1/2 h-full bg-gray-600 opacity-60 rounded-l-full"
          initial={{ width: 0 }}
          animate={{ width: `${(runnerUpVotes / (confidenceGap * 2)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120 }}
        />
        
        {/* Leader Bar (Pushing Right) */}
        <motion.div 
          className={`absolute left-1/2 h-full rounded-r-full ${currentGap >= confidenceGap ? 'bg-[#42be65]' : 'bg-[#3b82f6]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${(leaderVotes / (confidenceGap * 2)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120 }}
        >
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-black font-bold text-sm">
            {leaderVotes}
          </span>
        </motion.div>

        {/* Center Marker */}
        <div className="absolute w-1 h-full bg-[#0a0a0a] z-10" />
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-mono">
        <div className="text-gray-500">
           Runner Up ({runnerUpVotes})
           <div className="truncate max-w-[100px] opacity-50">{runnerUp ? runnerUp[0].slice(0, 8) : '...'}</div>
        </div>
        <div className="text-right text-[#3b82f6]">
           Leader ({leaderVotes})
           <div className="truncate max-w-[100px] text-white">{leader ? leader[0].slice(0, 8) : '...'}</div>
        </div>
      </div>
    </div>
  );
};
