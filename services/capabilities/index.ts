/**
 * Unified Capability Registry
 *
 * This module consolidates all capability sources in OS-App:
 * - TAB_REGISTRY (43 tabs for navigation)
 * - Unified Action Registry (67 actions)
 * - Dynamic Tool Registry (runtime tools)
 * - Voice/Component actions (legacy, deprecated)
 *
 * Usage:
 * ```typescript
 * import { initializeCapabilities, getCapability, executeCapability } from '@/services/capabilities';
 *
 * // Initialize at app start
 * await initializeCapabilities();
 *
 * // Find and execute capabilities
 * const cap = findCapability('open dashboard');
 * const result = await executeCapability(cap.id, {});
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Capability,
  CapabilityKind,
  CapabilitySource,
  CapabilityComplexity,
  CapabilityHandler,
  CapabilityResult,
  CapabilitySchema,
  CapabilityMatch,
  CapabilitySearchOptions,
  TabCapability,
  SubtabDefinition,
  AppMode,
  CPBPath,
  ActionCategory,
  RegistryStats,
  RegistryState,
  GeminiManifest,
  VoiceContext,
  GeminiToolManifest,
} from './types';

export {
  isTabCapability,
  isActionCapability,
  isNavigationCapability,
  complexityToCPBPath,
} from './types';

// ============================================================================
// Registry Exports
// ============================================================================

export {
  // Registration
  registerCapability,
  registerCapabilities,
  unregisterCapability,

  // Retrieval
  getCapability,
  getAllCapabilities,
  getCapabilities,
  getCapabilitiesByKind,
  getCapabilitiesBySource,
  getCapabilitiesForSector,

  // Search
  searchCapabilities,
  findCapability,

  // Execution
  executeCapability,
  routeQuery,

  // Statistics
  getStats,

  // Gemini
  getGeminiManifests,

  // Voice
  generateVoiceContext,

  // State
  isInitialized,
  markInitialized,
  clearRegistry,
  getRegistryInfo,
} from './registry';

// ============================================================================
// Provider Exports
// ============================================================================

export {
  loadTabCapabilities,
  getTabCapabilityCount,
} from './providers/tabs';

export {
  loadActionCapabilities,
  getActionCapabilityCount,
  getActionsByCategory,
} from './providers/actions';

export {
  registerDynamicCapability,
  unregisterDynamicCapability,
  getDynamicCapabilityIds,
  clearDynamicCapabilities,
  hasDynamicCapability,
  syncFromDynamicToolRegistry,
} from './providers/dynamic';

export {
  SECTOR_DEFINITIONS,
  getSector,
  getSectorByAlias,
  getAllSectorModes,
  sectorSupportsCapability,
} from './providers/sectors';

export {
  loadUICapabilities,
  getUICapabilityCount,
} from './providers/ui';

// ============================================================================
// Adapter Exports
// ============================================================================

export {
  // Voice processing
  processVoiceCommand,
  getVoiceContextForSector,
  getVoiceCapabilityList,
  getVoiceSuggestions,
  formatForVoice,
  generateVoiceHelp,

  // Voice state
  recordVoiceCommand,
  getLastVoiceCommand,
  getVoiceHistory,
  clearVoiceHistory,

  // Types
  type VoiceCommand,
  type VoiceCommandResult,
} from './adapters/voice';

export {
  // Gemini function calling
  getGeminiFunctionDeclarations,
  getGeminiToolManifest,
  executeGeminiFunctionCall,
  executeGeminiFunctionCalls,

  // Context
  generateGeminiContext,
  getToolUseInstructions,

  // Validation
  validateFunctionCall,

  // Types
  type GeminiFunctionCall,
  type GeminiFunctionResult,
} from './adapters/gemini';

// ============================================================================
// CPB Routing Exports
// ============================================================================

export {
  // Query routing
  routeQueryToCPB,
  executeQueryWithCPB,
  executeCapabilityWithCPB,

  // Types
  type CPBExecutionResult,
  type QueryRouteResult,
  type CPBPath as CPBRoutingPath,
  type CPBResult,
  type CPBStatus,
} from './cpb';

// ============================================================================
// Initialization
// ============================================================================

import { logger } from '../logger';

let initPromise: Promise<void> | null = null;

/**
 * Initialize the capability registry
 *
 * This loads all capabilities from:
 * - Tab registry
 * - Action registry
 * - Dynamic tool registry
 *
 * Safe to call multiple times - will only initialize once.
 */
export async function initializeCapabilities(): Promise<void> {
  // Return existing promise if already initializing
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { isInitialized, markInitialized } = await import('./registry');

    if (isInitialized()) {
      logger.debug('Already initialized', undefined, 'CapabilityRegistry');
      return;
    }

    logger.debug('Initializing...', undefined, 'CapabilityRegistry');
    const startTime = performance.now();

    try {
      // Load tab capabilities
      const { loadTabCapabilities } = await import('./providers/tabs');
      loadTabCapabilities();
    } catch (error) {
      logger.warn('Failed to load tab capabilities', error, 'CapabilityRegistry');
    }

    try {
      // Load action capabilities
      const { loadActionCapabilities } = await import('./providers/actions');
      loadActionCapabilities();
    } catch (error) {
      logger.warn('Failed to load action capabilities', error, 'CapabilityRegistry');
    }

    try {
      // Load UI capabilities (theme, voice toggle, etc.)
      const { loadUICapabilities } = await import('./providers/ui');
      loadUICapabilities();
    } catch (error) {
      logger.warn('Failed to load UI capabilities', error, 'CapabilityRegistry');
    }

    try {
      // Sync dynamic tools
      const { syncFromDynamicToolRegistry } = await import('./providers/dynamic');
      await syncFromDynamicToolRegistry();
    } catch (error) {
      logger.warn('Failed to sync dynamic tools', error, 'CapabilityRegistry');
    }

    markInitialized();

    const { getStats } = await import('./registry');
    const stats = getStats();
    const elapsed = (performance.now() - startTime).toFixed(1);

    logger.info(`Initialized with ${stats.total} capabilities in ${elapsed}ms`, {
      tabs: stats.bySource.tab || 0,
      actions: stats.byKind.action || 0,
      navigation: stats.byKind.navigation || 0,
      tools: stats.byKind.tool || 0,
    }, 'CapabilityRegistry');
  })();

  return initPromise;
}

/**
 * Reset initialization state (for testing)
 */
export function resetInitialization(): void {
  initPromise = null;
}
