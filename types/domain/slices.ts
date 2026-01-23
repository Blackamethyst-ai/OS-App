/**
 * STORE SLICE TYPES
 *
 * Extracted type definitions for store slices.
 * Makes store.ts cleaner and types reusable.
 */

import type { SearchResultItem, FileData } from './core';
import type { StoredArtifact } from './memory';
import type { TechnicalManifest, ProtocolStepResult } from './kernel';
import type { CodebaseGraph } from './codebase';
import type { ImageSize, AspectRatio, ProductionBible, Frame } from './visuals';

// =============================================================================
// Kernel State
// =============================================================================

export interface KernelState {
    uptime: number;
    entropy: number;
    integrity: number;
    operationalState: 'BOOTING' | 'IDLE' | 'PROCESSING' | 'PAGING' | 'SUSPENDED' | 'ERROR';
    tasksProcessed: number;
    taskQueueDepth: number;
    pagesInMemory: number;
    cacheHitRate: number;
}

// =============================================================================
// System State
// =============================================================================

export interface SystemState {
    isTerminalOpen: boolean;
    logs: SystemLog[];
    dockItems: DockItem[];
}

export interface SystemLog {
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'SYSTEM';
    message: string;
    timestamp: number;
    id?: string;
}

export interface DockItem {
    id: string;
    label: string;
    icon: string;
    action: () => void;
}

// =============================================================================
// Voice State
// =============================================================================

export interface VoiceState {
    isActive: boolean;
    isConnecting: boolean;
    isOverlayVisible: boolean;
    error: string | null;
    voiceName: string;
    transcripts: VoiceTranscript[];
    partialTranscript: { role: 'user' | 'model'; text: string } | null;
    mentalState: MentalStateMetrics;
    agentAvatars: Record<string, string>;
}

export interface VoiceTranscript {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface MentalStateMetrics {
    skepticism: number;
    excitement: number;
    alignment: number;
}

// =============================================================================
// Voice Nexus State
// =============================================================================

export interface VoiceNexusState {
    mode: 'realtime' | 'turn-based' | 'hybrid';
    isActive: boolean;
    isProcessing: boolean;
    currentProvider: VoiceProviderConfig;
    transcripts: VoiceNexusTranscript[];
    lastComplexityScore: number;
    knowledgeContext: string | null;
    error: string | null;
}

export interface VoiceProviderConfig {
    stt: 'gemini' | 'whisper' | 'browser';
    reasoning: string;
    tts: 'elevenlabs' | 'gemini' | 'browser';
}

export interface VoiceNexusTranscript {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    timestamp: number;
    complexity?: number;
    provider?: string;
    knowledgeUsed?: boolean;
}

// =============================================================================
// CPB (Cognitive Precision Bridge) State
// =============================================================================

export interface CPBState {
    isActive: boolean;
    phase: 'idle' | 'analyzing' | 'compressing' | 'exploring' | 'converging' | 'verifying' | 'reconstructing' | 'complete' | 'error';
    path: 'direct' | 'rlm' | 'ace' | 'hybrid' | 'cascade';
    progress: number;
    message: string | null;
    lastResult: CPBResult | null;
    error: string | null;
}

export interface CPBResult {
    output: string;
    confidence: number;
    dqScore: number;
    path: string;
    executionTimeMs: number;
    tokensUsed: number;
    verified: boolean;
    pathReasoning: string;
}

// =============================================================================
// Visual Cortex State
// =============================================================================

export interface VisualCortexState {
    isAnalyzing: boolean;
    isProbing: boolean;
    lastResult: { summary: string; confidence: number; tags: string[] } | null;
    dropActive: boolean;
}

// =============================================================================
// Holo Projector State
// =============================================================================

export interface HoloState {
    isOpen: boolean;
    activeArtifact: StoredArtifact | null;
    analysisResult: string | null;
    isAnalyzing: boolean;
}

// =============================================================================
// Search State
// =============================================================================

export interface SearchState {
    isOpen: boolean;
    isSearching: boolean;
    query: string;
    results: SearchResultItem[];
    history: string[];
    filter: 'ALL' | 'COMMANDS' | 'MEMORY' | 'WORLD';
}

// =============================================================================
// Market Data State
// =============================================================================

export interface MarketDataState {
    lastSync: number;
    opportunities: MarketOpportunity[];
    isSyncing: boolean;
}

export interface MarketOpportunity {
    id: string;
    title: string;
    yield: string;
    risk: string;
    logic: string;
}

// =============================================================================
// Context Menu State
// =============================================================================

export interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    contextType: string;
    targetContent: string | Record<string, unknown> | null;
}
