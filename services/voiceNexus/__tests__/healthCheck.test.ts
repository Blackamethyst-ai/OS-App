import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock functions first
const mockGeminiLiveSTTIsAvailable = vi.fn(() => true);
const mockBrowserSTTIsAvailable = vi.fn(() => true);
const mockBrowserSTTIsCurrentlyStreaming = vi.fn(() => false);
const mockClaudeReasoningIsAvailable = vi.fn(() => true);
const mockGeminiReasoningIsAvailable = vi.fn(() => true);
const mockElevenLabsTTSIsAvailable = vi.fn(() => true);
const mockBrowserTTSIsAvailable = vi.fn(() => true);
const mockKnowledgeCheckAvailability = vi.fn(async () => true);

vi.mock('../providers/stt/geminiLive', () => ({
    geminiLiveSTT: {
        isAvailable: () => mockGeminiLiveSTTIsAvailable(),
        supportsStreaming: true,
    },
}));

vi.mock('../providers/stt/browserSTT', () => ({
    browserSTT: {
        isAvailable: () => mockBrowserSTTIsAvailable(),
        isCurrentlyStreaming: () => mockBrowserSTTIsCurrentlyStreaming(),
        supportsStreaming: true,
    },
}));

vi.mock('../providers/reasoning/claudeReasoning', () => ({
    claudeReasoning: {
        isAvailable: () => mockClaudeReasoningIsAvailable(),
        models: ['claude-opus-5', 'claude-sonnet-5'],
    },
}));

vi.mock('../providers/reasoning/geminiReasoning', () => ({
    geminiReasoning: {
        isAvailable: () => mockGeminiReasoningIsAvailable(),
        models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    },
}));

vi.mock('../providers/tts/elevenLabsTTS', () => ({
    elevenLabsTTS: {
        isAvailable: () => mockElevenLabsTTSIsAvailable(),
        supportsStreaming: true,
        voices: [{ name: 'Rachel' }, { name: 'Domi' }],
    },
}));

vi.mock('../providers/tts/browserTTS', () => ({
    browserTTS: {
        isAvailable: () => mockBrowserTTSIsAvailable(),
    },
}));

vi.mock('../knowledgeInjector', () => ({
    knowledgeInjector: {
        checkAvailability: () => mockKnowledgeCheckAvailability(),
    },
}));

// Import after mocks
import {
    checkGeminiSTTHealth,
    checkBrowserSTTHealth,
    checkClaudeHealth,
    checkGeminiReasoningHealth,
    checkElevenLabsHealth,
    checkBrowserTTSHealth,
    checkKnowledgeHealth,
    checkVoiceSystemHealth,
    formatHealthReport,
    isVoiceSystemViable,
    voiceHealthCheck,
} from '../healthCheck';

