/**
 * ImageGen - Teaser/Screening Mode Tab
 *
 * Screening room with slideshow playback and audio synthesis.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Monitor, Target, FastForward, Play, Pause, Speaker,
    Volume2, FileArchive, Loader2
} from 'lucide-react';
import { audio } from '../../../../services/audioService';
import { Frame } from './types';

interface TeaserModeProps {
    frames: Frame[];
    teaserIdx: number;
    setTeaserIdx: (idx: number | ((prev: number) => number)) => void;
    isAutoPlaying: boolean;
    setIsAutoPlaying: (playing: boolean) => void;
    isGeneratingTeaserAudio: boolean;
    isExportingBundle: boolean;
    onPlayFullSequence: () => void;
    onGenerateAllAudio: () => void;
    onGenerateAudioForIndex: (idx: number) => void;
    onExportBundle: () => void;
}

export const TeaserMode: React.FC<TeaserModeProps> = ({
    frames,
    teaserIdx,
    setTeaserIdx,
    isAutoPlaying,
    setIsAutoPlaying,
    isGeneratingTeaserAudio,
    isExportingBundle,
    onPlayFullSequence,
    onGenerateAllAudio,
    onGenerateAudioForIndex,
    onExportBundle
}) => (
    <motion.div
        key="teaser"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="w-full h-full flex flex-col p-10 gap-10 overflow-hidden"
    >
        <div className="flex-1 bg-black rounded-[4rem] border border-white/5 relative overflow-hidden group/theatre shadow-[0_80px_200px_rgba(0,0,0,1)] flex items-center justify-center min-h-0">

            {/* Ambient Production Glow */}
            <AnimatePresence mode="wait">
                {frames[teaserIdx]?.imageUrl && (
                    <motion.div
                        key={`blur-${teaserIdx}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                        transition={{ duration: 2 }}
                        className="absolute inset-0 blur-[150px] scale-150 saturate-200"
                    >
                        <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover" alt="blur" />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl z-0" />

            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {frames[teaserIdx]?.imageUrl ? (
                        <motion.div
                            key={teaserIdx}
                            initial={{ opacity: 0, y: 40, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -40, scale: 1.02 }}
                            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                            className="relative flex flex-col items-center gap-10 w-full max-w-7xl"
                        >
                            <div className="w-full aspect-video rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] border border-white/10 text-[11px] font-black font-mono text-white shadow-2xl relative group/hero shrink-0">
                                <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover group-hover/hero:scale-105 transition-transform duration-[15s] ease-linear" alt="Theater View" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-60" />

                                <div className="absolute top-10 left-10 flex items-center gap-6">
                                    <div className="flex items-center gap-3 px-5 py-2.5 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full text-[11px] font-black font-mono text-white shadow-2xl">
                                        <Target size={16} className="text-[var(--amethyst)] animate-pulse" />
                                        <span className="tracking-[0.2em] uppercase">Node_Protocol_{String(teaserIdx + 1).padStart(2, '0')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center space-y-8 max-w-5xl overflow-y-auto max-h-[300px] custom-scrollbar px-4">
                                <div className="flex justify-center items-center gap-8 shrink-0">
                                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-[var(--amethyst)] to-transparent opacity-40" />
                                    <span className="text-[12px] font-black text-[var(--amethyst)] uppercase tracking-[1em] whitespace-nowrap">V8.1 - THE D-Ecosystem</span>
                                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-[var(--amethyst)] to-transparent opacity-40" />
                                </div>
                                <p className="text-4xl font-mono text-white leading-relaxed italic font-medium selection:bg-[var(--amethyst)]/40 tracking-tight drop-shadow-[0_10px_30px_rgba(0,0,0,1)] pb-4">
                                    "{frames[teaserIdx].scenePrompt}"
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center opacity-10 gap-8">
                            <Monitor size={120} className="text-gray-500" />
                            <p className="text-2xl font-mono uppercase tracking-[1em]">Screening Cache Empty</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Refined Screening Room HUD */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-14 px-10 py-5 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_100px_250px_rgba(0,0,0,1)] opacity-0 group-hover/theatre:opacity-100 transition-all duration-700 transform translate-y-6 group-hover/theatre:translate-y-0 max-w-[90%] flex-wrap justify-center pointer-events-auto">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setTeaserIdx(p => (p - 1 + frames.length) % frames.length)}
                        className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"
                        aria-label="Previous frame"
                    >
                        <FastForward size={24} className="rotate-180" />
                    </button>
                    <button
                        onClick={() => {
                            setIsAutoPlaying(!isAutoPlaying);
                            if (!isAutoPlaying) onPlayFullSequence();
                            audio.playClick();
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-[0_0_40px_rgba(0,0,0,0.4)] active:scale-95 shrink-0
                            ${isAutoPlaying ? 'bg-white text-black shadow-white/20' : 'bg-[var(--amethyst)] text-black shadow-[var(--amethyst)]/50'}
                        `}
                        aria-label={isAutoPlaying ? 'Pause playback' : 'Play sequence'}
                    >
                        {isAutoPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button
                        onClick={() => setTeaserIdx(p => (p + 1) % frames.length)}
                        className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"
                        aria-label="Next frame"
                    >
                        <FastForward size={24} />
                    </button>
                </div>
                <div className="h-8 w-px bg-white/10 hidden md:block" />
                <div className="flex items-center gap-6">
                    <div className="flex gap-2">
                        <button
                            onClick={onGenerateAllAudio}
                            disabled={isGeneratingTeaserAudio || frames.length === 0}
                            className="p-3 rounded-2xl transition-all shadow-2xl bg-white/5 text-gray-500 hover:text-[var(--amethyst)] hover:bg-[var(--amethyst)]/10 flex items-center gap-2"
                            title="Synthesize All Narrations"
                        >
                            <Speaker size={18} />
                            <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">Sync All</span>
                        </button>
                        <button
                            onClick={() => onGenerateAudioForIndex(teaserIdx)}
                            disabled={isGeneratingTeaserAudio || !frames[teaserIdx]?.imageUrl}
                            className={`p-3 rounded-2xl transition-all shadow-2xl ${isGeneratingTeaserAudio ? 'bg-[var(--amethyst)] text-black animate-pulse shadow-[var(--amethyst)]/30' : 'bg-white/5 text-gray-500 hover:text-[var(--amethyst)] hover:bg-[var(--amethyst)]/10'}`}
                            title="Regenerate Active Node Audio"
                        >
                            <Volume2 size={18} />
                        </button>
                    </div>
                    <div className="h-8 w-px bg-white/10 hidden md:block" />
                    <button
                        onClick={onExportBundle}
                        disabled={isExportingBundle || frames.filter(f => f.imageUrl).length === 0}
                        className="flex items-center gap-3 px-5 py-2.5 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 text-[var(--amethyst)] hover:bg-[var(--amethyst)] hover:text-black rounded-full transition-all group/bundle active:scale-95 disabled:opacity-30"
                    >
                        {isExportingBundle ? <Loader2 size={14} className="animate-spin" /> : <FileArchive size={14} className="group-hover/bundle:scale-110 transition-transform" />}
                        <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Secure Bundle</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Enhanced Screening Strip */}
        <div className="h-32 bg-[#0a0a0a]/40 backdrop-blur-2xl rounded-[2.5rem] border border-[#1f1f1f] p-5 flex gap-6 overflow-x-auto no-scrollbar shadow-2xl shrink-0 group/timeline-strip">
            {frames.map((f, i) => (
                <button
                    key={i}
                    onClick={() => { setTeaserIdx(i); setIsAutoPlaying(false); audio.playClick(); }}
                    className={`relative w-56 h-full rounded-2xl border-2 overflow-hidden transition-all duration-700 shrink-0 group/tn
                        ${teaserIdx === i ? 'border-[var(--amethyst)] ring-8 ring-[var(--amethyst)]/10 scale-105 shadow-[0_0_40px_rgba(157,78,221,0.4)] z-10' : 'border-transparent opacity-30 hover:opacity-100 hover:border-white/20'}
                    `}
                >
                    {f.imageUrl ? (
                        <img src={f.imageUrl} className="w-full h-full object-cover group-hover/tn:scale-110 transition-transform duration-1000" alt="tn" />
                    ) : (
                        <div className="w-full h-full bg-[#050505] flex items-center justify-center text-[11px] font-mono text-gray-700 uppercase tracking-widest">Node_{i + 1}</div>
                    )}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/80 rounded-lg text-[8px] font-black font-mono text-white opacity-60 uppercase tracking-widest shadow-2xl">F_{i + 1}</div>
                    {teaserIdx === i && <div className="absolute inset-0 bg-[var(--amethyst)]/10 pointer-events-none" />}
                    {f.audioUrl && <div className="absolute top-2 right-2 p-1 bg-[var(--plasma-green)]/80 rounded-full border border-white/20 shadow-[0_0_10px_var(--plasma-green)]"><Volume2 size={8} className="text-white" /></div>}
                </button>
            ))}
        </div>
    </motion.div>
);

export default TeaserMode;
