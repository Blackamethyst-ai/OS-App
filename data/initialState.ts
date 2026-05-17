/**
 * INITIAL STATE VALUES
 *
 * Default state for all store slices.
 * Extracted from store.ts for cleaner organization.
 */

import {
    AppMode, AppTheme, ImageSize, AspectRatio,
    KernelState, SystemState, VoiceState, VoiceNexusState,
    CPBState, VisualCortexState, HoloState, SearchState,
    MarketDataState, ContextMenuState, DashboardState, ProcessState,
    ImageGenState, CodeStudioState, HardwareState, MemorySliceState,
    BibliomorphicState, DiscoveryState, ResearchState, BicameralState,
    AgentsState, CollaborationState, SynthesisState, KnowledgeState,
    UserProfile, AppPreferences, BiometricState
} from '../types';
import { INITIAL_AGENTS as INITIAL_AGENTS_LIST } from './initialAgents';
import { INITIAL_METAVENTIONS } from './initialMetaventions';

// =============================================================================
// Core State
// =============================================================================

export const INITIAL_USER: UserProfile = {
    displayName: 'Operator_Core',
    role: 'ARCHITECT',
    clearanceLevel: 10,
    avatar: null
};

export const INITIAL_PREFERENCES: AppPreferences = {
    modelTier: 'balanced',
    autonomyEnabled: false
};

// =============================================================================
// Kernel & System
// =============================================================================

export const INITIAL_KERNEL: KernelState = {
    uptime: 0,
    entropy: 5,
    integrity: 99,
    operationalState: 'IDLE',
    tasksProcessed: 0,
    taskQueueDepth: 0,
    pagesInMemory: 0,
    cacheHitRate: 0.95
};

export const INITIAL_BIOMETRIC: BiometricState = {
    isActive: false,
    gazeTrackingEnabled: true,
    stressDetectionEnabled: true,
    adaptiveUIEnabled: true,
    currentStressLevel: 0,
    stressTrend: 'STABLE',
    attentionScore: 100,
    cognitiveLoad: 30,
    uiComplexity: 'FULL',
    lastGazeFixation: null,
    samplesCollected: 0
};

export const INITIAL_SYSTEM: SystemState = {
    isTerminalOpen: false,
    logs: [],
    dockItems: []
};

// =============================================================================
// Voice & AI
// =============================================================================

export const INITIAL_VOICE: VoiceState = {
    isActive: false,
    isConnecting: false,
    isOverlayVisible: true,
    error: null,
    voiceName: 'Puck',
    transcripts: [],
    partialTranscript: null,
    mentalState: {
        skepticism: 20,
        excitement: 85,
        alignment: 95
    },
    agentAvatars: {}
};

export const INITIAL_VOICE_NEXUS: VoiceNexusState = {
    mode: 'hybrid',
    isActive: false,
    isProcessing: false,
    currentProvider: {
        stt: 'gemini',
        reasoning: 'auto',
        tts: 'elevenlabs'
    },
    transcripts: [],
    lastComplexityScore: 0,
    knowledgeContext: null,
    error: null
};

export const INITIAL_CPB: CPBState = {
    isActive: false,
    phase: 'idle',
    path: 'direct',
    progress: 0,
    message: null,
    lastResult: null,
    error: null
};

export const INITIAL_VISUAL_CORTEX: VisualCortexState = {
    isAnalyzing: false,
    isProbing: false,
    lastResult: null,
    dropActive: false
};

// =============================================================================
// UI State
// =============================================================================

export const INITIAL_SEARCH: SearchState = {
    isOpen: false,
    isSearching: false,
    query: '',
    results: [],
    history: [],
    filter: 'ALL'
};

export const INITIAL_HOLO: HoloState = {
    isOpen: false,
    activeArtifact: null,
    analysisResult: null,
    isAnalyzing: false
};

export const INITIAL_CONTEXT_MENU: ContextMenuState = {
    isOpen: false,
    x: 0,
    y: 0,
    contextType: 'GENERAL',
    targetContent: null
};

export const INITIAL_MARKET_DATA: MarketDataState = {
    lastSync: 0,
    opportunities: [],
    isSyncing: false
};

// =============================================================================
// Dashboard & Process
// =============================================================================

export const INITIAL_DASHBOARD: DashboardState = {
    isGenerating: false,
    identityUrl: null,
    hubViewUrl: null,
    activeManifest: null,
    deploymentProgress: 0,
    activeStepIndex: 0,
    referenceImage: null,
    activeThemeColor: '#18E6FF',
    topologyData: [
        { s: 'LOGIC', A: 92 },
        { s: 'SPEED', A: 88 },
        { s: 'SECURITY', A: 96 },
        { s: 'YIELD', A: 84 },
        { s: 'SCALE', A: 91 }
    ],
    paraFocus: 'NONE',
    isOculusView: false,
    architecturalFidelity: 85
};

export const INITIAL_KNOWLEDGE: KnowledgeState = {
    activeLayers: ['BUILDER_PROTOCOL', 'CRYPTO_CONTEXT', 'STRATEGIC_FUTURISM']
};

export const INITIAL_PROCESS: ProcessState = {
    nodes: [],
    edges: [],
    isLoading: false,
    error: null,
    diagramStatus: 'OK',
    diagramError: null,
    generatedCode: '',
    generatedWorkflow: null,
    runtimeResults: {},
    activeStepIndex: null,
    isSimulating: false,
    activeTab: 'living_map',
    workflowType: 'SYSTEM_ARCHITECTURE',
    livingMapContext: { sources: [] },
    pendingAIAddition: null,
    pendingAction: null,
    governance: 'D-Ecosystem Protocol 2025.Q1',
    coherenceScore: 98,
    codebaseGraph: null
};

