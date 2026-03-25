import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mock functions - use vi.hoisted so they're available before vi.mock factories
// ============================================================================

const {
    mockIsVaultUnlocked,
    mockHasVault,
    mockHasGeminiKey,
    mockGetKey,
    mockBrowserSTTIsAvailable,
    mockBrowserTTSIsAvailable,
} = vi.hoisted(() => ({
    mockIsVaultUnlocked: vi.fn(() => true),
    mockHasVault: vi.fn(() => true),
    mockHasGeminiKey: vi.fn(() => true),
    mockGetKey: vi.fn<(...args: any[]) => any>((key: string) => {
        if (key === 'claude') return 'mock-claude-key';
        if (key === 'eleven_labs') return 'mock-elevenlabs-key';
        return null;
    }),
    mockBrowserSTTIsAvailable: vi.fn(() => true),
    mockBrowserTTSIsAvailable: vi.fn(() => true),
}));

// ============================================================================
// vi.mock calls
// ============================================================================

vi.mock('../../apiKeyService', () => ({
    apiKeyService: {
        isVaultUnlocked: () => mockIsVaultUnlocked(),
        hasVault: () => mockHasVault(),
        hasGeminiKey: () => mockHasGeminiKey(),
        getKey: (key: string) => mockGetKey(key),
    },
}));

vi.mock('../providers/stt/browserSTT', () => ({
    browserSTT: {
        isAvailable: () => mockBrowserSTTIsAvailable(),
    },
}));

vi.mock('../providers/tts/browserTTS', () => ({
    browserTTS: {
        isAvailable: () => mockBrowserTTSIsAvailable(),
    },
}));

