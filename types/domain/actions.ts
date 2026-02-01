/**
 * STORE ACTION TYPES
 *
 * Type-safe action parameter types for Zustand store setters.
 * Replaces `any` types with proper generic constraints.
 */

import type {
    SearchState, VoiceState, VoiceNexusState, CPBState, VisualCortexState,
    DashboardState, ProcessState, ImageGenState, CodeStudioState, HardwareState,
    MemorySliceState, BibliomorphicState, DiscoveryState, BicameralState,
    CollaborationState, AgentsState, ResearchTask
} from './slices';
import type { StoredArtifact } from './memory';
import type { SwarmEvent } from './agents';
import type { Task, SubTask } from './tasks';

// =============================================================================
// Generic Slice Updater Type
// =============================================================================

/**
 * Generic type for slice update functions.
 * Allows both partial object updates and functional updaters.
 */
export type SliceUpdater<T> = Partial<T> | ((prev: T) => Partial<T>);

// =============================================================================
// Specific Slice Updaters
// =============================================================================

export type SearchStateUpdater = SliceUpdater<SearchState>;
export type VoiceStateUpdater = SliceUpdater<VoiceState>;
export type VoiceNexusStateUpdater = SliceUpdater<VoiceNexusState>;
export type CPBStateUpdater = SliceUpdater<CPBState>;
export type VisualCortexStateUpdater = SliceUpdater<VisualCortexState>;
export type DashboardStateUpdater = SliceUpdater<DashboardState>;
export type ProcessStateUpdater = SliceUpdater<ProcessState>;
export type ImageGenStateUpdater = SliceUpdater<ImageGenState>;
export type CodeStudioStateUpdater = SliceUpdater<CodeStudioState>;
export type HardwareStateUpdater = SliceUpdater<HardwareState>;
export type MemoryStateUpdater = SliceUpdater<MemorySliceState>;
export type BibliomorphicStateUpdater = SliceUpdater<BibliomorphicState>;
export type DiscoveryStateUpdater = SliceUpdater<DiscoveryState>;
export type BicameralStateUpdater = SliceUpdater<BicameralState>;
export type CollaborationStateUpdater = SliceUpdater<CollaborationState>;
export type AgentsStateUpdater = SliceUpdater<AgentsState>;

// =============================================================================
// Action Parameter Types
// =============================================================================

/** Context menu opening parameters */
export interface ContextMenuParams {
    x: number;
    y: number;
    contextType: string;
    content: string | Record<string, unknown> | null;
}

/** Holo projector artifact type (accepts StoredArtifact) */
export type HoloArtifact = StoredArtifact;

/** Task creation parameters */
export type TaskParams = Omit<Task, 'id' | 'timestamp' | 'subtasks'> & {
    subtasks?: SubTask[];
};

/** Task update parameters */
export type TaskUpdateParams = Partial<Omit<Task, 'id'>>;

/** Research task parameters */
export type ResearchTaskParams = Omit<ResearchTask, 'id' | 'timestamp'>;

/** Research task update parameters */
export type ResearchTaskUpdateParams = Partial<Omit<ResearchTask, 'id'>>;

/** Process node update parameters */
export interface ProcessNodeUpdateParams {
    label?: string;
    subtext?: string;
    iconName?: string;
    color?: string;
    status?: string;
    drift?: number;
    [key: string]: unknown;
}

/** Swarm event parameters */
export type SwarmEventParams = Omit<SwarmEvent, 'id' | 'timestamp'>;

/** Dock item parameters */
export interface DockItemParams {
    id: string;
    label: string;
    icon: string;
    action: () => void;
}
