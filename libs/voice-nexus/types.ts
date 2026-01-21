/**
 * VOICE NEXUS - Type Definitions
 *
 * Universal multi-provider voice architecture types.
 * Provider-agnostic design for seamless integration with any STT, reasoning, or TTS service.
 */

// =============================================================================
// Core Configuration
// =============================================================================

export type VoiceMode = 'realtime' | 'turn-based' | 'hybrid';
export type ReasoningTier = 'fast' | 'balanced' | 'deep';

export interface VoiceNexusConfig {
    /** Voice interaction mode */
    mode: VoiceMode;

    /** Enable knowledge injection from external sources */
    knowledgeInjection: boolean;

    /** Agent context (optional) */
    agent?: {
        id: string;
        name: string;
        expertise?: string[];
    };

    /** Provider configurations (optional - use defaults if not provided) */
    providers?: {
        stt?: STTProvider;
        reasoning?: ReasoningProvider;
        tts?: TTSProvider;
    };

    /** Complexity router configuration */
    complexity?: {
        /** Score threshold for balanced tier (default: 0.3) */
        balancedThreshold?: number;
        /** Score threshold for deep tier (default: 0.7) */
        deepThreshold?: number;
    };
}

export interface VoiceNexusState {
    mode: VoiceMode;
    isActive: boolean;
    isProcessing: boolean;
    currentProvider: {
        stt: string;
        reasoning: string;
        tts: string;
    };
    transcripts: Transcript[];
    lastComplexityScore: number;
    knowledgeContext: string | null;
    error: string | null;
}

// =============================================================================
// Transcript Types
// =============================================================================

export interface Transcript {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    timestamp: number;
    complexity?: number;
    provider?: string;
    knowledgeUsed?: boolean;
    latencyMs?: number;
}

export interface PartialTranscript {
    role: 'user' | 'model';
    text: string;
}

// =============================================================================
// STT Provider Interface
// =============================================================================

export interface STTProvider {
    readonly name: string;
    readonly supportsStreaming: boolean;

    /** Transcribe audio blob to text */
    transcribe(audio: Blob): Promise<string>;

    /** Start streaming transcription (if supported) */
    startStreaming?(onPartial: (text: string) => void): Promise<void>;

    /** Stop streaming and get final transcription */
    stopStreaming?(): Promise<string>;

    /** Check if provider is configured and available */
    isAvailable(): boolean;
}

// =============================================================================
// TTS Provider Interface
// =============================================================================

export interface VoiceConfig {
    id: string;
    name: string;
    gender: 'male' | 'female' | 'neutral';
    description?: string;
    language?: string;
}

export interface TTSSettings {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
    pitch?: number;
}

export interface TTSProvider {
    readonly name: string;
    readonly supportsStreaming: boolean;
    readonly voices: VoiceConfig[];

    /** Synthesize text to audio buffer */
    synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer>;

    /** Stream synthesis (if supported) - returns immediately playable chunks */
    synthesizeStream?(text: string, voice: string, onChunk: (chunk: ArrayBuffer) => void): Promise<void>;

    /** Get voice ID from agent name */
    getVoiceForAgent(agentName: string): string;

    /** Check if provider is configured and available */
    isAvailable(): boolean;
}

// =============================================================================
// Reasoning Provider Interface
// =============================================================================

export interface ReasoningConfig {
    tier: ReasoningTier;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    model?: string;
}

export interface ReasoningResult {
    text: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
}

export interface ReasoningProvider {
    readonly name: string;
    readonly models: { fast: string; balanced: string; deep: string };

    /** Generate a response */
    generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult>;

    /** Check if provider is configured and available */
    isAvailable(): boolean;
}

// =============================================================================
// Complexity Scoring
// =============================================================================

export interface ComplexitySignals {
    tokenCount: number;
    hasCodeIndicators: boolean;
    hasReasoningIndicators: boolean;
    hasCreativeIndicators: boolean;
    hasNavigationIndicators: boolean;
    hasQuestionIndicators: boolean;
    domainComplexity: number;
}

export interface ComplexityResult {
    score: number;
    tier: ReasoningTier;
    signals: ComplexitySignals;
    recommendedProvider: {
        reasoning: string;
        tts: string;
    };
}

// =============================================================================
// Knowledge Injection
// =============================================================================

export interface SearchResult {
    content: string;
    similarity: number;
    category?: string;
    tags?: string[];
}

export interface Finding {
    type: string;
    content: string;
    source?: string;
}

export interface KnowledgeContext {
    searchResults: SearchResult[];
    findings?: Finding[];
    agentExpertise?: string[];
    injectedPrompt: string;
}

export interface KnowledgeInjectorConfig {
    maxSearchResults?: number;
    maxFindings?: number;
    includeFindingTypes?: string[];
    includeAgentExpertise?: boolean;
}

export interface KnowledgeInjector {
    /** Search and inject relevant knowledge */
    injectContext(query: string, agentExpertise?: string[]): Promise<KnowledgeContext>;

    /** Check if injector is available */
    isAvailable(): boolean;
}

// =============================================================================
// Audio Processing
// =============================================================================

export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bitDepth: number;
}

export interface FrequencyData {
    input: Uint8Array | null;
    output: Uint8Array | null;
}

// =============================================================================
// Tool Calling
// =============================================================================

export interface VoiceToolCall {
    name: string;
    args: Record<string, unknown>;
}

export interface VoiceToolResult {
    status: 'success' | 'error';
    data?: unknown;
    error?: string;
}

export type VoiceToolHandler = (name: string, args: Record<string, unknown>) => Promise<VoiceToolResult>;

// =============================================================================
// Orchestrator Events
// =============================================================================

export interface VoiceNexusEvents {
    onTranscriptUpdate?: (transcript: Transcript) => void;
    onPartialTranscript?: (partial: PartialTranscript) => void;
    onProcessingStart?: () => void;
    onProcessingEnd?: () => void;
    onProviderSwitch?: (providers: { stt?: string; reasoning?: string; tts?: string }) => void;
    onComplexityAnalyzed?: (result: ComplexityResult) => void;
    onError?: (error: Error) => void;
    onKnowledgeInjected?: (context: KnowledgeContext) => void;
    onToolCall?: VoiceToolHandler;
    onStateChange?: (state: VoiceNexusState) => void;
}

// =============================================================================
// Orchestrator Options
// =============================================================================

export interface VoiceNexusOptions {
    config: VoiceNexusConfig;
    events?: VoiceNexusEvents;
    tools?: VoiceToolCall[];
    knowledgeInjector?: KnowledgeInjector;
}

// =============================================================================
// Provider Selection Result
// =============================================================================

export interface ProviderSelection {
    reasoning: string;
    tts: string;
    reasoningTier: ReasoningTier;
}
