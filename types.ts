

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  PROCESS_MAP = 'PROCESS_MAP',
  IMAGE_GEN = 'IMAGE_GEN',
  POWER_XRAY = 'POWER_XRAY',
  BIBLIOMORPHIC = 'BIBLIOMORPHIC',
  HARDWARE_ENGINEER = 'HARDWARE_ENGINEER',
  VOICE_MODE = 'VOICE_MODE',
  CODE_STUDIO = 'CODE_STUDIO',
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

export type DiagramType = 'mindmap' | 'flowchart' | 'sequence';

export type IngestionStatus = 'pending' | 'scanning' | 'verified' | 'rejected';

export interface ArtifactAnalysis {
  classification: string; // e.g., 'INTEL', 'PROTOCOL', 'FINANCIAL'
  ambiguityScore: number; // 0-100
  entities: string[];
  summary: string;
}

export interface ArtifactNode {
  id: string;
  file: File;
  status: IngestionStatus;
  data: FileData | null;
  analysis?: ArtifactAnalysis; // AI Classification
  error?: string;
}

export interface GovernanceSchema {
  targetSystem: string;
  constraintLevel: 'Permissive' | 'Standard' | 'Strict';
  outputTopology: 'Hierarchical' | 'Network' | 'Sequential' | 'Hub & Spoke';
  additionalDirectives: string;
}

// --- Autopoietic Genesis Types ---

export interface FrameworkStep {
    step: string; // The letter (e.g. "S")
    designation: string; // The name (e.g. "Structure")
    execution_vector: string; // The instruction
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

// --- Bibliomorphic / Erickson Kernel Types ---

export interface Axiom {
  id: string;
  concept: string;
  codeSnippet: string; // The "System Prompt" line
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

export interface CognitiveEngine {
  architectureType: string;
  description?: string;
  components: {
    workingMemory: { function: string; mechanism?: string };
    proceduralMemory: { function: string; optimization?: string };
    decisionCycle: { [key: string]: string };
  };
  learningSubsystem?: {
    methodology: string;
    objective?: string;
    explorationStrategy?: string;
  };
}

export interface ControlStructures {
  hierarchicalController?: { purpose?: string; layers: string[] };
  adaptiveFeedbackLoop?: { purpose?: string; mechanism?: string };
  emotionalRegulator?: { purpose: string; input?: string };
}

export interface PeripheralInterface {
  virtualSensorArray?: { description?: string; modules: any[]; fusionEngine?: string };
  characterIotBridge?: { concept?: string; capabilities: any };
  mixedRealityRenderer?: { function?: string; features: any[] };
}

export interface EthicalRootkit {
  status: string;
  mandates: string[];
}

export interface ArchitectureProposal {
  projectCodename: string;
  overview: string;
  systemCore: {
    cognitiveEngine: CognitiveEngine;
    controlStructures: ControlStructures;
    deploymentStrategy?: { [key: string]: string };
  };
  peripheralInterface: PeripheralInterface;
  ethicalRootkit: EthicalRootkit;
}

export interface BookDNA {
  id?: string;
  timestamp?: number;
  title: string;
  author: string;
  extractionRate: number; // 0-100
  toneAnalysis: string;
  axioms: Axiom[];
  modules: ProposedModule[];
  systemPrompt: string; // The full compiled prompt
  kernelIdentity: KernelIdentity;
  architectureProposal: ArchitectureProposal;
}

export interface BibliomorphicState {
  dna: BookDNA | null;
  activeBook: FileData | null;
  library: BookDNA[];
  libraryFiles: FileData[];
  chatHistory: Message[];
  isLoading: boolean;
  error: string | null;
}

// --- Hardware Engineering Types ---

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
    efficiencyRating: number; // 0-100
  } | null;
  componentQuery: string;
  recommendations: ComponentRecommendation[];
  isLoading: boolean;
  error: string | null;
}

// --- Voice Mode Types ---

export interface VoiceState {
  isActive: boolean;
  isConnecting: boolean;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  volume: number; // 0-100 for visualizer
  transcripts: { role: 'user' | 'model', text: string }[];
  error: string | null;
}

// --- Code Studio Types ---

export interface CodeStudioState {
  prompt: string;
  generatedCode: string | null;
  language: string;
  isLoading: boolean;
  isExecuting: boolean; // New: Runtime simulation
  executionOutput: string | null; // New: Simulated Terminal Output
  error: string | null;
  history: { prompt: string; code: string; timestamp: number }[];
}

// --- Global Search Types ---

export interface SearchResultItem {
  id: string;
  title: string;
  description: string;
  type: 'NAV' | 'ACTION' | 'QUERY';
  meta?: {
    targetMode?: string; // e.g., 'CODE_STUDIO'
    actionType?: string; // e.g., 'GENERATE_IMAGE'
    payload?: any;
  };
}

export interface GlobalSearchState {
  query: string;
  results: SearchResultItem[];
  isSearching: boolean;
  isOpen: boolean;
}

// -----------------------------------------

export interface ProcessState {
  prompt: string; // Deprecated in UI, keeping for compatibility
  governance: GovernanceSchema;
  artifacts: ArtifactNode[];
  isLoading: boolean;
  generatedCode: string;
  chatHistory: Message[];
  audioUrl: string | null;
  error: string | null;
  autopoieticFramework: AutopoieticFramework | null; // Added
}

export interface ImageGenState {
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  generatedImage: GeneratedImage | null;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardState {
  identityUrl: string | null;
  referenceImage: FileData | null;
  isGenerating: boolean;
}

export interface AnalysisResult {
  sustainer: string;
  destroyer: string;
  extractor: string;
  insight: string;
  // Quantitative Metrics (0-100)
  scores: {
    centralization: number;
    entropy: number;
    vitality: number;
    opacity: number;
    adaptability: number;
  };
  // Strategic Analysis
  vectors: {
    mechanism: string; // "Regulatory Capture"
    vulnerability: string; // "Public Trust Erosion"
  }[];
}

export type IntentAction = 
  | 'NAVIGATE'
  | 'CONFIGURE_GOVERNANCE'
  | 'CONFIGURE_IMAGE'
  | 'ANALYZE_POWER'
  | 'GENERATE_CODE'
  | 'HARDWARE_SEARCH'
  | 'ACTIVATE_VOICE';

export interface UserIntent {
  action: IntentAction;
  target?: string;
  parameters?: Record<string, any>;
  reasoning?: string;
}