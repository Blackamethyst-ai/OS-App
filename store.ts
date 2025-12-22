
import { create } from 'zustand';
import { AppMode, ResearchState, UserProfile, AppTheme, ScienceHypothesis, KnowledgeNode, FileData, ResonancePoint, Colorway, SOVEREIGN_DEFAULT_COLORWAY, MetaventionsState, InterventionProtocol, OperationalContext, AgentWallet, TemporalEra, Task, TaskStatus, AspectRatio, ProtocolStepResult, CustomThemeConfig, AutonomousAgent } from './types';

interface KernelStatus {
    uptime: number;
    entropy: number;
    coreLoad: number;
    activeThreads: number;
    integrity: number;
}

interface AppState {
    mode: AppMode;
    theme: AppTheme;
    customThemeConfig: CustomThemeConfig | null;
    operationalContext: OperationalContext;
    isCommandPaletteOpen: boolean;
    isProfileOpen: boolean;
    isHelpOpen: boolean;
    isScrubberOpen: boolean;
    isDiagnosticsOpen: boolean;
    isHUDClosed: boolean;
    isAuthenticated: boolean;
    user: UserProfile;
    system: any;
    kernel: KernelStatus;
    focusedSelector: string | null;
    agents: {
        activeAgents: AutonomousAgent[];
        dispatchLog: string[];
        isDispatching: boolean;
    };
    process: {
        artifacts: any[];
        chatHistory: any[];
        livingMapContext: { sources: any[] };
        activeLayers: string[];
        isLoading: boolean;
        isSimulating: boolean;
        activeStepIndex: number | null;
        runtimeResults: Record<number, ProtocolStepResult>;
        generatedCode: string | null;
        generatedWorkflow: any | null;
        activeTab: string;
        governance: string;
        workflowType: 'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' | 'CONVERGENT_SYNTHESIS';
        diagramStatus: 'OK' | 'ERROR';
        diagramError: string | null;
        nodes: any[];
        edges: any[];
        pendingAIAddition: any | null;
        pendingAction: string | null;
        audioUrl: string | null;
        audioTranscript: string | null;
        entropyScore: number;
        coherenceScore: number;
        error: string | null;
        vaultInsights: { id: string; type: 'DEDUPE' | 'TAG' | 'BRIDGE' | 'ARCHIVE'; message: string; action: string; targetIds: string[] }[];
        activeStacks: Record<string, string[]>;
    };
    hardware: {
        recommendations: any[];
        bom: any[];
        activeTier: string;
        currentEra: TemporalEra;
        activeVendor: 'ALL' | 'NVIDIA' | 'SUPERMICRO' | 'INTEL' | 'AMD';
        cooling: number;
        conductivity: number;
        componentQuery: string;
        searchHistory: string[];
        filters: { minPrice: number; maxPrice: number; shape: boolean; showOutOfStock: boolean };
        schematicImage: any;
        xrayImage: string | null;
        analysis: any;
        isLoading: boolean;
        error: string | null;
    };
    codeStudio: {
        history: any[];
        prompt: string;
        language: string;
        generatedCode: string;
        suggestions: string[];
        autoSaveEnabled: boolean;
        activeTab: 'IDE' | 'ACTIONS';
        isLoading: boolean;
        isExecuting: boolean;
        executionOutput: string | null;
        error: string | null;
        activePatch: { code: string; explanation: string; timestamp: number } | null;
        activeEvolution: { code: string; reasoning: string; type: 'REFACTOR' | 'MODULARIZE' | 'SECURITY'; integrityScore: number } | null;
        isEvolving: boolean;
        lastEditTimestamp: number;
        model: string;
    };
    bibliomorphic: {
        chatHistory: any[];
        library: any[];
        dna: any;
        activeBook: any;
        activeTab: string;
        error: string | null;
        isIngesting: boolean;
        synapticReadout: { id: string; msg: string; type: 'PERCEPTION' | 'HANDSHAKE' | 'INDEX' }[];
        agentPathways: Record<string, string>; // Agent ID -> Node ID
    };
    voice: {
        transcripts: any[];
        partialTranscript: { role: string; text: string } | null;
        agentAvatars: Record<string, string>;
        voiceName: string;
        isActive: boolean;
        isConnecting: boolean;
        error: string | null;
        mentalState: {
            skepticism: number;
            excitement: number;
            alignment: number;
        };
    };
    bicameral: any;
    research: ResearchState;
    metaventions: MetaventionsState & {
        sensingMatrix: {
            resourceStream: { leverage: number; cap: string; trend: number[] };
            executionStream: { momentum: number; progress: string; trend: number[] };
            environmentStream: { opportunity: number; status: string; trend: number[] };
        };
        activeRefractions: any[];
        stressTest: {
            isTesting: boolean;
            report: any | null;
        };
    };
    discovery: any;
    search: any;
    contextMenu: any;
    holo: any;
    dashboard: any;
    knowledge: {
        activeLayers: string[];
    };
    tasks: Task[];
    imageGen: {
        history: any[];
        prompt: string;
        aspectRatio: AspectRatio;
        characterRefs: FileData[];
        styleRefs: FileData[];
        resonanceCurve: ResonancePoint[];
        isLoading: boolean;
        activeStylePreset: string;
        generatedImage: {
            url: string;
            prompt: string;
            aspectRatio: AspectRatio;
            size: string;
        } | null;
        error: string | null;
        activeColorway: Colorway | null;
    };
    