// =============================================================================
// Creative Tools
// =============================================================================

export const INITIAL_IMAGE_GEN: ImageGenState = {
    prompt: '',
    isLoading: false,
    error: null,
    generatedImage: null,
    quality: ImageSize.SIZE_1K,
    aspectRatio: AspectRatio.RATIO_16_9,
    characterRefs: [],
    worldRefs: [],
    styleRefs: [],
    activeColorway: null,
    activeStylePreset: 'Cinematic Anamorphic',
    resonanceCurve: Array.from({ length: 10 }, (_, i) => ({ frame: i, tension: 50, dynamics: 50 })),
    productionBible: null,
    frames: [],
    selectedHeroMode: 'NONE',
    videoUrl: null,
    videoPrompt: '',
    videoRes: '1080p',
    videoMotionBias: 50
};

export const INITIAL_CODE_STUDIO: CodeStudioState = {
    prompt: '',
    generatedCode: '',
    language: 'typescript',
    model: 'gemini-2.5-flash',
    isLoading: false,
    error: null,
    activeTab: 'IDE',
    lastEditTimestamp: Date.now(),
    isExecuting: false,
    activePatch: null,
    isEvolving: false,
    activeEvolution: null
};

// =============================================================================
// Hardware & Memory
// =============================================================================

export const INITIAL_HARDWARE: HardwareState = {
    currentEra: 'SILICON',
    activeVendor: 'ALL',
    recommendations: [],
    filters: {
        minPrice: 0,
        maxPrice: 10000000,
        shape: true,
        showOutOfStock: false
    },
    schematicImage: null,
    analysis: null,
    bom: [],
    isLoading: false,
    error: null,
    xrayImage: null,
    searchHistory: [],
    finTelemetry: {
        totalBomCost: 0,
        roiProjection: 0,
        maintenanceEst: 0
    },
    livePrices: {},
    selectedGpuId: null,
    tierFilter: null,
    gpuSearchQuery: '',
    procurement: {
        status: 'idle',
        currentOrder: null,
        quotes: [],
        orderHistory: [],
        isModalOpen: false,
        error: null
    }
};

export const INITIAL_MEMORY: MemorySliceState = {
    driveManifest: null,
    activeCollection: null
};

// =============================================================================
// Research & Discovery
// =============================================================================

export const INITIAL_BIBLIOMORPHIC: BibliomorphicState = {
    activeTab: 'discovery',
    error: null
};

export const INITIAL_DISCOVERY: DiscoveryState = {
    hypotheses: [],
    isLoading: false,
    status: 'IDLE'
};

export const INITIAL_RESEARCH: ResearchState = {
    tasks: []
};

// =============================================================================
// Multi-Agent Systems
// =============================================================================

export const INITIAL_BICAMERAL: BicameralState = {
    goal: '',
    plan: [],
    ledger: [],
    isPlanning: false,
    isSwarming: false,
    swarmStatus: {
        taskId: '',
        votes: {},
        killedAgents: 0,
        currentGap: 0,
        targetGap: 3,
        totalAttempts: 0
    },
    error: null
};

export const INITIAL_AGENTS_STATE: AgentsState = {
    activeAgents: INITIAL_AGENTS_LIST,
    isDispatching: false,
    swarmHealth: 100
};

export const INITIAL_COLLABORATION: CollaborationState = {
    peers: [],
    events: [],
    isOverlayOpen: false
};

export const INITIAL_SYNTHESIS: SynthesisState = {
    incomingProposals: []
};

// =============================================================================
// Complete Initial State (for reference/testing)
// =============================================================================

export const createInitialState = () => ({
    mode: AppMode.METAVENTIONS_HUB,
    previousMode: null,
    isTransitioning: false,
    theme: AppTheme.DARK,
    user: INITIAL_USER,
    authenticated: false,
    isProfileOpen: false,
    isCommandPaletteOpen: false,
    isSidebarOpen: false,
    operationalContext: 'D_ECOSYSTEM_PRODUCTION',
    kernel: INITIAL_KERNEL,
    biometric: INITIAL_BIOMETRIC,
    system: INITIAL_SYSTEM,
    marketData: INITIAL_MARKET_DATA,
    search: INITIAL_SEARCH,
    voice: INITIAL_VOICE,
    voiceNexus: INITIAL_VOICE_NEXUS,
    cpb: INITIAL_CPB,
    visualCortex: INITIAL_VISUAL_CORTEX,
    holo: INITIAL_HOLO,
    dashboard: INITIAL_DASHBOARD,
    knowledge: INITIAL_KNOWLEDGE,
    process: INITIAL_PROCESS,
    imageGen: INITIAL_IMAGE_GEN,
    codeStudio: INITIAL_CODE_STUDIO,
    hardware: INITIAL_HARDWARE,
    memory: INITIAL_MEMORY,
    bibliomorphic: INITIAL_BIBLIOMORPHIC,
    discovery: INITIAL_DISCOVERY,
    research: INITIAL_RESEARCH,
    bicameral: INITIAL_BICAMERAL,
    agents: INITIAL_AGENTS_STATE,
    collaboration: INITIAL_COLLABORATION,
    contextMenu: INITIAL_CONTEXT_MENU,
    synthesis: INITIAL_SYNTHESIS,
    isHelpOpen: false,
    isScrubberOpen: false,
    isDiagnosticsOpen: false,
    isHUDClosed: false,
    focusedSelector: null,
    tasks: [],
    metaventions: INITIAL_METAVENTIONS,
    preferences: INITIAL_PREFERENCES
});
