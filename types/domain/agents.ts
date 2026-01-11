import { AppMode } from './core';

export interface MentalState {
    skepticism: number;
    excitement: number;
    alignment: number;
}

export interface HiveAgent {
    id: string;
    name: string;
    gender: 'male' | 'female';
    voice: string;
    systemPrompt: string;
    weights?: { skepticism: number; logic: number; creativity: number; empathy: number };
    expertise?: string[];
    archetype?: string;
}

export interface AgentDNA {
    id: string;
    label: string;
    role: string;
    color: string;
    description: string;
}

export interface AutonomousAgent {
    id: string;
    name: string;
    role: string;
    context: any; // OperationalContext from kernel.ts
    status: 'ACTIVE' | 'IDLE' | 'THINKING' | 'SLEEPING';
    memoryBuffer: { timestamp: number; role: 'USER' | 'AI' | 'SYSTEM'; text: string }[];
    capabilities: string[];
    lastInstruction?: string;
    currentMindset: MentalState;
    energyLevel: number;
    avatarUrl?: string;
    tasks: any[]; // AtomicTask from tasks.ts
}

export interface SyntheticPersona {
    id: string;
    name: string;
    role: string;
    bias: string;
    systemPrompt: string;
    avatar_color: string;
    currentMindset: MentalState;
    voiceName: string;
}

export interface SwarmProposal {
    id: string;
    agentId: string;
    agentName: string;
    type: 'OPTIMIZATION' | 'EXPANSION' | 'SECURITY';
    title: string;
    description: string;
    impact: string;
    manifest: any; // Partial<TechnicalManifest> from kernel.ts
    timestamp: number;
}

export interface SwarmResult {
    taskId: string;
    output: string;
    confidence: number;
    agentId: string;
    executionTime: number;
    voteLedger: VoteLedger;
}

export interface SwarmStatus {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
    consensusProgress?: number;
    activeDNA?: string;
}

export interface SwarmEvent {
    id: string;
    userId: string;
    userName: string;
    action: string;
    target?: string;
    timestamp: number;
}

export interface DebateTurn {
    id: string;
    personaId: string;
    text: string;
    timestamp: number;
    sentiment: string;
    newMindset?: MentalState;
}

export interface VoteLedger {
    winner: string;
    count: number;
    runnerUp: string;
    runnerUpCount: number;
    totalRounds: number;
    killedAgents: number;
}

export interface PeerPresence {
    id: string;
    name: string;
    role: string;
    activeSector: AppMode;
    status: 'ACTIVE' | 'IDLE' | 'BUSY';
    color: string;
    lastSeen: number;
}
