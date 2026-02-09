/**
 * ACTIONS MODULE
 *
 * Unified action registry for voice control and system automation.
 *
 * Usage:
 *   import { registerAction, executeAction, getActionsForSector } from './services/actions';
 *
 * Architecture:
 *   - types.ts: Type definitions
 *   - priority.ts: Priority scoring system
 *   - sectorMap.ts: Component-to-sector mapping
 *   - registry.ts: Core registry implementation
 *   - handlers/: Action handler implementations (navigation, generation, etc.)
 */

// Types
export type {
    ActionCategory,
    ActionComplexity,
    ActionSource,
    ActionArgs,
    ActionHandler,
    ActionResult,
    BaseAction,
    ComponentAction,
    VoiceAction,
    UnifiedAction,
    ExecutionResult,
    ActionRegistration,
    RegistryState,
} from './types';

export {
    isComponentAction,
    isVoiceAction,
    isUnifiedAction,
} from './types';

// Priority
export {
    getCategoryPriority,
    getPathForComplexity,
    calculateSectorRelevance,
    applyPriorityModifiers,
} from './priority';

export type { PriorityModifiers } from './priority';

// Sector Mapping
export {
    COMPONENT_TO_SECTORS,
    getSectorsForComponent,
    SECTOR_ALIASES,
    resolveSecator,
    getAvailableSectors,
    areSectorsRelated,
} from './sectorMap';

// Registry
export {
    registerAction,
    registerActions,
    unregisterAction,
    getAllActions,
    getAction,
    getActionsForSector,
    getActionsByCategory,
    getActionsBySource,
    searchActions,
    executeAction,
    generateActionContext,
    isInitialized,
    getRegistryStats,
    markInitialized,
} from './registry';

// Handler Actions (consolidated from legacy registries)
export {
    ALL_HANDLER_ACTIONS,
    NAVIGATION_ACTIONS,
    GENERATION_ACTIONS,
    EXECUTION_ACTIONS,
    ANALYSIS_ACTIONS,
    UI_ACTIONS,
    getSectorMap,
    getHandlerStats,
} from './handlers';
