/**
 * PriceAPI Service
 *
 * Multi-retailer pricing via PriceAPI (Google Shopping, Amazon, etc.)
 * Provides real vendor quotes with actual retailer names.
 *
 * API Docs: https://www.priceapi.com/docs
 * Free Tier: 1000 credits (no expiry)
 */

import { apiKeyService } from './apiKeyService';
import type { LiveGpuPrice, StockStatus } from '../types';

const PRICEAPI_BASE_URL = 'https://api.priceapi.com/v2';
const JOB_POLL_INTERVAL = 2000; // 2 seconds
const JOB_MAX_WAIT = 60000; // 60 seconds max wait

interface PriceApiJob {
    job_id: string;
    status: 'new' | 'in_progress' | 'finished' | 'failed';
    credits_used: number;
}

interface PriceApiOffer {
    merchant: string;
    price: number;
    currency: string;
    availability: string;
    condition: string;
    url: string;
    shipping?: string;
}

interface PriceApiResult {
    job_id: string;
    status: string;
    results: Array<{
        content: {
            search_results?: Array<{
                name: string;
                price: number;
                merchant: string;
                url: string;
                availability?: string;
                offers?: PriceApiOffer[];
            }>;
        };
    }>;
}

// Track credits usage
let creditsUsed = 0;
const CREDITS_LIMIT = 1000;

// Cache for job results (1 hour TTL)
const CACHE_TTL = 60 * 60 * 1000;
const jobResultCache: Map<string, { data: PriceApiResult; timestamp: number }> = new Map();

/**
 * Check if we have API key configured
 */
export function hasApiKey(): boolean {
    return !!apiKeyService.getKey('priceapi');
}

/**
 * Check if we have credits remaining
 */
export function hasCredits(): boolean {
    return creditsUsed < CREDITS_LIMIT;
}

/**
 * Get current credits status
 */
export function getCreditsStatus(): { used: number; remaining: number; limit: number } {
    return {
        used: creditsUsed,
        remaining: CREDITS_LIMIT - creditsUsed,
        limit: CREDITS_LIMIT
    };
}

/**
 * Get the API key
 */
function getApiKey(): string | null {
    return apiKeyService.getKey('priceapi') || null;
}

/**
 * Create a price search job
 */
async function createPriceJob(
    searchTerm: string,
    country: string = 'us'
): Promise<PriceApiJob> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('PriceAPI key not configured');
    }

    const response = await fetch(`${PRICEAPI_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            source: 'google_shopping',
            country,
            topic: 'search_results',
            key: 'term',
            values: searchTerm,
            max_pages: 1
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`PriceAPI job creation failed: ${response.status} - ${error}`);
    }

    const job: PriceApiJob = await response.json();
    if (import.meta.env.DEV) console.log(`[PriceAPI] Created job ${job.job_id} for "${searchTerm}"`);
    return job;
}

/**
 * Poll job status until complete
 */
async function waitForJob(jobId: string): Promise<PriceApiResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('PriceAPI key not configured');
    }

    const startTime = Date.now();

    while (Date.now() - startTime < JOB_MAX_WAIT) {
        const response = await fetch(`${PRICEAPI_BASE_URL}/jobs/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`PriceAPI job poll failed: ${response.status}`);
        }

        const result: PriceApiResult = await response.json();

        if (result.status === 'finished') {
            if (import.meta.env.DEV) console.log(`[PriceAPI] Job ${jobId} completed`);
            return result;
        }

        if (result.status === 'failed') {
            throw new Error(`PriceAPI job ${jobId} failed`);
        }

        await new Promise(resolve => setTimeout(resolve, JOB_POLL_INTERVAL));
    }

    throw new Error(`PriceAPI job ${jobId} timed out`);
}

/**
 * Search for product prices
 */
export async function searchPrices(
    productName: string,
    country: string = 'us'
): Promise<PriceApiResult | null> {
    // Check cache first
    const cacheKey = `${productName}-${country}`;
    const cached = jobResultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        if (import.meta.env.DEV) console.log(`[PriceAPI] Cache hit for "${productName}"`);
        return cached.data;
    }

    if (!hasApiKey()) {
        if (import.meta.env.DEV) console.log('[PriceAPI] No API key configured');
        return null;
    }

    if (!hasCredits()) {
        if (import.meta.env.DEV) console.log('[PriceAPI] No credits remaining');
        return null;
    }

    try {
        const job = await createPriceJob(productName, country);
        creditsUsed += job.credits_used || 1;

        const result = await waitForJob(job.job_id);

        // Cache result
        jobResultCache.set(cacheKey, { data: result, timestamp: Date.now() });

        return result;
    } catch (error) {
        console.error(`[PriceAPI] Error searching for "${productName}":`, error);
        return null;
    }
}

/**
 * Get GPU price from PriceAPI
 */
export async function getGpuPrice(
    modelName: string,
    msrp: number
): Promise<LiveGpuPrice | null> {
    const result = await searchPrices(`${modelName} GPU graphics card`);

    if (!result || !result.results?.[0]?.content?.search_results?.length) {
        return null;
    }

    const searchResults = result.results[0].content.search_results;

    // Find the best match and calculate average price
    const prices = searchResults
        .filter(r => r.price && r.price > 0)
        .map(r => r.price);

    if (prices.length === 0) {
        return null;
    }

    // Use median price for stability
    prices.sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];

    // Calculate trend
    const trend = msrp > 0 ? ((medianPrice - msrp) / msrp) * 100 : 0;

    // Determine stock status
    const inStockCount = searchResults.filter(
        r => r.availability?.toLowerCase().includes('in stock')
    ).length;
    const stock: StockStatus = inStockCount > searchResults.length / 2
        ? 'IN_STOCK'
        : inStockCount > 0
            ? 'LIMITED'
            : 'OUT_OF_STOCK';

    // Get primary source
    const primaryMerchant = searchResults[0]?.merchant || 'Multiple retailers';

    return {
        price: Math.round(medianPrice),
        trend: Math.round(trend * 10) / 10,
        stock,
        source: `PriceAPI (${primaryMerchant})`,
        lastUpdated: Date.now()
    };
}

/**
 * Get vendor offers for a GPU model
 */
export async function getOffers(modelName: string): Promise<Array<{
    vendor: string;
    price: number;
    inStock: boolean;
    url: string;
    condition: string;
    source: string;
}>> {
    const result = await searchPrices(`${modelName} GPU graphics card`);

    if (!result || !result.results?.[0]?.content?.search_results?.length) {
        return [];
    }

    const searchResults = result.results[0].content.search_results;

    return searchResults
        .filter(r => r.price && r.price > 0 && r.merchant)
        .map(r => ({
            vendor: r.merchant,
            price: r.price,
            inStock: r.availability?.toLowerCase().includes('in stock') ?? true,
            url: r.url || '',
            condition: 'New',
            source: 'priceapi'
        }))
        .slice(0, 10); // Limit to top 10 offers
}

/**
 * Clear cache
 */
export function clearCache(): void {
    jobResultCache.clear();
    if (import.meta.env.DEV) console.log('[PriceAPI] Cache cleared');
}

/**
 * Reset credits counter (for testing)
 */
export function resetCredits(): void {
    creditsUsed = 0;
    if (import.meta.env.DEV) console.log('[PriceAPI] Credits reset');
}
