/**
 * VOICE NEXUS
 *
 * Universal multi-provider voice architecture.
 * Seamlessly routes between STT, reasoning, and TTS providers.
 *
 * @example
 * ```typescript
 * import { createVoiceNexus, type ReasoningProvider } from '@antigravity/voice-nexus';
 *
 * // Define your reasoning provider
 * const myReasoning: ReasoningProvider = {
 *     name: 'openai',
 *     models: { fast: 'gpt-3.5-turbo', balanced: 'gpt-4', deep: 'gpt-4-turbo' },
 *     isAvailable: () => true,
 *     generate: async (prompt, config) => {
 *         // Your LLM call here
 *         return { text: response, model: config.model || 'gpt-4' };
 *     }
 * };
 *
 * // Create Voice Nexus instance
 * const nexus = createVoiceNexus({
 *     config: {
 *         mode: 'turn-based',
 *         knowledgeInjection: false,
 *         providers: {
 *             reasoning: myReasoning
 *         }
 *     },
 *     events: {
 *         onTranscriptUpdate: (t) => console.log(`[${t.role}] ${t.text}`),
 *         onComplexityAnalyzed: (c) => console.log(`Complexity: ${c.score.toFixed(2)}`)
 *     }
 * });
 *
 * // Process text input
 * const response = await nexus.processTextInput('How do I implement authentication?');
 * console.log(response?.text);
 * ```
 */

// Types
export type {
    // Core configuration
    VoiceNexusConfig,
    VoiceNexusState,
    VoiceNexusOptions,
    VoiceNexusEvents,
    VoiceMode,
    ReasoningTier,

    // Transcripts
    Transcript,
    PartialTranscript,

    // Provider interfaces
    STTProvider,
    TTSProvider,
    TTSSettings,
    VoiceConfig,
    ReasoningProvider,
    ReasoningConfig,
    ReasoningResult,

    // Complexity
    ComplexitySignals,
    ComplexityResult,
    ProviderSelection,

    // Knowledge
    SearchResult,
    Finding,
    KnowledgeContext,
    KnowledgeInjectorConfig,
    KnowledgeInjector,

    // Audio
    AudioConfig,
    FrequencyData,

    // VAD (Voice Activity Detection)
    VADState,
    VADOptions,
    VADEvents,
    VADProvider,

    // Tools
    VoiceToolCall,
    VoiceToolResult,
    VoiceToolHandler
} from './types';

// Complexity Router
export {
    analyzeComplexity,
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    selectProviders,
    hasExplicitOverride,
    formatComplexityResult,
    STANDARD_THRESHOLDS,
    ELITE_THRESHOLDS
} from './router';

// Orchestrator
export {
    VoiceNexusOrchestrator,
    createVoiceNexus,
    createMinimalVoiceNexus
} from './orchestrator';

// Default export
export { default } from './orchestrator';
