import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ModeContext } from '../types';

// Capture callbacks and onAgentSwitch from liveSession
let capturedCallbacks: any = null;
let capturedOnAgentSwitch: ((agentName: string) => void) | null = null;

// Mock liveSession
const mockConnect = vi.fn(async (_agentName: string, options: any) => {
    capturedCallbacks = options.callbacks;
});
const mockDisconnect = vi.fn();

vi.mock('../../../liveSession', () => ({
    liveSession: {
        connect: (agentName: string, options: any) => mockConnect(agentName, options),
        disconnect: () => mockDisconnect(),
        set onAgentSwitch(handler: (agentName: string) => void) {
            capturedOnAgentSwitch = handler;
        },
        get onAgentSwitch() {
            return capturedOnAgentSwitch;
        }
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
import { realtimeMode } from '../realtimeMode';

describe('RealtimeModeHandler', () => {
    let mockContext: ModeContext;

    beforeEach(() => {
        vi.clearAllMocks();
        capturedCallbacks = null;
        capturedOnAgentSwitch = null;

        mockIsAvailable.mockReturnValue(true);

        mockContext = {
            config: {
                mode: 'realtime',
                agent: { name: 'test-agent' }
            },
            state: { isActive: false, currentMode: null },
            events: {
                onError: vi.fn(),
            },
            buildTools: vi.fn(() => []),
            buildSystemPrompt: vi.fn(() => 'System prompt for realtime'),
            setError: vi.fn(),
            setIsActive: vi.fn(),
            createTranscript: vi.fn((role, text) => ({
                id: `t-${Date.now()}`,
                role,
                text,
                timestamp: new Date()
            })),
            addTranscript: vi.fn(),
            toolHandler: vi.fn(async () => {}),
        } as unknown as ModeContext;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('name', () => {
        it('should be realtime', () => {
            expect(realtimeMode.name).toBe('realtime');
        });
    });

    describe('isAvailable', () => {
        it('should delegate to geminiLiveSTT.isAvailable', () => {
            expect(realtimeMode.isAvailable()).toBe(true);
            expect(mockIsAvailable).toHaveBeenCalled();
        });

        it('should return false when geminiLiveSTT unavailable', () => {
            mockIsAvailable.mockReturnValue(false);
            expect(realtimeMode.isAvailable()).toBe(false);
        });
    });

    describe('start', () => {
        it('should throw if not available', async () => {
            mockIsAvailable.mockReturnValue(false);

            await expect(realtimeMode.start(mockContext)).rejects.toThrow(
                'Realtime mode requires Gemini API key'
            );
        });

        it('should connect to liveSession with built system prompt', async () => {
            await realtimeMode.start(mockContext);

            expect(mockContext.buildSystemPrompt).toHaveBeenCalled();
            expect(mockConnect).toHaveBeenCalledWith(
                'test-agent',
                expect.objectContaining({
                    systemInstruction: 'System prompt for realtime',
                    tools: [],
                })
            );
        });

        it('should call buildTools from context', async () => {
            const mockTools = [{ name: 'tool1' }, { name: 'tool2' }];
            vi.mocked(mockContext.buildTools).mockReturnValue(mockTools as any);

            await realtimeMode.start(mockContext);

            expect(mockContext.buildTools).toHaveBeenCalled();
            expect(mockConnect).toHaveBeenCalledWith(
                'test-agent',
                expect.objectContaining({ tools: mockTools })
            );
        });

        it('should set up onopen callback', async () => {
            await realtimeMode.start(mockContext);

            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onopen).toBeDefined();
            // Should not throw
            capturedCallbacks.onopen();
        });

        it('should set up onerror callback that sets error', async () => {
            await realtimeMode.start(mockContext);

            const error = new Error('Connection failed');
            capturedCallbacks.onerror(error);

            expect(mockContext.setError).toHaveBeenCalledWith('Connection failed');
            expect(mockContext.events.onError).toHaveBeenCalledWith(error);
        });

        it('should set up onclose callback that deactivates', async () => {
            await realtimeMode.start(mockContext);

            capturedCallbacks.onclose();

            expect(mockContext.setIsActive).toHaveBeenCalledWith(false);
        });

        it('should set up onAgentSwitch handler', async () => {
            await realtimeMode.start(mockContext);

            expect(capturedOnAgentSwitch).toBeDefined();
            // Should not throw when called
            capturedOnAgentSwitch!('new-agent');
        });
    });

    describe('stop', () => {
        it('should disconnect liveSession', () => {
            realtimeMode.stop(mockContext);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('handleMessage', () => {
        beforeEach(async () => {
            await realtimeMode.start(mockContext);
        });

        describe('tool calls', () => {
            it('should handle tool calls when toolHandler exists', async () => {
                const message = {
                    toolCall: {
                        functionCalls: [
                            { name: 'search', args: { query: 'test' } },
                            { name: 'calculate', args: { x: 5 } }
                        ]
                    }
                };

                await capturedCallbacks.onmessage(message);

                expect(mockContext.toolHandler).toHaveBeenCalledTimes(2);
                expect(mockContext.toolHandler).toHaveBeenCalledWith('search', { query: 'test' });
                expect(mockContext.toolHandler).toHaveBeenCalledWith('calculate', { x: 5 });
            });

            it('should skip tool calls when toolHandler missing', async () => {
                mockContext.toolHandler = undefined;

                const message = {
                    toolCall: {
                        functionCalls: [{ name: 'search', args: {} }]
                    }
                };

                // Should not throw
                await capturedCallbacks.onmessage(message);
            });
        });

        describe('model transcripts', () => {
            it('should create transcript for text parts', async () => {
                const message = {
                    serverContent: {
                        modelTurn: {
                            parts: [
                                { text: 'Hello from AI' },
                                { text: 'More text' }
                            ]
                        }
                    }
                };

                await capturedCallbacks.onmessage(message);

                expect(mockContext.createTranscript).toHaveBeenCalledTimes(2);
                expect(mockContext.createTranscript).toHaveBeenCalledWith('model', 'Hello from AI');
                expect(mockContext.createTranscript).toHaveBeenCalledWith('model', 'More text');
                expect(mockContext.addTranscript).toHaveBeenCalledTimes(2);
            });

            it('should skip parts without text', async () => {
                const message = {
                    serverContent: {
                        modelTurn: {
                            parts: [
                                { audio: 'base64data' },
                                { text: 'Has text' }
                            ]
                        }
                    }
                };

                await capturedCallbacks.onmessage(message);

                expect(mockContext.createTranscript).toHaveBeenCalledTimes(1);
                expect(mockContext.createTranscript).toHaveBeenCalledWith('model', 'Has text');
            });

            it('should handle missing parts gracefully', async () => {
                const message = {
                    serverContent: {
                        modelTurn: {}
                    }
                };

                // Should not throw
                await capturedCallbacks.onmessage(message);
                expect(mockContext.createTranscript).not.toHaveBeenCalled();
            });
        });

        describe('input transcription', () => {
            it('should create user transcript from inputTranscription', async () => {
                const message = {
                    serverContent: {
                        inputTranscription: 'User said this'
                    }
                };

                await capturedCallbacks.onmessage(message);

                expect(mockContext.createTranscript).toHaveBeenCalledWith('user', 'User said this');
                expect(mockContext.addTranscript).toHaveBeenCalled();
            });

            it('should handle empty inputTranscription', async () => {
                const message = {
                    serverContent: {
                        inputTranscription: ''
                    }
                };

                await capturedCallbacks.onmessage(message);

                // Empty string is falsy, so no transcript created
                expect(mockContext.createTranscript).not.toHaveBeenCalled();
            });
        });

        describe('combined messages', () => {
            it('should handle message with all components', async () => {
                const message = {
                    toolCall: {
                        functionCalls: [{ name: 'tool1', args: {} }]
                    },
                    serverContent: {
                        modelTurn: {
                            parts: [{ text: 'AI response' }]
                        },
                        inputTranscription: 'User input'
                    }
                };

                await capturedCallbacks.onmessage(message);

                expect(mockContext.toolHandler).toHaveBeenCalledWith('tool1', {});
                expect(mockContext.createTranscript).toHaveBeenCalledWith('model', 'AI response');
                expect(mockContext.createTranscript).toHaveBeenCalledWith('user', 'User input');
            });
        });
    });
});