    setMode: (mode: AppMode) => void;
    setTheme: (theme: AppTheme, config?: CustomThemeConfig) => void;
    setOperationalContext: (ctx: OperationalContext) => void;
    toggleCommandPalette: (isOpen?: boolean) => void;
    toggleProfile: (isOpen?: boolean) => void;
    setHelpOpen: (isOpen: boolean) => void;
    setScrubberOpen: (isOpen: boolean) => void;
    setDiagnosticsOpen: (isOpen: boolean) => void;
    setHUDClosed: (isClosed: boolean) => void;
    setAuthenticated: (val: boolean) => void;
    setUserProfile: (profile: UserProfile) => void;
    setFocusedSelector: (selector: string | null) => void;
    
    setAgentState: (state: Partial<AppState['agents']> | ((prev: AppState['agents']) => Partial<AppState['agents']>)) => void;
    updateAgent: (id: string, updates: Partial<AutonomousAgent>) => void;
    
    setProcessState: (state: Partial<AppState['process']> | ((prev: AppState['process']) => Partial<AppState['process']>)) => void;
    setCodeStudioState: (state: Partial<AppState['codeStudio']> | ((prev: AppState['codeStudio']) => Partial<AppState['codeStudio']>)) => void;
    setHardwareState: (state: Partial<AppState['hardware']> | ((prev: AppState['hardware']) => Partial<AppState['hardware']>)) => void;
    setImageGenState: (state: Partial<AppState['imageGen']> | ((prev: AppState['imageGen']) => Partial<AppState['imageGen']>)) => void;
    setBibliomorphicState: (state: Partial<AppState['bibliomorphic']> | ((prev: AppState['bibliomorphic']) => Partial<AppState['bibliomorphic']>)) => void;
    setDashboardState: (state: any) => void;
    setBicameralState: (state: any) => void;
    setVoiceState: (state: Partial<AppState['voice']> | ((prev: AppState['voice']) => Partial<AppState['voice']>)) => void;
    setSearchState: (state: any) => void;
    setSearchQuery: (query: string) => void;
    setDiscoveryState: (state: any) => void;
    setMetaventionsState: (state: Partial<AppState['metaventions']> | ((prev: AppState['metaventions']) => Partial<AppState['metaventions']>)) => void;
    
    archiveIntervention: (intervention: InterventionProtocol) => void;
    addLog: (level: string, message: string) => void;
    toggleTerminal: (isOpen?: boolean) => void;
    
