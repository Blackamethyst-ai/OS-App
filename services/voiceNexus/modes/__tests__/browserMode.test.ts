import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ModeContext } from '../types';

// Mock browserSTT before importing browserMode
const mockIsAvailable = vi.fn(() => true);
const mockStartStreaming = vi.fn(async (callback: (text: string) => void) => {
    (global as any).__sttCallback = callback;
});
const mockStopStreaming = vi.fn(async () => {});
const mockIsCurrentlyStreaming = vi.fn(() => false);

vi.mock('../../providers/stt/browserSTT', () => ({
    browserSTT: {
        isAvailable: () => mockIsAvailable(),
        startStreaming: (cb: (text: string) => void) => mockStartStreaming(cb),
        stopStreaming: () => mockStopStreaming(),
        isCurrentlyStreaming: () => mockIsCurrentlyStreaming(),
    }
}));

// Import after mock setup
import { browserMode } from '../browserMode';

describe('BrowserModeHandler', () => {
    let mockContext: ModeContext;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Reset mocks to defaults
        mockIsAvailable.mockReturnValue(true);
        mockIsCurrentlyStreaming.mockReturnValue(false);

        mockContext = {
            config: { mode: 'turn-based' },
            state: { isActive: false, currentMode: null },
            events: {
                onPartialTranscript: vi.fn(),
                onProviderSwitch: vi.fn(),
                onError: vi.fn(),
            },
            setCurrentProvider: vi.fn(),
            createTranscript: vi.fn((role, text) => ({
                id: `t-${Date.now()}`,
                role,
                text,
                timestamp: new Date()
            })),
            addTranscript: vi.fn(),
            processText: vi.fn(async () => {}),
        } as unknown as ModeContext;

        // Reset handler state
        (browserMode as any).isRunning = false;
        (browserMode as any).lastProcessedTranscript = '';
        (browserMode as any).processingTimeout = null;
    });

    afterEach(() => {
        vi.useRealTimers();
        (browserMode as any).isRunning = false;
    });

    describe('isAvailable', () => {
        it('should delegate to browserSTT.isAvailable', () => {
            expect(browserMode.isAvailable()).toBe(true);
            expect(mockIsAvailable).toHaveBeenCalled();
        });

        it('should return false when STT unavailable', () => {
            mockIsAvailable.mockReturnValue(false);
            expect(browserMode.isAvailable()).toBe(false);
        });
    });

    describe('start', () => {
        it('should throw if STT unavailable', async () => {
            mockIsAvailable.mockReturnValue(false);

            await expect(browserMode.start(mockContext)).rejects.toThrow(
                'Browser STT (Web Speech API) is not available'
            );
        });

        it('should start streaming and set provider', async () => {
            await browserMode.start(mockContext);

            expect(mockStartStreaming).toHaveBeenCalled();
            expect(mockContext.setCurrentProvider).toHaveBeenCalledWith({ stt: 'browser' });
            expect(mockContext.events.onProviderSwitch).toHaveBeenCalledWith({ stt: 'browser' });
        });

        it('should mark handler as running', async () => {
            expect((browserMode as any).isRunning).toBe(false);

            await browserMode.start(mockContext);

            expect((browserMode as any).isRunning).toBe(true);
        });
    });

    describe('stop', () => {
        it('should stop streaming and clear timeout', async () => {
            mockIsCurrentlyStreaming.mockReturnValue(true);
            await browserMode.start(mockContext);

            browserMode.stop(mockContext);

            expect((browserMode as any).isRunning).toBe(false);
            expect(mockStopStreaming).toHaveBeenCalled();
        });

        it('should not call stopStreaming if not streaming', async () => {
            mockIsCurrentlyStreaming.mockReturnValue(false);
            await browserMode.start(mockContext);

            browserMode.stop(mockContext);

            expect(mockStopStreaming).not.toHaveBeenCalled();
        });
    });

    describe('transcript handling', () => {
        it('should emit partial transcript on update', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Hello world');

            expect(mockContext.events.onPartialTranscript).toHaveBeenCalledWith({
                role: 'user',
                text: 'Hello world'
            });
        });

        it('should debounce processing with 1.5s delay', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Hello world');

            // Not processed yet
            expect(mockContext.processText).not.toHaveBeenCalled();

            // Advance time by 1.5 seconds
            await vi.advanceTimersByTimeAsync(1500);

            expect(mockContext.processText).toHaveBeenCalledWith('Hello world');
        });

        it('should create and add transcript before processing', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Test message');
            await vi.advanceTimersByTimeAsync(1500);

            expect(mockContext.createTranscript).toHaveBeenCalledWith('user', 'Test message');
            expect(mockContext.addTranscript).toHaveBeenCalled();
        });

        it('should only process significant changes', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            // First message (needs > 5 chars to trigger, and newText > 3)
            callback('Hello there');
            await vi.advanceTimersByTimeAsync(1500);
            expect(mockContext.processText).toHaveBeenCalledTimes(1);

            // Too small addition (less than 5 chars added)
            callback('Hello there!');
            await vi.advanceTimersByTimeAsync(1500);
            expect(mockContext.processText).toHaveBeenCalledTimes(1); // Still 1

            // Significant addition (> 5 chars added)
            callback('Hello there! How are you doing?');
            await vi.advanceTimersByTimeAsync(1500);
            expect(mockContext.processText).toHaveBeenCalledTimes(2);
        });

        it('should not process if handler stopped', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Hello world');
            (browserMode as any).isRunning = false;

            await vi.advanceTimersByTimeAsync(1500);

            expect(mockContext.processText).not.toHaveBeenCalled();
        });

        it('should handle processing errors gracefully', async () => {
            vi.mocked(mockContext.processText).mockRejectedValue(new Error('Processing failed'));
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Hello world');
            await vi.advanceTimersByTimeAsync(1500);

            expect(mockContext.events.onError).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Processing failed' })
            );
        });

        it('should reset debounce timer on new input', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Hello');
            await vi.advanceTimersByTimeAsync(1000); // 1 second

            callback('Hello world'); // New input resets timer
            await vi.advanceTimersByTimeAsync(1000); // Another second

            expect(mockContext.processText).not.toHaveBeenCalled(); // Still not called

            await vi.advanceTimersByTimeAsync(500); // Now 1.5s from last input
            expect(mockContext.processText).toHaveBeenCalled();
        });
    });

    describe('resetTranscript', () => {
        it('should reset lastProcessedTranscript', async () => {
            await browserMode.start(mockContext);
            const callback = (global as any).__sttCallback;

            callback('Hello world');
            await vi.advanceTimersByTimeAsync(1500);
            expect((browserMode as any).lastProcessedTranscript).toBe('Hello world');

            browserMode.resetTranscript();
            expect((browserMode as any).lastProcessedTranscript).toBe('');
        });
    });
});
