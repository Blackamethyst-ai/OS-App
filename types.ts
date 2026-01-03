export type Result<T, E = Error> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };

export interface HiveAgent {
    id: string;
    name: string;
    voice: string;
    systemPrompt: string;
    weights: { skepticism: number; logic: number; creativity: number; empathy: number };
}

export interface AgentDNA {
    id: string;
    label: string;
    role: string;
    color: string;
    description: string;
}

export interface DirectoryNode {
    name: string;
    type: 'folder' | 'file' | 'node' | 'module';
    description?: string;
    size?: string;
    modified?: string;
    entropy?: number; // 0-100 scale of "unorganized" drift
    securityAttestation?: 'VERIFIED' | 'PENDING' | 'UNTRUSTED';
    children?: DirectoryNode[];
}

export interface ProtocolStep {
    instruction: string;
    role: string;
    nodeRef: string;
    phase: string;
    estimatedTime?: string;
    dependencies?: string[];
    logOutput?: string; // For the terminal simulation
    securityVector?: 'ENCRYPTED' | 'OPEN' | 'VULNERABLE';
}

export interface TechnicalManifest {
    id: string;
    title: string;
    type: 'DIRECTORY' | 'SYSTEM_FLOW' | 'CODE_LOGIC';
    logic: string;
    complexity: 'PRODUCTION' | 'EXPERIMENTAL' | 'CRITICAL';
    viability: number;
    riskVector: 'LOW' | 'MEDIUM' | 'HIGH';
    depth: number;
    structure?: DirectoryNode[];
    protocols: ProtocolStep[];
    internalPlanningMonologue?: string;
    coherenceScore?: number;
    taxonomy?: any;
    deploymentAura?: string; // CSS color or gradient for the UI
    entropyRating?: number; // Global entropy for the entire system
}

export interface SwarmProposal {
    id: string;
    agentId: string;
    agentName: string;
    type: 'OPTIMIZATION' | 'EXPANSION' | 'SECURITY';
    title: string;
    description: string;
    impact: string;
    manifest: Partial<TechnicalManifest>;
    timestamp: number;
}

export enum AppMode {
    DASHBOARD = 'DASHBOARD',
    METAVENTIONS_HUB = 'METAVENTIONS_HUB',
    BIBLIOMORPHIC = 'BIBLIOMORPHIC',
    PROCESS_MAP = 'PROCESS_MAP',
    MEMORY_CORE = 'MEMORY_CORE',
    IMAGE_GEN = 'IMAGE_GEN',
    HARDWARE_ENGINEER = 'HARDWARE_ENGINEER',
    CODE_STUDIO = 'CODE_STUDIO',
    VOICE_MODE = 'VOICE_MODE',
    SYNTHESIS_BRIDGE = 'SYNTHESIS_BRIDGE',
    BICAMERAL = 'BICAMERAL',
    AGENT_CONTROL = 'AGENT_CONTROL',
    AUTONOMOUS_FINANCE = 'AUTONOMOUS_FINANCE'
}

export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    tags: string[];
    subtasks: SubTask[];
    timestamp: number;
    isSubtasksCollapsed?: boolean;
}

export interface AnalysisResult {
    scores: {
        centralization: number;
        entropy: number;
        vitality: number;
        opacity: number;
        adaptability: number;
    };
    sustainer: string;
    extractor: string;
    destroyer: string;
    vectors: {
        mechanism: string;
        vulnerability: string;
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    }[];
    insight: string;
    groundingSources?: { title: string; uri: string }[];
}

export enum AppTheme {
    DARK = 'DARK',
    LIGHT = 'LIGHT',
    CONTRAST = 'CONTRAST',
    AMBER = 'AMBER',
    MIDNIGHT = 'MIDNIGHT',
    NEON_CYBER = 'NEON_CYBER',
    HIGH_CONTRAST = 'HIGH_CONTRAST',
    SOLARIZED = 'SOLARIZED',
    CUSTOM = 'CUSTOM'
}

export interface UserProfile {
    displayName: string;
    role: string;
    clearanceLevel: number;
    avatar: string | null;
}

export interface FileData {
    inlineData: {
        data: string;
        mimeType: string;
    };
    name?: string;
}

export interface StoredArtifact {
    id: string;
    name: string;
    type: string;
    data: Blob;
    analysis: ArtifactAnalysis | null;
    timestamp: number;
    tags: string[];
    metadata?: Record<string, unknown>;
}

export interface ArtifactAnalysis {
    classification: string;
    ambiguityScore: number;
    entities: string[];
    summary: string;
    entropyRating?: number;
    structural_intelligence?: string;
}

export interface KnowledgeNode {
    id: string;
    label: string;
    type: 'CONCEPT' | 'FACT' | 'HYPOTHESIS' | 'BRIDGE' | 'AXIOM' | 'CLUSTER';
    connections: string[];
    strength: number;
    color?: string;
    data?: any; 
    artifactRef?: any;
}

export interface ScienceHypothesis {
    id: string;
    statement: string;
    confidence: number;
    status: 'IDLE' | 'TESTING' | 'VERIFIED' | 'REJECTED';
}

export interface Frame {
    index: number;
    scenePrompt: string;
    continuity: string;
    camera: string; 
    lighting: string; 
    status: 'pending' | 'generating' | 'done' | 'error';
    imageUrl?: string;
    audioUrl?: string;
    error?: string;
}

export interface ProductionBible {
    theme: string;
    atmosphere: string;
    visualLogic: string;
    narrativeArc: string;
    opticProfile: string;
    cinematicNotes: string[];
}

export interface ResonancePoint {
    frame: number;
    tension: number;
    dynamics: number;
}

export interface Colorway {
    id: string;
    name: string;
    colors: string[];
}

