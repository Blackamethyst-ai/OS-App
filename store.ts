import { create } from 'zustand';
import { 
    AppMode, AppTheme, UserProfile, FileData, Task, 
    KnowledgeNode, ScienceHypothesis, AtomicTask, 
    SwarmResult, SwarmStatus, SearchResultItem, Message, 
    PeerPresence, SwarmEvent, TaskPriority, TaskStatus, 
    AspectRatio, ImageSize, StoredArtifact, MetaventionsState,
    OperationalContext, AutonomousAgent, Frame, ProductionBible,
    TechnicalManifest, SwarmProposal
} from './types';
import { neuralVault } from './services/persistenceService';

const INITIAL_AGENTS: AutonomousAgent[] = [
    {
        id: 'puck',
        name: 'Puck',
        role: 'Implementation Architect',
        context: OperationalContext.STRATEGY_SYNTHESIS,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['system_navigate', 'search_intel', 'architect_generate_process', 'propose_structural_change'],
        currentMindset: { skepticism: 10, excitement: 95, alignment: 75 },
        energyLevel: 100,
        tasks: []
    },
    {
        id: 'charon',
        name: 'Charon',
        role: 'Audit Sentinel',
        context: OperationalContext.SYSTEM_MONITORING,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['search_intel', 'update_task_priority', 'propose_structural_change'],
        currentMindset: { skepticism: 95, excitement: 15, alignment: 90 },
        energyLevel: 100,
        tasks: []
    },
    {
        id: 'fenrir',
        name: 'Fenrir',
        role: 'Execution Lead',
        context: OperationalContext.CODE_GENERATION,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['search_intel', 'architect_generate_process', 'propose_structural_change'],
        currentMindset: { skepticism: 35, excitement: 65, alignment: 85 },
        energyLevel: 100,
        tasks: []
    }
];

