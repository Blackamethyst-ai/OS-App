import { MigrationPlan, EvolutionStep } from './codebase';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FrictionSignal {
    id: string;
    type: 'ERROR' | 'REPEATED_ACTION' | 'DEAD_END' | 'LONG_PAUSE' | 'ABANDONMENT';
    context: string;
    mode: string;
    timestamp: number;
    count: number;
}

export interface EvolutionHypothesis {
    id: string;
    frictionSignal: FrictionSignal;
    hypothesis: string;
    proposedSolution: string;
    generatedCode: string;
    fileType: 'component' | 'hook' | 'utility' | 'service';
    fileName: string;
    confidence: number;
    status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'DEPLOYED' | 'ROLLED_BACK';
    timestamp: number;
    impactMeasurement?: {
        frictionBefore: number;
        frictionAfter: number;
        delta: number;
    };
}

export interface EvolutionCycle {
    id: string;
    startTime: number;
    endTime: number | null;
    signalsAnalyzed: number;
    hypothesesGenerated: number;
    evolutionsDeployed: number;
    netImpact: number;
}
