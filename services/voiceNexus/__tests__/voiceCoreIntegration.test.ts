import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// Mock functions - use vi.hoisted for availability before vi.mock factories
// ============================================================================

const {
    mockOrchestratorStart,
    mockOrchestratorStop,
    mockOrchestratorProcessText,
    mockOrchestratorSwitchAgent,
    mockOrchestratorGetState,
    mockOrchestratorUpdateConfig,
    mockCodebaseLoadGraph,
    mockCodebaseParseNavigationIntent,
    mockCodebaseGetRoute,
    mockCodebaseBuildContext,
    mockCodebaseFindComponent,
    mockBrowserSTTIsAvailable,
    mockBrowserSTTStartStreaming,
    mockBrowserSTTStopStreaming,
    mockElevenLabsIsAvailable,
    mockElevenLabsSynthesizeAndPlay,
    mockBrowserTTSSpeak,
    mockHasGeminiKey,
} = vi.hoisted(() => ({
    mockOrchestratorStart: vi.fn<(...args: any[]) => any>(async () => {}),
    mockOrchestratorStop: vi.fn<(...args: any[]) => any>(),
    mockOrchestratorProcessText: vi.fn<(...args: any[]) => any>(async () => 'AI response'),
    mockOrchestratorSwitchAgent: vi.fn<(...args: any[]) => any>(async () => {}),
    mockOrchestratorGetState: vi.fn<(...args: any[]) => any>(() => ({
        mode: 'hybrid',
        isActive: false,
        isProcessing: false,
        currentProvider: { stt: 'gemini', reasoning: 'claude', tts: 'elevenlabs' },
        transcripts: [],
        lastComplexityScore: 0,
        knowledgeContext: null,
        error: null,
    })),
    mockOrchestratorUpdateConfig: vi.fn<(...args: any[]) => any>(),
    mockCodebaseLoadGraph: vi.fn<(...args: any[]) => any>(async () => {}),
    mockCodebaseParseNavigationIntent: vi.fn<(...args: any[]) => any>((dest: string) => {
        if (dest.includes('dashboard')) return { mode: 'DASHBOARD', subtab: undefined };
        if (dest.includes('agents')) return { mode: 'AGENT_CONTROL', subtab: 'control-center' };
        return null;
    }),
    mockCodebaseGetRoute: vi.fn<(...args: any[]) => any>((mode: string) => `/${mode.toLowerCase()}`),
    mockCodebaseBuildContext: vi.fn<(...args: any[]) => any>(() => 'mode: dashboard'),
    mockCodebaseFindComponent: vi.fn<(...args: any[]) => any>(() => null),
    mockBrowserSTTIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockBrowserSTTStartStreaming: vi.fn<(...args: any[]) => any>(async (_cb: any) => {}),
    mockBrowserSTTStopStreaming: vi.fn<(...args: any[]) => any>(async () => 'final transcript'),
    mockElevenLabsIsAvailable: vi.fn<(...args: any[]) => any>(() => true),
    mockElevenLabsSynthesizeAndPlay: vi.fn<(...args: any[]) => any>(async () => {}),
    mockBrowserTTSSpeak: vi.fn<(...args: any[]) => any>(async () => {}),
    mockHasGeminiKey: vi.fn<(...args: any[]) => any>(() => false),
}));

// Capture event handlers so we can trigger them in tests
let capturedEvents: any = {};

// ============================================================================
// vi.mock calls - paths must resolve to the same modules that voiceCoreIntegration.ts imports
// ============================================================================

vi.mock('../orchestrator', () => ({
    VoiceNexusOrchestrator: vi.fn(),
    createVoiceNexus: vi.fn((options?: any) => {
        capturedEvents = options?.events || {};
        return {
            start: mockOrchestratorStart,
            stop: mockOrchestratorStop,
            processText: (text: string) => mockOrchestratorProcessText(text),
            switchAgent: (agent: any) => mockOrchestratorSwitchAgent(agent),
            getState: () => mockOrchestratorGetState(),
            updateConfig: (config: any) => mockOrchestratorUpdateConfig(config),
        };
    }),
}));

// codebaseAwareness is at services/codebaseAwareness.ts
// From test at services/voiceNexus/__tests__/ => ../../codebaseAwareness
vi.mock('../../codebaseAwareness', () => ({
    codebaseAwareness: {
        loadGraph: () => mockCodebaseLoadGraph(),
        parseNavigationIntent: (dest: string) => mockCodebaseParseNavigationIntent(dest),
        getRoute: (mode: string) => mockCodebaseGetRoute(mode),
        buildContext: (mode?: string) => mockCodebaseBuildContext(mode),
        findComponent: (query: string) => mockCodebaseFindComponent(query),
    },
}));

