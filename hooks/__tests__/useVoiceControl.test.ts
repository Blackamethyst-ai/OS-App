// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../store', () => ({
    useAppStore: vi.fn(() => ({})),
}));

vi.mock('../../services/geminiService', () => ({
    liveSession: {},
}));

import { useVoiceControl } from '../useVoiceControl';

describe('useVoiceControl', () => {
    it('should return null', () => {
        const { result } = renderHook(() => useVoiceControl());
        expect(result.current).toBeNull();
    });

    it('should be a no-op hook', () => {
        const { result, unmount } = renderHook(() => useVoiceControl());
        expect(result.current).toBeNull();
        unmount();
        // No errors on unmount
    });

    it('should consistently return null across re-renders', () => {
        const { result, rerender } = renderHook(() => useVoiceControl());
        expect(result.current).toBeNull();
        rerender();
        expect(result.current).toBeNull();
    });

    it('should not throw on mount', () => {
        expect(() => {
            renderHook(() => useVoiceControl());
        }).not.toThrow();
    });
});
