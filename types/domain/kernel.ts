import { DirectoryNode } from './codebase';

export type KernelOperationalState = 'BOOTING' | 'IDLE' | 'PROCESSING' | 'PAGING' | 'SUSPENDED' | 'ERROR';
export type UIComplexityLevel = 'FULL' | 'REDUCED' | 'MINIMAL' | 'FLOW_STATE';

export enum OperationalContext {
    STRATEGY_SYNTHESIS = 'STRATEGY_SYNTHESIS',
    CODE_GENERATION = 'CODE_GENERATION',
    DATA_ANALYSIS = 'DATA_ANALYSIS',
    SYSTEM_MONITORING = 'SYSTEM_MONITORING',
    GENERAL_PURPOSE = 'GENERAL_PURPOSE'
}

// Note: KernelState interface is defined in slices.ts (for store state)
// Extended kernel metrics are in services/kernel/types.ts:KernelMetrics

export interface ProtocolStep {
    instruction: string;
    role: string;
    nodeRef: string;
    phase: string;
    estimatedTime?: string;
    dependencies?: string[];
    logOutput?: string;
    securityVector?: 'ENCRYPTED' | 'OPEN' | 'VULNERABLE';
}

export interface TechnicalManifest {
    id: string;
    title: string;
    type: 'DIRECTORY' | 'SYSTEM_FLOW' | 'CODE_LOGIC';
    logic: string;
    complexity: 'PRODUCTION' | 'EXPERIMENTAL' | 'CRITICAL';
    viability: number;
    riskVector: 'LOW' | 'MEDIUM' | 'HIGH';
    depth: number;
    structure?: DirectoryNode[];
    protocols: ProtocolStep[];
    internalPlanningMonologue?: string;
    coherenceScore?: number;
    taxonomy?: any;
    deploymentAura?: string;
    entropyRating?: number;
}

export interface ProtocolStepResult {
    output: string;
    agentThought: string;
}

export interface BiometricState {
    isActive: boolean;
    gazeTrackingEnabled: boolean;
    stressDetectionEnabled: boolean;
    adaptiveUIEnabled: boolean;
    currentStressLevel: number;
    stressTrend: 'RISING' | 'STABLE' | 'FALLING';
    attentionScore: number;
    cognitiveLoad: number;
    uiComplexity: UIComplexityLevel;
    lastGazeFixation: {
        x: number;
        y: number;
        duration: number;
        targetElement: string | null;
    } | null;
    samplesCollected: number;
}
