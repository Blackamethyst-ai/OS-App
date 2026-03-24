// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockApiKeyService = vi.hoisted(() => ({
  getKey: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../apiKeyService', () => ({
  apiKeyService: mockApiKeyService,
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

import {
  hasApiKey,
  hasCredits,
  getCreditsStatus,
  searchPrices,
  getGpuPrice,
  getOffers,
  clearCache,
  resetCredits,
} from '../priceApiService';

describe('priceApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    resetCredits();
    // Reset global fetch mock
    vi.restoreAllMocks();
  });

  describe('hasApiKey', () => {
    it('should return true when API key is configured', () => {
      mockApiKeyService.getKey.mockReturnValue('test-api-key');
      expect(hasApiKey()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      mockApiKeyService.getKey.mockReturnValue(undefined);
      expect(hasApiKey()).toBe(false);
    });
  });

  describe('hasCredits', () => {
    it('should return true when credits are available', () => {
      expect(hasCredits()).toBe(true);
    });
  });

  describe('getCreditsStatus', () => {
    it('should return correct initial status', () => {
      const status = getCreditsStatus();
      expect(status.used).toBe(0);
      expect(status.remaining).toBe(1000);
      expect(status.limit).toBe(1000);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache without error', () => {
      expect(() => clearCache()).not.toThrow();
    });
  });

  describe('resetCredits', () => {
    it('should reset credits to 0 used', () => {
      resetCredits();
      const status = getCreditsStatus();
      expect(status.used).toBe(0);
      expect(status.remaining).toBe(1000);
    });
  });

  describe('searchPrices', () => {
    it('should return null when no API key is configured', async () => {
      mockApiKeyService.getKey.mockReturnValue(undefined);
      const result = await searchPrices('RTX 4090');
      expect(result).toBeNull();
    });

    it('should return cached result on second call', async () => {
      mockApiKeyService.getKey.mockReturnValue('test-key');

      const mockResult = {
        job_id: 'job-1',
        status: 'finished',
        results: [{ content: { search_results: [] } }],
      };

      const fetchMock = vi.fn()
        // createPriceJob call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: 'job-1', status: 'new', credits_used: 1 }),
        })
        // waitForJob call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResult),
        });

      vi.stubGlobal('fetch', fetchMock);

      // First call makes API request
      const result1 = await searchPrices('RTX 4090');
      expect(result1).toEqual(mockResult);

      // Second call should use cache (no new fetch calls)
      const result2 = await searchPrices('RTX 4090');
      expect(result2).toEqual(mockResult);
      expect(fetchMock).toHaveBeenCalledTimes(2); // Only the original 2 calls
    });

    it('should return null when API call fails', async () => {
      mockApiKeyService.getKey.mockReturnValue('test-key');

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      });

      vi.stubGlobal('fetch', fetchMock);

      const result = await searchPrices('RTX 4090');
      expect(result).toBeNull();
    });
  });

  describe('getGpuPrice', () => {
    it('should return null when no search results', async () => {
      mockApiKeyService.getKey.mockReturnValue('test-key');

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: 'job-1', status: 'new', credits_used: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            job_id: 'job-1',
            status: 'finished',
            results: [{ content: { search_results: [] } }],
          }),
        });

      vi.stubGlobal('fetch', fetchMock);

      const result = await getGpuPrice('RTX 4090', 1599);
      expect(result).toBeNull();
    });

    it('should return price data with correct structure', async () => {
      mockApiKeyService.getKey.mockReturnValue('test-key');

      const searchResults = [
        { name: 'RTX 4090', price: 1800, merchant: 'Amazon', url: 'https://amazon.com', availability: 'In Stock' },
        { name: 'RTX 4090', price: 1750, merchant: 'Newegg', url: 'https://newegg.com', availability: 'In Stock' },
        { name: 'RTX 4090', price: 1900, merchant: 'BestBuy', url: 'https://bestbuy.com', availability: 'Out of Stock' },
      ];

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: 'job-1', status: 'new', credits_used: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            job_id: 'job-1',
            status: 'finished',
            results: [{ content: { search_results: searchResults } }],
          }),
        });

      vi.stubGlobal('fetch', fetchMock);
      clearCache();

      const result = await getGpuPrice('RTX 4090', 1599);
      expect(result).not.toBeNull();
      expect(result!.price).toBe(1800); // median of sorted [1750, 1800, 1900]
      expect(result!.source).toContain('PriceAPI');
      expect(result!.stock).toBe('IN_STOCK'); // 2/3 in stock
      expect(result!.lastUpdated).toBeGreaterThan(0);
      expect(result!.trend).toBeGreaterThan(0); // price > msrp
    });
  });

  describe('getOffers', () => {
    it('should return empty array when no results', async () => {
      mockApiKeyService.getKey.mockReturnValue(undefined);
      const offers = await getOffers('RTX 4090');
      expect(offers).toEqual([]);
    });

    it('should return formatted offers from search results', async () => {
      mockApiKeyService.getKey.mockReturnValue('test-key');

      const searchResults = [
        { name: 'RTX 4090', price: 1800, merchant: 'Amazon', url: 'https://amazon.com', availability: 'In Stock' },
        { name: 'RTX 4090', price: 0, merchant: 'BadVendor', url: '', availability: '' },
        { name: 'RTX 4090', price: 1750, merchant: 'Newegg', url: 'https://newegg.com', availability: 'Out of Stock' },
      ];

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: 'job-2', status: 'new', credits_used: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            job_id: 'job-2',
            status: 'finished',
            results: [{ content: { search_results: searchResults } }],
          }),
        });

      vi.stubGlobal('fetch', fetchMock);
      clearCache();

      const offers = await getOffers('RTX 4090');
      // Should filter out the zero-price entry
      expect(offers.length).toBe(2);
      expect(offers[0].vendor).toBe('Amazon');
      expect(offers[0].inStock).toBe(true);
      expect(offers[1].vendor).toBe('Newegg');
      expect(offers[1].inStock).toBe(false);
      expect(offers[0].source).toBe('priceapi');
    });
  });
});