describe('VoiceNexus Health Check', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset all to available
        mockGeminiLiveSTTIsAvailable.mockReturnValue(true);
        mockBrowserSTTIsAvailable.mockReturnValue(true);
        mockBrowserSTTIsCurrentlyStreaming.mockReturnValue(false);
        mockClaudeReasoningIsAvailable.mockReturnValue(true);
        mockGeminiReasoningIsAvailable.mockReturnValue(true);
        mockElevenLabsTTSIsAvailable.mockReturnValue(true);
        mockBrowserTTSIsAvailable.mockReturnValue(true);
        mockKnowledgeCheckAvailability.mockResolvedValue(true);
    });

    describe('checkGeminiSTTHealth', () => {
        it('should return healthy when available', async () => {
            const health = await checkGeminiSTTHealth();

            expect(health.name).toBe('gemini-live-stt');
            expect(health.status).toBe('healthy');
            expect(health.available).toBe(true);
            expect(health.details?.supportsStreaming).toBe(true);
        });

        it('should return unavailable when not available', async () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);

            const health = await checkGeminiSTTHealth();

            expect(health.status).toBe('unavailable');
            expect(health.available).toBe(false);
            expect(health.error).toContain('not configured');
        });

        it('should return error status on exception', async () => {
            mockGeminiLiveSTTIsAvailable.mockImplementation(() => {
                throw new Error('API crash');
            });

            const health = await checkGeminiSTTHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('API crash');
        });
    });

    describe('checkBrowserSTTHealth', () => {
        it('should return healthy when available', async () => {
            const health = await checkBrowserSTTHealth();

            expect(health.name).toBe('browser-stt');
            expect(health.status).toBe('healthy');
            expect(health.available).toBe(true);
            expect(health.details?.isCurrentlyStreaming).toBe(false);
        });

        it('should return unavailable when not available', async () => {
            mockBrowserSTTIsAvailable.mockReturnValue(false);

            const health = await checkBrowserSTTHealth();

            expect(health.status).toBe('unavailable');
            expect(health.error).toContain('Web Speech API');
        });

        it('should handle exceptions', async () => {
            mockBrowserSTTIsAvailable.mockImplementation(() => {
                throw new Error('Browser error');
            });

            const health = await checkBrowserSTTHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('Browser error');
        });
    });

    describe('checkClaudeHealth', () => {
        it('should return healthy when available', async () => {
            const health = await checkClaudeHealth();

            expect(health.name).toBe('claude-reasoning');
            expect(health.status).toBe('healthy');
            expect(health.details?.models).toEqual(['claude-opus-5', 'claude-sonnet-5']);
        });

        it('should return unavailable when not configured', async () => {
            mockClaudeReasoningIsAvailable.mockReturnValue(false);

            const health = await checkClaudeHealth();

            expect(health.status).toBe('unavailable');
            expect(health.error).toContain('Claude API key');
        });

        it('should handle exceptions', async () => {
            mockClaudeReasoningIsAvailable.mockImplementation(() => {
                throw new Error('Claude service error');
            });

            const health = await checkClaudeHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('Claude service error');
        });
    });

    describe('checkGeminiReasoningHealth', () => {
        it('should return healthy when available', async () => {
            const health = await checkGeminiReasoningHealth();

            expect(health.name).toBe('gemini-reasoning');
            expect(health.status).toBe('healthy');
        });

        it('should return unavailable when not configured', async () => {
            mockGeminiReasoningIsAvailable.mockReturnValue(false);

            const health = await checkGeminiReasoningHealth();

            expect(health.status).toBe('unavailable');
        });

        it('should handle exceptions', async () => {
            mockGeminiReasoningIsAvailable.mockImplementation(() => {
                throw new Error('Gemini service error');
            });

            const health = await checkGeminiReasoningHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('Gemini service error');
        });

        it('should handle non-Error exceptions', async () => {
            mockGeminiReasoningIsAvailable.mockImplementation(() => {
                throw 'String error'; // Non-Error thrown
            });

            const health = await checkGeminiReasoningHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('String error');
        });
    });

    describe('checkElevenLabsHealth', () => {
        it('should return healthy with voice details', async () => {
            const health = await checkElevenLabsHealth();

            expect(health.name).toBe('elevenlabs-tts');
            expect(health.status).toBe('healthy');
            expect(health.details?.voiceCount).toBe(2);
            expect(health.details?.availableVoices).toEqual(['Rachel', 'Domi']);
        });

        it('should return unavailable when not configured', async () => {
            mockElevenLabsTTSIsAvailable.mockReturnValue(false);

            const health = await checkElevenLabsHealth();

            expect(health.status).toBe('unavailable');
            expect(health.error).toContain('ElevenLabs API key');
        });

        it('should handle exceptions', async () => {
            mockElevenLabsTTSIsAvailable.mockImplementation(() => {
                throw new Error('ElevenLabs service error');
            });

            const health = await checkElevenLabsHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('ElevenLabs service error');
        });

        it('should handle non-Error exceptions', async () => {
            mockElevenLabsTTSIsAvailable.mockImplementation(() => {
                throw 'ElevenLabs string error';
            });

            const health = await checkElevenLabsHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('ElevenLabs string error');
        });
    });

    describe('checkBrowserTTSHealth', () => {
        it('should return healthy when available', async () => {
            const health = await checkBrowserTTSHealth();

            expect(health.name).toBe('browser-tts');
            expect(health.status).toBe('healthy');
        });

        it('should return unavailable when not supported', async () => {
            mockBrowserTTSIsAvailable.mockReturnValue(false);

            const health = await checkBrowserTTSHealth();

            expect(health.status).toBe('unavailable');
        });

        it('should handle exceptions', async () => {
            mockBrowserTTSIsAvailable.mockImplementation(() => {
                throw new Error('Browser TTS error');
            });

            const health = await checkBrowserTTSHealth();

            expect(health.status).toBe('error');
            expect(health.error).toBe('Browser TTS error');
        });

        it('should handle non-Error exceptions', async () => {
            mockBrowserTTSIsAvailable.mockImplementation(() => {
                throw { message: 'Object error' };
            });

            const health = await checkBrowserTTSHealth();

            expect(health.status).toBe('error');
            expect(health.error).toContain('Object');
        });
    });

    describe('checkKnowledgeHealth', () => {
        it('should return healthy when API reachable', async () => {
            const health = await checkKnowledgeHealth();

            expect(health.name).toBe('knowledge-injector');
            expect(health.status).toBe('healthy');
            expect(health.details?.endpoint).toBe('http://localhost:3847');
        });

        it('should return degraded when unavailable', async () => {
            mockKnowledgeCheckAvailability.mockResolvedValue(false);

            const health = await checkKnowledgeHealth();

            expect(health.status).toBe('degraded');
            expect(health.error).toContain('Agent Core API');
        });

        it('should return degraded on exception', async () => {
            mockKnowledgeCheckAvailability.mockRejectedValue(
                new Error('Network error')
            );

            const health = await checkKnowledgeHealth();

            expect(health.status).toBe('degraded');
            expect(health.error).toBe('Network error');
        });
    });

    describe('checkVoiceSystemHealth', () => {
        it('should return healthy overall when all providers available', async () => {
            const health = await checkVoiceSystemHealth();

            expect(health.overall).toBe('healthy');
            expect(health.issues).toHaveLength(0);
            expect(health.recommendations).toHaveLength(0);
        });

        it('should recommend gemini for STT when available', async () => {
            const health = await checkVoiceSystemHealth();

            expect(health.stt.recommended).toBe('gemini');
        });

        it('should fall back to browser STT when gemini unavailable', async () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.stt.recommended).toBe('browser');
            expect(health.overall).toBe('degraded');
            expect(health.issues.some(i => i.includes('Gemini STT unavailable'))).toBe(true);
        });

        it('should report critical when no STT available', async () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.overall).toBe('unavailable');
            expect(health.issues.some(i => i.includes('CRITICAL'))).toBe(true);
        });

        it('should report critical when no reasoning available', async () => {
            mockClaudeReasoningIsAvailable.mockReturnValue(false);
            mockGeminiReasoningIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.overall).toBe('unavailable');
            expect(health.issues.some(i => i.includes('No reasoning providers'))).toBe(true);
        });

        it('should report critical when no TTS available', async () => {
            mockElevenLabsTTSIsAvailable.mockReturnValue(false);
            mockBrowserTTSIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.overall).toBe('unavailable');
            expect(health.issues.some(i => i.includes('No TTS providers'))).toBe(true);
        });

        it('should recommend Claude when available', async () => {
            const health = await checkVoiceSystemHealth();

            expect(health.reasoning.recommended).toBe('claude');
        });

        it('should fall back to Gemini reasoning when Claude unavailable', async () => {
            mockClaudeReasoningIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.reasoning.recommended).toBe('gemini');
            expect(health.issues.some(i => i.includes('Claude unavailable'))).toBe(true);
        });

        it('should recommend ElevenLabs for TTS when available', async () => {
            const health = await checkVoiceSystemHealth();

            expect(health.tts.recommended).toBe('elevenlabs');
        });

        it('should fall back to browser TTS when ElevenLabs unavailable', async () => {
            mockElevenLabsTTSIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.tts.recommended).toBe('browser');
            expect(health.issues.some(i => i.includes('ElevenLabs unavailable'))).toBe(true);
        });

        it('should note knowledge injection unavailability', async () => {
            mockKnowledgeCheckAvailability.mockResolvedValue(false);

            const health = await checkVoiceSystemHealth();

            expect(health.issues.some(i => i.includes('Knowledge injection'))).toBe(true);
        });
    });

    describe('formatHealthReport', () => {
        it('should format healthy report', async () => {
            const health = await checkVoiceSystemHealth();
            const report = formatHealthReport(health);

            expect(report).toContain('VOICE NEXUS HEALTH REPORT');
            expect(report).toContain('Overall Status');
            expect(report).toContain('STT PROVIDERS');
            expect(report).toContain('REASONING PROVIDERS');
            expect(report).toContain('TTS PROVIDERS');
        });

        it('should include issues when present', async () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);

            const health = await checkVoiceSystemHealth();
            const report = formatHealthReport(health);

            expect(report).toContain('ISSUES:');
            expect(report).toContain('RECOMMENDATIONS:');
        });
    });

    describe('isVoiceSystemViable', () => {
        it('should return viable when all providers available', async () => {
            const result = await isVoiceSystemViable();

            expect(result.viable).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should return not viable when no STT', async () => {
            mockGeminiLiveSTTIsAvailable.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);

            const result = await isVoiceSystemViable();

            expect(result.viable).toBe(false);
            expect(result.reason).toContain('speech-to-text');
        });

        it('should return not viable when no reasoning', async () => {
            mockClaudeReasoningIsAvailable.mockReturnValue(false);
            mockGeminiReasoningIsAvailable.mockReturnValue(false);

            const result = await isVoiceSystemViable();

            expect(result.viable).toBe(false);
            expect(result.reason).toContain('reasoning');
        });

        it('should return not viable when no TTS', async () => {
            mockElevenLabsTTSIsAvailable.mockReturnValue(false);
            mockBrowserTTSIsAvailable.mockReturnValue(false);

            const result = await isVoiceSystemViable();

            expect(result.viable).toBe(false);
            expect(result.reason).toContain('text-to-speech');
        });
    });

    describe('voiceHealthCheck singleton', () => {
        it('should expose all health check functions', () => {
            expect(voiceHealthCheck.checkAll).toBe(checkVoiceSystemHealth);
            expect(voiceHealthCheck.checkSTT.gemini).toBe(checkGeminiSTTHealth);
            expect(voiceHealthCheck.checkSTT.browser).toBe(checkBrowserSTTHealth);
            expect(voiceHealthCheck.checkReasoning.claude).toBe(checkClaudeHealth);
            expect(voiceHealthCheck.checkReasoning.gemini).toBe(checkGeminiReasoningHealth);
            expect(voiceHealthCheck.checkTTS.elevenlabs).toBe(checkElevenLabsHealth);
            expect(voiceHealthCheck.checkTTS.browser).toBe(checkBrowserTTSHealth);
            expect(voiceHealthCheck.checkKnowledge).toBe(checkKnowledgeHealth);
            expect(voiceHealthCheck.isViable).toBe(isVoiceSystemViable);
            expect(voiceHealthCheck.formatReport).toBe(formatHealthReport);
        });
    });
});
