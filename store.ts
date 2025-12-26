
import { create } from 'zustand';
import { 
    AppMode, AppTheme, UserProfile, FileData, Task, 
    KnowledgeNode, ScienceHypothesis, AtomicTask, 
    SwarmResult, SwarmStatus, SearchResultItem, Message, 
    PeerPresence, SwarmEvent, TaskPriority, TaskStatus, 
    AspectRatio, ImageSize, StoredArtifact, MetaventionsState,
    OperationalContext, AutonomousAgent
} from './types';

interface AppState {
    mode: AppMode;
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
    holo: {
        isOpen: boolean;
        activeArtifact: any | null;
        analysisResult: string | null;
        isAnalyzing: boolean;
    };
    dashboard: {
        isGenerating: boolean;
        identityUrl: string | null;
        referenceImage: FileData | null;
        activeThemeColor: string;
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
        generatedWorkflow: any;
        runtimeResults: Record<number, any>;
        activeStepIndex: number | null;
        isSimulating: boolean;
        workflowType: 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' | 'CONVERGENT_SYNTHESIS';
        livingMapContext: {
            sources: any[];
        };
        pendingAIAddition: any | null;
        pendingAction: string | null;
        governance: string;
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
    isHelpOpen: boolean;
    isScrubberOpen: boolean;
    isDiagnosticsOpen: boolean;
    isHUDClosed: boolean;
    focusedSelector: string | null;
    tasks: Task[];
    metaventions: MetaventionsState;

    setMode: (mode: AppMode) => void;
    setTheme: (theme: AppTheme) => void;
    setUserProfile: (profile: Partial<UserProfile>) => void;
    setAuthenticated: (auth: boolean) => void;
    toggleProfile: (open?: boolean) => void;
    toggleCommandPalette: (open?: boolean) => void;
    addLog: (level: 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO' | 'SYSTEM', message: string) => void;
    toggleTerminal: (open?: boolean) => void;
    setSearchState: (update: any) => void;
    setVoiceState: (update: any) => void;
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
    setAgentState: (update: any) => void;
    updateAgent: (id: string, update: any) => void;
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
    setMetaventionsState: (update: any) => void;
    pushToInvestmentQueue: (metavention: any) => void;
    commitInvestment: (id: string, amount: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
    mode: AppMode.DASHBOARD,
    theme: AppTheme.DARK,
    user: {
        displayName: 'Architect_Core',
        role: 'ARCHITECT',
        clearanceLevel: 5,
        avatar: null
    },
    authenticated: false,
    isProfileOpen: false,
    isCommandPaletteOpen: false,
    operationalContext: 'SYSTEM_STABLE',
    kernel: {
        uptime: 0,
        entropy: 12,
        integrity: 98
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
        history: []
    },
    voice: {
        isActive: false,
        isConnecting: false,
        error: null,
        voiceName: 'Puck',
        transcripts: [],
        partialTranscript: null,
        mentalState: {
            skepticism: 50,
            excitement: 50,
            alignment: 50
        },
        agentAvatars: {}
    },
    holo: {
        isOpen: false,
        activeArtifact: null,
        analysisResult: null,
        isAnalyzing: false
    },
    dashboard: {
        isGenerating: false,
        identityUrl: null,
        referenceImage: null,
        activeThemeColor: '#9d4edd'
    },
    knowledge: {
        activeLayers: ['BUILDER_PROTOCOL', 'CRYPTO_CONTEXT']
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
        workflowType: 'SYSTEM_ARCHITECTURE',
        livingMapContext: {
            sources: []
        },
        pendingAIAddition: null,
        pendingAction: null,
        governance: 'Metaventions Protocol v1',
        coherenceScore: 85
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
        resonanceCurve: Array.from({ length: 10 }, (_, i) => ({ frame: i, tension: 50, dynamics: 50 }))
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
            maxPrice: 5000000,
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
        activeAgents: [
            { id: 'agent-1', name: 'Charon', role: 'Logical Auditor', context: OperationalContext.SYSTEM_MONITORING, status: 'IDLE', memoryBuffer: [], capabilities: ['Scanning', 'Diagnostics', 'Error Filtering'], energyLevel: 94, currentMindset: { skepticism: 90, excitement: 20, alignment: 80 }, tasks: [] },
            { id: 'agent-2', name: 'Puck', role: 'Generative Architect', context: OperationalContext.STRATEGY_SYNTHESIS, status: 'IDLE', memoryBuffer: [], capabilities: ['Synthesis', 'Modeling', 'Visionary Leap'], energyLevel: 88, currentMindset: { skepticism: 10, excitement: 95, alignment: 60 }, tasks: [] },
            { id: 'agent-3', name: 'Fenrir', role: 'Execution Controller', context: OperationalContext.CODE_GENERATION, status: 'IDLE', memoryBuffer: [], capabilities: ['Coding', 'Optimization', 'Security Patching'], energyLevel: 72, currentMindset: { skepticism: 40, excitement: 50, alignment: 90 }, tasks: [] },
            { id: 'agent-4', name: 'Aris', role: 'Data Sentinel', context: OperationalContext.DATA_ANALYSIS, status: 'IDLE', memoryBuffer: [], capabilities: ['Indexing', 'Search', 'Pattern Matching'], energyLevel: 91, currentMindset: { skepticism: 30, excitement: 60, alignment: 85 }, tasks: [] }
        ],
        isDispatching: false
    },
    collaboration: {
        peers: [],
        events: [],
        isOverlayOpen: false
    },
    contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        contextType: 'GENERAL',
        targetContent: null
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
                name: 'DePIN Infrastructure',
                role: 'PHYSICAL_NETWORK',
                leverage: 'Orchestrating decentralized physical infrastructure nodes.',
                status: 'STABLE',
                level: 1,
                metrics: [
                    { label: 'Nodes', value: '1,240', trend: 'up' },
                    { label: 'Uptime', value: '99.98%', trend: 'stable' }
                ]
            },
            {
                id: 'LAYER_AI',
                name: 'Autonomous Intelligence',
                role: 'COGNITIVE_CORE',
                leverage: 'Recursive neural optimization of system parameters.',
                status: 'OPTIMIZED',
                level: 2,
                metrics: [
                    { label: 'Coherence', value: '94.2%', trend: 'up' },
                    { label: 'Latency', value: '4ms', trend: 'down' }
                ]
            }
        ],
        activeLayerId: 'LAYER_DEPIN',
        isAnalyzing: false,
        strategyLog: [],
        strategyLibrary: [],
        wallets: [],
        economicProtocols: []
    },

