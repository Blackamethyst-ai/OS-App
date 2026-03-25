import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceNexusOrchestrator, createVoiceNexus, createMinimalVoiceNexus } from '../orchestrator';
import type {
    VoiceNexusOptions,
    ReasoningProvider,
    STTProvider,
    TTSProvider,
    KnowledgeInjector,
    VoiceNexusEvents,
} from '../types';

// Mock the router module
vi.mock('../router', () => ({
    analyzeComplexity: vi.fn().mockReturnValue({
        score: 0.5,
        tier: 'balanced',
        signals: {
            tokenCount: 5,
            hasCodeIndicators: false,
            hasReasoningIndicators: false,
            hasCreativeIndicators: false,
            hasNavigationIndicators: false,
            hasQuestionIndicators: false,
            domainComplexity: 0.5,
        },
        recommendedProvider: { reasoning: 'claude-sonnet', tts: 'elevenlabs' },
    }),
    hasExplicitOverride: vi.fn().mockReturnValue({ hasOverride: false }),
}));

// ---- Helpers ----

function createMockReasoningProvider(overrides: Partial<ReasoningProvider> = {}): ReasoningProvider {
    return {
        name: 'mock-reasoning',
        models: { fast: 'fast-model', balanced: 'balanced-model', deep: 'deep-model' },
        generate: vi.fn().mockResolvedValue({ text: 'mock response', model: 'balanced-model' }),
        isAvailable: vi.fn().mockReturnValue(true),
        ...overrides,
    };
}

function createMockSTTProvider(overrides: Partial<STTProvider> = {}): STTProvider {
    return {
        name: 'mock-stt',
        supportsStreaming: true,
        transcribe: vi.fn().mockResolvedValue('transcribed text'),
        startStreaming: vi.fn().mockResolvedValue(undefined),
        stopStreaming: vi.fn().mockResolvedValue('final text'),
        isAvailable: vi.fn().mockReturnValue(true),
        ...overrides,
    };
}

function createMockTTSProvider(overrides: Partial<TTSProvider> = {}): TTSProvider {
    return {
        name: 'mock-tts',
        supportsStreaming: false,
        voices: [{ id: 'v1', name: 'Default', gender: 'neutral' as const }],
        synthesize: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        getVoiceForAgent: vi.fn().mockReturnValue('v1'),
        isAvailable: vi.fn().mockReturnValue(true),
        ...overrides,
    };
}

function createMockKnowledgeInjector(overrides: Partial<KnowledgeInjector> = {}): KnowledgeInjector {
    return {
        injectContext: vi.fn().mockResolvedValue({
            searchResults: [{ content: 'relevant info', similarity: 0.9 }],
            injectedPrompt: 'Knowledge: relevant info',
        }),
        isAvailable: vi.fn().mockReturnValue(true),
        ...overrides,
    };
}

function createDefaultOptions(overrides: Partial<VoiceNexusOptions> = {}): VoiceNexusOptions {
    return {
        config: {
            mode: 'turn-based',
            knowledgeInjection: false,
            providers: {
                reasoning: createMockReasoningProvider(),
            },
        },
        ...overrides,
    };
}

// ---- Tests ----

