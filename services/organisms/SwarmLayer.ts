/**
 * SwarmLayer - Swarm Orchestration Concrete Implementation
 *
 * Wires together the swarm subsystem components:
 * - adaptiveMoE: Dynamic Mixture of Experts routing
 * - stigmergy: Implicit coordination via shared signals
 * - aceIntegration: ACE consensus bridge
 *
 * Research basis:
 * - arXiv:2506.15672 (SwarmAgentic) - Stigmergic coordination patterns
 * - arXiv:2508.17536 (Voting vs Debate) - Voting alone captures most gains
 * - arXiv:2512.23880 (CASCADE) - Adaptive skill routing
 */

import type {
  OrganismTask,
  OrganismResult,
  OrganismMetrics,
  SubsystemType,
  DQScore,
} from '../archon/types';

import { logger } from '../logger';
import { AbstractOrganismLayer, organismRegistry } from './OrganismLayer';
import { adaptiveMoE, type ExpertSpec, type ExpertValidator } from './swarm/adaptiveMoE';
import { stigmergicEnvironment } from './swarm/stigmergy';
import { aceIntegration } from './swarm/aceIntegration';

// =============================================================================
// SWARM LAYER
// =============================================================================

/**
 * SwarmLayer handles all multi-agent coordination operations:
 * - route: Route tasks to best expert via MoE
 * - coordinate: Self-organize via stigmergic signals
 * - consensus: ACE-based multi-agent voting
 * - signal: Deposit/query stigmergic signals
 */
export class SwarmLayer extends AbstractOrganismLayer {
  // Subsystem interface
  id: SubsystemType = 'swarm';
  name = 'Swarm Orchestration';
  capabilities = [
    'expert-routing',
    'stigmergic-coordination',
    'consensus-voting',
    'load-balancing',
  ];
  layerType: 'genome' | 'swarm' | 'cognitive' = 'swarm';

  // Components
  private moe = adaptiveMoE;
  private stigmergy = stigmergicEnvironment;
  private ace = aceIntegration;

  // Layer-specific metrics
  private routeCount = 0;
  private signalDepositCount = 0;
  private teamsFormedCount = 0;
  private convergenceRoundsCount = 0;

  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  protected async onInitialize(): Promise<void> {
    // Connect ACE integration
    this.ace.connectToACE();
    logger.info('Swarm components initialized', undefined, 'SwarmLayer');
  }

  protected async onShutdown(): Promise<void> {
    logger.info('Swarm components shutdown', undefined, 'SwarmLayer');
  }

  // ---------------------------------------------------------------------------
  // Task Dispatch
  // ---------------------------------------------------------------------------

