import { useAppStore } from '../store';
import { executeNeuralPolicy, repairMermaidSyntax } from './geminiService';
import { AppMode } from '../types';

// Unified Neural Automata
// Replaces isolated deterministic daemons (Sentinel, Architect, Negotiator) 
// with a single comprehensive state evaluation by Gemini Flash.
// This acts as the "Training Orchestration Service", aggregating diverse inputs into a unified context.
export const neuralAutomata = async () => {
    try {
        const state = useAppStore.getState();
        const { addLog, setCodeStudioState, setHardwareState, setProcessState } = state;

        // 1. Gather Context Snapshot (Input Data Streams)
        const contextSnapshot: any = {};

        // --- AUTONOMIC LOOP 1: SELF-HEALING DIAGRAMS ---
        if (state.mode === AppMode.PROCESS_MAP && state.process.diagramStatus === 'ERROR' && state.process.generatedCode) {
            addLog('WARN', 'AUTONOMIC_REFLEX: Visual Cortex Damage Detected. Initiating Repair...');
            try {
                const fixed = await repairMermaidSyntax(state.process.generatedCode, state.process.diagramError || "Syntax Error");
                setProcessState({ generatedCode: fixed, diagramStatus: 'OK', diagramError: null });
                addLog('SUCCESS', 'AUTONOMIC_REFLEX: Diagram Topology Repaired.');
                return; // Exit cycle to prioritize this fix
            } catch (e) {
                console.error("Auto-repair failed", e);
            }
        }

        // --- AUTONOMIC LOOP 2: HARDWARE THERMAL REGULATION ---
        if (state.mode === AppMode.HARDWARE_ENGINEER && state.hardware.activeTier === 'TIER_2') {
            // Simulate Heat Build-up
            const heat = 25 + (Math.random() * 50) - (state.hardware.cooling * 20);
            
            // Critical Threshold Check
            if (heat > 60 && state.hardware.cooling < 2.0) {
                const newCooling = Math.min(2.0, state.hardware.cooling + 0.2);
                setHardwareState({ cooling: newCooling });
                addLog('WARN', `AUTONOMIC_REFLEX: Thermal Throttling Engaged. Active Cooling -> ${newCooling.toFixed(1)}x`);
                return; 
            }
        }

        // Standard Policy Engine Context Gathering
        if (state.mode === AppMode.CODE_STUDIO) {
            const code = state.codeStudio.generatedCode;
            contextSnapshot.code = code ? 
                String(code).substring(0, 1000) + "..." : "No Code";
            contextSnapshot.language = state.codeStudio.language;
        } 
        else if (state.mode === AppMode.HARDWARE_ENGINEER) {
            contextSnapshot.hardwareTier = state.hardware.activeTier;
            contextSnapshot.componentCount = state.hardware.recommendations.length;
            contextSnapshot.hasSchematic = !!state.hardware.schematicImage;
        }
        else if (state.mode === AppMode.PROCESS_MAP) {
            contextSnapshot.artifacts = state.process.artifacts.length;
            contextSnapshot.entropy = state.process.entropyScore;
            contextSnapshot.governance = state.process.governance;
        }
        
        // Get recent logs to avoid repetition
        const recentLogs = state.system.logs.slice(-5).map(l => l.message);

        // 2. Consult the Policy Engine (Primary Model Layer)
        // Check for API key safely before attempting call
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) return; // Silent fail if no key, don't nag background service

        const decision = await executeNeuralPolicy(state.mode, contextSnapshot, recentLogs);

        // 3. Execute Decision (Holistic Result)
        if (decision) {
            // Handle Code Patching
            if (decision.suggestedPatch && state.mode === AppMode.CODE_STUDIO) {
                setCodeStudioState({
                    activePatch: {
                        code: decision.suggestedPatch.code,
                        explanation: decision.suggestedPatch.explanation,
                        timestamp: Date.now()
                    }
                });
                // We log the fix availability but don't force apply
                if (!recentLogs.includes("[NEURAL_HEALER] Patch available")) {
                    addLog('SUCCESS', `[NEURAL_HEALER] Patch detected: ${decision.suggestedPatch.explanation}`);
                }
            } 
            
            // Dedup logs: Don't log if identical to last log
            const lastLog = state.system.logs[state.system.logs.length - 1];
            if (lastLog?.message !== decision.message && !decision.suggestedPatch) { // Avoid double logging patch
                addLog(decision.level, decision.message);
            }
        }
    } catch (err) {
        console.warn("Daemon Automata Cycle Failed", err);
    }
};