/**
 * Hardware Domain Types
 * Real GPU specifications and pricing for the HardwareEngine component
 */

export type GpuManufacturer = 'NVIDIA' | 'AMD' | 'Intel';
export type GpuTier = 'CONSUMER' | 'WORKSTATION' | 'DATACENTER';
export type GpuEra = 'SILICON' | 'QUANTUM' | 'BIOMIMETIC';
export type StockStatus = 'IN_STOCK' | 'LIMITED' | 'OUT_OF_STOCK' | 'PRE_ORDER';

export interface GpuSpecs {
    vram: string;
    vramType: string;
    tdp: string;
    cores: string;
    baseClock: string;
    boostClock: string;
}

export interface GpuSpec {
    id: string;
    era: GpuEra;
    model: string;
    manufacturer: GpuManufacturer;
    arch: string;
    msrp: number;
    releaseYear: number;
    specs: GpuSpecs;
    tier: GpuTier;
    bom: string[];
}

export interface LiveGpuPrice {
    price: number;
    trend: number;
    stock: StockStatus;
    source: string;
    lastUpdated: number;
}

export interface GpuWithLiveData extends GpuSpec {
    livePrice?: LiveGpuPrice;
    mtbf: number;
}
