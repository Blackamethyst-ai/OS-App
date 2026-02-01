/**
 * TAB NAVIGATION REGISTRY
 *
 * Comprehensive registry of ALL tabs and subtabs across ALL sectors.
 * Enables precise voice navigation like "go to the Nexus tab" without confusion.
 *
 * Features:
 * - Maps all tabs by sector with unique identifiers
 * - Fuzzy matching with disambiguation
 * - Subtab support
 * - Context-aware navigation
 *
 * SYNCHRONIZED CLOCK INTEGRATION:
 * Tab changes trigger SystemMind epoch updates to keep voice context fresh.
 */

import { AppMode } from '../types';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';

// =============================================================================
// Types
// =============================================================================

export interface TabDefinition {
    id: string;
    sectorMode: AppMode | 'NEXUS';
    sectorLabel: string;
    tabKey: string;
    tabLabel: string;
    aliases: string[];
    storeKey?: string;  // Which store slice manages this tab
    subtabs?: SubtabDefinition[];
    description: string;
}

export interface SubtabDefinition {
    id: string;
    key: string;
    label: string;
    aliases: string[];
}

export interface TabNavigationResult {
    success: boolean;
    sector?: AppMode | 'NEXUS';
    sectorLabel?: string;
    tab?: string;
    tabLabel?: string;
    subtab?: string;
    subtabLabel?: string;
    route?: string;
    error?: string;
    suggestions?: string[];
}

// =============================================================================
// Complete Tab Registry
// =============================================================================

