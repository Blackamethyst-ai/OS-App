import React from 'react';
import { Film, Sparkles } from 'lucide-react';
import type { SoulCast } from '../../../services/cinema';

export const Header: React.FC<{
  decisionLabel: string;
  substrateLabel: string;
  totalSpend: number;
  activeSoul?: SoulCast;
}> = ({ decisionLabel, substrateLabel, totalSpend, activeSoul }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-fuchsia-950/20 via-black to-cyan-950/20">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl">
        <Film className="w-5 h-5 text-fuchsia-400" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.4em] font-mono text-gray-400">Cinema Studio</div>
        <div className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          {substrateLabel}
          <span className="text-[10px] text-gray-500 font-mono ml-2">→ {decisionLabel}</span>
          {activeSoul && (
            <span className="text-[10px] text-violet-300 font-mono ml-2 px-2 py-0.5 bg-violet-500/15 border border-violet-400/40 rounded-full">
              ◉ {activeSoul.name}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="text-right font-mono">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">Total spend</div>
      <div className="text-xl font-black text-cyan-300">${totalSpend.toFixed(2)}</div>
    </div>
  </div>
);
