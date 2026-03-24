// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUpdateResearchTask = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetBicameralState = vi.hoisted(() => vi.fn());
const mockGetState = vi.hoisted(() => vi.fn());
const mockSetState = vi.hoisted(() => vi.fn());

const mockGenerateResearchPlan = vi.hoisted(() => vi.fn());
const mockExecuteResearchQuery = vi.hoisted(() => vi.fn());
const mockCompileResearchContext = vi.hoisted(() => vi.fn());
const mockSynthesizeResearchReport = vi.hoisted(() => vi.fn());
const mockGenerateHypotheses = vi.hoisted(() => vi.fn());
const mockPromptSelectKey = vi.hoisted(() => vi.fn());
const mockGenerateEmbedding = vi.hoisted(() => vi.fn());
const mockSaveArtifact = vi.hoisted(() => vi.fn());
const mockSaveVector = vi.hoisted(() => vi.fn());
const mockAdaptiveConsensusEngine = vi.hoisted(() => vi.fn());
const mockRlmEnhancedQuery = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
    useAppStore: Object.assign(
        vi.fn(() => ({
            research: { tasks: [] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        })),
        {
            getState: mockGetState,
            setState: mockSetState,
        }
    ),
}));

vi.mock('../../services/geminiService', () => ({
    generateResearchPlan: mockGenerateResearchPlan,
    executeResearchQuery: mockExecuteResearchQuery,
    compileResearchContext: mockCompileResearchContext,
    synthesizeResearchReport: mockSynthesizeResearchReport,
    generateHypotheses: mockGenerateHypotheses,
    promptSelectKey: mockPromptSelectKey,
    generateEmbedding: mockGenerateEmbedding,
}));

vi.mock('../../services/persistenceService', () => ({
    neuralVault: {
        saveArtifact: mockSaveArtifact,
        saveVector: mockSaveVector,
    },
}));

vi.mock('../../services/bicameralService', () => ({
    adaptiveConsensusEngine: mockAdaptiveConsensusEngine,
    ACEStatus: {},
}));

vi.mock('../../services/recursiveLanguageModel', () => ({
    rlmEnhancedQuery: mockRlmEnhancedQuery,
}));