    setMode: (mode) => set({ mode }),
    setTheme: (theme) => set({ theme }),
    setUserProfile: (profile) => set((state) => ({ user: { ...state.user, ...profile } })),
    setAuthenticated: (authenticated) => set({ authenticated }),
    toggleProfile: (open) => set((state) => ({ isProfileOpen: open ?? !state.isProfileOpen })),
    toggleCommandPalette: (open) => set((state) => ({ isCommandPaletteOpen: open ?? !state.isCommandPaletteOpen })),
    addLog: (level, message) => set((state) => ({
        system: {
            ...state.system,
            logs: [...state.system.logs, { id: crypto.randomUUID(), level, message, timestamp: Date.now() }]
        }
    })),
    toggleTerminal: (open) => set((state) => ({
        system: { ...state.system, isTerminalOpen: open ?? !state.system.isTerminalOpen }
    })),
    setSearchState: (update) => set((state) => ({ 
        search: { ...state.search, ...(typeof update === 'function' ? update(state.search) : update) } 
    })),
    setVoiceState: (update) => set((state) => ({ 
        voice: { ...state.voice, ...(typeof update === 'function' ? update(state.voice) : update) } 
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
    setAgentState: (update) => set((state) => ({ 
        agents: { ...state.agents, ...(typeof update === 'function' ? update(state.agents) : update) } 
    })),
    updateAgent: (id, update) => set((state) => ({
        agents: {
            ...state.agents,
            activeAgents: state.agents.activeAgents.map(a => a.id === id ? { ...a, ...update } : a)
        }
    })),
    setCollabState: (update) => set((state) => ({ 
        collaboration: { ...state.collaboration, ...(typeof update === 'function' ? update(state.collaboration) : update) } 
    })),
    addSwarmEvent: (event) => set((state) => ({
        collaboration: {
            ...state.collaboration,
            events: [{ id: crypto.randomUUID(), timestamp: Date.now(), ...event }, ...state.collaboration.events].slice(0, 20)
        }
    })),
    openContextMenu: (x, y, type, content) => set({ contextMenu: { isOpen: true, x, y, contextType: type, targetContent: content } }),
    closeContextMenu: () => set((state) => ({ contextMenu: { ...state.contextMenu, isOpen: false } })),
    addTask: (task) => set((state) => ({ 
        tasks: [...state.tasks, { id: crypto.randomUUID(), timestamp: Date.now(), subtasks: [], ...task }] 
    })),
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
    setMetaventionsState: (update) => set((state) => ({ 
        metaventions: { ...state.metaventions, ...(typeof update === 'function' ? update(state.metaventions) : update) } 
    })),
    pushToInvestmentQueue: (metavention: any) => set((state) => ({
        marketData: {
            ...state.marketData,
            opportunities: [{
                id: `metavention-${Date.now()}`,
                title: metavention.title,
                yield: `${metavention.viability}%`,
                risk: metavention.riskVector === 'LOW' ? 'LOW' : 'HIGH',
                logic: metavention.logic
            }, ...state.marketData.opportunities].slice(0, 10)
        }
    })),
    commitInvestment: (id, amount) => set((state) => ({
        marketData: {
            ...state.marketData,
            opportunities: state.marketData.opportunities.filter(o => o.id !== id)
        },
        metaventions: {
            ...state.metaventions,
            strategyLog: [...state.metaventions.strategyLog, `Invested $${amount.toLocaleString()} into [${id}]`]
        }
    })),
}));
