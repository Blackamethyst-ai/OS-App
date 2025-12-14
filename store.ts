
import { create } from 'zustand';
import { 
    AppMode, 
    ProcessState, 
    ImageGenState, 
    DashboardState, 
    HardwareState, 
    BibliomorphicState,
    VoiceState,
    CodeStudioState,
    GlobalSearchState,
    SystemState,
    HoloState,
    ContextMenuState,
    BicameralState,
    ResearchState,
    ImageSize,
    AspectRatio,
    DockItem,
    LogEntry
} from './types';

interface AppState {
    mode: AppMode;
    setMode: (mode: AppMode) => void;
    
    // Command Palette
    isCommandPaletteOpen: boolean;
    toggleCommandPalette: (isOpen?: boolean) => void;

    // Slices
    process: ProcessState;
    setProcessState: (update: Partial<ProcessState> | ((prev: ProcessState) => Partial<ProcessState>)) => void;

    imageGen: ImageGenState;
    setImageGenState: (update: Partial<ImageGenState> | ((prev: ImageGenState) => Partial<ImageGenState>)) => void;

    dashboard: DashboardState;
    setDashboardState: (update: Partial<DashboardState> | ((prev: DashboardState) => Partial<DashboardState>)) => void;

    hardware: HardwareState;
    setHardwareState: (update: Partial<HardwareState> | ((prev: HardwareState) => Partial<HardwareState>)) => void;

    bibliomorphic: BibliomorphicState;
    setBibliomorphicState: (update: Partial<BibliomorphicState> | ((prev: BibliomorphicState) => Partial<BibliomorphicState>)) => void;

    voice: VoiceState;
    setVoiceState: (update: Partial<VoiceState> | ((prev: VoiceState) => Partial<VoiceState>)) => void;

    codeStudio: CodeStudioState;
    setCodeStudioState: (update: Partial<CodeStudioState> | ((prev: CodeStudioState) => Partial<CodeStudioState>)) => void;

    search: GlobalSearchState;
    setSearchState: (update: Partial<GlobalSearchState> | ((prev: GlobalSearchState) => Partial<GlobalSearchState>)) => void;

    bicameral: BicameralState;
    setBicameralState: (update: Partial<BicameralState> | ((prev: BicameralState) => Partial<BicameralState>)) => void;

    research: ResearchState;
    updateResearchTask: (id: string, update: Partial<any>) => void;
    addResearchTask: (task: any) => void;
    removeResearchTask: (id: string) => void;

    system: SystemState;
    addLog: (level: LogEntry['level'], message: string) => void;
    toggleTerminal: (isOpen?: boolean) => void;
    addDockItem: (item: DockItem) => void;
    removeDockItem: (id: string) => void;

    holo: HoloState;
    openHoloProjector: (artifact: HoloState['activeArtifact']) => void;
    closeHoloProjector: () => void;
    setHoloAnalysis: (result: string | null) => void;
    setHoloAnalyzing: (isAnalyzing: boolean) => void;

    contextMenu: ContextMenuState;
    openContextMenu: (x: number, y: number, type: ContextMenuState['contextType'], content: any) => void;
    closeContextMenu: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    mode: AppMode.DASHBOARD,
    setMode: (mode) => set({ mode }),

    isCommandPaletteOpen: false,
    toggleCommandPalette: (isOpen) => set((state) => ({ isCommandPaletteOpen: isOpen ?? !state.isCommandPaletteOpen })),

    process: {
        prompt: '',
        governance: {
            targetSystem: 'Sovereign OS',
            constraintLevel: 'Standard',
            outputTopology: 'Network',
            additionalDirectives: ''
        },
        artifacts: [],
        isLoading: false,
        generatedCode: '',
        chatHistory: [],
        audioUrl: null,
        audioTranscript: null,
        error: null,
        autopoieticFramework: null,
        generatedWorkflow: null,
        entropyScore: 0,
        activeTab: 'living_map',
        architectMode: 'BLUEPRINT',
        swarm: {
            isActive: false,
            agents: []
        }
    },
    setProcessState: (update) => set((state) => ({
        process: { ...state.process, ...(typeof update === 'function' ? update(state.process) : update) }
    })),

    imageGen: {
        prompt: '',
        aspectRatio: AspectRatio.RATIO_16_9,
        size: ImageSize.SIZE_1K,
        referenceImage: null,
        generatedImage: null,
        isLoading: false,
        error: null
    },
    setImageGenState: (update) => set((state) => ({
        imageGen: { ...state.imageGen, ...(typeof update === 'function' ? update(state.imageGen) : update) }
    })),

