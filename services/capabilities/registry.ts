/**
 * Unified Capability Registry
 *
 * Consolidates all capability sources into a single registry:
 * - TAB_REGISTRY (tabs/navigation)
 * - Unified Action Registry (actions)
 * - Dynamic Tool Registry (dynamic tools)
 * - Voice/Component actions (legacy)
 */

import type {
  Capability,
  CapabilityKind,
  CapabilitySource,
  CapabilityComplexity,
  CapabilityMatch,
  CapabilitySearchOptions,
  RegistryState,
  RegistryStats,
  AppMode,
  GeminiManifest,
  VoiceContext,
  CPBPath,
} from './types';
import { complexityToCPBPath } from './types';

// ============================================================================
// Registry State
// ============================================================================

const state: RegistryState = {
  capabilities: new Map(),
  initialized: false,
  lastUpdate: 0,
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register a single capability
 */
export function registerCapability(capability: Capability): void {
  // Validate required fields
  if (!capability.id || !capability.description || !capability.handler) {
    console.warn(`[CapabilityRegistry] Invalid capability: missing required fields`, capability.id);
    return;
  }

  // Auto-derive execution path if not specified
  if (capability.executionPath === 'auto' || !capability.executionPath) {
    capability.executionPath = complexityToCPBPath(capability.complexity);
  }

  state.capabilities.set(capability.id, capability);
  state.lastUpdate = Date.now();
}

/**
 * Register multiple capabilities
 */
export function registerCapabilities(capabilities: Capability[]): void {
  for (const cap of capabilities) {
    registerCapability(cap);
  }
}

/**
 * Unregister a capability by ID
 */
export function unregisterCapability(id: string): boolean {
  const result = state.capabilities.delete(id);
  if (result) {
    state.lastUpdate = Date.now();
  }
  return result;
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Get a capability by ID
 */
export function getCapability(id: string): Capability | undefined {
  return state.capabilities.get(id);
}

/**
 * Get all capabilities
 */
export function getAllCapabilities(): Capability[] {
  return Array.from(state.capabilities.values());
}

/**
 * Get capabilities filtered by options
 */
export function getCapabilities(options: CapabilitySearchOptions = {}): Capability[] {
  let result = getAllCapabilities();

  // Filter by kind
  if (options.kind) {
    result = result.filter((c) => c.kind === options.kind);
  }

  // Filter by source
  if (options.source) {
    result = result.filter((c) => c.source === options.source);
  }

  // Filter by complexity
  if (options.complexity) {
    result = result.filter((c) => c.complexity === options.complexity);
  }

  // Filter by sector (include global capabilities)
  if (options.sector) {
    result = result.filter((c) => {
      const isGlobal = c.sectors.length === 0;
      const matchesSector = c.sectors.includes(options.sector!);
      return options.includeGlobal !== false ? isGlobal || matchesSector : matchesSector;
    });
  }

  // Sort by priority (higher first)
  result.sort((a, b) => b.priority - a.priority);

  // Apply limit
  if (options.limit && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Get capabilities by kind
 */
export function getCapabilitiesByKind(kind: CapabilityKind): Capability[] {
  return getCapabilities({ kind });
}

/**
 * Get capabilities by source
 */
export function getCapabilitiesBySource(source: CapabilitySource): Capability[] {
  return getCapabilities({ source });
}

/**
 * Get capabilities for a sector with relevance scoring
 */
export function getCapabilitiesForSector(sector: AppMode): Capability[] {
  const capabilities = getAllCapabilities();

  // Score each capability for this sector
  const scored = capabilities.map((cap) => {
    let score = cap.priority;

    // Global capabilities get base priority
    if (cap.sectors.length === 0) {
      score += 5;
    }
    // Sector-specific match gets bonus
    else if (cap.sectors.includes(sector)) {
      score += 30;
    }
    // Non-relevant sectors get penalty
    else {
      score -= 20;
    }

    return { capability: cap, score };
  });

  // Filter out low-relevance and sort by score
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.capability);
}

// ============================================================================
// Search
// ============================================================================

/**
 * Fuzzy search capabilities by query
 */
export function searchCapabilities(
  query: string,
  options: CapabilitySearchOptions = {}
): CapabilityMatch[] {
  const normalizedQuery = query.toLowerCase().trim();
  const capabilities = getCapabilities(options);
  const matches: CapabilityMatch[] = [];

  for (const cap of capabilities) {
    let score = 0;
    let matchedOn: CapabilityMatch['matchedOn'] = 'description';

    // Exact ID match
    if (cap.id.toLowerCase() === normalizedQuery) {
      score = 100;
      matchedOn = 'id';
    }
    // ID contains query
    else if (cap.id.toLowerCase().includes(normalizedQuery)) {
      score = 80;
      matchedOn = 'id';
    }
    // Alias match
    else if (cap.aliases?.some((a) => a.toLowerCase().includes(normalizedQuery))) {
      score = 75;
      matchedOn = 'alias';
    }
    // Description match
    else if (cap.description.toLowerCase().includes(normalizedQuery)) {
      score = 50;
      matchedOn = 'description';
    }
    // Example match
    else if (cap.examples?.some((e) => e.toLowerCase().includes(normalizedQuery))) {
      score = 40;
      matchedOn = 'example';
    }

    if (score > 0) {
      // Boost by priority
      score += cap.priority / 10;
      matches.push({ capability: cap, score, matchedOn });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Apply limit
  if (options.limit && options.limit > 0) {
    return matches.slice(0, options.limit);
  }

  return matches;
}

/**
 * Find best matching capability for a query
 */
export function findCapability(
  query: string,
  options: CapabilitySearchOptions = {}
): Capability | undefined {
  const matches = searchCapabilities(query, { ...options, limit: 1 });
  return matches[0]?.capability;
}

// ============================================================================
// Execution
// ============================================================================

/**
 * Execute a capability by ID
 */
export async function executeCapability(
  id: string,
  args: Record<string, unknown> = {}
): Promise<{ success: boolean; result?: unknown; error?: string; timing?: number }> {
  const capability = getCapability(id);

  if (!capability) {
    return { success: false, error: `Capability not found: ${id}` };
  }

  const startTime = performance.now();

  try {
    const result = await capability.handler(args);
    const timing = performance.now() - startTime;

    return {
      success: result.success !== false,
      result,
      timing,
    };
  } catch (error) {
    const timing = performance.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timing,
    };
  }
}

/**
 * Route a query to the appropriate CPB path
 */
export function routeQuery(
  query: string,
  context?: { sector?: AppMode }
): { path: CPBPath; capability?: Capability } {
  const match = findCapability(query, { sector: context?.sector });

  if (!match) {
    return { path: 'auto' };
  }

  return {
    path: match.executionPath,
    capability: match,
  };
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get registry statistics
 */
export function getStats(): RegistryStats {
  const capabilities = getAllCapabilities();

  const stats: RegistryStats = {
    total: capabilities.length,
    byKind: { action: 0, navigation: 0, tool: 0, tab: 0 },
    bySource: { core: 0, sovereign: 0, dynamic: 0, component: 0, voice: 0, tab: 0 },
    byComplexity: { simple: 0, navigation: 0, analysis: 0, architecture: 0, critical: 0 },
    bySector: {},
  };

  for (const cap of capabilities) {
    stats.byKind[cap.kind]++;
    stats.bySource[cap.source]++;
    stats.byComplexity[cap.complexity]++;

    for (const sector of cap.sectors) {
      stats.bySector[sector] = (stats.bySector[sector] || 0) + 1;
    }
  }

  return stats;
}

// ============================================================================
// Gemini Integration
// ============================================================================

/**
 * Generate Gemini function declarations for all capabilities
 */
export function getGeminiManifests(options?: { sector?: AppMode }): GeminiManifest[] {
  const capabilities = options?.sector
    ? getCapabilitiesForSector(options.sector)
    : getAllCapabilities();

  return capabilities
    .filter((cap) => cap.schema) // Only capabilities with schemas
    .map((cap) => ({
      name: cap.id,
      description: cap.description,
      parameters: cap.schema
        ? {
            type: 'object',
            properties: cap.schema.properties || {},
            required: cap.schema.required || [],
          }
        : undefined,
    }));
}

// ============================================================================
// Voice Context
// ============================================================================

/**
 * Generate voice context for a sector
 */
export function generateVoiceContext(sector: AppMode): VoiceContext {
  const capabilities = getCapabilitiesForSector(sector);

  const groupedByComplexity: Record<CapabilityComplexity, string[]> = {
    simple: [],
    navigation: [],
    analysis: [],
    architecture: [],
    critical: [],
  };

  const capabilitySummaries = capabilities.map((cap) => {
    groupedByComplexity[cap.complexity].push(cap.id);

    return {
      id: cap.id,
      description: cap.description,
      examples: cap.examples || [],
      complexity: cap.complexity,
    };
  });

  return {
    sector,
    capabilities: capabilitySummaries,
    groupedByComplexity,
  };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Check if registry is initialized
 */
export function isInitialized(): boolean {
  return state.initialized;
}

/**
 * Mark registry as initialized
 */
export function markInitialized(): void {
  state.initialized = true;
  state.lastUpdate = Date.now();
}

/**
 * Clear all capabilities (for testing)
 */
export function clearRegistry(): void {
  state.capabilities.clear();
  state.initialized = false;
  state.lastUpdate = Date.now();
}

/**
 * Get registry state info
 */
export function getRegistryInfo(): { initialized: boolean; count: number; lastUpdate: number } {
  return {
    initialized: state.initialized,
    count: state.capabilities.size,
    lastUpdate: state.lastUpdate,
  };
}
