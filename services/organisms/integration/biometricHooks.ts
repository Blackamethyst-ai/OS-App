/**
 * BiometricHooks - US-016: Biometric Hooks for Agentic Organism Framework
 *
 * Connects organism layers (genome, swarm, cognitive) to the BiometricProcessor
 * event bus, enabling stress-aware behavior adjustments across all layers.
 *
 * Key behaviors:
 * - High stress (>0.8): Reduce swarm load, prioritize fast responses
 * - Low activity (<0.3) + low stress (<0.2): Trigger cognitive consolidation
 * - Normal: Standard operation
 *
 * Research basis:
 * - arXiv:2601.02553 (SimpleMem) - Activity-driven memory consolidation
 * - arXiv:2506.15672 (SwarmAgentic) - Load-aware swarm coordination
 */

import { organismRegistry } from '../OrganismLayer';
import { wakeSleepAgent } from '../cognitive/wakeSleep';
import { adaptiveMoE } from '../swarm/adaptiveMoE';
import type { BiometricContext } from '../../archon/types';
import { logger } from '../../logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Biometric hook configuration.
 */
export interface BiometricHooksConfig {
  /** High stress threshold (0-1). Above this, reduce load. Default: 0.8 */
  highStressThreshold: number;

  /** Low stress threshold (0-1). Below this, consider consolidation. Default: 0.2 */
  lowStressThreshold: number;

  /** Low activity threshold (0-1). Below this + low stress = consolidation. Default: 0.3 */
  lowActivityThreshold: number;

  /** Minimum time between consolidation triggers (ms). Default: 5 minutes */
  consolidationCooldownMs: number;

  /** Enable automatic consolidation on low activity. Default: true */
  autoConsolidation: boolean;

  /** Enable stress-based swarm adjustments. Default: true */
  stressAwareSwarm: boolean;

  /** Stress smoothing window size. Default: 5 */
  stressSmoothingWindow: number;
}

/**
 * Internal state for biometric hooks.
 */
interface BiometricHooksState {
  /** Whether layers are registered */
  registered: boolean;

  /** Last biometric context received */
  lastContext?: BiometricContext;

  /** Timestamp of last consolidation trigger */
  lastConsolidationTrigger: number;

  /** Recent stress levels for smoothing */
  stressHistory: number[];

  /** Current operational mode */
  mode: 'normal' | 'high-stress' | 'consolidation';

  /** Original MoE temperature (saved before stress adjustment) */
  originalMoETemperature?: number;

  /** Original MoE topK (saved before stress adjustment) */
  originalMoETopK?: number;
}

/**
 * Biometric event listener callback type.
 */
type BiometricEventCallback = (context: BiometricContext) => void;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: BiometricHooksConfig = {
  highStressThreshold: 0.8,
  lowStressThreshold: 0.2,
  lowActivityThreshold: 0.3,
  consolidationCooldownMs: 5 * 60 * 1000, // 5 minutes
  autoConsolidation: true,
  stressAwareSwarm: true,
  stressSmoothingWindow: 5,
};

// =============================================================================
// BIOMETRIC HOOKS CLASS
// =============================================================================

/**
 * BiometricHooks connects organism layers to the BiometricProcessor event bus.
 *
 * Singleton pattern ensures consistent state across the application.
 */
export class BiometricHooks {
  private static instance: BiometricHooks | null = null;

