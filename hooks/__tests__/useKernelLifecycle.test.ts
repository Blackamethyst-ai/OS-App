// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetKernelState = vi.hoisted(() => vi.fn());
const mockBoot = vi.hoisted(() => vi.fn());
const mockShutdown = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
    useAppStore: (selector: any) => selector({
        actions: {
            addLog: mockAddLog,
            setKernelState: mockSetKernelState,
        },
    }),
}));

vi.mock('../../services/kernel', () => ({
    agentKernel: {
        boot: mockBoot,
        shutdown: mockShutdown,
    },
}));

import { useKernelLifecycle } from '../useKernelLifecycle';

describe('useKernelLifecycle', () => {
    beforeEach(() => {
        mockAddLog.mockReset();
        mockSetKernelState.mockReset();
        mockShutdown.mockReset();
        mockBoot.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should call agentKernel.boot on mount', () => {
        renderHook(() => useKernelLifecycle());
        expect(mockBoot).toHaveBeenCalledTimes(1);
    });

    it('should log success and set IDLE state after boot resolves', async () => {
        renderHook(() => useKernelLifecycle());
        await vi.waitFor(() => {
            expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'KERNEL: Agentic Kernel booted successfully');
            expect(mockSetKernelState).toHaveBeenCalledWith({ operationalState: 'IDLE' });
        });
    });

    it('should log error when boot fails', async () => {
        mockBoot.mockRejectedValue(new Error('boot failure'));
        renderHook(() => useKernelLifecycle());
        await vi.waitFor(() => {
            expect(mockAddLog).toHaveBeenCalledWith('ERROR', 'KERNEL: Boot failed - boot failure');
        });
    });

    it('should call agentKernel.shutdown on unmount', () => {
        const { unmount } = renderHook(() => useKernelLifecycle());
        unmount();
        expect(mockShutdown).toHaveBeenCalledTimes(1);
    });
});