export const SOVEREIGN_DEFAULT_COLORWAY: Colorway = {
    id: 'sovereign-default',
    name: 'Sovereign Bridge',
    colors: ['#7B2CFF', '#18E6FF', '#020204']
};

export interface EconomicProtocol {
    id: string;
    type: 'SWAP' | 'MINT' | 'STAKE' | 'LEND' | 'ARB';
    status: 'ACTIVE' | 'PENDING' | 'HALTED';
    volume: string;
    yield?: string;
}

export interface MetaventionsState {
    layers: {
        id: string;
        name: string;
        role: string;
        leverage: string;
        status: string;
        level: number;
        metrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
    }[];
    activeLayerId: string;
    isAnalyzing: boolean;
    strategyLog: string[];
    strategyLibrary: InterventionProtocol[];
    wallets: AgentWallet[];
    economicProtocols: EconomicProtocol[];
}

export interface InterventionProtocol {
    id: string;
    title: string;
    context: string;
    logic: string;
    physicalImpact: string;
    timestamp: number;
}

export interface AgentWallet {
    id: string;
    address: string;
    balance: string;
    assets: { symbol: string; value: string }[];
}

export interface MentalState {
    skepticism: number;
    excitement: number;
    alignment: number;
}

export interface AtomicTask {
    id: string;
    description: string;
    isolated_input: string;
    instruction: string;
    weight: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    complexity?: 'LOW' | 'MED' | 'HIGH';
    logs?: { timestamp: number; message: string }[];
}

export interface SwarmResult {
    taskId: string;
    output: string;
    confidence: number;
    agentId: string;
    executionTime: number;
    voteLedger: {
        winner: string;
        count: number;
        runnerUp: string;
        runnerUpCount: number;
        totalRounds: number;
        killedAgents: number;
    };
}

export enum OperationalContext {
    STRATEGY_SYNTHESIS = 'STRATEGY_SYNTHESIS',
    CODE_GENERATION = 'CODE_GENERATION',
    DATA_ANALYSIS = 'DATA_ANALYSIS',
    SYSTEM_MONITORING = 'SYSTEM_MONITORING',
    GENERAL_PURPOSE = 'GENERAL_PURPOSE'
}

export interface AutonomousAgent {
    id: string;
    name: string;
    role: string;
    context: OperationalContext;
    status: 'ACTIVE' | 'IDLE' | 'THINKING' | 'SLEEPING';
    memoryBuffer: { timestamp: number; role: 'USER' | 'AI' | 'SYSTEM'; text: string }[];
    capabilities: string[];
    lastInstruction?: string;
    currentMindset: MentalState;
    energyLevel: number;
    avatarUrl?: string;
    tasks: AtomicTask[];
}

export enum TemporalEra {
    SILICON = 'SILICON',
    QUANTUM = 'QUANTUM',
    BIOMIMETIC = 'BIOMIMETIC'
}

export enum AspectRatio {
    RATIO_1_1 = '1:1',
    RATIO_4_3 = '4:3',
    RATIO_16_9 = '16:9',
    RATIO_9_16 = '9:16'
}

export enum ImageSize {
    SIZE_1K = '1K',
    SIZE_2K = '2K',
    SIZE_4K = '4K'
}

export interface SearchResultItem {
    id: string;
    title: string;
    description: string;
    type: string;
    meta?: any;
}

export interface PeerPresence {
    id: string;
    name: string;
    role: string;
    activeSector: AppMode;
    status: 'ACTIVE' | 'IDLE' | 'BUSY';
    color: string;
    lastSeen: number;
}

export interface SwarmEvent {
    id: string;
    userId: string;
    userName: string;
    action: string;
    target?: string;
    timestamp: number;
}

export interface KnowledgeLayer {
    id: string;
    label: string;
    icon: string;
    color: string;
    description: string;
    systemInstruction: string;
    memoryTags: string[]; 
    activeModes: AppMode[];
}

export interface Message {
    role: 'user' | 'model' | 'system' | 'function' | 'AI' | 'USER' | 'tool';
    content?: string;
    text?: string;
    timestamp?: number;
    toolName?: string;
}

export interface SwarmStatus {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
    consensusProgress?: number;
    activeDNA?: string;
}

export interface SuggestedAction {
    id: string;
    label: string;
    command: string;
    iconName: string;
    reasoning: string;
}

export interface SyntheticPersona {
    id: string;
    name: string;
    role: string;
    bias: string;
    systemPrompt: string;
    avatar_color: string;
    currentMindset: MentalState;
    voiceName: string;
}

export interface DebateTurn {
    id: string;
    personaId: string;
    text: string;
    timestamp: number;
    sentiment: string;
    newMindset?: MentalState;
}

export interface SimulationReport {
    viabilityScore: number;
    projectedUpside: number;
    consensus: string;
    majorFrictionPoints: string[];
    actionableFixes: string[];
}

export interface FactChunk {
    id: string;
    fact: string;
    confidence: number;
    source: string;
}

export interface ProtocolStepResult {
    output: string;
    agentThought: string;
}

export interface CompressedAxiom {
    id: string;
    statement: string;
    reductionFactor: number;
    sourceNodes: string[];
}

export interface ToolResult {
    toolName: string;
    status: 'SUCCESS' | 'ERROR';
    data: any;
    uiHint?: 'TABLE' | 'STAT' | 'MESSAGE' | 'NAV';
}

export interface AgenticState {
    isThinking: boolean;
    activeTool: string | null;
    lastResult: ToolResult | null;
    history: Message[];
}

export interface VoteLedger {
    winner: string;
    count: number;
    runnerUp: string;
    runnerUpCount: number;
    totalRounds: number;
    killedAgents: number;
}
