export interface Frame {
    index: number;
    scenePrompt: string;
    continuity: string;
    camera: string;
    lighting: string;
    status: 'pending' | 'generating' | 'done' | 'error';
    imageUrl?: string;
    audioUrl?: string;
    error?: string;
}

export interface ProductionBible {
    theme: string;
    atmosphere: string;
    visualLogic: string;
    narrativeArc: string;
    opticProfile: string;
    cinematicNotes: string[];
}

export interface ResonancePoint {
    frame: number;
    tension: number;
    dynamics: number;
}

export interface Colorway {
    id: string;
    name: string;
    colors: string[];
}

export const SOVEREIGN_DEFAULT_COLORWAY: Colorway = {
    id: 'sovereign-default',
    name: 'Sovereign Bridge',
    colors: ['#7B2CFF', '#18E6FF', '#020204']
};

export enum AspectRatio {
    RATIO_1_1 = '1:1',
    RATIO_3_4 = '3:4',
    RATIO_4_3 = '4:3',
    RATIO_16_9 = '16:9',
    RATIO_9_16 = '9:16'
}

export enum ImageSize {
    SIZE_1K = '1K',
    SIZE_2K = '2K',
    SIZE_4K = '4K'
}
