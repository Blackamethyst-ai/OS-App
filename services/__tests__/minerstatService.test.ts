// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

import {
  fetchAllGpuData,
  getGpuPrice,
  getGpuSpecs,
  getLiveGpuPrice,
  getListings,
  clearCache,
  getCacheStatus,
} from '../minerstatService';

const sampleGpuData = [
  {
    id: 'nvidia-rtx-4090',
    name: 'NVIDIA GeForce RTX 4090',
    price: 1599,
    brand: 'NVIDIA',
    algorithms: [
      { name: 'Ethash', hashrate: 130000000, power: 350 },
    ],
  },
  {
    id: 'nvidia-rtx-4080',
    name: 'NVIDIA GeForce RTX 4080',
    price: 1199,
    brand: 'NVIDIA',
    algorithms: [
      { name: 'Ethash', hashrate: 95000000, power: 320 },
    ],
  },
  {
    id: 'amd-rx-7900-xt',
    name: 'AMD Radeon RX 7900 XT',
    price: 899,
    brand: 'AMD',
    algorithms: [
      { name: 'Ethash', hashrate: 85000000, power: 300 },
    ],
  },
  {
    id: 'nvidia-rtx-3060-ti',
    name: 'NVIDIA GeForce RTX 3060 Ti',
    price: 399,
    brand: 'NVIDIA',
    algorithms: [],
  },
];

describe('minerstatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    clearCache();
  });

  describe('clearCache', () => {
    it('should clear cache without error', () => {
      expect(() => clearCache()).not.toThrow();
    });
  });

  describe('getCacheStatus', () => {
    it('should return empty cache status initially', () => {
      const status = getCacheStatus();
      expect(status.cached).toBe(false);
      expect(status.gpuCount).toBe(0);
      expect(status.ageMs).toBe(0);
    });
  });

  describe('fetchAllGpuData', () => {
    it('should fetch GPU data from API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      });
      vi.stubGlobal('fetch', fetchMock);

      const data = await fetchAllGpuData();
      expect(data).toEqual(sampleGpuData);
      expect(data.length).toBe(4);
    });

    it('should return cached data on second call', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      });
      vi.stubGlobal('fetch', fetchMock);

      await fetchAllGpuData();
      const data2 = await fetchAllGpuData();
      expect(data2).toEqual(sampleGpuData);
      // Only 1 fetch call since second is cached
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should throw on API error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchAllGpuData()).rejects.toThrow('Minerstat API error');
    });

    it('should update cache status after fetch', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      });
      vi.stubGlobal('fetch', fetchMock);

      await fetchAllGpuData();
      const status = getCacheStatus();
      expect(status.cached).toBe(true);
      expect(status.gpuCount).toBe(4);
      expect(status.ageMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getGpuPrice', () => {
    beforeEach(() => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      });
      vi.stubGlobal('fetch', fetchMock);
    });

    it('should find GPU by exact model name match', async () => {
      const result = await getGpuPrice('NVIDIA GeForce RTX 4090');
      expect(result).not.toBeNull();
      expect(result!.price).toBe(1599);
      expect(result!.name).toBe('NVIDIA GeForce RTX 4090');
      expect(result!.brand).toBe('NVIDIA');
    });

    it('should find GPU by partial name match', async () => {
      const result = await getGpuPrice('RTX 4080');
      expect(result).not.toBeNull();
      expect(result!.price).toBe(1199);
    });

    it('should return null for unknown GPU', async () => {
      const result = await getGpuPrice('Fictional GPU XYZ');
      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      clearCache();

      const result = await getGpuPrice('RTX 4090');
      expect(result).toBeNull();
    });
  });

  describe('getGpuSpecs', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      }));
    });

    it('should return full GPU specs with algorithms', async () => {
      const specs = await getGpuSpecs('RTX 4090');
      expect(specs).not.toBeNull();
      expect(specs!.algorithms.length).toBeGreaterThan(0);
      expect(specs!.algorithms[0].name).toBe('Ethash');
    });

    it('should return null for unknown model', async () => {
      const specs = await getGpuSpecs('Nonexistent Card');
      expect(specs).toBeNull();
    });
  });

  describe('getLiveGpuPrice', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      }));
    });

    it('should return LiveGpuPrice format with trend calculation', async () => {
      const result = await getLiveGpuPrice('RTX 4090', 1500);
      expect(result).not.toBeNull();
      expect(result!.price).toBe(1599);
      expect(result!.stock).toBe('IN_STOCK');
      expect(result!.source).toBe('minerstat');
      expect(result!.lastUpdated).toBeGreaterThan(0);
      // Trend: ((1599 - 1500) / 1500) * 100 = 6.6
      expect(result!.trend).toBe(6.6);
    });

    it('should return 0 trend when msrp is 0', async () => {
      const result = await getLiveGpuPrice('RTX 4090', 0);
      expect(result).not.toBeNull();
      expect(result!.trend).toBe(0);
    });

    it('should return null for unknown model', async () => {
      const result = await getLiveGpuPrice('Unknown GPU', 500);
      expect(result).toBeNull();
    });
  });

  describe('getListings', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleGpuData),
      }));
    });

    it('should return a single market average listing', async () => {
      const listings = await getListings('RTX 4090');
      expect(listings.length).toBe(1);
      expect(listings[0].vendor).toBe('Market Average (Minerstat)');
      expect(listings[0].price).toBe(1599);
      expect(listings[0].inStock).toBe(true);
      expect(listings[0].source).toBe('minerstat');
    });

    it('should return empty array for unknown model', async () => {
      const listings = await getListings('Unknown GPU');
      expect(listings).toEqual([]);
    });
  });
});
