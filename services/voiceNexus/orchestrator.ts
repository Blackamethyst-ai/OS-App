/**
 * VOICE NEXUS - Orchestrator
 *
 * Central coordinator for the multi-provider voice architecture.
 * Routes queries to optimal providers based on complexity analysis.
 *
 * Voice Modes:
 *   - REALTIME: Gemini Live end-to-end (fastest, ~500ms)
 *   - TURN-BASED: STT → Claude → ElevenLabs (highest quality, ~3-4s)
 *   - HYBRID: Auto-routes based on complexity (default)
 */

import type {
    VoiceNexusConfig,
    VoiceNexusState,
    VoiceNexusOptions,
    VoiceNexusEvents,
    VoiceMode,
    Transcript,
    PartialTranscript,
    KnowledgeContext,
    ReasoningTier,
    VoiceToolHandler,
    ProviderSelection,
} from './types';
import type { HiveAgent, MentalState } from '../../types/domain/agents';

// Providers
import { geminiLiveSTT } from './providers/stt/geminiLive';
import { browserSTT } from './providers/stt/browserSTT';
import { claudeReasoning } from './providers/reasoning/claudeReasoning';
import { geminiReasoning } from './providers/reasoning/geminiReasoning';
import { elevenLabsTTS } from './providers/tts/elevenLabsTTS';
import { browserTTS } from './providers/tts/browserTTS';
import type { STTProvider } from './types';

// Utilities
import { analyzeComplexity, hasExplicitOverride, formatComplexityResult } from './complexityRouter';
import { interpretIntent } from '../geminiService';
import { knowledgeInjector } from './knowledgeInjector';

// Existing services
import { liveSession } from '../liveSession';
import type { LiveServerMessage } from '@google/genai';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: VoiceNexusConfig = {
    mode: 'hybrid',
    sttProvider: 'gemini',
    reasoningProvider: 'auto',
    ttsProvider: 'elevenlabs',
    knowledgeInjection: true,
    agent: {
        id: 'mike',
        name: 'Mike',
        gender: 'male',
        voice: 'Puck',
        systemPrompt: 'You are a helpful AI assistant.',
    },
    mentalState: {
        skepticism: 50,
        excitement: 50,
        alignment: 50,
    },
};

// =============================================================================
// Orchestrator Class
// =============================================================================

export class VoiceNexusOrchestrator {
    private config: VoiceNexusConfig;
    private state: VoiceNexusState;
    private events: VoiceNexusEvents;
    private transcripts: Transcript[] = [];
    private toolHandler: VoiceToolHandler | null = null;
    private sttProvider: STTProvider;

    constructor(options: Partial<VoiceNexusOptions> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...options.config };
        this.events = options.events || {};
        this.toolHandler = options.events?.onToolCall || null;

        // Select STT provider based on config and availability
        this.sttProvider = this.selectSTTProvider();

