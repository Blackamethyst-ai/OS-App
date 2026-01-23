/**
 * useGpuCatalog Hook
 *
 * Manages GPU catalog data, filtering, selection, and live pricing.
 * Integrates with Zustand store for persistence across navigation.
 */

import { useMemo, useCallback } from 'react';
import { useAppStore } from '../store';
import { GPU_CATALOG, getGpusByEra } from '../data/gpuCatalog';
import { fetchLivePrice, clearPriceCache } from '../services/gpuPricingService';
import type { GpuSpec, GpuTier, GpuEra, LiveGpuPrice, GpuWithLiveData } from '../types';

/**
 * Enriches a GPU spec with live pricing data and calculated MTBF
 */
function enrichGpuData(gpu: GpuSpec, livePrice?: LiveGpuPrice): GpuWithLiveData {
    const baseline = 50000;
    const thermalFactor = gpu.specs.tdp ? parseInt(gpu.specs.tdp) / 100 : 1;
    const mtbf = Math.max(4500, Math.round(baseline - (thermalFactor * 8000)));

    return {
        ...gpu,
        livePrice,
        mtbf
    };
}

interface UseGpuCatalogOptions {
    autoFetchPrices?: boolean;
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
    refreshPrices: () => void;

    // Computed
    eraColor: string;
}

export function useGpuCatalog(options: UseGpuCatalogOptions = {}): UseGpuCatalogReturn {
    const { hardware, actions } = useAppStore();
    const { setHardwareState } = actions;
    const {
        currentEra,
        livePrices: storedPrices,
        selectedGpuId,
        tierFilter: storedTierFilter,
        gpuSearchQuery
    } = hardware;

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

    // Era color
    const eraColor = useMemo(() => {
        if (currentEra === 'QUANTUM') return '#9d4edd';
        if (currentEra === 'BIOMIMETIC') return '#10b981';
        return '#22d3ee';
    }, [currentEra]);

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

        try {
            const price = await fetchLivePrice(gpu.model, gpu.msrp);
            setHardwareState(prev => ({
                livePrices: { ...prev.livePrices, [gpu.model]: price }
            }));
        } catch (error) {
            console.error('Failed to fetch GPU price:', error);
        }
    }, [setHardwareState]);

    const refreshPrices = useCallback(() => {
        clearPriceCache();
        if (selectedGpu && selectedGpu.era === 'SILICON') {
            fetchPrice(selectedGpu);
        }
    }, [selectedGpu, fetchPrice]);

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

        // Pricing (isFetchingPrice would need to be tracked separately if needed)
        isFetchingPrice: false,
        fetchPrice,
        refreshPrices,

        // Computed
        eraColor
    };
}

export { enrichGpuData };
