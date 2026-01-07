import { apiKeyService } from '../services/apiKeyService';
import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { fileToGenerativePart, analyzeVisualInput, promptSelectKey } from '../services/geminiService';
import { audio } from '../services/audioService';
import { useAgentRuntime } from './useAgentRuntime';

export const useVisualCortex = () => {
    const { 
        visualCortex, mode, actions 
    } = useAppStore();
    const { 
        setVisualCortexState, addLog, setMode, setCodeStudioState, pushToInvestmentQueue 
    } = actions;
    const { execute } = useAgentRuntime();

    const processVisualInput = useCallback(async (file: File | Blob, name: string = 'Captured Stream') => {
        setVisualCortexState({ isAnalyzing: true, dropActive: false, isProbing: false });
        addLog('SYSTEM', `OCULUS_SCAN: Capturing optical data from [${name}]...`);
        audio.playClick();

        try {
            if (!(apiKeyService.hasGeminiKey())) { await promptSelectKey(); return; }
            
            let fileData;
            if (file instanceof File) {
                fileData = await fileToGenerativePart(file);
            } else {
                // Handle raw blobs (from screen capture)
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(file);
                });
                const base64Data = await base64Promise;
                fileData = { inlineData: { data: base64Data, mimeType: file.type } };
            }

            // Fixed: explicitly typed the result from analyzeVisualInput to resolve unknown property errors
            const result = await analyzeVisualInput(fileData, `Active Mode: ${mode}`) as {
                classification: string;
                extracted_data: any;
                sentiment: string;
                suggested_sector: string;
                summary: string;
                action_items: string[];
            };
            
            setVisualCortexState({ lastResult: result, isAnalyzing: false, isProbing: false });
            // Fixed: Safely accessed sentiment through explicit typing
            addLog('SUCCESS', `OCULUS_SCAN: Analysis finalized. Sentiment: ${result.sentiment}`);
            audio.playSuccess();

            // Route based on Gemini Intelligence
            // Fixed: Safely accessed suggested_sector, extracted_data and summary through explicit typing
            if (result.suggested_sector === 'AUTONOMOUS_FINANCE' && result.extracted_data) {
                pushToInvestmentQueue({
                    title: result.summary,
                    viability: 95,
                    riskVector: 'LOW',
                    logic: result.summary
                });
                addLog('INFO', 'ROUTING: Extracted financial metadata staged for Treasury.');
            } else if (result.suggested_sector === 'CODE_STUDIO') {
                setMode('CODE_STUDIO' as any);
                // Fixed: Safely accessed summary through explicit typing
                setCodeStudioState({ prompt: `Implement logic based on visual analysis: ${result.summary}` });
            }

        } catch (err: any) {
            setVisualCortexState({ isAnalyzing: false, isProbing: false });
            addLog('ERROR', `OCULUS_FAIL: ${err.message}`);
            audio.playError();
        }
    }, [mode, addLog, setVisualCortexState, setMode, setCodeStudioState, pushToInvestmentQueue]);

    const probeScreen = useCallback(async () => {
        setVisualCortexState({ isProbing: true });
        addLog('SYSTEM', 'OCULUS_PROBE: Requesting screen access for context synthesis...');
        
        try {
            // Request display media
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true,
                audio: false 
            } as any);
            
            const track = stream.getVideoTracks()[0];
            const ImageCapture = (window as any).ImageCapture;

            // Preferred method: ImageCapture API
            if (ImageCapture) {
                const imageCapture = new ImageCapture(track);
                const bitmap = await imageCapture.grabFrame();
                
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(bitmap, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) processVisualInput(blob, 'Screen Probe Capture');
                    stream.getTracks().forEach(t => t.stop());
                }, 'image/jpeg', 0.95);
            } else {
                // Fallback: Using a temporary video element for frame extraction
                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                video.play();

                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        // Allow some time for the video to actually render a frame
                        setTimeout(resolve, 500);
                    };
                });

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) processVisualInput(blob, 'Screen Probe Capture');
                    stream.getTracks().forEach(t => t.stop());
                    video.srcObject = null;
                }, 'image/jpeg', 0.95);
            }

        } catch (err: any) {
            setVisualCortexState({ isProbing: false });
            addLog('WARN', 'OCULUS_PROBE: Screen access denied or interrupted.');
        }
    }, [processVisualInput, setVisualCortexState, addLog]);

    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            if (!visualCortex.dropActive) setVisualCortexState({ dropActive: true });
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            if (e.relatedTarget === null) setVisualCortexState({ dropActive: false });
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                processVisualInput(file);
            } else {
                setVisualCortexState({ dropActive: false });
            }
        };

        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('drop', handleDrop);
        };
    }, [visualCortex.dropActive, setVisualCortexState, processVisualInput]);

    return { 
        isAnalyzing: visualCortex.isAnalyzing, 
        isProbing: visualCortex.isProbing, 
        dropActive: visualCortex.dropActive,
        probeScreen
    };
};