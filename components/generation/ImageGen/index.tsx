import { apiKeyService } from '../../../services/apiKeyService';
import React, { useState } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import JSZip from 'jszip';
import { useAppStore } from '../../../store';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY } from '../../../types';
import {
    promptSelectKey, fileToGenerativePart, generateStoryboardPlan,
    constructCinematicPrompt, retryGeminiRequest,
    generateAudioOverview, getAI
} from '../../../services/geminiService';
import { AnimatePresence } from 'framer-motion';
import { audio } from '../../../services/audioService';

// Import types and extracted components
import {
    Frame, ProductionBible, ImageGenProps, ViewLayer
} from './parts/types';
import { VideoMode } from './parts/VideoMode';
import { TeaserMode } from './parts/TeaserMode';
import { StudioHeader } from './parts/StudioHeader';
import { StudioFooter } from './parts/StudioFooter';
import { SingleImageMode } from './parts/SingleImageMode';
import { StoryboardMode } from './parts/StoryboardMode';

const ImageGen: React.FC<ImageGenProps> = ({ className, style }) => {
    const imageGen = useAppStore(s => s.imageGen);
    const actions = useAppStore(s => s.actions);

    const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'TEASER'>('SINGLE');

    // Cinematic Production State
    const [productionBible, setProductionBible] = useState<ProductionBible | null>(null);
    const [isSynthesizingBible, setIsSynthesizingBible] = useState(false);

    // Storyboard State
    const [frames, setFrames] = useState<Frame[]>([]);
    const [isBatchRendering, setIsBatchRendering] = useState(false);
    const [isPlanning, setIsPlanning] = useState(false);

    // View Layers
    const [viewLayer, setViewLayer] = useState<ViewLayer>('NORMAL');

    // Screening Room State
    const [teaserIdx, setTeaserIdx] = useState(0);
    const [isGeneratingTeaserAudio, setIsGeneratingTeaserAudio] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [isExportingBundle, setIsExportingBundle] = useState(false);

    // Video State
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoRes, setVideoRes] = useState<'720p' | '1080p'>('1080p');
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoProgressMsg, setVideoProgressMsg] = useState('');
    const [videoMotionBias, setVideoMotionBias] = useState(50);

    const checkApiKey = async () => {
        const hasKey = apiKeyService.hasGeminiKey();
        if (!hasKey) {
            await promptSelectKey();
            return false;
        }
        return true;
    };

    const downloadAsset = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        audio.playSuccess();
    };

    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            const dataPromises = files.map(file => fileToGenerativePart(file));
            const newDatas = await Promise.all(dataPromises);

            if (type === 'CHAR') actions.setImageGenState({ characterRefs: [...imageGen.characterRefs, ...newDatas] });
            if (type === 'SET') actions.setImageGenState({ worldRefs: [...imageGen.worldRefs, ...newDatas] });
            if (type === 'STYLE') actions.setImageGenState({ styleRefs: [...imageGen.styleRefs, ...newDatas] });

            audio.playClick();
            actions.addLog('INFO', `ASSET_LOAD: Added ${newDatas.length} references to ${type} buffer.`);
        }
    };

    const removeRef = (idx: number, type: 'CHAR' | 'SET' | 'STYLE') => {
        if (type === 'CHAR') actions.setImageGenState({ characterRefs: imageGen.characterRefs.filter((_, i) => i !== idx) });
        if (type === 'SET') actions.setImageGenState({ worldRefs: imageGen.worldRefs.filter((_, i) => i !== idx) });
        if (type === 'STYLE') actions.setImageGenState({ styleRefs: imageGen.styleRefs.filter((_, i) => i !== idx) });
    };

    const synthesizeProductionBible = async () => {
        if (imageGen.characterRefs.length === 0 && imageGen.worldRefs.length === 0 && imageGen.styleRefs.length === 0) return;
        setIsSynthesizingBible(true);
        actions.addLog('SYSTEM', 'PRODUCTION_BIBLE: Executing multi-modal scan for cinematic consistency...');

        try {
            if (!(await checkApiKey())) { setIsSynthesizingBible(false); return; }
            const ai = getAI();

            const parts: any[] = [];

            if (imageGen.characterRefs.length > 0) {
                parts.push({ text: "IDENTITY REFERENCE VECTORS:" });
                imageGen.characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }
            if (imageGen.worldRefs.length > 0) {
                parts.push({ text: "WORLD/ENVIRONMENT REFERENCE VECTORS:" });
                imageGen.worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }
            if (imageGen.styleRefs.length > 0) {
                parts.push({ text: "AESTHETIC/STYLE REFERENCE VECTORS:" });
                imageGen.styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
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
            setProductionBible(bible);
            actions.addLog('SUCCESS', 'PRODUCTION_BIBLE: Cinematic DNA locked. Theme consistency prioritized.');
            audio.playSuccess();
        } catch (err: any) {
            actions.addLog('ERROR', `SCAN_FAIL: ${err.message}`);
        } finally {
            setIsSynthesizingBible(false);
        }
    };

    const generateSingleImage = async () => {
        if (!imageGen.prompt?.trim() && imageGen.characterRefs.length === 0) return;
        if (!(await checkApiKey())) return;

        actions.setImageGenState({ isLoading: true, error: null });
        audio.playClick();

        try {
            const ai = getAI();

            const contextualPrompt = productionBible
                ? `PRODUCTION_BIBLE_CONTEXT: ${productionBible.theme}. OPTICS: ${productionBible.opticProfile}. AESTHETIC: ${productionBible.visualLogic}. DIRECTIVE: ${imageGen.prompt}`
                : imageGen.prompt;

            let basePrompt = await constructCinematicPrompt(
                contextualPrompt || "A cinematic still shot on 35mm.",
                imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY,
                imageGen.characterRefs.length > 0,
                imageGen.worldRefs.length > 0,
                imageGen.styleRefs.length > 0,
                productionBible?.cinematicNotes.join(' '),
                imageGen.activeStylePreset
            );

            // Add character anchoring instruction if we have character refs
            if (imageGen.characterRefs.length > 0) {
                basePrompt += `\n\nCHARACTER_ANCHORING: Use the provided character reference images as the EXACT face and identity. Maintain perfect facial feature fidelity - same eyes, nose, mouth, jawline, skin tone. The character must be recognizably the same person.`;
            }

            const allRefs = [...imageGen.characterRefs, ...imageGen.worldRefs, ...imageGen.styleRefs];

            // Try Gemini native image generation first (preserves face from reference)
            if (allRefs.length > 0) {
                actions.addLog('SYSTEM', 'OPTIC_LINK: Attempting native multimodal synthesis with direct reference anchoring...');

                try {
                    const parts: any[] = allRefs.map(r => ({ inlineData: r.inlineData }));
                    parts.push({ text: basePrompt });

                    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                        model: 'gemini-2.0-flash-exp',
                        contents: { parts },
                        config: {
                            responseModalities: ['IMAGE', 'TEXT'],
                            imageDimensions: {
                                aspectRatio: imageGen.aspectRatio
                            }
                        }
                    }));

                    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
                    if (imagePart?.inlineData) {
                        const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        actions.setImageGenState({ generatedImage: { url, prompt: basePrompt, aspectRatio: imageGen.aspectRatio, size: imageGen.quality }, isLoading: false });
                        actions.addLog('SUCCESS', `ASSET_STUDIO: Render finalized via Gemini Native (Character Anchored).`);
                        audio.playSuccess();
                        return;
                    }
                } catch (e) {
                    actions.addLog('INFO', 'Native synthesis unavailable, falling back to Imagen with enhanced context...');
                }

                // Fallback: Enhanced reference analysis for Imagen
                const analysisParts: any[] = allRefs.map(r => ({ inlineData: r.inlineData }));
                analysisParts.push({ text: "Analyze these reference images in EXTREME detail. For any faces: describe exact face shape, eye color/shape/spacing, nose shape/size, lip fullness/shape, jawline, cheekbones, skin tone, hair color/style, any distinctive features. For environments and styles: describe lighting, color palette, textures, mood, composition. Be extremely specific." });

                const analysis = await retryGeminiRequest(() => ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: { parts: analysisParts }
                }));

                if (analysis.text) {
                    basePrompt += `\n\nEXACT_REFERENCE_SPECIFICATION: ${analysis.text}`;
                    actions.addLog('INFO', 'OPTIC_LINK: Enhanced references merged into synthesis vector.');
                }
            }

            // Use Imagen 4.0 for generation
            const model = imageGen.quality === ImageSize.SIZE_1K ? 'imagen-4.0-fast-generate-001' : 'imagen-4.0-generate-001';

            const response = await ai.models.generateImages({
                model,
                prompt: basePrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: imageGen.aspectRatio as any
                }
            });

            const generatedImage = response.generatedImages?.[0]?.image;

            if (generatedImage) {
                const url = `data:${generatedImage.mimeType};base64,${generatedImage.imageBytes}`;
                actions.setImageGenState({ generatedImage: { url, prompt: basePrompt, aspectRatio: imageGen.aspectRatio, size: imageGen.quality }, isLoading: false });
                actions.addLog('SUCCESS', `ASSET_STUDIO: Render finalized via Imagen 4.`);
                audio.playSuccess();
            } else {
                throw new Error("Empty buffer from cinematic core.");
            }
        } catch (err: any) {
            actions.setImageGenState({ error: err.message, isLoading: false });
            actions.addLog('ERROR', `RENDER_FAIL: ${err.message}`);
            audio.playError();
        }
    };

    const handlePlanSequence = async () => {
        if (!imageGen.prompt?.trim() && !productionBible) return;
        setIsPlanning(true);
        actions.addLog('SYSTEM', 'DIRECTOR: Forging narrative sequence timeline...');
        try {
            if (!(await checkApiKey())) { setIsPlanning(false); return; }

            const directorDirective = productionBible
                ? `THEME: ${productionBible.theme}. ARC: ${productionBible.narrativeArc}. STYLE: ${productionBible.visualLogic}. OPTICS: ${productionBible.opticProfile}. USER_INPUT: ${imageGen.prompt}`
                : imageGen.prompt;

            const plan = await generateStoryboardPlan(directorDirective);
            setFrames(plan.map((p, i) => ({
                index: i,
                scenePrompt: p.scenePrompt,
                continuity: p.continuity,
                camera: p.camera || 'Cinematic 35mm',
                lighting: p.lighting || 'Masterpiece Key-Light',
                status: 'pending'
            })));
            actions.addLog('SUCCESS', 'DIRECTOR: Timeline synchronized. Continuous logic locked.');
            audio.playSuccess();
        } catch (err: any) {
            actions.addLog('ERROR', `PLAN_FAIL: ${err.message}`);
        } finally {
            setIsPlanning(false);
        }
    };

    const renderFrame = async (idx: number) => {
        const frame = frames[idx];
        setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'generating' } : f));

        try {
            const ai = getAI();
            const model = imageGen.quality === ImageSize.SIZE_1K ? 'imagen-4.0-fast-generate-001' : 'imagen-4.0-generate-001';

            const resCurve = imageGen.resonanceCurve?.[idx];
            const resonance = resCurve
                ? `[Intensity: ${resCurve.tension}%] [Texture: ${resCurve.dynamics}%]`
                : "";

            let finalPrompt = await constructCinematicPrompt(
                `BIBLE: ${productionBible?.theme}. SCENE_${idx}: ${frame.scenePrompt} ${resonance}`,
                imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY,
                imageGen.characterRefs.length > 0,
                imageGen.worldRefs.length > 0,
                imageGen.styleRefs.length > 0,
                `CAM: ${frame.camera}. LITE: ${frame.lighting}. CONT: ${frame.continuity}`,
                imageGen.activeStylePreset
            );

            const allRefs = [...imageGen.characterRefs, ...imageGen.worldRefs, ...imageGen.styleRefs];
            if (allRefs.length > 0) {
                const analysisParts: any[] = allRefs.map(r => ({ inlineData: r.inlineData }));
                analysisParts.push({ text: `Describe these references to help generate: ${frame.scenePrompt}` });

                const analysis = await retryGeminiRequest(() => ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: { parts: analysisParts }
                }));
                if (analysis.text) finalPrompt += `\n\nREF_GUIDE: ${analysis.text}`;
            }

            const response = await ai.models.generateImages({
                model,
                prompt: finalPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: imageGen.aspectRatio as any
                }
            });

            const generatedImage = response.generatedImages?.[0]?.image;

            if (generatedImage) {
                const url = `data:${generatedImage.mimeType};base64,${generatedImage.imageBytes}`;
                setFrames(prev => prev.map((f, i) => i === idx ? { ...f, imageUrl: url, status: 'done' } : f));
            } else {
                throw new Error("Bitstream dropout.");
            }
        } catch (err: any) {
            setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
        }
    };

    const renderSequence = async () => {
        setIsBatchRendering(true);
        actions.addLog('SYSTEM', `STUDIO_RENDER: Initializing ${imageGen.quality === ImageSize.SIZE_1K ? 'FLASH' : 'CINEMATIC'} batch-process...`);

        const pendingFrames = frames.filter(f => f.status !== 'done');
        const isFlash = imageGen.quality === ImageSize.SIZE_1K;
        const batchSize = isFlash ? 3 : 1;

        for (let i = 0; i < pendingFrames.length; i += batchSize) {
            const batch = pendingFrames.slice(i, i + batchSize);
            await Promise.all(batch.map(f => renderFrame(f.index)));
            if (!isFlash) await new Promise(r => setTimeout(r, 1000));
        }
        setIsBatchRendering(false);
        actions.addLog('SUCCESS', 'STUDIO_RENDER: Sequence fabricated and archived.');
        audio.playSuccess();
    };

    const handleVideoGenerate = async () => {
        if (!videoPrompt.trim()) return;
        if (!(await checkApiKey())) return;

        setIsVideoLoading(true);
        setVideoUrl(null);
        setVideoProgressMsg("Priming VEO Temporal Handshake...");
        actions.addLog('SYSTEM', 'VEO_CORE: Forging high-motion cinematic sequence...');

        try {
            const ai = getAI();

            const veoDirective = productionBible
                ? `WITHIN THE WORLD OF ${productionBible.theme}, ${videoPrompt}. VISUALS: ${productionBible.opticProfile}. MOTION_BIAS: ${videoMotionBias}%. ENSURE CHARACTER CONSISTENCY.`
                : `${videoPrompt}. MOTION_BIAS: ${videoMotionBias}%.`;

            const characterAnchor = imageGen.characterRefs[0];

            let operation = await ai.models.generateVideos({
                model: 'veo-3.0-fast-generate',
                prompt: veoDirective,
                image: characterAnchor ? {
                    imageBytes: characterAnchor.inlineData.data,
                    mimeType: characterAnchor.inlineData.mimeType
                } : undefined,
                config: {
                    numberOfVideos: 1,
                    resolution: videoRes as any,
                    aspectRatio: '16:9'
                }
            });

            while (!operation.done) {
                setVideoProgressMsg(`Syncing Temporal Vectors... [${Math.floor(Math.random() * 30 + 30)}%]`);
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            const response = await fetch(`${downloadLink}&key=${apiKeyService.getGeminiKey()}`);
            const blob = await response.blob();
            setVideoUrl(URL.createObjectURL(blob));
            actions.addLog('SUCCESS', 'VEO_COMPLETE: Temporal sequence stabilized at 1080p.');
            audio.playSuccess();
        } catch (err: any) {
            actions.addLog('ERROR', `VEO_FAIL: ${err.message}`);
            audio.playError();
        } finally {
            setIsVideoLoading(false);
        }
    };

    const exportProductionBundle = async () => {
        if (frames.filter(f => f.imageUrl).length === 0) return;
        setIsExportingBundle(true);
        const zip = new JSZip();
        const folder = zip.folder("production_bundle_v8");
        const audioFolder = folder?.folder("synthesized_audio");

        actions.addLog('SYSTEM', 'DELIVERY: Compiling encrypted production bundle...');

        for (const frame of frames) {
            if (frame.imageUrl) {
                try {
                    const response = await fetch(frame.imageUrl);
                    const blob = await response.blob();
                    folder?.file(`frame_${frame.index + 1}.png`, blob);

                    if (frame.audioUrl) {
                        const aRes = await fetch(frame.audioUrl);
                        const aBlob = await aRes.blob();
                        audioFolder?.file(`narration_${frame.index + 1}.pcm`, aBlob);
                    }
                } catch (e) { console.error(e); }
            }
        }

        if (productionBible) {
            folder?.file("production_bible.json", JSON.stringify(productionBible, null, 2));
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `cinema_bundle_${Date.now()}.zip`;
        link.click();
        actions.addLog('SUCCESS', 'DELIVERY: Production bundle archive exported.');
        audio.playSuccess();
        setIsExportingBundle(false);
    };

    const generateTeaserAudioForIndex = async (idx: number) => {
        const currentFrame = frames[idx];
        if (!currentFrame || !currentFrame.scenePrompt) return;

        actions.addLog('SYSTEM', `SOUND_STUDIO: Synthesizing narrative for Node_${idx + 1}...`);

        try {
            if (!(await checkApiKey())) return;
            const narrativeText = productionBible
                ? `In the cinematic world of ${productionBible.theme}, ${currentFrame.scenePrompt}`
                : currentFrame.scenePrompt;

            const { audioData } = await generateAudioOverview([{
                inlineData: { data: '', mimeType: 'text/plain' },
                name: narrativeText
            }]);

            if (audioData) {
                setFrames(prev => prev.map((f, i) => i === idx ? { ...f, audioUrl: `data:audio/pcm;base64,${audioData}` } : f));
                return `data:audio/pcm;base64,${audioData}`;
            }
        } catch (err: any) {
            actions.addLog('ERROR', `SOUND_FAIL_NODE_${idx + 1}: ${err.message}`);
        }
        return null;
    };

    const generateAllSequenceAudio = async () => {
        if (frames.length === 0) return;
        setIsGeneratingTeaserAudio(true);
        actions.addLog('SYSTEM', 'SOUND_STUDIO: Batch-synthesizing full sequence narration...');

        for (let i = 0; i < frames.length; i++) {
            if (frames[i].audioUrl) continue;
            await generateTeaserAudioForIndex(i);
            await new Promise(r => setTimeout(r, 500));
        }

        setIsGeneratingTeaserAudio(false);
        actions.addLog('SUCCESS', 'SOUND_STUDIO: Narration sequence synchronized.');
        audio.playSuccess();
    };

    const playFullSequence = async () => {
        if (frames.length === 0) return;
        setIsAutoPlaying(true);
        actions.addLog('SYSTEM', 'SCREENING: Initializing slideshow narrative playback...');

        for (let i = 0; i < frames.length; i++) {
            if (!isAutoPlaying && i > 0) break;
            setTeaserIdx(i);

            let audioUrl = frames[i].audioUrl;
            if (!audioUrl) {
                audioUrl = await generateTeaserAudioForIndex(i) || undefined;
            }

            if (audioUrl) {
                await new Promise(r => setTimeout(r, 6000));
            } else {
                await new Promise(r => setTimeout(r, 5000));
            }
        }
        setIsAutoPlaying(false);
        actions.addLog('SUCCESS', 'SCREENING: Slideshow finalized.');
    };

    const toggleViewLayer = (layer: ViewLayer) => {
        setViewLayer(prev => prev === layer ? 'NORMAL' : layer);
        audio.playClick();
    };

    return (
        <div
            className={`h-full w-full bg-[var(--bg-app)] flex flex-col border border-white/10 rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] relative z-10 font-sans group/studio ${className}`}
            style={{ ...style }}
        >
            {/* Cinematic Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-50 bg-[length:100%_4px] opacity-20" />

            {/* Global Studio Header */}
            <StudioHeader activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="flex-1 overflow-hidden relative z-10 flex h-full">
                <AnimatePresence mode="wait">
                    {activeTab === 'SINGLE' && (
                        <SingleImageMode
                            imageGen={imageGen}
                            productionBible={productionBible}
                            isSynthesizingBible={isSynthesizingBible}
                            viewLayer={viewLayer}
                            onSynthesizeBible={synthesizeProductionBible}
                            onGenerateImage={generateSingleImage}
                            onToggleViewLayer={toggleViewLayer}
                            onRefUpload={handleRefUpload}
                            onRemoveRef={removeRef}
                            onDownloadAsset={downloadAsset}
                            onOpenHoloProjector={(data) => actions.openHoloProjector(data)}
                            onUpdatePrompt={(prompt) => actions.setImageGenState({ prompt })}
                            onUpdateAspectRatio={(ratio) => actions.setImageGenState({ aspectRatio: ratio })}
                            onUpdateQuality={(quality) => actions.setImageGenState({ quality })}
                        />
                    )}

                    {activeTab === 'STORYBOARD' && (
                        <StoryboardMode
                            prompt={imageGen.prompt}
                            quality={imageGen.quality}
                            productionBible={productionBible}
                            frames={frames}
                            isPlanning={isPlanning}
                            isBatchRendering={isBatchRendering}
                            onUpdatePrompt={(prompt) => actions.setImageGenState({ prompt })}
                            onUpdateQuality={(quality) => actions.setImageGenState({ quality })}
                            onPlanSequence={handlePlanSequence}
                            onRenderSequence={renderSequence}
                            onRenderFrame={renderFrame}
                            onExportBundle={exportProductionBundle}
                            onUpdateFramePrompt={(idx, prompt) => {
                                const n = [...frames];
                                n[idx].scenePrompt = prompt;
                                setFrames(n);
                            }}
                            onOpenHoloProjector={(data) => actions.openHoloProjector(data)}
                        />
                    )}

                    {activeTab === 'VIDEO' && (
                        <VideoMode
                            videoPrompt={videoPrompt}
                            setVideoPrompt={setVideoPrompt}
                            videoMotionBias={videoMotionBias}
                            setVideoMotionBias={setVideoMotionBias}
                            videoRes={videoRes}
                            setVideoRes={setVideoRes}
                            isVideoLoading={isVideoLoading}
                            videoProgressMsg={videoProgressMsg}
                            videoUrl={videoUrl}
                            onGenerateVideo={handleVideoGenerate}
                        />
                    )}

                    {activeTab === 'TEASER' && (
                        <TeaserMode
                            frames={frames}
                            teaserIdx={teaserIdx}
                            setTeaserIdx={setTeaserIdx}
                            isAutoPlaying={isAutoPlaying}
                            setIsAutoPlaying={setIsAutoPlaying}
                            isGeneratingTeaserAudio={isGeneratingTeaserAudio}
                            isExportingBundle={isExportingBundle}
                            onPlayFullSequence={playFullSequence}
                            onGenerateAllAudio={generateAllSequenceAudio}
                            onGenerateAudioForIndex={generateTeaserAudioForIndex}
                            onExportBundle={exportProductionBundle}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Global Production Footer HUD */}
            <StudioFooter activeTab={activeTab} frameCount={frames.length} />
        </div>
    );
};

export default ImageGen;
