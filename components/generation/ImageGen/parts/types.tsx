/**
 * ImageGen Types and Shared Components
 * 
 * Contains type definitions and small reusable components for the ImageGen module.
 */

import React from 'react';

// --- Types ---

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

export interface CharacterAnchor {
    id: string;
    name: string;
    // Detailed facial features for continuity
    faceShape: string;
    eyeDescription: string;
    noseDescription: string;
    mouthDescription: string;
    skinTone: string;
    hairDescription: string;
    distinctiveFeatures: string[];
    // Full analysis text for prompt injection
    fullAnalysis: string;
    // Reference image data URL for visual comparison
    referenceThumb?: string;
    // Timestamp for cache management
    createdAt: number;
}

export interface ProductionBible {
    theme: string;
    atmosphere: string;
    visualLogic: string;
    narrativeArc: string;
    opticProfile: string;
    cinematicNotes: string[];
    // Character continuity anchors
    characterAnchors?: CharacterAnchor[];
    // World/environment continuity
    worldDescription?: string;
    // Style continuity
    styleDescription?: string;
}

export interface ImageGenProps {
    className?: string;
    style?: React.CSSProperties;
}

export type ActiveTab = 'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'SUBSTRATE' | 'TEASER';
export type ViewLayer = 'NORMAL' | 'GRAIN' | 'DEPTH';
export type RefType = 'CHAR' | 'SET' | 'STYLE';

// --- Shared Sub-Components ---

export interface MetadataTagProps {
    label: string;
    value: string;
    color?: string;
}

export const MetadataTag: React.FC<MetadataTagProps> = ({ label, value, color = "var(--amethyst)" }) => (
    <div className="flex flex-col gap-0.5 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-lg group hover:border-white/10 transition-colors shrink-0">
        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black font-mono uppercase truncate" style={{ color }}>{value}</span>
    </div>
);

export interface CrewSlotProps {
    role: string;
    status: string;
    icon: React.ComponentType<{ size?: number }>;
    color: string;
}

export const CrewSlot: React.FC<CrewSlotProps> = ({ role, status, icon: Icon, color }) => (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all shrink-0">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
            <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[8px] font-mono text-gray-400 uppercase tracking-widest leading-none mb-1">{role}</div>
            <div className="text-[10px] font-black font-mono text-gray-200 uppercase truncate">{status}</div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--plasma-green)] animate-pulse shadow-[0_0_8px_var(--plasma-green)]" />
    </div>
);

// --- Tab Definitions ---

export const IMAGEGEN_TABS = [
    { id: 'SINGLE' as const, label: 'Stills', iconName: 'Wand2' },
    { id: 'STORYBOARD' as const, label: 'Timeline', iconName: 'Clapperboard' },
    { id: 'VIDEO' as const, label: 'Motion', iconName: 'Video' },
    { id: 'SUBSTRATE' as const, label: 'Substrate', iconName: 'Sparkles' },
    { id: 'TEASER' as const, label: 'Screening', iconName: 'MonitorPlay' }
] as const;

// --- Constants ---

export const VIEW_LAYERS = ['NORMAL', 'GRAIN', 'DEPTH'] as const;
