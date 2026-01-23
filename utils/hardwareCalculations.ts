/**
 * Hardware Calculations Utility
 *
 * Shared calculations for GPU metrics, MTBF estimation, and data enrichment.
 */

import type { GpuSpec, GpuTier, GpuWithLiveData, LiveGpuPrice } from '../types';

/**
 * Base MTBF values by GPU tier (in hours)
 * DATACENTER: Enterprise-grade with redundancy
 * WORKSTATION: Professional with extended validation
 * CONSUMER: Standard gaming/prosumer grade
 */
const BASE_MTBF: Record<GpuTier, number> = {
    'DATACENTER': 50000,
    'WORKSTATION': 40000,
    'CONSUMER': 25000
};

/**
 * Manufacturer reliability multipliers based on historical data
 */
const MANUFACTURER_MULTIPLIER: Record<string, number> = {
    'NVIDIA': 1.1,
    'AMD': 1.0,
    'Intel': 0.95
};

/**
 * Calculate MTBF (Mean Time Between Failures) for a GPU
 *
 * Combines tier-based baseline with TDP thermal penalty.
 * Higher TDP = more heat = reduced lifespan.
 *
 * @param tier - GPU tier (CONSUMER, WORKSTATION, DATACENTER)
 * @param manufacturer - GPU manufacturer
 * @param tdpString - TDP value as string (e.g., "350W")
 * @returns Estimated MTBF in hours
 */
export function calculateMTBF(tier: GpuTier, manufacturer: string, tdpString?: string): number {
    // Get base MTBF for tier
    const baseMTBF = BASE_MTBF[tier] || BASE_MTBF['CONSUMER'];

    // Apply manufacturer multiplier
    const manufacturerBonus = MANUFACTURER_MULTIPLIER[manufacturer] || 1.0;
    let mtbf = baseMTBF * manufacturerBonus;

    // Apply TDP thermal penalty (higher TDP = more heat = lower lifespan)
    if (tdpString) {
        const tdp = parseInt(tdpString) || 0;
        if (tdp > 0) {
            // Every 100W above baseline reduces MTBF
            // Baseline: 200W for consumer, 300W for workstation, 400W for datacenter
            const baselineTdp = tier === 'DATACENTER' ? 400 : tier === 'WORKSTATION' ? 300 : 200;
            const tdpExcess = Math.max(0, tdp - baselineTdp);
            const thermalPenalty = (tdpExcess / 100) * 2000; // 2000h penalty per 100W excess
            mtbf = Math.max(4500, mtbf - thermalPenalty);
        }
    }

    return Math.round(mtbf);
}

/**
 * Calculate dynamic MTBF based on real-time stress levels
 * Used for live thermal monitoring displays
 *
 * @param stressLevel - Current stress level (0-100)
 * @param baselineMTBF - Optional baseline (default: 50000)
 * @returns Adjusted MTBF based on current operating conditions
 */
export function calculateDynamicMTBF(stressLevel: number, baselineMTBF: number = 50000): number {
    const thermalPenalty = Math.pow(stressLevel / 40, 2.5) * 4000;
    return Math.max(4500, Math.round(baselineMTBF - thermalPenalty));
}

/**
 * Enrich a GpuSpec with live pricing data and calculated MTBF
 *
 * @param gpu - Base GPU specification
 * @param livePrice - Optional live pricing data
 * @returns Enriched GPU data with MTBF and live price
 */
export function enrichGpuData(gpu: GpuSpec, livePrice?: LiveGpuPrice): GpuWithLiveData {
    return {
        ...gpu,
        livePrice,
        mtbf: calculateMTBF(gpu.tier, gpu.manufacturer, gpu.specs.tdp)
    };
}

/**
 * Calculate estimated power draw based on component parameters
 *
 * @param voltage - Operating voltage
 * @param clockSpeed - Clock speed in GHz
 * @param fanSpeed - Fan RPM
 * @returns Estimated power draw in watts
 */
export function calculatePowerDraw(voltage: number, clockSpeed: number, fanSpeed: number): number {
    return parseFloat((voltage * clockSpeed * 0.85 + (fanSpeed / 1000) * 15).toFixed(2));
}

/**
 * Get era-specific accent color for UI theming
 *
 * @param era - Current GPU era
 * @returns Hex color code
 */
export function getEraColor(era: string): string {
    if (era === 'QUANTUM') return '#9d4edd';
    if (era === 'BIOMIMETIC') return '#10b981';
    return '#22d3ee'; // SILICON default
}
