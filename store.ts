import { create } from 'zustand';
import { AppMode, ResearchState, UserProfile, AppTheme, ScienceHypothesis, KnowledgeNode, FileData, ResonancePoint, Colorway, SOVEREIGN_DEFAULT_COLORWAY, MetaventionsState, InterventionProtocol, OperationalContext, AgentWallet, TemporalEra, Task, TaskStatus, AspectRatio } from './types';

interface AppState {
    mode: AppMode;
    theme: AppTheme;
    operationalContext: OperationalContext;
    isCommandPaletteOpen: boolean;
    isProfileOpen: boolean;
    isAuthenticated: boolean;
    user: UserProfile;
    system: any;
    process: {
        artifacts: any[];
        chatHistory: any[];
        livingMapContext: { sources: any[] };
        activeLayers: string[];
        isLoading: boolean;
        generatedCode: string | null;
        generatedWorkflow: any | null;
        activeTab: string;
        governance: string;
        workflowType: 'GENERAL' | 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE';
        diagramStatus: 'OK' | 'ERROR';
        diagramError: string | null;
        // FIX: Added missing properties for process slice used in components and hooks
        nodes: any[];
        edges: any[];
        pendingAIAddition: any | null;
        pendingAction: string | null;
        audioUrl: string | null;
        audioTranscript: string | null;
        entropyScore: number;
        error: string | null;
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
        filters: { minPrice: number; maxPrice: number; showOutOfStock: boolean };
        schematicImage: any;
        xrayImage: string | null;
        analysis: any;
        isLoading: boolean;
        error: string | null;
    };
    codeStudio: any;
    bibliomorphic: any;
    voice: any;
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
    // FIX: Added missing imageGen slice to AppState interface
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
    setTheme: (theme: AppTheme) => void;
    setOperationalContext: (ctx: OperationalContext) => void;
    toggleCommandPalette: (isOpen?: boolean) => void;
    toggleProfile: (isOpen?: boolean) => void;
    setAuthenticated: (val: boolean) => void;
    setUserProfile: (profile: UserProfile) => void;
    
    setProcessState: (state: Partial<AppState['process']> | ((prev: AppState['process']) => Partial<AppState['process']>)) => void;
    setCodeStudioState: (state: any) => void;
    setHardwareState: (state: Partial<AppState['hardware']> | ((prev: AppState['hardware']) => Partial<AppState['hardware']>)) => void;
    // FIX: Typed setImageGenState correctly to fix 'imageGen' property not existing on AppState errors
    setImageGenState: (state: Partial<AppState['imageGen']> | ((prev: AppState['imageGen']) => Partial<AppState['imageGen']>)) => void;
    setBibliomorphicState: (state: any) => void;
    setDashboardState: (state: any) => void;
    setBicameralState: (state: any) => void;
    setVoiceState: (state: any) => void;
    setSearchState: (state: any) => void;
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

