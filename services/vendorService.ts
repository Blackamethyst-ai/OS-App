/**
 * Vendor Service
 *
 * Aggregates vendor quotes from multiple sources:
 * - minerstat (market averages)
 * - PriceAPI (retailer-specific pricing)
 *
 * Normalizes all data to VendorQuote format for procurement workflow.
 */

import * as minerstatService from './minerstatService';
import { logger } from './logger';
import * as priceApiService from './priceApiService';
import type { VendorQuote, StockStatus } from '../types';

// Vendor rating lookup (default ratings for known vendors)
const VENDOR_RATINGS: Record<string, number> = {
    'amazon': 4.7,
    'newegg': 4.5,
    'best buy': 4.6,
    'bestbuy': 4.6,
    'b&h photo': 4.8,
    'b&h': 4.8,
    'micro center': 4.9,
    'microcenter': 4.9,
    'nvidia': 4.9,
    'amd': 4.8,
    'evga': 4.7,
    'msi': 4.5,
    'asus': 4.6,
    'gigabyte': 4.5,
    'zotac': 4.4,
    'pny': 4.3,
    'default': 4.0
};

// Estimated lead times by vendor type
const LEAD_TIMES: Record<string, string> = {
    'amazon': '1-3 days',
    'newegg': '2-5 days',
    'best buy': '1-2 days',
    'bestbuy': '1-2 days',
    'b&h photo': '2-4 days',
    'b&h': '2-4 days',
    'micro center': 'Same day (in-store)',
    'microcenter': 'Same day (in-store)',
    'nvidia': '1-2 weeks',
    'amd': '1-2 weeks',
    'manufacturer': '2-3 weeks',
    'default': '1-2 weeks'
};

// Warranty terms by vendor
const WARRANTIES: Record<string, string> = {
    'nvidia': '3 years',
    'amd': '3 years',
    'evga': '3 years',
    'msi': '3 years',
    'asus': '3 years',
    'gigabyte': '4 years',
    'amazon': '1 year',
    'newegg': '1 year',
    'default': '2 years'
};

/**
 * Get vendor rating from lookup or default
 */
function getVendorRating(vendorName: string): number {
    const normalized = vendorName.toLowerCase();
    for (const [key, rating] of Object.entries(VENDOR_RATINGS)) {
        if (normalized.includes(key)) {
            return rating;
        }
    }
    return VENDOR_RATINGS.default;
}

/**
 * Get estimated lead time for vendor
 */
function getLeadTime(vendorName: string): string {
    const normalized = vendorName.toLowerCase();
    for (const [key, time] of Object.entries(LEAD_TIMES)) {
        if (normalized.includes(key)) {
            return time;
        }
    }
    return LEAD_TIMES.default;
}

/**
 * Get warranty term for vendor
 */
function getWarranty(vendorName: string): string {
    const normalized = vendorName.toLowerCase();
    for (const [key, warranty] of Object.entries(WARRANTIES)) {
        if (normalized.includes(key)) {
            return warranty;
        }
    }
    return WARRANTIES.default;
}

/**
 * Calculate bulk discount
 */
function calculateBulkDiscount(quantity: number): number {
    if (quantity >= 100) return 0.85; // 15% discount
    if (quantity >= 50) return 0.90;  // 10% discount
    if (quantity >= 20) return 0.93;  // 7% discount
    if (quantity >= 10) return 0.95;  // 5% discount
    if (quantity >= 5) return 0.97;   // 3% discount
    return 1.0; // No discount
}

/**
 * Normalize offers to VendorQuote format
 */
function normalizeToVendorQuote(
    offer: {
        vendor: string;
        price: number;
        inStock: boolean;
        source: string;
        url?: string;
        condition?: string;
    },
    quantity: number
): VendorQuote {
    const bulkDiscount = calculateBulkDiscount(quantity);
    const unitPrice = Math.round(offer.price);
    const totalPrice = Math.round(unitPrice * quantity * bulkDiscount);

    return {
        id: `quote-${offer.source}-${offer.vendor.slice(0, 10)}-${Date.now()}`,
        vendor: offer.vendor,
        unitPrice,
        quantity,
        totalPrice,
        leadTime: getLeadTime(offer.vendor),
        warranty: getWarranty(offer.vendor),
        inStock: offer.inStock,
        rating: getVendorRating(offer.vendor)
    };
}

/**
 * Get vendor quotes for a GPU model
 *
 * Fetches from multiple sources and normalizes to VendorQuote[]
 *
 * @param gpuModel - GPU model name
 * @param quantity - Desired quantity
 * @param options - Additional options
 * @returns Array of vendor quotes
 */
