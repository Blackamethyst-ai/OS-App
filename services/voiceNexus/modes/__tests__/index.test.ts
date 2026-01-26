import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all mode handlers
const mockRealtimeIsAvailable = vi.fn(() => false);
const mockHybridIsAvailable = vi.fn(() => false);
const mockBrowserIsAvailable = vi.fn(() => false);

vi.mock('../realtimeMode', () => ({
    realtimeMode: {
        name: 'realtime',
        isAvailable: () => mockRealtimeIsAvailable(),
    }
}));

vi.mock('../hybridMode', () => ({
    hybridMode: {
        name: 'hybrid',
        isAvailable: () => mockHybridIsAvailable(),
    }
}));

vi.mock('../browserMode', () => ({
    browserMode: {
        name: 'browser',
        isAvailable: () => mockBrowserIsAvailable(),
    }
}));

// Import after mocks
import { getModeHandler, getBestAvailableMode, getAvailableModes } from '../index';

describe('VoiceNexus Modes Index', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRealtimeIsAvailable.mockReturnValue(false);
        mockHybridIsAvailable.mockReturnValue(false);
        mockBrowserIsAvailable.mockReturnValue(false);
    });

    describe('getModeHandler', () => {
        it('should return realtimeMode for "realtime"', () => {
            const handler = getModeHandler('realtime');
            expect(handler.name).toBe('realtime');
        });

        it('should return hybridMode for "hybrid"', () => {
            const handler = getModeHandler('hybrid');
            expect(handler.name).toBe('hybrid');
        });

        it('should return browserMode for "browser"', () => {
            const handler = getModeHandler('browser');
            expect(handler.name).toBe('browser');
        });

        it('should throw for unknown mode', () => {
            expect(() => getModeHandler('unknown' as any)).toThrow('Unknown mode: unknown');
        });
    });

    describe('getBestAvailableMode', () => {
        it('should prefer realtime when available', () => {
            mockRealtimeIsAvailable.mockReturnValue(true);
            mockBrowserIsAvailable.mockReturnValue(true);

            const handler = getBestAvailableMode();
            expect(handler.name).toBe('realtime');
        });

        it('should fall back to browser when realtime unavailable', () => {
            mockRealtimeIsAvailable.mockReturnValue(false);
            mockBrowserIsAvailable.mockReturnValue(true);

            const handler = getBestAvailableMode();
            expect(handler.name).toBe('browser');
        });

        it('should throw when no modes available', () => {
            mockRealtimeIsAvailable.mockReturnValue(false);
            mockBrowserIsAvailable.mockReturnValue(false);

            expect(() => getBestAvailableMode()).toThrow(
                'No voice mode available - check API keys and browser support'
            );
        });
    });

    describe('getAvailableModes', () => {
        it('should return availability for all modes', () => {
            mockRealtimeIsAvailable.mockReturnValue(true);
            mockHybridIsAvailable.mockReturnValue(false);
            mockBrowserIsAvailable.mockReturnValue(true);

            const modes = getAvailableModes();

            expect(modes).toEqual({
                realtime: true,
                hybrid: false,
                browser: true,
            });
        });

        it('should return all false when nothing available', () => {
            const modes = getAvailableModes();

            expect(modes).toEqual({
                realtime: false,
                hybrid: false,
                browser: false,
            });
        });

        it('should return all true when everything available', () => {
            mockRealtimeIsAvailable.mockReturnValue(true);
            mockHybridIsAvailable.mockReturnValue(true);
            mockBrowserIsAvailable.mockReturnValue(true);

            const modes = getAvailableModes();

            expect(modes).toEqual({
                realtime: true,
                hybrid: true,
                browser: true,
            });
        });
    });
});
