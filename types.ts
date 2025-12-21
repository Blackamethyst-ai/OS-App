
export interface AgentDNA {
    id: string;
    label: string;
    role: string;
    color: string;
    description: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'OBJECT';
        properties: Record<string, { type: string; description: string; enum?: string[] }>;
        required?: string[];
    };
}

export interface ToolResult {
    toolName: string;
    status: 'SUCCESS' | 'ERROR';
    data: any;
    uiHint?: 'TABLE' | 'CHART' | 'STAT' | 'MESSAGE' | 'NAV';
}

export interface AgenticState {
    isThinking: boolean;
    activeTool: string | null;
    lastResult: ToolResult | null;
    history: { role: 'user' | 'model' | 'tool'; content: string; toolName?: string }[];
}

export interface CompressedAxiom {
    id: string;
    statement: string;
    reductionFactor: number;
    sourceNodes: string[];
}

export interface DigitizationResult {
    toc: { title: string; page: number }[];
    entities: { name: string; type: string; significance: string }[];
    logicModel: string; // Mermaid code
    abstract: string;
}

export interface SemanticCluster {
    id: string;
    label: string;
    description: string;
    memberIds: string[];
    color: string;
}

export interface NeuralLattice {
    clusters: SemanticCluster[];
    bridges: { sourceId: string; targetId: string; reasoning: string }[];
}

export interface SwarmStatus {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
    activeDNA?: string;
    consensusProgress?: number; // 0-100
}

export enum AppMode {
    DASHBOARD = 'DASHBOARD',
    BIBLIOMORPHIC = 'BIBLIOMORPHIC',
    PROCESS_MAP = 'PROCESS_MAP',
    MEMORY_CORE = 'MEMORY_CORE',
    IMAGE_GEN = 'IMAGE_GEN',
    POWER_XRAY = 'POWER_XRAY',
    HARDWARE_ENGINEER = 'HARDWARE_ENGINEER',
    CODE_STUDIO = 'CODE_STUDIO',
    VOICE_MODE = 'VOICE_MODE',
    BICAMERAL = 'BICAMERAL',
    SYNTHESIS_BRIDGE = 'SYNTHESIS_BRIDGE',
    TASK_MANAGER = 'TASK_MANAGER'
}

export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE'
}

export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
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
    vectors: { mechanism: string; vulnerability: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }[];
    insight: string;
    groundingSources?: { title: string; uri: string }[];
}

export interface EconomicProtocol {
    id: string;
    title: string;
    status: 'IDLE' | 'EXECUTING' | 'SETTLED' | 'ERROR';
    agentId: string;
    budget: string;
    action: string;
    type: 'LIQUIDITY' | 'DEPIN_PAYMENT' | 'COMPUTE_LEASE' | 'TREASURY' | 'PHYSICAL_SERVICE';
    timestamp: number;
}

export enum OperationalContext {
    CODE_GENERATION = 'CODE_GENERATION',
    DATA_ANALYSIS = 'DATA_ANALYSIS',
    SYSTEM_MONITORING = 'SYSTEM_MONITORING',
    STRATEGY_SYNTHESIS = 'STRATEGY_SYNTHESIS'
}

export enum AppTheme {
    DARK = 'DARK',
    LIGHT = 'LIGHT',
    CONTRAST = 'CONTRAST',
    HIGH_CONTRAST = 'HIGH_CONTRAST',
    AMBER = 'AMBER',
    SOLARIZED = 'SOLARIZED',
    MIDNIGHT = 'MIDNIGHT',
    NEON_CYBER = 'NEON_CYBER',
    CUSTOM = 'CUSTOM'
}

export interface CustomThemeConfig {
    bgMain: string;
    textMain: string;
    borderMain: string;
    accentPrimary: string;
    accentSecondary: string;
    glassOpacity: number;
    glassBlur: string;
    fontFamily: string;
}

export interface UserProfile {
    displayName: string;
    role: string;
    clearanceLevel: number;
    avatar: string | null;
}

export interface BookDNA {
    title: string;
    author: string;
    systemPrompt: string;
    axioms: string[];
    kernelIdentity: string;
}

export interface FileData {
    inlineData: {
        data: string;
        mimeType: string;
    };
    name?: string;
}

export interface StrategyLayer {
    id: string;
    name: string;
    role: string;
    leverage: string;
    status: 'OFFLINE' | 'SYNCING' | 'OPTIMIZED' | 'THREAT_DETECTED' | 'INITIALIZED' | 'OPTIMIZING';
    level: number;
    metrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
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
    address: string;
    balance: string;
    currency: string;
    lastActive: number;
    txCount: number;
    assets?: { label: string; value: number }[];
}

export interface MetaventionsState {
    layers: StrategyLayer[];
    activeLayerId: string | null;
    isAnalyzing: boolean;
    strategyLog: { id: string; timestamp: number; message: string; type: 'INTEL' | 'ACTION' | 'SECURITY' }[];
    strategyLibrary: InterventionProtocol[];
    wallets: AgentWallet[];
    economicProtocols: EconomicProtocol[];
}