interface AppState {
    mode: AppMode;
    previousMode: AppMode | null;
    isTransitioning: boolean;
    isSidebarHUDOpen: boolean;
    theme: AppTheme;
    user: UserProfile;
    authenticated: boolean;
    isProfileOpen: boolean;
    isCommandPaletteOpen: boolean;
    operationalContext: string;
    kernel: {
        uptime: number;
        entropy: number;
        integrity: number;
    };
    system: {
        isTerminalOpen: boolean;
        logs: any[];
        dockItems: any[];
    };
    marketData: {
        lastSync: number;
        opportunities: { id: string; title: string; yield: string; risk: string; logic: string }[];
        isSyncing: boolean;
    };
    search: {
        isOpen: boolean;
        isSearching: boolean;
        query: string;
        results: SearchResultItem[];
        history: string[];
        filter: 'ALL' | 'COMMANDS' | 'MEMORY' | 'WORLD';
    };
    voice: {
        isActive: boolean;
        isConnecting: boolean;
        error: string | null;
        voiceName: string;
        transcripts: any[];
        partialTranscript: any | null;
        mentalState: {
            skepticism: number;
            excitement: number;
            alignment: number;
        };
        agentAvatars: Record<string, string>;
    };
    visualCortex: {
        isAnalyzing: boolean;
        isProbing: boolean;
        lastResult: any | null;
        dropActive: boolean;
    };
    holo: {
        isOpen: boolean;
        activeArtifact: any | null;
        analysisResult: string | null;
        isAnalyzing: boolean;
    };
    dashboard: {
        isGenerating: boolean;
        identityUrl: null | string;
        hubViewUrl: null | string;
        activeManifest: TechnicalManifest | null;
        deploymentProgress: number;
        activeStepIndex: number;
        referenceImage: FileData | null;
        activeThemeColor: string;
        topologyData: { s: string; A: number }[];
        paraFocus: 'PROJECTS' | 'AREAS' | 'RESOURCES' | 'ARCHIVES' | 'NONE';
        isOculusView: boolean;
        architecturalFidelity: number;
    };
    knowledge: {
        activeLayers: string[];
    };
    process: {
        nodes: any[];
        edges: any[];
        isLoading: boolean;
        error: string | null;
        diagramStatus: string;
        diagramError: string | null;
        generatedCode: string;
        generatedWorkflow: TechnicalManifest | null;
        runtimeResults: Record<number, any>;
        activeStepIndex: number | null;
        isSimulating: boolean;
        activeTab: string;
        workflowType: 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' | 'CONVERGENT_SYNTHESIS';
        livingMapContext: {
            sources: any[];
        };
        pendingAIAddition: any | null;
        pendingAction: string | null;
        governance: 'D-Ecosystem Protocol 2025.Q1';
        coherenceScore: number;
    };
    imageGen: {
        prompt: string;
        isLoading: boolean;
        error: string | null;
        generatedImage: { url: string; prompt: string; aspectRatio: string; size: string } | null;
        quality: ImageSize;
        aspectRatio: AspectRatio;
        characterRefs: FileData[];
        worldRefs: FileData[];
        styleRefs: FileData[];
        activeColorway: any;
        activeStylePreset: string;
        resonanceCurve: { frame: number; tension: number; dynamics: number }[];
        productionBible: null | ProductionBible;
        frames: Frame[];
        selectedHeroMode: 'NONE' | 'HERO' | 'RISING' | 'CHAOS' | 'STEADY';
        videoUrl: string | null;
        videoPrompt: string;
        videoRes: '720p' | '1080p';
        videoMotionBias: number;
    };
    codeStudio: {
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
    };
    hardware: {
        currentEra: string;
        activeVendor: string;
        recommendations: any[];
        componentQuery: string;
        filters: {
            minPrice: number;
            maxPrice: number;
            shape: boolean;
            showOutOfStock: boolean;
        };
        schematicImage: FileData | null;
        analysis: any | null;
        bom: any[];
        isLoading: boolean;
        error: string | null;
        xrayImage: string | null;
        searchHistory: string[];
        activeTier: string;
        finTelemetry: {
            totalBomCost: number;
            roiProjection: number;
            maintenanceEst: number;
        };
    };
    memory: {
        driveManifest: any | null;
        activeCollection: string | null;
    };
    bibliomorphic: {
        activeTab: string;
        error: string | null;
    };
    discovery: {
        hypotheses: ScienceHypothesis[];
        isLoading: boolean;
        status: string;
    };
    research: {
        tasks: any[];
    };
    bicameral: {
        goal: string;
        plan: AtomicTask[];
        ledger: SwarmResult[];
        isPlanning: boolean;
        isSwarming: boolean;
        swarmStatus: SwarmStatus;
        error: string | null;
    };
    agents: {
        activeAgents: AutonomousAgent[];
        isDispatching: boolean;
        swarmHealth: number;
    };
    collaboration: {
        peers: PeerPresence[];
        events: SwarmEvent[];
        isOverlayOpen: boolean;
    };
    contextMenu: {
        isOpen: boolean;
        x: number;
        y: number;
        contextType: string;
        targetContent: any;
    };
    synthesis: {
        incomingProposals: SwarmProposal[];
    };
    isHelpOpen: boolean;
    isScrubberOpen: boolean;
    isDiagnosticsOpen: boolean;
    isHUDClosed: boolean;
    focusedSelector: string | null;
    tasks: Task[];
    metaventions: MetaventionsState;