    // Task Management Actions
    addTask: (task: Omit<Task, 'id' | 'timestamp'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
    mode: AppMode.DASHBOARD,
    theme: (localStorage.getItem('structura-theme') as AppTheme) || AppTheme.DARK,
    operationalContext: OperationalContext.STRATEGY_SYNTHESIS,
    isCommandPaletteOpen: false,
    isProfileOpen: false,
    isAuthenticated: true, 
    user: { displayName: 'Architect', role: 'ARCHITECT', clearanceLevel: 5, avatar: null },
    system: { logs: [], isTerminalOpen: false, dockItems: [] },
    process: { 
        artifacts: [], 
        chatHistory: [], 
        livingMapContext: { sources: [] }, 
        activeLayers: [],
        isLoading: false,
        generatedCode: null,
        generatedWorkflow: null,
        activeTab: 'living_map',
        governance: 'SOVEREIGN_CORE',
        workflowType: 'GENERAL',
        diagramStatus: 'OK',
        diagramError: null,
        // FIX: Initialized missing properties for process slice to resolve property-not-found errors in components/hooks
        nodes: [],
        edges: [],
        pendingAIAddition: null,
        pendingAction: null,
        audioUrl: null,
        audioTranscript: null,
        entropyScore: 0,
        error: null
    },
    // FIX: Initialized imageGen with default values used throughout the application
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
        recommendations: [
            { id: '1', partNumber: 'NVIDIA GB300 NVL72', manufacturer: 'NVIDIA', specs: { type: 'Rack Solution', compute: 'Blackwell' }, isInStock: true, price: 3500000 },
            { id: '2', partNumber: 'NVIDIA B300 GPU', manufacturer: 'NVIDIA', specs: { type: 'GPU', memory: '192GB HBM3e' }, isInStock: true, price: 42000 },
            { id: '3', partNumber: 'SYS-821GV-TNR', manufacturer: 'SUPERMICRO', specs: { type: 'Server', socket: 'LGA-4677' }, isInStock: true, price: 18500 },
            { id: '4', partNumber: 'NVIDIA Grace CPU', manufacturer: 'NVIDIA', specs: { type: 'CPU', cores: '144' }, isInStock: true, price: 12000 },
            { id: '5', partNumber: 'Xeon Platinum 8480+', manufacturer: 'INTEL', specs: { type: 'CPU', cache: '105MB' }, isInStock: true, price: 9500 },
            { id: '6', partNumber: 'EPYC 9654', manufacturer: 'AMD', specs: { type: 'CPU', cores: '96' }, isInStock: false, price: 11800 },
        ], 
        bom: [], 
        activeTier: 'TIER_1', 
        currentEra: TemporalEra.SILICON,
        activeVendor: 'ALL',
        cooling: 1.0, 
        conductivity: 0.05, 
        componentQuery: '', 
        searchHistory: ['nvidia gb200', 'supermicro h13', 'quantum interconnect'],
        filters: { minPrice: 0, maxPrice: 5000000, showOutOfStock: true },
        schematicImage: null,
        xrayImage: null,
        analysis: null,
        isLoading: false,
        error: null
    },
    codeStudio: { history: [], prompt: '', language: 'typescript', generatedCode: '', suggestions: [], autoSaveEnabled: false },
    bibliomorphic: { chatHistory: [], library: [], dna: null, activeBook: null, activeTab: 'discovery' },
    voice: { transcripts: [], agentAvatars: {}, voiceName: 'Puck', isActive: false, isConnecting: false },
    bicameral: { plan: [], ledger: [], swarmStatus: { votes: {}, killedAgents: 0 }, goal: '' },
    research: { tasks: [] },
    metaventions: {
        layers: [
            { id: 'depin', name: 'DePIN', role: 'Infrastructure', leverage: 'Ownership of the pipes', status: 'SYNCING', level: 1, metrics: [{ label: 'Global Nodes', value: '12.4k', trend: 'up' }, { label: 'CapEx Bypass', value: '$4.2M', trend: 'up' }] },
            { id: 'physical_ai', name: 'Physical AI', role: 'Navigation', leverage: 'Mastery of the real', status: 'INITIALIZED', level: 1, metrics: [{ label: 'Spatial Lock', value: '99.98%', trend: 'stable' }, { label: 'Inference Latency', value: '4ms', trend: 'down' }] },
            { id: 'digital_twins', name: 'Digital Twins', role: 'Simulation', leverage: 'Real-time environment mirror', status: 'INITIALIZED', level: 1, metrics: [{ label: 'Drift Coherence', value: '0.004%', trend: 'down' }, { label: 'Sync Rate', value: '1:1', trend: 'stable' }] },
            { id: 'agentic_finance', name: 'Agentic Finance', role: 'Autonomy', leverage: 'Bypassing legacy banks', status: 'INITIALIZED', level: 1, metrics: [{ label: 'Autonomous AUM', value: 'Ξ 420.5', trend: 'up' }, { label: 'Wallet Count', value: '18', trend: 'up' }] },
            { id: 'zero_trust', name: 'Zero-Trust', role: 'Security', leverage: 'Silicon-level cryptography', status: 'OPTIMIZED', level: 1, metrics: [{ label: 'Enclave Integrity', value: '100%', trend: 'stable' }, { label: 'Entropy Suppression', value: '98%', trend: 'up' }] },
            { id: 'deai', name: 'Decentralized AI', role: 'Intelligence', leverage: 'Distributed training & verification', status: 'OPTIMIZING', level: 1, metrics: [{ label: 'Training Nodes', value: '4.8k', trend: 'up' }, { label: 'Verification rate', value: '99.2%', trend: 'stable' }] },
        ],
        activeLayerId: 'depin',
        isAnalyzing: false,
        strategyLog: [{ id: '1', timestamp: Date.now(), message: 'Metaventions Stack L1 initialized. Recursive Context Layer linked.', type: 'SYSTEM' as any }],
        strategyLibrary: [],
        recursiveFeedback: null,
        sensingMatrix: {
            resourceStream: { leverage: 84, cap: '$1.2M', trend: [30, 45, 42, 50, 65, 84] },
            executionStream: { momentum: 92, progress: 'WEAVER v1', trend: [10, 25, 40, 60, 85, 92] },
            environmentStream: { opportunity: 76, status: 'WINDSOR_HUB', trend: [50, 55, 52, 60, 70, 76] }
        },
        activeRefractions: [],
        stressTest: { isTesting: false, report: null },
        wallets: [
            { 
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', balance: 'Ξ 342.1', currency: 'ETH', lastActive: Date.now(), txCount: 1542,
                assets: [ { label: 'ETH', value: 342.1 }, { label: 'USDC', value: 12450 }, { label: 'DOGE', value: 890200 }, { label: 'QUBIC', value: 45000000 } ]
            },
            { 
                address: '0x8b5cf6d8b5cf6d8b5cf6d8b5cf6d8b5cf6d8b5cf', balance: 'Ξ 78.4', currency: 'ETH', lastActive: Date.now(), txCount: 423,
                assets: [ { label: 'ETH', value: 78.4 }, { label: 'USDT', value: 3200 }, { label: 'SOL', value: 125 } ]
            }
        ],
        economicProtocols: []
    },
    discovery: { hypotheses: [], theory: null, isLoading: false, status: 'IDLE' },
    search: { history: [], results: [], query: '', isOpen: false, isSearching: false },
    contextMenu: { isOpen: false, x: 0, y: 0, contextType: 'GENERAL', targetContent: null },
    holo: { isOpen: false, activeArtifact: null, isAnalyzing: false, analysisResult: null },
    dashboard: { isGenerating: false, identityUrl: null, referenceImage: null },
    knowledge: { activeLayers: ['BUILDER_PROTOCOL', 'CRYPTO_CONTEXT'] },
    tasks: [],

