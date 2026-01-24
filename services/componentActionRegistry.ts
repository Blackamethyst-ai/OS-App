/**
 * @deprecated This file is deprecated. Use services/actions/handlers instead.
 *
 * COMPONENT ACTION REGISTRY (DEPRECATED)
 *
 * All component actions are now consolidated in services/actions/handlers/.
 * This file exists only for backward compatibility.
 *
 * Migration:
 *   Old: import { initializeComponentActions } from './componentActionRegistry';
 *   New: import { initializeUnifiedRegistry } from './unifiedActionRegistry';
 *        import { ALL_HANDLER_ACTIONS } from './actions/handlers';
 */

import { ALL_HANDLER_ACTIONS, getHandlerStats } from './actions/handlers';
import type { UnifiedAction } from './actions/types';

// Re-export types for backward compatibility
export type ComponentAction = UnifiedAction;

/**
 * @deprecated Use initializeUnifiedRegistry() instead.
 */
export function initializeComponentActions(): void {
    console.warn(
        '[componentActionRegistry] DEPRECATED: Use initializeUnifiedRegistry() instead. ' +
        'Actions are now consolidated in services/actions/handlers/'
    );
}

/**
 * @deprecated Use ALL_HANDLER_ACTIONS from services/actions/handlers instead.
 */
export function getAllComponentActions(): UnifiedAction[] {
    console.warn(
        '[componentActionRegistry] DEPRECATED: Use ALL_HANDLER_ACTIONS from services/actions/handlers instead.'
    );
    return ALL_HANDLER_ACTIONS.filter(a => a.source === 'component');
}

/**
 * @deprecated Actions are now organized by category in services/actions/handlers/, not by component.
 */
export function getActionsByComponent(component: string): UnifiedAction[] {
    console.warn(
        '[componentActionRegistry] DEPRECATED: Actions are now organized by category, not component. ' +
        'See services/actions/handlers/ for the new structure.'
    );
    return ALL_HANDLER_ACTIONS.filter(a =>
        a.sectors.some(s => s.toLowerCase().includes(component.toLowerCase()))
    );
}

/**
 * @deprecated Use generateVoiceContext() from unifiedActionRegistry instead.
 */
export function generateComponentActionContext(): string {
    console.warn(
        '[componentActionRegistry] DEPRECATED: Use generateVoiceContext() from unifiedActionRegistry instead.'
    );
    const stats = getHandlerStats();
    let context = '=== COMPONENT ACTIONS (DEPRECATED) ===\n';
    context += `Total actions: ${stats.total}\n`;
    context += `By category: ${JSON.stringify(stats.byCategory)}\n`;
    return context;
}
