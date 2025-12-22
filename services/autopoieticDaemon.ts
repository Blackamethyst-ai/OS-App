
import { useAppStore } from '../store';
import { evolveSystemArchitecture } from './geminiService';
import { AppMode } from '../types';

let lastScannedCode = "";
let lastScanTimestamp = 0;
const SCAN_COOLDOWN = 30000; // 30 seconds of inactivity required

/**
 * Autopoietic Refactoring Daemon.
 * Periodically captures code state and leverages Gemini 3 Pro for structural evolution.
 * Optimized to regulate resource consumption by using inactivity detection.
 */
export const autopoieticDaemon = async () => {
    const state = useAppStore.getState();
    const { codeStudio, addLog, setCodeStudioState } = state;

    // Guard: Only run in Code Studio with valid code that has changed
    if (state.mode !== AppMode.CODE_STUDIO) return;
    if (!codeStudio.generatedCode || codeStudio.generatedCode === lastScannedCode) return;
    
    const now = Date.now();
    const timeSinceLastEdit = now - codeStudio.lastEditTimestamp;

    // Resource Optimization: Only trigger if the Architect has been inactive for the cooldown period
    if (timeSinceLastEdit < SCAN_COOLDOWN) return;
    if (now - lastScanTimestamp < 60000) return; // Hard min 1 min between scans regardless of inactivity

    lastScanTimestamp = now;
    lastScannedCode = codeStudio.generatedCode;

    addLog('SYSTEM', 'AUTOPOIETIC_SCAN: Detecting architectural drift. Initiating evolution sequence...');
    setCodeStudioState({ isEvolving: true });

    try {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
            setCodeStudioState({ isEvolving: false });
            return;
        }

        const evolutionResult = await evolveSystemArchitecture(
            codeStudio.generatedCode, 
            codeStudio.language,
            codeStudio.prompt
        );

        // FIX: Properly handle Result return from evolveSystemArchitecture
        if (evolutionResult.ok && evolutionResult.value.code) {
            const evolution = evolutionResult.value;
            setCodeStudioState({ 
                activeEvolution: {
                    code: evolution.code,
                    reasoning: evolution.reasoning,
                    type: evolution.type,
                    integrityScore: evolution.integrityScore || 50
                },
                isEvolving: false
            });
            addLog('SUCCESS', `AUTOPOIETIC_DAEMON: Structural evolution available [Type: ${evolution.type}] [Integrity: ${evolution.integrityScore || '??'}%]`);
        } else {
            setCodeStudioState({ isEvolving: false });
            addLog('INFO', 'AUTOPOIETIC_DAEMON: Architecture verified as stable.');
        }

    } catch (err: any) {
        console.error("Autopoietic Scan Failed", err);
        setCodeStudioState({ isEvolving: false });
        addLog('ERROR', 'AUTOPOIETIC_SCAN: Evolution protocol interrupted.');
    }
};