    addDockItem: (item: any) => void;
    removeDockItem: (id: string) => void;
    
    openHoloProjector: (artifact: any) => void;
    closeHoloProjector: () => void;
    setHoloAnalyzing: (isAnalyzing: boolean) => void;
    setHoloAnalysis: (result: string | null) => void;
    
    openContextMenu: (x: number, y: number, type: string, content: any) => void;
    closeContextMenu: () => void;

    addResearchTask: (task: any) => void;
    updateResearchTask: (id: string, updates: any) => void;
    removeResearchTask: (id: string) => void;
    cancelResearchTask: (id: string) => void;

    toggleKnowledgeLayer: (layerId: string) => void;

    addTask: (task: Omit<Task, 'id' | 'timestamp'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    toggleSubTask: (taskId: string, subTaskId: string) => void;
    updateProcessNode: (id: string, updates: any) => void;
    optimizeLayer: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
    mode: AppMode.DASHBOARD,
    theme: (localStorage.getItem('structura-theme') as AppTheme) || AppTheme.DARK,
    customThemeConfig: null,
    operationalContext: OperationalContext.STRATEGY_SYNTHESIS,
    isCommandPaletteOpen: false,
    isProfileOpen: false,
    isHelpOpen: false,
    isScrubberOpen: false,
    isDiagnosticsOpen: false,
    isHUDClosed: false,
    isAuthenticated: true, 
    user: { displayName: 'Architect', role: 'ARCHITECT', clearanceLevel: 5, avatar: null },
    system: { logs: [], isTerminalOpen: false, dockItems: [] },
    kernel: { uptime: 0, entropy: 12, coreLoad: 24, activeThreads: 8, integrity: 99 },
    focusedSelector: null,
    agents: {
        activeAgents: [
            { id: 'agent-alpha', name: 'Alpha-01', role: 'Logical Synthesis', context: OperationalContext.GENERAL_PURPOSE, status: 'IDLE', memoryBuffer: [], capabilities: ['Reasoning', 'Abstraction'], energyLevel: 100 },
            { id: 'agent-coder', name: 'Code Weaver', role: 'Logic Construction', context: OperationalContext.CODE_GENERATION, status: 'SLEEPING', memoryBuffer: [], capabilities: ['Typescript', 'Vite', 'React'], energyLevel: 85 },
            { id: 'agent-analyst', name: 'Data Sentinel', role: 'Anomaly Detection', context: OperationalContext.DATA_ANALYSIS, status: 'IDLE', memoryBuffer: [], capabilities: ['Statistical Inference', 'Pattern Recognition'], energyLevel: 92 },
            { id: 'agent-overwatch', name: 'System Core', role: 'Health Monitoring', context: OperationalContext.SYSTEM_MONITORING, status: 'ACTIVE', memoryBuffer: ['Kernel initialized.'], capabilities: ['Security', 'Diagnostics'], energyLevel: 100 }
        ],
        dispatchLog: ['Agent Swarm Initialized.'],
        isDispatching: false
    },
    process: { 
        artifacts: [], 
        chatHistory: [], 
        livingMapContext: { sources: [] }, 
        activeLayers: [],
        isLoading: false,
        isSimulating: false,
        activeStepIndex: null,
        runtimeResults: {},
        generatedCode: null,
        generatedWorkflow: null,
        activeTab: 'living_map',
        governance: 'SOVEREIGN_CORE',
        workflowType: 'GENERAL',
        diagramStatus: 'OK',
        diagramError: null,
        nodes: [],
        edges: [],
        pendingAIAddition: null,
        pendingAction: null,
        audioUrl: null,
        audioTranscript: null,
        entropyScore: 0,
        coherenceScore: 85,
        error: null,
        vaultInsights: [],
        activeStacks: {}
    },
    imageGen: { 
        history: [], 
        prompt: '', 
        aspectRatio: AspectRatio.RATIO_16_9, 
        characterRefs: [], 
        styleRefs: [], 
        resonanceCurve: [], 
        isLoading: false, 
        activeStylePreset: 'CINEMATIC_REALISM',
        generatedImage: null,
        error: null,
        activeColorway: null
    },
    hardware: { 
        recommendations: [], 
        bom: [], 
        activeTier: 'TIER_1', 
        currentEra: TemporalEra.SILICON,
        activeVendor: 'ALL',
        cooling: 1.0, 
        conductivity: 0.05, 
        componentQuery: '', 
        searchHistory: [],
        filters: { minPrice: 0, maxPrice: 5000000, shape: true, showOutOfStock: true },
        schematicImage: null,
        xrayImage: null,
        analysis: null,
        isLoading: false,
        error: null
    },
    codeStudio: { 
        history: [], 
        prompt: '', 
        language: 'typescript', 
        generatedCode: '', 
        suggestions: [], 
        autoSaveEnabled: false, 
        activeTab: 'IDE',
        isLoading: false,
        isExecuting: false,
        executionOutput: null,
        error: null,
        activePatch: null,
        activeEvolution: null,
        isEvolving: false,
        lastEditTimestamp: 0,
        model: 'gemini-3-pro-preview'
    },
    bibliomorphic: { chatHistory: [], library: [], dna: null, activeBook: null, activeTab: 'discovery', error: null, isIngesting: false, synapticReadout: [], agentPathways: {} },
    voice: { transcripts: [], partialTranscript: null, agentAvatars: {}, voiceName: 'Puck', isActive: false, isConnecting: false, error: null, mentalState: { skepticism: 50, excitement: 50, alignment: 50 } },
    bicameral: { plan: [], ledger: [], swarmStatus: { votes: {}, killedAgents: 0 }, goal: '' },
    research: { tasks: [] },
    metaventions: {
        layers: [
            { id: 'depin', name: 'DePIN', role: 'Infrastructure', leverage: 'Ownership of the pipes', status: 'SYNCING', level: 1, metrics: [{ label: 'Global Nodes', value: '12.4k', trend: 'up' }, { label: 'CapEx Bypass', value: '$4.2M', trend: 'up' }] },
            { id: 'physical_ai', name: 'Physical AI', role: 'Navigation', leverage: 'Mastery of the real', status: 'INITIALIZED', level: 1, metrics: [{ label: 'Spatial Lock', value: '99.98%', trend: 'stable' }, { label: 'Inference Latency', value: '4ms', trend: 'down' }] },
            { id: 'digital_twins', name: 'Digital Twins', role: 'Simulation', leverage: 'Mastery of the environment', status: 'INITIALIZED', level: 1, metrics: [{ label: 'Drift Coherence', value: '0.004%', trend: 'down' }, { label: 'Sync Rate', value: '1:1', trend: 'stable' }] },
            { id: 'agentic_finance', name: 'Agentic Finance', role: 'Autonomy', leverage: 'Bypassing legacy banks', status: 'INITIALIZED', level: 1, metrics: [{ label: 'Autonomous AUM', value: 'Ξ 420.5', trend: 'up' }, { label: 'Wallet Count', value: '18', trend: 'up' }] },
            { id: 'zero_trust', name: 'Zero-Trust', role: 'Security', leverage: 'Silicon-level cryptography', status: 'OPTIMIZED', level: 1, metrics: [{ label: 'Enclave Integrity', value: '100%', trend: 'stable' }, { label: 'Entropy Suppression', value: '98%', trend: 'up' }] },
            { id: 'deai', name: 'Decentralized AI', role: 'Intelligence', leverage: 'Distributed training & verification', status: 'OPTIMIZING', level: 1, metrics: [{ label: 'Training Nodes', value: '4.8k', trend: 'up' }, { label: 'Verification rate', value: '99.2%', trend: 'stable' }] },
        ],
        activeLayerId: 'depin',
        isAnalyzing: false,
        strategyLog: [],
        strategyLibrary: [],
        wallets: [],
        economicProtocols: [],
        sensingMatrix: {
            resourceStream: { leverage: 84, cap: '$1.2M', trend: [30, 45, 42, 50, 65, 84] },
            executionStream: { momentum: 92, progress: 'WEAVER v1', trend: [10, 25, 40, 60, 85, 92] },
            environmentStream: { opportunity: 76, status: 'WINDSOR_HUB', trend: [50, 55, 52, 60, 70, 76] }
        }
    },
    discovery: { hypotheses: [], theory: null, isLoading: false, status: 'IDLE' },
    search: { history: [], results: [], query: '', isOpen: false, isSearching: false },
    contextMenu: { isOpen: false, x: 0, y: 0, contextType: 'GENERAL', targetContent: null },
    holo: { isOpen: false, activeArtifact: null, isAnalyzing: false, analysisResult: null },
    dashboard: { isGenerating: false, identityUrl: null, referenceImage: null },
    knowledge: { activeLayers: ['BUILDER_PROTOCOL', 'CRYPTO_CONTEXT'] },
    tasks: [],

    setMode: (mode) => set({ mode }),
    setTheme: (theme, config) => { 
        localStorage.setItem('structura-theme', theme); 
        set({ theme, customThemeConfig: config || null }); 
    },
    setOperationalContext: (operationalContext) => set({ operationalContext }),
    toggleCommandPalette: (isOpen) => set((state) => ({ isCommandPaletteOpen: isOpen ?? !state.isCommandPaletteOpen })),
    toggleProfile: (isOpen) => set((state) => ({ isProfileOpen: isOpen ?? !state.isProfileOpen })),
    setHelpOpen: (isHelpOpen) => set({ isHelpOpen }),
    setScrubberOpen: (isHelpOpen) => set({ isScrubberOpen: isHelpOpen }),
    setDiagnosticsOpen: (isHelpOpen) => set({ isDiagnosticsOpen: isHelpOpen }),
    setHUDClosed: (isHUDClosed) => set({ isHUDClosed }),
    setAuthenticated: (val) => { localStorage.setItem('auth-status', String(val)); set({ isAuthenticated: val }); },
    setUserProfile: (profile: UserProfile) => set({ user: profile }),
    setFocusedSelector: (selector) => set({ focusedSelector: selector }),

    setAgentState: (update) => set((state) => ({ agents: { ...state.agents, ...(typeof update === 'function' ? update(state.agents) : update) } })),
    updateAgent: (id, updates) => set((state) => ({ 
        agents: { 
            ...state.agents, 
            activeAgents: state.agents.activeAgents.map(a => a.id === id ? { ...a, ...updates } : a) 
        } 
    })),

    setProcessState: (update) => set((state) => ({ process: { ...state.process, ...(typeof update === 'function' ? update(state.process) : update) } })),
    setCodeStudioState: (update) => set((state) => ({ codeStudio: { ...state.codeStudio, ...(typeof update === 'function' ? update(state.codeStudio) : update) } })),
    setHardwareState: (update) => set((state) => ({ hardware: { ...state.hardware, ...(typeof update === 'function' ? update(state.hardware) : update) } })),
    setImageGenState: (update) => set((state) => ({ imageGen: { ...state.imageGen, ...(typeof update === 'function' ? update(state.imageGen) : update) } })),
    setBibliomorphicState: (update) => set((state) => ({ bibliomorphic: { ...state.bibliomorphic, ...(typeof update === 'function' ? update(state.bibliomorphic) : update) } })),
    setDashboardState: (update) => set((state) => ({ dashboard: { ...state.dashboard || {}, ...update } })),
    setBicameralState: (update) => set((state) => ({ bicameral: { ...state.bicameral, ...(typeof update === 'function' ? update(state.bicameral) : update) } })),
    setVoiceState: (update) => set((state) => ({ voice: { ...state.voice, ...(typeof update === 'function' ? update(state.voice) : update) } })),
    setSearchState: (update) => set((state) => ({ search: { ...state.search, ...(typeof update === 'function' ? update(state.search) : update) } })),
    setSearchQuery: (query: string) => set((state) => ({ search: { ...state.search, query } })),
    setDiscoveryState: (update) => set((state) => ({ discovery: { ...state.discovery, ...(typeof update === 'function' ? update(state.discovery) : update) } })),
    setMetaventionsState: (update) => set((state) => ({ metaventions: { ...state.metaventions, ...(typeof update === 'function' ? update(state.metaventions) : update) } })),
    
    archiveIntervention: (intervention) => set((state) => ({ 
        metaventions: { ...state.metaventions, strategyLibrary: [intervention, ...state.metaventions.strategyLibrary].slice(0, 50) }
    })),

    addLog: (level, message) => set((state) => ({ 
        system: { ...state.system, logs: [...state.system.logs, { id: Date.now(), timestamp: Date.now(), level, message }].slice(-100) } 
    })),
    toggleTerminal: (isOpen) => set((state) => ({ system: { ...state.system, isTerminalOpen: isOpen ?? !state.system.isTerminalOpen } })),
    addDockItem: (item) => set((state) => ({ system: { ...state.system, dockItems: [...state.system.dockItems, item] } })),
    removeDockItem: (id) => set((state) => ({ system: { ...state.system, dockItems: state.system.dockItems.filter((i: any) => i.id !== id) } })),
    openHoloProjector: (artifact) => set({ holo: { isOpen: true, activeArtifact: artifact, isAnalyzing: false, analysisResult: null } }),
    closeHoloProjector: () => set({ holo: { isOpen: false, activeArtifact: null, isAnalyzing: false, analysisResult: null } }),
    setHoloAnalyzing: (isAnalyzing) => set((state) => ({ holo: { ...state.holo, isAnalyzing } })),
    setHoloAnalysis: (result) => set((state) => ({ holo: { ...state.holo, analysisResult: result } })),
    openContextMenu: (x, y, type, content) => set({ contextMenu: { isOpen: true, x, y, contextType: type, targetContent: content } }),
    closeContextMenu: () => set({ contextMenu: { isOpen: false } }),
    addResearchTask: (task) => set((state) => ({ research: { ...state.research, tasks: [task, ...state.research.tasks] } })),
    updateResearchTask: (id, updates) => set((state) => ({ research: { ...state.research, tasks: state.research.tasks.map(t => t.id === id ? { ...t, ...updates } : t) } })),
    removeResearchTask: (id) => set((state) => ({ research: { ...state.research, tasks: state.research.tasks.filter(t => t.id !== id) } })),
    cancelResearchTask: (id) => set((state) => ({ research: { ...state.research, tasks: state.research.tasks.map(t => t.id === id ? { ...t, status: 'CANCELLED', progress: 0, logs: [...t.logs, '⛔ Cancelled'] } : t) } })),
    toggleKnowledgeLayer: (layerId) => set((state) => {
        const current = state.knowledge.activeLayers || [];
        const isActive = current.includes(layerId);
        return { knowledge: { ...state.knowledge, activeLayers: isActive ? current.filter((id: string) => id !== layerId) : [...current, layerId] } };
    }),
    addTask: (task) => set((state) => ({ tasks: [{ ...task, id: crypto.randomUUID(), timestamp: Date.now() }, ...state.tasks] })),
    updateTask: (id, updates) => set((state) => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t) })),
    deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),
    toggleSubTask: (taskId, subTaskId) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? {
            ...t,
            subtasks: t.subtasks.map(s => s.id === subTaskId ? { ...s, completed: !s.completed } : s)
        } : t)
    })),
    updateProcessNode: (id, updates) => set((state) => ({
        process: {
            ...state.process,
            nodes: state.process.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)
        }
    })),
    optimizeLayer: (id) => set((state) => ({
        metaventions: {
            ...state.metaventions,
            layers: state.metaventions.layers.map(l => l.id === id ? { ...l, status: 'OPTIMIZED' } : l)
        }
    })),
}));
