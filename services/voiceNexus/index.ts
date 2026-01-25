/**
 * VOICE NEXUS - Main Export
 *
 * Universal multi-provider voice architecture for OS-App.
 * Enables seamless routing between Gemini, Claude, and ElevenLabs.
 *
 * @example
 * ```typescript
 * import { voiceNexus, createVoiceNexus } from './services/voiceNexus';
 *
 * // Use singleton
 * await voiceNexus.start();
 * voiceNexus.setMode('hybrid');
 *
 * // Or create custom instance
 * const myVoice = createVoiceNexus({
 *     config: {
 *         mode: 'turn-based',
 *         knowledgeInjection: true,
 *     },
 *     events: {
 *         onTranscriptUpdate: (t) => console.log(t),
 *     },
 * });
 * ```
 */

// =============================================================================
// Core Exports
// =============================================================================

export { VoiceNexusOrchestrator, voiceNexus, createVoiceNexus } from './orchestrator';
export { knowledgeInjector } from './knowledgeInjector';

// =============================================================================
// Complexity Router
// =============================================================================

export {
    analyzeComplexity,
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    selectProviders,
    selectProvider,
    hasExplicitOverride,
    formatComplexityResult,
} from './complexityRouter';

// =============================================================================
// Providers - STT
// =============================================================================

export { geminiLiveSTT } from './providers/stt/geminiLive';

// =============================================================================
// Providers - Reasoning
// =============================================================================

export { claudeReasoning } from './providers/reasoning/claudeReasoning';
export { geminiReasoning } from './providers/reasoning/geminiReasoning';

// =============================================================================
// Providers - TTS
// =============================================================================

export { elevenLabsTTS } from './providers/tts/elevenLabsTTS';
export { browserTTS } from './providers/tts/browserTTS';

// =============================================================================
// Types
// =============================================================================

export type {
    // Core configuration
    VoiceNexusConfig,
    VoiceNexusState,
    VoiceNexusOptions,
    VoiceNexusEvents,
    VoiceMode,
    STTProviderType,
    ReasoningProviderType,
    TTSProviderType,
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
    KnowledgeContext,
    KnowledgeInjectorConfig,

    // Audio
    AudioConfig,
    FrequencyData,

    // Tools
    VoiceToolCall,
    VoiceToolResult,
    VoiceToolHandler,
} from './types';
// Core Integration
export { getVoiceCore, useVoiceCore, VoiceCore } from '../voiceCoreIntegration';
