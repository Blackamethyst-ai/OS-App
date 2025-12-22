import { useAppStore } from '../store';
import { executeNeuralPolicy, repairMermaidSyntax } from './geminiService';
import { AppMode } from '../types';

let lastLoggedPatchTimestamp = 0;

// Unified Neural Automata
// Aggregates diverse inputs into a unified context and provides proactive system healing.
export const neuralAutomata = async () => {
    try {
        const state = useAppStore.getState();
        const { addLog, setCodeStudioState, setHardwareState, setProcessState } = state;

        // --- AUTONOMIC LOOP 1: SELF-HEALING DIAGRAMS ---
        if (state.mode === AppMode.PROCESS_MAP && state.process.diagramStatus === 'ERROR' && state.process.generatedCode) {
            addLog('WARN', 'AUTONOMIC_REFLEX: Visual Cortex Damage Detected. Initiating Repair...');
            try {
                const fixed = await repairMermaidSyntax(state.process.generatedCode, state.process.diagramError || "Syntax Error");
                setProcessState({ generatedCode: fixed, diagramStatus: 'OK', diagramError: null });
                addLog('SUCCESS', 'AUTONOMIC_REFLEX: Diagram Topology Repaired.');
                return;
            } catch (e) {
                console.error("Auto-repair failed", e);
            }
        }

        // 1. Gather Context Snapshot
        const contextSnapshot: any = {};
        if (state.mode === AppMode.CODE_STUDIO) {
            const code = state.codeStudio.generatedCode;
            contextSnapshot.code = code ? String(code).substring(0, 1000) + "..." : "No Code";
            contextSnapshot.language = state.codeStudio.language;
        } 
        else if (state.mode === AppMode.HARDWARE_ENGINEER) {
            contextSnapshot.hardwareTier = state.hardware.activeTier;
            contextSnapshot.hasSchematic = !!state.hardware.schematicImage;
        }

        const recentLogs = state.system.logs.slice(-5).map(l => l.message);

        // 2. Consult the Policy Engine
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) return; 

        const decision = await executeNeuralPolicy(state.mode, contextSnapshot, recentLogs);

        // 3. Execute Decision
        if (decision) {
            if (decision.suggestedPatch && state.mode === AppMode.CODE_STUDIO) {
                const patchTimestamp = Date.now();
                setCodeStudioState({
                    activePatch: {
                        code: decision.suggestedPatch.code,
                        explanation: decision.suggestedPatch.explanation,
                        timestamp: patchTimestamp
                    }
                });

                // DEDUPLICATION: Only log a notification if it's a fresh patch window
                if (patchTimestamp - lastLoggedPatchTimestamp > 60000) { 
                    addLog('SUCCESS', `[NEURAL_HEALER] optimization available in Studio.`);
                    lastLoggedPatchTimestamp = patchTimestamp;
                }
            } else {
                const lastLog = state.system.logs[state.system.logs.length - 1];
                if (lastLog?.message !== decision.message && !decision.suggestedPatch) {
                    addLog(decision.level, decision.message);
                }
            }
        }
    } catch (err) {
        console.warn("Daemon Automata Cycle Failed", err);
    }
};