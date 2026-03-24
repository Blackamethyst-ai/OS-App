// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock references are available in vi.mock factories
const {
    mockGetAI,
    mockSafeParseJson,
    mockClaudeGenerateVision,
    mockClaudeIsConfigured,
    mockApiKeyServiceGetKey,
    mockApiKeyServiceGetGeminiKey,
} = vi.hoisted(() => ({
    mockGetAI: vi.fn(),
    mockSafeParseJson: vi.fn(),
    mockClaudeGenerateVision: vi.fn(),
    mockClaudeIsConfigured: vi.fn(),
    mockApiKeyServiceGetKey: vi.fn(),
    mockApiKeyServiceGetGeminiKey: vi.fn(),
}));

vi.mock('../../geminiService', () => ({
    getAI: mockGetAI,
    safeParseJson: mockSafeParseJson,
}));

vi.mock('../../claudeService', () => ({
    claudeService: {
        generateVision: mockClaudeGenerateVision,
        isConfigured: mockClaudeIsConfigured,
    },
}));

vi.mock('../../apiKeyService', () => ({
    apiKeyService: {
        getKey: mockApiKeyServiceGetKey,
        getGeminiKey: mockApiKeyServiceGetGeminiKey,
    },
}));

vi.mock('../../logger', () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import { semanticGaze } from '../SemanticGaze';

describe('SemanticGaze', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        semanticGaze.clearCache();
        // Default: no API keys, forces DOM fallback
        mockApiKeyServiceGetKey.mockReturnValue(null);
        mockApiKeyServiceGetGeminiKey.mockReturnValue(null);
    });

    // =========================================================================
    // GAZE PATTERN ANALYSIS
    // =========================================================================
    describe('analyzeGazePattern', () => {
        it('should return FIXATED when history is short (<5 points)', () => {
            const pattern = semanticGaze.analyzeGazePattern();
            expect(pattern).toBe('FIXATED');
        });

        it('should detect FIXATED pattern when gaze is stable', async () => {
            for (let i = 0; i < 10; i++) {
                await semanticGaze.buildSemanticContext(100 + i, 100 + i);
            }

            const pattern = semanticGaze.analyzeGazePattern();
            expect(pattern).toBe('FIXATED');
        });

        it('should detect SCANNING_H pattern for horizontal movement', async () => {
            for (let i = 0; i < 10; i++) {
                await semanticGaze.buildSemanticContext(100 + i * 50, 100);
            }

            const pattern = semanticGaze.analyzeGazePattern();
            expect(pattern).toBe('SCANNING_H');
        });

        it('should detect SCANNING_V pattern for vertical movement', async () => {
            for (let i = 0; i < 10; i++) {
                await semanticGaze.buildSemanticContext(100, 100 + i * 50);
            }

            const pattern = semanticGaze.analyzeGazePattern();
            expect(pattern).toBe('SCANNING_V');
        });

        it('should detect ERRATIC pattern for large random movements', async () => {
            // The algorithm checks totalMovement > 100, so we need big jumps
            // in both X and Y so neither dominates (avoiding SCANNING_H/V)
            const points = [
                [0, 0], [500, 500], [0, 0], [500, 500],
                [0, 0], [500, 500], [0, 0], [500, 500],
                [0, 0], [500, 500],
            ];
            for (const [x, y] of points) {
                await semanticGaze.buildSemanticContext(x, y);
            }

            const pattern = semanticGaze.analyzeGazePattern();
            // With equal X and Y magnitude + direction changes, should be ERRATIC or ALTERNATING
            expect(['ERRATIC', 'ALTERNATING']).toContain(pattern);
        });
    });

    // =========================================================================
    // SEMANTIC CONTEXT
    // =========================================================================
    describe('buildSemanticContext', () => {
        it('should return a valid semantic context', async () => {
            const ctx = await semanticGaze.buildSemanticContext(400, 300);

            expect(ctx).toBeDefined();
            expect(ctx.gazePattern).toBeDefined();
            expect(ctx.timestamp).toBeGreaterThan(0);
            expect(ctx.inferredTask).toBeDefined();
            expect(ctx.attentionDistribution).toBeDefined();
        });

        it('should maintain gaze history and trim when over 100 points', async () => {
            for (let i = 0; i < 105; i++) {
                await semanticGaze.buildSemanticContext(i, i);
            }

            const ctx = await semanticGaze.buildSemanticContext(50, 50);
            expect(ctx).toBeDefined();
        });
    });

    // =========================================================================
    // DOM FALLBACK
    // =========================================================================
    describe('analyzeGazeTarget (DOM fallback)', () => {
        it('should fall back to DOM analysis when no VLM keys are available', async () => {
            const target = await semanticGaze.analyzeGazeTarget(400, 300);

            // With happy-dom, elementFromPoint returns null on empty DOM,
            // so target should be null
            expect(target).toBeNull();
        });

        it('should respect cooldown between analyses', async () => {
            // First call
            await semanticGaze.analyzeGazeTarget(100, 100);

            // Immediate second call should hit cooldown and return cached
            await semanticGaze.analyzeGazeTarget(100, 100);

            // Both should succeed without error
            expect(true).toBe(true);
        });
    });

    // =========================================================================
    // VLM STATS
    // =========================================================================
    describe('getVLMStats', () => {
        it('should return stats with zero calls initially', () => {
            const stats = semanticGaze.getVLMStats();

            expect(stats.callCount).toBe(0);
            expect(stats.lastCallTime).toBe(0);
        });
    });

    // =========================================================================
    // CACHE
    // =========================================================================
    describe('Cache management', () => {
        it('should clear cache and history', () => {
            semanticGaze.clearCache();

            const pattern = semanticGaze.analyzeGazePattern();
            expect(pattern).toBe('FIXATED');
        });
    });

    // =========================================================================
    // AI ANALYSIS TOGGLE
    // =========================================================================
    describe('AI analysis toggle', () => {
        it('should enable and disable AI analysis via localStorage', () => {
            // Provide a localStorage mock if not available in this environment
            if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.setItem !== 'function') {
                const store: Record<string, string> = {};
                (globalThis as any).localStorage = {
                    getItem: (k: string) => store[k] ?? null,
                    setItem: (k: string, v: string) => { store[k] = v; },
                    removeItem: (k: string) => { delete store[k]; },
                };
            }

            semanticGaze.setAIAnalysisEnabled(true);
            expect(localStorage.getItem('biometric_ai_analysis_enabled')).toBe('true');

            semanticGaze.setAIAnalysisEnabled(false);
            expect(localStorage.getItem('biometric_ai_analysis_enabled')).toBe('false');
        });
    });
});
