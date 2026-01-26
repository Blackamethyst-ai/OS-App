import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    checkBrowserSTTHealth,
    checkBrowserTTSHealth,
    formatHealthReport,
    isVoiceSystemViable,
} from '../healthCheck';
import type { VoiceSystemHealth, ProviderHealth } from '../healthCheck';

// Mock the provider modules
vi.mock('../providers/stt/geminiLive', () => ({
    geminiLiveSTT: {
        isAvailable: vi.fn(() => false),
        supportsStreaming: true,
    },
}));

vi.mock('../providers/stt/browserSTT', () => ({
    browserSTT: {
        isAvailable: vi.fn(() => true),
        isCurrentlyStreaming: vi.fn(() => false),
        supportsStreaming: true,
    },
}));

vi.mock('../providers/reasoning/claudeReasoning', () => ({
    claudeReasoning: {
        isAvailable: vi.fn(() => true),
        models: {
            fast: 'claude-haiku',
            balanced: 'claude-sonnet',
            deep: 'claude-opus',
        },
    },
}));

vi.mock('../providers/reasoning/geminiReasoning', () => ({
    geminiReasoning: {
        isAvailable: vi.fn(() => false),
        models: {
            fast: 'gemini-flash',
            balanced: 'gemini-flash',
            deep: 'gemini-flash',
        },
    },
}));

vi.mock('../providers/tts/elevenLabsTTS', () => ({
    elevenLabsTTS: {
        isAvailable: vi.fn(() => true),
        supportsStreaming: true,
        voices: [
            { id: 'v1', name: 'Mike', gender: 'male' },
            { id: 'v2', name: 'Helen', gender: 'female' },
        ],
    },
}));

vi.mock('../providers/tts/browserTTS', () => ({
    browserTTS: {
        isAvailable: vi.fn(() => true),
    },
}));

vi.mock('../knowledgeInjector', () => ({
    knowledgeInjector: {
        checkAvailability: vi.fn(() => Promise.resolve(false)),
        getAvailability: vi.fn(() => false),
    },
}));

describe('Health Check System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkBrowserSTTHealth', () => {
        it('should return health status for browser STT', async () => {
            const health = await checkBrowserSTTHealth();

            expect(health.name).toBe('browser-stt');
            expect(health.status).toBe('healthy');
            expect(health.available).toBe(true);
            expect(health.lastChecked).toBeGreaterThan(0);
            expect(health.details).toHaveProperty('supportsStreaming');
        });

        it('should include latency measurement', async () => {
            const health = await checkBrowserSTTHealth();
            expect(health.latencyMs).toBeDefined();
            expect(health.latencyMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe('checkBrowserTTSHealth', () => {
        it('should return health status for browser TTS', async () => {
            const health = await checkBrowserTTSHealth();

            expect(health.name).toBe('browser-tts');
            expect(health.status).toBe('healthy');
            expect(health.available).toBe(true);
        });
    });

    describe('formatHealthReport', () => {
        it('should format health report as readable string', () => {
            const mockHealth: VoiceSystemHealth = {
                overall: 'degraded',
                timestamp: Date.now(),
                stt: {
                    gemini: createMockHealth('gemini-live-stt', 'unavailable', false),
                    browser: createMockHealth('browser-stt', 'healthy', true),
                    recommended: 'browser',
                },
                reasoning: {
                    claude: createMockHealth('claude-reasoning', 'healthy', true),
                    gemini: createMockHealth('gemini-reasoning', 'unavailable', false),
                    recommended: 'claude',
                },
                tts: {
                    elevenlabs: createMockHealth('elevenlabs-tts', 'healthy', true),
                    browser: createMockHealth('browser-tts', 'healthy', true),
                    recommended: 'elevenlabs',
                },
                knowledge: createMockHealth('knowledge-injector', 'degraded', false),
                issues: ['Gemini STT unavailable - using browser fallback'],
                recommendations: ['Configure VITE_GEMINI_API_KEY'],
            };

            const report = formatHealthReport(mockHealth);

            expect(report).toContain('VOICE NEXUS HEALTH REPORT');
            expect(report).toContain('degraded');
            expect(report).toContain('STT PROVIDERS');
            expect(report).toContain('REASONING PROVIDERS');
            expect(report).toContain('TTS PROVIDERS');
            expect(report).toContain('ISSUES');
            expect(report).toContain('RECOMMENDATIONS');
        });

        it('should use status emojis', () => {
            const mockHealth: VoiceSystemHealth = {
                overall: 'healthy',
                timestamp: Date.now(),
                stt: {
                    gemini: createMockHealth('gemini-live-stt', 'healthy', true),
                    browser: createMockHealth('browser-stt', 'healthy', true),
                    recommended: 'gemini',
                },
                reasoning: {
                    claude: createMockHealth('claude-reasoning', 'healthy', true),
                    gemini: createMockHealth('gemini-reasoning', 'healthy', true),
                    recommended: 'claude',
                },
                tts: {
                    elevenlabs: createMockHealth('elevenlabs-tts', 'healthy', true),
                    browser: createMockHealth('browser-tts', 'healthy', true),
                    recommended: 'elevenlabs',
                },
                knowledge: createMockHealth('knowledge-injector', 'healthy', true),
                issues: [],
                recommendations: [],
            };

            const report = formatHealthReport(mockHealth);
            expect(report).toContain('✅'); // Healthy emoji
        });
    });

    describe('isVoiceSystemViable', () => {
        it('should return viable when minimum providers available', async () => {
            const result = await isVoiceSystemViable();
            expect(result.viable).toBe(true);
        });
    });
});

// Helper function to create mock health objects
function createMockHealth(
    name: string,
    status: 'healthy' | 'degraded' | 'unavailable' | 'error',
    available: boolean
): ProviderHealth {
    return {
        name,
        status,
        available,
        lastChecked: Date.now(),
        latencyMs: 5,
    };
}
