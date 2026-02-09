/**
 * CognitiveLayer - Cognitive Cycles Concrete Implementation
 *
 * Wires together the cognitive subsystem components:
 * - wakeSleep: Biological sleep cycle simulation
 * - simpleMem: 3-stage memory pipeline (14x speedup)
 * - goldilocksBuffer: Optimal memory replay selection
 *
 * Research basis:
 * - arXiv:2601.02553 (SimpleMem) - 14x faster memory construction
 * - Goldilocks Criteria - Neither too easy nor too hard for replay
 * - Complementary Learning Systems Theory (CLS)
 */

import type {
  OrganismTask,
  OrganismResult,
  OrganismMetrics,
  SubsystemType,
} from '../archon/types';

import { logger } from '../logger';
import { AbstractOrganismLayer, organismRegistry } from './OrganismLayer';
import { wakeSleepAgent, type Episode, type SleepPhase } from './cognitive/wakeSleep';
import { simpleMem, type RawEpisode, type RetrievalQuery, type RetrievalIntent } from './cognitive/simpleMem';
import { goldilocksBuffer, type ReplaySelectionResult } from './cognitive/goldilocksBuffer';

// =============================================================================
// COGNITIVE LAYER
// =============================================================================

/**
 * CognitiveLayer handles all memory and learning operations:
 * - store: Store new episodes through SimpleMem pipeline
 * - retrieve: Intent-aware memory retrieval
 * - consolidate: Trigger memory consolidation (sleep cycles)
 * - replay: Goldilocks-optimal memory replay
 * - phase: Control wake/sleep phase transitions
 */
export class CognitiveLayer extends AbstractOrganismLayer {
  // Subsystem interface
  id: SubsystemType = 'cognitive';
  name = 'Cognitive Cycles';
  capabilities = [
    'memory-storage',
    'memory-retrieval',
    'sleep-consolidation',
    'goldilocks-replay',
  ];
  layerType: 'genome' | 'swarm' | 'cognitive' = 'cognitive';

  // Components
  private wakeSleep = wakeSleepAgent;
  private memPipeline = simpleMem;
  private goldilocks = goldilocksBuffer;

  // Layer-specific metrics
  private storeCount = 0;
  private retrieveCount = 0;
  private consolidationCount = 0;
  private replayCount = 0;
  private currentForgettingRate = 0.1;

  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  protected async onInitialize(): Promise<void> {
    // Start in wake phase
    this.wakeSleep.startWakePhase();
    logger.info('Cognitive components initialized', undefined, 'CognitiveLayer');
  }

  protected async onShutdown(): Promise<void> {
    // Trigger consolidation before shutdown if in wake phase
    if (this.wakeSleep.getCurrentPhase() === 'wake') {
      await this.wakeSleep.triggerSleep('manual');
    }
    logger.info('Cognitive components shutdown', undefined, 'CognitiveLayer');
  }

  // ---------------------------------------------------------------------------
  // Task Dispatch
  // ---------------------------------------------------------------------------

