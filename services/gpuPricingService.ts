/**
 * GPU Pricing Service
 *
 * Fetches live market prices for GPUs using a multi-source fallback chain:
 * 1. minerstat API (free, no auth) - Primary source
 * 2. PriceAPI (1000 free credits) - Multi-retailer data
 * 3. Gemini + Google Search - AI-powered fallback
 *
 * Implements caching to avoid rate limits (1 hour cache duration).
 */

import { getAI, retryGeminiRequest, safeParseJson } from './geminiService';
import { logger } from './logger';
import * as minerstatService from './minerstatService';
import * as priceApiService from './priceApiService';
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
        logger.warn('Failed to load cache from localStorage', e, 'GPU Pricing');
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
        logger.warn('Failed to persist cache', e, 'GPU Pricing');
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
 * Fetch price from Gemini (existing fallback method)
 */
async function fetchGeminiPrice(gpuModel: string, msrp: number): Promise<LiveGpuPrice> {
    logger.debug(`Using Gemini fallback for ${gpuModel}`, undefined, 'GPUPricing');

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

        return {
            price: result.price || msrp,
            trend: result.trend || 0,
            stock: parseStockStatus(result.stock || 'IN_STOCK'),
            source: result.source ? `AI Estimate (${result.source})` : 'AI Estimate',
            lastUpdated: Date.now()
        };
    } catch (error) {
        logger.error(`Gemini fallback failed for ${gpuModel}`, error, 'GPU Pricing');

        // Return MSRP fallback
        return {
            price: msrp,
            trend: 0,
            stock: 'IN_STOCK',
            source: 'MSRP (fallback)',
            lastUpdated: Date.now()
        };
    }
}

/**
 * Fetch live market price for a GPU model
 *
 * Uses a multi-source fallback chain:
 * 1. Check cache (1hr TTL)
 * 2. Try minerstat API (free, no auth)
 * 3. Try PriceAPI (if credits available)
 * 4. Fallback to Gemini + Google Search
 *
 * @param gpuModel - The GPU model name (e.g., "NVIDIA RTX 5090")
 * @param msrp - The MSRP as fallback if live price unavailable
 * @returns LiveGpuPrice object with current market data
 */
export async function fetchLivePrice(gpuModel: string, msrp: number): Promise<LiveGpuPrice> {
    // 1. Check cache first
    const cached = getCachedPrice(gpuModel);
    if (cached) {
        logger.debug(`Cache hit for ${gpuModel}`, undefined, 'GPUPricing');
        return cached;
    }

    logger.debug(`Fetching live price for ${gpuModel}`, undefined, 'GPUPricing');

    // 2. Try minerstat (free, no auth required)
    try {
        const minerstatPrice = await minerstatService.getLiveGpuPrice(gpuModel, msrp);
        if (minerstatPrice) {
            logger.debug(`Got price from minerstat for ${gpuModel}: $${minerstatPrice.price}`, undefined, 'GPUPricing');
            setCachePrice(gpuModel, minerstatPrice);
            return minerstatPrice;
        }
    } catch (e) {
        logger.warn(`minerstat failed for ${gpuModel}`, e, 'GPU Pricing');
    }

    // 3. Try PriceAPI (if API key configured and credits available)
    if (priceApiService.hasApiKey() && priceApiService.hasCredits()) {
        try {
            const priceApiResult = await priceApiService.getGpuPrice(gpuModel, msrp);
            if (priceApiResult) {
                logger.debug(`Got price from PriceAPI for ${gpuModel}: $${priceApiResult.price}`, undefined, 'GPUPricing');
                setCachePrice(gpuModel, priceApiResult);
                return priceApiResult;
            }
        } catch (e) {
            logger.warn(`PriceAPI failed for ${gpuModel}`, e, 'GPU Pricing');
        }
    }

    // 4. Fallback to Gemini
    const geminiPrice = await fetchGeminiPrice(gpuModel, msrp);
    setCachePrice(gpuModel, geminiPrice);
    return geminiPrice;
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
    // Also clear service-level caches
    minerstatService.clearCache();
    priceApiService.clearCache();
    logger.debug('All caches cleared', undefined, 'GPUPricing');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
    entries: number;
    oldestEntry: number | null;
    minerstat: { cached: boolean; gpuCount: number; ageMs: number };
    priceApi: { credits: { used: number; remaining: number } };
} {
    const keys = Object.keys(priceCache);
    const timestamps = keys.length > 0 ? keys.map(k => priceCache[k].timestamp) : [];
    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : null;

    return {
        entries: keys.length,
        oldestEntry: oldest ? Date.now() - oldest : null,
        minerstat: minerstatService.getCacheStatus(),
        priceApi: { credits: priceApiService.getCreditsStatus() }
    };
}

/**
 * Get data source status
 */
export function getDataSourceStatus(): {
    minerstat: { available: boolean; description: string };
    priceApi: { available: boolean; hasCredits: boolean; description: string };
    gemini: { available: boolean; description: string };
} {
    return {
        minerstat: {
            available: true,
            description: 'Free public API (primary source)'
        },
        priceApi: {
            available: priceApiService.hasApiKey(),
            hasCredits: priceApiService.hasCredits(),
            description: 'Multi-retailer pricing (1000 free credits)'
        },
        gemini: {
            available: true,
            description: 'AI-powered price estimation (fallback)'
        }
    };
}

/**
 * Force refresh price from a specific source
 */
export async function fetchPriceFromSource(
    gpuModel: string,
    msrp: number,
    source: 'minerstat' | 'priceapi' | 'gemini'
): Promise<LiveGpuPrice | null> {
    switch (source) {
        case 'minerstat':
            return minerstatService.getLiveGpuPrice(gpuModel, msrp);
        case 'priceapi':
            if (!priceApiService.hasApiKey() || !priceApiService.hasCredits()) {
                return null;
            }
            return priceApiService.getGpuPrice(gpuModel, msrp);
        case 'gemini':
            return fetchGeminiPrice(gpuModel, msrp);
        default:
            return null;
    }
}
