/**
 * SCREENING ROOM
 * Handles slideshow playback with audio narration for storyboard frames.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, ChevronRight, Volume2, VolumeX, Loader2, FileArchive } from 'lucide-react';
import JSZip from 'jszip';
import { generateSpeech, generateAudioOverview } from '../../../../services/geminiService';
import { audio } from '../../../../services/audioService';
import { Frame } from './StoryboardPanel';
import { ProductionBible } from './ProductionBiblePanel';

interface ScreeningRoomProps {
    frames: Frame[];
    onFramesChange: (frames: Frame[]) => void;
    productionBible: ProductionBible | null;
    onLog: (level: 'SUCCESS' | 'SYSTEM' | 'ERROR', message: string) => void;
}

const ScreeningRoom: React.FC<ScreeningRoomProps> = ({
    frames,
    onFramesChange,
    productionBible,
    onLog
}) => {
    const [teaserIdx, setTeaserIdx] = React.useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = React.useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);

    const generateTeaserAudioForIndex = async (idx: number): Promise<string | null> => {
        const frame = frames[idx];
        if (!frame || frame.audioUrl) return frame?.audioUrl || null;

        setIsGeneratingAudio(true);
        try {
            const narration = productionBible
                ? `Scene ${idx + 1}. ${productionBible.atmosphere}. ${frame.scenePrompt}. Visual tone: ${productionBible.visualLogic}.`
                : `Scene ${idx + 1}. ${frame.scenePrompt}.`;

            const audioData = await generateSpeech(narration, 'Puck');
            if (audioData) {
                const audioUrl = `data:audio/mp3;base64,${audioData}`;
                onFramesChange(frames.map((f, i) => i === idx ? { ...f, audioUrl } : f));
                return audioUrl;
            }
        } catch (err: any) {
            onLog('ERROR', `AUDIO_FAIL: ${err.message}`);
        } finally {
            setIsGeneratingAudio(false);
        }
        return null;
    };

    const generateAllAudio = async () => {
        setIsGeneratingAudio(true);
        onLog('SYSTEM', 'TTS: Synthesizing narration for all frames...');
        for (let i = 0; i < frames.length; i++) {
            if (!frames[i].audioUrl && frames[i].imageUrl) {
                await generateTeaserAudioForIndex(i);
            }
        }
        setIsGeneratingAudio(false);
        onLog('SUCCESS', 'TTS: All narrations complete.');
        audio.playSuccess();
    };

    const playFullSequence = async () => {
        if (isAutoPlaying) {
            setIsAutoPlaying(false);
            return;
        }

        setIsAutoPlaying(true);
        onLog('SYSTEM', 'SCREENING: Initiating slideshow narrative playback...');

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
        onLog('SUCCESS', 'SCREENING: Slideshow finalized.');
    };

    const exportBundle = async () => {
        setIsExporting(true);
        onLog('SYSTEM', 'EXPORT: Packaging production bundle...');

        try {
            const zip = new JSZip();
            const folder = zip.folder('production_bundle');

            // Add images
            for (let i = 0; i < frames.length; i++) {
                if (frames[i].imageUrl) {
                    const base64 = frames[i].imageUrl!.split(',')[1];
                    folder?.file(`frame_${String(i + 1).padStart(3, '0')}.png`, base64, { base64: true });
                }
            }

            // Add production bible
            if (productionBible) {
                folder?.file('production_bible.json', JSON.stringify(productionBible, null, 2));
            }

            // Add frame metadata
            folder?.file('frames.json', JSON.stringify(frames.map(f => ({
                index: f.index,
                scene: f.scenePrompt,
                camera: f.camera,
                lighting: f.lighting
            })), null, 2));

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'production_bundle.zip';
            link.click();
            URL.revokeObjectURL(url);

            onLog('SUCCESS', 'EXPORT: Bundle packaged successfully.');
            audio.playSuccess();
        } catch (err: any) {
            onLog('ERROR', `EXPORT_FAIL: ${err.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const currentFrame = frames[teaserIdx];
    const completedFrames = frames.filter(f => f.status === 'done').length;

    if (completedFrames === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm font-mono">
                Complete storyboard frames to access screening room
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Main Viewer */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    {currentFrame?.imageUrl && (
                        <motion.img
                            key={teaserIdx}
                            src={currentFrame.imageUrl}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5 }}
                            className="max-w-full max-h-full object-contain"
                            alt={`Frame ${teaserIdx + 1}`}
                        />
                    )}
                </AnimatePresence>

                {/* Frame Counter */}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/80 rounded-lg text-[10px] font-mono text-white">
                    {teaserIdx + 1} / {frames.length}
                </div>

                {/* Audio Indicator */}
                {currentFrame?.audioUrl && (
                    <div className="absolute top-4 right-4 p-2 bg-black/80 rounded-lg">
                        <Volume2 size={14} className="text-[var(--plasma-green)]" />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-24 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-6">
                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto max-w-[50%]">
                    {frames.filter(f => f.imageUrl).map((frame, idx) => (
                        <button
                            key={idx}
                            onClick={() => setTeaserIdx(frame.index)}
                            className={`w-16 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${teaserIdx === frame.index ? 'border-[var(--amethyst)]' : 'border-white/10'
                                }`}
                        >
                            <img src={frame.imageUrl} className="w-full h-full object-cover" alt="" />
                        </button>
                    ))}
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={generateAllAudio}
                        disabled={isGeneratingAudio}
                        className="px-4 py-2 bg-white/5 rounded-lg text-[9px] font-black uppercase text-gray-400 hover:text-white flex items-center gap-2"
                    >
                        {isGeneratingAudio ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                        Gen Audio
                    </button>

                    <button
                        onClick={playFullSequence}
                        className={`p-3 rounded-full ${isAutoPlaying ? 'bg-red-500' : 'bg-[var(--amethyst)]'}`}
                    >
                        {isAutoPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-black" />}
                    </button>

                    <button
                        onClick={exportBundle}
                        disabled={isExporting}
                        className="px-4 py-2 bg-[var(--plasma-green)]/20 border border-[var(--plasma-green)]/30 rounded-lg text-[9px] font-black uppercase text-[var(--plasma-green)] flex items-center gap-2"
                    >
                        {isExporting ? <Loader2 size={12} className="animate-spin" /> : <FileArchive size={12} />}
                        Export ZIP
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScreeningRoom;
