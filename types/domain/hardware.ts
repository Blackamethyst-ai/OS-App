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

// Procurement workflow types
export type ProcurementStatus = 'idle' | 'quoting' | 'reviewing' | 'confirming' | 'processing' | 'completed' | 'error';

export interface VendorQuote {
    id: string;
    vendor: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    leadTime: string;
    warranty: string;
    inStock: boolean;
    rating: number;
}

export interface ProcurementOrder {
    id: string;
    gpuId: string;
    gpuModel: string;
    quantity: number;
    selectedQuote: VendorQuote | null;
    status: ProcurementStatus;
    createdAt: number;
    updatedAt: number;
    estimatedDelivery?: string;
    trackingNumber?: string;
    notes?: string;
}

export interface ProcurementState {
    status: ProcurementStatus;
    currentOrder: ProcurementOrder | null;
    quotes: VendorQuote[];
    orderHistory: ProcurementOrder[];
    isModalOpen: boolean;
    error: string | null;
}
