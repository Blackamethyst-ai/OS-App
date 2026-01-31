import { create } from 'zustand';
import {
    AppMode, AppTheme, UserProfile, Task,
    MetaventionsState, AutonomousAgent, TechnicalManifest,
    SwarmProposal, AppPreferences, BiometricState, UIComplexityLevel,
    // Slice types
    KernelState, SystemState, VoiceState, VoiceNexusState,
    CPBState, VisualCortexState, HoloState, SearchState,
    MarketDataState, ContextMenuState, DashboardState, ProcessState,
    ImageGenState, CodeStudioState, HardwareState, MemorySliceState,
    BibliomorphicState, DiscoveryState, ResearchState, BicameralState,
    AgentsState, CollaborationState, SynthesisState, KnowledgeState,
    // Action types
    SliceUpdater, HoloArtifact, ProcessNodeUpdateParams, TaskParams,
    TaskUpdateParams, ResearchTaskParams, ResearchTaskUpdateParams,
    SwarmEventParams, DockItemParams
} from './types';
import { neuralVault } from './services/persistenceService';
import { INITIAL_AGENTS } from './data/initialAgents';
import { INITIAL_METAVENTIONS } from './data/initialMetaventions';
import {
    INITIAL_USER, INITIAL_PREFERENCES, INITIAL_KERNEL, INITIAL_BIOMETRIC,
    INITIAL_SYSTEM, INITIAL_VOICE, INITIAL_VOICE_NEXUS, INITIAL_CPB,
    INITIAL_VISUAL_CORTEX, INITIAL_SEARCH, INITIAL_HOLO, INITIAL_CONTEXT_MENU,
    INITIAL_MARKET_DATA, INITIAL_DASHBOARD, INITIAL_KNOWLEDGE, INITIAL_PROCESS,
    INITIAL_IMAGE_GEN, INITIAL_CODE_STUDIO, INITIAL_HARDWARE, INITIAL_MEMORY,
    INITIAL_BIBLIOMORPHIC, INITIAL_DISCOVERY, INITIAL_RESEARCH, INITIAL_BICAMERAL,
    INITIAL_AGENTS_STATE, INITIAL_COLLABORATION, INITIAL_SYNTHESIS
} from './data/initialState';

interface AppState {
    mode: AppMode;
    previousMode: AppMode | null;
    isTransitioning: boolean;
    theme: AppTheme;
    user: UserProfile;
    authenticated: boolean;
    isProfileOpen: boolean;
    isCommandPaletteOpen: boolean;
    isSidebarOpen: boolean;
    operationalContext: string;
    kernel: KernelState;
    biometric: BiometricState;
    system: SystemState;
    marketData: MarketDataState;
    search: SearchState;
    voice: VoiceState;
    voiceNexus: VoiceNexusState;
    cpb: CPBState;
    visualCortex: VisualCortexState;
    holo: HoloState;
    dashboard: DashboardState;
    knowledge: KnowledgeState;
    process: ProcessState;
    imageGen: ImageGenState;
    codeStudio: CodeStudioState;
    hardware: HardwareState;
    memory: MemorySliceState;
    bibliomorphic: BibliomorphicState;
    discovery: DiscoveryState;
    research: ResearchState;
    bicameral: BicameralState;
    agents: AgentsState;
    collaboration: CollaborationState;
    contextMenu: ContextMenuState;
    synthesis: SynthesisState;
    isHelpOpen: boolean;
    isScrubberOpen: boolean;
    isDiagnosticsOpen: boolean;
    isHUDClosed: boolean;
    focusedSelector: string | null;
    tasks: Task[];
    metaventions: MetaventionsState;
    preferences: AppPreferences;

