import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { fileToGenerativePart, analyzeVisualInput, promptSelectKey } from '../services/geminiService';
import { audio } from '../services/audioService';
import { useAgentRuntime } from './useAgentRuntime';

export const useVisualCortex = () => {
    const { 
        visualCortex, setVisualCortexState, addLog, 
        mode, setMode, setCodeStudioState, pushToInvestmentQueue 
    } = useAppStore();
    const { execute } = useAgentRuntime();

    const processVisualInput = useCallback(async (file: File) => {
        setVisualCortexState({ isAnalyzing: true, dropActive: false });
        addLog('SYSTEM', `OCULUS_SCAN: Capturing optical data from [${file.name}]...`);
        audio.playClick();

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const data = await fileToGenerativePart(file);
            const result = await analyzeVisualInput(data, `Active Mode: ${mode}`);
            
            setVisualCortexState({ lastResult: result, isAnalyzing: false });
            addLog('SUCCESS', `OCULUS_SCAN: Analysis finalized. Sentiment: ${result.sentiment}`);
            audio.playSuccess();

            // Route based on Gemini Intelligence
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
                setCodeStudioState({ prompt: `Implement logic based on visual analysis: ${result.summary}` });
            }

        } catch (err: any) {
            setVisualCortexState({ isAnalyzing: false });
            addLog('ERROR', `OCULUS_FAIL: ${err.message}`);
            audio.playError();
        }
    }, [mode, addLog, setVisualCortexState, setMode, setCodeStudioState, pushToInvestmentQueue]);

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

    return { isAnalyzing: visualCortex.isAnalyzing, dropActive: visualCortex.dropActive };
};
