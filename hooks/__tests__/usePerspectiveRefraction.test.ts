// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePerspectiveRefraction } from '../usePerspectiveRefraction';

describe('usePerspectiveRefraction', () => {
    it('should return ref, style, onMouseMove, and onMouseLeave', () => {
        const { result } = renderHook(() => usePerspectiveRefraction());
        expect(result.current.ref).toBeDefined();
        expect(result.current.style).toBeDefined();
        expect(result.current.onMouseMove).toBeTypeOf('function');
        expect(result.current.onMouseLeave).toBeTypeOf('function');
    });

    it('should have initial tilt values at zero', () => {
        const { result } = renderHook(() => usePerspectiveRefraction());
        expect(result.current.style.transform).toContain('rotateX(0deg)');
        expect(result.current.style.transform).toContain('rotateY(0deg)');
        expect(result.current.style.background).toBeUndefined();
    });

    it('should update tilt on mouse move when ref has element', () => {
        const { result } = renderHook(() => usePerspectiveRefraction(1));

        // Simulate a ref with a bounding rect
        const mockElement = {
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 200,
                height: 200,
            }),
        } as HTMLDivElement;

        // Set the ref
        (result.current.ref as any).current = mockElement;

        // Simulate mouse move off-center (both axes)
        act(() => {
            result.current.onMouseMove({
                clientX: 150,
                clientY: 50,
            } as any);
        });

        // Mouse is above center, so rotateX should be non-zero
        expect(result.current.style.transform).not.toContain('rotateX(0deg)');
        expect(result.current.style.background).toBeDefined();
    });

    it('should reset tilt on mouse leave', () => {
        const { result } = renderHook(() => usePerspectiveRefraction(1));

        const mockElement = {
            getBoundingClientRect: () => ({
                left: 0, top: 0, width: 200, height: 200,
            }),
        } as HTMLDivElement;
        (result.current.ref as any).current = mockElement;

        // Move mouse then leave
        act(() => {
            result.current.onMouseMove({ clientX: 150, clientY: 100 } as any);
        });
        act(() => {
            result.current.onMouseLeave();
        });

        expect(result.current.style.transform).toContain('rotateX(0deg)');
        expect(result.current.style.transform).toContain('rotateY(0deg)');
        expect(result.current.style.background).toBeUndefined();
    });

    it('should scale tilt by intensity parameter', () => {
        const { result: result1 } = renderHook(() => usePerspectiveRefraction(1));
        const { result: result2 } = renderHook(() => usePerspectiveRefraction(2));

        const mockElement = {
            getBoundingClientRect: () => ({
                left: 0, top: 0, width: 200, height: 200,
            }),
        } as HTMLDivElement;
        (result1.current.ref as any).current = mockElement;
        (result2.current.ref as any).current = mockElement;

        act(() => {
            result1.current.onMouseMove({ clientX: 150, clientY: 50 } as any);
        });
        act(() => {
            result2.current.onMouseMove({ clientX: 150, clientY: 50 } as any);
        });

        // intensity=2 should produce larger tilt values
        const transform1 = result1.current.style.transform;
        const transform2 = result2.current.style.transform;
        expect(transform1).not.toEqual(transform2);
    });
});