    actions: {
        setMode: (mode: AppMode) => void;
        setPreferences: (prefs: Partial<AppPreferences>) => void;
        setTheme: (theme: AppTheme) => void;
        setUserProfile: (profile: Partial<UserProfile>) => void;
        setAuthenticated: (auth: boolean) => void;
        toggleProfile: (open?: boolean) => void;
        toggleCommandPalette: (open?: boolean) => void;
        setSidebarOpen: (open: boolean) => void;
        addLog: (level: 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO' | 'SYSTEM', message: string) => void;
        toggleTerminal: (open?: boolean) => void;
        // Typed slice setters
        setSearchState: (update: SliceUpdater<SearchState>) => void;
        setVoiceState: (update: SliceUpdater<VoiceState>) => void;
        setVoiceNexusState: (update: SliceUpdater<VoiceNexusState>) => void;
        setCPBState: (update: SliceUpdater<CPBState>) => void;
        setVisualCortexState: (update: SliceUpdater<VisualCortexState>) => void;
        openHoloProjector: (artifact: HoloArtifact) => void;
        closeHoloProjector: () => void;
        setHoloAnalysis: (result: string | null) => void;
        setHoloAnalyzing: (busy: boolean) => void;
        setDashboardState: (update: SliceUpdater<DashboardState>) => void;
        toggleKnowledgeLayer: (id: string) => void;
        optimizeLayer: (id: string) => void;
        setProcessState: (update: SliceUpdater<ProcessState>) => void;
        updateProcessNode: (id: string, update: ProcessNodeUpdateParams) => void;
        setImageGenState: (update: SliceUpdater<ImageGenState>) => void;
        setCodeStudioState: (update: SliceUpdater<CodeStudioState>) => void;
        setHardwareState: (update: SliceUpdater<HardwareState>) => void;
        setMemoryState: (update: SliceUpdater<MemorySliceState>) => void;
        setBibliomorphicState: (update: SliceUpdater<BibliomorphicState>) => void;
        setDiscoveryState: (update: SliceUpdater<DiscoveryState>) => void;
        addResearchTask: (task: ResearchTaskParams) => void;
        updateResearchTask: (id: string, update: ResearchTaskUpdateParams) => void;
        removeResearchTask: (id: string) => void;
        cancelResearchTask: (id: string) => void;
        setBicameralState: (update: SliceUpdater<BicameralState>) => void;
        setCollabState: (update: SliceUpdater<CollaborationState>) => void;
        addSwarmEvent: (event: SwarmEventParams) => void;
        openContextMenu: (x: number, y: number, type: string, content: string | Record<string, unknown> | null) => void;
        closeContextMenu: () => void;
        addTask: (task: TaskParams) => void;
        updateTask: (id: string, update: TaskUpdateParams) => void;
        deleteTask: (id: string) => void;
        toggleSubTask: (taskId: string, subTaskId: string) => void;
        setHelpOpen: (open: boolean) => void;
        setScrubberOpen: (open: boolean) => void;
        setDiagnosticsOpen: (open: boolean) => void;
        setHUDClosed: (closed: boolean) => void;
        setFocusedSelector: (selector: string | null) => void;
        addDockItem: (item: DockItemParams) => void;
        removeDockItem: (id: string) => void;
        archiveIntervention: (protocol: TechnicalManifest) => void;
        removeStrategy: (id: string) => void;
        setMetaventionsState: (update: SliceUpdater<MetaventionsState>) => void;
        pushToInvestmentQueue: (metavention: { title: string; viability: number; riskVector: string; logic: string }) => void;
        commitInvestment: (id: string, amount: number) => void;
        setAgentState: (update: SliceUpdater<AgentsState>) => void;
        updateAgent: (id: string, update: Partial<AutonomousAgent>) => void;
        addAgent: (agent: AutonomousAgent) => void;
        hydrateAgents: () => Promise<void>;
        deployStrategyToLattice: (strategy: TechnicalManifest) => void;
        addSwarmProposal: (proposal: SwarmProposal) => void;
        dismissProposal: (id: string) => void;
        // Kernel & Biometric actions
        setKernelState: (update: Partial<KernelState>) => void;
        setBiometricState: (update: Partial<BiometricState>) => void;
        setUIComplexity: (level: UIComplexityLevel) => void;
    };
}

export const useAppStore = create<AppState>((set, get) => ({
    // Core state
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

    // Domain slices (imported from data/initialState.ts)
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

    // UI flags
    isHelpOpen: false,
    isScrubberOpen: false,
    isDiagnosticsOpen: false,
    isHUDClosed: false,
    focusedSelector: null,
    tasks: [],
    metaventions: INITIAL_METAVENTIONS,
    preferences: INITIAL_PREFERENCES,

    actions: {
        setMode: (mode) => set((state) => ({
            previousMode: state.mode,
            mode,
            isTransitioning: true
        })),
        setPreferences: (update) => set((state) => ({
            preferences: { ...state.preferences, ...update }
        })),
        setTheme: (theme) => set({ theme }),
        setUserProfile: (profile) => set((state) => ({ user: { ...state.user, ...profile } })),
        setAuthenticated: (authenticated) => set({ authenticated }),
        toggleProfile: (open) => set((state) => ({ isProfileOpen: open ?? !state.isProfileOpen })),
        toggleCommandPalette: (open) => set((state) => ({ isCommandPaletteOpen: open ?? !state.isCommandPaletteOpen })),
        setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
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
        setVoiceNexusState: (update) => set((state) => ({
            voiceNexus: { ...state.voiceNexus, ...(typeof update === 'function' ? update(state.voiceNexus) : update) }
        })),
        setCPBState: (update) => set((state) => ({
            cpb: { ...state.cpb, ...(typeof update === 'function' ? update(state.cpb) : update) }
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
                nodes: state.process.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...update } } : n)
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
        pushToInvestmentQueue: (metavention: { title: string; viability: number; riskVector: string; logic: string }) => set((state) => ({
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
        hydrateAgents: () => neuralVault.getAgents().then(saved => {
            if (saved.length > 0) {
                set((state) => ({ agents: { ...state.agents, activeAgents: saved } }));
            }
        }),
        deployStrategyToLattice: (strategy: TechnicalManifest) => set((state) => {
            const centerX = 500;
            const centerY = 400;
            const radius = 250;
            const rootNode = {
                id: `node-strat-root-${Date.now()}`,
                type: 'holographic',
                position: { x: centerX, y: centerY - 300 },
                data: { label: strategy.title.toUpperCase(), subtext: strategy.type, iconName: 'ShieldCheck', color: '#10b981', status: 'DEPLOYED', drift: 0 }
            };
            const protocolNodes = (strategy.protocols || []).map((p, i) => {
                const angle = (i / strategy.protocols.length) * Math.PI * 2;
                return {
                    id: `node-strat-p-${i}-${Date.now()}`,
                    type: 'holographic',
                    position: { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
                    data: { label: p.instruction.substring(0, 20) + '...', subtext: p.role, iconName: 'Target', color: '#9d4edd', status: 'INITIALIZED', drift: 0 }
                };
            });
            const edges = protocolNodes.map(node => ({
                id: `edge-${rootNode.id}-${node.id}`,
                source: rootNode.id,
                target: node.id,
                type: 'cinematic',
                data: { color: '#9d4edd', variant: 'stream' }
            }));
            for (let i = 0; i < protocolNodes.length; i++) {
                const nextIdx = (i + 1) % protocolNodes.length;
                edges.push({ id: `edge-chain-${i}-${nextIdx}-${Date.now()}`, source: protocolNodes[i].id, target: protocolNodes[nextIdx].id, type: 'cinematic', data: { color: '#22d3ee', variant: 'pulse' } });
            }
            return {
                process: { ...state.process, nodes: [...state.process.nodes, rootNode, ...protocolNodes], edges: [...state.process.edges, ...edges] },
                mode: AppMode.PROCESS_MAP
            };
        }),
        addSwarmProposal: (proposal) => set((state) => ({ synthesis: { ...state.synthesis, incomingProposals: [proposal, ...state.synthesis.incomingProposals].slice(0, 5) } })),
        dismissProposal: (id) => set((state) => ({ synthesis: { ...state.synthesis, incomingProposals: state.synthesis.incomingProposals.filter(p => p.id !== id) } })),
        // Kernel & Biometric actions
        setKernelState: (update) => set((state) => ({
            kernel: { ...state.kernel, ...update }
        })),
        setBiometricState: (update) => set((state) => ({
            biometric: { ...state.biometric, ...update }
        })),
        setUIComplexity: (level) => set((state) => ({
            biometric: { ...state.biometric, uiComplexity: level }
        })),
    }
}));