vi.mock('../providers/stt/browserSTT', () => ({
    browserSTT: {
        isAvailable: () => mockBrowserSTTIsAvailable(),
        startStreaming: (cb: any) => mockBrowserSTTStartStreaming(cb),
        stopStreaming: () => mockBrowserSTTStopStreaming(),
    },
}));

vi.mock('../providers/tts/elevenLabsTTS', () => ({
    elevenLabsTTS: {
        isAvailable: () => mockElevenLabsIsAvailable(),
        synthesizeAndPlay: (text: string, voice: string) => mockElevenLabsSynthesizeAndPlay(text, voice),
    },
}));

vi.mock('../providers/tts/browserTTS', () => ({
    browserTTS: {
        speak: (text: string, voice: string) => mockBrowserTTSSpeak(text, voice),
    },
}));

vi.mock('../complexityRouter', () => ({
    analyzeComplexity: vi.fn(() => ({
        score: 0.4,
        tier: 'balanced',
        signals: {},
        recommendedProvider: { reasoning: 'claude-sonnet', tts: 'elevenlabs' },
    })),
}));

vi.mock('../healthCheck', () => ({
    checkVoiceSystemHealth: vi.fn(async () => ({ overall: 'healthy', providers: {} })),
    formatHealthReport: vi.fn(() => 'Health OK'),
    isVoiceSystemViable: vi.fn(async () => ({ viable: true })),
}));

vi.mock('../../apiKeyService', () => ({
    apiKeyService: {
        hasGeminiKey: () => mockHasGeminiKey(),
    },
}));

