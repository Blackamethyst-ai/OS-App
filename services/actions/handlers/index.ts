/**
 * ACTION HANDLERS
 * Consolidated action handlers for the unified registry.
 */

import { NAVIGATION_ACTIONS, getSectorMap } from './navigation';
import { GENERATION_ACTIONS } from './generation';
import { EXECUTION_ACTIONS } from './execution';
import { ANALYSIS_ACTIONS } from './analysis';
import { UI_ACTIONS } from './ui';
import { SOVEREIGN_ACTIONS } from './sovereign';
import type { UnifiedAction } from '../types';

// Export individual handler groups
export { NAVIGATION_ACTIONS, getSectorMap } from './navigation';
export { GENERATION_ACTIONS } from './generation';
export { EXECUTION_ACTIONS } from './execution';
export { ANALYSIS_ACTIONS } from './analysis';
export { UI_ACTIONS } from './ui';
export { SOVEREIGN_ACTIONS } from './sovereign';

/**
 * All consolidated actions from handlers.
 * These are the core actions that were previously split across
 * the legacy component and voice action registries.
 */
export const ALL_HANDLER_ACTIONS: UnifiedAction[] = [
  ...NAVIGATION_ACTIONS,
  ...GENERATION_ACTIONS,
  ...EXECUTION_ACTIONS,
  ...ANALYSIS_ACTIONS,
  ...UI_ACTIONS,
  ...SOVEREIGN_ACTIONS,
];

/**
 * Get handler actions count by category.
 */
export function getHandlerStats(): {
  total: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {
    navigation: NAVIGATION_ACTIONS.length,
    generation: GENERATION_ACTIONS.length,
    execution: EXECUTION_ACTIONS.length,
    analysis: ANALYSIS_ACTIONS.length,
    ui: UI_ACTIONS.length,
    sovereign: SOVEREIGN_ACTIONS.length,
  };

  return {
    total: ALL_HANDLER_ACTIONS.length,
    byCategory,
  };
}
