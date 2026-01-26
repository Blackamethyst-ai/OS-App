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
// Health Check System
// =============================================================================

export {
    voiceHealthCheck,
    checkVoiceSystemHealth,
    formatHealthReport,
    isVoiceSystemViable,
} from './healthCheck';

export type {
    ProviderHealth,
    ProviderHealthStatus,
    VoiceSystemHealth,
} from './healthCheck';

// =============================================================================
// Pre-flight Check
// =============================================================================

export {
    runPreflightCheck,
    formatPreflightResult,
    canStartVoice,
} from './preflightCheck';

export type { PreflightResult } from './preflightCheck';

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
    // Configuration API
    getRouterConfig,
    updateRouterConfig,
    resetToEliteConfig,
    switchToStandardConfig,
    setThresholds,
    getThresholds,
} from './complexityRouter';

export type { ComplexityRouterConfig } from './complexityRouter';

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
// Mode Handlers
// =============================================================================

export {
    realtimeMode,
    hybridMode,
    browserMode,
    getModeHandler,
    getBestAvailableMode,
    getAvailableModes,
} from './modes';

export type { ModeHandler, ModeContext } from './modes';

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
