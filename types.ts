
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  PROCESS_MAP = 'PROCESS_MAP',
  IMAGE_GEN = 'IMAGE_GEN',
  POWER_XRAY = 'POWER_XRAY',
  BIBLIOMORPHIC = 'BIBLIOMORPHIC',
  HARDWARE_ENGINEER = 'HARDWARE_ENGINEER',
  VOICE_MODE = 'VOICE_MODE',
  CODE_STUDIO = 'CODE_STUDIO',
  MEMORY_CORE = 'MEMORY_CORE',
  BICAMERAL = 'BICAMERAL',
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K',
}

export enum AspectRatio {
  RATIO_1_1 = '1:1',
  RATIO_2_3 = '2:3',
  RATIO_3_2 = '3:2',
  RATIO_3_4 = '3:4',
  RATIO_4_3 = '4:3',
  RATIO_9_16 = '9:16',
  RATIO_16_9 = '16:9',
  RATIO_21_9 = '21:9',
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
}

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
  name: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type IngestionStatus = 'pending' | 'scanning' | 'verified' | 'rejected';

export interface ArtifactAnalysis {
  classification: string;
  ambiguityScore: number;
  entities: string[];
  summary: string;
}

export interface ArtifactNode {
  id: string;
  file: File;
  status: IngestionStatus;
  data: FileData | null;
  analysis?: ArtifactAnalysis;
  error?: string;
}

export interface GovernanceSchema {
  targetSystem: string;
  constraintLevel: 'Permissive' | 'Standard' | 'Strict';
  outputTopology: 'Hierarchical' | 'Network' | 'Sequential' | 'Hub & Spoke';
  additionalDirectives: string;
}

export interface FrameworkStep {
    step: string;
    designation: string;
    execution_vector: string;
}

export interface AutopoieticFramework {
    framework_identity: {
        name: string;
        acronym: string;
        philosophical_origin: string;
    };
    operational_logic: FrameworkStep[];
    governance_mandate: string;
    visual_signature: {
        color_hex: string;
        icon_metaphor: string;
    };
}

export interface SystemWorkflow {
    structureTree: string;
    protocols: { rule: string; reasoning: string }[];
    automationScript: string;
    processDiagram?: string;
}

export type ProcessTab = 'living_map' | 'diagram' | 'workflow' | 'genesis' | 'audio';

export interface WorkerAgent {
    id: string;
    role: string;
    status: 'IDLE' | 'WORKING' | 'COMPLETE' | 'FAILED';
    task: string;
    durationMs?: number;
}

export interface ProcessState {
  prompt: string;
  governance: GovernanceSchema;
  artifacts: ArtifactNode[];
  isLoading: boolean;
  generatedCode: string;
  chatHistory: Message[];
  audioUrl: string | null;
  audioTranscript: string | null;
  error: string | null;
  autopoieticFramework: AutopoieticFramework | null;
  generatedWorkflow: SystemWorkflow | null;
  entropyScore: number;
  activeTab?: ProcessTab;
  architectMode?: 'BLUEPRINT' | 'EXECUTION';
  swarm?: {
      isActive: boolean;
      agents: WorkerAgent[];
  };
}

export interface ImageGenState {
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  referenceImage: FileData | null;
  generatedImage: GeneratedImage | null;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardState {
  identityUrl: string | null;
  referenceImage: FileData | null;
  isGenerating: boolean;
}

// Hardware
export interface PowerRail {
  voltage: string;
  source: string;
  category: 'digital' | 'analog' | 'rf' | 'power';
  status: 'stable' | 'noisy' | 'critical';
}

export interface ComponentRecommendation {
  partNumber: string;
  manufacturer: string;
  description: string;
  reasoning: string;
  specs: Record<string, string>;
}

export interface SchematicIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  location: string;
  description: string;
  recommendation: string;
}

export interface HardwareState {
  schematicImage: FileData | null;
  analysis: {
    powerRails: PowerRail[];
    issues: SchematicIssue[];
    efficiencyRating: number;
  } | null;
  componentQuery: string;
  recommendations: ComponentRecommendation[];
  isLoading: boolean;
  error: string | null;
}

// Bibliomorphic
export interface Axiom {
  id: string;
  concept: string;
  codeSnippet: string;
}

export interface ProposedModule {
  id: string;
  title: string;
  description: string;
  type: 'UI' | 'LOGIC' | 'DATABASE' | 'KERNEL';
  reasoning: string;
}

export interface KernelIdentity {
  designation: string;
  architecturalPhilosophy: string;
  primeDirective: string;
  status: string;
  contextIngestion: string;
}

export interface ArchitectureProposal {
    projectCodename: string;
    overview: string;
    systemCore: any;
    peripheralInterface: any;
    ethicalRootkit: any;
}

export interface BookDNA {
  id?: string;
  timestamp?: number;
  title: string;
  author: string;
  extractionRate: number;
  toneAnalysis: string;
  systemPrompt: string;
  axioms: Axiom[];
  modules: ProposedModule[];
  kernelIdentity: KernelIdentity;
  architectureProposal: ArchitectureProposal;
}

