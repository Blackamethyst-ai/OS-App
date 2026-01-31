/**
 * OrganismLayer Base Interface
 *
 * Abstract base for the three organism layers:
 * - genome: Agent Genome (portable skills via MCP)
 * - swarm: Swarm Orchestration (self-organizing teams)
 * - cognitive: Cognitive Cycles (wake/sleep consolidation)
 *
 * Each layer implements this interface to integrate with AgentKernel
 * and ARCHON meta-orchestrator.
 */

import type {
  OrganismLayer,
  OrganismTask,
  OrganismResult,
  OrganismMetrics,
  BiometricContext,
  ContextPack,
  SubsystemType,
  SubsystemStatus,
  DQScore,
} from '../archon/types';

// =============================================================================
// ABSTRACT BASE CLASS
// =============================================================================

/**
 * AbstractOrganismLayer provides common functionality for all organism layers.
 *
 * Subclasses must implement:
 * - dispatch(): Handle incoming tasks
 * - getLayerMetrics(): Return layer-specific metrics
 */
export abstract class AbstractOrganismLayer implements OrganismLayer {
  // Subsystem interface
  abstract id: SubsystemType;
  abstract name: string;
  abstract capabilities: string[];
  abstract layerType: 'genome' | 'swarm' | 'cognitive';

  status: SubsystemStatus = 'idle';
  currentLoad: number = 0;
  lastInvoked?: number;
  metrics: OrganismMetrics = {
    invocations: 0,
    successRate: 1.0,
    avgDqScore: 0.85,
    avgLatencyMs: 0,
    tokenUsage: 0,
  };

  // Internal state
  protected initialized: boolean = false;
  protected biometricContext?: BiometricContext;
  protected mcpPacks: ContextPack[] = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn(`${this.name} already initialized`);
      return;
    }

    console.log(`Initializing ${this.name}...`);
    await this.onInitialize();
    this.initialized = true;
    this.status = 'idle';
    console.log(`${this.name} initialized`);
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log(`Shutting down ${this.name}...`);
    await this.onShutdown();
    this.initialized = false;
    this.status = 'disabled';
    console.log(`${this.name} shutdown complete`);
  }

  /**
   * Override in subclass for custom initialization.
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op
  }

  /**
   * Override in subclass for custom shutdown.
   */
  protected async onShutdown(): Promise<void> {
    // Default: no-op
  }

  // ---------------------------------------------------------------------------
  // Task Dispatch
  // ---------------------------------------------------------------------------

  abstract dispatch(task: OrganismTask): Promise<OrganismResult>;

  /**
   * Wrapper for dispatch that handles metrics and error handling.
   */
  protected async executeWithMetrics(
    task: OrganismTask,
    handler: () => Promise<OrganismResult>
  ): Promise<OrganismResult> {
    const startTime = Date.now();
    this.status = 'busy';
    this.currentLoad = Math.min(1, this.currentLoad + 0.2);
    this.lastInvoked = startTime;
    this.metrics.invocations++;

    try {
      const result = await handler();

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(result, latency);

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.successRate =
        (this.metrics.successRate * (this.metrics.invocations - 1)) /
        this.metrics.invocations;

      return {
        success: false,
        output: null,
        dqScore: {
          score: 0,
          components: { validity: 0, specificity: 0, correctness: 0 },
          isActionable: false,
          timestamp: Date.now(),
        },
        metadata: {
          layerId: this.id,
          latencyMs: latency,
          tokensUsed: 0,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.status = 'idle';
      this.currentLoad = Math.max(0, this.currentLoad - 0.2);
    }
  }

  private updateMetrics(result: OrganismResult, latency: number): void {
    const n = this.metrics.invocations;

    // Rolling average for latency
    this.metrics.avgLatencyMs =
      (this.metrics.avgLatencyMs * (n - 1) + latency) / n;

    // Rolling average for DQ score
    this.metrics.avgDqScore =
      (this.metrics.avgDqScore * (n - 1) + result.dqScore.score) / n;

    // Success rate
    if (result.success) {
      this.metrics.successRate =
        (this.metrics.successRate * (n - 1) + 1) / n;
    } else {
      this.metrics.successRate =
        (this.metrics.successRate * (n - 1)) / n;
    }

    // Token usage
    this.metrics.tokenUsage += result.metadata.tokensUsed;
  }

  // ---------------------------------------------------------------------------
  // Integration Hooks
  // ---------------------------------------------------------------------------

  onBiometricChange(context: BiometricContext): void {
    this.biometricContext = context;

    // Adjust behavior based on stress
    if (context.stressLevel > 0.8) {
      // High stress: reduce load, prioritize fast responses
      this.onHighStress(context);
    } else if (context.stressLevel < 0.2 && context.activityLevel < 0.3) {
      // Low activity: good time for background tasks
      this.onLowActivity(context);
    }
  }

  /**
   * Override to handle high stress situations.
   */
  protected onHighStress(_context: BiometricContext): void {
    // Default: no-op
  }

  /**
   * Override to handle low activity periods.
   */
  protected onLowActivity(_context: BiometricContext): void {
    // Default: no-op
  }

  onMCPContext(packs: ContextPack[]): void {
    this.mcpPacks = packs;
  }

  // ---------------------------------------------------------------------------
  // Quality Scoring
  // ---------------------------------------------------------------------------

  computeDQScore(): DQScore {
    return {
      score: this.metrics.avgDqScore,
      components: {
        validity: this.metrics.successRate,
        specificity: 0.8, // Default
        correctness: this.metrics.avgDqScore,
      },
      isActionable: this.metrics.avgDqScore >= 0.8,
      timestamp: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  abstract getLayerMetrics(): OrganismMetrics;

  /**
   * Get base metrics (common to all layers).
   */
  protected getBaseMetrics(): OrganismMetrics {
    return { ...this.metrics };
  }
}

// =============================================================================
// LAYER REGISTRY
// =============================================================================

/**
 * Registry for organism layers.
 */
class OrganismLayerRegistry {
  private layers: Map<SubsystemType, AbstractOrganismLayer> = new Map();

  register(layer: AbstractOrganismLayer): void {
    this.layers.set(layer.id, layer);
  }

  get(id: SubsystemType): AbstractOrganismLayer | undefined {
    return this.layers.get(id);
  }

  getAll(): AbstractOrganismLayer[] {
    return Array.from(this.layers.values());
  }

  async initializeAll(): Promise<void> {
    for (const layer of this.layers.values()) {
      await layer.initialize();
    }
  }

  async shutdownAll(): Promise<void> {
    for (const layer of this.layers.values()) {
      await layer.shutdown();
    }
  }
}

export const organismRegistry = new OrganismLayerRegistry();

// Types are exported via re-export in index.ts
// Classes are exported inline via their declarations above
