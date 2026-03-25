// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockNeuralAutomata = vi.hoisted(() => vi.fn());
const mockAutopoieticDaemon = vi.hoisted(() => vi.fn());

vi.mock('../../services/daemonService', () => ({
    neuralAutomata: mockNeuralAutomata,
}));

vi.mock('../../services/autopoieticDaemon', () => ({
    autopoieticDaemon: mockAutopoieticDaemon,
}));

vi.mock('../../store', () => ({
    useAppStore: vi.fn(() => ({})),
}));

import { useDaemonSwarm } from '../useDaemonSwarm';

describe('useDaemonSwarm', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockNeuralAutomata.mockReset();
        mockAutopoieticDaemon.mockReset();
        // Default: tab is visible
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should not call daemons immediately on mount', () => {
        renderHook(() => useDaemonSwarm());
        expect(mockNeuralAutomata).not.toHaveBeenCalled();
        expect(mockAutopoieticDaemon).not.toHaveBeenCalled();
    });

    it('should call daemons after 15 seconds when tab is visible', () => {
        renderHook(() => useDaemonSwarm());
        vi.advanceTimersByTime(15000);
        expect(mockNeuralAutomata).toHaveBeenCalledTimes(1);
        expect(mockAutopoieticDaemon).toHaveBeenCalledTimes(1);
    });

    it('should not call daemons when tab is hidden', () => {
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            writable: true,
            configurable: true,
        });
        renderHook(() => useDaemonSwarm());
        vi.advanceTimersByTime(15000);
        expect(mockNeuralAutomata).not.toHaveBeenCalled();
        expect(mockAutopoieticDaemon).not.toHaveBeenCalled();
    });

    it('should clear interval on unmount', () => {
        const { unmount } = renderHook(() => useDaemonSwarm());
        unmount();
        vi.advanceTimersByTime(30000);
        expect(mockNeuralAutomata).not.toHaveBeenCalled();
        expect(mockAutopoieticDaemon).not.toHaveBeenCalled();
    });
});
