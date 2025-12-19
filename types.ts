

export interface AgentDNA {
    id: string;
    label: string;
    role: 'SKEPTIC' | 'VISIONARY' | 'PRAGMATIST' | 'OPERATOR' | 'SPECIALIST';
    color: string;
    description: string;
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

// ... existing interfaces ...

export interface SwarmStatus {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
    activeDNA?: string; // New: DNA ID
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
    SYNTHESIS_BRIDGE = 'SYNTHESIS_BRIDGE'
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

/**
 * Fix: Changed OperationalContext from interface to enum to allow value usage.
 */
export enum OperationalContext {
    CODE_GENERATION = 'CODE_GENERATION',
    DATA_ANALYSIS = 'DATA_ANALYSIS',
    SYSTEM_MONITORING = 'SYSTEM_MONITORING',
    STRATEGY_SYNTHESIS = 'STRATEGY_SYNTHESIS'
}

/**
 * Fix: Added AppTheme enum.
 */
export enum AppTheme {
    DARK = 'DARK',
    LIGHT = 'LIGHT',
    CONTRAST = 'CONTRAST',
    HIGH_CONTRAST = 'HIGH_CONTRAST',
    AMBER = 'AMBER',
    SOLARIZED = 'SOLARIZED',
    MIDNIGHT = 'MIDNIGHT',
    NEON_CYBER = 'NEON_CYBER'
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
    type: 'CONCEPT' | 'FACT' | 'HYPOTHESIS' | 'BRIDGE' | 'AXIOM';
    connections: string[];
    strength: number;
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

/**
 * Fix: Added missing MINT_NOIR_COLORWAY.
 */
export const MINT_NOIR_COLORWAY: Colorway = {
    id: 'mint_noir',
    label: 'Mint Noir',
    baseSurfaces: 'matte black, deep charcoal',
    shadowsInk: 'pitch black, hard shadows',
    uiAccentPrimary: 'mint green, neon glow',
    uiAccentSecondary: 'subtle emerald',
    warmPractical: 'muted pine'
};

/**
 * Fix: Added missing AMBER_PROTOCOL_COLORWAY.
 */
export const AMBER_PROTOCOL_COLORWAY: Colorway = {
    id: 'amber_protocol',
    label: 'Amber Protocol',
    baseSurfaces: 'dark bronze, weathered iron',
    shadowsInk: 'warm brown, soft depth',
    uiAccentPrimary: 'bright amber, orange glow',
    uiAccentSecondary: 'burnt orange',
    warmPractical: 'copper linear highlights'
};

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
    aiSuitability?: number; 
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

/**
 * Fix: Added HardwareTier enum.
 */
export enum HardwareTier {
    TIER_1 = 'TIER_1',
    TIER_2 = 'TIER_2',
    TIER_3 = 'TIER_3'
}

/**
 * Fix: Added ArtifactNode interface.
 */
export interface ArtifactNode {
    id: string;
    type: 'IMAGE' | 'CODE' | 'TEXT' | 'ANALYSIS';
    label: string;
    content: any;
    timestamp: number;
}

/**
 * Fix: Added StoredArtifact interface for persistence.
 */
export interface StoredArtifact {
    id: string;
    name: string;
    type: string;
    data: Blob;
    analysis: ArtifactAnalysis | null;
    timestamp: number;
    tags: string[];
}
