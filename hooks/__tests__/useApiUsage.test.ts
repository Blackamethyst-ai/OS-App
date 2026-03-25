// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetStats = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn());
const mockGetRateLimitInfo = vi.hoisted(() => vi.fn());
const mockIsRateLimited = vi.hoisted(() => vi.fn());

vi.mock('../../services/apiUsageService', () => ({
    apiUsageService: {
        getStats: mockGetStats,
        subscribe: mockSubscribe,
        getRateLimitInfo: mockGetRateLimitInfo,
        isRateLimited: mockIsRateLimited,
    },
    ApiUsageStats: {},
}));

import { useApiUsage } from '../useApiUsage';

describe('useApiUsage', () => {
    const defaultStats = {
        totalCalls: 0,
        callsThisMinute: 0,
        callsThisHour: 0,
        callsByModel: {},
        lastCallTime: null,
        errors: 0,
    };

    beforeEach(() => {
        vi.useFakeTimers();
        mockGetStats.mockReturnValue(defaultStats);
        mockSubscribe.mockReturnValue(vi.fn()); // returns unsubscribe
        mockGetRateLimitInfo.mockReturnValue({ rpm: 15, used: 0, isAtLimit: false });
        mockIsRateLimited.mockReturnValue(false);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should return initial stats from apiUsageService', () => {
        const { result } = renderHook(() => useApiUsage());
        expect(result.current.stats).toEqual(defaultStats);
        expect(mockGetStats).toHaveBeenCalled();
    });

    it('should subscribe to updates on mount and unsubscribe on unmount', () => {
        const unsubscribe = vi.fn();
        mockSubscribe.mockReturnValue(unsubscribe);

        const { unmount } = renderHook(() => useApiUsage());
        expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));

        unmount();
        expect(unsubscribe).toHaveBeenCalled();
    });

    it('should refresh stats on interval', () => {
        const updatedStats = { ...defaultStats, totalCalls: 5 };
        renderHook(() => useApiUsage());

        mockGetStats.mockReturnValue(updatedStats);
        act(() => {
            vi.advanceTimersByTime(10000);
        });

        // getStats called: once at init, once by subscription setup, and again on interval
        expect(mockGetStats.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should clear interval on unmount', () => {
        const { unmount } = renderHook(() => useApiUsage());
        unmount();
        const callCountAfterUnmount = mockGetStats.mock.calls.length;

        act(() => {
            vi.advanceTimersByTime(20000);
        });

        expect(mockGetStats.mock.calls.length).toBe(callCountAfterUnmount);
    });

    it('should expose getRateLimitInfo that delegates to service', () => {
        const { result } = renderHook(() => useApiUsage());
        const info = result.current.getRateLimitInfo('gemini-2.0-flash');
        expect(mockGetRateLimitInfo).toHaveBeenCalledWith('gemini-2.0-flash');
        expect(info).toEqual({ rpm: 15, used: 0, isAtLimit: false });
    });

    it('should expose isRateLimited that delegates to service', () => {
        const { result } = renderHook(() => useApiUsage());
        const limited = result.current.isRateLimited('gemini-2.0-flash');
        expect(mockIsRateLimited).toHaveBeenCalledWith('gemini-2.0-flash');
        expect(limited).toBe(false);
    });
});