    setMode: (mode) => set({ mode }),
    setTheme: (theme) => { localStorage.setItem('structura-theme', theme); set({ theme }); },
    setOperationalContext: (operationalContext) => set({ operationalContext }),
    toggleCommandPalette: (isOpen) => set((state) => ({ isCommandPaletteOpen: isOpen ?? !state.isCommandPaletteOpen })),
    toggleProfile: (isOpen) => set((state) => ({ isProfileOpen: isOpen ?? !state.isProfileOpen })),
    setAuthenticated: (val) => { localStorage.setItem('auth-status', String(val)); set({ isAuthenticated: val }); },
    setUserProfile: (profile: UserProfile) => set({ user: profile }),

    setProcessState: (update) => set((state) => ({ process: { ...state.process, ...(typeof update === 'function' ? update(state.process) : update) } })),
    setCodeStudioState: (update) => set((state) => ({ codeStudio: { ...state.codeStudio, ...(typeof update === 'function' ? update(state.codeStudio) : update) } })),
    setHardwareState: (update) => set((state) => ({ hardware: { ...state.hardware, ...(typeof update === 'function' ? update(state.hardware) : update) } })),
    // FIX: Correctly implemented setImageGenState to handle partial updates or functional updates
    setImageGenState: (update) => set((state) => ({ imageGen: { ...state.imageGen, ...(typeof update === 'function' ? update(state.imageGen) : update) } })),
    setBibliomorphicState: (update) => set((state) => ({ bibliomorphic: { ...state.bibliomorphic, ...(typeof update === 'function' ? update(state.bibliomorphic) : update) } })),
    setDashboardState: (update) => set((state) => ({ dashboard: { ...state.dashboard || {}, ...update } })),
    setBicameralState: (update) => set((state) => ({ bicameral: { ...state.bicameral, ...(typeof update === 'function' ? update(state.bicameral) : update) } })),
    setVoiceState: (update) => set((state) => ({ voice: { ...state.voice, ...(typeof update === 'function' ? update(state.voice) : update) } })),
    setSearchState: (update) => set((state) => ({ search: { ...state.search, ...(typeof update === 'function' ? update(state.search) : update) } })),
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

    addTask: (task) => set((state) => ({
        tasks: [{ ...task, id: crypto.randomUUID(), timestamp: Date.now() }, ...state.tasks]
    })),
    updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    })),
    deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
    })),
}));