export const TAB_REGISTRY: TabDefinition[] = [
    // =========================================================================
    // NEXUS (Special - not in AppMode)
    // =========================================================================
    {
        id: 'nexus-main',
        sectorMode: 'NEXUS',
        sectorLabel: 'Nexus',
        tabKey: 'nexus',
        tabLabel: 'Nexus Matrix',
        aliases: ['nexus', 'nexus matrix', 'api explorer', 'service mesh', 'tool forge'],
        description: 'API discovery and tool forging interface',
        subtabs: [
            { id: 'nexus-all', key: 'ALL', label: 'All Services', aliases: ['all', 'everything'] },
            { id: 'nexus-cloud', key: 'CLOUD', label: 'Cloud', aliases: ['cloud', 'cloud services'] },
            { id: 'nexus-ai', key: 'AI', label: 'AI', aliases: ['ai', 'artificial intelligence'] },
            { id: 'nexus-workspace', key: 'WORKSPACE', label: 'Workspace', aliases: ['workspace'] },
            { id: 'nexus-data', key: 'DATA', label: 'Data', aliases: ['data', 'database'] },
            { id: 'nexus-core', key: 'CORE', label: 'Core', aliases: ['core', 'system'] }
        ]
    },

    // =========================================================================
    // BIBLIOMORPHIC (Research / Discovery Lab)
    // =========================================================================
    {
        id: 'biblio-discovery',
        sectorMode: AppMode.BIBLIOMORPHIC,
        sectorLabel: 'Research',
        tabKey: 'discovery',
        tabLabel: 'Discovery Lab',
        aliases: ['discovery', 'lab', 'discovery lab', 'research lab'],
        storeKey: 'bibliomorphic.activeTab',
        description: 'Research and discovery interface'
    },
    {
        id: 'biblio-dna',
        sectorMode: AppMode.BIBLIOMORPHIC,
        sectorLabel: 'Research',
        tabKey: 'dna',
        tabLabel: 'DNA Builder',
        aliases: ['dna', 'dna builder', 'genetic', 'builder'],
        storeKey: 'bibliomorphic.activeTab',
        description: 'DNA and genetic analysis tools'
    },
    {
        id: 'biblio-agora',
        sectorMode: AppMode.BIBLIOMORPHIC,
        sectorLabel: 'Research',
        tabKey: 'agora',
        tabLabel: 'Agora',
        aliases: ['agora', 'forum', 'discussion', 'debate forum'],
        storeKey: 'bibliomorphic.activeTab',
        description: 'Multi-agent discussion forum'
    },
    {
        id: 'biblio-bicameral',
        sectorMode: AppMode.BIBLIOMORPHIC,
        sectorLabel: 'Research',
        tabKey: 'bicameral',
        tabLabel: 'Bicameral Swarm',
        aliases: ['bicameral', 'swarm', 'dual mind', 'thesis antithesis'],
        storeKey: 'bibliomorphic.activeTab',
        description: 'Bicameral reasoning engine'
    },

    // =========================================================================
    // CODE_STUDIO (Logic)
    // =========================================================================
    {
        id: 'code-ide',
        sectorMode: AppMode.CODE_STUDIO,
        sectorLabel: 'Logic',
        tabKey: 'IDE',
        tabLabel: 'IDE',
        aliases: ['ide', 'editor', 'code editor', 'buffer'],
        storeKey: 'codeStudio.activeTab',
        description: 'Code editor and buffer'
    },
    {
        id: 'code-actions',
        sectorMode: AppMode.CODE_STUDIO,
        sectorLabel: 'Logic',
        tabKey: 'ACTIONS',
        tabLabel: 'Actions',
        aliases: ['actions', 'tasks', 'task board', 'action items'],
        storeKey: 'codeStudio.activeTab',
        description: 'Task board and action items'
    },

    // =========================================================================
    // IMAGE_GEN (Cinema)
    // =========================================================================
    {
        id: 'cinema-single',
        sectorMode: AppMode.IMAGE_GEN,
        sectorLabel: 'Cinema',
        tabKey: 'SINGLE',
        tabLabel: 'Single Image',
        aliases: ['single', 'single image', 'image', 'generate image'],
        description: 'Generate individual images'
    },
    {
        id: 'cinema-storyboard',
        sectorMode: AppMode.IMAGE_GEN,
        sectorLabel: 'Cinema',
        tabKey: 'STORYBOARD',
        tabLabel: 'Storyboard',
        aliases: ['storyboard', 'story', 'frames', 'batch'],
        description: 'Batch frame generation'
    },
    {
        id: 'cinema-video',
        sectorMode: AppMode.IMAGE_GEN,
        sectorLabel: 'Cinema',
        tabKey: 'VIDEO',
        tabLabel: 'Video',
        aliases: ['video', 'animation', 'motion'],
        description: 'Video generation mode'
    },
    {
        id: 'cinema-teaser',
        sectorMode: AppMode.IMAGE_GEN,
        sectorLabel: 'Cinema',
        tabKey: 'TEASER',
        tabLabel: 'Screening Room',
        aliases: ['teaser', 'screening', 'screening room', 'preview', 'playback'],
        description: 'Teaser and clip playback'
    },

    // =========================================================================
    // HARDWARE_ENGINEER (Hardware)
    // =========================================================================
    {
        id: 'hardware-2d',
        sectorMode: AppMode.HARDWARE_ENGINEER,
        sectorLabel: 'Hardware',
        tabKey: '2D',
        tabLabel: '2D Blueprint',
        aliases: ['2d', 'blueprint', '2d blueprint', 'flat'],
        description: '2D blueprint visualization'
    },
    {
        id: 'hardware-3d',
        sectorMode: AppMode.HARDWARE_ENGINEER,
        sectorLabel: 'Hardware',
        tabKey: '3D',
        tabLabel: '3D View',
        aliases: ['3d', '3d view', 'isometric', 'three dimensional'],
        description: '3D isometric view'
    },
    {
        id: 'hardware-schematic',
        sectorMode: AppMode.HARDWARE_ENGINEER,
        sectorLabel: 'Hardware',
        tabKey: 'SCHEMATIC',
        tabLabel: 'Schematic',
        aliases: ['schematic', 'circuit', 'wiring', 'technical'],
        description: 'Technical schematic view'
    },
    {
        id: 'hardware-xray',
        sectorMode: AppMode.HARDWARE_ENGINEER,
        sectorLabel: 'Hardware',
        tabKey: 'XRAY',
        tabLabel: 'X-Ray',
        aliases: ['xray', 'x-ray', 'cross section', 'internal'],
        description: 'X-ray cross-section view'
    },
    {
        id: 'hardware-quantum',
        sectorMode: AppMode.HARDWARE_ENGINEER,
        sectorLabel: 'Hardware',
        tabKey: 'QUANTUM',
        tabLabel: 'Quantum',
        aliases: ['quantum', 'quantum era', 'advanced'],
        description: 'Quantum era advanced view'
    },

    // =========================================================================
    // MEMORY_CORE (Memory / Vault)
    // =========================================================================
    {
        id: 'memory-grid',
        sectorMode: AppMode.MEMORY_CORE,
        sectorLabel: 'Memory',
        tabKey: 'GRID',
        tabLabel: 'Grid View',
        aliases: ['grid', 'grid view', 'tiles'],
        description: 'Grid layout of artifacts'
    },
    {
        id: 'memory-graph',
        sectorMode: AppMode.MEMORY_CORE,
        sectorLabel: 'Memory',
        tabKey: 'GRAPH',
        tabLabel: 'Knowledge Graph',
        aliases: ['graph', 'knowledge graph', 'network', 'connections'],
        description: 'Knowledge graph visualization'
    },
    {
        id: 'memory-oceanic',
        sectorMode: AppMode.MEMORY_CORE,
        sectorLabel: 'Memory',
        tabKey: 'OCEANIC',
        tabLabel: 'Oceanic',
        aliases: ['oceanic', 'ocean', 'floating', 'ambient'],
        description: 'Floating oceanic artifacts'
    },
    {
        id: 'memory-tools',
        sectorMode: AppMode.MEMORY_CORE,
        sectorLabel: 'Memory',
        tabKey: 'TOOLS',
        tabLabel: 'Tools',
        aliases: ['tools', 'manifests', 'dynamic tools'],
        description: 'Dynamic tool manifests'
    },
    {
        id: 'memory-dynamic',
        sectorMode: AppMode.MEMORY_CORE,
        sectorLabel: 'Memory',
        tabKey: 'DYNAMIC',
        tabLabel: 'Dynamic',
        aliases: ['dynamic', 'analytics', 'visuals'],
        description: 'Dynamic visuals and analytics'
    },
    {
        id: 'memory-xray',
        sectorMode: AppMode.MEMORY_CORE,
        sectorLabel: 'Memory',
        tabKey: 'XRAY',
        tabLabel: 'X-Ray Analysis',
        aliases: ['xray', 'x-ray', 'power', 'thermal'],
        description: 'Power and thermal analysis'
    },

    // =========================================================================
    // AGENT_CONTROL (Swarm)
    // =========================================================================
    {
        id: 'agents-memory',
        sectorMode: AppMode.AGENT_CONTROL,
        sectorLabel: 'Swarm',
        tabKey: 'MEMORY',
        tabLabel: 'Agent Memory',
        aliases: ['memory', 'agent memory', 'context', 'buffer'],
        description: 'Agent memory and context buffer'
    },
    {
        id: 'agents-skills',
        sectorMode: AppMode.AGENT_CONTROL,
        sectorLabel: 'Swarm',
        tabKey: 'SKILLS',
        tabLabel: 'Skills',
        aliases: ['skills', 'skill constellation', 'capabilities', 'abilities'],
        description: 'Skill constellation visualization'
    },
    {
        id: 'agents-tasks',
        sectorMode: AppMode.AGENT_CONTROL,
        sectorLabel: 'Swarm',
        tabKey: 'TASKS',
        tabLabel: 'Tasks',
        aliases: ['tasks', 'task queue', 'assignments', 'jobs'],
        description: 'Task queue and assignments'
    },
    {
        id: 'agents-convergence',
        sectorMode: AppMode.AGENT_CONTROL,
        sectorLabel: 'Swarm',
        tabKey: 'CONVERGENCE',
        tabLabel: 'Convergence',
        aliases: ['convergence', 'history', 'relational', 'convergence memory'],
        description: 'Convergence and relational history'
    },

    // =========================================================================
    // AUTONOMOUS_FINANCE (Treasury)
    // =========================================================================
    {
        id: 'finance-overview',
        sectorMode: AppMode.AUTONOMOUS_FINANCE,
        sectorLabel: 'Treasury',
        tabKey: 'OVERVIEW',
        tabLabel: 'Overview',
        aliases: ['overview', 'summary', 'dashboard', 'metrics'],
        description: 'Financial overview and metrics'
    },
    {
        id: 'finance-yield',
        sectorMode: AppMode.AUTONOMOUS_FINANCE,
        sectorLabel: 'Treasury',
        tabKey: 'YIELD_OPS',
        tabLabel: 'Yield Operations',
        aliases: ['yield', 'yield ops', 'yield operations', 'farming'],
        description: 'Yield farming operations'
    },
    {
        id: 'finance-liquidity',
        sectorMode: AppMode.AUTONOMOUS_FINANCE,
        sectorLabel: 'Treasury',
        tabKey: 'LIQUIDITY',
        tabLabel: 'Liquidity',
        aliases: ['liquidity', 'pools', 'liquidity pools', 'lp'],
        description: 'Liquidity management'
    },
    {
        id: 'finance-ledger',
        sectorMode: AppMode.AUTONOMOUS_FINANCE,
        sectorLabel: 'Treasury',
        tabKey: 'LEDGER',
        tabLabel: 'Ledger',
        aliases: ['ledger', 'transactions', 'history', 'records'],
        description: 'Transaction ledger'
    },

    // =========================================================================
    // CPB_TEST (Cognitive Precision Bridge)
    // =========================================================================
    {
        id: 'cpb-direct',
        sectorMode: AppMode.CPB_TEST,
        sectorLabel: 'CPB',
        tabKey: 'direct',
        tabLabel: 'Direct',
        aliases: ['direct', 'fast', 'single pass'],
        description: 'Fast single-pass execution'
    },
    {
        id: 'cpb-rlm',
        sectorMode: AppMode.CPB_TEST,
        sectorLabel: 'CPB',
        tabKey: 'rlm',
        tabLabel: 'RLM',
        aliases: ['rlm', 'long range', 'memory context'],
        description: 'Long-range memory context'
    },
    {
        id: 'cpb-ace',
        sectorMode: AppMode.CPB_TEST,
        sectorLabel: 'CPB',
        tabKey: 'ace',
        tabLabel: 'ACE',
        aliases: ['ace', 'consensus', 'multi agent'],
        description: 'Multi-agent consensus'
    },
    {
        id: 'cpb-hybrid',
        sectorMode: AppMode.CPB_TEST,
        sectorLabel: 'CPB',
        tabKey: 'hybrid',
        tabLabel: 'Hybrid',
        aliases: ['hybrid', 'combined', 'rlm ace'],
        description: 'RLM + ACE hybrid mode'
    },
    {
        id: 'cpb-cascade',
        sectorMode: AppMode.CPB_TEST,
        sectorLabel: 'CPB',
        tabKey: 'cascade',
        tabLabel: 'Cascade',
        aliases: ['cascade', 'full verification', 'pipeline', 'cascading'],
        description: 'Full cascade verification pipeline'
    },
    {
        id: 'cpb-auto',
        sectorMode: AppMode.CPB_TEST,
        sectorLabel: 'CPB',
        tabKey: 'auto',
        tabLabel: 'Auto',
        aliases: ['auto', 'automatic', 'smart'],
        description: 'Automatic path selection'
    },

    // =========================================================================
    // ARCHON
    // =========================================================================
    {
        id: 'archon-main',
        sectorMode: AppMode.ARCHON,
        sectorLabel: 'Archon',
        tabKey: 'main',
        tabLabel: 'Command Center',
        aliases: ['archon', 'god mode', 'command', 'orchestrator', 'meta'],
        description: 'Meta-orchestrator command center'
    },

    // =========================================================================
    // SYNTHESIS_BRIDGE
    // =========================================================================
    {
        id: 'synthesis-main',
        sectorMode: AppMode.SYNTHESIS_BRIDGE,
        sectorLabel: 'Synthesis',
        tabKey: 'main',
        tabLabel: 'Bridge',
        aliases: ['synthesis', 'bridge', 'synthesis bridge', 'integration'],
        description: 'Cross-system synthesis bridge'
    },

    // =========================================================================
    // PROCESS_MAP (Topology)
    // =========================================================================
    {
        id: 'topology-living',
        sectorMode: AppMode.PROCESS_MAP,
        sectorLabel: 'Topology',
        tabKey: 'living_map',
        tabLabel: 'Living Map',
        aliases: ['living map', 'process', 'workflow', 'diagram', 'flow'],
        storeKey: 'process.activeTab',
        description: 'Process workflow diagram'
    },

    // =========================================================================
    // DASHBOARD
    // =========================================================================
    {
        id: 'dashboard-main',
        sectorMode: AppMode.DASHBOARD,
        sectorLabel: 'Dashboard',
        tabKey: 'main',
        tabLabel: 'Ecosystem',
        aliases: ['dashboard', 'home', 'ecosystem', 'main', 'start'],
        description: 'Main ecosystem dashboard'
    },

    // =========================================================================
    // METAVENTIONS_HUB
    // =========================================================================
    {
        id: 'hub-main',
        sectorMode: AppMode.METAVENTIONS_HUB,
        sectorLabel: 'Hub',
        tabKey: 'main',
        tabLabel: 'Metaventions',
        aliases: ['hub', 'metaventions', 'inventions', 'ideas'],
        description: 'Innovation and invention hub'
    },

    // =========================================================================
    // VOICE_MODE
    // =========================================================================
    {
        id: 'voice-main',
        sectorMode: AppMode.VOICE_MODE,
        sectorLabel: 'Voice',
        tabKey: 'main',
        tabLabel: 'Voice Core',
        aliases: ['voice', 'voice core', 'speak', 'audio'],
        description: 'Voice control interface'
    }
];

