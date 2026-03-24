// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFixationGlow } from '../useFixationGlow';

describe('useFixationGlow', () => {
    let testElement: HTMLDivElement;

    beforeEach(() => {
        vi.useFakeTimers();
        testElement = document.createElement('div');
        testElement.setAttribute('data-biometric-id', 'test-element');
        document.body.appendChild(testElement);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    const dispatchFixation = (elementId: string, isFixating: boolean, duration: number) => {
        const event = new CustomEvent('biometric-fixation', {
            detail: { elementId, isFixating, duration }
        });
        window.dispatchEvent(event);
    };

    it('should register event listener on mount', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        renderHook(() => useFixationGlow());
        const eventNames = addSpy.mock.calls.map(c => c[0]);
        expect(eventNames).toContain('biometric-fixation');
        addSpy.mockRestore();
    });

    it('should remove event listener on unmount', () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useFixationGlow());
        unmount();
        const eventNames = removeSpy.mock.calls.map(c => c[0]);
        expect(eventNames).toContain('biometric-fixation');
        removeSpy.mockRestore();
    });

    it('should set data-biometric-fixating attribute when fixating', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 300);
        });

        expect(testElement.getAttribute('data-biometric-fixating')).toBe('true');
    });

    it('should set fixation level 1 for short durations (< 500ms)', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 200);
        });

        expect(testElement.getAttribute('data-biometric-fixation-level')).toBe('1');
    });

    it('should set fixation level 2 for medium durations (500-1499ms)', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 800);
        });

        expect(testElement.getAttribute('data-biometric-fixation-level')).toBe('2');
    });

    it('should set fixation level 3 for long durations (1500ms+)', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 2000);
        });

        expect(testElement.getAttribute('data-biometric-fixation-level')).toBe('3');
    });

    it('should set locked attribute for fixations >= 2000ms', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 2500);
        });

        expect(testElement.getAttribute('data-biometric-fixation-locked')).toBe('true');
    });

    it('should not set locked attribute for fixations < 2000ms', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 1000);
        });

        expect(testElement.hasAttribute('data-biometric-fixation-locked')).toBe(false);
    });

    it('should clear glow attributes after 150ms when not fixating', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 500);
        });
        expect(testElement.getAttribute('data-biometric-fixating')).toBe('true');

        act(() => {
            dispatchFixation('test-element', false, 0);
        });
        // Still present before timeout
        expect(testElement.getAttribute('data-biometric-fixating')).toBe('true');

        act(() => {
            vi.advanceTimersByTime(150);
        });
        // Cleared after timeout
        expect(testElement.hasAttribute('data-biometric-fixating')).toBe(false);
        expect(testElement.hasAttribute('data-biometric-fixation-level')).toBe(false);
    });

    it('should find element by id attribute', () => {
        const idElement = document.createElement('div');
        idElement.id = 'by-id-elem';
        document.body.appendChild(idElement);

        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('by-id-elem', true, 300);
        });

        expect(idElement.getAttribute('data-biometric-fixating')).toBe('true');
    });

    it('should do nothing if element is not found', () => {
        renderHook(() => useFixationGlow());

        // Should not throw
        act(() => {
            dispatchFixation('nonexistent-element', true, 500);
        });
    });

    it('should clear previous element when fixating a different element', () => {
        const secondElement = document.createElement('div');
        secondElement.setAttribute('data-biometric-id', 'second-element');
        document.body.appendChild(secondElement);

        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 500);
        });
        expect(testElement.getAttribute('data-biometric-fixating')).toBe('true');

        act(() => {
            dispatchFixation('second-element', true, 500);
        });
        // First element should be cleared
        expect(testElement.hasAttribute('data-biometric-fixating')).toBe(false);
        expect(secondElement.getAttribute('data-biometric-fixating')).toBe('true');
    });

    it('should remove locked attribute when duration drops below 2000ms', () => {
        renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 3000);
        });
        expect(testElement.getAttribute('data-biometric-fixation-locked')).toBe('true');

        act(() => {
            dispatchFixation('test-element', true, 500);
        });
        expect(testElement.hasAttribute('data-biometric-fixation-locked')).toBe(false);
    });

    it('should clean up on unmount with active fixation', () => {
        const { unmount } = renderHook(() => useFixationGlow());

        act(() => {
            dispatchFixation('test-element', true, 1000);
        });
        expect(testElement.getAttribute('data-biometric-fixating')).toBe('true');

        unmount();
        expect(testElement.hasAttribute('data-biometric-fixating')).toBe(false);
    });
});
