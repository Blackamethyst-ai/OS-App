export type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

export enum AppMode {
    DASHBOARD = 'DASHBOARD',
    METAVENTIONS_HUB = 'METAVENTIONS_HUB',
    BIBLIOMORPHIC = 'BIBLIOMORPHIC',
    PROCESS_MAP = 'PROCESS_MAP',
    MEMORY_CORE = 'MEMORY_CORE',
    IMAGE_GEN = 'IMAGE_GEN',
    HARDWARE_ENGINEER = 'HARDWARE_ENGINEER',
    CODE_STUDIO = 'CODE_STUDIO',
    VOICE_MODE = 'VOICE_MODE',
    SYNTHESIS_BRIDGE = 'SYNTHESIS_BRIDGE',
    BICAMERAL = 'BICAMERAL',
    AGENT_CONTROL = 'AGENT_CONTROL',
    AUTONOMOUS_FINANCE = 'AUTONOMOUS_FINANCE',
    AGENT_CORE_TEST = 'AGENT_CORE_TEST'
}

export enum AppTheme {
    DARK = 'DARK',
    LIGHT = 'LIGHT',
    CONTRAST = 'CONTRAST',
    AMBER = 'AMBER',
    MIDNIGHT = 'MIDNIGHT',
    NEON_CYBER = 'NEON_CYBER',
    HIGH_CONTRAST = 'HIGH_CONTRAST',
    SOLARIZED = 'SOLARIZED',
    CUSTOM = 'CUSTOM'
}

export interface UserProfile {
    displayName: string;
    role: string;
    clearanceLevel: number;
    avatar: string | null;
}

export interface FileData {
    inlineData: {
        data: string;
        mimeType: string;
    };
    name?: string;
}

export enum TemporalEra {
    SILICON = 'SILICON',
    QUANTUM = 'QUANTUM',
    BIOMIMETIC = 'BIOMIMETIC'
}

export type ModelTier = 'fast' | 'balanced' | 'powerful' | 'creative' | 'local';

export interface AppPreferences {
    modelTier: ModelTier;
    autonomyEnabled: boolean;
}

export interface Message {
    role: 'user' | 'model' | 'system' | 'function' | 'AI' | 'USER' | 'tool';
    content?: string;
    text?: string;
    timestamp?: number;
    toolName?: string;
}

export interface SearchResultItem {
    id: string;
    title: string;
    description: string;
    type: string;
    meta?: any;
}
