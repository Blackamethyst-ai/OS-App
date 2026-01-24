/**
 * STORYBOARD PANEL
 * Handles timeline planning and frame rendering for storyboard sequences.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Clapperboard, Play, CheckCircle2, Camera, Sun } from 'lucide-react';
import { FileData, SOVEREIGN_DEFAULT_COLORWAY } from '../../../../types';
import {
    generateStoryboardPlan, constructCinematicPrompt, retryGeminiRequest,
    getAI, promptSelectKey
} from '../../../../services/geminiService';
import { GenerateContentResponse } from '@google/genai';
import { audio } from '../../../../services/audioService';
import { ProductionBible } from './ProductionBiblePanel';

export interface Frame {
    index: number;
    scenePrompt: string;
    continuity: string;
    camera: string;
    lighting: string;
    status: 'pending' | 'generating' | 'done' | 'error';
    imageUrl?: string;
    audioUrl?: string;
    error?: string;
}

interface StoryboardPanelProps {
    prompt: string;
    productionBible: ProductionBible | null;
    characterRefs: FileData[];
    worldRefs: FileData[];
    styleRefs: FileData[];
    activeStylePreset: string;
    activeColorway: any;
    frames: Frame[];
    onFramesChange: (frames: Frame[]) => void;
    onLog: (level: 'SUCCESS' | 'SYSTEM' | 'ERROR', message: string) => void;
}

const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
    prompt,
    productionBible,
    characterRefs,
    worldRefs,
    styleRefs,
    activeStylePreset,
    activeColorway,
    frames,
    onFramesChange,
    onLog
}) => {
    const [isPlanning, setIsPlanning] = React.useState(false);
    const [isBatchRendering, setIsBatchRendering] = React.useState(false);

    const checkApiKey = async () => {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
            await promptSelectKey();
            return false;
        }
        return true;
    };

    const handlePlanSequence = async () => {
        if (!prompt?.trim() && !productionBible) return;
        setIsPlanning(true);
        onLog('SYSTEM', 'DIRECTOR: Forging narrative sequence timeline...');
        try {
            if (!(await checkApiKey())) { setIsPlanning(false); return; }

            const directorDirective = productionBible
                ? `THEME: ${productionBible.theme}. ARC: ${productionBible.narrativeArc}. STYLE: ${productionBible.visualLogic}. OPTICS: ${productionBible.opticProfile}. USER_INPUT: ${prompt}`
                : prompt;

            const plan = await generateStoryboardPlan(directorDirective);
            onFramesChange(plan.map((p, i) => ({
                index: i,
                scenePrompt: p.scenePrompt,
                continuity: p.continuity,
                camera: p.camera || 'Cinematic 35mm',
                lighting: p.lighting || 'Masterpiece Key-Light',
                status: 'pending'
            })));
            onLog('SUCCESS', 'DIRECTOR: Timeline synchronized. Continuous logic locked.');
            audio.playSuccess();
        } catch (err: any) {
            onLog('ERROR', `PLAN_FAIL: ${err.message}`);
        } finally {
            setIsPlanning(false);
        }
    };

    const renderFrame = async (idx: number) => {
        const frame = frames[idx];
        onFramesChange(frames.map((f, i) => i === idx ? { ...f, status: 'generating' } : f));

        try {
            if (!(await checkApiKey())) {
                onFramesChange(frames.map((f, i) => i === idx ? { ...f, status: 'pending' } : f));
                return;
            }
            const ai = getAI();

            const contextualPrompt = productionBible
                ? `PRODUCTION_BIBLE: ${productionBible.theme}. OPTICS: ${productionBible.opticProfile}. SCENE: ${frame.scenePrompt}. CAMERA: ${frame.camera}. LIGHTING: ${frame.lighting}. CONTINUITY: ${frame.continuity}.`
                : `${frame.scenePrompt}. Camera: ${frame.camera}. Lighting: ${frame.lighting}.`;

            const finalPrompt = await constructCinematicPrompt(
                contextualPrompt,
                activeColorway || SOVEREIGN_DEFAULT_COLORWAY,
                characterRefs.length > 0,
                worldRefs.length > 0,
                styleRefs.length > 0,
                productionBible?.cinematicNotes.join(' '),
                activeStylePreset
            );

            const parts: any[] = [];
            characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            parts.push({ text: finalPrompt });

            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: { parts },
                config: { imageConfig: { aspectRatio: '16:9' } }
            }));

            let url = '';
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    break;
                }
            }

            if (url) {
                onFramesChange(frames.map((f, i) => i === idx ? { ...f, status: 'done', imageUrl: url } : f));
                onLog('SUCCESS', `FRAME_${idx + 1}: Shot locked.`);
                audio.playSuccess();
            } else {
                throw new Error("Empty frame buffer.");
            }
        } catch (err: any) {
            onFramesChange(frames.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
            onLog('ERROR', `FRAME_${idx + 1}_FAIL: ${err.message}`);
        }
    };

    const renderSequence = async () => {
        setIsBatchRendering(true);
        onLog('SYSTEM', 'BATCH_RENDER: Initiating continuous shot pipeline...');
        for (let i = 0; i < frames.length; i++) {
            if (frames[i].status !== 'done') {
                await renderFrame(i);
            }
        }
        setIsBatchRendering(false);
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-4 overflow-y-auto">
            {/* Plan Button */}
            <button
                onClick={handlePlanSequence}
                disabled={isPlanning || (!prompt && !productionBible)}
                className="w-full py-3 bg-gradient-to-r from-[var(--amethyst)]/20 to-transparent border border-[var(--amethyst)]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--amethyst)] hover:border-[var(--amethyst)]/60 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
                {isPlanning ? (
                    <><Loader2 size={14} className="animate-spin" /> Planning...</>
                ) : (
                    <><Clapperboard size={14} /> Plan Storyboard</>
                )}
            </button>

            {/* Frame Grid */}
            {frames.length > 0 && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-500 uppercase">
                            {frames.length} Frames
                        </span>
                        <button
                            onClick={renderSequence}
                            disabled={isBatchRendering}
                            className="px-4 py-2 bg-[var(--plasma-green)]/20 border border-[var(--plasma-green)]/30 rounded-lg text-[9px] font-black uppercase text-[var(--plasma-green)] flex items-center gap-2"
                        >
                            {isBatchRendering ? (
                                <><Loader2 size={12} className="animate-spin" /> Rendering...</>
                            ) : (
                                <><Play size={12} /> Render All</>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {frames.map((frame, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="aspect-video bg-black/40 border border-white/5 rounded-xl overflow-hidden relative group"
                            >
                                {frame.imageUrl ? (
                                    <img src={frame.imageUrl} className="w-full h-full object-cover" alt={`Frame ${idx + 1}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {frame.status === 'generating' ? (
                                            <Loader2 size={20} className="text-[var(--amethyst)] animate-spin" />
                                        ) : (
                                            <span className="text-[9px] text-gray-600 font-mono">F{idx + 1}</span>
                                        )}
                                    </div>
                                )}

                                {frame.status === 'done' && (
                                    <div className="absolute top-2 right-2 p-1 bg-[var(--plasma-green)] rounded-full">
                                        <CheckCircle2 size={10} className="text-black" />
                                    </div>
                                )}

                                {/* Frame Info Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-[8px] text-white font-mono truncate">{frame.scenePrompt}</div>
                                    <div className="flex gap-2 mt-1 text-[7px] text-gray-400">
                                        <span className="flex items-center gap-1"><Camera size={8} /> {frame.camera}</span>
                                        <span className="flex items-center gap-1"><Sun size={8} /> {frame.lighting}</span>
                                    </div>
                                </div>

                                {/* Render Single Button */}
                                {frame.status === 'pending' && !isBatchRendering && (
                                    <button
                                        onClick={() => renderFrame(idx)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="text-[9px] font-black text-white uppercase">Render</span>
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default StoryboardPanel;
