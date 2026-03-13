// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePerformanceMonitor } from '../usePerformanceMonitor';

describe('usePerformanceMonitor', () => {
    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => {
            return setTimeout(cb, 16) as unknown as number;
        }));
        vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => clearTimeout(id)));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return initial fps of 60', () => {
        const { result } = renderHook(() => usePerformanceMonitor());
        expect(result.current.fps).toBe(60);
    });

    it('should return memory as null initially', () => {
        const { result } = renderHook(() => usePerformanceMonitor());
        expect(result.current.memory).toBeNull();
    });

    it('should call requestAnimationFrame on mount', () => {
        renderHook(() => usePerformanceMonitor());
        expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', () => {
        const { unmount } = renderHook(() => usePerformanceMonitor());
        unmount();
        expect(cancelAnimationFrame).toHaveBeenCalled();
    });
});
