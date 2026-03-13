// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentRuntime } from '../useAgentRuntime';

// Mock dependencies
vi.mock('../../services/DynamicToolRegistry', () => ({
    dynamicRegistry: {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCombinedManifests: vi.fn().mockReturnValue([]),
        execute: vi.fn().mockResolvedValue({ data: { result: 'ok' } }),
    }
}));

vi.mock('../../services/geminiService', () => ({
    SOVEREIGN_SYSTEM_INSTRUCTION: 'test instruction',
    retryGeminiRequest: vi.fn((fn: () => Promise<any>) => fn()),
    getAI: vi.fn(() => ({
        models: {
            generateContent: vi.fn().mockResolvedValue({
                text: 'Test response',
                functionCalls: null,
            })
        }
    })),
}));

vi.mock('../../store', () => ({
    useAppStore: vi.fn((selector: any) => selector({
        actions: { addLog: vi.fn() }
    })),
}));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(),
    FunctionDeclaration: {},
    GenerateContentResponse: {},
}));

describe('useAgentRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return initial idle state', () => {
        const { result } = renderHook(() => useAgentRuntime());
        expect(result.current.state.isThinking).toBe(false);
        expect(result.current.state.activeTool).toBeNull();
        expect(result.current.state.lastResult).toBeNull();
        expect(result.current.state.history).toEqual([]);
    });

    it('should have an execute function', () => {
        const { result } = renderHook(() => useAgentRuntime());
        expect(typeof result.current.execute).toBe('function');
    });

    it('should add user message to history on execute', async () => {
        const { result } = renderHook(() => useAgentRuntime());

        await act(async () => {
            await result.current.execute('test prompt');
        });

        const userMessages = result.current.state.history.filter(h => h.role === 'user');
        expect(userMessages.length).toBeGreaterThan(0);
        expect(userMessages[0].content).toBe('test prompt');
    });

    it('should set isThinking to false after execution completes', async () => {
        const { result } = renderHook(() => useAgentRuntime());

        await act(async () => {
            await result.current.execute('test prompt');
        });

        expect(result.current.state.isThinking).toBe(false);
    });

    it('should handle errors gracefully', async () => {
        const { getAI } = await import('../../services/geminiService');
        (getAI as any).mockReturnValueOnce({
            models: {
                generateContent: vi.fn().mockRejectedValue(new Error('API failure'))
            }
        });

        const { result } = renderHook(() => useAgentRuntime());

        await act(async () => {
            const response = await result.current.execute('failing prompt');
            expect(response).toBeNull();
        });

        expect(result.current.state.isThinking).toBe(false);
    });
});