  async dispatch(task: OrganismTask): Promise<OrganismResult> {
    return this.executeWithMetrics(task, async () => {
      const operation = this.parseOperation(task.intent);

      switch (operation) {
        case 'route':
          return this.handleRoute(task);
        case 'signal_deposit':
        case 'deposit':
          return this.handleSignalDeposit(task);
        case 'signal_query':
        case 'query':
          return this.handleSignalQuery(task);
        case 'register_expert':
        case 'register':
          return this.handleRegisterExpert(task);
        case 'list_experts':
          return this.handleListExperts(task);
        case 'enrich_auction':
          return this.handleEnrichAuction(task);
        case 'priors':
          return this.handleGetPriors(task);
        default:
          return this.createErrorResult(
            `Unknown swarm operation: ${operation}`,
            task
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Operation Handlers
  // ---------------------------------------------------------------------------

  private async handleRoute(task: OrganismTask): Promise<OrganismResult> {
    // Route and execute using MoE
    const result = await this.moe.routeAndExecute(task);
    this.routeCount++;

    // Record routing decision to stigmergy for learning
    if (result.success) {
      const contextHash = this.hashContext(task.intent);
      this.stigmergy.depositDQTrace(
        contextHash,
        result.dqScore.score,
        this.id
      );
    }

    return this.createSuccessResult(result, task, {
      operation: 'route',
      expertId: result.expertId,
    });
  }

  private async handleSignalDeposit(task: OrganismTask): Promise<OrganismResult> {
    const signalJson = task.contextPages[0];
    if (!signalJson) {
      return this.createErrorResult('No signal data provided', task);
    }

    const signal = JSON.parse(signalJson);
    this.signalDepositCount++;

    switch (signal.type) {
      case 'vote':
        this.stigmergy.depositVote(
          signal.agentId || 'anonymous',
          signal.taskId || task.id,
          signal.vote || '',
          signal.confidence ?? 0.5
        );
        break;
      case 'dq_trace':
        this.stigmergy.depositDQTrace(
          signal.context || this.hashContext(task.intent),
          signal.dqScore || 0.5,
          signal.subsystem || this.id,
          signal.metadata
        );
        break;
      case 'pattern':
        this.stigmergy.depositPattern(
          signal.patternId || `pat-${Date.now()}`,
          signal.context || { intentKeywords: [], complexity: 'medium' },
          signal.outcome || { success: true, dqScore: 0.5, routedTo: '' }
        );
        break;
      default:
        return this.createErrorResult(`Unknown signal type: ${signal.type}`, task);
    }

    return this.createSuccessResult({ deposited: true }, task, {
      operation: 'signal_deposit',
      signalType: signal.type,
    });
  }

  private async handleSignalQuery(task: OrganismTask): Promise<OrganismResult> {
    const priors = this.ace.getSwarmPriors(task);

    return this.createSuccessResult(priors, task, {
      operation: 'signal_query',
      priorCount: priors.length,
    });
  }

  private async handleRegisterExpert(task: OrganismTask): Promise<OrganismResult> {
    const expertJson = task.contextPages[0];
    if (!expertJson) {
      return this.createErrorResult('No expert specification provided', task);
    }

    const parsed = JSON.parse(expertJson);
    const expertId = parsed.id || `expert-${Date.now()}`;
    const spec: ExpertSpec = {
      id: expertId,
      specialization: parsed.specialization || [],
      capacity: parsed.capacity || 5,
      currentLoad: parsed.currentLoad || 0,
      metrics: parsed.metrics || {
        successRate: 1.0,
        avgDqScore: 0.8,
        avgLatency: 100,
        invocations: 0,
        recentScores: [],
      },
    };

    // Default validator that returns the output's DQ score
    const validator: ExpertValidator = (output: unknown) => {
      if (typeof output === 'object' && output !== null && 'dqScore' in output) {
        return (output as { dqScore: DQScore }).dqScore;
      }
      return {
        score: 0.7,
        components: { validity: 0.7, specificity: 0.7, correctness: 0.7 },
        isActionable: true,
        timestamp: Date.now(),
      };
    };

    this.moe.registerExpert(expertId, spec, validator);
    this.teamsFormedCount++;

    return this.createSuccessResult(
      { registered: true, expertId },
      task,
      { operation: 'register_expert', expertId }
    );
  }

  private async handleListExperts(task: OrganismTask): Promise<OrganismResult> {
    // Get all registered expert IDs by iterating
    const expertIds: string[] = [];
    const specs: ExpertSpec[] = [];

    // Try common expert names
    const commonIds = ['researcher', 'coder', 'analyst', 'reviewer', 'planner'];
    for (const id of commonIds) {
      const spec = this.moe.getExpert(id);
      if (spec) {
        expertIds.push(id);
        specs.push(spec);
      }
    }

    return this.createSuccessResult({ expertIds, specs }, task, {
      operation: 'list_experts',
      count: expertIds.length,
    });
  }

  private async handleEnrichAuction(task: OrganismTask): Promise<OrganismResult> {
    const auctionConfigJson = task.contextPages[0];
    const auctionConfig = auctionConfigJson ? JSON.parse(auctionConfigJson) : {};

    const enriched = this.ace.enrichAuctionWithStigmergy(task, auctionConfig);
    this.convergenceRoundsCount++;

    return this.createSuccessResult(enriched, task, {
      operation: 'enrich_auction',
    });
  }

  private async handleGetPriors(task: OrganismTask): Promise<OrganismResult> {
    const priors = this.ace.getSwarmPriors(task);

    return this.createSuccessResult(priors, task, {
      operation: 'priors',
      count: priors.length,
    });
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getLayerMetrics(): OrganismMetrics {
    const base = this.getBaseMetrics();

    return {
      ...base,
      // Swarm-specific metrics
      teamsFormed: this.teamsFormedCount,
      stigmergicSignals: this.signalDepositCount,
      convergenceRounds: this.convergenceRoundsCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseOperation(intent: string): string {
    return intent.toLowerCase().split(':')[0].trim();
  }

  private hashContext(context: string): string {
    // Simple hash for context deduplication
    let hash = 0;
    for (let i = 0; i < context.length; i++) {
      const char = context.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `ctx-${Math.abs(hash).toString(16)}`;
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
export const swarmLayer = new SwarmLayer();

/** Register with organism registry */
organismRegistry.register(swarmLayer);