vi.mock('../../logger', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock React hooks used in useVoiceCore
vi.mock('react', () => ({
    useEffect: vi.fn(),
    useState: vi.fn(() => [null, vi.fn()]),
    useCallback: vi.fn((fn: any) => fn),
    useRef: vi.fn(() => ({ current: null })),
}));

// ============================================================================
// Import after mocks
// ============================================================================

import { VoiceCore, getVoiceCore } from '../../voiceCoreIntegration';

// ============================================================================
// Tests
// ============================================================================

describe('VoiceCore', () => {
    let voiceCore: VoiceCore;

    beforeEach(() => {
        vi.clearAllMocks();
        capturedEvents = {};
        mockHasGeminiKey.mockReturnValue(false);
        mockElevenLabsIsAvailable.mockReturnValue(true);
        mockBrowserSTTIsAvailable.mockReturnValue(true);
        mockOrchestratorProcessText.mockResolvedValue('AI response');

        voiceCore = new VoiceCore({ debugMode: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // Constructor & Initialization
    // =========================================================================

    describe('constructor', () => {
        it('should initialize with default state', () => {
            const state = voiceCore.getState();
            expect(state.isListening).toBe(false);
            expect(state.isProcessing).toBe(false);
            expect(state.isSpeaking).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should accept custom config', () => {
            const vc = new VoiceCore({
                sttProvider: 'browser',
                ttsProvider: 'browser',
                enableCodebaseAwareness: false,
                enableKnowledgeInjection: false,
                debugMode: false,
            });
            const state = vc.getState();
            expect(state.isListening).toBe(false);
        });
    });

    describe('initialize()', () => {
        it('should load codebase graph when awareness is enabled', async () => {
            await voiceCore.initialize();
            expect(mockCodebaseLoadGraph).toHaveBeenCalled();
        });

        it('should skip codebase graph when awareness is disabled', async () => {
            const vc = new VoiceCore({ enableCodebaseAwareness: false });
            await vc.initialize();
            expect(mockCodebaseLoadGraph).not.toHaveBeenCalled();
        });

        it('should not initialize twice', async () => {
            await voiceCore.initialize();
            await voiceCore.initialize();
            expect(mockCodebaseLoadGraph).toHaveBeenCalledTimes(1);
        });

        it('should handle initialization errors gracefully', async () => {
            mockCodebaseLoadGraph.mockRejectedValueOnce(new Error('graph load failed'));
            await voiceCore.initialize();
            const state = voiceCore.getState();
            // handleError sets: `${message}: ${errorMessage}`
            expect(state.error).toContain('Failed to initialize VoiceCore');
        });
    });

    // =========================================================================
    // startListening()
    // =========================================================================

    describe('startListening()', () => {
        it('should not start if already listening', async () => {
            // First call
            await voiceCore.startListening();
            mockBrowserSTTStartStreaming.mockClear();

            // Second call should be a no-op
            await voiceCore.startListening();
            expect(mockBrowserSTTStartStreaming).not.toHaveBeenCalled();
        });

        it('should use browser STT when Gemini is not available', async () => {
            mockHasGeminiKey.mockReturnValue(false);
            await voiceCore.startListening();

            expect(mockBrowserSTTStartStreaming).toHaveBeenCalled();
            expect(voiceCore.getState().sttProvider).toBe('browser');
        });

        it('should use orchestrator when Gemini is available', async () => {
            mockHasGeminiKey.mockReturnValue(true);
            const vc = new VoiceCore({ sttProvider: 'gemini' });
            await vc.startListening();

            expect(mockOrchestratorStart).toHaveBeenCalled();
            expect(vc.getState().sttProvider).toBe('gemini');
        });

        it('should update state to isListening', async () => {
            await voiceCore.startListening();
            expect(voiceCore.getState().isListening).toBe(true);
        });

        it('should handle start errors', async () => {
            mockBrowserSTTStartStreaming.mockRejectedValueOnce(new Error('mic denied'));
            await voiceCore.startListening();

            expect(voiceCore.getState().isListening).toBe(false);
            expect(voiceCore.getState().error).toContain('Failed to start listening');
        });
    });

    // =========================================================================
    // stopListening()
    // =========================================================================

    describe('stopListening()', () => {
        it('should return empty string if not listening', async () => {
            const result = await voiceCore.stopListening();
            expect(result).toBe('');
        });

        it('should stop browser STT and return transcript', async () => {
            await voiceCore.startListening();
            const result = await voiceCore.stopListening();

            expect(mockBrowserSTTStopStreaming).toHaveBeenCalled();
            expect(result).toBe('final transcript');
            expect(voiceCore.getState().isListening).toBe(false);
        });

        it('should stop orchestrator when using Gemini STT', async () => {
            mockHasGeminiKey.mockReturnValue(true);
            const vc = new VoiceCore({ sttProvider: 'gemini' });
            await vc.startListening();
            await vc.stopListening();

            expect(mockOrchestratorStop).toHaveBeenCalled();
        });

        it('should handle stop errors gracefully', async () => {
            await voiceCore.startListening();
            mockBrowserSTTStopStreaming.mockRejectedValueOnce(new Error('stop failed'));

            const result = await voiceCore.stopListening();
            expect(result).toBe('');
            expect(voiceCore.getState().isListening).toBe(false);
        });
    });

    // =========================================================================
    // processTranscript()
    // =========================================================================

    describe('processTranscript()', () => {
        it('should return empty string for empty text', async () => {
            const result = await voiceCore.processTranscript('');
            expect(result).toBe('');
        });

        it('should process text through orchestrator pipeline', async () => {
            const result = await voiceCore.processTranscript('What is the weather?');

            expect(mockOrchestratorProcessText).toHaveBeenCalled();
            expect(result).toBe('AI response');
        });

        it('should include codebase context when awareness is enabled', async () => {
            await voiceCore.processTranscript('Hello');

            expect(mockOrchestratorProcessText).toHaveBeenCalledWith(
                expect.stringContaining('CURRENT_APP_STATE')
            );
        });

        it('should skip codebase context when awareness is disabled', async () => {
            const vc = new VoiceCore({ enableCodebaseAwareness: false });
            await vc.processTranscript('Hello');

            expect(mockOrchestratorProcessText).toHaveBeenCalledWith('Hello');
        });

        it('should update state with response', async () => {
            await voiceCore.processTranscript('Test');
            expect(voiceCore.getState().lastResponse).toBe('AI response');
            expect(voiceCore.getState().isProcessing).toBe(false);
        });

        it('should call onResponse callback', async () => {
            const onResponse = vi.fn();
            voiceCore.onResponse = onResponse;

            await voiceCore.processTranscript('Test');
            expect(onResponse).toHaveBeenCalledWith('AI response');
        });

        it('should handle processing errors', async () => {
            mockOrchestratorProcessText.mockRejectedValueOnce(new Error('reasoning failed'));
            const result = await voiceCore.processTranscript('Test');

            expect(result).toBe('');
            expect(voiceCore.getState().isProcessing).toBe(false);
            expect(voiceCore.getState().error).toContain('Failed to process');
        });
    });

    // =========================================================================
    // speak()
    // =========================================================================

    describe('speak()', () => {
        it('should not speak empty text', async () => {
            await voiceCore.speak('');
            expect(mockElevenLabsSynthesizeAndPlay).not.toHaveBeenCalled();
            expect(mockBrowserTTSSpeak).not.toHaveBeenCalled();
        });

        it('should use ElevenLabs when available', async () => {
            await voiceCore.speak('Hello');
            expect(mockElevenLabsSynthesizeAndPlay).toHaveBeenCalledWith('Hello', 'Mike');
        });

        it('should use browser TTS when ElevenLabs is unavailable', async () => {
            mockElevenLabsIsAvailable.mockReturnValue(false);
            const vc = new VoiceCore({ ttsProvider: 'browser' });
            await vc.speak('Hello');

            expect(mockBrowserTTSSpeak).toHaveBeenCalledWith('Hello', 'default');
        });

        it('should fall back to browser TTS on ElevenLabs error', async () => {
            mockElevenLabsSynthesizeAndPlay.mockRejectedValueOnce(new Error('TTS error'));
            await voiceCore.speak('Hello');

            expect(mockBrowserTTSSpeak).toHaveBeenCalled();
        });

        it('should update isSpeaking state', async () => {
            await voiceCore.speak('Hello');
            expect(voiceCore.getState().isSpeaking).toBe(false);
        });
    });

    // =========================================================================
    // navigateTo()
    // =========================================================================

    describe('navigateTo()', () => {
        it('should navigate to a valid destination', () => {
            const onNavigate = vi.fn();
            voiceCore.onNavigate = onNavigate;

            const result = voiceCore.navigateTo('dashboard');

            expect(result.success).toBe(true);
            expect(result.mode).toBe('DASHBOARD');
            expect(onNavigate).toHaveBeenCalledWith('DASHBOARD', undefined);
        });

        it('should return error for invalid destination', () => {
            mockCodebaseParseNavigationIntent.mockReturnValueOnce(null);
            const result = voiceCore.navigateTo('nonexistent');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Could not understand');
        });

        it('should include subtab in navigation', () => {
            const onNavigate = vi.fn();
            voiceCore.onNavigate = onNavigate;

            const result = voiceCore.navigateTo('agents');

            expect(result.success).toBe(true);
            expect(result.subtab).toBe('control-center');
            expect(onNavigate).toHaveBeenCalledWith('AGENT_CONTROL', 'control-center');
        });

        it('should update currentMode in state', () => {
            voiceCore.navigateTo('dashboard');
            expect(voiceCore.getState().currentMode).toBe('DASHBOARD');
        });

        it('should work without onNavigate handler', () => {
            voiceCore.onNavigate = null;
            const result = voiceCore.navigateTo('dashboard');
            expect(result.success).toBe(true);
        });
    });

    // =========================================================================
    // subscribe()
    // =========================================================================

    describe('subscribe()', () => {
        it('should call listener immediately with current state', () => {
            const listener = vi.fn();
            voiceCore.subscribe(listener);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ isListening: false })
            );
        });

        it('should notify listeners on state changes', async () => {
            const listener = vi.fn();
            voiceCore.subscribe(listener);
            listener.mockClear();

            await voiceCore.startListening();

            expect(listener).toHaveBeenCalled();
        });

        it('should return unsubscribe function', () => {
            const listener = vi.fn();
            const unsub = voiceCore.subscribe(listener);
            listener.mockClear();

            unsub();

            // Trigger state change
            voiceCore.navigateTo('dashboard');
            expect(listener).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // handleToolCall()
    // =========================================================================

    describe('handleToolCall (via event handlers)', () => {
        it('should handle navigate tool call', async () => {
            const onNavigate = vi.fn();
            voiceCore.onNavigate = onNavigate;

            // Access private handleToolCall via captured events
            if (capturedEvents.onToolCall) {
                const result = await capturedEvents.onToolCall('navigate', { destination: 'dashboard' });
                expect(result.status).toBe('success');
            }
        });

        it('should handle navigate_to_mode tool call', async () => {
            const onNavigate = vi.fn();
            voiceCore.onNavigate = onNavigate;

            if (capturedEvents.onToolCall) {
                const result = await capturedEvents.onToolCall('navigate_to_mode', { target: 'dashboard' });
                expect(result.status).toBe('success');
            }
        });

        it('should handle switch_agent tool call', async () => {
            if (capturedEvents.onToolCall) {
                const result = await capturedEvents.onToolCall('switch_agent', { agentName: 'Aria' });
                expect(result.status).toBe('success');
                expect(result.data).toEqual({ agent: 'Aria' });
            }
        });

        it('should dispatch unknown tools to onAction handler', async () => {
            const onAction = vi.fn();
            voiceCore.onAction = onAction;

            if (capturedEvents.onToolCall) {
                const result = await capturedEvents.onToolCall('custom_action', { key: 'val' });
                expect(result.status).toBe('success');
                expect(onAction).toHaveBeenCalledWith('custom_action', { key: 'val' });
            }
        });

        it('should return error for unknown tools without onAction handler', async () => {
            voiceCore.onAction = null;

            if (capturedEvents.onToolCall) {
                const result = await capturedEvents.onToolCall('unknown_tool', {});
                expect(result.status).toBe('error');
                expect(result.message).toContain('Unknown tool');
            }
        });
    });

    // =========================================================================
    // Event Handlers
    // =========================================================================

    describe('event handlers from orchestrator', () => {
        it('should update state on transcript update (user)', () => {
            if (capturedEvents.onTranscriptUpdate) {
                capturedEvents.onTranscriptUpdate({ role: 'user', text: 'hello' });
                expect(voiceCore.getState().currentTranscript).toBe('hello');
            }
        });

        it('should update state on transcript update (model)', () => {
            if (capturedEvents.onTranscriptUpdate) {
                capturedEvents.onTranscriptUpdate({ role: 'model', text: 'response' });
                expect(voiceCore.getState().lastResponse).toBe('response');
            }
        });

        it('should update state on partial transcript', () => {
            const onTranscript = vi.fn();
            voiceCore.onTranscript = onTranscript;

            if (capturedEvents.onPartialTranscript) {
                capturedEvents.onPartialTranscript({ text: 'partial...' });
                expect(voiceCore.getState().currentTranscript).toBe('partial...');
                expect(onTranscript).toHaveBeenCalledWith('partial...', false);
            }
        });

        it('should update isProcessing on processing events', () => {
            if (capturedEvents.onProcessingStart) {
                capturedEvents.onProcessingStart();
                expect(voiceCore.getState().isProcessing).toBe(true);
            }

            if (capturedEvents.onProcessingEnd) {
                capturedEvents.onProcessingEnd();
                expect(voiceCore.getState().isProcessing).toBe(false);
            }
        });

        it('should handle orchestrator errors', () => {
            if (capturedEvents.onError) {
                capturedEvents.onError(new Error('test error'));
                expect(voiceCore.getState().error).toContain('test error');
            }
        });
    });

    // =========================================================================
    // Other Methods
    // =========================================================================

    describe('setCurrentMode()', () => {
        it('should update currentMode in state', () => {
            voiceCore.setCurrentMode('AGENT_CONTROL' as any);
            expect(voiceCore.getState().currentMode).toBe('AGENT_CONTROL');
        });
    });

    describe('switchAgent()', () => {
        it('should delegate to orchestrator', async () => {
            const agent = { id: 'aria', name: 'Aria', gender: 'female' as const, voice: 'Shimmer', systemPrompt: '' };
            await voiceCore.switchAgent(agent);
            expect(mockOrchestratorSwitchAgent).toHaveBeenCalledWith(agent);
        });
    });

    describe('updateMentalState()', () => {
        it('should update orchestrator config', () => {
            voiceCore.updateMentalState({ skepticism: 80 });
            expect(mockOrchestratorUpdateConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    mentalState: expect.objectContaining({ skepticism: 80 }),
                })
            );
        });
    });

    describe('getCodebaseContext()', () => {
        it('should return codebase context', () => {
            const ctx = voiceCore.getCodebaseContext();
            expect(mockCodebaseBuildContext).toHaveBeenCalled();
            expect(ctx).toBe('mode: dashboard');
        });
    });

    describe('findComponent()', () => {
        it('should delegate to codebaseAwareness', () => {
            voiceCore.findComponent('dashboard');
            expect(mockCodebaseFindComponent).toHaveBeenCalledWith('dashboard');
        });
    });

    describe('diagnose()', () => {
        it('should return health status', async () => {
            const health = await voiceCore.diagnose();
            expect(health.overall).toBe('healthy');
        });
    });

    describe('checkViability()', () => {
        it('should return viability status', async () => {
            const result = await voiceCore.checkViability();
            expect(result.viable).toBe(true);
        });
    });
});

// ============================================================================
// getVoiceCore singleton
// ============================================================================

describe('getVoiceCore()', () => {
    it('should return a VoiceCore instance', () => {
        const core = getVoiceCore();
        expect(core).toBeInstanceOf(VoiceCore);
    });

    it('should return the same instance on subsequent calls', () => {
        const core1 = getVoiceCore();
        const core2 = getVoiceCore();
        expect(core1).toBe(core2);
    });
});
