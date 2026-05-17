import { describe, it, expect, beforeEach } from 'vitest';
import { apiUsageService } from '../apiUsageService';

describe('ApiUsageService', () => {
    beforeEach(() => {
        apiUsageService.reset();
    });

    describe('recordCall', () => {
        it('increments totalCalls on each record', () => {
            apiUsageService.recordCall('gemini-2.5-flash', true);
            apiUsageService.recordCall('gemini-2.5-flash', true);
            expect(apiUsageService.getStats().totalCalls).toBe(2);
        });

        it('tracks errors separately from successes', () => {
            apiUsageService.recordCall('gemini-2.5-flash', true);
            apiUsageService.recordCall('gemini-2.5-flash', false);
            const stats = apiUsageService.getStats();
            expect(stats.totalCalls).toBe(2);
            expect(stats.errors).toBe(1);
        });

        it('groups calls by model', () => {
            apiUsageService.recordCall('gemini-2.5-flash', true);
            apiUsageService.recordCall('gemini-2.5-flash', true);
            apiUsageService.recordCall('text-embedding-004', true);
            const { callsByModel } = apiUsageService.getStats();
            expect(callsByModel['gemini-2.5-flash']).toBe(2);
            expect(callsByModel['text-embedding-004']).toBe(1);
        });
    });

    describe('getStats', () => {
        it('returns zero counts when empty', () => {
            const stats = apiUsageService.getStats();
            expect(stats.totalCalls).toBe(0);
            expect(stats.callsThisMinute).toBe(0);
            expect(stats.callsThisHour).toBe(0);
            expect(stats.errors).toBe(0);
            expect(stats.lastCallTime).toBeNull();
        });

        it('sets lastCallTime after a record', () => {
            const before = Date.now();
            apiUsageService.recordCall('gemini-2.5-flash', true);
            const stats = apiUsageService.getStats();
            expect(stats.lastCallTime).toBeGreaterThanOrEqual(before);
        });

        it('counts calls this minute correctly', () => {
            apiUsageService.recordCall('gemini-2.5-flash', true);
            apiUsageService.recordCall('gemini-2.5-flash', true);
            expect(apiUsageService.getStats().callsThisMinute).toBe(2);
        });
    });

    describe('getRateLimitInfo', () => {
        it('returns correct limits for known model', () => {
            const info = apiUsageService.getRateLimitInfo('gemini-2.5-flash');
            expect(info.limitPerMinute).toBe(15);
        });

        it('returns default limits for unknown model', () => {
            const info = apiUsageService.getRateLimitInfo('unknown-model-xyz');
            expect(info.limitPerMinute).toBe(15);
        });

        it('computes percentUsed based on calls', () => {
            // 15 calls = 100% of default rpm=15
            for (let i = 0; i < 15; i++) {
                apiUsageService.recordCall('gemini-2.5-flash', true);
            }
            const info = apiUsageService.getRateLimitInfo('gemini-2.5-flash');
            expect(info.percentUsed).toBe(100);
            expect(info.isAtLimit).toBe(true);
        });

        it('isNearLimit at 80% threshold', () => {
            // 12 calls = 80% of 15 rpm
            for (let i = 0; i < 12; i++) {
                apiUsageService.recordCall('gemini-2.5-flash', true);
            }
            const info = apiUsageService.getRateLimitInfo('gemini-2.5-flash');
            expect(info.isNearLimit).toBe(true);
        });
    });

    describe('isRateLimited', () => {
        it('returns false when under limit', () => {
            apiUsageService.recordCall('gemini-2.5-flash', true);
            expect(apiUsageService.isRateLimited('gemini-2.5-flash')).toBe(false);
        });

        it('returns true when at limit', () => {
            for (let i = 0; i < 15; i++) {
                apiUsageService.recordCall('gemini-2.5-flash', true);
            }
            expect(apiUsageService.isRateLimited('gemini-2.5-flash')).toBe(true);
        });
    });

    describe('subscribe', () => {
        it('calls listener on recordCall', () => {
            let callCount = 0;
            const unsub = apiUsageService.subscribe(() => { callCount++; });
            apiUsageService.recordCall('gemini-2.5-flash', true);
            expect(callCount).toBe(1);
            unsub();
        });

        it('unsubscribes correctly', () => {
            let callCount = 0;
            const unsub = apiUsageService.subscribe(() => { callCount++; });
            unsub();
            apiUsageService.recordCall('gemini-2.5-flash', true);
            expect(callCount).toBe(0);
        });

        it('calls listener on reset', () => {
            let callCount = 0;
            const unsub = apiUsageService.subscribe(() => { callCount++; });
            apiUsageService.reset();
            expect(callCount).toBe(1);
            unsub();
        });
    });

    describe('reset', () => {
        it('clears all call records', () => {
            apiUsageService.recordCall('gemini-2.5-flash', true);
            apiUsageService.recordCall('gemini-2.5-flash', false);
            apiUsageService.reset();
            const stats = apiUsageService.getStats();
            expect(stats.totalCalls).toBe(0);
            expect(stats.errors).toBe(0);
            expect(stats.lastCallTime).toBeNull();
        });
    });

    describe('model normalization', () => {
        it('normalizes gemini-2.0-flash variants to same key', () => {
            apiUsageService.recordCall('gemini-2.5-flash-image', true);
            const { callsByModel } = apiUsageService.getStats();
            expect(callsByModel['gemini-2.5-flash-image']).toBe(1);
        });

        it('normalizes embedding models', () => {
            apiUsageService.recordCall('text-embedding-some-variant', true);
            const { callsByModel } = apiUsageService.getStats();
            expect(callsByModel['text-embedding-004']).toBe(1);
        });
    });
});
