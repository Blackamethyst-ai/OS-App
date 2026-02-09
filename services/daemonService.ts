import { apiKeyService } from './apiKeyService';
import { logger } from './logger';
import { useAppStore } from '../store';
import { executeNeuralPolicy, repairMermaidSyntax } from './geminiService';
import { AppMode } from '../types';

let lastLoggedPatchTimestamp = 0;

export const neuralAutomata = async () => {
    try {
        const state = useAppStore.getState();
        const { actions } = state;
        const { addLog, setCodeStudioState, setHardwareState, setProcessState } = actions;

        if (state.mode === AppMode.PROCESS_MAP && state.process.diagramStatus === 'ERROR' && state.process.generatedCode) {
            addLog('WARN', 'AUTONOMIC_REFLEX: Visual Cortex Damage Detected. Initiating Repair...');
            try {
                const fixed = await repairMermaidSyntax(state.process.generatedCode, state.process.diagramError || "Syntax Error");
                setProcessState({ generatedCode: fixed, diagramStatus: 'OK', diagramError: null });
                addLog('SUCCESS', 'AUTONOMIC_REFLEX: Diagram Topology Repaired.');
                return;
            } catch (e) {
                logger.error('Auto-repair failed', e, 'DaemonService');
            }
        }

        const contextSnapshot: any = {};
        if (state.mode === AppMode.CODE_STUDIO) {
            const code = state.codeStudio.generatedCode;
            contextSnapshot.code = code ? String(code).substring(0, 1000) + "..." : "No Code";
            contextSnapshot.language = state.codeStudio.language;
        } 
        else if (state.mode === AppMode.HARDWARE_ENGINEER) {
            contextSnapshot.hardwareTier = state.hardware.tierFilter || 'ALL';
            contextSnapshot.hasSchematic = !!state.hardware.schematicImage;
        }

        const recentLogs = state.system.logs.slice(-5).map(l => l.message);
        const hasKey = apiKeyService.hasGeminiKey();
        if (!hasKey) return; 

        // Fixed: explicitly typed the decision result from executeNeuralPolicy to resolve unknown property errors
        const decision = await executeNeuralPolicy(state.mode, contextSnapshot, recentLogs) as {
            suggestedPatch?: { code: string, explanation: string },
            level: 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO' | 'SYSTEM',
            message: string
        };

        if (decision) {
            // Fixed: Safely accessed suggestedPatch through explicit typing
            if (decision.suggestedPatch && state.mode === AppMode.CODE_STUDIO) {
                const patchTimestamp = Date.now();
                setCodeStudioState({
                    activePatch: {
                        code: decision.suggestedPatch.code,
                        explanation: decision.suggestedPatch.explanation,
                        timestamp: patchTimestamp
                    }
                });

                if (patchTimestamp - lastLoggedPatchTimestamp > 60000) { 
                    addLog('SUCCESS', `[NEURAL_HEALER] optimization available in Studio.`);
                    lastLoggedPatchTimestamp = patchTimestamp;
                }
            } else {
                const lastLog = state.system.logs[state.system.logs.length - 1];
                // Fixed: Safely accessed decision.message and decision.suggestedPatch through explicit typing
                if (lastLog?.message !== decision.message && !decision.suggestedPatch) {
                    addLog(decision.level, decision.message);
                }
            }
        }
    } catch (err) {
        logger.warn('Daemon automata cycle failed', err, 'DaemonService');
    }
};