        this.state = {
            mode: this.config.mode,
            isActive: false,
            isProcessing: false,
            currentProvider: {
                stt: this.sttProvider.name === 'browser-stt' ? 'browser' : this.config.sttProvider,
                reasoning: this.config.reasoningProvider,
                tts: this.config.ttsProvider,
            },
            transcripts: [],
            lastComplexityScore: 0,
            knowledgeContext: null,
            error: null,
        };
    }

    /**
     * Select the best available STT provider
     */
    private selectSTTProvider(): STTProvider {
        // If browser is explicitly requested, use it
        if (this.config.sttProvider === 'browser') {
            if (import.meta.env.DEV) console.log('VoiceNexus: Using browser STT (configured)');
            return browserSTT;
        }

        // If Gemini is requested and available, use it
        if (this.config.sttProvider === 'gemini' && geminiLiveSTT.isAvailable()) {
            if (import.meta.env.DEV) console.log('VoiceNexus: Using Gemini Live STT');
            return geminiLiveSTT;
        }

        // Fallback to browser STT
        if (browserSTT.isAvailable()) {
            if (import.meta.env.DEV) console.log('VoiceNexus: Falling back to browser STT');
            return browserSTT;
        }

        // Last resort: return Gemini even if not available (will error on use)
        console.warn('VoiceNexus: No STT provider available');
        return geminiLiveSTT;
    }

    /**
     * Get the current STT provider
     */
    getSTTProvider(): STTProvider {
        return this.sttProvider;
    }

    /**
     * Check if browser STT is being used
     */
    isUsingBrowserSTT(): boolean {
        return this.sttProvider.name === 'browser-stt';
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Start a voice session
     */
    async start(): Promise<void> {
        if (this.state.isActive) {
            console.warn('VoiceNexus: Session already active');
            return;
        }

        try {
            this.state.isActive = true;
            this.state.error = null;

            // Determine which mode to use
            if (this.config.mode === 'realtime' && !this.isUsingBrowserSTT()) {
                await this.startRealtimeMode();
            } else if (this.isUsingBrowserSTT()) {
                // Browser STT mode - works without Gemini
                await this.startBrowserMode();
            } else {
                // For turn-based and hybrid, we still use Gemini Live for STT
                // but route the response through different providers
                await this.startHybridMode();
            }
        } catch (error) {
            this.state.isActive = false;
            this.state.error = error instanceof Error ? error.message : 'Failed to start';
            this.events.onError?.(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Stop the voice session
     */
    stop(): void {
        // Stop browser STT if active
        if (this.isUsingBrowserSTT() && browserSTT.isCurrentlyStreaming()) {
            browserSTT.stopStreaming().catch(console.error);
        }

        // Stop Gemini Live session
        liveSession.disconnect();

        this.state.isActive = false;
        this.state.isProcessing = false;
    }

    /**
     * Process a text input (for turn-based mode or testing)
     */
    async processText(text: string): Promise<string> {
        this.state.isProcessing = true;
        this.events.onProcessingStart?.();

        try {
            // 1. Analyze complexity
            const complexityResult = analyzeComplexity(text);
            this.state.lastComplexityScore = complexityResult.score;

            if (import.meta.env.DEV) console.log(`VoiceNexus: ${formatComplexityResult(complexityResult)}`);

            // 2. Check for explicit overrides
            const override = hasExplicitOverride(text);
            const tier = override.override ? override.tier! : complexityResult.tier;

            // 3. Select providers based on mode and complexity
            const providers = this.selectProviders(tier);

            // 4. Inject knowledge if enabled
            let enrichedPrompt = text;
            if (this.config.knowledgeInjection) {
                const context = await knowledgeInjector.injectContext(text, this.config.agent);
                enrichedPrompt = context.injectedPrompt;
                this.state.knowledgeContext = context.injectedPrompt;
                this.events.onKnowledgeInjected?.(context);
            }

            // 4.5. Detect and execute intents (Parallel Action Layer)
            this.detectAndExecuteIntents(text).catch(err => console.warn('Intent detection warning:', err));

            // 5. Generate response
            const response = await this.generateResponse(enrichedPrompt, providers, tier);

            // 6. Store transcript
            const transcript = this.createTranscript('model', response, complexityResult.score, providers.reasoning);
            this.addTranscript(transcript);

            // 7. Synthesize speech (if not in realtime mode)
            if (this.config.mode !== 'realtime') {
                await this.synthesizeSpeech(response, providers.tts);
            }

            return response;
        } finally {
            this.state.isProcessing = false;
            this.events.onProcessingEnd?.();
        }
    }

    /**
     * Switch to a different agent
     */
    async switchAgent(agent: HiveAgent): Promise<void> {
        this.config.agent = agent;

        // If session is active, reconnect with new agent
        if (this.state.isActive) {
            this.stop();
            await this.start();
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<VoiceNexusConfig>): void {
        this.config = { ...this.config, ...config };

        if (config.mode) {
            this.state.mode = config.mode;
        }
    }

    /**
     * Set voice mode
     */
    setMode(mode: VoiceMode): void {
        this.config.mode = mode;
        this.state.mode = mode;
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
        return [...this.transcripts];
    }

    /**
     * Clear transcripts
     */
    clearTranscripts(): void {
        this.transcripts = [];
        this.state.transcripts = [];
    }

    /**
     * Get frequency data for visualization
     */
    getFrequencyData(): { input: Uint8Array | null; output: Uint8Array | null } {
        return {
            input: liveSession.getInputFrequencies(),
            output: liveSession.getOutputFrequencies(),
        };
    }

    // =========================================================================
    // Private Methods - Mode Initialization
    // =========================================================================

    /**
     * Start realtime mode (Gemini Live end-to-end)
     */
    private async startRealtimeMode(): Promise<void> {
        const systemPrompt = this.buildSystemPrompt();

        await liveSession.connect(this.config.agent.name, {
            systemInstruction: systemPrompt,
            tools: this.buildTools(),
            callbacks: {
                onopen: () => {
                    if (import.meta.env.DEV) console.log('VoiceNexus: Realtime session connected');
                },
                onmessage: async (message: LiveServerMessage) => {
                    await this.handleRealtimeMessage(message);
                },
                onerror: (error: Error) => {
                    this.state.error = error.message;
                    this.events.onError?.(error);
                },
                onclose: () => {
                    this.state.isActive = false;
                },
            },
        });

        // Set up agent switch handler
        liveSession.onAgentSwitch = (agentName: string) => {
            if (import.meta.env.DEV) console.log(`VoiceNexus: Switching to agent ${agentName}`);
            // Agent switch is handled by VoiceManager in the component layer
        };
    }

    /**
     * Start hybrid mode (Gemini STT → Claude/Gemini → ElevenLabs)
     */
    private async startHybridMode(): Promise<void> {
        // Check if we should use browser STT instead
        if (this.isUsingBrowserSTT()) {
            if (import.meta.env.DEV) console.log('VoiceNexus: Using browser STT for hybrid mode');
            await this.startBrowserMode();
            return;
        }

        // For hybrid mode, we use Gemini Live for STT only
        // Then route through the complexity router for reasoning
        const systemPrompt = `You are a voice assistant. Your ONLY job is to listen and transcribe what the user says.
After transcription, another system will generate the response. Do not respond conversationally.
Simply acknowledge with "[TRANSCRIBED]" after capturing user speech.`;

        await liveSession.connect(this.config.agent.name, {
            systemInstruction: systemPrompt,
            tools: this.buildTools(),
            callbacks: {
                onopen: () => {
                    if (import.meta.env.DEV) console.log('VoiceNexus: Hybrid session connected');
                },
                onmessage: async (message: LiveServerMessage) => {
                    await this.handleHybridMessage(message);
                },
                onerror: (error: Error) => {
                    this.state.error = error.message;
                    this.events.onError?.(error);
                },
                onclose: () => {
                    this.state.isActive = false;
                },
            },
        });
    }

    /**
     * Start browser mode (Web Speech API STT → Claude/Gemini → ElevenLabs)
     * Used when Gemini Live is unavailable or browser STT is preferred
     */
    private async startBrowserMode(): Promise<void> {
        if (!browserSTT.isAvailable()) {
            throw new Error('Browser STT (Web Speech API) is not available in this browser');
        }

        if (import.meta.env.DEV) console.log('VoiceNexus: Starting browser STT mode');
        this.state.currentProvider.stt = 'browser';
        this.events.onProviderSwitch?.({ stt: 'browser' });

        let lastProcessedTranscript = '';
        let processingTimeout: NodeJS.Timeout | null = null;

        await browserSTT.startStreaming((transcript) => {
            // Emit partial transcript
            this.events.onPartialTranscript?.({ role: 'user', text: transcript });

            // Clear previous processing timeout
            if (processingTimeout) {
                clearTimeout(processingTimeout);
            }

            // Wait for pause in speech before processing (debounce)
            processingTimeout = setTimeout(async () => {
                // Only process if transcript changed significantly
                if (transcript.length > lastProcessedTranscript.length + 5) {
                    const newText = transcript.slice(lastProcessedTranscript.length).trim();

                    if (newText.length > 3) {
                        // Create user transcript
                        const userTranscript = this.createTranscript('user', newText);
                        this.addTranscript(userTranscript);

                        // Process through reasoning pipeline
                        try {
                            await this.processText(newText);
                            lastProcessedTranscript = transcript;
                        } catch (error) {
                            console.error('VoiceNexus: Error processing browser transcript:', error);
                        }
                    }
                }
            }, 1500); // 1.5 second pause triggers processing
        });
    }

    // =========================================================================
    // Private Methods - Message Handling
    // =========================================================================

    /**
     * Handle messages in realtime mode
     */
    private async handleRealtimeMessage(message: LiveServerMessage): Promise<void> {
        // Handle tool calls
        if (message.toolCall && this.toolHandler) {
            for (const fc of message.toolCall.functionCalls) {
                await this.toolHandler(fc.name, fc.args);
            }
        }

        // Handle transcripts
        const parts = message.serverContent?.modelTurn?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.text) {
                    const transcript = this.createTranscript('model', part.text);
                    this.addTranscript(transcript);
                }
            }
        }

        // Handle input transcription (user speech)
        const inputTranscript = (message as any).serverContent?.inputTranscription;
        if (inputTranscript) {
            const transcript = this.createTranscript('user', inputTranscript);
            this.addTranscript(transcript);
        }
    }

    /**
     * Handle messages in hybrid mode
     */
    private async handleHybridMessage(message: LiveServerMessage): Promise<void> {
        // In hybrid mode, we capture the user's transcribed speech
        // and route it through our complexity-based system
        const inputTranscript = (message as any).serverContent?.inputTranscription;

        if (inputTranscript && inputTranscript.length > 5) {
            // Create user transcript
            const userTranscript = this.createTranscript('user', inputTranscript);
            this.addTranscript(userTranscript);

            // Process through our pipeline
            try {
                await this.processText(inputTranscript);
            } catch (error) {
                console.error('VoiceNexus: Error processing hybrid message:', error);
            }
        }
    }

    // =========================================================================
    // Private Methods - Provider Selection & Generation
    // =========================================================================

    /**
     * Select providers based on mode and complexity tier
     */
    private selectProviders(tier: ReasoningTier): ProviderSelection {
        // In realtime mode, always use Gemini
        if (this.config.mode === 'realtime') {
            return {
                reasoning: 'gemini-flash',
                tts: 'gemini',
                reasoningTier: 'fast',
            };
        }

        // In turn-based mode, always use Claude + ElevenLabs
        if (this.config.mode === 'turn-based') {
            return {
                reasoning: tier === 'fast' ? 'claude-haiku' : 'claude-sonnet',
                tts: 'elevenlabs',
                reasoningTier: tier,
            };
        }

        // Hybrid mode: route based on complexity
        // UPDATED: Upgrade all tiers to use ElevenLabs if available per user request for "SOTA" experience
        switch (tier) {
            case 'fast':
                return {
                    // Upgrade low-complexity queries to Sonnet so they still feel smart
                    reasoning: 'claude-sonnet',
                    // accurate TTS is better than fast-but-robotic TTS
                    tts: elevenLabsTTS.isAvailable() ? 'elevenlabs' : 'browser',
                    reasoningTier: 'fast',
                };

            case 'balanced':
                return {
                    reasoning: 'claude-sonnet',
                    tts: elevenLabsTTS.isAvailable() ? 'elevenlabs' : 'browser',
                    reasoningTier: 'balanced',
                };

            case 'deep':
                return {
                    reasoning: 'claude-opus',
                    tts: elevenLabsTTS.isAvailable() ? 'elevenlabs' : 'browser',
                    reasoningTier: 'deep',
                };
        }
    }

    /**
     * Detect and execute intents from user text
     */
    private async detectAndExecuteIntents(text: string): Promise<void> {
        if (!this.toolHandler) return;

        try {
            const intent = await interpretIntent(text);
            if (!intent || !intent.action) return;

            console.log('[VoiceNexus] Analyzed Intent:', intent);

            if (intent.action === 'NAVIGATE' && intent.target) {
                await this.toolHandler('navigate', { destination: intent.target });
            } else if (intent.action === 'SWITCH_AGENT' && intent.target) {
                await this.toolHandler('switch_agent', { agentName: intent.target });
            }
        } catch (error) {
            // Non-blocking error
        }
    }

    /**
     * Generate response using selected provider
     */
    private async generateResponse(
        prompt: string,
        providers: ProviderSelection,
        tier: ReasoningTier
    ): Promise<string> {
        // Update state with current provider
        this.state.currentProvider.reasoning = providers.reasoning;
        this.events.onProviderSwitch?.({ reasoning: providers.reasoning });

        const systemPrompt = this.buildSystemPrompt();

        // Route to appropriate provider
        if (providers.reasoning.startsWith('claude')) {
            try {
                const result = await claudeReasoning.generate(prompt, {
                    tier,
                    systemPrompt,
                });
                return result.text;
            } catch (error) {
                console.warn('VoiceNexus: Claude reasoning failed, falling back to Gemini:', error);
                // Fallback to Gemini
                this.state.currentProvider.reasoning = 'gemini-fallback';
                this.events.onProviderSwitch?.({ reasoning: 'gemini-fallback' });
            }
        }

        // Default to Gemini (or fallback execution)
        try {
            const result = await geminiReasoning.generate(prompt, {
                tier,
                systemPrompt,
            });
            return result.text;
        } catch (error: any) {
            console.error('VoiceNexus: All reasoning providers failed:', error);
            const msg = error.message || String(error);

            if (msg.includes('429') || msg.includes('Quota')) {
                throw new Error('API Rate Limit Exceeded. Please wait a minute and try again.');
            }

            throw new Error('I could not generate a response. Please check your API usage or keys.');
        }
    }

    /**
     * Synthesize speech using selected TTS provider
     */
    private async synthesizeSpeech(text: string, ttsProvider: string): Promise<void> {
        // Update state
        this.state.currentProvider.tts = ttsProvider as any;
        this.events.onProviderSwitch?.({ tts: ttsProvider });

        const voiceName = this.config.agent.name;

        try {
            if (ttsProvider === 'elevenlabs' && elevenLabsTTS.isAvailable()) {
                await elevenLabsTTS.synthesizeAndPlay(text, voiceName);
            } else if (ttsProvider === 'browser' || !elevenLabsTTS.isAvailable()) {
                await browserTTS.speak(text, voiceName);
            }
            // For 'gemini' TTS, it's handled by the Gemini Live stream
        } catch (error) {
            console.error('TTS synthesis failed, falling back to browser:', error);
            await browserTTS.speak(text, voiceName);
        }
    }

    // =========================================================================
    // Private Methods - Utilities
    // =========================================================================

    /**
     * Build system prompt for the agent
     */
    private buildSystemPrompt(): string {
        const agent = this.config.agent;
        const { skepticism, excitement, alignment } = this.config.mentalState;

        return `
You are ${agent.name}, an AI agent in a voice conversation.

## Personality
${agent.systemPrompt}

## Current Mental State
- Skepticism: ${skepticism}/100 (${skepticism > 70 ? 'highly critical' : skepticism > 30 ? 'balanced' : 'accepting'})
- Excitement: ${excitement}/100 (${excitement > 70 ? 'enthusiastic' : excitement > 30 ? 'engaged' : 'calm'})
- Alignment: ${alignment}/100 (${alignment > 70 ? 'strongly aligned' : alignment > 30 ? 'neutral' : 'independent'})

## Voice Guidelines
- Keep responses concise and conversational (this will be spoken aloud)
- Avoid bullet points, numbered lists, or markdown formatting
- Be natural and flowing in your speech
- Answer directly, then elaborate if needed

${agent.expertise?.length ? `## Expertise Areas\n${agent.expertise.join(', ')}` : ''}
        `.trim();
    }

    /**
     * Build tool declarations
     */
    private buildTools(): any[] {
        return [
            {
                functionDeclarations: [
                    {
                        name: 'navigate',
                        description: 'Navigate to a different section of the application',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                destination: {
                                    type: 'STRING',
                                    description: 'The destination to navigate to (e.g., "dashboard", "agents", "settings")',
                                },
                            },
                            required: ['destination'],
                        },
                    },
                    {
                        name: 'switch_agent',
                        description: 'Switch to a different voice agent',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                agentName: {
                                    type: 'STRING',
                                    description: 'The name of the agent to switch to',
                                },
                            },
                            required: ['agentName'],
                        },
                    },
                ],
            },
        ];
    }

    /**
     * Create a transcript entry
     */
    private createTranscript(
        role: 'user' | 'model' | 'system',
        text: string,
        complexity?: number,
        provider?: string
    ): Transcript {
        return {
            id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            role,
            text,
            timestamp: Date.now(),
            complexity,
            provider,
            knowledgeUsed: this.config.knowledgeInjection && role === 'model',
        };
    }

    /**
     * Add transcript and notify listeners
     */
    private addTranscript(transcript: Transcript): void {
        this.transcripts.push(transcript);
        this.state.transcripts = [...this.transcripts];
        this.events.onTranscriptUpdate?.(transcript);
    }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new VoiceNexus orchestrator instance
 */
export function createVoiceNexus(options?: Partial<VoiceNexusOptions>): VoiceNexusOrchestrator {
    return new VoiceNexusOrchestrator(options);
}

// Singleton instance for convenience
export const voiceNexus = new VoiceNexusOrchestrator();
