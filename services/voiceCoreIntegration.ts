/**
 * VOICE CORE INTEGRATION SERVICE
 *
 * Integrates the Voice Nexus orchestrator with codebase awareness
 * for universal, context-aware voice control throughout the application.
 *
 * Features:
 * - Unified VoiceCore class wrapping orchestrator + codebase awareness
 * - Tool handlers for navigation and actions
 * - State management with subscription pattern
 * - React hook for component integration
 * - Debug utilities for development
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { VoiceNexusOrchestrator, createVoiceNexus } from './voiceNexus/orchestrator';
import { codebaseAwareness, type NavigationMatch } from './codebaseAwareness';
import { browserSTT } from './voiceNexus/providers/stt/browserSTT';
import { elevenLabsTTS } from './voiceNexus/providers/tts/elevenLabsTTS';
import { browserTTS } from './voiceNexus/providers/tts/browserTTS';
import { analyzeComplexity } from './voiceNexus/complexityRouter';
import { checkVoiceSystemHealth, formatHealthReport, isVoiceSystemViable } from './voiceNexus/healthCheck';
import type { VoiceSystemHealth } from './voiceNexus/healthCheck';
import type { VoiceNexusState, Transcript, VoiceNexusEvents } from './voiceNexus/types';
import type { HiveAgent, MentalState } from '../types/domain/agents';
import { AppMode } from '../types';
import { apiKeyService } from './apiKeyService';
import { createLogger } from './logger';

const log = createLogger('VoiceCore');

// =============================================================================
// Types
// =============================================================================

export interface VoiceCoreConfig {
    sttProvider: 'browser' | 'gemini' | 'auto';
    ttsProvider: 'elevenlabs' | 'browser' | 'auto';
    enableCodebaseAwareness: boolean;
    enableKnowledgeInjection: boolean;
    debugMode: boolean;
}

export interface VoiceCoreState {
    isListening: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    currentTranscript: string;
    lastResponse: string;
    error: string | null;
    sttProvider: string;
    ttsProvider: string;
    complexityScore: number;
    currentMode: AppMode | null;
}

export type VoiceCoreListener = (state: VoiceCoreState) => void;

export interface NavigationResult {
    success: boolean;
    mode?: AppMode;
    route?: string;
    subtab?: string;
    error?: string;
}

export interface VoiceCoreToolResult {
    status: 'success' | 'error';
    data?: unknown;
    message?: string;
}

// =============================================================================
// Voice Core Class
// =============================================================================

/**
 * VoiceCore - Main integration class for voice control
 *
 * Wraps the Voice Nexus orchestrator and adds:
 * - Codebase awareness for intelligent navigation
 * - Browser STT fallback when Gemini unavailable
 * - Unified state management
 * - Tool handling for UI actions
 */
export class VoiceCore {
    private orchestrator: VoiceNexusOrchestrator;
    private config: VoiceCoreConfig;
    private state: VoiceCoreState;
    private listeners: Set<VoiceCoreListener> = new Set();
    private isInitialized = false;

    // Callbacks for external integration
    public onNavigate: ((mode: AppMode, subtab?: string) => void) | null = null;
    public onAction: ((action: string, args: Record<string, unknown>) => void) | null = null;
    public onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
    public onResponse: ((text: string) => void) | null = null;

