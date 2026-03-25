// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockSetState = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => {
    const store = {
        useAppStore: vi.fn(() => ({})),
        setState: mockSetState,
    };
    // useAppStore.setState needs to be available
    (store.useAppStore as any).setState = mockSetState;
    return store;
});

import { useKernelUptime } from '../useKernelUptime';

describe('useKernelUptime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockSetState.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should set up an interval on mount', () => {
        renderHook(() => useKernelUptime());
        // No setState called yet (interval hasn't fired)
        expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should call setState after 1 second', () => {
        renderHook(() => useKernelUptime());
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(mockSetState).toHaveBeenCalledTimes(1);
        expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should increment uptime in state updater', () => {
        renderHook(() => useKernelUptime());
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        const updater = mockSetState.mock.calls[0][0];
        const mockState = { kernel: { uptime: 42, other: 'data' } };
        const result = updater(mockState);
        expect(result.kernel.uptime).toBe(43);
        expect(result.kernel.other).toBe('data');
    });

    it('should clear interval on unmount', () => {
        const { unmount } = renderHook(() => useKernelUptime());
        unmount();
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should increment multiple times', () => {
        renderHook(() => useKernelUptime());
        act(() => {
            vi.advanceTimersByTime(3000);
        });
        expect(mockSetState).toHaveBeenCalledTimes(3);
    });
});
