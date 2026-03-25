import { describe, it, expect, vi } from 'vitest';

// Mock all sub-modules before importing
vi.mock('../reasoning', () => ({
    createClaudeReasoning: vi.fn().mockReturnValue({ name: 'claude', isAvailable: () => true }),
    createGeminiReasoning: vi.fn().mockReturnValue({ name: 'gemini', isAvailable: () => true }),
    createGroundedGeminiReasoning: vi.fn().mockReturnValue({ name: 'gemini-grounded', isAvailable: () => true }),
    createDefaultReasoning: vi.fn().mockReturnValue({ name: 'default-reasoning', isAvailable: () => true }),
    CLAUDE_REASONING_MODELS: { fast: 'haiku', balanced: 'sonnet', deep: 'opus' },
    GEMINI_REASONING_MODELS: { fast: 'flash', balanced: 'pro', deep: 'ultra' },
}));

vi.mock('../tts', () => ({
    createElevenLabsTTS: vi.fn().mockReturnValue({ name: 'elevenlabs', isAvailable: () => true }),
    createBrowserTTS: vi.fn().mockReturnValue({ name: 'browser-tts', isAvailable: () => true }),
    createDefaultTTS: vi.fn().mockReturnValue({ name: 'default-tts', isAvailable: () => true }),
    getElevenLabsVoices: vi.fn().mockReturnValue([]),
    getBrowserVoices: vi.fn().mockReturnValue([]),
    isBrowserTTSAvailable: vi.fn().mockReturnValue(false),
    ELEVENLABS_VOICE_IDS: { default: 'voice-id-1' },
}));

vi.mock('../stt', () => ({
    createBrowserSTT: vi.fn().mockReturnValue({ name: 'browser-stt', isAvailable: () => true }),
    createDeepgramSTT: vi.fn().mockReturnValue({ name: 'deepgram', isAvailable: () => true }),
    createDefaultSTT: vi.fn().mockReturnValue({ name: 'default-stt', isAvailable: () => true }),
    isBrowserSTTAvailable: vi.fn().mockReturnValue(false),
    isDeepgramSTTAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('../vad', () => ({
    createSileroVAD: vi.fn().mockReturnValue({ name: 'silero', isAvailable: () => true }),
    createDefaultVAD: vi.fn().mockReturnValue({ name: 'default-vad', isAvailable: () => true }),
    isSileroVADAvailable: vi.fn().mockReturnValue(false),
}));

import {
    // Reasoning
    createClaudeReasoning,
    createGeminiReasoning,
    createGroundedGeminiReasoning,
    createDefaultReasoning,
    CLAUDE_REASONING_MODELS,
    GEMINI_REASONING_MODELS,
    // TTS
    createElevenLabsTTS,
    createBrowserTTS,
    createDefaultTTS,
    getElevenLabsVoices,
    getBrowserVoices,
    isBrowserTTSAvailable,
    ELEVENLABS_VOICE_IDS,
    // STT
    createBrowserSTT,
    createDeepgramSTT,
    createDefaultSTT,
    isBrowserSTTAvailable,
    isDeepgramSTTAvailable,
    // VAD
    createSileroVAD,
    createDefaultVAD,
    isSileroVADAvailable,
    // Composite
    createDefaultProviders,
} from '../index';

describe('Voice Nexus providers barrel exports', () => {
    it('exports all reasoning provider factories and constants', () => {
        expect(typeof createClaudeReasoning).toBe('function');
        expect(typeof createGeminiReasoning).toBe('function');
        expect(typeof createGroundedGeminiReasoning).toBe('function');
        expect(typeof createDefaultReasoning).toBe('function');
        expect(CLAUDE_REASONING_MODELS).toHaveProperty('fast');
        expect(CLAUDE_REASONING_MODELS).toHaveProperty('balanced');
        expect(CLAUDE_REASONING_MODELS).toHaveProperty('deep');
        expect(GEMINI_REASONING_MODELS).toHaveProperty('fast');
    });

    it('exports all TTS provider factories and utilities', () => {
        expect(typeof createElevenLabsTTS).toBe('function');
        expect(typeof createBrowserTTS).toBe('function');
        expect(typeof createDefaultTTS).toBe('function');
        expect(typeof getElevenLabsVoices).toBe('function');
        expect(typeof getBrowserVoices).toBe('function');
        expect(typeof isBrowserTTSAvailable).toBe('function');
        expect(ELEVENLABS_VOICE_IDS).toBeDefined();
    });

    it('exports all STT and VAD provider factories', () => {
        expect(typeof createBrowserSTT).toBe('function');
        expect(typeof createDeepgramSTT).toBe('function');
        expect(typeof createDefaultSTT).toBe('function');
        expect(typeof isBrowserSTTAvailable).toBe('function');
        expect(typeof isDeepgramSTTAvailable).toBe('function');
        expect(typeof createSileroVAD).toBe('function');
        expect(typeof createDefaultVAD).toBe('function');
        expect(typeof isSileroVADAvailable).toBe('function');
    });

    it('createDefaultProviders returns an object with stt, reasoning, and tts', () => {
        const providers = createDefaultProviders();
        expect(providers).toHaveProperty('stt');
        expect(providers).toHaveProperty('reasoning');
        expect(providers).toHaveProperty('tts');
        // Verify it called the underlying factory functions
        expect(createDefaultSTT).toHaveBeenCalled();
        expect(createDefaultReasoning).toHaveBeenCalled();
        expect(createDefaultTTS).toHaveBeenCalled();
    });
});
