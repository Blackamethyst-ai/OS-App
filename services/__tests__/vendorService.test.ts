import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies before importing the module under test
vi.mock('../minerstatService', () => ({
    getListings: vi.fn().mockResolvedValue([])
}));
vi.mock('../priceApiService', () => ({
    hasApiKey: vi.fn().mockReturnValue(false),
    hasCredits: vi.fn().mockReturnValue(false),
    getOffers: vi.fn().mockResolvedValue([]),
    getCreditsStatus: vi.fn().mockReturnValue({ used: 0, remaining: 0 })
}));
vi.mock('../logger', () => ({
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { getVendorQuotes, checkStockStatus, getBestQuote, getDataSourceStatus } from '../vendorService';
import * as minerstatService from '../minerstatService';
import * as priceApiService from '../priceApiService';

describe('VendorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(priceApiService.hasApiKey).mockReturnValue(false);
        vi.mocked(priceApiService.hasCredits).mockReturnValue(false);
        vi.mocked(minerstatService.getListings).mockResolvedValue([]);
        vi.mocked(priceApiService.getCreditsStatus).mockReturnValue({ used: 0, remaining: 0 });
    });

    describe('getVendorQuotes', () => {
        it('returns empty array when no sources have data', async () => {
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes).toHaveLength(0);
        });

        it('returns MSRP fallback when no real quotes found and msrp provided', async () => {
            const quotes = await getVendorQuotes('RTX 4090', 1, { msrp: 1599 });
            expect(quotes).toHaveLength(1);
            expect(quotes[0].vendor).toBe('Estimated Market Price');
            expect(quotes[0].unitPrice).toBe(1599);
        });

        it('normalizes minerstat listings to VendorQuote format', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 1000, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes).toHaveLength(1);
            expect(quotes[0].vendor).toBe('Amazon');
            expect(quotes[0].unitPrice).toBe(1000);
            expect(quotes[0].rating).toBe(4.7); // Amazon's known rating
        });

        it('applies bulk discount for quantity >= 5', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 1000, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 5);
            expect(quotes[0].totalPrice).toBe(Math.round(1000 * 5 * 0.97));
        });

        it('applies 15% bulk discount for quantity >= 100', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 1000, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 100);
            expect(quotes[0].totalPrice).toBe(Math.round(1000 * 100 * 0.85));
        });

        it('deduplicates by vendor name (keeps lowest price)', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 900, inStock: true, source: 'minerstat' },
                { vendor: 'Amazon', price: 1100, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes).toHaveLength(1);
            expect(quotes[0].unitPrice).toBe(900);
        });

        it('sorts quotes by totalPrice ascending', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Newegg', price: 1200, inStock: true, source: 'minerstat' },
                { vendor: 'Amazon', price: 900, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes[0].unitPrice).toBeLessThan(quotes[1].unitPrice);
        });

        it('assigns correct lead time for known vendors', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Micro Center', price: 999, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes[0].leadTime).toBe('Same day (in-store)');
        });

        it('assigns default lead time for unknown vendors', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'SomeUnknownStore', price: 999, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes[0].leadTime).toBe('1-2 weeks');
        });

        it('assigns correct warranty for known manufacturers', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Gigabyte', price: 999, inStock: true, source: 'minerstat' }
            ]);
            const quotes = await getVendorQuotes('RTX 4090', 1);
            expect(quotes[0].warranty).toBe('4 years');
        });
    });

    describe('checkStockStatus', () => {
        it('returns OUT_OF_STOCK when no quotes', async () => {
            const result = await checkStockStatus('RTX 4090');
            expect(result.status).toBe('OUT_OF_STOCK');
            expect(result.availableVendors).toBe(0);
            expect(result.totalVendors).toBe(0);
        });

        it('returns OUT_OF_STOCK when all quotes are out of stock', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 999, inStock: false, source: 'minerstat' }
            ]);
            const result = await checkStockStatus('RTX 4090');
            expect(result.status).toBe('OUT_OF_STOCK');
            expect(result.availableVendors).toBe(0);
        });

        it('returns IN_STOCK when majority vendors have stock', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 999, inStock: true, source: 'minerstat' },
                { vendor: 'Newegg', price: 1050, inStock: true, source: 'minerstat' },
                { vendor: 'BestBuy', price: 1099, inStock: true, source: 'minerstat' }
            ]);
            const result = await checkStockStatus('RTX 4090');
            expect(result.status).toBe('IN_STOCK');
        });

        it('returns LIMITED when fewer than half vendors have stock', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Amazon', price: 999, inStock: true, source: 'minerstat' },
                { vendor: 'Newegg', price: 1050, inStock: false, source: 'minerstat' },
                { vendor: 'BestBuy', price: 1099, inStock: false, source: 'minerstat' }
            ]);
            const result = await checkStockStatus('RTX 4090');
            expect(result.status).toBe('LIMITED');
        });
    });

    describe('getBestQuote', () => {
        it('returns null when no quotes available', async () => {
            const result = await getBestQuote('RTX 4090', 1);
            expect(result).toBeNull();
        });

        it('returns cheapest in-stock quote first', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Newegg', price: 1200, inStock: true, source: 'minerstat' },
                { vendor: 'Amazon', price: 999, inStock: true, source: 'minerstat' }
            ]);
            const result = await getBestQuote('RTX 4090', 1);
            expect(result?.vendor).toBe('Amazon');
        });

        it('falls back to cheapest out-of-stock when none in stock', async () => {
            vi.mocked(minerstatService.getListings).mockResolvedValue([
                { vendor: 'Newegg', price: 1200, inStock: false, source: 'minerstat' },
                { vendor: 'Amazon', price: 999, inStock: false, source: 'minerstat' }
            ]);
            const result = await getBestQuote('RTX 4090', 1);
            expect(result?.unitPrice).toBe(999);
        });
    });

    describe('getDataSourceStatus', () => {
        it('reports minerstat as always available', () => {
            const status = getDataSourceStatus();
            expect(status.minerstat.available).toBe(true);
        });

        it('reports priceApi as unavailable when no API key', () => {
            vi.mocked(priceApiService.hasApiKey).mockReturnValue(false);
            const status = getDataSourceStatus();
            expect(status.priceApi.available).toBe(false);
        });

        it('reports priceApi as available when API key present', () => {
            vi.mocked(priceApiService.hasApiKey).mockReturnValue(true);
            const status = getDataSourceStatus();
            expect(status.priceApi.available).toBe(true);
        });
    });
});
