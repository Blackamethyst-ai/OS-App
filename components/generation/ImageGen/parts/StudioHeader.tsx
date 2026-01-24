/**
 * ImageGen - Studio Header
 *
 * Global header with tab navigation and spectral integrity indicator.
 */

import React from 'react';
import { Aperture, Settings, Wand2, Clapperboard, Video, MonitorPlay } from 'lucide-react';
import { audio } from '../../../../services/audioService';
import type { ActiveTab } from './types';

const TAB_ICONS = {
    SINGLE: Wand2,
    STORYBOARD: Clapperboard,
    VIDEO: Video,
    TEASER: MonitorPlay
} as const;

const TABS = [
    { id: 'SINGLE' as const, label: 'Stills' },
    { id: 'STORYBOARD' as const, label: 'Timeline' },
    { id: 'VIDEO' as const, label: 'Motion' },
    { id: 'TEASER' as const, label: 'Screening' }
];

interface StudioHeaderProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({ activeTab, setActiveTab }) => (
    <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-2xl z-[60] flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--amethyst)]/40 to-transparent" />

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-xl shadow-[0_0_20px_color-mix(in_srgb,var(--amethyst),transparent_80%)]">
                    <Aperture className="w-5 h-5 text-[var(--amethyst)]" />
                </div>
                <div>
                    <h1 className="text-lg font-black font-mono uppercase tracking-[0.4em] text-white leading-none">V8.1 - THE D-Ecosystem</h1>
                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Prime Production // v8.1-ZENITH</span>
                </div>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex items-center gap-1 bg-[#050505] p-1.5 rounded-2xl border border-white/5">
                {TABS.map(tab => {
                    const Icon = TAB_ICONS[tab.id];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); audio.playClick(); }}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all
                            ${activeTab === tab.id ? 'bg-[var(--amethyst)] text-black shadow-lg shadow-[var(--amethyst)]/30' : 'text-gray-500 hover:text-gray-300'}
                        `}
                        >
                            <Icon size={14} className={activeTab === tab.id ? 'fill-current' : ''} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Spectral Integrity</span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[var(--plasma-green)] uppercase">Optimal</span>
                    <div className="flex gap-0.5">
                        {[1, 1, 1, 1].map((v, i) => <div key={i} className={`w-1 h-3 rounded-full ${v ? 'bg-[var(--plasma-green)]' : 'bg-[#222]'}`} />)}
                    </div>
                </div>
            </div>
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all">
                <Settings size={18} />
            </button>
        </div>
    </div>
);

export default StudioHeader;