describe('VoiceNexusOrchestrator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('initializes with correct default state', () => {
            const orchestrator = new VoiceNexusOrchestrator(createDefaultOptions());
            const state = orchestrator.getState();

            expect(state.mode).toBe('turn-based');
            expect(state.isActive).toBe(false);
            expect(state.isProcessing).toBe(false);
            expect(state.currentProvider.reasoning).toBe('mock-reasoning');
            expect(state.transcripts).toEqual([]);
            expect(state.lastComplexityScore).toBe(0);
            expect(state.knowledgeContext).toBeNull();
            expect(state.error).toBeNull();
        });

        it('sets provider names to "none" when no providers configured', () => {
            const orchestrator = new VoiceNexusOrchestrator({
                config: { mode: 'realtime', knowledgeInjection: false },
            });
            const state = orchestrator.getState();

            expect(state.currentProvider.stt).toBe('none');
            expect(state.currentProvider.reasoning).toBe('none');
            expect(state.currentProvider.tts).toBe('none');
        });
    });

    describe('getState', () => {
        it('returns a copy of state (not a reference)', () => {
            const orchestrator = new VoiceNexusOrchestrator(createDefaultOptions());
            const state1 = orchestrator.getState();
            const state2 = orchestrator.getState();

            expect(state1).toEqual(state2);
            expect(state1).not.toBe(state2);
        });
    });

    describe('setMode', () => {
        it('updates the voice mode', () => {
            const onStateChange = vi.fn();
            const orchestrator = new VoiceNexusOrchestrator(
                createDefaultOptions({ events: { onStateChange } })
            );

            orchestrator.setMode('realtime');
            expect(orchestrator.getState().mode).toBe('realtime');
            expect(onStateChange).toHaveBeenCalledWith(
                expect.objectContaining({ mode: 'realtime' })
            );
        });
    });

    describe('setSTTProvider / setTTSProvider / setReasoningProvider', () => {
        it('updates providers and fires onProviderSwitch', () => {
            const onProviderSwitch = vi.fn();
            const orchestrator = new VoiceNexusOrchestrator(
                createDefaultOptions({ events: { onProviderSwitch } })
            );

            const newSTT = createMockSTTProvider({ name: 'deepgram' });
            orchestrator.setSTTProvider(newSTT);
            expect(orchestrator.getState().currentProvider.stt).toBe('deepgram');
            expect(onProviderSwitch).toHaveBeenCalledWith({ stt: 'deepgram' });

            const newTTS = createMockTTSProvider({ name: 'elevenlabs' });
            orchestrator.setTTSProvider(newTTS);
            expect(orchestrator.getState().currentProvider.tts).toBe('elevenlabs');
            expect(onProviderSwitch).toHaveBeenCalledWith({ tts: 'elevenlabs' });

            const newReasoning = createMockReasoningProvider({ name: 'claude' });
            orchestrator.setReasoningProvider(newReasoning);
            expect(orchestrator.getState().currentProvider.reasoning).toBe('claude');
            expect(onProviderSwitch).toHaveBeenCalledWith({ reasoning: 'claude' });
        });
    });

    describe('processTextInput', () => {
        it('generates a response transcript via the reasoning provider', async () => {
            const reasoning = createMockReasoningProvider();
            const onTranscriptUpdate = vi.fn();
            const onComplexityAnalyzed = vi.fn();

            const orchestrator = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    knowledgeInjection: false,
                    providers: { reasoning },
                },
                events: { onTranscriptUpdate, onComplexityAnalyzed },
            });

            const result = await orchestrator.processTextInput('Hello there');

            expect(result).not.toBeNull();
            expect(result!.role).toBe('model');
            expect(result!.text).toBe('mock response');
            expect(reasoning.generate).toHaveBeenCalledOnce();
            expect(onTranscriptUpdate).toHaveBeenCalled();
            expect(onComplexityAnalyzed).toHaveBeenCalled();
        });

        it('returns null and sets error when no reasoning provider', async () => {
            const onError = vi.fn();
            const orchestrator = new VoiceNexusOrchestrator({
                config: { mode: 'turn-based', knowledgeInjection: false },
                events: { onError },
            });

            const result = await orchestrator.processTextInput('Hello');

            expect(result).toBeNull();
            expect(onError).toHaveBeenCalledWith(expect.any(Error));
            expect(orchestrator.getState().error).toBe('No reasoning provider configured');
        });

        it('injects knowledge when enabled and injector is available', async () => {
            const reasoning = createMockReasoningProvider();
            const injector = createMockKnowledgeInjector();
            const onKnowledgeInjected = vi.fn();

            const orchestrator = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    knowledgeInjection: true,
                    providers: { reasoning },
                    agent: { id: 'a1', name: 'TestAgent', expertise: ['coding'] },
                },
                events: { onKnowledgeInjected },
                knowledgeInjector: injector,
            });

            await orchestrator.processTextInput('How do I build an API?');

            expect(injector.injectContext).toHaveBeenCalledWith(
                'How do I build an API?',
                ['coding']
            );
            expect(onKnowledgeInjected).toHaveBeenCalled();
            // The enriched text should contain the knowledge prefix
            const generateCall = (reasoning.generate as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(generateCall[0]).toContain('Knowledge: relevant info');
        });
    });

    describe('processVoiceInput', () => {
        it('transcribes audio and processes text', async () => {
            const stt = createMockSTTProvider();
            const reasoning = createMockReasoningProvider();
            const onProcessingStart = vi.fn();
            const onProcessingEnd = vi.fn();

            const orchestrator = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    knowledgeInjection: false,
                    providers: { stt, reasoning },
                },
                events: { onProcessingStart, onProcessingEnd },
            });

            const blob = new Blob(['audio data'], { type: 'audio/wav' });
            const result = await orchestrator.processVoiceInput(blob);

            expect(stt.transcribe).toHaveBeenCalledWith(blob);
            expect(result).not.toBeNull();
            expect(result!.role).toBe('model');
            expect(onProcessingStart).toHaveBeenCalled();
            expect(onProcessingEnd).toHaveBeenCalled();
        });

        it('returns null when no STT provider', async () => {
            const onError = vi.fn();
            const orchestrator = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    knowledgeInjection: false,
                    providers: { reasoning: createMockReasoningProvider() },
                },
                events: { onError },
            });

            const blob = new Blob(['audio']);
            const result = await orchestrator.processVoiceInput(blob);

            expect(result).toBeNull();
            expect(onError).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('transcript management', () => {
        it('getTranscripts returns accumulated transcripts', async () => {
            const orchestrator = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    knowledgeInjection: false,
                    providers: { reasoning: createMockReasoningProvider() },
                },
            });

            await orchestrator.processTextInput('First message');
            await orchestrator.processTextInput('Second message');

            const transcripts = orchestrator.getTranscripts();
            // Each processTextInput adds one model transcript
            expect(transcripts.length).toBe(2);
            expect(transcripts[0].id).toBe('transcript-1');
            expect(transcripts[1].id).toBe('transcript-2');
        });

        it('clearTranscripts empties the transcript list', async () => {
            const orchestrator = new VoiceNexusOrchestrator({
                config: {
                    mode: 'turn-based',
                    knowledgeInjection: false,
                    providers: { reasoning: createMockReasoningProvider() },
                },
            });

            await orchestrator.processTextInput('Hello');
            expect(orchestrator.getTranscripts().length).toBe(1);

            orchestrator.clearTranscripts();
            expect(orchestrator.getTranscripts()).toEqual([]);
        });
    });
});

describe('Factory Functions', () => {
    it('createVoiceNexus returns an orchestrator instance', () => {
        const nexus = createVoiceNexus({
            config: { mode: 'turn-based', knowledgeInjection: false },
        });
        expect(nexus).toBeInstanceOf(VoiceNexusOrchestrator);
    });

    it('createMinimalVoiceNexus creates a turn-based instance with reasoning only', () => {
        const reasoning = createMockReasoningProvider();
        const onStateChange = vi.fn();

        const nexus = createMinimalVoiceNexus(reasoning, { onStateChange });
        const state = nexus.getState();

        expect(state.mode).toBe('turn-based');
        expect(state.currentProvider.reasoning).toBe('mock-reasoning');
        expect(state.currentProvider.stt).toBe('none');
        expect(state.currentProvider.tts).toBe('none');
    });
});