export async function getVendorQuotes(
    gpuModel: string,
    quantity: number,
    options: {
        includeMarketAverage?: boolean;
        includePriceApi?: boolean;
        msrp?: number;
    } = {}
): Promise<VendorQuote[]> {
    const {
        includeMarketAverage = true,
        includePriceApi = true,
        msrp = 0
    } = options;

    const quotes: VendorQuote[] = [];

    // Fetch from both sources in parallel
    const [minerstatOffers, priceApiOffers] = await Promise.allSettled([
        includeMarketAverage ? minerstatService.getListings(gpuModel) : Promise.resolve([]),
        includePriceApi && priceApiService.hasApiKey() && priceApiService.hasCredits()
            ? priceApiService.getOffers(gpuModel)
            : Promise.resolve([])
    ]);

    // Process minerstat results
    if (minerstatOffers.status === 'fulfilled' && minerstatOffers.value.length > 0) {
        const normalized = minerstatOffers.value.map(offer =>
            normalizeToVendorQuote(offer, quantity)
        );
        quotes.push(...normalized);
    }

    // Process PriceAPI results
    if (priceApiOffers.status === 'fulfilled' && priceApiOffers.value.length > 0) {
        const normalized = priceApiOffers.value.map(offer =>
            normalizeToVendorQuote(offer, quantity)
        );
        quotes.push(...normalized);
    }

    // If no real quotes found, generate fallback from MSRP
    if (quotes.length === 0 && msrp > 0) {
        logger.info(`No real quotes found for ${gpuModel}, using MSRP fallback`, undefined, 'VendorService');
        quotes.push({
            id: `quote-msrp-${Date.now()}`,
            vendor: 'Estimated Market Price',
            unitPrice: msrp,
            quantity,
            totalPrice: Math.round(msrp * quantity * calculateBulkDiscount(quantity)),
            leadTime: '2-4 weeks',
            warranty: '2 years',
            inStock: false,
            rating: 4.0
        });
    }

    // Sort by total price (lowest first)
    quotes.sort((a, b) => a.totalPrice - b.totalPrice);

    // Deduplicate by vendor name (keep lowest price)
    const seenVendors = new Set<string>();
    const uniqueQuotes = quotes.filter(quote => {
        const vendorKey = quote.vendor.toLowerCase();
        if (seenVendors.has(vendorKey)) {
            return false;
        }
        seenVendors.add(vendorKey);
        return true;
    });

    logger.debug(`Found ${uniqueQuotes.length} quotes for ${gpuModel}`, undefined, 'VendorService');
    return uniqueQuotes;
}

/**
 * Check real-time stock status for a GPU model
 *
 * @param gpuModel - GPU model name
 * @returns Aggregated stock status
 */
export async function checkStockStatus(gpuModel: string): Promise<{
    status: StockStatus;
    availableVendors: number;
    totalVendors: number;
}> {
    const quotes = await getVendorQuotes(gpuModel, 1);

    const inStockCount = quotes.filter(q => q.inStock).length;
    const totalVendors = quotes.length;

    let status: StockStatus;
    if (totalVendors === 0) {
        status = 'OUT_OF_STOCK';
    } else if (inStockCount === 0) {
        status = 'OUT_OF_STOCK';
    } else if (inStockCount < totalVendors / 2) {
        status = 'LIMITED';
    } else {
        status = 'IN_STOCK';
    }

    return {
        status,
        availableVendors: inStockCount,
        totalVendors
    };
}

/**
 * Get best available price for a GPU
 *
 * @param gpuModel - GPU model name
 * @param quantity - Desired quantity
 * @returns Best quote or null
 */
export async function getBestQuote(
    gpuModel: string,
    quantity: number
): Promise<VendorQuote | null> {
    const quotes = await getVendorQuotes(gpuModel, quantity);

    // Filter to in-stock only
    const inStockQuotes = quotes.filter(q => q.inStock);

    if (inStockQuotes.length > 0) {
        return inStockQuotes[0]; // Already sorted by price
    }

    // If nothing in stock, return the cheapest pre-order
    return quotes[0] || null;
}

/**
 * Get data source status
 */
export function getDataSourceStatus(): {
    minerstat: { available: boolean };
    priceApi: { available: boolean; credits: { used: number; remaining: number } };
} {
    return {
        minerstat: {
            available: true // Always available (no auth required)
        },
        priceApi: {
            available: priceApiService.hasApiKey(),
            credits: priceApiService.getCreditsStatus()
        }
    };
}
