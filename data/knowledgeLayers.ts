import { AppMode } from '../types';

export interface KnowledgeLayer {
    id: string;
    label: string;
    icon: string; // Lucide icon name string
    color: string;
    description: string;
    systemInstruction: string;
    memoryTags: string[]; 
    activeModes: AppMode[]; // Modes where this layer is valid
}

export const KNOWLEDGE_LAYERS: Record<string, KnowledgeLayer> = {
    'BUILDER_PROTOCOL': {
        id: 'BUILDER_PROTOCOL',
        label: 'Builder Protocol',
        icon: 'Hammer',
        color: '#f97316', // Orange
        description: 'Execution-first framework. High speed, low fluff.',
        systemInstruction: `
        [ACTIVE LAYER: BUILDER PROTOCOL]
        MODE: EXECUTION
        1. BIAS FOR ACTION: Do not explain the code unless asked. Write it.
        2. NO FLUFF: Responses must be terse, technical, and immediately actionable.
        3. SHIP IT: If a solution is 80% complete, ship it and iterate.
        4. STACK: React 19, Tailwind, Zustand, Framer Motion, Gemini Flash.
        `,
        memoryTags: ['code', 'architecture', 'prototyping', 'react'],
        activeModes: [AppMode.CODE_STUDIO, AppMode.PROCESS_MAP]
    },
    'CRYPTO_CONTEXT': {
        id: 'CRYPTO_CONTEXT',
        label: 'Crypto Context',
        icon: 'Coins',
        color: '#eab308', // Yellow
        description: 'Deep market analysis, Dogecoin & Qubic focus.',
        systemInstruction: `
        [ACTIVE LAYER: CRYPTO CONTEXT]
        MODE: ANALYST
        1. FOCUS: Dogecoin (DOGE), Qubic (QUBIC), and Macro Trends.
        2. TONE: Objective, data-driven, wary of volatility.
        3. CONTEXT: Understand 'Proof of Useful Work' (Qubic) vs 'Proof of Work' (Doge).
        `,
        memoryTags: ['crypto', 'finance', 'market_data', 'qubic', 'doge'],
        activeModes: [AppMode.DASHBOARD, AppMode.DISCOVERY, AppMode.BIBLIOMORPHIC]
    },
    'STRATEGIC_FUTURISM': {
        id: 'STRATEGIC_FUTURISM',
        label: 'Futurism',
        icon: 'Telescope',
        color: '#a855f7', // Purple
        description: 'Long-term horizon scanning and strategic implications.',
        systemInstruction: `
        [ACTIVE LAYER: STRATEGIC FUTURISM]
        MODE: VISIONARY
        1. SCOPE: 5-10 year horizon.
        2. DOMAINS: AI Singularity, Energy Transition, Sovereign Compute.
        3. METHOD: First Principles thinking.
        `,
        memoryTags: ['strategy', 'ai_trends', 'energy'],
        activeModes: [AppMode.DISCOVERY, AppMode.BICAMERAL]
    }
};