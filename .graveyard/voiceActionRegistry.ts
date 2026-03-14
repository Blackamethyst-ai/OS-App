/**
 * @deprecated This file is deprecated. Use services/capabilities instead.
 *
 * VOICE ACTION REGISTRY (DEPRECATED)
 *
 * All voice actions are now consolidated in services/capabilities/.
 * This file exists only for backward compatibility.
 *
 * Migration:
 *   Old: import { initializeVoiceActions, generateActionContext } from './voiceActionRegistry';
 *   New: import { initializeCapabilities, processVoiceCommand } from './capabilities';
 *        import { getVoiceContextForSector, getVoiceSuggestions } from './capabilities';
 *
 * See services/capabilities/adapters/voice.ts for the new voice interface.
 */

import { ALL_HANDLER_ACTIONS, getHandlerStats } from './actions/handlers';
import type { UnifiedAction } from './actions/types';
import { logger } from './logger';

// Re-export types for backward compatibility
export type VoiceAction = UnifiedAction;

/**
 * @deprecated Use initializeUnifiedRegistry() instead.
 */
export function initializeVoiceActions(): void {
    logger.warn(
        'DEPRECATED: Use initializeUnifiedRegistry() instead. ' +
        'Actions are now consolidated in services/actions/handlers/',
        undefined,
        'voiceActionRegistry'
    );
}

/**
 * @deprecated Use ALL_HANDLER_ACTIONS from services/actions/handlers instead.
 */
export function getVoiceActions(): UnifiedAction[] {
    logger.warn(
        'DEPRECATED: Use ALL_HANDLER_ACTIONS from services/actions/handlers instead.',
        undefined,
        'voiceActionRegistry'
    );
    return ALL_HANDLER_ACTIONS.filter(a => a.source === 'voice');
}

/**
 * @deprecated Use getActionsForSector() from services/actions/registry instead.
 */
export function getActionsByCategory(category: string): UnifiedAction[] {
    logger.warn(
        'DEPRECATED: Use getActionsByCategory() from services/actions/registry instead.',
        undefined,
        'voiceActionRegistry'
    );
    return ALL_HANDLER_ACTIONS.filter(a => a.complexity === category);
}

/**
 * @deprecated Use getActionsForSector() from services/actions/registry instead.
 */
export function getActionsBySector(sector: string): UnifiedAction[] {
    logger.warn(
        'DEPRECATED: Use getActionsForSector() from services/actions/registry instead.',
        undefined,
        'voiceActionRegistry'
    );
    return ALL_HANDLER_ACTIONS.filter(a =>
        a.sectors.length === 0 || a.sectors.some(s => s === sector)
    );
}

/**
 * @deprecated Use searchActions() from services/actions/registry instead.
 */
export function findMatchingAction(query: string): UnifiedAction | null {
    logger.warn(
        'DEPRECATED: Use searchActions() from services/actions/registry instead.',
        undefined,
        'voiceActionRegistry'
    );
    const q = query.toLowerCase();
    return ALL_HANDLER_ACTIONS.find(action =>
        action.id.toLowerCase().includes(q) ||
        action.description.toLowerCase().includes(q) ||
        action.examples?.some(ex => ex.toLowerCase().includes(q))
    ) || null;
}

/**
 * @deprecated Use generateVoiceContext() from unifiedActionRegistry instead.
 */
export function generateActionContext(): string {
    logger.warn(
        'DEPRECATED: Use generateVoiceContext() from unifiedActionRegistry instead.',
        undefined,
        'voiceActionRegistry'
    );
    const stats = getHandlerStats();
    let context = '=== VOICE ACTIONS (DEPRECATED) ===\n';
    context += `Total actions: ${stats.total}\n`;
    context += `By category: ${JSON.stringify(stats.byCategory)}\n`;
    return context;
}