    actions: {
        setMode: (mode: AppMode) => void;
        setTheme: (theme: AppTheme) => void;
        setUserProfile: (profile: Partial<UserProfile>) => void;
        setAuthenticated: (auth: boolean) => void;
        toggleProfile: (open?: boolean) => void;
        toggleCommandPalette: (open?: boolean) => void;
        toggleSidebarHUD: (open?: boolean) => void;
        addLog: (level: 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO' | 'SYSTEM', message: string) => void;
        toggleTerminal: (open?: boolean) => void;
        setSearchState: (update: any) => void;
        setVoiceState: (update: any) => void;
        setVisualCortexState: (update: any) => void;
        openHoloProjector: (artifact: any) => void;
        closeHoloProjector: () => void;
        setHoloAnalysis: (result: string | null) => void;
        setHoloAnalyzing: (busy: boolean) => void;
        setDashboardState: (update: any) => void;
        toggleKnowledgeLayer: (id: string) => void;
        optimizeLayer: (id: string) => void;
        setProcessState: (update: any) => void;
        updateProcessNode: (id: string, update: any) => void;
        setImageGenState: (update: any) => void;
        setCodeStudioState: (update: any) => void;
        setHardwareState: (update: any) => void;
        setMemoryState: (update: any) => void;
        setBibliomorphicState: (update: any) => void;
        setDiscoveryState: (update: any) => void;
        addResearchTask: (task: any) => void;
        updateResearchTask: (id: string, update: any) => void;
        removeResearchTask: (id: string) => void;
        cancelResearchTask: (id: string) => void;
        setBicameralState: (update: any) => void;
        setCollabState: (update: any) => void;
        addSwarmEvent: (event: any) => void;
        openContextMenu: (x: number, y: number, type: string, content: any) => void;
        closeContextMenu: () => void;
        addTask: (task: any) => void;
        updateTask: (id: string, update: any) => void;
        deleteTask: (id: string) => void;
        toggleSubTask: (taskId: string, subTaskId: string) => void;
        setHelpOpen: (open: boolean) => void;
        setScrubberOpen: (open: boolean) => void;
        setDiagnosticsOpen: (open: boolean) => void;
        setHUDClosed: (closed: boolean) => void;
        setFocusedSelector: (selector: string | null) => void;
        addDockItem: (item: any) => void;
        removeDockItem: (id: string) => void;
        archiveIntervention: (protocol: any) => void;
        removeStrategy: (id: string) => void;
        setMetaventionsState: (update: any) => void;
        pushToInvestmentQueue: (metavention: any) => void;
        commitInvestment: (id: string, amount: number) => void;
        setAgentState: (update: any) => void;
        updateAgent: (id: string, update: Partial<AutonomousAgent>) => void;
        addAgent: (agent: AutonomousAgent) => void;
        hydrateAgents: () => Promise<void>;
        deployStrategyToLattice: (strategy: TechnicalManifest) => void;
        addSwarmProposal: (proposal: SwarmProposal) => void;
        dismissProposal: (id: string) => void;
    };
}

export const useAppStore = create<AppState>((set, get) => ({
    mode: AppMode.METAVENTIONS_HUB,
    previousMode: null,
    isTransitioning: false,
    isSidebarHUDOpen: false,
    theme: AppTheme.DARK,
    user: {
        displayName: 'Operator_Core',
        role: 'ARCHITECT',
        clearanceLevel: 5,
        avatar: null
    },
    authenticated: true,
    isProfileOpen: false,
    isCommandPaletteOpen: false,
    operationalContext: 'D_ECOSYSTEM_PRODUCTION',
    kernel: {
        uptime: 0,
        entropy: 5,
        integrity: 99
    },
    system: {
        isTerminalOpen: false,
        logs: [],
        dockItems: []
    },
    marketData: {
        lastSync: 0,
        opportunities: [],
        isSyncing: false
    },
    search: {
        isOpen: false,
        isSearching: false,
        query: '',
        results: [],
        history: [],
        filter: 'ALL'
    },
    voice: {
        isActive: false,
        isConnecting: false,
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
    },
    visualCortex: {
        isAnalyzing: false,
        isProbing: false,
        lastResult: null,
        dropActive: false
    },
    holo: {
        isOpen: false,
        activeArtifact: null,
        analysisResult: null,
        isAnalyzing: false,
    },
    dashboard: {
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
    },
    knowledge: {
        activeLayers: ['BUILDER_PROTOCOL', 'CRYPTO_CONTEXT', 'STRATEGIC_FUTURISM']
    },
    process: {
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
        livingMapContext: {
            sources: []
        },
        pendingAIAddition: null,
        pendingAction: null,
        governance: 'D-Ecosystem Protocol 2025.Q1',
        coherenceScore: 98
    },
    imageGen: {
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
    },
    codeStudio: {
        prompt: '',
        generatedCode: '',
        language: 'typescript',
        model: 'gemini-3-pro-preview',
        isLoading: false,
        error: null,
        activeTab: 'IDE',
        lastEditTimestamp: Date.now(),
        isExecuting: false,
        activePatch: null,
        isEvolving: false,
        activeEvolution: null
    },
    hardware: {
        currentEra: 'SILICON',
        activeVendor: 'ALL',
        recommendations: [],
        componentQuery: '',
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
        activeTier: 'PRO',
        finTelemetry: {
            totalBomCost: 0,
            roiProjection: 0,
            maintenanceEst: 0
        }
    },
    memory: {
        driveManifest: null,
        activeCollection: null
    },
    bibliomorphic: {
        activeTab: 'discovery',
        error: null
    },
    discovery: {
        hypotheses: [],
        isLoading: false,
        status: 'IDLE'
    },
    research: {
        tasks: []
    },
    bicameral: {
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
    },
    agents: {
        activeAgents: INITIAL_AGENTS,
        isDispatching: false,
        swarmHealth: 100
    },
    collaboration: {
        peers: [],
        events: [],
        isOverlayOpen: false
    },
    contextMenu: {
        isOpen: false,
        x: 0, y: 0,
        contextType: 'GENERAL',
        targetContent: null
    },
    synthesis: {
        incomingProposals: []
    },
    isHelpOpen: false,
    isScrubberOpen: false,
    isDiagnosticsOpen: false,
    isHUDClosed: false,
    focusedSelector: null,
    tasks: [],
    metaventions: {
        layers: [
            {
                id: 'LAYER_DEPIN',
                name: 'Physical Infrastructure',
                role: 'PHYSICAL_NETWORK',
                leverage: 'Orchestrating production-grade D-Infrastructure nodes.',
                status: 'STABLE',
                level: 1,
                metrics: [
                    { label: 'Units', value: '1,420', trend: 'up' },
                    { label: 'Uptime', value: '99.99%', trend: 'stable' }
                ]
            },
            {
                id: 'LAYER_AI',
                name: 'Strategic Intelligence',
                role: 'COGNITIVE_CORE',
                leverage: 'Recursive neural implementation of meta inventions.',
                status: 'OPTIMIZED',
                level: 2,
                metrics: [
                    { label: 'Coherence', value: '98.4%', trend: 'up' },
                    { label: 'Latency', value: '3ms', trend: 'down' }
                ]
            }
        ],
        activeLayerId: 'LAYER_DEPIN',
        isAnalyzing: false,
        strategyLog: [],
        strategyLibrary: [
            { id: 'PARA_DRIVE_SYSTEM', title: 'PARA+ Drive Architecture', context: 'D-System File Management', logic: 'Recursive multi-modal indexing with adaptive TTL for Projects and Areas.', physicalImpact: '40% reduction in data retrieval latency.', timestamp: Date.now() },
            { id: 'PARA_NAMING_CONVENTION', title: 'PARA Naming Protocol', context: 'Drive Organization', logic: 'Date-stamped project identifiers with [P] [A] [R] [A] prefixes for zero-ambiguity indexing.', physicalImpact: 'Instant semantic recall across all storage nodes.', timestamp: Date.now() }
        ],
        wallets: [],
        economicProtocols: []
    },

    actions: {
        setMode: (mode) => set((state) => ({ 
            previousMode: state.mode, 
            mode, 
            isTransitioning: true 
        })),
        setTheme: (theme) => set({ theme }),
        setUserProfile: (profile) => set((state) => ({ user: { ...state.user, ...profile } })),
        setAuthenticated: (authenticated) => set({ authenticated }),
        toggleProfile: (open) => set((state) => ({ isProfileOpen: open ?? !state.isProfileOpen })),
        toggleCommandPalette: (open) => set((state) => ({ isCommandPaletteOpen: open ?? !state.isCommandPaletteOpen })),
        toggleSidebarHUD: (open) => set((state) => ({ isSidebarHUDOpen: open ?? !state.isSidebarHUDOpen })),
        addLog: (level, message) => set((state) => {
            const id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            return {
                system: {
                    ...state.system,
                    logs: [...state.system.logs, { id, level, message, timestamp: Date.now() }]
                }
            };
        }),
        toggleTerminal: (open) => set((state) => ({
            system: { ...state.system, isTerminalOpen: open ?? !state.system.isTerminalOpen }
        })),
        setSearchState: (update) => set((state) => ({ 
            search: { ...state.search, ...(typeof update === 'function' ? update(state.search) : update) } 
        })),
        setVoiceState: (update) => set((state) => ({ 
            voice: { ...state.voice, ...(typeof update === 'function' ? update(state.voice) : update) } 
        })),
        setVisualCortexState: (update) => set((state) => ({ 
            visualCortex: { ...state.visualCortex, ...(typeof update === 'function' ? update(state.visualCortex) : update) } 
        })),
        openHoloProjector: (artifact) => set({ holo: { isOpen: true, activeArtifact: artifact, analysisResult: null, isAnalyzing: false } }),
        closeHoloProjector: () => set((state) => ({ holo: { ...state.holo, isOpen: false, activeArtifact: null } })),
        setHoloAnalysis: (result) => set((state) => ({ holo: { ...state.holo, analysisResult: result } })),
        setHoloAnalyzing: (busy) => set((state) => ({ holo: { ...state.holo, isAnalyzing: busy } })),
        setDashboardState: (update) => set((state) => ({ 
            dashboard: { ...state.dashboard, ...(typeof update === 'function' ? update(state.dashboard) : update) } 
        })),
        toggleKnowledgeLayer: (id) => set((state) => {
            const active = state.knowledge.activeLayers.includes(id)
                ? state.knowledge.activeLayers.filter(l => l !== id)
                : [...state.knowledge.activeLayers, id];
            return { knowledge: { activeLayers: active } };
        }),
        optimizeLayer: (id) => set((state) => ({
            knowledge: { activeLayers: [...state.knowledge.activeLayers, id] }
        })),
        setProcessState: (update) => set((state) => ({ 
            process: { ...state.process, ...(typeof update === 'function' ? update(state.process) : update) } 
        })),
        updateProcessNode: (id, update) => set((state) => ({
            process: {
                ...state.process,
                nodes: state.process.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...update } } : n)
            }
        })),
        setImageGenState: (update) => set((state) => ({ 
            imageGen: { ...state.imageGen, ...(typeof update === 'function' ? update(state.imageGen) : update) } 
        })),
        setCodeStudioState: (update) => set((state) => ({ 
            codeStudio: { ...state.codeStudio, ...(typeof update === 'function' ? update(state.codeStudio) : update) } 
        })),
        setHardwareState: (update) => set((state) => ({ 
            hardware: { ...state.hardware, ...(typeof update === 'function' ? update(state.hardware) : update) } 
        })),
        setMemoryState: (update) => set((state) => ({ 
            memory: { ...state.memory, ...(typeof update === 'function' ? update(state.memory) : update) } 
        })),
        setBibliomorphicState: (update) => set((state) => ({ 
            bibliomorphic: { ...state.bibliomorphic, ...(typeof update === 'function' ? update(state.bibliomorphic) : update) } 
        })),
        setDiscoveryState: (update) => set((state) => ({ 
            discovery: { ...state.discovery, ...(typeof update === 'function' ? update(state.discovery) : update) } 
        })),
        addResearchTask: (task) => set((state) => ({ 
            research: { ...state.research, tasks: [...state.research.tasks, task] } 
        })),
        updateResearchTask: (id, update) => set((state) => ({
            research: {
                ...state.research,
                tasks: state.research.tasks.map(t => t.id === id ? { ...t, ...update } : t)
            }
        })),
        removeResearchTask: (id) => set((state) => ({
            research: { ...state.research, tasks: state.research.tasks.filter(t => t.id !== id) }
        })),
        cancelResearchTask: (id) => set((state) => ({
            research: {
                ...state.research,
                tasks: state.research.tasks.map(t => t.id === id ? { ...t, status: 'CANCELLED' } : t)
            }
        })),
        setBicameralState: (update) => set((state) => ({ 
            bicameral: { ...state.bicameral, ...(typeof update === 'function' ? update(state.bicameral) : update) } 
        })),
        setCollabState: (update) => set((state) => ({ 
            collaboration: { ...state.collaboration, ...(typeof update === 'function' ? update(state.collaboration) : update) } 
        })),
        addSwarmEvent: (event) => set((state) => {
            const id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            return {
                collaboration: {
                    ...state.collaboration,
                    events: [{ id, timestamp: Date.now(), ...event }, ...state.collaboration.events].slice(0, 20)
                }
            };
        }),
        openContextMenu: (x, y, type, content) => set({ contextMenu: { isOpen: true, x, y, contextType: type, targetContent: content } }),
        closeContextMenu: () => set((state) => ({ contextMenu: { ...state.contextMenu, isOpen: false } })),
        addTask: (task) => set((state) => {
            const id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            return { 
                tasks: [...state.tasks, { id, timestamp: Date.now(), subtasks: [], ...task }] 
            };
        }),
        updateTask: (id, update) => set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, ...update } : t)
        })),
        deleteTask: (id) => set((state) => ({
            tasks: state.tasks.filter(t => t.id !== id)
        })),
        toggleSubTask: (taskId, subTaskId) => set((state) => ({
            tasks: state.tasks.map(t => t.id === taskId ? {
                ...t,
                subtasks: t.subtasks.map(s => s.id === subTaskId ? { ...s, completed: !s.completed } : s)
            } : t)
        })),
        setHelpOpen: (isHelpOpen) => set({ isHelpOpen }),
        setScrubberOpen: (isScrubberOpen) => set({ isScrubberOpen }),
        setDiagnosticsOpen: (isDiagnosticsOpen) => set({ isDiagnosticsOpen }),
        setHUDClosed: (isHUDClosed) => set({ isHUDClosed }),
        setFocusedSelector: (focusedSelector) => set({ focusedSelector }),
        addDockItem: (item) => set((state) => ({
            system: { ...state.system, dockItems: [...state.system.dockItems, item].slice(-10) }
        })),
        removeDockItem: (id) => set((state) => ({
            system: { ...state.system, dockItems: state.system.dockItems.filter(i => i.id !== id) }
        })),
        archiveIntervention: (protocol) => set((state) => ({
            metaventions: { ...state.metaventions, strategyLibrary: [protocol, ...state.metaventions.strategyLibrary] }
        })),
        removeStrategy: (id) => set((state) => ({
            metaventions: { ...state.metaventions, strategyLibrary: state.metaventions.strategyLibrary.filter(s => s.id !== id) }
        })),
        setMetaventionsState: (update) => set((state) => ({ 
            metaventions: { ...state.metaventions, ...(typeof update === 'function' ? update(state.metaventions) : update) } 
        })),
        pushToInvestmentQueue: (metavention: any) => set((state) => ({
            marketData: {
                ...state.marketData,
                opportunities: [{
                    id: `implement-${Date.now()}`,
                    title: metavention.title,
                    yield: `${metavention.viability}%`,
                    risk: metavention.riskVector === 'LOW' ? 'LOW' : 'HIGH',
                    logic: metavention.logic
                }, ...state.marketData.opportunities].slice(0, 10)
            }
        })),
        commitInvestment: (id, amount) => set((state) => {
            const { metaventions: mv } = state;
            return {
                marketData: { ...state.marketData, opportunities: state.marketData.opportunities.filter(o => o.id !== id) },
                metaventions: { ...mv, strategyLog: [...(mv?.strategyLog || []), `Allocated $${amount.toLocaleString()} to [${id}]`] }
            };
        }),
        setAgentState: (update) => set((state) => ({ 
            agents: { ...state.agents, ...(typeof update === 'function' ? update(state.agents) : update) } 
        })),
        updateAgent: (id, update) => set((state) => {
            const updatedAgents = state.agents.activeAgents.map(a => a.id === id ? { ...a, ...update } : a);
            const targetAgent = updatedAgents.find(a => a.id === id);
            if (targetAgent) {
                neuralVault.saveAgent(targetAgent); 
            }
            return { agents: { ...state.agents, activeAgents: updatedAgents } };
        }),
        addAgent: (agent) => set((state) => {
            const next = [...state.agents.activeAgents, agent];
            neuralVault.saveAgent(agent);
            return { agents: { ...state.agents, activeAgents: next } };
        }),
        hydrateAgents: async () => {
            const saved = await neuralVault.getAgents();
            if (saved.length > 0) {
                set((state) => ({ agents: { ...state.agents, activeAgents: saved } }));
            }
        },
        deployStrategyToLattice: (strategy: TechnicalManifest) => set((state) => {
            const centerX = 500;
            const centerY = 400;
            const radius = 250;
            
            // Create a root node for the strategy
            const rootNode = {
                id: `node-strat-root-${Date.now()}`,
                type: 'holographic',
                position: { x: centerX, y: centerY - 300 },
                data: { 
                    label: strategy.title.toUpperCase(), 
                    subtext: strategy.type, 
                    iconName: 'ShieldCheck', 
                    color: '#10b981', 
                    status: 'DEPLOYED', 
                    drift: 0 
                }
            };

            // Map protocols to sequential nodes in a loop
            const protocolNodes = (strategy.protocols || []).map((p, i) => {
                const angle = (i / strategy.protocols.length) * Math.PI * 2;
                return {
                    id: `node-strat-p-${i}-${Date.now()}`,
                    type: 'holographic',
                    position: { 
                        x: centerX + Math.cos(angle) * radius, 
                        y: centerY + Math.sin(angle) * radius 
                    },
                    data: { 
                        label: p.instruction.substring(0, 20) + '...', 
                        subtext: p.role, 
                        iconName: 'Target', 
                        color: '#9d4edd', 
                        status: 'INITIALIZED', 
                        drift: 0 
                    }
                };
            });

            // Create edges connecting the root to all nodes
            const edges = protocolNodes.map(node => ({
                id: `edge-${rootNode.id}-${node.id}`,
                source: rootNode.id,
                target: node.id,
                type: 'cinematic',
                data: { color: '#9d4edd', variant: 'stream' }
            }));

            // Chain protocol nodes sequentially too
            for (let i = 0; i < protocolNodes.length; i++) {
                const nextIdx = (i + 1) % protocolNodes.length;
                edges.push({
                    id: `edge-chain-${i}-${nextIdx}-${Date.now()}`,
                    source: protocolNodes[i].id,
                    target: protocolNodes[nextIdx].id,
                    type: 'cinematic',
                    data: { color: '#22d3ee', variant: 'pulse' }
                });
            }

            return { 
                process: { 
                    ...state.process, 
                    nodes: [...state.process.nodes, rootNode, ...protocolNodes],
                    edges: [...state.process.edges, ...edges]
                }, 
                mode: AppMode.PROCESS_MAP 
            };
        }),
        addSwarmProposal: (proposal) => set((state) => ({
            synthesis: { ...state.synthesis, incomingProposals: [proposal, ...state.synthesis.incomingProposals].slice(0, 5) }
        })),
        dismissProposal: (id) => set((state) => ({
            synthesis: { ...state.synthesis, incomingProposals: state.synthesis.incomingProposals.filter(p => p.id !== id) }
        })),
    }
}));