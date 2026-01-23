/**
 * INITIAL METAVENTIONS DATA
 *
 * Default ecosystem layers and strategy library.
 * Extracted from store.ts for maintainability.
 */

import { MetaventionsState } from '../types';

export const INITIAL_LAYERS: MetaventionsState['layers'] = [
    {
        id: 'LAYER_DEPIN',
        name: 'Physical Infrastructure',
        role: 'PHYSICAL_NETWORK',
        leverage: 'Orchestrating production-grade D-Infrastructure nodes.',
        status: 'STABLE',
        level: 1,
        metrics: [
            { label: 'Units', value: '1,420', trend: 'up' },
            { label: 'Uptime', value: '99.99%', trend: 'stable' }
        ]
    },
    {
        id: 'LAYER_AI',
        name: 'Strategic Intelligence',
        role: 'COGNITIVE_CORE',
        leverage: 'Recursive neural implementation of meta inventions.',
        status: 'OPTIMIZED',
        level: 2,
        metrics: [
            { label: 'Coherence', value: '98.4%', trend: 'up' },
            { label: 'Latency', value: '3ms', trend: 'down' }
        ]
    }
];

export const INITIAL_STRATEGY_LIBRARY: MetaventionsState['strategyLibrary'] = [
    {
        id: 'PARA_DRIVE_SYSTEM',
        title: 'PARA+ Drive Architecture',
        context: 'D-System File Management',
        logic: 'Recursive multi-modal indexing with adaptive TTL for Projects and Areas.',
        steps: ['Audit Drive', 'Create P.A.R.A Structure', 'Migrate Archives'],
        physicalImpact: '40% reduction in data retrieval latency.',
        timestamp: Date.now()
    },
    {
        id: 'PARA_NAMING_CONVENTION',
        title: 'PARA Naming Protocol',
        context: 'Drive Organization',
        logic: 'Date-stamped project identifiers with [P] [A] [R] [A] prefixes for zero-ambiguity indexing.',
        steps: ['Scan Hierarchy', 'Apply Prefix', 'Sync Metadata'],
        physicalImpact: 'Instant semantic recall across all storage nodes.',
        timestamp: Date.now()
    }
];

export const INITIAL_METAVENTIONS: MetaventionsState = {
    layers: INITIAL_LAYERS,
    activeLayerId: 'LAYER_DEPIN',
    isAnalyzing: false,
    strategyLog: [],
    strategyLibrary: INITIAL_STRATEGY_LIBRARY,
    wallets: [],
    economicProtocols: []
};
