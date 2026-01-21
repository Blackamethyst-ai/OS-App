/**
 * ARCHON Meta-Cognition Module
 *
 * Multi-modal model orchestration with DMoE-style selection.
 * Supports Claude, Gemini, GPT-4, Grok, and local models.
 *
 * @example
 * ```typescript
 * import { useMetaCognition, getMetaCognitionEngine } from '@/services/archon/metacognition';
 *
 * // React hook usage
 * const { selectForTask, quickSelect } = useMetaCognition();
 * const selection = selectForTask('code-generation', [
 *   { capability: 'coding', importance: 'required', minimumScore: 0.8 }
 * ]);
 *
 * // Direct engine usage
 * const engine = getMetaCognitionEngine();
 * const model = engine.quickSelect('flagship');
 * ```
 */

// Types
export type {
  ModelProvider,
  ModelTier,
  ModelInfo,
  ModelCapability,
  ModelMetrics,
  ModelRegistryConfig,
  CapabilityRequirement,
  GapAnalysis,
  ModelMatch,
  CapabilityGap,
  SelectionRecommendation,
  ExpertProfile,
  ExpertSelection,
  SelectedExpert,
  SelectionStrategy,
  ContextWindow,
  ContextSegment,
  PruningResult,
  PruningStrategy,
  TaskProfile,
  MetaCognitionState,
  SessionStats,
} from './types';

export { TASK_PROFILES } from './types';

// Model Registry
export {
  ModelRegistry,
  getModelRegistry,
  BUILT_IN_MODELS,
} from './modelRegistry';

// Model Selector (DMoE)
export {
  ModelSelector,
  getModelSelector,
  type SelectorConfig,
} from './selector';

// Context Pruner
export {
  ContextPruner,
  getContextPruner,
  type PrunerConfig,
} from './pruner';

// Meta-Cognition Engine (main orchestrator)
export {
  MetaCognitionEngine,
  getMetaCognitionEngine,
  useMetaCognition,
  type MetaCognitionConfig,
} from './engine';

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

// Import for use in metacognition object
import { getMetaCognitionEngine as _getEngine } from './engine';
import { getModelRegistry as _getRegistry } from './modelRegistry';
import { getModelSelector as _getSelector } from './selector';
import { getContextPruner as _getPruner } from './pruner';

/**
 * Quick access to common operations
 */
export const metacognition = {
  /**
   * Get the singleton engine instance
   */
  get engine() {
    return _getEngine();
  },

  /**
   * Get the model registry
   */
  get registry() {
    return _getRegistry();
  },

  /**
   * Get the model selector
   */
  get selector() {
    return _getSelector();
  },

  /**
   * Get the context pruner
   */
  get pruner() {
    return _getPruner();
  },

  /**
   * Select best model for a task type
   */
  select(taskType: string) {
    return _getEngine().selectForTask(taskType);
  },

  /**
   * Quick select by tier
   */
  quick(tier?: 'flagship' | 'standard' | 'fast' | 'local') {
    return _getEngine().quickSelect(tier);
  },

  /**
   * List all available models
   */
  models() {
    return _getRegistry().getAvailableModels();
  },
};
