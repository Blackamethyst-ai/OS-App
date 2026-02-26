/**
 * PRODUCTION BIBLE PANEL
 * Synthesizes and displays cinematic production guidelines from reference images.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Loader2, Sparkles, Eye, Camera, Sun, Focus } from 'lucide-react';
import { FileData } from '../../../../types';
import { retryGeminiRequest, getAI, promptSelectKey } from '../../../../services/geminiService';
import { GenerateContentResponse, Type } from '@google/genai';
import { audio } from '../../../../services/audioService';

export interface ProductionBible {
    theme: string;
    atmosphere: string;
    visualLogic: string;
    narrativeArc: string;
    opticProfile: string;
    cinematicNotes: string[];
}

interface ProductionBiblePanelProps {
    characterRefs: FileData[];
    worldRefs: FileData[];
    styleRefs: FileData[];
    productionBible: ProductionBible | null;
    onBibleChange: (bible: ProductionBible | null) => void;
    onLog: (level: 'SUCCESS' | 'SYSTEM' | 'ERROR', message: string) => void;
}

const ProductionBiblePanel: React.FC<ProductionBiblePanelProps> = ({
    characterRefs,
    worldRefs,
    styleRefs,
    productionBible,
    onBibleChange,
    onLog
}) => {
    const [isSynthesizing, setIsSynthesizing] = React.useState(false);

    const checkApiKey = async () => {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
            await promptSelectKey();
            return false;
        }
        return true;
    };

    const synthesizeBible = async () => {
        if (characterRefs.length === 0 && worldRefs.length === 0 && styleRefs.length === 0) return;
        setIsSynthesizing(true);
        onLog('SYSTEM', 'PRODUCTION_BIBLE: Executing multi-modal scan for cinematic consistency...');

        try {
            if (!(await checkApiKey())) { setIsSynthesizing(false); return; }
            const ai = getAI();

            const parts: any[] = [];

            if (characterRefs.length > 0) {
                parts.push({ text: "IDENTITY REFERENCE VECTORS:" });
                characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }
            if (worldRefs.length > 0) {
                parts.push({ text: "WORLD/ENVIRONMENT REFERENCE VECTORS:" });
                worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }
            if (styleRefs.length > 0) {
                parts.push({ text: "AESTHETIC/STYLE REFERENCE VECTORS:" });
                styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }

            parts.push({ text: "Synthesize a comprehensive Production Bible for this film series. Ensure extreme realism and consistent theme application. Output JSON {theme, atmosphere, visualLogic, narrativeArc, opticProfile, cinematicNotes[]}." });

            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: { parts },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            theme: { type: Type.STRING },
                            atmosphere: { type: Type.STRING },
                            visualLogic: { type: Type.STRING },
                            narrativeArc: { type: Type.STRING },
                            opticProfile: { type: Type.STRING },
                            cinematicNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['theme', 'atmosphere', 'visualLogic', 'narrativeArc', 'opticProfile', 'cinematicNotes']
                    }
                }
            }));

            const bible = JSON.parse(response.text || '{}');
            onBibleChange(bible);
            onLog('SUCCESS', 'PRODUCTION_BIBLE: Cinematic DNA locked. Theme consistency prioritized.');
            audio.playSuccess();
        } catch (err: any) {
            onLog('ERROR', `SCAN_FAIL: ${err.message}`);
        } finally {
            setIsSynthesizing(false);
        }
    };

    const hasRefs = characterRefs.length > 0 || worldRefs.length > 0 || styleRefs.length > 0;

    return (
        <div className="space-y-4">
            {/* Synthesis Button */}
            <button
                onClick={synthesizeBible}
                disabled={!hasRefs || isSynthesizing}
                className="w-full py-3 bg-gradient-to-r from-[var(--amethyst)]/20 to-transparent border border-[var(--amethyst)]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--amethyst)] hover:border-[var(--amethyst)]/60 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
                {isSynthesizing ? (
                    <><Loader2 size={14} className="animate-spin" /> Synthesizing...</>
                ) : (
                    <><Sparkles size={14} /> Forge Production Bible</>
                )}
            </button>

            {/* Bible Display */}
            {productionBible && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3"
                >
                    <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Production Bible Active</div>

                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Eye size={10} /> {productionBible.theme}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Camera size={10} /> {productionBible.opticProfile}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Sun size={10} /> {productionBible.atmosphere}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Focus size={10} /> {productionBible.narrativeArc}
                        </div>
                    </div>

                    {productionBible.cinematicNotes.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                            <div className="text-[7px] font-mono text-gray-600 uppercase mb-1">Director Notes</div>
                            <div className="text-[9px] text-gray-500 leading-relaxed">
                                {productionBible.cinematicNotes[0]}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default ProductionBiblePanel;
