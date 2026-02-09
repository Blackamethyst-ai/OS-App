/**
 * Action Capability Provider
 *
 * Converts Unified Action Registry entries to unified capabilities
 */

import type { Capability, AppMode, CapabilityComplexity, CapabilitySource, CPBPath } from '../types';
import { registerCapabilities } from '../registry';
import { logger } from '../../logger';

// Import from existing action registry
import { ALL_HANDLER_ACTIONS } from '../../actions/handlers';
import type { UnifiedAction, ActionComplexity, ActionSource } from '../../actions/types';

/**
 * Map action complexity to capability complexity
 */
function mapComplexity(complexity: ActionComplexity): CapabilityComplexity {
  switch (complexity) {
    case 'simple':
      return 'simple';
    case 'navigation':
      return 'navigation';
    case 'analysis':
      return 'analysis';
    case 'architecture':
      return 'architecture';
    case 'critical':
      return 'critical';
    default:
      return 'simple';
  }
}

/**
 * Map action source to capability source
 */
function mapSource(source: ActionSource): CapabilitySource {
  switch (source) {
    case 'component':
      return 'component';
    case 'voice':
      return 'voice';
    case 'sovereign':
      return 'sovereign';
    case 'cpb':
      return 'core';
    case 'dom':
      return 'component';
    default:
      return 'core';
  }
}

/**
 * Map execution path
 */
function mapExecutionPath(path: string | undefined): CPBPath {
  switch (path) {
    case 'direct':
      return 'direct';
    case 'ace':
      return 'ace';
    case 'hybrid':
      return 'hybrid';
    case 'cascade':
      return 'cascade';
    case 'rlm':
      return 'rlm';
    default:
      return 'auto';
  }
}

/**
 * Convert a unified action to a capability
 */
function actionToCapability(action: UnifiedAction): Capability {
  return {
    id: action.id,
    kind: 'action',
    description: action.description,
    source: mapSource(action.source),
    complexity: mapComplexity(action.complexity),
    priority: action.priority || 50,
    sectors: (action.sectors || []) as AppMode[],
    executionPath: mapExecutionPath(action.executionPath),
    category: action.category,
    examples: action.examples,
    requiresContext: action.requiresContext,
    schema: action.schema ? {
      type: 'object',
      properties: action.schema.properties as Record<string, any>,
      required: action.schema.required,
    } : undefined,
    handler: async (args) => {
      try {
        const result = await action.handler(args);
        return {
          success: result.success !== false,
          data: result,
          message: result.error || (result.success ? 'Action completed' : 'Action failed'),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Load all actions as capabilities
 */
export function loadActionCapabilities(): void {
  const capabilities = ALL_HANDLER_ACTIONS.map(actionToCapability);
  registerCapabilities(capabilities);
  logger.debug(`Loaded ${capabilities.length} action capabilities`, undefined, 'ActionsProvider');
}

/**
 * Get action capability count
 */
export function getActionCapabilityCount(): number {
  return ALL_HANDLER_ACTIONS.length;
}

/**
 * Get actions grouped by category
 */
export function getActionsByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const action of ALL_HANDLER_ACTIONS) {
    const category = action.category || 'uncategorized';
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}
