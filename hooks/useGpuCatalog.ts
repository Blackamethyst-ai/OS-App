/**
 * useGpuCatalog Hook
 *
 * Manages GPU catalog data, filtering, selection, and live pricing.
 * Integrates with Zustand store for persistence across navigation.
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { GPU_CATALOG, getGpusByEra, getGpuById } from '../data/gpuCatalog';
import { fetchLivePrice, fetchBatchPrices, clearPriceCache, getCacheStats } from '../services/gpuPricingService';
import { enrichGpuData, getEraColor } from '../utils/hardwareCalculations';
import type { GpuSpec, GpuTier, GpuEra, LiveGpuPrice, GpuWithLiveData } from '../types';

interface UseGpuCatalogOptions {
    autoFetchPrices?: boolean;
}

interface CacheStats {
    entries: number;
    oldestEntry: number | null;
    minerstat: { cached: boolean; gpuCount: number; ageMs: number };
    priceApi: { credits: { used: number; remaining: number } };
}

interface UseGpuCatalogReturn {
    // Data
    gpus: GpuWithLiveData[];
    selectedGpu: GpuWithLiveData | null;
    livePrices: Map<string, LiveGpuPrice>;

    // Filters
    currentEra: GpuEra;
    tierFilter: GpuTier | null;
    searchQuery: string;

    // Actions
    setEra: (era: GpuEra) => void;
    setTierFilter: (tier: GpuTier | null) => void;
    setSearchQuery: (query: string) => void;
    selectGpu: (gpu: GpuWithLiveData | null) => void;

    // Pricing
    isFetchingPrice: boolean;
    fetchPrice: (gpu: GpuSpec) => Promise<void>;
    fetchAllPrices: () => Promise<void>;
    refreshPrices: () => void;
    cacheStats: CacheStats;

    // Computed
    eraColor: string;
}

export function useGpuCatalog(options: UseGpuCatalogOptions = {}): UseGpuCatalogReturn {
    const { autoFetchPrices = false } = options;
    const { hardware, actions } = useAppStore();
    const { setHardwareState } = actions;
    const {
        currentEra,
        livePrices: storedPrices,
        selectedGpuId,
        tierFilter: storedTierFilter,
        gpuSearchQuery
    } = hardware;

    // Track fetching state locally (transient UI state)
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [cacheStats, setCacheStats] = useState<CacheStats>({
        entries: 0,
        oldestEntry: null,
        minerstat: { cached: false, gpuCount: 0, ageMs: 0 },
        priceApi: { credits: { used: 0, remaining: 1000 } }
    });

    // Convert stored prices to Map for efficient lookups
    const livePrices = useMemo(() => {
        const map = new Map<string, LiveGpuPrice>();
        for (const [model, price] of Object.entries(storedPrices)) {
            map.set(model, price as LiveGpuPrice);
        }
        return map;
    }, [storedPrices]);

    // Current filters
    const tierFilter = storedTierFilter as GpuTier | null;
    const searchQuery = gpuSearchQuery || '';

    // Filter and enrich GPUs
    const gpus = useMemo(() => {
        let result = getGpusByEra(currentEra as GpuEra);

        if (tierFilter && currentEra === 'SILICON') {
            result = result.filter(g => g.tier === tierFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.model.toLowerCase().includes(query) ||
                g.manufacturer.toLowerCase().includes(query)
            );
        }

        return result.map(gpu => enrichGpuData(gpu, livePrices.get(gpu.model)));
    }, [currentEra, tierFilter, searchQuery, livePrices]);

    // Selected GPU
    const selectedGpu = useMemo(() => {
        if (selectedGpuId) {
            const gpu = GPU_CATALOG.find(g => g.id === selectedGpuId);
            if (gpu) return enrichGpuData(gpu, livePrices.get(gpu.model));
        }
        return gpus[0] || null;
    }, [selectedGpuId, gpus, livePrices]);

    // Era color - uses shared utility
    const eraColor = useMemo(() => getEraColor(currentEra), [currentEra]);

    // Actions
    const setEra = useCallback((era: GpuEra) => {
        setHardwareState({ currentEra: era, selectedGpuId: null });
    }, [setHardwareState]);

    const setTierFilter = useCallback((tier: GpuTier | null) => {
        setHardwareState({ tierFilter: tier });
    }, [setHardwareState]);

    const setSearchQuery = useCallback((query: string) => {
        setHardwareState({ gpuSearchQuery: query });
    }, [setHardwareState]);

    const selectGpu = useCallback((gpu: GpuWithLiveData | null) => {
        setHardwareState({ selectedGpuId: gpu?.id || null });
    }, [setHardwareState]);

    // Pricing - track loading state locally since it's transient
    const fetchPrice = useCallback(async (gpu: GpuSpec) => {
        if (gpu.era !== 'SILICON') return;

        setIsFetchingPrice(true);
        try {
            const price = await fetchLivePrice(gpu.model, gpu.msrp);
            setHardwareState(prev => ({
                livePrices: { ...prev.livePrices, [gpu.model]: price }
            }));
            // Update cache stats after fetch
            setCacheStats(getCacheStats());
        } catch (error) {
            console.error('Failed to fetch GPU price:', error);
        } finally {
            setIsFetchingPrice(false);
        }
    }, [setHardwareState]);

    // Batch fetch all prices for current era
    const fetchAllPrices = useCallback(async () => {
        const siliconGpus = gpus.filter(g => g.era === 'SILICON');
        if (siliconGpus.length === 0) return;

        setIsFetchingPrice(true);
        try {
            const prices = await fetchBatchPrices(
                siliconGpus.map(g => ({ model: g.model, msrp: g.msrp }))
            );
            setHardwareState(prev => ({
                livePrices: { ...prev.livePrices, ...prices }
            }));
            setCacheStats(getCacheStats());
        } catch (error) {
            console.error('Failed to batch fetch GPU prices:', error);
        } finally {
            setIsFetchingPrice(false);
        }
    }, [gpus, setHardwareState]);

    const refreshPrices = useCallback(() => {
        clearPriceCache();
        setCacheStats(getCacheStats());
        if (selectedGpu && selectedGpu.era === 'SILICON') {
            fetchPrice(selectedGpu);
        }
    }, [selectedGpu, fetchPrice]);

    // Auto-fetch prices on mount if enabled
    useEffect(() => {
        if (autoFetchPrices && currentEra === 'SILICON') {
            const gpusWithoutPrices = gpus.filter(g => !livePrices.has(g.model));
            if (gpusWithoutPrices.length > 0) {
                fetchAllPrices();
            }
        }
    }, [autoFetchPrices, currentEra, gpus, livePrices, fetchAllPrices]);

    // Update cache stats on mount
    useEffect(() => {
        setCacheStats(getCacheStats());
    }, []);

    return {
        // Data
        gpus,
        selectedGpu,
        livePrices,

        // Filters
        currentEra: currentEra as GpuEra,
        tierFilter,
        searchQuery,

        // Actions
        setEra,
        setTierFilter,
        setSearchQuery,
        selectGpu,

        // Pricing
        isFetchingPrice,
        fetchPrice,
        fetchAllPrices,
        refreshPrices,
        cacheStats,

        // Computed
        eraColor
    };
}

// Re-export from shared utility for backwards compatibility
export { enrichGpuData } from '../utils/hardwareCalculations';