// =============================================================================
// Sector Route Map
// =============================================================================

const SECTOR_ROUTES: Record<AppMode | 'NEXUS', string> = {
    [AppMode.DASHBOARD]: '/dashboard',
    [AppMode.METAVENTIONS_HUB]: '/metaventions-hub',
    [AppMode.BIBLIOMORPHIC]: '/bibliomorphic',
    [AppMode.PROCESS_MAP]: '/process',
    [AppMode.MEMORY_CORE]: '/memory',
    [AppMode.IMAGE_GEN]: '/assets',
    [AppMode.HARDWARE_ENGINEER]: '/hardware',
    [AppMode.CODE_STUDIO]: '/code',
    [AppMode.VOICE_MODE]: '/voice',
    [AppMode.SYNTHESIS_BRIDGE]: '/bridge',
    [AppMode.BICAMERAL]: '/bibliomorphic/bicameral',
    [AppMode.AGENT_CONTROL]: '/agents',
    [AppMode.AUTONOMOUS_FINANCE]: '/finance',
    [AppMode.AGENT_CORE_TEST]: '/agent-core-test',
    [AppMode.CPB_TEST]: '/cpb-test',
    [AppMode.ARCHON]: '/archon',
    [AppMode.META_LEARNING]: '/meta-learning',
    'NEXUS': '/nexus'
};

