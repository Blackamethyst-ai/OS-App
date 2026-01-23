/**
 * UNIFIED ACTION REGISTRY
 *
 * Single source of truth for ALL voice-controllable actions.
 * Consolidates: componentActionRegistry + voiceActionRegistry
 *
 * Architecture:
 * - Types: ./types.ts
 * - Priority: ./priority.ts
 * - Sectors: ./sectorMap.ts
 * - Handlers: ./handlers/*.ts
 */

import { useSystemMind } from '../../stores/useSystemMind';
import { useAppStore } from '../../store';
import type {
    UnifiedAction,
    ActionRegistration,
    RegistryState,
    ActionComplexity,
    ActionCategory,
    ActionResult,
} from './types';
import { getCategoryPriority, getPathForComplexity, calculateSectorRelevance } from './priority';
import { getSectorsForComponent } from './sectorMap';
import type { CPBPath } from '../cognitivePrecisionBridge/types';

// =============================================================================
// Registry State
// =============================================================================

const registryState: RegistryState = {
    actions: new Map(),
    initialized: false,
    lastUpdate: 0,
};

// =============================================================================
// Registration Functions
// =============================================================================

/**
 * Register a single action with full metadata.
 */
export function registerAction(action: UnifiedAction): void {
    registryState.actions.set(action.id, action);
    registryState.lastUpdate = Date.now();

    // Also register with SystemMind for epoch tracking
    const systemMind = useSystemMind.getState();
    systemMind.registerAction(
        action.id,
        `[${action.source.toUpperCase()}:${action.complexity}] ${action.description}`,
        action.handler,
        { sectors: action.sectors, priority: action.priority }
    );
}

/**
 * Register multiple actions efficiently (single epoch increment).
 */
export function registerActions(actions: UnifiedAction[]): void {
    for (const action of actions) {
        registryState.actions.set(action.id, action);
    }
    registryState.lastUpdate = Date.now();

    // Bulk register with SystemMind
    const systemMind = useSystemMind.getState();
    const registrations: ActionRegistration[] = actions.map(action => ({
        id: action.id,
        description: `[${action.source.toUpperCase()}:${action.complexity}] ${action.description}`,
        callback: action.handler,
        sectors: action.sectors,
        priority: action.priority,
    }));
    systemMind.registerActions(registrations);
}

/**
 * Unregister an action by ID.
 */
export function unregisterAction(actionId: string): void {
    registryState.actions.delete(actionId);
    useSystemMind.getState().unregisterAction(actionId);
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get all registered actions.
 */
export function getAllActions(): UnifiedAction[] {
    return Array.from(registryState.actions.values());
}

/**
 * Get an action by ID.
 */
export function getAction(actionId: string): UnifiedAction | undefined {
    return registryState.actions.get(actionId);
}

/**
 * Get actions filtered and sorted by sector relevance.
 */
export function getActionsForSector(sector: string): UnifiedAction[] {
    const actions = getAllActions();

    return actions
        .map(action => ({
            action,
            relevance: calculateSectorRelevance(action.sectors, sector, action.priority),
        }))
        .filter(({ relevance }) => relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .map(({ action }) => action);
}

/**
 * Get actions by category.
 */
export function getActionsByCategory(category: ActionCategory): UnifiedAction[] {
    return getAllActions().filter(
        action => action.complexity === mapCategoryToComplexity(category)
    );
}

/**
 * Get actions by source.
 */
export function getActionsBySource(source: UnifiedAction['source']): UnifiedAction[] {
    return getAllActions().filter(action => action.source === source);
}

/**
 * Search actions by description or ID.
 */
export function searchActions(query: string): UnifiedAction[] {
    const lowerQuery = query.toLowerCase();
    return getAllActions().filter(
        action =>
            action.id.toLowerCase().includes(lowerQuery) ||
            action.description.toLowerCase().includes(lowerQuery) ||
            action.examples?.some(ex => ex.toLowerCase().includes(lowerQuery))
    );
}

// =============================================================================
// Execution Functions
// =============================================================================

/**
 * Execute an action by ID with the given arguments.
 */
export async function executeAction(
    actionId: string,
    args: Record<string, unknown> = {}
): Promise<ActionResult> {
    const action = getAction(actionId);

    if (!action) {
        return { success: false, error: `Action not found: ${actionId}` };
    }

    const startTime = performance.now();

    try {
        const result = await action.handler(args);
        const executionTimeMs = performance.now() - startTime;

        return {
            ...result,
            success: result.success !== false,
            _meta: {
                actionId,
                executionPath: action.executionPath,
                executionTimeMs,
            },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

// =============================================================================
// Context Generation
// =============================================================================

/**
 * Generate action context for voice/LLM consumption.
 * Returns a formatted string describing available actions.
 */
export function generateActionContext(sector?: string): string {
    const actions = sector ? getActionsForSector(sector) : getAllActions();

    // Group by complexity
    const grouped: Record<string, UnifiedAction[]> = {};
    for (const action of actions) {
        const key = action.complexity;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(action);
    }

    let context = '';
    for (const [complexity, actionsInGroup] of Object.entries(grouped)) {
        context += `\n[${complexity.toUpperCase()}]\n`;
        for (const action of actionsInGroup.slice(0, 10)) {
            context += `  • ${action.id}: ${action.description}\n`;
            if (action.examples?.length) {
                context += `    Examples: "${action.examples[0]}"\n`;
            }
        }
    }

    return context;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map action category to complexity level.
 */
function mapCategoryToComplexity(category: ActionCategory): ActionComplexity {
    switch (category) {
        case 'navigate':
        case 'ui':
            return 'navigation';
        case 'search':
        case 'manage':
            return 'simple';
        case 'analyze':
            return 'analysis';
        case 'generate':
        case 'execute':
        case 'deploy':
            return 'architecture';
        default:
            return 'simple';
    }
}

/**
 * Check if the registry is initialized.
 */
export function isInitialized(): boolean {
    return registryState.initialized;
}

/**
 * Get registry statistics.
 */
export function getRegistryStats(): {
    totalActions: number;
    bySource: Record<string, number>;
    byComplexity: Record<string, number>;
    lastUpdate: number;
} {
    const actions = getAllActions();
    const bySource: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};

    for (const action of actions) {
        bySource[action.source] = (bySource[action.source] || 0) + 1;
        byComplexity[action.complexity] = (byComplexity[action.complexity] || 0) + 1;
    }

    return {
        totalActions: actions.length,
        bySource,
        byComplexity,
        lastUpdate: registryState.lastUpdate,
    };
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Mark the registry as initialized.
 * Called after all actions have been registered.
 */
export function markInitialized(): void {
    registryState.initialized = true;
    if (import.meta.env.DEV) {
        const stats = getRegistryStats();
        console.log(`[ActionRegistry] Initialized with ${stats.totalActions} actions`);
    }
}
