/**
 * Minerstat API Service
 *
 * Fetches real GPU hardware data from minerstat's free public API.
 * Primary source for GPU pricing in the fallback chain.
 *
 * API Docs: https://api.minerstat.com/v2
 * Rate Limit: ~12 req/min (public, no auth required)
 */

import type { LiveGpuPrice, StockStatus } from '../types';

const MINERSTAT_API_URL = 'https://api.minerstat.com/v2/hardware';
const RATE_LIMIT_DELAY = 5000; // 5 seconds between requests

interface MinerstatAlgorithm {
    name: string;
    hashrate: number;
    power: number;
}

interface MinerstatGpu {
    id: string;
    name: string;
    price: number;
    brand: string;
    algorithms: MinerstatAlgorithm[];
}

interface MinerstatResponse extends Array<MinerstatGpu> {}

// Track last request time for rate limiting
let lastRequestTime = 0;

// In-memory cache for minerstat data (10 minute TTL)
const CACHE_TTL = 10 * 60 * 1000;
let gpuDataCache: MinerstatGpu[] | null = null;
let cacheTimestamp = 0;

/**
 * Wait for rate limit if needed
 */
async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
}

/**
 * Fetch all GPU data from minerstat
 * Results are cached for 10 minutes
 */
export async function fetchAllGpuData(): Promise<MinerstatGpu[]> {
    // Return cache if valid
    if (gpuDataCache && Date.now() - cacheTimestamp < CACHE_TTL) {
        if (import.meta.env.DEV) console.log('[Minerstat] Returning cached GPU data');
        return gpuDataCache;
    }

    await enforceRateLimit();

    try {
        if (import.meta.env.DEV) console.log('[Minerstat] Fetching GPU data from API');
        const response = await fetch(`${MINERSTAT_API_URL}?type=gpu`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Minerstat API error: ${response.status} ${response.statusText}`);
        }

        const data: MinerstatResponse = await response.json();
        gpuDataCache = data;
        cacheTimestamp = Date.now();

        if (import.meta.env.DEV) console.log(`[Minerstat] Fetched ${data.length} GPUs`);
        return data;
    } catch (error) {
        console.error('[Minerstat] Failed to fetch GPU data:', error);
        throw error;
    }
}

/**
 * Normalize GPU model names for matching
 */
function normalizeModelName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/nvidia|geforce|radeon|amd|intel|arc/gi, '')
        .replace(/ti\b/gi, ' ti')
        .replace(/super\b/gi, ' super')
        .replace(/xt\b/gi, ' xt')
        .trim();
}

/**
 * Find matching GPU in minerstat data
 */
function findMatchingGpu(gpuList: MinerstatGpu[], modelName: string): MinerstatGpu | null {
    const normalizedSearch = normalizeModelName(modelName);

    // Exact match first
    let match = gpuList.find(gpu => normalizeModelName(gpu.name) === normalizedSearch);
    if (match) return match;

    // Partial match - search term contained in GPU name
    match = gpuList.find(gpu => normalizeModelName(gpu.name).includes(normalizedSearch));
    if (match) return match;

    // Partial match - GPU name contained in search term
    match = gpuList.find(gpu => normalizedSearch.includes(normalizeModelName(gpu.name)));
    if (match) return match;

    // Fuzzy match - check for key model numbers
    const modelNumbers = normalizedSearch.match(/\d{3,4}/g);
    if (modelNumbers) {
        for (const num of modelNumbers) {
            match = gpuList.find(gpu => gpu.name.includes(num));
            if (match) return match;
        }
    }

    return null;
}

/**
 * Get GPU price from minerstat
 *
 * @param modelName - GPU model name to search for
 * @returns Price and availability data, or null if not found
 */
export async function getGpuPrice(modelName: string): Promise<{
    price: number;
    name: string;
    brand: string;
} | null> {
    try {
        const gpuList = await fetchAllGpuData();
        const gpu = findMatchingGpu(gpuList, modelName);

        if (!gpu || !gpu.price || gpu.price <= 0) {
            if (import.meta.env.DEV) console.log(`[Minerstat] No price data for: ${modelName}`);
            return null;
        }

        return {
            price: gpu.price,
            name: gpu.name,
            brand: gpu.brand
        };
    } catch (error) {
        console.error(`[Minerstat] Error getting price for ${modelName}:`, error);
        return null;
    }
}

/**
 * Get GPU specifications from minerstat
 *
 * @param modelName - GPU model name to search for
 * @returns Full GPU data including algorithms
 */
export async function getGpuSpecs(modelName: string): Promise<MinerstatGpu | null> {
    try {
        const gpuList = await fetchAllGpuData();
        return findMatchingGpu(gpuList, modelName);
    } catch (error) {
        console.error(`[Minerstat] Error getting specs for ${modelName}:`, error);
        return null;
    }
}

/**
 * Convert minerstat data to LiveGpuPrice format
 *
 * @param modelName - GPU model name
 * @param msrp - MSRP for trend calculation
 * @returns LiveGpuPrice object or null
 */
export async function getLiveGpuPrice(modelName: string, msrp: number): Promise<LiveGpuPrice | null> {
    const priceData = await getGpuPrice(modelName);

    if (!priceData) {
        return null;
    }

    // Calculate trend as percentage difference from MSRP
    const trend = msrp > 0 ? ((priceData.price - msrp) / msrp) * 100 : 0;

    // Determine stock status based on price availability
    // Minerstat doesn't provide stock data, so we assume in stock if price exists
    const stock: StockStatus = 'IN_STOCK';

    return {
        price: priceData.price,
        trend: Math.round(trend * 10) / 10, // Round to 1 decimal
        stock,
        source: 'minerstat',
        lastUpdated: Date.now()
    };
}

/**
 * Get listings for a GPU model (for vendor quotes)
 *
 * Note: Minerstat doesn't provide vendor-specific data,
 * but we can return the aggregated market price as a reference
 */
export async function getListings(modelName: string): Promise<Array<{
    vendor: string;
    price: number;
    inStock: boolean;
    source: string;
}>> {
    const priceData = await getGpuPrice(modelName);

    if (!priceData) {
        return [];
    }

    // Return as a single "market average" listing
    return [{
        vendor: 'Market Average (Minerstat)',
        price: priceData.price,
        inStock: true,
        source: 'minerstat'
    }];
}

/**
 * Clear the cache (useful for forcing refresh)
 */
export function clearCache(): void {
    gpuDataCache = null;
    cacheTimestamp = 0;
    if (import.meta.env.DEV) console.log('[Minerstat] Cache cleared');
}

/**
 * Get cache status
 */
export function getCacheStatus(): {
    cached: boolean;
    gpuCount: number;
    ageMs: number;
} {
    return {
        cached: gpuDataCache !== null,
        gpuCount: gpuDataCache?.length || 0,
        ageMs: gpuDataCache ? Date.now() - cacheTimestamp : 0
    };
}
