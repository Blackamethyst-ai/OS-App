/**
 * ImageGen - Single Image Mode
 *
 * Main tab for single image generation with reference management,
 * production bible synthesis, viewport, and studio crew panel.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, RefreshCw, Download, Plus, Wand2, Zap, Maximize2,
    Binary, Award, FileJson, Focus, UserCircle, Map as MapIcon, Palette,
    Aperture, Sun, Scissors, Users, Clapperboard as DirectorIcon,
    ZoomIn, Scan, X
} from 'lucide-react';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY } from '../../../../types';
import { audio } from '../../../../services/audioService';
import { MetadataTag, CrewSlot, ViewLayer, ProductionBible } from './types';

interface SingleImageModeProps {
    imageGen: any;
    productionBible: ProductionBible | null;
    isSynthesizingBible: boolean;
    viewLayer: ViewLayer;
    onSynthesizeBible: () => void;
    onGenerateImage: () => void;
    onToggleViewLayer: (layer: ViewLayer) => void;
    onRefUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => void;
    onRemoveRef: (idx: number, type: 'CHAR' | 'SET' | 'STYLE') => void;
    onDownloadAsset: (url: string, filename: string) => void;
    onOpenHoloProjector: (data: { id: string; title: string; type: string; content: string }) => void;
    onUpdatePrompt: (prompt: string) => void;
    onUpdateAspectRatio: (ratio: AspectRatio) => void;
    onUpdateQuality: (quality: ImageSize) => void;
}

const RenderRefs: React.FC<{
    type: 'CHAR' | 'SET' | 'STYLE';
    refs: FileData[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => void;
    onRemove: (idx: number, type: 'CHAR' | 'SET' | 'STYLE') => void;
}> = ({ type, refs, onUpload, onRemove }) => {
    const Icon = type === 'CHAR' ? UserCircle : type === 'SET' ? MapIcon : Palette;
    const label = type === 'CHAR' ? 'Identity' : type === 'SET' ? 'World' : 'Aesthetic';

    return (
        <div className="space-y-3 shrink-0">
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Icon size={12} /> {label} Vector
                </span>
                <label className="p-1 cursor-pointer hover:text-white text-gray-600 transition-colors">
                    <Plus size={14} />
                    <input type="file" multiple className="hidden" onChange={(e) => onUpload(e, type)} />
                </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {refs.map((ref, i) => (
                    <div key={i} className="aspect-square relative rounded-lg overflow-hidden border border-white/5 group/ref">
                        <img src={`data:${ref.inlineData.mimeType};base64,${ref.inlineData.data}`} className="w-full h-full object-cover grayscale-[30%] group-hover/ref:grayscale-0 transition-all" alt="ref" />
                        <button onClick={() => onRemove(i, type)} className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white opacity-0 group-hover/ref:opacity-100 transition-opacity"><X size={10} /></button>
                    </div>
                ))}
                <label className="aspect-square rounded-lg border border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--amethyst)]/40 group/add">
                    <Plus size={16} className="text-gray-700 group-hover/add:text-[var(--amethyst)] transition-colors" />
                    <input type="file" multiple className="hidden" onChange={(e) => onUpload(e, type)} />
                </label>
            </div>
        </div>
    );
};

export const SingleImageMode: React.FC<SingleImageModeProps> = ({
    imageGen,
    productionBible,
    isSynthesizingBible,
    viewLayer,
    onSynthesizeBible,
    onGenerateImage,
    onToggleViewLayer,
    onRefUpload,
    onRemoveRef,
    onDownloadAsset,
    onOpenHoloProjector,
    onUpdatePrompt,
    onUpdateAspectRatio,
    onUpdateQuality
}) => {
    const hasRefs = imageGen.characterRefs.length > 0 || imageGen.worldRefs.length > 0 || imageGen.styleRefs.length > 0;

    return (
        <motion.div key="single" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full h-full flex gap-10 p-10 overflow-hidden">
            {/* Sidebar: Global References */}
            <div className="w-[420px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-4 border-r border-[var(--border-main)]">

                <div className="text-[10px] font-black text-[var(--amethyst)] font-mono uppercase tracking-[0.4em] flex items-center gap-2 px-1 shrink-0">
                    <Award size={14} /> Production Matrix
                </div>

                <div className="space-y-6 shrink-0">
                    <RenderRefs type="CHAR" refs={imageGen.characterRefs} onUpload={onRefUpload} onRemove={onRemoveRef} />
                    <RenderRefs type="SET" refs={imageGen.worldRefs} onUpload={onRefUpload} onRemove={onRemoveRef} />
                    <RenderRefs type="STYLE" refs={imageGen.styleRefs} onUpload={onRefUpload} onRemove={onRemoveRef} />
                </div>

                <button
                    onClick={onSynthesizeBible}
                    disabled={isSynthesizingBible || !hasRefs}
                    className={`w-full py-5 border rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-2xl shrink-0
                    ${productionBible ? 'bg-[var(--plasma-green)]/10 border-[var(--plasma-green)]/40 text-[var(--plasma-green)]' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white'}
                `}
                >
                    {isSynthesizingBible ? <Loader2 size={16} className="animate-spin" /> : productionBible ? <RefreshCw size={16} /> : <Binary size={18} />}
                    {productionBible ? 'Reforge Production Bible' : 'Forge Production Bible'}
                </button>

                <AnimatePresence>
                    {productionBible && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-6 bg-[#0a0a0a] border border-[var(--plasma-green)]/20 rounded-3xl space-y-4 shadow-inner shrink-0 overflow-hidden">
                            <div className="flex items-center justify-between text-[var(--plasma-green)]">
                                <div className="flex items-center gap-2">
                                    <FileJson size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Active Manifest</span>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--plasma-green)] animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                <p className="text-[11px] text-gray-300 font-mono italic leading-relaxed">"{productionBible.theme}. {productionBible.visualLogic}"</p>
                                <div className="flex flex-wrap gap-2">
                                    {productionBible.cinematicNotes.slice(0, 3).map((note, i) => (
                                        <span key={i} className="text-[8px] px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-500 font-mono truncate max-w-[120px]">{note}</span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col gap-4 mt-2 shrink-0">
                    <span className="text-[10px] font-black text-[var(--amethyst)] font-mono uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                        <Focus size={14} /> Master Directive
                    </span>
                    <textarea
                        value={imageGen.prompt}
                        onChange={e => onUpdatePrompt(e.target.value)}
                        className="w-full h-40 bg-[#0a0a0a] border border-[#222] p-6 rounded-[2.5rem] text-sm font-mono text-gray-300 outline-none focus:border-[var(--amethyst)] resize-none transition-all placeholder:text-gray-800 shadow-inner group-hover:border-[#333]"
                        placeholder="Input core narrative intent sequence..."
                        data-voice-id="imagegen-prompt-input"
                        aria-label="Image generation prompt"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-2">Optics (Aspect)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(AspectRatio).map(r => (
                                <button
                                    key={r}
                                    onClick={() => onUpdateAspectRatio(r)}
                                    className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 group/ratio ${imageGen.aspectRatio === r ? 'bg-[var(--amethyst)] border-[var(--amethyst)] shadow-lg shadow-[var(--amethyst)]/20' : 'bg-black border border-[#222] hover:bg-white/5'}`}
                                >
                                    <div
                                        style={{ aspectRatio: r.replace(':', '/') }}
                                        className={`w-6 rounded-sm border ${imageGen.aspectRatio === r ? 'bg-black border-white/20' : 'bg-white/10 border-white/10 group-hover/ratio:bg-white/20'}`}
                                    />
                                    <span className={`text-[8px] font-black uppercase ${imageGen.aspectRatio === r ? 'text-black' : 'text-gray-600'}`}>{r}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-2">Render Engine</label>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => onUpdateQuality(ImageSize.SIZE_1K)}
                                className={`w-full py-3 px-4 rounded-xl text-[10px] font-black border transition-all flex items-center justify-between group ${imageGen.quality === ImageSize.SIZE_1K ? 'bg-[var(--cyan)] border-[var(--cyan)] text-black shadow-lg shadow-[var(--cyan)]/20' : 'bg-black border border-[#222] text-gray-500 hover:text-white'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Zap size={12} className={imageGen.quality === ImageSize.SIZE_1K ? 'fill-current' : ''} />
                                    <span>FLASH RENDER</span>
                                </div>
                                <span className="opacity-50 text-[8px]">FAST</span>
                            </button>
                            <button
                                onClick={() => onUpdateQuality(ImageSize.SIZE_4K)}
                                className={`w-full py-3 px-4 rounded-xl text-[10px] font-black border transition-all flex items-center justify-between group ${imageGen.quality === ImageSize.SIZE_4K ? 'bg-[var(--amethyst)] border-[var(--amethyst)] text-black shadow-lg shadow-[var(--amethyst)]/20' : 'bg-black border border-[#222] text-gray-500 hover:text-white'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Aperture size={12} />
                                    <span>PRO UPSCALE</span>
                                </div>
                                <span className="opacity-50 text-[8px]">4K</span>
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onGenerateImage}
                    disabled={imageGen.isLoading || (!imageGen.prompt?.trim() && imageGen.characterRefs.length === 0)}
                    className="w-full py-6 bg-[var(--amethyst)] hover:bg-[#b06bf7] text-black font-black font-mono text-xs uppercase tracking-[0.5em] rounded-[2.5rem] transition-all shadow-[0_30px_60px_color-mix(in_srgb,var(--amethyst),transparent_60%)] flex items-center justify-center gap-5 group/btn active:scale-95 disabled:opacity-50 shrink-0 mb-10"
                    data-voice-id="imagegen-generate-button"
                    aria-label="Generate image"
                >
                    {imageGen.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap size={22} className="group-hover/btn:scale-125 transition-transform" />}
                    {imageGen.isLoading ? 'Processing Scene...' : 'Render Master Frame'}
                </button>
            </div>

            {/* Viewport Area */}
            <div className="flex-1 flex flex-col gap-6 min-w-0 h-full">
                <div className="flex-1 bg-[#050505] border border-[#1f1f1f] rounded-[3.5rem] overflow-hidden relative flex items-center justify-center shadow-2xl group/viewport">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--amethyst),transparent_98%)_0%,transparent_80%)] pointer-events-none" />

                    <AnimatePresence mode="wait">
                        {imageGen.isLoading ? (
                            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-10">
                                <div className="relative">
                                    <Loader2 size={80} className="text-[var(--amethyst)] animate-spin" />
                                    <div className="absolute inset-0 blur-3xl bg-[var(--amethyst)]/20 animate-pulse" />
                                </div>
                                <div className="text-center space-y-3">
                                    <p className="text-sm font-black font-mono text-white uppercase tracking-[0.8em]">Inverting spectral logic...</p>
                                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Coherence Matrix Synthesis v4.0 Active</p>
                                </div>
                            </motion.div>
                        ) : imageGen.generatedImage ? (
                            <motion.div
                                key="image"
                                initial={{ opacity: 0, scale: 1.02 }}
                                animate={{
                                    opacity: 1,
                                    scale: viewLayer === 'GRAIN' ? 1.5 : 1,
                                    filter: viewLayer === 'DEPTH' ? 'grayscale(1) contrast(2) brightness(0.7)' : 'none'
                                }}
                                className="w-full h-full p-10 flex items-center justify-center relative overflow-hidden"
                            >
                                <img
                                    src={imageGen.generatedImage.url}
                                    className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_60px_120px_rgba(0,0,0,1)] border border-white/5 transition-all duration-700"
                                    alt="Generated Output"
                                />

                                {viewLayer === 'GRAIN' && (
                                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
                                )}

                                {/* Technical Overlays */}
                                <div className="absolute top-14 left-14 flex flex-col gap-4">
                                    <MetadataTag label="Production Node" value="A100_VOLTA_HUB" />
                                    <MetadataTag label="Optic Profile" value={imageGen.quality === ImageSize.SIZE_1K ? "FLASH_Cinematic" : "PRO_HighFidelity"} color="var(--cyan)" />
                                </div>
                                <div className="absolute bottom-14 right-14 flex flex-col items-end gap-4">
                                    <div className="px-5 py-3 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-2xl">
                                        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-black">RES: {imageGen.quality} // {imageGen.aspectRatio}</span>
                                        <div className={`w-2.5 h-2.5 rounded-full ${viewLayer !== 'NORMAL' ? 'bg-[var(--amethyst)]' : 'bg-[var(--plasma-green)]'} animate-pulse shadow-[0_0_10px_currentColor]`} />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center opacity-10 group-hover/viewport:opacity-20 transition-all duration-1000 text-center space-y-8">
                                <div className="w-40 h-40 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center relative">
                                    <Aperture size={80} className="text-gray-500" />
                                    <div className="absolute inset-0 rounded-full border border-[var(--amethyst)]/20 animate-ping" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xl font-mono uppercase tracking-[0.6em]">Viewport Standby</p>
                                    <p className="text-[11px] font-mono text-gray-600 uppercase tracking-widest">Establish reference vectors to initialize rendering</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Unified Lens Control Tray */}
                <div className="h-20 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2.5rem] flex items-center shrink-0 shadow-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 pointer-events-none" />

                    <div className="flex-1 flex items-center gap-8 px-10">
                        <button
                            onClick={() => onToggleViewLayer('GRAIN')}
                            className={`flex items-center gap-3 text-[11px] font-black font-mono transition-all group ${viewLayer === 'GRAIN' ? 'text-[var(--amethyst)]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <ZoomIn size={18} className={`${viewLayer === 'GRAIN' ? 'scale-125' : 'group-hover:scale-125'} transition-transform`} />
                            <span className="tracking-widest">INSPECT_GRAIN</span>
                            {viewLayer === 'GRAIN' && <motion.div layoutId="layer-dot" className="w-1.5 h-1.5 rounded-full bg-[var(--amethyst)] shadow-[0_0_8px_var(--amethyst)]" />}
                        </button>

                        <div className="h-6 w-px bg-white/5" />

                        <button
                            onClick={() => onToggleViewLayer('DEPTH')}
                            className={`flex items-center gap-3 text-[11px] font-black font-mono transition-all group ${viewLayer === 'DEPTH' ? 'text-[var(--cyan)]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <Scan size={18} className={`${viewLayer === 'DEPTH' ? 'scale-125' : 'group-hover:scale-125'} transition-transform`} />
                            <span className="tracking-widest">DEPTH_MAP</span>
                            {viewLayer === 'DEPTH' && <motion.div layoutId="layer-dot" className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]" />}
                        </button>
                    </div>

                    <div className="h-full w-px bg-[#1f1f1f]" />

                    <div className="flex items-center gap-4 px-10">
                        <button
                            onClick={() => imageGen.generatedImage && onOpenHoloProjector({ id: 'current', title: 'Master Frame', type: 'IMAGE', content: imageGen.generatedImage.url })}
                            className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-white/40 text-gray-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Maximize2 size={14} /> Fullscreen
                        </button>
                        <button
                            onClick={() => imageGen.generatedImage && onDownloadAsset(imageGen.generatedImage.url, `master_frame_${Date.now()}.png`)}
                            className="px-6 py-2.5 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 text-[var(--amethyst)] hover:bg-[var(--amethyst)] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_color-mix(in_srgb,var(--amethyst),transparent_75%)] active:scale-95"
                        >
                            <Download size={14} /> Secure Buffer
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Active Studio Crew */}
            <div className="w-[320px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-[var(--border-main)]">
                <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2rem] flex flex-col gap-6 shadow-2xl shrink-0">
                    <div className="flex items-center gap-3 mb-2 px-1">
                        <Users size={16} className="text-[var(--cyan)]" />
                        <h2 className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Active Studio Crew</h2>
                    </div>
                    <div className="space-y-3">
                        <CrewSlot role="Director" status="Narrative Mapping" icon={DirectorIcon} color="var(--amethyst)" />
                        <CrewSlot role="DP / Optics" status="Anamorphic Tuning" icon={Aperture} color="var(--cyan)" />
                        <CrewSlot role="Lighting Head" status="Ray-Tracing L0" icon={Sun} color="#f59e0b" />
                        <CrewSlot role="Editor" status="Continuity Lock" icon={Scissors} color="var(--plasma-green)" />
                    </div>
                    <div className="pt-4 border-t border-white/5 mt-2 flex flex-col gap-4 px-1">
                        <div className="flex justify-between text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                            <span>Studio Load</span>
                            <span>34%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div animate={{ width: '34%' }} className="h-full bg-[var(--amethyst)]" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-[200px] bg-gradient-to-br from-[var(--amethyst)]/5 to-transparent border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center text-center relative overflow-hidden group/award shrink-0 mb-10">
                    <Award size={48} className="mx-auto text-[var(--executive-gold)] mb-6 group-hover/award:scale-125 transition-transform duration-700" />
                    <h3 className="text-xs font-black font-mono text-white uppercase tracking-widest mb-4">Award-Ready Fidelity</h3>
                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed px-4">Assets optimized for large-scale projection and cinematic delivery chains.</p>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(241,194,27,0.05)_0%,transparent_70%)] opacity-0 group-hover/award:opacity-100 transition-opacity" />
                </div>
            </div>
        </motion.div>
    );
};

export default SingleImageMode;
