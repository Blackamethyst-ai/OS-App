/**
 * VOICE NEXUS - Orchestrator
 *
 * Main coordinator for multi-provider voice processing.
 * Routes through STT → Complexity Analysis → Reasoning → TTS pipeline.
 */

import type {
    VoiceNexusConfig,
    VoiceNexusState,
    VoiceNexusOptions,
    VoiceNexusEvents,
    VoiceMode,
    Transcript,
    PartialTranscript,
    STTProvider,
    TTSProvider,
    ReasoningProvider,
    ReasoningTier,
    KnowledgeInjector,
    KnowledgeContext,
    ComplexityResult
} from './types';
import { analyzeComplexity, hasExplicitOverride } from './router';

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

export class VoiceNexusOrchestrator {
    private config: VoiceNexusConfig;
    private events: VoiceNexusEvents;
    private state: VoiceNexusState;

    // Providers
    private sttProvider?: STTProvider;
    private ttsProvider?: TTSProvider;
    private reasoningProvider?: ReasoningProvider;
    private knowledgeInjector?: KnowledgeInjector;

    // Audio context for playback
    private audioContext?: AudioContext;
    private transcriptIdCounter = 0;

    constructor(options: VoiceNexusOptions) {
        this.config = options.config;
        this.events = options.events || {};
        this.knowledgeInjector = options.knowledgeInjector;

        // Initialize state
        this.state = {
            mode: options.config.mode,
            isActive: false,
            isProcessing: false,
            currentProvider: {
                stt: options.config.providers?.stt?.name || 'none',
                reasoning: options.config.providers?.reasoning?.name || 'none',
                tts: options.config.providers?.tts?.name || 'none'
            },
            transcripts: [],
            lastComplexityScore: 0,
            knowledgeContext: null,
            error: null
        };

        // Set up providers
        if (options.config.providers) {
            this.sttProvider = options.config.providers.stt;
            this.ttsProvider = options.config.providers.tts;
            this.reasoningProvider = options.config.providers.reasoning;
        }
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Start voice session
     */
    async start(): Promise<void> {
        try {
            // Initialize audio context
            this.audioContext = new AudioContext();

            // Start STT if available
            if (this.sttProvider?.startStreaming) {
                await this.sttProvider.startStreaming((text) => {
                    this.handlePartialTranscript({ role: 'user', text });
                });
            }

            this.updateState({ isActive: true, error: null });
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Stop voice session
     */
    async stop(): Promise<void> {
        try {
            if (this.sttProvider?.stopStreaming) {
                await this.sttProvider.stopStreaming();
            }

            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = undefined;
            }

            this.updateState({ isActive: false });
        } catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Process voice input (turn-based mode)
     */
    async processVoiceInput(audio: Blob): Promise<Transcript | null> {
        if (!this.sttProvider) {
            this.handleError(new Error('No STT provider configured'));
            return null;
        }

        try {
            this.updateState({ isProcessing: true });
            this.events.onProcessingStart?.();

            // 1. Speech-to-Text
            const userText = await this.sttProvider.transcribe(audio);
            const userTranscript = this.createTranscript('user', userText);
            this.addTranscript(userTranscript);

            // 2. Process text
            const responseTranscript = await this.processTextInput(userText);

            this.updateState({ isProcessing: false });
            this.events.onProcessingEnd?.();

            return responseTranscript;
        } catch (error) {
            this.updateState({ isProcessing: false });
            this.handleError(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }

    /**
     * Process text input directly
     */
    async processTextInput(text: string): Promise<Transcript | null> {
        const startTime = Date.now();

        try {
            this.updateState({ isProcessing: true });

            // 1. Analyze complexity
            const thresholds = this.config.complexity ? {
                balanced: this.config.complexity.balancedThreshold ?? 0.25,
                deep: this.config.complexity.deepThreshold ?? 0.55
            } : undefined;
            const complexity = analyzeComplexity(text, thresholds);
            this.updateState({ lastComplexityScore: complexity.score });
            this.events.onComplexityAnalyzed?.(complexity);

            // Check for explicit override
            const override = hasExplicitOverride(text);
            const tier: ReasoningTier = override.hasOverride ? override.tier! : complexity.tier;

            // 2. Inject knowledge if enabled
            let enrichedText = text;
            if (this.config.knowledgeInjection && this.knowledgeInjector?.isAvailable()) {
                const knowledge = await this.knowledgeInjector.injectContext(
                    text,
                    this.config.agent?.expertise
                );
                enrichedText = `${knowledge.injectedPrompt}\n\nUser Query: ${text}`;
                this.updateState({ knowledgeContext: knowledge.injectedPrompt });
                this.events.onKnowledgeInjected?.(knowledge);
            }

            // 3. Generate reasoning response
            if (!this.reasoningProvider) {
                throw new Error('No reasoning provider configured');
            }

            const reasoningResult = await this.reasoningProvider.generate(enrichedText, {
                tier,
                systemPrompt: this.buildSystemPrompt()
            });

            // 4. Create response transcript
            const responseTranscript = this.createTranscript('model', reasoningResult.text, {
                complexity: complexity.score,
                provider: reasoningResult.model,
                knowledgeUsed: this.config.knowledgeInjection,
                latencyMs: Date.now() - startTime
            });

            this.addTranscript(responseTranscript);

            // 5. Synthesize speech if TTS available
            if (this.ttsProvider?.isAvailable()) {
                const voiceId = this.ttsProvider.getVoiceForAgent(this.config.agent?.name || 'default');
                const audioBuffer = await this.ttsProvider.synthesize(reasoningResult.text, voiceId);
                await this.playAudio(audioBuffer);
            }

            this.updateState({ isProcessing: false });
            return responseTranscript;

        } catch (error) {
            this.updateState({ isProcessing: false });
            this.handleError(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }

    /**
     * Set voice mode
     */
    setMode(mode: VoiceMode): void {
        this.config.mode = mode;
        this.updateState({ mode });
    }

    /**
     * Get current state
     */
    getState(): VoiceNexusState {
        return { ...this.state };
    }

    /**
     * Get transcripts
     */
    getTranscripts(): Transcript[] {
        return [...this.state.transcripts];
    }

    /**
     * Clear transcripts
     */
    clearTranscripts(): void {
        this.state.transcripts = [];
        this.updateState({});
    }

    // =========================================================================
    // Provider Management
    // =========================================================================

    /**
     * Set STT provider
     */
    setSTTProvider(provider: STTProvider): void {
        this.sttProvider = provider;
        this.updateState({
            currentProvider: {
                ...this.state.currentProvider,
                stt: provider.name
            }
        });
        this.events.onProviderSwitch?.({ stt: provider.name });
    }

    /**
     * Set TTS provider
     */
    setTTSProvider(provider: TTSProvider): void {
        this.ttsProvider = provider;
        this.updateState({
            currentProvider: {
                ...this.state.currentProvider,
                tts: provider.name
            }
        });
        this.events.onProviderSwitch?.({ tts: provider.name });
    }

    /**
     * Set reasoning provider
     */
    setReasoningProvider(provider: ReasoningProvider): void {
        this.reasoningProvider = provider;
        this.updateState({
            currentProvider: {
                ...this.state.currentProvider,
                reasoning: provider.name
            }
        });
        this.events.onProviderSwitch?.({ reasoning: provider.name });
    }

    /**
     * Set knowledge injector
     */
    setKnowledgeInjector(injector: KnowledgeInjector): void {
        this.knowledgeInjector = injector;
    }

    // =========================================================================
    // Internal Methods
    // =========================================================================

    private createTranscript(
        role: 'user' | 'model' | 'system',
        text: string,
        extras: Partial<Transcript> = {}
    ): Transcript {
        return {
            id: `transcript-${++this.transcriptIdCounter}`,
            role,
            text,
            timestamp: Date.now(),
            ...extras
        };
    }

    private addTranscript(transcript: Transcript): void {
        this.state.transcripts.push(transcript);
        this.events.onTranscriptUpdate?.(transcript);
    }

    private handlePartialTranscript(partial: PartialTranscript): void {
        this.events.onPartialTranscript?.(partial);
    }

    private updateState(update: Partial<VoiceNexusState>): void {
        this.state = { ...this.state, ...update };
        this.events.onStateChange?.(this.state);
    }

    private handleError(error: Error): void {
        this.updateState({ error: error.message });
        this.events.onError?.(error);
    }

    private buildSystemPrompt(): string {
        const agent = this.config.agent;
        let prompt = 'You are a helpful voice assistant.';

        if (agent) {
            prompt = `You are ${agent.name}, a voice assistant`;
            if (agent.expertise?.length) {
                prompt += ` with expertise in: ${agent.expertise.join(', ')}`;
            }
            prompt += '.';
        }

        prompt += '\n\nRespond conversationally and concisely, as this will be spoken aloud.';
        return prompt;
    }

    private async playAudio(buffer: ArrayBuffer): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }

        const audioBuffer = await this.audioContext.decodeAudioData(buffer);
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start();
    }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Voice Nexus instance
 */
export function createVoiceNexus(options: VoiceNexusOptions): VoiceNexusOrchestrator {
    return new VoiceNexusOrchestrator(options);
}

/**
 * Create with minimal configuration
 */
export function createMinimalVoiceNexus(
    reasoningProvider: ReasoningProvider,
    events?: VoiceNexusEvents
): VoiceNexusOrchestrator {
    return new VoiceNexusOrchestrator({
        config: {
            mode: 'turn-based',
            knowledgeInjection: false,
            providers: {
                reasoning: reasoningProvider
            }
        },
        events
    });
}

export default VoiceNexusOrchestrator;
