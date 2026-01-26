import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ModeContext } from '../types';

// Capture callbacks from liveSession.connect
let capturedCallbacks: any = null;

// Mock liveSession
const mockConnect = vi.fn(async (_agentName: string, options: any) => {
    capturedCallbacks = options.callbacks;
});
const mockDisconnect = vi.fn();

vi.mock('../../../liveSession', () => ({
    liveSession: {
        connect: (agentName: string, options: any) => mockConnect(agentName, options),
        disconnect: () => mockDisconnect(),
    }
}));

// Mock geminiLiveSTT
const mockIsAvailable = vi.fn(() => true);

vi.mock('../../providers/stt/geminiLive', () => ({
    geminiLiveSTT: {
        isAvailable: () => mockIsAvailable(),
    }
}));

// Import after mocks
import { hybridMode } from '../hybridMode';

describe('HybridModeHandler', () => {
    let mockContext: ModeContext;

    beforeEach(() => {
        vi.clearAllMocks();
        capturedCallbacks = null;

        mockIsAvailable.mockReturnValue(true);

        mockContext = {
            config: {
                mode: 'hybrid',
                agent: { name: 'test-agent' }
            },
            state: { isActive: false, currentMode: null },
            events: {
                onError: vi.fn(),
            },
            buildTools: vi.fn(() => []),
            buildSystemPrompt: vi.fn(() => 'System prompt'),
            setError: vi.fn(),
            setIsActive: vi.fn(),
            createTranscript: vi.fn((role, text) => ({
                id: `t-${Date.now()}`,
                role,
                text,
                timestamp: new Date()
            })),
            addTranscript: vi.fn(),
            processText: vi.fn(async () => {}),
        } as unknown as ModeContext;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('name', () => {
        it('should be hybrid', () => {
            expect(hybridMode.name).toBe('hybrid');
        });
    });

    describe('isAvailable', () => {
        it('should delegate to geminiLiveSTT.isAvailable', () => {
            expect(hybridMode.isAvailable()).toBe(true);
            expect(mockIsAvailable).toHaveBeenCalled();
        });

        it('should return false when geminiLiveSTT unavailable', () => {
            mockIsAvailable.mockReturnValue(false);
            expect(hybridMode.isAvailable()).toBe(false);
        });
    });

    describe('start', () => {
        it('should throw if not available', async () => {
            mockIsAvailable.mockReturnValue(false);

            await expect(hybridMode.start(mockContext)).rejects.toThrow(
                'Hybrid mode requires Gemini API key for STT'
            );
        });

        it('should connect to liveSession with correct agent name', async () => {
            await hybridMode.start(mockContext);

            expect(mockConnect).toHaveBeenCalledWith(
                'test-agent',
                expect.objectContaining({
                    systemInstruction: expect.stringContaining('transcribe'),
                    tools: [],
                })
            );
        });

        it('should call buildTools from context', async () => {
            const mockTools = [{ name: 'tool1' }];
            vi.mocked(mockContext.buildTools).mockReturnValue(mockTools as any);

            await hybridMode.start(mockContext);

            expect(mockContext.buildTools).toHaveBeenCalled();
            expect(mockConnect).toHaveBeenCalledWith(
                'test-agent',
                expect.objectContaining({ tools: mockTools })
            );
        });

        it('should set up onopen callback', async () => {
            await hybridMode.start(mockContext);

            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onopen).toBeDefined();
            // Should not throw
            capturedCallbacks.onopen();
        });

        it('should set up onerror callback that sets error', async () => {
            await hybridMode.start(mockContext);

            const error = new Error('Test error');
            capturedCallbacks.onerror(error);

            expect(mockContext.setError).toHaveBeenCalledWith('Test error');
            expect(mockContext.events.onError).toHaveBeenCalledWith(error);
        });

        it('should set up onclose callback that deactivates', async () => {
            await hybridMode.start(mockContext);

            capturedCallbacks.onclose();

            expect(mockContext.setIsActive).toHaveBeenCalledWith(false);
        });
    });

    describe('stop', () => {
        it('should disconnect liveSession', () => {
            hybridMode.stop(mockContext);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('handleMessage', () => {
        beforeEach(async () => {
            await hybridMode.start(mockContext);
        });

        it('should ignore messages without inputTranscription', async () => {
            const message = { serverContent: {} };
            await capturedCallbacks.onmessage(message);

            expect(mockContext.createTranscript).not.toHaveBeenCalled();
        });

        it('should ignore short transcriptions (≤5 chars)', async () => {
            const message = { serverContent: { inputTranscription: 'Hello' } };
            await capturedCallbacks.onmessage(message);

            expect(mockContext.createTranscript).not.toHaveBeenCalled();
        });

        it('should process transcriptions longer than 5 chars', async () => {
            const message = { serverContent: { inputTranscription: 'Hello world' } };
            await capturedCallbacks.onmessage(message);

            expect(mockContext.createTranscript).toHaveBeenCalledWith('user', 'Hello world');
            expect(mockContext.addTranscript).toHaveBeenCalled();
            expect(mockContext.processText).toHaveBeenCalledWith('Hello world');
        });

        it('should handle processing errors gracefully', async () => {
            const error = new Error('Processing failed');
            vi.mocked(mockContext.processText).mockRejectedValue(error);

            const message = { serverContent: { inputTranscription: 'Hello world' } };
            await capturedCallbacks.onmessage(message);

            expect(mockContext.events.onError).toHaveBeenCalledWith(error);
        });

        it('should wrap non-Error objects in Error', async () => {
            vi.mocked(mockContext.processText).mockRejectedValue('String error');

            const message = { serverContent: { inputTranscription: 'Hello world' } };
            await capturedCallbacks.onmessage(message);

            expect(mockContext.events.onError).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'String error' })
            );
        });
    });
});