vi.mock('../../logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// ============================================================================
// Import after mocks
// ============================================================================

import { runPreflightCheck, formatPreflightResult, canStartVoice } from '../preflightCheck';

// ============================================================================
// Tests
// ============================================================================

describe('PreflightCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to "all services available" state
        mockIsVaultUnlocked.mockReturnValue(true);
        mockHasVault.mockReturnValue(true);
        mockHasGeminiKey.mockReturnValue(true);
        mockGetKey.mockImplementation((key: string) => {
            if (key === 'claude') return 'mock-claude-key';
            if (key === 'eleven_labs') return 'mock-elevenlabs-key';
            return null;
        });
        mockBrowserSTTIsAvailable.mockReturnValue(true);
        mockBrowserTTSIsAvailable.mockReturnValue(true);
    });

    // =========================================================================
    // runPreflightCheck - Optimal Path (All Services Available)
    // =========================================================================

    describe('runPreflightCheck - all services available', () => {
        it('should return gemini-live mode when Gemini is available', () => {
            const result = runPreflightCheck();

            expect(result.canProceed).toBe(true);
            expect(result.mode).toBe('gemini-live');
            expect(result.errors).toHaveLength(0);
        });

        it('should have no errors when all services are configured', () => {
            const result = runPreflightCheck();
            expect(result.errors).toHaveLength(0);
        });

        it('should return no warnings when all services are configured', () => {
            const result = runPreflightCheck();
            // No warnings when everything is available
            expect(result.warnings).toHaveLength(0);
        });
    });

    // =========================================================================
    // Vault Status
    // =========================================================================

    describe('vault status checks', () => {
        it('should error when vault is locked and no env key', () => {
            mockIsVaultUnlocked.mockReturnValue(false);
            const savedKey = import.meta.env.VITE_GEMINI_API_KEY;
            import.meta.env.VITE_GEMINI_API_KEY = '';

            const result = runPreflightCheck();
            import.meta.env.VITE_GEMINI_API_KEY = savedKey;

            // The actual error message is 'API key vault is locked...'
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('vault is locked')
                ])
            );
            expect(result.recommendations.length).toBeGreaterThan(0);
        });

        it('should error when no vault exists and no env key', () => {
            mockIsVaultUnlocked.mockReturnValue(false);
            mockHasVault.mockReturnValue(false);
            const savedKey = import.meta.env.VITE_GEMINI_API_KEY;
            import.meta.env.VITE_GEMINI_API_KEY = '';

            const result = runPreflightCheck();
            import.meta.env.VITE_GEMINI_API_KEY = savedKey;

            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('No API keys configured')
                ])
            );
        });
    });

    // =========================================================================
    // API Key Checks
    // =========================================================================

    describe('API key checks', () => {
        it('should warn when Gemini key is missing', () => {
            mockHasGeminiKey.mockReturnValue(false);

            const result = runPreflightCheck();

            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('Gemini API key not configured')
                ])
            );
        });

        it('should warn when Claude key is missing', () => {
            mockGetKey.mockImplementation((key: string) => {
                if (key === 'claude') return null;
                if (key === 'eleven_labs') return 'mock-key';
                return null;
            });

            const result = runPreflightCheck();

            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('Claude API key not configured')
                ])
            );
        });

        it('should warn when ElevenLabs key is missing', () => {
            mockGetKey.mockImplementation((key: string) => {
                if (key === 'claude') return 'mock-key';
                if (key === 'eleven_labs') return null;
                return null;
            });

            const result = runPreflightCheck();

            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('ElevenLabs API key not configured')
                ])
            );
        });
    });

    // =========================================================================
    // Browser Capability Checks
    // =========================================================================

    describe('browser capability checks', () => {
        it('should warn when browser STT is unavailable', () => {
            mockBrowserSTTIsAvailable.mockReturnValue(false);

            const result = runPreflightCheck();

            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('Browser Speech Recognition not available')
                ])
            );
        });

        it('should warn when browser TTS is unavailable', () => {
            mockBrowserTTSIsAvailable.mockReturnValue(false);

            const result = runPreflightCheck();

            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('Browser Speech Synthesis not available')
                ])
            );
        });
    });

    // =========================================================================
    // Mode Determination
    // =========================================================================

    describe('mode determination', () => {
        it('should use gemini-live when Gemini is available', () => {
            const result = runPreflightCheck();
            expect(result.mode).toBe('gemini-live');
            expect(result.canProceed).toBe(true);
        });

        it('should fall back to browser-fallback with browser STT + Claude', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(true);
            mockGetKey.mockImplementation((key: string) => {
                if (key === 'claude') return 'mock-claude-key';
                return null;
            });

            const result = runPreflightCheck();

            expect(result.mode).toBe('browser-fallback');
            expect(result.canProceed).toBe(true);
        });

        it('should be unavailable with browser STT + browser TTS but no AI provider', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(true);
            mockBrowserTTSIsAvailable.mockReturnValue(true);
            mockGetKey.mockReturnValue(null);

            const result = runPreflightCheck();

            expect(result.mode).toBe('browser-fallback');
            expect(result.canProceed).toBe(false);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('No AI reasoning provider available')
                ])
            );
        });

        it('should be unavailable when no STT provider is available', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            mockBrowserTTSIsAvailable.mockReturnValue(false);
            mockGetKey.mockReturnValue(null);

            const result = runPreflightCheck();

            expect(result.mode).toBe('unavailable');
            expect(result.canProceed).toBe(false);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('requirements not met')
                ])
            );
        });

        it('should add browser fallback warning in fallback mode', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(true);

            const result = runPreflightCheck();

            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('browser fallback mode')
                ])
            );
        });
    });

    // =========================================================================
    // formatPreflightResult
    // =========================================================================

    describe('formatPreflightResult', () => {
        it('should format a successful result', () => {
            const result = runPreflightCheck();
            const formatted = formatPreflightResult(result);

            expect(formatted).toContain('Voice system ready');
            expect(formatted).toContain('gemini-live');
        });

        it('should format a failed result', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            mockBrowserTTSIsAvailable.mockReturnValue(false);
            mockGetKey.mockReturnValue(null);

            const result = runPreflightCheck();
            const formatted = formatPreflightResult(result);

            expect(formatted).toContain('NOT ready');
        });

        it('should include errors section', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            mockBrowserTTSIsAvailable.mockReturnValue(false);
            mockGetKey.mockReturnValue(null);

            const result = runPreflightCheck();
            const formatted = formatPreflightResult(result);

            expect(formatted).toContain('Errors:');
        });

        it('should include warnings section', () => {
            mockHasGeminiKey.mockReturnValue(false);
            const result = runPreflightCheck();
            const formatted = formatPreflightResult(result);

            expect(formatted).toContain('Warnings:');
        });

        it('should include recommendations section when present', () => {
            mockIsVaultUnlocked.mockReturnValue(false);
            const savedKey = import.meta.env.VITE_GEMINI_API_KEY;
            import.meta.env.VITE_GEMINI_API_KEY = '';
            const result = runPreflightCheck();
            import.meta.env.VITE_GEMINI_API_KEY = savedKey;
            const formatted = formatPreflightResult(result);

            expect(formatted).toContain('Recommendations:');
        });
    });

    // =========================================================================
    // canStartVoice
    // =========================================================================

    describe('canStartVoice', () => {
        it('should return ok true when voice can start', () => {
            const result = canStartVoice();
            expect(result.ok).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should return ok false with reason when voice cannot start', () => {
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            mockBrowserTTSIsAvailable.mockReturnValue(false);
            mockGetKey.mockReturnValue(null);

            const result = canStartVoice();
            expect(result.ok).toBe(false);
            expect(result.reason).toBeTruthy();
        });

        it('should return first error as reason', () => {
            mockIsVaultUnlocked.mockReturnValue(false);
            mockHasGeminiKey.mockReturnValue(false);
            mockBrowserSTTIsAvailable.mockReturnValue(false);
            mockGetKey.mockReturnValue(null);
            const savedKey = import.meta.env.VITE_GEMINI_API_KEY;
            import.meta.env.VITE_GEMINI_API_KEY = '';

            const result = canStartVoice();
            import.meta.env.VITE_GEMINI_API_KEY = savedKey;
            expect(result.ok).toBe(false);
            expect(result.reason).toContain('vault');
        });
    });
});
