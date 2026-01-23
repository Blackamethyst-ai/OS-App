/**
 * SECTOR MAPPING
 *
 * Maps components to their relevant AppMode sectors.
 * Part of the synchronized clock - actions know WHERE they belong.
 */

import { AppMode } from '../../types';

// =============================================================================
// Component to Sector Mapping
// =============================================================================

/**
 * Maps component names to their relevant AppMode sectors.
 * Empty array means the component is global (available everywhere).
 */
export const COMPONENT_TO_SECTORS: Record<string, string[]> = {
    // Image Generation
    'ImageGen': ['IMAGE_GEN', 'ASSETS'],

    // Code & Development
    'CodeStudio': ['CODE_STUDIO', 'CODE'],

    // Agent Systems
    'ArchonDashboard': ['ARCHON'],
    'AgentControlCenter': ['AGENT_CONTROL', 'AGENTS'],

    // Memory & Knowledge
    'MemoryCore': ['MEMORY_CORE', 'MEMORY'],
    'KnowledgeGraph': ['PROCESS_MAP', 'KNOWLEDGE'],

    // Research & Discovery
    'BicameralEngine': ['BICAMERAL', 'BIBLIOMORPHIC'],
    'DiscoveryLab': ['BIBLIOMORPHIC', 'DISCOVERY'],
    'Evolution': ['BIBLIOMORPHIC', 'EVOLUTION'],
    'Agora': ['BIBLIOMORPHIC', 'AGORA'],
    'BibliomorphicEngine': ['BIBLIOMORPHIC'],

    // Finance
    'AutonomousFinance': ['AUTONOMOUS_FINANCE', 'FINANCE'],

    // Hardware
    'HardwareEngine': ['HARDWARE_ENGINEER', 'HARDWARE'],

    // Process & Visualization
    'ProcessVisualizer': ['PROCESS_MAP', 'PROCESS'],

    // Dashboard & Hub
    'Dashboard': ['DASHBOARD'],
    'Hub': ['METAVENTIONS_HUB', 'HUB'],

    // Voice & Synthesis
    'VoiceMode': ['VOICE_MODE', 'VOICE'],
    'SynthesisBridge': ['SYNTHESIS_BRIDGE', 'BRIDGE'],

    // CPB Testing
    'CPB': ['CPB_TEST', 'CPB'],

    // Global Components (available everywhere)
    'CommandPalette': [],
    'Search': [],
    'UI': [],
};

/**
 * Get the relevant sectors for a component.
 * Empty array means the action is global (available everywhere).
 */
export function getSectorsForComponent(component: string): string[] {
    return COMPONENT_TO_SECTORS[component] || [];
}

// =============================================================================
// Sector Aliases for Voice Navigation
// =============================================================================

/**
 * Maps natural language sector names to AppMode enums.
 * Used for voice navigation commands.
 */
export const SECTOR_ALIASES: Record<string, AppMode> = {
    // Dashboard
    'DASHBOARD': AppMode.DASHBOARD,
    'ECOSYSTEM': AppMode.DASHBOARD,
    'HOME': AppMode.DASHBOARD,

    // Metaventions Hub
    'HUB': AppMode.METAVENTIONS_HUB,
    'METAVENTIONS': AppMode.METAVENTIONS_HUB,

    // Research
    'RESEARCH': AppMode.BIBLIOMORPHIC,
    'LAB': AppMode.BIBLIOMORPHIC,
    'BIBLIOMORPHIC': AppMode.BIBLIOMORPHIC,

    // Process Map
    'TOPOLOGY': AppMode.PROCESS_MAP,
    'PROCESS': AppMode.PROCESS_MAP,
    'DIAGRAM': AppMode.PROCESS_MAP,

    // Memory
    'MEMORY': AppMode.MEMORY_CORE,
    'VAULT': AppMode.MEMORY_CORE,

    // Image Generation
    'CINEMA': AppMode.IMAGE_GEN,
    'IMAGE': AppMode.IMAGE_GEN,
    'IMAGES': AppMode.IMAGE_GEN,

    // Hardware
    'HARDWARE': AppMode.HARDWARE_ENGINEER,
    'INFRA': AppMode.HARDWARE_ENGINEER,

    // Code Studio
    'CODE': AppMode.CODE_STUDIO,
    'LOGIC': AppMode.CODE_STUDIO,

    // Voice
    'VOICE': AppMode.VOICE_MODE,

    // Synthesis Bridge
    'BRIDGE': AppMode.SYNTHESIS_BRIDGE,
    'SYNTHESIS': AppMode.SYNTHESIS_BRIDGE,

    // Bicameral
    'BICAMERAL': AppMode.BICAMERAL,
    'DEBATE': AppMode.BICAMERAL,

    // Agents
    'SWARM': AppMode.AGENT_CONTROL,
    'AGENTS': AppMode.AGENT_CONTROL,

    // Finance
    'FINANCE': AppMode.AUTONOMOUS_FINANCE,
    'TREASURY': AppMode.AUTONOMOUS_FINANCE,

    // Archon
    'ARCHON': AppMode.ARCHON,
    'GOD': AppMode.ARCHON,
};

/**
 * Resolve a sector name (from voice input) to an AppMode.
 * Returns undefined if no match found.
 */
export function resolveSecator(input: string): AppMode | undefined {
    const normalized = input.toUpperCase().trim();
    return SECTOR_ALIASES[normalized];
}

/**
 * Get all available sector aliases.
 */
export function getAvailableSectors(): string[] {
    return Object.keys(SECTOR_ALIASES);
}

// =============================================================================
// Sector Relationship Analysis
// =============================================================================

/**
 * Check if two sectors are related.
 * Used for cross-sector action suggestions.
 */
export function areSectorsRelated(sector1: string, sector2: string): boolean {
    // Same sector
    if (sector1 === sector2) return true;

    // Check if one contains the other
    if (sector1.includes(sector2) || sector2.includes(sector1)) return true;

    // Define related sector groups
    const relatedGroups: string[][] = [
        ['BIBLIOMORPHIC', 'DISCOVERY', 'EVOLUTION', 'AGORA'],
        ['MEMORY', 'MEMORY_CORE', 'KNOWLEDGE'],
        ['CODE', 'CODE_STUDIO'],
        ['AGENTS', 'AGENT_CONTROL', 'ARCHON'],
        ['PROCESS', 'PROCESS_MAP', 'TOPOLOGY'],
    ];

    for (const group of relatedGroups) {
        if (group.includes(sector1) && group.includes(sector2)) {
            return true;
        }
    }

    return false;
}
