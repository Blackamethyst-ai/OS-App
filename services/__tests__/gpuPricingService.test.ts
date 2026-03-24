// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks for use inside vi.mock factories
const mockGetLiveGpuPrice = vi.hoisted(() => vi.fn());
const mockClearMinerstatCache = vi.hoisted(() => vi.fn());
const mockGetMinerstatCacheStatus = vi.hoisted(() => vi.fn());
const mockHasApiKey = vi.hoisted(() => vi.fn());
const mockHasCredits = vi.hoisted(() => vi.fn());
const mockGetGpuPrice = vi.hoisted(() => vi.fn());
const mockClearPriceApiCache = vi.hoisted(() => vi.fn());
const mockGetCreditsStatus = vi.hoisted(() => vi.fn());
const mockResetCredits = vi.hoisted(() => vi.fn());
const mockGetAI = vi.hoisted(() => vi.fn());
const mockRetryGeminiRequest = vi.hoisted(() => vi.fn());
const mockSafeParseJson = vi.hoisted(() => vi.fn());

vi.mock('../minerstatService', () => ({
    getLiveGpuPrice: mockGetLiveGpuPrice,
    clearCache: mockClearMinerstatCache,
    getCacheStatus: mockGetMinerstatCacheStatus,
}));

vi.mock('../priceApiService', () => ({
    hasApiKey: mockHasApiKey,
    hasCredits: mockHasCredits,
    getGpuPrice: mockGetGpuPrice,
    clearCache: mockClearPriceApiCache,
    getCreditsStatus: mockGetCreditsStatus,
    resetCredits: mockResetCredits,
}));

vi.mock('../geminiService', () => ({
    getAI: mockGetAI,
    retryGeminiRequest: mockRetryGeminiRequest,
    safeParseJson: mockSafeParseJson,
}));

vi.mock('../logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }
}));

import {
    fetchLivePrice,
    fetchBatchPrices,
    clearPriceCache,
    getCacheStats,
    getDataSourceStatus,
    fetchPriceFromSource,
} from '../gpuPricingService';

import type { LiveGpuPrice } from '../../types';

