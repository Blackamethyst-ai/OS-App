/**
 * ImageGen - Video Mode Tab
 *
 * Temporal Loom video generation interface.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Video, Loader2, Compass, Waves, ShieldCheck, Cpu, MoveUpRight, Monitor
} from 'lucide-react';
import { audio } from '../../../../services/audioService';

interface VideoModeProps {
    videoPrompt: string;
    setVideoPrompt: (prompt: string) => void;
    videoMotionBias: number;
    setVideoMotionBias: (bias: number) => void;
    videoRes: '720p' | '1080p';
    setVideoRes: (res: '720p' | '1080p') => void;
    isVideoLoading: boolean;
    videoProgressMsg: string;
    videoUrl: string | null;
    onGenerateVideo: () => void;
}

export const VideoMode: React.FC<VideoModeProps> = ({
    videoPrompt,
    setVideoPrompt,
    videoMotionBias,
    setVideoMotionBias,
    videoRes,
    setVideoRes,
    isVideoLoading,
    videoProgressMsg,
    videoUrl,
    onGenerateVideo
}) => (
    <motion.div
        key="video"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full h-full flex gap-8 p-10 overflow-hidden"
    >
        {/* High-Fidelity Motion Controls */}
        <div className="w-[420px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2 border-r border-[var(--border-main)]">
            <div className="p-10 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/5 rounded-[3rem] flex flex-col gap-8 shadow-2xl relative overflow-hidden shrink-0 group/panel">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/panel:opacity-[0.08] transition-opacity rotate-12">
                    <Video size={140} />
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-[#d946ef]/10 border border-[#d946ef]/30 rounded-2xl">
                        <Waves className="w-6 h-6 text-[#d946ef]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black font-mono text-white uppercase tracking-[0.5em]">Temporal Loom</h2>
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1">V8.1 - THE D-Ecosystem</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-3">
                            <label className="text-[10px] font-black text-gray-400 font-mono uppercase tracking-widest flex items-center gap-2">
                                <Compass size={12} /> Motion Directive
                            </label>
                            <span className="text-[8px] font-mono text-gray-700">VEO_CORE_V3</span>
                        </div>
                        <textarea
                            value={videoPrompt}
                            onChange={e => setVideoPrompt(e.target.value)}
                            className="w-full h-40 bg-black border border-[#222] p-6 rounded-3xl text-sm font-mono text-gray-300 outline-none focus:border-[#d946ef] resize-none transition-all shadow-inner placeholder:text-gray-800"
                            placeholder="Describe cinematic travel, panning speed..."
                        />
                    </div>

                    <div className="space-y-6 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Neural Motion Bias</span>
                                <span className="text-xs font-black font-mono text-[#d946ef]">{videoMotionBias}%</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#d946ef] to-[#f0abfc] shadow-[0_0_15px_#d946ef]"
                                    animate={{ width: `${videoMotionBias}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={videoMotionBias}
                                    onChange={e => setVideoMotionBias(parseInt(e.target.value, 10))}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Target Res</label>
                                <div className="flex gap-1.5 p-1 bg-black rounded-xl border border-white/5">
                                    {(['720p', '1080p'] as const).map(res => (
                                        <button
                                            key={res}
                                            onClick={() => { setVideoRes(res); audio.playClick(); }}
                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${videoRes === res ? 'bg-[#d946ef] text-black shadow-lg shadow-[#d946ef]/20' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Coherence</label>
                                <div className="flex items-center gap-2 h-9 bg-black border border-white/5 rounded-xl px-3">
                                    <ShieldCheck size={14} className="text-[var(--plasma-green)]" />
                                    <span className="text-[9px] font-mono text-[var(--plasma-green)] font-black uppercase">Max_Stable</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onGenerateVideo}
                    disabled={isVideoLoading || !videoPrompt.trim()}
                    className="w-full py-5 bg-[#d946ef] hover:bg-[#f0abfc] text-black font-black font-mono text-[10px] uppercase tracking-[0.4em] rounded-[2.5rem] transition-all shadow-[0_20px_50px_rgba(217,70,239,0.4)] flex items-center justify-center gap-5 disabled:opacity-50 active:scale-95 relative z-10 mb-2 group/btn"
                >
                    {isVideoLoading ? <Loader2 size={7} className="w-7 h-7 animate-spin" /> : <MoveUpRight size={24} className="group-hover/btn:scale-125 transition-transform" />}
                    {isVideoLoading ? 'Synthesizing...' : 'Forge Motion Sequence'}
                </button>
            </div>

            <div className="p-8 bg-[#d946ef]/5 border border-[#d946ef]/20 rounded-[2.5rem] shrink-0 mb-10 overflow-hidden relative group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <Cpu size={16} className="text-[#d946ef]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white font-mono">Temporal Context Lock</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono leading-relaxed relative z-10 italic">
                    "Continuity protocols maintained by Production Bible."
                </p>
            </div>
        </div>

        {/* Enhanced Video Viewport */}
        <div className="flex-1 bg-[#020202] border border-white/10 rounded-[4rem] overflow-hidden relative shadow-[0_50px_150px_rgba(0,0,0,1)] flex items-center justify-center group/v-view">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(217,70,239,0.02)_0%,transparent_70%)] group-hover/v-view:opacity-100 opacity-50 transition-opacity duration-1000" />

            <AnimatePresence mode="wait">
                {isVideoLoading ? (
                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-12 relative z-10">
                        <div className="relative">
                            <div className="w-40 h-40 rounded-full border-4 border-t-[#d946ef] border-white/5 animate-spin" />
                            <div className="absolute inset-0 blur-3xl bg-[var(--amethyst)]/20 animate-pulse" />
                        </div>
                        <div className="text-center space-y-4">
                            <p className="text-3xl font-black font-mono text-white uppercase tracking-[1em] animate-pulse">{videoProgressMsg}</p>
                            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em]">Maintaining global temporal alignment nodes...</p>
                        </div>
                    </motion.div>
                ) : videoUrl ? (
                    <motion.div key="video-out" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full relative group/controls bg-black">
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                        <div className="absolute top-10 right-10 opacity-0 group-hover/controls:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            <div className="px-6 py-2.5 bg-black/80 backdrop-blur-2xl border border-[#d946ef]/40 rounded-full text-[#d946ef] text-[10px] font-black font-mono tracking-[0.2em] uppercase shadow-2xl flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#d946ef] animate-pulse" />
                                DELIVERY_LOCKED // {videoRes}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center opacity-10 group-hover/v-view:opacity-20 transition-all duration-1000 gap-12">
                        <Video size={180} className="text-gray-500" />
                        <p className="text-2xl font-mono uppercase tracking-[1.5em] text-center">Temporal Hub Standby</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </motion.div>
);

export default VideoMode;