  private config: BiometricHooksConfig;
  private state: BiometricHooksState;
  private eventListener?: BiometricEventCallback;
  private biometricEventHandler?: (event: Event) => void;

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<BiometricHooksConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      registered: false,
      lastConsolidationTrigger: 0,
      stressHistory: [],
      mode: 'normal',
    };
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<BiometricHooksConfig>): BiometricHooks {
    if (!BiometricHooks.instance) {
      BiometricHooks.instance = new BiometricHooks(config);
    }
    return BiometricHooks.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    if (BiometricHooks.instance) {
      BiometricHooks.instance.unregisterOrganismLayers();
    }
    BiometricHooks.instance = null;
  }

  // ---------------------------------------------------------------------------
  // Layer Registration
  // ---------------------------------------------------------------------------

  /**
   * Register organism layers with BiometricProcessor event bus.
   *
   * Connects all registered layers to biometric events via:
   * 1. Window event listener for 'biometric-update' custom events
   * 2. Direct callback hook for programmatic updates
   *
   * @returns void
   */
  registerOrganismLayers(): void {
    if (this.state.registered) {
      logger.warn('Layers already registered', undefined, 'BiometricHooks');
      return;
    }

    console.log('[BiometricHooks] Registering organism layers with biometric event bus');

    // Create event handler for biometric-update events from BiometricProcessor
    this.biometricEventHandler = (event: Event) => {
      const customEvent = event as CustomEvent<BiometricContext>;
      if (customEvent.detail) {
        this.onBiometricUpdate(customEvent.detail);
      }
    };

    // Listen for biometric-update events from BiometricProcessor
    if (typeof window !== 'undefined') {
      window.addEventListener('biometric-update', this.biometricEventHandler);

      // Also listen for gaze updates which include context
      window.addEventListener('biometric-gaze-update', this.biometricEventHandler);
    }

    // Store reference for programmatic event dispatch
    this.eventListener = this.onBiometricUpdate.bind(this);

    this.state.registered = true;
    console.log('[BiometricHooks] Registration complete');
  }

  /**
   * Unregister organism layers from biometric events.
   */
  unregisterOrganismLayers(): void {
    if (!this.state.registered) {
      return;
    }

    console.log('[BiometricHooks] Unregistering organism layers');

    // Remove window event listeners
    if (typeof window !== 'undefined' && this.biometricEventHandler) {
      window.removeEventListener('biometric-update', this.biometricEventHandler);
      window.removeEventListener('biometric-gaze-update', this.biometricEventHandler);
    }

    // Restore original MoE settings if in high-stress mode
    if (this.state.mode === 'high-stress') {
      this.restoreNormalSwarmBehavior();
    }

    this.eventListener = undefined;
    this.biometricEventHandler = undefined;
    this.state.registered = false;
    console.log('[BiometricHooks] Unregistration complete');
  }

  // ---------------------------------------------------------------------------
  // Biometric Event Handling
  // ---------------------------------------------------------------------------

  /**
   * Handle biometric context updates from BiometricProcessor.
   *
   * Dispatches context to all registered organism layers and
   * applies stress-aware behavior adjustments.
   *
   * @param context - BiometricContext with stress, activity, focus levels
   */
  onBiometricUpdate(context: BiometricContext): void {
    if (!this.state.registered) {
      logger.warn('Received update but layers not registered', undefined, 'BiometricHooks');
      return;
    }

    // Store context
    this.state.lastContext = context;

    // Update stress history for smoothing
    this.updateStressHistory(context.stressLevel);

    // Get smoothed stress level
    const smoothedStress = this.getSmoothedStress();

    // Create adjusted context with smoothed stress
    const adjustedContext: BiometricContext = {
      ...context,
      stressLevel: smoothedStress,
    };

    // Dispatch to all registered organism layers
    this.dispatchToLayers(adjustedContext);

    // Determine operational mode based on thresholds
    const previousMode = this.state.mode;
    const newMode = this.determineMode(smoothedStress, context.activityLevel);

    if (newMode !== previousMode) {
      this.handleModeTransition(previousMode, newMode, adjustedContext);
    }
  }

  private updateStressHistory(stressLevel: number): void {
    this.state.stressHistory.push(stressLevel);

    // Keep only recent values
    if (this.state.stressHistory.length > this.config.stressSmoothingWindow) {
      this.state.stressHistory.shift();
    }
  }

  private getSmoothedStress(): number {
    if (this.state.stressHistory.length === 0) {
      return 0.5; // Default neutral
    }

    const sum = this.state.stressHistory.reduce((a, b) => a + b, 0);
    return sum / this.state.stressHistory.length;
  }

  private dispatchToLayers(context: BiometricContext): void {
    // Get all registered organism layers
    const layers = organismRegistry.getAll();

    for (const layer of layers) {
      try {
        layer.onBiometricChange(context);
      } catch (error) {
        logger.error(
          `Error dispatching to layer ${layer.id}`,
          error,
          'BiometricHooks'
        );
      }
    }

    // Also dispatch to singleton wake/sleep agent
    try {
      wakeSleepAgent.onBiometricChange(context);
    } catch (error) {
      logger.error('Error dispatching to wakeSleepAgent', error, 'BiometricHooks');
    }
  }

  private determineMode(
    stressLevel: number,
    activityLevel: number
  ): BiometricHooksState['mode'] {
    if (stressLevel > this.config.highStressThreshold) {
      return 'high-stress';
    }

    if (
      stressLevel < this.config.lowStressThreshold &&
      activityLevel < this.config.lowActivityThreshold
    ) {
      return 'consolidation';
    }

    return 'normal';
  }

  private handleModeTransition(
    from: BiometricHooksState['mode'],
    to: BiometricHooksState['mode'],
    context: BiometricContext
  ): void {
    console.log(`[BiometricHooks] Mode transition: ${from} -> ${to}`);

    // Exit previous mode
    switch (from) {
      case 'high-stress':
        this.restoreNormalSwarmBehavior();
        break;
      case 'consolidation':
        // Nothing special on exit
        break;
    }

    // Enter new mode
    switch (to) {
      case 'high-stress':
        this.adjustSwarmBehavior(context.stressLevel);
        break;
      case 'consolidation':
        this.triggerConsolidation(context.activityLevel);
        break;
    }

    this.state.mode = to;

    // Emit mode change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('biometric-mode-change', {
          detail: { from, to, context },
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Swarm Behavior Adjustment
  // ---------------------------------------------------------------------------

  /**
   * Adjust swarm behavior based on stress level.
   *
   * High stress (>0.8):
   * - Reduce MoE temperature (more deterministic routing)
   * - Decrease topK (focus on best experts)
   * - Increase load balance weight (spread load)
   *
   * @param stressLevel - Current stress level (0-1)
   */
  adjustSwarmBehavior(stressLevel: number): void {
    if (!this.config.stressAwareSwarm) {
      return;
    }

    console.log(
      `[BiometricHooks] Adjusting swarm behavior for stress: ${stressLevel.toFixed(2)}`
    );

    // Save original settings
    const currentConfig = adaptiveMoE.getConfig();
    this.state.originalMoETemperature = currentConfig.temperature;
    this.state.originalMoETopK = currentConfig.topK;

    // Calculate stress factor (0 at threshold, 1 at max stress)
    const stressFactor = Math.min(
      1,
      (stressLevel - this.config.highStressThreshold) /
        (1 - this.config.highStressThreshold)
    );

    // Adjust MoE configuration
    // Lower temperature = more deterministic (pick best expert)
    const newTemperature = Math.max(0.3, currentConfig.temperature * (1 - stressFactor * 0.5));

    // Reduce topK under stress (focus on fewer experts)
    const newTopK = Math.max(1, Math.floor(currentConfig.topK * (1 - stressFactor * 0.5)));

    // Increase load balance weight (distribute work more)
    const newLoadBalanceWeight = Math.min(
      0.5,
      currentConfig.loadBalanceWeight + stressFactor * 0.2
    );

    adaptiveMoE.setConfig({
      temperature: newTemperature,
      topK: newTopK,
      loadBalanceWeight: newLoadBalanceWeight,
    });

    console.log(
      `[BiometricHooks] Swarm adjusted: temp=${newTemperature.toFixed(2)}, topK=${newTopK}, loadBalance=${newLoadBalanceWeight.toFixed(2)}`
    );

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('swarm-behavior-adjusted', {
          detail: {
            stressLevel,
            temperature: newTemperature,
            topK: newTopK,
            loadBalanceWeight: newLoadBalanceWeight,
          },
        })
      );
    }
  }

  private restoreNormalSwarmBehavior(): void {
    if (!this.config.stressAwareSwarm) {
      return;
    }

    console.log('[BiometricHooks] Restoring normal swarm behavior');

    // Restore original settings if saved
    if (
      this.state.originalMoETemperature !== undefined &&
      this.state.originalMoETopK !== undefined
    ) {
      adaptiveMoE.setConfig({
        temperature: this.state.originalMoETemperature,
        topK: this.state.originalMoETopK,
        loadBalanceWeight: 0.2, // Default
      });
    }

    this.state.originalMoETemperature = undefined;
    this.state.originalMoETopK = undefined;
  }

  // ---------------------------------------------------------------------------
  // Cognitive Consolidation
  // ---------------------------------------------------------------------------

  /**
   * Trigger cognitive consolidation (sleep cycle) when conditions are optimal.
   *
   * Conditions: Low activity (<0.3) + Low stress (<0.2)
   *
   * @param activityLevel - Current activity level (0-1)
   */
  triggerConsolidation(activityLevel: number): void {
    if (!this.config.autoConsolidation) {
      console.log('[BiometricHooks] Auto-consolidation disabled');
      return;
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastTrigger = now - this.state.lastConsolidationTrigger;

    if (timeSinceLastTrigger < this.config.consolidationCooldownMs) {
      console.log(
        `[BiometricHooks] Consolidation on cooldown (${Math.round((this.config.consolidationCooldownMs - timeSinceLastTrigger) / 1000)}s remaining)`
      );
      return;
    }

    // Check if wake/sleep agent is already in sleep phase
    const currentPhase = wakeSleepAgent.getCurrentPhase();
    if (currentPhase !== 'wake') {
      console.log(`[BiometricHooks] Already in ${currentPhase} phase, skipping trigger`);
      return;
    }

    // Check if there are enough episodes to consolidate
    const metrics = wakeSleepAgent.getCycleMetrics();
    if (metrics.episodeBufferSize < 5) {
      console.log(
        `[BiometricHooks] Not enough episodes for consolidation (${metrics.episodeBufferSize}/5)`
      );
      return;
    }

    console.log(
      `[BiometricHooks] Triggering consolidation (activity=${activityLevel.toFixed(2)}, episodes=${metrics.episodeBufferSize})`
    );

    // Update last trigger time
    this.state.lastConsolidationTrigger = now;

    // Trigger sleep cycle via biometric trigger
    wakeSleepAgent.triggerSleep('biometric-based').catch((error) => {
      logger.error('Consolidation trigger failed', error, 'BiometricHooks');
    });

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('consolidation-triggered', {
          detail: {
            activityLevel,
            episodeCount: metrics.episodeBufferSize,
            timestamp: now,
          },
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get current biometric hooks state.
   */
  getState(): Readonly<BiometricHooksState> {
    return { ...this.state };
  }

  /**
   * Get current configuration.
   */
  getConfig(): BiometricHooksConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<BiometricHooksConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if layers are registered.
   */
  isRegistered(): boolean {
    return this.state.registered;
  }

  /**
   * Get current operational mode.
   */
  getCurrentMode(): BiometricHooksState['mode'] {
    return this.state.mode;
  }

  /**
   * Get last biometric context.
   */
  getLastContext(): BiometricContext | undefined {
    return this.state.lastContext;
  }

  /**
   * Manually dispatch biometric update (for testing or external integrations).
   */
  dispatchBiometricUpdate(context: BiometricContext): void {
    this.onBiometricUpdate(context);
  }

  /**
   * Force mode change (for testing or manual override).
   */
  forceMode(mode: BiometricHooksState['mode']): void {
    const context: BiometricContext = this.state.lastContext || {
      stressLevel: mode === 'high-stress' ? 0.9 : mode === 'consolidation' ? 0.1 : 0.5,
      activityLevel: mode === 'consolidation' ? 0.2 : 0.5,
      focusScore: 0.5,
      timestamp: Date.now(),
    };

    this.handleModeTransition(this.state.mode, mode, context);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of BiometricHooks.
 */
export const biometricHooks = BiometricHooks.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createBiometricHooks(
  config?: Partial<BiometricHooksConfig>
): BiometricHooks {
  BiometricHooks.resetInstance();
  return BiometricHooks.getInstance(config);
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Register organism layers with BiometricProcessor event bus.
 * Convenience function that uses the singleton instance.
 */
export function registerOrganismLayers(): void {
  biometricHooks.registerOrganismLayers();
}

/**
 * Handle biometric update (for direct integration).
 * Convenience function that uses the singleton instance.
 */
export function onBiometricUpdate(context: BiometricContext): void {
  biometricHooks.onBiometricUpdate(context);
}

/**
 * Adjust swarm behavior based on stress level.
 * Convenience function that uses the singleton instance.
 */
export function adjustSwarmBehavior(stressLevel: number): void {
  biometricHooks.adjustSwarmBehavior(stressLevel);
}

/**
 * Trigger cognitive consolidation.
 * Convenience function that uses the singleton instance.
 */
export function triggerConsolidation(activityLevel: number): void {
  biometricHooks.triggerConsolidation(activityLevel);
}