// =============================================================================
// Navigation Functions
// =============================================================================

/**
 * Find the best matching tab for a query
 */
export function findTab(query: string): TabDefinition | null {
    const q = query.toLowerCase().trim();

    // Exact ID match
    const exactId = TAB_REGISTRY.find(t => t.id === q);
    if (exactId) return exactId;

    // Exact tab key match
    const exactKey = TAB_REGISTRY.find(t => t.tabKey.toLowerCase() === q);
    if (exactKey) return exactKey;

    // Exact alias match
    for (const tab of TAB_REGISTRY) {
        if (tab.aliases.some(a => a === q)) {
            return tab;
        }
    }

    // Partial alias match (whole word)
    for (const tab of TAB_REGISTRY) {
        if (tab.aliases.some(a => a.includes(q) || q.includes(a))) {
            return tab;
        }
    }

    // Label contains query
    const labelMatch = TAB_REGISTRY.find(t =>
        t.tabLabel.toLowerCase().includes(q) ||
        t.sectorLabel.toLowerCase().includes(q)
    );
    if (labelMatch) return labelMatch;

    return null;
}

/**
 * Find tabs in a specific sector
 */
export function findTabsInSector(sector: AppMode | 'NEXUS'): TabDefinition[] {
    return TAB_REGISTRY.filter(t => t.sectorMode === sector);
}

