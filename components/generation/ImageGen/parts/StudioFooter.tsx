/**
 * ImageGen - Studio Footer HUD
 *
 * Production status bar with sync info, lattice nodes, and focus indicator.
 */

import React from 'react';
import { CheckCircle, GitBranch, Activity } from 'lucide-react';
import type { ActiveTab } from './types';

interface StudioFooterProps {
    activeTab: ActiveTab;
    frameCount: number;
}

export const StudioFooter: React.FC<StudioFooterProps> = ({ activeTab, frameCount }) => (
    <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[8px] font-mono text-gray-600 shrink-0 relative z-[60]">
        <div className="flex gap-10 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
            <div className="flex items-center gap-3 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                <CheckCircle size={14} className="shadow-[0_0_10px_var(--plasma-green)]" /> Sync_Stable
            </div>
            <div className="flex items-center gap-3 uppercase tracking-widest">
                <GitBranch size={14} className="text-[var(--amethyst)]" /> Production_Lattice: {frameCount} nodes
            </div>
            <div className="flex items-center gap-3 uppercase tracking-widest">
                <Activity size={14} className="text-[var(--cyan)]" /> Focus: {activeTab}
            </div>
        </div>
        <div className="flex items-center gap-8 shrink-0">
            <span className="uppercase tracking-[0.5em] opacity-40 leading-none hidden lg:block uppercase">V8.1 - THE D-Ecosystem // Final Render Protocol</span>
            <div className="h-4 w-px bg-white/10 hidden lg:block" />
            <span className="font-black text-gray-400 uppercase tracking-widest leading-none">Metaventions_OS</span>
        </div>
    </div>
);

export default StudioFooter;
