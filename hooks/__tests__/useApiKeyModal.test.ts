// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockHasGeminiKey = vi.hoisted(() => vi.fn());
const mockCollabInit = vi.hoisted(() => vi.fn());
const mockCollabDisconnect = vi.hoisted(() => vi.fn());
const mockHydrateAgents = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());

vi.mock('../../services/apiKeyService', () => ({
    apiKeyService: { hasGeminiKey: mockHasGeminiKey }
}));

vi.mock('../../services/collabService', () => ({
    collabService: { init: mockCollabInit, disconnect: mockCollabDisconnect }
}));

vi.mock('../../store', () => ({
    useAppStore: (selector: any) => {
        const state = {
            actions: {
                hydrateAgents: mockHydrateAgents,
                addLog: mockAddLog,
            }
        };
        return selector ? selector(state) : state;
    }
}));

import { useApiKeyModal } from '../useApiKeyModal';

describe('useApiKeyModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockHasGeminiKey.mockReturnValue(true);
        // Clear sessionStorage and set non-demo mode
        sessionStorage.clear();
        // Reset URL to non-demo
        Object.defineProperty(window, 'location', {
            value: { search: '' },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return isOpen as false initially when key exists', () => {
        const { result } = renderHook(() => useApiKeyModal());
        expect(result.current.isOpen).toBe(false);
    });

    it('should return setIsOpen function', () => {
        const { result } = renderHook(() => useApiKeyModal());
        expect(typeof result.current.setIsOpen).toBe('function');
    });

    it('should initialize collab service on mount', () => {
        renderHook(() => useApiKeyModal());
        expect(mockCollabInit).toHaveBeenCalled();
    });

    it('should hydrate agents on mount', () => {
        renderHook(() => useApiKeyModal());
        expect(mockHydrateAgents).toHaveBeenCalled();
    });

    it('should disconnect collab service on unmount', () => {
        const { unmount } = renderHook(() => useApiKeyModal());
        unmount();
        expect(mockCollabDisconnect).toHaveBeenCalled();
    });

    it('should open modal when show-api-key-modal event is dispatched', () => {
        const { result } = renderHook(() => useApiKeyModal());
        expect(result.current.isOpen).toBe(false);

        act(() => {
            window.dispatchEvent(new Event('show-api-key-modal'));
        });

        expect(result.current.isOpen).toBe(true);
    });

    it('should auto-show modal after 1500ms when no Gemini key and not demo mode', () => {
        mockHasGeminiKey.mockReturnValue(false);

        const { result } = renderHook(() => useApiKeyModal());
        expect(result.current.isOpen).toBe(false);

        act(() => {
            vi.advanceTimersByTime(1500);
        });

        expect(result.current.isOpen).toBe(true);
    });

    it('should not auto-show modal in demo mode via URL param', () => {
        mockHasGeminiKey.mockReturnValue(false);
        Object.defineProperty(window, 'location', {
            value: { search: '?demo=true' },
            writable: true,
            configurable: true,
        });

        const { result } = renderHook(() => useApiKeyModal());

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.isOpen).toBe(false);
    });

    it('should not auto-show modal in demo mode via session storage', () => {
        mockHasGeminiKey.mockReturnValue(false);
        sessionStorage.setItem('metaventions_demo_mode', 'true');

        const { result } = renderHook(() => useApiKeyModal());

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.isOpen).toBe(false);
    });

    it('should allow toggling isOpen via setIsOpen', () => {
        const { result } = renderHook(() => useApiKeyModal());

        act(() => {
            result.current.setIsOpen(true);
        });
        expect(result.current.isOpen).toBe(true);

        act(() => {
            result.current.setIsOpen(false);
        });
        expect(result.current.isOpen).toBe(false);
    });

    it('should not auto-show when key exists', () => {
        mockHasGeminiKey.mockReturnValue(true);

        const { result } = renderHook(() => useApiKeyModal());

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        // Should remain closed since key exists
        expect(result.current.isOpen).toBe(false);
    });

    it('should clean up event listener on unmount', () => {
        const { unmount } = renderHook(() => useApiKeyModal());
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        unmount();

        const eventNames = removeSpy.mock.calls.map(c => c[0]);
        expect(eventNames).toContain('show-api-key-modal');
        removeSpy.mockRestore();
    });
});
