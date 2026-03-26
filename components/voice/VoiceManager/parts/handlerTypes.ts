import type { SovereignMemory } from '../../../../services/memory/MemoryStore';

// Tool handler dependencies - injected from VoiceManager component closure
export type ToolHandlerDeps = {
    addLog: (level: 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO' | 'SYSTEM', message: string) => void;
    audio: { playSuccess: () => void; playTransition: () => void; playClick: () => void };
    setMode: (mode: any) => void;
    useAppStore: { getState: () => any };
    neuralVault: { get: (key: string) => Promise<any>; set: (key: string, value: any) => Promise<void> };
    sovereignMemory: SovereignMemory;
    voice: { isActive: boolean; mode?: string };
    dreamProtocol: {
        getStatus: () => any;
        getPastSessions: () => any[];
        queueQuery: (query: string) => void;
    };
    faceDetectionService: {
        isReady: () => boolean;
        getStats: () => any;
        getDetectionQuality: () => any;
        getBlinkRate: () => number;
        estimateStress: () => any;
        getLastDetection: () => any;
    };
    HIVE_AGENTS: Record<string, any>;
    runAgentReasoning: (agentId: string, query: string, context?: string) => Promise<any>;
};

// Result type returned by handler functions
// undefined = handler did not match; any other value = handler matched and returned a result
export type ToolHandlerResult = any | undefined;
