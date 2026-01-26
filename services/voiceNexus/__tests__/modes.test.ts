import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getModeHandler,
    getBestAvailableMode,
    getAvailableModes,
    realtimeMode,
    hybridMode,
    browserMode,
} from '../modes';

// Mock the providers
vi.mock('../providers/stt/geminiLive', () => ({
    geminiLiveSTT: {
        isAvailable: vi.fn(() => true),
    },
}));

vi.mock('../providers/stt/browserSTT', () => ({
    browserSTT: {
        isAvailable: vi.fn(() => true),
        isCurrentlyStreaming: vi.fn(() => false),
        startStreaming: vi.fn(),
        stopStreaming: vi.fn(() => Promise.resolve('')),
    },
}));

vi.mock('../../liveSession', () => ({
    liveSession: {
        connect: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(),
        isConnected: vi.fn(() => false),
        onAgentSwitch: null,
    },
}));

describe('Mode Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getModeHandler', () => {
        it('should return realtime mode handler', () => {
            const handler = getModeHandler('realtime');
            expect(handler.name).toBe('realtime');
        });

        it('should return hybrid mode handler', () => {
            const handler = getModeHandler('hybrid');
            expect(handler.name).toBe('hybrid');
        });

        it('should return browser mode handler', () => {
            const handler = getModeHandler('browser');
            expect(handler.name).toBe('browser');
        });

        it('should throw for unknown mode', () => {
            expect(() => getModeHandler('unknown' as any)).toThrow();
        });
    });

    describe('getAvailableModes', () => {
        it('should return availability status for all modes', () => {
            const modes = getAvailableModes();

            expect(modes).toHaveProperty('realtime');
            expect(modes).toHaveProperty('hybrid');
            expect(modes).toHaveProperty('browser');

            expect(typeof modes.realtime).toBe('boolean');
            expect(typeof modes.hybrid).toBe('boolean');
            expect(typeof modes.browser).toBe('boolean');
        });
    });

    describe('getBestAvailableMode', () => {
        it('should return realtime mode when Gemini is available', () => {
            const mode = getBestAvailableMode();
            expect(mode.name).toBe('realtime');
        });
    });

    describe('realtimeMode', () => {
        it('should have correct name', () => {
            expect(realtimeMode.name).toBe('realtime');
        });

        it('should check availability based on Gemini API', () => {
            const available = realtimeMode.isAvailable();
            expect(typeof available).toBe('boolean');
        });
    });

    describe('hybridMode', () => {
        it('should have correct name', () => {
            expect(hybridMode.name).toBe('hybrid');
        });

        it('should check availability based on Gemini API', () => {
            const available = hybridMode.isAvailable();
            expect(typeof available).toBe('boolean');
        });
    });

    describe('browserMode', () => {
        it('should have correct name', () => {
            expect(browserMode.name).toBe('browser');
        });

        it('should check availability based on Web Speech API', () => {
            const available = browserMode.isAvailable();
            expect(typeof available).toBe('boolean');
        });
    });
});
