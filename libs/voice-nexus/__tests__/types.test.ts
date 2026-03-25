import { describe, it, expect } from 'vitest';
import type {
    VoiceMode,
    ReasoningTier,
    VoiceNexusConfig,
    VoiceNexusState,
    Transcript,
    PartialTranscript,
    STTProvider,
    TTSProvider,
    ReasoningProvider,
    ReasoningConfig,
    ReasoningResult,
    ComplexitySignals,
    ComplexityResult,
    SearchResult,
    Finding,
    KnowledgeContext,
    KnowledgeInjector,
    AudioConfig,
    FrequencyData,
    VADState,
    VADProvider,
    VoiceToolCall,
    VoiceToolResult,
    VoiceToolHandler,
    VoiceNexusEvents,
    VoiceNexusOptions,
    ProviderSelection,
    VoiceConfig,
    TTSSettings,
} from '../types';

/**
 * Type-level tests for voice-nexus types.
 * These verify that the type contracts compile correctly and that
 * objects conforming to the interfaces behave as expected at runtime.
 */

describe('Voice Nexus Types', () => {
    describe('VoiceMode', () => {
        it('accepts valid voice modes', () => {
            const modes: VoiceMode[] = ['realtime', 'turn-based', 'hybrid'];
            expect(modes).toHaveLength(3);
            expect(modes).toContain('realtime');
            expect(modes).toContain('turn-based');
            expect(modes).toContain('hybrid');
        });
    });

    describe('ReasoningTier', () => {
        it('accepts valid reasoning tiers', () => {
            const tiers: ReasoningTier[] = ['fast', 'balanced', 'deep'];
            expect(tiers).toHaveLength(3);
            expect(tiers).toContain('fast');
            expect(tiers).toContain('balanced');
            expect(tiers).toContain('deep');
        });
    });

    describe('VoiceNexusConfig', () => {
        it('can be created with minimal required fields', () => {
            const config: VoiceNexusConfig = {
                mode: 'turn-based',
                knowledgeInjection: false,
            };
            expect(config.mode).toBe('turn-based');
            expect(config.knowledgeInjection).toBe(false);
            expect(config.agent).toBeUndefined();
            expect(config.providers).toBeUndefined();
            expect(config.complexity).toBeUndefined();
        });

        it('can be created with all optional fields', () => {
            const config: VoiceNexusConfig = {
                mode: 'realtime',
                knowledgeInjection: true,
                agent: {
                    id: 'agent-1',
                    name: 'TestAgent',
                    expertise: ['coding', 'design'],
                },
                providers: {},
                complexity: {
                    balancedThreshold: 0.3,
                    deepThreshold: 0.7,
                },
            };
            expect(config.agent?.id).toBe('agent-1');
            expect(config.agent?.expertise).toEqual(['coding', 'design']);
            expect(config.complexity?.balancedThreshold).toBe(0.3);
        });
    });

    describe('VoiceNexusState', () => {
        it('contains all required state fields', () => {
            const state: VoiceNexusState = {
                mode: 'turn-based',
                isActive: false,
                isProcessing: false,
                currentProvider: {
                    stt: 'none',
                    reasoning: 'none',
                    tts: 'none',
                },
                transcripts: [],
                lastComplexityScore: 0,
                knowledgeContext: null,
                error: null,
            };
            expect(state.isActive).toBe(false);
            expect(state.transcripts).toEqual([]);
            expect(state.error).toBeNull();
        });
    });

    describe('Transcript', () => {
        it('can represent a user transcript', () => {
            const transcript: Transcript = {
                id: 'tx-1',
                role: 'user',
                text: 'Hello world',
                timestamp: Date.now(),
            };
            expect(transcript.role).toBe('user');
            expect(transcript.complexity).toBeUndefined();
        });

        it('can represent a model transcript with extras', () => {
            const transcript: Transcript = {
                id: 'tx-2',
                role: 'model',
                text: 'Response text',
                timestamp: Date.now(),
                complexity: 0.75,
                provider: 'claude-opus',
                knowledgeUsed: true,
                latencyMs: 450,
                model: 'claude-opus-4-20250514',
            };
            expect(transcript.complexity).toBe(0.75);
            expect(transcript.provider).toBe('claude-opus');
        });
    });

    describe('PartialTranscript', () => {
        it('supports user and model roles', () => {
            const userPartial: PartialTranscript = { role: 'user', text: 'partial...' };
            const modelPartial: PartialTranscript = { role: 'model', text: 'generating...' };
            expect(userPartial.role).toBe('user');
            expect(modelPartial.role).toBe('model');
        });
    });

    describe('Provider interfaces', () => {
        it('STTProvider interface can be implemented', () => {
            const stt: STTProvider = {
                name: 'test-stt',
                supportsStreaming: true,
                transcribe: async (_audio: Blob) => 'transcribed text',
                isAvailable: () => true,
            };
            expect(stt.name).toBe('test-stt');
            expect(stt.supportsStreaming).toBe(true);
            expect(stt.isAvailable()).toBe(true);
        });

        it('TTSProvider interface can be implemented', () => {
            const voice: VoiceConfig = {
                id: 'v1',
                name: 'Default',
                gender: 'neutral',
                description: 'A neutral voice',
                language: 'en',
            };
            const tts: TTSProvider = {
                name: 'test-tts',
                supportsStreaming: false,
                voices: [voice],
                synthesize: async () => new ArrayBuffer(0),
                getVoiceForAgent: () => 'v1',
                isAvailable: () => true,
            };
            expect(tts.voices).toHaveLength(1);
            expect(tts.getVoiceForAgent('any')).toBe('v1');
        });

        it('ReasoningProvider interface can be implemented', () => {
            const reasoning: ReasoningProvider = {
                name: 'test-reasoning',
                models: { fast: 'model-fast', balanced: 'model-balanced', deep: 'model-deep' },
                generate: async (_prompt, _config) => ({
                    text: 'response',
                    model: 'model-balanced',
                }),
                isAvailable: () => true,
            };
            expect(reasoning.models.fast).toBe('model-fast');
            expect(reasoning.isAvailable()).toBe(true);
        });
    });

    describe('ComplexitySignals and ComplexityResult', () => {
        it('ComplexitySignals captures all signal types', () => {
            const signals: ComplexitySignals = {
                tokenCount: 15,
                hasCodeIndicators: true,
                hasReasoningIndicators: false,
                hasCreativeIndicators: false,
                hasNavigationIndicators: false,
                hasQuestionIndicators: true,
                domainComplexity: 0.65,
            };
            expect(signals.tokenCount).toBe(15);
            expect(signals.hasCodeIndicators).toBe(true);
        });

        it('ComplexityResult includes score, tier, signals, and provider', () => {
            const result: ComplexityResult = {
                score: 0.6,
                tier: 'balanced',
                signals: {
                    tokenCount: 10,
                    hasCodeIndicators: false,
                    hasReasoningIndicators: true,
                    hasCreativeIndicators: false,
                    hasNavigationIndicators: false,
                    hasQuestionIndicators: true,
                    domainComplexity: 0.5,
                },
                recommendedProvider: {
                    reasoning: 'claude-sonnet',
                    tts: 'elevenlabs',
                },
            };
            expect(result.tier).toBe('balanced');
            expect(result.recommendedProvider.reasoning).toBe('claude-sonnet');
        });
    });

    describe('Knowledge types', () => {
        it('KnowledgeContext assembles search results and findings', () => {
            const ctx: KnowledgeContext = {
                searchResults: [
                    { content: 'result 1', similarity: 0.95, category: 'tech', tags: ['ai'] },
                ],
                findings: [
                    { type: 'insight', content: 'key finding', source: 'paper.pdf' },
                ],
                agentExpertise: ['coding'],
                injectedPrompt: 'Context: ...',
            };
            expect(ctx.searchResults).toHaveLength(1);
            expect(ctx.findings?.[0].type).toBe('insight');
        });
    });

    describe('VADState', () => {
        it('accepts all valid states', () => {
            const states: VADState[] = ['idle', 'loading', 'listening', 'speaking', 'paused'];
            expect(states).toHaveLength(5);
        });
    });

    describe('VoiceToolCall and VoiceToolResult', () => {
        it('tool call has name and args', () => {
            const call: VoiceToolCall = {
                name: 'search',
                args: { query: 'test', limit: 10 },
            };
            expect(call.name).toBe('search');
            expect(call.args.query).toBe('test');
        });

        it('tool result has status and optional data/error', () => {
            const success: VoiceToolResult = { status: 'success', data: { items: [] } };
            const failure: VoiceToolResult = { status: 'error', error: 'Not found' };
            expect(success.status).toBe('success');
            expect(failure.error).toBe('Not found');
        });
    });

    describe('ProviderSelection', () => {
        it('contains reasoning, tts, and tier', () => {
            const selection: ProviderSelection = {
                reasoning: 'claude-opus',
                tts: 'elevenlabs',
                reasoningTier: 'deep',
            };
            expect(selection.reasoningTier).toBe('deep');
        });
    });
});
