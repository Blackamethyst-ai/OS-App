/**
 * Sector Definitions
 *
 * Centralized sector configuration for the capability system
 */

import type { AppMode } from '../types';

export interface SectorDefinition {
  mode: AppMode;
  label: string;
  description: string;
  icon?: string;
  aliases: string[];
  defaultTab?: string;
  capabilities: string[]; // Capability categories available in this sector
}

/**
 * All sector definitions
 */
export const SECTOR_DEFINITIONS: SectorDefinition[] = [
  {
    mode: 'DASHBOARD',
    label: 'Dashboard',
    description: 'Main dashboard and overview',
    aliases: ['home', 'main', 'overview'],
    defaultTab: 'overview',
    capabilities: ['navigation', 'ui', 'analyze'],
  },
  {
    mode: 'METAVENTIONS_HUB',
    label: 'Metaventions Hub',
    description: 'Central hub for all metaventions',
    aliases: ['hub', 'metaventions', 'central'],
    defaultTab: 'hub',
    capabilities: ['navigation', 'ui', 'manage'],
  },
  {
    mode: 'NEXUS',
    label: 'Nexus',
    description: 'Cloud, AI, and data services integration',
    aliases: ['cloud', 'services', 'integrations'],
    defaultTab: 'ALL',
    capabilities: ['navigation', 'execute', 'manage', 'deploy'],
  },
  {
    mode: 'BIBLIOMORPHIC',
    label: 'Research',
    description: 'Research and knowledge discovery',
    aliases: ['research', 'library', 'knowledge', 'discovery'],
    defaultTab: 'Discovery',
    capabilities: ['navigation', 'search', 'analyze', 'generate'],
  },
  {
    mode: 'CODE_STUDIO',
    label: 'Logic',
    description: 'Code development and actions',
    aliases: ['code', 'logic', 'ide', 'development'],
    defaultTab: 'IDE',
    capabilities: ['navigation', 'generate', 'execute', 'analyze'],
  },
  {
    mode: 'IMAGE_GEN',
    label: 'Cinema',
    description: 'Image and video generation',
    aliases: ['cinema', 'images', 'video', 'media', 'creative'],
    defaultTab: 'SINGLE',
    capabilities: ['navigation', 'generate', 'ui'],
  },
  {
    mode: 'HARDWARE_ENGINEER',
    label: 'Hardware',
    description: 'Hardware design and engineering',
    aliases: ['hardware', 'engineering', 'design', '3d'],
    defaultTab: '2D',
    capabilities: ['navigation', 'generate', 'analyze', 'deploy'],
  },
  {
    mode: 'MEMORY_CORE',
    label: 'Memory',
    description: 'Memory management and visualization',
    aliases: ['memory', 'storage', 'data'],
    defaultTab: 'GRID',
    capabilities: ['navigation', 'search', 'analyze', 'manage'],
  },
  {
    mode: 'AGENT_CONTROL',
    label: 'Swarm',
    description: 'Multi-agent orchestration',
    aliases: ['swarm', 'agents', 'control', 'orchestration'],
    defaultTab: 'MEMORY',
    capabilities: ['navigation', 'execute', 'manage', 'analyze'],
  },
  {
    mode: 'AUTONOMOUS_FINANCE',
    label: 'Treasury',
    description: 'Financial operations and yield management',
    aliases: ['treasury', 'finance', 'yield', 'defi'],
    defaultTab: 'OVERVIEW',
    capabilities: ['navigation', 'analyze', 'execute', 'manage'],
  },
  {
    mode: 'CPB_TEST',
    label: 'CPB Test',
    description: 'Cognitive Precision Bridge testing',
    aliases: ['cpb', 'test', 'precision'],
    defaultTab: 'DIRECT',
    capabilities: ['navigation', 'execute', 'analyze'],
  },
  {
    mode: 'ARCHON',
    label: 'Archon',
    description: 'System-level command center',
    aliases: ['archon', 'command', 'system'],
    defaultTab: 'Command Center',
    capabilities: ['navigation', 'execute', 'manage', 'deploy'],
  },
  {
    mode: 'SYNTHESIS_BRIDGE',
    label: 'Synthesis',
    description: 'Cross-system synthesis',
    aliases: ['synthesis', 'bridge', 'integration'],
    defaultTab: 'Bridge',
    capabilities: ['navigation', 'analyze', 'generate'],
  },
  {
    mode: 'PROCESS_MAP',
    label: 'Topology',
    description: 'Process visualization and mapping',
    aliases: ['topology', 'process', 'map', 'flow'],
    defaultTab: 'Living Map',
    capabilities: ['navigation', 'analyze', 'ui'],
  },
  {
    mode: 'VOICE_MODE',
    label: 'Voice',
    description: 'Voice interaction mode',
    aliases: ['voice', 'speak', 'talk'],
    defaultTab: 'voice',
    capabilities: ['navigation', 'execute', 'ui'],
  },
];

/**
 * Get sector by mode
 */
export function getSector(mode: AppMode): SectorDefinition | undefined {
  return SECTOR_DEFINITIONS.find((s) => s.mode === mode);
}

/**
 * Get sector by alias
 */
export function getSectorByAlias(alias: string): SectorDefinition | undefined {
  const normalized = alias.toLowerCase();
  return SECTOR_DEFINITIONS.find(
    (s) =>
      s.mode.toLowerCase() === normalized ||
      s.label.toLowerCase() === normalized ||
      s.aliases.includes(normalized)
  );
}

/**
 * Get all sector modes
 */
export function getAllSectorModes(): AppMode[] {
  return SECTOR_DEFINITIONS.map((s) => s.mode);
}

/**
 * Check if a sector supports a capability category
 */
export function sectorSupportsCapability(mode: AppMode, category: string): boolean {
  const sector = getSector(mode);
  return sector?.capabilities.includes(category) ?? false;
}
