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
import { useSystemMind } from '../../stores/useSystemMind';

// ============================================================================
// Registry State
// ============================================================================

const state: RegistryState = {
  capabilities: new Map(),
  initialized: false,
  lastUpdate: 0,
};

// ============================================================================
// Manifest Cache (US-011)
// ============================================================================

interface ManifestCache {
  manifests: GeminiManifest[];
  version: number;
  generatedAt: number;
}

let manifestCache: ManifestCache | null = null;
let registryVersion: number = 0;

// ============================================================================
// Registration
// ============================================================================

/**
 * Register a single capability
 *
 * Triggers SystemMind epoch update to notify voice components
 * of capability changes (US-001)
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

  // Invalidate manifest cache (US-011)
  registryVersion++;
  manifestCache = null;

  // Trigger SystemMind epoch update for voice context synchronization
  const systemMind = useSystemMind.getState();
  systemMind.registerAction(
    capability.id,
    `[${capability.source.toUpperCase()}:${capability.complexity}] ${capability.description}`,
    capability.handler as (args: unknown) => void | Promise<void>,
    { sectors: capability.sectors, priority: capability.priority }
  );
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
 *
 * Triggers SystemMind epoch update to notify voice components
 * of capability removal (US-001)
 */
export function unregisterCapability(id: string): boolean {
  const result = state.capabilities.delete(id);
  if (result) {
    state.lastUpdate = Date.now();

    // Invalidate manifest cache (US-011)
    registryVersion++;
    manifestCache = null;

    // Trigger SystemMind epoch update for voice context synchronization
    const systemMind = useSystemMind.getState();
    systemMind.unregisterAction(id);
  }
  return result;
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Retrieves a single capability from the registry by its unique identifier.
 *
 * This function performs a direct lookup in the capability registry's internal Map,
 * providing O(1) access time. Use this when you know the exact capability ID.
 *
 * @param id - The unique identifier of the capability to retrieve (e.g., 'navigate_sector', 'ui_toggle_theme')
 * @returns The matching Capability object if found, or undefined if no capability exists with the given ID
 *
 * @example
 * // Retrieve a specific capability
 * const capability = getCapability('navigate_sector');
 * if (capability) {
 *   console.log(`Found: ${capability.description}`);
 *   console.log(`Complexity: ${capability.complexity}`);
 * }
 *
 * @example
 * // Check if a capability exists before execution
 * const cap = getCapability('ui_toggle_theme');
 * if (cap) {
 *   await cap.handler({ theme: 'MIDNIGHT' });
 * }
 */
export function getCapability(id: string): Capability | undefined {
  return state.capabilities.get(id);
}

/**
 * Retrieves all capabilities currently registered in the registry.
 *
 * Returns a new array containing all capability objects, allowing safe iteration
 * and manipulation without affecting the underlying registry state. This is useful
 * for bulk operations, statistics gathering, or UI components that need to display
 * all available capabilities.
 *
 * @returns An array of all registered Capability objects. Returns an empty array if no capabilities are registered.
 *
 * @example
 * // Get all capabilities and log their IDs
 * const allCaps = getAllCapabilities();
 * console.log(`Total capabilities: ${allCaps.length}`);
 * allCaps.forEach(cap => console.log(`- ${cap.id}: ${cap.description}`));
 *
 * @example
 * // Filter capabilities by a custom criteria
 * const highPriorityCaps = getAllCapabilities().filter(cap => cap.priority > 50);
 *
 * @example
 * // Generate a capability summary for debugging
 * const summary = getAllCapabilities().map(cap => ({
 *   id: cap.id,
 *   kind: cap.kind,
 *   complexity: cap.complexity
 * }));
 */
export function getAllCapabilities(): Capability[] {
  return Array.from(state.capabilities.values());
}

/**
 * Retrieves capabilities filtered by various criteria and sorted by priority.
 *
 * This function provides flexible filtering across multiple dimensions including
 * kind, source, complexity, and sector. Results are always sorted by priority
 * (highest first) to ensure the most relevant capabilities appear at the top.
 *
 * When filtering by sector, global capabilities (those with empty sectors array)
 * are included by default unless `includeGlobal` is explicitly set to false.
 *
 * @param options - Optional search/filter criteria
 * @param options.kind - Filter by capability kind ('action', 'navigation', 'tool', 'tab')
 * @param options.source - Filter by capability source ('core', 'sovereign', 'dynamic', 'component', 'voice', 'tab')
 * @param options.complexity - Filter by complexity level ('simple', 'navigation', 'analysis', 'architecture', 'critical')
 * @param options.sector - Filter by app sector/mode; global capabilities included unless includeGlobal is false
 * @param options.includeGlobal - Whether to include global capabilities when filtering by sector (default: true)
 * @param options.limit - Maximum number of capabilities to return
 *
 * @returns An array of Capability objects matching the specified criteria, sorted by priority (descending)
 *
 * @example
 * // Get all navigation capabilities
 * const navCaps = getCapabilities({ kind: 'navigation' });
 *
 * @example
 * // Get simple actions for a specific sector, limited to top 10
 * const sectorCaps = getCapabilities({
 *   kind: 'action',
 *   complexity: 'simple',
 *   sector: 'dashboard',
 *   limit: 10
 * });
 *
 * @example
 * // Get only sector-specific capabilities (exclude globals)
 * const specificCaps = getCapabilities({
 *   sector: 'research',
 *   includeGlobal: false
 * });
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
 * Performs a fuzzy search across all capabilities using a text query.
 *
 * The search algorithm checks multiple fields in priority order:
 * 1. Exact ID match (score: 100)
 * 2. ID contains query (score: 80)
 * 3. Alias match (score: 75)
 * 4. Description contains query (score: 50)
 * 5. Example contains query (score: 40)
 *
 * Scores are boosted by the capability's priority (priority / 10) to surface
 * more important capabilities. Results are sorted by score in descending order.
 *
 * This function is ideal for implementing command palettes, voice command
 * resolution, or any search interface where users may not know exact capability IDs.
 *
 * @param query - The search query string (case-insensitive, trimmed automatically)
 * @param options - Optional filter criteria to narrow down the search scope
 * @param options.kind - Filter by capability kind before searching
 * @param options.source - Filter by capability source before searching
 * @param options.complexity - Filter by complexity level before searching
 * @param options.sector - Filter by app sector before searching
 * @param options.limit - Maximum number of matches to return
 *
 * @returns An array of CapabilityMatch objects containing the matched capability,
 *          its relevance score, and which field was matched on. Sorted by score (descending).
 *
 * @example
 * // Search for capabilities related to "theme"
 * const matches = searchCapabilities('theme');
 * matches.forEach(m => {
 *   console.log(`${m.capability.id} (score: ${m.score}, matched: ${m.matchedOn})`);
 * });
 *
 * @example
 * // Search within navigation capabilities only
 * const navMatches = searchCapabilities('dashboard', { kind: 'navigation', limit: 5 });
 *
 * @example
 * // Implement a command palette search
 * const handleSearch = (userInput: string) => {
 *   const results = searchCapabilities(userInput, { limit: 10 });
 *   return results.map(r => ({
 *     label: r.capability.description,
 *     value: r.capability.id,
 *     score: r.score
 *   }));
 * };
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
 * Finds the single best matching capability for a given query.
 *
 * This is a convenience wrapper around `searchCapabilities` that returns only
 * the top match. Useful when you need to resolve a user's intent to a specific
 * capability, such as in voice command processing or single-action triggers.
 *
 * The matching algorithm prioritizes exact ID matches, then partial ID matches,
 * aliases, description content, and finally examples. See `searchCapabilities`
 * for the full scoring breakdown.
 *
 * @param query - The search query string (case-insensitive)
 * @param options - Optional filter criteria to constrain the search
 * @param options.kind - Filter by capability kind
 * @param options.source - Filter by capability source
 * @param options.complexity - Filter by complexity level
 * @param options.sector - Filter by app sector
 *
 * @returns The best matching Capability object, or undefined if no matches found
 *
 * @example
 * // Find the best match for a voice command
 * const capability = findCapability('open settings');
 * if (capability) {
 *   await executeCapability(capability.id);
 * }
 *
 * @example
 * // Find within a specific sector context
 * const cap = findCapability('analyze', { sector: 'research' });
 *
 * @example
 * // Resolve user intent with fallback
 * const resolved = findCapability(userInput) ?? getCapability('default_action');
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
 * Executes a registered capability by its ID with the provided arguments.
 *
 * This function handles the complete execution lifecycle including:
 * - Capability lookup and validation
 * - Argument passing to the capability handler
 * - Error handling and wrapping
 * - Performance timing measurement
 *
 * The function is async and will await the capability's handler, making it safe
 * to use with both synchronous and asynchronous capability implementations.
 *
 * @param id - The unique identifier of the capability to execute
 * @param args - Optional key-value arguments to pass to the capability handler (default: empty object)
 *
 * @returns A promise that resolves to an execution result object containing:
 *   - `success` - Whether the execution completed without errors
 *   - `result` - The return value from the capability handler (if successful)
 *   - `error` - Error message string (if execution failed)
 *   - `timing` - Execution duration in milliseconds
 *
 * @example
 * // Execute a simple UI toggle
 * const result = await executeCapability('ui_toggle_theme', { theme: 'MIDNIGHT' });
 * if (result.success) {
 *   console.log(`Theme changed in ${result.timing}ms`);
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 *
 * @example
 * // Execute with error handling
 * try {
 *   const { success, result, error, timing } = await executeCapability('analyze_data', {
 *     dataset: 'metrics',
 *     timeRange: '7d'
 *   });
 *   if (!success) {
 *     showNotification(`Analysis failed: ${error}`);
 *   }
 * } catch (e) {
 *   // Handle unexpected errors
 * }
 *
 * @example
 * // Check if capability exists before execution
 * const capId = 'navigate_sector';
 * if (getCapability(capId)) {
 *   await executeCapability(capId, { sector: 'dashboard' });
 * }
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
 *
 * Uses caching for improved performance (US-011):
 * - Cached: ~3ms (when no sector filter)
 * - Uncached: ~50ms
 */
export function getGeminiManifests(options?: { sector?: AppMode }): GeminiManifest[] {
  // Use cache only when no sector filter is provided
  if (!options?.sector && manifestCache && manifestCache.version === registryVersion) {
    return manifestCache.manifests;
  }

  const capabilities = options?.sector
    ? getCapabilitiesForSector(options.sector)
    : getAllCapabilities();

  const manifests = capabilities
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

  // Cache result only when no sector filter
  if (!options?.sector) {
    manifestCache = {
      manifests,
      version: registryVersion,
      generatedAt: Date.now(),
    };
  }

  return manifests;
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