  async dispatch(task: OrganismTask): Promise<OrganismResult> {
    return this.executeWithMetrics(task, async () => {
      const operation = this.parseOperation(task.intent);

      switch (operation) {
        case 'store':
          return this.handleStore(task);
        case 'retrieve':
          return this.handleRetrieve(task);
        case 'consolidate':
          return this.handleConsolidate(task);
        case 'replay':
          return this.handleReplay(task);
        case 'phase':
          return this.handlePhaseQuery(task);
        case 'status':
          return this.handleStatus(task);
        default:
          return this.createErrorResult(
            `Unknown cognitive operation: ${operation}`,
            task
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Operation Handlers
  // ---------------------------------------------------------------------------

  private async handleStore(task: OrganismTask): Promise<OrganismResult> {
    const episodeJson = task.contextPages[0];
    if (!episodeJson) {
      return this.createErrorResult('No episode data provided', task);
    }

    const rawEpisode: RawEpisode = JSON.parse(episodeJson);
    this.storeCount++;

    // Stage 1: Semantic Structured Compression
    const compressed = this.memPipeline.compress(rawEpisode);

    // Also process task through wakeSleep for episodic buffer
    await this.wakeSleep.processTask(task);

    return this.createSuccessResult(compressed, task, {
      operation: 'store',
      episodeId: compressed.id,
      compressed: true,
    });
  }

  private async handleRetrieve(task: OrganismTask): Promise<OrganismResult> {
    const queryJson = task.contextPages[0];
    if (!queryJson) {
      return this.createErrorResult('No query provided', task);
    }

    const query: RetrievalQuery = JSON.parse(queryJson);
    const intentJson = task.contextPages[1];
    const intent: RetrievalIntent = intentJson
      ? JSON.parse(intentJson)
      : { type: 'search', priority: 0.5 };

    this.retrieveCount++;

    // Stage 3: Intent-Aware Retrieval
    const results = this.memPipeline.retrieve(query, intent);

    return this.createSuccessResult(results, task, {
      operation: 'retrieve',
      resultCount: results.results.length,
    });
  }

  private async handleConsolidate(task: OrganismTask): Promise<OrganismResult> {
    this.consolidationCount++;

    // Trigger sleep for consolidation
    await this.wakeSleep.triggerSleep('manual');

    // Get current metrics for forgetting rate
    const metrics = this.memPipeline.getMetrics();
    this.currentForgettingRate = 1 - metrics.overall.avgDqScore;

    return this.createSuccessResult(
      { consolidated: true, phase: this.wakeSleep.getCurrentPhase() },
      task,
      {
        operation: 'consolidate',
        forgettingRate: this.currentForgettingRate,
      }
    );
  }

  private async handleReplay(task: OrganismTask): Promise<OrganismResult> {
    const configJson = task.contextPages[0];
    const config = configJson ? JSON.parse(configJson) : { budget: 10 };
    this.replayCount++;

    // Get episodic buffer for replay selection
    const episodes = this.wakeSleep.getEpisodicBuffer();

    // Select optimal replay batch using Goldilocks criteria
    const replayResult: ReplaySelectionResult = this.goldilocks.selectForReplay(
      [...episodes], // Convert readonly to mutable
      config.budget ?? 10
    );

    return this.createSuccessResult(replayResult, task, {
      operation: 'replay',
      selectedCount: replayResult.selected.length,
      budgetUsed: replayResult.budgetUsed,
    });
  }

  private async handlePhaseQuery(task: OrganismTask): Promise<OrganismResult> {
    const currentPhase = this.wakeSleep.getCurrentPhase();

    return this.createSuccessResult(
      { phase: currentPhase },
      task,
      { operation: 'phase', currentPhase }
    );
  }

  private async handleStatus(task: OrganismTask): Promise<OrganismResult> {
    const status = {
      currentPhase: this.wakeSleep.getCurrentPhase(),
      episodicBufferSize: this.wakeSleep.getEpisodicBuffer().length,
      memoryStats: this.memPipeline.getMetrics(),
      goldilocksMetrics: this.goldilocks.getMetrics(),
      forgettingRate: this.currentForgettingRate,
    };

    return this.createSuccessResult(status, task, {
      operation: 'status',
    });
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getLayerMetrics(): OrganismMetrics {
    const base = this.getBaseMetrics();

    return {
      ...base,
      // Cognitive-specific metrics
      episodesStored: this.storeCount,
      consolidationCycles: this.consolidationCount,
      forgettingRate: this.currentForgettingRate,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseOperation(intent: string): string {
    return intent.toLowerCase().split(':')[0].trim();
  }

  private createSuccessResult(
    output: unknown,
    task: OrganismTask,
    metadata: Record<string, unknown> = {}
  ): OrganismResult {
    return {
      success: true,
      output,
      dqScore: this.computeDQScore(),
      metadata: {
        layerId: this.id,
        latencyMs: 0,
        tokensUsed: 0,
        ...metadata,
      },
    };
  }

  private createErrorResult(error: string, _task: OrganismTask): OrganismResult {
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
        latencyMs: 0,
        tokensUsed: 0,
      },
      error,
    };
  }
}

// =============================================================================
// SINGLETON & REGISTRATION
// =============================================================================

/** Singleton instance */
export const cognitiveLayer = new CognitiveLayer();

/** Register with organism registry */
organismRegistry.register(cognitiveLayer);
