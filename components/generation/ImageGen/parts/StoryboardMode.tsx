/**
 * ImageGen - Storyboard Mode
 *
 * Timeline-based storyboard generation with emotional resonance curve
 * and frame grid management.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Loader2, RefreshCw, Play, Sparkles, CheckCircle, Film, Maximize,
    Activity, CheckCircle2, Speaker, Clapperboard, Wand2
} from 'lucide-react';
import { FileArchive as ArchiveIcon } from 'lucide-react';
import { ImageSize } from '../../../../types';
import EmotionalResonanceGraph from '../../../EmotionalResonanceGraph';
import type { Frame, ProductionBible } from './types';

interface StoryboardModeProps {
    prompt: string;
    quality: ImageSize;
    productionBible: ProductionBible | null;
    frames: Frame[];
    isPlanning: boolean;
    isBatchRendering: boolean;
    onUpdatePrompt: (prompt: string) => void;
    onUpdateQuality: (quality: ImageSize) => void;
    onPlanSequence: () => void;
    onRenderSequence: () => void;
    onRenderFrame: (idx: number) => void;
    onExportBundle: () => void;
    onUpdateFramePrompt: (idx: number, prompt: string) => void;
    onOpenHoloProjector: (data: { id: string; title: string; type: string; content: string }) => void;
}

export const StoryboardMode: React.FC<StoryboardModeProps> = ({
    prompt,
    quality,
    productionBible,
    frames,
    isPlanning,
    isBatchRendering,
    onUpdatePrompt,
    onUpdateQuality,
    onPlanSequence,
    onRenderSequence,
    onRenderFrame,
    onExportBundle,
    onUpdateFramePrompt,
    onOpenHoloProjector
}) => (
    <motion.div
        key="storyboard"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="w-full h-full flex flex-col overflow-hidden"
    >
        <div className="flex-1 flex gap-8 p-8 overflow-hidden">
            {/* Left Panel: Controls */}
            <div className="w-[420px] bg-[#0a0a0a] border border-[#1f1f1f] rounded-[3rem] flex flex-col shrink-0 shadow-2xl overflow-hidden h-full">
                {/* Top Control Panel */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 border-b border-[#1f1f1f] bg-white/[0.01] flex flex-col gap-5">
                    <div className="flex items-center justify-between shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-[var(--amethyst)] font-mono uppercase tracking-[0.4em]">Director's Script</span>
                            <span className="text-[7px] text-gray-600 font-mono uppercase mt-0.5 tracking-widest">V8.1 - THE D-Ecosystem</span>
                        </div>
                        <div className="p-2.5 bg-[var(--amethyst)]/10 rounded-xl border border-[var(--amethyst)]/30 text-[var(--amethyst)] shadow-inner">
                            <Clapperboard size={18} />
                        </div>
                    </div>

                    <div className="flex-1 min-h-[160px] relative group">
                        <textarea
                            value={prompt}
                            onChange={e => onUpdatePrompt(e.target.value)}
                            className="w-full h-full bg-black border border-[#222] p-5 rounded-[2rem] text-sm font-mono text-gray-300 outline-none focus:border-[var(--amethyst)] resize-none transition-all shadow-inner placeholder:text-gray-800 group-hover:border-[#333]"
                            placeholder="Define the narrative arc and visual intent..."
                        />
                        <div className="absolute bottom-4 right-6 opacity-20 pointer-events-none">
                            <Wand2 size={14} className="text-gray-500" />
                        </div>
                    </div>

                    <div className="space-y-3 shrink-0 pb-2">
                        <button
                            onClick={onPlanSequence}
                            disabled={isPlanning || (!prompt?.trim() && !productionBible)}
                            className="w-full py-4 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 text-[var(--amethyst)] hover:bg-[var(--amethyst)] hover:text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95 shadow-xl group"
                        >
                            {isPlanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover:scale-110 transition-transform" />}
                            Initialize Synthesis
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={onRenderSequence}
                                disabled={isBatchRendering || frames.length === 0}
                                className="flex-1 py-3.5 bg-[var(--amethyst)] text-black font-black font-mono text-[9px] uppercase tracking-[0.2em] rounded-[1.2rem] hover:bg-[#b06bf7] transition-all shadow-[0_10px_25px_rgba(157,78,221,0.25)] flex items-center justify-center gap-2.5 disabled:opacity-30 active:scale-95"
                            >
                                {isBatchRendering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />}
                                Render
                            </button>
                            <button
                                onClick={onExportBundle}
                                disabled={frames.filter(f => f.imageUrl).length === 0}
                                className="flex-1 py-3.5 bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-20"
                            >
                                <ArchiveIcon size={14} />
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Half: Emotional Resonance Curve */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0 space-y-6 flex flex-col bg-[#050505]/40">
                    <div className="flex-1 flex flex-col space-y-5 min-h-[300px]">
                        <div className="flex justify-between items-center px-1 shrink-0">
                            <div className="flex items-center gap-3">
                                <Activity size={16} className="text-[var(--cyan)] animate-pulse" />
                                <span className="text-[10px] font-black text-gray-500 font-mono uppercase tracking-[0.3em]">Resonance Curve</span>
                            </div>
                            <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                {[ImageSize.SIZE_1K, ImageSize.SIZE_2K].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => onUpdateQuality(s)}
                                        className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all ${quality === s ? 'bg-[var(--cyan)] border-[var(--cyan)] text-black shadow-lg shadow-[var(--cyan)]/20' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 bg-black/60 rounded-[2rem] overflow-hidden border border-white/5 shadow-inner">
                            <EmotionalResonanceGraph />
                        </div>
                    </div>

                    <div className="pt-5 border-t border-white/5 grid grid-cols-2 gap-3 shrink-0">
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-1">
                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Coherence</span>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[var(--plasma-green)] font-mono uppercase tracking-tighter">LOCKED</span>
                                <CheckCircle2 size={12} className="text-[var(--plasma-green)]" />
                            </div>
                        </div>
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-1">
                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Acoustic Sync</span>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[var(--cyan)] font-mono uppercase tracking-tighter">READY</span>
                                <Speaker size={12} className="text-[var(--cyan)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Frame Grid */}
            <div className="flex-1 bg-black/40 border border-[#1f1f1f] rounded-[3.5rem] overflow-y-auto custom-scrollbar p-10 shadow-inner">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 pb-10">
                    {frames.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`bg-[#0a0a0a] border rounded-[2.5rem] overflow-hidden transition-all duration-700 relative group shrink-0
                            ${f.status === 'done' ? 'border-emerald-500/20 bg-emerald-950/5' : f.status === 'generating' ? 'border-[var(--amethyst)] shadow-[0_0_30px_rgba(157,78,221,0.1)] animate-pulse' : 'border-[#1f1f1f] hover:border-[#333]'}
                        `}
                        >
                            <div className="aspect-video bg-black relative overflow-hidden group/frame">
                                {f.imageUrl ? (
                                    <img src={f.imageUrl} className="w-full h-full object-cover group-hover/frame:scale-110 transition-transform duration-[8s]" alt="frame" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 gap-6">
                                        <Film size={64} className="text-gray-500" />
                                        <span className="text-[11px] font-mono uppercase tracking-[0.5em]">Frame_{String(i + 1).padStart(2, '0')} Pending</span>
                                    </div>
                                )}
                                <div className="absolute top-6 left-6 px-4 py-2 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black font-mono text-white z-10 shadow-2xl uppercase">Node_{i + 1}</div>
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/frame:opacity-100 transition-opacity flex items-center justify-center gap-5 z-20">
                                    <button onClick={() => onRenderFrame(i)} className="p-4 bg-[var(--amethyst)] text-black rounded-2xl shadow-2xl hover:scale-110 transition-transform active:scale-95" aria-label="Regenerate frame"><RefreshCw size={24} /></button>
                                    {f.imageUrl && <button onClick={() => onOpenHoloProjector({ id: `f-${i}`, title: `Frame ${i + 1}`, type: 'IMAGE', content: f.imageUrl })} className="p-4 bg-white text-black rounded-2xl shadow-2xl hover:scale-110 transition-transform active:scale-95" aria-label="View full size"><Maximize size={24} /></button>}
                                </div>
                            </div>
                            <div className="p-8 space-y-6 overflow-y-auto max-h-[300px] custom-scrollbar">
                                <div className="flex justify-between items-center text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">
                                    <span>Scene Protocol</span>
                                    {f.status === 'done' && <CheckCircle size={16} className="text-[var(--plasma-green)]" />}
                                </div>
                                <textarea
                                    value={f.scenePrompt}
                                    onChange={e => onUpdateFramePrompt(i, e.target.value)}
                                    className="w-full h-24 bg-black/60 border border-white/5 p-5 rounded-2xl text-xs font-mono text-gray-300 outline-none focus:border-[var(--amethyst)] transition-all resize-none shadow-inner"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    </motion.div>
);

export default StoryboardMode;