/**
 * Parse a navigation query and return full navigation result
 */
export function parseTabNavigation(query: string): TabNavigationResult {
    const q = query.toLowerCase().trim()
        .replace(/^(go to|navigate to|open|show|take me to|switch to)\s+/i, '')
        .replace(/\s+(tab|view|mode|panel)$/i, '')
        .trim();

    // Check for "X tab in Y" or "Y's X tab" patterns
    const inPattern = q.match(/(.+?)\s+(?:tab\s+)?in\s+(.+)/i);
    const possessivePattern = q.match(/(.+?)'s\s+(.+)/i);

    let tabQuery = q;
    let sectorHint: string | null = null;

    if (inPattern) {
        tabQuery = inPattern[1].trim();
        sectorHint = inPattern[2].trim();
    } else if (possessivePattern) {
        sectorHint = possessivePattern[1].trim();
        tabQuery = possessivePattern[2].trim();
    }

    // Find matching tab
    let matchedTab = findTab(tabQuery);

    // If we have a sector hint, try to find tab within that sector
    if (sectorHint && !matchedTab) {
        const sectorTab = TAB_REGISTRY.find(t =>
            (t.sectorLabel.toLowerCase().includes(sectorHint!) ||
                t.sectorMode.toString().toLowerCase().includes(sectorHint!)) &&
            t.aliases.some(a => a.includes(tabQuery) || tabQuery.includes(a))
        );
        if (sectorTab) matchedTab = sectorTab;
    }

    // Check for subtab
    let subtabMatch: SubtabDefinition | undefined;
    if (matchedTab?.subtabs) {
        for (const subtab of matchedTab.subtabs) {
            if (subtab.aliases.some(a => q.includes(a))) {
                subtabMatch = subtab;
                break;
            }
        }
    }

    if (matchedTab) {
        return {
            success: true,
            sector: matchedTab.sectorMode,
            sectorLabel: matchedTab.sectorLabel,
            tab: matchedTab.tabKey,
            tabLabel: matchedTab.tabLabel,
            subtab: subtabMatch?.key,
            subtabLabel: subtabMatch?.label,
            route: SECTOR_ROUTES[matchedTab.sectorMode]
        };
    }

    // Find suggestions
    const suggestions = TAB_REGISTRY
        .filter(t => t.tabLabel.toLowerCase().includes(q.slice(0, 3)) ||
            t.aliases.some(a => a.includes(q.slice(0, 3))))
        .slice(0, 5)
        .map(t => `${t.sectorLabel} > ${t.tabLabel}`);

    return {
        success: false,
        error: `Could not find tab matching "${query}"`,
        suggestions: suggestions.length > 0 ? suggestions : undefined
    };
}

/**
 * Navigate to a specific tab
 */
export function navigateToTab(query: string): TabNavigationResult {
    const result = parseTabNavigation(query);

    if (!result.success) {
        return result;
    }

    const { setMode, setBibliomorphicState, setCodeStudioState, setProcessState } = useAppStore.getState().actions;

    // Set the sector mode
    if (result.sector && result.sector !== 'NEXUS') {
        setMode(result.sector as AppMode);
    }

    // Set the route
    if (result.route) {
        window.location.hash = result.route;
    }

    // Set the tab state in the appropriate store
    if (result.tab) {
        switch (result.sector) {
            case AppMode.BIBLIOMORPHIC:
                setBibliomorphicState?.({ activeTab: result.tab });
                break;
            case AppMode.CODE_STUDIO:
                setCodeStudioState?.({ activeTab: result.tab as 'IDE' | 'ACTIONS' });
                break;
            case AppMode.PROCESS_MAP:
                setProcessState?.({ activeTab: result.tab });
                break;
            // For components with local state, we dispatch a custom event
            default:
                window.dispatchEvent(new CustomEvent('voice-tab-change', {
                    detail: {
                        sector: result.sector,
                        tab: result.tab,
                        subtab: result.subtab
                    }
                }));
        }

        // SYNCHRONIZED CLOCK: Trigger epoch update for tab changes
        // This ensures voice context stays fresh when tabs change
        try {
            const systemMind = useSystemMind.getState();
            systemMind.uplinkData('tab_change', {
                sector: result.sector,
                tab: result.tab,
                subtab: result.subtab,
                timestamp: Date.now()
            });
        } catch (e) {
            // SystemMind may not be available during early initialization
        }
    }

    return result;
}

/**
 * Generate context for AI about available tabs
 */
export function generateTabContext(currentSector?: AppMode | 'NEXUS'): string {
    const sectors = new Map<string, TabDefinition[]>();

    for (const tab of TAB_REGISTRY) {
        const key = tab.sectorLabel;
        if (!sectors.has(key)) {
            sectors.set(key, []);
        }
        sectors.get(key)!.push(tab);
    }

    let context = '=== TAB NAVIGATION ===\n\n';

    if (currentSector) {
        const currentTabs = findTabsInSector(currentSector);
        if (currentTabs.length > 0) {
            context += `CURRENT SECTOR (${currentTabs[0].sectorLabel}):\n`;
            for (const tab of currentTabs) {
                context += `  • "${tab.tabLabel}" (aliases: ${tab.aliases.slice(0, 3).join(', ')})\n`;
                if (tab.subtabs) {
                    context += `    Subtabs: ${tab.subtabs.map(s => s.label).join(', ')}\n`;
                }
            }
            context += '\n';
        }
    }

    context += 'ALL SECTORS:\n';
    for (const [sectorLabel, tabs] of sectors) {
        context += `• ${sectorLabel}: ${tabs.map(t => t.tabLabel).join(', ')}\n`;
    }

    context += '\nUSAGE: "go to [sector] [tab]" or "open the [tab] tab"\n';
    context += 'EXAMPLES:\n';
    context += '  • "go to nexus" → Opens Nexus Matrix\n';
    context += '  • "go to cascade in CPB" → Opens CPB with Cascade tab\n';
    context += '  • "open the DNA tab" → Opens Research > DNA Builder\n';

    return context;
}

/**
 * Get all unique sector names
 */
export function getAllSectors(): string[] {
    return [...new Set(TAB_REGISTRY.map(t => t.sectorLabel))];
}

/**
 * Get tab by exact ID
 */
export function getTabById(id: string): TabDefinition | undefined {
    return TAB_REGISTRY.find(t => t.id === id);
}

// =============================================================================
// Export for debugging
// =============================================================================

if (typeof window !== 'undefined') {
    (window as any).__tabRegistry = {
        all: TAB_REGISTRY,
        find: findTab,
        parse: parseTabNavigation,
        navigate: navigateToTab,
        context: generateTabContext,
        sectors: getAllSectors
    };
}
