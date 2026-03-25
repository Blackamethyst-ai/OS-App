// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockActions = vi.hoisted(() => ({
    setProcessState: vi.fn(),
    setCodeStudioState: vi.fn(),
    setHardwareState: vi.fn(),
    setImageGenState: vi.fn(),
    setBibliomorphicState: vi.fn(),
    setDashboardState: vi.fn(),
    setMetaventionsState: vi.fn(),
    setAgentState: vi.fn(),
    setMemoryState: vi.fn(),
    setVoiceState: vi.fn(),
    setBicameralState: vi.fn(),
    addLog: vi.fn(),
}));

const mockMode = vi.hoisted(() => ({ current: 'DASHBOARD' }));

vi.mock('../../store', () => ({
    useAppStore: (selector: any) => {
        const state = { mode: mockMode.current, actions: mockActions };
        return selector(state);
    },
}));

vi.mock('../../types', () => ({
    AppMode: {
        DASHBOARD: 'DASHBOARD',
        PROCESS_MAP: 'PROCESS_MAP',
        CODE_STUDIO: 'CODE_STUDIO',
        HARDWARE_ENGINEER: 'HARDWARE_ENGINEER',
        IMAGE_GEN: 'IMAGE_GEN',
        BIBLIOMORPHIC: 'BIBLIOMORPHIC',
        METAVENTIONS_HUB: 'METAVENTIONS_HUB',
        AUTONOMOUS_FINANCE: 'AUTONOMOUS_FINANCE',
        AGENT_CONTROL: 'AGENT_CONTROL',
        SYNTHESIS_BRIDGE: 'SYNTHESIS_BRIDGE',
        MEMORY_CORE: 'MEMORY_CORE',
        VOICE_MODE: 'VOICE_MODE',
        BICAMERAL: 'BICAMERAL',
    },
}));

vi.mock('../../services/audioService', () => ({
    audio: { playSuccess: vi.fn() },
}));

import { useTimeTravel } from '../useTimeTravel';

describe('useTimeTravel', () => {
    beforeEach(() => {
        Object.values(mockActions).forEach(fn => fn.mockReset());
    });

    it('should return a restore function', () => {
        const { result } = renderHook(() => useTimeTravel());
        expect(result.current.restore).toBeTypeOf('function');
    });

    it('should call setDashboardState for DASHBOARD mode', () => {
        mockMode.current = 'DASHBOARD';
        const { result } = renderHook(() => useTimeTravel());
        const state = { data: 'test' };
        act(() => {
            result.current.restore(state);
        });
        expect(mockActions.setDashboardState).toHaveBeenCalledWith(state);
        expect(mockActions.addLog).toHaveBeenCalledWith('INFO', 'Timeline resync successful.');
    });

    it('should call setProcessState for PROCESS_MAP mode', () => {
        mockMode.current = 'PROCESS_MAP';
        const { result } = renderHook(() => useTimeTravel());
        const state = { data: 'test' };
        act(() => {
            result.current.restore(state);
        });
        expect(mockActions.setProcessState).toHaveBeenCalledWith(state);
    });

    it('should call setCodeStudioState for CODE_STUDIO mode', () => {
        mockMode.current = 'CODE_STUDIO';
        const { result } = renderHook(() => useTimeTravel());
        act(() => {
            result.current.restore({ code: true });
        });
        expect(mockActions.setCodeStudioState).toHaveBeenCalledWith({ code: true });
    });

    it('should call setMetaventionsState for METAVENTIONS_HUB mode', () => {
        mockMode.current = 'METAVENTIONS_HUB';
        const { result } = renderHook(() => useTimeTravel());
        act(() => {
            result.current.restore({ hub: true });
        });
        expect(mockActions.setMetaventionsState).toHaveBeenCalledWith({ hub: true });
    });
});