export interface ResearchState {
    tasks: ResearchTask[];
}

export interface ResearchTask {
    id: string;
    query: string;
    status: 'QUEUED' | 'PLANNING' | 'SEARCHING' | 'SYNTHESIZING' | 'SWARM_VERIFY' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    progress: number;
    logs: string[];
    timestamp: number;
    subQueries?: string[];
    findings?: FactChunk[];
    result?: string;
    agentAssigned?: string;
}

export interface FactChunk {
    id: string;
    fact: string;
    source: string;
    confidence: number;
}

export interface KnowledgeNode {
    id: string;
    label: string;
    type: 'CONCEPT' | 'FACT' | 'HYPOTHESIS' | 'BRIDGE' | 'AXIOM' | 'CLUSTER';
    connections: string[];
    strength: number;
    x?: number;
    y?: number;
    z?: number;
    color?: string;
    data?: any;
}

export interface ScienceHypothesis {
    id: string;
    statement: string;
    confidence: number;
    supportingFacts?: string[];
    status: 'PROPOSED' | 'TESTING' | 'VALIDATED';
    simulationResult?: string;
}

export interface ResonancePoint {
    frame: number;
    tension: number;
    dynamics: number;
}

export interface Colorway {
    id: string;
    label: string;
    baseSurfaces: string;
    shadowsInk: string;
    uiAccentPrimary: string;
    uiAccentSecondary: string;
    warmPractical: string;
}

export const SOVEREIGN_DEFAULT_COLORWAY: Colorway = {
    id: 'sovereign_prime',
    label: 'Sovereign Prime',
    baseSurfaces: 'fog white, pale cool grey, glossy white desk',
    shadowsInk: 'soft charcoal, preserved shadow detail',
    uiAccentPrimary: 'mint-cyan, teal outline',
    uiAccentSecondary: 'faint violet',
    warmPractical: 'subtle peach/rose linear strips'
};

export interface ComponentRecommendation {
    id?: string;
    partNumber: string;
    manufacturer: string;
    description: string;
    specs: Record<string, string | number>;
    type?: string;
    severity?: string;
    location?: string;
    recommendation?: string;
    boundingBox?: number[];
    price?: number;
    aiSuitability?: number;
    isInStock?: boolean;
}

export interface ArtifactAnalysis {
    classification: string;
    ambiguityScore: number;
    entities: string[];
    summary: string;
    entropyRating?: number; // 0-100
}

export interface UserIntent {
    action: string;
    target?: string;
    reasoning: string;
    parameters?: any;
    payload?: any;
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

export interface MentalState {
    skepticism: number;
    excitement: number;
    alignment: number;
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

export interface AtomicTask {
    id: string;
    description: string;
    isolated_input: string;
    instruction: string;
    weight: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SwarmResult {
    taskId: string;
    output: string;
    confidence: number;
    agentId: string;
    executionTime: number;
    websearch?: any;
    voteLedger: VoteLedger;
}

export interface VoteLedger {
    winner: string;
    count: number;
    runnerUp: string;
    runnerUpCount: number;
    totalRounds: number;
    killedAgents: number;
}

export interface SearchResultItem {
    id: string;
    type: string;
    title: string;
    description: string;
    meta?: any;
}

export interface Message {
    role: 'user' | 'model';
    text: string;
    timestamp?: number;
    parts?: any[];
}

export interface StoredArtifact {
    id: string;
    name: string;
    type: string;
    data: Blob;
    analysis: ArtifactAnalysis | null;
    timestamp: number;
    tags: string[];
    metadata?: any;
}

export enum TemporalEra {
    SILICON = 'SILICON',
    QUANTUM = 'QUANTUM',
    BIOLOGICAL = 'BIOLOGICAL'
}

export enum AspectRatio {
    RATIO_1_1 = '1:1',
    RATIO_3_4 = '3:4',
    RATIO_4_3 = '4:3',
    RATIO_9_16 = '9:16',
    RATIO_16_9 = '16:9'
}

export enum ImageSize {
    SIZE_1K = '1K',
    SIZE_2K = '2K',
    SIZE_4K = '4K'
}

export interface SuggestedAction {
    id: string;
    label: string;
    command: string;
    reasoning: string;
    iconName: string;
}

export interface ProtocolStepResult {
    output: string;
    agentThought: string;
    timestamp: number;
}

export interface AgenticNodeData {
    label: string;
    role: string;
    modelType: 'LRM' | 'FRL';
    tools: string[];
    activeState?: string;
    thinkingBudget?: number;
    iconName?: string;
    color?: string;
}

export enum HardwareTier {
    TIER_1 = 'TIER_1',
    TIER_2 = 'TIER_2',
    TIER_3 = 'TIER_3'
}

export interface ArtifactNode {
    id: string;
    type: string;
    label: string;
    content: any;
}