export interface BibliomorphicState {
  dna: BookDNA | null;
  activeBook: FileData | null;
  library: BookDNA[];
  chatHistory: Message[];
  isLoading: boolean;
  error: string | null;
}

// Voice
export interface VoiceState {
  isActive: boolean;
  isConnecting: boolean;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  volume: number;
  transcripts: { role: 'user' | 'model', text: string }[];
  error: string | null;
}

// Code Studio
export interface CodeStudioState {
  prompt: string;
  generatedCode: string | null;
  language: string;
  model: string;
  isLoading: boolean;
  isExecuting: boolean;
  executionOutput: string | null;
  error: string | null;
  history: { prompt: string; code: string; timestamp: number }[];
}

// Search
export interface SearchResultItem {
  id: string;
  title: string;
  description: string;
  type: 'NAV' | 'ACTION' | 'QUERY';
  meta?: {
    targetMode?: string;
    actionType?: string;
    payload?: any;
  };
}

export interface GlobalSearchState {
  query: string;
  results: SearchResultItem[];
  history: string[];
  isSearching: boolean;
  isOpen: boolean;
}

// Analysis Result (Power XRay)
export interface AnalysisResult {
  sustainer: string;
  destroyer: string;
  extractor: string;
  insight: string;
  scores: {
    centralization: number;
    entropy: number;
    vitality: number;
    opacity: number;
    adaptability: number;
  };
  vectors: {
    mechanism: string;
    vulnerability: string;
  }[];
}

// Intents
export type IntentAction = 'NAVIGATE' | 'CONFIGURE_GOVERNANCE' | 'CONFIGURE_IMAGE' | 'ANALYZE_POWER' | 'GENERATE_CODE' | 'HARDWARE_SEARCH' | 'ACTIVATE_VOICE';

export interface UserIntent {
  action: IntentAction;
  target?: string;
  parameters?: Record<string, any>;
  reasoning?: string;
  payload?: string;
}

// Command Palette
export interface SuggestedAction {
    id: string;
    label: string;
    command: string;
    reasoning: string;
    iconName: string;
}

// System / Overlay
export interface LogEntry {
    id: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SYSTEM' | 'SUCCESS';
    message: string;
    timestamp: string;
}

export interface DockItem {
    id: string;
    type: 'IMAGE' | 'CODE' | 'ANALYSIS' | 'TEXT';
    label: string;
    content: string; // URL or text
    timestamp: number;
}

export interface SystemState {
    logs: LogEntry[];
    isTerminalOpen: boolean;
    dockItems: DockItem[];
}

// Holo Projector
export interface HoloArtifact {
    id: string;
    type: 'IMAGE' | 'CODE' | 'TEXT';
    title: string;
    content: string;
}

export interface HoloState {
    isOpen: boolean;
    activeArtifact: HoloArtifact | null;
    analysisResult: string | null;
    isAnalyzing: boolean;
}

// Context Menu
export interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    contextType: 'TEXT' | 'IMAGE' | 'CODE' | 'GENERAL';
    targetContent: any;
}

// --- AGORA SIMULATION TYPES ---

export interface MentalState {
    skepticism: number;
    excitement: number;
    alignment: number;
}

export interface SyntheticPersona {
    id: string;
    name: string;
    role: 'SKEPTIC' | 'VISIONARY' | 'PRAGMATIST' | 'SECURITY_HAWK';
    avatar_color: string;
    bias: string;
    systemPrompt: string;
    currentMindset: MentalState;
    voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export interface DebateTurn {
    id: string;
    personaId: string;
    text: string;
    timestamp: number;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    newMindset?: MentalState;
}

export interface SimulationReport {
    viabilityScore: number;
    consensus: string;
    majorFrictionPoints: string[];
    actionableFixes: string[];
    projectedUpside?: number;
}

// --- BICAMERAL ENGINE TYPES ---

export interface AtomicTask {
    id: string;
    description: string;
    isolated_input: string;
    instruction: string;
    weight: number;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface VoteLedger {
    winner: string;
    count: number;
    runnerUp: string;
    runnerUpCount: number;
    totalRounds: number;
    killedAgents: number;
}

export interface SwarmResult {
    taskId: string;
    output: string;
    confidence: number;
    agentId: string;
    executionTime: number;
    voteLedger: VoteLedger;
}

export interface SwarmStatus {
    taskId: string;
    votes: Record<string, number>;
    killedAgents: number;
    currentGap: number;
    targetGap: number;
    totalAttempts: number;
}

export interface BicameralState {
    goal: string;
    plan: AtomicTask[];
    ledger: SwarmResult[];
    isPlanning: boolean;
    isSwarming: boolean;
    error: string | null;
    swarmStatus: SwarmStatus;
}

// --- RESEARCH TYPES ---

export interface ResearchTask {
    id: string;
    query: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    progress: number; // 0-100
    logs: string[];
    result?: string;
    timestamp: number;
}

export interface ResearchState {
    tasks: ResearchTask[];
}

export interface ProjectTopology {
    // Placeholder if needed
    name: string;
}

export interface StructuredScaffold {
    // Placeholder if needed
    files: string[];
}
