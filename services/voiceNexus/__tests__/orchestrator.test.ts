import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// Mock functions - vi.hoisted ensures these are available before vi.mock factories
// ============================================================================

const {
    mockGeminiLiveSTTIsAvailable,
    mockGeminiLiveSTTTranscribe,
    mockBrowserSTTIsAvailable,
    mockBrowserSTTIsCurrentlyStreaming,
    mockBrowserSTTStartStreaming,
    mockBrowserSTTStopStreaming,
    mockClaudeReasoningIsAvailable,
    mockClaudeReasoningGenerate,
    mockGeminiReasoningIsAvailable,
    mockGeminiReasoningGenerate,
    mockElevenLabsTTSIsAvailable,
    mockElevenLabsTTSSynthesizeAndPlay,
    mockBrowserTTSIsAvailable,
    mockBrowserTTSSpeak,
    mockKnowledgeInjectContext,
    mockLiveSessionConnect,
    mockLiveSessionDisconnect,
    mockLiveSessionGetInputFrequencies,
    mockLiveSessionGetOutputFrequencies,
    mockNeuralVaultGet,
    mockNeuralVaultSet,
    mockSovereignMemoryStore,
    mockSovereignMemorySearch,
    mockVoiceStorageCreateSession,
    mockVoiceStorageSaveTranscript,
    mockVoiceStorageEndSession,
    mockInterpretIntent,
} = vi.hoisted(() => ({
    mockGeminiLiveSTTIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockGeminiLiveSTTTranscribe: vi.fn<(...args: any[]) => any>(async () => 'transcribed text'),
    mockBrowserSTTIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockBrowserSTTIsCurrentlyStreaming: vi.fn<(...args: any[]) => any>(() => false),
    mockBrowserSTTStartStreaming: vi.fn<(...args: any[]) => any>(async () => {}),
    mockBrowserSTTStopStreaming: vi.fn<(...args: any[]) => any>(async () => 'final transcript'),
    mockClaudeReasoningIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockClaudeReasoningGenerate: vi.fn<(...args: any[]) => any>(async () => ({
        text: 'Claude response',
        model: 'claude-sonnet-4-6',
        latencyMs: 500,
    })),
    mockGeminiReasoningIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockGeminiReasoningGenerate: vi.fn<(...args: any[]) => any>(async () => ({
        text: 'Gemini response',
        model: 'gemini-2.5-flash',
        latencyMs: 300,
    })),
    mockElevenLabsTTSIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockElevenLabsTTSSynthesizeAndPlay: vi.fn<(...args: any[]) => any>(async () => {}),
    mockBrowserTTSIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockBrowserTTSSpeak: vi.fn<(...args: any[]) => any>(async () => {}),
    mockKnowledgeInjectContext: vi.fn<(...args: any[]) => any>(async (query: string) => ({
        searchResults: [],
        injectedPrompt: query,
    })),
    mockLiveSessionConnect: vi.fn<(...args: any[]) => any>(async () => {}),
    mockLiveSessionDisconnect: vi.fn<(...args: any[]) => any>(),
    mockLiveSessionGetInputFrequencies: vi.fn<(...args: any[]) => any>(() => null),
    mockLiveSessionGetOutputFrequencies: vi.fn<(...args: any[]) => any>(() => null),
    mockNeuralVaultGet: vi.fn<(...args: any[]) => any>(async () => null),
    mockNeuralVaultSet: vi.fn<(...args: any[]) => any>(async () => {}),
    mockSovereignMemoryStore: vi.fn<(...args: any[]) => any>(async () => {}),
    mockSovereignMemorySearch: vi.fn<(...args: any[]) => any>(async () => []),
    mockVoiceStorageCreateSession: vi.fn<(...args: any[]) => any>(async () => {}),
    mockVoiceStorageSaveTranscript: vi.fn<(...args: any[]) => any>(async () => {}),
    mockVoiceStorageEndSession: vi.fn<(...args: any[]) => any>(async () => {}),
    mockInterpretIntent: vi.fn<(...args: any[]) => any>(async () => null),
}));

// ============================================================================
// vi.mock calls
// ============================================================================

