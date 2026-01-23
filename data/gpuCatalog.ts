/**
 * GPU Catalog - Real GPU Specifications
 *
 * SILICON Era: Real production GPUs with actual specs and MSRP
 * QUANTUM/BIOMIMETIC: Conceptual futuristic hardware
 *
 * Sources:
 * - https://gpuprices.ai/
 * - https://getdeploying.com/gpus
 * - https://cloud.google.com/compute/gpus-pricing
 */

import type { GpuSpec } from '../types';

export const GPU_CATALOG: GpuSpec[] = [
    // ========================================
    // SILICON ERA - DATACENTER / AI ACCELERATORS
    // ========================================
    {
        id: 'nvidia-h100-sxm',
        era: 'SILICON',
        model: 'NVIDIA H100 SXM',
        manufacturer: 'NVIDIA',
        arch: 'Hopper',
        msrp: 30000,
        releaseYear: 2022,
        specs: {
            vram: '80GB',
            vramType: 'HBM3',
            tdp: '700W',
            cores: '16896 CUDA',
            baseClock: '1095 MHz',
            boostClock: '1980 MHz'
        },
        tier: 'DATACENTER',
        bom: ['HBM3 Memory Stack', 'SXM5 Mezzanine Board', 'GH100 Die', 'Heat Sink Assembly', 'NVLink Bridge']
    },
    {
        id: 'nvidia-h200',
        era: 'SILICON',
        model: 'NVIDIA H200',
        manufacturer: 'NVIDIA',
        arch: 'Hopper',
        msrp: 40000,
        releaseYear: 2024,
        specs: {
            vram: '141GB',
            vramType: 'HBM3e',
            tdp: '700W',
            cores: '16896 CUDA',
            baseClock: '1095 MHz',
            boostClock: '1980 MHz'
        },
        tier: 'DATACENTER',
        bom: ['HBM3e Memory Stack', 'SXM5 Mezzanine Board', 'GH200 Die', 'Liquid Cooling Module', 'NVLink Bridge']
    },
    {
        id: 'nvidia-a100-80gb',
        era: 'SILICON',
        model: 'NVIDIA A100',
        manufacturer: 'NVIDIA',
        arch: 'Ampere',
        msrp: 15000,
        releaseYear: 2020,
        specs: {
            vram: '80GB',
            vramType: 'HBM2e',
            tdp: '400W',
            cores: '6912 CUDA',
            baseClock: '765 MHz',
            boostClock: '1410 MHz'
        },
        tier: 'DATACENTER',
        bom: ['HBM2e Memory Stack', 'SXM4 Mezzanine Board', 'GA100 Die', 'Heatsink Assembly']
    },
    {
        id: 'nvidia-l40s',
        era: 'SILICON',
        model: 'NVIDIA L40S',
        manufacturer: 'NVIDIA',
        arch: 'Ada Lovelace',
        msrp: 8000,
        releaseYear: 2023,
        specs: {
            vram: '48GB',
            vramType: 'GDDR6 ECC',
            tdp: '350W',
            cores: '18176 CUDA',
            baseClock: '1110 MHz',
            boostClock: '2520 MHz'
        },
        tier: 'DATACENTER',
        bom: ['GDDR6 Memory Modules', 'PCIe 4.0 Interface', 'AD102 Die', 'Passive Heatsink']
    },
    {
        id: 'amd-mi300x',
        era: 'SILICON',
        model: 'AMD Instinct MI300X',
        manufacturer: 'AMD',
        arch: 'CDNA 3',
        msrp: 15000,
        releaseYear: 2023,
        specs: {
            vram: '192GB',
            vramType: 'HBM3',
            tdp: '750W',
            cores: '19456 Stream',
            baseClock: '1000 MHz',
            boostClock: '2100 MHz'
        },
        tier: 'DATACENTER',
        bom: ['HBM3 Memory Stack', 'OAM Module', 'CDNA 3 Chiplets', 'Infinity Fabric Bridge', 'Liquid Cooling Plate']
    },

    // ========================================
    // SILICON ERA - WORKSTATION
    // ========================================
    {
        id: 'nvidia-rtx6000-ada',
        era: 'SILICON',
        model: 'NVIDIA RTX 6000 Ada',
        manufacturer: 'NVIDIA',
        arch: 'Ada Lovelace',
        msrp: 6800,
        releaseYear: 2022,
        specs: {
            vram: '48GB',
            vramType: 'GDDR6 ECC',
            tdp: '300W',
            cores: '18176 CUDA',
            baseClock: '915 MHz',
            boostClock: '2505 MHz'
        },
        tier: 'WORKSTATION',
        bom: ['GDDR6 ECC Modules', 'AD102 Die', 'Blower Cooler', 'Quadro Driver Stack']
    },
    {
        id: 'nvidia-rtx5000-ada',
        era: 'SILICON',
        model: 'NVIDIA RTX 5000 Ada',
        manufacturer: 'NVIDIA',
        arch: 'Ada Lovelace',
        msrp: 4000,
        releaseYear: 2023,
        specs: {
            vram: '32GB',
            vramType: 'GDDR6 ECC',
            tdp: '250W',
            cores: '12800 CUDA',
            baseClock: '1155 MHz',
            boostClock: '2550 MHz'
        },
        tier: 'WORKSTATION',
        bom: ['GDDR6 ECC Modules', 'AD103 Die', 'Blower Cooler', 'Quadro Driver Stack']
    },
    {
        id: 'nvidia-rtx4000-ada',
        era: 'SILICON',
        model: 'NVIDIA RTX 4000 Ada',
        manufacturer: 'NVIDIA',
        arch: 'Ada Lovelace',
        msrp: 1250,
        releaseYear: 2023,
        specs: {
            vram: '20GB',
            vramType: 'GDDR6 ECC',
            tdp: '130W',
            cores: '6144 CUDA',
            baseClock: '930 MHz',
            boostClock: '2175 MHz'
        },
        tier: 'WORKSTATION',
        bom: ['GDDR6 ECC Modules', 'AD104 Die', 'Single-Slot Cooler']
    },

    // ========================================
    // SILICON ERA - CONSUMER (HIGH-END)
    // ========================================
    {
        id: 'nvidia-rtx5090',
        era: 'SILICON',
        model: 'NVIDIA RTX 5090',
        manufacturer: 'NVIDIA',
        arch: 'Blackwell',
        msrp: 1999,
        releaseYear: 2025,
        specs: {
            vram: '32GB',
            vramType: 'GDDR7',
            tdp: '575W',
            cores: '21760 CUDA',
            baseClock: '2010 MHz',
            boostClock: '2407 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR7 Modules', 'GB202 Die', 'Triple-Fan Cooler', 'PCIe 5.0 Interface']
    },
    {
        id: 'nvidia-rtx5080',
        era: 'SILICON',
        model: 'NVIDIA RTX 5080',
        manufacturer: 'NVIDIA',
        arch: 'Blackwell',
        msrp: 999,
        releaseYear: 2025,
        specs: {
            vram: '16GB',
            vramType: 'GDDR7',
            tdp: '360W',
            cores: '10752 CUDA',
            baseClock: '2295 MHz',
            boostClock: '2617 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR7 Modules', 'GB203 Die', 'Dual-Fan Cooler', 'PCIe 5.0 Interface']
    },
    {
        id: 'nvidia-rtx4090',
        era: 'SILICON',
        model: 'NVIDIA RTX 4090',
        manufacturer: 'NVIDIA',
        arch: 'Ada Lovelace',
        msrp: 1599,
        releaseYear: 2022,
        specs: {
            vram: '24GB',
            vramType: 'GDDR6X',
            tdp: '450W',
            cores: '16384 CUDA',
            baseClock: '2235 MHz',
            boostClock: '2520 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR6X Modules', 'AD102 Die', 'Triple-Fan Cooler', 'PCIe 4.0 Interface']
    },
    {
        id: 'nvidia-rtx4080-super',
        era: 'SILICON',
        model: 'NVIDIA RTX 4080 Super',
        manufacturer: 'NVIDIA',
        arch: 'Ada Lovelace',
        msrp: 999,
        releaseYear: 2024,
        specs: {
            vram: '16GB',
            vramType: 'GDDR6X',
            tdp: '320W',
            cores: '10240 CUDA',
            baseClock: '2290 MHz',
            boostClock: '2550 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR6X Modules', 'AD103 Die', 'Dual-Fan Cooler', 'PCIe 4.0 Interface']
    },
    {
        id: 'amd-rx9070xt',
        era: 'SILICON',
        model: 'AMD RX 9070 XT',
        manufacturer: 'AMD',
        arch: 'RDNA 4',
        msrp: 549,
        releaseYear: 2025,
        specs: {
            vram: '16GB',
            vramType: 'GDDR6',
            tdp: '280W',
            cores: '4096 Stream',
            baseClock: '2000 MHz',
            boostClock: '2800 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR6 Modules', 'Navi 48 Die', 'Dual-Fan Cooler', 'PCIe 5.0 Interface']
    },
    {
        id: 'amd-rx7900xtx',
        era: 'SILICON',
        model: 'AMD RX 7900 XTX',
        manufacturer: 'AMD',
        arch: 'RDNA 3',
        msrp: 999,
        releaseYear: 2022,
        specs: {
            vram: '24GB',
            vramType: 'GDDR6',
            tdp: '355W',
            cores: '6144 Stream',
            baseClock: '1855 MHz',
            boostClock: '2499 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR6 Modules', 'Navi 31 GCD + MCDs', 'Triple-Fan Cooler', 'PCIe 4.0 Interface']
    },
    {
        id: 'intel-arc-b580',
        era: 'SILICON',
        model: 'Intel Arc B580',
        manufacturer: 'Intel',
        arch: 'Battlemage',
        msrp: 249,
        releaseYear: 2024,
        specs: {
            vram: '12GB',
            vramType: 'GDDR6',
            tdp: '190W',
            cores: '2560 Xe',
            baseClock: '2300 MHz',
            boostClock: '2850 MHz'
        },
        tier: 'CONSUMER',
        bom: ['GDDR6 Modules', 'BMG-G21 Die', 'Dual-Fan Cooler', 'PCIe 4.0 Interface']
    },

    // ========================================
    // QUANTUM ERA - CONCEPTUAL
    // ========================================
    {
        id: 'quantum-tensor-x1',
        era: 'QUANTUM',
        model: 'Q-Tensor X1',
        manufacturer: 'NVIDIA',
        arch: 'Q-Core',
        msrp: 85000,
        releaseYear: 2030,
        specs: {
            vram: '128QB',
            vramType: 'Quantum VRAM',
            tdp: '1200W',
            cores: '512 Qubits',
            baseClock: 'N/A',
            boostClock: 'N/A'
        },
        tier: 'DATACENTER',
        bom: ['Cryogenic Interface', 'High-Fidelity Interconnect', 'Superconducting Logic Die', 'Vacuum Stage Control']
    },
    {
        id: 'quantum-photon-array',
        era: 'QUANTUM',
        model: 'Photon Array Q2',
        manufacturer: 'AMD',
        arch: 'Photonic',
        msrp: 120000,
        releaseYear: 2032,
        specs: {
            vram: '256QB',
            vramType: 'Photonic Memory',
            tdp: '800W',
            cores: '1024 Photonic',
            baseClock: 'N/A',
            boostClock: 'N/A'
        },
        tier: 'DATACENTER',
        bom: ['Photonic Waveguide Array', 'Quantum Entanglement Module', 'Optical Processor Die', 'Laser Cooling System']
    },

    // ========================================
    // BIOMIMETIC ERA - CONCEPTUAL
    // ========================================
    {
        id: 'synapse-v4',
        era: 'BIOMIMETIC',
        model: 'Synapse V4',
        manufacturer: 'NVIDIA',
        arch: 'Bio-Core',
        msrp: 54000,
        releaseYear: 2035,
        specs: {
            vram: '1TB',
            vramType: 'Organic Wetware',
            tdp: '150W',
            cores: '12B Synapses',
            baseClock: 'Adaptive',
            boostClock: 'Adaptive'
        },
        tier: 'DATACENTER',
        bom: ['Neural Bus Interconnect', 'Micro-Fluidic Cooling', 'Neuromorphic Logic Die', 'Electrolyte Delivery Module']
    },
    {
        id: 'cortex-prime',
        era: 'BIOMIMETIC',
        model: 'Cortex Prime',
        manufacturer: 'AMD',
        arch: 'Neuro-Adaptive',
        msrp: 72000,
        releaseYear: 2038,
        specs: {
            vram: '2TB',
            vramType: 'Synthetic Neural Tissue',
            tdp: '200W',
            cores: '50B Synapses',
            baseClock: 'Self-Regulating',
            boostClock: 'Self-Regulating'
        },
        tier: 'DATACENTER',
        bom: ['Axon Network Interface', 'Bio-Electric Power Unit', 'Synthetic Cortex Module', 'Nutrient Circulation System']
    }
];

/**
 * Get GPUs filtered by era
 */
export function getGpusByEra(era: 'SILICON' | 'QUANTUM' | 'BIOMIMETIC'): GpuSpec[] {
    return GPU_CATALOG.filter(gpu => gpu.era === era);
}

/**
 * Get GPUs filtered by tier
 */
export function getGpusByTier(tier: 'CONSUMER' | 'WORKSTATION' | 'DATACENTER'): GpuSpec[] {
    return GPU_CATALOG.filter(gpu => gpu.tier === tier);
}

/**
 * Get a specific GPU by ID
 */
export function getGpuById(id: string): GpuSpec | undefined {
    return GPU_CATALOG.find(gpu => gpu.id === id);
}