    constructor(config: Partial<VoiceCoreConfig> = {}) {
        this.config = {
            sttProvider: 'auto',
            ttsProvider: 'auto',
            enableCodebaseAwareness: true,
            enableKnowledgeInjection: true,
            debugMode: false,
            ...config
        };

        this.state = {
            isListening: false,
            isProcessing: false,
            isSpeaking: false,
            currentTranscript: '',
            lastResponse: '',
            error: null,
            sttProvider: 'browser',
            ttsProvider: 'elevenlabs',
            complexityScore: 0,
            currentMode: null
        };

        // Create orchestrator with event handlers
        this.orchestrator = createVoiceNexus({
            config: {
                mode: 'hybrid',
                sttProvider: this.selectSTTProvider(),
                reasoningProvider: 'auto',
                ttsProvider: this.selectTTSProvider(),
                knowledgeInjection: this.config.enableKnowledgeInjection,
                agent: this.getDefaultAgent(),
                mentalState: { skepticism: 50, excitement: 50, alignment: 50 }
            },
            events: this.createEventHandlers()
        });
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Initialize the voice core
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Load codebase graph if awareness is enabled
            if (this.config.enableCodebaseAwareness) {
                await codebaseAwareness.loadGraph();
            }

            this.isInitialized = true;
            this.log('VoiceCore initialized');
        } catch (error) {
            this.handleError('Failed to initialize VoiceCore', error);
        }
    }

    /**
     * Prime audio context (must be called on user interaction)
     */
    async primeAudio(): Promise<void> {
        try {
            // Prime ElevenLabs (AudioContext)
            if (this.state.ttsProvider === 'elevenlabs' || this.config.ttsProvider === 'elevenlabs') {
                // We'd need to expose a prime method on elevenLabsTTS or just call a dummy play
                // For now, we'll try to resume if we can access the context, but strictly 
                // elevenLabsTTS handles its own context. We should add a prime method there.
            }

            // Prime Browser TTS (cancel clears any stuck queue)
            if (this.state.ttsProvider === 'browser' || this.config.ttsProvider === 'browser') {
                window.speechSynthesis.cancel();
            }
        } catch (e) {
            log.warn('Failed to prime audio', e);
        }
    }

    /**
     * Start listening for voice input
     */
    private silenceTimer: any = null;
    private lastProcessedTranscript: string = '';

    /**
     * Start listening for voice input
     */
    async startListening(): Promise<void> {
        if (this.state.isListening) return;

        try {
            this.updateState({ isListening: true, error: null });

            // Use browser STT directly for more control
            if (this.config.sttProvider === 'browser' || !this.isGeminiAvailable()) {
                await browserSTT.startStreaming((transcript) => {
                    this.updateState({ currentTranscript: transcript });
                    this.onTranscript?.(transcript, false);

                    // Silence Detection Logic
                    if (this.silenceTimer) clearTimeout(this.silenceTimer);

                    // Only set timer if we have content
                    if (transcript.trim().length > 0) {
                        this.silenceTimer = setTimeout(() => {
                            // Calculate new segment (Delta)
                            // We do this to prevent re-processing the entire history
                            const currentFull = transcript;
                            const previous = this.lastProcessedTranscript;

                            if (currentFull.length > previous.length) {
                                const newSegment = currentFull.slice(previous.length).trim();

                                if (newSegment) {
                                    this.log('Silence detected, processing segment:', newSegment);
                                    this.onTranscript?.(newSegment, true);
                                    this.processTranscript(newSegment);

                                    // Update marker to current end
                                    this.lastProcessedTranscript = currentFull;
                                }
                            }
                        }, 1200); // 1.2s silence threshold
                    }
                });
                this.updateState({ sttProvider: 'browser' });
            } else {
                // Use orchestrator's Gemini Live mode
                await this.orchestrator.start();
                this.updateState({ sttProvider: 'gemini' });
            }

            this.log('Started listening');
        } catch (error) {
            this.updateState({ isListening: false });
            this.handleError('Failed to start listening', error);
        }
    }

    /**
     * Stop listening - does NOT process remaining transcript (user is exiting)
     */
    async stopListening(): Promise<string> {
        if (!this.state.isListening) return '';

        try {
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.lastProcessedTranscript = '';

            let transcript = '';

            if (this.state.sttProvider === 'browser') {
                transcript = await browserSTT.stopStreaming();
            } else {
                this.orchestrator.stop();
                transcript = this.state.currentTranscript;
            }

            this.updateState({ isListening: false, currentTranscript: '' });

            // Don't process transcript on stop - user is explicitly exiting
            // Processing here was causing unwanted navigation (e.g., "navigating to bibliomorphic")

            return transcript;
        } catch (error) {
            this.updateState({ isListening: false });
            this.handleError('Failed to stop listening', error);
            return '';
        }
    }

    /**
     * Process a text transcript through the AI pipeline
     */
    async processTranscript(text: string): Promise<string> {
        if (!text || this.state.isProcessing) return '';

        try {
            this.updateState({ isProcessing: true, currentTranscript: text });

            // Analyze complexity
            const complexity = analyzeComplexity(text);
            this.updateState({ complexityScore: complexity.score });

            // Legacy Regex Navigation removed in favor of Orchestrator Intent Analysis
            // This allows the AI to "speak and act" simultaneously with full context
            /* 
            if (this.config.enableCodebaseAwareness) {
                const navResult = this.tryNavigate(text);
                if (navResult.success) {
                    const response = `Navigating to ${navResult.mode}`;
                    this.updateState({ lastResponse: response, isProcessing: false });
                    await this.speak(response);
                    return response;
                }
            } 
            */

            // Process through reasoning pipeline
            let promptToSend = text;
            if (this.config.enableCodebaseAwareness) {
                const codebaseContext = this.getCodebaseContext();
                if (codebaseContext) {
                    promptToSend = `[CURRENT_APP_STATE: ${codebaseContext}]\n\nUSER_QUERY: ${text}`;
                }
            }

            const response = await this.orchestrator.processText(promptToSend);
            this.updateState({ lastResponse: response, isProcessing: false });
            this.onResponse?.(response);

            return response;
        } catch (error) {
            this.updateState({ isProcessing: false });
            this.handleError('Failed to process transcript', error);
            return '';
        }
    }

    /**
     * Speak text using TTS
     */
    async speak(text: string): Promise<void> {
        if (!text) return;

        try {
            this.updateState({ isSpeaking: true });

            if (this.state.ttsProvider === 'elevenlabs' && elevenLabsTTS.isAvailable()) {
                await elevenLabsTTS.synthesizeAndPlay(text, 'Mike');
            } else {
                await browserTTS.speak(text, 'default');
            }

            this.updateState({ isSpeaking: false });
        } catch (error) {
            this.updateState({ isSpeaking: false });
            // Fall back to browser TTS
            try {
                await browserTTS.speak(text, 'default');
            } catch {
                this.handleError('TTS failed', error);
            }
        }
    }

    /**
     * Navigate to a specific mode
     */
    navigateTo(destination: string): NavigationResult {
        const intent = codebaseAwareness.parseNavigationIntent(destination);

        if (!intent) {
            return { success: false, error: 'Could not understand navigation destination' };
        }

        const route = codebaseAwareness.getRoute(intent.mode);

        if (this.onNavigate) {
            this.onNavigate(intent.mode, intent.subtab);
        }

        this.updateState({ currentMode: intent.mode });

        return {
            success: true,
            mode: intent.mode,
            route,
            subtab: intent.subtab
        };
    }

    /**
     * Try to navigate based on text - returns success if navigation was triggered
     */
    private tryNavigate(text: string): NavigationResult {
        // Check for navigation patterns
        const navPatterns = /^(go to|navigate to|open|show|take me to|switch to|head to)\s+/i;
        if (!navPatterns.test(text)) {
            return { success: false };
        }

        return this.navigateTo(text);
    }

    /**
     * Set the current mode (for context awareness)
     */
    setCurrentMode(mode: AppMode): void {
        this.updateState({ currentMode: mode });
    }

    /**
     * Switch to a different agent
     */
    async switchAgent(agent: HiveAgent): Promise<void> {
        await this.orchestrator.switchAgent(agent);
        this.log(`Switched to agent: ${agent.name}`);
    }

    /**
     * Update mental state
     */
    updateMentalState(mentalState: Partial<MentalState>): void {
        const current = this.orchestrator.getState();
        this.orchestrator.updateConfig({
            mentalState: { ...current, ...mentalState } as MentalState
        });
    }

    /**
     * Get current state
     */
    getState(): VoiceCoreState {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: VoiceCoreListener): () => void {
        this.listeners.add(listener);
        listener(this.state); // Initial call with current state

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get codebase awareness context
     */
    getCodebaseContext(): string {
        return codebaseAwareness.buildContext(this.state.currentMode || undefined);
    }

    /**
     * Find component by natural language
     */
    findComponent(query: string): NavigationMatch | null {
        return codebaseAwareness.findComponent(query);
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    private selectSTTProvider(): 'gemini' | 'whisper' | 'browser' {
        if (this.config.sttProvider === 'browser') return 'browser';
        if (this.config.sttProvider === 'gemini' && this.isGeminiAvailable()) return 'gemini';
        // Auto: prefer browser for reliability
        return 'browser';
    }

    private selectTTSProvider(): 'elevenlabs' | 'gemini' | 'browser' {
        if (this.config.ttsProvider === 'browser') return 'browser';
        if (this.config.ttsProvider === 'elevenlabs' && elevenLabsTTS.isAvailable()) return 'elevenlabs';
        // Auto: prefer ElevenLabs for quality
        return elevenLabsTTS.isAvailable() ? 'elevenlabs' : 'browser';
    }

    private isGeminiAvailable(): boolean {
        // Check if Gemini API key is configured
        try {
            return apiKeyService.hasGeminiKey();
        } catch {
            return false;
        }
    }

    /**
     * Run diagnostics on the voice system
     * Returns health status and recommendations
     */
    async diagnose(): Promise<VoiceSystemHealth> {
        return checkVoiceSystemHealth();
    }

    /**
     * Print diagnostic report to console
     */
    async printDiagnostics(): Promise<void> {
        const health = await checkVoiceSystemHealth();
        console.log(formatHealthReport(health));
    }

    /**
     * Check if voice system can work at all
     */
    async checkViability(): Promise<{ viable: boolean; reason?: string }> {
        return isVoiceSystemViable();
    }

    private getDefaultAgent(): HiveAgent {
        return {
            id: 'mike',
            name: 'Mike',
            gender: 'male',
            voice: 'Puck',
            systemPrompt: 'You are a helpful AI assistant with full control over the OS-App interface.'
        };
    }

    private createEventHandlers(): VoiceNexusEvents {
        return {
            onTranscriptUpdate: (transcript: Transcript) => {
                if (transcript.role === 'user') {
                    this.updateState({ currentTranscript: transcript.text });
                } else if (transcript.role === 'model') {
                    this.updateState({ lastResponse: transcript.text });
                }
            },
            onPartialTranscript: (partial) => {
                this.updateState({ currentTranscript: partial.text });
                this.onTranscript?.(partial.text, false);
            },
            onProcessingStart: () => {
                this.updateState({ isProcessing: true });
            },
            onProcessingEnd: () => {
                this.updateState({ isProcessing: false });
            },
            onError: (error) => {
                this.handleError('Orchestrator error', error);
            },
            onToolCall: async (name, args) => {
                return this.handleToolCall(name, args);
            }
        };
    }

    private async handleToolCall(name: string, args: Record<string, unknown>): Promise<VoiceCoreToolResult> {
        this.log(`Tool call: ${name}`, args);

        switch (name) {
            case 'navigate':
            case 'navigate_to_mode':
            case 'navigate_to_sector': {
                const target = (args.target || args.destination || args.target_sector) as string;
                const result = this.navigateTo(target);
                return {
                    status: result.success ? 'success' : 'error',
                    data: result,
                    message: result.success ? `Navigated to ${result.mode}` : result.error
                };
            }

            case 'switch_agent': {
                const agentName = args.agentName as string;
                // Would need to resolve agent from registry
                return {
                    status: 'success',
                    data: { agent: agentName },
                    message: `Agent switch initiated to ${agentName}`
                };
            }

            default: {
                // Pass to external handler if set
                if (this.onAction) {
                    this.onAction(name, args);
                    return { status: 'success', message: `Action ${name} dispatched` };
                }
                return { status: 'error', message: `Unknown tool: ${name}` };
            }
        }
    }

    private updateState(update: Partial<VoiceCoreState>): void {
        this.state = { ...this.state, ...update };
        this.notifyListeners();
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    private handleError(message: string, error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(message, error);
        this.updateState({ error: `${message}: ${errorMessage}` });
    }

    private log(...args: unknown[]): void {
        if (this.config.debugMode) {
            log.debug(args.join(' '));
        }
    }
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * React hook for using VoiceCore in components
 */
export function useVoiceCore(config?: Partial<VoiceCoreConfig>) {
    const [state, setState] = useState<VoiceCoreState | null>(null);
    const coreRef = useRef<VoiceCore | null>(null);

    // Initialize VoiceCore
    useEffect(() => {
        if (!coreRef.current) {
            coreRef.current = new VoiceCore(config);
            coreRef.current.initialize();
        }

        // Subscribe to state changes
        const unsubscribe = coreRef.current.subscribe(setState);

        return () => {
            unsubscribe();
        };
    }, []);

    // Memoized actions
    const startListening = useCallback(async () => {
        await coreRef.current?.startListening();
    }, []);

    const stopListening = useCallback(async () => {
        return await coreRef.current?.stopListening() || '';
    }, []);

    const processText = useCallback(async (text: string) => {
        return await coreRef.current?.processTranscript(text) || '';
    }, []);

    const speak = useCallback(async (text: string) => {
        await coreRef.current?.speak(text);
    }, []);

    const navigateTo = useCallback((destination: string) => {
        return coreRef.current?.navigateTo(destination) || { success: false, error: 'Not initialized' };
    }, []);

    const setCurrentMode = useCallback((mode: AppMode) => {
        coreRef.current?.setCurrentMode(mode);
    }, []);

    const findComponent = useCallback((query: string) => {
        return coreRef.current?.findComponent(query) || null;
    }, []);

    const getCodebaseContext = useCallback(() => {
        return coreRef.current?.getCodebaseContext() || '';
    }, []);

    const setOnNavigate = useCallback((handler: (mode: AppMode, subtab?: string) => void) => {
        if (coreRef.current) {
            coreRef.current.onNavigate = handler;
        }
    }, []);

    const setOnAction = useCallback((handler: (action: string, args: Record<string, unknown>) => void) => {
        if (coreRef.current) {
            coreRef.current.onAction = handler;
        }
    }, []);

    const setOnTranscript = useCallback((handler: (text: string, isFinal: boolean) => void) => {
        if (coreRef.current) {
            coreRef.current.onTranscript = handler;
        }
    }, []);

    const setOnResponse = useCallback((handler: (text: string) => void) => {
        if (coreRef.current) {
            coreRef.current.onResponse = handler;
        }
    }, []);

    const primeAudio = useCallback(async () => {
        await coreRef.current?.primeAudio();
    }, []);

    return {
        state,
        core: coreRef.current,
        startListening,
        stopListening,
        primeAudio,
        processText,
        speak,
        navigateTo,
        setCurrentMode,
        findComponent,
        getCodebaseContext,
        setOnNavigate,
        setOnAction,
        setOnTranscript,
        setOnResponse
    };
}

// =============================================================================
// Singleton for Global Access
// =============================================================================

let globalVoiceCore: VoiceCore | null = null;

export function getVoiceCore(config?: Partial<VoiceCoreConfig>): VoiceCore {
    if (!globalVoiceCore) {
        globalVoiceCore = new VoiceCore(config);
    }
    return globalVoiceCore;
}

// Expose for debugging in development
if (typeof window !== 'undefined') {
    (window as any).__voiceCore = {
        get: () => globalVoiceCore,
        create: (config?: Partial<VoiceCoreConfig>) => {
            globalVoiceCore = new VoiceCore({ debugMode: true, ...config });
            globalVoiceCore.initialize();
            return globalVoiceCore;
        },
        // Diagnostic methods
        diagnose: async () => {
            const core = globalVoiceCore || new VoiceCore();
            const health = await core.diagnose();
            console.log(formatHealthReport(health));
            return health;
        },
        checkHealth: async () => {
            const health = await checkVoiceSystemHealth();
            console.log(formatHealthReport(health));
            return health;
        },
        isViable: async () => {
            const result = await isVoiceSystemViable();
            if (result.viable) {
                console.log('✅ Voice system is viable');
            } else {
                console.log(`❌ Voice system NOT viable: ${result.reason}`);
            }
            return result;
        }
    };

    (window as any).__codebaseAwareness = codebaseAwareness;
}
