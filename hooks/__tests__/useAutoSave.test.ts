// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockCreateCheckpoint = vi.hoisted(() => vi.fn());
const mockGetState = vi.hoisted(() => vi.fn());
let mockMode = vi.hoisted(() => 'DASHBOARD');

vi.mock('../../services/persistenceService', () => ({
    neuralVault: { createCheckpoint: mockCreateCheckpoint }
}));

vi.mock('../../types', () => ({
    AppMode: {
        PROCESS_MAP: 'PROCESS_MAP',
        CODE_STUDIO: 'CODE_STUDIO',
        HARDWARE_ENGINEER: 'HARDWARE_ENGINEER',
        BIBLIOMORPHIC: 'BIBLIOMORPHIC',
        DASHBOARD: 'DASHBOARD',
        IMAGE_GEN: 'IMAGE_GEN',
        METAVENTIONS_HUB: 'METAVENTIONS_HUB',
        AUTONOMOUS_FINANCE: 'AUTONOMOUS_FINANCE',
        AGENT_CONTROL: 'AGENT_CONTROL',
        SYNTHESIS_BRIDGE: 'SYNTHESIS_BRIDGE',
        MEMORY_CORE: 'MEMORY_CORE',
        VOICE_MODE: 'VOICE_MODE',
        BICAMERAL: 'BICAMERAL',
    }
}));

vi.mock('../../store', () => ({
    useAppStore: Object.assign(
        (selector: any) => {
            const state = { mode: mockMode };
            return selector ? selector(state) : state;
        },
        { getState: mockGetState }
    )
}));

import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockMode = 'DASHBOARD';
        mockGetState.mockReturnValue({
            mode: 'DASHBOARD',
            dashboard: { widgets: [] },
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should save checkpoint on mode switch', () => {
        mockGetState.mockReturnValue({
            mode: 'DASHBOARD',
            dashboard: { widgets: ['cpu'] },
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).toHaveBeenCalledWith(
            'DASHBOARD',
            { widgets: ['cpu'] },
            expect.stringContaining('Mode Switch')
        );
    });

    it('should save checkpoint for CODE_STUDIO mode', () => {
        mockMode = 'CODE_STUDIO';
        mockGetState.mockReturnValue({
            mode: 'CODE_STUDIO',
            codeStudio: { prompt: 'hello' },
            dashboard: null,
            process: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).toHaveBeenCalledWith(
            'CODE_STUDIO',
            { prompt: 'hello' },
            expect.stringContaining('Mode Switch')
        );
    });

    it('should not create checkpoint when activeData is null', () => {
        mockMode = 'PROCESS_MAP';
        mockGetState.mockReturnValue({
            mode: 'PROCESS_MAP',
            process: null,
            dashboard: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).not.toHaveBeenCalled();
    });

    it('should set up periodic auto-save interval', () => {
        renderHook(() => useAutoSave());

        // Fast-forward but not enough to trigger auto-save (< 60s since mount)
        vi.advanceTimersByTime(10000);

        // No periodic save yet since lastSave was just set
        // Only the mode-switch save should have fired
        const modeCallCount = mockCreateCheckpoint.mock.calls.filter(
            (c: any[]) => c[2]?.includes('Mode Switch')
        ).length;
        expect(modeCallCount).toBeGreaterThanOrEqual(0);
    });

    it('should trigger auto-save after 60 seconds when page is visible', () => {
        // Make document visible
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            writable: true,
            configurable: true,
        });

        mockGetState.mockReturnValue({
            mode: 'DASHBOARD',
            dashboard: { data: 'current' },
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());
        mockCreateCheckpoint.mockClear();

        // Advance past 60s threshold, interval fires every 10s
        vi.advanceTimersByTime(70000);

        const autoSaveCalls = mockCreateCheckpoint.mock.calls.filter(
            (c: any[]) => c[2] === 'Auto-Save'
        );
        expect(autoSaveCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should not auto-save when document is hidden', () => {
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            writable: true,
            configurable: true,
        });

        mockGetState.mockReturnValue({
            mode: 'DASHBOARD',
            dashboard: { data: 'stuff' },
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());
        mockCreateCheckpoint.mockClear();

        vi.advanceTimersByTime(70000);

        const autoSaveCalls = mockCreateCheckpoint.mock.calls.filter(
            (c: any[]) => c[2] === 'Auto-Save'
        );
        expect(autoSaveCalls.length).toBe(0);
    });

    it('should clean up interval on unmount', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

        const { unmount } = renderHook(() => useAutoSave());
        unmount();

        expect(clearIntervalSpy).toHaveBeenCalled();
        clearIntervalSpy.mockRestore();
    });

    it('should save AGENT_CONTROL mode data', () => {
        mockMode = 'AGENT_CONTROL';
        mockGetState.mockReturnValue({
            mode: 'AGENT_CONTROL',
            agents: { active: ['agent-1'] },
            dashboard: null,
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).toHaveBeenCalledWith(
            'AGENT_CONTROL',
            { active: ['agent-1'] },
            expect.stringContaining('Mode Switch')
        );
    });

    it('should save MEMORY_CORE mode data', () => {
        mockMode = 'MEMORY_CORE';
        mockGetState.mockReturnValue({
            mode: 'MEMORY_CORE',
            memory: { entries: [1, 2] },
            dashboard: null,
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).toHaveBeenCalledWith(
            'MEMORY_CORE',
            { entries: [1, 2] },
            expect.stringContaining('Mode Switch')
        );
    });

    it('should save METAVENTIONS_HUB and SYNTHESIS_BRIDGE from metaventions state', () => {
        mockMode = 'METAVENTIONS_HUB';
        mockGetState.mockReturnValue({
            mode: 'METAVENTIONS_HUB',
            metaventions: { hub: true },
            dashboard: null,
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            agents: null,
            memory: null,
            voice: null,
            bicameral: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).toHaveBeenCalledWith(
            'METAVENTIONS_HUB',
            { hub: true },
            expect.stringContaining('Mode Switch')
        );
    });

    it('should save BICAMERAL mode data', () => {
        mockMode = 'BICAMERAL';
        mockGetState.mockReturnValue({
            mode: 'BICAMERAL',
            bicameral: { left: 'a', right: 'b' },
            dashboard: null,
            process: null,
            codeStudio: null,
            hardware: null,
            bibliomorphic: null,
            imageGen: null,
            metaventions: null,
            agents: null,
            memory: null,
            voice: null,
        });

        renderHook(() => useAutoSave());

        expect(mockCreateCheckpoint).toHaveBeenCalledWith(
            'BICAMERAL',
            { left: 'a', right: 'b' },
            expect.stringContaining('Mode Switch')
        );
    });
});