vi.mock('../providers/stt/geminiLive', () => ({
    geminiLiveSTT: {
        name: 'gemini-live-stt',
        supportsStreaming: true,
        isAvailable: () => mockGeminiLiveSTTIsAvailable(),
        transcribe: (audio: any) => mockGeminiLiveSTTTranscribe(audio),
    },
}));

vi.mock('../providers/stt/browserSTT', () => ({
    browserSTT: {
        name: 'browser-stt',
        supportsStreaming: true,
        isAvailable: () => mockBrowserSTTIsAvailable(),
        isCurrentlyStreaming: () => mockBrowserSTTIsCurrentlyStreaming(),
        startStreaming: (cb: any) => mockBrowserSTTStartStreaming(cb),
        stopStreaming: () => mockBrowserSTTStopStreaming(),
    },
}));

vi.mock('../providers/reasoning/claudeReasoning', () => ({
    claudeReasoning: {
        name: 'claude',
        models: { fast: 'claude-haiku', balanced: 'claude-sonnet', deep: 'claude-opus' },
        isAvailable: () => mockClaudeReasoningIsAvailable(),
        generate: (prompt: string, config: any) => mockClaudeReasoningGenerate(prompt, config),
    },
}));

vi.mock('../providers/reasoning/geminiReasoning', () => ({
    geminiReasoning: {
        name: 'gemini',
        models: { fast: 'gemini-flash', balanced: 'gemini-flash', deep: 'gemini-flash' },
        isAvailable: () => mockGeminiReasoningIsAvailable(),
        generate: (prompt: string, config: any) => mockGeminiReasoningGenerate(prompt, config),
    },
}));

vi.mock('../providers/tts/elevenLabsTTS', () => ({
    elevenLabsTTS: {
        name: 'elevenlabs',
        supportsStreaming: true,
        voices: [{ name: 'Rachel' }],
        isAvailable: () => mockElevenLabsTTSIsAvailable(),
        synthesizeAndPlay: (text: string, voice: string) => mockElevenLabsTTSSynthesizeAndPlay(text, voice),
        getVoiceForAgent: () => 'Rachel',
    },
}));

vi.mock('../providers/tts/browserTTS', () => ({
    browserTTS: {
        name: 'browser-tts',
        isAvailable: () => mockBrowserTTSIsAvailable(),
        speak: (text: string, voice: string) => mockBrowserTTSSpeak(text, voice),
        getVoiceForAgent: () => 'default',
    },
}));

vi.mock('../knowledgeInjector', () => ({
    knowledgeInjector: {
        injectContext: (query: string, agent: any) => mockKnowledgeInjectContext(query, agent),
        checkAvailability: vi.fn(async () => true),
    },
}));

vi.mock('../../liveSession', () => ({
    liveSession: {
        connect: (...args: any[]) => mockLiveSessionConnect(...args),
        disconnect: () => mockLiveSessionDisconnect(),
        getInputFrequencies: () => mockLiveSessionGetInputFrequencies(),
        getOutputFrequencies: () => mockLiveSessionGetOutputFrequencies(),
        onAgentSwitch: null,
    },
}));

vi.mock('../../persistenceService', () => ({
    neuralVault: {
        get: (key: string) => mockNeuralVaultGet(key),
        set: (key: string, val: any) => mockNeuralVaultSet(key, val),
    },
}));

vi.mock('../../memory/MemoryStore', () => {
    return {
        SovereignMemory: class MockSovereignMemory {
            store(id: string, data: string) { return mockSovereignMemoryStore(id, data); }
            search(query: string, limit: number) { return mockSovereignMemorySearch(query, limit); }
        },
    };
});

vi.mock('../../supabaseService', () => ({
    voiceStorage: {
        createSession: (data: any) => mockVoiceStorageCreateSession(data),
        saveTranscript: (data: any) => mockVoiceStorageSaveTranscript(data),
        endSession: (id: string, count: number) => mockVoiceStorageEndSession(id, count),
    },
}));

vi.mock('../../geminiService', () => ({
    interpretIntent: (text: string) => mockInterpretIntent(text),
}));

vi.mock('../complexityRouter', () => ({
    analyzeComplexity: vi.fn((text: string) => ({
        score: 0.3,
        tier: 'fast' as const,
        signals: {
            tokenCount: text.split(' ').length,
            hasCodeIndicators: false,
            hasReasoningIndicators: false,
            hasCreativeIndicators: false,
            hasNavigationIndicators: false,
            hasQuestionIndicators: false,
            domainComplexity: 0,
        },
        recommendedProvider: { reasoning: 'claude-sonnet', tts: 'elevenlabs' as const },
    })),
    hasExplicitOverride: vi.fn(() => ({ override: false })),
    formatComplexityResult: vi.fn(() => 'Complexity: 0.3 (fast)'),
}));