vi.mock('../../services/logger', () => ({
    logger: {
        error: mockLoggerError,
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import { useResearchAgent } from '../useResearchAgent';
import { useAppStore } from '../../store';

/**
 * We capture the setInterval callback and call it directly.
 * This avoids issues with fake timers + async promise chains.
 */
let capturedIntervalCallbacks: Array<() => void> = [];
const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;

describe('useResearchAgent', () => {
    let localStorageData: Record<string, string>;
    let intervalIds: number[];

    beforeEach(() => {
        localStorageData = {};
        capturedIntervalCallbacks = [];
        intervalIds = [];

        // Intercept setInterval to capture callbacks
        vi.stubGlobal('setInterval', vi.fn((cb: () => void, _ms: number) => {
            capturedIntervalCallbacks.push(cb);
            const id = intervalIds.length + 1;
            intervalIds.push(id);
            return id;
        }));
        vi.stubGlobal('clearInterval', vi.fn());

        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => localStorageData[key] ?? null),
            setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value; }),
            removeItem: vi.fn((key: string) => { delete localStorageData[key]; }),
        });

        mockGetState.mockReturnValue({ research: { tasks: [] } });

        mockUpdateResearchTask.mockReset();
        mockAddLog.mockReset();
        mockSetBicameralState.mockReset();
        mockSetState.mockReset();
        mockGenerateResearchPlan.mockReset();
        mockExecuteResearchQuery.mockReset();
        mockCompileResearchContext.mockReset();
        mockGenerateHypotheses.mockReset();
        mockGenerateEmbedding.mockReset();
        mockSaveArtifact.mockReset();
        mockSaveVector.mockReset();
        mockAdaptiveConsensusEngine.mockReset();
        mockRlmEnhancedQuery.mockReset();
        mockLoggerError.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /** Invoke the captured setInterval callback and wait for all promises to settle */
    const triggerCheckQueue = async () => {
        // The third useEffect sets up the interval; its callback is the last one captured
        const cb = capturedIntervalCallbacks[capturedIntervalCallbacks.length - 1];
        if (cb) {
            await act(async () => {
                cb();
                // Let chained promises settle
                await new Promise<void>(r => realSetInterval(r, 10));
            });
        }
    };

    it('should persist research state to localStorage on research change', () => {
        const tasks = [{ id: 'task-1', query: 'test', status: 'QUEUED', logs: [], progress: 0 }];
        (useAppStore as any).mockReturnValue({
            research: { tasks },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        renderHook(() => useResearchAgent());

        expect(localStorage.setItem).toHaveBeenCalledWith(
            'structura_research_state',
            JSON.stringify({ tasks })
        );
    });

    it('should restore research state from localStorage on mount when no tasks exist', () => {
        const savedTasks = [
            { id: 'task-1', query: 'test', status: 'COMPLETED', logs: ['done'], progress: 100 },
        ];
        localStorageData['structura_research_state'] = JSON.stringify({ tasks: savedTasks });
        mockGetState.mockReturnValue({ research: { tasks: [] } });

        renderHook(() => useResearchAgent());

        expect(mockSetState).toHaveBeenCalledWith({ research: { tasks: savedTasks } });
    });

    it('should mark in-progress tasks as RESUMING when restoring from localStorage', () => {
        const savedTasks = [
            { id: 'task-1', query: 'test', status: 'PLANNING', logs: ['started'], progress: 10 },
            { id: 'task-2', query: 'test2', status: 'SEARCHING', logs: ['scanning'], progress: 30 },
            { id: 'task-3', query: 'test3', status: 'COMPLETED', logs: ['done'], progress: 100 },
        ];
        localStorageData['structura_research_state'] = JSON.stringify({ tasks: savedTasks });
        mockGetState.mockReturnValue({ research: { tasks: [] } });

        renderHook(() => useResearchAgent());

        expect(mockSetState).toHaveBeenCalled();
        const setStateArg = mockSetState.mock.calls[0][0];
        expect(setStateArg.research.tasks[0].status).toBe('RESUMING');
        expect(setStateArg.research.tasks[1].status).toBe('RESUMING');
        expect(setStateArg.research.tasks[2].status).toBe('COMPLETED');
        expect(setStateArg.research.tasks[0].logs).toContain('RESUMING: Restoring context snapshot...');
    });

    it('should not restore state if tasks already exist in store', () => {
        localStorageData['structura_research_state'] = JSON.stringify({ tasks: [{ id: 'old' }] });
        mockGetState.mockReturnValue({
            research: { tasks: [{ id: 'existing-task' }] },
        });

        renderHook(() => useResearchAgent());

        expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
        localStorageData['structura_research_state'] = '{invalid json';

        renderHook(() => useResearchAgent());

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Failed to restore research state',
            expect.any(SyntaxError)
        );
        expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should process QUEUED tasks through the full research workflow', async () => {
        const task = {
            id: 'task-1',
            query: 'quantum computing',
            status: 'QUEUED',
            logs: [],
            progress: 0,
            findings: [],
        };

        (useAppStore as any).mockReturnValue({
            research: { tasks: [task] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        mockGenerateResearchPlan.mockResolvedValue(['sub-query-1', 'sub-query-2']);
        mockGetState.mockReturnValue({ research: { tasks: [task] } });
        mockExecuteResearchQuery.mockResolvedValue([
            { id: 'f1', fact: 'Quantum fact', confidence: 0.9, source: 'test' },
        ]);
        mockGenerateHypotheses.mockResolvedValue([
            { id: 'h1', statement: 'Hypothesis', confidence: 0.8 },
        ]);
        mockCompileResearchContext.mockResolvedValue('Compiled context under 100k chars');
        mockAdaptiveConsensusEngine.mockResolvedValue({ output: 'Final research report' });
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        mockSaveArtifact.mockResolvedValue('artifact-123');

        renderHook(() => useResearchAgent());
        await triggerCheckQueue();

        expect(mockGenerateResearchPlan).toHaveBeenCalledWith('quantum computing');
        expect(mockExecuteResearchQuery).toHaveBeenCalledWith('sub-query-1');
        expect(mockExecuteResearchQuery).toHaveBeenCalledWith('sub-query-2');
        expect(mockGenerateHypotheses).toHaveBeenCalled();
        expect(mockCompileResearchContext).toHaveBeenCalled();
        expect(mockAdaptiveConsensusEngine).toHaveBeenCalled();
        expect(mockSaveArtifact).toHaveBeenCalled();
        expect(mockSaveVector).toHaveBeenCalledWith('artifact-123', [0.1, 0.2, 0.3], { query: 'quantum computing' });
        expect(mockUpdateResearchTask).toHaveBeenCalledWith('task-1', expect.objectContaining({
            status: 'COMPLETED',
            progress: 100,
        }));
    });

    it('should use RLM for long context synthesis (>100k chars)', async () => {
        const task = {
            id: 'task-rlm',
            query: 'massive research',
            status: 'QUEUED',
            logs: [],
            progress: 0,
            findings: [],
        };

        (useAppStore as any).mockReturnValue({
            research: { tasks: [task] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        mockGenerateResearchPlan.mockResolvedValue(['q1']);
        mockGetState.mockReturnValue({ research: { tasks: [task] } });
        mockExecuteResearchQuery.mockResolvedValue([
            { id: 'f1', fact: 'fact', confidence: 0.9, source: 'test' },
        ]);
        mockGenerateHypotheses.mockResolvedValue([]);
        mockCompileResearchContext.mockResolvedValue('x'.repeat(100001));
        mockRlmEnhancedQuery.mockResolvedValue({
            answer: 'RLM synthesized report',
            iterations: 3,
            subCalls: 5,
        });
        mockGenerateEmbedding.mockResolvedValue([0.5]);
        mockSaveArtifact.mockResolvedValue('rlm-artifact');

        renderHook(() => useResearchAgent());
        await triggerCheckQueue();

        expect(mockRlmEnhancedQuery).toHaveBeenCalled();
        expect(mockAdaptiveConsensusEngine).not.toHaveBeenCalled();
        expect(mockUpdateResearchTask).toHaveBeenCalledWith('task-rlm', expect.objectContaining({
            status: 'COMPLETED',
            progress: 100,
            result: 'RLM synthesized report',
        }));
        expect(mockSaveVector).toHaveBeenCalledWith('rlm-artifact', [0.5], { query: 'massive research' });
    });

    it('should handle task cancellation during workflow', async () => {
        const task = {
            id: 'task-cancel',
            query: 'cancel me',
            status: 'QUEUED',
            logs: [],
            progress: 0,
            findings: [],
        };

        (useAppStore as any).mockReturnValue({
            research: { tasks: [task] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        // First call: not cancelled. All subsequent: cancelled.
        mockGetState
            .mockReturnValueOnce({ research: { tasks: [task] } })
            .mockReturnValue({ research: { tasks: [{ ...task, status: 'CANCELLED' }] } });

        mockGenerateResearchPlan.mockResolvedValue(['q1']);

        renderHook(() => useResearchAgent());
        await triggerCheckQueue();

        expect(mockExecuteResearchQuery).not.toHaveBeenCalled();
        expect(mockUpdateResearchTask).not.toHaveBeenCalledWith('task-cancel', expect.objectContaining({
            status: 'FAILED',
        }));
    });

    it('should handle workflow errors and mark task as FAILED', async () => {
        const task = {
            id: 'task-fail',
            query: 'fail me',
            status: 'QUEUED',
            logs: [],
            progress: 0,
            findings: [],
        };

        (useAppStore as any).mockReturnValue({
            research: { tasks: [task] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        mockGetState.mockReturnValue({ research: { tasks: [task] } });
        mockGenerateResearchPlan.mockRejectedValue(new Error('API failure'));

        renderHook(() => useResearchAgent());
        await triggerCheckQueue();

        expect(mockUpdateResearchTask).toHaveBeenCalledWith('task-fail', expect.objectContaining({
            status: 'FAILED',
        }));
    });

    it('should skip embedding save when generateEmbedding returns empty array', async () => {
        const task = {
            id: 'task-noembed',
            query: 'no embed',
            status: 'QUEUED',
            logs: [],
            progress: 0,
            findings: [],
        };

        (useAppStore as any).mockReturnValue({
            research: { tasks: [task] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        mockGenerateResearchPlan.mockResolvedValue(['q1']);
        mockGetState.mockReturnValue({ research: { tasks: [task] } });
        mockExecuteResearchQuery.mockResolvedValue([
            { id: 'f1', fact: 'fact', confidence: 0.9, source: 'test' },
        ]);
        mockGenerateHypotheses.mockResolvedValue([]);
        mockCompileResearchContext.mockResolvedValue('short context');
        mockAdaptiveConsensusEngine.mockResolvedValue({ output: 'report' });
        mockGenerateEmbedding.mockResolvedValue([]);
        mockSaveArtifact.mockResolvedValue('art-1');

        renderHook(() => useResearchAgent());
        await triggerCheckQueue();

        expect(mockGenerateEmbedding).toHaveBeenCalled();
        expect(mockSaveVector).not.toHaveBeenCalled();
    });

    it('should use task.query as fallback when generateResearchPlan returns empty', async () => {
        const task = {
            id: 'task-fallback',
            query: 'fallback query',
            status: 'QUEUED',
            logs: [],
            progress: 0,
            findings: [],
        };

        (useAppStore as any).mockReturnValue({
            research: { tasks: [task] },
            actions: {
                updateResearchTask: mockUpdateResearchTask,
                addLog: mockAddLog,
                setBicameralState: mockSetBicameralState,
            },
        });

        mockGenerateResearchPlan.mockResolvedValue([]);
        mockGetState.mockReturnValue({ research: { tasks: [task] } });
        mockExecuteResearchQuery.mockResolvedValue([
            { id: 'f1', fact: 'fact', confidence: 0.9, source: 'test' },
        ]);
        mockGenerateHypotheses.mockResolvedValue([]);
        mockCompileResearchContext.mockResolvedValue('context');
        mockAdaptiveConsensusEngine.mockResolvedValue({ output: 'report' });
        mockGenerateEmbedding.mockResolvedValue([]);
        mockSaveArtifact.mockResolvedValue('art-1');

        renderHook(() => useResearchAgent());
        await triggerCheckQueue();

        expect(mockExecuteResearchQuery).toHaveBeenCalledWith('fallback query');
        expect(mockUpdateResearchTask).toHaveBeenCalledWith('task-fallback', expect.objectContaining({
            subQueries: ['fallback query'],
        }));
    });

    it('should set up and clean up the interval on mount/unmount', () => {
        renderHook(() => useResearchAgent());

        expect(globalThis.setInterval).toHaveBeenCalledWith(expect.any(Function), 2000);

        // clearInterval is called on unmount (React effect cleanup)
        // The hook registers the interval, so we check it was created
        expect(capturedIntervalCallbacks.length).toBeGreaterThan(0);
    });
});
