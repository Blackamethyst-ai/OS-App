import { AppMode } from './core';

export interface StoredArtifact {
    id: string;
    name: string;
    title?: string;
    type: string;
    data: Blob;
    content?: string;
    analysis: ArtifactAnalysis | null;
    timestamp: number;
    tags: string[];
    metadata?: Record<string, unknown>;
}

export interface ArtifactAnalysis {
    classification: string;
    ambiguityScore: number;
    entities: string[];
    summary: string;
    entropyRating?: number;
    structural_intelligence?: string;
}

export interface KnowledgeNode {
    id: string;
    label: string;
    type: 'CONCEPT' | 'FACT' | 'HYPOTHESIS' | 'BRIDGE' | 'AXIOM' | 'CLUSTER';
    connections: string[];
    strength: number;
    color?: string;
    data?: any;
    artifactRef?: any;
}

export interface KnowledgeLayer {
    id: string;
    label: string;
    icon: string;
    color: string;
    description: string;
    systemInstruction: string;
    memoryTags: string[];
    activeModes: AppMode[];
}

export interface FactChunk {
    id: string;
    fact: string;
    confidence: number;
    source: string;
}

export interface CompressedAxiom {
    id: string;
    statement: string;
    reductionFactor: number;
    sourceNodes: string[];
}

export interface AnalysisResult {
    scores: {
        centralization: number;
        entropy: number;
        vitality: number;
        opacity: number;
        adaptability: number;
    };
    sustainer: string;
    extractor: string;
    destroyer: string;
    vectors: {
        mechanism: string;
        vulnerability: string;
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    }[];
    insight: string;
    groundingSources?: { title: string; uri: string }[];
}

export interface ScienceHypothesis {
    id: string;
    statement: string;
    confidence: number;
    status: 'IDLE' | 'TESTING' | 'VERIFIED' | 'REJECTED';
}

export interface SimulationReport {
    viabilityScore: number;
    projectedUpside: number;
    consensus: string;
    majorFrictionPoints: string[];
    actionableFixes: string[];
}
