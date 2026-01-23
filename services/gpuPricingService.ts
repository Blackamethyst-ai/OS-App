/**
 * GPU Pricing Service
 *
 * Fetches live market prices for GPUs using Gemini + Google Search.
 * Implements caching to avoid rate limits (1 hour cache duration).
 */

import { getAI, retryGeminiRequest, safeParseJson } from './geminiService';
import type { GenerateContentResponse } from '@google/genai';
import type { LiveGpuPrice, StockStatus } from '../types';

interface PriceCache {
    [gpuModel: string]: {
        data: LiveGpuPrice;
        timestamp: number;
    };
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const STORAGE_KEY = 'gpu_price_cache';

/**
 * Initialize cache from localStorage
 */
function initCache(): PriceCache {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as PriceCache;
            // Filter out expired entries
            const now = Date.now();
            const valid: PriceCache = {};
            for (const [key, value] of Object.entries(parsed)) {
                if (now - value.timestamp < CACHE_TTL) {
                    valid[key] = value;
                }
            }
            return valid;
        }
    } catch (e) {
        console.warn('[GPU Pricing] Failed to load cache from localStorage:', e);
    }
    return {};
}

/**
 * Persist cache to localStorage
 */
function persistCache(cache: PriceCache): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('[GPU Pricing] Failed to persist cache:', e);
    }
}

// Initialize from localStorage, fallback to empty
const priceCache: PriceCache = initCache();

/**
 * Check if cached price is still valid
 */
function isCacheValid(gpuModel: string): boolean {
    const cached = priceCache[gpuModel];
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
}

/**
 * Get cached price if valid
 */
function getCachedPrice(gpuModel: string): LiveGpuPrice | null {
    if (isCacheValid(gpuModel)) {
        return priceCache[gpuModel].data;
    }
    return null;
}

/**
 * Store price in cache and persist to localStorage
 */
function setCachePrice(gpuModel: string, price: LiveGpuPrice): void {
    priceCache[gpuModel] = {
        data: price,
        timestamp: Date.now()
    };
    persistCache(priceCache);
}

/**
 * Parse stock status from string
 */
function parseStockStatus(status: string): StockStatus {
    const normalized = status.toLowerCase();
    if (normalized.includes('out') || normalized.includes('sold')) return 'OUT_OF_STOCK';
    if (normalized.includes('limited') || normalized.includes('low')) return 'LIMITED';
    if (normalized.includes('pre') || normalized.includes('upcoming')) return 'PRE_ORDER';
    return 'IN_STOCK';
}

/**
 * Fetch live market price for a GPU model
 *
 * Uses Gemini with Google Search to find current market prices.
 * Results are cached for 1 hour.
 *
 * @param gpuModel - The GPU model name (e.g., "NVIDIA RTX 5090")
 * @param msrp - The MSRP as fallback if live price unavailable
 * @returns LiveGpuPrice object with current market data
 */
export async function fetchLivePrice(gpuModel: string, msrp: number): Promise<LiveGpuPrice> {
    // Check cache first
    const cached = getCachedPrice(gpuModel);
    if (cached) {
        console.log(`[GPU Pricing] Cache hit for ${gpuModel}`);
        return cached;
    }

    console.log(`[GPU Pricing] Fetching live price for ${gpuModel}`);

    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() =>
            ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `Find the current market price for "${gpuModel}" GPU in January 2026.

Search for:
1. Current retail/market price in USD
2. Stock availability status
3. Price trend (is it above or below MSRP of $${msrp}?)

Output ONLY valid JSON in this exact format:
{
    "price": <number - current price in USD, use ${msrp} if unavailable>,
    "trend": <number - percentage difference from MSRP, positive means above MSRP>,
    "stock": "<IN_STOCK|LIMITED|OUT_OF_STOCK|PRE_ORDER>",
    "source": "<primary source for price data>"
}`,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: 'application/json'
                }
            })
        );

        const result = safeParseJson<{
            price: number;
            trend: number;
            stock: string;
            source: string;
        }>(response.text);

        const livePrice: LiveGpuPrice = {
            price: result.price || msrp,
            trend: result.trend || 0,
            stock: parseStockStatus(result.stock || 'IN_STOCK'),
            source: result.source || 'Estimated',
            lastUpdated: Date.now()
        };

        // Cache the result
        setCachePrice(gpuModel, livePrice);

        return livePrice;
    } catch (error) {
        console.error(`[GPU Pricing] Error fetching price for ${gpuModel}:`, error);

        // Return fallback with MSRP
        const fallback: LiveGpuPrice = {
            price: msrp,
            trend: 0,
            stock: 'IN_STOCK',
            source: 'MSRP (fallback)',
            lastUpdated: Date.now()
        };

        return fallback;
    }
}

/**
 * Batch fetch prices for multiple GPUs
 *
 * Fetches prices in parallel with rate limiting.
 *
 * @param gpus - Array of {model, msrp} objects
 * @returns Map of model -> LiveGpuPrice
 */
export async function fetchBatchPrices(
    gpus: Array<{ model: string; msrp: number }>
): Promise<Map<string, LiveGpuPrice>> {
    const results = new Map<string, LiveGpuPrice>();

    // Process in batches of 3 to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < gpus.length; i += batchSize) {
        const batch = gpus.slice(i, i + batchSize);
        const promises = batch.map(gpu => fetchLivePrice(gpu.model, gpu.msrp));
        const prices = await Promise.all(promises);

        batch.forEach((gpu, idx) => {
            results.set(gpu.model, prices[idx]);
        });

        // Small delay between batches to avoid rate limits
        if (i + batchSize < gpus.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
}

/**
 * Clear the price cache (useful for forcing refresh)
 */
export function clearPriceCache(): void {
    Object.keys(priceCache).forEach(key => delete priceCache[key]);
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // Ignore
    }
    console.log('[GPU Pricing] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; oldestEntry: number | null } {
    const keys = Object.keys(priceCache);
    if (keys.length === 0) {
        return { entries: 0, oldestEntry: null };
    }

    const timestamps = keys.map(k => priceCache[k].timestamp);
    const oldest = Math.min(...timestamps);

    return {
        entries: keys.length,
        oldestEntry: Date.now() - oldest
    };
}