vi.mock('../healthCheck', () => ({
    checkVoiceSystemHealth: vi.fn(async () => ({
        overall: 'healthy',
        providers: {},
    })),
    formatHealthReport: vi.fn(() => 'Health report'),
    isVoiceSystemViable: vi.fn(async () => ({ viable: true })),
}));

vi.mock('../../logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
    randomUUID: () => '12345678-1234-1234-1234-123456789012',
});

// ============================================================================
// Import after mocks
// ============================================================================

import { VoiceNexusOrchestrator, createVoiceNexus } from '../orchestrator';

// ============================================================================
// Tests
// ============================================================================

describe('VoiceNexusOrchestrator', () => {
    let orchestrator: VoiceNexusOrchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock defaults
        mockGeminiLiveSTTIsAvailable.mockReturnValue(true);
        mockBrowserSTTIsAvailable.mockReturnValue(true);
        mockBrowserSTTIsCurrentlyStreaming.mockReturnValue(false);
        mockClaudeReasoningIsAvailable.mockReturnValue(true);
        mockGeminiReasoningIsAvailable.mockReturnValue(true);
        mockElevenLabsTTSIsAvailable.mockReturnValue(true);
        mockBrowserTTSIsAvailable.mockReturnValue(true);
        mockNeuralVaultGet.mockResolvedValue(null);
        mockNeuralVaultSet.mockResolvedValue(undefined);
        mockVoiceStorageCreateSession.mockResolvedValue(undefined);
        mockVoiceStorageSaveTranscript.mockResolvedValue(undefined);
        mockVoiceStorageEndSession.mockResolvedValue(undefined);
        mockInterpretIntent.mockResolvedValue(null);
        mockClaudeReasoningGenerate.mockResolvedValue({
            text: 'Claude response',
            model: 'claude-sonnet-4-6',
            latencyMs: 500,
        });
        mockGeminiReasoningGenerate.mockResolvedValue({
            text: 'Gemini response',
            model: 'gemini-2.5-flash',
            latencyMs: 300,
        });

        orchestrator = new VoiceNexusOrchestrator();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // Constructor & Initialization
    // =========================================================================

    describe('constructor', () => {
        it('should initialize with default config', () => {
            const state = orchestrator.getState();
            expect(state.mode).toBe('hybrid');
            expect(state.isActive).toBe(false);
            expect(state.isProcessing).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should merge custom config with defaults', () => {
            const custom = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    sttProvider: 'browser',
                    reasoningProvider: 'claude',
                    ttsProvider: 'browser',
                    knowledgeInjection: false,
                    agent: {
                        id: 'aria',
                        name: 'Aria',
                        gender: 'female',
                        voice: 'Shimmer',
                        systemPrompt: 'You are Aria.',
                    },
                    mentalState: { skepticism: 80, excitement: 20, alignment: 60 },
                },
            });

            const state = custom.getState();
            expect(state.mode).toBe('turn-based');
        });

        it('should load recent context on construction', () => {
            // loadRecentContext is called in constructor
            expect(mockNeuralVaultGet).toHaveBeenCalledWith('voice_sessions');
        });
    });

    // =========================================================================
    // STT Provider Selection
    // =========================================================================

    describe('selectSTTProvider', () => {
        it('should use browser STT when configured', () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'browser',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            expect(orch.isUsingBrowserSTT()).toBe(true);
        });

        it('should use Gemini STT when configured and available', () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(true);
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            expect(orch.isUsingBrowserSTT()).toBe(false);
        });

        it('should fall back to browser STT when Gemini is unavailable', () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            expect(orch.isUsingBrowserSTT()).toBe(true);
        });

        it('should fall back to Gemini when both unavailable', () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            // Falls through to return geminiLiveSTT as last resort
            expect(orch.isUsingBrowserSTT()).toBe(false);
        });
    });

    // =========================================================================
    // start() - Mode Switching
    // =========================================================================

    describe('start()', () => {
        it('should not start if already active', async () => {
            await orchestrator.start();
            const connectCount = mockLiveSessionConnect.mock.calls.length;
            await orchestrator.start();
            // Should not call connect again
            expect(mockLiveSessionConnect).toHaveBeenCalledTimes(connectCount);
        });

        it('should start in browser mode when using browser STT', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'browser',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.start();

            expect(mockBrowserSTTStartStreaming).toHaveBeenCalled();
            expect(orch.getState().isActive).toBe(true);
        });

        it('should start in realtime mode when configured with Gemini', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'realtime',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'gemini',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.start();

            expect(mockLiveSessionConnect).toHaveBeenCalled();
            expect(orch.getState().isActive).toBe(true);
        });

        it('should start in hybrid mode when configured', async () => {
            await orchestrator.start();

            expect(mockLiveSessionConnect).toHaveBeenCalled();
            expect(orchestrator.getState().isActive).toBe(true);
        });

        it('should create cloud session on start', async () => {
            await orchestrator.start();
            expect(mockVoiceStorageCreateSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    mode: 'hybrid',
                    metadata: expect.objectContaining({ agent: 'mike' }),
                })
            );
        });

        it('should set error state and throw on start failure', async () => {
            mockLiveSessionConnect.mockRejectedValueOnce(new Error('Connection failed'));

            await expect(orchestrator.start()).rejects.toThrow('Connection failed');
            expect(orchestrator.getState().isActive).toBe(false);
            expect(orchestrator.getState().error).toBe('Connection failed');
        });

        it('should throw error when browser STT is unavailable in browser mode', async () => {
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);

            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'browser',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });

            await expect(orch.start()).rejects.toThrow('Browser STT');
        });
    });

    // =========================================================================
    // stop()
    // =========================================================================

    describe('stop()', () => {
        it('should disconnect liveSession and set inactive', async () => {
            await orchestrator.start();
            orchestrator.stop();

            expect(mockLiveSessionDisconnect).toHaveBeenCalled();
            expect(orchestrator.getState().isActive).toBe(false);
            expect(orchestrator.getState().isProcessing).toBe(false);
        });

        it('should stop browser STT when active', async () => {
            mockBrowserSTTIsCurrentlyStreaming.mockReturnValue(true);
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'browser',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: true,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.start();
            orch.stop();

            expect(mockBrowserSTTStopStreaming).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // processText() - Main Pipeline
    // =========================================================================

    describe('processText()', () => {
        it('should process text through full pipeline and return response', async () => {
            const result = await orchestrator.processText('Hello world');

            expect(result).toBe('Claude response');
        });

        it('should analyze complexity', async () => {
            const { analyzeComplexity } = await import('../complexityRouter');
            await orchestrator.processText('What is the weather?');

            expect(analyzeComplexity).toHaveBeenCalledWith('What is the weather?');
        });

        it('should inject knowledge when enabled', async () => {
            await orchestrator.processText('Tell me about quantum computing');

            expect(mockKnowledgeInjectContext).toHaveBeenCalledWith(
                'Tell me about quantum computing',
                expect.any(Object)
            );
        });

        it('should skip knowledge injection when disabled', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.processText('Hello');

            expect(mockKnowledgeInjectContext).not.toHaveBeenCalled();
        });

        it('should store model transcript after generation', async () => {
            await orchestrator.processText('Test query');

            expect(mockSovereignMemoryStore).toHaveBeenCalled();
        });

        it('should synthesize speech in non-realtime mode', async () => {
            await orchestrator.processText('Say something');

            expect(mockElevenLabsTTSSynthesizeAndPlay).toHaveBeenCalled();
        });

        it('should skip speech synthesis in realtime mode', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'realtime',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'gemini',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.processText('Hello');

            expect(mockElevenLabsTTSSynthesizeAndPlay).not.toHaveBeenCalled();
            expect(mockBrowserTTSSpeak).not.toHaveBeenCalled();
        });

        it('should fire onProcessingStart and onProcessingEnd events', async () => {
            const onProcessingStart = vi.fn();
            const onProcessingEnd = vi.fn();

            const orch = new VoiceNexusOrchestrator({
                events: { onProcessingStart, onProcessingEnd },
            });
            await orch.processText('Hello');

            expect(onProcessingStart).toHaveBeenCalled();
            expect(onProcessingEnd).toHaveBeenCalled();
        });

        it('should fire onProcessingEnd even on error', async () => {
            const onProcessingEnd = vi.fn();
            mockClaudeReasoningGenerate.mockRejectedValue(new Error('fail'));
            mockGeminiReasoningGenerate.mockRejectedValue(new Error('fail'));

            const orch = new VoiceNexusOrchestrator({
                events: { onProcessingEnd },
            });

            await expect(orch.processText('Hello')).rejects.toThrow();
            expect(onProcessingEnd).toHaveBeenCalled();
        });

        it('should detect and execute intents in parallel', async () => {
            mockInterpretIntent.mockResolvedValue({
                action: 'NAVIGATE',
                target: 'dashboard',
            });

            const toolHandler = vi.fn(async () => ({ status: 'success' as const }));
            const orch = new VoiceNexusOrchestrator({
                events: { onToolCall: toolHandler },
            });
            await orch.processText('Go to dashboard');

            // Allow async intent detection to resolve
            await vi.waitFor(() => {
                expect(mockInterpretIntent).toHaveBeenCalledWith('Go to dashboard');
            });
        });
    });

    // =========================================================================
    // Provider Selection (selectProviders)
    // =========================================================================

    describe('provider selection', () => {
        it('should use gemini in realtime mode', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'realtime',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'gemini',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });

            await orch.processText('Hello');
            // realtime mode selects gemini-flash, which doesn't start with 'claude'
            // so it goes to the Gemini reasoning path
            expect(mockGeminiReasoningGenerate).toHaveBeenCalled();
            expect(mockClaudeReasoningGenerate).not.toHaveBeenCalled();
        });

        it('should use claude in turn-based mode', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.processText('Complex analysis needed');

            expect(mockClaudeReasoningGenerate).toHaveBeenCalled();
        });

        it('should use claude-sonnet for fast tier in hybrid mode', async () => {
            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });

            await orch.processText('Hello');

            expect(mockClaudeReasoningGenerate).toHaveBeenCalled();
            const state = orch.getState();
            expect(state.currentProvider.reasoning).toBe('claude-sonnet');
        });

        it('should use ElevenLabs TTS when available in hybrid mode', async () => {
            mockElevenLabsTTSIsAvailable.mockReturnValue(true);
            await orchestrator.processText('Hello');

            expect(mockElevenLabsTTSSynthesizeAndPlay).toHaveBeenCalled();
        });

        it('should fall back to browser TTS when ElevenLabs unavailable', async () => {
            mockElevenLabsTTSIsAvailable.mockReturnValue(false);

            const orch = new VoiceNexusOrchestrator({
                config: {
                    mode: 'hybrid',
                    sttProvider: 'gemini',
                    reasoningProvider: 'auto',
                    ttsProvider: 'elevenlabs',
                    knowledgeInjection: false,
                    agent: { id: 'mike', name: 'Mike', gender: 'male', voice: 'Puck', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            await orch.processText('Hello');

            expect(mockBrowserTTSSpeak).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // generateResponse() - Fallback Chain
    // =========================================================================

    describe('provider fallback', () => {
        it('should fall back to Gemini when Claude fails', async () => {
            mockClaudeReasoningGenerate.mockRejectedValue(new Error('Claude unavailable'));

            const result = await orchestrator.processText('Hello');

            expect(result).toBe('Gemini response');
            expect(orchestrator.getState().currentProvider.reasoning).toBe('gemini-fallback');
        });

        it('should throw descriptive error when all providers fail', async () => {
            mockClaudeReasoningGenerate.mockRejectedValue(new Error('Claude failed'));
            mockGeminiReasoningGenerate.mockRejectedValue(new Error('Gemini failed'));

            await expect(orchestrator.processText('Hello')).rejects.toThrow(
                'I could not generate a response'
            );
        });

        it('should throw rate limit error on 429', async () => {
            mockClaudeReasoningGenerate.mockRejectedValue(new Error('Claude failed'));
            mockGeminiReasoningGenerate.mockRejectedValue(new Error('429 Too Many Requests'));

            await expect(orchestrator.processText('Hello')).rejects.toThrow('Rate Limit');
        });

        it('should throw rate limit error on quota exceeded', async () => {
            mockClaudeReasoningGenerate.mockRejectedValue(new Error('fail'));
            mockGeminiReasoningGenerate.mockRejectedValue(new Error('Quota exceeded'));

            await expect(orchestrator.processText('Hello')).rejects.toThrow('Rate Limit');
        });
    });

    // =========================================================================
    // TTS Fallback (synthesizeSpeech)
    // =========================================================================

    describe('TTS fallback', () => {
        it('should fall back to browser TTS when ElevenLabs throws', async () => {
            mockElevenLabsTTSSynthesizeAndPlay.mockRejectedValue(new Error('ElevenLabs error'));

            await orchestrator.processText('Hello');

            expect(mockBrowserTTSSpeak).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // switchAgent()
    // =========================================================================

    describe('switchAgent()', () => {
        it('should update agent config', async () => {
            const newAgent = {
                id: 'aria',
                name: 'Aria',
                gender: 'female' as const,
                voice: 'Shimmer',
                systemPrompt: 'You are Aria.',
            };

            await orchestrator.switchAgent(newAgent);
        });

        it('should restart session if active', async () => {
            await orchestrator.start();

            const newAgent = {
                id: 'aria',
                name: 'Aria',
                gender: 'female' as const,
                voice: 'Shimmer',
                systemPrompt: 'You are Aria.',
            };

            await orchestrator.switchAgent(newAgent);

            expect(mockLiveSessionDisconnect).toHaveBeenCalled();
            expect(mockLiveSessionConnect).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // State Management
    // =========================================================================

    describe('state management', () => {
        it('should update config via updateConfig', () => {
            orchestrator.updateConfig({ mode: 'turn-based' });
            expect(orchestrator.getState().mode).toBe('turn-based');
        });

        it('should set mode via setMode', () => {
            orchestrator.setMode('realtime');
            expect(orchestrator.getState().mode).toBe('realtime');
        });

        it('should return a copy of state', () => {
            const state1 = orchestrator.getState();
            const state2 = orchestrator.getState();
            expect(state1).toEqual(state2);
            expect(state1).not.toBe(state2);
        });
    });

    // =========================================================================
    // Transcript Management
    // =========================================================================

    describe('transcript management', () => {
        it('should return transcripts', async () => {
            await orchestrator.processText('Hello');
            const transcripts = orchestrator.getTranscripts();
            expect(transcripts.length).toBeGreaterThanOrEqual(1);
        });

        it('should return a copy of transcripts', async () => {
            await orchestrator.processText('Hello');
            const t1 = orchestrator.getTranscripts();
            const t2 = orchestrator.getTranscripts();
            expect(t1).not.toBe(t2);
        });

        it('should clear transcripts', async () => {
            await orchestrator.processText('Hello');
            orchestrator.clearTranscripts();
            expect(orchestrator.getTranscripts()).toHaveLength(0);
            expect(orchestrator.getState().transcripts).toHaveLength(0);
        });

        it('should fire onTranscriptUpdate event', async () => {
            const onTranscriptUpdate = vi.fn();
            const orch = new VoiceNexusOrchestrator({
                events: { onTranscriptUpdate },
            });

            await orch.processText('Hello');

            expect(onTranscriptUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'model',
                    text: 'Claude response',
                })
            );
        });
    });

    // =========================================================================
    // Session Persistence
    // =========================================================================

    describe('session persistence', () => {
        it('should persist transcripts to SovereignMemory', async () => {
            await orchestrator.processText('Test query');

            expect(mockSovereignMemoryStore).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('voice_transcript')
            );
        });

        it('should persist transcripts to neuralVault', async () => {
            await orchestrator.processText('Test query');

            expect(mockNeuralVaultSet).toHaveBeenCalled();
        });

        it('should persist transcripts to Supabase', async () => {
            await orchestrator.processText('Test query');

            // persistTranscript is fire-and-forget (no await in addTranscript)
            // Flush the microtask queue so the async persistence completes
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockVoiceStorageSaveTranscript).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'assistant',
                    text: 'Claude response',
                })
            );
        });

        it('should end session and return summary', async () => {
            await orchestrator.processText('Query 1');
            const result = await orchestrator.endSession();

            expect(result.sessionId).toContain('voice_session_');
            expect(result.transcriptCount).toBeGreaterThan(0);
            expect(mockVoiceStorageEndSession).toHaveBeenCalled();
        });

        it('should search transcripts', async () => {
            mockSovereignMemorySearch.mockResolvedValue([
                {
                    type: 'voice_transcript',
                    content: JSON.stringify({
                        id: 'test-1',
                        role: 'user',
                        text: 'hello',
                        timestamp: Date.now(),
                    }),
                },
            ]);

            const results = await orchestrator.searchTranscripts('hello');
            expect(results).toHaveLength(1);
            expect(results[0].text).toBe('hello');
        });

        it('should return empty array on search failure', async () => {
            mockSovereignMemorySearch.mockRejectedValue(new Error('search failed'));
            const results = await orchestrator.searchTranscripts('hello');
            expect(results).toHaveLength(0);
        });
    });

    // =========================================================================
    // Frequency Data
    // =========================================================================

    describe('getFrequencyData()', () => {
        it('should return frequency data from liveSession', () => {
            const inputData = new Uint8Array([1, 2, 3]);
            mockLiveSessionGetInputFrequencies.mockReturnValue(inputData);
            mockLiveSessionGetOutputFrequencies.mockReturnValue(null);

            const data = orchestrator.getFrequencyData();
            expect(data.input).toBe(inputData);
            expect(data.output).toBeNull();
        });
    });

    // =========================================================================
    // Health & Viability
    // =========================================================================

    describe('health checks', () => {
        it('should return provider health', async () => {
            const health = await orchestrator.getProviderHealth();
            expect(health.overall).toBe('healthy');
        });

        it('should check viability', async () => {
            const result = await orchestrator.isViable();
            expect(result.viable).toBe(true);
        });
    });

    // =========================================================================
    // Factory Function
    // =========================================================================

    describe('createVoiceNexus()', () => {
        it('should create a new orchestrator instance', () => {
            const nexus = createVoiceNexus();
            expect(nexus).toBeInstanceOf(VoiceNexusOrchestrator);
        });

        it('should accept custom options', () => {
            const nexus = createVoiceNexus({
                config: {
                    mode: 'turn-based',
                    sttProvider: 'browser',
                    reasoningProvider: 'claude',
                    ttsProvider: 'browser',
                    knowledgeInjection: false,
                    agent: { id: 'x', name: 'X', gender: 'male', voice: 'V', systemPrompt: '' },
                    mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
                },
            });
            expect(nexus.getState().mode).toBe('turn-based');
        });
    });

    // =========================================================================
    // Event Callbacks
    // =========================================================================

    describe('event callbacks', () => {
        it('should fire onProviderSwitch when providers change', async () => {
            const onProviderSwitch = vi.fn();
            const orch = new VoiceNexusOrchestrator({
                events: { onProviderSwitch },
            });

            await orch.processText('Hello');

            expect(onProviderSwitch).toHaveBeenCalledWith(
                expect.objectContaining({ reasoning: expect.any(String) })
            );
        });

        it('should fire onKnowledgeInjected when knowledge is enriched', async () => {
            const onKnowledgeInjected = vi.fn();
            const orch = new VoiceNexusOrchestrator({
                events: { onKnowledgeInjected },
            });

            await orch.processText('Test');

            expect(onKnowledgeInjected).toHaveBeenCalledWith(
                expect.objectContaining({ injectedPrompt: expect.any(String) })
            );
        });

        it('should fire onError on start failure', async () => {
            const onError = vi.fn();
            mockLiveSessionConnect.mockRejectedValueOnce(new Error('fail'));

            const orch = new VoiceNexusOrchestrator({ events: { onError } });

            await expect(orch.start()).rejects.toThrow();
            expect(onError).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    // =========================================================================
    // Past Sessions
    // =========================================================================

    describe('getPastSessions()', () => {
        it('should return past sessions from neuralVault', async () => {
            mockNeuralVaultGet.mockResolvedValue([
                { id: 'session_1', startTime: 1000, lastActivity: 2000, transcriptCount: 5, mode: 'hybrid', agent: 'Mike' },
            ]);

            const sessions = await orchestrator.getPastSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].id).toBe('session_1');
        });

        it('should return empty array on failure', async () => {
            mockNeuralVaultGet.mockRejectedValue(new Error('fail'));
            const sessions = await orchestrator.getPastSessions();
            expect(sessions).toHaveLength(0);
        });
    });
});
