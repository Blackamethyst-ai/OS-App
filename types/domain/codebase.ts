import { Message } from './core';

export interface DirectoryNode {
    name: string;
    type: 'folder' | 'file' | 'node' | 'module';
    description?: string;
    size?: string;
    modified?: string;
    entropy?: number;
    securityAttestation?: 'VERIFIED' | 'PENDING' | 'UNTRUSTED';
    children?: DirectoryNode[];
}

export interface CodebaseNode {
    id: string;
    path: string;
    label: string;
    type: 'file' | 'folder';
    radius: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CodebaseEdge {
    source: string;
    target: string;
}

export interface CodebaseGraph {
    nodes: CodebaseNode[];
    edges: CodebaseEdge[];
    lastScanned: number;
}

export interface EvolutionStep {
    id: string;
    file: string;
    description: string;
    patch: string;
    status: 'PENDING' | 'APPLIED' | 'FAILED';
}

export interface MigrationPlan {
    id: string;
    targetFile: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'APPROVED' | 'AUTO_GENERATING_PATCHES' | 'MANUAL_APPROVAL_REQUIRED' | 'REJECTED';
    impactedFiles: string[];
    evolutionSteps: EvolutionStep[];
    reasoning: string;
    timestamp: number;
}

export interface ToolResult {
    toolName: string;
    status: 'SUCCESS' | 'ERROR';
    data: any;
    uiHint?: 'TABLE' | 'STAT' | 'MESSAGE' | 'NAV';
}

export interface AgenticState {
    isThinking: boolean;
    activeTool: string | null;
    lastResult: ToolResult | null;
    history: Message[];
}