describe('GPU Pricing Service', () => {
    const mockPrice: LiveGpuPrice = {
        price: 1999,
        trend: 5,
        stock: 'IN_STOCK',
        source: 'minerstat',
        lastUpdated: Date.now(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear cache between tests
        clearPriceCache();
        // Default: no API key / no credits for priceAPI
        mockHasApiKey.mockReturnValue(false);
        mockHasCredits.mockReturnValue(false);
        mockGetMinerstatCacheStatus.mockReturnValue({ cached: false, gpuCount: 0, ageMs: 0 });
        mockGetCreditsStatus.mockReturnValue({ used: 0, remaining: 1000 });
    });

    describe('fetchLivePrice', () => {
        it('should return minerstat price when available', async () => {
            mockGetLiveGpuPrice.mockResolvedValue(mockPrice);

            const result = await fetchLivePrice('RTX 5090', 1999);
            expect(result).toEqual(mockPrice);
            expect(mockGetLiveGpuPrice).toHaveBeenCalledWith('RTX 5090', 1999);
        });

        it('should cache results and return cached on second call', async () => {
            mockGetLiveGpuPrice.mockResolvedValue(mockPrice);

            const first = await fetchLivePrice('RTX 5090', 1999);
            const second = await fetchLivePrice('RTX 5090', 1999);

            expect(first).toEqual(mockPrice);
            expect(second).toEqual(mockPrice);
            // minerstat should only be called once; second call uses cache
            expect(mockGetLiveGpuPrice).toHaveBeenCalledTimes(1);
        });

        it('should try PriceAPI when minerstat returns null and API key exists', async () => {
            mockGetLiveGpuPrice.mockResolvedValue(null);
            mockHasApiKey.mockReturnValue(true);
            mockHasCredits.mockReturnValue(true);
            const priceApiResult: LiveGpuPrice = { ...mockPrice, source: 'PriceAPI' };
            mockGetGpuPrice.mockResolvedValue(priceApiResult);

            const result = await fetchLivePrice('RTX 5090', 1999);
            expect(result.source).toBe('PriceAPI');
            expect(mockGetGpuPrice).toHaveBeenCalledWith('RTX 5090', 1999);
        });

        it('should skip PriceAPI when no API key', async () => {
            mockGetLiveGpuPrice.mockResolvedValue(null);
            mockHasApiKey.mockReturnValue(false);

            // Gemini fallback
            const mockAI = { models: { generateContent: vi.fn() } };
            mockGetAI.mockReturnValue(mockAI);
            mockRetryGeminiRequest.mockResolvedValue({ text: '{}' });
            mockSafeParseJson.mockReturnValue({ price: 1999, trend: 0, stock: 'IN_STOCK', source: 'Google' });

            const result = await fetchLivePrice('RTX 5090', 1999);
            expect(mockGetGpuPrice).not.toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.source).toContain('AI Estimate');
        });

        it('should fallback to Gemini when minerstat and PriceAPI fail', async () => {
            mockGetLiveGpuPrice.mockRejectedValue(new Error('minerstat down'));
            mockHasApiKey.mockReturnValue(true);
            mockHasCredits.mockReturnValue(true);
            mockGetGpuPrice.mockRejectedValue(new Error('PriceAPI down'));

            mockRetryGeminiRequest.mockResolvedValue({ text: '{}' });
            mockSafeParseJson.mockReturnValue({ price: 2100, trend: 5, stock: 'LIMITED', source: 'Search' });
            mockGetAI.mockReturnValue({ models: { generateContent: vi.fn() } });

            const result = await fetchLivePrice('RTX 5090', 1999);
            expect(result.source).toContain('AI Estimate');
        });

        it('should return MSRP fallback when all sources fail', async () => {
            mockGetLiveGpuPrice.mockRejectedValue(new Error('fail'));
            mockHasApiKey.mockReturnValue(false);

            // Gemini also fails
            mockGetAI.mockImplementation(() => { throw new Error('no key'); });
            mockRetryGeminiRequest.mockRejectedValue(new Error('gemini down'));

            const result = await fetchLivePrice('RTX 5090', 1999);
            expect(result.price).toBe(1999);
            expect(result.source).toBe('MSRP (fallback)');
        });
    });

    describe('fetchBatchPrices', () => {
        it('should fetch prices for multiple GPUs', async () => {
            mockGetLiveGpuPrice.mockImplementation((model: string) =>
                Promise.resolve({ ...mockPrice, source: `minerstat-${model}` })
            );

            const gpus = [
                { model: 'RTX 5090', msrp: 1999 },
                { model: 'RTX 5080', msrp: 999 },
            ];

            const results = await fetchBatchPrices(gpus);
            expect(results.size).toBe(2);
            expect(results.get('RTX 5090')).toBeDefined();
            expect(results.get('RTX 5080')).toBeDefined();
        });

        it('should return empty map for empty input', async () => {
            const results = await fetchBatchPrices([]);
            expect(results.size).toBe(0);
        });
    });

    describe('clearPriceCache', () => {
        it('should clear all caches including sub-services', () => {
            clearPriceCache();
            expect(mockClearMinerstatCache).toHaveBeenCalled();
            expect(mockClearPriceApiCache).toHaveBeenCalled();
        });

        it('should clear localStorage entry', async () => {
            // First populate cache
            mockGetLiveGpuPrice.mockResolvedValue(mockPrice);
            await fetchLivePrice('RTX 5090', 1999);

            // After clearing, fetching same model should call minerstat again
            clearPriceCache();
            mockGetLiveGpuPrice.mockResolvedValue(mockPrice);
            await fetchLivePrice('RTX 5090', 1999);
            // minerstat called twice = cache was indeed cleared
            expect(mockGetLiveGpuPrice).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCacheStats', () => {
        it('should return zero entries when cache is empty', () => {
            const stats = getCacheStats();
            expect(stats.entries).toBe(0);
            expect(stats.oldestEntry).toBeNull();
        });

        it('should report entries after caching', async () => {
            mockGetLiveGpuPrice.mockResolvedValue(mockPrice);
            await fetchLivePrice('RTX 5090', 1999);

            const stats = getCacheStats();
            expect(stats.entries).toBe(1);
            expect(stats.oldestEntry).not.toBeNull();
        });
    });

    describe('getDataSourceStatus', () => {
        it('should report minerstat as always available', () => {
            const status = getDataSourceStatus();
            expect(status.minerstat.available).toBe(true);
        });

        it('should reflect PriceAPI availability based on API key', () => {
            mockHasApiKey.mockReturnValue(false);
            mockHasCredits.mockReturnValue(false);
            const status = getDataSourceStatus();
            expect(status.priceApi.available).toBe(false);
            expect(status.priceApi.hasCredits).toBe(false);
        });

        it('should report gemini as always available', () => {
            const status = getDataSourceStatus();
            expect(status.gemini.available).toBe(true);
        });
    });

    describe('fetchPriceFromSource', () => {
        it('should fetch from minerstat when source is minerstat', async () => {
            mockGetLiveGpuPrice.mockResolvedValue(mockPrice);
            const result = await fetchPriceFromSource('RTX 5090', 1999, 'minerstat');
            expect(result).toEqual(mockPrice);
        });

        it('should return null for priceapi when no API key', async () => {
            mockHasApiKey.mockReturnValue(false);
            const result = await fetchPriceFromSource('RTX 5090', 1999, 'priceapi');
            expect(result).toBeNull();
        });

        it('should fetch from priceapi when key and credits available', async () => {
            mockHasApiKey.mockReturnValue(true);
            mockHasCredits.mockReturnValue(true);
            const priceResult: LiveGpuPrice = { ...mockPrice, source: 'PriceAPI' };
            mockGetGpuPrice.mockResolvedValue(priceResult);

            const result = await fetchPriceFromSource('RTX 5090', 1999, 'priceapi');
            expect(result!.source).toBe('PriceAPI');
        });

        it('should fetch from gemini when source is gemini', async () => {
            mockGetAI.mockReturnValue({ models: { generateContent: vi.fn() } });
            mockRetryGeminiRequest.mockResolvedValue({ text: '{}' });
            mockSafeParseJson.mockReturnValue({ price: 2000, trend: 0, stock: 'IN_STOCK', source: 'Google' });

            const result = await fetchPriceFromSource('RTX 5090', 1999, 'gemini');
            expect(result).toBeDefined();
            expect(result!.source).toContain('AI Estimate');
        });
    });
});
