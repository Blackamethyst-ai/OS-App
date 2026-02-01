/**
 * STORE SLICE TYPES
 *
 * Extracted type definitions for store slices.
 * Makes store.ts cleaner and types reusable.
 */

import type { SearchResultItem, FileData } from './core';
import type { StoredArtifact, ScienceHypothesis } from './memory';
import type { TechnicalManifest, ProtocolStepResult, KernelOperationalState } from './kernel';
import type { CodebaseGraph } from './codebase';
import type { ImageSize, AspectRatio, ProductionBible, Frame } from './visuals';
import type { AutonomousAgent, SwarmResult, SwarmStatus, PeerPresence, SwarmEvent, SwarmProposal } from './agents';
import type { AtomicTask } from './tasks';

// =============================================================================
// Kernel State
// =============================================================================

export interface KernelState {
    uptime: number;
    entropy: number;
    integrity: number;
    operationalState: KernelOperationalState;
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
    mode?: 'realtime' | 'turn-based' | 'hybrid';
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
    lastResult: { summary: string; confidence?: number; tags?: string[]; classification?: string; extracted_data?: any; sentiment?: string; suggested_sector?: string; action_items?: string[] } | null;
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

// =============================================================================
// Dashboard State
// =============================================================================

export interface DashboardState {
    isGenerating: boolean;
    identityUrl: string | null;
    hubViewUrl: string | null;
    activeManifest: TechnicalManifest | null;
    deploymentProgress: number;
    activeStepIndex: number;
    referenceImage: FileData | null;
    activeThemeColor: string;
    topologyData: { s: string; A: number }[];
    paraFocus: 'PROJECTS' | 'AREAS' | 'RESOURCES' | 'ARCHIVES' | 'NONE';
    isOculusView: boolean;
    architecturalFidelity: number;
}

// =============================================================================
// Process State
// =============================================================================

export interface ProcessNode {
    id: string;
    type?: string;
    position: { x: number; y: number };
    selected?: boolean;
    data: {
        label: string;
        subtext?: string;
        status?: string;
        color?: string;
        iconName?: string;
        [key: string]: unknown;
    };
}

export interface ProcessEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
    animated?: boolean;
    data?: Record<string, unknown>;
}

export interface ProcessState {
    nodes: ProcessNode[];
    edges: ProcessEdge[];
    isLoading: boolean;
    error: string | null;
    diagramStatus: string;
    diagramError: string | null;
    generatedCode: string;
    generatedWorkflow: TechnicalManifest | null;
    runtimeResults: Record<number, ProtocolStepResult>;
    activeStepIndex: number | null;
    isSimulating: boolean;
    activeTab: string;
    workflowType: 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' | 'CONVERGENT_SYNTHESIS';
    livingMapContext: { sources: FileData[] };
    pendingAIAddition: { id: string; type: string; label: string; data?: Record<string, unknown>; position?: { x: number; y: number } } | null;
    pendingAction: string | null;
    governance: 'D-Ecosystem Protocol 2025.Q1';
    coherenceScore: number;
    codebaseGraph: CodebaseGraph | null;
    audioUrl?: string;
    audioTranscript?: string;
}

// =============================================================================
// Image Generation State
// =============================================================================

export interface ImageGenState {
    prompt: string;
    isLoading: boolean;
    error: string | null;
    generatedImage: { url: string; prompt: string; aspectRatio: string; size: string } | null;
    quality: ImageSize;
    aspectRatio: AspectRatio;
    characterRefs: FileData[];
    worldRefs: FileData[];
    styleRefs: FileData[];
    activeColorway: { name: string; primary: string; secondary: string; accent: string } | null;
    activeStylePreset: string;
    resonanceCurve: { frame: number; tension: number; dynamics: number }[];
    productionBible: ProductionBible | null;
    frames: Frame[];
    selectedHeroMode: 'NONE' | 'HERO' | 'RISING' | 'CHAOS' | 'STEADY';
    videoUrl: string | null;
    videoPrompt: string;
    videoRes: '720p' | '1080p';
    videoMotionBias: number;
}

// =============================================================================
// Code Studio State
// =============================================================================

