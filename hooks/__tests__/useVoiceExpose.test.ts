// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUplinkData = vi.hoisted(() => vi.fn());
const mockSeverUplink = vi.hoisted(() => vi.fn());

vi.mock('../../stores/useSystemMind', () => ({
    useSystemMind: (selector: any) => {
        const state = {
            uplinkData: mockUplinkData,
            severUplink: mockSeverUplink,
        };
        return selector(state);
    },
}));

import { useVoiceExpose } from '../useVoiceExpose';

describe('useVoiceExpose', () => {
    beforeEach(() => {
        mockUplinkData.mockReset();
        mockSeverUplink.mockReset();
    });

    it('should call uplinkData on mount with id and data', () => {
        const data = { value: 42 };
        renderHook(() => useVoiceExpose('test-component', data));
        expect(mockUplinkData).toHaveBeenCalledWith('test-component', data);
    });

    it('should call severUplink on unmount', () => {
        const { unmount } = renderHook(() => useVoiceExpose('test-component', { x: 1 }));
        unmount();
        expect(mockSeverUplink).toHaveBeenCalledWith('test-component');
    });

    it('should update when data changes', () => {
        const { rerender } = renderHook(
            ({ id, data }) => useVoiceExpose(id, data),
            { initialProps: { id: 'comp-1', data: { v: 1 } } }
        );

        mockUplinkData.mockReset();
        rerender({ id: 'comp-1', data: { v: 2 } });
        expect(mockUplinkData).toHaveBeenCalledWith('comp-1', { v: 2 });
    });

    it('should not update when data is the same', () => {
        const { rerender } = renderHook(
            ({ id, data }) => useVoiceExpose(id, data),
            { initialProps: { id: 'comp-1', data: { v: 1 } } }
        );

        mockUplinkData.mockReset();
        // Rerender with same data content (different object reference)
        rerender({ id: 'comp-1', data: { v: 1 } });
        // The hook uses JSON.stringify comparison via ref, so same content should not trigger uplinkData
        expect(mockUplinkData).not.toHaveBeenCalled();
    });
});
