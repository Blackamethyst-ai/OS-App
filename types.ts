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
}

export interface EconomicProtocol {
    id: string;
    title: string;
    status: 'IDLE' | 'EXECUTING' | 'SETTLED' | 'ERROR';
    agentId: string;
    budget: string;
    action: string;
    type: 'LIQUIDITY' | 'DEPIN_PAYMENT' | 'COMPUTE_LEASE' | 'TREASURY';
    timestamp: number;
}

export enum AppMode {
    DASHBOARD = 'DASHBOARD',
    BIBLIOMORPHIC = 'BIBLIOMORPHIC',
    PROCESS_MAP = 'PROCESS_MAP',
    MEMORY_CORE = 'MEMORY_CORE',
    IMAGE_GEN = 'IMAGE_GEN',
    POWER_XRAY = 'POWER_XRAY',
    HARDWARE_ENGINEER = 'HARDWARE_ENGINEER',
    HARDWARE_SINGULARITY = 'HARDWARE_SINGULARITY',
    HARDWARE_AUTONOMY = 'HARDWARE_AUTONOMY',
    CODE_STUDIO = 'CODE_STUDIO',
    VOICE_MODE = 'VOICE_MODE',
    BICAMERAL = 'BICAMERAL',
    DISCOVERY = 'DISCOVERY',
    SYNTHESIS_BRIDGE = 'SYNTHESIS_BRIDGE',
    HELP = 'HELP'
}

export type AppTheme = 'DARK' | 'LIGHT' | 'CONTRAST' | 'HIGH_CONTRAST' | 'SOLARIZED' | 'AMBER' | 'MIDNIGHT' | 'NEON_CYBER';

export enum OperationalContext {
    CODE_GENERATION = 'CODE_GENERATION',
    DATA_ANALYSIS = 'DATA_ANALYSIS',
    SYSTEM_MONITORING = 'SYSTEM_MONITORING',
    STRATEGY_SYNTHESIS = 'STRATEGY_SYNTHESIS'
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

// --- METAVENTIONS STACK TYPES ---
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
    context: string; // The "lens" used
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
    recursiveFeedback: {
        rawInput: string;
        refractions: Record<string, string>;
    } | null;
    wallets: AgentWallet[];
    economicProtocols: EconomicProtocol[];
}
// -----------------------------

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
    type: 'CONCEPT' | 'FACT' | 'HYPOTHESIS' | 'BRIDGE';
    connections: string[];
    strength: number;
    // For visualization
    x?: number;
    y?: number;
    z?: number;
    color?: string;
}

export interface ScienceHypothesis {
    id: string;
    statement: string;
    confidence: number;
    supportingFacts?: string[];
    status: 'PROPOSED' | 'TESTING' | 'VALIDATED';
    simulationResult?: string;
}

// --- CINEMATIC ENGINE TYPES ---
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

export const MINT_NOIR_COLORWAY: Colorway = {
    id: 'mint_noir',
    label: 'Mint Noir',
    baseSurfaces: 'matte black, brushed titanium',
    shadowsInk: 'deep void black',
    uiAccentPrimary: 'electric mint',
    uiAccentSecondary: 'white',
    warmPractical: 'cold white edge lights'
};

export const AMBER_PROTOCOL_COLORWAY: Colorway = {
    id: 'amber_protocol',
    label: 'Amber Protocol',
    baseSurfaces: 'warm grey, industrial concrete',
    shadowsInk: 'dark bronze',
    uiAccentPrimary: 'amber orange',
    uiAccentSecondary: 'deep red',
    warmPractical: 'tungsten filament glow'
};
// -----------------------------

export interface ComponentRecommendation {
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
    aiSuitability?: number; // 0-100
}

export interface PowerRail {
    source: string;
    voltage: string;
    status: string;
}

export interface SchematicIssue {
    severity: string;
    location: string;
    description: string;
    recommendation: string;
    boundingBox: number[];
}

export interface ArtifactAnalysis {
    classification: string;
    ambiguityScore: number;
    entities: string[];
    summary: string;
}

export interface BookDNA {
    title: string;
    author: string;
    systemPrompt: string;
    axioms: { concept: string; description: string }[];
    kernelIdentity: { designation: string; primeDirective: string };
    timestamp: number;
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

export interface SwarmStatus {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
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

export interface ArtifactNode {
    id: string;
    file: File;
    status: string;
    data: any;
    analysis?: ArtifactAnalysis;
}

export type HardwareTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';

export enum TemporalEra {
    SILICON = 'SILICON',
    SINGULARITY = 'SINGULARITY',
    AUTONOMY = 'AUTONOMY'
}

export interface SuggestedAction {
    id: string;
    label: string;
    command: string;
    iconName: string;
    reasoning: string;
}

export enum AspectRatio {
    RATIO_16_9 = '16:9',
    RATIO_1_1 = '1:1',
    RATIO_9_16 = '9:16',
    RATIO_3_4 = '3:4',
    RATIO_4_3 = '4:3'
}

export enum ImageSize {
    SIZE_1K = '1K',
    SIZE_2K = '2K',
    SIZE_4K = '4K'
}