export interface CodeStudioState {
    prompt: string;
    generatedCode: string;
    language: string;
    model: string;
    isLoading: boolean;
    error: string | null;
    activeTab: 'IDE' | 'ACTIONS';
    lastEditTimestamp: number;
    isExecuting: boolean;
    activePatch: { code: string; explanation: string; timestamp: number } | null;
    isEvolving: boolean;
    activeEvolution: { code: string; reasoning: string; type: string; integrityScore: number } | null;
}

// =============================================================================
// Hardware State
// =============================================================================

export interface HardwareQuote {
    id: string;
    vendor: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    leadTime: string;
    warranty: string;
    inStock: boolean;
    rating: number;
}

export interface HardwareOrder {
    id: string;
    gpuId: string;
    gpuModel: string;
    quantity: number;
    selectedQuote: HardwareQuote | null;
    status: string;
    createdAt: number;
    updatedAt: number;
}

export interface HardwareProcurement {
    status: 'idle' | 'quoting' | 'reviewing' | 'confirming' | 'processing' | 'completed' | 'error';
    currentOrder: HardwareOrder | null;
    quotes: HardwareQuote[];
    orderHistory: Array<{ id: string; gpuId: string; gpuModel: string; quantity: number; status: string; createdAt: number }>;
    isModalOpen: boolean;
    error: string | null;
}

export interface HardwareState {
    currentEra: string;
    activeVendor: string;
    recommendations: { id: string; name: string; price: number; rating: number; vendor: string }[];
    filters: {
        minPrice: number;
        maxPrice: number;
        shape: boolean;
        showOutOfStock: boolean;
    };
    schematicImage: FileData | null;
    analysis: { summary: string; components: string[]; specs: Record<string, string> } | null;
    bom: string[];
    isLoading: boolean;
    error: string | null;
    xrayImage: string | null;
    searchHistory: string[];
    finTelemetry: {
        totalBomCost: number;
        roiProjection: number;
        maintenanceEst: number;
    };
    livePrices: Record<string, { price: number; trend: number; stock: string; source: string; lastUpdated: number }>;
    selectedGpuId: string | null;
    /** GPU tier filter (null = all tiers) */
    tierFilter: string | null;
    /** GPU search query string */
    gpuSearchQuery: string;
    procurement: HardwareProcurement;
}

// =============================================================================
// Memory State
// =============================================================================

export interface MemorySliceState {
    driveManifest: TechnicalManifest | null;
    activeCollection: string | null;
}

// =============================================================================
// Bibliomorphic State
// =============================================================================

export interface BibliomorphicState {
    activeTab: string;
    error: string | null;
}

// =============================================================================
// Discovery State
// =============================================================================

export interface DiscoveryState {
    hypotheses: ScienceHypothesis[];
    isLoading: boolean;
    status: string;
}

// =============================================================================
// Research State
// =============================================================================

export interface ResearchTask {
    id: string;
    query: string;
    status: string;
    progress: number;
    logs: string[];
    timestamp: number;
    findings?: string[] | { id: string; fact: string; confidence: number; source: string }[];
    title?: string;
    subQueries?: string[];
    hypotheses?: { id: string; statement: string; confidence: number; status: string }[];
    facts?: { id: string; fact: string; confidence: number; source: string }[];
    result?: string;
    contextSnapshot?: string;
}

export interface ResearchState {
    tasks: ResearchTask[];
}

// =============================================================================
// Bicameral State
// =============================================================================

export interface BicameralState {
    goal: string;
    plan: AtomicTask[];
    ledger: SwarmResult[];
    isPlanning: boolean;
    isSwarming: boolean;
    swarmStatus: SwarmStatus;
    error: string | null;
}

// =============================================================================
// Agents State
// =============================================================================

export interface AgentsState {
    activeAgents: AutonomousAgent[];
    isDispatching: boolean;
    swarmHealth: number;
}

// =============================================================================
// Collaboration State
// =============================================================================

export interface CollaborationState {
    peers: PeerPresence[];
    events: SwarmEvent[];
    isOverlayOpen: boolean;
}

// =============================================================================
// Synthesis State
// =============================================================================

export interface SynthesisState {
    incomingProposals: SwarmProposal[];
}

// =============================================================================
// Knowledge State
// =============================================================================

export interface KnowledgeState {
    activeLayers: string[];
}