    dashboard: {
        identityUrl: null,
        referenceImage: null,
        isGenerating: false
    },
    setDashboardState: (update) => set((state) => ({
        dashboard: { ...state.dashboard, ...(typeof update === 'function' ? update(state.dashboard) : update) }
    })),

    hardware: {
        schematicImage: null,
        analysis: null,
        componentQuery: '',
        recommendations: [],
        isLoading: false,
        error: null
    },
    setHardwareState: (update) => set((state) => ({
        hardware: { ...state.hardware, ...(typeof update === 'function' ? update(state.hardware) : update) }
    })),

    bibliomorphic: {
        dna: null,
        activeBook: null,
        library: [],
        chatHistory: [],
        isLoading: false,
        error: null
    },
    setBibliomorphicState: (update) => set((state) => ({
        bibliomorphic: { ...state.bibliomorphic, ...(typeof update === 'function' ? update(state.bibliomorphic) : update) }
    })),

    voice: {
        isActive: false,
        isConnecting: false,
        voiceName: 'Puck',
        volume: 0,
        transcripts: [],
        error: null
    },
    setVoiceState: (update) => set((state) => ({
        voice: { ...state.voice, ...(typeof update === 'function' ? update(state.voice) : update) }
    })),

    codeStudio: {
        prompt: '',
        generatedCode: null,
        language: 'typescript',
        model: 'gemini-2.5-flash',
        isLoading: false,
        isExecuting: false,
        executionOutput: null,
        error: null,
        history: []
    },
    setCodeStudioState: (update) => set((state) => ({
        codeStudio: { ...state.codeStudio, ...(typeof update === 'function' ? update(state.codeStudio) : update) }
    })),

    search: {
        query: '',
        results: [],
        history: [],
        isSearching: false,
        isOpen: false
    },
    setSearchState: (update) => set((state) => ({
        search: { ...state.search, ...(typeof update === 'function' ? update(state.search) : update) }
    })),

    bicameral: {
        goal: '',
        plan: [],
        ledger: [],
        isPlanning: false,
        isSwarming: false,
        error: null,
        swarmStatus: {
            taskId: '',
            votes: {},
            killedAgents: 0,
            currentGap: 0,
            targetGap: 0,
            totalAttempts: 0
        }
    },
    setBicameralState: (update) => set((state) => ({
        bicameral: { ...state.bicameral, ...(typeof update === 'function' ? update(state.bicameral) : update) }
    })),

    research: {
        tasks: []
    },
    addResearchTask: (task) => set((state) => ({
        research: { tasks: [...state.research.tasks, task] }
    })),
    updateResearchTask: (id, update) => set((state) => ({
        research: { 
            tasks: state.research.tasks.map(t => t.id === id ? { ...t, ...update } : t) 
        }
    })),
    removeResearchTask: (id) => set((state) => ({
        research: { tasks: state.research.tasks.filter(t => t.id !== id) }
    })),

    system: {
        logs: [],
        isTerminalOpen: false,
        dockItems: []
    },
    addLog: (level, message) => set((state) => ({
        system: {
            ...state.system,
            logs: [...state.system.logs, { id: crypto.randomUUID(), level, message, timestamp: new Date().toLocaleTimeString() }]
        }
    })),
    toggleTerminal: (isOpen) => set((state) => ({
        system: { ...state.system, isTerminalOpen: isOpen ?? !state.system.isTerminalOpen }
    })),
    addDockItem: (item) => set((state) => ({
        system: { ...state.system, dockItems: [...state.system.dockItems, item] }
    })),
    removeDockItem: (id) => set((state) => ({
        system: { ...state.system, dockItems: state.system.dockItems.filter(i => i.id !== id) }
    })),

    holo: {
        isOpen: false,
        activeArtifact: null,
        analysisResult: null,
        isAnalyzing: false
    },
    openHoloProjector: (artifact) => set({
        holo: { isOpen: true, activeArtifact: artifact, analysisResult: null, isAnalyzing: false }
    }),
    closeHoloProjector: () => set((state) => ({
        holo: { ...state.holo, isOpen: false, activeArtifact: null }
    })),
    setHoloAnalysis: (result) => set((state) => ({
        holo: { ...state.holo, analysisResult: result }
    })),
    setHoloAnalyzing: (isAnalyzing) => set((state) => ({
        holo: { ...state.holo, isAnalyzing }
    })),

    contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        contextType: 'GENERAL',
        targetContent: null
    },
    openContextMenu: (x, y, type, content) => set({
        contextMenu: { isOpen: true, x, y, contextType: type, targetContent: content }
    }),
    closeContextMenu: () => set((state) => ({
        contextMenu: { ...state.contextMenu, isOpen: false }
    }))
}));
