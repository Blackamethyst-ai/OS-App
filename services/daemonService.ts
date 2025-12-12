
import { useAppStore } from '../store';
import { AppMode } from '../types';

// --- DAEMON DEFINITIONS ---

export const sentinelDaemon = async () => {
    const state = useAppStore.getState();
    const { artifacts, entropyScore } = state.process;
    const { addLog } = state;

    // 1. Entropy Watchdog
    if (artifacts.length > 0) {
        // If entropy is critically high, suggest order.
        if (entropyScore > 75) {
            const msg = 'SENTINEL: Entropy Critical (>75%). Recommendation: Run "Genesis" protocol immediately.';
            const lastLog = state.system.logs[state.system.logs.length - 1];
            if (lastLog?.message !== msg) addLog('WARN', msg);
        }
    }

    // 2. Security Watchdog (Hardware Mode)
    if (state.mode === AppMode.HARDWARE_ENGINEER && state.hardware.analysis) {
        const criticalIssues = state.hardware.analysis.issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
            const msg = `SENTINEL: ${criticalIssues.length} Critical Hardware Faults detected. Abort fabrication.`;
            const lastLog = state.system.logs[state.system.logs.length - 1];
            if (lastLog?.message !== msg) addLog('ERROR', msg);
        }
    }
};

export const architectDaemon = async () => {
    const state = useAppStore.getState();
    const { generatedCode } = state.codeStudio;
    const { addLog } = state;

    if (!generatedCode || state.mode !== AppMode.CODE_STUDIO) return;

    // Simple Heuristic Checks (simulating an LLM review pass)
    const lines = generatedCode.split('\n');
    const hasComments = lines.some(l => l.trim().startsWith('//') || l.trim().startsWith('#') || l.trim().startsWith('/*'));
    const isLong = lines.length > 50;

    const lastLog = state.system.logs[state.system.logs.length - 1];

    if (isLong && !hasComments) {
        const msg = 'ARCHITECT: Code density high. Docstrings recommended for maintainability.';
        // Prevent log spam by checking if the last message is identical
        if (lastLog?.message !== msg) addLog('SYSTEM', msg);
    }

    // Security Scan (Mock)
    if (generatedCode.includes('eval(') || generatedCode.includes('innerHTML')) {
        const msg = 'ARCHITECT: Unsafe pattern detected (eval/innerHTML). Sanitization required.';
        if (lastLog?.message !== msg) addLog('WARN', msg);
    }
};

export const negotiatorDaemon = async () => {
    const state = useAppStore.getState();
    const { recommendations } = state.hardware;
    const { addLog } = state;

    if (state.mode !== AppMode.HARDWARE_ENGINEER || recommendations.length === 0) return;

    // Simulate Market Watch
    const expensiveParts = recommendations.filter(r => {
        // Mock check: Assume long part numbers imply complex/expensive SoCs
        return (r.partNumber?.length || 0) > 12; 
    });

    const lastLog = state.system.logs[state.system.logs.length - 1];

    if (expensiveParts.length > 0) {
        const msg = `NEGOTIATOR: Detected high-cost unit [${expensiveParts[0].partNumber}]. Searching for generic alternatives...`;
        if (lastLog?.message !== msg) addLog('SYSTEM', msg);
    }
};
